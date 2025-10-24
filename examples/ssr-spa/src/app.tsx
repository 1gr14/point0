import { HydrationBoundary, QueryClientProvider } from '@tanstack/react-query'
import { Unhead } from 'point0/adapters/unhead'
// import { Wouter } from 'point0/adapters/wouter'
// import { points } from './lib/points'
import { queryClient } from './lib/react-query'

// you can add any other app wrappers here
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={window.__POINT0_PAYLOAD__?.dehydratedState}>
        <Unhead>
          {/* <Wouter points={points} /> */}
          123
        </Unhead>
      </HydrationBoundary>
    </QueryClientProvider>
  )
}
