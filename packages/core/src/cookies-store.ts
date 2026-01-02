import { useEffect, useRef, useState } from 'react'
import { Point0 } from './index.js'
import type { PointRequest } from './request.js'
import type { ResponseEffectsManager } from './response-effects.js'
import { SuperStore } from './super-store.js'
import type { DataTransformer, DataTransformerExtended } from './types.js'
import { blankDataTransformerExtended, toExtendedTransformer } from './utils.js'

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

export type CookieOptionsInputWithDefaultValueAndHttpOnly<TValue> = Omit<CookieOptionsInput, 'value' | 'httpOnly'> & {
  value: TValue
  httpOnly: true
}
export type CookieOptionsInputWithDefaultValueAndNotHttpOnly<TValue> = Omit<
  CookieOptionsInput,
  'value' | 'httpOnly'
> & {
  value: TValue
  httpOnly?: false
}
export type CookieOptionsInputWithoutDefaultValueAndHttpOnly = Omit<CookieOptionsInput, 'value' | 'httpOnly'> & {
  value?: undefined
  httpOnly: true
}
export type CookieOptionsInputWithoutDefaultValueAndNotHttpOnly = Omit<CookieOptionsInput, 'value' | 'httpOnly'> & {
  value?: undefined
  httpOnly?: false
}

// type InferDefaultValue<
//   TCookieOptionsInputWithDefaultValue extends
//     | CookieOptionsInputWithDefaultValueAndHttpOnly<any>
//     | CookieOptionsInputWithDefaultValueAndNotHttpOnly<any>
//     | CookieOptionsInputWithoutDefaultValueAndHttpOnly
//     | CookieOptionsInputWithoutDefaultValueAndNotHttpOnly,
// > =
//   TCookieOptionsInputWithDefaultValue extends CookieOptionsInputWithDefaultValueAndHttpOnly<infer TValue>
//     ? TValue extends undefined
//       ? undefined
//       : TValue
//     : TCookieOptionsInputWithDefaultValue extends CookieOptionsInputWithDefaultValueAndNotHttpOnly<infer TValue>
//       ? TValue extends undefined
//         ? undefined
//         : TValue
//       : undefined
// type InferHttpOnly<
//   TCookieOptionsInputWithDefaultValue extends
//     | CookieOptionsInputWithDefaultValueAndHttpOnly<any>
//     | CookieOptionsInputWithDefaultValueAndNotHttpOnly<any>
//     | CookieOptionsInputWithoutDefaultValueAndHttpOnly
//     | CookieOptionsInputWithoutDefaultValueAndNotHttpOnly,
// > =
//   TCookieOptionsInputWithDefaultValue extends CookieOptionsInputWithDefaultValueAndHttpOnly<any>
//     ? true
//     : TCookieOptionsInputWithDefaultValue extends CookieOptionsInputWithoutDefaultValueAndHttpOnly
//       ? true
//       : false

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

  // define(
  //   ...args: TTransformer extends null ? [cookieOptionsInput: CookieOptionsInputWithDefaultValue<string>] : never[]
  // ): CookiesStoreItem<string>
  // define<TValue>(
  //   ...args: TTransformer extends null
  //     ? [cookieOptionsInput: CookieOptionsInputWithDefaultValue<TValue>, transformer: DataTransformer]
  //     : [ShowError<`Transformer is required for setting cookie with custom value type`>]
  // ): CookiesStoreItem<TValue>
  // define<TValue>(
  //   ...args: TTransformer extends DataTransformerExtended
  //     ? [cookieOptionsInput: CookieOptionsInputWithDefaultValue<TValue>]
  //     : never[]
  // ): CookiesStoreItem<TValue>
  // define(
  //   ...args: TTransformer extends DataTransformerExtended
  //     ? [cookieOptionsInput: CookieOptionsInputWithDefaultValue<string>, transformer: null]
  //     : never[]
  // ): CookiesStoreItem<string>
  // define(
  //   ...args:
  //     | [cookieOptionsInput: CookieOptionsInputWithDefaultValue<any>, transformer?: DataTransformer | null]
  //     | never[]
  //     | [ShowError<any>]
  // ): CookiesStoreItem<any> {
  //   const cookieOptionsInput: CookieOptionsInputWithDefaultValue<any> =
  //     args[0] as CookieOptionsInputWithDefaultValue<any>
  //   const transformer: DataTransformerExtended | null = args[1] ? toExtendedTransformer(args[1]) : this.transformer
  //   const item = new CookiesStoreItem<any>({
  //     cookiesStore: this,
  //     cookieOptionsInput,
  //     transformer,
  //   })
  //   CookiesStore.items.add(item)
  //   return item
  // }
  static define<TValue = string>(
    cookieOptionsInput: CookieOptionsInputWithDefaultValueAndNotHttpOnly<TValue>,
    transformer?: DataTransformer | undefined,
  ): CookiesStoreItem<TValue, TValue, false>
  static define<TValue = string>(
    cookieOptionsInput: CookieOptionsInputWithDefaultValueAndHttpOnly<TValue>,
    transformer?: DataTransformer | undefined,
  ): Omit<CookiesStoreItem<TValue, TValue, true>, 'use' | 'refresh'>
  static define<TValue = string>(
    cookieOptionsInput: CookieOptionsInputWithoutDefaultValueAndNotHttpOnly,
    transformer?: DataTransformer | undefined,
  ): CookiesStoreItem<TValue, undefined, false>
  static define<TValue = string>(
    cookieOptionsInput: CookieOptionsInputWithoutDefaultValueAndHttpOnly,
    transformer?: DataTransformer | undefined,
  ): Omit<CookiesStoreItem<TValue, undefined, true>, 'use' | 'refresh'>
  static define<TValue = string>(
    cookieOptionsInput:
      | CookieOptionsInputWithDefaultValueAndNotHttpOnly<TValue>
      | CookieOptionsInputWithDefaultValueAndHttpOnly<TValue>
      | CookieOptionsInputWithoutDefaultValueAndNotHttpOnly
      | CookieOptionsInputWithoutDefaultValueAndHttpOnly,
    transformer?: DataTransformer | undefined,
  ): CookiesStoreItem<any, any, any> {
    const transformerHere = transformer ? toExtendedTransformer(transformer) : CookiesStore.transformer
    const item = new CookiesStoreItem<any, any, any>({
      cookieOptionsInput,
      transformer: transformerHere,
    })
    CookiesStore.items.add(item)
    return item
  }

  static readonly serverCookieGetter: CookiesStoreGetter = (name) => {
    const request = SuperStore.getWeak<PointRequest | undefined>('__POINT0_POINT_REQUEST__')
    if (!request) {
      throw new Error('Request is undefined while try to get cookie from server')
    }
    return request.cookies[name]
  }
  static readonly serverCookieSetter: CookiesStoreSetter = (cookieOptionsInput) => {
    const responseEffectsManager = SuperStore.getWeak<ResponseEffectsManager | undefined>(
      '__POINT0_RESPONSE_EFFECTS_MANAGER__',
    )
    if (!responseEffectsManager) {
      throw new Error('Response effects manager is undefined while try to set cookie from server')
    }
    responseEffectsManager.set.cookies(cookieOptionsInput)
  }

  static set: CookiesStoreSetter = (cookieOptionsInput) => {
    if (!Point0.isServer && cookieOptionsInput.httpOnly) {
      throw new Error(`Cannot set cookie "${cookieOptionsInput.name}" from client: httpOnly cookies are server-only`)
    }
    if (Point0.isServer) {
      CookiesStore.serverCookieSetter(cookieOptionsInput)
    } else {
      CookiesStore.clientCookieSetter(cookieOptionsInput)
    }
  }

  static get: CookiesStoreGetter = (name) => {
    if (Point0.isServer) {
      return CookiesStore.serverCookieGetter(name)
    } else {
      return CookiesStore.clientCookieGetter(name)
    }
  }

  static refresh(): void {
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
}

