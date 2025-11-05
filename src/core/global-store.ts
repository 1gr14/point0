import type { AsyncLocalStorage } from 'node:async_hooks'

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class GlobalStorage {
  static clientStore: GlobalStorageClientStore | null
  static serverStorage: GlobalStorageServerStorage | null
  static getters: { [key: string]: GetterRecord } = {}
  static unnamedGetterIndex = 0

  static async init(isServer: boolean) {
    if (isServer) {
      const { AsyncLocalStorage } = await import('node:async_hooks')
      this.serverStorage = new AsyncLocalStorage<Record<string, any>>()
      this.clientStore = null
    } else {
      this.serverStorage = null
      this.clientStore = {}
    }
  }

  static getter<TClientAndServerResult>(
    key: string,
    clientAndServerGetter: () => TClientAndServerResult,
  ): () => TClientAndServerResult
  static getter<TClientResult, TServerResult>(
    key: string,
    clientGetter: () => TClientResult,
    serverGetter: () => TServerResult,
  ): () => TClientResult | TServerResult
  static getter<TClientAndServerResult>(
    clientAndServerGetter: () => TClientAndServerResult,
  ): () => TClientAndServerResult
  static getter<TClientResult, TServerResult>(
    clientGetter: () => TClientResult,
    serverGetter: () => TServerResult,
  ): () => TClientResult | TServerResult
  static getter(...args: any[]): any {
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
        const key = '__UNNAMED_GETTER__' + this.unnamedGetterIndex++
        const clientGetter = args[0]
        const serverGetter = args[1] || args[0]
        return { clientGetter, serverGetter, key }
      }
    })()
    this.getters[key] = { clientGetter, serverGetter }
    return () => this.get(key)
  }

  static get<TClientResult, TServerResult = undefined>(
    key: string,
  ): TServerResult extends undefined ? TClientResult : TServerResult | TClientResult {
    if (this.serverStorage) {
      const store = this.serverStorage.getStore()
      if (!store) {
        throw new Error('Server store not found. You should call GlobalStorage.get() only inside server context')
      }
      const existingValue = store[key]
      if (existingValue) {
        return existingValue
      }
      const getter = this.getters[key] as GetterRecord | undefined
      if (!getter) {
        throw new Error(`Neither getter nor value for key ${key} found`)
      }
      const newValue = getter.serverGetter()
      store[key] = newValue
      return newValue as never
    } else if (this.clientStore) {
      const existingValue = this.clientStore[key]
      if (existingValue) {
        return existingValue
      }
      const getter = this.getters[key] as GetterRecord | undefined
      if (!getter) {
        throw new Error(`Neither getter nor value for key ${key} found`)
      }
      const newValue = getter.clientGetter() as TClientResult
      this.clientStore[key] = newValue
      return newValue as never
    } else {
      throw new Error('Server storage and client store are not initialized. Please, call await SafeSsr.init() first')
    }
  }

  static set(key: string, value: any): void {
    if (this.serverStorage) {
      const store = this.serverStorage.getStore()
      if (!store) {
        throw new Error('Server store not found. You should call GlobalStorage.get() only inside server context')
      }
      store[key] = value
    } else if (this.clientStore) {
      this.clientStore[key] = value
    } else {
      throw new Error('Server storage and client store are not initialized. Please, call await SafeSsr.init() first')
    }
  }

  static run<T>(callback: () => T): T {
    if (this.serverStorage) {
      return this.serverStorage.run({}, callback)
    } else {
      return callback()
    }
  }
}

await GlobalStorage.init(process.env.SERVER_ONLY === '1')

export type GetterFn<T = unknown> = () => T
export type GetterRecord<TClientResult = unknown, TServerResult = unknown> = {
  clientGetter: GetterFn<TClientResult>
  serverGetter: TServerResult extends undefined ? GetterFn<TClientResult> : GetterFn<TServerResult>
}
export type GlobalStorageServerStoree = { [key: string]: any }
export type GlobalStorageServerStorage = AsyncLocalStorage<GlobalStorageServerStoree>
export type GlobalStorageClientStore = { [key: string]: any }
