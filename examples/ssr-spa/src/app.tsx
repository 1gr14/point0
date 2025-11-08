import { QueryClientProvider } from '@tanstack/react-query'
import { Router } from 'point0/adapters/wouter'
import { Unhead } from 'point0/core/unhead'
import { clientCtx1, clientCtx2 } from './lib/client-ctx'
import { $ } from './lib/global-store'
import * as points from './lib/points.lazy.js'
import { WouterRoutes } from './lib/wouter-routes'
import { Points } from 'point0/core/points'

export default function App() {
  return (
    <Points.Provider points={points}>
      <QueryClientProvider client={$.queryClient}>
        <Unhead>
          <Router policy="prefetch">
            <clientCtx2.Provider>
              <clientCtx1.Provider>
                <WouterRoutes />
              </clientCtx1.Provider>
            </clientCtx2.Provider>
          </Router>
        </Unhead>
      </QueryClientProvider>
    </Points.Provider>
  )
}
