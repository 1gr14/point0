/**
 * The engine's own vocabulary — strings it writes on one side of a boundary and reads on the other, but which never
 * leave this package.
 *
 * The framework's client↔server contract lives in `@point0/core`'s `protocol.ts`; these are the engine-internal
 * counterparts: dev-server orchestration headers (the dev client proxies to the server and back, and the two must agree
 * on what they call the round trip) and identifiers the render bakes into the scripts it generates.
 *
 * Header names are lowercase, for the same reason as in core: that is what actually travels.
 */

/**
 * Number of discovery render passes the SSR loop needed for a request, set on the response in dev. Purely diagnostic —
 * the tests read it to assert that a page did not re-render more times than its loaders warrant.
 */
export const POINT0_DISCOVERY_RENDERS_HEADER = 'x-point0-discovery-renders'

/**
 * Marks the dev client's probe asking whether the server wants to handle a request itself (a middleware, an endpoint) —
 * the dev client sends it, the server answers without running the request. Also set on the server's answer.
 */
export const POINT0_MIDDLEWARE_CHECK_FROM_SERVER_HEADER = 'x-point0-middleware-check-from-server'

/** Marks a request the dev client already saw and forwarded on, so the server does not bounce it back and loop. */
export const POINT0_FORWARDED_FROM_DEV_CLIENT_HEADER = 'x-point0-forwarded-from-dev-client'

/**
 * Helper the env-consts script defines and the env-vars script calls, to fold env values into `window.process.env` —
 * which is what `@point0/core`'s env module reads on the client. Both scripts are generated here, so this name never
 * crosses into another package; it must stay a valid JS identifier.
 */
export const POINT0_ENV_EXTEND_FN_GLOBAL = '__POINT0_ENV_EXTEND_FN__'
