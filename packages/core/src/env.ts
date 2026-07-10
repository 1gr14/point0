import type { EnvVars, NormalizedNodeEnv } from './env.types.js'
import { POINT0_ENV_CONSTS_GLOBAL, POINT0_ENV_VARS_GLOBAL } from './protocol.js'
import { superstore } from './super-store.js'
import type { IsAny } from './types.js'

export type * from './env.types.js'

/**
 * The NODE_ENV values Point0 treats as already-normal. Inputs are expected to be one of these as-is — Point0 does not
 * coerce or normalize toward them; the name marks "these must arrive normal", not "these get normalized".
 */
export const normalNodeEnvs: NormalizedNodeEnv[] = ['production', 'development', 'test']

// vars
export const getEnvVars = (): EnvVars => {
  const env = Object.create(null)
  const processEnvHolder = (() => {
    if (typeof globalThis !== 'undefined' && isSideClient()) {
      const point0EnvVars = (globalThis as unknown as Record<string, unknown>)[POINT0_ENV_VARS_GLOBAL]
      const point0EnvConsts = (globalThis as unknown as Record<string, unknown>)[POINT0_ENV_CONSTS_GLOBAL]
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

const getSsrPhase = (): SsrPhase => {
  if (isSideClient()) {
    return 'none'
  }
  return __POINT0_SSR_PHASE__.get()
}

const getSsrTarget = (): SsrTarget => {
  if (getSsrPhase() === 'none') {
    return 'none'
  }
  // Set by the executor together with `phase: 'discovery'` — inside an SSR pass it is always
  // there; the 'html' fallback covers only direct low-level render calls that bypass the
  // executor (and normalizes a malformed storage value instead of leaking it into the union).
  return __POINT0_SSR_TARGET__.getOrUndefined() === 'data' ? 'data' : 'html'
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
}
type SideIsServer = {
  readonly client: false
  readonly server: true
}
const sideIs = Object.defineProperties(
  {},
  {
    client: { get: isSideClient },
    server: { get: isSideServer },
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

// ssr

/**
 * The SSR state of the CURRENT execution, as a discriminated union: checking `env.ssr.active` narrows the rest. Outside
 * an SSR pass (the client always; the server outside a page render — middleware, plain endpoint calls) everything is
 * inactive/'none'. Inside an SSR pass, `phase` says where the pass currently is ('discovery' render-to-discover passes
 * vs the final 'render' that becomes the response) and `target` says what the pass is FOR: an 'html' page response or
 * 'data' (the `queryClientDehydratedState` endpoint behind client-navigation prefetch — that mode has no final render,
 * so its whole life is 'discovery').
 */
export type EnvSsr =
  | { readonly active: false; readonly phase: 'none'; readonly target: 'none' }
  | { readonly active: true; readonly phase: 'discovery' | 'render'; readonly target: 'html' | 'data' }

const envSsr = Object.defineProperties(
  {},
  {
    active: { get: () => getSsrPhase() !== 'none' },
    phase: { get: getSsrPhase },
    target: { get: getSsrTarget },
  },
) as EnvSsr

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

// `build.was` is the one env flag that isn't derivable from the runtime on its own: the source default is `false`, and
// the app's build makes it `true` by having the compiler statically rewrite every `_point0_env.build.was` access (and
// `env.build.define(...)`) to a literal. The default server build bundles `@point0/*`, so the compiler reaches this and
// the rewrite happens — in a bundled build this getter is dead code.
//
// But if a consumer leaves `@point0/*` EXTERNAL (e.g. `bunBuildConfig: { packages: 'external' }`), the framework's own
// `build.was` accesses are never compiled, so this getter is what runs. Falling back to a runtime read of
// `POINT0_BUILT` (the built server's entry banner sets it) keeps an externalized engine working — otherwise `build.was`
// stays `false`, the engine assumes it's un-built, loads points from source at runtime, and serves nothing.
const getBuildWas = (): boolean => process.env.POINT0_BUILT === 'true'

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

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface EnvDefinition {
  // module augmentation hook for consumers
  // example:
  // declare module '@point0/core' {
  //   interface EnvDefinition {
  //     vars: { API_URL: string }
  //     scope: 'desktop' | 'web'
  //     runtime: 'browser' | 'ios' | 'android'
  //     os: 'mac' | 'windows' | 'linux'
  //   }
  // }
}

type EnvDefinitionVars = EnvDefinition extends { vars: infer TVars } ? TVars : any
type EnvDefinitionScope = EnvDefinition extends { scope: infer TScope extends string } ? TScope : string
type EnvDefinitionRuntime = EnvDefinition extends {
  runtime: infer TRuntime extends EnvRuntimeName | undefined
}
  ? TRuntime
  : EnvRuntimeName | undefined
type EnvDefinitionOs = EnvDefinition extends { os: infer TOs extends EnvOsName | undefined }
  ? TOs
  : EnvOsName | undefined

export type Env<
  TVars = EnvDefinitionVars,
  TScope extends string = EnvDefinitionScope,
  TRuntime extends EnvRuntimeName | undefined = EnvDefinitionRuntime,
  TOs extends EnvOsName | undefined = EnvDefinitionOs,
> = {
  readonly mode: EnvMode
  readonly runtime: EnvRuntime<IsAny<TRuntime> extends true ? EnvRuntimeName | undefined : TRuntime>
  readonly os: EnvOs<IsAny<TOs> extends true ? EnvOsName | undefined : TOs>
  readonly vars: Readonly<EnvVars<TVars>>
  readonly side: EnvSide
  readonly ssr: EnvSsr
  readonly scope: EnvScope<IsAny<TScope> extends true ? string : TScope>
  readonly build: EnvBuild
}

export const env: Env = Object.defineProperties(
  {
    mode: envMode,
    runtime: envRuntime,
    os: envOs,
    side: envSide,
    ssr: envSsr,
    scope: envScope,
    build: envBuild, // can be statically shaken by compiler
  },
  {
    vars: { get: getEnvVars },
  },
) as never as Env

export const _point0_env = env

// The single source of truth for where an SSR pass currently is:
// - 'none' — no SSR underway (the client always; the server outside an SSR pass — middleware,
//   plain data fetches).
// - 'discovery' — the render-to-discover passes. Option-driven suspense queries stay
//   non-suspending pending results here (a suspend would gate the pass on the loader); only the
//   dedicated suspense hooks throw, and the pass awaits just the shell. The render-less data mode
//   (`queryClientDehydratedState`) lives its whole life in this phase.
// - 'render' — the final render that becomes the response; the one place a pending query with
//   `suspend !== false` suspends, so React streams its Suspense boundary.
export type SsrPhase = 'none' | 'discovery' | 'render'
export const __POINT0_SSR_PHASE__ = superstore.define<SsrPhase>(
  '__POINT0_SSR_PHASE__',
  () => 'none',
  'clientServerIsolated',
)

// What the SSR pass is FOR — an 'html' page response or the render-less 'data' mode
// (`queryClientDehydratedState`); 'none' while no SSR is underway (mirrors SsrPhase's 'none').
// Set by the executor together with `phase: 'discovery'`; exposed as `env.ssr.target`.
export type SsrTarget = 'html' | 'data' | 'none'
export const __POINT0_SSR_TARGET__ = superstore.define<SsrTarget>(
  '__POINT0_SSR_TARGET__',
  () => 'none',
  'clientServerIsolated',
)
