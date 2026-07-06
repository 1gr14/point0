import { log } from './logger.js'

export type CookieSameSite = 'strict' | 'lax' | 'none'

export type CookieOptions = {
  name: string
  value: string
  domain?: string
  /** Defaults to '/'. To allow the browser to set the path, use an empty string. */
  path: string
  expires?: number | Date | string
  secure?: boolean
  /** Defaults to `lax`. */
  sameSite: CookieSameSite
  httpOnly?: boolean
  partitioned?: boolean
  maxAge?: number
}

export type CookieOptionsInput = {
  name: string
  value: string
  domain?: string
  /** Defaults to '/'. To allow the browser to set the path, use an empty string. */
  path?: string
  expires?: number | Date | string
  secure?: boolean
  /** Defaults to `lax`. */
  sameSite?: CookieSameSite
  httpOnly?: boolean
  partitioned?: boolean
  maxAge?: number
}

export type ResponseHeadersValues = Record<string, string | undefined>
export type ResponseCookiesValues = Record<string, CookieOptions>
export type ResponseStatus = number

export type SetResponseHeaderFn = {
  (headers: Headers): void
  (headers: Record<string, string | undefined>): void
  (headerName: string, headerValue: string | undefined): void
}

export type SetResponseCookieFn = {
  // (cookies: Record<string, string | CookieOptions>): void
  (cookieOptions: Omit<CookieOptionsInput, 'value'> & { value?: string }): void
  (cookieName: string, cookieValue: string, cookieOptions?: Omit<CookieOptionsInput, 'name' | 'value'>): void
  (cookieName: string, cookieValue: undefined, cookieOptions?: Omit<CookieOptionsInput, 'name' | 'value'>): void
}

export type SetResponseStatusFn = (status: number) => void

export type ResponseEffectsValues = {
  headers: ResponseHeadersValues
  cookies: ResponseCookiesValues
  status: ResponseStatus | undefined
}

export type ResponseEffectsSetHelper = {
  headers: SetResponseHeaderFn
  cookies: SetResponseCookieFn
  status: SetResponseStatusFn
  inspect: ResponseEffectsValues
  apply: (response: Response) => Response
}

