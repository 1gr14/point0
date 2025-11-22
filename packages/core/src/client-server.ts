export class ClientServerHelpers {
  // in client it becomes const true, in server it becomes const false
  static isClient = ((): boolean => {
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
  static isServer = ((): boolean => {
    return !this.isClient
  })()

  // in client callback will be reaplaced with () => throw new Error('Call server function from client')
  static callServer<T>(callback: () => T): T | undefined {
    if (this.isServer) {
      return callback()
    }
    return undefined
  }

  // in server callback will be reaplaced with () => throw new Error('Call client function from server')
  static callClient<T>(callback: () => T): T | undefined {
    if (this.isClient) {
      return callback()
    }
    return undefined
  }

  // in client callback will be reaplaced with () => throw new Error('Call server function from client')
  // in server callback will be reaplaced with () => throw new Error('Call client function from server')
  static callClientElseServer<TClientResult, TServerResult>(
    clientCallback: () => TClientResult,
    serverCallback: () => TServerResult,
  ): TClientResult | TServerResult {
    if (this.isClient) {
      return clientCallback()
    }
    return serverCallback()
  }

  // in client value will be replaced with undefined
  static constServer<T>(value: T): T | undefined {
    return value
  }

  // in server value will be replaced with undefined
  static constClient<T>(value: T): T | undefined {
    return value
  }

  // in client value will be replaced with undefined, but typed like it is always persisted
  static constServerUnsafe<T>(value: T): T {
    return value
  }

  // in server value will be replaced with undefined, but typed like it is always persisted
  static constClientUnsafe<T>(value: T): T {
    return value
  }

  // in client value will be replaced with undefined
  // in server value will be replaced with undefined
  static constClientElseServer<TClientResult, TServerResult>(
    constClient: TClientResult,
    constServer: TServerResult,
  ): TClientResult | TServerResult {
    if (this.isClient) {
      return constClient
    }
    return constServer
  }
}
