import { QueryClientProvider } from '@tanstack/react-query'
import { RouterRoutes, Router } from 'point0/adapters/wouter'
import { Point0 } from 'point0/core'
import { Unhead } from 'point0/core/unhead'
import { clientCtx1, clientCtx2 } from './lib/client-ctx'
import * as points from './lib/points.lazy.js'
import { queryClient } from './lib/super-store'

Point0.setPoints(points)

export default function App() {
  return (
    <QueryClientProvider client={queryClient.get()}>
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
  )
}
