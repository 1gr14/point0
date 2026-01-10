// https://github.com/gastrodia/kill-port-bun/blob/main/src/lib.ts

const platform = process.platform

/**
 * Mutably remove a PID from an array
 * Modifies the original array in place
 */
const excludePidFromArray = (array: Array<number | string>, pid: number | string): void => {
  const pidStr = String(pid)
  let index = array.findIndex((p) => String(p) === pidStr)
  while (index !== -1) {
    array.splice(index, 1)
    index = array.findIndex((p) => String(p) === pidStr)
  }
}

const exec: Partial<
  Record<typeof platform, (port: string | number, silent?: boolean, excludeCurrentProcess?: boolean) => Promise<void>>
> = {
  darwin: async (port: string | number, silent = true, excludeCurrentProcess = true) => {
    const portStr = String(port)
    const result = await Bun.$`lsof -ti :${portStr}`.nothrow().quiet()

    // lsof returns non-zero exit code when no process is found
    if (result.exitCode !== 0) {
      if (!silent) console.info(`No process found using port ${portStr}`)
      return
    }

    const pids = result
      .text()
      .trim()
      .split(/[\n\r]/)
      .filter(Boolean)

    if (excludeCurrentProcess) {
      excludePidFromArray(pids, process.pid)
    }

    if (pids.length === 0) {
      if (!silent) console.info(`No process found using port ${portStr}`)
      return
    }

    for (const pid of pids) {
      if (!silent) console.info(`Killing process ${pid} on port ${portStr}`)
      const killResult = await Bun.$`kill -9 ${pid}`.nothrow().quiet()
      if (killResult.exitCode !== 0) {
        throw new Error(`Failed to kill process ${pid}: ${killResult.stderr.toString().trim()}`)
      }
    }
  },
  linux: async (port: string | number, silent = true, excludeCurrentProcess = true) => {
    const portStr = String(port)
    const result = await Bun.$`lsof -ti :${portStr}`.nothrow().quiet()

    // lsof returns non-zero exit code when no process is found
    if (result.exitCode !== 0) {
      if (!silent) console.info(`No process found using port ${portStr}`)
      return
    }

    const pids = result
      .text()
      .trim()
      .split(/[\n\r]/)
      .filter(Boolean)

    if (excludeCurrentProcess) {
      excludePidFromArray(pids, process.pid)
    }

    if (pids.length === 0) {
      if (!silent) console.info(`No process found using port ${portStr}`)
      return
    }

    for (const pid of pids) {
      if (!silent) console.info(`Killing process ${pid} on port ${portStr}`)
      const killResult = await Bun.$`kill -9 ${pid}`.nothrow().quiet()
      if (killResult.exitCode !== 0) {
        throw new Error(`Failed to kill process ${pid}: ${killResult.stderr.toString().trim()}`)
      }
    }
  },
  win32: async (port: string | number, silent = true, excludeCurrentProcess = true) => {
    const portStr = String(port)
    const result = await Bun.$`netstat -ano|findstr ${portStr}`.nothrow().quiet()

    // findstr returns non-zero exit code when no match is found
    if (result.exitCode !== 0) {
      if (!silent) console.info(`No process found using port ${portStr}`)
      return
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

    if (pids.length === 0) {
      if (!silent) console.info(`No process found using port ${portStr}`)
      return
    }

    for (const pid of pids) {
      if (!silent) console.info(`Killing process ${pid} on port ${portStr}`)
      const killResult = await Bun.$`taskkill /pid ${pid} -t -f`.nothrow().quiet()
      if (killResult.exitCode !== 0) {
        throw new Error(`Failed to kill process ${pid}: ${killResult.stderr.toString().trim()}`)
      }
    }
  },
}

/**
 * Kill process(es) using the specified port
 * @param port - The port number to kill processes on
 * @param options - Optional configuration
 * @param options.silent - If true, suppresses console output (default: false)
 * @param options.excludePids - Set of PIDs to exclude from killing (e.g., other concurrent test processes)
 * @returns Promise that resolves when process(es) are killed
 * @throws Error if the platform is not supported
 *
 * @example
 * ```ts
 * import { kill } from './kill.js'
 *
 * // Kill process on port 3000
 * await kill(3000)
 *
 * // Kill process silently
 * await kill(8080, { silent: true })
 *
 * ```
 */
export async function killPort(
  ports: number[] | number,
  options?: { silent?: boolean; excludeCurrentProcess?: boolean; force?: boolean },
): Promise<void> {
  ports = Array.isArray(ports) ? ports : [ports]
  const silent = options?.silent ?? true
  const excludeCurrentProcess = options?.excludeCurrentProcess ?? true
  const force = options?.force ?? true
  const run = exec[platform]
  if (!run) {
    throw new Error(`Unsupported platform: ${platform}`)
  }
  await Promise.all(
    ports.map(async (port) => {
      try {
        await run(port, silent, excludeCurrentProcess)
      } catch (error) {
        if (!force) {
          throw error
        }
      }
    }),
  )
}
