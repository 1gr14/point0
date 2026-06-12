import { getHash } from '@point0/compiler'
import { log as defaultLog, type LogFn } from '@point0/core'
import nodeFs from 'node:fs'
import nodeFsPromises from 'node:fs/promises'
import nodePath from 'node:path'
import { killPort } from './port.js'
import { getProcessInfo, isProcessAlive } from './proc.js'

export { isProcessAlive } from './proc.js'

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
 *
 * A lockfile is a _claim_, not proof: the tree may be long gone (a SIGKILLed orchestrator never runs its exit handler,
 * so its lockfile outlives it) and PIDs/ports may have been reused by unrelated processes since. So everything that
 * kills VERIFIES first — a recorded PID is only signaled when the live process still looks like a point0 orchestrator
 * started when the lock says (see {@link verifyLockPid}), and a recorded port's holder is only killed when its command
 * line ties it to this project (see {@link devProcessCommandMarkers}). A lock that verifies as nothing-of-ours is simply
 * removed. Orphans themselves are rare by construction: every dev child is spawned with bun's `--no-orphans` (>=
 * 1.3.14), which kills it when the orchestrator dies, even by SIGKILL — the verified port sweep is the fallback for the
 * cases that flag cannot cover (win32, where it is a no-op).
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
  /**
   * ISO timestamp of when the orchestrator _process_ was born (`Date.now() - process.uptime()`). Identity check against
   * `ps`'s elapsed time: a PID whose live process started at a different moment is a reused PID, not ours. Optional for
   * locks written by older versions.
   */
  pidStartedAt?: string
  /**
   * The orchestrator's script path (`process.argv[1]` — the `point0` bin or `cli.js`). Identity check against `ps`'s
   * command line; an absolute path, so it also distinguishes checkouts. Optional for locks written by older versions.
   */
  cli?: string
}

const lockDirSegment = 'dev'

/** Every existing `node_modules` dir walking up from `from` — nearest first. */
const findNodeModulesDirsUp = (from: string): string[] => {
  const found: string[] = []
  let dir = nodePath.resolve(from)
  let lastDir = ''
  while (dir !== lastDir) {
    const candidate = nodePath.join(dir, 'node_modules')
    try {
      if (nodeFs.existsSync(candidate)) {
        found.push(candidate)
      }
    } catch {
      // Unreadable level — skip it.
    }
    lastDir = dir
    dir = nodePath.dirname(dir)
  }
  return found
}

const lockDirForNodeModules = (nodeModulesDir: string): string =>
  nodePath.join(nodeModulesDir, '.cache', '@point0', lockDirSegment)

/**
 * The dir a NEW lock is written to: inside the nearest `node_modules` above the project cwd (the same anchor the rest
 * of the point0 cache uses), falling back to a walk from the running process's cwd.
 */
const getPrimaryLockDir = (cwd: string): string => {
  const nodeModules = findNodeModulesDirsUp(cwd)[0] ?? findNodeModulesDirsUp(process.cwd())[0]
  if (!nodeModules) {
    throw new Error('No node_modules found. Please run "bun install" in the project root.')
  }
  return lockDirForNodeModules(nodeModules)
}

/**
 * Every dir a lock for `cwd` may live in. The "nearest node_modules" anchor is NOT stable across a dev session: an
 * app-local `node_modules` can MATERIALIZE after the lock was written (vite's dep optimizer creates one for its `.vite`
 * cache during the first boot), shifting the nearest anchor between the orchestrator's write and a later `point0
 * stop`/reap read. So reads check every `node_modules` level above the project (and above the running process's cwd,
 * for safety) instead of trusting today's nearest.
 */
const getLockDirCandidates = (cwd: string): string[] => {
  const nodeModulesDirs = new Set([...findNodeModulesDirsUp(cwd), ...findNodeModulesDirsUp(process.cwd())])
  return [...nodeModulesDirs].map(lockDirForNodeModules)
}

/** The cwd half of a lock's identity. Used as a filename prefix so `point0 stop` can glob every instance of a folder. */
const cwdKey = (cwd: string): string => getHash(cwd)

