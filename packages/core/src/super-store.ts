/* eslint-disable import/first */
import type { ClientPlatform } from './env.js'

// it is full copy of @point0/core, but we need avoid circulare dependency, all __POINT0_IS_TARGET_CLIENT__() will be also hardocded via compiler if target provided
const __POINT0_IS_TARGET_CLIENT__ = (): boolean => {
  // Browser-like (DOM available)
  if (typeof window !== 'undefined' && typeof document !== 'undefined') return true

  // React Native
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') return true

  // Electron renderer process
  if (typeof process !== 'undefined' && (process as any).type === 'renderer') return true

  // TODO: Electron main process in fact is client also (Yes it is client in point0 terminology, becouse it can send requests to server!)
  return false // Node.js, Bun, Deno, or other server runtimes
}

// I do not know why, but it is only way to do it to work in bun and vite at the same time
;(globalThis as any).__POINT0_SUPER_STORE_SERVER_STORAGE__ ||= __POINT0_IS_TARGET_CLIENT__()
  ? null
  : // eslint-disable-next-line @typescript-eslint/no-require-imports
    (new (require('node:async_hooks').AsyncLocalStorage)() as AsyncLocalStorage<SuperStoreState>)
;(globalThis as any).__POINT0_SUPER_STORE_CLIENT_GLOBAL_STATE__ ||= {}
;(globalThis as any).__POINT0_SUPER_STORE_SERVER_GLOBAL_STATE__ ||= {}

import type { AsyncLocalStorage } from 'node:async_hooks'
import type { DataTransformer, DataTransformerExtended, PointsScope } from './types.js'
import { blankDataTransformerExtended, toExtendedTransformer } from './utils.js'

export class SuperStore {
  static instance: SuperStore = (globalThis as any).__POINT0_SUPER_STORE_INSTANCE__ || new SuperStore()

  // per client
  private readonly _prepared = new Map<string, Map<string, unknown>>()

  get prepared(): Map<string, unknown> {
    const clientId = this.getFakeClient()?.id || 'default'
    const prepared = this._prepared.get(clientId) ?? new Map<string, unknown>()
    if (!this._prepared.has(clientId)) {
      this._prepared.set(clientId, prepared)
    }
    return prepared
  }

  // per client
  // touched = new Map<string, Set<string>>()

  items = new Map<string, SuperStoreItem>()

  serverStorage: SuperStoreServerStorage | undefined = (globalThis as any).__POINT0_SUPER_STORE_SERVER_STORAGE__

  clientGlobalState: SuperStoreState = (globalThis as any).__POINT0_SUPER_STORE_CLIENT_GLOBAL_STATE__

  serverGlobalState: SuperStoreState = (globalThis as any).__POINT0_SUPER_STORE_SERVER_GLOBAL_STATE__

  transformer: DataTransformerExtended | undefined | false

  reset: {
    (): void
    prepared: () => void
    // touched: () => void
    items: () => void
    clientGlobalState: () => void
    serverGlobalState: () => void
    transformer: () => void
  } = Object.assign(
    () => {
      this._prepared.clear()
      // this.touched.clear()
      this.items.clear()
      this.transformer = undefined
      this.resetClientGlobalState()
      this.resetServerGlobalState()
    },
    {
      prepared: () => this._prepared.clear(),
      // touched: () => this.touched.clear(),
      items: () => this.items.clear(),
      transformer: () => (this.transformer = undefined),
      clientGlobalState: () => {
        this.resetClientGlobalState()
      },
      serverGlobalState: () => {
        this.resetServerGlobalState()
      },
    },
  )

