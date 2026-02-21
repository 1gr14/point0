import { UnheadProvider, QueryClientProvider } from '@point0/core'
import { Router, RouterRoutes } from '@point0/wouter'

export default function App() {
  return (
    <QueryClientProvider>
      <UnheadProvider>
        <Router>
          {/* Before RouterRoutes */}
          <RouterRoutes
            Page404={() => {
              return <div>Page Not Found 1</div>
            }}
          />
          {/* After RouterRoutes */}
        </Router>
      </UnheadProvider>
    </QueryClientProvider>
  )
}
