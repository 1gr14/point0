/* eslint-disable import/first */
import { env } from '@point0/env'
// I do not know why, but it is only way to do it to work in bun and vite at the same time
;(globalThis as any).__POINT0_SUPER_STORE_SERVER_STORAGE__ ||= env.target.is.client
  ? null
  : // eslint-disable-next-line @typescript-eslint/no-require-imports
    (new (require('node:async_hooks').AsyncLocalStorage)() as AsyncLocalStorage<SuperStoreState>)
;(globalThis as any).__POINT0_SUPER_STORE_CLIENT_STATE__ ||= {}

import type { AsyncLocalStorage } from 'node:async_hooks'
import type { DataTransformer, DataTransformerExtended } from './types.js'
import { blankDataTransformerExtended, toExtendedTransformer } from './utils.js'

export class SuperStore {
  static instance: SuperStore = (globalThis as any).__POINT0_SUPER_STORE_INSTANCE__ || new SuperStore()

  prepared = new Map<string, unknown>()

  touched = new Set<string>()

  items = new Map<string, SuperStoreItem>()

  serverStorage: SuperStoreServerStorage | undefined

  clientState: SuperStoreState

  transformer: DataTransformerExtended | undefined | false

  private constructor() {
    if (env.target.is.server) {
      this.serverStorage = (globalThis as any).__POINT0_SUPER_STORE_SERVER_STORAGE__
    }
    this.clientState = (globalThis as any).__POINT0_SUPER_STORE_CLIENT_STATE__
  }

  reset: {
    (): void
    prepared: () => void
    touched: () => void
    items: () => void
    serverStorage: () => void
    clientState: () => void
    transformer: () => void
  } = Object.assign(
    () => {
      this.prepared.clear()
      this.touched.clear()
      this.items.clear()
      this.transformer = undefined
      this.resetClientState()
      this.resetServerStorage()
    },
    {
      prepared: () => this.prepared.clear(),
      touched: () => this.touched.clear(),
      items: () => this.items.clear(),
      transformer: () => (this.transformer = undefined),
      serverStorage: () => {
        this.resetServerStorage()
      },
      clientState: () => {
        this.resetClientState()
      },
    },
  )

