/**
 * Backpressure on a real Bun socket — the server half of the delivery contract, against a client that genuinely does
 * not read. The engine is served in-process (a real `Bun.serve`, real websockets, no spawned project) and both clients
 * are raw TCP sockets with a hand-written HTTP Upgrade: a browser WebSocket cannot be paused, so nothing built on one
 * can pose this question at all. The slow one claims its connection and then stops reading forever — the kernel window
 * fills, Bun starts buffering, and past `backpressureLimit` it DROPS every further frame on that socket without a word:
 * the send returns 0, `readyState` stays OPEN, and `publish` reports a byte count all the same.
 *
 * Two mechanisms answer that, and the two tests here pin one each:
 *
 * - the pub/sub fan-out has no per-subscriber return value to inspect, so only Bun can act on it — the engine's
 *   `closeOnBackpressureLimit: true` default tears down exactly the subscriber that would have lost frames;
 * - every direct `ws.send` goes through the engine's own funnel, which reads the status and closes the connection — the
 *   belt for the case an app overrides that setting.
 *
 * Both tests keep a second, fast client in the same channel and assert it received every frame: a slow peer must cost
 * its own socket and nothing else.
 */
import crypto from 'node:crypto'
import net from 'node:net'
import nodePath from 'node:path'
import { describe, expect, it, setDefaultTimeout } from 'bun:test'
import { Point0 } from '@point0/core'
import { z } from 'zod'
import { Engine } from '../src/engine.js'

setDefaultTimeout(60_000)

/**
 * How many pushes the flood sends, and how big each one is. The product has to clear the KERNEL buffers first — nothing
 * is buffered inside Bun until the socket itself stops accepting writes, and macOS auto-tunes a loopback connection up
 * to 4 MiB in each direction — so ~26 MiB is several times the widest window this can hit.
 */
const FLOOD_COUNT = 200
const FLOOD_SIZE = 128 * 1024
/** fan-out test only: how many {@link FLOOD_COUNT}-sized batches may pile up before the drop is declared missing (~512
MB) */
const MAX_FLOOD_BATCHES = 20
/** once Bun is buffering at all, this trips within one frame — the limit is read BEFORE the frame is appended */
const BACKPRESSURE_LIMIT = 64 * 1024

// ----------------------------------------------------------------------------------------------------------------
// the served engine — one channel, one channel-level clientHandler to flood through
// ----------------------------------------------------------------------------------------------------------------

const getFreePort = (): number => {
  const probe = Bun.serve({ port: 0, fetch: () => new Response('') })
  const port = probe.port
  void probe.stop(true)
  if (port === undefined) {
    throw new Error('Could not allocate a free port')
  }
  return port
}

