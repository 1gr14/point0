import {
  blankDataTransformerExtended,
  type DataTransformer,
  type DataTransformerExtended,
  env,
  Point0,
  toExtendedTransformer,
} from '@point0/core'
import type { CookieOptionsInput } from '@point0/core/effects'
import { Effects } from '@point0/core/effects'
import { Request0 } from '@point0/core/request0'
import { useEffect, useRef, useState } from 'react'

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

export class CookiesStore {
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

  static clientDocumentCookieGetter: CookiesStoreGetter = ((name?: string) => {
    const cookies = CookiesStore.getClientDocumentCookieMap()
    if (name === undefined) {
      return cookies
    }
    return cookies[name]
  }) as CookiesStoreGetter

  static clientDocumentCookieSetter: CookiesStoreSetter = (options) => {
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
      if (typeof attributes.expires === 'number') {
        attributes.expires = new Date(Date.now() + attributes.expires * 864e5)
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
      if (attributes.expires) {
        const expiresDate =
          attributes.expires instanceof Date ? attributes.expires : new Date(String(attributes.expires))
        if (!isNaN(expiresDate.getTime())) {
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

      document.cookie = parts.join('; ')
    }
  }

  static transformer: DataTransformerExtended = blankDataTransformerExtended
  static clientCookieGetter: CookiesStoreGetter = CookiesStore.clientDocumentCookieGetter
  static clientCookieSetter: CookiesStoreSetter = CookiesStore.clientDocumentCookieSetter
  static readonly items = new Set<CookiesStoreItem<unknown, unknown, boolean>>()

  static configure(options?: {
    clientCookieGetter?: CookiesStoreGetter
    clientCookieSetter?: CookiesStoreSetter
    transformer?: DataTransformer | undefined
  }): void {
    CookiesStore.transformer = options?.transformer
      ? toExtendedTransformer(options.transformer)
      : CookiesStore.transformer
    CookiesStore.clientCookieGetter = options?.clientCookieGetter ?? CookiesStore.clientCookieGetter
    CookiesStore.clientCookieSetter = options?.clientCookieSetter ?? CookiesStore.clientCookieSetter
  }

  static plugin = (options?: {
    clientCookieGetter?: CookiesStoreGetter
    clientCookieSetter?: CookiesStoreSetter
    transformer?: DataTransformer | undefined
  }) => {
    if (options) {
      CookiesStore.configure(options)
    }
    return Point0.lets('plugin', 'cookies-store')
      .on('pointFetchServerSettled', () => {
        CookiesStore.refresh()
      })
      .plugin()
  }

  // string, httpOnly=false, fallback=undefined
  static define<TValue extends string = string>(
    options: CookieDefineOptions<false, DataTransformer | 'auto' | boolean, undefined> | string,
  ): CookiesStoreItem<TValue, undefined, false>

  // string, httpOnly=false, fallback=TValue
  static define<TValue extends string = string>(
    options: CookieDefineOptions<false, DataTransformer | 'auto' | boolean, TValue>,
  ): CookiesStoreItem<TValue, undefined, false>

  // string, httpOnly=true, fallback=undefined
  static define<TValue extends string = string>(
    options: CookieDefineOptions<true, DataTransformer | 'auto' | boolean, undefined>,
  ): Omit<CookiesStoreItem<TValue, undefined, true>, 'use' | 'refresh'>

  // string, httpOnly=true, fallback=TValue
  static define<TValue extends string = string>(
    options: CookieDefineOptions<true, DataTransformer | 'auto' | boolean, TValue>,
  ): Omit<CookiesStoreItem<TValue, undefined, true>, 'use' | 'refresh'>

  // custom, httpOnly=false, fallback=undefined
  static define<TValue>(
    options: CookieDefineOptions<false, DataTransformer | 'auto' | true, undefined> | string,
  ): CookiesStoreItem<TValue, undefined, false>

  // custom, httpOnly=false, fallback=TValue
  static define<TValue>(
    options: CookieDefineOptions<false, DataTransformer | 'auto' | true, TValue>,
  ): CookiesStoreItem<TValue, undefined, false>

  // custom, httpOnly=true, fallback=undefined
  static define<TValue>(
    options: CookieDefineOptions<true, DataTransformer | 'auto' | true, undefined>,
  ): Omit<CookiesStoreItem<TValue, undefined, true>, 'use' | 'refresh'>

  // custom, httpOnly=true, fallback=TValue
  static define<TValue>(
    options: CookieDefineOptions<true, DataTransformer | 'auto' | true, TValue>,
  ): Omit<CookiesStoreItem<TValue, undefined, true>, 'use' | 'refresh'>

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
        ? CookiesStore.transformer
        : isDataTransformerLike(options.transformer)
          ? toExtendedTransformer(options.transformer)
          : CookiesStore.transformer
    const cookieDefineOptions = typeof options === 'string' ? { name: options } : options
    const fallback = typeof options === 'string' ? undefined : options.fallback
    const item = new CookiesStoreItem({
      cookieDefineOptions,
      transformerPolicy,
      transformer,
      fallback,
    })
    CookiesStore.items.add(item)
    return item as never
  }

  static readonly serverCookieGetter: CookiesStoreGetter = ((...args: [name: string] | []) => {
    if (!env.side.is.server) {
      throw new Error('serverCookieGetter is only available on the server')
    }
    const request0 = Request0.get()
    if (args.length === 0) {
      return request0.cookies
    }
    return request0.cookies[args[0]]
  }) as CookiesStoreGetter
  static readonly serverCookieSetter: CookiesStoreSetter = (cookieOptionsInput) => {
    const effects = Effects.get()
    effects.set.cookies(cookieOptionsInput)
  }

  static set: CookiesStoreSetter = (cookieOptionsInput) => {
    if (!env.side.is.server && cookieOptionsInput.httpOnly) {
      throw new Error(`Cannot set cookie "${cookieOptionsInput.name}" from client: httpOnly cookies are server-only`)
    }
    if (env.side.is.server) {
      CookiesStore.serverCookieSetter(cookieOptionsInput)
    } else {
      CookiesStore.clientCookieSetter(cookieOptionsInput)
    }
  }

  static get: CookiesStoreGetter = ((...args: [name: string] | []) => {
    if (env.side.is.server) {
      return args.length === 0 ? CookiesStore.serverCookieGetter() : CookiesStore.serverCookieGetter(...args)
    } else {
      return args.length === 0 ? CookiesStore.clientCookieGetter() : CookiesStore.clientCookieGetter(...args)
    }
  }) as CookiesStoreGetter

  static refresh(): void {
    if (env.side.is.server) {
      return
      // lets not throw to be able fullstack tests
      // throw new Error('refresh() is only available on the client')
    }
    CookiesStore.items.forEach((item) => {
      // Skip httpOnly cookies as they are server-only
      if (!item.isHttpOnly()) {
        item.refresh()
      }
    })
  }
}

class CookiesStoreItem<TValue, TFallback, THttpOnly extends boolean> {
  private readonly cookieDefineOptions: CookieDefineOptions<THttpOnly, DataTransformer | 'auto' | boolean, TFallback>
  private readonly fallback: TFallback
  private readonly transformerPolicy: 'auto' | boolean
  private readonly transformer: DataTransformerExtended
  private readonly refreshCallbacks = new Set<() => void>()

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
    CookiesStore.set({ ...this.cookieDefineOptions, value: stringified })
  }

  delete() {
    if (!env.side.is.server && this.cookieDefineOptions.httpOnly) {
      throw new Error(
        `Cannot delete cookie "${this.cookieDefineOptions.name}" from client: httpOnly cookies are server-only`,
      )
    }
    CookiesStore.set({ ...this.cookieDefineOptions, value: '', expires: new Date(0) })
  }

  get(): TValue | TFallback {
    if (!env.side.is.server && this.cookieDefineOptions.httpOnly) {
      throw new Error(
        `Cannot get cookie "${this.cookieDefineOptions.name}" from client: httpOnly cookies are server-only`,
      )
    }
    const stringified = CookiesStore.get(this.cookieDefineOptions.name)
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
   * Manually refresh the cookie value from client cookies.
   * This will trigger all registered `use` hooks to update.
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
   * React hook to reactively get the cookie value.
   * On the server (SSR), returns the current value directly.
   * On the client, returns a reactive value that updates when refresh() is called.
   *
   * Usage:
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
      return CookiesStore.get(this.cookieDefineOptions.name)
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

export type CookiesStoreGetter = {
  (name: string): string | undefined
  (): Record<string, string>
}
export type CookiesStoreSetter = (options: CookieOptionsInput) => void
