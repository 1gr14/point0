// https://github.com/gastrodia/port-bun/blob/main/src/lib.ts

import { log, type LogFn } from '@point0/core'
import { isProcessAlive, processCommandMatches } from './proc.js'

const platform = process.platform

/**
 * Mutably remove a PID from an array Modifies the original array in place
 */
const excludePidFromArray = (array: Array<number | string>, pid: number | string): void => {
  const pidStr = String(pid)
  let index = array.findIndex((p) => String(p) === pidStr)
  while (index !== -1) {
    array.splice(index, 1)
    index = array.findIndex((p) => String(p) === pidStr)
  }
}

const getPidsByPort: Partial<
  Record<typeof platform, (port: string | number, excludeCurrentProcess?: boolean) => Promise<string[]>>
> = {
  darwin: async (port: string | number, excludeCurrentProcess = true) => {
    const portStr = String(port)
    const result = await Bun.$`lsof -ti :${portStr}`.nothrow().quiet()
    if (result.exitCode !== 0) {
      return []
    }
    const pids = result
      .text()
      .trim()
      .split(/[\n\r]/)
      .filter(Boolean)
    if (excludeCurrentProcess) {
      excludePidFromArray(pids, process.pid)
    }
    return pids
  },
  linux: async (port: string | number, excludeCurrentProcess = true) => {
    const portStr = String(port)
    const result = await Bun.$`lsof -ti :${portStr}`.nothrow().quiet()
    if (result.exitCode !== 0) {
      return []
    }
    const pids = result
      .text()
      .trim()
      .split(/[\n\r]/)
      .filter(Boolean)
    if (excludeCurrentProcess) {
      excludePidFromArray(pids, process.pid)
    }
    return pids
  },
  win32: async (port: string | number, excludeCurrentProcess = true) => {
    const portStr = String(port)
    const result = await Bun.$`netstat -ano|findstr ${portStr}`.nothrow().quiet()
    if (result.exitCode !== 0) {
      return []
    }
    const lines = result
      .text()
      .trim()
      .split(/[\n\r]/)
      .filter(Boolean)
    const pids = [
      ...new Set(lines.map((line) => /\d+$/.exec(line)?.at(0)).filter((pid): pid is string => pid !== undefined)),
    ]
    if (excludeCurrentProcess) {
      excludePidFromArray(pids, process.pid)
    }
    return pids
  },
}

/** Send `signal` to each PID; return the PIDs that actually received it (existed at signal time). */
const signalPids = (pids: number[], signal: NodeJS.Signals): number[] => {
  const signaled: number[] = []
  for (const pid of pids) {
    try {
      process.kill(pid, signal)
      signaled.push(pid)
    } catch {
      // Already gone (ESRCH) or not ours to signal (EPERM) — either way nothing was killed.
    }
  }
  return signaled
}

/**
 * Kill the given PIDs. On posix, `graceMs > 0` sends a catchable SIGTERM first and SIGKILLs only the stragglers left
 * after the grace window — so an app's own shutdown hooks get to run. On win32 it is always `taskkill` of the process
 * tree (no SIGTERM equivalent). Returns the PIDs that were actually signaled.
 */
