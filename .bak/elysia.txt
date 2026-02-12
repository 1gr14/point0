import { Elysia } from 'elysia'
import { parseUrl } from '@point0/core'
import type { Engine } from '@point0/engine'

export const hmr = (engine: Engine, options: { enabled?: boolean } = {}) => {
  const enabled = options.enabled ?? process.env.NODE_ENV !== 'production'

  const plugin = new Elysia({
    name: '@point0/elysia/hmr',
  })

  if (!enabled) {
    return plugin
  }

  // TODO: somehow allow multiple clients to have hmr enabled
  const firstClientWithEngineClientNativeDevServer = engine.clients.find((client) => client.bunNativeDevServer)

  if (!firstClientWithEngineClientNativeDevServer) {
    return plugin
  }

  const clientPort = firstClientWithEngineClientNativeDevServer.port

  function getUpstreamHmrUrl(requestUrl: string) {
    const parsed = parseUrl(requestUrl)
    return `ws://localhost:${clientPort}` + parsed.urlObj.pathname + parsed.urlObj.search
  }

  plugin.ws('/_bun/*', {
    open(ws) {
      // Reconstruct the request URL from the WebSocket path and query
      // The path is available via ws.data.params
      const wildcardPath = ws.data.params['*'] || 'hmr'
      const path = `/_bun/${wildcardPath}`
      const queryString =
        Object.keys(ws.data.query).length > 0 ? '?' + new URLSearchParams(ws.data.query).toString() : ''

      // we need only pathname and query string, not the full url
      const requestUrl = `http://localhost${path}${queryString}`

      const upstreamUrl = getUpstreamHmrUrl(requestUrl)
      // console.info('Proxying WebSocket:', requestUrl, '->', upstreamUrl)

      const upstream = new WebSocket(upstreamUrl)

      // Store upstream in ws.data
      ;(ws.data as { upstream?: WebSocket }).upstream = upstream

      upstream.onopen = () => {
        // console.info('Upstream WebSocket connected:', upstreamUrl)
      }

      upstream.onmessage = (event) => ws.send(event.data)
      upstream.onclose = () => {
        ws.close()
      }
      upstream.onerror = (error) => {
        console.error('Upstream WebSocket error:', error)
        ws.close()
      }
    },

    message(ws, message: string | Buffer) {
      const upstream = (ws.data as { upstream?: WebSocket }).upstream
      if (upstream?.readyState === WebSocket.OPEN) {
        upstream.send(message)
      }
    },

    close(ws) {
      const upstream = (ws.data as { upstream?: WebSocket }).upstream
      upstream?.close()
    },
  })

  return plugin
}
