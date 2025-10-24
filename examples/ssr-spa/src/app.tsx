import { HydrationBoundary, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Unhead } from 'point0/adapters/unhead'
import { Router } from 'point0/adapters/wouter'
import type { AppProps } from 'point0/client/mount'
import { useState } from 'react'

// you can add any other app wrappers here
export default function App({ dehydratedState, ssrLocation, pages }: AppProps) {
  const [queryClient] = useState(() => new QueryClient())
  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={dehydratedState}>
        <Unhead>
          <Router ssrLocation={ssrLocation} pages={pages} />
        </Unhead>
      </HydrationBoundary>
    </QueryClientProvider>
  )
}
