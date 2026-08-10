/**
 * Resumable connections end to end — the card's reference timelines, each pinned against a spawned dev server whose
 * backplane is a FILE-BACKED recording KV (state + an op log on disk), so the records survive a server process death
 * exactly like Redis survives a redeploy, and the test can read the passport bytes straight off the dump:
 *
 * - the REDEPLOY: connect + join on server №1 (real core client runtime), kill the process, boot server №2 on the same
 *   backplane files — the client resumes: identity and rooms are back, `onConnect({ resumed: true })` / `onEnter({
 *   gapless: false })` fire, the connector/joiner counters of the new process stay at ZERO, pushes flow; the opt-out
 *   space is the contrast — its rooms are NOT restored, the client re-joins them itself (the joiner runs);
 * - the BLIP with a buffer: the socket dies, the server parks the connection (presence-honest death, the record is NOT
 *   deleted), pushes into the window land in the TOPIC STREAMS (one copy per room/personal stream — the streams ARE the
 *   buffer), a resume on the same process replays them IN ORDER with a continuous per-stream tseq — the verdicts are
 *   PER STREAM: `gapless: true` where only opted-in handlers pushed, `false` exactly where a non-opted handler's frame
 *   marked the hole;
 * - the TAKEOVER: a resume while the entry is LIVE moves the connection to the new socket and closes the zombie one;
 * - the REFUSALS: a wrong key and an unknown cid answer with the IDENTICAL frame (no oracle), a kick and a voluntary
 *   close delete the record (resume refused), a lapsed TTL refuses too;
 * - the HASH: the KV dump carries the SHA-256 of the resume key and never the key itself.
 */
import { createHash } from 'node:crypto'
import * as nodeFs from 'node:fs'
import nodePath from 'node:path'
import { afterAll, beforeAll, describe, expect, it, setDefaultTimeout } from 'bun:test'
import { z } from 'zod'
import { ClientPoints, Point0 } from '@point0/core'
import type { TestProjectOneClient } from './utils/project.one-client.js'
import { TestProjectOneClientFactory } from './utils/project.one-client.js'

setDefaultTimeout(120_000)

const tpf = TestProjectOneClientFactory.create({
  namespace: 'socket-resumable',
  portsRange: [4750, 4799],
  // the wire tests read payload strings straight off the frames — keep them plain JSON
  superjson: false,
})

/**
 * The fixture backplane: a KV whose state lives in `kv-state.json` (with expiry stamps) and whose every call appends to
 * `kv-ops.ndjson` — both under the project dir (the dev server's cwd), so a KILLED server leaves them behind for the
 * next one, and the test process reads them as the "Redis dump". The bus stays in-memory: the two servers of the
 * redeploy test never run at once.
 */
const backplaneModule = `import * as nodeFs from 'node:fs'
import nodePath from 'node:path'

const stateFile = nodePath.join(process.cwd(), 'kv-state.json')
const opsFile = nodePath.join(process.cwd(), 'kv-ops.ndjson')

type Stored = Record<string, { value: string; expiresAt: number | null }>

const readState = (): Stored => {
  try {
    return JSON.parse(nodeFs.readFileSync(stateFile, 'utf8')) as Stored
  } catch {
    return {}
  }
}
const state: Stored = readState()
const flush = (): void => {
  nodeFs.writeFileSync(stateFile, JSON.stringify(state, null, 2))
}
const logOp = (op: string, key?: string, ttlMs?: number): void => {
  nodeFs.appendFileSync(opsFile, JSON.stringify({ op, key, ttlMs, at: Date.now() }) + '\\n')
}
const liveValue = (key: string): string | undefined => {
  const entry = state[key]
  if (!entry) return undefined
  if (entry.expiresAt !== null && entry.expiresAt < Date.now()) {
    delete state[key]
    flush()
    return undefined
  }
  return entry.value
}

const subscribersByChannel = new Map<string, Set<(message: string) => void>>()

export const createTestBackplane = () => ({
  get: (key: string) => {
    logOp('get', key)
    return liveValue(key)
  },
  getDelete: (key: string) => {
    logOp('getDelete', key)
    const value = liveValue(key)
    delete state[key]
    flush()
    return value
  },
  set: (key: string, value: string, ttlMs?: number) => {
    logOp('set', key, ttlMs)
    state[key] = { value, expiresAt: ttlMs === undefined ? null : Date.now() + ttlMs }
    flush()
  },
  delete: (key: string) => {
    logOp('delete', key)
    delete state[key]
    flush()
  },
  publish: (channel: string, message: string) => {
    for (const subscriber of [...(subscribersByChannel.get(channel) ?? [])]) subscriber(message)
  },
  subscribe: (channel: string, onMessage: (message: string) => void) => {
    const subscribers = subscribersByChannel.get(channel) ?? new Set()
    subscribers.add(onMessage)
    subscribersByChannel.set(channel, subscribers)
  },
})
`

