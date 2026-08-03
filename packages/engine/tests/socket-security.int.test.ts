/**
 * The socket layer's security regressions — one test per hole a fix just closed, driven over the RAW wire.
 *
 * A raw WebSocket needs no SDK: every field of every frame is attacker-chosen, and every one of these tests is a client
 * that behaves like no real client ever would. What they pin is server behavior — the guard has to hold on the server
 * end, because a client-side check is a check the attacker deleted. `socket.int.test.ts` is the reference for the
 * harness (the same `WireClient`, `openAndClaim`, `joinRoom`); this file only carries what the fixes need.
 */
import { afterAll, beforeAll, describe, expect, it, setDefaultTimeout } from 'bun:test'
import type { TestProjectOneClient } from './utils/project.one-client.js'
import { TestProjectOneClientFactory } from './utils/project.one-client.js'

setDefaultTimeout(120_000)

const tpf = TestProjectOneClientFactory.create({
  namespace: 'socket-security',
  portsRange: [4800, 4899],
  // the tests drive the wire protocol directly — a blank transformer keeps payload strings plain JSON
  superjson: false,
})

/** the DEFAULT pre-claim frame budget (`unclaimedFrameMax` of engine/src/config.ts) — what an unconfigured app gets */
const UNCLAIMED_FRAME_MAX = 64

const pointsFile = `import { z } from 'zod'
import { root } from './lib/root.js'

export const chatChannel = root.lets('channel', 'chatChannel')
  .input(z.object({ userId: z.string() }))
  .connector(async ({ input }) => ({ me: 'user-' + input.userId }))
  .channel()

export const chatSpace = chatChannel.lets<{ chatId: string }>('space', 'chatSpace')
  .input(z.object({ chatId: z.string() }))
  .joiner(async ({ input }) => ({ chatId: input.chatId }))
  .space()

export const noticeHandler = chatSpace.lets('clientHandler', 'noticeHandler')
  .serverSend(z.object({ text: z.string() }))
  .clientHandler()

// a space handler: its send names the room, so a reply proves the connection is still in it
export const echoHandler = chatSpace.lets('serverHandler', 'echoHandler')
  .clientSend(z.object({ text: z.string() }))
  .serverReply(async ({ input, room }) => ({ ok: true, echo: input.text, chatId: room.chatId }))
  .serverHandler()

// a space-WIDE push (no room named) carving one room out — the \`except\` that names OTHER PEOPLE
export const exceptRoomPushHandler = chatChannel.lets('serverHandler', 'exceptRoomPushHandler')
  .clientSend(z.object({ chatId: z.string(), text: z.string() }))
  .serverReply(async ({ input }) => {
    void noticeHandler.sendToClient({ text: input.text }, { except: [{ chatId: input.chatId }] })
    return { ok: true }
  })
  .serverHandler()

// the same space-wide push carving one CONNECTION out — echo suppression, the deliberate topic-path fast lane
export const exceptCidPushHandler = chatChannel.lets('serverHandler', 'exceptCidPushHandler')
  .clientSend(z.object({ cid: z.string(), text: z.string() }))
  .serverReply(async ({ input }) => {
    void noticeHandler.sendToClient({ text: input.text }, { except: input.cid })
    return { ok: true }
  })
  .serverHandler()

// the documented pattern at its most exposed: NO \`.input\` schema, and the room is built straight out of what the
// wire said — so the room VALUE is attacker-chosen and only the room-shape rule stands between it and the index
export const rawSpace = chatChannel.lets<{ chatId: string }>('space', 'rawSpace')
  .joiner(({ input }) => ({ chatId: (input as { chatId: string }).chatId }))
  .space()

export const rawNoticeHandler = rawSpace.lets('clientHandler', 'rawNoticeHandler')
  .serverSend(z.object({ text: z.string() }))
  .clientHandler()

// a \`$room\` push — the sift scan an array-valued room would hijack
export const rawMatcherPushHandler = chatChannel.lets('serverHandler', 'rawMatcherPushHandler')
  .clientSend(z.object({ chatId: z.string(), text: z.string() }))
  .serverReply(async ({ input }) => {
    void rawNoticeHandler.sendToClient({ text: input.text }, { $room: { chatId: input.chatId } })
    return { ok: true }
  })
  .serverHandler()

// its own channel for the origin gate, so the counter holds exactly that test's connects: a refused handshake must
// leave it at zero — the gate runs BEFORE the connector, not after it minted a connection
export const gateRuns: string[] = []

export const gateChannel = root.lets('channel', 'gateChannel')
  .input(z.object({ userId: z.string() }))
  .connector(async ({ input }) => {
    gateRuns.push(input.userId)
    return { me: 'gate-' + input.userId }
  })
  .channel()

export const gateRunsQuery = root.lets('query', 'gateRuns')
  .loader(async () => ({ runs: gateRuns.length }))
  .query()
`

/**
 * The parked-cap project's extra points, appended to {@link pointsFile}: a RESUMABLE channel with a buffering handler —
 * the only shape that parks at all (a socket death on a resumable channel whose channel has something to buffer).
 * `parkPresenceHandler` reads the LOCAL connection list synchronously: a parked connection is publicly dead, so its
 * disappearance from there is how the test knows the park has landed before it makes the next one.
 */
