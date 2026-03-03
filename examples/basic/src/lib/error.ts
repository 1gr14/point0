import { Error0 } from '@devp0nt/error0'
import { statusPlugin } from '@devp0nt/error0/plugins/status'
import { codePlugin } from '@devp0nt/error0/plugins/code'
import { metaPlugin } from '@devp0nt/error0/plugins/meta'

export const AppError = Error0.use(statusPlugin()).use(codePlugin()).use(metaPlugin())
export type AppError = InstanceType<typeof AppError>
