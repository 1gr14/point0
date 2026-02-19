// https://github.com/gastrodia/port-bun/blob/main/src/lib.ts

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

const killPids: Partial<Record<typeof platform, (pids: string[]) => Promise<void>>> = {
  darwin: async (pids: string[]) => {
    for (const pid of pids) {
      const killResult = await Bun.$`kill -9 ${pid}`.nothrow().quiet()
      if (killResult.exitCode !== 0) {
        throw new Error(`Failed to kill process ${pid}: ${killResult.stderr.toString().trim()}`)
      }
    }
  },
  linux: async (pids: string[]) => {
    for (const pid of pids) {
      const killResult = await Bun.$`kill -9 ${pid}`.nothrow().quiet()
      if (killResult.exitCode !== 0) {
        throw new Error(`Failed to kill process ${pid}: ${killResult.stderr.toString().trim()}`)
      }
    }
  },
  win32: async (pids: string[]) => {
    for (const pid of pids) {
      const killResult = await Bun.$`taskkill /pid ${pid} -t -f`.nothrow().quiet()
      if (killResult.exitCode !== 0) {
        throw new Error(`Failed to kill process ${pid}: ${killResult.stderr.toString().trim()}`)
      }
    }
  },
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
  const listPids = getPidsByPort[platform]
  const killByPids = killPids[platform]
  if (!listPids || !killByPids) {
    throw new Error(`Unsupported platform: ${platform}`)
  }
  await Promise.all(
    ports.map(async (port) => {
      try {
        const pids = await listPids(port, excludeCurrentProcess)
        if (pids.length === 0) {
          if (!silent) console.info(`No process found using port ${port}`)
          return
        }
        if (!silent) {
          for (const pid of pids) {
            console.info(`Killing process ${pid} on port ${port}`)
          }
        }
        await killByPids(pids)
      } catch (error) {
        if (!force) {
          throw error
        }
      }
    }),
  )
}

export async function resolvePortByPolicy(options: {
  port: number
  portPolicy: 'kill' | 'auto' | 'simple'
  maxPort?: number
  silent?: boolean
}): Promise<number> {
  const { port, portPolicy, maxPort = 65535, silent = true } = options
  if (portPolicy === 'simple') {
    return port
  }
  if (portPolicy === 'kill') {
    await killPort(port, { silent, excludeCurrentProcess: true, force: false })
    return port
  }
  let candidatePort = port
  while (candidatePort <= maxPort) {
    const binded = await isPortBinded(candidatePort, { excludeCurrentProcess: true, force: false })
    if (!binded) {
      return candidatePort
    }
    candidatePort += 1
  }
  throw new Error(`No available port found from ${port} to ${maxPort}`)
}
