/**
 * The engine's server-side socket introspection — the mirror of the client's `getSocket()`: `engine.socket.local.get()`
 * (a synchronous snapshot of THIS process) and `engine.socket.status()` (bus + backplane service state). Driven without
 * a spawned server: an `EngineSocket` over a mock server (the socket-bus harness, trimmed), connections claimed and
 * rooms joined through the real frames, then the snapshot read. Proves the counts (sockets are distinct WEBSOCKETS, not
 * connections; rooms are distinct ROOMS, not memberships), the parsed record shapes, that a leave shrinks both, and the
 * facade's no-EngineSocket floor — empty snapshot, `started: false`, the backplane kind still reported.
 */
import { describe, expect, it } from 'bun:test'
import type { ErrorPoint0 } from '@point0/core'
import { Point0 } from '@point0/core'
import { z } from 'zod'
import type { Backplane } from '../src/config.js'
import { Engine } from '../src/engine.js'
import { createEngineSocketFacade, EngineSocket } from '../src/socket.js'
import { resolveEngineSocketOptions } from '../src/config.js'

type Frame = Record<string, unknown> & { t: string }

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
  backplane = null,
  channel,
  points = [],
}: {
  /** `null` = the engine's in-process default; an object = a supplied implementation */
  backplane?: Backplane | string | null
  channel: { point: unknown }
  points?: Array<{ point: unknown }>
}): { socket: EngineSocket<ErrorPoint0>; createSocket: () => FakeSocket } => {
  const sockets = new Set<FakeSocket>()
  const server = {
    scope: 'root',
    clients: [],
    backplaneProvided: backplane,
    socketEnabled: true,
    socketOptions: resolveEngineSocketOptions(true),
    log: () => {},
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
        collection: [channel, ...points].map((candidate) => ({
          type: (candidate.point as { type: string }).type,
          point: candidate.point,
        })),
      },
    },
  }
  const socket = new EngineSocket({ server: server as never })
  const createSocket = (): FakeSocket => {
    const fake: FakeSocket = {
      data: { __point0Socket: { scope: 'root', cids: new Set() } },
      frames: [],
      topics: new Set(),
      send: (serialized) => {
        fake.frames.push(JSON.parse(serialized) as Frame)
      },
      subscribe: (topic) => {
        fake.topics.add(topic)
      },
      unsubscribe: (topic) => {
        fake.topics.delete(topic)
      },
    }
    sockets.add(fake)
    return fake
  }
  return { socket, createSocket }
}

/** A backplane object standing in for a user implementation (the `custom` kind) — one process, no wires. */
const createCustomBackplane = (): Backplane => {
  const memory = new Map<string, string>()
  const subscribers = new Set<(message: string) => void>()
  return {
    get: (key) => memory.get(key),
    set: (key, value) => {
      memory.set(key, value)
    },
    delete: (key) => {
      memory.delete(key)
    },
    publish: (_channel, message) => {
      for (const subscriber of [...subscribers]) {
        subscriber(message)
      }
    },
    subscribe: (_channel, onMessage) => {
      subscribers.add(onMessage)
      return () => {
        subscribers.delete(onMessage)
      }
    },
  }
}

/** claim one connection on the given fake socket — several connections may ride one socket (the client multiplexes). */
const claim = async (
  instance: { socket: EngineSocket<ErrorPoint0> },
  ws: FakeSocket,
  channelPoint: unknown,
  identity: unknown,
): Promise<string> => {
  const { cid, ticket } = await instance.socket.createConnection({ point: channelPoint as never, identity })
  await instance.socket.handleMessage(ws as never, JSON.stringify({ t: 'claim', ticket }))
  expect(ws.frames.find((frame) => frame.t === 'claimed' && frame.cid === cid)).toBeDefined()
  return cid
}

/** send a join frame and return the rooms the server admitted (serialized) — the client's own leave list. */
const join = async (
  instance: { socket: EngineSocket<ErrorPoint0> },
  ws: FakeSocket,
  cid: string,
  space: string,
  input: Record<string, unknown>,
): Promise<string[]> => {
  const id = `join-${space}-${cid}`
  await instance.socket.handleMessage(
    ws as never,
    JSON.stringify({ t: 'join', id, cid, space, input: JSON.stringify(input) }),
  )
  const joined = ws.frames.find((frame) => frame.t === 'joined' && frame.id === id)
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
  const boardSpace = chatChannel
    .lets<{ boardId: string }>('space', 'boardSpace')
    .input(z.object({ boardId: z.string() }))
    .joiner(({ input }) => ({ boardId: input.boardId }))
    .space()
  return { root, chatChannel, chatSpace, boardSpace }
}

