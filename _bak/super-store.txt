import { Route0 } from '@devp0nt/route0'
import type { DehydratedState } from '@tanstack/react-query'
import { dehydrate, hydrate, QueryClient } from '@tanstack/react-query'
import type { AsyncLocalStorage } from 'node:async_hooks'
import superjson from 'superjson'

export class SuperStore<TState extends SuperState> {
  private static dehydrated: Record<string, unknown> = {}
  private static instance: SuperStore<SuperState> | null = null
  static config: SuperStoreConfig<SuperState> = {}

  private static clientState: SuperState | null = null
  private static serverStorage: SuperStoreServerStorage | null = null

  static async init<TConfigInput extends SuperStoreConfigInput<SuperState>>(
    config?: TConfigInput,
  ): Promise<SuperStore<SuperStateByConfigInput<TConfigInput>>> {
    config ??= {} as TConfigInput
    if (this.instance) {
      this.extendConfig(this.configInputToConfig(config))
      return this.instance as SuperStore<SuperStateByConfigInput<TConfigInput>>
    }

    const instance = new SuperStore<SuperStateByConfigInput<TConfigInput>>()
    this.instance = instance

    if (process.env.IS_CLIENT) {
      this.initClient(config)
    } else {
      await this.initServer(config)
    }
    return this.instance as SuperStore<SuperStateByConfigInput<TConfigInput>>
  }

  private static initClient(config?: SuperStoreConfigInput<SuperState>, dehydrated?: Record<string, unknown>): void {
    this.instance = new SuperStore<SuperState>()
    this.serverStorage = null
    this.clientState ??= {}
    this.extendConfig(this.configInputToConfig(config ?? {}))
    this.normalizeSuperStoreConfig()
    if (dehydrated) {
      this.dehydrated = dehydrated
    } else {
      if (typeof window !== 'undefined' && typeof (window as any)?.__DEHYDRATED_SUPER_STORE__ !== 'undefined') {
        this.dehydrated = superjson.parse((window as any).__DEHYDRATED_SUPER_STORE__)
      }
    }
  }

  private static async initServer(config?: SuperStoreConfigInput<SuperState>): Promise<void> {
    const instance = new SuperStore<SuperState>()
    this.instance = instance
    this.extendConfig(this.configInputToConfig(config ?? {}))
    const { AsyncLocalStorage } = await import('node:async_hooks')
    this.serverStorage = new AsyncLocalStorage<SuperState>()
    this.clientState = null
    this.normalizeSuperStoreConfig()
  }

  private static initIfClientAndNotInitialized(): void {
    if (process.env.IS_CLIENT && !this.instance) {
      this.initClient()
    }
  }

  // here we can define one prop and get back this proxied value
  define<TValue, TDehydratedValue = TValue>(
    key: string,
    config: SuperStoreConfigInputItem<TValue, TDehydratedValue>,
  ): { get: () => TValue; set: (value: TValue) => void } {
    return SuperStore.define(key, config)
  }

  static define<TValue, TDehydratedValue = TValue>(
    key: string,
    config: SuperStoreConfigInputItem<TValue, TDehydratedValue>,
  ): { get: () => TValue; set: (value: TValue) => void } {
    // Merge a single-key config using the same transformer as init()
    const normalized = this.configInputToConfig({ [key]: config } as SuperStoreConfigInput<SuperState>)
    this.extendConfig(normalized)

    // Return a live proxy to that property
    return {
      get: this.get.bind(this, key) as () => TValue,
      set: this.set.bind(this, key as never) as (value: TValue) => void,
    }
  }

  private static readonly configInputToConfig = (
    configInput: SuperStoreConfigInput<SuperState>,
  ): SuperStoreConfig<SuperState> => {
    const config: SuperStoreConfig<SuperState> = {}
    for (const [key, value] of Object.entries(configInput)) {
      const configItem = value
      if (typeof configItem === 'function') {
        config[key] = {
          init: configItem,
          dehydrate: (value) => value,
          hydrate: (value) => value,
        }
      } else {
        config[key] = configItem as never
      }
    }
    return config
  }

  private static extendConfig(config: SuperStoreConfig<SuperState>): void {
    for (const [key, value] of Object.entries(config)) {
      this.config[key] = value
    }
    this.normalizeQueryClientConfig()
    this.normalizeSsrLocationConfig()
    this.normalizeCurrentLocationConfig()
  }

