import { UnheadProvider } from '@point0/core/unhead'
import { QueryClientProvider } from './lib/query-client.js'
import { Router, RouterRoutes } from '@/lib/navigate'
import { clientCtx1, clientCtx2 } from './lib/client-ctx'

export default function App() {
  return (
    <QueryClientProvider>
      <UnheadProvider>
        <Router>
          <clientCtx2.Provider>
            <clientCtx1.Provider>
              <RouterRoutes />
            </clientCtx1.Provider>
          </clientCtx2.Provider>
        </Router>
      </UnheadProvider>
    </QueryClientProvider>
  )
}
