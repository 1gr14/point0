import { ServerPage0 } from '@devp0nt/page0/server'
import { prisma } from './prisma.js'

export const serverPage0 = new ServerPage0()
  .ctx(() => ({
    prisma,
  }))
  .loader(async ({ ctx }) => {
    return { ideasCount: await ctx.prisma.idea.count() }
  })
