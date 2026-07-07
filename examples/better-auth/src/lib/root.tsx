import { authServer } from '@/lib/auth/server'
import { AppError } from '@/lib/error'
import { ErrorComponent } from '@/ui/error'
import { basicAuth } from '@point0/basic-auth'
import { cacheControl } from '@point0/cache-control'
import { compress } from '@point0/compress'
import { Point0 } from '@point0/core'
import { zodSchemaHelper } from '@point0/core/schema/zod'
import { openapi } from '@point0/openapi'
import superjson from 'superjson'
import { sharedEnv } from '@/lib/env/shared'

export const root = Point0.lets
  .root()
  .serverUrl(sharedEnv.SERVER_URL)
  .clientUrl(sharedEnv.CLIENT_URL)
  .transformer(superjson)
  .schemaHelper(zodSchemaHelper())
  .errorClass(AppError)
  .prefetchPageOnNavigate('pageDehydratedStateAndClientQuery')
  .prefetchPageOnLinkHover('pageDehydratedStateAndClientQuery')
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
  .on('error', ({ side, name, error, meta }) => {
    console.error({ ...meta, side, name, error })
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
  .middleware(compress())
  .middleware(cacheControl())
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
