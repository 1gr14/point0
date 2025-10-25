// import 'server-only'

import { Point0 } from 'point0/core/index.js'
import { prisma } from './prisma.js'

export const server = Point0.source('server')
  .requireCtx<{
    request: Bun.BunRequest
  }>()
  .ctx({
    prisma,
    env: process.env,
    Bun,
  })
// .loader(async ({ ctx }) => {
//   return { ideasCount: await ctx.prisma.idea.count() }
// })
