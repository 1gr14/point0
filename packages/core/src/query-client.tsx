import {
  QueryClient,
  dehydrate,
  hydrate,
  QueryClientProvider as QueryClientProviderOriginal,
} from '@tanstack/react-query'
import type { NiceUnsettableRedefinableSuperStoreItem } from './super-store.js'
import { ss } from './super-store.js'
import type { DehydratedState } from '@tanstack/react-query'

export const queryClient = ss.define<QueryClient, DehydratedState>('__POINT0_QUERY_CLIENT__', () => new QueryClient(), {
  dehydrate: (queryClient) =>
    dehydrate(queryClient, {
      shouldDehydrateQuery: () => {
        // This will include all queries, including failed ones
        return true
      },
    }),
  hydrate: (dehydratedState, createQueryClient) => {
    const queryClient = createQueryClient()
    hydrate(queryClient, dehydratedState)

    const prefetchPageQuery = queryClient
      .getQueryCache()
      .getAll()
      .find(
        (q: any) => q.state?.data && typeof q.state.data === 'object' && 'queryClientDehydratedState' in q.state.data,
      )

    if (!prefetchPageQuery) {
      return queryClient
    }

    const relatedQueriesDehydratedState = (prefetchPageQuery.state.data as { dehydratedState: DehydratedState })
      .dehydratedState
    hydrate(queryClient, relatedQueriesDehydratedState)

    return queryClient
  },
}) as unknown as NiceUnsettableRedefinableSuperStoreItem<QueryClient, DehydratedState>

export const QueryClientProvider = ({ children }: { children: React.ReactNode }) => {
  return <QueryClientProviderOriginal client={queryClient.get()}>{children}</QueryClientProviderOriginal>
}
