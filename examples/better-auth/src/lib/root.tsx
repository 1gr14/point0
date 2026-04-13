import { Point0 } from '@point0/core'
import superjson from 'superjson'
import { authServer } from './auth/core'

export const root = Point0.lets('root', 'site')
  .transformer(superjson)
  .middleware('/api/auth/*', async ({ request }) => await authServer.handler(request.original))
  .queryOptions({
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    refetchIntervalInBackground: false,
  })

  .prefetchPageOnNavigate('ssrDehydratedStateAndClientQuery')
  .prefetchPageOnLinkHover('ssrDehydratedStateAndClientQuery')
  .head('global', ({ loading, error }) => {
    return {
      ...(loading ? { title: 'Loading...' } : {}),
      ...(error ? { title: error.message } : {}),
      titleTemplate: '%s | Better Auth Example',
      htmlAttrs: { lang: 'en' },
    }
  })
  .root()
