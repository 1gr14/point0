/**
 * The socket under an EXTERNAL backplane — the half of the server mechanics that only exists when point0 believes it
 * shares its connections with other processes. A fixture engine is configured with a custom `server.backplane` (an
 * in-file Map-based Backplane that records every call AND every bus message), so the test can read back:
 *
 * - the KV RECORD LIFECYCLE: the TTL slide is floored to `RENEW_MIN_INTERVAL_MS` (a ping flood is not a write flood) and
 *   the conn record is DELETED on every way out — a client `close`, a dead socket, a kick — as is the ticket (with its
 *   record) on a `discard`;
 * - the UNCOUNTABLE collect window: with other processes possibly holding connections the expectation is unknowable, so
 *   per-cid reply bounds replace it. A LOCAL cid is still exact (this process knows what it sent it); a REMOTE one — a
 *   reply arriving over the bus — answers to the coarse cap: 1 for a channel/space-wide push, one per targeted room for
 *   a room push, and `UNCOUNTABLE_ROOM_MATCHER_REPLY_CAP` when a `$room` matcher resolves elsewhere. The exception that
 *   makes a window countable again is an exact-cid-only target whose every cid lives here.
 * - the REPLY FORWARD CAP: replies for a mid this process does not hold are forwarded over the bus, rate-capped per
 *   connection (`REPLY_FORWARD_MAX_PER_WINDOW`) — the mid is client-supplied, so a garbage flood must not become bus
 *   traffic.
 *
 * The remote half is driven by publishing FORGED bus envelopes (a foreign `pid`, so the engine does not drop them as
 * its own echo) through the fixture backplane — the honest way to exercise the multi-process paths in one process.
 */
import { afterAll, beforeAll, describe, expect, it, setDefaultTimeout } from 'bun:test'
import type { TestProjectOneClient } from './utils/project.one-client.js'
import { TestProjectOneClientFactory } from './utils/project.one-client.js'

setDefaultTimeout(120_000)

const tpf = TestProjectOneClientFactory.create({
  namespace: 'socket-external',
  portsRange: [4600, 4649],
  // the test drives the wire protocol directly — a blank transformer keeps payload strings plain JSON
  superjson: false,
})

/**
 * The fixture backplane: an in-memory Backplane (with the atomic `getDelete`) that records its calls and keeps every
 * bus message, and exposes `publishRaw` so a fixture handler can put a FORGED envelope on the bus.
 */
const backplaneModule = `type Call = { op: 'get' | 'getDelete' | 'set' | 'delete' | 'publish' | 'subscribe'; key?: string; ttlMs?: number }
export const calls: Call[] = []
export const busMessages: string[] = []
const subscribersByChannel = new Map<string, Set<(message: string) => void>>()
/** deliver a message to the bus subscribers WITHOUT recording it — how a test forges an envelope from "another process" */
export const publishRaw = (channel: string, message: string): void => {
  for (const subscriber of [...(subscribersByChannel.get(channel) ?? [])]) subscriber(message)
}
export const createTestBackplane = () => {
  const memory = new Map<string, { value: string; timer: ReturnType<typeof setTimeout> | undefined }>()
  return {
    get: (key: string) => {
      calls.push({ op: 'get', key })
      return memory.get(key)?.value
    },
    getDelete: (key: string) => {
      calls.push({ op: 'getDelete', key })
      const previous = memory.get(key)
      if (previous?.timer) clearTimeout(previous.timer)
      memory.delete(key)
      return previous?.value
    },
    set: (key: string, value: string, ttlMs?: number) => {
      calls.push({ op: 'set', key, ttlMs })
      const previous = memory.get(key)
      if (previous?.timer) clearTimeout(previous.timer)
      const timer = ttlMs === undefined ? undefined : setTimeout(() => memory.delete(key), ttlMs)
      timer?.unref()
      memory.set(key, { value, timer })
    },
    delete: (key: string) => {
      calls.push({ op: 'delete', key })
      const previous = memory.get(key)
      if (previous?.timer) clearTimeout(previous.timer)
      memory.delete(key)
    },
    publish: (channel: string, message: string) => {
      calls.push({ op: 'publish' })
      busMessages.push(message)
      publishRaw(channel, message)
    },
    subscribe: (channel: string, onMessage: (message: string) => void) => {
      calls.push({ op: 'subscribe' })
      const subscribers = subscribersByChannel.get(channel) ?? new Set()
      subscribers.add(onMessage)
      subscribersByChannel.set(channel, subscribers)
    },
  }
}
`