  private resetClientState(): void {
    for (const key of Object.keys(this.clientState)) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete this.clientState[key]
    }
  }

  private resetServerStorage(): void {
    if (env.target.is.server) {
      this.serverStorage = (globalThis as any).__POINT0_SUPER_STORE_SERVER_STORAGE__
    } else {
      this.serverStorage = undefined
    }
  }

  setTransformer(transformer: DataTransformer | false): void {
    this.transformer = transformer === false ? false : toExtendedTransformer(transformer)
  }

  getSuitableTransformer(providedTransformer: DataTransformerExtended | false | undefined): DataTransformerExtended {
    if (providedTransformer === false) {
      return blankDataTransformerExtended
    }
    if (this.transformer === false) {
      return blankDataTransformerExtended
    }
    return providedTransformer ?? this.transformer ?? blankDataTransformerExtended
  }

  init() {
    for (const item of this.items.values()) {
      item.init()
    }
  }

  getState(): SuperStoreState {
    if (env.target.is.client) {
      return this.clientState
    } else {
      const serverStorage = this.serverStorage
      if (!serverStorage) {
        throw new Error(
          'Server storage is not initialized. We do not know how it is possible. Please, report this issue to the developers',
        )
      }
      const serverStorageState = serverStorage.getStore()
      if (!serverStorageState) {
        throw new Error(
          'Server store not found. You should call this function on server only inside server context wrapped in superstore.runWithServerStorageProvider(serverStorageState, callback). So call it in hooks, components, functions, not in top of files without wrappers',
        )
      }
      return serverStorageState
    }
  }

  private _parseDefineArgs(
    ...args:
      | [name: string, init: () => any, ssr?: boolean]
      | [
          name: string,
          init: () => any,
          ssr: {
            dehydrate: (value: any) => any
            hydrate: (dehydratedValue: any, init: () => any) => any
          },
        ]
  ): {
    name: string
    init: () => any
    ssr: boolean
    dehydrate: (value: any) => any
    hydrate: (dehydratedValue: any, init: () => any) => any
  } {
    if (typeof args[2] === 'undefined') {
      return {
        name: args[0],
        init: args[1],
        dehydrate: (value: any) => value,
        hydrate: (value: any) => value,
        ssr: false,
      }
    }
    if (typeof args[2] === 'boolean') {
      return {
        name: args[0],
        init: args[1],
        dehydrate: (value: any) => value,
        hydrate: (value: any) => value,
        ssr: args[2],
      }
    }
    return {
      name: args[0],
      init: args[1],
      dehydrate: args[2].dehydrate,
      hydrate: args[2].hydrate,
      ssr: true,
    }
  }

  define<TValue, TSsr extends boolean = false>(
    name: string,
    init: () => TValue,
    ssr?: TSsr,
  ): NiceSuperStoreItem<TValue, TSsr extends false ? undefined : TValue>
  define<TValue, TDehydratedValue>(
    key: string,
    init: () => TValue,
    ssr: {
      dehydrate: (value: TValue) => TDehydratedValue
      hydrate: (dehydratedValue: TDehydratedValue, init: () => TValue) => TValue
    },
  ): NiceSuperStoreItem<TValue, TDehydratedValue>
  define(...args: Parameters<typeof this._parseDefineArgs>): any {
    const { name, init, ssr, dehydrate, hydrate } = this._parseDefineArgs(...args)
    const exItem = this.items.get(name)
    if (exItem) {
      throw new Error(`Item with name "${name}" already defined`)
    }
    const item: SuperStoreItem = new SuperStoreItem({ name, init, dehydrate, hydrate, ssr, superstore: this })
    this.items.set(name, item)
    return item
  }

  proxy<TItems extends Record<string, AnyNiceSuperStoreItem>>(items: TItems): ProxyResult<TItems> {
    const proxy = new Proxy(
      {},
      {
        get(target, prop) {
          if (typeof prop !== 'string') {
            return undefined
          }
          return items[prop].get()
        },
        set(target, prop, value) {
          if (typeof prop !== 'string') {
            return false
          }
          const item = items[prop]
          if ('readonly' in item && item.readonly) {
            throw new Error(`Cannot set value to readonly item "${prop}"`)
          }
          if ('set' in item && typeof item.set === 'function') {
            item.set(value)
            return true
          }
          throw new Error(`Cannot set value to item "${prop}"`)
        },
      },
    ) as ProxyResult<TItems>
    return proxy
  }

  createTypedRunWithServerStorageState<TItems extends Record<string, AnyNiceSuperStoreItem>>(): <TResult>(
    serverStorageState: SuperStoreItemsValuesOrErrors<TItems>,
    callback: () => TResult,
  ) => TResult {
    return <TResult>(serverStorageState: SuperStoreItemsValuesOrErrors<TItems>, callback: () => TResult): TResult => {
      return this.runWithServerStorageState(serverStorageState, callback)
    }
  }

  getItem<TValue = unknown>(name: string): SuperStoreItem<TValue> | undefined {
    return this.items.get(name)
  }

  private static returnValueOrError<TValue = unknown>(value: TValue | Error, allowError = false): TValue | Error {
    if (value instanceof Error) {
      if (allowError) {
        return value
      }
      throw value
    }
    return value
  }

  getValue<TValue = unknown>(name: string): TValue | undefined
  getValue<TValue = unknown>(name: string, allowError: true): TValue | Error | undefined
  getValue(name: string, allowError?: boolean) {
    const state = this.getState()
    if (name in state) {
      return SuperStore.returnValueOrError(state[name], allowError)
    }

    const item = this.getItem(name)
    if (item) {
      if (this.prepared.has(name)) {
        const dehydratedValue = this.prepared.get(name)
        const hydratedValue = item.hydrate(dehydratedValue)
        this.prepared.delete(name)
        this.touched.add(name)
        state[name] = hydratedValue
        return SuperStore.returnValueOrError(hydratedValue, allowError)
      }
      const initialValue = item.init()
      this.touched.add(name)
      state[name] = initialValue
      return SuperStore.returnValueOrError(initialValue, allowError)
    }

    this.touched.add(name)
    state[name] = undefined
    return undefined
  }

  setValue<TValue = unknown>(name: string, value: TValue): void {
    this.touched.add(name)
    this.prepared.delete(name)
    const state = this.getState()
    state[name] = value
  }

  runWithServerStorageState<TResult>(serverStorageState: Partial<SuperStoreState>, callback: () => TResult): TResult {
    if (this.serverStorage) {
      return this.serverStorage.run(serverStorageState, callback)
    } else {
      return callback()
    }
  }

  dehydrate(): Record<string, unknown> {
    const dehydrated: Record<string, unknown> = {}
    for (const item of this.items.values()) {
      if (!item.ssr) {
        continue
      }
      dehydrated[item.name] = item.dehydrate()
    }
    return dehydrated
  }

  stringify(transformer?: DataTransformerExtended | false | undefined): string {
    return this.getSuitableTransformer(transformer).stringify(this.dehydrate()) as string
  }

  parse(dehydratedString: string, transformer?: DataTransformerExtended | false | undefined): Record<string, unknown> {
    return this.getSuitableTransformer(transformer).parse(dehydratedString)
  }

  prepare(dehydrated: string, transformer?: DataTransformerExtended | false | undefined): void
  prepare(dehydrated: Record<string, unknown>, transformer?: DataTransformerExtended | false | undefined): void
  prepare(
    dehydrated: Record<string, unknown> | string,
    transformer?: DataTransformerExtended | false | undefined,
  ): void {
    if (typeof dehydrated === 'string') {
      dehydrated = this.parse(dehydrated, transformer)
    }
    for (const [itemName, dehydratedValue] of Object.entries(dehydrated)) {
      this.prepared.set(itemName, dehydratedValue)
    }
  }
}

