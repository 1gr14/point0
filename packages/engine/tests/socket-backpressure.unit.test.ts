/**
 * The send funnel's half of the delivery contract: every server→client frame goes through one `send`, and what Bun
 * answers there decides whether the socket survives. Driven without a spawned server — an `EngineSocket` over a mock
 * server and a fake socket whose `ws.send` returns a scripted status — because the only thing under test is the
 * funnel's reading of that status: `0` on an OPEN socket is a frame Bun threw away silently, so the connection must
 * break (close 4008) instead of pretending it was delivered; `-1` is buffered-and-will-arrive, not an error; `0` on a
 * socket that is already going away is the ordinary teardown. The real-transport half (Bun actually dropping frames,
 * and `closeOnBackpressureLimit` covering the publish fan-out) is pinned by socket-backpressure.int.test.ts.
 */
import { describe, expect, it } from 'bun:test'
import type { ErrorPoint0 } from '@point0/core'
import { Point0 } from '@point0/core'
import { EngineSocket } from '../src/socket.js'

type LogEntry = { level: string; message: string }

type FakeSocket = {
  data: { __point0Socket: { scope: string; cids: Set<string> } }
  readyState: number
  sent: string[]
  closes: Array<{ code: number | undefined; reason: string | undefined }>
  send: (serialized: string) => number
  close: (code?: number, reason?: string) => void
  subscribe: (topic: string) => void
  unsubscribe: (topic: string) => void
}

/** An `EngineSocket` over a mock server, plus a socket factory whose send status the test scripts. */
const createInstance = (): {
  socket: EngineSocket<ErrorPoint0>
  logs: LogEntry[]
  createSocket: (options: { sendStatus: number; readyState?: number }) => FakeSocket
} => {
  const root = Point0.lets('root', 'root').root()
  const appChannel = root.lets('channel', 'appChannel').channel()
  const logs: LogEntry[] = []
  const server = {
    scope: 'root',
    clients: [],
    backplaneProvided: null,
    socketEnabled: true,
    log: (entry: LogEntry) => {
      logs.push(entry)
    },
    bunServer: { publish: () => 0 },
    points: {
      findPoint: () => undefined,
      manager: {
        root: appChannel.point,
        collection: [{ type: 'channel', point: appChannel.point }],
      },
    },
  }
  const socket = new EngineSocket({ server: server as never })
  const createSocket = ({ sendStatus, readyState = 1 }: { sendStatus: number; readyState?: number }): FakeSocket => {
    const fake: FakeSocket = {
      data: { __point0Socket: { scope: 'root', cids: new Set() } },
      readyState,
      sent: [],
      closes: [],
      send: (serialized) => {
        fake.sent.push(serialized)
        return sendStatus
      },
      close: (code, reason) => {
        fake.closes.push({ code, reason })
        // Bun flips the state inside close() and fires the close handler synchronously — the funnel relies on it to
        // stay non-recursive, so the fake must behave the same way
        fake.readyState = 3
      },
      subscribe: () => {},
      unsubscribe: () => {},
    }
    return fake
  }
  return { socket, logs, createSocket }
}

/**
 * A `ping` is the shortest route through the funnel that needs no claim: the server answers `pong` and nothing else
 * about the socket matters, so what the test observes is the funnel and only the funnel.
 */
const ping = async (socket: EngineSocket<ErrorPoint0>, ws: FakeSocket): Promise<void> => {
  await socket.handleMessage(ws as never, JSON.stringify({ t: 'ping' }))
}

describe('the send funnel under backpressure', () => {
  it('a dropped frame on an OPEN socket closes it with 4008 and says so in the log', async () => {
    const { socket, logs, createSocket } = createInstance()
    try {
      const ws = createSocket({ sendStatus: 0 })
      await ping(socket, ws)
      // the frame was written and lost — Bun reports nothing else, so the close is the only honest answer
      expect(ws.sent).toEqual([JSON.stringify({ t: 'pong' })])
      expect(ws.closes).toEqual([{ code: 4008, reason: 'Socket backpressure' }])
      const warning = logs.find((entry) => entry.level === 'warn')
      expect(warning?.message).toContain('backpressureLimit')
      // the frame type is in the message — which frame was lost is the whole diagnostic value
      expect(warning?.message).toContain('"pong"')
    } finally {
      socket.dispose()
    }
  })

  it('backpressure (-1) is not a loss: the frame is buffered and the socket lives', async () => {
    const { socket, logs, createSocket } = createInstance()
    try {
      const ws = createSocket({ sendStatus: -1 })
      await ping(socket, ws)
      expect(ws.sent).toHaveLength(1)
      expect(ws.closes).toEqual([])
      expect(logs).toEqual([])
    } finally {
      socket.dispose()
    }
  })

  it('a written frame (a byte count) is left alone', async () => {
    const { socket, logs, createSocket } = createInstance()
    try {
      const ws = createSocket({ sendStatus: 14 })
      await ping(socket, ws)
      expect(ws.sent).toHaveLength(1)
      expect(ws.closes).toEqual([])
      expect(logs).toEqual([])
    } finally {
      socket.dispose()
    }
  })

  it('a 0 on a socket that is already closing is the ordinary teardown — no second close', async () => {
    const { socket, logs, createSocket } = createInstance()
    try {
      // 2 = CLOSING, 3 = CLOSED: both mean the cleanup sweep is already under way, and Bun returns 0 for the same
      // reason it does under backpressure — only readyState tells the two apart
      for (const readyState of [2, 3]) {
        const ws = createSocket({ sendStatus: 0, readyState })
        await ping(socket, ws)
        expect(ws.closes).toEqual([])
      }
      expect(logs).toEqual([])
    } finally {
      socket.dispose()
    }
  })

  it('the close does not recurse: further frames on the killed socket are dropped quietly', async () => {
    const { socket, logs, createSocket } = createInstance()
    try {
      const ws = createSocket({ sendStatus: 0 })
      // three pings, one close: the first drop kills the socket, the next two land on a CLOSED one and stay silent —
      // which is what makes closing from inside a fan-out loop safe
      await ping(socket, ws)
      await ping(socket, ws)
      await ping(socket, ws)
      expect(ws.sent).toHaveLength(3)
      expect(ws.closes).toHaveLength(1)
      expect(logs).toHaveLength(1)
    } finally {
      socket.dispose()
    }
  })
})
