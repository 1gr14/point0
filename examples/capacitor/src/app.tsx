import { QueryClientProvider, UnheadProvider } from '@point0/core'
import { Router, RouterRoutes } from '@point0/wouter'

export default function App() {
  return (
    <QueryClientProvider>
      <UnheadProvider>
        <Router>
          <RouterRoutes
            Page404={() => {
              return <div>Page Not Found</div>
            }}
          />
        </Router>
      </UnheadProvider>
    </QueryClientProvider>
  )
}