const killPidsGracefully = async (pids: number[], graceMs: number): Promise<number[]> => {
  if (pids.length === 0) {
    return []
  }
  if (platform === 'win32') {
    const killed: number[] = []
    for (const pid of pids) {
      const killResult = await Bun.$`taskkill /pid ${pid} -t -f`.nothrow().quiet()
      if (killResult.exitCode === 0) {
        killed.push(pid)
      }
    }
    return killed
  }
  if (graceMs <= 0) {
    return signalPids(pids, 'SIGKILL')
  }
  const killed = signalPids(pids, 'SIGTERM')
  const deadline = Date.now() + graceMs
  while (killed.some(isProcessAlive) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  signalPids(killed.filter(isProcessAlive), 'SIGKILL')
  return killed
}

export async function isPortBinded(
  port: number,
  options?: { excludeCurrentProcess?: boolean; force?: boolean },
): Promise<boolean> {
  const run = getPidsByPort[platform]
  if (!run) {
    if (options?.force === false) {
      throw new Error(`Unsupported platform: ${platform}`)
    }
    return false
  }
  const pids = await run(port, options?.excludeCurrentProcess ?? true)
  return pids.length > 0
}

/**
 * Kill the process(es) holding the specified port(s) and return the PIDs that were actually killed.
 *
 * @param port - The port number(s) to free
 * @param options - Optional configuration
 * @param options.silent - If true, suppresses log output (default: true)
 * @param options.excludeCurrentProcess - Never kill the calling process itself (default: true)
 * @param options.force - Swallow errors instead of throwing (default: true)
 * @param options.verifyCommandMarkers - Only kill a holder whose `ps` command line contains at least one of these
 *   substrings — the "looks like ours" check that keeps a stale-lock sweep from killing an unrelated process that
 *   happens to sit on a recorded port. A holder whose identity cannot be verified (win32 has no `ps`; or the process
 *   vanished mid-check) is still killed — on posix that kill is a no-op on a corpse, on win32 it preserves the legacy
 *   behavior (there the port sweep is the only orphan cleanup, `--no-orphans` being a no-op).
 * @param options.graceMs - When > 0 (posix), SIGTERM first and give the holder this window for its own shutdown hooks
 *   before SIGKILLing stragglers. Default 0 — immediate SIGKILL, the legacy behavior.
 * @throws Error if the platform is not supported
 */
export async function killPort(
  ports: number[] | number,
  options?: {
    silent?: boolean
    excludeCurrentProcess?: boolean
    force?: boolean
    log?: LogFn
    category?: string[]
    verifyCommandMarkers?: string[]
    graceMs?: number
  },
): Promise<{ killedPids: number[] }> {
  const _log = options?.log ?? log
  const category = options?.category ?? ['killPort']
  ports = Array.isArray(ports) ? ports : [ports]
  const silent = options?.silent ?? true
  const excludeCurrentProcess = options?.excludeCurrentProcess ?? true
  const force = options?.force ?? true
  const verifyCommandMarkers = options?.verifyCommandMarkers
  const graceMs = options?.graceMs ?? 0
  const listPids = getPidsByPort[platform]
  if (!listPids) {
    throw new Error(`Unsupported platform: ${platform}`)
  }
  try {
    // Collect holders across all ports first (a single process may hold several — e.g. a server and its hmr port), so
    // each holder is verified and killed exactly once.
    const pidSet = new Set<number>()
    for (const port of ports) {
      for (const pid of await listPids(port, excludeCurrentProcess)) {
        const pidNumber = Number(pid)
        if (Number.isInteger(pidNumber) && pidNumber > 0) {
          pidSet.add(pidNumber)
        }
      }
    }
    let targets = [...pidSet]
    if (verifyCommandMarkers && targets.length > 0) {
      const verified: number[] = []
      for (const pid of targets) {
        const matches = await processCommandMatches(pid, verifyCommandMarkers)
        if (matches === false) {
          _log({
            level: 'debug',
            category,
            message: `Port holder pid ${pid} does not look like this project's dev process — leaving it alone.`,
          })
          continue
        }
        verified.push(pid)
      }
      targets = verified
    }
    if (targets.length === 0) {
      if (!silent) _log({ level: 'info', category, message: `No process found using port(s) ${ports.join(', ')}` })
      return { killedPids: [] }
    }
    if (!silent) {
      for (const pid of targets) {
        _log({ level: 'info', category, message: `Killing process ${pid} on port(s) ${ports.join(', ')}` })
      }
    }
    const killedPids = await killPidsGracefully(targets, graceMs)
    return { killedPids }
  } catch (error) {
    if (!silent) {
      _log({ level: 'error', category, message: `Error killing process on port(s) ${ports.join(', ')}`, error })
    }
    if (!force) {
      throw error
    }
    return { killedPids: [] }
  }
}
