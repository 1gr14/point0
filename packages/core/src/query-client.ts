import { dehydrate, hydrate, QueryClient, replaceEqualDeep } from '@tanstack/react-query'
import type { DehydratedState, QueryClientConfig, QueryState } from '@tanstack/react-query'
import type { ClassLikeError0, ErrorPoint0 } from './error.js'
import { log } from './logger.js'
import type { DataTransformerExtended } from './types.js'
import { _point0_env } from './env.js'
// import { getClientPoints } from './helpers.js'
import { getClientPoints } from './helpers.js'
import { RedirectTask } from './redirect.js'
import { rscComponentsRegistry, rscDataHasElements, rscHolesRegistry } from './rsc.js'
import { superstore } from './super-store.js'
import type { QueryKey } from './types.js'
import { parseQueryKey } from './utils.js'

const LIVE_DEHYDRATED_STATE = Symbol('point0.liveDehydratedState')

/**
 * Return a live view of a page's dehydrated-state snapshot: reading `.queries` re-dehydrates the _current_ store
 * (limited to the queries the snapshot carried) instead of the frozen values.
 *
 * So when a page is prefetched again from its still-fresh `queryClientDehydratedState` cache, re-hydrating no longer
 * resurrects a query the user removed in the meantime (e.g. `getMe` after sign-out) — it is simply gone and re-fetched
 * on demand, while surviving queries keep their current data.
 *
 * Idempotent, and meant to replace the snapshot only _after_ its first hydrate, so the store stays the single source of
 * truth.
 */
export const toLiveDehydratedState = (snapshot: DehydratedState, queryClient: QueryClient): DehydratedState => {
  if (Reflect.get(snapshot, LIVE_DEHYDRATED_STATE)) {
    return snapshot
  }
  const snapshotQueryHashes = new Set(snapshot.queries.map((query) => query.queryHash))
  return new Proxy(snapshot, {
    get(target, prop, receiver) {
      if (prop === LIVE_DEHYDRATED_STATE) {
        return true
      }
      if (prop === 'queries') {
        return dehydrate(queryClient, {
          shouldDehydrateQuery: (query) => snapshotQueryHashes.has(query.queryHash),
        }).queries
      }
      return Reflect.get(target, prop, receiver)
    },
  })
}

/**
 * TanStack's structural sharing, RSC-safe: element-containing data is handed back fresh (the deep merge would corrupt
 * React elements), element-free data keeps the standard `replaceEqualDeep` sharing. The default `structuralSharing` of
 * Point0's QueryClient — `createQueryClient` keeps it when you pass your own config, unless you override the option
 * yourself.
 */
export const rscStructuralSharing = (oldData: unknown, newData: unknown): unknown =>
  rscDataHasElements(newData) || rscDataHasElements(oldData) ? newData : replaceEqualDeep(oldData, newData)

/** Point0's QueryClient defaults merged UNDER a user config — user keys win, ours fill the gaps. */
const toQueryClientConfigWithDefaults = (config: QueryClientConfig = {}): QueryClientConfig => ({
  ...config,
  defaultOptions: {
    ...config.defaultOptions,
    queries: {
      structuralSharing: rscStructuralSharing,
      ...config.defaultOptions?.queries,
    },
  },
})