  getState = (): TState => {
    return SuperStore.getState() as TState
  }
  static getState = (): SuperState => {
    this.initIfClientAndNotInitialized()
    if (process.env.IS_CLIENT) {
      if (!this.clientState) {
        throw new Error('Client state not found. Please, call await SuperStore.init() first')
      }
      return this.clientState
    } else {
      if (!this.serverStorage || !this.instance) {
        throw new Error('Server storage and instance are not initialized. Please, call await SuperStore.init() first')
      }
      const serverStore = this.serverStorage.getStore()
      if (!serverStore) {
        throw new Error(
          'Server store not found. You should call this function on server only inside server context wrapped in SuperStore.runWithServerStoreProvider',
        )
      }
      return serverStore
    }
  }

  // lets call this fn only on server, no need to call it on client
  static dehydrate = () => {
    this.getState() // just for validation
    const dehydrated: Record<string, unknown> = {}
    for (const [configItemKey, configItem] of Object.entries(this.config)) {
      try {
        if (!configItem.dehydrate) {
          continue
        }
        const stateValue = this.get(configItemKey)
        const dehydratedValue = configItem.dehydrate(stateValue)
        if (dehydratedValue !== undefined) {
          dehydrated[configItemKey] = dehydratedValue
        }
      } catch (error: unknown) {
        throw new Error(
          `Error dehydrateing global store for key "${configItemKey}": ${error instanceof Error ? error.message : String(error)}`,
          { cause: error },
        )
      }
    }
    return dehydrated
  }

  get<TKey extends SuperStoreKey<TState>>(key: TKey): TState[TKey] {
    return SuperStore.get(key)
  }
  static get<TValue = unknown>(key: string): TValue {
    const state = this.getState()
    const configItem = this.config[key] as SuperStoreConfigItem<SuperState, unknown> | undefined
    if (!configItem) {
      throw new Error(`Key "${key}" not found in config`)
    }
    const existingValue = state[key]
    if (existingValue) {
      return existingValue as TValue
    }
    const dehydratedValue = this.dehydrated[key]
    if (dehydratedValue) {
      if (!configItem.hydrate) {
        throw new Error(`Key "${key}" is dehydrated but no hydrate function is defined`)
      }
      const hydratedValue = configItem.hydrate(dehydratedValue, configItem.init)
      state[key] = hydratedValue
      return hydratedValue as TValue
    }
    const initialValue = configItem.init()
    state[key] = initialValue
    return initialValue as TValue
  }

  static getWeak<TValue = unknown>(key: string): TValue | undefined {
    try {
      return this.get<TValue>(key)
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found in config')) {
        return undefined
      }
      throw error
    }
  }

  set<TKey extends SuperStoreKey<TState>>(key: TKey, value: TState[TKey]): SuperStore<TState>
  set<TPartialState extends Partial<TState>>(state: TPartialState): SuperStore<TState>
  set(arg1: any, arg2?: any): SuperStore<TState> {
    return SuperStore.set(arg1, arg2) as SuperStore<TState>
  }
  static set(key: string, value: unknown): SuperStore<SuperState>
  static set(state: SuperState): SuperStore<SuperState>
  static set(...args: any[]): SuperStore<SuperState> {
    const state = this.getState()
    const partialState = ((): Partial<SuperState> => {
      if (typeof args[0] === 'string') {
        return { [args[0]]: args[1] } as Partial<SuperState>
      } else {
        return args[0] as Partial<SuperState>
      }
    })()
    for (const [key, value] of Object.entries(partialState)) {
      const configItem = this.config[key] as SuperStoreConfigItem<SuperState, unknown> | undefined
      if (!configItem) {
        throw new Error(`Key "${key}" not found in config`)
      }
      state[key] = value
    }
    return this.instance as SuperStore<SuperState>
  }

  static setWeak<TValue = unknown>(key: string, value: TValue): void {
    if (key in this.config) {
      this.set(key, value)
      return
    }
    this.define(key, {
      init: () => value,
      dehydrate: undefined,
      hydrate: undefined,
    })
  }

  runWithServerStateProvider<TState extends SuperState = SuperState, TResult = unknown>(
    serverSuperState: Partial<TState>,
    callback: () => TResult,
  ): TResult {
    return SuperStore.runWithServerStateProvider(serverSuperState, callback)
  }

  static runWithServerStateProvider<TResult>(serverSuperState: Partial<SuperState>, callback: () => TResult): TResult {
    this.initIfClientAndNotInitialized()
    if (this.serverStorage) {
      return this.serverStorage.run(serverSuperState, callback)
    } else {
      return callback()
    }
  }
  private static normalizeQueryClientConfig(): void {
    if (!(this.config.queryClient as unknown)) {
      this.config.queryClient = {
        init: () => new QueryClient(),
        dehydrate: () => undefined,
        hydrate: () => undefined,
      }
    }
    this.config.queryClient.dehydrate = (queryClient: QueryClient) =>
      dehydrate(queryClient, {
        shouldDehydrateQuery: () => {
          // This will include all queries, including failed ones
          return true
        },
      })
    this.config.queryClient.hydrate = (dehydratedState: DehydratedState, createQueryClient: () => QueryClient) => {
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
      dehydrate: (value) => value,
      hydrate: (value) => value,
    }
  }

  private static normalizeCurrentLocationConfig(): void {
    this.config.currentLocation = {
      init: () => Route0.getLocation('/'),
      dehydrate: (value) => value,
      hydrate: (value) => value,
    }
  }

  private static normalizeSuperStoreConfig(): void {
    this.normalizeQueryClientConfig()
    this.normalizeSsrLocationConfig()
    this.normalizeCurrentLocationConfig()
  }
}

