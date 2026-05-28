import { _getSsItemsWithRestErrors, _ssRunWithServerStorageState, generateId, superstore } from '@point0/core'
import type { ClientPoints, ClientRuntime, PointsScope, RichFetchFn } from '@point0/core'
import { Effects, type CookieOptionsInput } from '@point0/core/effects'
import fetchCookie from 'fetch-cookie'
import { CookieJar } from 'tough-cookie'
import type { EngineClient } from './client.js'
import type { Engine } from './engine.js'
import type { ErrorPoint0 } from '@point0/core'

type CookieStoreSetter = (options: CookieOptionsInput) => void
type CookieStoreGetter = {
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

  static create(fakeClient: FakeClient<any, any>, key: string, value: unknown) {
    const item = GlobalThisItemProxy.items.get(key)
    if (!item) {
      return new GlobalThisItemProxy({
        key,
        fakeClientId: fakeClient.id,
        fakeClientValue: value,
        // Keep a stable fallback for globals that don't exist in Node/Bun by default
        // (e.g. window/document) to avoid async callbacks crashing outside fake-client context.
        originalValue:
          typeof (globalThis as unknown as Record<string, unknown>)[key] === 'undefined'
            ? undefined
            : (globalThis as unknown as Record<string, unknown>)[key],
      })
    }
    item.fakeClientsValues.set(fakeClient.id, value)
    return item
  }

  static destroy(fakeClient?: FakeClient<any, any>) {
    if (fakeClient) {
      GlobalThisItemProxy.items.forEach((item) => {
        item.fakeClientsValues.delete(fakeClient.id)
      })
    } else {
      GlobalThisItemProxy.items.forEach((item) => {
        ;(globalThis as unknown as Record<string, unknown>)[item.key] = item.originalValue
      })
    }
  }
}

export type FakeClientCallback<TState extends FakeClientState = FakeClientState> = (
  state: TState,
) => void | Promise<void>
export type FakeClientState = {
  [key: string]: unknown
}

export class FakeClient<TState extends FakeClientState, TError extends ErrorPoint0> {
  id: string
  scope: PointsScope
  runtime: ClientRuntime
  client: EngineClient<true, TError>
  points: ClientPoints<TError>

