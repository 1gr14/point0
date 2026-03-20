import { Router, RouterRoutes } from '@/lib/navigate'
import { UnheadProvider } from '@point0/core/unhead'
import { QueryClientProvider } from './lib/query-client.js'

export default function App() {
  return (
    <QueryClientProvider>
      <UnheadProvider>
        <Router>
          <RouterRoutes />
        </Router>
      </UnheadProvider>
    </QueryClientProvider>
  )
}
