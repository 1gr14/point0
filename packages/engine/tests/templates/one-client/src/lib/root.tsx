import { Point0 } from '@point0/core'
import superjson from 'superjson'
import { cors } from '@point0/cors'

export const root = Point0.lets
  .root()
  .middleware(cors())
  .transformer(superjson)
  .loading(() => <div>Loading...</div>)
  .error(({ error }) => <div>Error: {error.message}</div>)
  .prefetchPageOnNavigate(false)
  .prefetchPageOnLinkHover(false)
  .queryOptions({
    retry: false,
    retryOnMount: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    refetchIntervalInBackground: false,
    staleTime: Infinity,
  })
  .root()
