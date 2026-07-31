/**
 * The socket backplane seam: a fixture engine configured with a CUSTOM `server.backplane` (an in-file Map-based
 * Backplane that records its calls). Proves connect→claim→send→reply runs end-to-end through the external backplane,
 * that the KV sets carry `ttlMs`, that publish/subscribe are exercised, and that a `waitForAll` collect waits the full
 * timeout window (an external backplane cannot count expected replies, so only the timeout closes it). The recorded
 * calls live in the spawned server process — a fixture serverHandler reads them back over the wire.
 */
import { afterAll, beforeAll, describe, expect, it, setDefaultTimeout } from 'bun:test'
import type { TestProjectOneClient } from './utils/project.one-client.js'
import { TestProjectOneClientFactory } from './utils/project.one-client.js'

setDefaultTimeout(120_000)

const tpf = TestProjectOneClientFactory.create({
  namespace: 'socket-backplane',
  portsRange: [4260, 4279],
  // drive the wire protocol directly — a blank transformer keeps payload strings plain JSON
  superjson: false,
})

// the custom backplane: an in-memory Backplane that records every call so the test can assert ttlMs + publish/subscribe;
// `kv` mirrors the latest value per key so a fixture handler can read a record back (e.g. the amended conn record).
// `atomic` adds the OPTIONAL sixth function, `getDelete` — the engine claims a ticket through it when it exists, and
// falls back to the get+delete pair when it does not (both shapes are real, so both are covered).
const backplaneModule = ({ atomic }: { atomic: boolean }): string =>
  `type Call = { op: 'get' | 'getDelete' | 'set' | 'delete' | 'publish' | 'subscribe'; key?: string; channel?: string; ttlMs?: number }
export const calls: Call[] = []
export const kv = new Map<string, string>()
export const createTestBackplane = () => {
  const memory = new Map<string, { value: string; timer: ReturnType<typeof setTimeout> | undefined }>()
  // subscribers keyed by channel name — the channel arrives as an argument, point0:* is none of our concern
  const subscribersByChannel = new Map<string, Set<(message: string) => void>>()
  return {
    get: (key: string) => {
      calls.push({ op: 'get', key })
      return memory.get(key)?.value
    },${
      atomic
        ? `
    // the atomic read-and-delete (Redis GETDEL) — one step, so two processes cannot both read the same ticket
    getDelete: (key: string) => {
      calls.push({ op: 'getDelete', key })
      const previous = memory.get(key)
      if (previous?.timer) clearTimeout(previous.timer)
      memory.delete(key)
      kv.delete(key)
      return previous?.value
    },`
        : ''
    }
    set: (key: string, value: string, ttlMs?: number) => {
      calls.push({ op: 'set', key, ttlMs })
      kv.set(key, value)
      const previous = memory.get(key)
      if (previous?.timer) clearTimeout(previous.timer)
      const timer = ttlMs === undefined ? undefined : setTimeout(() => memory.delete(key), ttlMs)
      timer?.unref()
      memory.set(key, { value, timer })
    },
    delete: (key: string) => {
      calls.push({ op: 'delete', key })
      kv.delete(key)
      const previous = memory.get(key)
      if (previous?.timer) clearTimeout(previous.timer)
      memory.delete(key)
    },
    publish: (channel: string, message: string) => {
      calls.push({ op: 'publish', channel })
      for (const subscriber of [...(subscribersByChannel.get(channel) ?? [])]) subscriber(message)
    },
    subscribe: (channel: string, onMessage: (message: string) => void) => {
      calls.push({ op: 'subscribe', channel })
      const subscribers = subscribersByChannel.get(channel) ?? new Set()
      subscribers.add(onMessage)
      subscribersByChannel.set(channel, subscribers)
    },
  }
}
`

