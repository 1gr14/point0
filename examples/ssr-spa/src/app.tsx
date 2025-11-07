import { QueryClientProvider } from '@tanstack/react-query'
import { Router, RouterRoutes } from 'point0/adapters/wouter'
import type { HydratedAppProps } from 'point0/core/mount'
import { Unhead } from 'point0/core/unhead'
import { clientCtx1, clientCtx2 } from './lib/client-ctx'
import { globalStore } from './lib/global-store'

export default function App({ points }: HydratedAppProps) {
  return (
    <points.Provider>
      <QueryClientProvider client={globalStore.get('queryClient')}>
        <Unhead>
          <Router policy="prefetch">
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
