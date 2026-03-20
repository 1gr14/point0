import { UnheadProvider } from '@point0/core/unhead'
import { QueryClientProvider } from './lib/query-client.js'
import { Router, RouterRoutes } from './lib/navigate1.js'

export default function App() {
  return (
    <QueryClientProvider>
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
