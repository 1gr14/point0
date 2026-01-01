import { Point0 } from './index.js'
import type { PointRequest } from './request.js'
import type { ResponseEffectsManager } from './response-effects.js'
import { SuperStore } from './super-store.js'
import type { DataTransformer, DataTransformerExtended, ShowError } from './types.js'
import { toExtendedTransformer } from './utils.js'
import { useEffect, useRef, useState } from 'react'

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

export type CookieOptionsInputWithDefaultValue<TValue = string> = Omit<CookieOptionsInput, 'value'> & { value?: TValue }

export class CookiesStore<TTransformer extends DataTransformerExtended | null = null> {
  private readonly transformer: DataTransformerExtended | null = null
  private readonly clientCookieGetter: CookiesStoreGetter
  private readonly clientCookieSetter: CookiesStoreSetter
  private readonly items = new Set<CookiesStoreItem<any>>()

  static stores = new Set<CookiesStore<any>>()

  constructor(options: {
    clientCookieGetter: CookiesStoreGetter
    clientCookieSetter: CookiesStoreSetter
    transformer: DataTransformerExtended | null
  }) {
    this.clientCookieGetter = options.clientCookieGetter
    this.clientCookieSetter = options.clientCookieSetter
    this.transformer = options.transformer
    CookiesStore.stores.add(this)
  }

  static create<TTransformer extends DataTransformerExtended | null = null>(options?: {
    clientCookieGetter?: CookiesStoreGetter
    clientCookieSetter?: CookiesStoreSetter
    transformer?: TTransformer
  }): CookiesStore<TTransformer> {
    const clientCookieGetter: CookiesStoreGetter =
      options?.clientCookieGetter ??
      ((name) => {
        if (typeof document !== 'undefined') {
          return document.cookie
            .split('; ')
            .find((row) => row.startsWith(`${name}=`))
            ?.split('=')[1]
        }
        return undefined
      })

    const clientCookieSetter: CookiesStoreSetter =
      options?.clientCookieSetter ??
      ((options) => {
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
      })

    const transformer: DataTransformerExtended | null = options?.transformer ?? null

    return new CookiesStore<TTransformer>({
      clientCookieGetter,
      clientCookieSetter,
      transformer,
    })
  }

  define(
    ...args: TTransformer extends null ? [cookieOptionsInput: CookieOptionsInputWithDefaultValue<string>] : never[]
  ): CookiesStoreItem<string>
  define<TValue>(
    ...args: TTransformer extends null
      ? [cookieOptionsInput: CookieOptionsInputWithDefaultValue<TValue>, transformer: DataTransformer]
      : [ShowError<`Transformer is required for setting cookie with custom value type`>]
  ): CookiesStoreItem<TValue>
  define<TValue>(
    ...args: TTransformer extends DataTransformerExtended
      ? [cookieOptionsInput: CookieOptionsInputWithDefaultValue<TValue>]
      : never[]
  ): CookiesStoreItem<TValue>
  define(
    ...args: TTransformer extends DataTransformerExtended
      ? [cookieOptionsInput: CookieOptionsInputWithDefaultValue<string>, transformer: null]
      : never[]
  ): CookiesStoreItem<string>
  define(
    ...args:
      | [cookieOptionsInput: CookieOptionsInputWithDefaultValue<any>, transformer?: DataTransformer | null]
      | never[]
      | [ShowError<any>]
  ): CookiesStoreItem<any> {
    const cookieOptionsInput: CookieOptionsInputWithDefaultValue<any> =
      args[0] as CookieOptionsInputWithDefaultValue<any>
    const transformer: DataTransformerExtended | null = args[1] ? toExtendedTransformer(args[1]) : this.transformer
    const item = new CookiesStoreItem<any>({
      cookiesStore: this,
      cookieOptionsInput,
      transformer,
    })
    this.items.add(item)
    return item
  }

  private readonly serverCookieGetter: CookiesStoreGetter = (name) => {
    const request = SuperStore.getWeak<PointRequest | undefined>('__POINT0_POINT_REQUEST__')
    if (!request) {
      throw new Error('Request is undefined while try to get cookie from server')
    }
    return request.cookies[name]
  }
  private readonly serverCookieSetter: CookiesStoreSetter = (cookieOptionsInput) => {
    const responseEffectsManager = SuperStore.getWeak<ResponseEffectsManager | undefined>(
      '__POINT0_RESPONSE_EFFECTS_MANAGER__',
    )
    if (!responseEffectsManager) {
      throw new Error('Response effects manager is undefined while try to set cookie from server')
    }
    responseEffectsManager.set.cookies(cookieOptionsInput)
  }

  set: CookiesStoreSetter = (cookieOptionsInput) => {
    if (!Point0.isServer && cookieOptionsInput.httpOnly) {
      throw new Error(`Cannot set cookie "${cookieOptionsInput.name}" from client: httpOnly cookies are server-only`)
    }
    if (Point0.isServer) {
      this.serverCookieSetter(cookieOptionsInput)
    } else {
      this.clientCookieSetter(cookieOptionsInput)
    }
  }

  get: CookiesStoreGetter = (name) => {
    if (Point0.isServer) {
      return this.serverCookieGetter(name)
    } else {
      return this.clientCookieGetter(name)
    }
  }

  /**
   * Manually refresh all cookie items from client cookies.
   * This will trigger all registered `use` hooks to update for all items.
   * Only available on the client.
   * httpOnly cookies are skipped (they are server-only).
   */
  refresh(): void {
    if (Point0.isServer) {
      throw new Error('refresh() is only available on the client')
    }
    this.items.forEach((item) => {
      // Skip httpOnly cookies as they are server-only
      if (!item.isHttpOnly()) {
        item.refresh()
      }
    })
  }

