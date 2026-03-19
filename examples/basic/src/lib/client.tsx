import { Point0 } from '@point0/core'
import superjson from 'superjson'
import { prisma } from './prisma.js'
import { AppError } from './error.js'

export const client = Point0.lets<{ zxc: number }>('root', 'client')
  // .ssr(true)
  .transformer(superjson)
  // .Infer.Ctx// .Infer['RequiredCtx']
  .ctx({
    prisma,
    env: process.env,
    Bun,
  })
  .errorClass(AppError)
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
  // .prefetchPageOnNavigate(false)
  // .prefetchPageOnLinkHover(false)
  .head('global', ({ loading, error }) => {
    return {
      ...(loading ? { title: 'Loading...' } : {}),
      ...(error ? { title: error.message } : {}),
      titleTemplate: '%s | IdeaNick',
      htmlAttrs: { lang: 'en' },
    }
  })
  .error(({ error }) => {
    return (
      <div>
        <div>Error: {error.message}</div>
        <code>
          <pre>{error.stack}</pre>
        </code>
      </div>
    )
  })
  .prefetchPageOnLinkHover(true)
  .root()

export type Ctx = (typeof client)['Infer']['Ctx']
