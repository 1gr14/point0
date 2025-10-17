import { ClientPage0 } from '@devp0nt/page0/client'
import type { serverPage0 } from '../../server/page0.js'

export const page0 = new ClientPage0<typeof serverPage0>()
