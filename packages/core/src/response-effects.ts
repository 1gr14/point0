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
  (cookieName: string, cookieValue: string, cookieOptions?: CookieOptions): void
}

export type PointSetStatusFn = (status: number) => void

export type ResponseEffects = {
  headers: PointResponseHeaders
  cookies: PointResponseCookies
  status: PointResponseStatus
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
  status: PointResponseStatus

  constructor() {
    this.headers = {} as never
    this.cookies = {} as never
    this.status = 200 as never
  }

  static create(): ResponseEffectsManager {
    return new ResponseEffectsManager()
  }

  set = {} as ResponseEffectsSetHelper
}
