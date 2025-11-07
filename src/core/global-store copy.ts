import type { AsyncLocalStorage } from 'node:async_hooks'
import { isClient, isServer } from './client-server.js'

export class GlobalStore<TStore extends GlobalState> {
  private static instance: GlobalStore<GlobalState> | null = null

  private static clientStore: GlobalState | null = null
  private static serverStorage: GlobalStoreServerStorage | null = null
  private static memoizedGetters: { [key: string]: MemoizedGetterRecord<any, any> } = {}
  private static unnamedGetterIndex = 0

  static async create<TStore extends GlobalState>(): Promise<GlobalStore<TStore>> {
    if (this.instance) {
      return this.instance as never
    }

    const instance = new GlobalStore<TStore>()
    this.instance = instance
    if (isServer()) {
      const { AsyncLocalStorage } = await import('node:async_hooks')
      GlobalStore.serverStorage = new AsyncLocalStorage<TStore>()
      GlobalStore.clientStore = null
    } else {
      GlobalStore.serverStorage = null
      GlobalStore.clientStore = {}
    }
    return instance
  }

  private static initIfClientAndNotInitialized(): void {
    if (isClient() && !this.instance) {
      this.instance = new GlobalStore<GlobalState>()
      GlobalStore.serverStorage = null
      GlobalStore.clientStore = {}
    }
  }

  memoize<TKey extends GlobalStoreKey<TStore>, TClientAndServerResult>(
    key: TKey,
    clientAndServerGetter: () => TClientAndServerResult,
  ): () => TClientAndServerResult
  memoize<TKey extends GlobalStoreKey<TStore>, TClientResult, TServerResult>(
    key: TKey,
    clientGetter: () => TClientResult,
    serverGetter: () => TServerResult,
  ): () => TClientResult | TServerResult
  memoize<TClientAndServerResult>(clientAndServerGetter: () => TClientAndServerResult): () => TClientAndServerResult
  memoize<TClientResult, TServerResult>(
    clientGetter: () => TClientResult,
    serverGetter: () => TServerResult,
  ): () => TClientResult | TServerResult
  memoize(arg1: any, arg2?: any, arg3?: any): any {
    return GlobalStore.memoize(arg1, arg2, arg3)
  }

  static memoize<TClientAndServerResult>(
    key: string,
    clientAndServerGetter: () => TClientAndServerResult,
  ): () => TClientAndServerResult
  static memoize<TClientResult, TServerResult>(
    key: string,
    clientGetter: () => TClientResult,
    serverGetter: () => TServerResult,
  ): () => TClientResult | TServerResult
  static memoize<TClientAndServerResult>(
    clientAndServerGetter: () => TClientAndServerResult,
  ): () => TClientAndServerResult
  static memoize<TClientResult, TServerResult>(
    clientGetter: () => TClientResult,
    serverGetter: () => TServerResult,
  ): () => TClientResult | TServerResult
  static memoize(...args: any[]): any {
    const { key, clientGetter, serverGetter } = ((): {
      key: string
      clientGetter: () => any
      serverGetter: () => any
    } => {
      if (typeof args[0] === 'string') {
        const key = args[0]
        const clientGetter = args[1]
        const serverGetter = args[2] || args[1]
        return { clientGetter, serverGetter, key }
      } else {
        const key = '__UNNAMED__' + GlobalStore.unnamedGetterIndex++
        const clientGetter = args[0]
        const serverGetter = args[1] || args[0]
        return { clientGetter, serverGetter, key }
      }
    })()
    GlobalStore.memoizedGetters[key] = { clientGetter, serverGetter }
    return () => GlobalStore.get(key as never)
  }

  get<TKey extends GlobalStoreKey<TStore>>(key: TKey): TStore[TKey] {
    return GlobalStore.get(key as never)
  }
  static get<TClientResult, TServerResult = undefined>(
    key: string,
  ): TServerResult extends undefined ? TClientResult : TServerResult | TClientResult {
    this.initIfClientAndNotInitialized()
    if (this.serverStorage) {
      const store = this.serverStorage.getStore()
      if (!store) {
        throw new Error('Server store not found. You should call GlobalStore.get() only inside server context')
      }
      const existingValue = (store as any)[key]
      if (existingValue) {
        return existingValue
      }
      const getter = (this.memoizedGetters as any)[key]
      if (!getter) {
        throw new Error(`Neither memoized getter nor value for key ${key} found`)
      }
      const newValue = getter.serverGetter()
      ;(store as any)[key] = newValue
      return newValue as never
    } else if (this.clientStore) {
      const existingValue = (this.clientStore as any)[key]
      if (existingValue) {
        return existingValue
      }
      const getter = (this.memoizedGetters as any)[key]
      if (!getter) {
        throw new Error(`Neither memoized getter nor value for key ${key} found`)
      }
      const newValue = getter.clientGetter()
      ;(this.clientStore as any)[key] = newValue
      return newValue as never
    } else {
      throw new Error(
        'Server storage and client store are not initialized. Please, call await GlobalState.init() first',
      )
    }
  }

