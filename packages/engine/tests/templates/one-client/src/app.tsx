import { UnheadProvider } from '@point0/core/unhead'
import { QueryClientProvider } from '@tanstack/react-query'
import { Router, RouterRoutes } from './lib/navigate.js'
import { queryClient } from './lib/query-client.js'

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UnheadProvider>
        <Router>
          {/* Before RouterRoutes */}
          <RouterRoutes />
          {/* After RouterRoutes */}
        </Router>
      </UnheadProvider>
    </QueryClientProvider>
  )
}
