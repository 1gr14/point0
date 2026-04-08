import { Point0 } from '@point0/core'
import { zodSchemaHelper } from '@point0/core/schema/zod'
import superjson from 'superjson'
import { prisma } from './prisma.js'
import { openapi } from '@point0/openapi'

export const root = Point0.lets
  .root<{ zxc: number }>()
  .transformer(superjson)
  .middleware(openapi({ route: '/openapi.json', scalar: true }))
  // .Infer.Ctx// .Infer['RequiredCtx']
  .ctx({
    prisma,
    env: process.env,
    Bun,
  })
  .schemaHelper(zodSchemaHelper())
  // .errorClass(AppError)
  // .Infer['Ctx']
  .ctx([{ oklmn: 123 }])
  // .Infer.Ctx
  // .ctx([{ request: 123, x: 'x' }])
  // .Infer['CtxExposedKeys']
  // .serverurl(process.env.SOURCE_BASE_URL!)
  .queryOptions({
    retry: false,
    retryOnMount: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    refetchIntervalInBackground: false,
  })
  .on('error', ({ data }) => {
    console.error(data.error)
  })
  .prefetchPageOnNavigate(true)
  .prefetchPageOnLinkHover(true)
  .head('global', ({ loading, error }) => {
    return {
      ...(loading ? { title: 'Loading...' } : {}),
      ...(error ? { title: error.message } : {}),
      titleTemplate: '%s | IdeaNick',
      htmlAttrs: { lang: 'en' },
    }
  })
  // .error(({ error }) => {
  //   return (
  //     <div>
  //       <div>Error: {error.message}</div>
  //       <code>
  //         <pre suppressHydrationWarning>{error.stack}</pre>
  //       </code>
  //     </div>
  //   )
  // })
  .root()

export type Ctx = (typeof root)['Infer']['Ctx']
