import type { ClientPoints, PointsScope, RichFetchFn } from '@point0/core'
import { _getSsItemsWithRestErrors, _ssRunWithServerStorageState, superstore, generateId } from '@point0/core'
import fetchCookie from 'fetch-cookie'
import { CookieJar } from 'tough-cookie'
import type { Cookie } from 'tough-cookie'
import type { EngineClient } from './client.js'
import type { Engine } from './engine.js'
import { Effects, type CookieOptionsInput } from '@point0/core/effects'

type CookiesStoreSetter = (options: CookieOptionsInput) => void
type CookiesStoreGetter = {
  (name: string): string | undefined
  (): Record<string, string>
}

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
    // try {
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
    // } catch {}
    GlobalThisItemProxy.items.set(key, this)
  }

  static create(fakeClient: FakeClient, key: string, value: unknown) {
    const item = GlobalThisItemProxy.items.get(key)
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

  static destroy(fakeClient?: FakeClient) {
    if (fakeClient) {
      GlobalThisItemProxy.items.delete(fakeClient.id)
    } else {
      GlobalThisItemProxy.items.forEach((item) => {
        ;(globalThis as any)[item.key] = item.originalValue
      })
    }
  }
}

export type FakeClientCallback<TState extends FakeClientState = FakeClientState> = (state: TState) => any
export type FakeClientState = {
  [key: string]: unknown
}

export class FakeClient<TState extends FakeClientState = any> {
  id: string
  scope: PointsScope
  client: EngineClient<true>
  points: ClientPoints
  engine: Engine<any, true>
  state: TState
  jar: CookieJar
  // fetch: FetchCookieImpl<string | URL | Request, RequestInit, Response>
  fetch: RichFetchFn
  cookieSetter: CookiesStoreSetter | undefined
  cookieGetter: CookiesStoreGetter | undefined
  onRunStartOutside: FakeClientCallback<TState> | undefined
  onRunStartInside: FakeClientCallback<TState> | undefined
  onRunEndOutside: FakeClientCallback<TState> | undefined
  onRunEndInside: FakeClientCallback<TState> | undefined
  onDestroyOutside: FakeClientCallback<TState> | undefined
  onDestroyInside: FakeClientCallback<TState> | undefined

  private constructor({
    engine,
    client,
    points,
    id,
    scope,
    state,
    jar,
    fetch,
    onRunStartOutside,
    onRunStartInside,
    onRunEndOutside,
    onRunEndInside,
    onDestroyOutside,
    onDestroyInside,
    cookieSetter,
    cookieGetter,
  }: {
    engine: Engine<any, true>
    client: EngineClient<true>
    points: ClientPoints
    id: string
    scope: PointsScope
    state: TState
    jar: CookieJar
    fetch: RichFetchFn
    onRunStartOutside: FakeClientCallback<TState> | undefined
    onRunStartInside: FakeClientCallback<TState> | undefined
    onRunEndOutside: FakeClientCallback<TState> | undefined
    onRunEndInside: FakeClientCallback<TState> | undefined
    onDestroyOutside: FakeClientCallback<TState> | undefined
    onDestroyInside: FakeClientCallback<TState> | undefined
    cookieSetter: CookiesStoreSetter | undefined
    cookieGetter: CookiesStoreGetter | undefined
  }) {
    this.engine = engine
    this.client = client
    this.points = points
    this.id = id
    this.scope = scope
    this.state = state
    this.jar = jar
    this.fetch = fetch
    this.onRunStartOutside = onRunStartOutside
    this.onRunStartInside = onRunStartInside
    this.onRunEndOutside = onRunEndOutside
    this.onRunEndInside = onRunEndInside
    this.onDestroyOutside = onDestroyOutside
    this.onDestroyInside = onDestroyInside
    this.cookieSetter = cookieSetter
    this.cookieGetter = cookieGetter
  }

