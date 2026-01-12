import { env } from '@point0/env'
import type { AsyncLocalStorage } from 'node:async_hooks'
import type { DataTransformer, DataTransformerExtended } from './types.js'
import { blankDataTransformerExtended, toExtendedTransformer } from './utils.js'

export class SuperStore {
  private static readonly instances = new Map<string, SuperStore>()

  name: string

  prepared = new Map<string, string>()

  touched = new Set<string>()

  items = new Map<string, SuperStoreItem>()

  serverStorage: SuperStoreServerStorage | undefined

  clientState: SuperStoreState = {}

  transformer: DataTransformerExtended = blankDataTransformerExtended

  constructor(options: { name: string; transformer?: DataTransformer }) {
    if (env.target.is.server) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      this.serverStorage = new (require('node:async_hooks').AsyncLocalStorage)() as AsyncLocalStorage<SuperStoreState>
    }
    this.transformer = options.transformer ? toExtendedTransformer(options.transformer) : blankDataTransformerExtended
    this.name = options.name
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

  getItem<TValue = unknown>(name: string): SuperStoreItem<TValue> | undefined {
    return this.items.get(name)
  }

  getValue<TValue = unknown>(name: string): TValue | undefined {
    if (this.prepared.has(name)) {
      const preparedValue = this.prepared.get(name)
      if (preparedValue === undefined) {
        throw new Error(`Prepared value for store "${this.name}" for item "${name}" is undefined`)
      }
      const parsedValue = this.transformer.parse(preparedValue)
      this.prepared.delete(name)
      this.touched.add(name)
      return parsedValue as TValue
    }
    if (this.touched.has(name)) {
      const state = this.getState()
      return state[name] as TValue | undefined
    }
    const item = this.getItem(name)
    if (item) {
      const initialValue = item.init()
      this.touched.add(name)
      return initialValue as TValue
    }
    return undefined
  }

  setValue<TValue = unknown>(name: string, value: TValue): void {
    this.touched.add(name)
    this.prepared.delete(name)
    const state = this.getState()
    state[name] = value
  }

  runWithServerStorageProvider<TResult>(
    serverStorageState: Partial<SuperStoreState>,
    callback: () => TResult,
  ): TResult {
    if (this.serverStorage) {
      return this.serverStorage.run(serverStorageState, callback)
    } else {
      return callback()
    }
  }

  // hydration / prepareing

  dehydrateToRecordOfStrings(): Record<string, string> {
    const dehydrated: Record<string, string> = {}
    for (const item of this.items.values()) {
      if (!item.ssr) {
        continue
      }
      const stringifiedValue = item.stringify()
      if (stringifiedValue !== undefined) {
        dehydrated[item.name] = stringifiedValue
      }
    }
    return dehydrated
  }

  static dehydrateToRecordOfRecordsOfStrings({
    superstores = new Set<SuperStore>(),
    withGlobalInstances = true,
  }: {
    superstores: Set<SuperStore>
    withGlobalInstances: boolean
  }): Record<string, Record<string, string>> {
    const dehydrated: Record<string, Record<string, string>> = {}
    if (withGlobalInstances) {
      for (const instance of superstores) {
        superstores.add(instance)
      }
    }
    for (const superstore of superstores) {
      dehydrated[superstore.name] = superstore.dehydrateToRecordOfStrings()
    }
    return dehydrated
  }

  static dehydrateToString({
    superstores = new Set<SuperStore>(),
    withGlobalInstances = true,
  }: {
    superstores: Set<SuperStore>
    withGlobalInstances: boolean
  }): string {
    const dehydrated = SuperStore.dehydrateToRecordOfRecordsOfStrings({ superstores, withGlobalInstances })
    return JSON.stringify(dehydrated)
  }

  static prepareFromRecordOfRecordsOfStrings({
    recordOfRecordsOfStrings,
    superstores = [],
    withGlobalInstances = true,
  }: {
    recordOfRecordsOfStrings: Record<string, Record<string, string>>
    superstores: SuperStore[]
    withGlobalInstances: boolean
  }): void {
    const instances = new Map<string, SuperStore>()
    if (withGlobalInstances) {
      for (const instance of SuperStore.instances.values()) {
        instances.set(instance.name, instance)
      }
    }
    for (const superstore of superstores) {
      instances.set(superstore.name, superstore)
    }
    for (const [superstoreName, recordOfStrings] of Object.entries(recordOfRecordsOfStrings)) {
      for (const [itemName, itemStringifiedValue] of Object.entries(recordOfStrings)) {
        const superstore = instances.get(superstoreName)
        if (!superstore) {
          throw new Error(`Superstore "${superstoreName}" not found`)
        }
        superstore.prepared.set(itemName, itemStringifiedValue)
      }
    }
  }

