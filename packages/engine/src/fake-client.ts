import type { EndPoint, PointsScope, RichFetchFn } from '@point0/core'
import { _getSsItemsWithRestErrors, _ssRunWithServerStorageState, superstore } from '@point0/core'
import fetchCookie from 'fetch-cookie'
import { Cookie, CookieJar } from 'tough-cookie'
import type { ClientBun } from './client.js'
import type { Engine } from './engine.js'
import { HtmlView } from '../tests/utils/html-view.js'

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
  client: ClientBun<true>
  engine: Engine<any, true>
  state: TState
  jar: CookieJar
  // fetch: FetchCookieImpl<string | URL | Request, RequestInit, Response>
  fetch: RichFetchFn

  onRunStartOutside: FakeClientCallback<TState> | undefined
  onRunStartInside: FakeClientCallback<TState> | undefined
  onRunEndOutside: FakeClientCallback<TState> | undefined
  onRunEndInside: FakeClientCallback<TState> | undefined
  onDestroyOutside: FakeClientCallback<TState> | undefined
  onDestroyInside: FakeClientCallback<TState> | undefined

  private constructor({
    engine,
    client,
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
  }: {
    engine: Engine<any, true>
    client: ClientBun<true>
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
  }) {
    this.engine = engine
    this.client = client
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
  }

  static create<TState extends FakeClientState = FakeClientState>({
    engine,
    scope,
    globals,
    onRunStartOutside,
    onRunStartInside,
    onRunEndOutside,
    onRunEndInside,
    onDestroyOutside,
    onDestroyInside,
    state,
  }: {
    engine: Engine
    scope: PointsScope
    globals: Record<string, any>
    onRunStartOutside?: FakeClientCallback<TState> | undefined
    onRunStartInside?: FakeClientCallback<TState> | undefined
    onRunEndOutside?: FakeClientCallback<TState> | undefined
    onRunEndInside?: FakeClientCallback<TState> | undefined
    onDestroyOutside?: FakeClientCallback<TState> | undefined
    onDestroyInside?: FakeClientCallback<TState> | undefined
    state?: TState | undefined
  }): FakeClient<TState> {
    if (!engine.initialized) {
      throw new Error('Engine is not initialized')
    }
    const client = engine.clients.find((client) => client.scope === scope)
    if (!client) {
      throw new Error(`No client found with scope "${scope}"`)
    }
    const id = crypto.randomUUID()
    const jar = new CookieJar()
    const fetch = fetchCookie<string | URL | Request, RequestInit, Response>(async (input, init) => {
      const request =
        input instanceof Request
          ? input
          : new Request(
              typeof input === 'string' ? input : input instanceof URL ? input : String(input), // ← normalize URLLike
              init,
            )

      // Sync cookies from document.cookie to the jar before making the request
      if (typeof document !== 'undefined' && document.cookie) {
        const url = new URL(request.url)
        const cookieStrings = document.cookie.split('; ').filter(Boolean)
        for (const cookieString of cookieStrings) {
          try {
            // Parse the cookie string (format: "name=value" or "name=value; Path=/; Domain=...")
            const cookie = Cookie.parse(cookieString)
            if (cookie) {
              // Set the cookie in the jar for the request URL
              await jar.setCookie(cookie, url.toString())
            }
          } catch (error) {
            // Ignore parsing errors for malformed cookies
            // This can happen with cookies that have special characters or invalid formats
          }
        }
      }

      const response = await engine.fetchSimple(request)
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
    const fakeClient = new FakeClient({
      engine: engine as Engine<any, true>,
      client: client as ClientBun<true>,
      id,
      scope,
      jar,
      fetch,
      onRunStartOutside,
      onRunStartInside,
      onRunEndOutside,
      onRunEndInside,
      onDestroyOutside,
      onDestroyInside,
      state: state ?? ({} as TState),
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

  async run<TResult>(fn: (state: TState) => TResult): Promise<TResult> {
    await this.onRunStartOutside?.(this.state)
    try {
      const result = (await _ssRunWithServerStorageState(
        _getSsItemsWithRestErrors(
          {
            __POINT0_FAKE_CLIENT__: this,
            __POINT0_CLIENT_SCOPE__: this.scope,
          },
          'Not yet exists in test client run',
        ),
        async () => {
          await this.onRunStartInside?.(this.state)
          try {
            const result = await fn(this.state)
            await this.onRunEndInside?.(this.state)
            return result
          } catch (error) {
            await this.onRunEndInside?.(this.state)
            throw error
          }
        },
      )) as TResult
      return result
    } finally {
      await this.onRunEndOutside?.(this.state)
    }
  }
}
