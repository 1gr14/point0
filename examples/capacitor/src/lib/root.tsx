import { Point0 } from '@point0/core'
import superjson from 'superjson'

export const root = Point0.lets('root', 'site')
  .transformer(superjson)
  .queryOptions({
    retry: false,
    retryOnMount: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    refetchIntervalInBackground: false,
  })
  .prefetchPageOnNavigate('pageDehydratedStateAndClientQuery')
  .prefetchPageOnLinkHover('pageDehydratedStateAndClientQuery')
  .head('global', ({ loading, error }) => {
    return {
      ...(loading ? { title: 'Loading...' } : {}),
      ...(error ? { title: error.message } : {}),
      titleTemplate: '%s | Capacitor Example',
      htmlAttrs: { lang: 'en' },
    }
  })
  .root()
