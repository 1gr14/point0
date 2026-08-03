import type { MiddlewareFn, MiddlewarePropsBase } from '@point0/core'
import type { WideRequestMethod } from '@point0/core/request0'

// inspired by https://github.com/elysiajs/elysia-cors/tree/main
// thanks a lot, SaltyAom https://saltyaom.com/

type CorsOriginCheck = (context: MiddlewarePropsBase<any>) => boolean | undefined | Promise<boolean | undefined>
type CorsOriginValue = string | RegExp | CorsOriginCheck

/**
 * Options for {@link cors}. Every field is optional: `cors()` with no argument reflects the request origin and mirrors
 * the requested methods/headers, but sends no `Access-Control-Allow-Credentials` — cookies and auth headers stay out of
 * cross-origin calls until you name the origins you trust.
 *
 * - `origin` — which origins are allowed: `true` (reflect, default), `false` (none), a string/RegExp/predicate, or a
 *   list. A string matches the host only unless it carries a protocol.
 * - `methods` / `allowedHeaders` / `exposeHeaders` — the corresponding `Access-Control-*` header; `true` (default)
 *   reflects what the request asked for, a string/array sets it explicitly, `false` omits it.
 * - `credentials` — send `Access-Control-Allow-Credentials: true` (default `false`). It needs an explicit `origin`:
 *   `cors({ credentials: true })` throws, because credentials on top of the reflecting default hand every site on the
 *   internet a read of your authenticated responses.
 * - `maxAge` — preflight cache lifetime in seconds (default `5`; `0` omits the header).
 * - `preflight` — answer `OPTIONS` with `204` (default `true`) or pass it through.
 *
 * Full reference: https://1gr14.dev/point0/latest/cors
 */
export type CorsOptions = {
  origin?: boolean | CorsOriginValue | CorsOriginValue[]
  methods?: boolean | undefined | null | '' | '*' | WideRequestMethod | WideRequestMethod[]
  allowedHeaders?: true | string | string[] | null | undefined
  exposeHeaders?: true | string | string[] | null | undefined
  credentials?: boolean
  maxAge?: number
  preflight?: boolean
}

/**
 * Build a CORS Point0 middleware. Mount the returned middleware on your `root` (or a route subtree) and every response
 * gets the `Access-Control-*` headers, while every preflight `OPTIONS` request is answered with a `204` — so a client
 * on a different origin (a native/mobile app, or a front-end on another domain) can call your API. Bare `cors()` opens
 * the API to any origin but keeps credentials off, which is the safe half of permissive: the browser makes those calls
 * anonymously, so nothing behind a session cookie leaks. Cookie-authenticated cross-origin clients need both `origin`
 * and `credentials` — see {@link CorsOptions}. Server-only by construction: the compiler strips `.middleware(...)`
 * arguments from the client bundle, so this call never ships to the client.
 *
 *     export const root = Point0.lets
 *       .root()
 *       .middleware(cors({ origin: 'https://app.example.com', credentials: true }))
 *       .root()
 *
 * Full reference: https://1gr14.dev/point0/latest/cors
 */
