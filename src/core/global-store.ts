import type { DehydratedState } from '@tanstack/react-query'
import { dehydrate, hydrate, QueryClient } from '@tanstack/react-query'
import type { AsyncLocalStorage } from 'node:async_hooks'
import superjson from 'superjson'

export class GlobalStore<TState extends GlobalState> {
  private static packed: Record<string, unknown> = {}
  private static instance: GlobalStore<GlobalState> | null = null
  static config: GlobalStoreConfig<GlobalState> = {}
  private proxy: GlobalStoreProxy<GlobalState> | null = null

  private static clientState: GlobalState | null = null
  private static serverStorage: GlobalStoreServerStorage | null = null

  static async init<TConfigInput extends GlobalStoreConfigInput<GlobalState>>(
    config: TConfigInput,
  ): Promise<GlobalStoreProxy<GlobalStateByConfigInput<TConfigInput>>> {
    if (this.instance) {
      Object.assign(this.config, this.configInputToConfig(config))
      this.instance.proxy ||= await this.instance.createProxy()
      return this.instance.proxy as GlobalStoreProxy<GlobalStateByConfigInput<TConfigInput>>
    }

    const instance = new GlobalStore<GlobalStateByConfigInput<TConfigInput>>()
    this.instance = instance

    if (process.env.IS_CLIENT) {
      this.initClient(config)
    } else {
      await this.initServer(config)
    }

    this.instance.proxy ||= await instance.createProxy()
    return this.instance.proxy as GlobalStoreProxy<GlobalStateByConfigInput<TConfigInput>>
  }

  private static initClient(config?: GlobalStoreConfigInput<GlobalState>, packed?: Record<string, unknown>): void {
    this.instance = new GlobalStore<GlobalState>()
    Object.assign(this.config, this.configInputToConfig(config ?? {}))
    this.serverStorage = null
    this.clientState ??= {}
    this.normalizeGlobalStoreConfig()
    if (packed) {
      this.packed = packed
    } else {
      if (typeof window !== 'undefined' && typeof (window as any)?.__PACKED_GLOBAL_STORE_VALUE__ !== 'undefined') {
        this.packed = superjson.parse((window as any).__PACKED_GLOBAL_STORE_VALUE__)
      }
    }
  }

  private static async initServer(config?: GlobalStoreConfigInput<GlobalState>): Promise<void> {
    const instance = new GlobalStore<GlobalState>()
    this.instance = instance
    Object.assign(this.config, this.configInputToConfig(config ?? {}))
    const { AsyncLocalStorage } = await import('node:async_hooks')
    this.serverStorage = new AsyncLocalStorage<GlobalState>()
    this.clientState = null
    this.normalizeGlobalStoreConfig()
  }

  private static initIfClientAndNotInitialized(): void {
    if (process.env.IS_CLIENT && !this.instance) {
      this.initClient()
    }
  }

  // create proxy for whole state and for instance.get(prop)
  private createProxy<TState>(): GlobalStoreProxy<TState> {
    // eslint-disable-next-line consistent-this, @typescript-eslint/no-this-alias
    const self = this

    const proxy = new Proxy(
      {},
      {
        get(_target, prop, _receiver) {
          // expose define() on the proxy
          if (prop === 'define') {
            return self.define.bind(self)
          }
          // ignore symbol-based meta props
          if (typeof prop !== 'string' || isPromiseKey(prop)) return undefined
          // delegate to store getter
          return self.get(prop as never)
        },

        set(_target, prop, value, _receiver) {
          if (typeof prop !== 'string' || isPromiseKey(prop)) return false
          self.set(prop as never, value)
          return true
        },

        has(_target, prop) {
          if (typeof prop !== 'string' || isPromiseKey(prop)) return false
          return prop in GlobalStore.config
        },

        ownKeys() {
          return Object.keys(GlobalStore.config)
        },

        getOwnPropertyDescriptor(_target, prop) {
          if (typeof prop === 'string' && prop in GlobalStore.config) {
            return { enumerable: true, configurable: true }
          }
          return undefined
        },
      },
    )

    return proxy as GlobalStoreProxy<TState>
  }

  // this one create proxy for just one value, and return it
  private static createPropertyProxy<TValue>(key: string): TValue {
    const handler: ProxyHandler<any> = {
      get(_t, prop, _r) {
        // Prevent thenable detection & ignore symbols
        if (typeof prop !== 'string' || isPromiseKey(prop)) return undefined

        const v = GlobalStore.get<TValue>(key)

        if (prop === 'valueOf') return () => GlobalStore.get<TValue>(key)
        if (prop === 'toJSON') return () => GlobalStore.get<TValue>(key)
        if (prop === 'toString') return () => String(GlobalStore.get<TValue>(key))

        if (v !== null && typeof v === 'object') {
          return (v as any)[prop]
        }
        return (v as any)?.[prop]
      },

      set(_t, prop, newVal, _r) {
        if (typeof prop !== 'string' || isPromiseKey(prop)) return false

        const cur = GlobalStore.get<any>(key)

        if (cur !== null && typeof cur === 'object') {
          const next = Array.isArray(cur) ? cur.slice() : { ...cur }
          next[prop] = newVal
          GlobalStore.set(key, next)
          return true
        }

        GlobalStore.set(key, newVal)
        return true
      },

      ownKeys() {
        const v = GlobalStore.get<any>(key)
        return v && typeof v === 'object' ? Reflect.ownKeys(v) : []
      },

      getOwnPropertyDescriptor(_t, prop) {
        const v = GlobalStore.get<any>(key)
        if (v && typeof v === 'object' && prop in v) {
          return { enumerable: true, configurable: true }
        }
        return undefined
      },
    }

    return new Proxy({}, handler) as unknown as TValue
  }

