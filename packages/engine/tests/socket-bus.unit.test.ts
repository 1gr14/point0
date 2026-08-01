/**
 * The backplane bus between processes, in-process and fast: TWO `EngineSocket` instances with mock servers sharing ONE
 * external Backplane (a Map plus per-channel subscriber sets, recording every publish and subscribe). Drives the
 * protocol directly — createConnection + claim + join over `handleMessage` — and proves the envelopes do their job over
 * the SHARDED topology: a room push initiated on A rides the room's own topic to B's socket and B's client reply lands
 * back in A's collect through A's process inbox; channel kick-by-identity crosses the shared channel; a space kick
 * crosses the bus and shrinks the remote membership; a `refresh` asks the matched remote connection to start over
 * without taking anything away from it; the enumerations scatter-gather (requests on the shared channel, answers into
 * the initiator's inbox — count sums numbers, list merges items, forEach streams them) WITH the spaces each connection
 * holds; amendIdentity patches the remote entry and its KV record; self-published envelopes are dropped (no double
 * local delivery); a disposed instance unsubscribes and goes silent.
 *
 * The sharding itself is pinned here too: which envelope kinds ride which channels; the room subscription goes up
 * BEFORE the join is confirmed (a gated-subscribe backplane); the last member out starts the unsubscribe LINGER and a
 * re-join inside it reuses the live subscription; a multi-room push (one envelope per room topic) delivers once per
 * targeted room, never once per topic copy (the eid dedup); a PARKED resumable connection keeps its topics subscribed
 * and its ring collects cross-process pushes for the resume replay; a `$identity` push from another process finds the
 * park too — the opted-in handler rings it, a non-opted one stamps the hole; the `redis://…` shortcut's subscriber
 * wrapper re-subscribes its whole set after a reconnect; POINT0_SOCKET_BUS_FORCE_SHARED pins everything back to the
 * shared channel.
 *
 * Nothing here waits for a DURATION: the hops are asynchronous but not timed, so every wait is a predicate poll and the
 * only real clocks are the collect/gather windows and the unsubscribe linger the tests deliberately watch.
 */
import { describe, expect, it } from 'bun:test'
import type { ErrorPoint0 } from '@point0/core'
import type { SocketConnectionSnapshot } from '@point0/core/socket'
import { Point0 } from '@point0/core'
import { z } from 'zod'
import type { Backplane } from '../src/config.js'
import type { RedisSubscriberLike } from '../src/backplane/bun-redis.js'
import { createResilientRedisSubscriber } from '../src/backplane/bun-redis.js'
import { EngineSocket } from '../src/socket.js'
import { resolveEngineSocketOptions } from '../src/config.js'

type Frame = Record<string, unknown> & { t: string }

/**
 * Wait for a CONDITION, never for a duration: every hop in this file (a bus publish, a frame reaching a socket, a reply
 * landing in a collect) is asynchronous but not timed, so a loaded machine may only make the test slower — never red.
 */
const waitFor = async (predicate: () => boolean, what: string, timeoutMs = 10_000): Promise<void> => {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    if (predicate()) {
      return
    }
    if (Date.now() > deadline) {
      throw new Error(`Timed out waiting for ${what}`)
    }
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
}

/** The one thing a poll cannot express: a deliberate pause INSIDE a handler, to prove something already happened. */
const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

/** Parse a recorded publish — envelopes are plain JSON. */
const envelopeOf = (record: { channel: string; message: string }): Record<string, unknown> =>
  JSON.parse(record.message) as Record<string, unknown>

/**
 * The collect window of the tests that assert a window is still OPEN. It has to outlast anything a loaded machine can
 * put between the push and that assertion — the tests never sleep it out, they poll for the close.
 */
const COLLECT_WINDOW_MS = 2000

/** The topology's channel names, as the backplane sees them — the wire fact the topology tests assert against. */
const SHARED_CHANNEL = 'point0:socket:bus'
const PROC_PREFIX = 'point0:socket:proc:'
const roomBusTopic = (room: Record<string, unknown>): string =>
  `point0:socket:room:root:chatChannel:chatSpace:${JSON.stringify(room)}`

type SharedBackplane = Backplane & {
  memory: Map<string, string>
  /** every publish, in order — the topology tests read the channels envelopes actually rode */
  published: Array<{ channel: string; message: string }>
  /** every subscribe call, in order — a re-join inside the linger must NOT add one */
  subscribeCalls: string[]
  /** the channels with at least one live subscriber right now */
  subscribedChannels: () => string[]
}

const createSharedBackplane = (): SharedBackplane => {
  const memory = new Map<string, string>()
  // subscribers keyed by channel name — publish only reaches the matching channel's subscribers
  const subscribersByChannel = new Map<string, Set<(message: string) => void>>()
  const published: Array<{ channel: string; message: string }> = []
  const subscribeCalls: string[] = []
  return {
    memory,
    published,
    subscribeCalls,
    subscribedChannels: () =>
      [...subscribersByChannel.entries()].filter(([, subscribers]) => subscribers.size > 0).map(([channel]) => channel),
    get: (key) => memory.get(key),
    set: (key, value) => {
      memory.set(key, value)
    },
    delete: (key) => {
      memory.delete(key)
    },
    publish: (channel, message) => {
      published.push({ channel, message })
      // loops back to every subscriber of the channel including the publisher — the pid filter must drop the echo
      const subscribers = subscribersByChannel.get(channel)
      if (!subscribers) {
        return
      }
      for (const subscriber of [...subscribers]) {
        subscriber(message)
      }
    },
    subscribe: (channel, onMessage) => {
      subscribeCalls.push(channel)
      const subscribers = subscribersByChannel.get(channel) ?? new Set()
      subscribers.add(onMessage)
      subscribersByChannel.set(channel, subscribers)
      return () => {
        subscribers.delete(onMessage)
      }
    },
  }
}

type FakeSocket = {
  data: { __point0Socket: { scope: string; cids: Set<string> } }
  frames: Frame[]
  topics: Set<string>
  send: (serialized: string) => void
  subscribe: (topic: string) => void
  unsubscribe: (topic: string) => void
}

/** One fake "process": an EngineSocket over a mock server whose bunServer fans topic publishes to the fake sockets. */
const createInstance = ({
  backplane,
  channel,
  points = [],
}: {
  backplane: Backplane
  channel: { point: unknown }
  /** extra points `findPoint` resolves — spaces + serverHandlers a test drives through `handleMessage` */
  points?: Array<{ point: unknown }>
}): { socket: EngineSocket<ErrorPoint0>; createSocket: () => FakeSocket; logs: unknown[] } => {
  const sockets = new Set<FakeSocket>()
  const logs: unknown[] = []
  const server = {
    scope: 'root',
    clients: [],
    backplaneProvided: backplane,
    socketEnabled: true,
    socketOptions: resolveEngineSocketOptions(true),
    log: (entry: unknown) => {
      logs.push(entry)
    },
    bunServer: {
      publish: (topic: string, message: string) => {
        for (const socket of sockets) {
          if (socket.topics.has(topic)) {
            socket.send(message)
          }
        }
      },
    },
    points: {
      findPoint: ({ type, name }: { type: string; name: string }) => {
        const found = [channel, ...points].find((candidate) => {
          const point = candidate.point as { type: string; name: string }
          return point.type === type && point.name === name
        })
        return found ? { point: found.point } : undefined
      },
      manager: {
        root: channel.point,
        // the enrollment walk filters the manager's collection for the channel's space points
        collection: [channel, ...points].map((candidate) => ({
          type: (candidate.point as { type: string }).type,
          point: candidate.point,
        })),
      },
    },
  }
  const socket = new EngineSocket({ server: server as never })
  const createSocket = (): FakeSocket => {
    const socket: FakeSocket = {
      data: { __point0Socket: { scope: 'root', cids: new Set() } },
      frames: [],
      topics: new Set(),
      send: (serialized) => {
        socket.frames.push(JSON.parse(serialized) as Frame)
      },
      subscribe: (topic) => {
        socket.topics.add(topic)
      },
      unsubscribe: (topic) => {
        socket.topics.delete(topic)
      },
    }
    sockets.add(socket)
    return socket
  }
  return { socket, createSocket, logs }
}

/** connect + claim one connection on an instance; returns the claimed cid and its fake socket. */
const openConnection = async (
  instance: { socket: EngineSocket<ErrorPoint0>; createSocket: () => FakeSocket },
  channelPoint: unknown,
  { identity }: { identity: unknown },
): Promise<{ cid: string; socket: FakeSocket }> => {
  const { cid, ticket } = await instance.socket.createConnection({ point: channelPoint as never, identity })
  const socket = instance.createSocket()
  await instance.socket.handleMessage(socket as never, JSON.stringify({ t: 'claim', ticket }))
  const claimed = socket.frames.find((frame) => frame.t === 'claimed')
  expect(claimed?.cid).toBe(cid)
  return { cid, socket }
}

