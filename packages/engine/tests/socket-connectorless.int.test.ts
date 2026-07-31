/**
 * A channel WITHOUT a connector — the bare authenticated pipe whose identity is `{}` (the closer registers the default
 * connector itself, so nothing downstream special-cases "a channel may have no loader"). These are the runtime pins of
 * that emptiness: what the server actually holds as the identity, what the joiner sees, what the `$identity` matcher
 * means over `{}` (an empty matcher = EVERY connection, a keyed one = none), and the amendIdentity REFUSAL — the
 * runtime guard throws on a connectorless channel (the `_connectorDeclared` fact, mirroring the compile-time
 * `AssertIdentityAmendable` ban), so the runtime identity can never grow keys the `{}` type never admits (the type-side
 * pins live in packages/core/tests/socket-builders.unit.test.ts).
 */
import { afterAll, beforeAll, describe, expect, it, setDefaultTimeout } from 'bun:test'
import type { TestProjectOneClient } from './utils/project.one-client.js'
import { TestProjectOneClientFactory } from './utils/project.one-client.js'

setDefaultTimeout(120_000)

const tpf = TestProjectOneClientFactory.create({
  namespace: 'socket-connectorless',
  portsRange: [4700, 4749],
  // the test drives the wire protocol directly — a blank transformer keeps payload strings plain JSON
  superjson: false,
})

const writePoints = async (tp: TestProjectOneClient): Promise<void> => {
  await tp.write(
    'src/socket.points.tsx',
    `import { z } from 'zod'
import { root } from './lib/root.js'

// no input, no connector — the bare authenticated pipe; its identity is {}
export const bareChannel = root.lets('channel', 'bareChannel').channel()

// a joinable space on the bare channel — what the joiner SAW as identity, join by join
export const joinerSeen: unknown[] = []
export const roomSpace = bareChannel.lets<{ roomId: string }>('space', 'roomSpace')
  .input(z.object({ roomId: z.string() }))
  .joiner(({ identity, input }) => {
    joinerSeen.push(identity)
    return { roomId: input.roomId }
  })
  .space()

export const joinerSeenHandler = bareChannel.lets('serverHandler', 'joinerSeenHandler')
  .serverReply(() => ({ seen: joinerSeen }))
  .serverHandler()

// echo the identity the server holds for THIS connection
export const whoHandler = bareChannel.lets('serverHandler', 'whoHandler')
  .serverReply(({ identity, connectionId }) => ({ identity, connectionId }))
  .serverHandler()

// the roll call — what connections.server.list() reports for the {}-identity connections
export const adminListHandler = bareChannel.lets('serverHandler', 'adminListHandler')
  .serverReply(async () => ({ list: await bareChannel.connections.server.list() }))
  .serverHandler()

// the push the tests observe
export const noticeHandler = bareChannel.lets('clientHandler', 'noticeHandler')
  .serverSend(z.object({ text: z.string() }))
  .clientHandler()

// push with a $identity matcher the TEST chooses (a JSON string — the fixture stays cast-free)
export const matcherPushHandler = bareChannel.lets('serverHandler', 'matcherPushHandler')
  .clientSend(z.object({ text: z.string(), matcherJson: z.string() }))
  .serverReply(async ({ input }) => {
    void noticeHandler.sendToClient({ text: input.text }, { $identity: JSON.parse(input.matcherJson) })
    return { ok: true }
  })
  .serverHandler()

// amendIdentity with a patch the TEST chooses — the call is TYPE-banned on a connectorless channel
// (AssertIdentityAmendable), so the casts bypass the compile-time layer on purpose: this handler exists to pin the
// RUNTIME guard underneath it
export const amendHandler = bareChannel.lets('serverHandler', 'amendHandler')
  .clientSend(z.object({ cid: z.string(), patchJson: z.string() }))
  .serverReply(async ({ input }) => {
    try {
      await bareChannel.amendIdentity({ connectionId: input.cid } as never, JSON.parse(input.patchJson) as never)
      return { threw: false, message: '' }
    } catch (error) {
      return { threw: true, message: error instanceof Error ? error.message : String(error) }
    }
  })
  .serverHandler()

// kick by a matcher the TEST chooses
export const kickHandler = bareChannel.lets('serverHandler', 'kickHandler')
  .clientSend(z.object({ matcherJson: z.string() }))
  .serverReply(async ({ input }) => {
    await bareChannel.kick({ $identity: JSON.parse(input.matcherJson), reason: 'matcher-kick' })
    return { ok: true }
  })
  .serverHandler()
`,
  )
}

type WireFrame = Record<string, unknown> & { t: string }

