import { useEffect, useRef, useState } from 'react'
import type { CookieOptionsInput } from './effects.js'
import { env } from './env.js'
import { getEffects, getRequest } from './helpers.js'
import { Point0 } from './point0.js'
import type { DataTransformer, DataTransformerExtended } from './types.js'
import { blankDataTransformerExtended, toExtendedTransformer } from './utils.js'
import { _ss } from './internals.js'

export type CookieStorePendingMap = Map<string, CookieOptionsInput>
const encodeCookieName = (name: string): string => {
  return encodeURIComponent(name)
    .replace(/%(2[346B]|5E|60|7C)/g, decodeURIComponent)
    .replace(/[()]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
}

const encodeCookieValue = (value: string): string => {
  return encodeURIComponent(value).replace(/%(2[346BF]|3[AC-F]|40|5[BDE]|60|7[BCD])/g, decodeURIComponent)
}

const decodeCookieValue = (value: string): string => {
  const unquoted = value.startsWith('"') ? value.slice(1, -1) : value
  try {
    return unquoted.replace(/(%[\dA-F]{2})+/gi, decodeURIComponent)
  } catch {
    return unquoted
  }
}

const sanitizeCookieAttributeValue = (value: unknown): string => {
  return String(value).split(';')[0]
}

const normalizeSameSite = (value: unknown): 'strict' | 'lax' | 'none' => {
  const normalized = String(value).trim().toLowerCase()
  if (normalized === 'strict' || normalized === 'lax' || normalized === 'none') {
    return normalized
  }
  return 'lax'
}

const isDataTransformerLike = (value: unknown): value is DataTransformer => {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) {
    return false
  }
  const candidate = value as Partial<DataTransformer>
  return typeof candidate.serialize === 'function' && typeof candidate.deserialize === 'function'
}

export type CookieDefineOptions<
  THttpOnly extends boolean = false,
  TTransformer extends DataTransformer | 'auto' | boolean = 'auto',
  TFallback = undefined,
> = Omit<CookieOptionsInput, 'value' | 'httpOnly'> & {
  httpOnly?: THttpOnly
  transformer?: TTransformer
  fallback?: TFallback
}

export class CookieStore {
  private static getClientDocumentCookieMap(): Record<string, string> {
    if (typeof document === 'undefined' || !document.cookie) {
      return {}
    }
    const cookies: Record<string, string> = {}
    for (const cookie of document.cookie.split('; ').filter(Boolean)) {
      const separatorIndex = cookie.indexOf('=')
      if (separatorIndex < 0) {
        continue
      }
      const rawName = cookie.slice(0, separatorIndex)
      const rawValue = cookie.slice(separatorIndex + 1)
      try {
        cookies[decodeURIComponent(rawName)] = decodeCookieValue(rawValue)
      } catch {}
    }
    return cookies
  }

  static clientDocumentCookieGetter: CookieStoreGetter = ((name?: string) => {
    const cookies = CookieStore.getClientDocumentCookieMap()
    if (name === undefined) {
      return cookies
    }
    return cookies[name]
  }) as CookieStoreGetter