export const cors = (options: CorsOptions = {}): MiddlewareFn<any> => {
  // Reflecting whatever `Origin` a request carried is harmless on its own — the browser still sends those requests
  // anonymously. Add `Access-Control-Allow-Credentials: true` and it becomes the textbook CORS hole: evil.com does
  // `fetch(yourApi, { credentials: 'include' })`, the visitor's session cookie rides along, and the reflection lets the
  // attacker's script READ the answer — connect tickets, account data, anything the session can reach. So `credentials`
  // defaults to `false`, and turning it on while leaving `origin` at its reflecting default is a construction-time
  // error, not a header the developer never sees. Spelling both out — `cors({ origin: true, credentials: true })` —
  // still works: at that point it is a decision (a closed network, a dev machine), not an oversight. That is also why
  // this throws instead of silently narrowing: an app that asked for credentials and got them dropped would fail later,
  // in the browser, as an unexplained CORS error.
  if (options.credentials === true && options.origin === undefined) {
    throw new Error(
      'cors(): `credentials: true` needs an explicit `origin`. The default reflects whatever `Origin` the request ' +
        'carried, and a reflected origin with credentials lets any site read your authenticated responses. Name the ' +
        "origins you trust — cors({ origin: 'https://app.example.com', credentials: true }) — or write " +
        '`origin: true` to allow any origin on purpose.',
    )
  }

  const normalizeHeaderList = (value: string | string[] | null | undefined): string | undefined =>
    value === undefined || value === null || value === '' ? undefined : Array.isArray(value) ? value.join(', ') : value

  const headerKeysFromHeaders = (headers: Headers): string => {
    const keys: string[] = []
    headers.forEach((_, key) => {
      keys.push(key)
    })
    return keys.join(', ')
  }

  const normalizeOriginForDomainCompare = (origin: string): string => {
    const protocolIndex = origin.indexOf('://')
    return protocolIndex === -1 ? origin : origin.slice(protocolIndex + 3)
  }

  const hasProtocol = (origin: string): boolean => origin.includes('://')

  const appendVaryValue = (existing: string | undefined, valueToAdd: string): string => {
    if (!existing) {
      return valueToAdd
    }

    const normalized = existing
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
    if (normalized.includes(valueToAdd.toLowerCase())) {
      return existing
    }
    return `${existing}, ${valueToAdd}`
  }

  const resolveAllowOrigin = async ({
    requestOrigin,
    originOption,
    context,
  }: {
    requestOrigin: string | null
    originOption: CorsOptions['origin']
    context: MiddlewarePropsBase<any>
  }): Promise<string | undefined> => {
    const evaluate = async (candidate: CorsOriginValue): Promise<string | undefined> => {
      if (typeof candidate === 'string') {
        if (!requestOrigin) {
          return undefined
        }
        if (candidate === requestOrigin) {
          return requestOrigin
        }
        if (hasProtocol(candidate)) {
          return undefined
        }
        return normalizeOriginForDomainCompare(candidate) === normalizeOriginForDomainCompare(requestOrigin)
          ? requestOrigin
          : undefined
      }

      if (candidate instanceof RegExp) {
        return requestOrigin && candidate.test(requestOrigin) ? requestOrigin : undefined
      }

      const allowed = await candidate(context)
      return allowed && requestOrigin ? requestOrigin : undefined
    }

    const origin = originOption ?? true
    if (origin === true) {
      return requestOrigin ?? '*'
    }
    if (origin === false) {
      return undefined
    }

    const items = Array.isArray(origin) ? origin : [origin]

    for (const item of items) {
      const allowedOrigin = await evaluate(item)
      if (allowedOrigin !== undefined) {
        return allowedOrigin
      }
    }

    return undefined
  }

  const methods = options.methods ?? true
  const allowedHeaders = options.allowedHeaders ?? true
  const exposeHeaders = options.exposeHeaders ?? true
  const normalizedMethods = normalizeHeaderList(typeof methods === 'boolean' ? undefined : methods)
  const normalizedAllowedHeaders = normalizeHeaderList(
    allowedHeaders === true ? undefined : (allowedHeaders as string | string[] | null | undefined),
  )
  const normalizedExposeHeaders = normalizeHeaderList(
    exposeHeaders === true ? undefined : (exposeHeaders as string | string[] | null | undefined),
  )
  const shouldAllowCredentials = options.credentials ?? false
  const shouldHandlePreflight = options.preflight ?? true
  const maxAge = typeof options.maxAge === 'number' && Number.isFinite(options.maxAge) ? String(options.maxAge) : '5'

  const middleware: MiddlewareFn<any> = async (middlewareOptions) => {
    const { request, set, next } = middlewareOptions
    const requestOrigin = request.original.headers.get('origin')
    const isOptionsRequest = request.original.method.toUpperCase() === 'OPTIONS'
    const isPreflightRequest = shouldHandlePreflight && isOptionsRequest
    if (isOptionsRequest && !shouldHandlePreflight) {
      return await next()
    }

    const allowOrigin = await resolveAllowOrigin({
      requestOrigin,
      originOption: options.origin,
      context: middlewareOptions,
    })

    if (allowOrigin) {
      set.headers('Access-Control-Allow-Origin', allowOrigin)
      if (allowOrigin !== '*') {
        set.headers('Vary', appendVaryValue(request.headers.vary, 'Origin'))
      } else {
        set.headers('Vary', '*')
      }
    }

    if (methods === true) {
      const methodFromRequest =
        request.original.headers.get('access-control-request-method') ?? request.method.toUpperCase()
      set.headers('Access-Control-Allow-Methods', methodFromRequest)
    } else if (methods !== false && normalizedMethods !== undefined) {
      set.headers('Access-Control-Allow-Methods', normalizedMethods)
    }

    if (allowedHeaders === true) {
      const requested = request.original.headers.get('access-control-request-headers')
      set.headers('Access-Control-Allow-Headers', requested ?? headerKeysFromHeaders(request.original.headers))
    } else if (normalizedAllowedHeaders !== undefined) {
      set.headers('Access-Control-Allow-Headers', normalizedAllowedHeaders)
    }

    if (exposeHeaders === true) {
      set.headers('Access-Control-Expose-Headers', headerKeysFromHeaders(request.original.headers))
    } else if (normalizedExposeHeaders !== undefined) {
      set.headers('Access-Control-Expose-Headers', normalizedExposeHeaders)
    }

    // A browser rejects `Access-Control-Allow-Origin: *` together with credentials outright. `*` is only reached when
    // the request carried no `Origin` at all — nothing to echo back — so drop the credentials header there instead of
    // emitting a pair no client can use.
    if (shouldAllowCredentials && allowOrigin !== '*') {
      set.headers('Access-Control-Allow-Credentials', 'true')
    }

    if (maxAge !== '0') {
      set.headers('Access-Control-Max-Age', maxAge)
    }

    if (isPreflightRequest) {
      return new Response(null, { status: 204 })
    }

    return await next()
  }
  return middleware
}
