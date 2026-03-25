import {
  dehydrate,
  hydrate,
  QueryClient,
  QueryClientProvider as QueryClientProviderOriginal,
} from '@tanstack/react-query'
import type { DehydratedState } from '@tanstack/react-query'
import { superstore } from './super-store.js'
import React from 'react'

export const __POINT0_QUERY_CLIENT__ = superstore.define<QueryClient, DehydratedState, 'readonlyRedefine'>(
  '__POINT0_QUERY_CLIENT__',
  () => new QueryClient(),
  {
    dehydrate: (queryClient) => {
      const dehydratedState = dehydrate(queryClient, {
        shouldDehydrateQuery: () => {
          // This will include all queries, including failed ones
          return true
        },
      })
      const queriesWithQueryClientDehydratedStateOnly = dehydratedState.queries.filter(
        (query) => query.queryKey.at(-1) === 'queryClientDehydratedState',
      )
      if (queriesWithQueryClientDehydratedStateOnly.length > 0) {
        dehydratedState.queries = queriesWithQueryClientDehydratedStateOnly
      }
      return dehydratedState
    },
    hydrate: (dehydratedState, createQueryClient) => {
      const freshDehydratedState = forceFreshDehydratedState(dehydratedState)
      const queryClient = createQueryClient()
      hydrate(queryClient, freshDehydratedState)
      const allQueries = queryClient.getQueryCache().getAll()

      const prefetchPageQuery = allQueries.find(
        (q) => typeof q.state.data === 'object' && q.state.data && 'dehydratedState' in q.state.data,
      )

      if (!prefetchPageQuery) {
        return queryClient
      }

      const relatedQueriesDehydratedState = (prefetchPageQuery.state.data as { dehydratedState: DehydratedState })
        .dehydratedState
      const freshRelatedQueriesDehydratedState = forceFreshDehydratedState(relatedQueriesDehydratedState)
      hydrate(queryClient, freshRelatedQueriesDehydratedState)

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

export const forceFreshDehydratedState = (
  dehydratedState: DehydratedState,
  now: number = Date.now(),
): DehydratedState => {
  const result = {
    ...dehydratedState,
    queries: dehydratedState.queries.map((q) => ({
      ...q,
      state: {
        ...q.state,
        dataUpdatedAt: !q.state.dataUpdatedAt ? q.state.dataUpdatedAt : now,
        errorUpdatedAt: !q.state.errorUpdatedAt ? q.state.errorUpdatedAt : now,
      },
    })),
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
