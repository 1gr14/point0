import { UnheadProvider } from '@point0/core'
import { Router, RouterRoutes } from '@point0/wouter'
import { QueryClientProvider } from '@tanstack/react-query'
import { clientCtx1, clientCtx2 } from './lib/client-ctx'
import { queryClient } from './lib/client'

export default function App() {
  return (
    <QueryClientProvider client={queryClient.get()}>
      <UnheadProvider>
        <Router>
          <clientCtx2.Provider>
            <clientCtx1.Provider>
              <RouterRoutes
                Page404={() => {
                  return <div>Page Not Found</div>
                }}
              />
            </clientCtx1.Provider>
          </clientCtx2.Provider>
        </Router>
      </UnheadProvider>
    </QueryClientProvider>
  )
}