  static clientDocumentCookieSetter: CookieStoreSetter = (options) => {
    if (typeof document !== 'undefined') {
      const attributes: Record<string, string | number | boolean | Date | undefined> = {
        path: options.path ?? '/',
        sameSite: normalizeSameSite(options.sameSite ?? 'lax'),
        domain: options.domain,
        expires: options.expires,
        secure: options.secure,
        partitioned: options.partitioned,
        maxAge: options.maxAge,
      }
      const parts = [`${encodeCookieName(options.name)}=${encodeCookieValue(options.value)}`]

      if (attributes.path) {
        parts.push(`Path=${sanitizeCookieAttributeValue(attributes.path)}`)
      }
      if (attributes.sameSite) {
        parts.push(`SameSite=${normalizeSameSite(attributes.sameSite)}`)
      }
      if (attributes.domain) {
        parts.push(`Domain=${sanitizeCookieAttributeValue(attributes.domain)}`)
      }
      if (attributes.expires !== undefined && typeof attributes.expires !== 'boolean') {
        // a bare number is epoch milliseconds — the same rule as the server-side serializer (Effects.serializeCookie)
        const expiresDate = attributes.expires instanceof Date ? attributes.expires : new Date(attributes.expires)
        if (!Number.isNaN(expiresDate.getTime())) {
          parts.push(`Expires=${expiresDate.toUTCString()}`)
        }
      }
      if (typeof attributes.maxAge === 'number' && Number.isFinite(attributes.maxAge)) {
        parts.push(`Max-Age=${Math.floor(attributes.maxAge)}`)
      }
      if (attributes.secure) {
        parts.push('Secure')
      }
      if (attributes.partitioned) {
        parts.push('Partitioned')
      }

      // biome-ignore lint/suspicious/noDocumentCookie: ok
      document.cookie = parts.join('; ')
    }
  }

  static transformer: DataTransformerExtended = blankDataTransformerExtended
  static clientCookieGetter: CookieStoreGetter = CookieStore.clientDocumentCookieGetter
  static clientCookieSetter: CookieStoreSetter = CookieStore.clientDocumentCookieSetter
  static readonly items = new Set<CookieStoreItem<unknown, unknown, boolean>>()

  static configure(options?: {
    clientCookieGetter?: CookieStoreGetter
    clientCookieSetter?: CookieStoreSetter
    transformer?: DataTransformer | undefined
  }): void {
    CookieStore.transformer = options?.transformer
      ? toExtendedTransformer(options.transformer)
      : CookieStore.transformer
    CookieStore.clientCookieGetter = options?.clientCookieGetter ?? CookieStore.clientCookieGetter
    CookieStore.clientCookieSetter = options?.clientCookieSetter ?? CookieStore.clientCookieSetter
  }

  static plugin = (options?: {
    clientCookieGetter?: CookieStoreGetter
    clientCookieSetter?: CookieStoreSetter
    transformer?: DataTransformer | undefined
  }) => {
    if (options) {
      CookieStore.configure(options)
    }
    return Point0.lets('plugin', 'cookie-store')
      .on('pointFetchServerSettled', () => {
        CookieStore.refresh()
      })
      .plugin()
  }

  // string, httpOnly=false, fallback=undefined
  static define<TValue extends string = string>(
    options: CookieDefineOptions<false, DataTransformer | 'auto' | boolean, undefined> | string,
  ): CookieStoreItem<TValue, undefined, false>

  // string, httpOnly=false, fallback=TValue
  static define<TValue extends string = string>(
    options: CookieDefineOptions<false, DataTransformer | 'auto' | boolean, TValue>,
  ): CookieStoreItem<TValue, undefined, false>

  // string, httpOnly=true, fallback=undefined
  static define<TValue extends string = string>(
    options: CookieDefineOptions<true, DataTransformer | 'auto' | boolean, undefined>,
  ): Omit<CookieStoreItem<TValue, undefined, true>, 'use' | 'refresh'>

  // string, httpOnly=true, fallback=TValue
  static define<TValue extends string = string>(
    options: CookieDefineOptions<true, DataTransformer | 'auto' | boolean, TValue>,
  ): Omit<CookieStoreItem<TValue, undefined, true>, 'use' | 'refresh'>

  // custom, httpOnly=false, fallback=undefined
  static define<TValue>(
    options: CookieDefineOptions<false, DataTransformer | 'auto' | true, undefined> | string,
  ): CookieStoreItem<TValue, undefined, false>

  // custom, httpOnly=false, fallback=TValue
  static define<TValue>(
    options: CookieDefineOptions<false, DataTransformer | 'auto' | true, TValue>,
  ): CookieStoreItem<TValue, undefined, false>