/** send a join frame over the socket and return the rooms the server admitted (serialized slepki). */
const join = async (
  instance: { socket: EngineSocket<ErrorPoint0> },
  socket: FakeSocket,
  cid: string,
  spaceName: string,
  input: Record<string, unknown>,
  joinId = 'join-' + spaceName + '-' + cid,
): Promise<string[]> => {
  await instance.socket.handleMessage(
    socket as never,
    JSON.stringify({ t: 'join', id: joinId, cid, space: spaceName, input: JSON.stringify(input) }),
  )
  const joined = socket.frames.find((frame) => frame.t === 'joined' && frame.id === joinId)
  expect(joined).toBeDefined()
  return joined!.rooms as string[]
}

const buildChannel = () => {
  const root = Point0.lets('root', 'root').root()
  const chatChannel = root.lets('channel', 'chatChannel').channel()
  const chatSpace = chatChannel
    .lets<{ chatId: string }>('space', 'chatSpace')
    .input(z.object({ chatId: z.string() }))
    .joiner(({ input }) => ({ chatId: input.chatId }))
    .space()
  // a space clientHandler — its pushes target rooms of chatSpace
  const pingHandler = chatSpace.lets('clientHandler', 'pingHandler').clientHandler()
  // a channel clientHandler — its pushes address connections directly (cid / identity matcher)
  const announceHandler = chatChannel.lets('clientHandler', 'announceHandler').clientHandler()
  return { root, chatChannel, chatSpace, pingHandler, announceHandler }
}

/**
 * A RESUMABLE channel with a buffering handler — what the parked-connection topology tests drive. The two CHANNEL
 * handlers are the `$identity`-push targets: the opted-in `noteHandler` rings the park, the non-opted `noteHoleHandler`
 * stamps the hole.
 */
const buildResumableChannel = () => {
  const root = Point0.lets('root', 'root').root()
  const feedChannel = root.lets('channel', 'feedChannel').channel({ resumable: true })
  const feedSpace = feedChannel
    .lets<{ feedId: string }>('space', 'feedSpace')
    .input(z.object({ feedId: z.string() }))
    .joiner(({ input }) => ({ feedId: input.feedId }))
    .space()
  const feedHandler = feedSpace.lets('clientHandler', 'feedHandler').clientHandler({ resumable: 16 })
  const noteHandler = feedChannel.lets('clientHandler', 'noteHandler').clientHandler({ resumable: 16 })
  const noteHoleHandler = feedChannel.lets('clientHandler', 'noteHoleHandler').clientHandler()
  return { root, feedChannel, feedSpace, feedHandler, noteHandler, noteHoleHandler }
}

/**
 * A backplane whose ROOM-topic subscribes PARK until the test releases them — the join-race harness: the join must not
 * be confirmed while its room subscription is still being established.
 */
const createGatedBackplane = (): SharedBackplane & {
  pendingRoomSubscribes: () => number
  releaseRoomSubscribes: () => void
} => {
  const inner = createSharedBackplane()
  const waiting: Array<() => void> = []
  let gateOpen = false
  return {
    ...inner,
    pendingRoomSubscribes: () => waiting.length,
    releaseRoomSubscribes: () => {
      gateOpen = true
      for (const release of waiting.splice(0)) {
        release()
      }
    },
    subscribe: async (channel, onMessage) => {
      if (channel.startsWith('point0:socket:room:') && !gateOpen) {
        await new Promise<void>((resolve) => waiting.push(resolve))
      }
      return inner.subscribe(channel, onMessage)
    },
  }
}