  private resetClientGlobalState(): void {
    for (const key of Object.keys(this.clientGlobalState)) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete this.clientGlobalState[key]
    }
  }

  private resetServerGlobalState(): void {
    for (const key of Object.keys(this.serverGlobalState)) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete this.serverGlobalState[key]
    }
  }

  fixServerStorage(AsyncLocalStorageClass: typeof AsyncLocalStorage): void {
    ;(globalThis as any).__POINT0_SUPER_STORE_SERVER_STORAGE__ ||= new AsyncLocalStorageClass()
    this.serverStorage = (globalThis as any).__POINT0_SUPER_STORE_SERVER_STORAGE__
  }

  setTransformer(transformer: DataTransformer | false): void {
    this.transformer = transformer === false ? false : toExtendedTransformer(transformer)
  }

  getSuitableTransformer(providedTransformer: DataTransformerExtended | false | undefined): DataTransformerExtended {
    if (providedTransformer === false) {
      return blankDataTransformerExtended
    }
    if (this.transformer === false) {
      return blankDataTransformerExtended
    }
    return providedTransformer ?? this.transformer ?? blankDataTransformerExtended
  }

  init() {
    for (const item of this.items.values()) {
      item.init()
    }
  }

  getStates():
    | {
        variant: 'client'
        clientState: SuperStoreState
        fakeClientState: undefined
        serverStorageState: undefined
        serverGlobalState: undefined
      }
    | {
        variant: 'server'
        clientState: undefined
        fakeClientState: undefined
        serverStorageState: SuperStoreState
        serverGlobalState: SuperStoreState
      }
    | {
        variant: 'fakeClient'
        clientState: undefined
        fakeClientState: SuperStoreState
        // serverStorageState: SuperStoreState
        serverStorageState: undefined
        serverGlobalState: undefined
      } {
    const fakeClient = this.getFakeClient()
    if (__POINT0_IS_TARGET_CLIENT__() && !fakeClient) {
      return {
        variant: 'client',
        clientState: this.clientGlobalState,
        fakeClientState: undefined,
        serverStorageState: undefined,
        serverGlobalState: undefined,
      }
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
      if (!fakeClient) {
        return {
          variant: 'server',
          clientState: undefined,
          fakeClientState: undefined,
          serverStorageState,
          serverGlobalState: this.serverGlobalState,
        }
      }
      serverStorageState.__POINT0_FAKE_CLIENTS_STATE__ ||= {}
      ;(serverStorageState.__POINT0_FAKE_CLIENTS_STATE__ as SuperStoreState)[fakeClient.id] ||= {}
      return {
        variant: 'fakeClient',
        clientState: undefined,
        fakeClientState: (serverStorageState.__POINT0_FAKE_CLIENTS_STATE__ as SuperStoreState)[
          fakeClient.id
        ] as SuperStoreState,
        // serverStorageState,
        serverStorageState: undefined,
        serverGlobalState: undefined,
      }
    }
  }

  // getState(): SuperStoreState {
  //   const { clientState, fakeClientState, serverStorageState } = this.getStates()
  //   if (clientState) {
  //     return clientState
  //   }
  //   if (fakeClientState) {
  //     return fakeClientState
  //   }
  //   // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  //   if (serverStorageState) {
  //     return serverStorageState
  //   }
  //   throw new Error('State not found. It is a critical bug, please report it')
  // }

  // getState(): SuperStoreState {
  //   const fakeClient = this.getFakeClient()
  //   if (env.target.is.client && !fakeClient) {
  //     return this.clientState
  //   } else {
  //     const serverStorage = this.serverStorage
  //     if (!serverStorage) {
  //       throw new Error(
  //         'Server storage is not initialized. We do not know how it is possible. Please, report this issue to the developers',
  //       )
  //     }
  //     const serverStorageState = serverStorage.getStore()
  //     if (!serverStorageState) {
  //       throw new Error(
  //         'Server store not found. You should call this function on server only inside server context wrapped in superstore.runWithServerStorageProvider(serverStorageState, callback). So call it in hooks, components, functions, not in top of files without wrappers',
  //       )
  //     }
  //     if (!fakeClient) {
  //       return serverStorageState
  //     }
  //     serverStorageState[fakeClient.id] ||= {}
  //     return serverStorageState[fakeClient.id] as SuperStoreState
  //   }
  // }

  private _parseDefineArgs(
    ...args:
      | [
          name: string,
          init: () => any,
          ssr: {
            dehydrate: (value: any) => any
            hydrate: (dehydratedValue: any, init: () => any) => any
          },
        ]
      | [name: string, init: () => any, policy: SuperStoreItemPolicy]
  ): {
    name: string
    init: () => any
    policy: SuperStoreItemPolicy
    dehydrate: (value: any) => any
    hydrate: (dehydratedValue: any, init: () => any) => any
  } {
    if (typeof args[2] === 'string') {
      return {
        name: args[0],
        init: args[1],
        dehydrate: (value: any) => value,
        hydrate: (value: any) => value,
        policy: args[2],
      }
    }
    if (typeof args[2] === 'object' && 'dehydrate' in args[2] && 'hydrate' in args[2]) {
      return {
        name: args[0],
        init: args[1],
        dehydrate: args[2].dehydrate,
        hydrate: args[2].hydrate,
        policy: 'clientServerTransferred',
      }
    }
    throw new Error(`Invalid arguments`)
  }

  define<TValue, TDehydratedValue>(
    key: string,
    init: () => TValue,
    ssr: {
      dehydrate: (value: TValue) => TDehydratedValue
      hydrate: (dehydratedValue: TDehydratedValue, init: () => TValue) => TValue
    },
  ): NiceSuperStoreItem<TValue, TDehydratedValue>
  define<TValue>(key: string, init: () => TValue, policy: SuperStoreItemPolicy): NiceSuperStoreItem<TValue, TValue>
  define(...args: Parameters<typeof this._parseDefineArgs>): any {
    const { name, init, policy, dehydrate, hydrate } = this._parseDefineArgs(...args)
    const exItem = this.items.get(name)
    if (exItem) {
      throw new Error(`Item with name "${name}" already defined`)
    }
    const item: SuperStoreItem = new SuperStoreItem({ name, init, dehydrate, hydrate, policy, superstore: this })
    this.items.set(name, item)
    return item
  }

  proxy<TItems extends Record<string, AnyNiceSuperStoreItem>>(items: TItems): ProxyResult<TItems> {
    const proxy = new Proxy(
      {},
      {
        get(target, prop) {
          if (typeof prop !== 'string') {
            return undefined
          }
          return items[prop].get()
        },
        set(target, prop, value) {
          if (typeof prop !== 'string') {
            return false
          }
          const item = items[prop]
          if ('set' in item && typeof item.set === 'function') {
            item.set(value)
            return true
          }
          throw new Error(`Cannot set value to item "${prop}"`)
        },
      },
    ) as ProxyResult<TItems>
    return proxy
  }

  createTypedRunWithServerStorageState<TItems extends Record<string, AnyNiceSuperStoreItem>>(): <TResult>(
    serverStorageState: SuperStoreItemsValuesOrErrors<TItems>,
    callback: () => TResult,
  ) => TResult {
    return <TResult>(serverStorageState: SuperStoreItemsValuesOrErrors<TItems>, callback: () => TResult): TResult => {
      return this.runWithServerStorageState(serverStorageState, callback)
    }
  }

  getItem<TValue = unknown>(name: string): SuperStoreItem<TValue> | undefined {
    return this.items.get(name)
  }

  private static returnValueOrError<TValue = unknown>(value: TValue | Error, allowError = false): TValue | Error {
    if (value instanceof Error) {
      if (allowError) {
        return value
      }
      throw value
    }
    return value
  }

  private getStateByItemPolicy(
    name: string,
    policy: SuperStoreItemPolicy,
    states: ReturnType<typeof this.getStates>,
  ): SuperStoreState {
    // if (policy === 'clientOnly' && states.variant === 'server') {
    //   throw new Error(`Cannot access clientOnly item "${name}" from server`)
    // }
    // if (policy === 'serverOnlyGlobal' && states.variant === 'client') {
    //   throw new Error(`Cannot access serverOnlyGlobal item "${name}" from client`)
    // }
    // if (policy === 'serverOnlyStorage' && states.variant === 'client') {
    //   throw new Error(`Cannot access serverOnlyStorage item "${name}" from client`)
    // }
    const result = (() => {
      // if (policy === 'clientonly') {
      //   return states.clientState || states.fakeClientState
      // }
      // if (policy === 'ssr') {
      //   return states.clientState || states.fakeClientState || states.serverStorageState
      // }
      // // server only
      // return states.serverStorageState
      switch (policy) {
        case 'clientOnly': {
          if (states.variant === 'server') {
            throw new Error(`Cannot access clientOnly item "${name}" from server`)
          }
          return states.clientState || states.fakeClientState
        }
        case 'clientServerTransferred': {
          return states.clientState || states.fakeClientState || states.serverStorageState
        }
        case 'clientServerIsolated': {
          return states.clientState || states.fakeClientState || states.serverStorageState
        }
        case 'serverOnlyStorage': {
          // if (states.variant === 'client') {
          if (states.variant !== 'server') {
            throw new Error(`Cannot access serverOnlyStorage item "${name}" from client`)
          }
          return states.serverStorageState
        }
        case 'serverOnlyGlobal': {
          // if (states.variant === 'client') {
          if (states.variant !== 'server') {
            throw new Error(`Cannot access serverOnlyGlobal item "${name}" from client`)
          }
          return states.serverGlobalState
        }
        // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
        default:
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          throw new Error(`Invalid policy: ${policy}`)
      }
    })()
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!result) {
      throw new Error(`State not found for item policy "${policy}". It is a critical bug, please report it`)
    }
    return result
  }

  // private validateItemAction(
  //   item: SuperStoreItem,
  //   action: 'get' | 'set',
  //   states: ReturnType<typeof this.getStates>,
  // ): void {
  //   if (item.readonly && action === 'set') {
  //     throw new Error(`Cannot set value to readonly item "${item.name}"`)
  //   }
  //   if (item.policy === 'clientonly' && states.variant === 'server') {
  //     throw new Error(`Cannot access clientonly item "${item.name}" from server`)
  //   }
  //   if (item.policy === 'serveronly' && states.variant === 'client') {
  //     throw new Error(`Cannot access serveronly item "${item.name}" from client`)
  //   }
  // }

  getValue<TValue = unknown>(name: string, policy: SuperStoreItemPolicy): TValue | undefined
  getValue<TValue = unknown>(name: string, policy: SuperStoreItemPolicy, allowError: true): TValue | Error | undefined
  getValue(name: string, policy: SuperStoreItemPolicy, allowError?: boolean) {
    const states = this.getStates()

    const item = this.getItem(name)
    if (item) {
      if (item.policy !== policy) {
        throw new Error(`Cannot access item "${name}" with policy "${policy}" from policy "${item.policy}"`)
      }
      const state = this.getStateByItemPolicy(item.name, item.policy, states)
      const prepared = this.prepared
      if (prepared.has(name)) {
        const dehydratedValue = prepared.get(name)
        const hydratedValue = item.hydrate(dehydratedValue)
        prepared.delete(name)
        // this.touched.add(name)
        state[name] = hydratedValue
        return SuperStore.returnValueOrError(hydratedValue, allowError)
      }
      if (name in state) {
        return SuperStore.returnValueOrError(state[name], allowError)
      }
      const initialValue = item.init()
      // this.touched.add(name)
      state[name] = initialValue
      return SuperStore.returnValueOrError(initialValue, allowError)
    }

    const state = this.getStateByItemPolicy(name, policy, states)
    if (name in state) {
      return SuperStore.returnValueOrError(state[name], allowError)
    }

    // this.touched.add(name)
    state[name] = undefined
    return undefined
  }

  getValueWeak<TValue = unknown>(name: string, policy: SuperStoreItemPolicy): TValue | undefined {
    try {
      return this.getValue(name, policy)
    } catch {
      return undefined
    }
  }

  setValue<TValue = unknown>(name: string, value: TValue, policy: SuperStoreItemPolicy): void {
    // this.touched.add(name)
    this.prepared.delete(name)
    const states = this.getStates()
    const item = this.getItem(name)
    if (item && item.policy !== policy) {
      throw new Error(`Cannot set value to item "${name}" with policy "${policy}" from policy "${item.policy}"`)
    }
    if (item?.readonly) {
      throw new Error(`Cannot set value to readonly item "${name}"`)
    }
    const state = this.getStateByItemPolicy(name, policy, states)
    state[name] = value
  }

  runWithServerStorageState<TResult>(serverStorageState: Partial<SuperStoreState>, callback: () => TResult): TResult {
    if (this.serverStorage) {
      return this.serverStorage.run(serverStorageState, callback)
    } else {
      return callback()
    }
  }

  dehydrate(): Record<string, unknown> {
    const dehydrated: Record<string, unknown> = {}
    for (const item of this.items.values()) {
      if (item.policy !== 'clientServerTransferred') {
        continue
      }
      dehydrated[item.name] = item.dehydrate()
    }
    return dehydrated
  }

  stringify(transformer?: DataTransformerExtended | false | undefined): string {
    return this.getSuitableTransformer(transformer).stringify(this.dehydrate()) as string
  }

  parse(dehydratedString: string, transformer?: DataTransformerExtended | false | undefined): Record<string, unknown> {
    return this.getSuitableTransformer(transformer).parse(dehydratedString)
  }

  prepare(dehydrated: string, transformer?: DataTransformerExtended | false | undefined): void
  prepare(dehydrated: Record<string, unknown>, transformer?: DataTransformerExtended | false | undefined): void
  prepare(
    dehydrated: Record<string, unknown> | string,
    transformer?: DataTransformerExtended | false | undefined,
  ): void {
    if (typeof dehydrated === 'string') {
      dehydrated = this.parse(dehydrated, transformer)
    }
    for (const [itemName, dehydratedValue] of Object.entries(dehydrated)) {
      this.prepared.set(itemName, dehydratedValue)
    }
  }

  getFakeClient(): { id: string; scope: PointsScope; platform: ClientPlatform } | undefined {
    if (!this.serverStorage) {
      return undefined
    }
    const serverStorageState = this.serverStorage.getStore()
    if (!serverStorageState) {
      return undefined
    }
    return serverStorageState.__POINT0_FAKE_CLIENT__ as never
  }

  isFakeClient(): boolean {
    return this.getFakeClient() !== undefined
  }

  isRealServerOverFakeClient(): boolean {
    if (!this.serverStorage) {
      return false
    }
    const serverStorageState = this.serverStorage.getStore()
    if (!serverStorageState) {
      return false
    }
    return !!serverStorageState.__POINT0_REAL_SERVER_OVER_FAKE_CLIENT__
  }
}