export class Effects {
  headers: ResponseHeadersValues
  cookies: ResponseCookiesValues
  status: ResponseStatus | undefined
  set: ResponseEffectsSetHelper
  // Set once the response has left the process (the streamed SSR shell was sent). From then on
  // the effects are FROZEN — a late write is dropped (mutating the snapshot would only lie about
  // what was sent) and warns, unless it is idempotent: re-setting the exact status/header/cookie
  // that already went out is not a loss, so it stays silent (e.g. the final render repeating a
  // `setStatus` it already applied during discovery).
  private _sealedReason: string | undefined

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
      get: () => this.values,
      enumerable: true,
      configurable: true,
    })
  }

  get values(): ResponseEffectsValues {
    return {
      headers: { ...this.headers },
      cookies: { ...this.cookies },
      status: this.status,
    }
  }

  seal(reason: string): void {
    this._sealedReason = reason
  }

  // The engine's own bookkeeping (e.g. bubbling a nested fetch's status up to the page request)
  // checks this to skip writes that can no longer reach the response — the sealed warning is
  // reserved for USER code touching the response too late.
  get sealed(): boolean {
    return this._sealedReason !== undefined
  }

  // For staged writers that never touch `set.*` directly (CookieStore staging) but must emit the
  // same warning when the response is gone.
  get sealedReason(): string | undefined {
    return this._sealedReason
  }

  // True = the write must be dropped (the effects are sealed). Warns only when the write would
  // have CHANGED what was sent — an idempotent late write is not a loss and stays silent.
  private _rejectIfSealed(what: string, wouldChange: boolean): boolean {
    if (this._sealedReason === undefined) {
      return false
    }
    if (wouldChange) {
      log({
        level: 'warn',
        category: ['ssr'],
        message: `effects.set.${what} has no effect: ${this._sealedReason}`,
      })
    }
    return true
  }

  private _setHeaders(...args: any[]): void {
    const entries: Array<[string, string | undefined]> = []
    if (args.length === 1) {
      const arg = args[0]
      if (arg instanceof Headers) {
        arg.forEach((value, key) => {
          entries.push([key.toLowerCase(), value])
        })
      } else if (typeof arg === 'object' && arg !== null) {
        for (const [name, value] of Object.entries(arg)) {
          entries.push([name.toLowerCase(), value as string | undefined])
        }
      }
    } else if (args.length === 2) {
      const [name, value] = args as [string, string | undefined]
      entries.push([name.toLowerCase(), value])
    }
    if (
      this._rejectIfSealed(
        'headers',
        entries.some(([name, value]) => this.headers[name] !== value),
      )
    ) {
      return
    }
    for (const [name, value] of entries) {
      this.headers[name] = value
    }
  }

  private _setCookies(...args: any[]): void {
    const cookie: CookieOptions | undefined = (() => {
      if (args.length === 1) {
        const cookieOptions = args[0] as Omit<CookieOptionsInput, 'value'> & { value?: string }
        return {
          name: cookieOptions.name,
          value: cookieOptions.value === undefined ? '' : cookieOptions.value,
          path: cookieOptions.path ?? '/',
          sameSite: cookieOptions.sameSite ?? 'lax',
          domain: cookieOptions.domain,
          expires: cookieOptions.value === undefined ? new Date(0) : cookieOptions.expires,
          secure: cookieOptions.secure,
          httpOnly: cookieOptions.httpOnly,
          partitioned: cookieOptions.partitioned,
          maxAge: cookieOptions.value === undefined ? 0 : cookieOptions.maxAge,
        }
      }
      if (args.length >= 2) {
        const [cookieName, cookieValue, cookieOptions] = args as [
          string,
          string | undefined,
          Omit<CookieOptionsInput, 'name' | 'value'> | undefined,
        ]
        const shouldDelete = cookieValue === undefined
        return {
          name: cookieName,
          value: shouldDelete ? '' : cookieValue,
          path: cookieOptions?.path ?? '/',
          sameSite: cookieOptions?.sameSite ?? 'lax',
          domain: cookieOptions?.domain,
          expires: shouldDelete ? new Date(0) : cookieOptions?.expires,
          secure: cookieOptions?.secure,
          httpOnly: cookieOptions?.httpOnly,
          partitioned: cookieOptions?.partitioned,
          maxAge: shouldDelete ? 0 : cookieOptions?.maxAge,
        }
      }
      return undefined
    })()
    if (!cookie) {
      return
    }
    // "Same cookie" = same canonical Set-Cookie line (value AND attributes) — a differing
    // expires/maxAge is a real change even with an equal value. The cast is honest: the record
    // type has no `undefined` in its index signature, but the key may be absent.
    const existing = this.cookies[cookie.name] as CookieOptions | undefined
    if (
      this._rejectIfSealed(
        'cookies',
        !existing || Effects.serializeCookie(existing) !== Effects.serializeCookie(cookie),
      )
    ) {
      return
    }
    this.cookies[cookie.name] = cookie
  }

  private _setStatus(status: number): void {
    if (this._rejectIfSealed('status', this.status !== status)) {
      return
    }
    this.status = status
  }

  static create(): Effects {
    return new Effects()
  }

  static serializeCookie(cookie: CookieOptions): string {
    const parts: string[] = [Effects.serializeCookiePair(cookie)]

    if (cookie.path) {
      parts.push(`Path=${Effects.sanitizeCookieAttributeValue(cookie.path)}`)
    }

    if (cookie.domain) {
      parts.push(`Domain=${Effects.sanitizeCookieAttributeValue(cookie.domain)}`)
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

    if (typeof cookie.maxAge === 'number' && Number.isFinite(cookie.maxAge)) {
      parts.push(`Max-Age=${Math.floor(cookie.maxAge)}`)
    }

    if (cookie.secure) {
      parts.push('Secure')
    }

    if (cookie.httpOnly) {
      parts.push('HttpOnly')
    }

    // sameSite is required, so always include it
    parts.push(`SameSite=${Effects.normalizeSameSite(cookie.sameSite)}`)

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

  private static _addCookiesToResponseIfNotExists(response: Response, cookies: ResponseCookiesValues): string[] {
    const responseSetCookies = response.headers.getAll('set-cookie')
    const responseCookieNames = new Set(responseSetCookies.map((cookie) => Effects._extractCookieName(cookie)))

    // Response cookies first (higher priority)
    const merged: string[] = [...responseSetCookies]

    // Add effects cookies that don't conflict with response cookies
    for (const cookie of Object.values(cookies)) {
      const cookieString = Effects.serializeCookie(cookie)
      if (!responseCookieNames.has(cookie.name)) {
        merged.push(cookieString)
      }
    }

    return merged
  }

  static apply(response: Response, effects: ResponseEffectsValues, status?: number): Response {
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
    const mergedCookies = Effects._addCookiesToResponseIfNotExists(response, effects.cookies)
    for (const cookieString of mergedCookies) {
      newHeaders.append('Set-Cookie', cookieString)
    }

    const newStatus = status ?? effects.status ?? response.status

    const newResponse = new Response(response.body, {
      status: newStatus,
      headers: newHeaders,
    })

    return newResponse
  }

  apply(response: Response, status?: number): Response {
    return Effects.apply(response, this.values, status)
  }

  static encodeCookieName = (name: string): string => {
    return encodeURIComponent(name)
      .replace(/%(2[346B]|5E|60|7C)/g, decodeURIComponent)
      .replace(/[()]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
  }

  static encodeCookieValue = (value: string): string => {
    return encodeURIComponent(value).replace(/%(2[346BF]|3[AC-F]|40|5[BDE]|60|7[BCD])/g, decodeURIComponent)
  }

  static serializeCookiePair = (cookie: Pick<CookieOptions, 'name' | 'value'>): string => {
    return `${Effects.encodeCookieName(cookie.name)}=${Effects.encodeCookieValue(cookie.value)}`
  }

  static parseCookies = (response: Response): CookieOptions[] => {
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
        name: Effects.decodeCookieValue(name),
        value: Effects.decodeCookieValue(value),
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
        } else if (lowerPart.startsWith('path=')) {
          cookie.path = part.substring(5).trim()
        } else if (lowerPart.startsWith('domain=')) {
          cookie.domain = part.substring(7).trim()
        } else if (lowerPart.startsWith('max-age=')) {
          const maxAge = parseInt(part.substring(8).trim(), 10)
          if (!Number.isNaN(maxAge)) {
            cookie.maxAge = maxAge
          }
        } else if (lowerPart.startsWith('expires=')) {
          const expiresStr = part.substring(8).trim()
          const expiresDate = new Date(expiresStr)
          if (!Number.isNaN(expiresDate.getTime())) {
            cookie.expires = expiresDate
          }
        } else if (lowerPart.startsWith('samesite=')) {
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

  static decodeCookieValue = (value: string): string => {
    const unquoted = value.startsWith('"') ? value.slice(1, -1) : value
    try {
      return unquoted.replace(/(%[\dA-F]{2})+/gi, decodeURIComponent)
    } catch {
      return unquoted
    }
  }

  static sanitizeCookieAttributeValue = (value: unknown): string => {
    return String(value).split(';')[0]
  }

  static normalizeSameSite = (value: unknown): CookieSameSite => {
    const normalized = String(value).trim().toLowerCase()
    if (normalized === 'strict' || normalized === 'lax' || normalized === 'none') {
      return normalized
    }
    return 'lax'
  }
}
