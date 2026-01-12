import { Point0 } from '@point0/core'
import superjson from 'superjson'
import { prisma } from './prisma.js'

export const client = Point0.lets('root', 'client')
  .ssr(true)
  .transformer(superjson)
  .requireCtx<{ zxc: number }>()
  // .Infer.Ctx// .Infer['RequiredCtx']
  .ctx({
    prisma,
    env: process.env,
    Bun,
  })
  // .Infer['Ctx']
  .ctx([{ oklmn: 123 }])
  // .Infer.Ctx
  // .ctx([{ request: 123, x: 'x' }])
  // .Infer['CtxExposedKeys']
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
  .prefetchOnLinkHover(true)
  .root()

export type Ctx = (typeof client)['Infer']['Ctx']
