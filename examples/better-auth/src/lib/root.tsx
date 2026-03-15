import { Point0 } from '@point0/core'
import superjson from 'superjson'
import { authServer } from './auth/core'

export const root = Point0.lets('root', 'site')
  .ssr(true)
  .transformer(superjson)
  .middleware(async ({ request, next }) => {
    if (request.location.pathname.startsWith('/api/auth')) {
      return await authServer.handler(request.original)
    }
    return await next()
  })
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
      titleTemplate: '%s | Better Auth Example',
      htmlAttrs: { lang: 'en' },
    }
  })
  .root()