export class SuperStoreItem<TValue = any, TDehydratedValue = any> {
  superstore: SuperStore
  name: string
  init: () => TValue
  policy: SuperStoreItemPolicy
  dehydrate: () => TDehydratedValue
  hydrate: (dehydratedValue: TDehydratedValue) => TValue
  readonly = false

  constructor({
    name,
    init,
    policy,
    dehydrate,
    hydrate,
    superstore,
  }: {
    superstore: SuperStore
    name: string
    init: () => TValue
    policy: SuperStoreItemPolicy
    dehydrate: (value: TValue) => TDehydratedValue
    hydrate: (dehydratedValue: TDehydratedValue, init: () => TValue) => TValue
  }) {
    this.superstore = superstore
    this.name = name
    this.init = init
    this.policy = policy
    this.dehydrate = () => dehydrate(this.get())
    this.hydrate = (dehydratedValue: TDehydratedValue) => hydrate(dehydratedValue, init)
  }

  get = (): TValue => {
    return this.superstore.getValue(this.name, this.policy) as TValue
  }

  getWeak = (): TValue | undefined => {
    return this.superstore.getValueWeak(this.name, this.policy)
  }

  set = (value: TValue): void => {
    this.superstore.setValue(this.name, value, this.policy)
  }

  redefine = (init: () => TValue): void => {
    this.init = init
  }

