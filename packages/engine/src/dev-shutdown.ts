import { log as defaultLog, type LogFn } from '@point0/core'

/**
 * Shutdown coordinator for the `point0 dev` process tree (orchestrator + server child + client children).
 *
 * The lifecycle model is deliberately primitive — one invariant: **a process dies with its parent.** Every bun process
 * in the tree runs with `--no-orphans` (the CLI shebang; inherited by nested bun processes; bun >= 1.3.14), so killing
 * the orchestrator — even with SIGKILL — takes the whole tree down at the kernel level, and apps set `[run] noOrphans =
 * true` in their bunfig so the `bun run dev` wrapper itself dies with the terminal. There are no lockfiles, no PID
 * bookkeeping, no port sweeps: a process that cannot be orphaned never needs to be found later.
 *
 * What `--no-orphans` does NOT provide is _graceful_ teardown — it SIGKILLs. That is this coordinator's only job: on
 * Ctrl-C / SIGTERM / SIGHUP (or a core child dying unexpectedly) give every child a _catchable_ SIGTERM and a grace
 * window to run its own cleanup (a user's signal handlers: close the DB, stop a job queue) before SIGKILLing stragglers
 * and exiting. The fast path is fast: as soon as every child has exited the wait resolves; the grace window is only an
 * upper bound for a hung child. `--no-orphans` remains the backstop for every path that skips this coordinator
 * (orchestrator SIGKILLed, crash before handlers ran).
 */

type DevChild = Bun.Subprocess<any, any, any>

const DEFAULT_GRACE_MS = 5000

const children = new Set<DevChild>()
let shuttingDown = false
let installed = false
let graceMs = DEFAULT_GRACE_MS
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
 * exits — the `exit` backstop (installed by {@link installDevShutdown}) SIGKILLs any straggler.
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
 * is slow).
 */
export const installDevShutdown = (options?: { graceMs?: number; log?: LogFn }): void => {
  if (installed) {
    return
  }
  installed = true
  coordinatorLog = options?.log ?? defaultLog
  const envGrace = Number(process.env.POINT0_DEV_SHUTDOWN_GRACE_MS)
  graceMs = options?.graceMs ?? (Number.isFinite(envGrace) && envGrace >= 0 ? envGrace : DEFAULT_GRACE_MS)

  const signalCodes: Partial<Record<NodeJS.Signals, number>> = { SIGINT: 130, SIGTERM: 0, SIGHUP: 129 }
  for (const signal of Object.keys(signalCodes) as NodeJS.Signals[]) {
    process.on(signal, () => {
      void shutdownDevTree({ code: signalCodes[signal] ?? 0 })
    })
  }

  // Last-resort backstop: if the process ever exits without the graceful path (or a straggler survived it), make sure
  // no child is left running. Synchronous, as `exit` handlers must be. (`--no-orphans` would reap them anyway; this
  // just makes the common case immediate.)
  process.on('exit', () => {
    sigkillAliveChildren()
  })
}