const writePoints = async (tp: TestProjectOneClient, extraPoints = ''): Promise<void> => {
  await tp.write(
    'src/socket.points.tsx',
    `import { z } from 'zod'
import { root } from './lib/root.js'

// the channel is a thin authenticated pipe — its connector returns the identity BARE (no room, no data)
export const chatChannel = root.lets('channel', 'chatChannel')
  .input(z.object({ chatId: z.string() }))
  .connector(async ({ input }) => ({ me: 'user-' + input.chatId }))
  .channel()

export const echoHandler = chatChannel.lets('serverHandler', 'echoHandler')
  .clientSend(z.object({ text: z.string() }))
  .serverReply(async ({ input, identity }) => ({ echo: input.text, me: identity.me }))
  .serverHandler()

export const pingHandler = chatChannel.lets('clientHandler', 'pingHandler')
  .serverSend(z.object({ ask: z.string() }))
  .clientReply(({ message }) => ({ answer: 'pong:' + message.ask }), z.object({ answer: z.string() }))
  .clientHandler()

// waitForAll with a small window: an external backplane cannot count expected replies, so only the 400ms timeout closes
// it. A bare channel-handler push targets every connection (the \`*all*\` topic) — the two claimed wires both answer
export const slowCollectHandler = chatChannel.lets('serverHandler', 'slowCollectHandler')
  .serverReply(async () => {
    const startedAt = Date.now()
    const replies = await pingHandler.sendToClient({ ask: 'hi' }, {}, { timeout: 400, waitForAll: true })
    return { answers: replies.map((reply) => reply.data.answer).sort(), elapsed: Date.now() - startedAt }
  })
  .serverHandler()

// amendIdentity through the external backplane: the conn KV record is rewritten with the shallow-merged identity
export const amendHandler = chatChannel.lets('serverHandler', 'amendHandler')
  .clientSend(z.object({ me: z.string(), plan: z.string() }))
  .serverReply(async ({ input }) => {
    await chatChannel.amendIdentity({ $identity: { me: input.me } }, { plan: input.plan } as never)
    const matched = await chatChannel.connections.server.list({ $identity: { plan: input.plan } } as never, { timeout: 300 })
    return { matchedCount: matched.length }
  })
  .serverHandler()

// reads a raw KV record the custom backplane holds (both run in the spawned server process, sharing the module)
export const connRecordHandler = chatChannel.lets('serverHandler', 'connRecordHandler')
  .clientSend(z.object({ cid: z.string() }))
  .serverReply(async ({ input }) => {
    const { kv } = await import('./test-backplane.js')
    return { record: kv.get('point0:socket:conn:' + input.cid) ?? null }
  })
  .serverHandler()

// reads back what the custom backplane recorded (both run in the spawned server process, sharing the module)
export const backplaneStatsHandler = chatChannel.lets('serverHandler', 'backplaneStatsHandler')
  .serverReply(async () => {
    const { calls } = await import('./test-backplane.js')
    const sets = calls.filter((call) => call.op === 'set')
    return {
      setCount: sets.length,
      allSetsHaveTtl: sets.every((call) => typeof call.ttlMs === 'number' && call.ttlMs > 0),
      ticketTtls: sets.filter((call) => (call.key ?? '').includes(':ticket:')).map((call) => call.ttlMs),
      connTtls: sets.filter((call) => (call.key ?? '').includes(':conn:')).map((call) => call.ttlMs),
      published: calls.some((call) => call.op === 'publish'),
      subscribed: calls.some((call) => call.op === 'subscribe'),
      // point0 owns the channel name and passes it as an argument; the implementation only routes it
      busChannels: [...new Set(calls.filter((call) => call.op === 'publish' || call.op === 'subscribe').map((call) => call.channel))],
    }
  })
  .serverHandler()
${extraPoints}`,
  )
}

// the ticket-key ledger: which operations the backplane saw against `point0:socket:ticket:*` keys
const ticketOpsPoints = `
export const ticketOpsHandler = chatChannel.lets('serverHandler', 'ticketOpsHandler')
  .serverReply(async () => {
    const { calls } = await import('./test-backplane.js')
    return { ticketOps: calls.filter((call) => (call.key ?? '').includes(':ticket:')).map((call) => call.op) }
  })
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

  async waitFrame(predicate: (frame: WireFrame) => boolean, timeoutMs = 10_000): Promise<WireFrame> {
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

const openAndClaim = async (
  tp: TestProjectOneClient,
  input: Record<string, unknown>,
): Promise<{ wire: WireClient; cid: string }> => {
  const response = await fetch(`http://localhost:${tp.serverPort}/_point0/root/channel/chat-channel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  expect(response.ok).toBe(true)
  // the connect answer is just { id, ticket } now — rooms arrive from joins, not the connect
  const data = (await response.json()) as { id: string; ticket: string }
  const wire = new WireClient(`ws://localhost:${tp.serverPort}/_point0/root/websocket`)
  await wire.waitOpen()
  wire.send({ t: 'claim', ticket: data.ticket })
  await wire.waitFrame((frame) => frame.t === 'claimed' && frame.cid === data.id)
  return { wire, cid: data.id }
}