  // here we can define one prop and get back this proxied value
  define<TValue, TPackedValue = TValue>(key: string, config: GlobalStoreConfigInputItem<TValue, TPackedValue>): TValue {
    return GlobalStore.define(key, config)
  }

  static define<TValue, TPackedValue = TValue>(
    key: string,
    config: GlobalStoreConfigInputItem<TValue, TPackedValue>,
  ): TValue {
    // Merge a single-key config using the same transformer as init()
    const normalized = this.configInputToConfig({ [key]: config } as GlobalStoreConfigInput<GlobalState>)
    this.config[key] = normalized[key]

    // Return a live proxy to that property
    return this.createPropertyProxy<TValue>(key)
  }

  private static readonly configInputToConfig = (
    configInput: GlobalStoreConfigInput<GlobalState>,
  ): GlobalStoreConfig<GlobalState> => {
    const config: GlobalStoreConfig<GlobalState> = {}
    for (const [key, value] of Object.entries(configInput)) {
      const configItem = value
      if (typeof configItem === 'function') {
        config[key] = {
          init: configItem,
          pack: (value) => value,
          unpack: (value) => value,
        }
      } else {
        config[key] = configItem as never
      }
    }
    return config
  }

  getState = (): TState => {
    return GlobalStore.getState() as TState
  }
  static getState = (): GlobalState => {
    this.initIfClientAndNotInitialized()
    if (process.env.IS_CLIENT) {
      if (!this.clientState) {
        throw new Error('Client state not found. Please, call await GlobalStore.init() first')
      }
      return this.clientState
    } else {
      if (!this.serverStorage || !this.instance) {
        throw new Error('Server storage and instance are not initialized. Please, call await GlobalStore.init() first')
      }
      const serverStore = this.serverStorage.getStore()
      if (!serverStore) {
        throw new Error(
          'Server store not found. You should call this function on server only inside server context wrapped in GlobalStore.runWithServerStoreProvider',
        )
      }
      return serverStore
    }
  }

  // lets call this fn only on server, no need to call it on client
  static pack = () => {
    this.getState() // just for validation
    const packed: Record<string, unknown> = {}
    for (const [configItemKey, configItem] of Object.entries(this.config)) {
      try {
        if (!configItem.pack) {
          continue
        }
        const stateValue = this.get(configItemKey)
        const packedValue = configItem.pack(stateValue)
        if (packedValue !== undefined) {
          packed[configItemKey] = packedValue
        }
      } catch (error: unknown) {
        throw new Error(
          `Error packing global store for key "${configItemKey}": ${error instanceof Error ? error.message : String(error)}`,
          { cause: error },
        )
      }
    }
    return packed
  }

  get<TKey extends GlobalStoreKey<TState>>(key: TKey): TState[TKey] {
    return GlobalStore.get(key)
  }
  static get<TValue = unknown>(key: string): TValue {
    const state = this.getState()
    const configItem = this.config[key] as GlobalStoreConfigItem<GlobalState, unknown> | undefined
    if (!configItem) {
      throw new Error(`Key "${key}" not found in config`)
    }
    const existingValue = state[key]
    if (existingValue) {
      return existingValue as TValue
    }
    const packedValue = this.packed[key]
    if (packedValue) {
      if (!configItem.unpack) {
        throw new Error(`Key "${key}" is packed but no unpack function is defined`)
      }
      const unpackedValue = configItem.unpack(packedValue, configItem.init)
      state[key] = unpackedValue
      return unpackedValue as TValue
    }
    const initialValue = configItem.init()
    state[key] = initialValue
    return initialValue as TValue
  }

  set<TKey extends GlobalStoreKey<TState>>(key: TKey, value: TState[TKey]): GlobalStore<TState>
  set<TPartialState extends Partial<TState>>(state: TPartialState): GlobalStore<TState>
  set(arg1: any, arg2?: any): GlobalStore<TState> {
    return GlobalStore.set(arg1, arg2) as GlobalStore<TState>
  }
  static set(key: string, value: unknown): GlobalStore<GlobalState>
  static set(state: GlobalState): GlobalStore<GlobalState>
  static set(...args: any[]): GlobalStore<GlobalState> {
    const state = this.getState()
    const partialState = ((): Partial<GlobalState> => {
      if (typeof args[0] === 'string') {
        return { [args[0]]: args[1] } as Partial<GlobalState>
      } else {
        return args[0] as Partial<GlobalState>
      }
    })()
    for (const [key, value] of Object.entries(partialState)) {
      const configItem = this.config[key] as GlobalStoreConfigItem<GlobalState, unknown> | undefined
      if (!configItem) {
        throw new Error(`Key "${key}" not found in config`)
      }
      state[key] = value
    }
    return this.instance as GlobalStore<GlobalState>
  }