export const __POINT0_QUERY_CLIENT__ = superstore.define<QueryClient, DehydratedState, 'readonlyRedefine'>(
  '__POINT0_QUERY_CLIENT__',
  () => new QueryClient(toQueryClientConfigWithDefaults()),
  {
    dehydrate: (queryClient) => {
      const dehydratedStateOriginal = dehydrate(queryClient, {
        shouldDehydrateQuery: (query) => {
          // Everything except pending: a pending query carries no data for the client (it starts
          // its own fetch after hydration anyway), and dehydrating one makes TanStack capture
          // `query.promise` — if that promise later rejects (a failed streamed loader), the
          // promise-chase machinery refetches the errored query in a tight endless loop on the
          // server and the streamed response never closes.
          return query.state.status !== 'pending'
        },
      })
      const clientPoints = getClientPoints()
      const ErrorClass = clientPoints.manager.root._Error
      const dehydratedState = serializeErrorsInDehydratedState(dehydratedStateOriginal, ErrorClass)
      const queriesWithQueryClientDehydratedStateOnly = dehydratedState.queries.filter(
        (q) => isQueryClientDehydratedStateQuery(q) || toQueryClientDehydratedStateRedirectQuery(q),
      )
      if (queriesWithQueryClientDehydratedStateOnly.length > 0) {
        dehydratedState.queries = queriesWithQueryClientDehydratedStateOnly
      }
      return dehydratedState
    },
    hydrate: (originalDehydratedState, createQueryClient) => {
      const freshDehydratedState = forceFreshDehydratedState(originalDehydratedState)
      const clientPoints = getClientPoints()
      const ErrorClass = clientPoints.manager.root._Error
      const dehydratedState = deserializeErrorsInDehydratedState(freshDehydratedState, ErrorClass)
      const queryClient = createQueryClient()
      hydrate(queryClient, dehydratedState)
      const allQueries = queryClient.getQueryCache().getAll()

      const prefetchPageQuery = allQueries.find(isQueryClientDehydratedStateQuery)

      if (!prefetchPageQuery) {
        return queryClient
      }

      const relatedQueriesDehydratedState = (prefetchPageQuery.state.data as { dehydratedState: DehydratedState })
        .dehydratedState
      hydrate(queryClient, relatedQueriesDehydratedState)
      // The store now owns these queries; swap the cached snapshot for a live view so a later
      // prefetch re-hydrate reads the current store instead of resurrecting removed queries.
      ;(prefetchPageQuery.state.data as { dehydratedState: DehydratedState }).dehydratedState = toLiveDehydratedState(
        relatedQueriesDehydratedState,
        queryClient,
      )

      return queryClient
    },
  },
  'readonlyRedefine',
)

// export const createQueryClient = (init?: () => QueryClient) => {
//   if (init) {
//     __POINT0_QUERY_CLIENT__.redefine(init)
//   }
//   function QueryClientProvider({ children }: { children: React.ReactNode }) {
//     return React.createElement(QueryClientProviderOriginal, { client: __POINT0_QUERY_CLIENT__.get() }, children)
//   }
//   return {
//     queryClient: __POINT0_QUERY_CLIENT__,
//     QueryClientProvider,
//   }
// }
/**
 * Configure the app's QueryClient. Pass a function returning a TanStack `QueryClientConfig` — Point0 builds the client
 * itself, merging your config over its own defaults (top-level and `defaultOptions.queries` keys you set win; defaults
 * you don't touch stay, e.g. the RSC-safe `structuralSharing`). Call it with no argument just to get the client proxy.
 *
 *     export const queryClient = createQueryClient(() => ({
 *       defaultOptions: { queries: { staleTime: 60_000 } },
 *     }))
 *
 * The callback returns CONFIG, not a `QueryClient` — constructing the client is Point0's job, so framework defaults
 * survive app customization instead of being silently overwritten.
 *
 * Full reference: https://1gr14.dev/point0/latest/query-client
 */
export const createQueryClient = (getConfig?: () => QueryClientConfig) => {
  if (getConfig) {
    __POINT0_QUERY_CLIENT__.redefine(() => {
      const config = getConfig()
      if (config instanceof QueryClient) {
        throw new Error(
          'createQueryClient takes a function returning a QueryClientConfig (options object), not a QueryClient instance — Point0 constructs the client itself so its defaults merge with yours. Replace `createQueryClient(() => new QueryClient({ … }))` with `createQueryClient(() => ({ … }))`.',
        )
      }
      return new QueryClient(toQueryClientConfigWithDefaults(config))
    })
  }
  return __POINT0_QUERY_CLIENT__.proxy
}

type PushedQueryPayload = {
  queryKey: readonly unknown[]
  queryHash: string
  state: QueryState
}

/**
 * Install the client side of streamed query push-hydration (streamed suspense queries). The server streams an inline
 * `<script>window.__POINT0_PUSH_QUERY__(…)</script>` right before each resolved Suspense boundary's content; a tiny
 * bootstrap in the HTML prefix buffers calls that execute before the bundle loads. `mount()` calls this after
 * `superstore.prepare` — it replaces the buffering stub with the real receiver and drains whatever arrived early, so
 * both script orders (before and after mount) hydrate the cache before React hydrates the pushed content. Data is
 * force-freshened (same idea as `forceFreshDehydratedState`) so the client does not refetch what just streamed in.
 */
