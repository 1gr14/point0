import type { IsAny } from './types.js'

export type NormalizedNodeEnv = 'production' | 'development' | 'test'
export type Side = 'client' | 'server'

/**
 * An OPTIONAL slice of Point0 an app opts into — a whole subsystem the client bundle only carries when it is on.
 * `socket` is the first (and today the only) one: channels, spaces, handlers, the socket manager and the wire protocol,
 * all of `@point0/core/socket`.
 *
 * A feature is a BUILD fact, not a runtime setting. The engine resolves one record per side (the `features` config
 * option, defaulting to `server.socket`), the compiler bakes the client side's values in as literals, and every
 * feature-guarded body dead-code-eliminates with them — so an app that never turned `socket` on does not download it.
 */
export type Point0Feature = 'socket'

export type ClientRuntime = 'browser' | 'reactNative'
type AnyEnvVars = Record<string, string | undefined>
export type EnvVars<TVars = AnyEnvVars> = IsAny<TVars> extends true ? AnyEnvVars : TVars
