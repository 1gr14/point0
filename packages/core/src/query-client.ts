import { dehydrate, hydrate, QueryClient } from '@tanstack/react-query'
import type { DehydratedState, QueryState } from '@tanstack/react-query'
import type { ClassLikeError0, ErrorPoint0 } from './error.js'
import { _point0_env } from './env.js'
// import { getClientPoints } from './helpers.js'
import { getClientPoints } from './helpers.js'
import { RedirectTask } from './redirect.js'
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

export const __POINT0_QUERY_CLIENT__ = superstore.define<QueryClient, DehydratedState, 'readonlyRedefine'>(
  '__POINT0_QUERY_CLIENT__',
  () => new QueryClient(),
  {
    dehydrate: (queryClient) => {
      const dehydratedStateOriginal = dehydrate(queryClient, {
        shouldDehydrateQuery: () => {
          return true
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
export const createQueryClient = (init?: () => QueryClient) => {
  if (init) {
    __POINT0_QUERY_CLIENT__.redefine(init)
  }
  return __POINT0_QUERY_CLIENT__.proxy
}

// Errors in the dehydrated state travel to the browser: public projection in production,
// private in dev (the developer is the audience there).
const serializeStateError = (ErrorClass: ClassLikeError0<ErrorPoint0>, error: unknown): Record<string, unknown> => {
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
