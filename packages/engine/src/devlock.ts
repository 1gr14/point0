import { getHash, resolveTempDirPath } from '@point0/compiler'
import { log as defaultLog, type LogFn } from '@point0/core'
import nodeFs from 'node:fs'
import nodeFsPromises from 'node:fs/promises'
import nodePath from 'node:path'
import { killPort } from './port.js'

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

// --- shutdown coordination -------------------------------------------------
//
// The whole point of the dev tree is that it lives and dies as one unit. When any core child exits unexpectedly
// (e.g. an agent freed its port with `kill`), the orchestrator tears the rest down via `requestDevShutdown`. The
// `shuttingDown` flag lets the child-exit handlers tell an *expected* exit (we are already going down, or we killed
// the child ourselves for a restart) from an *unexpected* one that should trigger teardown.

let shuttingDown = false

/** True once the dev tree has begun tearing down (via signal, `requestDevShutdown`, or normal process exit). */
export const isDevShuttingDown = (): boolean => shuttingDown

/**
 * Mark the dev tree as shutting down without initiating one — registered on process exit so signal-driven teardown
 * (Ctrl-C, `point0 stop`'s SIGTERM) flips the flag before the children's exit handlers run.
 */
export const markDevShuttingDown = (): void => {
  shuttingDown = true
}

/**
 * Tear the whole dev tree down because something went wrong (a core child died unexpectedly). Idempotent. Exiting the
 * orchestrator runs its registered process-exit handlers, which SIGKILL the remaining children synchronously and remove
 * the lockfile — so the entire tree goes down together rather than leaving orphans behind.
 *
 * @related isDevShuttingDown
 */
export const requestDevShutdown = (options: { reason: string; log?: LogFn; code?: number }): void => {
  if (shuttingDown) {
    return
  }
  shuttingDown = true
  const { reason, log = defaultLog, code = 1 } = options
  log({ level: 'warn', category: ['dev'], message: reason })
  process.exit(code)
}

/**
 * Stop a running `point0 dev` tree for a project, the clean way:
 *
 * 1. SIGTERM the orchestrator from the lockfile — this runs _its own_ graceful teardown (it SIGKILLs its children), which
 *    is the same path as Ctrl-C.
 * 2. If it does not exit within `timeoutMs`, escalate to SIGKILL.
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
  const { cwd, log = defaultLog, timeoutMs = 3000, excludePid } = options
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