const writePoints = async (tp: TestProjectOneClient): Promise<void> => {
  await tp.write(
    'src/socket.points.tsx',
    `import { z } from 'zod'
import { root } from './lib/root.js'

// per-PROCESS counters — the redeploy pin: a resume on the fresh process must leave them at zero
let connectorRuns = 0
let joinerRuns = 0
let optJoinerRuns = 0

// the server-side event markers — a resume revival (unpark / KV restore) re-announces Open and the join family with
// resumed: true; a real claim/join carries false. Read back over the wire through serverEventsHandler
export const serverEventsLog: Array<{ name: string; id: string; resumed: boolean }> = []

export const mainChannel = root.lets('channel', 'mainChannel')
  .serverOn(['pointChannelOpenServer'], (event) => {
    const data = event.data as { connectionId: string; resumed: boolean }
    serverEventsLog.push({ name: event.name, id: data.connectionId, resumed: data.resumed })
  })
  .input(z.object({ userId: z.string() }))
  .connector(async ({ input }) => {
    connectorRuns++
    return { me: 'user-' + input.userId }
  })
  .channel({ resumable: true })

export const chatSpace = mainChannel.lets<{ chatId: string }>('space', 'chatSpace')
  .serverOn(['pointSpaceJoinServerSuccess'], (event) => {
    const data = event.data as { connectionId: string; resumed: boolean }
    serverEventsLog.push({ name: event.name, id: data.connectionId, resumed: data.resumed })
  })
  .input(z.object({ chatId: z.string() }))
  .joiner(async ({ input }) => {
    joinerRuns++
    return { chatId: input.chatId }
  })
  .space()

// the buffering handler — its pushes enter the topic streams' logs (up to 64 of its frames per stream)
export const feedHandler = chatSpace.lets('clientHandler', 'feedHandler')
  .serverSend(z.object({ n: z.number() }))
  .clientHandler({ resumable: 64 })

// the NON-buffering handler on the same space — its push into a gap marks the hole (gapless: false)
export const holeHandler = chatSpace.lets('clientHandler', 'holeHandler')
  .serverSend(z.object({ n: z.number() }))
  .clientHandler()

// the STRICT handler — buffered, but its frames are only valuable as a complete sequence: a gappy stream's recovery
// replays everyone else and SKIPS these (replay: 'gapless')
export const strictFeedHandler = chatSpace.lets('clientHandler', 'strictFeedHandler')
  .serverSend(z.object({ n: z.number() }))
  .clientHandler({ resumable: { buffer: 64, replay: 'gapless' } })

// the opt-out space: rooms out of the passport, never restored — the client re-joins them itself
export const liveSpace = mainChannel.lets<{ key: string }>('space', 'liveSpace')
  .input(z.object({ key: z.string() }))
  .joiner(async ({ input }) => {
    optJoinerRuns++
    return { key: input.key }
  })
  .space({ resumable: false })

export const chatEchoHandler = chatSpace.lets('serverHandler', 'chatEchoHandler')
  .clientSend(z.object({ text: z.string() }))
  .serverReply(async ({ input, room }) => ({ echo: input.text, chatId: room.chatId }))
  .serverHandler()

export const liveEchoHandler = liveSpace.lets('serverHandler', 'liveEchoHandler')
  .clientSend(z.object({ text: z.string() }))
  .serverReply(async ({ input, room }) => ({ echo: input.text, key: room.key }))
  .serverHandler()

// identity echo — proves a resumed connection kept its identity without the connector re-running
export const whoHandler = mainChannel.lets('serverHandler', 'whoHandler')
  .serverReply(async ({ identity }) => ({ me: identity.me }))
  .serverHandler()

export const countersHandler = mainChannel.lets('serverHandler', 'countersHandler')
  .serverReply(async () => ({ connectorRuns, joinerRuns, optJoinerRuns }))
  .serverHandler()

export const serverEventsHandler = mainChannel.lets('serverHandler', 'serverEventsHandler')
  .serverReply(async () => ({ events: serverEventsLog }))
  .serverHandler()

// pushes into a room, triggered over ANY live connection of the channel (the pusher itself needs no membership)
export const adminPushHandler = mainChannel.lets('serverHandler', 'adminPushHandler')
  .clientSend(z.object({ chatId: z.string(), n: z.number(), kind: z.string() }))
  .serverReply(async ({ input }) => {
    const handler = input.kind === 'feed' ? feedHandler : input.kind === 'strict' ? strictFeedHandler : holeHandler
    void handler.sendToClient({ n: input.n }, { room: { chatId: input.chatId } })
    return { ok: true }
  })
  .serverHandler()

// the CHANNEL-level buffering handler and its non-opted twin — the $identity-selection push targets
export const noteHandler = mainChannel.lets('clientHandler', 'noteHandler')
  .serverSend(z.object({ n: z.number() }))
  .clientHandler({ resumable: 64 })

export const noteHoleHandler = mainChannel.lets('clientHandler', 'noteHoleHandler')
  .serverSend(z.object({ n: z.number() }))
  .clientHandler()

// pushes by $identity — the SELECTION path (a sift scan, not a room address); a parked recipient must not be skipped
export const adminIdentityPushHandler = mainChannel.lets('serverHandler', 'adminIdentityPushHandler')
  .clientSend(z.object({ me: z.string(), n: z.number(), kind: z.string() }))
  .serverReply(async ({ input }) => {
    const handler = input.kind === 'note' ? noteHandler : noteHoleHandler
    void handler.sendToClient({ n: input.n }, { $identity: { me: input.me } })
    return { ok: true }
  })
  .serverHandler()

// the channel presence by identity — a parked connection is publicly dead, enumerations must keep skipping it
// (the synchronous local floor: one process in this suite, so the local slice is the whole truth — no gather window)
export const adminIdentityCountHandler = mainChannel.lets('serverHandler', 'adminIdentityCountHandler')
  .clientSend(z.object({ me: z.string() }))
  .serverReply(async ({ input }) => {
    const listed = mainChannel.connections.server.local.list({ $identity: { me: input.me } })
    return { count: listed.length, cids: listed.map((connection) => connection.connectionId) }
  })
  .serverHandler()

export const adminKillHandler = mainChannel.lets('serverHandler', 'adminKillHandler')
  .clientSend(z.object({ cid: z.string() }))
  .serverReply(async ({ input }) => {
    await mainChannel.kill({ connectionId: input.cid })
    return { ok: true }
  })
  .serverHandler()

// the space kick — a forced leave of one room for everyone in it, parked connections included
export const adminRoomKickHandler = mainChannel.lets('serverHandler', 'adminRoomKickHandler')
  .clientSend(z.object({ chatId: z.string() }))
  .serverReply(async ({ input }) => {
    await chatSpace.kick({ room: { chatId: input.chatId } })
    return { ok: true }
  })
  .serverHandler()

// the presence counter — parked connections are publicly dead, so the count dropping to zero proves the park landed
export const adminRoomCountHandler = mainChannel.lets('serverHandler', 'adminRoomCountHandler')
  .clientSend(z.object({ chatId: z.string() }))
  .serverReply(async ({ input }) => ({
    count: await chatSpace.memberships.server.count({ room: { chatId: input.chatId } }),
  }))
  .serverHandler()

// the imperative enroll — grows a connection's ENROLLED rooms of chatSpace (the provenance tests use it)
export const adminEnrollHandler = mainChannel.lets('serverHandler', 'adminEnrollHandler')
  .clientSend(z.object({ cid: z.string(), chatId: z.string() }))
  .serverReply(async ({ input }) => {
    await chatSpace.enroll({ connectionId: input.cid }, { chatId: input.chatId })
    return { ok: true }
  })
  .serverHandler()

// the room members with cids — the provenance assertions read presence with it
export const adminRoomMembersHandler = mainChannel.lets('serverHandler', 'adminRoomMembersHandler')
  .clientSend(z.object({ chatId: z.string() }))
  .serverReply(({ input }) => ({
    ids: chatSpace.memberships.server.local
      .list({ room: { chatId: input.chatId } })
      .map((membership) => membership.connectionId),
  }))
  .serverHandler()

// pushes by $room MATCHER — the sift-resolved room set still rides the room topics (a room push with late binding)
export const adminRoomMatcherPushHandler = mainChannel.lets('serverHandler', 'adminRoomMatcherPushHandler')
  .clientSend(z.object({ chatId: z.string(), n: z.number() }))
  .serverReply(async ({ input }) => {
    void feedHandler.sendToClient({ n: input.n }, { $room: { chatId: input.chatId } })
    return { ok: true }
  })
  .serverHandler()

// a resumable channel with a TINY record TTL and NO buffering handlers (no parking) — the lapsed-record refusal
export const ephemeralChannel = root.lets('channel', 'ephemeralChannel')
  .input(z.object({ userId: z.string() }))
  .connector(async ({ input }) => ({ me: input.userId }))
  .channel({ resumable: true, server: { connectionTtl: 3000 } })

// the UNPARK-ORDER pin: a subscriber pushing SYNCHRONOUSLY inside the resumed Open must land AFTER the replay,
// delivered exactly once — the announcements fire after the resume answer
export const hookChannel = root.lets('channel', 'hookChannel')
  .serverOn(['pointChannelOpenServer'], (event) => {
    const data = event.data as { connectionId: string; resumed: boolean }
    if (data.resumed) {
      void hookNoteHandler.sendToClient({ n: 99 }, { connectionId: data.connectionId })
    }
  })
  .input(z.object({ userId: z.string() }))
  .connector(async ({ input }) => ({ me: input.userId }))
  .channel({ resumable: true })

export const hookNoteHandler = hookChannel.lets('clientHandler', 'hookNoteHandler')
  .serverSend(z.object({ n: z.number() }))
  .clientHandler({ resumable: 16 })

export const adminHookPushHandler = hookChannel.lets('serverHandler', 'adminHookPushHandler')
  .clientSend(z.object({ cid: z.string(), n: z.number() }))
  .serverReply(async ({ input }) => {
    void hookNoteHandler.sendToClient({ n: input.n }, { connectionId: input.cid })
    return { ok: true }
  })
  .serverHandler()

// a resumable channel with a TINY per-stream BYTE ceiling — the eviction proof (server.resume plumbing end to end)
export const tinyChannel = root.lets('channel', 'tinyChannel')
  .input(z.object({ userId: z.string() }))
  .connector(async ({ input }) => ({ me: input.userId }))
  .channel({ resumable: true, server: { resume: { streamMaxBytes: 220 } } })

export const tinySpace = tinyChannel.lets<{ boxId: string }>('space', 'tinySpace')
  .input(z.object({ boxId: z.string() }))
  .joiner(async ({ input }) => ({ boxId: input.boxId }))
  .space()

export const tinyFeedHandler = tinySpace.lets('clientHandler', 'tinyFeedHandler')
  .serverSend(z.object({ pad: z.string() }))
  .clientHandler({ resumable: true })

export const adminTinyPushHandler = tinyChannel.lets('serverHandler', 'adminTinyPushHandler')
  .clientSend(z.object({ boxId: z.string(), pad: z.string() }))
  .serverReply(async ({ input }) => {
    void tinyFeedHandler.sendToClient({ pad: input.pad }, { room: { boxId: input.boxId } })
    return { ok: true }
  })
  .serverHandler()

// the contrast: a plain channel's claim carries NO resume key and its record carries no passport
export const plainChannel = root.lets('channel', 'plainChannel')
  .input(z.object({ userId: z.string() }))
  .connector(async ({ input }) => ({ me: input.userId }))
  .channel()
`,
  )
}

type WireFrame = Record<string, unknown> & { t: string }

class WireClient {
  ws: WebSocket
  frames: WireFrame[] = []
  closed = false
  private waiters: Array<{ predicate: (frame: WireFrame) => boolean; resolve: (frame: WireFrame) => void }> = []
  private opened: Promise<void>