const serveEngine = async (websocket: Record<string, unknown>) => {
  const root = Point0.lets('root', 'root').root()
  const appChannel = root
    .lets('channel', 'appChannel')
    .input(z.object({ userId: z.string() }))
    .connector(({ input }) => ({ me: input.userId }))
    .channel()
  // a CHANNEL clientHandler with no target — one publish to the channel topic, every claimed connection of it
  const floodHandler = appChannel
    .lets('clientHandler', 'floodHandler')
    .serverSend(z.object({ seq: z.number(), pad: z.string() }))
    .clientHandler()
  const port = getFreePort()
  const engine = await Engine.create({
    compiler: false,
    file: nodePath.resolve(import.meta.dir, 'temp/never'),
    server: {
      scope: 'root',
      points: [root, appChannel, floodHandler],
      socket: true,
      port,
      bunServeConfig: { websocket } as never,
    },
  }).preload({ prepare: true })
  await engine.serve()
  return {
    port,
    url: '/_point0/root/websocket',
    /** push the flood over the channel topic — the pub/sub fan-out, one publish per frame */
    flood: async (): Promise<void> => {
      const pad = 'x'.repeat(FLOOD_SIZE)
      for (let seq = 0; seq < FLOOD_COUNT; seq++) {
        void floodHandler.sendToClient({ seq, pad })
        // yield between pushes so Bun can drain the sockets that ARE reading — a synchronous loop would starve the
        // fast client into backpressure too, and the test would prove nothing about being slow
        await new Promise((resolve) => setTimeout(resolve, 0))
      }
    },
    /** who is still connected, by the identity the connector froze — the drop is asserted on THIS, not on a count */
    live: (): string[] =>
      appChannel.connections.server.local.list().map((connection) => (connection.identity as { me: string }).me),
    ticket: async (userId: string): Promise<string> => {
      const response = await fetch(`http://localhost:${port}/_point0/root/channel/app-channel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      expect(response.ok).toBe(true)
      return ((await response.json()) as { ticket: string }).ticket
    },
    stop: async (): Promise<void> => {
      // Doubles as the pin for the engine's bounded teardown: Bun leaks `pendingWebSockets` on every normal websocket
      // close, so a raw `server.stop()` after any socket activity never settles (repro + issue draft:
      // dev/backlog/bun-issue-server-stop.md). `dispose()` races the stop against its own deadline — awaiting it here
      // plainly, WITH a time assertion, is exactly the regression net for that bound.
      const startedAt = performance.now()
      await engine.dispose()
      expect(performance.now() - startedAt).toBeLessThan(5000)
    },
  }
}

// ----------------------------------------------------------------------------------------------------------------
// the raw clients — enough WebSocket to claim a connection, and a reader that can be switched off
// ----------------------------------------------------------------------------------------------------------------

/** a masked text frame (a client MUST mask; an unmasked one is a protocol error) */
const encodeClientTextFrame = (text: string): Buffer => {
  const payload = Buffer.from(text, 'utf8')
  const mask = crypto.randomBytes(4)
  const length = payload.length
  let header: Buffer
  if (length < 126) {
    header = Buffer.from([0x81, 0x80 | length])
  } else if (length < 65_536) {
    header = Buffer.alloc(4)
    header[0] = 0x81
    header[1] = 0x80 | 126
    header.writeUInt16BE(length, 2)
  } else {
    header = Buffer.alloc(10)
    header[0] = 0x81
    header[1] = 0x80 | 127
    header.writeBigUInt64BE(BigInt(length), 2)
  }
  const masked = Buffer.alloc(length)
  for (let index = 0; index < length; index++) {
    masked[index] = payload[index]! ^ mask[index % 4]!
  }
  return Buffer.concat([header, mask, masked])
}

/**
 * A socket that completes the handshake by hand, writes frames, and decodes what comes back as it arrives. Opened
 * `paused`, it never reads until `resume()` — which is the only way to make a server-side buffer actually fill.
 */
class RawSocket {
  private readonly socket: net.Socket
  /** bytes not yet parsed into a whole frame — the handshake head first, then whatever tail is mid-frame */
  private pending = Buffer.alloc(0)
  private handshakeDone = false
  readonly frames: Array<{ opcode: number; payload: Buffer }> = []
  ended = false

  private constructor(socket: net.Socket) {
    this.socket = socket
  }

  static async open(port: number, path: string, { paused }: { paused: boolean }): Promise<RawSocket> {
    const socket = net.connect({ host: '127.0.0.1', port })
    const raw = new RawSocket(socket)
    // a write into a socket the server has torn down is expected here, not a failure
    socket.on('error', () => {})
    socket.on('data', (chunk: Buffer) => {
      raw.consume(chunk)
    })
    socket.on('end', () => {
      raw.ended = true
    })
    socket.on('close', () => {
      raw.ended = true
    })
    await new Promise<void>((resolve, reject) => {
      socket.once('connect', resolve)
      socket.once('error', reject)
    })
    socket.write(
      `GET ${path} HTTP/1.1\r\n` +
        `Host: localhost:${port}\r\n` +
        `Upgrade: websocket\r\n` +
        `Connection: Upgrade\r\n` +
        `Sec-WebSocket-Key: ${crypto.randomBytes(16).toString('base64')}\r\n` +
        `Sec-WebSocket-Version: 13\r\n\r\n`,
    )
    const deadline = Date.now() + 10_000
    while (!raw.handshakeDone) {
      if (Date.now() > deadline) {
        throw new Error('The websocket handshake never completed')
      }
      await new Promise((resolve) => setTimeout(resolve, 25))
    }
    if (paused) {
      // from here on the peer is deaf on purpose — nothing is read until resume()
      socket.pause()
    }
    return raw
  }

  private consume(chunk: Buffer): void {
    this.pending = Buffer.concat([this.pending, chunk])
    if (!this.handshakeDone) {
      const headEnd = this.pending.indexOf('\r\n\r\n')
      if (headEnd === -1) {
        return
      }
      expect(this.pending.subarray(0, headEnd).toString('utf8')).toContain('101')
      this.pending = this.pending.subarray(headEnd + 4)
      this.handshakeDone = true
    }
    // walk off every whole frame (a server frame is never masked); the tail waits for the next chunk
    let offset = 0
    for (;;) {
      if (offset + 2 > this.pending.length) {
        break
      }
      const opcode = this.pending[offset]! & 0x0f
      const second = this.pending[offset + 1]!
      let length = second & 0x7f
      let headerLength = 2
      if (length === 126) {
        if (offset + 4 > this.pending.length) {
          break
        }
        length = this.pending.readUInt16BE(offset + 2)
        headerLength = 4
      } else if (length === 127) {
        if (offset + 10 > this.pending.length) {
          break
        }
        length = Number(this.pending.readBigUInt64BE(offset + 2))
        headerLength = 10
      }
      if ((second & 0x80) !== 0) {
        headerLength += 4
      }
      if (offset + headerLength + length > this.pending.length) {
        break
      }
      this.frames.push({
        opcode,
        payload: this.pending.subarray(offset + headerLength, offset + headerLength + length),
      })
      offset += headerLength + length
    }
    this.pending = this.pending.subarray(offset)
  }

  send(frame: Record<string, unknown>): void {
    this.socket.write(encodeClientTextFrame(JSON.stringify(frame)))
  }

  /** the pushes that actually landed — the number the whole exercise is about */
  pushes(): number {
    return this.frames.filter((frame) => frame.opcode === 0x1 && frame.payload.indexOf('{"t":"msg"') === 0).length
  }

  /** finally read: resume and wait for the server to hang up (or for the wait to run out) */
  async drain(timeoutMs = 10_000): Promise<void> {
    this.socket.resume()
    const deadline = Date.now() + timeoutMs
    while (!this.ended && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 25))
    }
  }

  destroy(): void {
    this.socket.destroy()
  }
}

const waitFor = async (predicate: () => boolean, what: string, timeoutMs = 20_000): Promise<void> => {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    if (predicate()) {
      return
    }
    if (Date.now() > deadline) {
      throw new Error(`Timed out waiting for ${what}`)
    }
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
}

describe('a socket that cannot keep up', () => {
  it('the pub/sub fan-out: the slow subscriber is disconnected, the fast one gets every frame', async () => {
    // only the limit is lowered — `closeOnBackpressureLimit` stays the engine's own default, which is what this test
    // is about: nothing else can see a publish drop (the fan-out never touches the engine's own send), so if the
    // default were gone the slow socket would simply live on with holes in its stream and this test would time out
    const served = await serveEngine({ backpressureLimit: BACKPRESSURE_LIMIT })
    const fast = await RawSocket.open(served.port, served.url, { paused: false })
    const slow = await RawSocket.open(served.port, served.url, { paused: true })
    try {
      fast.send({ t: 'claim', ticket: await served.ticket('fast') })
      slow.send({ t: 'claim', ticket: await served.ticket('slow') })
      // both claims landed — the confirmation the slow socket cannot read is still counted on the server
      await waitFor(() => served.live().length === 2, 'both connections to be claimed')

      // One fixed-size flood cannot promise to trip the limit: the slow peer's KERNEL buffers stand between the
      // publish and Bun's own queue, and Windows auto-tunes loopback buffers into the tens of megabytes — a flood
      // that reliably overflows Linux sat entirely in kernel space there. So flood in batches until the kernel
      // space is exhausted and the drop lands; the ceiling only bounds a build where the close-on-backpressure
      // default is genuinely gone.
      let published = 0
      for (let batch = 0; batch < MAX_FLOOD_BATCHES && served.live().includes('slow'); batch++) {
        await served.flood()
        published += FLOOD_COUNT
        // a beat for the server to observe the close before deciding the flood was not enough
        await new Promise((resolve) => setTimeout(resolve, 250))
      }

      // the slow subscriber is gone: Bun tore it down at the limit rather than dropping frames into a live socket
      await waitFor(() => !served.live().includes('slow'), 'the slow connection to be dropped')
      // …and the drop cost nothing to anyone else on the same topic
      await waitFor(() => fast.pushes() === published, `the fast client to receive all ${published} pushes`)
      expect(served.live()).toEqual(['fast'])
      // the slow one really was short of frames — that is the loss the disconnect stands in for
      expect(slow.pushes()).toBeLessThan(published)
    } finally {
      fast.destroy()
      slow.destroy()
      await served.stop()
    }
  })

  it('the direct-send funnel: an app that opts out of the Bun kill still loses the socket, not the frames', async () => {
    // the app overrides the engine default — its choice, and the merge honours it. What must NOT survive that choice
    // is the silence: the next frame the engine sends this socket itself finds the drop and closes the connection
    const served = await serveEngine({ backpressureLimit: BACKPRESSURE_LIMIT, closeOnBackpressureLimit: false })
    const fast = await RawSocket.open(served.port, served.url, { paused: false })
    const slow = await RawSocket.open(served.port, served.url, { paused: true })
    try {
      fast.send({ t: 'claim', ticket: await served.ticket('fast') })
      slow.send({ t: 'claim', ticket: await served.ticket('slow') })
      await waitFor(() => served.live().length === 2, 'both connections to be claimed')

      await served.flood()
      await waitFor(() => fast.pushes() === FLOOD_COUNT, `the fast client to receive all ${FLOOD_COUNT} pushes`)

      // this is the silent loss the fix exists for: without the Bun-side kill the publish path leaves the slow
      // subscriber connected and short of frames, and nothing anywhere reported it
      expect(served.live().sort()).toEqual(['fast', 'slow'])

      // one ping is all it takes — the pong goes through the engine's own send, which reads the drop and acts on it
      slow.send({ t: 'ping' })
      await waitFor(() => !served.live().includes('slow'), 'the funnel to close the backpressured socket')
      expect(served.live()).toEqual(['fast'])

      // the client's side of it: the stream stops mid-flood and the server hangs up. The 4008 close code cannot
      // travel here — a close frame is a frame, and this socket is exactly the one Bun is dropping frames on — so
      // what the peer observes is an abrupt close, which is all the reconnect needs
      await slow.drain()
      expect(slow.ended).toBe(true)
      expect(slow.pushes()).toBeGreaterThan(0)
      expect(slow.pushes()).toBeLessThan(FLOOD_COUNT)
    } finally {
      fast.destroy()
      slow.destroy()
      await served.stop()
    }
  })
})