const parkPointsFile = `
export const parkChannel = root.lets('channel', 'parkChannel')
  .input(z.object({ userId: z.string() }))
  .connector(async ({ input }) => ({ me: 'park-' + input.userId }))
  .channel({ resumable: true })

export const parkSpace = parkChannel.lets<{ boxId: string }>('space', 'parkSpace')
  .input(z.object({ boxId: z.string() }))
  .joiner(async ({ input }) => ({ boxId: input.boxId }))
  .space()

export const parkFeedHandler = parkSpace.lets('clientHandler', 'parkFeedHandler')
  .serverSend(z.object({ n: z.number() }))
  .clientHandler({ resumable: 64 })

export const parkPushHandler = parkChannel.lets('serverHandler', 'parkPushHandler')
  .clientSend(z.object({ boxId: z.string(), n: z.number() }))
  .serverReply(async ({ input }) => {
    void parkFeedHandler.sendToClient({ n: input.n }, { room: { boxId: input.boxId } })
    return { ok: true }
  })
  .serverHandler()

export const parkEchoHandler = parkSpace.lets('serverHandler', 'parkEchoHandler')
  .clientSend(z.object({ text: z.string() }))
  .serverReply(async ({ input, room }) => ({ echo: input.text, boxId: room.boxId }))
  .serverHandler()

export const parkPresenceHandler = parkChannel.lets('serverHandler', 'parkPresenceHandler')
  .clientSend(z.object({ me: z.string() }))
  .serverReply(async ({ input }) => ({
    count: parkChannel.connections.server.local.list({ $identity: { me: input.me } }).length,
  }))
  .serverHandler()
`

type WireFrame = Record<string, unknown> & { t: string }

/** the raw wire client — no SDK, no client-side filtering: what the socket carries is what this records. */
class WireClient {
  ws: WebSocket
  frames: WireFrame[] = []
  closed = false
  private waiters: Array<{ predicate: (frame: WireFrame) => boolean; resolve: (frame: WireFrame) => void }> = []
  private opened: Promise<void>
  private closedPromise: Promise<void>

