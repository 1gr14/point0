/**
 * The dev WS proxy is invisible: the original handshake's headers (cookies, origin, custom) replay on the upstream
 * dial, and the WS-handshake mechanics do not. Guards the dev-only bug where the cold-start channel connect lost its
 * auth cookie inside the proxy — the connector saw empty cookies and denied a signed-in user, an error that existed
 * only in dev (production has no proxy).
 */
import { describe, expect, it } from 'bun:test'
import {
  isSocketUpgradeRequest,
  websocketDevProxyHandlers,
  upgradeWebsocketDevProxy,
  type WebsocketDevProxyData,
} from '../src/utils.js'

describe('socket dev WS proxy', () => {
  it('replays the original handshake headers upstream (cookies included), not the WS mechanics', async () => {
    let upstreamHeaders: Record<string, string> | undefined
    const upstream = Bun.serve({
      port: 0,
      fetch(request, server) {
        upstreamHeaders = Object.fromEntries(request.headers.entries())
        if (server.upgrade(request)) {
          return undefined as never
        }
        return new Response('no', { status: 400 })
      },
      websocket: {
        message(ws, message) {
          ws.send(`echo:${typeof message === 'string' ? message : message.toString()}`)
        },
      },
    })
    const upstreamPort = upstream.port
    if (upstreamPort === undefined) {
      throw new Error('upstream server has no port')
    }
    const proxyServer = Bun.serve<WebsocketDevProxyData, string>({
      port: 0,
      fetch(request, server) {
        const result = upgradeWebsocketDevProxy({ request, bunServer: server as never, targetPort: upstreamPort })
        return result?.response ?? new Response('nope', { status: 404 })
      },
      websocket: websocketDevProxyHandlers as never,
    })
    try {
      const ws = new WebSocket(`ws://localhost:${proxyServer.port}/_point0/root/websocket`, {
        headers: { cookie: 'nickname=neo', origin: 'http://localhost:3001', 'x-custom': 'yes' },
      } as never)
      await new Promise((resolve, reject) => {
        ws.onopen = resolve
        ws.onerror = reject
      })
      // roundtrip one message — proves the upstream leg opened and the queue drained
      const echoed = await new Promise((resolve) => {
        ws.onmessage = (event) => resolve(event.data)
        ws.send('hi')
      })
      expect(echoed).toBe('echo:hi')
      expect(upstreamHeaders?.cookie).toBe('nickname=neo')
      expect(upstreamHeaders?.origin).toBe('http://localhost:3001')
      expect(upstreamHeaders?.['x-custom']).toBe('yes')
      // the WS mechanics are the upstream dial's own, and host names the upstream, not the dev port
      expect(upstreamHeaders?.host).toBe(`localhost:${upstreamPort}`)
      expect(upstreamHeaders?.['sec-websocket-key']).toBeDefined()
      ws.close()
    } finally {
      void proxyServer.stop(true)
      void upstream.stop(true)
    }
  })

  it('recognizes exactly the bare socket and the cold-start channel connect', () => {
    const upgradeHeaders = { upgrade: 'websocket' }
    const make = (path: string, headers: Record<string, string> = upgradeHeaders) =>
      new Request(`http://localhost:3000${path}`, { headers })
    expect(isSocketUpgradeRequest(make('/_point0/root/websocket'))).toBe(true)
    expect(isSocketUpgradeRequest(make('/_point0/root/channel/app'))).toBe(true)
    expect(isSocketUpgradeRequest(make('/_point0/root/query/list'))).toBe(false)
    expect(isSocketUpgradeRequest(make('/_point0/root/websocket', {}))).toBe(false)
  })
})