  // custom, httpOnly=true, fallback=undefined
  static define<TValue>(
    options: CookieDefineOptions<true, DataTransformer | 'auto' | true, undefined>,
  ): Omit<CookieStoreItem<TValue, undefined, true>, 'use' | 'refresh'>

  // custom, httpOnly=true, fallback=TValue
  static define<TValue>(
    options: CookieDefineOptions<true, DataTransformer | 'auto' | true, TValue>,
  ): Omit<CookieStoreItem<TValue, undefined, true>, 'use' | 'refresh'>

  // implementation
  static define(options: CookieDefineOptions<boolean, DataTransformer | 'auto' | boolean, unknown> | string) {
    const transformerPolicy =
      typeof options === 'string'
        ? 'auto'
        : options.transformer === undefined
          ? 'auto'
          : options.transformer === true
            ? true
            : options.transformer === false
              ? false
              : options.transformer === 'auto'
                ? 'auto'
                : true
    const transformer =
      typeof options === 'string'
        ? CookieStore.transformer
        : isDataTransformerLike(options.transformer)
          ? toExtendedTransformer(options.transformer)
          : CookieStore.transformer
    const cookieDefineOptions = typeof options === 'string' ? { name: options } : options
    const fallback = typeof options === 'string' ? undefined : options.fallback
    const item = new CookieStoreItem({
      cookieDefineOptions,
      transformerPolicy,
      transformer,
      fallback,
    })
    CookieStore.items.add(item)
    return item as never
  }

  static readonly serverCookieGetter: CookieStoreGetter = ((...args: [name: string] | []) => {
    if (!env.side.is.server) {
      throw new Error('serverCookieGetter is only available on the server')
    }
    // Outgoing (committed) cookies in effects take precedence over the incoming request,
    // so SSR reads reflect what was set/committed during this render — this is what keeps
    // cookies reactive during SSR. A deletion (value '') hides the incoming value.
    const requestCookies = getRequest().cookies
    const effectsCookies = getEffects().cookies
    if (args.length === 0) {
      const result: Record<string, string | undefined> = { ...requestCookies }
      for (const [name, cookie] of Object.entries(effectsCookies)) {
        if (cookie.value === '') {
          delete result[name]
        } else {
          result[name] = cookie.value
        }
      }
      return result
    }
    const name = args[0]
    if (Object.hasOwn(effectsCookies, name)) {
      const committed = effectsCookies[name]
      return committed.value === '' ? undefined : committed.value
    }
    return requestCookies[name]
  }) as CookieStoreGetter

  static readonly serverCookieSetter: CookieStoreSetter = (cookieOptionsInput) => {
    if (!env.side.is.server) {
      throw new Error('serverCookieSetter is only available on the server')
    }
    // During SSR rendering, stage the write and flush it between renders / at the end of
    // the render loop (see `commitPending`) so render stays pure. Outside the SSR render
    // (loaders, actions, request handlers), write immediately so the cookie is never lost.
    if (env.side.is.ssr) {
      const pending = _ss.__POINT0_COOKIE_STORE_PENDING__.get()
      pending.set(cookieOptionsInput.name, cookieOptionsInput)
      return
    }
    getEffects().set.cookies(cookieOptionsInput)
  }

  /**
   * Flush staged SSR cookie writes into the response effects. Called by the SSR render loop. Unlike `SsrStore`, cookies
   * are ALWAYS committed (even on the final pass when no further render happens) — a lost cookie is worse than a
   * hydration mismatch.
   */
  static commitPending(): void {
    const pending = _ss.__POINT0_COOKIE_STORE_PENDING__.getOrUndefined()
    if (!pending) {
      return
    }
    if (pending.size === 0) {
      return
    }
    const effects = getEffects()
    for (const cookieOptionsInput of pending.values()) {
      effects.set.cookies(cookieOptionsInput)
    }
    pending.clear()
  }

