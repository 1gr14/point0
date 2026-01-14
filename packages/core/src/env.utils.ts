export const _isTargetClient = (): boolean => {
  // Browser-like (DOM available)
  if (typeof window !== 'undefined' && typeof document !== 'undefined') return true

  // React Native
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') return true

  // Electron renderer process
  if (typeof process !== 'undefined' && (process as any).type === 'renderer') return true

  // TODO: Electron main process in fact is client also (Yes it is client in point0 terminology, becouse it can send requests to server!)
  return false // Node.js, Bun, Deno, or other server runtimes
}
