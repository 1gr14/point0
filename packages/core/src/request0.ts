import { Route0 } from '@1gr14/route0'
import type { AnyLocation, ExactLocation } from '@1gr14/route0'
import type { ErrorPoint0 } from './error.js'
import type { IsAny, PagePoint, RequestableReadyPoint } from './types.js'
import { generateId } from './utils.js'

/**
 * Request-cache key backing `Request0.renders`. The engine's SSR loop writes the current render-pass number here at the
 * start of every pass; the cache is shared along the request chain, so the count is visible wherever the request
 * travels.
 */
export const REQUEST0_RENDERS_CACHE_KEY = '__POINT0_RENDERS_COUNT__'

const decodeCookieValue = (value: string): string => {
  const unquoted = value.startsWith('"') ? value.slice(1, -1) : value
  try {
    return unquoted.replace(/(%[\dA-F]{2})+/gi, decodeURIComponent)
  } catch {
    return unquoted
  }
}

export class Request0<
  TVariant extends RequestVariantType = any,
  TError = unknown,
  TClient = unknown,
  TPublicdir = unknown,
> {
  original: Request
  location: AnyLocation
  method: WideRequestMethod
  from: RequestFrom
  id: string
  state: RequestState
  cache: RequestCache
  prev: Request0 | undefined
  first: Request0 | undefined
  variant: RequestVariant<TVariant, TError, TClient, TPublicdir>
  rawBody: unknown

  constructor({
    original,
    location,
    method,
    from,
    id,
    state,
    cache,
    prev,
    first,
    variant,
  }: {
    original: Request
    location: AnyLocation
    method: WideRequestMethod
    from: RequestFrom
    id: string
    state: RequestState
    cache: RequestCache
    prev: Request0 | undefined
    first: Request0 | undefined
    variant: RequestVariant<TVariant, TError, TClient, TPublicdir>
  }) {
    this.original = original
    this.location = location
    this.method = method
    this.from = from
    this.state = state
    this.id = id
    this.state = state
    this.cache = cache
    this.prev = prev
    this.first = first
    this.variant = variant
  }

  static create<TError extends ErrorPoint0>(
    original: Request,
    options?: {
      bunServer?: { requestIP: (request: Request) => { address: string } | null }
      id?: string
      isFromServer?: boolean
      state?: RequestState
      prev?: Request0 | undefined
    },
  ): Request0<any, TError> {
    const { bunServer, id = generateId(), isFromServer = false, state = {}, prev } = options ?? {}
    const cache = prev?.cache ?? {}
    const first = prev?.first ?? prev

    const location = Route0.getLocation(original.url)
    const method = original.method.toUpperCase() as WideRequestMethod

    // Compute the origin from the real client request: the socket peer IP and the request's own headers.
    const buildClientFrom = (): RequestFrom => {
      let cachedIps: string[] | undefined
      let cachedBunIp: string | null | undefined
      let cachedUserAgent: string | null | undefined
      let cachedLocation: AnyLocation | null | undefined
      let cachedScope: string | null | undefined

      // Bun's requestIP is the real socket peer address — it can't be spoofed, unlike any header.
      const getBunIp = (): string | null => {
        if (cachedBunIp !== undefined) {
          return cachedBunIp
        }
        cachedBunIp = null
        if (bunServer) {
          try {
            const requestIP = bunServer.requestIP(original)
            if (requestIP?.address) {
              cachedBunIp = requestIP.address
            }
          } catch {
            // Ignore errors if requestIP is not available
          }
        }
        return cachedBunIp
      }

      const getIps = (): string[] => {
        if (cachedIps) {
          return cachedIps
        }
        // Bun's requestIP (unspoofable) leads the list; the spoofable header candidates follow.
        const ipsSet = new Set<string>()
        const bunIp = getBunIp()
        if (bunIp) {
          ipsSet.add(bunIp)
        }
        // These header values CAN be spoofed by the client, so they live only in `ips`, never in `ip`.
        const forwardedFor = original.headers.get('x-forwarded-for')
        if (forwardedFor) {
          forwardedFor.split(',').forEach((ip) => {
            ipsSet.add(ip.trim())
          })
        }
        const realIp = original.headers.get('x-real-ip')
        if (realIp) {
          ipsSet.add(realIp)
        }
        const cfConnectingIp = original.headers.get('cf-connecting-ip')
        if (cfConnectingIp) {
          ipsSet.add(cfConnectingIp)
        }
        cachedIps = Array.from(ipsSet)
        return cachedIps
      }

      return {
        get ips(): string[] {
          return getIps()
        },
        // Always the unspoofable Bun requestIP — never a header value — so it's safe for security decisions.
        // null when no Bun server is wired in (e.g. a synthetic request). Spoofable candidates live in `ips`.
        get ip(): string | null {
          return getBunIp()
        },
        get userAgent(): string | null {
          if (cachedUserAgent !== undefined) {
            return cachedUserAgent
          }
          cachedUserAgent = original.headers.get('user-agent') || null
          return cachedUserAgent
        },
        get location(): AnyLocation | null {
          if (cachedLocation !== undefined) {
            return cachedLocation
          }
          const referrerUrl = original.referrer || original.headers.get('referer')
          cachedLocation = referrerUrl ? Route0.getLocation(referrerUrl) : null
          return cachedLocation
        },
        get scope(): string | null {
          if (cachedScope !== undefined) {
            return cachedScope
          }
          cachedScope = original.headers.get('X-Point0-From-Scope') || null
          return cachedScope
        },
        get server(): boolean {
          return isFromServer
        },
      } satisfies RequestFrom
    }

    // The origin describes the external client. A derived request — a server-to-server SSR prefetch hop, whose
    // socket peer and headers are the server's, not the visitor's — reports the ORIGINAL client's origin from
    // `first` (so `from.ip` stays the real visitor IP, not the internal hop's loopback peer, and nothing is
    // recomputed per hop). Only `from.server` is per-request: whether THIS request is server-to-server.
    const from: RequestFrom = first
      ? {
          get ips(): string[] {
            return first.from.ips
          },
          get ip(): string | null {
            return first.from.ip
          },
          get userAgent(): string | null {
            return first.from.userAgent
          },
          get location(): AnyLocation | null {
            return first.from.location
          },
          get scope(): string | null {
            return first.from.scope
          },
          get server(): boolean {
            return isFromServer
          },
        }
      : buildClientFrom()

    return new Request0({
      original,
      location,
      method,
      from,
      id,
      state,
      cache,
      prev,
      first,
      variant: { type: 'unknown' },
    })
  }

  private _cookies: RequestCookies | undefined
  get cookies(): RequestCookies {
    if (this._cookies) {
      return this._cookies
    }
    const cookieHeader = this.original.headers.get('cookie')
    const cookies: RequestCookies = {}
    if (cookieHeader) {
      cookieHeader.split(';').forEach((cookie) => {
        const [rawName, ...valueParts] = cookie.trim().split('=')
        if (rawName) {
          try {
            const name = decodeURIComponent(rawName)
            const value = decodeCookieValue(valueParts.join('='))
            cookies[name] = value
          } catch {
            cookies[rawName] = valueParts.join('=')
          }
        }
      })
    }
    this._cookies = cookies
    return this._cookies
  }

  /**
   * How many SSR render passes the engine has run for this request. Live during SSR (the pass currently in flight — a
   * loader prefetched on the first pass reads `1`), the final total once the request settles (the same number the
   * dev-only `X-Point0-Renders-Count` header reports). `0` when nothing was SSR-rendered (plain endpoint requests).
   * Read-only from the outside: backed by `cache[REQUEST0_RENDERS_CACHE_KEY]` and written only by the engine.
   */
  get renders(): number {
    const value = this.cache[REQUEST0_RENDERS_CACHE_KEY]
    return typeof value === 'number' ? value : 0
  }

  private _headers: RequestHeaders | undefined
  get headers(): RequestHeaders {
    if (this._headers) {
      return this._headers
    }
    const headers: RequestHeaders = {}
    this.original.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value
    })
    this._headers = headers
    return this._headers
  }
}

