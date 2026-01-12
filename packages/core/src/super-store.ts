import { env } from '@point0/env'
import type { AsyncLocalStorage } from 'node:async_hooks'
import type { DataTransformer, DataTransformerExtended } from './types.js'
import { blankDataTransformerExtended, toExtendedTransformer } from './utils.js'

export class SuperStore {
  static instance: SuperStore = new SuperStore()

  _reset(): SuperStore {
    const newInstance = new SuperStore()
    SuperStore.instance = newInstance
    return newInstance
  }

  prepared = new Map<string, unknown>()

  touched = new Set<string>()

  items = new Map<string, SuperStoreItem>()

  serverStorage: SuperStoreServerStorage | undefined

  clientState: SuperStoreState = {}

  transformer: DataTransformerExtended | undefined | false

  private constructor() {
    if (env.target.is.server) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      this.serverStorage = new (require('node:async_hooks').AsyncLocalStorage)() as AsyncLocalStorage<SuperStoreState>
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
    serverStorageState: SuperStoreItemsValues<TItems>,
    callback: () => TResult,
  ) => TResult {
    return <TResult>(serverStorageState: SuperStoreItemsValues<TItems>, callback: () => TResult): TResult => {
      return this.runWithServerStorageState(serverStorageState, callback)
    }
  }

  getItem<TValue = unknown>(name: string): SuperStoreItem<TValue> | undefined {
    return this.items.get(name)
  }

  getValue<TValue = unknown>(name: string): TValue | undefined {
    const state = this.getState()
    if (name in state) {
      return state[name] as TValue | undefined
    }

    const item = this.getItem(name)
    if (item) {
      if (this.prepared.has(name)) {
        const dehydratedValue = this.prepared.get(name)
        const hydratedValue = item.hydrate(dehydratedValue)
        this.prepared.delete(name)
        this.touched.add(name)
        state[name] = hydratedValue
        return hydratedValue as TValue
      }
      const initialValue = item.init()
      this.touched.add(name)
      state[name] = initialValue
      return initialValue as TValue
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

  clearState(): void {
    const state = this.getState()
    for (const itemName of Object.keys(state)) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete state[itemName as keyof SuperStoreState]
    }
    this.touched.clear()
  }

  clearPrepared(): void {
    this.prepared.clear()
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

  prepare(dehydrated: Record<string, unknown>): void {
    for (const [itemName, dehydratedValue] of Object.entries(dehydrated)) {
      this.prepared.set(itemName, dehydratedValue)
    }
  }

  prepareFromString(dehydratedString: string, transformer?: DataTransformerExtended | false | undefined): void {
    this.prepare(this.parse(dehydratedString, transformer))
  }

  // dehydrateToRecordOfStrings(): Record<string, string> {
  //   const dehydrated: Record<string, string> = {}
  //   for (const item of this.items.values()) {
  //     if (!item.ssr) {
  //       continue
  //     }
  //     const stringifiedValue = item.stringify()
  //     if (stringifiedValue !== undefined) {
  //       dehydrated[item.name] = stringifiedValue
  //     }
  //   }
  //   return dehydrated
  // }

  // dehydrateToString(): string {
  //   return JSON.stringify(this.dehydrateToRecordOfStrings())
  // }

  // prepareFromRecordOfStrings(recordOfStrings: Record<string, string>): void {
  //   for (const [itemName, itemStringifiedValue] of Object.entries(recordOfStrings)) {
  //     this.dehydrated.set(itemName, itemStringifiedValue)
  //   }
  // }

  // static parseToRecordOfStrings(dehydratedString: string): Record<string, string> {
  //   const recordOfStrings = JSON.parse(dehydratedString) as unknown
  //   if (!recordOfStrings || typeof recordOfStrings !== 'object') {
  //     throw new Error(`Invalid dehydrated string, expected parsed to object, got ${typeof recordOfStrings}`)
  //   }
  //   for (const [itemName, itemStringifiedValue] of Object.entries(recordOfStrings)) {
  //     if (typeof itemStringifiedValue !== 'string') {
  //       throw new Error(
  //         `Invalid dehydrated string for item "${itemName}", expected parsed to string, got ${typeof itemStringifiedValue}`,
  //       )
  //     }
  //   }
  //   return recordOfStrings as Record<string, string>
  // }

  // prepareFromString(dehydratedString: string): void {
  //   const recordOfStrings = SuperStore.parseToRecordOfStrings(dehydratedString)
  //   this.prepareFromRecordOfStrings(recordOfStrings)
  // }
}

export const superstore = SuperStore.instance
export const ss = SuperStore.instance

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

export type SuperStoreServerStorage = AsyncLocalStorage<SuperStoreState>

export type SuperStoreState = { [key: string]: unknown }

export type ProxyResult<TItems extends Record<string, AnyNiceSuperStoreItem>> = {
  [K in keyof TItems]: TItems[K] extends NiceSuperStoreItem<infer TValue, any>
    ? TValue
    : TItems[K] extends NiceUnsettableRedefinableSuperStoreItem<infer TValue, any>
      ? TValue
      : TItems[K] extends NiceReadonlySuperStoreItem<infer TValue, any>
        ? TValue
        : never
}

export type SuperStoreItemsValues<TItems extends Record<string, AnyNiceSuperStoreItem>> = {
  [K in keyof TItems]: TItems[K] extends NiceSuperStoreItem<infer TValue, any>
    ? TValue
    : TItems[K] extends NiceUnsettableRedefinableSuperStoreItem<infer TValue, any>
      ? TValue
      : TItems[K] extends NiceReadonlySuperStoreItem<infer TValue, any>
        ? TValue
        : never
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