  static parseToRecordOfRecordsOfStrings(dehydratedString: string): Record<string, Record<string, string>> {
    const recordOfRecordsOfStrings = JSON.parse(dehydratedString)
    if (!recordOfRecordsOfStrings || typeof recordOfRecordsOfStrings !== 'object') {
      throw new Error(`Invalid dehydrated string, expected parsed to object, got ${typeof recordOfRecordsOfStrings}`)
    }
    for (const value of Object.values(recordOfRecordsOfStrings)) {
      if (!value || typeof value !== 'object') {
        throw new Error(`Invalid dehydrated string, expected parsed to object, got ${typeof value}`)
      }
      for (const item of Object.values(value)) {
        if (typeof item !== 'string') {
          throw new Error(`Invalid dehydrated string, expected parsed to object, got ${typeof item}`)
        }
      }
    }
    return recordOfRecordsOfStrings
  }

  static prepareFromString({
    dehydratedString,
    superstores = [],
    withGlobalInstances = true,
  }: {
    dehydratedString: string
    superstores: SuperStore[]
    withGlobalInstances: boolean
  }): void {
    const recordOfRecordsOfStrings = SuperStore.parseToRecordOfRecordsOfStrings(dehydratedString)
    SuperStore.prepareFromRecordOfRecordsOfStrings({
      recordOfRecordsOfStrings,
      superstores,
      withGlobalInstances,
    })
  }

  static prepareFromWindow({
    superstores = [],
    withGlobalInstances = true,
  }: {
    superstores: SuperStore[]
    withGlobalInstances: boolean
  }): void {
    if (typeof window !== 'undefined' && typeof (window as any)?.__POINT0_DEHYDRATED_SUPER_STORE__ !== 'undefined') {
      SuperStore.prepareFromString({
        dehydratedString: (window as any).__POINT0_DEHYDRATED_SUPER_STORE__,
        superstores,
        withGlobalInstances,
      })
    }
  }
}

export class SuperStoreItem<TValue = any, TDehydratedValue = any> {
  superstore: SuperStore
  name: string
  init: () => TValue
  ssr: TDehydratedValue extends undefined ? false : true
  dehydrate: (value: TValue) => TDehydratedValue
  hydrate: (dehydratedValue: TDehydratedValue, init: () => TValue) => TValue

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
    this.dehydrate = dehydrate
    this.hydrate = hydrate
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

  stringify = (): string | undefined => {
    try {
      const dehydrated = this.dehydrate(this.get())
      return this.superstore.transformer.stringify(dehydrated)
    } catch (error: unknown) {
      throw new Error(`Error stringifying store "${this.superstore.name}" for item "${this.name}"`, { cause: error })
    }
  }

  parse = (dehydratedString: string): TValue => {
    try {
      const dehydrated = this.superstore.transformer.parse(dehydratedString)
      return this.hydrate(dehydrated as never, this.init)
    } catch (error: unknown) {
      throw new Error(`Error parsing store "${this.superstore.name}" for item "${this.name}"`, { cause: error })
    }
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

export type NiceSuperStoreItem<TValue = any, TDehydratedValue = any> = Pick<
  SuperStoreItem<TValue, TDehydratedValue>,
  'get' | 'set' | 'redefine' | 'config'
>
export type NiceUnsettableSuperStoreItem<TValue = any, TDehydratedValue = any> = Pick<
  SuperStoreItem<TValue, TDehydratedValue>,
  'get' | 'redefine' | 'config'
>
export type NiceReadonlySuperStoreItem<TValue = any, TDehydratedValue = any> = Pick<
  SuperStoreItem<TValue, TDehydratedValue>,
  'get' | 'config'
>

// type SuperStoreConfigItemInternal = {
//   name: string
//   init: () => any
//   ssr: boolean
//   dehydrate: (value: any) => any
//   hydrate: (dehydratedValue: any, init: () => any) => any
// }

// export type SuperStoreConfigItem<TValue = any, TDehydratedValue = any> = {
//   name: string
//   init: () => TValue
//   ssr: TDehydratedValue extends undefined ? false : true
//   dehydrate: (value: TValue) => TDehydratedValue
//   hydrate: (dehydratedValue: TDehydratedValue, init: () => TValue) => TValue
// }

// export type SuperStoreConfigItem<TValue = any, TDehydratedValue = any> = {
//   name: string
//   init: () => TValue
//   ssr: TDehydratedValue extends undefined ? false : true
// } & TDehydratedValue extends undefined
//   ? never
//   : {
//       dehydrate: IfAnyThenElse<
//         TDehydratedValue,
//         undefined | ((value: TValue) => TDehydratedValue),
//         (value: TValue) => TDehydratedValue
//       >
//       hydrate: IfAnyThenElse<
//         TDehydratedValue,
//         undefined | ((dehydratedValue: TDehydratedValue, init: () => TValue) => TValue),
//         (dehydratedValue: TDehydratedValue, init: () => TValue) => TValue
//       >
//     }
// export type SuperStoreConfig = Record<string, SuperStoreConfigItem>

// export type SuperStoreDefinedItem<TValue = any, TDehydratedValue = any> = {
//   get: () => TValue
//   set: (value: TValue) => void
//   config: SuperStoreConfigItem<TValue, TDehydratedValue>
// }
// ;(globalThis as any).__POINT0_GET_SSR_PHASE__ = () => {
//   return SuperStore.getWeak<boolean | 'prepass' | 'final' | undefined>('__POINT0_SSR_PHASE__') ?? false
// }
