import { appChannel } from '@/lib/channel'
import { Router, RouterRoutes } from '@/lib/navigation'
import { queryClient } from '@/lib/query-client'
import { UnheadProvider } from '@point0/core/unhead'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Head } from '@unhead/react'

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ReactQueryDevtools initialIsOpen={false} />
      <UnheadProvider>
        <Head>
          <link rel="shortcut icon" href="/favicon.ico" />
        </Head>
        <Router>
          {/* ONE connection for the whole app: held here, at the root, and reused by every space on every page —
              no page wraps itself in <Connection> again. No `gate`: pages render immediately, and anything that
              needs the socket (a membership, a socket query) waits through the ordinary cascade. */}
          <appChannel.Connection>
            <RouterRoutes />
          </appChannel.Connection>
        </Router>
      </UnheadProvider>
    </QueryClientProvider>
  )
}
