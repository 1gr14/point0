import type { IsAny } from './index.js'

export type NormalNodeEnv = 'production' | 'development' | 'test'
export type Target = 'client' | 'server'
export type ClientPlatform = 'browser' | 'react-native'
type AnyAnvVars = Record<string, string | undefined | boolean | number | null>
export type EnvVars<TVars = any> = IsAny<TVars> extends true ? AnyAnvVars : TVars