describe('socket bus (two instances, one backplane)', () => {
  it('createConnection stores the identity in the KV record', async () => {
    const backplane = createSharedBackplane()
    const { chatChannel } = buildChannel()
    const a = createInstance({ backplane, channel: chatChannel })
    try {
      const { cid } = await a.socket.createConnection({
        point: chatChannel.point as never,
        identity: { me: 'user-x' },
      })
      const stored = JSON.parse(backplane.memory.get(`point0:socket:conn:${cid}`) as string) as {
        scope: string
        channel: string
        identity: string
      }
      expect(stored.channel).toBe('chatChannel')
      expect(stored.identity).toBe(JSON.stringify({ me: 'user-x' }))
    } finally {
      a.socket.dispose()
    }
  })

  it('a room push crosses the bus, the remote reply comes back to the collect, and the echo is not doubled', async () => {
    const backplane = createSharedBackplane()
    const { chatChannel, chatSpace, pingHandler } = buildChannel()
    const a = createInstance({ backplane, channel: chatChannel, points: [chatSpace, pingHandler] })
    const b = createInstance({ backplane, channel: chatChannel, points: [chatSpace, pingHandler] })
    await a.socket.start()
    await b.socket.start()
    try {
      const roomSerialized = JSON.stringify({ chatId: '5' })
      const memberA = await openConnection(a, chatChannel.point, { identity: { me: 'user-a' } })
      const memberB = await openConnection(b, chatChannel.point, { identity: { me: 'user-b' } })
      await join(a, memberA.socket, memberA.cid, 'chatSpace', { chatId: '5' })
      await join(b, memberB.socket, memberB.cid, 'chatSpace', { chatId: '5' })

      const replies: Array<{ cid: string; data: string | undefined }> = []
      let done = false
      a.socket.adapter.push({
        channel: chatChannel.point as never,
        handler: pingHandler.point as never,
        target: { space: 'chatSpace', rooms: [roomSerialized] },
        input: JSON.stringify({ ask: 'hi' }),
        collect: {
          timeoutMs: COLLECT_WINDOW_MS,
          onReply: (reply) => replies.push({ cid: reply.cid, data: reply.data }),
          onDone: () => {
            done = true
          },
        },
      })
      const pushedTo = (socket: FakeSocket): Frame[] =>
        socket.frames.filter((frame) => frame.t === 'msg' && frame.handler === 'pingHandler')
      await waitFor(
        () => pushedTo(memberA.socket).length > 0 && pushedTo(memberB.socket).length > 0,
        'the push to reach both processes',
      )

      // the push reached BOTH processes' sockets — locally on A, through the bus on B — exactly once each, tagged
      // with the space + room the message addressed
      const aMsgs = pushedTo(memberA.socket)
      const bMsgs = pushedTo(memberB.socket)
      expect(aMsgs).toHaveLength(1)
      expect(bMsgs).toHaveLength(1)
      expect(bMsgs[0].space).toBe('chatSpace')
      expect(bMsgs[0].room).toBe(roomSerialized)
      const mid = bMsgs[0].mid as string
      expect(mid).toBeDefined()

      // B's client answers — B holds no pending collect, so the reply travels the bus back to A's collect
      await b.socket.handleMessage(
        memberB.socket as never,
        JSON.stringify({ t: 'reply', id: mid, cid: memberB.cid, data: JSON.stringify({ answer: 'pong' }) }),
      )
      await waitFor(() => replies.length > 0, "B's reply to travel the bus back into A's collect")
      expect(
        replies.some((reply) => reply.cid === memberB.cid && reply.data === JSON.stringify({ answer: 'pong' })),
      ).toBe(true)

      // the TOPOLOGY of that round trip: the push rode the room's own topic (only processes holding a member of the
      // room are subscribed there), and B's forwarded reply rode A's process inbox — routed by the mid alone, which
      // the initiator minted as `<pid>:<id>`
      const pushPublish = backplane.published.find((record) => envelopeOf(record).kind === 'push')
      expect(pushPublish?.channel).toBe(roomBusTopic({ chatId: '5' }))
      const replyPublish = backplane.published.find((record) => envelopeOf(record).kind === 'reply')
      expect(replyPublish?.channel).toBe(PROC_PREFIX + String(envelopeOf(pushPublish!).pid))
      expect(mid.startsWith(String(envelopeOf(pushPublish!).pid) + ':')).toBe(true)

      // A's own member answers locally too; the window still closes on the timeout (external backplane can't count)
      await a.socket.handleMessage(
        memberA.socket as never,
        JSON.stringify({
          t: 'reply',
          id: aMsgs[0].mid as string,
          cid: memberA.cid,
          data: JSON.stringify({ answer: 'pong' }),
        }),
      )
      await waitFor(() => replies.length === 2, "A's own local reply to land in the collect")
      expect(done).toBe(false)
      await waitFor(() => done, 'the collect window to close on its timeout', COLLECT_WINDOW_MS + 10_000)
    } finally {
      a.socket.dispose()
      b.socket.dispose()
    }
  })

  it('an uncountable collect window rejects a local reply the push never addressed, and still takes the remote one', async () => {
    const backplane = createSharedBackplane()
    const { chatChannel, announceHandler } = buildChannel()
    const a = createInstance({ backplane, channel: chatChannel, points: [announceHandler] })
    const b = createInstance({ backplane, channel: chatChannel, points: [announceHandler] })
    await a.socket.start()
    await b.socket.start()
    try {
      // TWO connections on one process — the real shape of the abuse: a client holding two channel connections over one
      // socket, answering as the cid the push did not address
      const targeted = await openConnection(a, chatChannel.point, { identity: { me: 'user-a1' } })
      const bystander = await openConnection(a, chatChannel.point, { identity: { me: 'user-a2' } })
      const remote = await openConnection(b, chatChannel.point, { identity: { me: 'user-b' } })

      const replies: Array<{ cid: string; data: string | undefined }> = []
      let done = false
      // an identity matcher makes the window UNCOUNTABLE (remote processes resolve it against entries this one cannot
      // see) while the LOCAL delivery stays exactly known: one frame, to `targeted`
      a.socket.adapter.push({
        channel: chatChannel.point as never,
        handler: announceHandler.point as never,
        target: { identityMatcher: JSON.stringify({ me: 'user-a1' }) },
        input: JSON.stringify({ ask: 'hi' }),
        collect: {
          timeoutMs: COLLECT_WINDOW_MS,
          onReply: (reply) => replies.push({ cid: reply.cid, data: reply.data }),
          onDone: () => {
            done = true
          },
        },
      })
      await waitFor(
        () => targeted.socket.frames.some((frame) => frame.t === 'msg' && frame.handler === 'announceHandler'),
        'the addressed connection to receive the push',
      )
      const msg = targeted.socket.frames.find((frame) => frame.t === 'msg' && frame.handler === 'announceHandler')
      expect(msg).toBeDefined()
      expect(bystander.socket.frames.filter((frame) => frame.t === 'msg')).toHaveLength(0)
      const mid = msg!.mid as string
      // a `$identity` push is a SELECTION — it rides the shared channel, never a topic (a matcher resolves per
      // process, against entries only that process can see)
      await waitFor(
        () => backplane.published.some((record) => envelopeOf(record).kind === 'push'),
        'the push envelope to be published',
      )
      expect(backplane.published.find((record) => envelopeOf(record).kind === 'push')?.channel).toBe(SHARED_CHANNEL)

      const reply = (cid: string, answer: string): string =>
        JSON.stringify({ t: 'reply', id: mid, cid, data: JSON.stringify({ answer }) })
      // the addressed connection answers the one frame this process sent — it lands
      await a.socket.handleMessage(targeted.socket as never, reply(targeted.cid, 'targeted'))
      // the other LOCAL connection forges a reply for the same mid — it received no frame, so it is dropped outright
      await a.socket.handleMessage(bystander.socket as never, reply(bystander.cid, 'forged'))
      // a remote process's connection answers: unknowable from here, so the coarse per-cid cap lets it through
      await b.socket.handleMessage(remote.socket as never, reply(remote.cid, 'remote'))
      const dropLogged = (): boolean =>
        a.logs.some((entry) =>
          String((entry as { message?: string }).message ?? '').includes(
            `Dropped a collected reply from local connection ${bystander.cid}`,
          ),
        )
      await waitFor(() => replies.length === 2 && dropLogged(), 'the two honest replies to land and the drop to log')

      expect(replies.map((item) => item.cid).sort()).toEqual([targeted.cid, remote.cid].sort())
      expect(replies.map((item) => JSON.parse(item.data as string).answer).sort()).toEqual(['remote', 'targeted'])
      // the drop is logged…
      expect(dropLogged()).toBe(true)
      // …and it never advanced the window: the forged reply cannot close it early on the honest repliers
      expect(done).toBe(false)
      await waitFor(() => done, 'the collect window to close on its timeout', COLLECT_WINDOW_MS + 10_000)
    } finally {
      a.socket.dispose()
      b.socket.dispose()
    }
  })

  it('channel kick by identity matcher crosses the bus and closes the remote connection', async () => {
    const backplane = createSharedBackplane()
    const { chatChannel } = buildChannel()
    const a = createInstance({ backplane, channel: chatChannel })
    const b = createInstance({ backplane, channel: chatChannel })
    await a.socket.start()
    await b.socket.start()
    try {
      const memberB = await openConnection(b, chatChannel.point, { identity: { me: 'user-b' } })
      await a.socket.adapter.kick({
        channel: chatChannel.point as never,
        matcher: JSON.stringify({ me: 'user-b' }),
        reason: 'bus-kick',
      })
      await waitFor(
        () => memberB.socket.frames.some((frame) => frame.t === 'closed'),
        'the kick to cross the bus and close the remote connection',
      )
      const closed = memberB.socket.frames.find((frame) => frame.t === 'closed')
      expect(closed?.cid).toBe(memberB.cid)
      expect(closed?.reason).toBe('bus-kick')
      // a kick is a COMMAND — it rides the shared channel (an identity matcher cannot be laid out over topics)
      expect(backplane.published.find((record) => envelopeOf(record).kind === 'kick')?.channel).toBe(SHARED_CHANNEL)
      // B's entry is gone — a list() gather over the bus finds nothing anymore
      const listed = await a.socket.adapter.list({ channel: chatChannel.point as never, timeoutMs: 200 })
      expect(listed).toHaveLength(0)
    } finally {
      a.socket.dispose()
      b.socket.dispose()
    }
  })

  it('a space kick crosses the bus: the remote connection gets `left` and its membership shrinks, no close', async () => {
    const backplane = createSharedBackplane()
    const { chatChannel, chatSpace, pingHandler } = buildChannel()
    const a = createInstance({ backplane, channel: chatChannel, points: [chatSpace, pingHandler] })
    const b = createInstance({ backplane, channel: chatChannel, points: [chatSpace, pingHandler] })
    await a.socket.start()
    await b.socket.start()
    try {
      const roomSerialized = JSON.stringify({ chatId: 'k' })
      const memberB = await openConnection(b, chatChannel.point, { identity: { me: 'user-b' } })
      await join(b, memberB.socket, memberB.cid, 'chatSpace', { chatId: 'k' })

      // a space kick on A forces the leave on B — the exact `rooms` snapshot list, a `left` frame, no close
      await a.socket.adapter.kick({
        channel: chatChannel.point as never,
        space: 'chatSpace',
        rooms: [JSON.stringify({ chatId: 'k' })],
        reason: 'room-closed',
      })
      await waitFor(
        () => memberB.socket.frames.some((frame) => frame.t === 'left'),
        'the space kick to cross the bus and shrink the remote membership',
      )
      const left = memberB.socket.frames.find((frame) => frame.t === 'left')
      expect(left?.cid).toBe(memberB.cid)
      expect(left?.space).toBe('chatSpace')
      expect(left?.rooms).toEqual([roomSerialized])
      expect(left?.reason).toBe('room-closed')
      expect(memberB.socket.frames.find((frame) => frame.t === 'closed')).toBeUndefined()

      // the connection still exists; its snapshot no longer carries the space
      const listed = await a.socket.adapter.list({ channel: chatChannel.point as never, timeoutMs: 200 })
      expect(listed.map((snapshot) => snapshot.cid)).toEqual([memberB.cid])
      expect(listed[0].spaces).toBeUndefined()
    } finally {
      a.socket.dispose()
      b.socket.dispose()
    }
  })

  it('space.enroll crosses the bus: the remote connection gains the enrolled rooms and room pushes reach it', async () => {
    const backplane = createSharedBackplane()
    const { chatChannel, chatSpace, pingHandler } = buildChannel()
    const a = createInstance({ backplane, channel: chatChannel, points: [chatSpace, pingHandler] })
    const b = createInstance({ backplane, channel: chatChannel, points: [chatSpace, pingHandler] })
    await a.socket.start()
    await b.socket.start()
    try {
      const roomSerialized = JSON.stringify({ chatId: 'en' })
      const memberB = await openConnection(b, chatChannel.point, { identity: { me: 'user-b' } })
      // enroll on A by identity — B's process applies it: the frame announces the FULL enrolled set
      await a.socket.adapter.enroll({
        channel: chatChannel.point as never,
        space: 'chatSpace',
        matcher: JSON.stringify({ me: 'user-b' }),
        enrollRooms: [roomSerialized],
      })
      await waitFor(
        () => memberB.socket.frames.some((frame) => frame.t === 'enrolled'),
        'the enrollment to cross the bus',
      )
      const enrolled = memberB.socket.frames.find((frame) => frame.t === 'enrolled')
      expect(enrolled?.cid).toBe(memberB.cid)
      expect(enrolled?.space).toBe('chatSpace')
      expect(enrolled?.rooms).toEqual([roomSerialized])
      // the enroll command rode the shared channel — like every command with a selection for a target
      expect(backplane.published.find((record) => envelopeOf(record).kind === 'enroll')?.channel).toBe(SHARED_CHANNEL)
      // a room push from A now reaches the remote enrolled member
      a.socket.adapter.push({
        channel: chatChannel.point as never,
        handler: pingHandler.point as never,
        target: { space: 'chatSpace', rooms: [roomSerialized] },
        input: JSON.stringify({ ask: 'enrolled?' }),
      })
      await waitFor(
        () => memberB.socket.frames.some((frame) => frame.t === 'msg' && frame.room === roomSerialized),
        'the room push to reach the remote enrolled member',
      )
      const msg = memberB.socket.frames.find((frame) => frame.t === 'msg' && frame.room === roomSerialized)
      expect(msg).toBeDefined()
      // the snapshot carries the enrollment — presence sees it
      const listed = await a.socket.adapter.list({ channel: chatChannel.point as never, timeoutMs: 300 })
      expect(listed.find((snapshot) => snapshot.cid === memberB.cid)?.spaces).toEqual({
        chatSpace: [roomSerialized],
      })
    } finally {
      a.socket.dispose()
      b.socket.dispose()
    }
  })

  it('refresh crosses the bus: the matched remote connection is told to start over, and keeps everything it holds', async () => {
    const backplane = createSharedBackplane()
    const { chatChannel, chatSpace, pingHandler } = buildChannel()
    const a = createInstance({ backplane, channel: chatChannel, points: [chatSpace, pingHandler] })
    const b = createInstance({ backplane, channel: chatChannel, points: [chatSpace, pingHandler] })
    await a.socket.start()
    await b.socket.start()
    try {
      const roomSerialized = JSON.stringify({ chatId: 'r' })
      const target = await openConnection(b, chatChannel.point, { identity: { me: 'user-b' } })
      const bystander = await openConnection(b, chatChannel.point, { identity: { me: 'user-c' } })
      await join(b, target.socket, target.cid, 'chatSpace', { chatId: 'r' })

      // refresh from the OTHER process: the matched client is asked to re-run its connect request (the connector runs
      // again — a changed identity, re-run enrollers), and that ask is ONE frame naming the connection's current cid
      await a.socket.adapter.refresh({
        channel: chatChannel.point as never,
        matcher: JSON.stringify({ me: 'user-b' }),
      })
      await waitFor(
        () => target.socket.frames.some((frame) => frame.t === 'refresh'),
        'the refresh to cross the bus to the matched connection',
      )
      expect(target.socket.frames.filter((frame) => frame.t === 'refresh')).toEqual([{ t: 'refresh', cid: target.cid }])
      // the identity matcher narrows on the REMOTE process too — the channel's other connection was left alone
      expect(bystander.socket.frames.some((frame) => frame.t === 'refresh')).toBe(false)

      // nothing was torn down by the ask: no close frame, no `left`, and the entry still carries its room
      expect(target.socket.frames.some((frame) => frame.t === 'closed' || frame.t === 'left')).toBe(false)
      const listed = await a.socket.adapter.list({ channel: chatChannel.point as never, timeoutMs: 200 })
      expect(listed.map((snapshot) => snapshot.cid).sort()).toEqual([target.cid, bystander.cid].sort())
      expect(listed.find((snapshot) => snapshot.cid === target.cid)?.spaces).toEqual({ chatSpace: [roomSerialized] })
      // …so the room keeps delivering to it while the client does the re-announce on its own terms
      a.socket.adapter.push({
        channel: chatChannel.point as never,
        handler: pingHandler.point as never,
        target: { space: 'chatSpace', rooms: [roomSerialized] },
        input: JSON.stringify({ ask: 'still there?' }),
      })
      await waitFor(
        () => target.socket.frames.some((frame) => frame.t === 'msg' && frame.room === roomSerialized),
        'a room push to still reach the refreshed connection',
      )
    } finally {
      a.socket.dispose()
      b.socket.dispose()
    }
  })

  it('list() gathers the remote connection with its identity and the spaces it holds', async () => {
    const backplane = createSharedBackplane()
    const { chatChannel, chatSpace, pingHandler } = buildChannel()
    const a = createInstance({ backplane, channel: chatChannel, points: [chatSpace, pingHandler] })
    const b = createInstance({ backplane, channel: chatChannel, points: [chatSpace, pingHandler] })
    await a.socket.start()
    await b.socket.start()
    try {
      const memberA = await openConnection(a, chatChannel.point, { identity: { me: 'user-a' } })
      const memberB = await openConnection(b, chatChannel.point, { identity: { me: 'user-b' } })
      await join(b, memberB.socket, memberB.cid, 'chatSpace', { chatId: 'g' })

      const listed = await a.socket.adapter.list({ channel: chatChannel.point as never, timeoutMs: 300 })
      expect(listed.map((snapshot) => snapshot.cid).sort()).toEqual([memberA.cid, memberB.cid].sort())
      const remote = listed.find((snapshot) => snapshot.cid === memberB.cid)
      expect(remote?.identity).toBe(JSON.stringify({ me: 'user-b' }))
      // the remote's space membership rides the snapshot — presence across the cluster
      expect(remote?.spaces).toEqual({ chatSpace: [JSON.stringify({ chatId: 'g' })] })
      // A's own member joined nothing — no spaces on its snapshot
      const localSnapshot = listed.find((snapshot) => snapshot.cid === memberA.cid)
      expect(localSnapshot?.spaces).toBeUndefined()
    } finally {
      a.socket.dispose()
      b.socket.dispose()
    }
  })

  it('count() scatter-gathers numbers over the bus: the local count plus every remote answer', async () => {
    const backplane = createSharedBackplane()
    const { chatChannel } = buildChannel()
    const a = createInstance({ backplane, channel: chatChannel })
    const b = createInstance({ backplane, channel: chatChannel })
    await a.socket.start()
    await b.socket.start()
    try {
      await openConnection(a, chatChannel.point, { identity: { me: 'user-a' } })
      await openConnection(b, chatChannel.point, { identity: { me: 'user-b' } })
      await openConnection(b, chatChannel.point, { identity: { me: 'user-b2' } })
      const total = await a.socket.adapter.count({ channel: chatChannel.point as never, timeoutMs: 300 })
      expect(total).toBe(3)
      // the roll-call topology: the scatter REQUEST rode the shared channel (every process must answer), and B's
      // numbers-only answer rode straight into A's process inbox — the requester's pid is on the request envelope
      const request = backplane.published.find((record) => envelopeOf(record).kind === 'count-req')
      expect(request?.channel).toBe(SHARED_CHANNEL)
      const response = backplane.published.find((record) => envelopeOf(record).kind === 'count-res')
      expect(response?.channel).toBe(PROC_PREFIX + String(envelopeOf(request!).pid))
      // the matcher narrows on every process
      const matched = await a.socket.adapter.count({
        channel: chatChannel.point as never,
        matcher: JSON.stringify({ me: 'user-b' }),
        timeoutMs: 300,
      })
      expect(matched).toBe(1)
    } finally {
      a.socket.dispose()
      b.socket.dispose()
    }
  })

  it('forEach() streams the local items synchronously, the bus answers as they arrive, the window closes it', async () => {
    const backplane = createSharedBackplane()
    const { chatChannel } = buildChannel()
    const a = createInstance({ backplane, channel: chatChannel })
    const b = createInstance({ backplane, channel: chatChannel })
    await a.socket.start()
    await b.socket.start()
    try {
      const memberA = await openConnection(a, chatChannel.point, { identity: { me: 'user-a' } })
      const memberB = await openConnection(b, chatChannel.point, { identity: { me: 'user-b' } })
      const items: SocketConnectionSnapshot[] = []
      let done = false
      a.socket.adapter.forEach({
        channel: chatChannel.point as never,
        timeoutMs: COLLECT_WINDOW_MS,
        onItem: (item) => items.push(item),
        onDone: () => {
          done = true
        },
      })
      // the local match streamed synchronously, before any bus answer
      expect(items.map((item) => item.cid)).toEqual([memberA.cid])
      await waitFor(() => items.length === 2, "the remote process's answer to stream in")
      expect(items.map((item) => item.cid).sort()).toEqual([memberA.cid, memberB.cid].sort())
      // only the window closes the stream — an external backplane cannot know who else might answer
      expect(done).toBe(false)
      await waitFor(() => done, 'the gather window to close on its timeout', COLLECT_WINDOW_MS + 10_000)
    } finally {
      a.socket.dispose()
      b.socket.dispose()
    }
  })

  it('the core enumeration namespaces merge across the bus with the typed item shapes', async () => {
    const backplane = createSharedBackplane()
    const { chatChannel, chatSpace, pingHandler } = buildChannel()
    const a = createInstance({ backplane, channel: chatChannel, points: [chatSpace, pingHandler] })
    const b = createInstance({ backplane, channel: chatChannel, points: [chatSpace, pingHandler] })
    // register A's adapter for the scope — chatChannel.connections.* / chatSpace.memberships.* resolve to it
    a.socket.registerAdapters()
    await a.socket.start()
    await b.socket.start()
    try {
      const memberA = await openConnection(a, chatChannel.point, { identity: { me: 'user-a' } })
      const memberB = await openConnection(b, chatChannel.point, { identity: { me: 'user-b' } })
      await join(a, memberA.socket, memberA.cid, 'chatSpace', { chatId: 'ns' })
      await join(b, memberB.socket, memberB.cid, 'chatSpace', { chatId: 'ns' })

      // channel.connections.server.count — numbers only on the bus
      expect(await chatChannel.connections.server.count(undefined, { timeout: 300 })).toBe(2)
      // channel.connections.server.list — { connectionId, identity, spaces } with the per-space parsed rooms
      const listed = await chatChannel.connections.server.list(undefined, { timeout: 300 })
      expect(listed.map((item) => item.connectionId).sort()).toEqual([memberA.cid, memberB.cid].sort())
      const remote = listed.find((item) => item.connectionId === memberB.cid)
      expect(remote?.identity).toEqual({ me: 'user-b' })
      expect(remote?.spaces).toEqual({ chatSpace: [{ chatId: 'ns' }] })

      // space.memberships.server.count/list — items are { connectionId, identity, rooms }
      expect(await chatSpace.memberships.server.count({ room: { chatId: 'ns' } }, { timeout: 300 })).toBe(2)
      const memberships = await chatSpace.memberships.server.list({ room: { chatId: 'ns' } }, { timeout: 300 })
      expect(memberships.map((item) => item.connectionId).sort()).toEqual([memberA.cid, memberB.cid].sort())
      for (const membership of memberships) {
        expect(membership.rooms).toEqual([{ chatId: 'ns' }])
      }

      // space.memberships.server.forEach with the callback — resolves with the processed count once the window closed
      const streamed: string[] = []
      const processed = await chatSpace.memberships.server.forEach(
        { room: { chatId: 'ns' } },
        {
          timeout: 300,
          // the destructured param types contextually — the forEach overloads carry it (no annotation needed)
          onMembership: ({ connectionId }) => {
            streamed.push(connectionId)
          },
        },
      )
      expect(processed).toBe(2)
      expect([...streamed].sort()).toEqual([memberA.cid, memberB.cid].sort())
    } finally {
      a.socket.dispose()
      b.socket.dispose()
    }
  })

  it('amendIdentity crosses the bus: the remote entry and its KV record are patched, matching follows the patch', async () => {
    const backplane = createSharedBackplane()
    const { chatChannel, announceHandler } = buildChannel()
    const a = createInstance({ backplane, channel: chatChannel, points: [announceHandler] })
    const b = createInstance({ backplane, channel: chatChannel, points: [announceHandler] })
    await a.socket.start()
    await b.socket.start()
    try {
      const memberB = await openConnection(b, chatChannel.point, { identity: { me: 'user-b' } })
      await a.socket.adapter.amendIdentity({
        channel: chatChannel.point as never,
        matcher: JSON.stringify({ me: 'user-b' }),
        patchSerialized: JSON.stringify({ plan: 'pro' }),
      })
      const storedIdentity = (): string =>
        (JSON.parse(backplane.memory.get(`point0:socket:conn:${memberB.cid}`) as string) as { identity: string })
          .identity
      await waitFor(
        () => storedIdentity().includes('pro'),
        "the amend to cross the bus and patch the remote entry's KV record",
      )
      // the KV record was rewritten with the shallow-merged identity
      const stored = JSON.parse(backplane.memory.get(`point0:socket:conn:${memberB.cid}`) as string) as {
        identity: string
      }
      expect(JSON.parse(stored.identity)).toEqual({ me: 'user-b', plan: 'pro' })
      // matching over the bus now selects by the patched key…
      const listed = await a.socket.adapter.list({
        channel: chatChannel.point as never,
        matcher: JSON.stringify({ plan: 'pro' }),
        timeoutMs: 200,
      })
      expect(listed.map((snapshot) => snapshot.cid)).toEqual([memberB.cid])
      expect(JSON.parse(listed[0].identity)).toEqual({ me: 'user-b', plan: 'pro' })
      // …and so does a push narrowed by it
      a.socket.adapter.push({
        channel: chatChannel.point as never,
        handler: announceHandler.point as never,
        target: { identityMatcher: JSON.stringify({ plan: 'pro' }) },
        input: JSON.stringify({ text: 'hi' }),
      })
      await waitFor(
        () =>
          memberB.socket.frames.some(
            (frame) => frame.t === 'msg' && frame.handler === 'announceHandler' && frame.cid === memberB.cid,
          ),
        'the push narrowed by the patched identity to reach the remote connection',
      )
    } finally {
      a.socket.dispose()
      b.socket.dispose()
    }
  })

  it('an imperative reply() frames the envelope immediately while the handler keeps running', async () => {
    const backplane = createSharedBackplane()
    const { chatChannel } = buildChannel()
    let socketRef: { frames: Array<{ t: string }> } | undefined
    let replyFramesAtReplyTime = -1
    const earlyHandler = chatChannel
      .lets('serverHandler', 'earlyHandler')
      .clientSend(z.object({ fail: z.boolean() }))
      .serverReply<{ echo: string }>(async ({ input, reply }) => {
        if (input.fail) {
          reply(Object.assign(new Error('refused early'), { code: 'EARLY_NOPE' }))
          return
        }
        reply({ echo: 'now' })
        // the envelope already left — count the frames the socket holds at this instant
        replyFramesAtReplyTime = socketRef ? socketRef.frames.filter((frame) => frame.t === 'reply').length : -1
        // the handler's slow tail: the frame above must not have waited for it
        await sleep(25)
      })
      .serverHandler()
    const a = createInstance({ backplane, channel: chatChannel, points: [earlyHandler] })
    await a.socket.start()
    try {
      const member = await openConnection(a, chatChannel.point, { identity: { me: 'user-a' } })
      socketRef = member.socket as never
      await a.socket.handleMessage(
        member.socket as never,
        JSON.stringify({
          t: 'send',
          id: 'client-msg-1',
          cid: member.cid,
          handler: 'earlyHandler',
          input: JSON.stringify({ fail: false }),
        }),
      )
      // the frame left at reply() time — before the callback's slow tail finished
      expect(replyFramesAtReplyTime).toBe(1)
      const reply = member.socket.frames.find((frame) => frame.t === 'reply')
      expect(reply).toEqual({ t: 'reply', id: 'client-msg-1', data: JSON.stringify({ echo: 'now' }) })

      // reply(Error) — the imperative refusal rides the same sendErr an immediate throw produces
      await a.socket.handleMessage(
        member.socket as never,
        JSON.stringify({
          t: 'send',
          id: 'client-msg-2',
          cid: member.cid,
          handler: 'earlyHandler',
          input: JSON.stringify({ fail: true }),
        }),
      )
      const sendErr = member.socket.frames.find((frame) => frame.t === 'sendErr') as
        { t: string; id: string; error: string } | undefined
      expect(sendErr?.id).toBe('client-msg-2')
      expect(JSON.parse(sendErr?.error ?? '{}')).toMatchObject({ message: 'refused early', code: 'EARLY_NOPE' })
    } finally {
      a.socket.dispose()
    }
  })

  it('after dispose() the instance unsubscribed from the bus — a new room push never reaches it', async () => {
    const backplane = createSharedBackplane()
    const { chatChannel, chatSpace, pingHandler } = buildChannel()
    const a = createInstance({ backplane, channel: chatChannel, points: [chatSpace, pingHandler] })
    const b = createInstance({ backplane, channel: chatChannel, points: [chatSpace, pingHandler] })
    await a.socket.start()
    await b.socket.start()
    try {
      const roomSerialized = JSON.stringify({ chatId: 'd' })
      // a LIVE member of the same room on A: it is what proves the push actually went out, so the silence on B is a
      // fact and not just an unfinished hop (nothing to poll for on a dead instance)
      const memberA = await openConnection(a, chatChannel.point, { identity: { me: 'user-a' } })
      await join(a, memberA.socket, memberA.cid, 'chatSpace', { chatId: 'd' })
      const memberB = await openConnection(b, chatChannel.point, { identity: { me: 'user-b' } })
      await join(b, memberB.socket, memberB.cid, 'chatSpace', { chatId: 'd' })
      b.socket.dispose()
      a.socket.adapter.push({
        channel: chatChannel.point as never,
        handler: pingHandler.point as never,
        target: { space: 'chatSpace', rooms: [roomSerialized] },
        input: JSON.stringify({ ask: 'anyone?' }),
      })
      await waitFor(
        () => memberA.socket.frames.some((frame) => frame.t === 'msg'),
        'the push to reach the live member on the pushing instance',
      )
      expect(memberB.socket.frames.filter((frame) => frame.t === 'msg')).toHaveLength(0)
    } finally {
      a.socket.dispose()
    }
  })

  it('the room subscription goes up BEFORE the join is confirmed — a push right after `joined` cannot be missed', async () => {
    const backplane = createGatedBackplane()
    const { chatChannel, chatSpace, pingHandler } = buildChannel()
    const a = createInstance({ backplane, channel: chatChannel, points: [chatSpace, pingHandler] })
    const b = createInstance({ backplane, channel: chatChannel, points: [chatSpace, pingHandler] })
    await a.socket.start()
    await b.socket.start()
    try {
      const roomSerialized = JSON.stringify({ chatId: 'race' })
      const memberB = await openConnection(b, chatChannel.point, { identity: { me: 'user-b' } })
      const joinPromise = b.socket.handleMessage(
        memberB.socket as never,
        JSON.stringify({ t: 'join', id: 'race', cid: memberB.cid, space: 'chatSpace', input: roomSerialized }),
      )
      await waitFor(() => backplane.pendingRoomSubscribes() > 0, 'the room subscribe to be requested by the join')
      // the subscription hangs — so does the confirmation: `joined` may only follow a LISTENING subscription,
      // otherwise a push published right after it could vanish into the topic nobody reads yet
      await sleep(50)
      expect(memberB.socket.frames.some((frame) => frame.t === 'joined')).toBe(false)
      backplane.releaseRoomSubscribes()
      await joinPromise
      expect(memberB.socket.frames.some((frame) => frame.t === 'joined')).toBe(true)
      // and the push right after the confirmation arrives over the freshly subscribed topic
      a.socket.adapter.push({
        channel: chatChannel.point as never,
        handler: pingHandler.point as never,
        target: { space: 'chatSpace', rooms: [roomSerialized] },
        input: JSON.stringify({ ask: 'now' }),
      })
      await waitFor(
        () => memberB.socket.frames.some((frame) => frame.t === 'msg' && frame.room === roomSerialized),
        'the push right after the join to arrive over the room topic',
      )
    } finally {
      a.socket.dispose()
      b.socket.dispose()
    }
  })

  it('the last member out starts the unsubscribe LINGER — a re-join inside it reuses the live subscription', async () => {
    const backplane = createSharedBackplane()
    const { chatChannel, chatSpace, pingHandler } = buildChannel()
    const b = createInstance({ backplane, channel: chatChannel, points: [chatSpace, pingHandler] })
    await b.socket.start()
    try {
      const topic = roomBusTopic({ chatId: 'lng' })
      const member = await openConnection(b, chatChannel.point, { identity: { me: 'user-b' } })
      const rooms = await join(b, member.socket, member.cid, 'chatSpace', { chatId: 'lng' })
      expect(backplane.subscribedChannels()).toContain(topic)
      expect(backplane.subscribeCalls.filter((channel) => channel === topic)).toHaveLength(1)

      // the last member leaves — the subscription LINGERS instead of dropping at once (the anti-thrash window)
      const leave = JSON.stringify({ t: 'leave', cid: member.cid, space: 'chatSpace', rooms })
      await b.socket.handleMessage(member.socket as never, leave)
      await sleep(300)
      expect(backplane.subscribedChannels()).toContain(topic)

      // a re-join inside the linger reuses the live subscription — NO second subscribe call reaches the backplane
      await join(b, member.socket, member.cid, 'chatSpace', { chatId: 'lng' }, 'rejoin')
      expect(backplane.subscribeCalls.filter((channel) => channel === topic)).toHaveLength(1)

      // leave again and let the linger run out — only now does the topic get unsubscribed
      await b.socket.handleMessage(member.socket as never, leave)
      await sleep(300)
      expect(backplane.subscribedChannels()).toContain(topic)
      await waitFor(() => !backplane.subscribedChannels().includes(topic), 'the linger to run out and unsubscribe')
    } finally {
      b.socket.dispose()
    }
  })

  it('a multi-room push is one envelope per room topic — a process holding both rooms delivers once per targeted room', async () => {
    const backplane = createSharedBackplane()
    const { chatChannel, chatSpace, pingHandler } = buildChannel()
    const a = createInstance({ backplane, channel: chatChannel, points: [chatSpace, pingHandler] })
    const b = createInstance({ backplane, channel: chatChannel, points: [chatSpace, pingHandler] })
    await a.socket.start()
    await b.socket.start()
    try {
      const roomX = JSON.stringify({ chatId: 'dd-x' })
      const roomY = JSON.stringify({ chatId: 'dd-y' })
      const memberB = await openConnection(b, chatChannel.point, { identity: { me: 'user-b' } })
      await join(b, memberB.socket, memberB.cid, 'chatSpace', { chatId: 'dd-x' })
      await join(b, memberB.socket, memberB.cid, 'chatSpace', { chatId: 'dd-y' })
      a.socket.adapter.push({
        channel: chatChannel.point as never,
        handler: pingHandler.point as never,
        target: { space: 'chatSpace', rooms: [roomX, roomY] },
        input: JSON.stringify({ ask: 'both' }),
      })
      const msgs = (): Frame[] => memberB.socket.frames.filter((frame) => frame.t === 'msg')
      await waitFor(() => msgs().length >= 2, 'the push to reach both rooms of the remote member')
      await sleep(50)
      // one frame per TARGETED ROOM — the two topic copies of the envelope deduped into one delivery pass (without
      // the eid dedup this member would see four frames: two per envelope copy)
      expect(msgs()).toHaveLength(2)
      expect(
        msgs()
          .map((frame) => frame.room)
          .sort(),
      ).toEqual([roomX, roomY].sort())
      // the wire: the SAME envelope (one eid) published once per room topic
      const pushes = backplane.published.filter((record) => envelopeOf(record).kind === 'push')
      expect(pushes.map((record) => record.channel).sort()).toEqual(
        [roomBusTopic({ chatId: 'dd-x' }), roomBusTopic({ chatId: 'dd-y' })].sort(),
      )
      const eids = pushes.map((record) => envelopeOf(record).eid)
      expect(typeof eids[0]).toBe('string')
      expect(new Set(eids).size).toBe(1)
    } finally {
      a.socket.dispose()
      b.socket.dispose()
    }
  })

  it('a parked resumable connection keeps its topics subscribed, rings cross-process pushes, and replays them on resume', async () => {
    const backplane = createSharedBackplane()
    const { feedChannel, feedSpace, feedHandler } = buildResumableChannel()
    const a = createInstance({ backplane, channel: feedChannel, points: [feedSpace, feedHandler] })
    const b = createInstance({ backplane, channel: feedChannel, points: [feedSpace, feedHandler] })
    await a.socket.start()
    await b.socket.start()
    try {
      const roomSerialized = JSON.stringify({ feedId: 'f' })
      const topic = `point0:socket:room:root:feedChannel:feedSpace:${roomSerialized}`
      const memberB = await openConnection(b, feedChannel.point, { identity: { me: 'user-b' } })
      const resumeKey = memberB.socket.frames.find((frame) => frame.t === 'claimed')?.resumeKey as string
      expect(typeof resumeKey).toBe('string')
      await join(b, memberB.socket, memberB.cid, 'feedSpace', { feedId: 'f' })

      const push = (n: number): void => {
        a.socket.adapter.push({
          channel: feedChannel.point as never,
          handler: feedHandler.point as never,
          target: { space: 'feedSpace', rooms: [roomSerialized] },
          input: JSON.stringify({ n }),
        })
      }
      // a cross-process room push reaches the remote RESUMABLE member with the ROOM stream's tseq stamped — the
      // bus topic changes how the envelope TRAVELS, not how the receiving process delivers (the same topic-stream
      // path; the receiving process appends to ITS local room stream and publishes)
      push(1)
      await waitFor(() => memberB.socket.frames.some((frame) => frame.t === 'msg'), 'the first push to arrive')
      expect(memberB.socket.frames.find((frame) => frame.t === 'msg')?.tseq).toBe(1)

      // the socket dies → the connection PARKS; its rooms stay indexed, so the room topic stays SUBSCRIBED — the
      // parked ring is the topic's live consumer
      b.socket.handleClose(memberB.socket as never)
      expect(backplane.subscribedChannels()).toContain(topic)

      // a push into the room while parked crosses the bus into the room stream (no socket to send to)…
      push(2)
      await waitFor(
        () => backplane.published.filter((record) => envelopeOf(record).kind === 'push').length === 2,
        'the second push to be published',
      )
      // …and the observability snapshot sees the park and the buffered stream (both frames logged, nothing evicted)
      const parkedSnapshot = b.socket.localSnapshot()
      expect(parkedSnapshot.parkedCount).toBe(1)
      expect(parkedSnapshot.streams.count).toBe(1)
      expect(parkedSnapshot.streams.frames).toBe(2)
      expect(parkedSnapshot.streams.bytes).toBeGreaterThan(0)
      expect(parkedSnapshot.streams.evictedFramesTotal).toBe(0)
      // …and a resume on a fresh socket replays it, gapless — the ROOM STREAM collected the cross-process frame
      // (the park keeps the entry in the index, which is what keeps the stream alive)
      const fresh = b.createSocket()
      const roomStreamKey = `r:feedSpace:${roomSerialized}`
      await b.socket.handleMessage(
        fresh as never,
        JSON.stringify({
          t: 'resume',
          entries: [{ cid: memberB.cid, key: resumeKey, cursors: { [roomStreamKey]: 1 } }],
        }),
      )
      await waitFor(() => fresh.frames.some((frame) => frame.t === 'resumed'), 'the resume answer')
      const resumedFrame = fresh.frames.find((frame) => frame.t === 'resumed') as unknown as {
        streams: Record<string, { gapless: boolean; head: number }>
      }
      expect(Object.values(resumedFrame.streams).every((verdict) => verdict.gapless)).toBe(true)
      expect(resumedFrame.streams[roomStreamKey]).toEqual({ gapless: true, head: 2 })
      const replayed = fresh.frames.find((frame) => frame.t === 'msg')
      expect(replayed?.tseq).toBe(2)
      // a replayed TOPIC frame is re-addressed to the resuming connection
      expect(replayed?.rcid).toBe(memberB.cid)
      expect(replayed?.input).toBe(JSON.stringify({ n: 2 }))
    } finally {
      a.socket.dispose()
      b.socket.dispose()
    }
  })

  it('a SATURATED delivery clock stops vouching: every verdict is gapless false and nothing replays', async () => {
    // the arithmetic floor under the whole gap proof. `tseq` and the process delivery clock advance ONLY together, so
    // once the clock sticks at `Number.MAX_SAFE_INTEGER` (JS `++` saturates there — it does not wrap) frames stop being
    // numbered apart and the formula would keep answering `gapless: true` over messages the client never saw. The
    // process flips the flag instead and answers every resume like a KV restore does: honest verdicts, no replay, the
    // clients refetch. Driven by setting the private — reaching 2^53 pushes for real is ~285 years of traffic.
    const backplane = createSharedBackplane()
    const { feedChannel, feedSpace, feedHandler } = buildResumableChannel()
    const a = createInstance({ backplane, channel: feedChannel, points: [feedSpace, feedHandler] })
    await a.socket.start()
    try {
      const roomSerialized = JSON.stringify({ feedId: 'saturated' })
      const member = await openConnection(a, feedChannel.point, { identity: { me: 'user-s' } })
      const resumeKey = member.socket.frames.find((frame) => frame.t === 'claimed')?.resumeKey as string
      await join(a, member.socket, member.cid, 'feedSpace', { feedId: 'saturated' })
      a.socket.adapter.push({
        channel: feedChannel.point as never,
        handler: feedHandler.point as never,
        target: { space: 'feedSpace', rooms: [roomSerialized] },
        input: JSON.stringify({ n: 1 }),
      })
      await waitFor(() => member.socket.frames.some((frame) => frame.t === 'msg'), 'the push to arrive')
      a.socket.handleClose(member.socket as never)
      // the buffered frame is right there in the room stream — a healthy resume would answer `gapless: true` and
      // replay it (that is the neighbor test above); the saturated clock is the only difference here
      ;(a.socket as unknown as { deliveryClockSaturated: boolean }).deliveryClockSaturated = true

      const fresh = a.createSocket()
      await a.socket.handleMessage(
        fresh as never,
        JSON.stringify({ t: 'resume', entries: [{ cid: member.cid, key: resumeKey, cursors: {} }] }),
      )
      await waitFor(() => fresh.frames.some((frame) => frame.t === 'resumed'), 'the resume answer')
      const resumedFrame = fresh.frames.find((frame) => frame.t === 'resumed') as unknown as {
        streams: Record<string, { gapless: boolean; head: number }>
      }
      const roomStreamKey = `r:feedSpace:${roomSerialized}`
      // the heads stay truthful (the client re-seeds its cursors from them) — only the PROOF is withdrawn
      expect(resumedFrame.streams[roomStreamKey]).toEqual({ gapless: false, head: 1 })
      expect(Object.values(resumedFrame.streams).every((verdict) => !verdict.gapless)).toBe(true)
      expect(fresh.frames.filter((frame) => frame.t === 'msg')).toEqual([])
    } finally {
      a.socket.dispose()
    }
  })

  it('a $identity push from ANOTHER process finds the park: ringed by the opted-in handler, a hole from the non-opted one', async () => {
    // the direct pin of the cross-process filter-push delivery — the identity selection is a shared-channel envelope
    // (no room address), so the frame is published on B, matched on A, and A's personal-path delivery must treat its
    // PARKED entry exactly like a live one: the opted-in handler's frame enters the PERSONAL stream's log, the
    // non-opted one stamps its hole. Until now this path was covered only through same-process parks (the neighbor
    // test above) and the int suite's single-process «случай Бори».
    const backplane = createSharedBackplane()
    const { feedChannel, feedSpace, feedHandler, noteHandler, noteHoleHandler } = buildResumableChannel()
    const points = [feedSpace, feedHandler, noteHandler, noteHoleHandler]
    const a = createInstance({ backplane, channel: feedChannel, points })
    const b = createInstance({ backplane, channel: feedChannel, points })
    await a.socket.start()
    await b.socket.start()
    try {
      // two parked connections on A, told apart by identity — one per handler flavor, so the ring proof and the
      // hole proof never contaminate each other
      const ringMember = await openConnection(a, feedChannel.point, { identity: { me: 'ring' } })
      const ringKey = ringMember.socket.frames.find((frame) => frame.t === 'claimed')?.resumeKey as string
      const holeMember = await openConnection(a, feedChannel.point, { identity: { me: 'hole' } })
      const holeKey = holeMember.socket.frames.find((frame) => frame.t === 'claimed')?.resumeKey as string
      a.socket.handleClose(ringMember.socket as never)
      a.socket.handleClose(holeMember.socket as never)

      // B publishes both pushes — nothing on B matches, so a delivery can only be A's parked entries over the bus
      b.socket.adapter.push({
        channel: feedChannel.point as never,
        handler: noteHandler.point as never,
        target: { identityMatcher: JSON.stringify({ me: 'ring' }) },
        input: JSON.stringify({ n: 1 }),
      })
      b.socket.adapter.push({
        channel: feedChannel.point as never,
        handler: noteHoleHandler.point as never,
        target: { identityMatcher: JSON.stringify({ me: 'hole' }) },
        input: JSON.stringify({ n: 2 }),
      })
      await waitFor(
        () => backplane.published.filter((record) => envelopeOf(record).kind === 'push').length === 2,
        'both identity pushes to be published',
      )

      // the buffered frame replays on resume, tseq continuous from nothing (no cursors) and GAPLESS — the personal
      // stream collected the cross-process frame
      const freshRing = a.createSocket()
      await a.socket.handleMessage(
        freshRing as never,
        JSON.stringify({ t: 'resume', entries: [{ cid: ringMember.cid, key: ringKey, cursors: {} }] }),
      )
      await waitFor(() => freshRing.frames.some((frame) => frame.t === 'resumed'), 'the ring resume answer')
      const ringResumed = freshRing.frames.find((frame) => frame.t === 'resumed') as unknown as {
        streams: Record<string, { gapless: boolean; head: number }>
      }
      expect(Object.values(ringResumed.streams).every((verdict) => verdict.gapless)).toBe(true)
      expect(ringResumed.streams.p).toEqual({ gapless: true, head: 1 })
      const replayed = freshRing.frames.find((frame) => frame.t === 'msg')
      expect(replayed?.handler).toBe('noteHandler')
      expect(replayed?.tseq).toBe(1)
      // a personal frame carries its cid as stored — no re-addressing needed
      expect(replayed?.cid).toBe(ringMember.cid)
      expect(replayed?.input).toBe(JSON.stringify({ n: 1 }))

      // the non-opted frame stamped the PERSONAL stream's hole: the resume answers honestly (`gapless: false` on
      // 'p', the untouched channel stream stays clean) and has nothing to replay
      const freshHole = a.createSocket()
      await a.socket.handleMessage(
        freshHole as never,
        JSON.stringify({ t: 'resume', entries: [{ cid: holeMember.cid, key: holeKey, cursors: {} }] }),
      )
      await waitFor(() => freshHole.frames.some((frame) => frame.t === 'resumed'), 'the hole resume answer')
      const holeResumed = freshHole.frames.find((frame) => frame.t === 'resumed') as unknown as {
        streams: Record<string, { gapless: boolean; head: number }>
      }
      expect(holeResumed.streams.p).toEqual({ gapless: false, head: 1 })
      expect(holeResumed.streams.c.gapless).toBe(true)
      expect(freshHole.frames.filter((frame) => frame.t === 'msg')).toEqual([])
    } finally {
      a.socket.dispose()
      b.socket.dispose()
    }
  })

  it('the redis subscriber wrapper re-subscribes its whole set after a reconnect', async () => {
    // a fake subscriber-mode client shaped like Bun's REAL one (pinned in redis-subscriber-reconnect.int.test.ts):
    // `onconnect` refires on every (re)connect and is the ONLY reconnect signal (`onclose` is terminal-only — it never
    // fires for a drop the client still retries, which is why the seam carries no close callback at all); a second
    // `subscribe` of a channel STACKS another listener; `unsubscribe(channel)` clears all of them; a drop silently
    // wipes the server-side subscription state and the client restores nothing on its own; and a connection with no
    // active subscription is in NORMAL mode, where `unsubscribe` throws SYNCHRONOUSLY (ERR_REDIS_INVALID_STATE) — the
    // trap a reconnect replay steps straight into, since its defensive unsubscribe is the first command it issues
    const subscriptions = new Map<string, Array<(message: string) => void>>()
    const fake: RedisSubscriberLike = {
      subscribe: (channel, listener) => {
        subscriptions.set(channel, [...(subscriptions.get(channel) ?? []), listener])
        return Promise.resolve(1)
      },
      unsubscribe: (channel) => {
        if (subscriptions.size === 0) {
          throw new Error('RedisClient.prototype.unsubscribe can only be called while in subscriber mode.')
        }
        subscriptions.delete(channel)
        return Promise.resolve()
      },
      onconnect: null,
    }
    const errors: unknown[] = []
    const wrapper = createResilientRedisSubscriber(fake, (what, error) => errors.push([what, error]))
    const received: string[] = []
    const unsubscribeBus = await wrapper.subscribe('point0:socket:bus', (message) => received.push('bus:' + message))
    await wrapper.subscribe('point0:socket:proc:p1', (message) => received.push('proc:' + message))
    await wrapper.subscribe('point0:socket:room:r1', (message) => received.push('room:' + message))
    expect([...subscriptions.keys()].sort()).toEqual([
      'point0:socket:bus',
      'point0:socket:proc:p1',
      'point0:socket:room:r1',
    ])

    // an onconnect with the server-side state INTACT (the client fires one on every connect, not only after a drop)
    // must not stack a second listener — the replay unsubscribes before it subscribes. The fake's promises are all
    // pre-resolved, so one macrotask drains the whole replay deterministically.
    fake.onconnect?.()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect([...subscriptions.values()].every((listeners) => listeners.length === 1)).toBe(true)
    subscriptions.get('point0:socket:room:r1')?.forEach((listener) => listener('once?'))
    expect(received.filter((entry) => entry === 'room:once?')).toHaveLength(1)

    // the transport drops and reconnects — the server forgot every subscription and the wrapper replays the WHOLE set
    // (the engine never sees the blip and re-issues nothing; the Backplane contract puts the duty here)
    subscriptions.clear()
    fake.onconnect?.()
    await waitFor(() => subscriptions.size === 3, 'the resubscribe of the whole set')
    subscriptions.get('point0:socket:room:r1')?.forEach((listener) => listener('hello'))
    expect(received).toContain('room:hello')

    // a channel unsubscribed before the NEXT drop stays gone after the next reconnect
    unsubscribeBus()
    subscriptions.clear()
    fake.onconnect?.()
    await waitFor(() => subscriptions.size === 2, 'the shrunken set to resubscribe')
    expect([...subscriptions.keys()].sort()).toEqual(['point0:socket:proc:p1', 'point0:socket:room:r1'])
    expect(errors).toHaveLength(0)
  })

  it('POINT0_SOCKET_BUS_FORCE_SHARED routes every publish onto the shared channel — the debug escape hatch', async () => {
    const previous = process.env.POINT0_SOCKET_BUS_FORCE_SHARED
    process.env.POINT0_SOCKET_BUS_FORCE_SHARED = 'true'
    const backplane = createSharedBackplane()
    const { chatChannel, chatSpace, pingHandler } = buildChannel()
    // the flag is read at construction — both instances must be born under it (it is fleet-wide by nature)
    const a = createInstance({ backplane, channel: chatChannel, points: [chatSpace, pingHandler] })
    const b = createInstance({ backplane, channel: chatChannel, points: [chatSpace, pingHandler] })
    try {
      await a.socket.start()
      await b.socket.start()
      const roomSerialized = JSON.stringify({ chatId: 'fs' })
      const memberB = await openConnection(b, chatChannel.point, { identity: { me: 'user-b' } })
      await join(b, memberB.socket, memberB.cid, 'chatSpace', { chatId: 'fs' })
      a.socket.adapter.push({
        channel: chatChannel.point as never,
        handler: pingHandler.point as never,
        target: { space: 'chatSpace', rooms: [roomSerialized] },
        input: JSON.stringify({ ask: 'shared?' }),
      })
      await waitFor(
        () => memberB.socket.frames.some((frame) => frame.t === 'msg' && frame.room === roomSerialized),
        'the room push to cross the SHARED channel',
      )
      // every publish rode the shared channel, and no per-topic subscription was ever made
      expect(backplane.published.every((record) => record.channel === SHARED_CHANNEL)).toBe(true)
      expect(
        backplane.subscribeCalls.every((channel) => channel === SHARED_CHANNEL || channel.startsWith(PROC_PREFIX)),
      ).toBe(true)
    } finally {
      a.socket.dispose()
      b.socket.dispose()
      if (previous === undefined) {
        delete process.env.POINT0_SOCKET_BUS_FORCE_SHARED
      } else {
        process.env.POINT0_SOCKET_BUS_FORCE_SHARED = previous
      }
    }
  })
})