class WireClient {
  ws: WebSocket
  frames: WireFrame[] = []
  private waiters: Array<{ predicate: (frame: WireFrame) => boolean; resolve: (frame: WireFrame) => void }> = []
  private opened: Promise<void>

  constructor(url: string) {
    this.ws = new WebSocket(url)
    this.opened = new Promise((resolve, reject) => {
      this.ws.addEventListener('open', () => {
        resolve()
      })
      this.ws.addEventListener('error', () => {
        reject(new Error('WebSocket error'))
      })
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

describe('socket connectorless channel', () => {
  let tp: TestProjectOneClient
  let sendSeq = 0

  /** connect the connectorless channel — no input, the POST body is the empty object */
  const connect = async (): Promise<{ id: string; ticket: string }> => {
    const response = await fetch(`http://localhost:${tp.serverPort}/_point0/root/channel/bare-channel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(response.ok).toBe(true)
    return (await response.json()) as { id: string; ticket: string }
  }

  const openAndClaim = async (): Promise<{ wire: WireClient; cid: string }> => {
    const pending = await connect()
    const wire = new WireClient(`ws://localhost:${tp.serverPort}/_point0/root/websocket`)
    await wire.waitOpen()
    wire.send({ t: 'claim', ticket: pending.ticket })
    await wire.waitFrame((frame) => frame.t === 'claimed' && frame.cid === pending.id)
    return { wire, cid: pending.id }
  }

  /** one serverHandler round-trip: send, await the reply, hand back its parsed data */
  const call = async <T>(
    wire: WireClient,
    cid: string,
    handler: string,
    input?: Record<string, unknown>,
  ): Promise<T> => {
    const id = `c${++sendSeq}`
    wire.send({ t: 'send', id, cid, handler, ...(input === undefined ? {} : { input: JSON.stringify(input) }) })
    const reply = await wire.waitFrame((frame) => frame.t === 'reply' && frame.id === id)
    return JSON.parse(String(reply.data)) as T
  }

  /** does this frame carry a noticeHandler push with the given text? */
  const isNotice =
    (text: string) =>
    (frame: WireFrame): boolean =>
      frame.t === 'msg' &&
      frame.handler === 'noticeHandler' &&
      frame.input !== undefined &&
      (JSON.parse(String(frame.input)) as { text: string }).text === text

  beforeAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: false })
    tp = tpf.create()
    await tp.cleanup('ports')
    await tp.init()
    await writePoints(tp)
    tp.spawn(['bun', 'run', 'dev'])
    await tp.waitStarted()
  })

  afterAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: false })
  })

  it('connects with the empty identity — the handler and the roll call both hold {}', async () => {
    const { wire, cid } = await openAndClaim()
    try {
      // the identity a serverHandler receives IS the empty object — not undefined, not null, no surprise keys
      const who = await call<{ identity: Record<string, unknown>; connectionId: string }>(wire, cid, 'whoHandler')
      expect(who.identity).toEqual({})
      expect(who.connectionId).toBe(cid)
      // and connections.server.list() reports the same {} (with no spaces yet)
      const { list } = await call<{
        list: Array<{ connectionId: string; identity: Record<string, unknown>; spaces: Record<string, unknown[]> }>
      }>(wire, cid, 'adminListHandler')
      const own = list.find((connection) => connection.connectionId === cid)
      expect(own).toBeDefined()
      expect(own?.identity).toEqual({})
      expect(own?.spaces).toEqual({})
    } finally {
      wire.close()
    }
  })

  it('a joiner-space join works over the {} identity — the joiner sees the empty object', async () => {
    const { wire, cid } = await openAndClaim()
    try {
      wire.send({ t: 'join', id: 'j1', cid, space: 'roomSpace', input: JSON.stringify({ roomId: 'r1' }) })
      const joined = await wire.waitFrame((frame) => frame.t === 'joined' && frame.id === 'j1')
      expect(joined.rooms).toEqual([JSON.stringify({ roomId: 'r1' })])
      const { seen } = await call<{ seen: Array<Record<string, unknown>> }>(wire, cid, 'joinerSeenHandler')
      expect(seen.length).toBeGreaterThan(0)
      expect(seen[seen.length - 1]).toEqual({})
    } finally {
      wire.close()
    }
  })

  it('the EMPTY $identity matcher matches every connection; a keyed matcher over {} matches none', async () => {
    const a = await openAndClaim()
    const b = await openAndClaim()
    try {
      // {} is sift's match-all — over identityless connections it reads "everyone on this channel"
      await call(a.wire, a.cid, 'matcherPushHandler', { text: 'to-all', matcherJson: '{}' })
      await a.wire.waitFrame(isNotice('to-all'))
      await b.wire.waitFrame(isNotice('to-all'))
      // a keyed matcher has nothing to match on a {} identity — nobody receives; the flush push proves the
      // non-delivery deterministically (frames are ordered per socket)
      await call(a.wire, a.cid, 'matcherPushHandler', { text: 'to-none', matcherJson: '{"userId":"1"}' })
      await call(a.wire, a.cid, 'matcherPushHandler', { text: 'flush', matcherJson: '{}' })
      await a.wire.waitFrame(isNotice('flush'))
      await b.wire.waitFrame(isNotice('flush'))
      expect(a.wire.frames.find(isNotice('to-none'))).toBeUndefined()
      expect(b.wire.frames.find(isNotice('to-none'))).toBeUndefined()
    } finally {
      a.wire.close()
      b.wire.close()
    }
  })

  it('amendIdentity is REFUSED on the {} identity — the runtime guard throws and the identity never grows', async () => {
    const target = await openAndClaim()
    const bystander = await openAndClaim()
    try {
      // the guard fires on the DECLARATION fact (`_connectorDeclared`), before any adapter work — the fixture handler
      // catches the throw and hands the message back
      const amend = await call<{ threw: boolean; message: string }>(target.wire, target.cid, 'amendHandler', {
        cid: target.cid,
        patchJson: '{"plan":"pro"}',
      })
      expect(amend.threw).toBe(true)
      expect(amend.message).toContain(
        'amendIdentity() needs a connector-declared identity — a connectorless channel has nothing to amend',
      )
      // the stored identity stayed the EXACT empty object — the handler's own `identity` and the roll call agree
      const who = await call<{ identity: Record<string, unknown> }>(target.wire, target.cid, 'whoHandler')
      expect(who.identity).toEqual({})
      const { list } = await call<{ list: Array<{ connectionId: string; identity: Record<string, unknown> }> }>(
        target.wire,
        target.cid,
        'adminListHandler',
      )
      expect(list.find((connection) => connection.connectionId === target.cid)?.identity).toEqual({})
      expect(list.find((connection) => connection.connectionId === bystander.cid)?.identity).toEqual({})
      // and a keyed $identity selection still matches NOBODY — the flush push proves the non-delivery
      await call(target.wire, target.cid, 'matcherPushHandler', { text: 'pro-only', matcherJson: '{"plan":"pro"}' })
      await call(target.wire, target.cid, 'matcherPushHandler', { text: 'amend-flush', matcherJson: '{}' })
      await target.wire.waitFrame(isNotice('amend-flush'))
      await bystander.wire.waitFrame(isNotice('amend-flush'))
      expect(target.wire.frames.find(isNotice('pro-only'))).toBeUndefined()
      expect(bystander.wire.frames.find(isNotice('pro-only'))).toBeUndefined()
    } finally {
      target.wire.close()
      bystander.wire.close()
    }
  })

  it('kick by matcher over {}: a keyed matcher kicks nobody; the empty matcher kicks everyone', async () => {
    const a = await openAndClaim()
    const b = await openAndClaim()
    try {
      // a keyed matcher has nothing to match on a {} identity — the kick lands on NOBODY. The kick runs synchronously
      // inside the awaited handler, so the replies below arriving with no `closed` frame is deterministic proof
      await call(a.wire, a.cid, 'kickHandler', { matcherJson: '{"role":"out"}' })
      const whoA = await call<{ connectionId: string }>(a.wire, a.cid, 'whoHandler')
      const whoB = await call<{ connectionId: string }>(b.wire, b.cid, 'whoHandler')
      expect(whoA.connectionId).toBe(a.cid)
      expect(whoB.connectionId).toBe(b.cid)
      expect(a.wire.frames.find((frame) => frame.t === 'closed')).toBeUndefined()
      expect(b.wire.frames.find((frame) => frame.t === 'closed')).toBeUndefined()
      // the empty matcher on the admin surface is the same match-all as everywhere — the kick reaches BOTH
      await call(a.wire, a.cid, 'kickHandler', { matcherJson: '{}' })
      const closedA = await a.wire.waitFrame((frame) => frame.t === 'closed')
      const closedB = await b.wire.waitFrame((frame) => frame.t === 'closed')
      expect(closedA.cid).toBe(a.cid)
      expect(closedA.reason).toBe('matcher-kick')
      expect(closedB.cid).toBe(b.cid)
      expect(closedB.reason).toBe('matcher-kick')
    } finally {
      a.wire.close()
      b.wire.close()
    }
  })
})