  get config() {
    return {
      name: this.name,
      init: this.init,
      policy: this.policy,
      dehydrate: this.dehydrate,
      hydrate: this.hydrate,
    }
  }
}

export const superstore = SuperStore.instance
export const ss = SuperStore.instance

export type SuperStoreItemPolicy =
  | 'clientServerIsolated'
  | 'clientServerTransferred'
  | 'clientOnly'
  | 'serverOnlyStorage'
  | 'serverOnlyGlobal'

export type SuperStoreServerStorage = AsyncLocalStorage<SuperStoreState>

export type SuperStoreState = { [key: string]: unknown }

export type ProxyResult<TItems extends Record<string, AnyNiceSuperStoreItem>> = {
  [K in keyof TItems]: TItems[K] extends AnyNiceSuperStoreItem<infer TValue, any> ? TValue : never
}

export type SuperStoreItemsValues<TItems extends Record<string, AnyNiceSuperStoreItem>> = {
  [K in keyof TItems]: TItems[K] extends AnyNiceSuperStoreItem<infer TValue, any> ? TValue : never
}

export type SuperStoreItemsValuesOrErrors<TItems extends Record<string, AnyNiceSuperStoreItem>> = {
  [K in keyof TItems]: TItems[K] extends AnyNiceSuperStoreItem<infer TValue, any> ? TValue | Error : never
}

