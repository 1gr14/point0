import { Error0 } from '@1gr14/error0'
import { codePlugin } from '@1gr14/error0/plugins/code'
import { flatOriginalPlugin } from '@1gr14/error0/plugins/flat-original'
import { metaPlugin } from '@1gr14/error0/plugins/meta'
// import { redirectPlugin } from '@1gr14/error0/plugins/point0-redirect'
import { Link } from '@/lib/navigation'
import { responsePlugin } from '@1gr14/error0/plugins/response'
import { statusPlugin } from '@1gr14/error0/plugins/status'
import { ClientOnly, env } from '@point0/core'
import { RedirectTask } from '@point0/core/navigation'
import type { AdapterNavigateOptions, RedirectTaskSerialized } from '@point0/core/navigation'
import { useMemo } from 'react'

// TODO: get real redirect plugin after pkg publication
const redirectPlugin = <TAdapterNavigateOptions extends AdapterNavigateOptions = AdapterNavigateOptions>() => {
  return Error0.plugin()
    .prop('redirect', {
      init: (redirect: RedirectTaskSerialized<TAdapterNavigateOptions> | RedirectTask<TAdapterNavigateOptions>) =>
        RedirectTask.from(redirect),
      resolve: ({ flow }) => flow.find(Boolean),
      serialize: ({ resolved }) => resolved?.serialize(),
      deserialize: ({ value }) => {
        try {
          return RedirectTask.from(value as never)
        } catch {
          return undefined
        }
      },
    })
    .adapt((error) => {
      const cause = error.cause
      if (RedirectTask.is(cause)) {
        error.redirect = cause
        error.message = `Redirect to ${cause.to}`
        delete error.cause
      }
    })
}

export const AppError = Error0.use(statusPlugin())
  .use(codePlugin({ isPublic: true, codes: ['UNAUTHORIZED', 'FORBIDDEN'] }))
  .use(metaPlugin())
  .use(responsePlugin())
  .use(redirectPlugin())
  .use(flatOriginalPlugin())
  .use('stack', {
    serialize: ({ value }) => (env.mode.is.production ? undefined : value),
  })

export type AppError = InstanceType<typeof AppError>

export const useError = (error: unknown, overrides?: ErrorComponetProps): ErrorComponetProps => {
  const error0 = useMemo(() => (!error ? undefined : AppError.from(error)), [error])

  if (!error0) {
    return {
      title: 'Something went wrong',
      description: 'An unknown error occurred',
      ...overrides,
    }
  }
  if (error0.code === 'UNAUTHORIZED') {
    return {
      title: error0.message,
      description: (
        <>
          Please{' '}
          <Link href="/sign-in" className="text-blue-500 hover:text-blue-600">
            sign in
          </Link>{' '}
          to continue
        </>
      ),
      ...overrides,
    }
  }
  if (error0.code === 'FORBIDDEN') {
    return {
      title: error0.message,
      ...overrides,
    }
  }
  return {
    title: 'Something went wrong',
    description: error0.message,
    ...overrides,
  }
}

export type ErrorComponetProps = {
  title?: React.ReactNode
  description?: React.ReactNode
  stack?: string | undefined
}

export const ErrorComponent = ({ error, ...overrides }: ErrorComponetProps & { error?: unknown }) => {
  const { title, description, stack } = useError(error, overrides)
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900 shadow-sm">
        {!!title && <p className="text-sm font-semibold uppercase tracking-wide text-red-700">{title}</p>}
        {!!description && <p className="mt-2 text-base font-medium">{description}</p>}
      </div>
      {!!stack && (
        <ClientOnly>
          <pre className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">
            <code>{stack}</code>
          </pre>
        </ClientOnly>
      )}
    </div>
  )
}
