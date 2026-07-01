import { Router, RouterRoutes } from '@/lib/navigation'
import { UnheadProvider } from '@point0/core/unhead'
import { QueryClientProvider } from '@tanstack/react-query'
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from '@/lib/query-client'
import { Head } from '@unhead/react'

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* <ReactQueryDevtools initialIsOpen={true} /> */}
      <UnheadProvider>
        <Head>
          <link rel="shortcut icon" href="/favicon.ico" />
          {/* Any other global head tags go here. You can also set them per page via `.head(...)` on each point. */}
        </Head>
        <Router>
          {/* <Router /> alone is enough. If you need router context, wrap it with providers or add other components here. */}
          <RouterRoutes />
        </Router>
      </UnheadProvider>
    </QueryClientProvider>
  )
}
