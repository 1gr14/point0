import type { EnvVars, NormalizedNodeEnv } from './env.types.js'
import { superstore } from './super-store.js'
import type { IsAny } from './types.js'

export type * from './env.types.js'

export const normalNodeEnvs: NormalizedNodeEnv[] = ['production', 'development', 'test']

// vars
export const getEnvVars = (): EnvVars => {
  const env = Object.create(null)
  const processEnvHolder = (() => {
    if (typeof globalThis !== 'undefined' && isSideClient()) {
      const point0EnvVars = (globalThis as unknown as Record<string, unknown>).__POINT0_ENV_VARS__
      const point0EnvConsts = (globalThis as unknown as Record<string, unknown>).__POINT0_ENV_CONSTS__
      if (point0EnvVars || point0EnvConsts) {
        return {
          ...(point0EnvVars ?? {}),
          ...(point0EnvConsts ?? {}),
        }
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (typeof process !== 'undefined' && process.env) {
      return process.env
    }
    return {}
  })()
  Object.assign(env, processEnvHolder)
  Object.assign(env, {
    NODE_ENV: processEnvHolder.NODE_ENV,
    SIDE: processEnvHolder.POINT0_SIDE,
    POINT0_SCOPE: processEnvHolder.POINT0_SCOPE,
    POINT0_BUILT: processEnvHolder.POINT0_BUILT,
    // in case if this vars was dfined by compiler
  })
  return env as EnvVars
}

// side

const _isSideClient = (): boolean => {
  // Browser-like (DOM available)
  if (typeof window !== 'undefined' && typeof document !== 'undefined') return true

  // React Native
  if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') return true

  // Electron renderer process
  if (typeof process !== 'undefined' && (process as unknown as { type?: string }).type === 'renderer') return true

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

const isSideSsr = (): boolean => {
  if (isSideClient()) {
    return false
  }
  return isSsrInProgress.get()
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
const defineServer = <T>(value: T): T | undefined => {
  if (isSideClient()) {
    return undefined
  }
  return value
}
const defineClient = <T>(value: T): T | undefined => {
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
  readonly ssr: boolean
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

function scopeDefineUniversal(options: Record<string, unknown>) {
  return options[getScopeName()]
}

const scopeDefineSpecific =
  (scope: string) =>
  <T>(value: T): T | undefined => {
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
  apply(_target, _thisArg, args: Parameters<typeof scopeDefineUniversal>) {
    return scopeDefineUniversal(...args)
  },
  get(_target, prop: string, receiver: unknown) {
    if (Object.hasOwn(scopeDefineUniversal, prop)) {
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

// runtime

export type EnvRuntimeName = 'browser' | 'reactNative' | 'nodejs' | 'bun' | 'deno' | 'worker'
type RuntimeWithUnknown<T extends string, TAllowUnknown extends boolean> =
  | T
  | (TAllowUnknown extends true ? 'unknown' : never)
type RuntimeDefineUnsafe<
  TRuntime extends EnvRuntimeName = EnvRuntimeName,
  TAllowUnknown extends boolean = true,
> = Record<RuntimeWithUnknown<TRuntime, TAllowUnknown>, <T>(value: T) => T>
type RuntimeDefineWithHelpers<
  TRuntime extends EnvRuntimeName = EnvRuntimeName,
  TAllowUnknown extends boolean = true,
> = string extends TRuntime
  ? {
      <TResult>(options: Record<string, TResult>): TResult | undefined
      <TResult>(options: Partial<Record<string, TResult>>): TResult | undefined
    } & Record<string, <T>(value: T) => T | undefined> & {
        unsafe: Record<string, <T>(value: T) => T>
      }
  : {
      <TResult>(options: Record<RuntimeWithUnknown<TRuntime, TAllowUnknown>, TResult>): TResult
      <TResult>(options: Partial<Record<RuntimeWithUnknown<TRuntime, TAllowUnknown>, TResult>>): TResult | undefined
    } & Record<RuntimeWithUnknown<TRuntime, TAllowUnknown>, <T>(value: T) => T | undefined> & {
        unsafe: RuntimeDefineUnsafe<TRuntime, TAllowUnknown>
      }
type EnvRuntimeKnown<TRuntime extends EnvRuntimeName | undefined> = Exclude<TRuntime, undefined> & EnvRuntimeName
type EnvRuntimeWide = {
  readonly name: EnvRuntimeName | undefined
  readonly is: Record<EnvRuntimeName | 'unknown', boolean>
  readonly define: RuntimeDefineWithHelpers<EnvRuntimeName>
}
type EnvRuntimeStrict<TRuntime extends EnvRuntimeName | undefined> =
  | {
      [K in EnvRuntimeKnown<TRuntime>]: {
        readonly name: K
        readonly is: undefined extends TRuntime
          ? {
              [P in EnvRuntimeKnown<TRuntime>]: P extends K ? true : false
            } & {
              readonly unknown: false
            }
          : {
              [P in EnvRuntimeKnown<TRuntime>]: P extends K ? true : false
            }
        readonly define: RuntimeDefineWithHelpers<EnvRuntimeKnown<TRuntime>, undefined extends TRuntime ? true : false>
      }
    }[EnvRuntimeKnown<TRuntime>]
  | (undefined extends TRuntime
      ? {
          readonly name: undefined
          readonly is: {
            [P in EnvRuntimeKnown<TRuntime>]: false
          } & {
            readonly unknown: true
          }
          readonly define: RuntimeDefineWithHelpers<EnvRuntimeKnown<TRuntime>, true>
        }
      : never)
export type EnvRuntime<TRuntime extends EnvRuntimeName | undefined = EnvRuntimeName | undefined> =
  EnvRuntimeName extends EnvRuntimeKnown<TRuntime> ? EnvRuntimeWide : EnvRuntimeStrict<TRuntime>

const getRuntimeName = (): EnvRuntimeName | undefined => {
  const fakeClient = superstore.getFakeClient()
  if (fakeClient?.runtime) {
    return fakeClient.runtime
  }
  if (process.env.POINT0_RUNTIME) {
    return process.env.POINT0_RUNTIME as EnvRuntimeName
  }
  if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
    return 'reactNative'
  }
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    return 'browser'
  }

  const workerGlobalScope = (globalThis as any).WorkerGlobalScope
  if (typeof workerGlobalScope !== 'undefined' && typeof self !== 'undefined' && self instanceof workerGlobalScope) {
    return 'worker'
  }
  if (typeof (globalThis as unknown as Record<string, unknown>).Bun !== 'undefined') {
    return 'bun'
  }
  if (typeof (globalThis as unknown as Record<string, unknown>).Deno !== 'undefined') {
    return 'deno'
  }
  if (typeof process !== 'undefined' && (process as unknown as { versions?: { node?: string } }).versions?.node) {
    return 'nodejs'
  }
  return undefined
}

const getRuntimeKey = (): EnvRuntimeName | 'unknown' => {
  const runtime = getRuntimeName()
  if (!runtime) {
    return 'unknown'
  }
  return runtime
}

function runtimeDefineUniversal(options: Record<string, unknown>) {
  return options[getRuntimeKey()]
}

const runtimeDefineSpecific =
  (runtime: string) =>
  <T>(value: T): T | undefined => {
    if (getRuntimeKey() !== runtime) {
      return undefined
    }
    return value
  }

const runtimeDefineUnsafe = new Proxy(
  {},
  {
    get(_, prop: string) {
      return runtimeDefineSpecific(prop)
    },
  },
)

const runtimeDefine = new Proxy(runtimeDefineUniversal, {
  apply(_target, _thisArg, args: Parameters<typeof runtimeDefineUniversal>) {
    return runtimeDefineUniversal(...args)
  },
  get(_target, prop: string, receiver: unknown) {
    if (Object.hasOwn(runtimeDefineUniversal, prop)) {
      return Reflect.get(runtimeDefineUniversal, prop, receiver)
    }
    if (prop === 'unsafe') {
      return runtimeDefineUnsafe
    }
    return runtimeDefineSpecific(prop)
  },
})

const envRuntimeIs = Object.defineProperties(
  {},
  {
    browser: { get: () => getRuntimeName() === 'browser' },
    reactNative: { get: () => getRuntimeName() === 'reactNative' },
    nodejs: { get: () => getRuntimeName() === 'nodejs' },
    bun: { get: () => getRuntimeName() === 'bun' },
    deno: { get: () => getRuntimeName() === 'deno' },
    worker: { get: () => getRuntimeName() === 'worker' },
    unknown: { get: () => getRuntimeName() === undefined },
  },
)
const envRuntime = Object.defineProperties(
  {
    is: envRuntimeIs,
    define: runtimeDefine,
  },
  {
    name: { get: getRuntimeName },
  },
) as never as EnvRuntime

// os

export type EnvOsName = 'ios' | 'android' | 'linux' | 'mac' | 'windows'
type OsWithUnknown<T extends string, TAllowUnknown extends boolean> =
  | T
  | (TAllowUnknown extends true ? 'unknown' : never)
type OsDefineUnsafe<TOs extends EnvOsName = EnvOsName, TAllowUnknown extends boolean = true> = Record<
  OsWithUnknown<TOs, TAllowUnknown>,
  <T>(value: T) => T
>
type OsDefineWithHelpers<TOs extends EnvOsName = EnvOsName, TAllowUnknown extends boolean = true> = string extends TOs
  ? {
      <TResult>(options: Record<string, TResult>): TResult | undefined
      <TResult>(options: Partial<Record<string, TResult>>): TResult | undefined
    } & Record<string, <T>(value: T) => T | undefined> & {
        unsafe: Record<string, <T>(value: T) => T>
      }
  : {
      <TResult>(options: Record<OsWithUnknown<TOs, TAllowUnknown>, TResult>): TResult
      <TResult>(options: Partial<Record<OsWithUnknown<TOs, TAllowUnknown>, TResult>>): TResult | undefined
    } & Record<OsWithUnknown<TOs, TAllowUnknown>, <T>(value: T) => T | undefined> & {
        unsafe: OsDefineUnsafe<TOs, TAllowUnknown>
      }
type EnvOsKnown<TOs extends EnvOsName | undefined> = Exclude<TOs, undefined> & EnvOsName
type EnvOsWide = {
  readonly name: EnvOsName | undefined
  readonly is: Record<EnvOsName | 'unknown', boolean>
  readonly define: OsDefineWithHelpers<EnvOsName>
}
type EnvOsStrict<TOs extends EnvOsName | undefined> =
  | {
      [K in EnvOsKnown<TOs>]: {
        readonly name: K
        readonly is: undefined extends TOs
          ? {
              [P in EnvOsKnown<TOs>]: P extends K ? true : false
            } & {
              readonly unknown: false
            }
          : {
              [P in EnvOsKnown<TOs>]: P extends K ? true : false
            }
        readonly define: OsDefineWithHelpers<EnvOsKnown<TOs>, undefined extends TOs ? true : false>
      }
    }[EnvOsKnown<TOs>]
  | (undefined extends TOs
      ? {
          readonly name: undefined
          readonly is: {
            [P in EnvOsKnown<TOs>]: false
          } & {
            readonly unknown: true
          }
          readonly define: OsDefineWithHelpers<EnvOsKnown<TOs>, true>
        }
      : never)
export type EnvOs<TOs extends EnvOsName | undefined = EnvOsName | undefined> =
  EnvOsName extends EnvOsKnown<TOs> ? EnvOsWide : EnvOsStrict<TOs>

const getOsName = (): EnvOsName | undefined => {
  if (process.env.POINT0_OS) {
    return process.env.POINT0_OS as EnvOsName
  }

  const detectOsNameFromString = (value: string): EnvOsName | undefined => {
    const lowerValue = value.toLowerCase()
    if (lowerValue.includes('android')) return 'android'
    if (
      lowerValue.includes('iphone') ||
      lowerValue.includes('ipad') ||
      lowerValue.includes('ipod') ||
      lowerValue.includes('ios')
    )
      return 'ios'
    if (lowerValue.includes('win')) return 'windows'
    if (lowerValue.includes('darwin') || lowerValue.includes('mac')) return 'mac'
    if (lowerValue.includes('linux') || lowerValue.includes('x11')) return 'linux'
    return undefined
  }

  if (typeof navigator !== 'undefined') {
    const userAgent = typeof navigator.userAgent === 'string' ? navigator.userAgent : ''
    const navigatorPlatform = typeof navigator.platform === 'string' ? navigator.platform : ''
    const fromNavigator = detectOsNameFromString(`${userAgent} ${navigatorPlatform}`.trim())
    if (fromNavigator !== undefined) {
      return fromNavigator
    }
  }
  if (typeof process !== 'undefined' && typeof process.platform === 'string') {
    const fromProcess = detectOsNameFromString(process.platform)
    if (fromProcess !== undefined) {
      return fromProcess
    }
  }
  return undefined
}

const getOsKey = (): EnvOsName | 'unknown' => {
  const os = getOsName()
  if (!os) {
    return 'unknown'
  }
  return os
}

function osDefineUniversal(options: Record<string, unknown>) {
  return options[getOsKey()]
}

const osDefineSpecific =
  (os: string) =>
  <T>(value: T): T | undefined => {
    if (getOsKey() !== os) {
      return undefined
    }
    return value
  }

const osDefineUnsafe = new Proxy(
  {},
  {
    get(_, prop: string) {
      return osDefineSpecific(prop)
    },
  },
)

const osDefine = new Proxy(osDefineUniversal, {
  apply(_target, _thisArg, args: Parameters<typeof osDefineUniversal>) {
    return osDefineUniversal(...args)
  },
  get(_target, prop: string, receiver: unknown) {
    if (Object.hasOwn(osDefineUniversal, prop)) {
      return Reflect.get(osDefineUniversal, prop, receiver)
    }
    if (prop === 'unsafe') {
      return osDefineUnsafe
    }
    return osDefineSpecific(prop)
  },
})

const envOsIs = new Proxy(
  {},
  {
    get(_, prop: string) {
      if (prop === 'unknown') {
        return getOsName() === undefined
      }
      return getOsName() === prop
    },
  },
)
const envOs = Object.defineProperties(
  {
    is: envOsIs,
    define: osDefine,
  },
  {
    name: { get: getOsName },
  },
) as never as EnvOs

// build

type BuildDefineWithHelpers = {
  <TBefore>(options: { before: TBefore }): TBefore | undefined
  <TAfter>(options: { after: TAfter }): TAfter | undefined
  <TBefore, TAfter>(options: { before: TBefore; after: TAfter }): TBefore | TAfter
}

const getBuildWas = (): boolean => false

const buildDefine = (<TBefore, TAfter>(options: { before?: TBefore; after?: TAfter }) => {
  if (getBuildWas()) {
    return options.after
  }
  return options.before
}) as BuildDefineWithHelpers

export type EnvBuild =
  | {
      readonly was: true
      readonly define: BuildDefineWithHelpers
    }
  | {
      readonly was: false
      readonly define: BuildDefineWithHelpers
    }

const envBuild = Object.defineProperties(
  {
    define: buildDefine,
  },
  {
    was: { get: getBuildWas },
  },
) as never as EnvBuild

// final

export type Env<
  TVars = any,
  TScope extends string = string,
  TRuntime extends EnvRuntimeName | undefined = EnvRuntimeName | undefined,
  TOs extends EnvOsName | undefined = EnvOsName | undefined,
> = {
  readonly mode: EnvMode
  readonly runtime: EnvRuntime<IsAny<TRuntime> extends true ? EnvRuntimeName | undefined : TRuntime>
  readonly os: EnvOs<IsAny<TOs> extends true ? EnvOsName | undefined : TOs>
  readonly vars: Readonly<EnvVars<TVars>>
  readonly side: EnvSide
  readonly scope: EnvScope<IsAny<TScope> extends true ? string : TScope>
  readonly build: EnvBuild
}

export const env: Env = Object.defineProperties(
  {
    mode: envMode,
    runtime: envRuntime,
    os: envOs,
    side: envSide,
    scope: envScope,
    build: envBuild, // can be statically shaken by compiler
  },
  {
    vars: { get: getEnvVars },
  },
) as never as Env

export const _point0_env = env

export const isSsrInProgress = superstore.define<boolean>(
  '__POINT0_IS_SSR_IN_PROGRESS__',
  () => false,
  'clientServerIsolated',
)
