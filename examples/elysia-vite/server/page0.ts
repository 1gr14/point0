import { ServerPage0 } from '@devp0nt/page0/server'
import { prisma } from '../shared/prisma.js'

export const serverPage0 = new ServerPage0().ctx(() => ({
  prisma,
}))
