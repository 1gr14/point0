import { ServerPoint0 } from '@devp0nt/point0/server'
import { prisma } from '../shared/prisma.js'

export const serverPoint0 = new ServerPoint0().ctx(() => ({
  prisma,
}))