  constructor(url: string) {
    this.ws = new WebSocket(url)
    this.opened = new Promise((resolve, reject) => {
      this.ws.addEventListener('open', () => {
        resolve()
      })
      this.ws.addEventListener('error', (event) => {
        reject(new Error(`WebSocket error: ${String((event as { message?: string }).message ?? 'unknown')}`))
      })
    })
    this.closedPromise = new Promise((resolve) => {
      this.ws.addEventListener('close', () => {
        this.closed = true
        resolve()
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

  /** Put an exact byte sequence on the wire — `null` and a bare array are not frames, so they have no object form. */
  sendRaw(text: string): void {
    this.ws.send(text)
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

  /** how many frames of a kind this socket has received — the frame budgets' only observable besides the close */
  count(t: string): number {
    return this.frames.filter((frame) => frame.t === t).length
  }

  /** every received `msg` frame, optionally of one handler, in arrival order */
  msgs(handler?: string): Array<WireFrame & { tseq?: number }> {
    return this.frames.filter((frame) => frame.t === 'msg' && (handler === undefined || frame.handler === handler))
  }

  /** the stream cursors a hand-rolled resume offers, keyed exactly as the client runtime keys them. */
  cursors(): Record<string, number> {
    const cursors: Record<string, number> = {}
    for (const frame of this.msgs()) {
      if (typeof frame.tseq !== 'number') {
        continue
      }
      const space = frame.space as string | undefined
      const room = frame.room as string | undefined
      const streamKey =
        frame.cid !== undefined
          ? 'p'
          : space === undefined
            ? 'c'
            : room === undefined
              ? `s:${space}`
              : `r:${space}:${room}`
      cursors[streamKey] = Math.max(cursors[streamKey] ?? 0, frame.tseq)
    }
    return cursors
  }

  /** resolves when the SERVER closed the socket (or `false` when it is still up after the budget) */
  async waitClosed(timeoutMs: number): Promise<boolean> {
    return await Promise.race([
      this.closedPromise.then(() => true),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), timeoutMs)),
    ])
  }

  close(): void {
    this.ws.close()
  }
}

const connectChannel = async (
  tp: TestProjectOneClient,
  input: Record<string, unknown>,
  channelKebab = 'chat-channel',
): Promise<{ id: string; ticket: string; response: Response }> => {
  const response = await fetch(`http://localhost:${tp.serverPort}/_point0/root/channel/${channelKebab}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!response.ok) {
    return { id: '', ticket: '', response }
  }
  const data = (await response.json()) as { id: string; ticket: string }
  return { ...data, response }
}

/** open a bare socket on the scope's websocket endpoint — the shape every pre-claim test drives. */
const openWire = async (tp: TestProjectOneClient): Promise<WireClient> => {
  const wire = new WireClient(`ws://localhost:${tp.serverPort}/_point0/root/websocket`)
  await wire.waitOpen()
  return wire
}

/** connect + claim on any channel of the project; `resumeKey` is present only on a resumable one. */
const openAndClaimOn = async (
  tp: TestProjectOneClient,
  channelKebab: string,
  input: Record<string, unknown>,
): Promise<{ wire: WireClient; cid: string; resumeKey: string | undefined }> => {
  const connect = await connectChannel(tp, input, channelKebab)
  expect(connect.response.ok).toBe(true)
  const wire = await openWire(tp)
  wire.send({ t: 'claim', ticket: connect.ticket })
  const claimed = await wire.waitFrame((frame) => frame.t === 'claimed' && frame.cid === connect.id)
  return { wire, cid: connect.id, resumeKey: claimed.resumeKey as string | undefined }
}

const openAndClaim = async (tp: TestProjectOneClient, userId: string): Promise<{ wire: WireClient; cid: string }> =>
  await openAndClaimOn(tp, 'chat-channel', { userId })

/** join a chatSpace room over an existing claimed socket; returns the serialized rooms the server admitted. */
const joinRoom = async (
  wire: WireClient,
  cid: string,
  chatId: string,
  joinId = 'j-' + chatId + '-' + cid,
): Promise<string[]> => {
  wire.send({ t: 'join', id: joinId, cid, space: 'chatSpace', input: JSON.stringify({ chatId }) })
  const joined = await wire.waitFrame((frame) => frame.t === 'joined' && frame.id === joinId)
  return joined.rooms as string[]
}

/** send one handler message and return whatever answered it — a `reply` or a `sendErr`. */
const sendOver = async (
  wire: WireClient,
  cid: string,
  handler: string,
  input?: unknown,
  room?: unknown,
): Promise<WireFrame> => {
  const sendId = 's-' + Math.random().toString(36).slice(2)
  wire.send({
    t: 'send',
    id: sendId,
    cid,
    handler,
    ...(input === undefined ? {} : { input: JSON.stringify(input) }),
    ...(room === undefined ? {} : { room: JSON.stringify(room) }),
  })
  return await wire.waitFrame((frame) => (frame.t === 'reply' || frame.t === 'sendErr') && frame.id === sendId)
}

/** let whatever was NOT supposed to arrive have every chance to arrive before the absence is asserted. */
const settle = async (ms = 400): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

/** poll a condition instead of sleeping on a guess — a loaded machine may make a test slower, never red. */
const waitUntil = async (
  predicate: () => boolean | Promise<boolean>,
  what: string,
  timeoutMs = 20_000,
): Promise<void> => {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    if (await predicate()) {
      return
    }
    if (Date.now() > deadline) {
      throw new Error(`Timed out after ${timeoutMs}ms waiting for: ${what}`)
    }
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
}

/**
 * A second project of this suite whose engine takes an OPTION OBJECT instead of `socket: true` — the only way to prove
 * a threshold is read from the options rather than from a default that happens to hold.
 */
const createConfiguredProject = async (
  socketOptions: string,
  points: string = pointsFile,
): Promise<TestProjectOneClient> => {
  const project = tpf.create()
  await project.cleanup('ports')
  await project.init()
  await project.write('src/socket.points.tsx', points)
  await project.replace('src/engine.ts', 'socket: true,', `socket: ${socketOptions},`)
  project.spawn(['bun', 'run', 'dev'])
  await project.waitStarted()
  return project
}

/** does this frame carry a push of `handler` with the given text? */
const isTextMsg =
  (handler: string, text: string) =>
  (frame: WireFrame): boolean =>
    frame.t === 'msg' &&
    frame.handler === handler &&
    frame.input !== undefined &&
    (JSON.parse(frame.input as string) as { text: string }).text === text

/** dial a url and report whether the handshake completed — the origin gate's only observable from a real client. */
const openSocket = (url: string, headers?: Record<string, string>): Promise<'open' | 'failed'> =>
  new Promise((resolve) => {
    const ws = new WebSocket(url, { headers } as never)
    ws.addEventListener('open', () => {
      // resolve BEFORE close(): Bun dispatches the 'close' event synchronously inside close(), and the promise
      // resolves with whichever listener runs first
      resolve('open')
      ws.close()
    })
    ws.addEventListener('error', () => {
      resolve('failed')
    })
    ws.addEventListener('close', () => {
      resolve('failed')
    })
  })

describe('socket security', () => {
  let tp: TestProjectOneClient

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

  it('drops a frame whose fields are not the types the protocol promises, and the socket lives on', async () => {
    // WOULD BREAK: `JSON.parse` answers `any` and SocketClientFrame is a TYPE — without `parseSocketClientFrame`
    // (packages/core/src/socket.ts) every one of these reaches a handler with a field of the wrong kind: `null`
    // throws reading `.t` inside the ws callback, an operator-shaped `cid` is a selector where a key is expected, a
    // `null` handler name goes to findPoint, and a string `rooms` is iterated as characters. A version-skewed client
    // must survive, so the frame is DROPPED rather than answered or punished — which is what "no new frames" pins.
    const { wire, cid } = await openAndClaim(tp, 'wire')
    try {
      await joinRoom(wire, cid, 'wire-room')
      const framesBefore = wire.frames.length
      wire.sendRaw('null')
      wire.sendRaw('[1,2,3]')
      wire.sendRaw(JSON.stringify({ t: 'close', cid: { $ne: null } }))
      wire.sendRaw(JSON.stringify({ t: 'send', id: 'w1', cid, handler: null }))
      wire.sendRaw(JSON.stringify({ t: 'leave', cid, space: 'chatSpace', rooms: 'oops' }))
      await settle()
      // not one of them was answered: a `send` that reached the dispatch would have come back as `sendErr`
      expect(wire.frames.length).toBe(framesBefore)
      expect(wire.closed).toBe(false)
      // and the SAME socket still answers a legitimate frame — with the membership the malformed `leave` named still
      // intact, since a space-handler send is refused outright when the connection is not in the room it names
      wire.send({
        t: 'send',
        id: 'w2',
        cid,
        handler: 'echoHandler',
        room: JSON.stringify({ chatId: 'wire-room' }),
        input: JSON.stringify({ text: 'alive' }),
      })
      const reply = await wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 'w2')
      expect(JSON.parse(reply.data as string)).toMatchObject({ ok: true, echo: 'alive', chatId: 'wire-room' })
    } finally {
      wire.close()
    }
  })

  // NOTE (item 2 of the brief): "a space-handler send naming no room is refused with POINT0_SOCKET_NOT_IN_ROOM" is
  // already pinned by socket.int.test.ts → 'refuses a space-handler send that names NO room (the wire cannot skip the
  // membership check)', including the silent victim. Deliberately not duplicated here.

  it('an `except` of a ROOM is enforced by the server; an `except` of a connection id rides the frame', async () => {
    // WOULD BREAK: an `except` naming a room names OTHER PEOPLE. The old behavior published the frame to the whole
    // space topic with `exceptRooms` riding it and asked each client to drop it — so the payload was on the excluded
    // connection's wire, and a client that skips the check (or just reads its socket) had it. The assertion is on the
    // RAW frames for exactly that reason: a client-level assertion would pass even after a regression.
    // The cid case is the deliberate opposite and must NOT drift to the personal path: it excludes the connection that
    // AUTHORED the payload, so hiding it from its own author protects nothing and would cost the topic fan-out.
    const inSecret = await openAndClaim(tp, 'ex-secret')
    const inPublic = await openAndClaim(tp, 'ex-public')
    const pusher = await openAndClaim(tp, 'ex-push')
    try {
      await joinRoom(inSecret.wire, inSecret.cid, 'ex-secret-room')
      await joinRoom(inPublic.wire, inPublic.cid, 'ex-public-room')
      // a SPACE-WIDE push (no room named) that carves the secret room out
      pusher.wire.send({
        t: 'send',
        id: 'x1',
        cid: pusher.cid,
        handler: 'exceptRoomPushHandler',
        input: JSON.stringify({ chatId: 'ex-secret-room', text: 'carved' }),
      })
      await pusher.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 'x1')
      const delivered = await inPublic.wire.waitFrame(isTextMsg('noticeHandler', 'carved'))
      // the carve-out was APPLIED, not shipped: the frame that did arrive names no excepted rooms at all
      expect(delivered.exceptRooms).toBeUndefined()
      await settle()
      // …and the excluded connection's wire never carried it
      expect(inSecret.wire.frames.find(isTextMsg('noticeHandler', 'carved'))).toBeUndefined()

      // the complementary case: `except: <connectionId>` stays on the topic path — the frame reaches the excepted
      // connection and carries the exception, which is the documented echo-suppression fast path
      pusher.wire.send({
        t: 'send',
        id: 'x2',
        cid: pusher.cid,
        handler: 'exceptCidPushHandler',
        input: JSON.stringify({ cid: inSecret.cid, text: 'echo' }),
      })
      await pusher.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 'x2')
      const echoed = await inSecret.wire.waitFrame(isTextMsg('noticeHandler', 'echo'))
      expect(echoed.exceptConnectionIds).toEqual([inSecret.cid])
    } finally {
      inSecret.wire.close()
      inPublic.wire.close()
      pusher.wire.close()
    }
  })

  it('takes a room of any shape — an array field matches a $room selection by containment, as sift does', async () => {
    // NOT a refusal: a room is whatever the joiner returns, arrays included — a direct-message room
    // `{ members: [a, b].sort() }` is the canonical one. $room compiles to sift, so an array field matches the way
    // MongoDB matches: by containment. That is the feature; what an app owes in return is a schema on the join input,
    // because a joiner that forwards the wire untouched (this space, deliberately) forwards whatever it was sent.
    const wide = await openAndClaim(tp, 'raw-wide')
    const member = await openAndClaim(tp, 'raw-mem')
    try {
      wide.wire.send({
        t: 'join',
        id: 'r1',
        cid: wide.cid,
        space: 'rawSpace',
        input: JSON.stringify({ chatId: ['lobby', 'ceo-private'] }),
      })
      const joined = await wide.wire.waitFrame((frame) => frame.t === 'joined' && frame.id === 'r1')
      expect(joined.rooms).toEqual([JSON.stringify({ chatId: ['lobby', 'ceo-private'] })])

      member.wire.send({
        t: 'join',
        id: 'r2',
        cid: member.cid,
        space: 'rawSpace',
        input: JSON.stringify({ chatId: 'ceo-private' }),
      })
      await member.wire.waitFrame((frame) => frame.t === 'joined' && frame.id === 'r2')

      member.wire.send({
        t: 'send',
        id: 'r3',
        cid: member.cid,
        handler: 'rawMatcherPushHandler',
        input: JSON.stringify({ chatId: 'ceo-private', text: 'private' }),
      })
      await member.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 'r3')
      await member.wire.waitFrame(isTextMsg('rawNoticeHandler', 'private'))
      // the array room contains 'ceo-private', so the selection reaches it — sift semantics, not an accident
      await wide.wire.waitFrame(isTextMsg('rawNoticeHandler', 'private'))
    } finally {
      wide.wire.close()
      member.wire.close()
    }
  })

  it('closes a socket that pipelines past the pre-claim frame budget; a claimed one is charged far more generously', async () => {
    // WOULD BREAK: before the claim there is no identity and no app hook at all — no `.joiner`, no
    // `onBeforeServerReply` — yet `claim`, `discard` and `resume` each cost backplane round trips. It is the one rate
    // bound an app cannot write for itself, so the engine owes it. Without the budget an unauthenticated socket can
    // pipeline pre-auth frames forever.
    const flooder = new WireClient(`ws://localhost:${tp.serverPort}/_point0/root/websocket`)
    try {
      await flooder.waitOpen()
      // a real client's whole pre-claim life is one frame; this one never claims anything
      flooder.send({ t: 'ping' })
      await flooder.waitFrame((frame) => frame.t === 'pong')
      for (let i = 0; i < UNCLAIMED_FRAME_MAX + 10; i++) {
        flooder.send({ t: 'ping' })
      }
      expect(await flooder.waitClosed(10_000)).toBe(true)
      // the server stopped answering at the budget instead of closing after servicing everything
      expect(flooder.frames.filter((frame) => frame.t === 'pong').length).toBeLessThanOrEqual(UNCLAIMED_FRAME_MAX)
    } finally {
      flooder.close()
    }
    // the other half of the fix: a CLAIMED socket answers to its OWN budget (`claimedFrameMax`, generous by default
    // and switched off with `0`) — the same burst that killed the unclaimed socket must not cost a real client its
    // connection. The lowered-option proof that the claimed budget is real lives in the option-set project below
    const { wire, cid } = await openAndClaim(tp, 'budget')
    try {
      for (let i = 0; i < UNCLAIMED_FRAME_MAX * 2; i++) {
        wire.send({ t: 'ping' })
      }
      await settle()
      expect(wire.closed).toBe(false)
      wire.send({ t: 'join', id: 'b1', cid, space: 'chatSpace', input: JSON.stringify({ chatId: 'budget' }) })
      const joined = await wire.waitFrame((frame) => frame.t === 'joined' && frame.id === 'b1')
      expect(joined.rooms).toEqual([JSON.stringify({ chatId: 'budget' })])
    } finally {
      wire.close()
    }
  })

  it('refuses a cross-origin websocket handshake on both upgrade shapes (CSWSH)', async () => {
    // WOULD BREAK: a browser puts `Origin` on a handshake and then applies NO same-origin policy to the answer — the
    // upgrade succeeds cross-site, carrying the visitor's cookies, and CORS never enters the picture. Without this gate
    // any page on the internet opens a socket to this server as whoever is signed in on it; on the cold-start
    // upgrade-connect it also gets a live connection under their identity, because the `.connector` runs on the
    // handshake itself. Hence both shapes, and hence the connector counter below.
    const port = tp.serverPort
    const hostile = { origin: 'http://evil.example' }
    const bareUrl = `ws://localhost:${port}/_point0/root/websocket`

    // ---- the bare endpoint: GET /_point0/<scope>/websocket ----
    expect(await openSocket(bareUrl, hostile)).toBe('failed')
    // a non-browser client sends no `Origin` at all (Bun's WebSocket does not) — there is no site to forge from, so it
    // passes, and this is the case a too-eager gate would break
    expect(await openSocket(bareUrl)).toBe('open')
    // the status behind those handshakes, read with a fetch that carries the upgrade header but is not a real
    // handshake (the endpoint matches on `Upgrade: websocket` alone — without it the path is an ordinary 404): 403 is
    // the gate, 400 is "the gate passed and this request simply was not a handshake" — the marker response reached
    // `bunServer.upgrade`, which refused it for want of a `Sec-WebSocket-Key`
    const httpUrl = `http://localhost:${port}/_point0/root/websocket`
    const asUpgrade = (extra?: Record<string, string>): RequestInit => ({
      headers: { upgrade: 'websocket', connection: 'Upgrade', ...extra },
    })
    const hostileResponse = await fetch(httpUrl, asUpgrade(hostile))
    expect(hostileResponse.status).toBe(403)
    expect(await hostileResponse.text()).toContain('Forbidden websocket origin')
    expect((await fetch(httpUrl, asUpgrade())).status).toBe(400)
    expect((await fetch(httpUrl, asUpgrade({ origin: `http://localhost:${port}` }))).status).toBe(400)

    // ---- the channel endpoint: GET .../channel/<name>?input={} with Upgrade: websocket ----
    const input = encodeURIComponent(JSON.stringify({ userId: 'gate' }))
    const channelUrl = `ws://localhost:${port}/_point0/root/channel/gate-channel?input=${input}`
    expect(await openSocket(channelUrl, hostile)).toBe('failed')
    // …and the refusal happened BEFORE the connector: a rejected handshake must not mint a connection either
    const runsAfterRefusal = await fetch(`http://localhost:${port}/_point0/root/query/gate-runs`)
    expect(await runsAfterRefusal.text()).toContain('"runs":0')
    expect(await openSocket(channelUrl)).toBe('open')
    const runsAfterAccept = await fetch(`http://localhost:${port}/_point0/root/query/gate-runs`)
    expect(await runsAfterAccept.text()).toContain('"runs":1')
  })

  it('socket: { allowedOrigins } admits exactly the listed origins, and same-origin keeps working', async () => {
    // WOULD BREAK: the default is `'same-origin'`, so an app legitimately dialed from another origin (a Capacitor
    // shell, a separately hosted front end) needs a way in that is not "turn the gate off". The list is matched
    // EXACTLY and adds to same-origin rather than replacing it — an allowlist that silently disabled the host check
    // would be worse than no option at all.
    const project: TestProjectOneClient = tpf.create()
    await project.cleanup('ports')
    await project.init()
    await project.write('src/socket.points.tsx', pointsFile)
    await project.replace('src/engine.ts', 'socket: true,', `socket: { allowedOrigins: ['capacitor://localhost'] },`)
    project.spawn(['bun', 'run', 'dev'])
    await project.waitStarted()
    const bareUrl = `ws://localhost:${project.serverPort}/_point0/root/websocket`
    // the listed origin gets in…
    expect(await openSocket(bareUrl, { origin: 'capacitor://localhost' })).toBe('open')
    // …and nothing else does — not a neighbour of it, not a prefix of it
    expect(await openSocket(bareUrl, { origin: 'capacitor://localhost.evil.example' })).toBe('failed')
    expect(await openSocket(bareUrl, { origin: 'http://evil.example' })).toBe('failed')
    // same-origin and no-origin still pass: the list ADDS
    expect(await openSocket(bareUrl, { origin: `http://localhost:${project.serverPort}` })).toBe('open')
    expect(await openSocket(bareUrl)).toBe('open')
  })
})