  runWithServerStateProvider<TState extends GlobalState = GlobalState, TResult = unknown>(
    serverGlobalState: Partial<TState>,
    callback: () => TResult,
  ): TResult {
    return GlobalStore.runWithServerStateProvider(serverGlobalState, callback)
  }

  static runWithServerStateProvider<TResult>(
    serverGlobalState: Partial<GlobalState>,
    callback: () => TResult,
  ): TResult {
    this.initIfClientAndNotInitialized()
    if (this.serverStorage) {
      return this.serverStorage.run(serverGlobalState, callback)
    } else {
      return callback()
    }
  }
  private static normalizeQueryClientConfig(): void {
    if (!(this.config.queryClient as unknown)) {
      this.config.queryClient = {
        init: () => new QueryClient(),
        pack: () => undefined,
        unpack: () => undefined,
      }
    }
    this.config.queryClient.pack = (queryClient: QueryClient) =>
      dehydrate(queryClient, {
        shouldDehydrateQuery: () => {
          // This will include all queries, including failed ones
          return true
        },
      })
    this.config.queryClient.unpack = (dehydratedState: DehydratedState, createQueryClient: () => QueryClient) => {
      const queryClient = createQueryClient()
      hydrate(queryClient, dehydratedState)

      const prefetchPageQuery = queryClient
        .getQueryCache()
        .getAll()
        .find((q: any) => q.state?.data && typeof q.state.data === 'object' && 'dehydratedState' in q.state.data)

      if (!prefetchPageQuery) {
        return queryClient
      }

      const relatedQueriesDehydratedState = (prefetchPageQuery.state.data as { dehydratedState: DehydratedState })
        .dehydratedState
      hydrate(queryClient, relatedQueriesDehydratedState)

      return queryClient
    }
  }

  private static normalizeSsrLocationConfig(): void {
    this.config.ssrLocation = {
      init: () => undefined,
      pack: (value) => value,
      unpack: (value) => value,
    }
  }

  private static normalizeGlobalStoreConfig(): void {
    this.normalizeQueryClientConfig()
    this.normalizeSsrLocationConfig()
  }
}

const isPromiseKey = (prop: PropertyKey) => prop === 'then' || prop === 'catch' || prop === 'finally'

export type GlobalStoreServerStorage = AsyncLocalStorage<GlobalState>

export type GlobalState = { [key: string]: unknown }
export type GlobalStoreKey<TStore extends GlobalState> = Extract<keyof TStore, string>

export type GlobalStoreConfigItemInitFn<TValue = unknown> = () => TValue
export type GlobalStoreConfigItem<TValue, TPackedValue> = {
  init: () => TValue
  pack: ((value: TValue) => TPackedValue) | undefined // | TPackedValue // in case it is not packable here will be null
  unpack: ((packedValue: TPackedValue, init: () => TValue) => TValue) | undefined // | TPackedValue // and here
}
export type GlobalStoreConfig<TStore extends GlobalState> = Record<
  GlobalStoreKey<TStore>,
  GlobalStoreConfigItem<any, any>
>
export type GlobalStateByConfig<TConfig extends GlobalStoreConfig<GlobalState>> = {
  [key in keyof TConfig]: ReturnType<TConfig[key]['init']>
}

export type GlobalStoreConfigInputItem<TValue, TPackedValue> =
  | GlobalStoreConfigItem<TValue, TPackedValue>
  | GlobalStoreConfigItemInitFn<TValue>
export type GlobalStoreConfigInput<TStore extends GlobalState> = Record<
  GlobalStoreKey<TStore>,
  GlobalStoreConfigInputItem<any, any>
>

export type GlobalStoreConfigByInput<TConfigInput extends GlobalStoreConfigInput<GlobalState>> = {
  [key in keyof TConfigInput]: TConfigInput[key] extends GlobalStoreConfigItemInitFn<infer TValue>
    ? GlobalStoreConfigItem<TValue, TValue>
    : TConfigInput[key] extends GlobalStoreConfigItem<infer TValue, infer TPackedValue>
      ? GlobalStoreConfigItem<TValue, TPackedValue>
      : never
}
export type GlobalStateByConfigInput<TConfigInput extends GlobalStoreConfigInput<GlobalState>> = {
  [key in keyof TConfigInput]: ReturnType<GlobalStoreConfigByInput<TConfigInput>[key]['init']>
}
export type GlobalStoreByConfigInput<TConfigInput extends GlobalStoreConfigInput<GlobalState>> = GlobalStore<
  GlobalStateByConfigInput<TConfigInput>
>

export type GlobalStoreProxy<TState> = TState & {
  define: <TValue, TPackedValue = TValue>(
    key: string,
    config: GlobalStoreConfigInputItem<TValue, TPackedValue>,
  ) => TValue
}
