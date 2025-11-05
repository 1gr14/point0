import { QueryClientProvider } from '@tanstack/react-query'
import { Router, RouterRoutes } from 'point0/adapters/wouter'
import type { HydratedAppProps } from 'point0/core/hydrate'
import { Unhead } from 'point0/core/unhead'
import { clientCtx1, clientCtx2 } from './lib/client-ctx'

export default function App({ queryClient, ssrLocation, points }: HydratedAppProps) {
  return (
    <points.Provider>
      <QueryClientProvider client={queryClient}>
        <Unhead>
          <Router ssrLocation={ssrLocation} policy="prefetch">
            <clientCtx2.Provider>
              <clientCtx1.Provider>
                <RouterRoutes />
              </clientCtx1.Provider>
            </clientCtx2.Provider>
          </Router>
        </Unhead>
      </QueryClientProvider>
    </points.Provider>
  )
}
