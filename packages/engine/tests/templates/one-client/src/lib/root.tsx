import { Point0 } from '@point0/core'
import superjson from 'superjson'
import { cors } from '@point0/cors'

export const root = Point0.lets('root', 'root')
  .use(cors())
  .transformer(superjson)
  .loading(() => <div>Loading...</div>)
  .error(({ error }) => <div>Error: {error.message}</div>)
  .prefetchPageOnNavigate(false)
  .prefetchPageOnLinkHover(false)
  .queryOptions({
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    refetchIntervalInBackground: false,
  })
  .root()
