// vars
import { superstore } from '@point0/superstore'

export type POINT0_NODE_ENV = 'production' | 'development' | 'test'
export type POINT0_TARGET = 'client' | 'server'
export type POINT0_CLIENT_PLATFORM = 'browser' | 'react-native'

type AnyAnvVars = Record<string, string | undefined | boolean | number | null>

export type EnvVars<TVars = any> = IsAny<TVars> extends true ? AnyAnvVars : TVars

export const getEnvVars = (): EnvVars => {
  const env = Object.create(null)
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (typeof process !== 'undefined' && process.env) {
    Object.assign(env, process.env)
  }
  try {
    Object.assign(env, {
      // NODE_ENV: process.env.NODE_ENV,
      POINT0_TARGET: process.env.POINT0_TARGET,
      POINT0_SCOPE: process.env.POINT0_SCOPE,
      POINT0_BUILT: process.env.POINT0_BUILT,
      // in case if this vars was dfined by compiler
    })
  } catch {
    // do nothing
  }
  return env as EnvVars
}

const envVars = getEnvVars()

// const isFakeClient = (): boolean | undefined => {
//   return superstore.isFakeClient()
// }
// const isRealServerOverFakeClient = (): boolean | undefined => {
//   return superStore.isRealServerOverFakeClient()
// }
const isFakeClientOrRealServerOverFakeClient = (): 'fakeClient' | 'realServerOverFakeClient' | undefined => {
  const superstore = (globalThis as any).__POINT0_SUPER_STORE_INSTANCE__ as SuperStore
  const fakeClient = superstore.isFakeClient()
  const realServerOverFakeClient = superstore.isRealServerOverFakeClient()
  if (fakeClient === true && realServerOverFakeClient === false) {
    return 'fakeClient'
  }
  if (fakeClient === true && realServerOverFakeClient === true) {
    return 'realServerOverFakeClient'
  }
  return undefined
}
// target

