import { Point0 } from '@point0/core'
import { QueryClient } from '@tanstack/react-query'
import superjson from 'superjson'

export const queryClient = Point0.defineQueryClient(() => new QueryClient())

export const root = Point0.lets('root', 'root')
  .ssr(true)
  .transformer(superjson)
  .queryOptions({
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    refetchIntervalInBackground: false,
  })
  .root()
