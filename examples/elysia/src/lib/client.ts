import { Point0 } from '@point0/core'
import { prisma } from './prisma.js'
import superjson from 'superjson'

export const client = Point0.create('client')
  .ssr(true)
  .transformer(superjson)
  .requireCtx<{ x: number; y: number }>()
  .ctx({
    prisma,
    env: process.env,
    Bun,
  })
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  .serverurl(process.env.SOURCE_BASE_URL!)
  .queryOptions({
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    refetchIntervalInBackground: false,
  })
  .head({
    title: 'Loading...',
    titleTemplate: '%s | IdeaNick',
    htmlAttrs: { lang: 'en' },
  })
  .root()

export type Ctx = (typeof client)['Infer']['Ctx']
