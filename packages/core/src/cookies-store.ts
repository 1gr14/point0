export type CookieSameSite = 'strict' | 'lax' | 'none'
export type CookieOptions = {
  name?: string
  value?: string
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
