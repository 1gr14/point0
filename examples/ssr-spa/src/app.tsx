import { HydrationBoundary, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Unhead } from 'point0/adapters/unhead'
import { Router } from 'point0/adapters/wouter'
import type { HydratedAppProps } from 'point0/client/hydrate'
import { useState } from 'react'

export default function App({ dehydratedState, ssrLocation, pagesTree }: HydratedAppProps) {
  const [queryClient] = useState(() => new QueryClient())
  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={dehydratedState}>
        <Unhead>
          <Router pagesTree={pagesTree} ssrLocation={ssrLocation} policy="prefetch" />
        </Unhead>
      </HydrationBoundary>
    </QueryClientProvider>
  )
}
