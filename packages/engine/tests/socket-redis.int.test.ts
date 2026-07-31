/**
 * The ticket race ACROSS PROCESSES, against a real Redis. Everything else about "one ticket, one claim" is provable in
 * one process — the in-flight `claimingTickets` set closes the window between the KV read and the delete there — but
 * that guard is per process. What closes the window between two processes is the backplane's OPTIONAL sixth function,
 * `getDelete` (Redis GETDEL): the ticket is consumed BY the read, in one round trip, so two processes reading it
 * concurrently cannot both get a value. This file is the only place that claim is actually raced.
 *
 * Gated on `REDIS_URL` (e.g. `REDIS_URL=redis://localhost:6379 bun test
 * packages/engine/tests/socket-redis.int.test.ts`) — without it the whole describe is skipped, like the real-Redis
 * block in socket-backplane.int.test.ts.
 *
 * The two contenders are REAL OS processes: a worker script (written into the gitignored `tests/temp`, where the
 * package's own tsconfig `paths` still apply) builds an `EngineSocket` over a mock server pointed at the same Redis,
 * warms its connection, waits for a shared wall-clock start, and then claims. The parent reads back the frames each one
 * sent and asserts exactly one `claimed` and one `claimErr`.
 */
import * as nodeFs from 'node:fs/promises'
import * as nodePath from 'node:path'
import { afterAll, beforeAll, describe, expect, it, setDefaultTimeout } from 'bun:test'

setDefaultTimeout(120_000)

/** the marker the worker prints its one result line behind, so unrelated stdout noise cannot be mistaken for it */
const RESULT_MARKER = '__POINT0_RESULT__'

const workerSource = `/**
 * One contender in the cross-process ticket race (written by socket-redis.int.test.ts — not a source file).
 *
 *   bun worker.ts mint                     → mints a connection + ticket on REDIS_URL
 *   bun worker.ts claim <ticket> <startAt> → claims it at the shared wall-clock instant
 *   bun worker.ts selftest                 → mint + claim in ONE process over the in-memory backplane (harness check)
 */
import { Point0 } from '@point0/core'
import { EngineSocket } from '../../../src/socket.js'

const RESULT_MARKER = '${RESULT_MARKER}'
const CHANNEL_NAME = 'raceChannel'

const createInstance = (external: boolean) => {
  const root = Point0.lets('root', 'root').root()
  const channel = root.lets('channel', CHANNEL_NAME).channel()
  const server = {
    scope: 'root',
    clients: [],
    backplaneProvided: external ? process.env.REDIS_URL : null,
    socketEnabled: true,
    log: () => {},
    bunServer: { publish: () => {} },
    points: {
      findPoint: ({ type, name }: { type: string; name: string }) =>
        type === 'channel' && name === CHANNEL_NAME ? { point: channel.point } : undefined,
      // the claim walks the collection for the channel's space points (the enrollment pass) — there are none
      manager: { root: channel.point, collection: [{ type: 'channel', point: channel.point }] },
    },
  }
  return { socket: new EngineSocket({ server: server as never }), channel }
}

const fakeSocket = (frames: Array<Record<string, unknown>>) => ({
  data: { __point0Socket: { scope: 'root', cids: new Set<string>() } },
  readyState: 1,
  send: (serialized: string) => {
    frames.push(JSON.parse(serialized) as Record<string, unknown>)
  },
  subscribe: () => {},
  unsubscribe: () => {},
})

const report = (result: unknown): never => {
  console.info(RESULT_MARKER + JSON.stringify(result))
  // the Redis clients keep the loop alive — the answer is printed, so leave deliberately
  process.exit(0)
}

const [mode, ...rest] = process.argv.slice(2)

if (mode === 'mint') {
  const { socket, channel } = createInstance(true)
  const connection = await socket.createConnection({ point: channel.point as never, identity: { me: 'racer' } })
  report({ cid: connection.cid, ticket: connection.ticket })
} else if (mode === 'claim') {
  const ticket = rest[0]
  const startAt = Number(rest[1])
  const { socket } = createInstance(true)
  const frames: Array<Record<string, unknown>> = []
  const ws = fakeSocket(frames)
  // warm the Redis connection FIRST: without it the race would be a contest of who connects faster, not of who reads
  // the ticket first
  await socket.handleMessage(ws as never, JSON.stringify({ t: 'claim', ticket: 'warmup-never-existed' }))
  frames.length = 0
  while (Date.now() < startAt) {
    await new Promise((resolve) => setTimeout(resolve, 2))
  }
  await socket.handleMessage(ws as never, JSON.stringify({ t: 'claim', ticket }))
  report({ frames })
} else if (mode === 'selftest') {
  // the harness itself, with no Redis in play: mint and claim in one process over the in-memory backplane
  const { socket, channel } = createInstance(false)
  const connection = await socket.createConnection({ point: channel.point as never, identity: { me: 'racer' } })
  const frames: Array<Record<string, unknown>> = []
  await socket.handleMessage(fakeSocket(frames) as never, JSON.stringify({ t: 'claim', ticket: connection.ticket }))
  report({ cid: connection.cid, frames })
} else {
  console.error('unknown mode: ' + String(mode))
  process.exit(1)
}
`

