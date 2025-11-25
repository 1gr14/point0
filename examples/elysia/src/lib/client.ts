import { Point0 } from '@point0/core'
import { prisma } from './prisma.js'

export const client = Point0.create('client')
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
