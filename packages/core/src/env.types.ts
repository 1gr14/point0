import type { IsAny } from './index.js'

export type NormalizedNodeEnv = 'production' | 'development' | 'test'
export type Side = 'client' | 'server'

export type ClientRuntime = 'browser' | 'reactNative'
type AnyEnvVars = Record<string, string | undefined>
export type EnvVars<TVars = any> = IsAny<TVars> extends true ? AnyEnvVars : TVars
