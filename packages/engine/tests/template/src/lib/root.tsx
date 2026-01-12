import { Point0 } from '@point0/core'
import superjson from 'superjson'

export const root = Point0.lets('root', 'root')
  .ssr(true)
  .transformer(superjson)
  .loading(() => <div>Loading...</div>)
  .error(({ error }) => <div>Error: {error.message}</div>)
  .queryOptions({
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    refetchIntervalInBackground: false,
  })
  .root()
