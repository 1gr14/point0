import { getHash, resolveTempDirPath } from '@point0/compiler'
import { log as defaultLog, type LogFn } from '@point0/core'
import nodeFs from 'node:fs'
import nodeFsPromises from 'node:fs/promises'
import nodePath from 'node:path'
import { killPort } from './port.js'

/**
 * Dev process-tree lifecycle for `point0 dev`.
 *
 * Two related concerns, kept together because they are one story — making the multi-process dev tree (orchestrator +
 * server child + client children) behave as a single unit:
 *
 * 1. The **lockfile** records the running tree so `point0 stop` and the next `point0 dev`'s reap-on-start can find and
 *    tear it down — even after the orchestrator was killed and its children orphaned. A lockfile is keyed by **both**
 *    the project dir and the exact set of ports (`<hash(cwd)>-<hash(ports)>.json`), so two `point0 dev` instances in
 *    the same folder on different ports are independent — each only ever reaps a predecessor with its own identical
 *    config, and `point0 stop` can still find every instance of a folder by the shared `<hash(cwd)>-` prefix.
 * 2. The **shutdown coordinator** (`installDevShutdown` + `registerDevChild`) owns the orchestrator's own teardown: on
 *    Ctrl-C / SIGTERM / an unexpected child death it gives every child a catchable SIGTERM and a grace window to run
 *    its own cleanup before SIGKILLing stragglers, then exits.
 */

// --- lockfile ---------------------------------------------------------------

/**
 * On-disk record of a running `point0 dev` tree, written by the orchestrator (the `point0 dev` process) and read by
 * `point0 stop` and the next `point0 dev`'s reap-on-start.
 *
 * @related reapDevTree
 * @related writeDevLock
 */
export type DevLock = {
  /** PID of the orchestrator (`point0 dev`) process. */
  pid: number
  /** PID of whatever launched the orchestrator (shell / `bun run dev`) — informational, for diagnostics. */
  ppid: number
  /** Absolute project directory the dev tree was started in. */
  cwd: string
  /** Every port the tree binds (server + clients, incl. hmr ports). Part of the lock identity, and freed as a fallback. */
  ports: number[]
  /** ISO timestamp of when the tree started. */
  startedAt: string
}

const lockDirSegment = 'dev'

/** All dev lockfiles live in one cache dir (gitignored, per-checkout — each `node_modules` is its own). */
const getLockDir = (): string => resolveTempDirPath([lockDirSegment])

/** The cwd half of a lock's identity. Used as a filename prefix so `point0 stop` can glob every instance of a folder. */
const cwdKey = (cwd: string): string => getHash(cwd)

/** The ports half of a lock's identity — order-independent, so the same set of ports always hashes the same. */
const portsKey = (ports: number[]): string => getHash([...ports].sort((a, b) => a - b).join(','))

/**
 * The lockfile path for a specific cwd + ports. Two instances in the same folder differ in their ports, so they get
 * different files and never clobber or reap one another; instances of the same folder share the `<hash(cwd)>-` prefix
 * so they can be enumerated together.
 */
const getLockPath = (cwd: string, ports: number[]): string =>
  nodePath.join(getLockDir(), `${cwdKey(cwd)}-${portsKey(ports)}.json`)

/**
 * Whether a PID is currently a live process. Uses the signal-0 existence probe: `ESRCH` means gone, `EPERM` means it
 * exists but is owned by another user (still alive).
 */
export const isProcessAlive = (pid: number): boolean => {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false
  }
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return (error as NodeJS.ErrnoException | undefined)?.code === 'EPERM'
  }
}

/** Parse + validate a lockfile's contents into a `DevLock`, or `undefined` when malformed. */
const parseDevLock = (raw: string): DevLock | undefined => {
  try {
    const parsed = JSON.parse(raw) as Partial<DevLock> | null
    if (!parsed || typeof parsed.pid !== 'number' || typeof parsed.cwd !== 'string') {
      return undefined
    }
    return {
      pid: parsed.pid,
      ppid: typeof parsed.ppid === 'number' ? parsed.ppid : 0,
      cwd: parsed.cwd,
      ports: Array.isArray(parsed.ports) ? parsed.ports.filter((port): port is number => typeof port === 'number') : [],
      startedAt: typeof parsed.startedAt === 'string' ? parsed.startedAt : '',
    }
  } catch {
    return undefined
  }
}

const readDevLockFile = (lockPath: string): DevLock | undefined => {
  try {
    return parseDevLock(nodeFs.readFileSync(lockPath, 'utf8'))
  } catch {
    return undefined
  }
}

/** Read the lock for one exact cwd + ports, or `undefined` when there is none. */
export const readDevLock = (cwd: string, ports: number[]): DevLock | undefined =>
  readDevLockFile(getLockPath(cwd, ports))