describe('socket backplane (custom Backplane)', () => {
  let tp: TestProjectOneClient

  beforeAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: false })
    tp = tpf.create()
    await tp.cleanup('ports')
    await tp.init()
    await writePoints(tp, ticketOpsPoints)
    await tp.write('src/test-backplane.ts', backplaneModule({ atomic: false }))
    // inject the custom backplane into the server config (a lazy factory keeps the object out of the config literal)
    await tp.replace(
      tp.files.engine,
      `entry: { main: './index.server.ts' },`,
      `entry: { main: './index.server.ts' },\n    backplane: async () => (await import('./test-backplane.js')).createTestBackplane(),`,
    )
    tp.spawn(['bun', 'run', 'dev'])
    await tp.waitStarted()
  })

  afterAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: false })
  })

  it('connect→claim→send→reply runs end-to-end through the custom backplane', async () => {
    const { wire, cid } = await openAndClaim(tp, { chatId: 'bp1' })
    try {
      wire.send({ t: 'send', id: 's1', cid, handler: 'echoHandler', input: JSON.stringify({ text: 'hi' }) })
      const reply = await wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 's1')
      expect(JSON.parse(reply.data as string)).toEqual({ echo: 'hi', me: 'user-bp1' })
    } finally {
      wire.close()
    }
  })

  it('the recorded KV sets carry ttlMs, and subscribe was exercised', async () => {
    const { wire, cid } = await openAndClaim(tp, { chatId: 'bp2' })
    try {
      wire.send({ t: 'send', id: 's2', cid, handler: 'backplaneStatsHandler' })
      const reply = await wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 's2')
      const stats = JSON.parse(reply.data as string) as {
        setCount: number
        allSetsHaveTtl: boolean
        ticketTtls: number[]
        connTtls: number[]
        subscribed: boolean
        busChannels: string[]
      }
      expect(stats.setCount).toBeGreaterThan(0)
      expect(stats.allSetsHaveTtl).toBe(true)
      // tickets are set with the 30s TTL; conn records with the channel's connectionTtl (90s default)
      expect(stats.ticketTtls).toContain(30_000)
      expect(stats.connTtls.length).toBeGreaterThan(0)
      expect(stats.connTtls.every((ttl) => typeof ttl === 'number' && ttl > 0)).toBe(true)
      expect(stats.subscribed).toBe(true)
      // point0 passes its own channel names — the sharded bus: the shared command channel and the process inbox
      // (both subscribed at start), plus the claimed channel's own topic (subscribed with the first local connection)
      expect(stats.busChannels).toContain('point0:socket:bus')
      expect(stats.busChannels.some((channel) => channel.startsWith('point0:socket:proc:'))).toBe(true)
      expect(stats.busChannels).toContain('point0:socket:channel:root:chatChannel')
      // …and nothing outside the `point0:socket:*` namespace — the implementation just routes what it is given
      expect(stats.busChannels.every((channel) => channel.startsWith('point0:socket:'))).toBe(true)
    } finally {
      wire.close()
    }
  })

  it('a waitForAll collect waits the full window and publish is exercised on the backplane', async () => {
    const a = await openAndClaim(tp, { chatId: 'bp3' })
    const b = await openAndClaim(tp, { chatId: 'bp3' })
    try {
      // both wires answer the ping like the real client runtime would
      for (const member of [a, b]) {
        void (async () => {
          const msg = await member.wire.waitFrame((frame) => frame.t === 'msg' && frame.handler === 'pingHandler')
          member.wire.send({
            t: 'reply',
            id: msg.mid as string,
            cid: member.cid,
            data: JSON.stringify({ answer: 'pong:' + String(JSON.parse(msg.input as string).ask) }),
          })
        })()
      }
      a.wire.send({ t: 'send', id: 's3', cid: a.cid, handler: 'slowCollectHandler' })
      const reply = await a.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 's3')
      const collected = JSON.parse(reply.data as string) as { answers: string[]; elapsed: number }
      expect(collected.answers).toEqual(['pong:hi', 'pong:hi'])
      // an external backplane cannot count expected replies — the window closed on the 400ms timeout, not early
      expect(collected.elapsed).toBeGreaterThanOrEqual(350)

      a.wire.send({ t: 'send', id: 's4', cid: a.cid, handler: 'backplaneStatsHandler' })
      const stats = await a.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 's4')
      expect((JSON.parse(stats.data as string) as { published: boolean }).published).toBe(true)
    } finally {
      a.wire.close()
      b.wire.close()
    }
  })

  it('amendIdentity rewrites the conn KV record and later $identity selections match the patch', async () => {
    const { wire, cid } = await openAndClaim(tp, { chatId: 'amend' })
    try {
      wire.send({
        t: 'send',
        id: 'am1',
        cid,
        handler: 'amendHandler',
        input: JSON.stringify({ me: 'user-amend', plan: 'gold' }),
      })
      const reply = await wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 'am1')
      // the amended identity is what the follow-up selection matched over
      expect((JSON.parse(reply.data as string) as { matchedCount: number }).matchedCount).toBe(1)
      // the KV conn record itself was rewritten with the shallow-merged identity
      wire.send({ t: 'send', id: 'am2', cid, handler: 'connRecordHandler', input: JSON.stringify({ cid }) })
      const recordReply = await wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 'am2')
      const { record } = JSON.parse(recordReply.data as string) as { record: string | null }
      expect(record).toBeTruthy()
      const stored = JSON.parse(record as string) as { identity: string }
      expect(JSON.parse(stored.identity)).toEqual({ me: 'user-amend', plan: 'gold' })
    } finally {
      wire.close()
    }
  })

  it('without getDelete the claim falls back to the get+delete pair', async () => {
    const { wire, cid } = await openAndClaim(tp, { chatId: 'fallback' })
    try {
      wire.send({ t: 'send', id: 'ops1', cid, handler: 'ticketOpsHandler' })
      const reply = await wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 'ops1')
      const { ticketOps } = JSON.parse(reply.data as string) as { ticketOps: string[] }
      // the ticket is minted (set), then read and deleted in two steps — this backplane offers no atomic sixth function
      expect(ticketOps).toContain('get')
      expect(ticketOps).toContain('delete')
      expect(ticketOps).not.toContain('getDelete')
    } finally {
      wire.close()
    }
  })
})