  /**
   * Whether any cookie staged during the current SSR render would change what `get()` returns (committed effects,
   * falling back to the request) — i.e. the SSR loop should re-render so readers (`use()`) reflect the new value.
   * Server-only; does not mutate.
   */
  static hasPendingChanges(): boolean {
    const pending = _ss.__POINT0_COOKIE_STORE_PENDING__.getOrUndefined()
    if (!pending) {
      return false
    }
    if (pending.size === 0) {
      return false
    }
    for (const [name, options] of pending) {
      const stagedValue = options.value === '' ? undefined : options.value
      const currentValue = CookieStore.serverCookieGetter(name)
      if (stagedValue !== currentValue) {
        return true
      }
    }
    return false
  }

  static set: CookieStoreSetter = (cookieOptionsInput) => {
    if (!env.side.is.server && cookieOptionsInput.httpOnly) {
      throw new Error(`Cannot set cookie "${cookieOptionsInput.name}" from client: httpOnly cookies are server-only`)
    }
    if (env.side.is.server) {
      CookieStore.serverCookieSetter(cookieOptionsInput)
    } else {
      CookieStore.clientCookieSetter(cookieOptionsInput)
      CookieStore.refresh(cookieOptionsInput.name)
    }
  }

  static get: CookieStoreGetter = ((...args: [name: string] | []) => {
    if (env.side.is.server) {
      return args.length === 0 ? CookieStore.serverCookieGetter() : CookieStore.serverCookieGetter(...args)
    } else {
      return args.length === 0 ? CookieStore.clientCookieGetter() : CookieStore.clientCookieGetter(...args)
    }
  }) as CookieStoreGetter

  static refresh(name?: string): void {
    if (env.side.is.server) {
      return
      // lets not throw to be able fullstack tests
      // throw new Error('refresh() is only available on the client')
    }
    CookieStore.items.forEach((item) => {
      if (name && item.name !== name) {
        return
      }
      // Skip httpOnly cookies as they are server-only
      if (!item.isHttpOnly()) {
        item.refresh()
      }
    })
  }
}

class CookieStoreItem<TValue, TFallback, THttpOnly extends boolean> {
  private readonly cookieDefineOptions: CookieDefineOptions<THttpOnly, DataTransformer | 'auto' | boolean, TFallback>
  private readonly fallback: TFallback
  private readonly transformerPolicy: 'auto' | boolean
  private readonly transformer: DataTransformerExtended
  private readonly refreshCallbacks = new Set<() => void>()
  get name(): string {
    return this.cookieDefineOptions.name
  }

  constructor({
    cookieDefineOptions,
    transformerPolicy,
    transformer,
    fallback,
  }: {
    cookieDefineOptions: CookieDefineOptions<THttpOnly, DataTransformer | 'auto' | boolean, TFallback>
    transformerPolicy: 'auto' | boolean
    transformer: DataTransformerExtended
    fallback: TFallback
  }) {
    this.cookieDefineOptions = cookieDefineOptions
    this.fallback = fallback
    this.transformerPolicy = transformerPolicy
    this.transformer = transformer
  }

  /**
   * Check if this cookie is httpOnly (server-only).
   */
  isHttpOnly(): THttpOnly {
    return (this.cookieDefineOptions.httpOnly === true) as THttpOnly
  }

  set(value: TValue) {
    if (!env.side.is.server && this.cookieDefineOptions.httpOnly) {
      throw new Error(
        `Cannot set cookie "${this.cookieDefineOptions.name}" from client: httpOnly cookies are server-only`,
      )
    }

    if (value === undefined) {
      this.delete()
      return
    }

    const stringified = (() => {
      if (this.transformerPolicy === false) {
        return String(value)
      }
      if (this.transformerPolicy === true) {
        return this.transformer.stringify(value) as string
      }
      return typeof value === 'string' ? value : (this.transformer.stringify(value) ?? String(value))
    })()
    CookieStore.set({ ...this.cookieDefineOptions, value: stringified })
  }

  delete() {
    if (!env.side.is.server && this.cookieDefineOptions.httpOnly) {
      throw new Error(
        `Cannot delete cookie "${this.cookieDefineOptions.name}" from client: httpOnly cookies are server-only`,
      )
    }
    CookieStore.set({ ...this.cookieDefineOptions, value: '', expires: new Date(0) })
  }