/** Every dev lock recorded for a project dir (one per running/stale instance, across all port sets). */
export const listDevLocks = (cwd: string): DevLock[] => {
  const prefix = `${cwdKey(cwd)}-`
  let entries: string[]
  try {
    entries = nodeFs.readdirSync(getLockDir())
  } catch {
    return []
  }
  return entries
    .filter((entry) => entry.startsWith(prefix) && entry.endsWith('.json'))
    .map((entry) => readDevLockFile(nodePath.join(getLockDir(), entry)))
    .filter((lock): lock is DevLock => lock !== undefined)
}

/** Write (or overwrite) the lock for a tree. The path is derived from the tree's own cwd + ports. */
export const writeDevLock = async (lock: DevLock): Promise<void> => {
  const lockPath = getLockPath(lock.cwd, lock.ports)
  await nodeFsPromises.mkdir(nodePath.dirname(lockPath), { recursive: true })
  await nodeFsPromises.writeFile(lockPath, JSON.stringify(lock, null, 2))
}

/** Remove the lock for one exact cwd + ports, synchronously (safe to call from a process-exit handler). */
export const removeDevLockSync = (cwd: string, ports: number[]): void => {
  try {
    nodeFs.rmSync(getLockPath(cwd, ports), { force: true })
  } catch {
    // The lock is best-effort cleanup; failing to remove it must never block exit.
  }
}

export type StopDevTreeResult = { stopped: boolean; pid?: number; ports: number[] }

/**
 * Stop one recorded dev tree, the clean way:
 *
 * 1. SIGTERM the orchestrator from the lock — this runs _its own_ graceful teardown (give children a grace window, then
 *    exit), the same path as Ctrl-C.
 * 2. If it does not exit within `timeoutMs`, escalate to SIGKILL. The default sits above the orchestrator's own grace
 *    window (`POINT0_DEV_SHUTDOWN_GRACE_MS`, default 5s) so a normal graceful teardown finishes before we escalate.
 * 3. As a belt-and-suspenders, free the recorded ports in case a child outlived its parent.
 * 4. Remove the lockfile.
 */
