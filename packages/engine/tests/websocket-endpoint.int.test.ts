import { afterAll, beforeAll, describe, expect, it, setDefaultTimeout } from 'bun:test'
import type { TestProjectOneClient } from './utils/project.one-client.js'
import { TestProjectOneClientFactory } from './utils/project.one-client.js'

setDefaultTimeout(120_000)

const tpf = TestProjectOneClientFactory.create({
  namespace: 'websocket-endpoint',
  portsRange: [4500, 4549],
  superjson: false,
})

// one channel so socket is in play, one query reading the socketServerUpgrade counter back over HTTP
const pointsFile = `import { root } from './lib/root.js'

export const appChannel = root.lets('channel', 'appChannel').channel()

export const wsUpgradesQuery = root.lets('query', 'wsUpgrades')
  .loader(async () => ({ upgrades: ((globalThis as any).__wsUpgrades as number | undefined) ?? 0 }))
  .query()
`

// the same one channel, with a deliberately small message cap — the engine derives Bun's `maxPayloadLength` from the
// widest channel of the served scopes (+ 16 KiB for the frame envelope around the payload)
const cappedPointsFile = `import { root } from './lib/root.js'

export const appChannel = root.lets('channel', 'appChannel').channel({ server: { maxMessageSize: 4096 } })
`

type WireFrame = Record<string, unknown> & { t: string }

/**
 * Dial the bare endpoint, send ONE frame, and report what came of it: the engine's answer, or the socket dying under
 * us. A frame over the server's `maxPayloadLength` is dropped by Bun at the transport — the engine never sees it, so
 * the only observable is the close.
 */
const sendOneFrame = (
  url: string,
  frame: Record<string, unknown>,
  settleMs = 2000,
): Promise<{ reply: WireFrame | undefined; closed: boolean }> =>
  new Promise((resolve) => {
    const ws = new WebSocket(url)
    let reply: WireFrame | undefined
    let settled = false
    const finish = (closed: boolean): void => {
      if (settled) {
        return
      }
      settled = true
      clearTimeout(timer)
      ws.close()
      resolve({ reply, closed })
    }
    const timer = setTimeout(() => finish(false), settleMs)
    ws.addEventListener('open', () => {
      ws.send(JSON.stringify(frame))
    })
    ws.addEventListener('message', (event) => {
      reply = JSON.parse(String(event.data)) as WireFrame
      finish(false)
    })
    ws.addEventListener('close', () => finish(true))
    ws.addEventListener('error', () => finish(true))
  })

/**
 * A `claim` frame padded to `bytes` — the ticket is well-formed but unknown, so a frame that ARRIVES is answered with
 * `claimErr`. The padding rides an unknown field, not the ticket: the wire guard bounds field lengths (an 8 KiB ticket
 * is not a ticket and is dropped without an answer), while this file is about the TRANSPORT cap, and unknown fields
 * pass through by design — the protocol has to survive a client one version ahead.
 */
const claimFrameOfSize = (bytes: number): Record<string, unknown> => ({
  t: 'claim',
  ticket: 'x'.repeat(32),
  pad: 'x'.repeat(bytes),
})

/** dial the bare endpoint; resolves with whether the handshake completed (Bun's WebSocket takes custom headers) */
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

