import {
  _getSsItemsWithRestErrors,
  _ssRunWithServerStorageState,
  generateId,
  POINT0_ENV_CONSTS_GLOBAL,
  POINT0_ENV_VARS_GLOBAL,
  POINT0_WEBSOCKET_UPGRADE_HEADER,
  superstore,
} from '@point0/core'
// The socket surface lives behind its own subpath — the main entry does not re-export it, so an app without the
// feature strips the module out of its client bundle entirely.
import { registerClientHandlerPoint, registerSpacePoint } from '@point0/core/socket'
import type {
  ClientPoints,
  ClientRuntime,
  PointsScope,
  RichFetchFn,
  SuperStoreInternalValuesOrErrors,
} from '@point0/core'
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

/**
 * Yield the event loop a few times so work another library queued — React's scheduler, above all — has run before the
 * caller tears anything down. Three turns because a React unmount can chain: the cleanup task queues the next one.
 */
const drainScheduledWork = async (): Promise<void> => {
  for (let turn = 0; turn < 3; turn++) {
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
  }
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

/**
 * The fake client's `WebSocket` — the browser socket without a network: the constructor replays the REAL upgrade
 * handshake through the engine's fetch pipeline (middlewares, cookies from the fake client's jar, the marker response),
 * then swaps the `bunServer.upgrade` step for an in-memory socket pair straight into EngineSocket. The surface is
 * exactly what the core client runtime uses: `readyState`, `send`, `close`, `onopen` / `onmessage` / `onclose` /
 * `onerror`. Injected as the `WebSocket` global of every fake client — `channel.connect()` and everything above it work
 * with no listening server.
 */
/**
 * Run the server end of an in-memory socket the way PRODUCTION runs a frame — in a BARE server context. Two facts at
 * once: the fake client's ALS must not leak into server handlers (`sendToClient` would see itself client-side), and no
 * request state exists either — the real Bun `message:` handler wraps nothing, so `getFetch()` / `getQueryClient()`
 * throw there and must throw here too (socket callbacks reach the world through `points` and the adapter seam, never
 * ambient stores). Every known store key becomes a loud error, `__POINT0_FAKE_CLIENT__` included — which is exactly
 * what un-fakes the context.
 */
const runAsBareSocketServer = <TResult>(callback: () => TResult): TResult =>
  _ssRunWithServerStorageState(
    _getSsItemsWithRestErrors(
      {},
      'Value "%s" does not exist in the socket server context — frames run bare, like the production message handler: reach the world through `points` and the admin surface, not ambient stores',
    ),
    callback,
  )

const createFakeClientWebSocketClass = ({
  engine,
  fakeClient,
}: {
  engine: Engine<any, any, true>
  fakeClient: FakeClient<any, any>
}): typeof WebSocket => {
  class FakeClientWebSocket {
    static readonly CONNECTING = 0
    static readonly OPEN = 1
    static readonly CLOSING = 2
    static readonly CLOSED = 3

    url: string
    readyState = 0
    onopen: ((event: unknown) => void) | null = null
    onmessage: ((event: { data: string }) => void) | null = null
    onclose: ((event: { code: number; reason: string }) => void) | null = null
    onerror: ((event: unknown) => void) | null = null

    private serverEnd: { open: () => void; sendText: (text: string) => void; close: () => void } | undefined
    /**
     * The storage state of the run that opened this socket — a `run()` is one loaded page, and frames arrive from
     * SERVER context (the engine processed a message or published to a topic), so every client dispatch re-enters
     * exactly THIS page's state: the socket managers, listeners and facades all live there.
     */
    private runStorageState = superstore.serverStorage?.getStore()

    constructor(url: string | URL) {
      this.url = String(url)
      // the handshake is async, like a real socket — handlers are assigned right after the constructor returns
      void this.dial()
    }

    private runAsPage(fn: () => void): void {
      if (this.runStorageState) {
        superstore.runWithServerStorageState(this.runStorageState, fn)
        return
      }
      fn()
    }

    private async dial(): Promise<void> {
      try {
        const httpUrl = this.url.replace(/^ws/, 'http')
        const response = await fakeClient.fetch(httpUrl, {
          headers: { upgrade: 'websocket', connection: 'Upgrade' },
        })
        const marker = response.headers.get(POINT0_WEBSOCKET_UPGRADE_HEADER)
        const socket = engine.server.socket as {
          openInMemorySocket: (
            marker: string,
            hooks: { onFrame: (json: string) => void },
          ) => { open: () => void; sendText: (text: string) => void; close: () => void } | undefined
        } | null
        const serverEnd =
          marker && socket && this.readyState === 0
            ? socket.openInMemorySocket(marker, {
                // frames can leave the server as soon as handleOpen's microtasks resolve (a cold-start upgrade
                // answers `claimed` right after its enrollers) — a microtask keeps the browser ordering: open
                // first, then messages
                onFrame: (json) => {
                  queueMicrotask(() => {
                    if (this.readyState === 1) {
                      this.runAsPage(() => this.onmessage?.({ data: json }))
                    }
                  })
                },
              })
            : undefined
        if (!serverEnd) {
          // no marker (socket off, bad path) or a stale token — the browser handshake would fail the same way
          this.settleClosed(1006, 'handshake failed')
          return
        }
        this.serverEnd = serverEnd
        this.readyState = 1
        this.onopen?.({})
        // the server end processes in BARE server context — exactly what a production socket message runs in
        runAsBareSocketServer(() => {
          serverEnd.open()
        })
      } catch (error) {
        this.onerror?.(error)
        this.settleClosed(1006, 'handshake failed')
      }
    }

    send(text: string): void {
      if (this.readyState !== 1) {
        return
      }
      const serverEnd = this.serverEnd
      if (!serverEnd) {
        return
      }
      runAsBareSocketServer(() => {
        serverEnd.sendText(text)
      })
    }

    close(code = 1000, reason = ''): void {
      if (this.readyState === 2 || this.readyState === 3) {
        return
      }
      this.readyState = 2
      const serverEnd = this.serverEnd
      this.serverEnd = undefined
      if (serverEnd) {
        runAsBareSocketServer(() => {
          serverEnd.close()
        })
      }
      this.settleClosed(code, reason)
    }

    private settleClosed(code: number, reason: string): void {
      if (this.readyState === 3) {
        return
      }
      this.readyState = 3
      this.onclose?.({ code, reason })
    }
  }
  return FakeClientWebSocket as never
}

export type FakeClientCallback<TState extends FakeClientState = FakeClientState> = (
  state: TState,
) => void | Promise<void>
export type FakeClientState = {
  [key: string]: unknown
}

/** One loaded page of a fake client — pass it to `run(fn, { state })` to continue the same page (see createRunState). */
export type FakeClientRunState = {
  /** the storage state every run with this handle re-enters — the page's whole superstore world */
  _storageState: SuperStoreInternalValuesOrErrors
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
      // the in-memory socket transport — the browser WebSocket without a network (see the class above); an explicit
      // WebSocket in `globals` wins, like any other injected global
      WebSocket:
        (globals as Record<string, unknown>).WebSocket ??
        createFakeClientWebSocketClass({ engine: engine as Engine<any, any, true>, fakeClient }),
      [POINT0_ENV_VARS_GLOBAL]: {
        ...client.envVars,
      },
      [POINT0_ENV_CONSTS_GLOBAL]: {
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
          await drainScheduledWork()
        })
      }
    } finally {
      // Teardown does not finish in the turn that starts it: React's scheduler lands an unmount's passive cleanup on
      // a later macrotask. Those tasks still resolve `window` through GlobalThisItemProxy, and the line below drops
      // this client's values — after which the getter answers `originalValue`, `undefined` for `window` under Bun.
      // The late task then throws reading `window.event`, outside any test's stack, and bun reports an unhandled
      // error that reddens the whole file even though every assertion passed.
      //
      // Drained twice on purpose, because teardown unmounts in two places: `onDestroyInside` above (the caller's own
      // cleanup) and `onRunEndInside`, which `run()` fires after it. Only this one, after `run()` has fully
      // returned, covers the second — and it is also the only drain a client with no `onDestroyInside` gets.
      await drainScheduledWork()
      GlobalThisItemProxy.destroy(this)
    }
  }

  /**
   * Build the storage state one `run()` enters — one loaded PAGE of this client's "browser". `run()` builds a fresh one
   * by default (every run is a new page load, like a browser reload: sockets, managers, caches start over). Create one
   * explicitly and pass it as `run(fn, { state })` to CONTINUE the same page across several runs — an open socket
   * connection made in one run stays live for the next.
   */
  createRunState(): FakeClientRunState {
    return {
      _storageState: _getSsItemsWithRestErrors(
        {
          __POINT0_FAKE_CLIENT__: this,
          __POINT0_CLIENT_POINTS__: this.points,
        },
        'Not yet exists in test client run',
      ),
    }
  }

  /**
   * The page's "module load": in a real browser, closing a space / clientHandler registers the point for enrollment
   * resolution and push dispatch (a client-side module-eval effect). Under FakeClient the point modules evaluated
   * SERVER-side, where that registration is a deliberate no-op — so every run replays it into the page's own state
   * (idempotent map writes; only materialized points — a FakeClient engine holds its points as objects).
   */
  private registerPagePoints(): void {
    for (const record of this.points.manager.collection) {
      if (record.type !== 'space' && record.type !== 'clientHandler') {
        continue
      }
      const point = record.point
      // only materialized points (a lazy record's import ran server-side anyway) — a FakeClient engine holds objects
      if (typeof point !== 'object' || !('type' in point)) {
        continue
      }
      if (record.type === 'space') {
        registerSpacePoint(point)
      } else {
        registerClientHandlerPoint(point)
      }
    }
  }

  async run<TResult>(
    fn: (state: TState) => TResult,
    options?: {
      onStartInside?: FakeClientCallback<TState> | undefined
      onEndInside?: FakeClientCallback<TState> | undefined
      onStartOutside?: FakeClientCallback<TState> | undefined
      onEndOutside?: FakeClientCallback<TState> | undefined
      /** re-enter this page's state instead of loading a fresh page (see {@link FakeClient.createRunState}) */
      state?: FakeClientRunState | undefined
    },
  ): Promise<TResult> {
    await this.onRunStartOutside?.(this.state)
    await options?.onStartOutside?.(this.state)
    try {
      const result = (await _ssRunWithServerStorageState(
        (options?.state ?? this.createRunState())._storageState,
        async () => {
          try {
            this.registerPagePoints()
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
