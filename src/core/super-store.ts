import type { AsyncLocalStorage } from 'node:async_hooks'
import superjson from 'superjson'
import type { IfAnyThenElse } from './types.js'

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class SuperStore {
  private static dehydrated: Record<string, unknown> = {}
  static config: SuperStoreConfig = {}

  private static readonly clientState: SuperState = {}
  private static readonly serverStorage: SuperServerStorage | null = process.env.IS_CLIENT
    ? null
    : // eslint-disable-next-line @typescript-eslint/no-require-imports
      (new (require('node:async_hooks').AsyncLocalStorage)() as AsyncLocalStorage<SuperState>)

  static define<TValue, TTranfarable extends boolean>(
    key: string,
    init: () => TValue,
    transferable: TTranfarable,
  ): SuperDefinedItem<TValue, TTranfarable extends false ? undefined : TValue>
  static define<TValue, TDehydratedValue>(
    key: string,
    init: () => TValue,
    dehydrate: (value: TValue) => TDehydratedValue,
    hydrate: (dehydratedValue: TDehydratedValue, init: () => TValue) => TValue,
  ): SuperDefinedItem<TValue, TDehydratedValue>
  static define(...args: any[]): any {
    const { key, init, dehydrate, hydrate } = (() => {
      if (args.length === 3) {
        return {
          key: args[0],
          init: args[1],
          dehydrate: args[2] ? (value: any) => value : undefined,
          hydrate: args[2] ? (dehydratedValue: any) => dehydratedValue : undefined,
        }
      }
      return {
        key: args[0],
        init: args[1],
        dehydrate: args[2],
        hydrate: args[3],
      }
    })()
    // if (key in this.config) {
    //   throw new Error(`Key "${key}" already defined`)
    // }
    this.config[key] = { init, dehydrate, hydrate }
    return {
      get: this.get.bind(this, key),
      set: this.set.bind(this, key as never),
      config: this.config[key],
    }
  }

  // static define<TValue, TTranfarable extends boolean>(
  //   key: string,
  //   init: () => TValue,
  //   transferable: TTranfarable,
  // ): SuperDefinedItem<TValue, TTranfarable extends false ? undefined : TValue>
  // static define<TValue, TDehydratedValue>(
  //   key: string,
  //   init: () => TValue,
  //   dehydrate: (value: TValue) => TDehydratedValue,
  //   hydrate: (dehydratedValue: TDehydratedValue, init: () => TValue) => TValue,
  // ): SuperDefinedItem<TValue, TDehydratedValue>
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
  //   if (key in this.config) {
  //     throw new Error(`Key "${key}" already defined`)
  //   }
  //   this.config[key] = { init, dehydrate, hydrate }
  //   return {
  //     get: this.get.bind(this, key),
  //     set: this.set.bind(this, key as never),
  //     config: this.config[key],
  //   }
  // }

  // static redefine<TValue>(key: string, init: () => TValue): SuperDefinedItem<TValue, any>
  // static redefine<TValue, TTranfarable extends boolean>(
  //   key: string,
  //   init: () => TValue,
  //   transferable: TTranfarable,
  // ): SuperDefinedItem<TValue, TTranfarable extends false ? undefined : TValue>
  // static redefine<TValue, TDehydratedValue>(
  //   key: string,
  //   init: () => TValue,
  //   dehydrate: (value: TValue) => TDehydratedValue,
  //   hydrate: (dehydratedValue: TDehydratedValue, init: () => TValue) => TValue,
  // ): SuperDefinedItem<TValue, TDehydratedValue>
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
  //   if (!(key in this.config)) {
  //     if (transferable === undefined) {
  //       throw new Error(`Key "${key}" was not previously defined. You should provide dehydrate and hydrate fns`)
  //     }
  //     return this.define(key, init, dehydrate, hydrate)
  //   }
  //   if (transferable === undefined) {
  //     this.config[key].init = init
  //   } else {
  //     this.config[key].init = init
  //     this.config[key].dehydrate = dehydrate
  //     this.config[key].hydrate = hydrate
  //   }
  //   return {
  //     get: this.get.bind(this, key),
  //     set: this.set.bind(this, key as never),
  //     config: this.config[key],
  //   }
  // }

  static get<TValue = unknown>(key: string): TValue {
    const state = this.getState()
    const configItem = this.config[key] as SuperStoreConfigItem | undefined
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

  static getConfig(key: string): SuperStoreConfigItem | undefined {
    const configItem = this.config[key] as SuperStoreConfigItem | undefined
    if (!configItem) {
      throw new Error(`Key "${key}" not found in config`)
    }
    return configItem
  }

  static getWeak<TValue = unknown>(key: string): TValue | undefined {
    const state = this.getState()
    const existingValue = state[key]
    if (existingValue) {
      return existingValue as TValue
    }
    const configItem = this.config[key] as SuperStoreConfigItem | undefined
    const dehydratedValue = this.dehydrated[key]
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
    this.get(key)
    const state = this.getState()
    state[key] = value
  }

  static getState = (): SuperState => {
    if (process.env.IS_CLIENT) {
      return this.clientState
    } else {
      if (!this.serverStorage) {
        throw new Error(
          'Server storage is not initialized. We do not know how it is possible. Please, report this issue to the developers.',
        )
      }
      const serverStore = this.serverStorage.getStore()
      if (!serverStore) {
        throw new Error(
          'Server store not found. You should call this function on server only inside server context wrapped in SuperStore.runWithServerStorageProvider',
        )
      }
      return serverStore
    }
  }

  static dehydrate = () => {
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

  static hydrate(dehydrated: Record<string, unknown>): void {
    this.dehydrated = dehydrated
  }

  static hydrateFromString(dehydratedString: string): void {
    this.dehydrated = superjson.parse(dehydratedString)
  }

  static hydrateFromWindow(): void {
    if (typeof window !== 'undefined' && typeof (window as any)?.__DEHYDRATED_SUPER_STORE__ !== 'undefined') {
      this.hydrateFromString((window as any).__DEHYDRATED_SUPER_STORE__)
    }
  }

  static runWithServerStorageProvider<TResult>(
    serverSuperState: Partial<SuperState>,
    callback: () => TResult,
  ): TResult {
    if (this.serverStorage) {
      return this.serverStorage.run(serverSuperState, callback)
    } else {
      return callback()
    }
  }
}

export type SuperServerStorage = AsyncLocalStorage<SuperState>

export type SuperState = { [key: string]: unknown }

export type SuperStoreConfigItem<TValue = any, TDehydratedValue = any> = {
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
export type SuperStoreConfig = Record<string, SuperStoreConfigItem>

export type SuperDefinedItem<TValue = any, TDehydratedValue = any> = {
  get: () => TValue
  set: (value: TValue) => void
  config: SuperStoreConfigItem<TValue, TDehydratedValue>
}