  static create<TState extends FakeClientState = FakeClientState>({
    engine,
    scope,
    globals,
    points,
    onRunStartOutside,
    onRunStartInside,
    onRunEndOutside,
    onRunEndInside,
    onDestroyOutside,
    onDestroyInside,
    cookieSetter,
    cookieGetter,
    state,
  }: {
    engine: Engine
    scope: PointsScope
    globals: Record<string, any>
    points?: ClientPoints
    onRunStartOutside?: FakeClientCallback<TState> | undefined
    onRunStartInside?: FakeClientCallback<TState> | undefined
    onRunEndOutside?: FakeClientCallback<TState> | undefined
    onRunEndInside?: FakeClientCallback<TState> | undefined
    onDestroyOutside?: FakeClientCallback<TState> | undefined
    onDestroyInside?: FakeClientCallback<TState> | undefined
    cookieSetter?: CookiesStoreSetter | undefined
    cookieGetter?: CookiesStoreGetter | undefined
    state?: TState | undefined
  }): FakeClient<TState> {
    if (!engine.initialized) {
      throw new Error('Engine is not initialized')
    }
    const client = engine.clients.find((client) => client.scope === scope)
    if (!client) {
      throw new Error(`No client found with scope "${scope}"`)
    }
    const id = generateId()
    const jar = new CookieJar()
    const getCookieMap = (): Record<string, string> => {
      if (cookieGetter) {
        return cookieGetter()
      }
      return {}
    }
    const syncJarFromCookieGetter = async (requestUrl: string): Promise<void> => {
      const cookies = getCookieMap()
      for (const [name, value] of Object.entries(cookies)) {
        const serializedCookie = Effects.serializeCookiePair({ name, value })
        await jar.setCookie(serializedCookie, requestUrl)
      }
    }
    const syncResponseCookiesToCookieSetter = (response: Response): void => {
      if (!cookieSetter) {
        return
      }
      const cookies = Effects.parseCookies(response)
      for (const cookie of cookies) {
        cookieSetter(cookie)
      }
    }
    const fetch = fetchCookie<string | URL | Request, RequestInit, Response>(async (input, init) => {
      const request =
        input instanceof Request
          ? input
          : new Request(
              typeof input === 'string' ? input : input instanceof URL ? input : String(input), // ← normalize URLLike
              init,
            )

      await syncJarFromCookieGetter(request.url)

      const response = await engine.fetch(request)
      syncResponseCookiesToCookieSetter(response)
      // Ensure the response has a URL property for fetch-cookie
      if (!('url' in response) || !response.url) {
        Object.defineProperty(response, 'url', {
          value: request.url,
          writable: false,
          enumerable: true,
          configurable: true,
        })
      }
      return response
    }, jar)
    points ??= client.points ?? (undefined as never)
    // if (!points) {
    //   // throw new Error('Points for fake client not provided')
    // }
    const fakeClient = new FakeClient({
      engine: engine as Engine<any, true>,
      client: client as EngineClient<true>,
      id,
      scope,
      points,
      jar,
      fetch,
      onRunStartOutside,
      onRunStartInside,
      onRunEndOutside,
      onRunEndInside,
      onDestroyOutside,
      onDestroyInside,
      state: state ?? ({} as TState),
      cookieSetter,
      cookieGetter,
    })
    for (const [key, value] of Object.entries(globals)) {
      GlobalThisItemProxy.create(fakeClient, key, value)
    }
    return fakeClient as unknown as FakeClient<TState>
  }

  async getCookies(url: string | undefined = undefined, httpOnly: boolean | undefined = undefined): Promise<Cookie[]> {
    const cookies = await this.jar.getCookies(url ?? `http://localhost:${this.engine.server.port}/`)
    if (httpOnly === undefined) {
      return cookies
    }
    return cookies.filter((cookie) => (httpOnly ? cookie.httpOnly : !cookie.httpOnly))
  }

  async destroy() {
    try {
      await this.onDestroyOutside?.(this.state)
      if (this.onDestroyInside) {
        await this.run(async () => {
          await this.onDestroyInside?.(this.state)
        })
      }
    } finally {
      GlobalThisItemProxy.destroy(this as never)
    }
  }

  async run<TResult>(
    fn: (state: TState) => TResult,
    options?: {
      onStartInside?: FakeClientCallback<TState> | undefined
      onEndInside?: FakeClientCallback<TState> | undefined
      onStartOutside?: FakeClientCallback<TState> | undefined
      onEndOutside?: FakeClientCallback<TState> | undefined
    },
  ): Promise<TResult> {
    await this.onRunStartOutside?.(this.state)
    await options?.onStartOutside?.(this.state)
    try {
      const result = (await _ssRunWithServerStorageState(
        _getSsItemsWithRestErrors(
          {
            __POINT0_FAKE_CLIENT__: this,
            __POINT0_CLIENT_POINTS__: this.points,
          },
          'Not yet exists in test client run',
        ),
        async () => {
          try {
            await this.onRunStartInside?.(this.state)
            await options?.onStartInside?.(this.state)
            const result = await fn(this.state)
            await options?.onEndInside?.(this.state)
            await this.onRunEndInside?.(this.state)
            return result
          } catch (error) {
            await options?.onEndInside?.(this.state)
            await this.onRunEndInside?.(this.state)
            throw error
          }
        },
      )) as TResult
      return result
    } finally {
      await options?.onEndOutside?.(this.state)
      await this.onRunEndOutside?.(this.state)
    }
  }
}
