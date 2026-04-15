import { basicAuth } from '@point0/basic-auth'
import { ClientOnly, Point0 } from '@point0/core'
import { zodSchemaHelper } from '@point0/core/schema/zod'
import { openapi } from '@point0/openapi'
import superjson from 'superjson'
import { AppError } from './error.js'

export const root = Point0.lets
  .root()
  .transformer(superjson)
  .schemaHelper(zodSchemaHelper())
  .errorClass(AppError)
  .prefetchPageOnNavigate('ssrDehydratedStateAndClientQuery')
  .prefetchPageOnLinkHover('ssrDehydratedStateAndClientQuery')
  .queryOptions({
    retry: false,
    retryOnMount: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    refetchIntervalInBackground: false,
    staleTime: 10 * 1000, // 10 seconds
  })
  .on('error', ({ side, name, data }) => {
    console.error({ side, name, error: data.error, point: 'point' in data ? data.point.toString() : undefined })
  })
  .head('global', ({ loading, error }) => {
    return {
      ...(loading ? { title: 'Loading...' } : {}),
      ...(error ? { title: error.message } : {}),
      titleTemplate: '%s | IdeaNick',
      htmlAttrs: { lang: 'en' },
    }
  })
  .loading(() => {
    return <div>Loading...</div>
  })
  .error(({ error }) => {
    return (
      <div>
        <div>Error: {error.message}</div>
        <ClientOnly>
          <code>
            <pre>{error.stack}</pre>
          </code>
        </ClientOnly>
      </div>
    )
  })
  .middleware(
    openapi({
      route: '/openapi.json',
      scalar: '/scalar',
      swagger: '/swagger',
      filter: 'all',
      before: basicAuth({ users: { admin: 'admin' } }),
    }),
  )
  .root()
