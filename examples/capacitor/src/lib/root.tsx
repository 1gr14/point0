import { Point0 } from '@point0/core'
import superjson from 'superjson'

export const root = Point0.lets('root', 'site')
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
  .prefetchPageOnLinkHover(true)
  .prefetchPageOnNavigate(true)
  .head('global', ({ loading, error }) => {
    return {
      ...(loading ? { title: 'Loading...' } : {}),
      ...(error ? { title: error.message } : {}),
      titleTemplate: '%s | Capacitor Example',
      htmlAttrs: { lang: 'en' },
    }
  })
  .root()