/**
 * The thresholds as OPTIONS. Every value here is deliberately far below its default, so each assertion fails on a
 * server that ignores the option and keeps its own number — which is the whole point: a test against the default proves
 * the constant, not the plumbing. `unclaimedFrameWindow`/`claimedFrameWindow` are stretched to a minute so a loaded
 * machine cannot roll a window mid-burst and make a red test green.
 */
describe('socket security — the frame and wire limits are engine options', () => {
  let tp: TestProjectOneClient

  const UNCLAIMED_MAX = 3
  const CLAIMED_MAX = 8
  const RESUME_ENTRIES_MAX = 2
  const LEAVE_ROOMS_MAX = 2

  beforeAll(async () => {
    tp = await createConfiguredProject(
      `{ unclaimedFrameMax: ${UNCLAIMED_MAX}, unclaimedFrameWindow: 60_000, claimedFrameMax: ${CLAIMED_MAX}, claimedFrameWindow: 60_000, maxResumeEntries: ${RESUME_ENTRIES_MAX}, maxLeaveRooms: ${LEAVE_ROOMS_MAX} }`,
    )
  })

  afterAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: false })
  })

  it('`unclaimedFrameMax` is read from the options: the socket dies at 3, nowhere near the default 64', async () => {
    const wire = await openWire(tp)
    try {
      for (let i = 0; i < UNCLAIMED_MAX; i++) {
        wire.send({ t: 'ping' })
      }
      await waitUntil(() => wire.count('pong') === UNCLAIMED_MAX, 'the pongs inside the budget')
      // a server holding the default would not even be halfway through its budget here
      expect(UNCLAIMED_MAX).toBeLessThan(UNCLAIMED_FRAME_MAX)
      expect(wire.closed).toBe(false)
      wire.send({ t: 'ping' })
      expect(await wire.waitClosed(20_000)).toBe(true)
      // it stopped ANSWERING at the budget too — the close is not a courtesy after servicing the flood
      expect(wire.count('pong')).toBe(UNCLAIMED_MAX)
    } finally {
      wire.close()
    }
  })

  it('`claimedFrameMax` bounds a CLAIMED socket, and the pre-claim frames it already spent do not follow it in', async () => {
    // the claim itself is charged to the PRE-CLAIM budget (1 of 3) — and the counter resets on the crossing, so the
    // claimed budget starts from zero: exactly `claimedFrameMax` frames go through after it, and the next one closes
    const flooder = await openAndClaim(tp, 'claimed-budget')
    try {
      for (let i = 0; i < CLAIMED_MAX; i++) {
        flooder.wire.send({ t: 'ping' })
      }
      await waitUntil(() => flooder.wire.count('pong') === CLAIMED_MAX, 'the pongs inside the claimed budget')
      expect(flooder.wire.closed).toBe(false)
      flooder.wire.send({ t: 'ping' })
      expect(await flooder.wire.waitClosed(20_000)).toBe(true)
      expect(flooder.wire.count('pong')).toBe(CLAIMED_MAX)
    } finally {
      flooder.wire.close()
    }

    // a socket UNDER the budget is untouched, and its frames keep doing their work — the budget is a flood bound,
    // not a per-socket quota a real client can trip
    const quiet = await openAndClaim(tp, 'under-budget')
    try {
      for (let i = 0; i < CLAIMED_MAX - 3; i++) {
        quiet.wire.send({ t: 'ping' })
      }
      await waitUntil(() => quiet.wire.count('pong') === CLAIMED_MAX - 3, 'the quiet pongs')
      expect(await joinRoom(quiet.wire, quiet.cid, 'under')).toEqual([JSON.stringify({ chatId: 'under' })])
      expect(quiet.wire.closed).toBe(false)
    } finally {
      quiet.wire.close()
    }
  })

  it('`maxResumeEntries` is read from the options: a 3-entry resume never becomes a frame, a 2-entry one is answered', async () => {
    // the wire guard takes its caps from the engine (`wireLimits` → `parseSocketClientFrame`) — a batch over the
    // option is DROPPED whole, exactly like unparseable bytes, and the socket lives on
    const wire = await openWire(tp)
    try {
      const entry = (cid: string): Record<string, unknown> => ({ cid, key: 'k-' + cid, cursors: {} })
      expect(RESUME_ENTRIES_MAX).toBeLessThan(64)
      wire.send({ t: 'resume', entries: [entry('a'), entry('b'), entry('c')] })
      await settle()
      expect(wire.frames).toHaveLength(0)
      expect(wire.closed).toBe(false)
      // at the cap the frame IS a frame: each offered cid gets its own oracle-free refusal, which is what proves the
      // batch above was refused by its SIZE and not by the dispatch behind it
      wire.send({ t: 'resume', entries: [entry('a'), entry('b')] })
      await wire.waitFrame((frame) => frame.t === 'resumeErr' && frame.cid === 'a')
      await wire.waitFrame((frame) => frame.t === 'resumeErr' && frame.cid === 'b')
    } finally {
      wire.close()
    }
  })

  it('`maxLeaveRooms` is read from the options: an over-cap leave is dropped and the membership survives it', async () => {
    const { wire, cid } = await openAndClaim(tp, 'leave-cap')
    try {
      const roomA = JSON.stringify({ chatId: 'leave-a' })
      const roomB = JSON.stringify({ chatId: 'leave-b' })
      await joinRoom(wire, cid, 'leave-a')
      await joinRoom(wire, cid, 'leave-b')
      expect(LEAVE_ROOMS_MAX).toBeLessThan(1024)
      // THREE rooms — over the option, far under the default: the frame is dropped, so nothing leaves anything
      wire.send({ t: 'leave', cid, space: 'chatSpace', rooms: [roomA, roomB, JSON.stringify({ chatId: 'leave-c' })] })
      await settle()
      const stillIn = await sendOver(wire, cid, 'echoHandler', { text: 'in' }, { chatId: 'leave-a' })
      expect(stillIn.t).toBe('reply')
      expect(JSON.parse(stillIn.data as string)).toMatchObject({ echo: 'in', chatId: 'leave-a' })
      // AT the cap the leave is taken — the same frame minus one room, and the membership is gone
      wire.send({ t: 'leave', cid, space: 'chatSpace', rooms: [roomA, roomB] })
      await settle()
      const out = await sendOver(wire, cid, 'echoHandler', { text: 'out' }, { chatId: 'leave-a' })
      expect(out.t).toBe('sendErr')
      expect(String(out.error)).toContain('POINT0_SOCKET_NOT_IN_ROOM')
    } finally {
      wire.close()
    }
  })
})

