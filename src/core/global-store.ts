import type { DehydratedState } from '@tanstack/react-query'
import { dehydrate, hydrate, QueryClient } from '@tanstack/react-query'
import type { AsyncLocalStorage } from 'node:async_hooks'

export class GlobalStore<TState extends GlobalState> {
  private static instance: GlobalStore<GlobalState> | null = null
  static config: GlobalStoreConfig<GlobalState> = {}

  private static clientState: GlobalState | null = null
  private static serverStorage: GlobalStoreServerStorage | null = null

  static async init<TConfigInput extends GlobalStoreConfigInput<GlobalState>>(
    config: TConfigInput,
  ): Promise<GlobalStoreConfigByInput<TConfigInput>> {
    if (this.instance) {
      // TODO: add better check about not same confg for existing keys, or maybe it is enough
      if (Object.keys(this.config).join(',') !== Object.keys(config).join(',')) {
        throw new Error('GlobalStore was already initialized with different config')
      }
      return this.instance as GlobalStoreConfigByInput<TConfigInput>
    }

    const instance = new GlobalStore<GlobalStateByConfigInput<TConfigInput>>()
    this.instance = instance
    this.config = this.configInputToConfig(config)
    if (!process.env.IS_CLIENT) {
      const { AsyncLocalStorage } = await import('node:async_hooks')
      this.serverStorage = new AsyncLocalStorage<GlobalStateByConfigInput<TConfigInput>>()
      this.clientState = null
    } else {
      this.serverStorage = null
      this.clientState = {}
    }
    this.normalizeGlobalStoreConfig()
    return instance as GlobalStoreConfigByInput<TConfigInput>
  }

  private static initIfClientAndNotInitialized(): void {
    if (process.env.IS_CLIENT && !this.instance) {
      this.instance = new GlobalStore<GlobalState>()
      this.config = this.configInputToConfig({})
      this.serverStorage = null
      this.clientState = {}
      this.normalizeGlobalStoreConfig()
    }
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
          pack: () => undefined,
          unpack: () => undefined,
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

  // lets call this fn only on client, no need to call it on server
  static unpack = (packed: Record<string, unknown>): GlobalState => {
    const state = this.getState()
    for (const [configItemKey, configItem] of Object.entries(this.config)) {
      try {
        if (!configItem.unpack) {
          continue
        }
        const packedValue = packed[configItemKey]
        const unpackedValue = configItem.unpack(packedValue, configItem.init)
        state[configItemKey] = unpackedValue
      } catch (error: unknown) {
        throw new Error(
          `Error unpacking global store for key "${configItemKey}": ${error instanceof Error ? error.message : String(error)}`,
          { cause: error },
        )
      }
    }
    return state
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
