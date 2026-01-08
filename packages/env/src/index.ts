// general

// function define<T>(value: T): T | undefined {
//   return value
// }

// function defineForce<T>(value: T): T {
//   return value
// }

// vars

export type EnvVars<
  TVars extends Record<string, string | undefined | boolean | number> = Record<
    string,
    string | undefined | boolean | number
  >,
> = TVars

export const getEnvVars = (): EnvVars => {
  const env = Object.create(null)
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (typeof process !== 'undefined' && process.env) {
    Object.assign(env, process.env)
  }
  return env as EnvVars
}

const envVars = getEnvVars()

// target

const isTargetClient = ((): boolean => {
  // Browser-like (DOM available)
  if (typeof window !== 'undefined' && typeof document !== 'undefined') return true

  // React Native
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') return true

  // Electron renderer process
  if (typeof process !== 'undefined' && (process as any).type === 'renderer') return true

  // TODO: Electron main process in fact is client also (Yes it is client in point0 terminology, becouse it can send requests to server!)
  return false // Node.js, Bun, Deno, or other server runtimes
})()

// in server it becomes const true, in client it becomes const false
const isTargetServer = ((): boolean => {
  return !isTargetClient
})()

const targetName = isTargetClient ? 'client' : 'server'

const isTargetSsr = (): false | true | 'prepass' | 'final' => {
  // const ssr = SuperStore.getWeak<'prepass' | 'final' | undefined>('__POINT0_SSR_PHASE__')
  if (isTargetClient) {
    return false
  }
  const getSsrPhase: unknown = (globalThis as any).__GET_SSR_PHASE__
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
  if (isTargetClient) {
    return options.client
  }
  return options.server
}

type TargetDefineForce = {
  server: <T>(value: T) => T
  client: <T>(value: T) => T
}
type TargetDefineWithHelpers = typeof targetDefineUniversal & {
  server: <T>(value: T) => T | undefined
  client: <T>(value: T) => T | undefined
  force: TargetDefineForce
}
const defineServer = (value: any) => {
  if (isTargetClient) {
    return undefined
  }
  return value
}
const defineClient = (value: any) => {
  if (isTargetServer) {
    return undefined
  }
  return value
}
const targetDefineForce = {
  server: defineServer,
  client: defineClient,
}
const targetDefine = Object.assign(targetDefineUniversal, {
  server: defineServer,
  client: defineClient,
  force: targetDefineForce,
})

type TargetIsClient = {
  client: true
  server: false
  ssr: false
}
type TargetIsServer = {
  client: false
  server: true
  ssr: boolean | 'prepass' | 'final'
}
const targetIs = Object.defineProperty(
  {
    client: isTargetClient,
    server: isTargetServer,
  },
  'ssr',
  {
    get: isTargetSsr,
  },
) as TargetIsClient | TargetIsServer

export type EnvTargetClient = {
  name: 'client'
  is: TargetIsClient
  define: TargetDefineWithHelpers
}

export type EnvTargetServer = {
  name: 'server'
  is: TargetIsServer
  define: TargetDefineWithHelpers
}

export type EnvTarget = EnvTargetClient | EnvTargetServer

export const envTarget = {
  name: targetName,
  is: targetIs,
  define: targetDefine,
} as EnvTarget

// scope

export type IsAny<T> = 0 extends 1 & T ? true : false
export type StringIfAny<T> = IsAny<T> extends true ? string : T
export type EnvScopeIs<TScopes extends string = any> = [IsAny<TScopes>] extends [true]
  ? Record<string, boolean>
  : {
      [K in TScopes]: {
        [P in TScopes]: P extends K ? true : false
      }
    }[TScopes]
type X = EnvScopeIs<any>
type Y = EnvScopeIs<'a' | 'b'>

const getScopeName = (): string => {
  const scopeName = envVars.POINT0_SCOPE_NAME
  if (!scopeName || typeof scopeName !== 'string') {
    throw new Error('POINT0_SCOPE_NAME is not set in env vars')
  }
  return scopeName
}

type ScopeDefineForce<TScopes extends string = string> = Record<TScopes, <T>(value: T) => T>
type ScopeDefineWithHelpers<TScopes extends string = any> = {
  // typeof scopeDefineUniversal
  <TScopes extends string, TResult>(options: Record<StringIfAny<TScopes>, TResult>): TResult
  <TScopes extends string, TResult>(options: Partial<Record<StringIfAny<TScopes>, TResult>>): TResult | undefined
} & Record<StringIfAny<TScopes>, <T>(value: T) => T | undefined> & {
    force: ScopeDefineForce<TScopes>
  }

function scopeDefineUniversal<TScopes extends string, TResult>(options: Record<StringIfAny<TScopes>, TResult>): TResult
function scopeDefineUniversal<TScopes extends string, TResult>(
  options: Partial<Record<StringIfAny<TScopes>, TResult>>,
): TResult | undefined
function scopeDefineUniversal<TScopes extends string, TResult>(
  options: Partial<Record<StringIfAny<TScopes>, TResult>>,
) {
  return options[getScopeName() as TScopes]
}

const scopeDefineSpecific = (scope: string) => (value: any) => {
  if (getScopeName() !== scope) {
    return undefined
  }
  return value
}
const scopeDefineForce = new Proxy(
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
    if (prop === 'force') {
      return scopeDefineForce
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

export type EnvScope<TScopes extends string = any> = {
  name: StringIfAny<TScopes>
  is: EnvScopeIs<TScopes>
  define: ScopeDefineWithHelpers<TScopes>
}

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
      name: 'production'
      is: {
        production: true
        development: false
        test: false
      }
    }
  | {
      name: 'development'
      is: {
        production: false
        development: true
        test: false
      }
    }
  | {
      name: 'test'
      is: {
        production: false
        development: false
        test: true
      }
    }
  | {
      name: string
      is: {
        production: false
        development: false
        test: false
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

export type Env<
  TScope extends string = any,
  TVars extends Record<string, string | undefined | boolean | number> = Record<
    string,
    string | undefined | boolean | number
  >,
> = {
  mode: EnvMode
  vars: EnvVars<TVars>
  target: EnvTarget
  scope: EnvScope<TScope>
}

export const env: Env = {
  mode: envMode,
  vars: envVars,
  target: envTarget,
  scope: envScope,
}
