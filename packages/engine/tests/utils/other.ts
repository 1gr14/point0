export const waitUntilFileChanged = async (file: Bun.BunFile | string, limit = 500, interval = 10): Promise<void> => {
  const startTime = Date.now()
  const bunFile = typeof file === 'string' ? Bun.file(file) : file
  const stats = await bunFile.stat()
  const currentTimestamp = stats.mtimeMs
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

export const waitForResponse = async (
  url: string,
  status: number | number[] | 'ok' | 'bad',
  limit = 3000,
  onError?: (error: unknown) => any,
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
  let response
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
