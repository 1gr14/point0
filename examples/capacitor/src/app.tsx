import { QueryClientProvider } from '@tanstack/react-query'
import { UnheadProvider } from '@point0/core/unhead'
import { Router, RouterRoutes } from '@/lib/navigation'
import { queryClient } from './lib/query-client'

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UnheadProvider>
        <Router>
          <RouterRoutes />
        </Router>
      </UnheadProvider>
    </QueryClientProvider>
  )
}
