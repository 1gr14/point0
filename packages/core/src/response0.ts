import { _point0_env } from './env.js'
import type { CookieOptions, CookieOptionsInput } from './cookies-store.js'
import { _ssItems } from './internals.js'

export type ResponseHeaders = Record<string, string | undefined>
export type ResponseCookies = Record<string, CookieOptions>
export type ResponseStatus = number

export type SetResponseHeaderFn = {
  (headers: Headers): void
  (headers: Record<string, string>): void
  (headerName: string, headerValue: string): void
}

export type SetResponseCookieFn = {
  // (cookies: Record<string, string | CookieOptions>): void
  (cookieOptions: CookieOptionsInput): void
  (cookieName: string, cookieValue: string, cookieOptions?: Omit<CookieOptionsInput, 'name' | 'value'>): void
}

export type SetResponseStatusFn = (status: number) => void

export type ResponseEffects = {
  headers: ResponseHeaders
  cookies: ResponseCookies
  status: ResponseStatus | undefined
}

export type ResponseEffectsSetHelper = {
  headers: SetResponseHeaderFn
  cookies: SetResponseCookieFn
  status: SetResponseStatusFn
  inspect: ResponseEffects
  apply: (response: Response) => Response
}

export class Response0 {
  headers: ResponseHeaders
  cookies: ResponseCookies
  status: ResponseStatus | undefined
  set: ResponseEffectsSetHelper

  constructor() {
    this.headers = {}
    this.cookies = {}
    this.status = undefined

    this.set = {
      headers: this._setHeaders.bind(this) as SetResponseHeaderFn,
      cookies: this._setCookies.bind(this) as SetResponseCookieFn,
      status: this._setStatus.bind(this) as SetResponseStatusFn,
      apply: this.apply.bind(this) as (response: Response) => Response,
    } as ResponseEffectsSetHelper

    // Use defineProperty to create a getter that returns a snapshot of current state
    // This ensures inspect always reflects the current state and doesn't share references
    Object.defineProperty(this.set, 'inspect', {
      get: () => this.effects,
      enumerable: true,
      configurable: true,
    })
  }

  get effects(): ResponseEffects {
    return {
      headers: { ...this.headers },
      cookies: { ...this.cookies },
      status: this.status,
    }
  }

  private _setHeaders(...args: any[]): void {
    if (args.length === 1) {
      const arg = args[0]
      if (arg instanceof Headers) {
        arg.forEach((value, key) => {
          this.headers[key.toLowerCase()] = value
        })
      } else if (typeof arg === 'object' && arg !== null) {
        for (const [name, value] of Object.entries(arg)) {
          this.headers[name.toLowerCase()] = typeof value === 'string' ? value : (value as string | undefined)
        }
      }
    } else if (args.length === 2) {
      const [name, value] = args as [string, string]
      this.headers[name.toLowerCase()] = value
    }
  }

