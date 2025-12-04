import type { AsyncLocalStorage } from 'node:async_hooks'
import superjson from 'superjson'
import type { IfAnyThenElse } from './types.js'
import { ClientServerHelpers } from './client-server.js'
;(globalThis as any).__POINT0_EXTRACTOR_STORE_SERVER_STORAGE__ =
  (globalThis as any).__POINT0_EXTRACTOR_STORE_SERVER_STORAGE__ ||
  (ClientServerHelpers.isClient
    ? null
    : // eslint-disable-next-line @typescript-eslint/no-require-imports
      (new (require('node:async_hooks').AsyncLocalStorage)() as AsyncLocalStorage<ExtractorStoreState>))
// (new (await import('node:async_hooks').then((m) => m.AsyncLocalStorage))() as AsyncLocalStorage<ExtractorStoreState>))
;(globalThis as any).__POINT0_EXTRACTOR_STORE_CONFIG__ =
  (globalThis as any).__POINT0_EXTRACTOR_STORE_CONFIG__ || ({} as ExtractorStoreConfig)

export class ExtractorStore {
  private static dehydrated: Record<string, unknown> = {}

  private static readonly clientState: ExtractorStoreState = {}
  static getFullConfig(): ExtractorStoreConfig {
    return (globalThis as any).__POINT0_EXTRACTOR_STORE_CONFIG__ as ExtractorStoreConfig
  }
  static getServerStorage(): ExtractorStoreServerStorage | null {
    return (globalThis as any).__POINT0_EXTRACTOR_STORE_SERVER_STORAGE__
  }
  // private static readonly serverStorage: ExtractorStoreServerStorage | null = (globalThis as any).__POINT0_EXTRACTOR_STORE_SERVER_STORAGE__
  // private static readonly serverStorage: ExtractorStoreServerStorage | null = isClient
  //   ? null
  //   : // eslint-disable-next-line @typescript-eslint/no-require-imports
  //     (new (require('node:async_hooks').AsyncLocalStorage)() as AsyncLocalStorage<ExtractorStoreState>)

