import { Point0 } from 'point0/core/index.js'
import type { source } from './server.js'

export const client = Point0.connect<typeof source>('client')
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  .sourceBaseUrl(process.env.SOURCE_BASE_URL!)
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
  .base()

export type Ctx = (typeof client)['Infer']['Ctx']
