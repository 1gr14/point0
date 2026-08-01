import { Route0 } from '@1gr14/route0'
import type { AnyLocation, ExactLocation } from '@1gr14/route0'
import type { ErrorPoint0 } from './error.js'
import { POINT0_FROM_SCOPE_HEADER } from './protocol.js'
import type { IsAny, PagePoint, PointsScope, RequestableReadyPoint } from './types.js'
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

/**
 * Normalize one IP candidate from a header or the socket peer into a comparable address: trims, unwraps `[v6]` /
 * `[v6]:port` brackets, cuts the `:port` off an IPv4, strips the `::ffff:` prefix of an IPv4-mapped IPv6, lowercases.
 * `undefined` for anything that is not an address — the empty string, RFC 7239 `unknown`, and `_obfuscated` tokens.
 */
export const normalizeIp = (raw: string): string | undefined => {
  let ip = raw.trim()
  if (!ip) {
    return undefined
  }
  if (ip.startsWith('[')) {
    const end = ip.indexOf(']')
    if (end === -1) {
      return undefined
    }
    ip = ip.slice(1, end)
  } else if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(ip)) {
    ip = ip.slice(0, ip.lastIndexOf(':'))
  }
  ip = ip.toLowerCase()
  if (ip.startsWith('::ffff:') && ip.includes('.')) {
    ip = ip.slice('::ffff:'.length)
  }
  if (ip === 'unknown' || ip.startsWith('_')) {
    return undefined
  }
  return ip
}

/**
 * Whether an address is publicly routable — the filter behind `from.clientIp`. Excludes the ranges a proxy chain is
 * made of: IPv4 `0/8`, `10/8`, `127/8`, `169.254/16` (link-local), `172.16/12`, `192.168/16`, and `100.64/10`
 * (carrier-grade NAT — what e.g. Railway's internal hops use); IPv6 `::`, `::1`, `fe80` (link-local) and `fc`/`fd`
 * (unique-local). Accepts the raw header spelling — the candidate is normalized first ({@link normalizeIp}).
 */
export const isPublicIp = (raw: string): boolean => {
  const ip = normalizeIp(raw)
  if (!ip) {
    return false
  }
  if (ip.includes('.') && !ip.includes(':')) {
    const parts = ip.split('.').map(Number)
    if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
      return false
    }
    const [a, b] = parts
    if (a === 0 || a === 10 || a === 127) {
      return false
    }
    if (a === 100 && b >= 64 && b <= 127) {
      return false
    }
    if (a === 169 && b === 254) {
      return false
    }
    if (a === 172 && b >= 16 && b <= 31) {
      return false
    }
    if (a === 192 && b === 168) {
      return false
    }
    return true
  }
  if (ip === '::' || ip === '::1') {
    return false
  }
  // fe80::/10 spans fe80–febf; fc00::/7 is fc + fd
  if (/^fe[89ab]/.test(ip) || ip.startsWith('fc') || ip.startsWith('fd')) {
    return false
  }
  return true
}

