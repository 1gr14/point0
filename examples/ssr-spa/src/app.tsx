import { HydrationBoundary, QueryClientProvider } from '@tanstack/react-query'
import { Unhead } from 'point0/adapters/unhead'
import type { AppProps } from 'point0/client/mount'
import { queryClient } from './lib/react-query'
import { points } from './lib/points'
import { Router } from 'point0/adapters/wouter'

// you can add any other app wrappers here
export default function App({ dehydratedState, location }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={dehydratedState}>
        <Unhead>
          <Router location={location} points={points} />
        </Unhead>
      </HydrationBoundary>
    </QueryClientProvider>
  )
}