  static refresh(): void {
    CookiesStore.stores.forEach((store) => {
      store.refresh()
    })
  }
}

export class CookiesStoreItem<TValue> {
  private readonly cookiesStore: CookiesStore<any>
  private readonly cookieOptionsInput: Omit<CookieOptionsInput, 'value'>
  private readonly defaultValue: TValue | undefined
  private readonly transformer: DataTransformerExtended | null
  private readonly refreshCallbacks = new Set<() => void>()

  constructor({
    cookiesStore,
    cookieOptionsInput,
    transformer,
  }: {
    cookiesStore: CookiesStore<any>
    cookieOptionsInput: CookieOptionsInputWithDefaultValue<TValue>
    transformer: DataTransformerExtended | null
  }) {
    this.cookiesStore = cookiesStore
    const { value: defaultValue, ...cookieOptionsInputWithoutValue } = cookieOptionsInput
    this.cookieOptionsInput = cookieOptionsInputWithoutValue
    this.defaultValue = defaultValue ?? undefined
    this.transformer = transformer
  }

  /**
   * Check if this cookie is httpOnly (server-only).
   */
  isHttpOnly(): boolean {
    return this.cookieOptionsInput.httpOnly === true
  }

  set(value: TValue) {
    if (!Point0.isServer && this.cookieOptionsInput.httpOnly) {
      throw new Error(
        `Cannot set cookie "${this.cookieOptionsInput.name}" from client: httpOnly cookies are server-only`,
      )
    }
    if (value === undefined) {
      this.delete()
    }
    const stringified = this.transformer ? (this.transformer.stringify(value) as string) : (value as string)
    this.cookiesStore.set({ ...this.cookieOptionsInput, value: stringified })
  }

  delete() {
    if (!Point0.isServer && this.cookieOptionsInput.httpOnly) {
      throw new Error(
        `Cannot delete cookie "${this.cookieOptionsInput.name}" from client: httpOnly cookies are server-only`,
      )
    }
    this.cookiesStore.set({ ...this.cookieOptionsInput, value: '', expires: new Date(0) })
  }

  get(): TValue | undefined {
    if (!Point0.isServer && this.cookieOptionsInput.httpOnly) {
      throw new Error(
        `Cannot get cookie "${this.cookieOptionsInput.name}" from client: httpOnly cookies are server-only`,
      )
    }
    const stringified = this.cookiesStore.get(this.cookieOptionsInput.name)
    if (stringified === undefined) {
      return this.defaultValue
    }
    return this.transformer ? this.transformer.parse(stringified) : (stringified as TValue)
  }

  /**
   * Manually refresh the cookie value from client cookies.
   * This will trigger all registered `use` hooks to update.
   */
  refresh(): void {
    if (Point0.isServer) {
      throw new Error('refresh() is only available on the client')
    }
    if (this.cookieOptionsInput.httpOnly) {
      throw new Error(
        `Cannot refresh cookie "${this.cookieOptionsInput.name}" from client: httpOnly cookies are server-only`,
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
  use(onChange?: (value: TValue | undefined) => void): TValue | undefined {
    // On server, just return the current value
    if (Point0.isServer) {
      return this.get()
    }

    // Check if httpOnly cookie is being accessed from client
    if (this.cookieOptionsInput.httpOnly) {
      throw new Error(
        `Cannot use cookie "${this.cookieOptionsInput.name}" from client: httpOnly cookies are server-only`,
      )
    }

    const cookiesStore = this.cookiesStore
    const cookieOptionsInput = this.cookieOptionsInput
    const defaultValue = this.defaultValue
    const transformer = this.transformer
    const refreshCallbacks = this.refreshCallbacks
    const onChangeCallback = onChange

    const getStringifiedValue = (): string | undefined => {
      return cookiesStore.get(cookieOptionsInput.name)
    }

    const getValue = (): TValue | undefined => {
      const stringified = getStringifiedValue()
      if (stringified === undefined) {
        return defaultValue
      }
      return transformer ? transformer.parse(stringified) : (stringified as TValue)
    }

    const initialValue = getValue()
    const initialStringified = getStringifiedValue()
    const [value, setValue] = useState<TValue | undefined>(initialValue)
    const onChangeRef = useRef(onChangeCallback)
    const prevValueRef = useRef<TValue | undefined>(initialValue)
    const prevOriginalValueRef = useRef<string | undefined>(initialStringified)

    // Update the onChange ref when it changes
    useEffect(() => {
      onChangeRef.current = onChangeCallback
    }, [onChangeCallback])

    // Set up the refresh callback
    useEffect(() => {
      const refreshCallback = () => {
        const newStringified = getStringifiedValue()
        // Only update if the original stringified value actually changed
        if (newStringified !== prevOriginalValueRef.current) {
          const newValue = getValue()
          setValue(newValue)
          if (onChangeRef.current && prevValueRef.current !== newValue) {
            onChangeRef.current(newValue)
          }
          prevValueRef.current = newValue
          prevOriginalValueRef.current = newStringified
        }
      }

      refreshCallbacks.add(refreshCallback)

      return () => {
        refreshCallbacks.delete(refreshCallback)
      }
    }, [])

    return value
  }
}

export type CookiesStoreGetter = (name: string) => string | undefined
export type CookiesStoreSetter = (options: CookieOptionsInput) => void
