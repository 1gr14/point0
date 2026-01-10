export const sometimesOk = async <T>(triesCount: number, fn: () => Promise<T>): Promise<T> => {
  let tryIndex = 0
  while (true) {
    try {
      return await fn()
    } catch (error) {
      if (tryIndex === triesCount - 1) {
        throw error
      }
      tryIndex++
    }
  }
}
