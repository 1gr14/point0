// import 'server-only'

import { Point0 } from 'point0/index.js'
import { prisma } from './prisma.js'

export const server = Point0.server()
  .ctx(() => ({
    prisma,
    env: process.env,
  }))
  .loader(async ({ ctx }) => {
    return { ideasCount: await ctx.prisma.idea.count() }
  })