  getFreshFromMemoizedGetter<TKey extends GlobalStoreKey<TStore>>(key: TKey): TStore[TKey] {
    return GlobalStore.getFreshFromMemoizedGetter(key as never)
  }
  static getFreshFromMemoizedGetter<TClientResult, TServerResult = undefined>(
    key: string,
  ): TServerResult extends undefined ? TClientResult : TServerResult | TClientResult {
    this.initIfClientAndNotInitialized()
    if (this.serverStorage) {
      const store = this.serverStorage.getStore()
      if (!store) {
        throw new Error('Server store not found. You should call GlobalStore.get() only inside server context')
      }
      const getter = this.memoizedGetters[key] as MemoizedGetterRecord | undefined
      if (!getter) {
        throw new Error(`Memoized getter for key ${key} not found`)
      }
      return getter.serverGetter() as never
    } else if (this.clientStore) {
      const getter = this.memoizedGetters[key] as MemoizedGetterRecord | undefined
      if (!getter) {
        throw new Error(`Memoized getter for key ${key} not found`)
      }
      return getter.clientGetter() as never
    } else {
      throw new Error(
        'Server storage and client store are not initialized. Please, call await GlobalState.init() first',
      )
    }
  }

  set<TPartialStore extends Partial<TStore>>({ store }: { store: TPartialStore }): GlobalStore<TStore>
  set<TKey extends GlobalStoreKey<TStore>>(key: TKey, value: TStore[TKey]): GlobalStore<TStore>
  set(arg1: any, arg2?: any): GlobalStore<TStore> {
    return GlobalStore.set(arg1, arg2) as GlobalStore<TStore>
  }

  static set({ store }: { store: GlobalState }): GlobalStore<GlobalState>
  static set(key: string, value: unknown): GlobalStore<GlobalState>
  static set(...args: any[]): GlobalStore<GlobalState> {
    this.initIfClientAndNotInitialized()
    const partialStore = ((): Partial<GlobalState> => {
      if (typeof args[0] === 'string') {
        return { [args[0]]: args[1] } as Partial<GlobalState>
      } else {
        return args[0] as Partial<GlobalState>
      }
    })()
    if (this.serverStorage) {
      const store = this.serverStorage.getStore()
      if (!store) {
        throw new Error('Server store not found. You should call GlobalStore.get() only inside server context')
      }
      for (const [key, value] of Object.entries(partialStore)) {
        store[key] = value
      }
    } else if (this.clientStore) {
      for (const [key, value] of Object.entries(partialStore)) {
        this.clientStore[key] = value
      }
    } else {
      throw new Error(
        'Server storage and client store are not initialized. Please, call await GlobalState.init() first',
      )
    }
    return this.instance as GlobalStore<GlobalState>
  }

  runWithServerStoreProvider<TStore extends GlobalState = GlobalState, TResult = unknown>(
    serverStore: TStore,
    callback: () => TResult,
  ): TResult {
    return GlobalStore.runWithServerStoreProvider(serverStore, callback)
  }

  static runWithServerStoreProvider<TResult>(serverStore: GlobalState, callback: () => TResult): TResult {
    this.initIfClientAndNotInitialized()
    if (this.serverStorage) {
      return this.serverStorage.run(serverStore, callback)
    } else {
      return callback()
    }
  }
}

export type MemoizedGetterFn<T = unknown> = () => T
export type MemoizedGetterRecord<TClientResult = unknown, TServerResult = unknown> = {
  clientGetter: MemoizedGetterFn<TClientResult>
  serverGetter: TServerResult extends undefined ? MemoizedGetterFn<TClientResult> : MemoizedGetterFn<TServerResult>
}
export type GlobalState = { [key: string]: unknown }
export type GlobalStoreServerStorage = AsyncLocalStorage<GlobalState>
export type GlobalStoreKey<TStore extends GlobalState> = Extract<keyof TStore, string>
