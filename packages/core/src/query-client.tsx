import type { DehydratedState } from '@tanstack/react-query'
import {
  dehydrate,
  hydrate,
  QueryClient,
  QueryClientProvider as QueryClientProviderOriginal,
} from '@tanstack/react-query'
import type { NiceUnsettableRedefinableSuperStoreItem } from './super-store.js'
import { superstore } from './super-store.js'

export const queryClient = superstore.define<QueryClient, DehydratedState>(
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
      const queryClient = createQueryClient()
      hydrate(queryClient, dehydratedState)
      const allQueries = queryClient.getQueryCache().getAll()

      const prefetchPageQuery = allQueries.find(
        (q) => typeof q.state.data === 'object' && q.state.data && 'dehydratedState' in q.state.data,
      )

      if (!prefetchPageQuery) {
        return queryClient
      }

      const relatedQueriesDehydratedState = (prefetchPageQuery.state.data as { dehydratedState: DehydratedState })
        .dehydratedState
      hydrate(queryClient, relatedQueriesDehydratedState)

      return queryClient
    },
  },
) as unknown as NiceUnsettableRedefinableSuperStoreItem<QueryClient, DehydratedState>

export const QueryClientProvider = ({ children }: { children: React.ReactNode }) => {
  return <QueryClientProviderOriginal client={queryClient.get()}>{children}</QueryClientProviderOriginal>
}