export type NiceSuperStoreItem<TValue = any, TDehydratedValue = any> = Pick<
  SuperStoreItem<TValue, TDehydratedValue>,
  'get' | 'getWeak' | 'set' | 'config'
>
export type NiceUnsettableRedefinableSuperStoreItem<TValue = any, TDehydratedValue = any> = Pick<
  SuperStoreItem<TValue, TDehydratedValue>,
  'get' | 'getWeak' | 'redefine' | 'config'
>
export type NiceReadonlySuperStoreItem<TValue = any, TDehydratedValue = any> = Pick<
  SuperStoreItem<TValue, TDehydratedValue>,
  'get' | 'getWeak' | 'config'
>
export type AnyNiceSuperStoreItem<TValue = any, TDehydratedValue = any> =
  | NiceSuperStoreItem<TValue, TDehydratedValue>
  | NiceUnsettableRedefinableSuperStoreItem<TValue, TDehydratedValue>
  | NiceReadonlySuperStoreItem<TValue, TDehydratedValue>

export type ToNiceSuperStoreItem<TSuperStorItem extends SuperStoreItem> = Pick<
  TSuperStorItem,
  'get' | 'getWeak' | 'set' | 'config'
>
export type ToNiceUnsettableRedefinableSuperStoreItem<TSuperStorItem extends SuperStoreItem> = Pick<
  TSuperStorItem,
  'get' | 'getWeak' | 'redefine' | 'config'
>
export type ToNiceReadonlySuperStoreItem<TSuperStorItem extends SuperStoreItem> = Pick<
  TSuperStorItem,
  'get' | 'getWeak' | 'config'
>