export class SuperStoreItem<TValue = any, TDehydratedValue = any> {
  superstore: SuperStore
  name: string
  init: () => TValue
  ssr: TDehydratedValue extends undefined ? false : true
  dehydrate: () => TDehydratedValue
  hydrate: (dehydratedValue: TDehydratedValue) => TValue
  readonly = false

  constructor({
    name,
    init,
    ssr,
    dehydrate,
    hydrate,
    superstore,
  }: {
    superstore: SuperStore
    name: string
    init: () => TValue
    ssr: TDehydratedValue extends undefined ? false : true
    dehydrate: (value: TValue) => TDehydratedValue
    hydrate: (dehydratedValue: TDehydratedValue, init: () => TValue) => TValue
  }) {
    this.superstore = superstore
    this.name = name
    this.init = init
    this.ssr = ssr
    this.dehydrate = () => dehydrate(this.get())
    this.hydrate = (dehydratedValue: TDehydratedValue) => hydrate(dehydratedValue, init)
  }

  get = (): TValue => {
    return this.superstore.getValue(this.name) as TValue
  }

  set = (value: TValue): void => {
    this.superstore.setValue(this.name, value)
  }

  redefine = (init: () => TValue): void => {
    this.init = init
  }

  get config() {
    return {
      name: this.name,
      init: this.init,
      ssr: this.ssr,
      dehydrate: this.dehydrate,
      hydrate: this.hydrate,
    }
  }
}

export const superstore = SuperStore.instance
export const ss = SuperStore.instance

export type SuperStoreServerStorage = AsyncLocalStorage<SuperStoreState>

export type SuperStoreState = { [key: string]: unknown }

export type ProxyResult<TItems extends Record<string, AnyNiceSuperStoreItem>> = {
  [K in keyof TItems]: TItems[K] extends AnyNiceSuperStoreItem<infer TValue, any> ? TValue : never
}

export type SuperStoreItemsValues<TItems extends Record<string, AnyNiceSuperStoreItem>> = {
  [K in keyof TItems]: TItems[K] extends AnyNiceSuperStoreItem<infer TValue, any> ? TValue : never
}

export type SuperStoreItemsValuesOrErrors<TItems extends Record<string, AnyNiceSuperStoreItem>> = {
  [K in keyof TItems]: TItems[K] extends AnyNiceSuperStoreItem<infer TValue, any> ? TValue | Error : never
}

export type NiceSuperStoreItem<TValue = any, TDehydratedValue = any> = Pick<
  SuperStoreItem<TValue, TDehydratedValue>,
  'get' | 'set' | 'config'
>
export type NiceUnsettableRedefinableSuperStoreItem<TValue = any, TDehydratedValue = any> = Pick<
  SuperStoreItem<TValue, TDehydratedValue>,
  'get' | 'redefine' | 'config'
>
export type NiceReadonlySuperStoreItem<TValue = any, TDehydratedValue = any> = Pick<
  SuperStoreItem<TValue, TDehydratedValue>,
  'get' | 'config'
>
export type AnyNiceSuperStoreItem<TValue = any, TDehydratedValue = any> =
  | NiceSuperStoreItem<TValue, TDehydratedValue>
  | NiceUnsettableRedefinableSuperStoreItem<TValue, TDehydratedValue>
  | NiceReadonlySuperStoreItem<TValue, TDehydratedValue>

export type ToNiceSuperStoreItem<TSuperStorItem extends SuperStoreItem> = Pick<TSuperStorItem, 'get' | 'set' | 'config'>
export type ToNiceUnsettableRedefinableSuperStoreItem<TSuperStorItem extends SuperStoreItem> = Pick<
  TSuperStorItem,
  'get' | 'redefine' | 'config'
>
export type ToNiceReadonlySuperStoreItem<TSuperStorItem extends SuperStoreItem> = Pick<TSuperStorItem, 'get' | 'config'>
