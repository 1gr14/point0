import { QueryClientProvider } from '@/lib/query-client'
import { UnheadProvider } from '@point0/core/unhead'
import { Router, RouterRoutes } from '@/lib/navigate'

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
