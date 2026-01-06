import type { AnyLocation } from '@devp0nt/route0'
import { Route0 } from '@devp0nt/route0'
import { runtime } from '@point0/runtime'
import { SuperStore } from './super-store.js'

// TODO: add generics TRoute, THeaders, TCookies
export class Request0 {
  original: Request
  headers: RequestHeaders
  cookies: RequestCookies
  location: AnyLocation
  method: RequestMethod
  from: RequestFrom

  constructor({
    original,
    headers,
    cookies,
    location,
    method,
    from,
  }: {
    original: Request
    headers: RequestHeaders
    cookies: RequestCookies
    location: AnyLocation
    method: RequestMethod
    from: RequestFrom
  }) {
    this.original = original
    this.headers = headers
    this.cookies = cookies
    this.location = location
    this.method = method
    this.from = from
  }

  static create(
    original: Request | Request0,
    bunServer?: { requestIP: (request: Request) => { address: string } | null },
  ): Request0 {
    if (original instanceof Request0) {
      return original
    }

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
        const [name, ...valueParts] = cookie.trim().split('=')
        if (name) {
          cookies[name] = valueParts.join('=')
        }
      })
    }

    // Get location from URL
    const location = Route0.getLocation(original.url)

    // Extract method
    const method = original.method.toLowerCase() as RequestMethod

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
      forwardedFor.split(',').forEach((ip) => ipsSet.add(ip.trim()))
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
    }

    return new Request0({ original, headers, cookies, location, method, from })
  }

  static get(): Request0 {
    if (!runtime.is.server) {
      throw new Error(
        'You can not get request0 not in server. Please call Request0.get() only in server, inside .loader() or .ctx() or .middleware() or inside ssr code, it only exists there',
      )
    }
    const request0 = SuperStore.getWeak<Request0 | undefined>('__POINT0_REQUEST0__')
    if (!request0) {
      throw new Error(
        'Request0 is undefined while try to get it from server. Please call Request0.get() only inside .loader() or .ctx() or .middleware() or inside ssr code, it only exists there',
      )
    }
    return request0
  }
}

export type RequestMethod = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head'

export interface RequestFrom {
  ips: string[]
  ip: string | null
  userAgent: string | null
  location: AnyLocation | null
  scope: string | null
}

export type RequestHeaders = Record<string, string>
export type RequestCookies = Record<string, string>
