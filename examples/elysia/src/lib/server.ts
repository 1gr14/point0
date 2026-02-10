import { Point0 } from '@point0/core'
import { prisma } from './prisma.js'
import superjson from 'superjson'

export const server = Point0.lets<{ x: number; z: string }>('root', 'server')
  .transformer(superjson)
  .ctx({
    prisma,
    env: process.env,
    Bun,
  })
  .root()
