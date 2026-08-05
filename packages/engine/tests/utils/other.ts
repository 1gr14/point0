import nodeFs from 'node:fs/promises'
import nodePath from 'node:path'

export const waitUntilFileChanged = async (file: Bun.BunFile | string, limit = 1000, interval = 10): Promise<void> => {
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

/**
 * Run one teardown step against a wall clock: if it overruns, name it and move on.
 *
 * Teardown here is a chain of bare `await`s on things that can wedge — `page.close()`, `browser.close()`, `killPort` —
 * and a wedge in any of them is SILENT. Bun charges the wait to the file's `afterEach`/`afterAll` budget, so a file
 * whose assertions had all passed dies three minutes later as "a beforeEach/afterEach hook timed out", naming nothing
 * and taking the release run with it (three in a row on `socket-browser.e2e`, dev/backlog/socket-linux-ci.md). A
 * teardown must never be able to fail a green file, and it must never fail anonymously.
 *
 * The step is ABANDONED, not cancelled — nothing here can cancel a hung CDP call. That is the right trade: the process
 * is at its end (the OS reaps what is left), CI runners are ephemeral, and the assertions already ran.
 */
export const teardownStep = async (label: string, step: () => Promise<unknown>, timeoutMs = 15_000): Promise<void> => {
  const TIMED_OUT = Symbol('teardown-timed-out')
  let timer: ReturnType<typeof setTimeout> | undefined
  const deadline = new Promise<typeof TIMED_OUT>((resolve) => {
    timer = setTimeout(() => resolve(TIMED_OUT), timeoutMs)
  })
  // A teardown step's own rejection is not a signal (closing a browser that is already gone throws), but it must be
  // HANDLED here: an abandoned step that rejects later would otherwise surface as an unhandled rejection long after the
  // test moved on, in an unrelated file.
  const settled = step().then(
    () => undefined,
    () => undefined,
  )
  const result = await Promise.race([settled, deadline])
  if (timer) clearTimeout(timer)
  if (result === TIMED_OUT) {
    console.warn(`[teardown] "${label}" did not finish within ${timeoutMs}ms — abandoned, it may leak a process`)
  }
}

export const throwOnHelperLogFnCalling = () => {
  if (process.env.THROW_ON_HELPER_LOG_FN_CALLING === 'true') {
    throw new Error('Please, remove helper log fn calling')
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