/** The ports half of a lock's identity — order-independent, so the same set of ports always hashes the same. */
const portsKey = (ports: number[]): string => getHash([...ports].sort((a, b) => a - b).join(','))

/**
 * The lockfile name for a specific cwd + ports. Two instances in the same folder differ in their ports, so they get
 * different files and never clobber or reap one another; instances of the same folder share the `<hash(cwd)>-` prefix
 * so they can be enumerated together.
 */
const getLockFileName = (cwd: string, ports: number[]): string => `${cwdKey(cwd)}-${portsKey(ports)}.json`

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
      pidStartedAt: typeof parsed.pidStartedAt === 'string' ? parsed.pidStartedAt : undefined,
      cli: typeof parsed.cli === 'string' ? parsed.cli : undefined,
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

/** A lock together with the file it was read from — removal must target the exact file, not today's primary dir. */
type DevLockEntry = { lock: DevLock; path: string }

/** Read the lock entry for one exact cwd + ports across all candidate dirs (nearest first), or `undefined`. */
const readDevLockEntry = (cwd: string, ports: number[]): DevLockEntry | undefined => {
  const fileName = getLockFileName(cwd, ports)
  for (const dir of getLockDirCandidates(cwd)) {
    const path = nodePath.join(dir, fileName)
    const lock = readDevLockFile(path)
    if (lock) {
      return { lock, path }
    }
  }
  return undefined
}

/** Every dev lock entry recorded for a project dir (one per running/stale instance, across all port sets and dirs). */
const listDevLockEntries = (cwd: string): DevLockEntry[] => {
  const prefix = `${cwdKey(cwd)}-`
  const result: DevLockEntry[] = []
  for (const dir of getLockDirCandidates(cwd)) {
    let entries: string[]
    try {
      entries = nodeFs.readdirSync(dir)
    } catch {
      continue
    }
    for (const entry of entries) {
      if (!entry.startsWith(prefix) || !entry.endsWith('.json')) {
        continue
      }
      const path = nodePath.join(dir, entry)
      const lock = readDevLockFile(path)
      if (lock) {
        result.push({ lock, path })
      }
    }
  }
  return result
}

/** Read the lock for one exact cwd + ports, or `undefined` when there is none. */
export const readDevLock = (cwd: string, ports: number[]): DevLock | undefined => readDevLockEntry(cwd, ports)?.lock

/** Every dev lock recorded for a project dir (one per running/stale instance, across all port sets). */
export const listDevLocks = (cwd: string): DevLock[] => listDevLockEntries(cwd).map((entry) => entry.lock)

/**
 * Write (or overwrite) the lock for a tree into the primary lock dir, and return the exact file path — the writer must
 * remember it for its exit-time removal (recomputing the dir at exit may resolve to a different `node_modules` level,
 * see {@link getLockDirCandidates}).
 */
export const writeDevLock = async (lock: DevLock): Promise<string> => {
  const lockPath = nodePath.join(getPrimaryLockDir(lock.cwd), getLockFileName(lock.cwd, lock.ports))
  await nodeFsPromises.mkdir(nodePath.dirname(lockPath), { recursive: true })
  await nodeFsPromises.writeFile(lockPath, JSON.stringify(lock, null, 2))
  return lockPath
}

/** Remove one exact lock file, synchronously (safe to call from a process-exit handler). */
export const removeDevLockPathSync = (lockPath: string): void => {
  try {
    nodeFs.rmSync(lockPath, { force: true })
  } catch {
    // The lock is best-effort cleanup; failing to remove it must never block exit.
  }
}

/** Remove the lock for one exact cwd + ports from every candidate dir, synchronously. */
export const removeDevLockSync = (cwd: string, ports: number[]): void => {
  const fileName = getLockFileName(cwd, ports)
  for (const dir of getLockDirCandidates(cwd)) {
    removeDevLockPathSync(nodePath.join(dir, fileName))
  }
}

// --- identity verification ---------------------------------------------------
//
// A lockfile may be stale (a SIGKILLed orchestrator leaves one behind) and the OS recycles PIDs and ports, so before
// signaling anything we check that what is live today still matches what the lock recorded. Without this, `point0
// stop` against a week-old lockfile can SIGKILL whatever innocent process happens to have the recorded PID or sit on
// the recorded port — the one thing a dev tool must never do.