class CookiesStoreItem<TValue, TDefaultValue, THttpOnly extends boolean> {
  private readonly cookieOptionsInput: Omit<CookieOptionsInput, 'value'>
  private readonly defaultValue: TDefaultValue
  private readonly transformer: DataTransformerExtended | null
  private readonly refreshCallbacks = new Set<() => void>()

  constructor({
    cookieOptionsInput,
    transformer,
  }: {
    cookieOptionsInput:
      | CookieOptionsInputWithDefaultValueAndNotHttpOnly<TValue>
      | CookieOptionsInputWithDefaultValueAndHttpOnly<TValue>
      | CookieOptionsInputWithoutDefaultValueAndNotHttpOnly
      | CookieOptionsInputWithoutDefaultValueAndHttpOnly
    transformer: DataTransformerExtended | null
  }) {
    const { value: defaultValue, ...cookieOptionsInputWithoutValue } = cookieOptionsInput
    this.cookieOptionsInput = cookieOptionsInputWithoutValue
    this.defaultValue = defaultValue as TDefaultValue
    this.transformer = transformer
  }

  /**
   * Check if this cookie is httpOnly (server-only).
   */
  isHttpOnly(): THttpOnly {
    return (this.cookieOptionsInput.httpOnly === true) as THttpOnly
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
    const stringified = this.transformer
      ? typeof value === 'string'
        ? value
        : (this.transformer.stringify(value) as string)
      : (value as string)
    CookiesStore.set({ ...this.cookieOptionsInput, value: stringified })
  }

  delete() {
    if (!Point0.isServer && this.cookieOptionsInput.httpOnly) {
      throw new Error(
        `Cannot delete cookie "${this.cookieOptionsInput.name}" from client: httpOnly cookies are server-only`,
      )
    }
    CookiesStore.set({ ...this.cookieOptionsInput, value: '', expires: new Date(0) })
  }

  get(): TValue | TDefaultValue {
    if (!Point0.isServer && this.cookieOptionsInput.httpOnly) {
      throw new Error(
        `Cannot get cookie "${this.cookieOptionsInput.name}" from client: httpOnly cookies are server-only`,
      )
    }
    const stringified = CookiesStore.get(this.cookieOptionsInput.name)
    if (stringified === undefined) {
      return this.defaultValue
    }
    try {
      return this.transformer
        ? ((this.transformer.parse(stringified) ?? stringified) as TValue)
        : (stringified as TValue)
    } catch {
      return stringified as TValue
    }
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
  use(onChange?: (value: TValue | TDefaultValue) => void): TValue | TDefaultValue {
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

    const getStringifiedValue = (): string | undefined => {
      return CookiesStore.get(this.cookieOptionsInput.name)
    }

    const getValue = (): TValue | TDefaultValue => {
      const stringified = getStringifiedValue()
      if (stringified === undefined) {
        return this.defaultValue
      }
      try {
        return this.transformer
          ? ((this.transformer.parse(stringified) ?? stringified) as TValue)
          : (stringified as TValue)
      } catch (error) {
        console.error('Parsing cookie failed', this.cookieOptionsInput.name, stringified, error)
        return stringified as TValue
      }
    }

    const initialValue = getValue()
    const initialStringified = getStringifiedValue()
    const [value, setValue] = useState<TValue | TDefaultValue>(initialValue)
    const onChangeRef = useRef(onChange)
    const prevValueRef = useRef<TValue | TDefaultValue>(initialValue)
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
          const newValue = getValue()
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