// Single-value headers where a proxy/CDN claims "this is the client" — most trustworthy first. All spoofable by a
// client that no proxy overwrites, so they feed `ips` and the `clientIp` fallback, never `ip`.
const SINGLE_VALUE_CLIENT_IP_HEADERS = [
  'cf-connecting-ip',
  'true-client-ip',
  'fastly-client-ip',
  'x-envoy-external-address',
  'x-client-ip',
  'x-cluster-client-ip',
  'x-real-ip',
] as const

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
      let cachedForwardedChain: string[] | undefined
      let cachedClientIp: string | null | undefined
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

      // The two spellings of the forwarded chain, parsed separately and each client-first: `x-forwarded-for`
      // entries, and RFC 7239 `Forwarded: for=…` entries. Every entry normalized; non-addresses (`unknown`,
      // `_obfuscated`) dropped. `ips` merges both; the `clientIp` scan deliberately does NOT (see getClientIp).
      let cachedXffChain: string[] | undefined
      const getXffChain = (): string[] => {
        if (cachedXffChain) {
          return cachedXffChain
        }
        const chain: string[] = []
        const forwardedFor = original.headers.get('x-forwarded-for')
        if (forwardedFor) {
          for (const entry of forwardedFor.split(',')) {
            const normalized = normalizeIp(entry)
            if (normalized) {
              chain.push(normalized)
            }
          }
        }
        cachedXffChain = chain
        return chain
      }
      let cachedRfcForwardedChain: string[] | undefined
      const getRfcForwardedChain = (): string[] => {
        if (cachedRfcForwardedChain) {
          return cachedRfcForwardedChain
        }
        const chain: string[] = []
        const forwarded = original.headers.get('forwarded')
        if (forwarded) {
          for (const element of forwarded.split(',')) {
            const forPair = element
              .split(';')
              .map((pair) => pair.trim())
              .find((pair) => /^for=/i.test(pair))
            if (!forPair) {
              continue
            }
            let value = forPair.slice('for='.length).trim()
            if (value.startsWith('"') && value.endsWith('"')) {
              value = value.slice(1, -1)
            }
            const normalized = normalizeIp(value)
            if (normalized) {
              chain.push(normalized)
            }
          }
        }
        cachedRfcForwardedChain = chain
        return chain
      }
      const getForwardedChain = (): string[] => {
        cachedForwardedChain ??= [...getXffChain(), ...getRfcForwardedChain()]
        return cachedForwardedChain
      }

      const getIps = (): string[] => {
        if (cachedIps) {
          return cachedIps
        }
        // Every candidate the request carries, CLIENT-FIRST: the forwarded chain in header order (the claimed
        // client leads), then the single-value client-claim headers, then the unspoofable socket peer LAST.
        // De-duped, normalized. Everything but the peer can be spoofed — for a security decision use `ip`, for
        // the visitor's address use `clientIp`; never index into this list.
        const ipsSet = new Set<string>()
        for (const candidate of getForwardedChain()) {
          ipsSet.add(candidate)
        }
        for (const header of SINGLE_VALUE_CLIENT_IP_HEADERS) {
          const value = original.headers.get(header)
          const normalized = value ? normalizeIp(value) : undefined
          if (normalized) {
            ipsSet.add(normalized)
          }
        }
        const bunIp = getBunIp()
        const bunIpNormalized = bunIp ? normalizeIp(bunIp) : undefined
        if (bunIpNormalized) {
          ipsSet.add(bunIpNormalized)
        }
        cachedIps = Array.from(ipsSet)
        return cachedIps
      }

      const getClientIp = (): string | null => {
        if (cachedClientIp !== undefined) {
          return cachedClientIp
        }
        cachedClientIp = null
        // Scan the chain (forwarded header + peer as the final hop) RIGHT-TO-LEFT for the first public address —
        // correct whether the edge replaced the header or appended to it; private/CGNAT hops and spoofed prefixes
        // are stepped over. ONE spelling only, XFF winning: proxies manage `x-forwarded-for` and pass a client-sent
        // `Forwarded` through untouched — merging both would put a spoofed entry where the scan trusts most.
        const bunIp = getBunIp()
        const bunIpNormalized = bunIp ? normalizeIp(bunIp) : undefined
        const forwardedChain = getXffChain().length > 0 ? getXffChain() : getRfcForwardedChain()
        const chain = [...forwardedChain, ...(bunIpNormalized ? [bunIpNormalized] : [])]
        for (let index = chain.length - 1; index >= 0; index--) {
          if (isPublicIp(chain[index])) {
            cachedClientIp = chain[index]
            return cachedClientIp
          }
        }
        // No public hop in the chain (or no chain at all) — fall back to the single-value client claims,
        // most trustworthy first, public only.
        for (const header of SINGLE_VALUE_CLIENT_IP_HEADERS) {
          const value = original.headers.get(header)
          const normalized = value ? normalizeIp(value) : undefined
          if (normalized && isPublicIp(normalized)) {
            cachedClientIp = normalized
            return cachedClientIp
          }
        }
        return cachedClientIp
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
        get clientIp(): string | null {
          return getClientIp()
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
          cachedScope = original.headers.get(POINT0_FROM_SCOPE_HEADER) || null
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
          get clientIp(): string | null {
            return first.from.clientIp
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
   * How many SSR DISCOVERY renders the engine has run for this request — the passes that discover queries and stabilize
   * SSR stores/cookies. The final render (the one that becomes the response) is not counted: it always happens exactly
   * once. Live during SSR (the pass currently in flight — a loader prefetched on the first pass reads `1`), the final
   * total once discovery settles (the same number the dev-only `x-point0-discovery-renders` header reports). `0` when
   * nothing was SSR-rendered (plain endpoint requests) or with `ssr.allowedDiscoveryRenders: 0`. Read-only from the
   * outside: backed by `cache[REQUEST0_RENDERS_CACHE_KEY]` and written only by the engine.
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
  /**
   * Every IP candidate the request carries, client-first: the forwarded chain in header order, then the single-value
   * client-claim headers, then the unspoofable socket peer LAST. Normalized and de-duped — never index into it.
   */
  ips: string[]
  /**
   * The socket peer address (Bun's `requestIP`) — unspoofable, so it's the one for security decisions. Behind a
   * proxy/CDN it is the last hop's address, not the visitor's — that one is `clientIp`. `null` without a Bun server.
   */
  ip: string | null
  /**
   * Best guess at the visitor's address: the forwarded chain plus the peer, scanned right-to-left for the first PUBLIC
   * address (private/CGNAT hops and spoofed prefixes stepped over); falls back to the client-claim headers, else
   * `null`. For geo, per-visitor rate limits, logs — NOT for security: with no proxy in front one header spoofs it,
   * `ip` is the unspoofable one.
   */
  clientIp: string | null
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

export type RequestVariantType = 'publicdir' | 'asset' | 'endpoint' | 'page' | 'websocket' | 'error' | 'unknown'

export type RequestVariantPublicdir<TPublicdir = unknown> = {
  type: 'publicdir'
  publicdir: TPublicdir
  response: Response
}

/**
 * A statically served file whose URL carries a content hash, so its bytes can never change under that URL: a bundler
 * chunk of the built client (`/chunk-<hash>.js`, including the entry — every emitted name is content-hashed) or the
 * asset pipeline's `/_point0/assets/<hash>.<ext>`. Split from `publicdir` (stable names, mutable content — favicons,
 * `robots.txt`, `index.html`) exactly because the two demand opposite caching: an `asset` is safe to cache forever, a
 * `publicdir` file is not. `publicdir` is the engine's `Publicdir` instance that served the file, or `undefined` for
 * dev-served pipeline assets.
 */
export type RequestVariantAsset<TPublicdir = unknown> = {
  type: 'asset'
  publicdir: TPublicdir | undefined
  response: Response
}

export type RequestVariantEndpoint = {
  type: 'endpoint'
  location: ExactLocation
  point: RequestableReadyPoint
  /**
   * `'upgrade'` = a channel endpoint reached over `GET` with an `Upgrade: websocket` header — the pipeline runs to the
   * end and its synthetic marker response is turned into a Bun WebSocket handshake at the server top (see the engine's
   * `POINT0_WEBSOCKET_UPGRADE_HEADER`); the ticket path stays `'data'`.
   */
  outputType: 'html' | 'data' | 'queryClientDehydratedState' | 'upgrade'
}

export type RequestVariantPage<TClient = unknown> = {
  type: 'page'
  pageLocation: ExactLocation | AnyLocation
  point: PagePoint | undefined
  client: TClient
  redirect: Response | undefined
}

/**
 * The bare WebSocket upgrade — `GET /_point0/<scope>/websocket` with an `Upgrade: websocket` header, the one socket per
 * client that the scope's socket channels multiplex over. Exists only when the engine's `websocket` server option is
 * on. The request rides the FULL fetch pipeline: middlewares run before the handler answers the upgrade-marker
 * response, so a middleware that matches `request.variant.type === 'websocket'` can veto the upgrade by answering an
 * ordinary response — the built-in place for an `Origin` allowlist (browsers do not apply CORS to WebSockets).
 */
export type RequestVariantWebsocket = {
  type: 'websocket'
  scope: PointsScope
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
  | RequestVariantAsset<TPublicdir>
  | RequestVariantEndpoint
  | RequestVariantPage<TClient>
  | RequestVariantWebsocket
  | RequestVariantError<TError>
  | RequestVariantUnknown

export type RequestVariant<TType extends RequestVariantType, TError, TClient = unknown, TPublicdir = unknown> =
  IsAny<TType> extends true
    ? AnyRequestVariant<TError, TClient, TPublicdir>
    : TType extends 'publicdir'
      ? RequestVariantPublicdir<TPublicdir>
      : TType extends 'asset'
        ? RequestVariantAsset<TPublicdir>
        : TType extends 'endpoint'
          ? RequestVariantEndpoint
          : TType extends 'page'
            ? RequestVariantPage<TClient>
            : TType extends 'websocket'
              ? RequestVariantWebsocket
              : TType extends 'unknown'
                ? RequestVariantUnknown
                : TType extends 'error'
                  ? RequestVariantError<TError>
                  : never