/**
 * How far apart the lock's recorded process birth and `ps`'s may be and still count as the same process (etime has 1s
 * resolution).
 */
const PID_START_TOLERANCE_MS = 10_000

type LockPidVerdict =
  /** Live, and both the command line and the start time match the lock — safe to signal. */
  | 'ours'
  /** Not running (or PID invalid) — nothing to signal. */
  | 'dead'
  /** Live, but the command/start time does NOT match — the PID was reused by an unrelated process. Never signal. */
  | 'foreign'
  /** Live, but identity cannot be checked (win32 has no `ps`, or it died mid-check). Treated as ours — legacy behavior. */
  | 'unverifiable'

/** Verify that the lock's PID still is the orchestrator that wrote the lock (and not a reused PID). */
const verifyLockPid = async (lock: DevLock): Promise<LockPidVerdict> => {
  if (!isProcessAlive(lock.pid)) {
    return 'dead'
  }
  const info = await getProcessInfo(lock.pid)
  if (!info) {
    return 'unverifiable'
  }
  // The recorded bin path is the precise marker; bare `point0` is the lenient fallback (matches the bin name or any
  // `@point0/engine/dist/cli.js` path) for locks written by older versions or an in-place reinstalled checkout.
  const commandMatches = (lock.cli !== undefined && info.command.includes(lock.cli)) || info.command.includes('point0')
  if (!commandMatches) {
    return 'foreign'
  }
  if (lock.pidStartedAt) {
    const lockStart = Date.parse(lock.pidStartedAt)
    if (Number.isFinite(lockStart) && Math.abs(lockStart - info.startedAtMs) > PID_START_TOLERANCE_MS) {
      return 'foreign'
    }
  }
  return 'ours'
}

/**
 * Command-line substrings that mark a process as belonging to this project's dev tree. Every dev child's command
 * carries one: the server child runs the app's entry file (a path under `cwd`), the client child runs the generated
 * serve script (a path under the checkout's `node_modules/.cache/@point0`). Used to decide which port holders a sweep
 * may kill. `includeGenericCliMarker` adds the bare `point0` (matches the CLI bin / `cli.js` path) — for takeover paths
 * where the expected holder is a previous orchestrator itself.
 */
export const devProcessCommandMarkers = (options: { cwd: string; includeGenericCliMarker?: boolean }): string[] => {
  const markers = [options.cwd]
  // Every cache root the checkout may have used (the nearest node_modules can shift mid-session — see
  // getLockDirCandidates) — the client serve script lives under one of them.
  for (const nodeModulesDir of new Set([
    ...findNodeModulesDirsUp(options.cwd),
    ...findNodeModulesDirsUp(process.cwd()),
  ])) {
    markers.push(nodePath.join(nodeModulesDir, '.cache', '@point0'))
  }
  if (options.includeGenericCliMarker) {
    markers.push('point0')
  }
  return markers
}

export type StopDevTreeResult = {
  /** Whether anything was actually terminated (the orchestrator and/or orphaned children). */
  stopped: boolean
  pid?: number
  ports: number[]
  /** The lock's orchestrator was alive, verified ours, and got the SIGTERM(+SIGKILL) treatment. */
  orchestratorStopped: boolean
  /** PIDs of verified-ours processes killed off the recorded ports (children that outlived their tree). */
  orphansKilled: number[]
  /** The lock referenced nothing of ours anymore (dead/reused PID, no orphans) — it was just removed. */
  staleLockRemoved: boolean
}

const emptyStopResult = (ports: number[] = []): StopDevTreeResult => ({
  stopped: false,
  ports,
  orchestratorStopped: false,
  orphansKilled: [],
  staleLockRemoved: false,
})

/**
 * The orchestrator's own grace window for its children (`POINT0_DEV_SHUTDOWN_GRACE_MS`, default 5s). Also consulted by
 * the stop/reap side: the wait-for-exit timeout must sit above it, and orphan sweeps grant the same window.
 */
