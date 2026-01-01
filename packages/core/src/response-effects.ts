import type { CookieOptions } from './cookies-store.js'

export type PointResponseHeaders = Record<string, string>
export type PointResponseCookies = Record<string, CookieOptions>
export type PointResponseStatus = number

export type PointSetHeaderFn = {
  (headers: Headers): void
  (headers: Record<string, string>): void
  (headerName: string, headerValue: string): void
}

export type PointSetCookieFn = {
  (cookies: Record<string, string | CookieOptions>): void
  (cookieName: string, cookieValue: string, cookieOptions?: Omit<CookieOptions, 'name' | 'value'>): void
}

export type PointSetStatusFn = (status: number) => void

export type ResponseEffects = {
  headers: PointResponseHeaders
  cookies: PointResponseCookies
  status: PointResponseStatus | undefined
}

export type ResponseEffectsSetHelper = {
  headers: PointSetHeaderFn
  cookies: PointSetCookieFn
  status: PointSetStatusFn
  inspect: ResponseEffects
}

export class ResponseEffectsManager {
  headers: PointResponseHeaders
  cookies: PointResponseCookies
  status: PointResponseStatus | undefined
  set: ResponseEffectsSetHelper

  constructor() {
    this.headers = {}
    this.cookies = {}
    this.status = undefined

    this.set = {
      headers: this._setHeaders.bind(this) as PointSetHeaderFn,
      cookies: this._setCookies.bind(this) as PointSetCookieFn,
      status: this._setStatus.bind(this) as PointSetStatusFn,
    } as ResponseEffectsSetHelper

    Object.defineProperty(this.set, 'inspect', {
      get: () => ({
        headers: { ...this.headers },
        cookies: { ...this.cookies },
        status: this.status,
      }),
      enumerable: true,
      configurable: true,
    })
  }

  private _setHeaders(...args: any[]): void {
    if (args.length === 1) {
      const arg = args[0]
      if (arg instanceof Headers) {
        arg.forEach((value, key) => {
          this.headers[key] = value
        })
      } else if (typeof arg === 'object' && arg !== null) {
        Object.assign(this.headers, arg)
      }
    } else if (args.length === 2) {
      const [name, value] = args as [string, string]
      this.headers[name] = value
    }
  }

  private _setCookies(...args: any[]): void {
    if (args.length === 1) {
      const cookies = args[0] as Record<string, string | CookieOptions>
      for (const [name, valueOrOptions] of Object.entries(cookies)) {
        if (typeof valueOrOptions === 'string') {
          this.cookies[name] = {
            name,
            value: valueOrOptions,
            path: '/',
            sameSite: 'lax',
          }
        } else {
          this.cookies[name] = {
            name,
            value: valueOrOptions.value,
            path: valueOrOptions.path,
            sameSite: valueOrOptions.sameSite,
            domain: valueOrOptions.domain,
            expires: valueOrOptions.expires,
            secure: valueOrOptions.secure,
            httpOnly: valueOrOptions.httpOnly,
            partitioned: valueOrOptions.partitioned,
            maxAge: valueOrOptions.maxAge,
          }
        }
      }
    } else if (args.length >= 2) {
      const [cookieName, cookieValue, cookieOptions] = args as [string, string, CookieOptions?]
      this.cookies[cookieName] = {
        name: cookieName,
        value: cookieValue,
        path: cookieOptions?.path ?? '/',
        sameSite: cookieOptions?.sameSite ?? 'lax',
        domain: cookieOptions?.domain,
        expires: cookieOptions?.expires,
        secure: cookieOptions?.secure,
        httpOnly: cookieOptions?.httpOnly,
        partitioned: cookieOptions?.partitioned,
        maxAge: cookieOptions?.maxAge,
      }
    }
  }

  private _setStatus(status: number): void {
    this.status = status
  }

  static create(): ResponseEffectsManager {
    return new ResponseEffectsManager()
  }

  private _serializeCookie(cookie: CookieOptions): string {
    const parts: string[] = [`${cookie.name}=${cookie.value}`]

    if (cookie.path) {
      parts.push(`Path=${cookie.path}`)
    }

    if (cookie.domain) {
      parts.push(`Domain=${cookie.domain}`)
    }

    if (cookie.expires !== undefined) {
      const expiresDate =
        typeof cookie.expires === 'string'
          ? new Date(cookie.expires)
          : cookie.expires instanceof Date
            ? cookie.expires
            : new Date(cookie.expires)
      parts.push(`Expires=${expiresDate.toUTCString()}`)
    }

    if (cookie.maxAge !== undefined) {
      parts.push(`Max-Age=${cookie.maxAge}`)
    }

    if (cookie.secure) {
      parts.push('Secure')
    }

    if (cookie.httpOnly) {
      parts.push('HttpOnly')
    }

    // sameSite is required, so always include it
    parts.push(`SameSite=${cookie.sameSite}`)

    if (cookie.partitioned) {
      parts.push('Partitioned')
    }

    return parts.join('; ')
  }

  private _extractCookieName(cookieString: string): string {
    const regex = /^([^=]+)=/
    const match = regex.exec(cookieString)
    return match ? match[1].trim() : ''
  }

  mergeCookies(response: Response): string[] {
    const responseSetCookies = response.headers.getAll('set-cookie')
    const responseCookieNames = new Set(responseSetCookies.map((cookie) => this._extractCookieName(cookie)))

    // Response cookies first (higher priority)
    const merged: string[] = [...responseSetCookies]

    // Add effects cookies that don't conflict with response cookies
    for (const cookie of Object.values(this.cookies)) {
      const cookieString = this._serializeCookie(cookie)
      if (!responseCookieNames.has(cookie.name)) {
        merged.push(cookieString)
      }
    }

    return merged
  }

  applyToResponse(response: Response): Response {
    const newHeaders = new Headers()
    const setCookieHeaderName = 'set-cookie'

    // Apply effects headers first (except Set-Cookie)
    for (const [name, value] of Object.entries(this.headers)) {
      if (name.toLowerCase() !== setCookieHeaderName) {
        newHeaders.set(name, value)
      }
    }

    // Apply response headers (higher priority - overrides effects headers, except Set-Cookie)
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== setCookieHeaderName) {
        newHeaders.set(key, value)
      }
    })

    // Merge and apply cookies
    const mergedCookies = this.mergeCookies(response)
    for (const cookieString of mergedCookies) {
      newHeaders.append('Set-Cookie', cookieString)
    }

    const status = this.status ?? response.status

    return new Response(response.body, {
      status,
      headers: newHeaders,
    })
  }
}
