import {
  dehydrate,
  hydrate,
  QueryClient,
  QueryClientProvider as QueryClientProviderOriginal,
} from '@tanstack/react-query'
import type { DehydratedState, QueryKey, QueryState } from '@tanstack/react-query'
import React from 'react'
import type { ClassLikeError0, ErrorPoint0 } from './error.js'
// import { getClientPoints } from './helpers.js'
import { RedirectTask } from './redirect.js'
import { superstore } from './super-store.js'
import { getClientPoints } from './helpers.js'

export const __POINT0_QUERY_CLIENT__ = superstore.define<QueryClient, DehydratedState, 'readonlyRedefine'>(
  '__POINT0_QUERY_CLIENT__',
  () => new QueryClient(),
  {
    dehydrate: (queryClient) => {
      const dehydratedStateOriginal = dehydrate(queryClient, {
        shouldDehydrateQuery: () => {
          // This will include all queries, including failed ones
          return true
        },
      })
      // const clientPoints = ClientPoints.getInstance()
      const clientPoints = getClientPoints()
      const ErrorClass = clientPoints.manager.root._Error
      const dehydratedState = serializeErrorsInDehydratedState(dehydratedStateOriginal, ErrorClass)
      const queriesWithQueryClientDehydratedStateOnly = dehydratedState.queries.filter(
        (q) => isQueryClientDehydratedStateQuery(q) || isQueryClientDehydratedStateRedirectQuery(q),
      )
      if (queriesWithQueryClientDehydratedStateOnly.length > 0) {
        dehydratedState.queries = queriesWithQueryClientDehydratedStateOnly
      }
      return dehydratedState
    },
    hydrate: (originalDehydratedState, createQueryClient) => {
      const freshDehydratedState = forceFreshDehydratedState(originalDehydratedState)
      // const clientPoints = ClientPoints.getInstance()
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

      return queryClient
    },
  },
  'readonlyRedefine',
)

export const createQueryClient = (init?: () => QueryClient) => {
  if (init) {
    __POINT0_QUERY_CLIENT__.redefine(init)
  }
  function QueryClientProvider({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProviderOriginal, { client: __POINT0_QUERY_CLIENT__.get() }, children)
  }
  return {
    queryClient: __POINT0_QUERY_CLIENT__,
    QueryClientProvider,
  }
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
          error: q.state.error ? (ErrorClass.serialize(q.state.error) as never as null) : q.state.error,
        },
      }
    }),
    mutations: dehydratedState.mutations.map((m) => ({
      ...m,
      state: {
        ...m.state,
        error: m.state.error ? (ErrorClass.serialize(m.state.error) as never as null) : m.state.error,
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
          const redirect = maybeRedirect instanceof RedirectTask ? maybeRedirect : undefined
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
    if (isQueryClientDehydratedStateRedirectQuery(query)) {
      const maybeRedirect = (query.state.error as Record<string, unknown> | null)?.redirect
      const redirect = maybeRedirect instanceof RedirectTask ? maybeRedirect : undefined
      if (redirect) {
        if (to === undefined || redirect.to === to) {
          cache.remove(query)
        }
      }
    }
    const maybeRedirect = (query.state.error as Record<string, unknown> | null)?.redirect
    const redirect = maybeRedirect instanceof RedirectTask ? maybeRedirect : undefined
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

  // [
  //   'point0',
  //   this.scope,
  //   this.type,
  //   this.name,
  //   'server',
  //   isInfiniteQuery ? 'infinite' : 'finite',
  //   this._getTransformer().stringify(
  //     this._rawInputToRoutedRawInputForQueryKey({ inputRaw: input as never }),
  //   ) as string,
  //   outputType,
  // ]

  // TODO: find location by to, and thenby location input find needed queryCleintState query or  redirectQuery
  // const query = cache.findAll().find(isQueryClientDehydratedStateQuery)
  // if (!query) {
  //   return undefined
  // }
  // const dehydratedState = (query.state.data as { dehydratedState: DehydratedState | undefined }).dehydratedState
  // if (!dehydratedState) {
  //   return undefined
  // }
  // for (const q of dehydratedState.queries) {
  //   const maybeRedirect = (q.state.error as Record<string, unknown> | null)?.redirect
  //   const redirect = maybeRedirect instanceof RedirectTask ? maybeRedirect : undefined
  //   if (redirect) {
  //     if (redirect.to === to) {
  //       return redirect
  //     }
  //   }
  // }
  // return undefined
  for (const query of cache.findAll()) {
    if (isQueryClientDehydratedStateQuery(query)) {
      if (query.queryKey[3] !== page.name) {
        continue
      }
      if (query.queryKey[6] !== inputTransformed) {
        continue
      }
      const dehydratedState = (query.state.data as { dehydratedState: DehydratedState | undefined } | undefined)
        ?.dehydratedState
      if (dehydratedState) {
        for (const q of dehydratedState.queries) {
          const maybeRedirect = (q.state.error as Record<string, unknown> | null)?.redirect
          const redirect = maybeRedirect instanceof RedirectTask ? maybeRedirect : undefined
          if (redirect) {
            return redirect
          }
        }
      }
    }
    if (isQueryClientDehydratedStateRedirectQuery(query)) {
      if (query.queryKey[3] !== page.name) {
        continue
      }
      if (query.queryKey[6] !== inputTransformed) {
        continue
      }
      const maybeRedirect = (query.state.error as Record<string, unknown> | null)?.redirect
      const redirect = maybeRedirect instanceof RedirectTask ? maybeRedirect : undefined
      if (redirect) {
        return redirect
      }
    }
  }
  return undefined
}

export const isQueryClientDehydratedStateQuery = (query: { queryKey: QueryKey }) => {
  return query.queryKey.at(-1) === 'queryClientDehydratedState'
}

export const getDehydratedStateFromQueryClientDehydratedStateQuery = (query: { state: QueryState }) => {
  const dehydratedState = (query.state.data as { dehydratedState: DehydratedState | undefined } | undefined)
    ?.dehydratedState
  if (dehydratedState) {
    return dehydratedState
  }
  return undefined
}

export const isQueryClientDehydratedStateRedirectQuery = (query: { queryKey: QueryKey }) => {
  return query.queryKey.at(-1) === 'queryClientDehydratedStateRedirect'
}
