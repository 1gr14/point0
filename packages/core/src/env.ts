import type { EnvVars, NormalNodeEnv } from './env.types.js'
import { superstore } from './super-store.js'

export type * from './env.types.js'

export const normalNodeEnvs: NormalNodeEnv[] = ['production', 'development', 'test']

// vars

export const getEnvVars = (): EnvVars => {
  const env = Object.create(null)
  const processEnvHolder = (() => {
    if (typeof globalThis !== 'undefined' && (globalThis as any).__POINT0_ENV__) {
      return (globalThis as any).__POINT0_ENV__
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (typeof process !== 'undefined' && process.env) {
      return process.env
    }
    return {}
  })()
  if (processEnvHolder) {
    Object.assign(env, processEnvHolder)
  }
  Object.assign(env, {
    NODE_ENV: processEnvHolder?.NODE_ENV,
    SIDE: processEnvHolder?.POINT0_SIDE,
    POINT0_SCOPE: processEnvHolder?.POINT0_SCOPE,
    POINT0_BUILT: processEnvHolder?.POINT0_BUILT,
    // in case if this vars was dfined by compiler
  })
  return env as EnvVars
}

// side

const _isSideClient = (): boolean => {
  // Browser-like (DOM available)
  if (typeof window !== 'undefined' && typeof document !== 'undefined') return true

  // React Native
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') return true

  // Electron renderer process
  if (typeof process !== 'undefined' && (process as any).type === 'renderer') return true

  return false // Node.js, Bun, Deno, or other server runtimes
}

const isSideClient = (): boolean => {
  if (superstore.isFakeClient()) {
    return true
  }
  if (process.env.POINT0_SIDE) {
    return process.env.POINT0_SIDE === 'client'
  }
  return _isSideClient()
}

// in server it becomes const true, in client it becomes const false
const isSideServer = (): boolean => {
  return !isSideClient()
}

const getSideName = (): 'client' | 'server' => {
  return isSideClient() ? 'client' : 'server'
}

const isSideSsr = (): false | true | 'prepass' | 'final' => {
  // const ssr = SuperStore.getWeak<'prepass' | 'final' | undefined>('__POINT0_SSR_PHASE__')
  if (isSideClient()) {
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

function sideDefineUniversal<TServerResult>(options: { server: TServerResult }): TServerResult | undefined
function sideDefineUniversal<TClientResult>(options: { client: TClientResult }): TClientResult | undefined
function sideDefineUniversal<TClientResult, TServerResult>(options: {
  client: TClientResult
  server: TServerResult
}): TClientResult | TServerResult
function sideDefineUniversal<TClientResult, TServerResult>(options: {
  client?: TClientResult
  server?: TServerResult
}): TClientResult | TServerResult | undefined {
  if (isSideClient()) {
    return options.client
  }
  return options.server
}

type SideDefineUnsafe = {
  server: <T>(value: T) => T
  client: <T>(value: T) => T
}
type SideDefineWithHelpers = typeof sideDefineUniversal & {
  server: <T>(value: T) => T | undefined
  client: <T>(value: T) => T | undefined
  unsafe: SideDefineUnsafe
}
const defineServer = (value: any) => {
  if (isSideClient()) {
    return undefined
  }
  return value
}
const defineClient = (value: any) => {
  if (isSideServer()) {
    return undefined
  }
  return value
}
const sideDefineUnsafe = {
  server: defineServer,
  client: defineClient,
}
const sideDefine = Object.assign(sideDefineUniversal, {
  server: defineServer,
  client: defineClient,
  unsafe: sideDefineUnsafe,
})

type SideIsClient = {
  readonly client: true
  readonly server: false
  readonly ssr: false
}
type SideIsServer = {
  readonly client: false
  readonly server: true
  readonly ssr: boolean | 'prepass' | 'final'
}
const sideIs = Object.defineProperties(
  {},
  {
    client: { get: isSideClient },
    server: { get: isSideServer },
    ssr: { get: isSideSsr },
  },
) as SideIsClient | SideIsServer

export type EnvSideClient = {
  readonly name: 'client'
  readonly is: SideIsClient
  readonly define: SideDefineWithHelpers
}

export type EnvSideServer = {
  readonly name: 'server'
  readonly is: SideIsServer
  readonly define: SideDefineWithHelpers
}

export type EnvSide = EnvSideClient | EnvSideServer

export const envSide = Object.defineProperties(
  {
    is: sideIs,
    define: sideDefine,
  },
  {
    name: { get: getSideName },
  },
) as EnvSide

// scope

const getScopeName = (): string => {
  const scopeName = getEnvVars().POINT0_SCOPE
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
const envModeIs = Object.defineProperties(
  {},
  {
    production: { get: () => getEnvVars().NODE_ENV === 'production' },
    development: { get: () => getEnvVars().NODE_ENV === 'development' },
    test: { get: () => getEnvVars().NODE_ENV === 'test' },
  },
)
const envMode = Object.defineProperties(
  {
    is: envModeIs,
  },
  {
    name: { get: () => getEnvVars().NODE_ENV },
  },
) as never as EnvMode

// final

type IsAny<T> = 0 extends 1 & T ? true : false
export type Env<TVars = any, TScope extends string = string> = {
  readonly mode: EnvMode
  readonly vars: Readonly<EnvVars<TVars>>
  readonly side: EnvSide
  readonly scope: EnvScope<IsAny<TScope> extends true ? string : TScope>
  readonly built: boolean
}

export const env: Env = Object.defineProperties(
  {
    mode: envMode,
    side: envSide,
    scope: envScope,
    built: false, // will be overridden by compiler in build phase
  },
  {
    vars: { get: getEnvVars },
  },
) as never as Env

export const _point0_env = env
