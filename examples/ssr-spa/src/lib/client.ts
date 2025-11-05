import { Point0 } from 'point0/core/index.js'
import type { source } from './server.js'
import { QueryClient } from '@tanstack/react-query'

export const client = Point0.connect<typeof source>('client')
  .sourceBaseUrl('http://localhost:3000')
  .queryClient(() => new QueryClient())
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
