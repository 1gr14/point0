import { Error0 } from '@devp0nt/error0'
import { statusPlugin } from '@devp0nt/error0/plugins/status'
import { codePlugin } from '@devp0nt/error0/plugins/code'
import { metaPlugin } from '@devp0nt/error0/plugins/meta'
import { responsePlugin } from '@devp0nt/error0/plugins/response'

export const AppError = Error0.use(statusPlugin()).use(codePlugin()).use(metaPlugin()).use(responsePlugin())
export type AppError = InstanceType<typeof AppError>
