import { Point0 } from '@point0/core'
import { prisma } from './prisma.js'
import { QueryClient } from '@tanstack/react-query'
import superjson from 'superjson'

export const queryClient = Point0.defineQueryClient(() => new QueryClient())

export const client = Point0.create('client')
  .ssr(true)
  .transformer(superjson)
  .requireCtx<{ request: Request }>()
  .ctx({
    prisma,
    env: process.env,
    Bun,
  })
  // .serverurl(process.env.SOURCE_BASE_URL!)
  .queryOptions({
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    refetchIntervalInBackground: false,
  })
  // .prefetchPolicy('everything')
  .head(({ loading, error }) => ({
    ...(loading ? { title: 'Loading...' } : {}),
    ...(error ? { title: error.message } : {}),
    titleTemplate: '%s | IdeaNick',
    htmlAttrs: { lang: 'en' },
  }))
  .error(({ error }) => {
    return (
      <div>
        <div>Error: {error.message}</div>
        <pre>{JSON.stringify(error.stack, null, 2)}</pre>
      </div>
    )
  })
  .prefetchOnHover(true)
  .root()

export type Ctx = (typeof client)['Infer']['Ctx']