const writePoints = async (tp: TestProjectOneClient): Promise<void> => {
  await tp.write(
    'src/socket.points.tsx',
    `import { z } from 'zod'
import { root } from './lib/root.js'

export const chatChannel = root.lets('channel', 'chatChannel')
  .input(z.object({ userId: z.string() }))
  .connector(async ({ input }) => ({ me: 'user-' + input.userId }))
  .channel()

export const chatSpace = chatChannel.lets<{ chatId: string }>('space', 'chatSpace')
  .input(z.object({ chatId: z.string() }))
  .joiner(async ({ input }) => ({ chatId: input.chatId }))
  .space()

// a SPACE clientHandler — room and $room pushes ride it
export const pingHandler = chatSpace.lets('clientHandler', 'pingHandler')
  .serverSend(z.object({ ask: z.string() }))
  .clientReply(({ message }) => ({ answer: 'pong:' + message.ask }), z.object({ answer: z.string() }))
  .clientHandler()

// a CHANNEL clientHandler — one frame per connection, so a legit per-cid count is exactly 1
export const noticeHandler = chatChannel.lets('clientHandler', 'noticeHandler')
  .serverSend(z.object({ ask: z.string() }))
  .clientReply(({ message }) => ({ answer: 'ok:' + message.ask }), z.object({ answer: z.string() }))
  .clientHandler()

// a channel-wide collect: with an external backplane the window is uncountable, so only the timeout closes it
export const channelCollectHandler = chatChannel.lets('serverHandler', 'channelCollectHandler')
  .clientSend(z.object({ ask: z.string(), timeout: z.number() }))
  .serverReply(async ({ input }) => {
    const startedAt = Date.now()
    const replies = await noticeHandler.sendToClient({ ask: input.ask }, {}, { timeout: input.timeout, waitForAll: true })
    return { answers: replies.map((reply) => reply.data.answer), cids: replies.map((reply) => reply.connectionId), elapsed: Date.now() - startedAt }
  })
  .serverHandler()

// a collect over SEVERAL exact rooms — one frame per targeted room a connection is in, so the per-cid bound is 2
export const roomsCollectHandler = chatChannel.lets('serverHandler', 'roomsCollectHandler')
  .clientSend(z.object({ chatIds: z.array(z.string()), timeout: z.number() }))
  .serverReply(async ({ input }) => {
    const replies = await pingHandler.sendToClient(
      { ask: 'rooms' },
      { room: input.chatIds.map((chatId) => ({ chatId })) },
      { timeout: input.timeout, waitForAll: true },
    )
    return { answers: replies.map((reply) => reply.data.answer) }
  })
  .serverHandler()

// a $room matcher push — it resolves on every process, so THIS one cannot know how many frames a remote cid saw
export const matcherCollectHandler = chatChannel.lets('serverHandler', 'matcherCollectHandler')
  .clientSend(z.object({ chatId: z.string(), timeout: z.number() }))
  .serverReply(async ({ input }) => {
    const replies = await pingHandler.sendToClient(
      { ask: 'matched' },
      { $room: { chatId: input.chatId } },
      { timeout: input.timeout, waitForAll: true },
    )
    return { count: replies.length }
  })
  .serverHandler()

// exact cids only — the one target shape that stays countable under an external backplane, and only while every cid
// named resolves on THIS process
export const cidCollectHandler = chatChannel.lets('serverHandler', 'cidCollectHandler')
  .clientSend(z.object({ cids: z.array(z.string()), timeout: z.number() }))
  .serverReply(async ({ input }) => {
    const startedAt = Date.now()
    const replies = await noticeHandler.sendToClient(
      { ask: 'cids' },
      { connectionId: input.cids },
      { timeout: input.timeout, waitForAll: true },
    )
    return { answers: replies.map((reply) => reply.data.answer), elapsed: Date.now() - startedAt }
  })
  .serverHandler()

// forge replies from a connection that lives on ANOTHER process: a bus envelope with a foreign pid, published straight
// through the fixture backplane — onto the INITIATOR'S INBOX, which is where the sharded bus routes replies (the
// collect mid embeds the initiator's pid, and a remote process parses it off the mid alone)
export const forgeRepliesHandler = chatChannel.lets('serverHandler', 'forgeRepliesHandler')
  .clientSend(z.object({ mid: z.string(), cid: z.string(), count: z.number(), answer: z.string() }))
  .serverReply(async ({ input }) => {
    const { publishRaw } = await import('./test-backplane.js')
    const inbox = 'point0:socket:proc:' + input.mid.slice(0, input.mid.indexOf(':'))
    for (let index = 0; index < input.count; index++) {
      publishRaw(
        inbox,
        JSON.stringify({
          v: 1,
          kind: 'reply',
          pid: 'another-process',
          mid: input.mid,
          cid: input.cid,
          data: JSON.stringify({ answer: input.answer }),
        }),
      )
    }
    return { forged: input.count }
  })
  .serverHandler()

export const adminKickHandler = chatChannel.lets('serverHandler', 'adminKickHandler')
  .clientSend(z.object({ cid: z.string() }))
  .serverReply(async ({ input }) => {
    await chatChannel.kick({ connectionId: input.cid })
    return { ok: true }
  })
  .serverHandler()

// what the fixture backplane recorded — both handlers run in the spawned server process, sharing the module
export const kvOpsHandler = chatChannel.lets('serverHandler', 'kvOpsHandler')
  .clientSend(z.object({ key: z.string() }))
  .serverReply(async ({ input }) => {
    const { calls } = await import('./test-backplane.js')
    return { ops: calls.filter((call) => call.key === input.key).map((call) => call.op) }
  })
  .serverHandler()

export const busRepliesHandler = chatChannel.lets('serverHandler', 'busRepliesHandler')
  .clientSend(z.object({ midPrefix: z.string() }))
  .serverReply(async ({ input }) => {
    const { busMessages } = await import('./test-backplane.js')
    const forwarded = busMessages
      .map((message) => JSON.parse(message) as { kind?: string; mid?: string })
      .filter((envelope) => envelope.kind === 'reply' && (envelope.mid ?? '').startsWith(input.midPrefix))
    return { forwarded: forwarded.length }
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

/** Poll a predicate instead of sleeping on a guess — the suite shares a loaded machine. */
const waitFor = async (
  predicate: () => boolean | Promise<boolean>,
  what: string,
  timeoutMs = 15_000,
): Promise<void> => {
  const startedAt = Date.now()
  for (;;) {
    if (await predicate()) {
      return
    }
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error(`Timed out after ${timeoutMs}ms waiting for: ${what}`)
    }
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
}

describe('socket over an external backplane', () => {
  let tp: TestProjectOneClient

  const connect = async (userId: string): Promise<{ id: string; ticket: string }> => {
    const response = await fetch(`http://localhost:${tp.serverPort}/_point0/root/channel/chat-channel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    expect(response.ok).toBe(true)
    return (await response.json()) as { id: string; ticket: string }
  }

  const openWire = async (): Promise<WireClient> => {
    const wire = new WireClient(`ws://localhost:${tp.serverPort}/_point0/root/websocket`)
    await wire.waitOpen()
    return wire
  }

  const openAndClaim = async (userId: string): Promise<{ wire: WireClient; cid: string }> => {
    const { id, ticket } = await connect(userId)
    const wire = await openWire()
    wire.send({ t: 'claim', ticket })
    await wire.waitFrame((frame) => frame.t === 'claimed' && frame.cid === id)
    return { wire, cid: id }
  }

  /** ask the fixture backplane what it saw against one key, through a live connection */
  const kvOps = async (member: { wire: WireClient; cid: string }, key: string): Promise<string[]> => {
    const sendId = 'kv-' + Math.random().toString(36).slice(2)
    member.wire.send({
      t: 'send',
      id: sendId,
      cid: member.cid,
      handler: 'kvOpsHandler',
      input: JSON.stringify({ key }),
    })
    const reply = await member.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === sendId)
    return (JSON.parse(reply.data as string) as { ops: string[] }).ops
  }

  const connKey = (cid: string): string => `point0:socket:conn:${cid}`
  const ticketKey = (ticket: string): string => `point0:socket:ticket:${ticket}`

  beforeAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: false })
    tp = tpf.create()
    await tp.cleanup('ports')
    await tp.init()
    await writePoints(tp)
    await tp.write('src/test-backplane.ts', backplaneModule)
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

  it('the TTL slide is floored: a ping flood writes nothing, a ping past the floor writes once', async () => {
    const observer = await openAndClaim('kv-observer')
    const member = await openAndClaim('kv-renew')
    try {
      // the claim itself wrote the record twice — once at connect (createConnection), once to start the sliding
      // window from the claim
      const afterClaim = await kvOps(observer, connKey(member.cid))
      expect(afterClaim.filter((op) => op === 'set')).toHaveLength(2)

      // a burst of pings inside RENEW_MIN_INTERVAL_MS (10 s) adds NOT ONE write — the floor is what keeps a ping
      // flood from becoming a KV write flood
      for (let index = 0; index < 12; index++) {
        member.wire.send({ t: 'ping' })
      }
      await waitFor(
        () => member.wire.frames.filter((frame) => frame.t === 'pong').length === 12,
        'all twelve pongs back',
      )
      expect((await kvOps(observer, connKey(member.cid))).filter((op) => op === 'set')).toHaveLength(2)

      // past the floor the very next ping DOES slide the TTL — the record must not be allowed to expire under a live
      // connection (the floor is a debounce, not an off switch)
      await new Promise((resolve) => setTimeout(resolve, 10_500))
      member.wire.send({ t: 'ping' })
      await waitFor(
        async () => (await kvOps(observer, connKey(member.cid))).filter((op) => op === 'set').length === 3,
        'the renew write past the floor',
      )
    } finally {
      member.wire.close()
      observer.wire.close()
    }
  })

  it('the conn record is DELETED on every way out: a client close, a dead socket, a kick', async () => {
    const observer = await openAndClaim('kv-observer-2')
    try {
      // 1. the client closes the connection over a socket that stays up
      const closer = await openAndClaim('kv-close')
      expect(await kvOps(observer, connKey(closer.cid))).not.toContain('delete')
      closer.wire.send({ t: 'close', cid: closer.cid })
      await waitFor(
        async () => (await kvOps(observer, connKey(closer.cid))).includes('delete'),
        'the record delete after a close frame',
      )
      closer.wire.close()

      // 2. the socket dies under a live connection
      const dropped = await openAndClaim('kv-socket')
      dropped.wire.close()
      await waitFor(
        async () => (await kvOps(observer, connKey(dropped.cid))).includes('delete'),
        'the record delete after the socket died',
      )

      // 3. the server kicks it
      const kicked = await openAndClaim('kv-kick')
      observer.wire.send({
        t: 'send',
        id: 'kick1',
        cid: observer.cid,
        handler: 'adminKickHandler',
        input: JSON.stringify({ cid: kicked.cid }),
      })
      await kicked.wire.waitFrame((frame) => frame.t === 'closed')
      await waitFor(
        async () => (await kvOps(observer, connKey(kicked.cid))).includes('delete'),
        'the record delete after a kick',
      )
      kicked.wire.close()
    } finally {
      observer.wire.close()
    }
  })

  it('a discard drops BOTH the ticket and the connection record it stands for', async () => {
    const observer = await openAndClaim('kv-observer-3')
    const wire = await openWire()
    try {
      const abandoned = await connect('kv-discard')
      // the connect wrote the record and minted the ticket; nothing is deleted yet
      expect(await kvOps(observer, ticketKey(abandoned.ticket))).toEqual(['set'])
      expect(await kvOps(observer, connKey(abandoned.id))).toEqual(['set'])
      wire.send({ t: 'discard', ticket: abandoned.ticket })
      await waitFor(
        async () => (await kvOps(observer, connKey(abandoned.id))).includes('delete'),
        'the record delete after a discard',
      )
      // the discard reads the ticket (to learn whose record it is), then deletes both — the claim path's atomic
      // getDelete is not used here, because a discard must still know the cid
      expect(await kvOps(observer, ticketKey(abandoned.ticket))).toEqual(['set', 'get', 'delete'])
      // and the ticket really is gone
      wire.send({ t: 'claim', ticket: abandoned.ticket })
      const claimErr = await wire.waitFrame((frame) => frame.t === 'claimErr')
      expect(String(claimErr.error)).toContain('POINT0_SOCKET_TICKET_INVALID')
    } finally {
      wire.close()
      observer.wire.close()
    }
  })

  it('an uncountable window bounds a REMOTE cid to ONE reply per channel-wide push', async () => {
    const caller = await openAndClaim('cap-caller')
    const member = await openAndClaim('cap-member')
    try {
      // the member sees the push and reads the mid off it, then makes a connection that lives "elsewhere" answer the
      // same mid three times — one frame reached it, so only the first answer is legitimate
      const forging = (async () => {
        const msg = await member.wire.waitFrame((frame) => frame.t === 'msg' && frame.handler === 'noticeHandler')
        member.wire.send({
          t: 'send',
          id: 'forge1',
          cid: member.cid,
          handler: 'forgeRepliesHandler',
          input: JSON.stringify({ mid: msg.mid as string, cid: 'remote-cid-1', count: 3, answer: 'ok:from-remote' }),
        })
        await member.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 'forge1')
      })()
      caller.wire.send({
        t: 'send',
        id: 'cc1',
        cid: caller.cid,
        handler: 'channelCollectHandler',
        input: JSON.stringify({ ask: 'hi', timeout: 1500 }),
      })
      await forging
      const reply = await caller.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 'cc1')
      const out = JSON.parse(reply.data as string) as { answers: string[]; cids: string[]; elapsed: number }
      // exactly one of the three forged replies counted
      expect(out.cids.filter((cid) => cid === 'remote-cid-1')).toEqual(['remote-cid-1'])
      expect(out.answers.filter((answer) => answer === 'ok:from-remote')).toEqual(['ok:from-remote'])
      // and the window ran its full course — an external backplane makes the expectation unknowable, so nothing but
      // the timeout can close it
      expect(out.elapsed).toBeGreaterThanOrEqual(1400)
    } finally {
      caller.wire.close()
      member.wire.close()
    }
  })

  it('…one per TARGETED ROOM for a room push, and the generous 1024 when a `$room` matcher resolves elsewhere', async () => {
    const caller = await openAndClaim('cap2-caller')
    const member = await openAndClaim('cap2-member')
    try {
      // the member joins one of the two targeted rooms only so that a push happens at all; the bound under test is
      // the REMOTE cid's, which is two — one frame per targeted room
      member.wire.send({
        t: 'join',
        id: 'j1',
        cid: member.cid,
        space: 'chatSpace',
        input: JSON.stringify({ chatId: 'cap-a' }),
      })
      await member.wire.waitFrame((frame) => frame.t === 'joined' && frame.id === 'j1')

      const forge = async (count: number, answer: string, sendId: string): Promise<void> => {
        const msg = await member.wire.waitFrame((frame) => frame.t === 'msg' && frame.handler === 'pingHandler')
        member.wire.send({
          t: 'send',
          id: sendId,
          cid: member.cid,
          handler: 'forgeRepliesHandler',
          input: JSON.stringify({ mid: msg.mid as string, cid: 'remote-cid-2', count, answer }),
        })
        await member.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === sendId)
      }

      const forgingRooms = forge(5, 'pong:rooms', 'forge2')
      caller.wire.send({
        t: 'send',
        id: 'rc1',
        cid: caller.cid,
        handler: 'roomsCollectHandler',
        input: JSON.stringify({ chatIds: ['cap-a', 'cap-b'], timeout: 1200 }),
      })
      await forgingRooms
      const roomsReply = await caller.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 'rc1')
      const roomsOut = JSON.parse(roomsReply.data as string) as { answers: string[] }
      // two rooms were targeted, so at most two frames could have reached that remote cid — five answers, two counted
      expect(roomsOut.answers.filter((answer) => answer === 'pong:rooms')).toHaveLength(2)

      // a `$room` matcher resolves on every process — this one cannot know how many frames the remote saw, so the
      // bound is the constant. Forge past it and see it hold exactly.
      member.wire.frames.length = 0
      const forgingMatcher = forge(1030, 'pong:matched', 'forge3')
      caller.wire.send({
        t: 'send',
        id: 'mc1',
        cid: caller.cid,
        handler: 'matcherCollectHandler',
        input: JSON.stringify({ chatId: 'cap-a', timeout: 3000 }),
      })
      await forgingMatcher
      const matcherReply = await caller.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 'mc1', 30_000)
      const matcherOut = JSON.parse(matcherReply.data as string) as { count: number }
      // 1024 from the remote cid — plus nothing from the local member, which never answered its own frame
      expect(matcherOut.count).toBe(1024)
    } finally {
      caller.wire.close()
      member.wire.close()
    }
  })

  it('exact cids stay COUNTABLE while every cid lives here — one that does not makes the window wait it out', async () => {
    const caller = await openAndClaim('exact-caller')
    const member = await openAndClaim('exact-member')
    try {
      // the member answers its push as the real client runtime would
      const autoReply = (sendId: string): Promise<void> =>
        (async () => {
          const msg = await member.wire.waitFrame(
            (frame) => frame.t === 'msg' && frame.handler === 'noticeHandler' && frame.__seen !== true,
          )
          msg.__seen = true
          member.wire.send({
            t: 'reply',
            id: msg.mid as string,
            cid: member.cid,
            data: JSON.stringify({ answer: 'ok:' + sendId }),
          })
        })()

      const answering = autoReply('cids')
      caller.wire.send({
        t: 'send',
        id: 'xc1',
        cid: caller.cid,
        handler: 'cidCollectHandler',
        input: JSON.stringify({ cids: [member.cid], timeout: 3000 }),
      })
      await answering
      const exact = await caller.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 'xc1')
      const exactOut = JSON.parse(exact.data as string) as { answers: string[]; elapsed: number }
      expect(exactOut.answers).toEqual(['ok:cids'])
      // cids are globally unique, so resolving every one of them locally IS the whole truth — the window closed on
      // the count, long before its 3000ms timeout
      expect(exactOut.elapsed).toBeLessThan(1500)

      // add a cid this process does not hold and the resolution is no longer total: it may live on another process,
      // or nowhere at all, so the count is unknowable and only the timeout can close the window
      const answeringAgain = autoReply('ghost')
      caller.wire.send({
        t: 'send',
        id: 'xc2',
        cid: caller.cid,
        handler: 'cidCollectHandler',
        input: JSON.stringify({ cids: [member.cid, 'no-such-cid'], timeout: 1200 }),
      })
      await answeringAgain
      const ghost = await caller.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 'xc2')
      const ghostOut = JSON.parse(ghost.data as string) as { answers: string[]; elapsed: number }
      expect(ghostOut.answers).toEqual(['ok:ghost'])
      expect(ghostOut.elapsed).toBeGreaterThanOrEqual(1100)
    } finally {
      caller.wire.close()
      member.wire.close()
    }
  })

  it('replies for an unknown mid are forwarded over the bus — rate-capped per connection', async () => {
    const flooder = await openAndClaim('flood')
    const observer = await openAndClaim('flood-observer')
    try {
      // the mid is client-supplied: nothing stops a client inventing 300 of them, so the forward is bounded per
      // connection per window (REPLY_FORWARD_MAX_PER_WINDOW = 256). An invented mid carries no `<pid>:` marker, so
      // each forward falls back to the shared channel — the rate cap is exactly what keeps that from being a hose
      for (let index = 0; index < 300; index++) {
        flooder.wire.send({
          t: 'reply',
          id: `flood-mid-${index}`,
          cid: flooder.cid,
          data: JSON.stringify({ answer: 'x' }),
        })
      }
      const forwarded = async (): Promise<number> => {
        const sendId = 'bus-' + Math.random().toString(36).slice(2)
        observer.wire.send({
          t: 'send',
          id: sendId,
          cid: observer.cid,
          handler: 'busRepliesHandler',
          input: JSON.stringify({ midPrefix: 'flood-mid-' }),
        })
        const reply = await observer.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === sendId)
        return (JSON.parse(reply.data as string) as { forwarded: number }).forwarded
      }
      await waitFor(async () => (await forwarded()) >= 256, 'the forwarded replies to reach the cap')
      // exactly the cap — the 44 frames past it were dropped, not queued
      await new Promise((resolve) => setTimeout(resolve, 300))
      expect(await forwarded()).toBe(256)
    } finally {
      flooder.wire.close()
      observer.wire.close()
    }
  })
})
