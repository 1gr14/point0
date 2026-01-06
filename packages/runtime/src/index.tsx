const isClient = ((): boolean => {
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
const isServer = ((): boolean => {
  return !isClient
})()

const target = isClient ? 'client' : 'server'

const isSsr = (): false | true | 'prepass' | 'final' => {
  // const ssr = SuperStore.getWeak<'prepass' | 'final' | undefined>('__POINT0_SSR_PHASE__')
  const getSsrPhase: unknown = (globalThis as any).__GET_SSR_PHASE__
  // TODO: maybe check import.meta.env.SSR ot something like vite provides? We do not need it for point0, so I think it does not needed
  if (typeof getSsrPhase !== 'function') {
    return false
  }
  const ssrPhase = getSsrPhase()
  if (!ssrPhase) {
    return false
  }
  return ssrPhase
}

// in client callback will be reaplaced with () => throw new Error('Call server function from client')
function callServer<T>(callback: () => T): T | undefined {
  if (isServer) {
    return callback()
  }
  return undefined
}

// in server callback will be reaplaced with () => throw new Error('Call client function from server')
function callClient<T>(callback: () => T): T | undefined {
  if (isClient) {
    return callback()
  }
  return undefined
}

// Overload: only server
function callUniversal<TServerResult>(options: { server: () => TServerResult }): TServerResult | undefined
// Overload: only client
function callUniversal<TClientResult>(options: { client: () => TClientResult }): TClientResult | undefined
// Overload: both client and server
function callUniversal<TClientResult, TServerResult>(options: {
  client: () => TClientResult
  server: () => TServerResult
}): TClientResult | TServerResult
// Implementation
function callUniversal<TClientResult, TServerResult>(options: {
  client?: () => TClientResult
  server?: () => TServerResult
}): TClientResult | TServerResult | undefined {
  if (isClient) {
    return options.client?.()
  }
  return options.server?.()
}

// in client value will be replaced with undefined
function defineServer<T>(value: T): T | undefined {
  return value
}

// in server value will be replaced with undefined
function defineClient<T>(value: T): T | undefined {
  return value
}

// Overload: only server
function defineUniversal<TServerResult>(options: { server: TServerResult }): TServerResult | undefined
// Overload: only client
function defineUniversal<TClientResult>(options: { client: TClientResult }): TClientResult | undefined
// Overload: both client and server
function defineUniversal<TClientResult, TServerResult>(options: {
  client: TClientResult
  server: TServerResult
}): TClientResult | TServerResult
// Implementation
function defineUniversal<TClientResult, TServerResult>(options: {
  client?: TClientResult
  server?: TServerResult
}): TClientResult | TServerResult | undefined {
  if (isClient) {
    return options.client
  }
  return options.server
}

type RuntimeIsClient = {
  client: true
  server: false
  ssr: false
}
type RuntimeIsServer = {
  client: false
  server: true
  ssr: boolean | 'prepass' | 'final'
}

const is = Object.defineProperty(
  {
    client: isClient,
    server: isServer,
  },
  'ssr',
  {
    get: isSsr,
  },
) as RuntimeIsClient | RuntimeIsServer

type CallWithHelpers = typeof callUniversal & {
  server: typeof callServer
  client: typeof callClient
}

type DefineWithHelpers = typeof defineUniversal & {
  server: typeof defineServer
  client: typeof defineClient
}

export type RuntimeClient = {
  target: 'client'
  is: RuntimeIsClient
  call: CallWithHelpers
  define: DefineWithHelpers
}

export type RuntimeServer = {
  target: 'server'
  is: RuntimeIsServer
  call: CallWithHelpers
  define: DefineWithHelpers
}

export type Runtime = RuntimeClient | RuntimeServer

export const runtime = {
  target,
  is,
  call: Object.assign(callUniversal, {
    server: callServer,
    client: callClient,
  }),
  define: Object.assign(defineUniversal, {
    server: defineServer,
    client: defineClient,
  }),
} as Runtime