const stopTree = async (
  lock: DevLock,
  options: { log: LogFn; timeoutMs: number; excludePid?: number },
): Promise<StopDevTreeResult> => {
  const { log, timeoutMs, excludePid } = options
  const { pid, ports, cwd } = lock
  const shouldSignalPid = pid !== excludePid && pid !== process.pid && isProcessAlive(pid)

  if (shouldSignalPid) {
    try {
      process.kill(pid, 'SIGTERM')
    } catch {
      // Raced us to death — nothing to stop.
    }
    const deadline = Date.now() + timeoutMs
    while (isProcessAlive(pid) && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    if (isProcessAlive(pid)) {
      try {
        process.kill(pid, 'SIGKILL')
      } catch {
        // Already gone between the check and the kill.
      }
    }
  }

  if (ports.length > 0) {
    await killPort(ports, { force: true, category: ['dev', 'stop'], log })
  }

  removeDevLockSync(cwd, ports)
  return { stopped: shouldSignalPid || ports.length > 0, pid, ports }
}

/**
 * Reap a previous dev tree that shares this exact cwd + ports — a true restart of the same config (or its leftover
 * zombie/lockfile). An instance on different ports has a different lock and is left untouched. Called at `point0 dev`
 * start; passes its own pid as `excludePid` so it never signals itself.
 */
export const reapDevTree = async (options: {
  cwd: string
  ports: number[]
  log?: LogFn
  timeoutMs?: number
  excludePid?: number
}): Promise<StopDevTreeResult> => {
  const { cwd, ports, log = defaultLog, timeoutMs = 8000, excludePid } = options
  const lock = readDevLock(cwd, ports)
  if (!lock) {
    return { stopped: false, ports: [] }
  }
  return stopTree(lock, { log, timeoutMs, excludePid })
}

/**
 * Stop every dev tree recorded for a project dir, regardless of ports — the `point0 stop` entry point. Reads everything
 * from the lockfiles and never imports the user's engine, so it still works when the app's `engine.ts` throws on
 * import.
 */
export const stopAllDevTrees = async (options: {
  cwd: string
  log?: LogFn
  timeoutMs?: number
}): Promise<StopDevTreeResult[]> => {
  const { cwd, log = defaultLog, timeoutMs = 8000 } = options
  const results: StopDevTreeResult[] = []
  for (const lock of listDevLocks(cwd)) {
    results.push(await stopTree(lock, { log, timeoutMs }))
  }
  return results
}

// --- shutdown coordinator ---------------------------------------------------
//
// When the dev tree comes down — Ctrl-C, `point0 stop`'s SIGTERM, or a core child dying unexpectedly — we must give
// each child a *catchable* signal and a *grace window* to run its own cleanup (a user's signal handlers: close the DB,
// stop a job queue) before force-killing it. The flow is: SIGTERM every live child → wait up to the grace window →
// SIGKILL any straggler → exit. The fast path is fast: as soon as every child has exited the wait resolves; the grace
// window is only an upper bound for a hung child.

type DevChild = Bun.Subprocess<any, any, any>

const DEFAULT_GRACE_MS = 5000

const children = new Set<DevChild>()
let shuttingDown = false
let installed = false
let graceMs = DEFAULT_GRACE_MS
let lockCwd: string | undefined
let lockPorts: number[] = []
let coordinatorLog: LogFn = defaultLog

/**
 * Whether the dev tree has begun tearing down. The child-exit handlers consult this to tell an _expected_ exit (we are
 * already going down) from an _unexpected_ one (a crash / an agent freeing a port) that should trigger a teardown.
 */
export const isDevShuttingDown = (): boolean => shuttingDown

/**
 * Track a freshly spawned dev child so the coordinator can tear it down gracefully on shutdown. The child is dropped
 * from the set automatically when it exits.
 */
export const registerDevChild = (child: DevChild): void => {
  children.add(child)
  void child.exited.finally(() => children.delete(child))
}

const aliveChildren = (): DevChild[] =>
  [...children].filter((child) => child.exitCode === null && child.signalCode === null)

/** SIGKILL every still-alive child, synchronously — the last-resort backstop, safe to call from an `exit` handler. */
const sigkillAliveChildren = (): void => {
  for (const child of aliveChildren()) {
    try {
      child.kill('SIGKILL')
    } catch {
      // Already dead or detached.
    }
  }
}

/** SIGTERM every live child, wait up to `graceMs` for them all to exit on their own, then SIGKILL any straggler. */
const terminateChildrenGracefully = async (): Promise<void> => {
  const alive = aliveChildren()
  if (alive.length === 0) {
    return
  }
  for (const child of alive) {
    try {
      child.kill('SIGTERM')
    } catch {
      // Already dead or detached.
    }
  }
  await Promise.race([
    Promise.all(alive.map((child) => child.exited)),
    new Promise((resolve) => setTimeout(resolve, graceMs)),
  ])
  sigkillAliveChildren()
}

/**
 * The single async shutdown path for the dev orchestrator. Idempotent. Gives the children their grace window, then
 * exits — the `exit` backstop (installed by {@link installDevShutdown}) removes the lockfile and SIGKILLs any
 * straggler.
 */
export const shutdownDevTree = async (options?: { code?: number; reason?: string; log?: LogFn }): Promise<void> => {
  if (shuttingDown) {
    return
  }
  shuttingDown = true
  const { code = 0, reason, log = coordinatorLog } = options ?? {}
  if (reason) {
    log({ level: 'warn', category: ['dev'], message: reason })
  }
  await terminateChildrenGracefully()
  process.exit(code)
}

/**
 * Tear the whole tree down because a core child exited unexpectedly (a crash, or an agent freeing its port). Surviving
 * children still get the graceful SIGTERM + grace window before being killed.
 */
export const requestDevShutdown = (options: { reason: string; log?: LogFn; code?: number }): void => {
  void shutdownDevTree({ code: options.code ?? 1, reason: options.reason, log: options.log })
}

/**
 * Install the coordinator once, from `engine.dev()`. It takes ownership of SIGINT/SIGTERM/SIGHUP for the orchestrator
 * and routes them to the graceful teardown. Its signal listeners are kept installed for the life of the process: a
 * present listener stops Node from terminating on the signal, so the async teardown can run to completion even though
 * other `registerOnProcessExit` handlers re-raise the signal after their synchronous cleanup.
 *
 * The grace window defaults to 5s and can be tuned with `POINT0_DEV_SHUTDOWN_GRACE_MS` (raise it for apps whose cleanup
 * is slow — note `stopTree`'s own timeout should stay above it).
 */
export const installDevShutdown = (options: { cwd: string; ports: number[]; graceMs?: number; log?: LogFn }): void => {
  if (installed) {
    return
  }
  installed = true
  lockCwd = options.cwd
  lockPorts = options.ports
  coordinatorLog = options.log ?? defaultLog
  const envGrace = Number(process.env.POINT0_DEV_SHUTDOWN_GRACE_MS)
  graceMs = options.graceMs ?? (Number.isFinite(envGrace) && envGrace >= 0 ? envGrace : DEFAULT_GRACE_MS)

  const signalCodes: Partial<Record<NodeJS.Signals, number>> = { SIGINT: 130, SIGTERM: 0, SIGHUP: 129 }
  for (const signal of Object.keys(signalCodes) as NodeJS.Signals[]) {
    process.on(signal, () => {
      void shutdownDevTree({ code: signalCodes[signal] ?? 0 })
    })
  }

  // Last-resort backstop: if the process ever exits without the graceful path (or a straggler survived it), make sure
  // no child is left orphaned and this tree's lockfile is gone. Both operations are synchronous, as `exit` handlers must be.
  process.on('exit', () => {
    sigkillAliveChildren()
    if (lockCwd) {
      removeDevLockSync(lockCwd, lockPorts)
    }
  })
}