  get(): TValue | TFallback {
    if (!env.side.is.server && this.cookieDefineOptions.httpOnly) {
      throw new Error(
        `Cannot get cookie "${this.cookieDefineOptions.name}" from client: httpOnly cookies are server-only`,
      )
    }
    const stringified = CookieStore.get(this.cookieDefineOptions.name)
    if (stringified === undefined) {
      return this.fallback
    }
    const parsed: TValue = (() => {
      if (this.transformerPolicy === false) {
        return stringified as TValue
      }
      if (this.transformerPolicy === true) {
        return this.transformer.parse(stringified)
      }
      try {
        return (this.transformer.parse(stringified) ?? stringified) as TValue
      } catch {
        return stringified as TValue
      }
    })()
    return parsed
  }

  /**
   * Manually refresh the cookie value from client cookies. This will trigger all registered `use` hooks to update.
   */
  refresh(): void {
    if (env.side.is.server) {
      return
      // lets not throw to be able fullstack tests
      // throw new Error('refresh() is only available on the client')
    }
    if (this.cookieDefineOptions.httpOnly) {
      throw new Error(
        `Cannot refresh cookie "${this.cookieDefineOptions.name}" from client: httpOnly cookies are server-only`,
      )
    }
    this.refreshCallbacks.forEach((callback) => {
      callback()
    })
  }

  /**
   * React hook to reactively get the cookie value. On the server (SSR), returns the current value directly. On the
   * client, returns a reactive value that updates when refresh() is called.
   *
   * Usage:
   *
   * ```ts
   * const cookieItem = cookiesStore.define({ name: 'myCookie' })
   * // In your component:
   * const value = cookieItem.use()
   * // Or with onChange callback (client only):
   * const value = cookieItem.use((newValue) => console.info('Changed:', newValue))
   * ```
   *
   * @param onChange Optional callback that will be called when the cookie value changes (client only)
   * @returns The current cookie value
   */
  use(onChange?: (value: TValue | TFallback) => void): TValue | TFallback {
    // On server, just return the current value
    if (env.side.is.server) {
      return this.get()
    }

    // Check if httpOnly cookie is being accessed from client
    if (this.cookieDefineOptions.httpOnly) {
      throw new Error(
        `Cannot use cookie "${this.cookieDefineOptions.name}" from client: httpOnly cookies are server-only`,
      )
    }

    const getStringifiedValue = (): string | undefined => {
      return CookieStore.get(this.cookieDefineOptions.name)
    }

    const initialValue = this.get()
    const initialStringified = getStringifiedValue()
    const [value, setValue] = useState<TValue | TFallback>(initialValue)
    const onChangeRef = useRef(onChange)
    const prevValueRef = useRef<TValue | TFallback>(initialValue)
    const prevOriginalValueRef = useRef<string | undefined>(initialStringified)

    // Update the onChange ref when it changes
    useEffect(() => {
      onChangeRef.current = onChange
    }, [onChange])

    // Set up the refresh callback
    useEffect(() => {
      const refreshCallback = () => {
        const newStringified = getStringifiedValue()
        // Only update if the original stringified value actually changed
        if (newStringified !== prevOriginalValueRef.current) {
          const newValue = this.get()
          setValue(newValue)
          if (onChangeRef.current && prevValueRef.current !== newValue) {
            onChangeRef.current(newValue)
          }
          prevValueRef.current = newValue
          prevOriginalValueRef.current = newStringified
        }
      }

      this.refreshCallbacks.add(refreshCallback)

      return () => {
        this.refreshCallbacks.delete(refreshCallback)
      }
    }, [])

    return value
  }
}

export type CookieStoreGetter = {
  (name: string): string | undefined
  (): Record<string, string>
}
export type CookieStoreSetter = (options: CookieOptionsInput) => void
