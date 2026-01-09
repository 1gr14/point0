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
  status: number | number[] | 'ok' | 'bad' | undefined = undefined,
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
      : typeof status === 'undefined'
        ? undefined
        : status.toString()
  const statuses = Array.isArray(status)
    ? status
    : typeof status === 'string'
      ? status === 'ok'
        ? Array.from({ length: 100 }, (_, i) => 200 + i)
        : Array.from({ length: 200 }, (_, i) => 400 + i)
      : typeof status === 'undefined'
        ? undefined
        : [status]
  let response
  while (true) {
    if (isTimeout()) {
      const text = await response?.text()
      const err = new Error(`Expected ${loggableStatus} response, timed out after ${limit}ms, response: ${text}`)
      await onError?.(err)
      throw err
    }
    try {
      response = await fetch(url)
      if (!statuses || statuses.includes(response.status)) {
        return response
      }
    } catch (error) {
      if (isTimeout()) {
        const err = new Error(`Expected ${loggableStatus} response, timed out after ${limit}ms`, { cause: error })
        await onError?.(err)
        throw err
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
}
