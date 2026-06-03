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
 * 1. The **lockfile** (`node_modules/.cache/@point0/dev/<hash>.json`) records the running tree so `point0 stop` and the
 *    next `point0 dev`'s reap-on-start can find and tear it down — even after the orchestrator was killed and its
 *    children orphaned. `stopDevTree` is the external "stop it" entry point.
 * 2. The **shutdown coordinator** (`installDevShutdown` + `registerDevChild`) owns the orchestrator's own teardown: on
 *    Ctrl-C / SIGTERM / an unexpected child death it gives every child a catchable SIGTERM and a grace window to run
 *    its own cleanup before SIGKILLing stragglers, then exits.
 */

// --- lockfile ---------------------------------------------------------------

/**
 * On-disk record of a running `point0 dev` tree, written by the orchestrator (the `point0 dev` process) and read by
 * `point0 stop` and the next `point0 dev`'s reap-on-start. It is what lets the multi-process dev tree (orchestrator +
 * server child + client children) be found and torn down as a single unit, even after the orchestrator has been killed
 * and its children orphaned.
 *
 * @related stopDevTree
 * @related writeDevLock
 */
export type DevLock = {
  /** PID of the orchestrator (`point0 dev`) process. */
  pid: number
  /** PID of whatever launched the orchestrator (shell / `bun run dev`) — informational, for diagnostics. */
  ppid: number
  /** Absolute project directory the dev tree was started in. */
  cwd: string
  /** Every port the tree may bind (server + clients, incl. hmr ports). `point0 stop` frees these as a fallback. */
  ports: number[]
  /** ISO timestamp of when the tree started. */
  startedAt: string
}

const lockDirSegment = 'dev'

/**
 * The lockfile path for a given project `cwd`. Lives under `node_modules/.cache/@point0/dev/` (already gitignored, and
 * per-checkout — each worktree has its own `node_modules`). The file name is a hash of `cwd` so that, even when a
 * single `node_modules` is shared (hoisted monorepo / multiple example apps), each project directory gets its own lock
 * and they never reap one another.
 */
const getLockPath = (cwd: string): string => {
  const dir = resolveTempDirPath([lockDirSegment])
  return nodePath.join(dir, `${getHash(cwd)}.json`)
}

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

/** Read the dev lock for a project, or `undefined` when there is none / it is unreadable. */
export const readDevLock = (cwd: string): DevLock | undefined => {
  try {
    const parsed = JSON.parse(nodeFs.readFileSync(getLockPath(cwd), 'utf8')) as Partial<DevLock> | null
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

/** Write (or overwrite) the dev lock for a project. */
export const writeDevLock = async (lock: DevLock): Promise<void> => {
  const lockPath = getLockPath(lock.cwd)
  await nodeFsPromises.mkdir(nodePath.dirname(lockPath), { recursive: true })
  await nodeFsPromises.writeFile(lockPath, JSON.stringify(lock, null, 2))
}

/** Remove the dev lock for a project, synchronously (safe to call from a process-exit handler). */
export const removeDevLockSync = (cwd: string): void => {
  try {
    nodeFs.rmSync(getLockPath(cwd), { force: true })
  } catch {
    // The lock is best-effort cleanup; failing to remove it must never block exit.
  }
}

/**
 * Stop a running `point0 dev` tree for a project, the clean way:
 *
 * 1. SIGTERM the orchestrator from the lockfile — this runs _its own_ graceful teardown (give children a grace window,
 *    then exit), the same path as Ctrl-C.
 * 2. If it does not exit within `timeoutMs`, escalate to SIGKILL. The default sits above the orchestrator's own grace
 *    window (`POINT0_DEV_SHUTDOWN_GRACE_MS`, default 5s) so a normal graceful teardown finishes before we escalate.
 * 3. As a belt-and-suspenders, free every recorded port in case a child outlived its parent (an orphan from an older
 *    build, or a child killed out of band).
 * 4. Remove the lockfile.
 *
 * Reads everything it needs from the lockfile and never imports the user's engine, so it still works when the app's
 * `engine.ts` throws on import. Used by both `point0 stop` and `point0 dev`'s reap-on-start (which passes its own pid
 * as `excludePid` so it never signals itself).
 *
 * @related DevLock
 */
export const stopDevTree = async (options: {
  cwd: string
  log?: LogFn
  timeoutMs?: number
  /** A pid that must never be signalled (the caller itself, when reaping before a fresh start). */
  excludePid?: number
}): Promise<{ stopped: boolean; pid?: number; ports: number[] }> => {
  const { cwd, log = defaultLog, timeoutMs = 8000, excludePid } = options
  const lock = readDevLock(cwd)
  if (!lock) {
    return { stopped: false, ports: [] }
  }
  const { pid, ports } = lock
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

  removeDevLockSync(cwd)
  return { stopped: shouldSignalPid || ports.length > 0, pid, ports }
}

// --- shutdown coordinator ---------------------------------------------------
//
// When the dev tree comes down — Ctrl-C, `point0 stop`'s SIGTERM, or a core child dying unexpectedly — we must give
// each child a *catchable* signal and a *grace window* to run its own cleanup (a user's `signal-exit` / `onShutdown`
// handlers: close the DB, stop a job queue) before force-killing it. The flow is: SIGTERM every live child → wait up to
// the grace window → SIGKILL any straggler → exit. The fast path is fast: as soon as every child has exited the wait
// resolves; the grace window is only an upper bound for a hung child.

type DevChild = Bun.Subprocess<any, any, any>

const DEFAULT_GRACE_MS = 5000

const children = new Set<DevChild>()
let shuttingDown = false
let installed = false
let graceMs = DEFAULT_GRACE_MS
let lockCwd: string | undefined
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
 * is slow — note `stopDevTree`'s own timeout should stay above it).
 */
export const installDevShutdown = (options: { cwd: string; graceMs?: number; log?: LogFn }): void => {
  if (installed) {
    return
  }
  installed = true
  lockCwd = options.cwd
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
  // no child is left orphaned and the lockfile is gone. Both operations are synchronous, as `exit` handlers must be.
  process.on('exit', () => {
    sigkillAliveChildren()
    if (lockCwd) {
      removeDevLockSync(lockCwd)
    }
  })
}
