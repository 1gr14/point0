// in client it becomes const true, in server it becomes const false
export const isClient = ((): boolean => {
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
})()

// in server it becomes const true, in client it becomes const false
export const isServer = ((): boolean => {
  return !isClient
})()

// in client callback will be reaplaced with () => throw new Error('Call server function from client')
export const callServer = <T>(callback: () => T): T | undefined => {
  if (isServer) {
    return callback()
  }
  return undefined
}

// in server callback will be reaplaced with () => throw new Error('Call client function from server')
export const callClient = <T>(callback: () => T): T | undefined => {
  if (isClient) {
    return callback()
  }
  return undefined
}

// in client callback will be reaplaced with () => throw new Error('Call server function from client')
// in server callback will be reaplaced with () => throw new Error('Call client function from server')
export const callClientElseServer = <TClientResult, TServerResult>(
  clientCallback: () => TClientResult,
  serverCallback: () => TServerResult,
): TClientResult | TServerResult => {
  if (isClient) {
    return clientCallback()
  }
  return serverCallback()
}

// in client value will be replaced with undefined
export const constServer = <T>(value: T): T | undefined => {
  return value
}

// in server value will be replaced with undefined
export const constClient = <T>(value: T): T | undefined => {
  return value
}

// in client value will be replaced with undefined
// in server value will be replaced with undefined
export const constClientElseServer = <TClientResult, TServerResult>(
  constClient: TClientResult,
  constServer: TServerResult,
): TClientResult | TServerResult => {
  if (isClient) {
    return constClient
  }
  return constServer
}
