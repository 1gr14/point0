import { authServer } from '@/lib/auth/core'
import { AppError, ErrorComponent } from '@/lib/error'
import { basicAuth } from '@point0/basic-auth'
import { Point0 } from '@point0/core'
import { zodSchemaHelper } from '@point0/core/schema/zod'
import { openapi } from '@point0/openapi'
import superjson from 'superjson'

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
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Please wait</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">Loading...</p>
        </div>
      </div>
    )
  })
  .error(({ error }) => <ErrorComponent error={error} />)
  // we can do this, to be able authClient, but I thing it is better has own queries and mutations and use authServer under the hood
  .middleware('/api/auth/*', async ({ request }) => await authServer.handler(request.original))
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
