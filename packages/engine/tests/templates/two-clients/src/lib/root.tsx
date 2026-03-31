import { Point0 } from '@point0/core'
import { cors } from '@point0/cors'

export const root = Point0.lets
  .root()
  .use(cors())
  .queryOptions({
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    refetchIntervalInBackground: false,
  })
  // placeholder
  .root()
