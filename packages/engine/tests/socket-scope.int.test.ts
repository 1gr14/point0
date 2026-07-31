/**
 * The socket ticket is bound to its SCOPE. An app can serve several scopes (a server scope plus one bare `websocket`
 * endpoint per client scope), and every one of them runs its own middleware pipeline — so a ticket minted for a channel
 * of one scope must not bind on another scope's socket, or the connection would land in topics that dial never
 * authorized. The same gate guards `discard`: one scope must not be able to drop another's pending connect.
 *
 * Needs an app with MORE THAN ONE scope, which is what the two-clients fixture is: server `root` plus clients `first`
 * and `second`. The channel itself lives on the server root — nothing about this test needs points in the client
 * scopes, only that their endpoints exist.
 */
import { afterAll, beforeAll, describe, expect, it, setDefaultTimeout } from 'bun:test'
import type { TestProjectTwoClient } from './utils/project.two-clients.js'
import { TestProjectTwoClientFactory } from './utils/project.two-clients.js'

setDefaultTimeout(120_000)

const tpf = TestProjectTwoClientFactory.create({
  namespace: 'socket-scope',
  portsRange: [4650, 4699],
})

const pointsFile = `import { z } from 'zod'
import { root } from './lib/root.js'

// a channel of the SERVER scope — the tickets it mints carry scope 'root'
export const chatChannel = root.lets('channel', 'chatChannel')
  .input(z.object({ userId: z.string() }))
  .connector(async ({ input }) => ({ me: 'user-' + input.userId }))
  .channel()

export const whoHandler = chatChannel.lets('serverHandler', 'whoHandler')
  .serverReply(async ({ identity }) => ({ me: identity.me }))
  .serverHandler()
`

type WireFrame = Record<string, unknown> & { t: string }

class WireClient {
  ws: WebSocket
  frames: WireFrame[] = []
  private waiters: Array<{ predicate: (frame: WireFrame) => boolean; resolve: (frame: WireFrame) => void }> = []
  private opened: Promise<void>

  constructor(url: string) {
    this.ws = new WebSocket(url)
    this.opened = new Promise((resolve, reject) => {
      this.ws.addEventListener('open', () => resolve())
      this.ws.addEventListener('error', () => reject(new Error('WebSocket error')))
    })
    this.ws.addEventListener('message', (event) => {
      const frame = JSON.parse(String(event.data)) as WireFrame
      this.frames.push(frame)
      for (const waiter of [...this.waiters]) {
        if (waiter.predicate(frame)) {
          this.waiters.splice(this.waiters.indexOf(waiter), 1)
          waiter.resolve(frame)
        }
      }
    })
  }

  async waitOpen(): Promise<void> {
    await this.opened
  }

  send(frame: WireFrame): void {
    this.ws.send(JSON.stringify(frame))
  }

  async waitFrame(predicate: (frame: WireFrame) => boolean, timeoutMs = 15_000): Promise<WireFrame> {
    const existing = this.frames.find(predicate)
    if (existing) {
      return existing
    }
    return await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Frame not received in ${timeoutMs}ms. Got: ${JSON.stringify(this.frames)}`))
      }, timeoutMs)
      this.waiters.push({
        predicate,
        resolve: (frame) => {
          clearTimeout(timer)
          resolve(frame)
        },
      })
    })
  }

  close(): void {
    this.ws.close()
  }
}

describe('socket ticket scope', () => {
  let tp: TestProjectTwoClient

  const connect = async (userId: string): Promise<{ id: string; ticket: string }> => {
    const response = await fetch(`http://localhost:${tp.serverPort}/_point0/root/channel/chat-channel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    expect(response.ok).toBe(true)
    return (await response.json()) as { id: string; ticket: string }
  }

  const openWire = async (scopeKebab: string): Promise<WireClient> => {
    const wire = new WireClient(`ws://localhost:${tp.serverPort}/_point0/${scopeKebab}/websocket`)
    await wire.waitOpen()
    return wire
  }

  beforeAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: false })
    tp = tpf.create()
    await tp.cleanup('ports')
    await tp.init()
    await tp.write('src/socket.points.tsx', pointsFile)
    tp.spawn(['bun', 'run', 'dev'])
    await tp.waitStarted()
  })

  afterAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: false })
  })

  it('every served scope has its own bare websocket endpoint — an unknown one is not an endpoint at all', async () => {
    for (const scope of ['root', 'first', 'second']) {
      const wire = await openWire(scope)
      // each one answers the socket-level ping, so the refusals below are about the TICKET, not a missing endpoint
      wire.send({ t: 'ping' })
      await wire.waitFrame((frame) => frame.t === 'pong')
      wire.close()
    }
    // a scope the app does not serve does not resolve, so the request never becomes a websocket endpoint
    const response = await fetch(`http://localhost:${tp.serverPort}/_point0/nope/websocket`, {
      headers: { Upgrade: 'websocket' },
    })
    expect(response.status).toBe(404)
  })

  it('a discard from ANOTHER scope leaves the ticket alone — the same scope then claims it', async () => {
    const pending = await connect('cross-discard')
    const foreign = await openWire('first')
    const own = await openWire('root')
    try {
      // the gate on discard is the same one the claim uses: this socket rode the `first` pipeline, the ticket belongs
      // to `root`, so the discard is a no-op instead of a cross-scope kill switch
      foreign.send({ t: 'discard', ticket: pending.ticket })
      await new Promise((resolve) => setTimeout(resolve, 400))
      own.send({ t: 'claim', ticket: pending.ticket })
      const claimed = await own.waitFrame((frame) => frame.t === 'claimed' && frame.cid === pending.id)
      expect(claimed.cid).toBe(pending.id)
      // and it really is a working connection, not just an accepted frame
      own.send({ t: 'send', id: 'w1', cid: pending.id, handler: 'whoHandler' })
      const reply = await own.waitFrame((frame) => frame.t === 'reply' && frame.id === 'w1')
      expect(JSON.parse(reply.data as string)).toEqual({ me: 'user-cross-discard' })
    } finally {
      foreign.close()
      own.close()
    }
  })

  it('a claim from ANOTHER scope is refused as an unknown ticket — and burns it', async () => {
    const pending = await connect('cross-claim')
    const foreign = await openWire('second')
    const own = await openWire('root')
    try {
      foreign.send({ t: 'claim', ticket: pending.ticket })
      const claimErr = await foreign.waitFrame((frame) => frame.t === 'claimErr')
      // the same message an unknown ticket gets — a cross-scope probe must not become an oracle for "this ticket
      // exists, just not here"
      expect(String(claimErr.error)).toContain('POINT0_SOCKET_TICKET_INVALID')
      expect(foreign.frames.some((frame) => frame.t === 'claimed')).toBe(false)

      // the refusal is terminal: the claim consumed the ticket before it checked the scope, and dropped the
      // connection record with it — the right scope now finds nothing left to claim either
      own.send({ t: 'claim', ticket: pending.ticket })
      const ownErr = await own.waitFrame((frame) => frame.t === 'claimErr')
      expect(String(ownErr.error)).toContain('POINT0_SOCKET_TICKET_INVALID')
      expect(own.frames.some((frame) => frame.t === 'claimed')).toBe(false)

      // a fresh connect on the right scope still works — nothing about the channel was poisoned
      const fresh = await connect('cross-claim-2')
      own.send({ t: 'claim', ticket: fresh.ticket })
      await own.waitFrame((frame) => frame.t === 'claimed' && frame.cid === fresh.id)
    } finally {
      foreign.close()
      own.close()
    }
  })
})
