import { Point0 } from '@point0/core'
import superjson from 'superjson'
import { prisma } from './prisma.js'

export const client = Point0.lets('root', 'client')
  .transformer(superjson)
  // .serverurl(process.env.SOURCE_BASE_URL!)
  .ctx({
    prisma,
    env: process.env,
    Bun,
  })
  .queryOptions({
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    refetchIntervalInBackground: false,
  })
  .prefetchPageOnLinkHover(true)
  .head('global', {
    title: 'Loading...',
    titleTemplate: '%s | IdeaNick',
    htmlAttrs: { lang: 'en' },
  })
  .root()

export type Ctx = (typeof client)['Infer']['Ctx']
