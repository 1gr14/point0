import { QueryClientProvider } from '@tanstack/react-query'
import { Router, RouterRoutes } from 'point0/adapters/wouter'
import type { AppProps } from 'point0/core/mount'
import { Unhead } from 'point0/core/unhead'
import { clientCtx1, clientCtx2 } from './lib/client-ctx'
import { $ } from './lib/global-store'

export default function App({ points }: AppProps) {
  return (
    <points.Provider>
      <QueryClientProvider client={$.queryClient}>
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
