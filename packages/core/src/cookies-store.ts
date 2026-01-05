import { useEffect, useRef, useState } from 'react'
import { Request0 } from './request0.js'
import { Response0 } from './response0.js'
import type { DataTransformer, DataTransformerExtended } from './types.js'
import { blankDataTransformerExtended, toExtendedTransformer } from './utils.js'
import { ClientServerHelpers } from './client-server.js'
import { runtime } from './runtime.js'

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
  static clientDocumentCookieGetter: CookiesStoreGetter = (name) => {
    if (typeof document !== 'undefined') {
      return document.cookie
        .split('; ')
        .find((row) => row.startsWith(`${name}=`))
        ?.split('=')[1]
    }
    return undefined
  }

  static clientDocumentCookieSetter: CookiesStoreSetter = (options) => {
    if (typeof document !== 'undefined') {
      document.cookie = `${options.name}=${options.value}`
      document.cookie += `; Path=${options.path ?? '/'}`
      document.cookie += `; SameSite=${options.sameSite ?? 'lax'}`
      if (options.domain) {
        document.cookie += `; Domain=${options.domain}`
      }
      if (options.expires) {
        const expiresDate =
          typeof options.expires === 'string'
            ? new Date(options.expires)
            : options.expires instanceof Date
              ? options.expires
              : new Date(options.expires)
        document.cookie += `; Expires=${expiresDate.toUTCString()}`
      }
    }
  }

  static transformer: DataTransformerExtended = blankDataTransformerExtended
  static clientCookieGetter: CookiesStoreGetter = CookiesStore.clientDocumentCookieGetter
  static clientCookieSetter: CookiesStoreSetter = CookiesStore.clientDocumentCookieSetter
  static readonly items = new Set<CookiesStoreItem<any, any, any>>()

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
  static define(options: CookieDefineOptions<boolean, DataTransformer | 'auto' | boolean, any> | string) {
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
        : typeof options.transformer === 'object'
          ? toExtendedTransformer(options.transformer)
          : CookiesStore.transformer
    const cookieDefineOptions = typeof options === 'string' ? { name: options } : options
    const fallback = typeof options === 'string' ? undefined : options.fallback
    const item = new CookiesStoreItem<any, any, any>({
      cookieDefineOptions,
      transformerPolicy,
      transformer,
      fallback,
    })
    CookiesStore.items.add(item)
    return item
  }

  static readonly serverCookieGetter: CookiesStoreGetter = (name) => {
    const request0 = Request0.get()
    return request0.cookies[name]
  }
  static readonly serverCookieSetter: CookiesStoreSetter = (cookieOptionsInput) => {
    const response0 = Response0.get()
    response0.set.cookies(cookieOptionsInput)
  }

  static set: CookiesStoreSetter = (cookieOptionsInput) => {
    if (!runtime.is.server && cookieOptionsInput.httpOnly) {
      throw new Error(`Cannot set cookie "${cookieOptionsInput.name}" from client: httpOnly cookies are server-only`)
    }
    if (runtime.is.server) {
      CookiesStore.serverCookieSetter(cookieOptionsInput)
    } else {
      CookiesStore.clientCookieSetter(cookieOptionsInput)
    }
  }

  static get: CookiesStoreGetter = (name) => {
    if (runtime.is.server) {
      return CookiesStore.serverCookieGetter(name)
    } else {
      return CookiesStore.clientCookieGetter(name)
    }
  }

  static refresh(): void {
    if (runtime.is.server) {
      throw new Error('refresh() is only available on the client')
    }
    this.items.forEach((item) => {
      // Skip httpOnly cookies as they are server-only
      if (!item.isHttpOnly()) {
        item.refresh()
      }
    })
  }
}

class CookiesStoreItem<TValue, TFallback, THttpOnly extends boolean> {
  private readonly cookieDefineOptions: CookieDefineOptions<THttpOnly, any, TFallback>
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
    cookieDefineOptions: CookieDefineOptions<THttpOnly, any, TFallback>
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
    if (!runtime.is.server && this.cookieDefineOptions.httpOnly) {
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
    if (!runtime.is.server && this.cookieDefineOptions.httpOnly) {
      throw new Error(
        `Cannot delete cookie "${this.cookieDefineOptions.name}" from client: httpOnly cookies are server-only`,
      )
    }
    CookiesStore.set({ ...this.cookieDefineOptions, value: '', expires: new Date(0) })
  }

  get(): TValue | TFallback {
    if (!runtime.is.server && this.cookieDefineOptions.httpOnly) {
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
    if (runtime.is.server) {
      throw new Error('refresh() is only available on the client')
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
    if (runtime.is.server) {
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

export type CookiesStoreGetter = (name: string) => string | undefined
export type CookiesStoreSetter = (options: CookieOptionsInput) => void