/**
 * The two remaining knobs, on one project because they never meet: `unclaimedFrameMax: 0` (the budget switched OFF —
 * the escape hatch an app with a chatty pre-claim handshake needs) and `maxParkedConnections: 1` (the ceiling on the
 * resumable connections one process holds buffers for).
 */
describe('socket security — a budget switched off, and the parked-connection ceiling', () => {
  let tp: TestProjectOneClient

  beforeAll(async () => {
    tp = await createConfiguredProject(`{ unclaimedFrameMax: 0, maxParkedConnections: 1 }`, pointsFile + parkPointsFile)
  })

  afterAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: false })
  })

  it('`unclaimedFrameMax: 0` switches the pre-claim budget off — the flood that closes a default server lives', async () => {
    const wire = await openWire(tp)
    try {
      const burst = UNCLAIMED_FRAME_MAX * 3
      for (let i = 0; i < burst; i++) {
        wire.send({ t: 'ping' })
      }
      // every one of them was answered: `0` is off, not "zero allowed" — the socket that the default would have
      // closed at 64 is still serving at 192
      await waitUntil(() => wire.count('pong') === burst, 'every pong of the off-budget burst')
      expect(wire.closed).toBe(false)
    } finally {
      wire.close()
    }
  })

  it('`maxParkedConnections` sweeps the oldest park — and its client still resumes, from the passport, without the proof', async () => {
    // WOULD BREAK: every park keeps its rooms indexed, its streams buffered and its bus topics subscribed for the
    // whole park window, and connect-then-drop is a cheap thing to do in a loop — so the parks are capped. What the
    // cap must NOT cost is the connection: the KV record and the resume right outlive the buffer, so a swept park
    // still resumes — from the passport instead of the buffer, and it says so (`gapless: false`, nothing replayed).
    const pusher = await openAndClaimOn(tp, 'park-channel', { userId: 'pusher' })
    const first = await openAndClaimOn(tp, 'park-channel', { userId: 'first' })
    const second = await openAndClaimOn(tp, 'park-channel', { userId: 'second' })
    const roomKey = (boxId: string): string => `r:parkSpace:${JSON.stringify({ boxId })}`
    const presence = async (me: string): Promise<number> => {
      const reply = await sendOver(pusher.wire, pusher.cid, 'parkPresenceHandler', { me })
      expect(reply.t).toBe('reply')
      return (JSON.parse(reply.data as string) as { count: number }).count
    }
    const push = async (boxId: string, n: number): Promise<void> => {
      const reply = await sendOver(pusher.wire, pusher.cid, 'parkPushHandler', { boxId, n })
      expect(reply.t).toBe('reply')
    }
    try {
      expect(first.resumeKey).toBeDefined()
      expect(second.resumeKey).toBeDefined()
      for (const member of [
        { member: first, boxId: 'box-1' },
        { member: second, boxId: 'box-2' },
      ]) {
        member.member.wire.send({
          t: 'join',
          id: 'j-' + member.boxId,
          cid: member.member.cid,
          space: 'parkSpace',
          input: JSON.stringify({ boxId: member.boxId }),
        })
        await member.member.wire.waitFrame((frame) => frame.t === 'joined' && frame.id === 'j-' + member.boxId)
      }
      // one live push each — the cursor both clients resume from
      await push('box-1', 1)
      await push('box-2', 1)
      await waitUntil(() => first.wire.msgs('parkFeedHandler').length === 1, "the first member's live push")
      await waitUntil(() => second.wire.msgs('parkFeedHandler').length === 1, "the second member's live push")
      const firstCursors = first.wire.cursors()
      const secondCursors = second.wire.cursors()
      expect(firstCursors[roomKey('box-1')]).toBe(1)
      expect(secondCursors[roomKey('box-2')]).toBe(1)

      // PARK ONE — the socket dies, the connection is publicly dead, the buffer starts collecting for it
      first.wire.close()
      await waitUntil(async () => (await presence('park-first')) === 0, 'the first connection to park')
      await push('box-1', 2)

      // PARK TWO — at the ceiling of one, so the oldest park (the first member's, buffer and all) is swept to make
      // room for it. Nothing announces that; the resume verdicts below are the observable
      second.wire.close()
      await waitUntil(async () => (await presence('park-second')) === 0, 'the second connection to park')
      await push('box-2', 2)

      // the SWEPT one resumes all the same: the passport is the right to resume, and the park was only the buffer
      const firstFresh = await openWire(tp)
      firstFresh.send({ t: 'resume', entries: [{ cid: first.cid, key: first.resumeKey!, cursors: firstCursors }] })
      const firstResumed = await firstFresh.waitFrame((frame) => frame.t === 'resumed' && frame.cid === first.cid)
      const firstStreams = firstResumed.streams as Record<string, { gapless: boolean; head: number }>
      // …and it is HONEST about what it lost: the room whose buffer the sweep took cannot be vouched for, and the
      // frame that was in it is not replayed — the client refetches on the verdict, which is what the verdict is for
      expect(firstStreams[roomKey('box-1')].gapless).toBe(false)
      await settle()
      expect(firstFresh.msgs('parkFeedHandler')).toHaveLength(0)
      // the rooms came back with it — the swept park cost the buffer, not the membership
      const echo = await sendOver(firstFresh, first.cid, 'parkEchoHandler', { text: 'back' }, { boxId: 'box-1' })
      expect(echo.t).toBe('reply')
      expect(JSON.parse(echo.data as string)).toMatchObject({ echo: 'back', boxId: 'box-1' })

      // the CONTRAST that makes the sweep attributable: the park the ceiling kept is a full unpark — the same
      // lifecycle, one buffered frame replayed, and its room's proof intact
      const secondFresh = await openWire(tp)
      secondFresh.send({ t: 'resume', entries: [{ cid: second.cid, key: second.resumeKey!, cursors: secondCursors }] })
      const secondResumed = await secondFresh.waitFrame((frame) => frame.t === 'resumed' && frame.cid === second.cid)
      const secondStreams = secondResumed.streams as Record<string, { gapless: boolean; head: number }>
      expect(secondStreams[roomKey('box-2')]).toEqual({ gapless: true, head: 2 })
      await waitUntil(() => secondFresh.msgs('parkFeedHandler').length === 1, 'the replayed frame of the kept park')
      const replayed = secondFresh.msgs('parkFeedHandler')[0]
      expect(replayed.tseq).toBe(2)
      expect(replayed.rp).toBe(true)
      expect(JSON.parse(replayed.input as string)).toEqual({ n: 2 })

      firstFresh.close()
      secondFresh.close()
    } finally {
      pusher.wire.close()
      first.wire.close()
      second.wire.close()
    }
  })
})