export type RequestMethod =
  | 'ACL'
  | 'BIND'
  | 'CHECKOUT'
  | 'CONNECT'
  | 'COPY'
  | 'DELETE'
  | 'GET'
  | 'HEAD'
  | 'LINK'
  | 'LOCK'
  | 'M-SEARCH'
  | 'MERGE'
  | 'MKACTIVITY'
  | 'MKCALENDAR'
  | 'MKCOL'
  | 'MOVE'
  | 'NOTIFY'
  | 'OPTIONS'
  | 'PATCH'
  | 'POST'
  | 'PROPFIND'
  | 'PROPPATCH'
  | 'PURGE'
  | 'PUT'
  | 'REBIND'
  | 'REPORT'
  | 'SEARCH'
  | 'SOURCE'
  | 'SUBSCRIBE'
  | 'TRACE'
  | 'UNBIND'
  | 'UNLINK'
  | 'UNLOCK'
  | 'UNSUBSCRIBE'

export type WideRequestMethod = RequestMethod | (string & {})

export type PopularRequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD'

export interface RequestFrom {
  ips: string[]
  ip: string | null
  userAgent: string | null
  location: AnyLocation | null
  scope: string | null
  server: boolean
}

export type RequestHeaders = Record<string, string | undefined>
export type RequestCookies = Record<string, string | undefined>

export interface RequestState {
  [key: string]: unknown
}

export interface RequestCache {
  [key: string]: unknown
}

export type RequestVariantType = 'publicdir' | 'endpoint' | 'page' | 'error' | 'unknown'

export type RequestVariantPublicdir<TPublicdir = unknown> = {
  type: 'publicdir'
  publicdir: TPublicdir
  response: Response
}

export type RequestVariantEndpoint = {
  type: 'endpoint'
  location: ExactLocation
  point: RequestableReadyPoint
  outputType: 'html' | 'data' | 'queryClientDehydratedState'
}

export type RequestVariantPage<TClient = unknown> = {
  type: 'page'
  pageLocation: ExactLocation | AnyLocation
  point: PagePoint | undefined
  client: TClient
  redirect: Response | undefined
}

export type RequestVariantUnknown = {
  type: 'unknown'
}

export type RequestVariantError<TError> = {
  type: 'error'
  error: TError
}

export type AnyRequestVariant<TError, TClient = unknown, TPublicdir = unknown> =
  | RequestVariantPublicdir<TPublicdir>
  | RequestVariantEndpoint
  | RequestVariantPage<TClient>
  | RequestVariantError<TError>
  | RequestVariantUnknown

export type RequestVariant<TType extends RequestVariantType, TError, TClient = unknown, TPublicdir = unknown> =
  IsAny<TType> extends true
    ? AnyRequestVariant<TError, TClient, TPublicdir>
    : TType extends 'publicdir'
      ? RequestVariantPublicdir<TPublicdir>
      : TType extends 'endpoint'
        ? RequestVariantEndpoint
        : TType extends 'page'
          ? RequestVariantPage<TClient>
          : TType extends 'unknown'
            ? RequestVariantUnknown
            : TType extends 'error'
              ? RequestVariantError<TError>
              : never