export const isTargetClient = (): boolean => {
  const fakeClientOrRealServerOverFakeClient = isFakeClientOrRealServerOverFakeClient()
  if (fakeClientOrRealServerOverFakeClient === 'fakeClient') {
    return true
  }
  if (fakeClientOrRealServerOverFakeClient === 'realServerOverFakeClient') {
    return false
  }

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

// in server it becomes const true, in client it becomes const false
const isTargetServer = (): boolean => {
  return !isTargetClient()
}

const getTargetName = (): 'client' | 'server' => {
  return isTargetClient() ? 'client' : 'server'
}

const isTargetSsr = (): false | true | 'prepass' | 'final' => {
  // const ssr = SuperStore.getWeak<'prepass' | 'final' | undefined>('__POINT0_SSR_PHASE__')
  if (isTargetClient()) {
    return false
  }
  const getSsrPhase: unknown = (globalThis as any).__POINT0_GET_SSR_PHASE__
  // TODO: maybe check import.meta.env.SSR ot something like vite provides? We do not need it for point0, so I think it does not needed
  if (typeof getSsrPhase !== 'function') {
    return false
  }
  const ssrPhase = getSsrPhase()
  if (!ssrPhase) {
    return false
  }
  if (typeof ssrPhase === 'string') {
    if (ssrPhase === 'prepass' || ssrPhase === 'final') {
      return ssrPhase
    }
    throw new Error(`Invalid SSR phase: ${ssrPhase}`)
  }
  return true
}

function targetDefineUniversal<TServerResult>(options: { server: TServerResult }): TServerResult | undefined
function targetDefineUniversal<TClientResult>(options: { client: TClientResult }): TClientResult | undefined
function targetDefineUniversal<TClientResult, TServerResult>(options: {
  client: TClientResult
  server: TServerResult
}): TClientResult | TServerResult
function targetDefineUniversal<TClientResult, TServerResult>(options: {
  client?: TClientResult
  server?: TServerResult
}): TClientResult | TServerResult | undefined {
  if (isTargetClient()) {
    return options.client
  }
  return options.server
}

type TargetDefineUnsafe = {
  server: <T>(value: T) => T
  client: <T>(value: T) => T
}
type TargetDefineWithHelpers = typeof targetDefineUniversal & {
  server: <T>(value: T) => T | undefined
  client: <T>(value: T) => T | undefined
  unsafe: TargetDefineUnsafe
}
const defineServer = (value: any) => {
  if (isTargetClient()) {
    return undefined
  }
  return value
}
const defineClient = (value: any) => {
  if (isTargetServer()) {
    return undefined
  }
  return value
}
const targetDefineUnsafe = {
  server: defineServer,
  client: defineClient,
}
const targetDefine = Object.assign(targetDefineUniversal, {
  server: defineServer,
  client: defineClient,
  unsafe: targetDefineUnsafe,
})

type TargetIsClient = {
  readonly client: true
  readonly server: false
  readonly ssr: false
}
type TargetIsServer = {
  readonly client: false
  readonly server: true
  readonly ssr: boolean | 'prepass' | 'final'
}
const targetIs = Object.defineProperties(
  {},
  {
    client: { get: isTargetClient },
    server: { get: isTargetServer },
    ssr: { get: isTargetSsr },
  },
) as TargetIsClient | TargetIsServer

export type EnvTargetClient = {
  readonly name: 'client'
  readonly is: TargetIsClient
  readonly define: TargetDefineWithHelpers
}

export type EnvTargetServer = {
  readonly name: 'server'
  readonly is: TargetIsServer
  readonly define: TargetDefineWithHelpers
}

export type EnvTarget = EnvTargetClient | EnvTargetServer

export const envTarget = Object.defineProperties(
  {
    is: targetIs,
    define: targetDefine,
  },
  {
    name: { get: getTargetName },
  },
) as EnvTarget

// scope

const getScopeName = (): string => {
  const scopeName = envVars.POINT0_SCOPE
  if (!scopeName || typeof scopeName !== 'string') {
    throw new Error('POINT0_SCOPE is not set in env vars')
  }
  return scopeName
}

type ScopeDefineUnsafe<TScopes extends string = string> = Record<TScopes, <T>(value: T) => T>
type ScopeDefineWithHelpers<TScopes extends string = string> = string extends TScopes
  ? {
      <TResult>(options: Record<string, TResult>): TResult | undefined
      <TResult>(options: Partial<Record<string, TResult>>): TResult | undefined
    } & Record<string, <T>(value: T) => T | undefined> & {
        unsafe: Record<string, <T>(value: T) => T>
      }
  : {
      <TResult>(options: Record<TScopes, TResult>): TResult
      <TResult>(options: Partial<Record<TScopes, TResult>>): TResult | undefined
    } & Record<TScopes, <T>(value: T) => T | undefined> & {
        unsafe: ScopeDefineUnsafe<TScopes>
      }

function scopeDefineUniversal(options: Record<string, any>) {
  return options[getScopeName()]
}

const scopeDefineSpecific = (scope: string) => (value: any) => {
  if (getScopeName() !== scope) {
    return undefined
  }
  return value
}
const scopeDefineUnsafe = new Proxy(
  {},
  {
    get(_, prop: string) {
      return scopeDefineSpecific(prop)
    },
  },
)

const scopeDefine = new Proxy(scopeDefineUniversal, {
  apply(target, _thisArg, args: Parameters<typeof scopeDefineUniversal>) {
    return scopeDefineUniversal(...args)
  },
  get(target, prop: string, receiver: any) {
    if (Object.prototype.hasOwnProperty.call(scopeDefineUniversal, prop)) {
      return Reflect.get(scopeDefineUniversal, prop, receiver)
    }
    if (prop === 'unsafe') {
      return scopeDefineUnsafe
    }
    return scopeDefineSpecific(prop)
  },
})

const scopeIs = new Proxy(
  {},
  {
    get(_, prop: string) {
      return getScopeName() === prop
    },
  },
)

// export type EnvScope<TScopes extends string = string> = {
//   readonly name: TScopes
//   readonly is: EnvScopeIs<TScopes>
//   readonly define: ScopeDefineWithHelpers<TScopes>
// }

export type EnvScope<TScopes extends string = string> = string extends TScopes
  ? {
      readonly name: string
      readonly is: Record<string, boolean>
      readonly define: ScopeDefineWithHelpers<string>
    }
  : {
      [K in TScopes]: {
        readonly name: K
        readonly is: {
          [P in TScopes]: P extends K ? true : false
        }
        readonly define: ScopeDefineWithHelpers<TScopes>
      }
    }[TScopes]

const envScope = Object.defineProperty(
  {
    is: scopeIs,
    define: scopeDefine,
  },
  'name',
  {
    get: getScopeName,
  },
) as never as EnvScope

// mode

export type EnvMode =
  | {
      readonly name: 'production'
      readonly is: {
        readonly production: true
        readonly development: false
        readonly test: false
      }
    }
  | {
      readonly name: 'development'
      readonly is: {
        readonly production: false
        readonly development: true
        readonly test: false
      }
    }
  | {
      readonly name: 'test'
      readonly is: {
        readonly production: false
        readonly development: false
        readonly test: true
      }
    }
  | {
      readonly name: Exclude<string, 'production' | 'development' | 'test'>
      readonly is: {
        readonly production: false
        readonly development: false
        readonly test: false
      }
    }
const envMode = {
  name: envVars.NODE_ENV,
  is: {
    production: envVars.NODE_ENV === 'production',
    development: envVars.NODE_ENV === 'development',
    test: envVars.NODE_ENV === 'test',
  },
} as never as EnvMode

// final

type IsAny<T> = 0 extends 1 & T ? true : false
export type Env<TVars = any, TScope extends string = string> = {
  readonly mode: EnvMode
  readonly vars: Readonly<EnvVars<TVars>>
  readonly target: EnvTarget
  readonly scope: EnvScope<IsAny<TScope> extends true ? string : TScope>
  readonly built: boolean
}

export const env: Env = {
  mode: envMode,
  vars: envVars,
  target: envTarget,
  scope: envScope,
  built: false, // will be overridden by compiler in build phase
}