// The OPTIONAL sixth function: the same recording backplane, now with `getDelete`. The claim must consume the ticket
// through it — one atomic step instead of the get+delete pair — which is what closes a double claim across processes.
describe('socket backplane with getDelete (atomic ticket claim)', () => {
  let tp: TestProjectOneClient

  beforeAll(async () => {
    tp = tpf.create()
    await tp.cleanup('ports')
    await tp.init()
    await writePoints(tp, ticketOpsPoints)
    await tp.write('src/test-backplane.ts', backplaneModule({ atomic: true }))
    await tp.replace(
      tp.files.engine,
      `entry: { main: './index.server.ts' },`,
      `entry: { main: './index.server.ts' },\n    backplane: async () => (await import('./test-backplane.js')).createTestBackplane(),`,
    )
    tp.spawn(['bun', 'run', 'dev'])
    await tp.waitStarted()
  })

  afterAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: false })
  })

  it('the claim consumes the ticket through getDelete — never a get+delete pair', async () => {
    const { wire, cid } = await openAndClaim(tp, { chatId: 'gd1' })
    try {
      wire.send({ t: 'send', id: 'ops1', cid, handler: 'ticketOpsHandler' })
      const reply = await wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 'ops1')
      const { ticketOps } = JSON.parse(reply.data as string) as { ticketOps: string[] }
      // mint (set) then consume (getDelete) — the plain read and the separate delete never happen for a ticket key
      expect(ticketOps).toContain('set')
      expect(ticketOps).toContain('getDelete')
      expect(ticketOps).not.toContain('get')
      expect(ticketOps).not.toContain('delete')
    } finally {
      wire.close()
    }
  })

  it('a second claim of the same ticket fails cleanly — the ticket is gone with the first read', async () => {
    const response = await fetch(`http://localhost:${tp.serverPort}/_point0/root/channel/chat-channel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: 'gd2' }),
    })
    const { id, ticket } = (await response.json()) as { id: string; ticket: string }
    const first = new WireClient(`ws://localhost:${tp.serverPort}/_point0/root/websocket`)
    const second = new WireClient(`ws://localhost:${tp.serverPort}/_point0/root/websocket`)
    await first.waitOpen()
    await second.waitOpen()
    try {
      first.send({ t: 'claim', ticket })
      await first.waitFrame((frame) => frame.t === 'claimed' && frame.cid === id)
      // the same ticket, a fresh socket: the record is already gone, so the claim is refused like any unknown ticket
      second.send({ t: 'claim', ticket })
      const claimErr = await second.waitFrame((frame) => frame.t === 'claimErr')
      expect(String(claimErr.error)).toContain('POINT0_SOCKET_TICKET_INVALID')
      expect(second.frames.find((frame) => frame.t === 'claimed')).toBeUndefined()
    } finally {
      first.close()
      second.close()
    }
  })
})

