import { Point0 } from '@point0/core'
import superjson from 'superjson'
import { prisma } from './prisma.js'

export const root = Point0.lets
  .root<{ zxc: number }>()
  .transformer(superjson)
  // .Infer.Ctx// .Infer['RequiredCtx']
  .ctx({
    prisma,
    env: process.env,
    Bun,
  })
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
