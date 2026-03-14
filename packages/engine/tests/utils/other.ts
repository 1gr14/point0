import nodeFs from 'node:fs/promises'
import nodePath from 'node:path'

export const waitUntilFileChanged = async (file: Bun.BunFile | string, limit = 500, interval = 10): Promise<void> => {
  const startTime = Date.now()
  const bunFile = typeof file === 'string' ? Bun.file(file) : file
  const stats = await bunFile.stat()
  const currentTimestamp = stats.mtimeMs
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (true) {
    const newStats = await bunFile.stat()
    if (newStats.mtimeMs !== currentTimestamp) {
      return
    }
    await new Promise((resolve) => setTimeout(resolve, interval))
    const elapsed = Date.now() - startTime
    if (elapsed > limit) {
      throw new Error(`File did not change after ${limit}ms`)
    }
  }
}

export const waitResponse = async (
  url: string,
  status: number | number[] | 'ok' | 'bad',
  limit = 3000,
  onError?: (error: unknown) => void | Promise<void>,
): Promise<Response> => {
  const startTime = Date.now()
  const isTimeout = () => Date.now() - startTime > limit
  // all success statuses are 200, 201, ..., all error statuses are 400, 401, ...,
  const loggableStatus = Array.isArray(status)
    ? status.join(', ')
    : typeof status === 'string'
      ? status
      : status.toString()
  const statuses = Array.isArray(status)
    ? status
    : typeof status === 'string'
      ? status === 'ok'
        ? Array.from({ length: 100 }, (_, i) => 200 + i)
        : Array.from({ length: 200 }, (_, i) => 400 + i)
      : [status]
  let response: Response | undefined
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (true) {
    if (isTimeout()) {
      const err = new Error(
        `Expected ${loggableStatus} response, received ${response?.status}, timed out after ${limit}ms`,
      )
      await onError?.(err)
      throw err
    }
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        controller.abort()
      }, 500)
      try {
        response = await fetch(url, { signal: controller.signal })
      } finally {
        clearTimeout(timeoutId)
      }
      if (statuses.includes(response.status)) {
        return response
      }
    } catch (error) {
      if (isTimeout()) {
        const err = new Error(
          `Expected ${loggableStatus} response, received ${response?.status}, timed out after ${limit}ms`,
          { cause: error },
        )
        await onError?.(err)
        throw err
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
}

const _waitPortFree = async (port: number, timeout = 1000) => {
  const start = Date.now()
  let wasBusy = false

  while (Date.now() - start < timeout) {
    try {
      // Try to connect to the port
      const socket = await Bun.connect({
        hostname: '127.0.0.1',
        port,
        socket: {},
      })

      // If we reach here, the port is STILL OCCUPIED.
      wasBusy = true
      socket.end() // Close our successful connection
      await new Promise((resolve) => setTimeout(resolve, 50)) // Wait and try again
    } catch {
      // If it throws, the port is likely free!
      if (wasBusy) {
        await new Promise((resolve) => setTimeout(resolve, 50)) // Wait a little for lucky chance
      }
      return
    }
  }
  throw new Error(`Port ${port} did not clear in time.`)
}

export const waitPortFree = async (port: number | number[], timeout = 1000) => {
  const ports = Array.isArray(port) ? port : [port]
  await Promise.all(
    ports.map(async (port) => {
      await _waitPortFree(port, timeout)
    }),
  )
}

export const throwOnHelperLogFnCalling = () => {
  if (process.env.THROW_ON_HELPER_LOG_FN_CALLING === 'true') {
    throw new Error('Please, remove helper log fn calling')
  }
}

export const throwOnBundlersLengthNot2 = (bundlers: string[]) => {
  if (bundlers.length !== 2) {
    throw new Error('bundlers length is not 2. Forgot uncommenting bundlers in the test file?')
  }
}

export const getDirFilesContent = async (dir: string): Promise<string> => {
  const files = await nodeFs.readdir(dir, { recursive: true })
  const isMapFile = (file: string) => file.endsWith('.map')
  const filesContent = await Promise.all(
    files.map(async (file) => {
      if (isMapFile(file)) {
        return ''
      }
      try {
        const contents = await Bun.file(nodePath.join(dir, file)).text()
        return contents
      } catch {
        return ''
      }
    }),
  )
  return filesContent.filter(Boolean).join('\n')
}
