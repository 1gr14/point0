import { Route0 } from '@devp0nt/route0'
import type { AnyLocation, ExactLocation } from '@devp0nt/route0'
import type { ErrorPoint0 } from './error.js'
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
    options: {
      bunServer?: { requestIP: (request: Request) => { address: string } | null }
      id: string
      isFromServer: boolean
      state?: RequestState
      prev?: Request0 | undefined
    },
  ): Request0<any, TError> {
    const { bunServer, id, isFromServer, state = {}, prev } = options
    const cache = prev?.cache ?? {}
    const first = prev?.first ?? prev

    const location = Route0.getLocation(original.url)
    const method = original.method.toUpperCase() as WideRequestMethod

    let cachedIps: string[] | undefined
    let cachedIp: string | null | undefined
    let cachedUserAgent: string | null | undefined
    let cachedLocation: AnyLocation | null | undefined
    let cachedScope: string | null | undefined

    const getIps = (): string[] => {
      if (cachedIps) {
        return cachedIps
      }
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
      cachedIps = Array.from(ipsSet)
      return cachedIps
    }

    const from = {
      get ips(): string[] {
        return getIps()
      },
      get ip(): string | null {
        if (cachedIp !== undefined) {
          return cachedIp
        }
        const ips = getIps()
        cachedIp = ips[0] || null
        return cachedIp
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
