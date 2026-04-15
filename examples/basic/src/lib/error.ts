import { Error0 } from '@devp0nt/error0'
import { codePlugin } from '@devp0nt/error0/plugins/code'
import { flatOriginalPlugin } from '@devp0nt/error0/plugins/flat-original'
import { metaPlugin } from '@devp0nt/error0/plugins/meta'
// import { redirectPlugin } from '@devp0nt/error0/plugins/point0-redirect'
import { responsePlugin } from '@devp0nt/error0/plugins/response'
import { statusPlugin } from '@devp0nt/error0/plugins/status'
import { env } from '@point0/core'
import type { AdapterNavigateOptions, RedirectTaskSerialized } from '@point0/core/navigation'
import { RedirectTask } from '@point0/core/navigation'

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
  .use(codePlugin())
  .use(metaPlugin())
  .use(responsePlugin())
  .use(redirectPlugin())
  .use(flatOriginalPlugin())
  .use('stack', {
    serialize: ({ value }) => (env.mode.is.production ? undefined : value),
  })

export type AppError = InstanceType<typeof AppError>