export const installPushedQueriesReceiver = (transformer: DataTransformerExtended): void => {
  if (typeof window === 'undefined') {
    return
  }
  const w = window as unknown as {
    __POINT0_PUSH_QUERY__?: (serialized: string) => void
    __POINT0_PUSH_QUERY_BUFFER__?: string[]
  }
  const receive = (serialized: string): void => {
    const logFailure = (error: unknown): void => {
      log({
        level: 'error',
        category: ['ssr'],
        message: 'Failed to hydrate a streamed query push',
        error,
      })
    }
    try {
      const payload = transformer.parse(serialized) as PushedQueryPayload
      const hydratePayload = (): void => {
        const queryClient = __POINT0_QUERY_CLIENT__.get()
        // Same error revival + freshness treatment the prefix store gets: a pushed ERROR state (a
        // failed streamed loader whose `.error()` was streamed in place) must hydrate as a real
        // error0 so the boundary content matches what the server rendered.
        const ErrorClass = getClientPoints().manager.root._Error
        const deserialized = deserializeErrorsInDehydratedState(
          {
            queries: [{ queryKey: payload.queryKey as never, queryHash: payload.queryHash, state: payload.state }],
            mutations: [],
          },
          ErrorClass,
        ).queries[0]
        const now = Date.now()
        hydrate(queryClient, {
          queries: [
            {
              ...deserialized,
              state: {
                ...deserialized.state,
                dataUpdatedAt: deserialized.state.dataUpdatedAt ? now : deserialized.state.dataUpdatedAt,
                errorUpdatedAt: deserialized.state.errorUpdatedAt ? now : deserialized.state.errorUpdatedAt,
              },
            },
          ],
          mutations: [],
        })
      }
      const hydratePayloadSafe = (): void => {
        try {
          hydratePayload()
        } catch (error) {
          logFailure(error)
        }
      }
      // RSC: parsing may have started component-point chunk imports — hydrate the cache only with the chunks warm,
      // so consumers of the pushed query never render a Suspense fallback for an island already in the data.
      // Resolves in a microtask when nothing is pending.
      void rscComponentsRegistry.drainPending().then(hydratePayloadSafe, hydratePayloadSafe)
    } catch (error) {
      logFailure(error)
    }
  }
  const buffered = w.__POINT0_PUSH_QUERY_BUFFER__ ?? []
  w.__POINT0_PUSH_QUERY__ = receive
  w.__POINT0_PUSH_QUERY_BUFFER__ = []
  for (const serialized of buffered) {
    receive(serialized)
  }
}

/**
 * Install the client side of streamed RSC-hole push-hydration (see `defer`). The server streams an inline
 * `<script>window.__POINT0_PUSH_RSC__(…)</script>` as each deferred subtree resolves; a bootstrap in the HTML prefix
 * buffers calls that execute before the bundle loads. `mount()` calls this after `superstore.prepare` — it replaces the
 * buffering stub with the real receiver and drains whatever arrived early, so a hole fills before or as React hydrates
 * its boundary (no refetch, no flicker). The subtree rides the RSC-wrapped transformer, so parsing decodes its elements
 * (and starts any island chunk imports) exactly like a query push; the fill lands only with those chunks warm.
 */
export const installPushedRscReceiver = (transformer: DataTransformerExtended): Promise<void> => {
  if (typeof window === 'undefined') {
    return Promise.resolve()
  }
  const w = window as unknown as {
    __POINT0_PUSH_RSC__?: (serialized: string) => void
    __POINT0_PUSH_RSC_BUFFER__?: string[]
  }
  const receive = (serialized: string): Promise<void> => {
    const logFailure = (error: unknown): void => {
      log({ level: 'error', category: ['ssr'], message: 'Failed to hydrate a streamed RSC hole push', error })
    }
    try {
      const payload = transformer.parse(serialized) as { id: string; data?: unknown; error?: unknown }
      const applyFill = (): void => {
        if (payload.error !== undefined) {
          const ErrorClass = getClientPoints().manager.root._Error
          rscHolesRegistry.fill(payload.id, { error: ErrorClass.from(payload.error) })
        } else {
          rscHolesRegistry.fill(payload.id, { node: payload.data })
        }
      }
      const applyFillSafe = (): void => {
        try {
          applyFill()
        } catch (error) {
          logFailure(error)
        }
      }
      // decode may have started island chunk imports in the pushed subtree — fill with those chunks
      // warm, so a subtree revealed on the client never re-suspends on an island already in its data.
      return rscComponentsRegistry.drainPending().then(applyFillSafe, applyFillSafe)
    } catch (error) {
      logFailure(error)
      return Promise.resolve()
    }
  }
  const buffered = w.__POINT0_PUSH_RSC_BUFFER__ ?? []
  w.__POINT0_PUSH_RSC__ = (serialized: string) => void receive(serialized)
  w.__POINT0_PUSH_RSC_BUFFER__ = []
  // The buffered pushes arrived BEFORE hydration; `mount()` awaits the returned promise before
  // hydrateRoot so these holes are FILLED when React hydrates their boundaries. A hole still
  // suspended at hydration would leave the server-streamed content INERT — React abandons a
  // server-revealed boundary whose client child suspends (and re-renders never re-enter it, unlike a
  // query whose observer notifies). Post-hydration pushes stream in fire-and-forget.
  return Promise.all(buffered.map((serialized) => receive(serialized))).then(() => undefined)
}