const resolveShutdownGraceMs = (): number => {
  const envGrace = Number(process.env.POINT0_DEV_SHUTDOWN_GRACE_MS)
  return Number.isFinite(envGrace) && envGrace >= 0 ? envGrace : DEFAULT_GRACE_MS
}

/** Default wait for a SIGTERMed orchestrator to finish its own graceful teardown before escalating to SIGKILL. */
const resolveStopTimeoutMs = (): number => Math.max(8000, resolveShutdownGraceMs() + 3000)

/**
 * Stop one recorded dev tree, the clean way:
 *
 * 1. Verify the lock's PID is still our orchestrator ({@link verifyLockPid}) — a stale lock's PID may belong to an
 *    unrelated process by now, which must not be touched.
 * 2. SIGTERM the verified orchestrator — this runs _its own_ graceful teardown (give children a grace window, then exit),
 *    the same path as Ctrl-C. If it does not exit within `timeoutMs` (default sits above the orchestrator's own
 *    `POINT0_DEV_SHUTDOWN_GRACE_MS`), escalate to SIGKILL.
 * 3. Sweep the recorded ports for children that outlived their tree — killing only holders whose command line ties them to
 *    this project ({@link devProcessCommandMarkers}), with a SIGTERM + grace window of their own. An unrelated process
 *    squatting a recorded port is left alone.
 * 4. Remove the lockfile. A lock where steps 2–3 found nothing was just stale bookkeeping (`staleLockRemoved`).
 */
const stopTree = async (
  entry: DevLockEntry,
  options: { log: LogFn; timeoutMs: number; excludePid?: number },
): Promise<StopDevTreeResult> => {
  const { lock } = entry
  const { log, timeoutMs, excludePid } = options
  const { pid, ports, cwd } = lock
  const verdict = pid === excludePid || pid === process.pid ? 'dead' : await verifyLockPid(lock)
  const orchestratorStopped = verdict === 'ours' || verdict === 'unverifiable'

  if (verdict === 'foreign') {
    log({
      level: 'debug',
      category: ['dev', 'stop'],
      message: `Dev lock pid ${pid} now belongs to a different process (reused PID) — not signaling it.`,
    })
  }

  if (orchestratorStopped) {
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

  let orphansKilled: number[] = []
  if (ports.length > 0) {
    const { killedPids } = await killPort(ports, {
      force: true,
      category: ['dev', 'stop'],
      log,
      verifyCommandMarkers: [...devProcessCommandMarkers({ cwd }), ...(lock.cli ? [lock.cli] : [])],
      graceMs: resolveShutdownGraceMs(),
    })
    orphansKilled = killedPids
  }

  removeDevLockPathSync(entry.path)
  const stopped = orchestratorStopped || orphansKilled.length > 0
  return { stopped, pid, ports, orchestratorStopped, orphansKilled, staleLockRemoved: !stopped }
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
  const { cwd, ports, log = defaultLog, timeoutMs = resolveStopTimeoutMs(), excludePid } = options
  const entry = readDevLockEntry(cwd, ports)
  if (!entry) {
    return emptyStopResult()
  }
  return stopTree(entry, { log, timeoutMs, excludePid })
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
  const { cwd, log = defaultLog, timeoutMs = resolveStopTimeoutMs() } = options
  const results: StopDevTreeResult[] = []
  for (const entry of listDevLockEntries(cwd)) {
    results.push(await stopTree(entry, { log, timeoutMs }))
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
let installedLockPath: string | undefined
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
export const installDevShutdown = (options: { lockPath: string; graceMs?: number; log?: LogFn }): void => {
  if (installed) {
    return
  }
  installed = true
  // The exact file `writeDevLock` produced — recomputing the lock dir at exit could resolve to a different
  // node_modules level (see getLockDirCandidates) and miss the file.
  installedLockPath = options.lockPath
  coordinatorLog = options.log ?? defaultLog
  graceMs = options.graceMs ?? resolveShutdownGraceMs()

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
    if (installedLockPath) {
      removeDevLockPathSync(installedLockPath)
    }
  })
}
