import type { AnyLocation } from '@devp0nt/route0'
import { Route0 } from '@devp0nt/route0'

export class PointRequest {
  original: Request
  headers: PointRequestHeaders
  cookies: PointRequestCookies
  location: AnyLocation
  method: PointRequestMethod
  from: PointRequestFrom

  constructor({
    original,
    headers,
    cookies,
    location,
    method,
    from,
  }: {
    original: Request
    headers: PointRequestHeaders
    cookies: PointRequestCookies
    location: AnyLocation
    method: PointRequestMethod
    from: PointRequestFrom
  }) {
    this.original = original
    this.headers = headers
    this.cookies = cookies
    this.location = location
    this.method = method
    this.from = from
  }

  static create(original: Request | PointRequest): PointRequest {
    if (original instanceof PointRequest) {
      return original
    }

    // Parse headers
    const headers: PointRequestHeaders = {}
    original.headers.forEach((value, key) => {
      headers[key] = value
    })

    // Parse cookies
    const cookies: PointRequestCookies = {}
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
    const method = original.method.toLowerCase() as PointRequestMethod

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

    // Extract user agent
    const userAgent = original.headers.get('user-agent') || null

    // Extract from scope from headers (if available)
    const fromScope = original.headers.get('X-Point0-From-Scope') || null

    // Extract referrer location
    const referrerUrl = original.referrer || original.headers.get('referer')
    const referrerLocation = referrerUrl ? Route0.getLocation(referrerUrl) : null

    const from: PointRequestFrom = {
      ips,
      ip: ips[0] || null,
      userAgent,
      location: referrerLocation,
      scope: fromScope,
    }

    return new PointRequest({ original, headers, cookies, location, method, from })
  }
}

export type PointRequestMethod = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head'

export interface PointRequestFrom {
  ips: string[]
  ip: string | null
  userAgent: string | null
  location: AnyLocation | null
  scope: string | null
}

export type PointRequestHeaders = Record<string, string>
export type PointRequestCookies = Record<string, string>