// Errors in the dehydrated state travel to the browser: public projection in production,
// private in dev (the developer is the audience there).
export const serializeStateError = (
  ErrorClass: ClassLikeError0<ErrorPoint0>,
  error: unknown,
): Record<string, unknown> => {
  const error0 = ErrorClass.from(error)
  return _point0_env.mode.is.production ? ErrorClass.serializePublic(error0) : ErrorClass.serializePrivate(error0)
}

export const serializeErrorsInDehydratedState = (
  dehydratedState: DehydratedState,
  ErrorClass: ClassLikeError0<ErrorPoint0>,
): DehydratedState => {
  return {
    ...dehydratedState,
    queries: dehydratedState.queries.map((q) => {
      if (isQueryClientDehydratedStateQuery(q)) {
        const dehydratedState = getDehydratedStateFromQueryClientDehydratedStateQuery(q)
        if (dehydratedState) {
          return {
            ...q,
            state: {
              ...q.state,
              data: { dehydratedState: serializeErrorsInDehydratedState(dehydratedState, ErrorClass) },
            },
          }
        }
      }
      return {
        ...q,
        state: {
          ...q.state,
          error: q.state.error ? (serializeStateError(ErrorClass, q.state.error) as never as null) : q.state.error,
          fetchFailureReason: q.state.fetchFailureReason
            ? (serializeStateError(ErrorClass, q.state.fetchFailureReason) as never as null)
            : q.state.error,
        },
      }
    }),
    mutations: dehydratedState.mutations.map((m) => ({
      ...m,
      state: {
        ...m.state,
        error: m.state.error ? (serializeStateError(ErrorClass, m.state.error) as never as null) : m.state.error,
        failureReason: m.state.failureReason
          ? (serializeStateError(ErrorClass, m.state.failureReason) as never as null)
          : m.state.failureReason,
      },
    })),
  }
}

export const deserializeErrorsInDehydratedState = (
  dehydratedState: DehydratedState,
  ErrorClass: ClassLikeError0<ErrorPoint0>,
): DehydratedState => {
  return {
    ...dehydratedState,
    queries: dehydratedState.queries.map((q) => {
      if (isQueryClientDehydratedStateQuery(q)) {
        const dehydratedState = getDehydratedStateFromQueryClientDehydratedStateQuery(q)
        if (dehydratedState) {
          return {
            ...q,
            state: {
              ...q.state,
              data: { dehydratedState: deserializeErrorsInDehydratedState(dehydratedState, ErrorClass) },
            },
          }
        }
      }
      return {
        ...q,
        state: { ...q.state, error: q.state.error ? ErrorClass.from(q.state.error) : q.state.error },
      }
    }),
    mutations: dehydratedState.mutations.map((m) => ({
      ...m,
      state: { ...m.state, error: m.state.error ? ErrorClass.from(m.state.error) : m.state.error },
    })),
  }
}

