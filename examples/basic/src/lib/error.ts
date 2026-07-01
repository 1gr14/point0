import { Error0 } from '@1gr14/error0'
import { codePlugin } from '@1gr14/error0/plugins/code'
import { flatOriginalPlugin } from '@1gr14/error0/plugins/flat-original'
import { metaPlugin } from '@1gr14/error0/plugins/meta'
import { redirectPlugin } from '@1gr14/error0/plugins/point0-redirect'
import { responsePlugin } from '@1gr14/error0/plugins/response'
import { stackPlugin } from '@1gr14/error0/plugins/stack'
import { statusPlugin } from '@1gr14/error0/plugins/status'

// Optional — there's a default ErrorPoint0, but you can replace it with your own error class:
// one built with Error0, or just a plain class extended from Error.
export const AppError = Error0.mark('AppError')
  .use(statusPlugin())
  .use(codePlugin())
  .use(metaPlugin())
  .use(responsePlugin())
  .use(redirectPlugin())
  .use(flatOriginalPlugin())
  .use(stackPlugin())

export type AppError = InstanceType<typeof AppError>