  engine: Engine<any, TError, true>
  state: TState
  jar: CookieJar
  fetch: RichFetchFn
  cookieSetter: CookieStoreSetter | undefined
  cookieGetter: CookieStoreGetter | undefined
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
    runtime,
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
    engine: Engine<any, any, true>
    client: EngineClient<true, TError>
    points: ClientPoints<TError>
    runtime: ClientRuntime
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
    cookieSetter: CookieStoreSetter | undefined
    cookieGetter: CookieStoreGetter | undefined
  }) {
    this.engine = engine
    this.client = client
    this.points = points
    this.runtime = runtime
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

  static create<TState extends FakeClientState, TError extends ErrorPoint0>({
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
    engine: Engine<any, any, any>
    scope: PointsScope
    globals: Record<string, unknown>
    points?: ClientPoints<TError>
    onRunStartOutside?: FakeClientCallback<TState> | undefined
    onRunStartInside?: FakeClientCallback<TState> | undefined
    onRunEndOutside?: FakeClientCallback<TState> | undefined
    onRunEndInside?: FakeClientCallback<TState> | undefined
    onDestroyOutside?: FakeClientCallback<TState> | undefined
    onDestroyInside?: FakeClientCallback<TState> | undefined
    cookieSetter?: CookieStoreSetter | undefined
    cookieGetter?: CookieStoreGetter | undefined
    state?: TState | undefined
  }): FakeClient<TState, TError> {
    if (!engine.prepared) {
      throw new Error('Engine is not prepared. Please call engine.prepare() first.')
    }
    const client = engine.clients.find((client) => client.scope === scope) as EngineClient<true, TError> | undefined
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
    const addCookiesToRequestFromCookieGetter = (request: Request): void => {
      const cookies = getCookieMap()
      const existingCookieHeader = request.headers.get('cookie')
      const mergedCookies = new Map<string, string>()
      if (existingCookieHeader) {
        for (const cookiePart of existingCookieHeader.split(';')) {
          const trimmedCookiePart = cookiePart.trim()
          if (!trimmedCookiePart) {
            continue
          }
          const separatorIndex = trimmedCookiePart.indexOf('=')
          if (separatorIndex < 0) {
            continue
          }
          const name = trimmedCookiePart.slice(0, separatorIndex).trim()
          const value = trimmedCookiePart.slice(separatorIndex + 1).trim()
          if (name) {
            mergedCookies.set(name, value)
          }
        }
      }
      for (const [name, value] of Object.entries(cookies)) {
        mergedCookies.set(name, value)
      }
      if (mergedCookies.size === 0) {
        request.headers.delete('cookie')
        return
      }
      const serializedCookieHeader = [...mergedCookies.entries()]
        .map(([name, value]) => Effects.serializeCookiePair({ name, value }))
        .join('; ')
      request.headers.set('cookie', serializedCookieHeader)
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

      addCookiesToRequestFromCookieGetter(request)

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
    const fakeClient = new FakeClient({
      engine: engine as Engine<any, any, true>,
      client: client as EngineClient<true, TError>,
      id,
      scope,
      runtime: 'browser',
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
    const globalsWithClientEnv = {
      ...globals,
      __POINT0_ENV_VARS__: {
        ...client.envVars,
      },
      __POINT0_ENV_CONSTS__: {
        ...client.envConsts,
      },
    }
    for (const [key, value] of Object.entries(globalsWithClientEnv)) {
      GlobalThisItemProxy.create(fakeClient, key, value)
    }
    return fakeClient as unknown as FakeClient<TState, TError>
  }

  async getCookies(
    url: string | undefined = undefined,
    httpOnly: boolean | undefined = undefined,
  ): Promise<Record<string, string>> {
    const cookiesFromJarArray = await this.jar.getCookies(url ?? `http://localhost:${this.engine.server.port}/`)
    const cookiesFromGetter = this.cookieGetter?.() ?? {}
    const cookiesGetterExists = !!this.cookieGetter
    // we get http only cookies from jar
    // not http only, we get form getter if it is provided
    if (httpOnly === false) {
      if (cookiesGetterExists) {
        return cookiesFromGetter
      } else {
        return cookiesFromJarArray.reduce(
          (acc, cookie) => {
            if (!cookie.httpOnly) {
              acc[cookie.key] = cookie.value
            }
            return acc
          },
          {} as Record<string, string>,
        )
      }
    }
    if (httpOnly === true) {
      return cookiesFromJarArray.reduce(
        (acc, cookie) => {
          if (cookie.httpOnly) {
            acc[cookie.key] = cookie.value
          }
          return acc
        },
        {} as Record<string, string>,
      )
    }
    if (cookiesGetterExists) {
      return {
        ...cookiesFromGetter,
        ...cookiesFromJarArray.reduce(
          (acc, cookie) => {
            if (cookie.httpOnly) {
              acc[cookie.key] = cookie.value
            }
            return acc
          },
          {} as Record<string, string>,
        ),
      }
    } else {
      return cookiesFromJarArray.reduce(
        (acc, cookie) => {
          acc[cookie.key] = cookie.value
          return acc
        },
        {} as Record<string, string>,
      )
    }
  }

  async pruneCookies() {
    await this.jar.removeAllCookies()
    if (this.cookieSetter && this.cookieGetter) {
      await this.run(async () => {
        const cookies = await this.getCookies()
        for (const name of Object.keys(cookies)) {
          await this.cookieSetter?.({ name, value: '', expires: new Date(0) })
        }
      })
    }
  }

  async setCookie(cookie: CookieOptionsInput) {
    if (this.cookieSetter) {
      await this.run(async () => {
        await this.cookieSetter?.(cookie)
      })
    }
  }

  async removeCookie(name: string) {
    if (this.cookieSetter) {
      await this.run(async () => {
        await this.cookieSetter?.({ name, value: '', expires: new Date(0) })
      })
    }
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