// Same contract against a real Redis when REDIS_URL is set — a compact Backplane-over-Bun-redis roundtrip proving the
// five functions the engine relies on map onto Bun's built-in client. Skipped (and small) unless REDIS_URL is present.
describe.skipIf(!process.env.REDIS_URL)('socket backplane (real Redis)', () => {
  it('the Backplane contract (set+ttl / get / publish+subscribe) works over Bun redis', async () => {
    const { RedisClient } = await import('bun')
    const url = process.env.REDIS_URL as string
    const store = new RedisClient(url)
    const sub = new RedisClient(url)
    const channel = 'point0:test:' + crypto.randomUUID()
    const received: string[] = []
    await sub.subscribe(channel, (message: string) => {
      received.push(message)
    })
    const key = 'point0:test:' + crypto.randomUUID()
    await store.set(key, 'value', 'PX', 200)
    expect(await store.get(key)).toBe('value')
    await store.publish(channel, 'hello')
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(received).toContain('hello')
    // the PX TTL expires the key on its own — that is how a dead process leaks nothing
    await new Promise((resolve) => setTimeout(resolve, 250))
    expect(await store.get(key)).toBeNull()
    store.close()
    sub.close()
  })

  it('the `server.backplane: "redis://…"` URL shortcut carries the KV and the bus between two EngineSocket instances', async () => {
    const { Point0 } = await import('@point0/core')
    const { EngineSocket } = await import('../src/socket.js')
    const url = process.env.REDIS_URL as string
    const root = Point0.lets('root', 'root').root()
    const chatChannel = root.lets('channel', 'chatUrl').channel()
    const createInstance = () => {
      const server = {
        scope: 'root',
        clients: [],
        backplaneProvided: url,
        socketEnabled: true,
        log: () => {},
        bunServer: { publish: () => {} },
        points: {
          findPoint: ({ type, name }: { type: string; name: string }) =>
            type === 'channel' && name === 'chatUrl' ? { point: chatChannel.point } : undefined,
          // the claim path walks the collection for the channel's space points (the enrollment pass)
          manager: { root: chatChannel.point, collection: [{ type: 'channel', point: chatChannel.point }] },
        },
      }
      return new EngineSocket({ server: server as never })
    }
    const a = createInstance()
    const b = createInstance()
    await a.start()
    await b.start()
    try {
      // the KV crosses processes: a connection created on A is claimable on B
      const { cid, ticket } = await a.createConnection({
        point: chatChannel.point as never,
        identity: { me: 'url' },
      })
      const frames: Array<Record<string, unknown>> = []
      const socket = {
        data: { __point0Socket: { scope: 'root', cids: new Set() } },
        send: (serialized: string) => frames.push(JSON.parse(serialized) as Record<string, unknown>),
        subscribe: () => {},
        unsubscribe: () => {},
      }
      await b.handleMessage(socket as never, JSON.stringify({ t: 'claim', ticket }))
      expect(frames.find((frame) => frame.t === 'claimed')?.cid).toBe(cid)
      // the bus crosses processes: a kick issued on A closes the connection B holds
      await a.adapter.kick({ channel: chatChannel.point as never, reason: 'url-kick' })
      await new Promise((resolve) => setTimeout(resolve, 300))
      const closed = frames.find((frame) => frame.t === 'closed')
      expect(closed?.cid).toBe(cid)
      expect(closed?.reason).toBe('url-kick')
    } finally {
      a.dispose()
      b.dispose()
    }
  })
})
