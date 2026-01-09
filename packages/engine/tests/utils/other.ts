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

export const waitForResponseStatus = async (
  url: string,
  status: number,
  limit = 1000,
  onError?: (error: unknown) => any,
): Promise<Response> => {
  const startTime = Date.now()
  const isTimeout = () => Date.now() - startTime > limit
  let response
  while (true) {
    if (isTimeout()) {
      const text = await response?.text()
      const err = new Error(`Expected ${status} response, timed out after ${limit}ms, response: ${text}`)
      await onError?.(err)
      throw err
    }
    try {
      response = await fetch(url)
      if (response.status === status) {
        return response
      }
    } catch (error) {
      if (isTimeout()) {
        const err = new Error(`Expected ${status} response, timed out after ${limit}ms`, { cause: error })
        await onError?.(err)
        throw err
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
}

// export const waitForResponseStatus = async (
//   url: string,
//   status: number,
//   limit = 500,
//   interval = 10,
// ): Promise<{ response: Response | undefined; error: unknown; ok: boolean }> => {
//   const startTime = Date.now()
//   const isTimeout = () => Date.now() - startTime > limit
//   let response: Response | undefined
//   let error: unknown
//   while (true) {
//     if (isTimeout()) {
//       return { response, error, ok: false }
//     }
//     try {
//       response = await fetch(url)
//       if (response.status === status) {
//         return { response, error: undefined, ok: true }
//       }
//     } catch (e: unknown) {
//       error = e
//     }
//     await new Promise((resolve) => setTimeout(resolve, interval))
//   }
// }
