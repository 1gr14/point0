import { basicAuth } from '@point0/basic-auth'
import { ClientOnly, Point0 } from '@point0/core'
import { zodSchemaHelper } from '@point0/core/schema/zod'
import { openapi } from '@point0/openapi'
import superjson from 'superjson'
import { AppError } from '@/lib/error.js'

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
  .on('error', ({ side, name, data, meta }) => {
    console.error({ ...meta, side, name, error: data.error })
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
  .error(({ error }) => {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-red-700">Something went wrong</p>
          <p className="mt-2 text-base font-medium">Error: {error.message}</p>
        </div>
        <ClientOnly>
          <pre className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">
            <code>{error.stack}</code>
          </pre>
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
