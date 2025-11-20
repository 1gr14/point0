import type { AsyncLocalStorage } from 'node:async_hooks'
import superjson from 'superjson'
import type { IfAnyThenElse } from './types.js'
import { isClient } from './client-server.js'
;(globalThis as any).__POINT0_EVERSION_STORE_SERVER_STORAGE__ =
  (globalThis as any).__POINT0_EVERSION_STORE_SERVER_STORAGE__ ||
  (isClient
    ? null
    : // eslint-disable-next-line @typescript-eslint/no-require-imports
      (new (require('node:async_hooks').AsyncLocalStorage)() as AsyncLocalStorage<EversionStoreState>))
// (new (await import('node:async_hooks').then((m) => m.AsyncLocalStorage))() as AsyncLocalStorage<EversionStoreState>))
;(globalThis as any).__POINT0_EVERSION_STORE_CONFIG__ =
  (globalThis as any).__POINT0_EVERSION_STORE_CONFIG__ || ({} as EversionStoreConfig)

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class EversionStore {
  private static dehydrated: Record<string, unknown> = {}

  private static readonly clientState: EversionStoreState = {}
  static getFullConfig(): EversionStoreConfig {
    return (globalThis as any).__POINT0_EVERSION_STORE_CONFIG__ as EversionStoreConfig
  }
  static getServerStorage(): EversionStoreServerStorage | null {
    return (globalThis as any).__POINT0_EVERSION_STORE_SERVER_STORAGE__
  }
  // private static readonly serverStorage: EversionStoreServerStorage | null = (globalThis as any).__POINT0_EVERSION_STORE_SERVER_STORAGE__
  // private static readonly serverStorage: EversionStoreServerStorage | null = isClient
  //   ? null
  //   : // eslint-disable-next-line @typescript-eslint/no-require-imports
  //     (new (require('node:async_hooks').AsyncLocalStorage)() as AsyncLocalStorage<EversionStoreState>)

  static define<TValue, TTranfarable extends boolean = true>(
    key: string,
    init: () => TValue,
    transferable?: TTranfarable,
  ): EversionStoreDefinedItem<TValue, TTranfarable extends false ? undefined : TValue>
  static define<TValue, TDehydratedValue>(
    key: string,
    init: () => TValue,
    dehydrate: (value: TValue) => TDehydratedValue,
    hydrate: (dehydratedValue: TDehydratedValue, init: () => TValue) => TValue,
  ): EversionStoreDefinedItem<TValue, TDehydratedValue>
  static define<TValue, TDehydratedValue>(
    key: string,
    config: EversionStoreConfigItem<TValue, TDehydratedValue>,
  ): EversionStoreDefinedItem<TValue, TDehydratedValue>
  static define(...args: any[]): any {
    const { key, init, dehydrate, hydrate } = (() => {
      if (typeof args[1] === 'object') {
        return {
          key: args[0],
          init: args[1].init,
          dehydrate: args[1].dehydrate,
          hydrate: args[1].hydrate,
        }
      }
      if (args.length === 4) {
        return {
          key: args[0],
          init: args[1],
          dehydrate: args[2],
          hydrate: args[3],
        }
      }
      const transferable = args[2] ?? true
      return {
        key: args[0],
        init: args[1],
        dehydrate: transferable ? (value: any) => value : undefined,
        hydrate: transferable ? (dehydratedValue: any) => dehydratedValue : undefined,
      }
    })()
    const config = EversionStore.getFullConfig()
    config[key] = { init, dehydrate, hydrate }
    return {
      get: EversionStore.get.bind(EversionStore, key),
      set: EversionStore.set.bind(EversionStore, key as never),
      config: config[key],
    }
  }

  // static define<TValue, TTranfarable extends boolean>(
  //   key: string,
  //   init: () => TValue,
  //   transferable: TTranfarable,
  // ): EversionStoreDefinedItem<TValue, TTranfarable extends false ? undefined : TValue>
  // static define<TValue, TDehydratedValue>(
  //   key: string,
  //   init: () => TValue,
  //   dehydrate: (value: TValue) => TDehydratedValue,
  //   hydrate: (dehydratedValue: TDehydratedValue, init: () => TValue) => TValue,
  // ): EversionStoreDefinedItem<TValue, TDehydratedValue>
  // static define(...args: any[]): any {
  //   const { key, init, dehydrate, hydrate } = (() => {
  //     if (args.length === 3) {
  //       return {
  //         key: args[0],
  //         init: args[1],
  //         dehydrate: args[2] ? (value: any) => value : undefined,
  //         hydrate: args[2] ? (dehydratedValue: any) => dehydratedValue : undefined,
  //       }
  //     }
  //     return {
  //       key: args[0],
  //       init: args[1],
  //       dehydrate: args[2],
  //       hydrate: args[3],
  //     }
  //   })()
  //   if (key in EversionStore.config) {
  //     throw new Error(`Key "${key}" already defined`)
  //   }
  //   EversionStore.config[key] = { init, dehydrate, hydrate }
  //   return {
  //     get: EversionStore.get.bind(this, key),
  //     set: EversionStore.set.bind(this, key as never),
  //     config: EversionStore.config[key],
  //   }
  // }

  // static redefine<TValue>(key: string, init: () => TValue): EversionStoreDefinedItem<TValue, any>
  // static redefine<TValue, TTranfarable extends boolean>(
  //   key: string,
  //   init: () => TValue,
  //   transferable: TTranfarable,
  // ): EversionStoreDefinedItem<TValue, TTranfarable extends false ? undefined : TValue>
  // static redefine<TValue, TDehydratedValue>(
  //   key: string,
  //   init: () => TValue,
  //   dehydrate: (value: TValue) => TDehydratedValue,
  //   hydrate: (dehydratedValue: TDehydratedValue, init: () => TValue) => TValue,
  // ): EversionStoreDefinedItem<TValue, TDehydratedValue>
  // static redefine(...args: any[]): any {
  //   const { key, init, dehydrate, hydrate, transferable } = (() => {
  //     if (args.length === 2) {
  //       return {
  //         key: args[0],
  //         init: args[1],
  //         dehydrate: undefined,
  //         hydrate: undefined,
  //         transferable: undefined,
  //       }
  //     }
  //     if (args.length === 3) {
  //       return {
  //         key: args[0],
  //         init: args[1],
  //         dehydrate: args[2] ? (value: any) => value : undefined,
  //         hydrate: args[2] ? (dehydratedValue: any) => dehydratedValue : undefined,
  //         transferable: args[2],
  //       }
  //     }
  //     return {
  //       key: args[0],
  //       init: args[1],
  //       dehydrate: args[2],
  //       hydrate: args[3],
  //       transferable: false,
  //     }
  //   })()
  //   if (!(key in EversionStore.config)) {
  //     if (transferable === undefined) {
  //       throw new Error(`Key "${key}" was not previously defined. You should provide dehydrate and hydrate fns`)
  //     }
  //     return EversionStore.define(key, init, dehydrate, hydrate)
  //   }
  //   if (transferable === undefined) {
  //     EversionStore.config[key].init = init
  //   } else {
  //     EversionStore.config[key].init = init
  //     EversionStore.config[key].dehydrate = dehydrate
  //     EversionStore.config[key].hydrate = hydrate
  //   }
  //   return {
  //     get: EversionStore.get.bind(this, key),
  //     set: EversionStore.set.bind(this, key as never),
  //     config: EversionStore.config[key],
  //   }
  // }

  static get<TValue = unknown>(key: string): TValue {
    const state = EversionStore.getState()
    const config = EversionStore.getFullConfig()
    const configItem = config[key] as EversionStoreConfigItem | undefined
    if (!configItem) {
      throw new Error(`Key "${key}" not found in config`)
    }
    const existingValue = state[key]
    if (existingValue) {
      return existingValue as TValue
    }
    const dehydratedValue = EversionStore.dehydrated[key]
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

  static getConfig(key: string): EversionStoreConfigItem | undefined {
    const config = EversionStore.getFullConfig()
    const configItem = config[key] as EversionStoreConfigItem | undefined
    if (!configItem) {
      throw new Error(`Key "${key}" not found in config`)
    }
    return configItem
  }

  static getWeak<TValue = unknown>(key: string): TValue | undefined {
    const state = EversionStore.getState()
    const existingValue = state[key]
    if (existingValue) {
      return existingValue as TValue
    }
    const config = EversionStore.getFullConfig()
    const configItem = config[key] as EversionStoreConfigItem | undefined
    const dehydratedValue = EversionStore.dehydrated[key]
    if (dehydratedValue) {
      if (!configItem) {
        throw new Error(`Key "${key}" is dehydrated but no config item is defined`)
      }
      if (!configItem.hydrate) {
        throw new Error(`Key "${key}" is dehydrated but no hydrate function is defined`)
      }
      const hydratedValue = configItem.hydrate(dehydratedValue, configItem.init)
      state[key] = hydratedValue
      return hydratedValue as TValue
    }
    if (configItem) {
      const initialValue = configItem.init()
      state[key] = initialValue
      return initialValue as TValue
    }
    return undefined
  }

  static set<TValue = unknown>(key: string, value: TValue): void {
    EversionStore.get(key) // so if no config for this key, it will throw an error
    const state = EversionStore.getState()
    state[key] = value
  }

  static setWeak<TValue = unknown>(key: string, value: TValue): void {
    // this only sets value, if no config for this key, it will not throw an error, and value will be accessible by getWeak
    const state = EversionStore.getState()
    state[key] = value
  }

  static getState = (): EversionStoreState => {
    if (isClient) {
      return EversionStore.clientState
    } else {
      const serverStorage = EversionStore.getServerStorage()
      if (!serverStorage) {
        throw new Error(
          'Server storage is not initialized. We do not know how it is possible. Please, report this issue to the developers.',
        )
      }
      const serverStore = serverStorage.getStore()
      if (!serverStore) {
        throw new Error(
          'Server store not found. You should call this function on server only inside server context wrapped in EversionStore.runWithServerStorageProvider. So call it in hooks, components, functions, not in top of files without wrappers',
        )
      }
      return serverStore
    }
  }

  static dehydrate = () => {
    const dehydrated: Record<string, unknown> = {}
    const config = EversionStore.getFullConfig()
    for (const [configItemKey, configItem] of Object.entries(config)) {
      try {
        if (!configItem.dehydrate) {
          continue
        }
        const stateValue = EversionStore.get(configItemKey)
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

  static hydrate(dehydrated: Record<string, unknown>): void {
    EversionStore.dehydrated = dehydrated
  }

  static hydrateFromString(dehydratedString: string): void {
    const dehydrated = superjson.parse(dehydratedString)
    EversionStore.dehydrated = dehydrated as Record<string, unknown>
  }

  static hydrateFromWindow(): void {
    if (typeof window !== 'undefined' && typeof (window as any)?.__POINT0_DEHYDRATED_EVERSION_STORE__ !== 'undefined') {
      EversionStore.hydrateFromString((window as any).__POINT0_DEHYDRATED_EVERSION_STORE__)
    }
  }

  static runWithServerStorageProvider<TResult>(
    serverEversionStoreState: Partial<EversionStoreState>,
    callback: () => TResult,
  ): TResult {
    const serverStorage = EversionStore.getServerStorage()
    if (serverStorage) {
      return serverStorage.run(serverEversionStoreState, callback)
    } else {
      return callback()
    }
  }
}

export type EversionStoreServerStorage = AsyncLocalStorage<EversionStoreState>

export type EversionStoreState = { [key: string]: unknown }

export type EversionStoreConfigItem<TValue = any, TDehydratedValue = any> = {
  init: () => TValue
  dehydrate: IfAnyThenElse<
    TDehydratedValue,
    undefined | ((value: TValue) => TDehydratedValue),
    TDehydratedValue extends undefined ? undefined : (value: TValue) => TDehydratedValue
  >
  hydrate: IfAnyThenElse<
    TDehydratedValue,
    undefined | ((dehydratedValue: TDehydratedValue, init: () => TValue) => TValue),
    TDehydratedValue extends undefined ? undefined : (dehydratedValue: TDehydratedValue, init: () => TValue) => TValue
  >
}
export type EversionStoreConfig = Record<string, EversionStoreConfigItem>

export type EversionStoreDefinedItem<TValue = any, TDehydratedValue = any> = {
  get: () => TValue
  set: (value: TValue) => void
  config: EversionStoreConfigItem<TValue, TDehydratedValue>
}
