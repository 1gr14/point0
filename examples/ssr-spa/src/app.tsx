import { HydrationBoundary, QueryClientProvider } from '@tanstack/react-query'
import { Router, RouterRoutes } from 'point0/adapters/wouter'
import type { HydratedAppProps } from 'point0/core/hydrate'
import { Unhead } from 'point0/core/unhead'
import { clientCtx1, clientCtx2 } from './lib/client-ctx'

export default function App({ dehydratedState, ssrLocation, points, root }: HydratedAppProps) {
  return (
    <points.Provider>
      <QueryClientProvider client={root.getQueryClient()}>
        <HydrationBoundary state={dehydratedState}>
          <Unhead>
            <Router ssrLocation={ssrLocation} policy="prefetch">
              <clientCtx1.Provider>
                <clientCtx2.Provider>
                  <RouterRoutes />
                </clientCtx2.Provider>
              </clientCtx1.Provider>
            </Router>
          </Unhead>
        </HydrationBoundary>
      </QueryClientProvider>
    </points.Provider>
  )
}
