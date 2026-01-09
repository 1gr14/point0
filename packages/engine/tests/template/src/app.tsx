import { UnheadProvider } from '@point0/core'
import { Router, RouterRoutes } from '@point0/wouter'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/root.js'

export default function App() {
  return (
    <QueryClientProvider client={queryClient.get()}>
      <UnheadProvider>
        <Router>
          {/* Before RouterRoutes */}
          <RouterRoutes
            Page404={() => {
              return <div>Page Not Found</div>
            }}
          />
          {/* After RouterRoutes */}
        </Router>
      </UnheadProvider>
    </QueryClientProvider>
  )
}
