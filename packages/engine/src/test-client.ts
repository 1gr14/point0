import type { FetchFn, PointsScope } from '@point0/core'
import { _getSsItemsWithRestErrors, _ssRunWithServerStorageState, superstore } from '@point0/core'
import type { ClientBun } from './client.js'
import type { Engine } from './engine.js'
import fetchCookie from 'fetch-cookie'
import { CookieJar } from 'tough-cookie'

class GlobalThisItemProxy {
  // item key -> item proxy
  static items = new Map<string, GlobalThisItemProxy>()

  key: string
  originalValue: unknown
  // fake client id -> fake client value
  fakeClientsValues: Map<string, unknown>

  private constructor({
    key,
    fakeClientId,
    fakeClientValue,
    originalValue,
  }: {
    key: string
    fakeClientId: string
    fakeClientValue: unknown
    originalValue: unknown
  }) {
    this.key = key
    this.originalValue = originalValue
    this.fakeClientsValues = new Map<string, unknown>()
    this.fakeClientsValues.set(fakeClientId, fakeClientValue)
    Object.defineProperty(globalThis, key, {
      get: () => {
        const fakeClient = superstore.getFakeClient()
        if (!fakeClient) {
          return this.originalValue
        }
        if (!this.fakeClientsValues.has(fakeClient.id)) {
          return this.originalValue
        }
        return this.fakeClientsValues.get(fakeClient.id)
      },
      set: (value) => {
        const fakeClient = superstore.getFakeClient()
        if (!fakeClient) {
          this.originalValue = value
          return
        }
        this.fakeClientsValues.set(fakeClient.id, value)
      },
    })
    GlobalThisItemProxy.items.set(key, this)
  }

  static create(fakeClient: FakeClient, key: string, value: unknown) {
    const item = this.items.get(key)
    if (!item) {
      return new GlobalThisItemProxy({
        key,
        fakeClientId: fakeClient.id,
        fakeClientValue: value,
        originalValue: (globalThis as any)[key],
      })
    }
    item.fakeClientsValues.set(fakeClient.id, value)
    return item
  }
}

export type FakeClientCleanup = () => any

export class FakeClient {
  id: string
  scope: PointsScope
  client: ClientBun<true>
  engine: Engine<any, true>
  jar: CookieJar
  fetch: FetchFn
  cleanup: FakeClientCleanup | undefined

  private constructor({
    engine,
    client,
    id,
    scope,
    jar,
    fetch,
    cleanup,
  }: {
    engine: Engine<any, true>
    client: ClientBun<true>
    id: string
    scope: PointsScope
    jar: CookieJar
    fetch: FetchFn
    cleanup: FakeClientCleanup | undefined
  }) {
    this.engine = engine
    this.client = client
    this.id = id
    this.scope = scope
    this.jar = jar
    this.fetch = fetch
    this.cleanup = cleanup
  }

  static create({
    engine,
    scope,
    globals,
    cleanup,
  }: {
    engine: Engine<any, true>
    scope: PointsScope
    globals: Record<string, any>
    cleanup?: FakeClientCleanup
  }): FakeClient {
    const client = engine.clients.find((client) => client.scope === scope)
    if (!client) {
      throw new Error(`No client found with scope "${scope}"`)
    }
    const id = crypto.randomUUID()
    const jar = new CookieJar()
    const fetch = fetchCookie(engine.fetchSimple.bind(engine), jar)
    const fakeClient = new FakeClient({ engine, client, id, scope, jar, fetch, cleanup })
    for (const [key, value] of Object.entries(globals)) {
      GlobalThisItemProxy.create(fakeClient, key, value)
    }
    return fakeClient
  }

  run<TResult>(fn: () => TResult): TResult {
    return _ssRunWithServerStorageState(
      _getSsItemsWithRestErrors(
        {
          __POINT0_FAKE_CLIENT__: this,
          __POINT0_CLIENT_SCOPE__: this.scope,
        },
        'Not yet exists in test client run',
      ),
      // eslint-disable-next-line @typescript-eslint/promise-function-async
      () => {
        try {
          const result = fn()
          if (result instanceof Promise) {
            const promiseResult = result
              .then((result) => {
                this.cleanup?.()
                return result
              })
              .catch((error: unknown) => {
                this.cleanup?.()
                throw error
              })
            return promiseResult
          } else {
            this.cleanup?.()
            return result
          }
        } catch (error) {
          this.cleanup?.()
          throw error
        }
      },
    ) as TResult
  }
}
