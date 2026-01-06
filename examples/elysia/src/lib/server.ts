import { Point0 } from '@point0/core'
import { prisma } from './prisma.js'
import superjson from 'superjson'

export const server = Point0.lets('root', 'server')
  .transformer(superjson)
  .requireCtx<{ x: number; z: string }>()
  .ctx({
    prisma,
    env: process.env,
    Bun,
  })
  .root()
