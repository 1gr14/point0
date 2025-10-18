import { Point0 } from '@devp0nt/point0/index.js'
import { prisma } from './prisma.js'

export const serverPoint0 = new Point0()
  .ctx(() => ({
    prisma,
  }))
  .loader(async ({ ctx }) => {
    return { ideasCount: await ctx.prisma.idea.count() }
  })