describe('engine socket helpers (local snapshot + status)', () => {
  it('local.get() counts distinct sockets and rooms, and reports parsed identities and rooms', async () => {
    const { chatChannel, chatSpace, boardSpace } = buildChannel()
    const instance = createInstance({ channel: chatChannel, points: [chatSpace, boardSpace] })
    try {
      // two connections ride socket one, a third rides socket two
      const wsA = instance.createSocket()
      const wsB = instance.createSocket()
      const cid1 = await claim(instance, wsA, chatChannel.point, { me: 'user-1' })
      const cid2 = await claim(instance, wsA, chatChannel.point, { me: 'user-2' })
      const cid3 = await claim(instance, wsB, chatChannel.point, { me: 'user-3' })

      // cid1 and cid2 share one chat room, cid3 sits in another, cid1 also holds a board room
      await join(instance, wsA, cid1, 'chatSpace', { chatId: '1' })
      const cid2ChatRooms = await join(instance, wsA, cid2, 'chatSpace', { chatId: '1' })
      await join(instance, wsB, cid3, 'chatSpace', { chatId: '2' })
      await join(instance, wsA, cid1, 'boardSpace', { boardId: 'b' })

      const snapshot = instance.socket.localSnapshot()
      expect(snapshot.socketsCount).toBe(2)
      expect(snapshot.connections).toHaveLength(3)
      // three DISTINCT rooms — the shared chat room is one, whoever holds it
      expect(snapshot.roomsCount).toBe(3)
      expect(snapshot.memberships).toHaveLength(4)

      const connection = snapshot.connections.find((item) => item.connectionId === cid1)
      expect(connection).toEqual({
        scope: 'root',
        channel: 'chatChannel',
        connectionId: cid1,
        // parsed — the same value the events carry, not the serialized string
        identity: { me: 'user-1' },
      })

      const memberships = snapshot.memberships.filter((item) => item.connectionId === cid1)
      expect(memberships.map((item) => item.space).sort()).toEqual(['boardSpace', 'chatSpace'])
      expect(memberships.find((item) => item.space === 'chatSpace')).toEqual({
        scope: 'root',
        channel: 'chatChannel',
        space: 'chatSpace',
        connectionId: cid1,
        rooms: [{ chatId: '1' }],
      })
      expect(memberships.find((item) => item.space === 'boardSpace')?.rooms).toEqual([{ boardId: 'b' }])

      // a leave drops the membership but NOT the room — cid1 still holds it
      await instance.socket.handleMessage(
        wsA as never,
        JSON.stringify({ t: 'leave', cid: cid2, space: 'chatSpace', rooms: cid2ChatRooms }),
      )
      const afterLeave = instance.socket.localSnapshot()
      expect(afterLeave.memberships).toHaveLength(3)
      expect(afterLeave.roomsCount).toBe(3)
      expect(afterLeave.connections).toHaveLength(3)
      expect(afterLeave.socketsCount).toBe(2)

      // the last holder leaves — now the room is gone from the index
      await instance.socket.handleMessage(
        wsA as never,
        JSON.stringify({ t: 'leave', cid: cid1, space: 'chatSpace', rooms: [JSON.stringify({ chatId: '1' })] }),
      )
      const afterLast = instance.socket.localSnapshot()
      expect(afterLast.roomsCount).toBe(2)
      expect(afterLast.memberships).toHaveLength(2)
    } finally {
      instance.socket.dispose()
    }
  })

  it('local.get() of an untouched process is empty', () => {
    const { chatChannel } = buildChannel()
    const instance = createInstance({ channel: chatChannel })
    try {
      expect(instance.socket.localSnapshot()).toEqual({
        socketsCount: 0,
        roomsCount: 0,
        parkedCount: 0,
        streams: { count: 0, frames: 0, bytes: 0, evictedFramesTotal: 0 },
        connections: [],
        memberships: [],
      })
    } finally {
      instance.socket.dispose()
    }
  })

  it('status() reports the bus subscription and the in-process default backplane', async () => {
    const { chatChannel } = buildChannel()
    const instance = createInstance({ channel: chatChannel })
    try {
      expect(instance.socket.status()).toEqual({ started: false, backplane: 'memory', busSubscriptions: 0 })
      await instance.socket.start()
      // started = the shared channel + this process's inbox — the two start-owned subscriptions
      expect(instance.socket.status()).toEqual({ started: true, backplane: 'memory', busSubscriptions: 2 })
    } finally {
      instance.socket.dispose()
    }
    // a disposed engine has torn the subscription down — it must not read as started
    expect(instance.socket.status()).toEqual({ started: false, backplane: 'memory', busSubscriptions: 0 })
  })

  it('status() names a supplied backplane `custom` and a URL shortcut `redis-url`', async () => {
    const { chatChannel } = buildChannel()
    const custom = createInstance({ channel: chatChannel, backplane: createCustomBackplane() })
    try {
      await custom.socket.start()
      expect(custom.socket.status()).toEqual({ started: true, backplane: 'custom', busSubscriptions: 2 })
    } finally {
      custom.socket.dispose()
    }
    // the URL shortcut is classified from the option alone — no Redis is dialed to answer a health check
    const redis = createInstance({ channel: chatChannel, backplane: 'redis://localhost:6379' })
    try {
      expect(redis.socket.status()).toEqual({ started: false, backplane: 'redis-url', busSubscriptions: 0 })
    } finally {
      redis.socket.dispose()
    }
  })

  it('the facade answers without an EngineSocket and mirrors it once there is one', async () => {
    const { chatChannel, chatSpace } = buildChannel()
    // before `prepare()` (and with the `socket` server option off) there is no EngineSocket — no throws
    const bare = createEngineSocketFacade({ socket: () => null, backplane: () => null })
    expect(bare.local.get()).toEqual({
      socketsCount: 0,
      roomsCount: 0,
      parkedCount: 0,
      streams: { count: 0, frames: 0, bytes: 0, evictedFramesTotal: 0 },
      connections: [],
      memberships: [],
    })
    expect(bare.status()).toEqual({ started: false, backplane: 'memory', busSubscriptions: 0 })
    // the backplane kind is still reported — it is configuration, knowable without a socket
    expect(
      createEngineSocketFacade({ socket: () => null, backplane: () => 'redis://localhost:6379' }).status(),
    ).toEqual({ started: false, backplane: 'redis-url', busSubscriptions: 0 })

    const instance = createInstance({ channel: chatChannel, points: [chatSpace] })
    // the getters are lazy: this facade was built while the socket was still missing
    let live: EngineSocket<ErrorPoint0> | null = null
    const facade = createEngineSocketFacade({ socket: () => live, backplane: () => null })
    expect(facade.local.get().connections).toHaveLength(0)
    try {
      live = instance.socket
      const ws = instance.createSocket()
      const cid = await claim(instance, ws, chatChannel.point, { me: 'user-1' })
      await join(instance, ws, cid, 'chatSpace', { chatId: '7' })
      expect(facade.local.get()).toEqual(instance.socket.localSnapshot())
      expect(facade.local.get().memberships[0]?.rooms).toEqual([{ chatId: '7' }])
      expect(facade.status()).toEqual(instance.socket.status())
    } finally {
      instance.socket.dispose()
    }
  })

  it('a freshly created engine exposes the helpers and its configured backplane', () => {
    const engineCwdBefore = process.env.POINT0_ENGINE_CWD
    try {
      const engine = Engine.create({
        file: '/repo/src/engine.ts',
        cwdBeforeBuild: '/repo',
        cwdAfterBuild: '/repo/dist/server',
        server: { scope: 'server', backplane: 'redis://localhost:6379' },
        clients: [],
      } as never)
      // never prepared, so no EngineSocket at all — the helpers answer anyway
      expect(engine.socket.local.get()).toEqual({
        socketsCount: 0,
        roomsCount: 0,
        parkedCount: 0,
        streams: { count: 0, frames: 0, bytes: 0, evictedFramesTotal: 0 },
        connections: [],
        memberships: [],
      })
      expect(engine.socket.status()).toEqual({ started: false, backplane: 'redis-url', busSubscriptions: 0 })
    } finally {
      if (engineCwdBefore === undefined) {
        delete process.env.POINT0_ENGINE_CWD
      } else {
        process.env.POINT0_ENGINE_CWD = engineCwdBefore
      }
    }
  })
})