  constructor(url: string) {
    this.ws = new WebSocket(url)
    this.opened = new Promise((resolve, reject) => {
      this.ws.addEventListener('open', () => resolve())
      this.ws.addEventListener('error', () => reject(new Error('WebSocket error')))
    })
    this.ws.addEventListener('close', () => {
      this.closed = true
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

  // the default is load-proof on purpose: this suite runs next to other heavy int suites, and a frame that took 20s
  // on a saturated machine is late, not lost — the wait returns the moment it lands, so green runs pay nothing
  async waitFrame(predicate: (frame: WireFrame) => boolean, timeoutMs = 30_000): Promise<WireFrame> {
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

  /** every received `msg` frame of a handler, in arrival order */
  msgs(handler?: string): Array<WireFrame & { tseq?: number }> {
    return this.frames.filter((frame) => frame.t === 'msg' && (handler === undefined || frame.handler === handler))
  }

  /**
   * The stream cursor map a hand-rolled resume offers — built from every received `msg` frame exactly like the real
   * client runtime keys it: `cid` = the personal stream ('p'), otherwise the topic the frame's shape names.
   */
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

  close(): void {
    this.ws.close()
  }
}

/** The per-stream verdicts of a `resumed` frame. */
const verdictsOf = (resumed: WireFrame): Record<string, { gapless: boolean; head: number }> =>
  resumed.streams as Record<string, { gapless: boolean; head: number }>

/** Every stream verdict of a `resumed` frame ANDed — "nothing anywhere was missed". */
const allGapless = (resumed: WireFrame): boolean =>
  Object.values(verdictsOf(resumed)).every((verdict) => verdict.gapless)

/** Poll a predicate instead of sleeping on a guess — the suite shares a loaded machine (hence the generous default). */
const waitFor = async (
  predicate: () => boolean | Promise<boolean>,
  what: string,
  timeoutMs = 30_000,
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

describe('socket resumable connections', () => {
  let tp: TestProjectOneClient
  let serverProcess: ReturnType<TestProjectOneClient['spawn']>

  const kvStatePath = (): string => nodePath.join(tp.dir, 'kv-state.json')
  const kvOpsPath = (): string => nodePath.join(tp.dir, 'kv-ops.ndjson')
  const readKvState = (): Record<string, { value: string; expiresAt: number | null } | undefined> =>
    JSON.parse(nodeFs.readFileSync(kvStatePath(), 'utf8')) as Record<
      string,
      { value: string; expiresAt: number | null } | undefined
    >
  const readKvOps = (): Array<{ op: string; key?: string }> =>
    nodeFs
      .readFileSync(kvOpsPath(), 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as { op: string; key?: string })
  const connKey = (cid: string): string => `point0:socket:conn:${cid}`

  const connect = async (channelKebab: string, userId: string): Promise<{ id: string; ticket: string }> => {
    const response = await fetch(`http://localhost:${tp.serverPort}/_point0/root/channel/${channelKebab}`, {
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

  const openAndClaim = async (
    channelKebab: string,
    userId: string,
  ): Promise<{ wire: WireClient; cid: string; resumeKey: string | undefined }> => {
    const { id, ticket } = await connect(channelKebab, userId)
    const wire = await openWire()
    wire.send({ t: 'claim', ticket })
    const claimed = await wire.waitFrame((frame) => frame.t === 'claimed' && frame.cid === id)
    return { wire, cid: id, resumeKey: claimed.resumeKey as string | undefined }
  }

  const join = async (wire: WireClient, cid: string, space: string, input: unknown): Promise<void> => {
    const joinId = 'j-' + Math.random().toString(36).slice(2)
    wire.send({ t: 'join', id: joinId, cid, space, input: JSON.stringify(input) })
    await wire.waitFrame((frame) => frame.t === 'joined' && frame.id === joinId)
  }

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
    serverProcess = tp.spawn(['bun', 'run', 'dev'])
    await tp.waitStarted()
  })

  afterAll(async () => {
    delete process.env.POINT0_SIDE
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: false })
  })

  it('a resumable claim carries the key ONCE; the KV dump holds its SHA-256 and never the key (a plain channel: neither)', async () => {
    const member = await openAndClaim('main-channel', 'hash')
    try {
      expect(typeof member.resumeKey).toBe('string')
      expect(member.resumeKey!.length).toBeGreaterThanOrEqual(20)
      await waitFor(() => readKvState()[connKey(member.cid)] !== undefined, 'the conn record on disk')
      const record = JSON.parse(readKvState()[connKey(member.cid)]!.value) as {
        identity: string
        resume?: { keyHash: string; rooms: Record<string, { joined: string[]; enrolled: string[] }> }
      }
      // the passport: the HASH of the key — the exact digest any process derives to verify a resume
      expect(record.resume?.keyHash).toBe(createHash('sha256').update(member.resumeKey!).digest('base64url'))
      // the raw key is nowhere in the whole dump — a leaked backplane must not mint working credentials
      expect(nodeFs.readFileSync(kvStatePath(), 'utf8')).not.toContain(member.resumeKey!)
      expect(record.resume?.rooms).toEqual({})

      // the contrast: a NON-resumable channel — no key on the claim, no passport on the record
      const plain = await openAndClaim('plain-channel', 'hash-plain')
      expect(plain.resumeKey).toBeUndefined()
      await waitFor(() => readKvState()[connKey(plain.cid)] !== undefined, 'the plain conn record on disk')
      expect(JSON.parse(readKvState()[connKey(plain.cid)]!.value)).not.toContainKey('resume')
      plain.wire.close()
    } finally {
      member.wire.close()
    }
  })

  it('the passport mirrors the rooms: joins write through, the opt-out space never enters it', async () => {
    const member = await openAndClaim('main-channel', 'passport')
    try {
      await join(member.wire, member.cid, 'chatSpace', { chatId: 'p-1' })
      await join(member.wire, member.cid, 'liveSpace', { key: 'k-1' })
      await waitFor(() => {
        const raw = readKvState()[connKey(member.cid)]
        if (!raw) {
          return false
        }
        const record = JSON.parse(raw.value) as {
          resume?: { rooms: Record<string, { joined: string[]; enrolled: string[] } | undefined> }
        }
        return record.resume?.rooms.chatSpace?.joined.length === 1
      }, 'the room write-through')
      const record = JSON.parse(readKvState()[connKey(member.cid)]!.value) as {
        resume: { rooms: Record<string, { joined: string[]; enrolled: string[] }> }
      }
      // the passport splits by PROVENANCE — a client join lands in `joined`, an enrollment in `enrolled`
      expect(record.resume.rooms.chatSpace).toEqual({ joined: [JSON.stringify({ chatId: 'p-1' })], enrolled: [] })
      // the opt-out space's rooms stay OUT — fast-changing rooms must not hammer the KV
      expect(record.resume.rooms).not.toContainKey('liveSpace')
      // and a leave shrinks the passport back
      member.wire.send({ t: 'leave', cid: member.cid, space: 'chatSpace', rooms: [JSON.stringify({ chatId: 'p-1' })] })
      await waitFor(() => {
        const raw = readKvState()[connKey(member.cid)]
        if (!raw) {
          return false
        }
        const record2 = JSON.parse(raw.value) as {
          resume?: { rooms: Record<string, { joined: string[]; enrolled: string[] } | undefined> }
        }
        return (record2.resume?.rooms.chatSpace?.joined.length ?? 0) === 0
      }, 'the leave write-through')
    } finally {
      member.wire.close()
    }
  })

  it('the passport splits by PROVENANCE: an enrollment lands in `enrolled`, survives a client leave, dies by kick', async () => {
    const admin = await openAndClaim('main-channel', 'prov-admin')
    const member = await openAndClaim('main-channel', 'prov')
    const passport = (): { joined: string[]; enrolled: string[] } | undefined => {
      const raw = readKvState()[connKey(member.cid)]
      if (!raw) {
        return undefined
      }
      const record = JSON.parse(raw.value) as {
        resume?: { rooms: Record<string, { joined: string[]; enrolled: string[] } | undefined> }
      }
      return record.resume?.rooms.chatSpace
    }
    try {
      // one room entered BOTH ways, one enroll-only
      await join(member.wire, member.cid, 'chatSpace', { chatId: 'pv-shared' })
      await sendOver(admin.wire, admin.cid, 'adminEnrollHandler', { cid: member.cid, chatId: 'pv-shared' })
      await sendOver(admin.wire, admin.cid, 'adminEnrollHandler', { cid: member.cid, chatId: 'pv-only' })
      await waitFor(() => (passport()?.enrolled.length ?? 0) === 2, 'the enroll write-through')
      expect(passport()).toEqual({
        joined: [JSON.stringify({ chatId: 'pv-shared' })],
        enrolled: [JSON.stringify({ chatId: 'pv-shared' }), JSON.stringify({ chatId: 'pv-only' })],
      })
      // a client leave naming BOTH rooms sheds only the JOINED mark — the enrolled rooms stay (the guarantee)
      member.wire.send({
        t: 'leave',
        cid: member.cid,
        space: 'chatSpace',
        rooms: [JSON.stringify({ chatId: 'pv-shared' }), JSON.stringify({ chatId: 'pv-only' })],
      })
      await waitFor(() => (passport()?.joined.length ?? 1) === 0, 'the demote write-through')
      expect(passport()).toEqual({
        joined: [],
        enrolled: [JSON.stringify({ chatId: 'pv-shared' }), JSON.stringify({ chatId: 'pv-only' })],
      })
      const members = await sendOver(admin.wire, admin.cid, 'adminRoomMembersHandler', { chatId: 'pv-only' })
      expect((JSON.parse(members.data as string) as { ids: string[] }).ids).toContain(member.cid)
      // the kick ends the enrollment — the passport stops promising the room
      await sendOver(admin.wire, admin.cid, 'adminRoomKickHandler', { chatId: 'pv-only' })
      await waitFor(() => (passport()?.enrolled.length ?? 2) === 1, 'the kick write-through')
      expect(passport()?.enrolled).toEqual([JSON.stringify({ chatId: 'pv-shared' })])
    } finally {
      member.wire.close()
      admin.wire.close()
    }
  })

  it('the BLIP: park buffers opted-in pushes, a resume replays them in stream order — gapless true, record never deleted', async () => {
    const admin = await openAndClaim('main-channel', 'blip-admin')
    const member = await openAndClaim('main-channel', 'blip')
    try {
      await join(member.wire, member.cid, 'chatSpace', { chatId: 'blip' })
      // two pushes land live — the ROOM stream's tseq 1 and 2 (one copy per room, however many members)
      await sendOver(admin.wire, admin.cid, 'adminPushHandler', { chatId: 'blip', n: 1, kind: 'feed' })
      await sendOver(admin.wire, admin.cid, 'adminPushHandler', { chatId: 'blip', n: 2, kind: 'feed' })
      await waitFor(() => member.wire.msgs('feedHandler').length === 2, 'both live pushes')
      const tseqsBefore = member.wire.msgs('feedHandler').map((frame) => frame.tseq)
      expect(tseqsBefore).toEqual([1, 2])
      // live topic frames are SHARED — no per-connection addressing on them
      expect(member.wire.msgs('feedHandler').every((frame) => frame.cid === undefined)).toBe(true)
      const cursors = member.wire.cursors()
      expect(cursors[`r:chatSpace:${JSON.stringify({ chatId: 'blip' })}`]).toBe(2)

      // the socket dies; the server parks (the channel has a buffering handler) — pushes keep landing in the
      // room's topic stream, which IS the buffer
      member.wire.close()
      await sendOver(admin.wire, admin.cid, 'adminPushHandler', { chatId: 'blip', n: 3, kind: 'feed' })
      await sendOver(admin.wire, admin.cid, 'adminPushHandler', { chatId: 'blip', n: 4, kind: 'feed' })

      // resume on a fresh socket from the received cursors
      const fresh = await openWire()
      fresh.send({ t: 'resume', entries: [{ cid: member.cid, key: member.resumeKey!, cursors }] })
      const resumed = await fresh.waitFrame((frame) => frame.t === 'resumed' && frame.cid === member.cid)
      // only opted-in frames were sent into the gap and the stream held them all — provably nothing missed, on
      // EVERY stream of the connection
      expect(allGapless(resumed)).toBe(true)
      expect(verdictsOf(resumed)[`r:chatSpace:${JSON.stringify({ chatId: 'blip' })}`]).toEqual({
        gapless: true,
        head: 4,
      })
      await waitFor(() => fresh.msgs('feedHandler').length === 2, 'the replayed frames')
      const replayed = fresh.msgs('feedHandler')
      // the replay is IN ORDER, the tseq continuous with what the old socket saw — and each replayed topic frame is
      // re-addressed to THIS connection (`rcid`), so another connection sharing the room would not dispatch it twice
      expect(replayed.map((frame) => frame.tseq)).toEqual([3, 4])
      expect(replayed.map((frame) => frame.rcid)).toEqual([member.cid, member.cid])
      expect(replayed.map((frame) => JSON.parse(frame.input as string).n)).toEqual([3, 4])
      // identity and rooms came along — the send addressed to the room still works, no re-join happened
      const echo = await sendOver(fresh, member.cid, 'chatEchoHandler', { text: 'still-in' }, { chatId: 'blip' })
      expect(echo.t).toBe('reply')
      expect(JSON.parse(echo.data as string)).toEqual({ echo: 'still-in', chatId: 'blip' })
      // the socket death DELETED nothing — the record is the resume right, only its TTL (or a kick/close) ends it
      expect(readKvOps().filter((op) => op.op === 'delete' && op.key === connKey(member.cid))).toHaveLength(0)
      // the server-side markers: the claim and the real join announced resumed: false, the unpark re-announced the
      // SAME pair — Open plus the join family — with resumed: true (no connector, no joiner ran for it)
      const eventsReply = await sendOver(fresh, member.cid, 'serverEventsHandler')
      expect(eventsReply.t).toBe('reply')
      const serverEvents = (
        JSON.parse(eventsReply.data as string) as { events: Array<{ name: string; id: string; resumed: boolean }> }
      ).events.filter((event) => event.id === member.cid)
      expect(serverEvents).toEqual([
        { name: 'pointChannelOpenServer', id: member.cid, resumed: false },
        { name: 'pointSpaceJoinServerSuccess', id: member.cid, resumed: false },
        { name: 'pointChannelOpenServer', id: member.cid, resumed: true },
        { name: 'pointSpaceJoinServerSuccess', id: member.cid, resumed: true },
      ])
      fresh.send({ t: 'close', cid: member.cid })
      fresh.close()
    } finally {
      admin.wire.close()
      member.wire.close()
    }
  })

  it('…and a NON-opted handler push into the gap marks the hole: the resume replays what it can, gapless false', async () => {
    const admin = await openAndClaim('main-channel', 'hole-admin')
    const member = await openAndClaim('main-channel', 'hole')
    try {
      await join(member.wire, member.cid, 'chatSpace', { chatId: 'hole' })
      await sendOver(admin.wire, admin.cid, 'adminPushHandler', { chatId: 'hole', n: 1, kind: 'feed' })
      await waitFor(() => member.wire.msgs('feedHandler').length === 1, 'the live push')
      const cursors = member.wire.cursors()

      member.wire.close()
      // a non-opted push into the window is LOST (nothing buffers it) — it consumes the room stream's tseq and
      // marks the hole, poisoning exactly THAT stream's proof…
      await sendOver(admin.wire, admin.cid, 'adminPushHandler', { chatId: 'hole', n: 2, kind: 'hole' })
      // …while a later opted-in push still replays
      await sendOver(admin.wire, admin.cid, 'adminPushHandler', { chatId: 'hole', n: 3, kind: 'feed' })

      const fresh = await openWire()
      fresh.send({ t: 'resume', entries: [{ cid: member.cid, key: member.resumeKey!, cursors }] })
      const resumed = await fresh.waitFrame((frame) => frame.t === 'resumed' && frame.cid === member.cid)
      const roomKey = `r:chatSpace:${JSON.stringify({ chatId: 'hole' })}`
      // the hole is scoped: the ROOM stream's verdict is false, the untouched streams stay provably clean
      expect(verdictsOf(resumed)[roomKey].gapless).toBe(false)
      expect(verdictsOf(resumed).c.gapless).toBe(true)
      expect(verdictsOf(resumed).p.gapless).toBe(true)
      await waitFor(() => fresh.msgs('feedHandler').length === 1, 'the replayable frame')
      expect(fresh.msgs('holeHandler')).toHaveLength(0)
      const replayedHole = fresh.msgs('feedHandler')[0]
      expect(JSON.parse(replayedHole.input as string).n).toBe(3)
      // the hole CONSUMED tseq 2 — the replayed frame's number proves the numbering never hid it
      expect(replayedHole.tseq).toBe(3)
      fresh.send({ t: 'close', cid: member.cid })
      fresh.close()
    } finally {
      admin.wire.close()
      member.wire.close()
    }
  })

  it('the $IDENTITY push finds the park ("случай Бори"): the parked twin rings, the live twin receives at once, presence stays dead', async () => {
    // two tabs of one user — equal identity, two cids: one parks, one stays live
    const member = await openAndClaim('main-channel', 'boria')
    const witness = await openAndClaim('main-channel', 'boria')
    try {
      // the live baseline — the selection push reaches both twins, each on its OWN personal stream (tseq 1 apiece)
      await sendOver(witness.wire, witness.cid, 'adminIdentityPushHandler', { me: 'user-boria', n: 1, kind: 'note' })
      await waitFor(
        () => member.wire.msgs('noteHandler').length === 1 && witness.wire.msgs('noteHandler').length === 1,
        'the live selection push on both twins',
      )
      // a selection frame is personal — it carries the recipient's cid, and its tseq numbers the 'p' stream
      expect(member.wire.msgs('noteHandler')[0].cid).toBe(member.cid)
      const cursors = member.wire.cursors()
      expect(cursors.p).toBe(1)

      // Боря's socket blips; the server parks — publicly dead: the $identity enumeration sees the live twin ONLY
      member.wire.close()
      await waitFor(async () => {
        const presence = await sendOver(witness.wire, witness.cid, 'adminIdentityCountHandler', { me: 'user-boria' })
        const { count, cids } = JSON.parse(presence.data as string) as { count: number; cids: string[] }
        return count === 1 && cids[0] === witness.cid
      }, 'the park (the parked twin leaves the enumeration)')

      // two selection pushes aimed exactly at the parked identity: the live twin receives them AT ONCE…
      await sendOver(witness.wire, witness.cid, 'adminIdentityPushHandler', { me: 'user-boria', n: 2, kind: 'note' })
      await sendOver(witness.wire, witness.cid, 'adminIdentityPushHandler', { me: 'user-boria', n: 3, kind: 'note' })
      await waitFor(() => witness.wire.msgs('noteHandler').length === 3, 'the live twin received both at once')

      // …and the parked one finds them in its PERSONAL stream on resume — in order, tseq continuous, provably
      // nothing missed
      const fresh = await openWire()
      fresh.send({ t: 'resume', entries: [{ cid: member.cid, key: member.resumeKey!, cursors }] })
      const resumed = await fresh.waitFrame((frame) => frame.t === 'resumed' && frame.cid === member.cid)
      expect(allGapless(resumed)).toBe(true)
      expect(verdictsOf(resumed).p).toEqual({ gapless: true, head: 3 })
      await waitFor(() => fresh.msgs('noteHandler').length === 2, 'the replayed selection frames')
      expect(fresh.msgs('noteHandler').map((frame) => frame.tseq)).toEqual([2, 3])
      expect(fresh.msgs('noteHandler').map((frame) => JSON.parse(frame.input as string).n)).toEqual([2, 3])
      // personal frames carry their cid as stored — the replay needs no re-addressing
      expect(fresh.msgs('noteHandler').map((frame) => frame.cid)).toEqual([member.cid, member.cid])
      fresh.send({ t: 'close', cid: member.cid })
      fresh.close()
    } finally {
      witness.wire.close()
      member.wire.close()
    }
  })

  it('…and a NON-opted $identity push into the park marks the hole — the resume stays honest: gapless false', async () => {
    const admin = await openAndClaim('main-channel', 'boria2-admin')
    const member = await openAndClaim('main-channel', 'boria2')
    try {
      await sendOver(admin.wire, admin.cid, 'adminIdentityPushHandler', { me: 'user-boria2', n: 1, kind: 'note' })
      await waitFor(() => member.wire.msgs('noteHandler').length === 1, 'the live selection push')
      const cursors = member.wire.cursors()

      member.wire.close()
      await waitFor(async () => {
        const presence = await sendOver(admin.wire, admin.cid, 'adminIdentityCountHandler', { me: 'user-boria2' })
        return (JSON.parse(presence.data as string) as { count: number }).count === 0
      }, 'the park (presence drops to zero)')

      // the non-opted handler's selection push is LOST for the parked twin — it marks the PERSONAL stream's hole…
      await sendOver(admin.wire, admin.cid, 'adminIdentityPushHandler', { me: 'user-boria2', n: 2, kind: 'hole' })
      // …while a later opted-in selection push still buffers
      await sendOver(admin.wire, admin.cid, 'adminIdentityPushHandler', { me: 'user-boria2', n: 3, kind: 'note' })

      const fresh = await openWire()
      fresh.send({ t: 'resume', entries: [{ cid: member.cid, key: member.resumeKey!, cursors }] })
      const resumed = await fresh.waitFrame((frame) => frame.t === 'resumed' && frame.cid === member.cid)
      // the hole is the personal stream's own — the channel-wide stream stays clean
      expect(verdictsOf(resumed).p.gapless).toBe(false)
      expect(verdictsOf(resumed).c.gapless).toBe(true)
      await waitFor(() => fresh.msgs('noteHandler').length === 1, 'the replayable selection frame')
      expect(fresh.msgs('noteHoleHandler')).toHaveLength(0)
      expect(JSON.parse(fresh.msgs('noteHandler')[0].input as string).n).toBe(3)
      fresh.send({ t: 'close', cid: member.cid })
      fresh.close()
    } finally {
      admin.wire.close()
      member.wire.close()
    }
  })

  it('the TAKEOVER: a resume while the entry is LIVE rebinds it — the old socket closes, pushes follow the new one', async () => {
    const admin = await openAndClaim('main-channel', 'take-admin')
    const member = await openAndClaim('main-channel', 'take')
    try {
      await join(member.wire, member.cid, 'chatSpace', { chatId: 'take' })
      // the server still believes the old socket is alive — the client noticed first and dialed anew
      const fresh = await openWire()
      fresh.send({
        t: 'resume',
        entries: [{ cid: member.cid, key: member.resumeKey!, cursors: member.wire.cursors() }],
      })
      const resumed = await fresh.waitFrame((frame) => frame.t === 'resumed' && frame.cid === member.cid)
      // nothing was pushed since the last seen frame — the takeover is provably gapless on every stream
      expect(allGapless(resumed)).toBe(true)
      // the zombie binding closes once it carries nothing
      await waitFor(() => member.wire.closed, 'the old socket to be closed by the server')
      // pushes now follow the new socket — and only it
      await sendOver(admin.wire, admin.cid, 'adminPushHandler', { chatId: 'take', n: 7, kind: 'feed' })
      await waitFor(() => fresh.msgs('feedHandler').length === 1, 'the push on the new socket')
      expect(member.wire.msgs('feedHandler')).toHaveLength(0)
      fresh.send({ t: 'close', cid: member.cid })
      fresh.close()
    } finally {
      admin.wire.close()
      member.wire.close()
    }
  })

  it('the REFUSALS are one oracle-free frame: wrong key ≡ unknown cid; kill and voluntary close void the record; TTL lapses it', async () => {
    // wrong key against a LIVE entry vs a cid that never existed — byte-identical answers
    const victim = await openAndClaim('main-channel', 'refuse-victim')
    const prober = await openWire()
    try {
      prober.send({
        t: 'resume',
        entries: [
          { cid: victim.cid, key: 'A'.repeat(22), cursors: {} },
          { cid: 'no-such-cid', key: 'B'.repeat(22), cursors: {} },
        ],
      })
      const wrongKey = await prober.waitFrame((frame) => frame.t === 'resumeErr' && frame.cid === victim.cid)
      const unknownCid = await prober.waitFrame((frame) => frame.t === 'resumeErr' && frame.cid === 'no-such-cid')
      expect(Object.keys(wrongKey).sort()).toEqual(['cid', 't'])
      expect(Object.keys(unknownCid).sort()).toEqual(['cid', 't'])
      // and the wrong key did NOT steal the live connection
      const who = await sendOver(victim.wire, victim.cid, 'whoHandler')
      expect(JSON.parse(who.data as string)).toEqual({ me: 'user-refuse-victim' })

      // a KICK deletes the record — the resume refuses, revocation is never resumable
      const kicked = await openAndClaim('main-channel', 'refuse-kicked')
      await sendOver(victim.wire, victim.cid, 'adminKillHandler', { cid: kicked.cid })
      await kicked.wire.waitFrame((frame) => frame.t === 'closed' && frame.cid === kicked.cid)
      await waitFor(
        () => readKvOps().some((op) => op.op === 'delete' && op.key === connKey(kicked.cid)),
        'the kick record delete',
      )
      prober.send({ t: 'resume', entries: [{ cid: kicked.cid, key: kicked.resumeKey!, cursors: {} }] })
      await prober.waitFrame((frame) => frame.t === 'resumeErr' && frame.cid === kicked.cid)
      kicked.wire.close()

      // a VOLUNTARY close deletes it too
      const closer = await openAndClaim('main-channel', 'refuse-closer')
      closer.wire.send({ t: 'close', cid: closer.cid })
      await waitFor(
        () => readKvOps().some((op) => op.op === 'delete' && op.key === connKey(closer.cid)),
        'the close record delete',
      )
      prober.send({ t: 'resume', entries: [{ cid: closer.cid, key: closer.resumeKey!, cursors: {} }] })
      await prober.waitFrame((frame) => frame.t === 'resumeErr' && frame.cid === closer.cid)
      closer.wire.close()

      // a LAPSED record (tiny TTL, no buffering handlers so nothing parks) refuses as well
      const ephemeral = await openAndClaim('ephemeral-channel', 'refuse-ttl')
      ephemeral.wire.close()
      await new Promise((resolve) => setTimeout(resolve, 3600))
      prober.send({ t: 'resume', entries: [{ cid: ephemeral.cid, key: ephemeral.resumeKey!, cursors: {} }] })
      await prober.waitFrame((frame) => frame.t === 'resumeErr' && frame.cid === ephemeral.cid)
    } finally {
      prober.close()
      victim.wire.close()
    }
  })

  it('the OPT-OUT space after a blip: its room is gone server-side until the client re-joins; the joiner runs again', async () => {
    const member = await openAndClaim('main-channel', 'optout')
    try {
      await join(member.wire, member.cid, 'chatSpace', { chatId: 'oo-chat' })
      await join(member.wire, member.cid, 'liveSpace', { key: 'oo-live' })
      const countersBefore = JSON.parse(
        (await sendOver(member.wire, member.cid, 'countersHandler')).data as string,
      ) as { optJoinerRuns: number }

      member.wire.close()
      const fresh = await openWire()
      fresh.send({
        t: 'resume',
        entries: [{ cid: member.cid, key: member.resumeKey!, cursors: member.wire.cursors() }],
      })
      await fresh.waitFrame((frame) => frame.t === 'resumed' && frame.cid === member.cid)

      // the resumable space came back with the passport…
      const chatEcho = await sendOver(fresh, member.cid, 'chatEchoHandler', { text: 'here' }, { chatId: 'oo-chat' })
      expect(chatEcho.t).toBe('reply')
      // …the opt-out one did NOT: the server refuses the room until a real join re-enters it
      const liveMiss = await sendOver(fresh, member.cid, 'liveEchoHandler', { text: 'gone' }, { key: 'oo-live' })
      expect(liveMiss.t).toBe('sendErr')
      expect(String(liveMiss.error)).toContain('POINT0_SOCKET_NOT_IN_ROOM')
      await join(fresh, member.cid, 'liveSpace', { key: 'oo-live' })
      const liveEcho = await sendOver(fresh, member.cid, 'liveEchoHandler', { text: 'back' }, { key: 'oo-live' })
      expect(liveEcho.t).toBe('reply')
      // the re-entry was a REAL join — the joiner ran once more (the resume itself ran nothing)
      const countersAfter = JSON.parse((await sendOver(fresh, member.cid, 'countersHandler')).data as string) as {
        optJoinerRuns: number
      }
      expect(countersAfter.optJoinerRuns).toBe(countersBefore.optJoinerRuns + 1)
      fresh.send({ t: 'close', cid: member.cid })
      fresh.close()
    } finally {
      member.wire.close()
    }
  })

  it('a SPACE KICK during the park revokes the room for real: gone from the ring address and the passport, the client learns on resume', async () => {
    const admin = await openAndClaim('main-channel', 'roomkick-admin')
    const member = await openAndClaim('main-channel', 'roomkick')
    try {
      await join(member.wire, member.cid, 'chatSpace', { chatId: 'rk-kicked' })
      await join(member.wire, member.cid, 'chatSpace', { chatId: 'rk-kept' })
      // two live pushes, one per room — each room's OWN stream at tseq 1
      await sendOver(admin.wire, admin.cid, 'adminPushHandler', { chatId: 'rk-kicked', n: 1, kind: 'feed' })
      await sendOver(admin.wire, admin.cid, 'adminPushHandler', { chatId: 'rk-kept', n: 2, kind: 'feed' })
      await waitFor(() => member.wire.msgs('feedHandler').length === 2, 'both live pushes')
      const cursors = member.wire.cursors()
      expect(cursors[`r:chatSpace:${JSON.stringify({ chatId: 'rk-kicked' })}`]).toBe(1)
      expect(cursors[`r:chatSpace:${JSON.stringify({ chatId: 'rk-kept' })}`]).toBe(1)

      // the socket dies; the server parks (publicly dead — the presence counter proves the park landed)…
      member.wire.close()
      await waitFor(async () => {
        const presence = await sendOver(admin.wire, admin.cid, 'adminRoomCountHandler', { chatId: 'rk-kept' })
        return (JSON.parse(presence.data as string) as { count: number }).count === 0
      }, 'the park (presence drops to zero)')
      // …and the space kick lands INTO the park
      await sendOver(admin.wire, admin.cid, 'adminRoomKickHandler', { chatId: 'rk-kicked' })
      // the passport stops promising the kicked room at once (a later KV restore must not revive it)…
      await waitFor(() => {
        const raw = readKvState()[connKey(member.cid)]
        if (!raw) {
          return false
        }
        const record = JSON.parse(raw.value) as {
          resume?: { rooms: Record<string, { joined: string[]; enrolled: string[] } | undefined> }
        }
        return record.resume?.rooms.chatSpace?.joined.length === 1
      }, 'the kick passport write-through')
      const record = JSON.parse(readKvState()[connKey(member.cid)]!.value) as {
        resume: { rooms: Record<string, { joined: string[]; enrolled: string[] }> }
      }
      expect(record.resume.rooms.chatSpace).toEqual({ joined: [JSON.stringify({ chatId: 'rk-kept' })], enrolled: [] })
      // …and the room left the buffer address: a push into it no longer rings, while the kept room's push does
      await sendOver(admin.wire, admin.cid, 'adminPushHandler', { chatId: 'rk-kicked', n: 3, kind: 'feed' })
      await sendOver(admin.wire, admin.cid, 'adminPushHandler', { chatId: 'rk-kept', n: 4, kind: 'feed' })

      const fresh = await openWire()
      fresh.send({ t: 'resume', entries: [{ cid: member.cid, key: member.resumeKey!, cursors }] })
      const resumed = await fresh.waitFrame((frame) => frame.t === 'resumed' && frame.cid === member.cid)
      // the kicked room's stream is no longer the connection's — its verdict is simply ABSENT (the queued `left`
      // carries the news), and the surviving streams are provably clean
      expect(allGapless(resumed)).toBe(true)
      expect(verdictsOf(resumed)[`r:chatSpace:${JSON.stringify({ chatId: 'rk-kicked' })}`]).toBeUndefined()
      expect(verdictsOf(resumed)[`r:chatSpace:${JSON.stringify({ chatId: 'rk-kept' })}`]).toEqual({
        gapless: true,
        head: 2,
      })
      // the client learns the revocation it slept through — the queued `left` follows the replay
      const left = await fresh.waitFrame((frame) => frame.t === 'left' && frame.cid === member.cid)
      expect(left.space).toBe('chatSpace')
      expect(left.rooms).toEqual([JSON.stringify({ chatId: 'rk-kicked' })])
      // the replay carries the KEPT room's push only
      expect(fresh.msgs('feedHandler').map((frame) => JSON.parse(frame.input as string).n)).toEqual([4])
      // server-side the kicked room is gone, the ordinary room survived the park
      const kickedMiss = await sendOver(fresh, member.cid, 'chatEchoHandler', { text: 'out' }, { chatId: 'rk-kicked' })
      expect(kickedMiss.t).toBe('sendErr')
      expect(String(kickedMiss.error)).toContain('POINT0_SOCKET_NOT_IN_ROOM')
      const keptEcho = await sendOver(fresh, member.cid, 'chatEchoHandler', { text: 'in' }, { chatId: 'rk-kept' })
      expect(keptEcho.t).toBe('reply')
      expect(JSON.parse(keptEcho.data as string)).toEqual({ echo: 'in', chatId: 'rk-kept' })
      // a space kick shrinks the resume right, never deletes it — the record survived
      expect(readKvOps().filter((op) => op.op === 'delete' && op.key === connKey(member.cid))).toHaveLength(0)
      fresh.send({ t: 'close', cid: member.cid })
      fresh.close()
    } finally {
      admin.wire.close()
      member.wire.close()
    }
  })

  it('PER-STREAM verdicts diverge: a hole in the busy room, the quiet room stays provably gapless', async () => {
    const admin = await openAndClaim('main-channel', 'diverge-admin')
    const member = await openAndClaim('main-channel', 'diverge')
    try {
      await join(member.wire, member.cid, 'chatSpace', { chatId: 'dv-busy' })
      await join(member.wire, member.cid, 'chatSpace', { chatId: 'dv-quiet' })
      await sendOver(admin.wire, admin.cid, 'adminPushHandler', { chatId: 'dv-busy', n: 1, kind: 'feed' })
      await sendOver(admin.wire, admin.cid, 'adminPushHandler', { chatId: 'dv-quiet', n: 2, kind: 'feed' })
      await waitFor(() => member.wire.msgs('feedHandler').length === 2, 'both live pushes')
      const cursors = member.wire.cursors()

      member.wire.close()
      // the busy room takes a NON-buffered hit (lost, hole marked) and a buffered one; the quiet room a buffered one
      await sendOver(admin.wire, admin.cid, 'adminPushHandler', { chatId: 'dv-busy', n: 3, kind: 'hole' })
      await sendOver(admin.wire, admin.cid, 'adminPushHandler', { chatId: 'dv-busy', n: 4, kind: 'feed' })
      await sendOver(admin.wire, admin.cid, 'adminPushHandler', { chatId: 'dv-quiet', n: 5, kind: 'feed' })

      const fresh = await openWire()
      fresh.send({ t: 'resume', entries: [{ cid: member.cid, key: member.resumeKey!, cursors }] })
      const resumed = await fresh.waitFrame((frame) => frame.t === 'resumed' && frame.cid === member.cid)
      // THE flagship of the topic-stream model: the verdicts are per stream — the busy room's hole does not smear
      // the quiet room (or the channel-level streams); only what actually gapped reports a gap
      expect(verdictsOf(resumed)[`r:chatSpace:${JSON.stringify({ chatId: 'dv-busy' })}`].gapless).toBe(false)
      expect(verdictsOf(resumed)[`r:chatSpace:${JSON.stringify({ chatId: 'dv-quiet' })}`].gapless).toBe(true)
      expect(verdictsOf(resumed).c.gapless).toBe(true)
      expect(verdictsOf(resumed).p.gapless).toBe(true)
      // both buffered frames replay, each on its own stream
      await waitFor(() => fresh.msgs('feedHandler').length === 2, 'the replayed frames')
      expect(fresh.msgs('feedHandler').map((frame) => JSON.parse(frame.input as string).n)).toEqual([4, 5])
      fresh.send({ t: 'close', cid: member.cid })
      fresh.close()
    } finally {
      admin.wire.close()
      member.wire.close()
    }
  })

  it('a $room MATCHER push rides the room topics: one shared frame live, buffered by the room stream for the parked', async () => {
    const admin = await openAndClaim('main-channel', 'matcher-admin')
    const member = await openAndClaim('main-channel', 'matcher')
    const witness = await openAndClaim('main-channel', 'matcher-witness')
    try {
      await join(member.wire, member.cid, 'chatSpace', { chatId: 'mx-1' })
      await join(witness.wire, witness.cid, 'chatSpace', { chatId: 'mx-1' })
      // live: the matcher resolves to the concrete room and publishes ONE shared topic frame — no cid on it
      await sendOver(admin.wire, admin.cid, 'adminRoomMatcherPushHandler', { chatId: 'mx-1', n: 1 })
      await waitFor(
        () => member.wire.msgs('feedHandler').length === 1 && witness.wire.msgs('feedHandler').length === 1,
        'the live matcher push on both members',
      )
      expect(member.wire.msgs('feedHandler')[0].cid).toBeUndefined()
      expect(member.wire.msgs('feedHandler')[0].room).toBe(JSON.stringify({ chatId: 'mx-1' }))
      const cursors = member.wire.cursors()

      // the member parks; a matcher push into the window lands in the ROOM stream — the parked member's buffer
      member.wire.close()
      await sendOver(admin.wire, admin.cid, 'adminRoomMatcherPushHandler', { chatId: 'mx-1', n: 2 })
      await waitFor(() => witness.wire.msgs('feedHandler').length === 2, 'the live witness received it at once')

      const fresh = await openWire()
      fresh.send({ t: 'resume', entries: [{ cid: member.cid, key: member.resumeKey!, cursors }] })
      const resumed = await fresh.waitFrame((frame) => frame.t === 'resumed' && frame.cid === member.cid)
      expect(allGapless(resumed)).toBe(true)
      await waitFor(() => fresh.msgs('feedHandler').length === 1, 'the replayed matcher frame')
      const replayed = fresh.msgs('feedHandler')[0]
      expect(JSON.parse(replayed.input as string).n).toBe(2)
      expect(replayed.tseq).toBe(2)
      expect(replayed.rcid).toBe(member.cid)
      fresh.send({ t: 'close', cid: member.cid })
      fresh.close()
    } finally {
      admin.wire.close()
      witness.wire.close()
      member.wire.close()
    }
  })

  it('the MERGE replay: room and personal frames interleave in delivery order across streams — one tail, total order', async () => {
    const admin = await openAndClaim('main-channel', 'merge-admin')
    const member = await openAndClaim('main-channel', 'merge')
    try {
      await join(member.wire, member.cid, 'chatSpace', { chatId: 'mg-1' })
      member.wire.close()
      // interleaved into the park: room / personal / room — three different streams' logs
      await sendOver(admin.wire, admin.cid, 'adminPushHandler', { chatId: 'mg-1', n: 1, kind: 'feed' })
      await sendOver(admin.wire, admin.cid, 'adminIdentityPushHandler', { me: 'user-merge', n: 2, kind: 'note' })
      await sendOver(admin.wire, admin.cid, 'adminPushHandler', { chatId: 'mg-1', n: 3, kind: 'feed' })

      const fresh = await openWire()
      fresh.send({ t: 'resume', entries: [{ cid: member.cid, key: member.resumeKey!, cursors: {} }] })
      const resumed = await fresh.waitFrame((frame) => frame.t === 'resumed' && frame.cid === member.cid)
      expect(allGapless(resumed)).toBe(true)
      await waitFor(() => fresh.msgs().length === 3, 'the merged replay')
      // the tail is ONE sequence ordered by the process delivery clock — the personal frame sits BETWEEN the room
      // ones exactly as it was delivered, not grouped per stream
      expect(fresh.msgs().map((frame) => JSON.parse(frame.input as string).n)).toEqual([1, 2, 3])
      expect(fresh.msgs().map((frame) => frame.handler)).toEqual(['feedHandler', 'noteHandler', 'feedHandler'])
      fresh.send({ t: 'close', cid: member.cid })
      fresh.close()
    } finally {
      admin.wire.close()
      member.wire.close()
    }
  })

  it('the BYTE ceiling (`server.resume.streamMaxBytes`): an over-budget log evicts oldest-first and honestly gaps the proof', async () => {
    const connectTiny = async (userId: string): Promise<{ id: string; ticket: string }> => {
      const response = await fetch(`http://localhost:${tp.serverPort}/_point0/root/channel/tiny-channel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      expect(response.ok).toBe(true)
      return (await response.json()) as { id: string; ticket: string }
    }
    const adminConnect = await connectTiny('tiny-admin')
    const admin = await openWire()
    admin.send({ t: 'claim', ticket: adminConnect.ticket })
    await admin.waitFrame((frame) => frame.t === 'claimed' && frame.cid === adminConnect.id)
    const memberConnect = await connectTiny('tiny')
    const member = await openWire()
    member.send({ t: 'claim', ticket: memberConnect.ticket })
    const claimed = await member.waitFrame((frame) => frame.t === 'claimed' && frame.cid === memberConnect.id)
    const resumeKey = claimed.resumeKey as string
    try {
      await join(member, memberConnect.id, 'tinySpace', { boxId: 'bb' })
      member.close()
      // two frames of ~250 bytes against a 220-byte stream budget: the second append evicts the first — and the
      // eviction is an honest gap, not a silent loss
      const pad = 'x'.repeat(100)
      await sendOver(admin, adminConnect.id, 'adminTinyPushHandler', { boxId: 'bb', pad })
      await sendOver(admin, adminConnect.id, 'adminTinyPushHandler', { boxId: 'bb', pad })

      const fresh = await openWire()
      fresh.send({ t: 'resume', entries: [{ cid: memberConnect.id, key: resumeKey, cursors: {} }] })
      const resumed = await fresh.waitFrame((frame) => frame.t === 'resumed' && frame.cid === memberConnect.id)
      const roomKey = `r:tinySpace:${JSON.stringify({ boxId: 'bb' })}`
      expect(verdictsOf(resumed)[roomKey]).toEqual({ gapless: false, head: 2 })
      // the survivor still replays — partial catch-up under an honest verdict
      await waitFor(() => fresh.msgs('tinyFeedHandler').length === 1, 'the surviving frame')
      expect(fresh.msgs('tinyFeedHandler')[0].tseq).toBe(2)
      fresh.send({ t: 'close', cid: memberConnect.id })
      fresh.close()
    } finally {
      admin.close()
      member.close()
    }
  })

  it("replay: 'gapless' — a gappy stream replays the ordinary handler and SKIPS the strict one; a clean stream replays both", async () => {
    const admin = await openAndClaim('main-channel', 'strict-admin')
    const member = await openAndClaim('main-channel', 'strict')
    try {
      await join(member.wire, member.cid, 'chatSpace', { chatId: 'st-1' })
      const cursors = member.wire.cursors()

      // the GAPPY round: a hole poisons the room stream, then one ordinary and one strict buffered push
      member.wire.close()
      await sendOver(admin.wire, admin.cid, 'adminPushHandler', { chatId: 'st-1', n: 1, kind: 'hole' })
      await sendOver(admin.wire, admin.cid, 'adminPushHandler', { chatId: 'st-1', n: 2, kind: 'feed' })
      await sendOver(admin.wire, admin.cid, 'adminPushHandler', { chatId: 'st-1', n: 3, kind: 'strict' })

      const fresh = await openWire()
      fresh.send({ t: 'resume', entries: [{ cid: member.cid, key: member.resumeKey!, cursors }] })
      const resumed = await fresh.waitFrame((frame) => frame.t === 'resumed' && frame.cid === member.cid)
      const roomKey = `r:chatSpace:${JSON.stringify({ chatId: 'st-1' })}`
      expect(verdictsOf(resumed)[roomKey].gapless).toBe(false)
      // the ordinary buffered frame replays (any subset is legal); the strict one is withheld — its consumer only
      // gets the honest verdict and refetches
      await waitFor(() => fresh.msgs('feedHandler').length === 1, 'the ordinary replay')
      expect(JSON.parse(fresh.msgs('feedHandler')[0].input as string).n).toBe(2)
      await new Promise((resolve) => setTimeout(resolve, 300))
      expect(fresh.msgs('strictFeedHandler')).toHaveLength(0)

      // the CLEAN round on the same connection: no hole — the strict frame replays like any other
      const cleanCursors = fresh.cursors()
      fresh.close()
      await sendOver(admin.wire, admin.cid, 'adminPushHandler', { chatId: 'st-1', n: 4, kind: 'strict' })
      const second = await openWire()
      second.send({ t: 'resume', entries: [{ cid: member.cid, key: member.resumeKey!, cursors: cleanCursors }] })
      const resumedClean = await second.waitFrame((frame) => frame.t === 'resumed' && frame.cid === member.cid)
      expect(verdictsOf(resumedClean)[roomKey].gapless).toBe(true)
      await second.waitFrame((frame) => frame.t === 'msg' && frame.handler === 'strictFeedHandler', 15_000)
      // BOTH strict frames arrive now: the one withheld by the gappy round (its tseq is above the cursor — nothing
      // was lost) and the fresh one; the clean stream owes the full tail
      await waitFor(() => second.msgs('strictFeedHandler').length === 2, 'both strict replays on the clean stream')
      expect(second.msgs('strictFeedHandler').map((frame) => JSON.parse(frame.input as string).n)).toEqual([3, 4])
      expect(second.msgs('strictFeedHandler').every((frame) => frame.rp === true)).toBe(true)
      second.send({ t: 'close', cid: member.cid })
      second.close()
      fresh.close()
    } finally {
      admin.wire.close()
      member.wire.close()
    }
  })

  it('the UNPARK order: a synchronous push from the resumed Open lands AFTER the replay, exactly once', async () => {
    const connectHook = async (userId: string): Promise<{ id: string; ticket: string }> => {
      const response = await fetch(`http://localhost:${tp.serverPort}/_point0/root/channel/hook-channel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      expect(response.ok).toBe(true)
      return (await response.json()) as { id: string; ticket: string }
    }
    const adminConnect = await connectHook('hook-admin')
    const admin = await openWire()
    admin.send({ t: 'claim', ticket: adminConnect.ticket })
    await admin.waitFrame((frame) => frame.t === 'claimed' && frame.cid === adminConnect.id)
    const memberConnect = await connectHook('hooky')
    const member = await openWire()
    member.send({ t: 'claim', ticket: memberConnect.ticket })
    const claimed = await member.waitFrame((frame) => frame.t === 'claimed' && frame.cid === memberConnect.id)
    const resumeKey = claimed.resumeKey as string
    try {
      // park, then one buffered personal push into the window
      member.close()
      await sendOver(admin, adminConnect.id, 'adminHookPushHandler', { cid: memberConnect.id, n: 1 })

      const fresh = await openWire()
      fresh.send({ t: 'resume', entries: [{ cid: memberConnect.id, key: resumeKey, cursors: {} }] })
      const resumed = await fresh.waitFrame((frame) => frame.t === 'resumed' && frame.cid === memberConnect.id)
      // the Open-subscriber's push (n 99) fires on the unpark — AFTER the answer, so its frame follows the replay
      // and is delivered exactly once (before the ordering fix it was both logged above the floor AND sent live)
      await waitFor(() => fresh.msgs('hookNoteHandler').length >= 2, 'the replay and the hook push')
      expect(fresh.msgs('hookNoteHandler').map((frame) => JSON.parse(frame.input as string).n)).toEqual([1, 99])
      expect(fresh.msgs('hookNoteHandler').map((frame) => frame.tseq)).toEqual([1, 2])
      // the replayed frame is provably covered — and nothing beyond the two frames ever arrives
      expect(verdictsOf(resumed).p).toEqual({ gapless: true, head: 1 })
      await new Promise((resolve) => setTimeout(resolve, 300))
      expect(fresh.msgs('hookNoteHandler')).toHaveLength(2)
      fresh.send({ t: 'close', cid: memberConnect.id })
      fresh.close()
    } finally {
      admin.close()
      member.close()
    }
  })

  it('the REDEPLOY: the real client runtime resumes onto a fresh process — markers fire, counters stay zero, pushes flow', async () => {
    // from here this test process acts as the browser (the wire tests above never read the side)
    process.env.POINT0_SIDE = 'client'
    // the CLIENT-side events must mirror the callbacks' markers — record the socket single and the two families' Success
    const clientEvents: Array<{ name: string; data: Record<string, unknown> }> = []
    const root = Point0.lets('root', 'root')
      .serverUrl(`http://localhost:${tp.serverPort}`)
      .on(
        ['socketClientConnect', 'pointChannelConnectClientSuccess', 'pointSpaceJoinClientSuccess'],
        (event) => void clientEvents.push({ name: event.name, data: event.data as unknown as Record<string, unknown> }),
      )
      .root()
    const anyLets = (point: unknown) => (point as { lets: (...args: unknown[]) => any }).lets
    const mainChannel = root
      .lets('channel', 'mainChannel')
      .input(z.object({ userId: z.string() }))
      .channel({ resumable: true })
    const chatSpace = anyLets(mainChannel)('space', 'chatSpace')
      .input(z.object({ chatId: z.string() }))
      .joiner()
      .space()
    const liveSpace = anyLets(mainChannel)('space', 'liveSpace')
      .input(z.object({ key: z.string() }))
      .joiner()
      .space({ resumable: false })
    const feedHandler = anyLets(chatSpace)('clientHandler', 'feedHandler')
      .serverSend(z.object({ n: z.number() }))
      .clientHandler({ resumable: 64 })
    const whoHandler = anyLets(mainChannel)('serverHandler', 'whoHandler').serverReply().serverHandler()
    const countersHandler = anyLets(mainChannel)('serverHandler', 'countersHandler').serverReply().serverHandler()
    const adminPushHandler = anyLets(mainChannel)('serverHandler', 'adminPushHandler')
      .clientSend(z.object({ chatId: z.string(), n: z.number(), kind: z.string() }))
      .serverReply()
      .serverHandler()
    ClientPoints.mount([
      root,
      mainChannel,
      chatSpace,
      liveSpace,
      feedHandler,
      whoHandler,
      countersHandler,
      adminPushHandler,
    ] as never)

    const connects: Array<{ resumed: boolean; gapless: boolean; connectionIndex: number }> = []
    const chatEnters: Array<{ resumed: boolean; gapless: boolean; reason: string }> = []
    const liveEnters: Array<{ resumed: boolean; gapless: boolean; reason: string }> = []
    const received: number[] = []

    // this test shares the machine with parallel heavy suites (the tests lane runs several at once), so every stage
    // ceiling below is LOAD-PROOF on purpose: predicate polls and per-send windows return the moment the condition
    // lands — a green run pays nothing for a generous ceiling, a loaded one stops flaking on it
    const SEND_TIMEOUT = { timeout: 30_000 }
    const connection = mainChannel.connect(
      { userId: 'redeploy' },
      {
        onConnect: ({ resumed, gapless, connectionIndex }) => void connects.push({ resumed, gapless, connectionIndex }),
      },
    )
    try {
      await waitFor(() => connection.status === 'open', 'the first connect', 30_000)
      const chatMembership = chatSpace.join(
        { chatId: 'rd' },
        {
          onEnter: ({ resumed, gapless, reason }: never) => void chatEnters.push({ resumed, gapless, reason } as never),
        },
        { userId: 'redeploy' },
      )
      const liveMembership = liveSpace.join(
        { key: 'rk' },
        {
          onEnter: ({ resumed, gapless, reason }: never) => void liveEnters.push({ resumed, gapless, reason } as never),
        },
        { userId: 'redeploy' },
      )
      await waitFor(
        () => chatMembership.status === 'joined' && liveMembership.status === 'joined',
        'both joins',
        30_000,
      )
      expect(connects).toEqual([{ resumed: false, gapless: true, connectionIndex: 0 }])
      expect(chatEnters).toEqual([{ resumed: false, gapless: true, reason: 'join' }])

      const listener = feedHandler(chatMembership).onMessageFromServer(
        ({ message }: { message: { n: number } }) => void received.push(message.n),
      )
      await adminPushHandler(connection).sendToServer({ chatId: 'rd', n: 1, kind: 'feed' }, SEND_TIMEOUT)
      await waitFor(() => received.includes(1), 'the pre-redeploy push', 30_000)

      // a RAW-WIRE member rides the same redeploy: one room joined, one enrolled (it enrolls itself through the
      // admin handler) — the KV restore must bring BOTH back with their provenance intact
      const rawMember = await openAndClaim('main-channel', 'redeploy-raw')
      await join(rawMember.wire, rawMember.cid, 'chatSpace', { chatId: 'pv-j' })
      await sendOver(rawMember.wire, rawMember.cid, 'adminEnrollHandler', { cid: rawMember.cid, chatId: 'pv-e' })
      await rawMember.wire.waitFrame((frame) => frame.t === 'enrolled' && frame.space === 'chatSpace')
      const rawCursors = rawMember.wire.cursors()

      // THE REDEPLOY — kill the whole dev-server tree, free the ports, boot a new one on the same backplane files.
      // The port release and the SECOND boot are the load-sensitive stages: the fresh dev server compiles the whole
      // project while the parallel suites hammer the machine, so both ceilings are far above the defaults (1s / 30s)
      await serverProcess.killTree()
      await tp.waitPortsFree(30_000)
      serverProcess = tp.spawn(['bun', 'run', 'dev'])
      // `tp.output` reads the LAST spawned process — the fresh server's own "started" line, never the old one's
      await tp.waitStarted(tp.serverPort, 120_000)

      // the client reconnects on its own and RESUMES: no connector, no joiner — the fresh process's counters say so
      // (the reconnect policy retries at most every 5s — maxDelay — so this ceiling is all post-boot slack)
      await waitFor(
        () => connects.length >= 2 && chatMembership.status === 'joined' && liveMembership.status === 'joined',
        'the resume after the redeploy',
        90_000,
      )
      expect(connects[1].resumed).toBe(true)
      expect(connects[1].gapless).toBe(false)
      expect(connects[1].connectionIndex).toBeGreaterThan(0)
      // the resumable space came back through the passport — resumed, with the honest gap marker
      expect(chatEnters[1].resumed).toBe(true)
      expect(chatEnters[1].gapless).toBe(false)
      expect(chatEnters[1].reason).toBe('resume')
      // the opt-out space RE-JOINED the full way — the joiner ran, so this enter is not a resume
      const lastLiveEnter = liveEnters[liveEnters.length - 1]
      expect(lastLiveEnter.resumed).toBe(false)
      expect(lastLiveEnter.gapless).toBe(false)
      const counters = (await countersHandler(connection).sendToServer(undefined, SEND_TIMEOUT)) as {
        connectorRuns: number
        joinerRuns: number
        optJoinerRuns: number
      }
      expect(counters.connectorRuns).toBe(0)
      expect(counters.joinerRuns).toBe(0)
      expect(counters.optJoinerRuns).toBe(1)
      // the identity survived without the connector
      expect(await whoHandler(connection).sendToServer(undefined, SEND_TIMEOUT)).toEqual({ me: 'user-redeploy' })
      // and pushes flow on the restored room
      await adminPushHandler(connection).sendToServer({ chatId: 'rd', n: 2, kind: 'feed' }, SEND_TIMEOUT)
      await waitFor(() => received.includes(2), 'the post-redeploy push', 30_000)
      // the EVENTS mirror the callbacks (the emits are microtask-scheduled — poll them in): the resume closed the
      // connect family Settled → Success with the same markers and index the callback read
      await waitFor(
        () =>
          clientEvents.some(
            (event) => event.name === 'pointChannelConnectClientSuccess' && event.data.resumed === true,
          ) &&
          clientEvents.some((event) => event.name === 'pointSpaceJoinClientSuccess' && event.data.resumed === true),
        'the resumed client events',
        30_000,
      )
      const spaceOf = (event: { data: Record<string, unknown> }): string => (event.data.point as { name: string }).name
      const lastConnectSuccess = clientEvents
        .filter((event) => event.name === 'pointChannelConnectClientSuccess')
        .at(-1)!
      expect(lastConnectSuccess.data.resumed).toBe(true)
      expect(lastConnectSuccess.data.gapless).toBe(false)
      expect(lastConnectSuccess.data.connectionIndex).toBe(connects[1].connectionIndex)
      // the resumable space's join family resumed too; the opt-out space re-joined the full way — resumed: false
      const lastChatJoin = clientEvents
        .filter((event) => event.name === 'pointSpaceJoinClientSuccess' && spaceOf(event) === 'chatSpace')
        .at(-1)!
      expect(lastChatJoin.data.resumed).toBe(true)
      expect(lastChatJoin.data.gapless).toBe(false)
      expect(lastChatJoin.data.membershipIndex).toBeGreaterThan(0)
      const lastLiveJoin = clientEvents
        .filter((event) => event.name === 'pointSpaceJoinClientSuccess' && spaceOf(event) === 'liveSpace')
        .at(-1)!
      expect(lastLiveJoin.data.resumed).toBe(false)
      // the socket single fires on EVERY open — the reopen against the fresh server carries socketIndex > 0
      const socketConnects = clientEvents.filter((event) => event.name === 'socketClientConnect')
      expect(socketConnects[0].data.socketIndex).toBe(0)
      expect((socketConnects.at(-1)!.data.socketIndex as number) > 0).toBe(true)
      // the raw member restores from the KV passport on the fresh process — and the restored enrollment is still
      // leave-proof: a leave frame naming both rooms drops the joined one and cannot touch the enrolled one
      const freshWire = await openWire()
      freshWire.send({
        t: 'resume',
        entries: [{ cid: rawMember.cid, key: rawMember.resumeKey!, cursors: rawCursors }],
      })
      await freshWire.waitFrame((frame) => frame.t === 'resumed' && frame.cid === rawMember.cid)
      const roomIds = async (chatId: string): Promise<string[]> => {
        const reply = await sendOver(freshWire, rawMember.cid, 'adminRoomMembersHandler', { chatId })
        return (JSON.parse(reply.data as string) as { ids: string[] }).ids
      }
      expect(await roomIds('pv-j')).toContain(rawMember.cid)
      expect(await roomIds('pv-e')).toContain(rawMember.cid)
      freshWire.send({
        t: 'leave',
        cid: rawMember.cid,
        space: 'chatSpace',
        rooms: [JSON.stringify({ chatId: 'pv-j' }), JSON.stringify({ chatId: 'pv-e' })],
      })
      await waitFor(async () => !(await roomIds('pv-j')).includes(rawMember.cid), 'the joined room left', 30_000)
      expect(await roomIds('pv-e')).toContain(rawMember.cid)
      freshWire.close()

      listener.remove()
      liveMembership.leave()
      chatMembership.leave()
    } finally {
      connection.disconnect()
    }
  }, 360_000)
})