  static define<TValue, TTranfarable extends boolean = true>(
    key: string,
    init: () => TValue,
    transferable?: TTranfarable,
  ): ExtractorStoreDefinedItem<TValue, TTranfarable extends false ? undefined : TValue>
  static define<TValue, TDehydratedValue>(
    key: string,
    init: () => TValue,
    dehydrate: (value: TValue) => TDehydratedValue,
    hydrate: (dehydratedValue: TDehydratedValue, init: () => TValue) => TValue,
  ): ExtractorStoreDefinedItem<TValue, TDehydratedValue>
  static define<TValue, TDehydratedValue>(
    key: string,
    config: ExtractorStoreConfigItem<TValue, TDehydratedValue>,
  ): ExtractorStoreDefinedItem<TValue, TDehydratedValue>
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
    const config = ExtractorStore.getFullConfig()
    config[key] = { init, dehydrate, hydrate }
    return {
      get: ExtractorStore.get.bind(ExtractorStore, key),
      set: ExtractorStore.set.bind(ExtractorStore, key as never),
      config: config[key],
    }
  }

  // static define<TValue, TTranfarable extends boolean>(
  //   key: string,
  //   init: () => TValue,
  //   transferable: TTranfarable,
  // ): ExtractorStoreDefinedItem<TValue, TTranfarable extends false ? undefined : TValue>
  // static define<TValue, TDehydratedValue>(
  //   key: string,
  //   init: () => TValue,
  //   dehydrate: (value: TValue) => TDehydratedValue,
  //   hydrate: (dehydratedValue: TDehydratedValue, init: () => TValue) => TValue,
  // ): ExtractorStoreDefinedItem<TValue, TDehydratedValue>
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
  //   if (key in ExtractorStore.config) {
  //     throw new Error(`Key "${key}" already defined`)
  //   }
  //   ExtractorStore.config[key] = { init, dehydrate, hydrate }
  //   return {
  //     get: ExtractorStore.get.bind(this, key),
  //     set: ExtractorStore.set.bind(this, key as never),
  //     config: ExtractorStore.config[key],
  //   }
  // }

  // static redefine<TValue>(key: string, init: () => TValue): ExtractorStoreDefinedItem<TValue, any>
  // static redefine<TValue, TTranfarable extends boolean>(
  //   key: string,
  //   init: () => TValue,
  //   transferable: TTranfarable,
  // ): ExtractorStoreDefinedItem<TValue, TTranfarable extends false ? undefined : TValue>
  // static redefine<TValue, TDehydratedValue>(
  //   key: string,
  //   init: () => TValue,
  //   dehydrate: (value: TValue) => TDehydratedValue,
  //   hydrate: (dehydratedValue: TDehydratedValue, init: () => TValue) => TValue,
  // ): ExtractorStoreDefinedItem<TValue, TDehydratedValue>
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
  //   if (!(key in ExtractorStore.config)) {
  //     if (transferable === undefined) {
  //       throw new Error(`Key "${key}" was not previously defined. You should provide dehydrate and hydrate fns`)
  //     }
  //     return ExtractorStore.define(key, init, dehydrate, hydrate)
  //   }
  //   if (transferable === undefined) {
  //     ExtractorStore.config[key].init = init
  //   } else {
  //     ExtractorStore.config[key].init = init
  //     ExtractorStore.config[key].dehydrate = dehydrate
  //     ExtractorStore.config[key].hydrate = hydrate
  //   }
  //   return {
  //     get: ExtractorStore.get.bind(this, key),
  //     set: ExtractorStore.set.bind(this, key as never),
  //     config: ExtractorStore.config[key],
  //   }
  // }

  static get<TValue = unknown>(key: string): TValue {
    const state = ExtractorStore.getState()
    const config = ExtractorStore.getFullConfig()
    const configItem = config[key] as ExtractorStoreConfigItem | undefined
    if (!configItem) {
      throw new Error(`Key "${key}" not found in config`)
    }
    const existingValue = state[key]
    if (existingValue) {
      return existingValue as TValue
    }
    const dehydratedValue = ExtractorStore.dehydrated[key]
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

  static getConfig(key: string): ExtractorStoreConfigItem | undefined {
    const config = ExtractorStore.getFullConfig()
    const configItem = config[key] as ExtractorStoreConfigItem | undefined
    if (!configItem) {
      throw new Error(`Key "${key}" not found in config`)
    }
    return configItem
  }

  static getWeak<TValue = unknown>(key: string): TValue | undefined {
    const state = ExtractorStore.getState()
    const existingValue = state[key]
    if (existingValue) {
      return existingValue as TValue
    }
    const config = ExtractorStore.getFullConfig()
    const configItem = config[key] as ExtractorStoreConfigItem | undefined
    const dehydratedValue = ExtractorStore.dehydrated[key]
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
    ExtractorStore.get(key) // so if no config for this key, it will throw an error
    const state = ExtractorStore.getState()
    state[key] = value
  }

  static setWeak<TValue = unknown>(key: string, value: TValue): void {
    // this only sets value, if no config for this key, it will not throw an error, and value will be accessible by getWeak
    const state = ExtractorStore.getState()
    state[key] = value
  }

  static getState = (): ExtractorStoreState => {
    if (ClientServerHelpers.isClient) {
      return ExtractorStore.clientState
    } else {
      const serverStorage = ExtractorStore.getServerStorage()
      if (!serverStorage) {
        throw new Error(
          'Server storage is not initialized. We do not know how it is possible. Please, report this issue to the developers.',
        )
      }
      const serverStore = serverStorage.getStore()
      if (!serverStore) {
        throw new Error(
          'Server store not found. You should call this function on server only inside server context wrapped in ExtractorStore.runWithServerStorageProvider. So call it in hooks, components, functions, not in top of files without wrappers',
        )
      }
      return serverStore
    }
  }

  static dehydrate = () => {
    const dehydrated: Record<string, unknown> = {}
    const config = ExtractorStore.getFullConfig()
    for (const [configItemKey, configItem] of Object.entries(config)) {
      try {
        if (!configItem.dehydrate) {
          continue
        }
        const stateValue = ExtractorStore.get(configItemKey)
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
    ExtractorStore.dehydrated = dehydrated
  }

  static hydrateFromString(dehydratedString: string): void {
    const dehydrated = superjson.parse(dehydratedString)
    ExtractorStore.dehydrated = dehydrated as Record<string, unknown>
  }

  static hydrateFromWindow(): void {
    if (
      typeof window !== 'undefined' &&
      typeof (window as any)?.__POINT0_DEHYDRATED_EXTRACTOR_STORE__ !== 'undefined'
    ) {
      ExtractorStore.hydrateFromString((window as any).__POINT0_DEHYDRATED_EXTRACTOR_STORE__)
    }
  }

  static runWithServerStorageProvider<TResult>(
    serverExtractorStoreState: Partial<ExtractorStoreState>,
    callback: () => TResult,
  ): TResult {
    const serverStorage = ExtractorStore.getServerStorage()
    if (serverStorage) {
      return serverStorage.run(serverExtractorStoreState, callback)
    } else {
      return callback()
    }
  }
}

export type ExtractorStoreServerStorage = AsyncLocalStorage<ExtractorStoreState>

export type ExtractorStoreState = { [key: string]: unknown }

export type ExtractorStoreConfigItem<TValue = any, TDehydratedValue = any> = {
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
export type ExtractorStoreConfig = Record<string, ExtractorStoreConfigItem>

export type ExtractorStoreDefinedItem<TValue = any, TDehydratedValue = any> = {
  get: () => TValue
  set: (value: TValue) => void
  config: ExtractorStoreConfigItem<TValue, TDehydratedValue>
}