describe('the bare websocket endpoint', () => {
  beforeAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: false })
  })

  afterAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: false })
  })

  it('rides the fetch pipeline: a middleware sees the websocket variant and vetoes; an accepted upgrade emits socketServerUpgrade', async () => {
    const tp: TestProjectOneClient = tpf.create()
    await tp.cleanup('ports')
    await tp.init()
    await tp.write('src/socket.points.tsx', pointsFile)
    await tp.replace(
      'src/lib/root.tsx',
      '.middleware(cors())',
      `.middleware(cors())
  .middleware(async ({ request, next }) => {
    if (request.variant.type === 'websocket' && request.headers['x-test-block'] === '1') {
      return new Response('Blocked', { status: 403 })
    }
    return await next()
  })
  .serverOn('socketServerUpgrade', () => {
    ;(globalThis as any).__wsUpgrades = (((globalThis as any).__wsUpgrades as number | undefined) ?? 0) + 1
  })`,
    )
    tp.spawn(['bun', 'run', 'dev'])
    await tp.waitStarted()
    const url = `ws://localhost:${tp.serverPort}/_point0/root/websocket`
    // vetoed: the middleware answered an ordinary response instead of the marker — no upgrade, the handshake fails
    expect(await openSocket(url, { 'x-test-block': '1' })).toBe('failed')
    // passed through: the pipeline's marker response became the Bun handshake
    expect(await openSocket(url)).toBe('open')
    // exactly the accepted upgrade emitted the endpoint's own event — the vetoed attempt did not
    const upgradesResponse = await fetch(`http://localhost:${tp.serverPort}/_point0/root/query/ws-upgrades`)
    expect(await upgradesResponse.text()).toContain('"upgrades":1')
  })

  it('the origin-allowlist recipe covers the cold-start channel-endpoint upgrade: an `endpoint`-variant veto blocks the handshake', async () => {
    // the docs' origin recipe gates BOTH upgrade shapes: the bare `websocket` variant and the channel-endpoint
    // GET+Upgrade (an `endpoint` variant). A WebSocket handshake skips CORS entirely, so this middleware is the ONLY
    // origin gate an `upgradable` channel has — pin that a veto on the endpoint variant stops the cold-start upgrade
    const tp: TestProjectOneClient = tpf.create()
    await tp.cleanup('ports')
    await tp.init()
    await tp.write('src/socket.points.tsx', pointsFile)
    await tp.replace(
      'src/lib/root.tsx',
      '.middleware(cors())',
      `.middleware(cors())
  .middleware(async ({ request, next }) => {
    if (
      (request.variant.type === 'websocket' || request.variant.type === 'endpoint') &&
      request.headers['x-test-block'] === '1'
    ) {
      return new Response('Blocked', { status: 403 })
    }
    return await next()
  })`,
    )
    tp.spawn(['bun', 'run', 'dev'])
    await tp.waitStarted()
    const channelUrl = `ws://localhost:${tp.serverPort}/_point0/root/channel/app-channel`
    // vetoed: the middleware answered an ordinary response before the marker — the GET+Upgrade never becomes a socket
    expect(await openSocket(channelUrl, { 'x-test-block': '1' })).toBe('failed')
    // passed through: the same cold-start upgrade-connect completes
    expect(await openSocket(channelUrl)).toBe('open')
  })

  it('the inbound frame cap is computed from the channels: an oversized pre-claim frame kills the socket', async () => {
    const tp: TestProjectOneClient = tpf.create()
    await tp.cleanup('ports')
    await tp.init()
    await tp.write('src/socket.points.tsx', cappedPointsFile)
    tp.spawn(['bun', 'run', 'dev'])
    await tp.waitStarted()
    const url = `ws://localhost:${tp.serverPort}/_point0/root/websocket`
    // 8 KiB: over the channel's own 4096 cap but inside the transport cap (4096 + 16 KiB of envelope slack) — the
    // frame reaches the engine and is answered, which is the whole point of the slack
    const compliant = await sendOneFrame(url, claimFrameOfSize(8 * 1024))
    expect(compliant.reply?.t).toBe('claimErr')
    // 64 KiB: past the transport cap — Bun drops the socket before the engine sees a byte, so no reply, ever. This is
    // the pre-claim bound: nothing about this socket is authenticated yet
    const oversized = await sendOneFrame(url, claimFrameOfSize(64 * 1024))
    expect(oversized.reply).toBeUndefined()
    expect(oversized.closed).toBe(true)
  })

  it('the websocket settings merge: bunServeConfig overrides the computed cap, and the serve() argument wins over both', async () => {
    const tp: TestProjectOneClient = tpf.create()
    await tp.cleanup('ports')
    await tp.init()
    // the default channel cap is 1 MiB, so the computed transport cap would be ~1 MiB + 16 KiB
    await tp.write('src/socket.points.tsx', pointsFile)
    await tp.replace(
      tp.files.engine,
      `entry: { main: './index.server.ts' },`,
      `entry: { main: './index.server.ts' },\n    bunServeConfig: { websocket: { maxPayloadLength: 2048 } as never },`,
    )
    await tp.replace(
      'src/app.server.ts',
      'await engine.serve()',
      'await engine.serve({ websocket: { maxPayloadLength: 32 * 1024 } as never })',
    )
    tp.spawn(['bun', 'run', 'dev'])
    await tp.waitStarted()
    const url = `ws://localhost:${tp.serverPort}/_point0/root/websocket`
    // 8 KiB survives: it would have died under `bunServeConfig`'s 2048, so the serve() argument won
    const compliant = await sendOneFrame(url, claimFrameOfSize(8 * 1024))
    expect(compliant.reply?.t).toBe('claimErr')
    // 64 KiB dies: it would have passed the ~1 MiB computed default, so the configured cap won over the engine's
    const oversized = await sendOneFrame(url, claimFrameOfSize(64 * 1024))
    expect(oversized.reply).toBeUndefined()
    expect(oversized.closed).toBe(true)
  })

  it('socket: false with a declared channel fails the server loudly — the feature is off, so declaring is refused', async () => {
    // the feature defaults to `server.socket`; with both off, socket points must not exist — the channel closer
    // throws at the points import instead of the app limping along with dead declarations
    const tp: TestProjectOneClient = tpf.create()
    await tp.cleanup('ports')
    await tp.init()
    await tp.write('src/socket.points.tsx', pointsFile)
    await tp.replace('src/engine.ts', 'socket: true,', 'socket: false,')
    tp.spawn(['bun', 'run', 'dev'])
    await tp.waitOutput('Socket feature is off')
  })

  it('features: { socket: true } with socket: false — declarations legal, no endpoint, the startup warning', async () => {
    // the sanctioned "code ships, endpoint does not" split: the feature keeps the socket code (and the declarations)
    // alive while the endpoint stays off — which is when the channel-without-endpoint warning speaks
    const tp: TestProjectOneClient = tpf.create()
    await tp.cleanup('ports')
    await tp.init()
    await tp.write('src/socket.points.tsx', pointsFile)
    await tp.replace('src/engine.ts', 'socket: true,', 'socket: false,')
    await tp.replace('src/engine.ts', 'file: import.meta.url,', 'file: import.meta.url,\n  features: { socket: true },')
    tp.spawn(['bun', 'run', 'dev'])
    await tp.waitStarted()
    // the channel-without-websocket misconfiguration is said loudly at startup
    await tp.waitOutput('socket` server option is off')
    // no endpoint: the upgrade never happens…
    expect(await openSocket(`ws://localhost:${tp.serverPort}/_point0/root/websocket`)).toBe('failed')
    // …and a plain request to the path is an ordinary 404 — the endpoint truly does not exist
    const response = await fetch(`http://localhost:${tp.serverPort}/_point0/root/websocket`)
    expect(response.status).toBe(404)
  })
})
