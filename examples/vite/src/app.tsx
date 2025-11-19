import { QueryClientProvider } from '@tanstack/react-query'
import { Unhead } from '@point0/core/unhead'
import { Router, RouterRoutes } from '@point0/wouter'
import { clientCtx1, clientCtx2 } from './lib/client-ctx'
import { queryClient } from './lib/super-store'

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