const isPromiseKey = (prop: PropertyKey) => prop === 'then' || prop === 'catch' || prop === 'finally'

export type SuperStoreServerStorage = AsyncLocalStorage<SuperState>

export type SuperState = { [key: string]: unknown }
export type SuperStoreKey<TStore extends SuperState> = Extract<keyof TStore, string>

export type SuperStoreConfigItemInitFn<TValue = unknown> = () => TValue
export type SuperStoreConfigItem<TValue, TDehydratedValue> = {
  init: () => TValue
  dehydrate: ((value: TValue) => TDehydratedValue) | undefined // | TDehydratedValue // in case it is not dehydrateable here will be null
  hydrate: ((dehydratedValue: TDehydratedValue, init: () => TValue) => TValue) | undefined // | TDehydratedValue // and here
}
export type SuperStoreConfig<TStore extends SuperState> = Record<SuperStoreKey<TStore>, SuperStoreConfigItem<any, any>>
export type SuperStateByConfig<TConfig extends SuperStoreConfig<SuperState>> = {
  [key in keyof TConfig]: ReturnType<TConfig[key]['init']>
}

export type SuperStoreConfigInputItem<TValue, TDehydratedValue> =
  | SuperStoreConfigItem<TValue, TDehydratedValue>
  | SuperStoreConfigItemInitFn<TValue>
export type SuperStoreConfigInput<TStore extends SuperState> = Record<
  SuperStoreKey<TStore>,
  SuperStoreConfigInputItem<any, any>
>

export type SuperStoreConfigByInput<TConfigInput extends SuperStoreConfigInput<SuperState>> = {
  [key in keyof TConfigInput]: TConfigInput[key] extends SuperStoreConfigItemInitFn<infer TValue>
    ? SuperStoreConfigItem<TValue, TValue>
    : TConfigInput[key] extends SuperStoreConfigItem<infer TValue, infer TDehydratedValue>
      ? SuperStoreConfigItem<TValue, TDehydratedValue>
      : never
}
export type SuperStateByConfigInput<TConfigInput extends SuperStoreConfigInput<SuperState>> = {
  [key in keyof TConfigInput]: ReturnType<SuperStoreConfigByInput<TConfigInput>[key]['init']>
}
export type SuperStoreByConfigInput<TConfigInput extends SuperStoreConfigInput<SuperState>> = SuperStore<
  SuperStateByConfigInput<TConfigInput>
>

export type SuperStoreProxy<TState> = TState & {
  define: <TValue, TDehydratedValue = TValue>(
    key: string,
    config: SuperStoreConfigInputItem<TValue, TDehydratedValue>,
  ) => TValue
}