export const forceFreshDehydratedState = (
  dehydratedState: DehydratedState,
  now: number = Date.now(),
): DehydratedState => {
  const result = {
    ...dehydratedState,
    queries: dehydratedState.queries.map((q) => {
      if (isQueryClientDehydratedStateQuery(q)) {
        const dehydratedState = getDehydratedStateFromQueryClientDehydratedStateQuery(q)
        if (dehydratedState) {
          return {
            ...q,
            state: {
              ...q.state,
              data: {
                dehydratedState: forceFreshDehydratedState((q.state.data as any).dehydratedState),
              },
            },
          }
        }
      }
      return {
        ...q,
        state: {
          ...q.state,
          dataUpdatedAt: !q.state.dataUpdatedAt ? q.state.dataUpdatedAt : now,
          errorUpdatedAt: !q.state.errorUpdatedAt ? q.state.errorUpdatedAt : now,
        },
      }
    }),
    mutations: dehydratedState.mutations.map((m) => ({
      ...m,
      state: {
        ...m.state,
        submittedAt: !m.state.submittedAt ? m.state.submittedAt : now,
      },
    })),
  }
  return result
}

export const removeRedirectsFromQueryClientCache = (queryClient: QueryClient, to?: string) => {
  const cache = queryClient.getQueryCache()
  cache.findAll().forEach((query) => {
    if (isQueryClientDehydratedStateQuery(query)) {
      const dehydratedState = getDehydratedStateFromQueryClientDehydratedStateQuery(query)
      if (dehydratedState) {
        const newQueries = dehydratedState.queries.filter((q) => {
          const maybeRedirect = (q.state.error as Record<string, unknown> | null)?.redirect
          const redirect = RedirectTask.is(maybeRedirect) ? maybeRedirect : undefined
          if (redirect) {
            if (to === undefined || redirect.to === to) {
              return false
            }
          }
          return true
        })
        if (newQueries.length > 0) {
          dehydratedState.queries = newQueries
        } else {
          cache.remove(query)
        }
      }
    }
    if (toQueryClientDehydratedStateRedirectQuery(query)) {
      const maybeRedirect = (query.state.error as Record<string, unknown> | null)?.redirect
      const redirect = RedirectTask.is(maybeRedirect) ? maybeRedirect : undefined
      if (redirect) {
        if (to === undefined || redirect.to === to) {
          cache.remove(query)
        }
      }
    }
    const maybeRedirect = (query.state.error as Record<string, unknown> | null)?.redirect
    const redirect = RedirectTask.is(maybeRedirect) ? maybeRedirect : undefined
    if (redirect) {
      if (to === undefined || redirect.to === to) {
        cache.remove(query)
      }
    }
  })
}

export const findRedirectTaskInQueryClientCache = (
  queryClient: QueryClient,
  from: string,
): RedirectTask | undefined => {
  const cache = queryClient.getQueryCache()
  // const clientPoints = ClientPoints.getInstance()
  const clientPoints = getClientPoints()
  const location = clientPoints.routes._.getLocation(from)
  if (!location.route) {
    return undefined
  }
  const page = clientPoints.getPage({ location })
  if (!page) {
    return undefined
  }
  const { pageLocation } = page
  const input = { ...pageLocation.params, ...(pageLocation.searchString ? { '?': pageLocation.search } : {}) }
  const inputTransformed = clientPoints.transformer.stringify(input)

  for (const query of cache.findAll()) {
    const redirectQuery = toQueryClientDehydratedStateRedirectQuery(query)
    if (redirectQuery) {
      const { paresedKey } = redirectQuery
      if (paresedKey.name !== page.name) {
        continue
      }
      if (paresedKey.input !== inputTransformed) {
        continue
      }
      const maybeRedirect = (query.state.error as Record<string, unknown> | null)?.redirect
      const redirect = RedirectTask.is(maybeRedirect) ? maybeRedirect : undefined
      if (redirect) {
        return redirect
      }
    }
  }
  return undefined
}

export const isQueryClientDehydratedStateQuery = (query: { queryKey: readonly unknown[] }) => {
  const obj = parseQueryKey(query.queryKey)
  return obj?.output === 'queryClientDehydratedState'
}

export const getDehydratedStateFromQueryClientDehydratedStateQuery = (query: { state: QueryState }) => {
  const dehydratedState = (query.state.data as { dehydratedState: DehydratedState | undefined } | undefined)
    ?.dehydratedState
  if (dehydratedState) {
    return dehydratedState
  }
  return undefined
}

export const toQueryClientDehydratedStateRedirectQuery = <T extends { queryKey: readonly unknown[] }>(
  query: T,
): { query: T; paresedKey: QueryKey[1] } | undefined => {
  const paresedKey = parseQueryKey(query.queryKey)
  if (paresedKey?.output === 'queryClientDehydratedStateRedirect') {
    return { query, paresedKey }
  }
  return undefined
}