  private _setCookies(...args: any[]): void {
    if (args.length === 1) {
      const cookieOptions = args[0] as CookieOptionsInput
      this.cookies[cookieOptions.name] = {
        name: cookieOptions.name,
        value: cookieOptions.value,
        path: cookieOptions.path ?? '/',
        sameSite: cookieOptions.sameSite ?? 'lax',
        domain: cookieOptions.domain,
        expires: cookieOptions.expires,
        secure: cookieOptions.secure,
        httpOnly: cookieOptions.httpOnly,
        partitioned: cookieOptions.partitioned,
        maxAge: cookieOptions.maxAge,
      }
    } else if (args.length >= 2) {
      const [cookieName, cookieValue, cookieOptions] = args as [string, string, CookieOptionsInput?]
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

  static create(): Response0 {
    return new Response0()
  }

  static serializeCookie(cookie: CookieOptions): string {
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

  private static _extractCookieName(cookieString: string): string {
    const regex = /^([^=]+)=/
    const match = regex.exec(cookieString)
    return match ? match[1].trim() : ''
  }

  private static _addCookiesToResponseIfNotExists(response: Response, cookies: ResponseCookies): string[] {
    const responseSetCookies = response.headers.getAll('set-cookie')
    const responseCookieNames = new Set(responseSetCookies.map((cookie) => Response0._extractCookieName(cookie)))

    // Response cookies first (higher priority)
    const merged: string[] = [...responseSetCookies]

    // Add effects cookies that don't conflict with response cookies
    for (const cookie of Object.values(cookies)) {
      const cookieString = Response0.serializeCookie(cookie)
      if (!responseCookieNames.has(cookie.name)) {
        merged.push(cookieString)
      }
    }

    return merged
  }

  static apply(response: Response, effects: ResponseEffects): Response {
    const newHeaders = new Headers()
    const setCookieHeaderName = 'set-cookie'

    // Apply effects headers first (except Set-Cookie)
    for (const [name, value] of Object.entries(effects.headers)) {
      if (name.toLowerCase() !== setCookieHeaderName) {
        if (value === undefined) {
          newHeaders.delete(name)
        } else {
          newHeaders.set(name, value)
        }
      }
    }

    // Apply response headers (higher priority - overrides effects headers, except Set-Cookie)
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== setCookieHeaderName) {
        newHeaders.set(key, value)
      }
    })

    // Merge and apply cookies
    const mergedCookies = Response0._addCookiesToResponseIfNotExists(response, effects.cookies)
    for (const cookieString of mergedCookies) {
      newHeaders.append('Set-Cookie', cookieString)
    }

    const status = effects.status ?? response.status

    const newResponse = new Response(response.body, {
      status,
      headers: newHeaders,
    })

    return newResponse
  }

  apply(response: Response): Response {
    return Response0.apply(response, this.effects)
  }

  static parseCookies(response: Response): CookieOptions[] {
    const setCookieHeaders = response.headers.getAll('set-cookie')
    if (setCookieHeaders.length === 0) {
      return []
    }

    const cookies: CookieOptions[] = []

    for (const cookieString of setCookieHeaders) {
      const parts = cookieString.split(';').map((part) => part.trim())

      // Parse name=value (first part)
      const nameValueRegex = /^([^=]+)=(.*)$/
      const nameValueMatch = nameValueRegex.exec(parts[0])
      if (!nameValueMatch) {
        continue // Skip invalid cookies
      }

      const name = nameValueMatch[1].trim()
      const value = nameValueMatch[2].trim()

      const cookie: CookieOptions = {
        name,
        value,
        path: '/', // Default
        sameSite: 'lax', // Default
      }

      // Parse attributes
      for (let i = 1; i < parts.length; i++) {
        const part = parts[i]
        const lowerPart = part.toLowerCase()

        if (lowerPart === 'secure') {
          cookie.secure = true
        } else if (lowerPart === 'httponly') {
          cookie.httpOnly = true
        } else if (lowerPart === 'partitioned') {
          cookie.partitioned = true
        } else if (part.startsWith('Path=')) {
          cookie.path = part.substring(5).trim()
        } else if (part.startsWith('Domain=')) {
          cookie.domain = part.substring(7).trim()
        } else if (part.startsWith('Max-Age=')) {
          const maxAge = parseInt(part.substring(8).trim(), 10)
          if (!isNaN(maxAge)) {
            cookie.maxAge = maxAge
          }
        } else if (part.startsWith('Expires=')) {
          const expiresStr = part.substring(8).trim()
          const expiresDate = new Date(expiresStr)
          if (!isNaN(expiresDate.getTime())) {
            cookie.expires = expiresDate
          }
        } else if (part.startsWith('SameSite=')) {
          const sameSiteValue = part.substring(9).trim().toLowerCase()
          if (sameSiteValue === 'strict' || sameSiteValue === 'lax' || sameSiteValue === 'none') {
            cookie.sameSite = sameSiteValue
          }
        }
      }

      cookies.push(cookie)
    }

    return cookies
  }

  static get(): Response0 {
    if (!_point0_env.target.is.server) {
      throw new Error(
        'You can not get respnse0 not in server. Please call Respons0.get() only in server, inside .loader() or .ctx() or .middleware() or inside ssr code, it only exists there',
      )
    }
    const response0 = _ssItems.__POINT0_RESPONSE0__.get()
    return response0
  }
}