type WorkerRun = { result: Record<string, unknown>; stderr: string; code: number }

describe.skipIf(!process.env.REDIS_URL)('socket ticket race across two processes (real Redis)', () => {
  const workerDir = nodePath.resolve(__dirname, 'temp', 'socket-redis')
  const workerPath = nodePath.join(workerDir, 'worker.ts')

  const run = async (args: string[]): Promise<WorkerRun> => {
    const proc = Bun.spawn(['bun', workerPath, ...args], {
      cwd: workerDir,
      env: { ...process.env },
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()])
    const code = await proc.exited
    const line = stdout.split('\n').find((candidate) => candidate.startsWith(RESULT_MARKER))
    if (line === undefined) {
      throw new Error(`Worker "${args.join(' ')}" printed no result.\nstdout: ${stdout}\nstderr: ${stderr}`)
    }
    return { result: JSON.parse(line.slice(RESULT_MARKER.length)) as Record<string, unknown>, stderr, code }
  }

  beforeAll(async () => {
    await nodeFs.mkdir(workerDir, { recursive: true })
    await Bun.write(workerPath, workerSource)
  })

  afterAll(async () => {
    await nodeFs.rm(workerDir, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 })
  })

  it('the worker harness claims a ticket it minted itself (no Redis involved)', async () => {
    // the control: proves the mock server, the fake socket and the frame plumbing are sound, so a failure in the race
    // below is about the race and not about the harness
    const { result } = await run(['selftest'])
    const frames = result.frames as Array<Record<string, unknown>>
    expect(frames.map((frame) => frame.t)).toEqual(['claimed'])
    expect(frames[0].cid).toBe(result.cid)
  })

  it('one ticket, two processes, one winner — getDelete is the atomicity', async () => {
    const minted = await run(['mint'])
    const cid = minted.result.cid as string
    const ticket = minted.result.ticket as string
    expect(typeof ticket).toBe('string')

    // both contenders warm their Redis connection and then claim at the same wall-clock instant; the margin is
    // generous on purpose — a loaded machine must not turn the race into a sequence
    const startAt = Date.now() + 3000
    const [first, second] = await Promise.all([
      run(['claim', ticket, String(startAt)]),
      run(['claim', ticket, String(startAt)]),
    ])
    const frames = [
      ...(first.result.frames as Array<Record<string, unknown>>),
      ...(second.result.frames as Array<Record<string, unknown>>),
    ]
    // exactly one process bound the connection…
    expect(frames.filter((frame) => frame.t === 'claimed').map((frame) => frame.cid)).toEqual([cid])
    // …and the other was told what any holder of a spent ticket is told
    const refusals = frames.filter((frame) => frame.t === 'claimErr')
    expect(refusals).toHaveLength(1)
    expect(String(refusals[0].error)).toContain('POINT0_SOCKET_TICKET_INVALID')
    // the two claims came from two different processes — each one framed exactly one answer
    expect((first.result.frames as unknown[]).length).toBe(1)
    expect((second.result.frames as unknown[]).length).toBe(1)
  })
})
