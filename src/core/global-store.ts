import type { AsyncLocalStorage } from 'node:async_hooks'
import { isServer } from './client-server.js'

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class GlobalStore {
  static clientStore: GlobalStoreClientStore | null
  static serverStorage: GlobalStoreServerStorage | null
  static memoizedGetters: { [key: string]: MemoizedGetterRecord } = {}
  static unnamedGetterIndex = 0
  static initialized = false

  static async init(server?: boolean) {
    if (this.initialized) {
      return
    }
    server ??= isServer()
    if (server) {
      const { AsyncLocalStorage } = await import('node:async_hooks')
      this.serverStorage = new AsyncLocalStorage<Record<string, any>>()
      this.clientStore = null
    } else {
      this.serverStorage = null
      this.clientStore = {}
    }
    this.initialized = true
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
        const key = '__UNNAMED__' + this.unnamedGetterIndex++
        const clientGetter = args[0]
        const serverGetter = args[1] || args[0]
        return { clientGetter, serverGetter, key }
      }
    })()
    this.memoizedGetters[key] = { clientGetter, serverGetter }
    return () => this.get(key)
  }

  static get<TClientResult, TServerResult = undefined>(
    key: string,
    fallback?: MemoizedGetterRecord<TClientResult, TServerResult>,
  ): TServerResult extends undefined ? TClientResult : TServerResult | TClientResult {
    if (this.serverStorage) {
      const store = this.serverStorage.getStore()
      if (!store) {
        throw new Error('Server store not found. You should call GlobalStore.get() only inside server context')
      }
      const existingValue = store[key]
      if (existingValue) {
        return existingValue
      }
      const getter = (this.memoizedGetters[key] as MemoizedGetterRecord | undefined) || fallback
      if (!getter) {
        throw new Error(`Neither memoized getter nor value for key ${key} found`)
      }
      const newValue = getter.serverGetter()
      store[key] = newValue
      return newValue as never
    } else if (this.clientStore) {
      const existingValue = this.clientStore[key]
      if (existingValue) {
        return existingValue
      }
      const getter = (this.memoizedGetters[key] as MemoizedGetterRecord | undefined) || fallback
      if (!getter) {
        throw new Error(`Neither memoized getter nor value for key ${key} found`)
      }
      const newValue = getter.clientGetter() as TClientResult
      this.clientStore[key] = newValue
      return newValue as never
    } else {
      throw new Error(
        'Server storage and client store are not initialized. Please, call await GlobalState.init() first',
      )
    }
  }

  static getFreshFromMemoizedGetter<TClientResult, TServerResult = undefined>(
    key: string,
  ): TServerResult extends undefined ? TClientResult : TServerResult | TClientResult {
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

  static set(key: string, value: any): void {
    if (this.serverStorage) {
      const store = this.serverStorage.getStore()
      if (!store) {
        throw new Error('Server store not found. You should call GlobalStore.get() only inside server context')
      }
      store[key] = value
    } else if (this.clientStore) {
      this.clientStore[key] = value
    } else {
      throw new Error(
        'Server storage and client store are not initialized. Please, call await GlobalState.init() first',
      )
    }
  }

  static run<T>(serverStore: GlobalStoreServerStore, callback: () => T): T {
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
export type GlobalStoreServerStore = { [key: string]: any }
export type GlobalStoreServerStorage = AsyncLocalStorage<GlobalStoreServerStore>
export type GlobalStoreClientStore = { [key: string]: any }
