import 'server-only'

import { Point0 } from '@devp0nt/point0/index.js'
import { prisma } from './prisma.js'

export const server = new Point0()
  .ctx(() => ({
    prisma,
    env: process.env,
  }))
  .loader(async ({ ctx }) => {
    return { ideasCount: await ctx.prisma.idea.count() }
  })
