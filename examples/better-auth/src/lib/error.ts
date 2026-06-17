import { Error0 } from '@1gr14/error0'
import { causePlugin } from '@1gr14/error0/plugins/cause'
import { codePlugin } from '@1gr14/error0/plugins/code'
import { flatOriginalPlugin } from '@1gr14/error0/plugins/flat-original'
import { metaPlugin } from '@1gr14/error0/plugins/meta'
// import { redirectPlugin } from '@1gr14/error0/plugins/point0-redirect'
import { responsePlugin } from '@1gr14/error0/plugins/response'
import { stackPlugin } from '@1gr14/error0/plugins/stack'
import { statusPlugin } from '@1gr14/error0/plugins/status'
import { RedirectTask } from '@point0/core/navigation'
import type { AdapterNavigateOptions, RedirectTaskSerialized } from '@point0/core/navigation'

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
  .use(codePlugin({ transport: 'public', codes: ['UNAUTHORIZED', 'FORBIDDEN'] }))
  .use(metaPlugin())
  .use(causePlugin())
  .use(responsePlugin())
  .use(redirectPlugin())
  .use(flatOriginalPlugin())
  .use(stackPlugin())

export type AppError = InstanceType<typeof AppError>
