import { Error0 } from '@1gr14/error0'
import { causePlugin } from '@1gr14/error0/plugins/cause'
import { codePlugin } from '@1gr14/error0/plugins/code'
import { flatOriginalPlugin } from '@1gr14/error0/plugins/flat-original'
import { metaPlugin } from '@1gr14/error0/plugins/meta'
import { redirectPlugin } from '@1gr14/error0/plugins/point0-redirect'
import { responsePlugin } from '@1gr14/error0/plugins/response'
import { stackPlugin } from '@1gr14/error0/plugins/stack'
import { statusPlugin } from '@1gr14/error0/plugins/status'

export const AppError = Error0.use(statusPlugin())
  .use(codePlugin({ transport: 'public', codes: ['UNAUTHORIZED', 'FORBIDDEN'] }))
  .use(metaPlugin())
  .use(causePlugin())
  .use(responsePlugin())
  .use(redirectPlugin())
  .use(flatOriginalPlugin())
  .use(stackPlugin())

export type AppError = InstanceType<typeof AppError>
