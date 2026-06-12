/**
 * Tiny process-introspection helpers for the dev lifecycle's kill paths (devlock reap/stop, port takeover).
 *
 * Before signaling a PID recorded somewhere (a lockfile) or found holding a port, we verify the process actually looks
 * like ours — a PID from a stale lockfile may have been reused by an arbitrary process, and a recorded port may now be
 * held by something unrelated. `ps` is the verification source: its command line tells what the process is, its elapsed
 * time tells when it started. Available on darwin/linux; on win32 (and any `ps` failure) verification is unavailable
 * and callers fall back to their unverified legacy behavior.
 */

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

export type ProcessInfo = {
  pid: number
  /** Full command line as reported by `ps -o command=` (executable + args). */
  command: string
  /** Epoch ms when the process started, derived from `ps -o etime=` (1s resolution). */
  startedAtMs: number
}

/**
 * Parse one `ps -o etime=,command=` output line. `etime` is `[[dd-]hh:]mm:ss` (POSIX, locale-independent — macOS has no
 * `etimes`). Exported for unit tests.
 */
export const parsePsEtimeLine = (line: string, now: number): { command: string; startedAtMs: number } | undefined => {
  const match = /^\s*(?:(\d+)-)?(?:(\d+):)?(\d+):(\d+)\s+(.+)$/.exec(line)
  if (!match) {
    return undefined
  }
  // The optional groups are `undefined` at runtime when absent (TS types them as plain string).
  const [, days = '0', hours = '0', minutes, seconds, command] = match as unknown as Array<string | undefined>
  const elapsedSeconds = Number(days) * 86_400 + Number(hours) * 3_600 + Number(minutes) * 60 + Number(seconds)
  return { command: (command ?? '').trim(), startedAtMs: now - elapsedSeconds * 1000 }
}

/**
 * What a live PID currently is: its command line and start time. `undefined` when the process is gone, the platform has
 * no `ps` (win32), or `ps` failed — i.e. whenever identity cannot be verified.
 */
export const getProcessInfo = async (pid: number): Promise<ProcessInfo | undefined> => {
  if (process.platform === 'win32' || !Number.isInteger(pid) || pid <= 0) {
    return undefined
  }
  try {
    const result = await Bun.$`ps -p ${pid} -o etime=,command=`
      .env({ ...process.env, LC_ALL: 'C' })
      .nothrow()
      .quiet()
    if (result.exitCode !== 0) {
      return undefined
    }
    const line = result.text().split('\n').find(Boolean)
    if (!line) {
      return undefined
    }
    const parsed = parsePsEtimeLine(line, Date.now())
    return parsed ? { pid, ...parsed } : undefined
  } catch {
    return undefined
  }
}

/**
 * Whether `pid`'s command line contains any of `markers` (substring match). The dev lifecycle's "looks like ours"
 * check: a dev child's command always carries either the project dir (server entry path) or the point0 cache dir (the
 * generated client serve script). Returns `undefined` when identity cannot be verified (win32 / `ps` failed) so the
 * caller can choose its fallback.
 */
export const processCommandMatches = async (pid: number, markers: string[]): Promise<boolean | undefined> => {
  const info = await getProcessInfo(pid)
  if (!info) {
    return undefined
  }
  return markers.some((marker) => marker.length > 0 && info.command.includes(marker))
}
