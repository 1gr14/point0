import { Point0 } from './index.js'
import type { PointRequest } from './request.js'
import type { ResponseEffectsManager } from './response-effects.js'
import { SuperStore } from './super-store.js'
import type { DataTransformer, DataTransformerExtended, ShowError } from './types.js'
import { toExtendedTransformer } from './utils.js'

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

  constructor(options: {
    clientCookieGetter: CookiesStoreGetter
    clientCookieSetter: CookiesStoreSetter
    transformer: DataTransformerExtended | null
  }) {
    this.clientCookieGetter = options.clientCookieGetter
    this.clientCookieSetter = options.clientCookieSetter
    this.transformer = options.transformer
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
    return new CookiesStoreItem<any>({
      cookiesStore: this,
      cookieOptionsInput,
      transformer,
    })
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
}

export class CookiesStoreItem<TValue> {
  private readonly cookiesStore: CookiesStore<any>
  private readonly cookieOptionsInput: Omit<CookieOptionsInput, 'value'>
  private readonly defaultValue: TValue | undefined
  private readonly transformer: DataTransformerExtended | null

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

  set(value: TValue) {
    if (value === undefined) {
      this.delete()
    }
    const stringified = this.transformer ? (this.transformer.stringify(value) as string) : (value as string)
    this.cookiesStore.set({ ...this.cookieOptionsInput, value: stringified })
  }

  delete() {
    this.cookiesStore.set({ ...this.cookieOptionsInput, value: '', expires: new Date(0) })
  }

  get(): TValue | undefined {
    const stringified = this.cookiesStore.get(this.cookieOptionsInput.name)
    if (stringified === undefined) {
      return this.defaultValue
    }
    return this.transformer ? this.transformer.parse(stringified) : (stringified as TValue)
  }
}

export type CookiesStoreGetter = (name: string) => string | undefined
export type CookiesStoreSetter = (options: CookieOptionsInput) => void