/**
 * The two refusal singles the engine emits for messages that never reach a point: `pointChannelClaimServerError` (a
 * claim answered with `claimErr` — the connect family fires BEFORE the claim, so without this a connection that never
 * went live is invisible server-side) and `socketServerSendRefused` (a `send` the engine refused before any
 * `.serverReply` ran). One instance, no bus hop — the frames are driven straight through `handleMessage`.
 */
describe('socket refusal events (claim + send)', () => {
  /** The bus harness's channel, with the server-side event names collected off the root. */
  const buildWatchedChannel = () => {
    const events: Array<{ name: string; data: Record<string, unknown> }> = []
    const root = Point0.lets('root', 'root')
      .serverOn(['pointChannelClaimServerError', 'socketServerSendRefused'], (event) => {
        events.push({ name: event.name, data: event.data as Record<string, unknown> })
      })
      .root()
    const chatChannel = root.lets('channel', 'chatChannel').channel()
    const chatSpace = chatChannel
      .lets<{ chatId: string }>('space', 'chatSpace')
      .input(z.object({ chatId: z.string() }))
      .joiner(({ input }) => ({ chatId: input.chatId }))
      .space()
    const echoHandler = chatChannel
      .lets('serverHandler', 'echoHandler')
      .serverReply(() => ({ ok: true }))
      .serverHandler()
    return { root, chatChannel, chatSpace, echoHandler, events }
  }

  it('a claim with an unknown ticket emits pointChannelClaimServerError — reason `ticket`, no point to name yet', async () => {
    const backplane = createSharedBackplane()
    const { chatChannel, events } = buildWatchedChannel()
    const a = createInstance({ backplane, channel: chatChannel })
    try {
      const socket = a.createSocket()
      await a.socket.handleMessage(socket as never, JSON.stringify({ t: 'claim', ticket: 'never-minted' }))
      await waitFor(() => events.length > 0, 'the claim refusal event')
      expect(socket.frames.map((frame) => frame.t)).toEqual(['claimErr'])
      expect(events).toHaveLength(1)
      expect(events[0]!.name).toBe('pointChannelClaimServerError')
      expect(events[0]!.data.reason).toBe('ticket')
      expect(events[0]!.data.scope).toBe('root')
      // the refusal came before the ticket resolved to anything — no channel, no connection to report
      expect(events[0]!.data.point).toBeUndefined()
      expect(events[0]!.data.connectionId).toBeUndefined()
      expect((events[0]!.data.error as ErrorPoint0).code).toBe('POINT0_SOCKET_TICKET_INVALID')
    } finally {
      a.socket.dispose()
    }
  })

  it('a send naming an unknown handler emits socketServerSendRefused — reason `handlerNotFound`, on a live connection', async () => {
    const backplane = createSharedBackplane()
    const { chatChannel, chatSpace, echoHandler, events } = buildWatchedChannel()
    const a = createInstance({ backplane, channel: chatChannel, points: [chatSpace, echoHandler] })
    try {
      await a.socket.start()
      const member = await openConnection(a, chatChannel.point, { identity: { me: 'user-a' } })
      events.length = 0
      await a.socket.handleMessage(
        member.socket as never,
        JSON.stringify({ t: 'send', id: 's1', cid: member.cid, handler: 'ghostHandler' }),
      )
      await waitFor(() => events.length > 0, 'the send refusal event')
      expect(member.socket.frames.some((frame) => frame.t === 'sendErr' && frame.id === 's1')).toBe(true)
      expect(events).toHaveLength(1)
      expect(events[0]!.name).toBe('socketServerSendRefused')
      expect(events[0]!.data.reason).toBe('handlerNotFound')
      expect(events[0]!.data.handlerName).toBe('ghostHandler')
      expect(events[0]!.data.connectionId).toBe(member.cid)
      expect((events[0]!.data.error as ErrorPoint0).code).toBe('POINT0_SOCKET_HANDLER_NOT_FOUND')

      // an unknown CONNECTION is the earlier refusal — no entry, so the payload carries only what the frame claimed
      events.length = 0
      await a.socket.handleMessage(
        member.socket as never,
        JSON.stringify({ t: 'send', id: 's2', cid: 'not-a-cid', handler: 'echoHandler' }),
      )
      await waitFor(() => events.length > 0, 'the unknown-connection refusal event')
      expect(events[0]!.data.reason).toBe('unknownConnection')
      expect(events[0]!.data.connectionId).toBe('not-a-cid')

      // and a message that DOES reach its handler emits nothing here — the point families own that half
      events.length = 0
      await a.socket.handleMessage(
        member.socket as never,
        JSON.stringify({ t: 'send', id: 's3', cid: member.cid, handler: 'echoHandler' }),
      )
      await waitFor(
        () => member.socket.frames.some((frame) => frame.t === 'reply' && frame.id === 's3'),
        'the successful reply',
      )
      expect(events).toEqual([])
    } finally {
      a.socket.dispose()
    }
  })
})
