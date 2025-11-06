export const isClient = (): boolean => {
  // Browser-like (DOM available)
  if (typeof window !== 'undefined' && typeof document !== 'undefined') return true

  // React Native
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.userAgent === 'string' &&
    /reactnative/i.test(navigator.userAgent)
  )
    return true

  // Electron renderer process
  if (typeof process !== 'undefined' && (process as any).type === 'renderer') return true

  return false // Node.js, Bun, Deno, or other server runtimes
}

export const itIsClient = isClient()

export const isServer = (): boolean => {
  return !isClient()
}

export const isIsServer = isServer()

export const ifServer = <T>(callback: () => T): T | undefined => {
  if (isServer()) {
    return callback()
  }
  return undefined
}

export const ifClient = <T>(callback: () => T): T | undefined => {
  if (isClient()) {
    return callback()
  }
  return undefined
}

export const ifClientElseServer = <TClientResult, TServerResult>(
  clientCallback: () => TClientResult,
  serverCallback: () => TServerResult,
): TClientResult | TServerResult => {
  if (isClient()) {
    return clientCallback()
  }
  return serverCallback()
}
