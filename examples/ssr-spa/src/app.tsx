import { HydrationBoundary, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Unhead } from 'point0/adapters/unhead'
import { Router, Routes } from 'point0/adapters/wouter'
import type { HydratedAppProps } from 'point0/client/hydrate'
import { useState } from 'react'
import { clientCtx1, clientCtx2 } from './lib/client-ctx'

export default function App({ dehydratedState, ssrLocation, pagesTree }: HydratedAppProps) {
  const [queryClient] = useState(() => new QueryClient())
  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={dehydratedState}>
        <Unhead>
          <Router pagesTree={pagesTree} ssrLocation={ssrLocation} policy="prefetch">
            <clientCtx1.ClientCtxProvider>
              <clientCtx2.ClientCtxProvider>
                <Routes pagesTree={pagesTree} />
              </clientCtx2.ClientCtxProvider>
            </clientCtx1.ClientCtxProvider>
          </Router>
        </Unhead>
      </HydrationBoundary>
    </QueryClientProvider>
  )
}
