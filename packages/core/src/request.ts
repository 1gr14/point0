import type { AnyLocation } from '@devp0nt/route0'
import { Route0 } from '@devp0nt/route0'

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
    const ips: string[] = []
    const forwardedFor = original.headers.get('x-forwarded-for')
    if (forwardedFor) {
      ips.push(...forwardedFor.split(',').map((ip) => ip.trim()))
    }
    const realIp = original.headers.get('x-real-ip')
    if (realIp && !ips.includes(realIp)) {
      ips.push(realIp)
    }
    const cfConnectingIp = original.headers.get('cf-connecting-ip')
    if (cfConnectingIp && !ips.includes(cfConnectingIp)) {
      ips.push(cfConnectingIp)
    }

    // Fallback to connection IP from Bun server if no IP headers found
    if (ips.length === 0 && bunServer) {
      try {
        const requestIP = bunServer.requestIP(original)
        if (requestIP?.address) {
          ips.push(requestIP.address)
        }
      } catch {
        // Ignore errors if requestIP is not available
      }
    }

    // Extract user agent
    const userAgent = original.headers.get('user-agent') || null

    // Extract from scope from headers (if available)
    const fromScope = original.headers.get('X-Point0-From-Scope') || null

    // Extract referrer location
    const referrerUrl = original.referrer || original.headers.get('referer')
    const referrerLocation = referrerUrl ? Route0.getLocation(referrerUrl) : null

    const from: RequestFrom = {
      ips,
      ip: ips[0] || null,
      userAgent,
      location: referrerLocation,
      scope: fromScope,
    }

    return new Request0({ original, headers, cookies, location, method, from })
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
