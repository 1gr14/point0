import { Route0 } from '@devp0nt/route0'
import type { AnyLocation, ExactLocation } from '@devp0nt/route0'
import { _point0_env } from './env.js'
import type { ErrorPoint0 } from './error.js'
import { _ssItems } from './internals.js'
import type { IsAny, PagePoint, RequestableReadyPoint } from './types.js'

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
  headers: RequestHeaders
  cookies: RequestCookies
  location: AnyLocation
  method: WideRequestMethod
  from: RequestFrom
  id: string
  state: RequestState
  cache: RequestCache
  parent: Request0 | undefined
  variant: RequestVariant<TVariant, TError, TClient, TPublicdir>

  constructor({
    original,
    headers,
    cookies,
    location,
    method,
    from,
    id,
    state,
    cache,
    parent,
    variant,
  }: {
    original: Request
    headers: RequestHeaders
    cookies: RequestCookies
    location: AnyLocation
    method: WideRequestMethod
    from: RequestFrom
    id: string
    state: RequestState
    cache: RequestCache
    parent: Request0 | undefined
    variant: RequestVariant<TVariant, TError, TClient, TPublicdir>
  }) {
    this.original = original
    this.headers = headers
    this.cookies = cookies
    this.location = location
    this.method = method
    this.from = from
    this.state = state
    this.id = id
    this.state = state
    this.cache = cache
    this.parent = parent
    this.variant = variant
  }

  static create<TError extends ErrorPoint0>(
    original: Request,
    options: {
      bunServer?: { requestIP: (request: Request) => { address: string } | null }
      id: string
      isFromServer: boolean
      state?: RequestState
      parent?: Request0 | undefined
    },
  ): Request0<any, TError> {
    const { bunServer, id, isFromServer, state = {}, parent } = options
    const cache = parent?.cache ?? {}
    // Parse headers
    const headers: RequestHeaders = {}
    original.headers.forEach((value, key) => {
      headers[key] = value
    })

    // Parse cookies
    const cookies: RequestCookies = {}
    const cookieHeader = original.headers.get('cookie')
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

    // Get location from URL
    const location = Route0.getLocation(original.url)

    // Extract method
    const method = original.method.toUpperCase() as WideRequestMethod

    // Extract IP addresses
    // Prioritize Bun's requestIP (more trusted, can't be spoofed)
    const ipsSet = new Set<string>()
    if (bunServer) {
      try {
        const requestIP = bunServer.requestIP(original)
        if (requestIP?.address) {
          ipsSet.add(requestIP.address)
        }
      } catch {
        // Ignore errors if requestIP is not available
      }
    }

    // Also collect IPs from headers (Bun's requestIP is prioritized as ips[0])
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

    // Extract user agent
    const userAgent = original.headers.get('user-agent') || null

    // Extract from scope from headers (if available)
    const fromScope = original.headers.get('X-Point0-From-Scope') || null

    // Extract referrer location
    const referrerUrl = original.referrer || original.headers.get('referer')
    const referrerLocation = referrerUrl ? Route0.getLocation(referrerUrl) : null

    const ips = Array.from(ipsSet)
    const from: RequestFrom = {
      ips,
      ip: ips[0] || null,
      userAgent,
      location: referrerLocation,
      scope: fromScope,
      server: isFromServer,
    }

    return new Request0({
      original,
      headers,
      cookies,
      location,
      method,
      from,
      id,
      state,
      cache,
      parent,
      variant: { type: 'unknown' },
    })
  }

  static get(): Request0 {
    if (!_point0_env.side.is.server) {
      throw new Error(
        'You can not get request0 not in server. Please call Request0.get() only in server, inside .loader() or .ctx() or .middleware() or inside ssr code, it only exists there',
      )
    }
    const request0 = _ssItems.__POINT0_REQUEST0__.get()
    return request0
  }

  static getWeak(): Request0 | undefined {
    try {
      return _ssItems.__POINT0_REQUEST0__.getWeak()
    } catch {
      return undefined
    }
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
  // publicdir: Publicdir<true> | undefined
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
  // client: EngineClient<true>
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
