import { afterAll, beforeAll, describe, expect, it, setDefaultTimeout } from 'bun:test'
import type { PlaywrightPage } from './utils/playwright.js'
import { PlaywrightBrowser } from './utils/playwright.js'
import type { TestProjectOneClient } from './utils/project.one-client.js'
import { TestProjectOneClientFactory } from './utils/project.one-client.js'

setDefaultTimeout(45000)

const tpf = TestProjectOneClientFactory.create({
  namespace: 'prefetch-page-rehydrate',
  portsRange: [3500, 3549],
})

// A root layout + an index page + a target page that owns a *server* query. That
// server query ("getMe"-like) is what lands inside the target page's
// queryClientDehydratedState snapshot.
const layoutTsx = `import { root } from '../lib/root.js'
export const layout = root.lets('layout', 'mainLayout', '/app').layout(({ children }) => <div id="layout">{children}</div>)
`

const homeTsx = `import { layout } from './layout.js'
export const homePage = layout.lets('page', 'home', '/').page(() => <div id="home">home</div>)
`

const targetTsx = `import { layout } from './layout.js'
export const targetPage = layout.lets('page', 'target', 'target')
  .loader(async () => ({ me: 'authorized' }))
  .page(({ data }) => <div id="target">{data.me}</div>)
`

// Client points are generated lazily, so the page module is not loaded until you
// navigate/prefetch to it. We drive the scenario from this eager module instead:
// expose the query client + getClientPoints on window, then prefetch by location
// (which loads the lazy page point under the hood). This is a pure in-memory cache
// scenario — it never depends on the network, so it is fully deterministic.
const queryClientTs = `import { createQueryClient, getClientPoints } from '@point0/core'
export const queryClient = createQueryClient()
if (typeof window !== 'undefined') {
  ;(globalThis as any).__test__ = { queryClient, getClientPoints }
}
`

const initTestProject = async (): Promise<TestProjectOneClient> => {
  const tp = tpf.create({ ssr: true, fixedId: false })
  const tries = 3
  for (let tryIndex = 0; tryIndex < tries; tryIndex++) {
    try {
      await tp.cleanup('ports')
      await tp.init()
      await tp.write('src/lib/query-client.ts', queryClientTs)
      await tp.write('src/app/layout.tsx', layoutTsx)
      await tp.write('src/app/home.tsx', homeTsx)
      await tp.write('src/app/target.tsx', targetTsx)
      tp.spawn(['bun', 'run', 'dev'])
      await tp.waitStarted()
    } catch (error) {
      if (tryIndex === tries - 1) {
        throw error
      }
      continue
    }
    break
  }
  return tp
}

describe('prefetch-page-rehydrate', () => {
  let tp: TestProjectOneClient

  beforeAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
    tpf.setBrowser(await PlaywrightBrowser.init())
    tp = await initTestProject()
  })

  afterAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
  })

  it(
    'does not resurrect a query removed from the cache after prefetch',
    async () => {
      const page: PlaywrightPage = await tp.gotoServer('/app')
      await page.waitContent('#home')

      const result = await page.original.evaluate(async () => {
        const w = globalThis as any
        const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
        const start = Date.now()
        while (!w.__test__ && Date.now() - start < 5000) {
          await sleep(30)
        }
        const { queryClient, getClientPoints } = w.__test__
        const clientPoints = getClientPoints()
        const location = clientPoints.routes._.getLocation('/app/target')

        const list = (): string[] =>
          queryClient
            .getQueryCache()
            .getAll()
            .map((q: any) => {
              const k = q.queryKey?.[1] ?? {}
              return `${k.scope}.${k.type}.${k.name} (${k.output})`
            })
            .sort()
        const findDataQuery = () =>
          queryClient
            .getQueryCache()
            .getAll()
            .find((q: any) => {
              const k = q.queryKey?.[1] ?? {}
              return k.type === 'page' && k.name === 'target' && k.output === 'data'
            })

        // staleTime Infinity so the second prefetch reuses the cached dehydrated
        // state instead of refetching — that is exactly the bug condition.
        const prefetchOptions = {
          location,
          policy: 'ssrDehydratedState',
          queryClient,
          pageDehydratedStateQueryOptions: { staleTime: Infinity },
        }

        // 1. hover: prefetch the page → its server query is hydrated into the store
        const pagePoint = await clientPoints.prefetchPage(prefetchOptions)
        const afterPrefetch1 = list()

        // 2. leave + delete the query from the cache
        const dataQuery = findDataQuery()
        if (dataQuery) {
          queryClient.removeQueries({ queryKey: dataQuery.queryKey, exact: true })
        }
        const afterDelete = list()

        // 3. click: prefetch again → must NOT resurrect the deleted query
        await clientPoints.prefetchPage(prefetchOptions)
        const afterPrefetch2 = list()

        // 4. the page genuinely needs the query → it loads again on demand (fresh from server)
        const refetched = await pagePoint.fetchQuery(undefined, { queryClient })
        const afterRefetch = list()

        return { afterPrefetch1, afterDelete, afterPrefetch2, afterRefetch, refetched }
      })

      // 1. prefetch hydrated the page's server query into the store
      expect(result.afterPrefetch1).toContain('root.page.target (data)')
      expect(result.afterPrefetch1).toContain('root.page.target (queryClientDehydratedState)')

      // 2. we removed it from the store
      expect(result.afterDelete).not.toContain('root.page.target (data)')
      expect(result.afterDelete).toContain('root.page.target (queryClientDehydratedState)')

      // 3. THE BUG: re-prefetch must not bring the removed query back from the frozen snapshot
      expect(result.afterPrefetch2).not.toContain('root.page.target (data)')

      // 4. the removed query is gone, not overwritten — and still loads on demand with fresh data
      expect(result.afterRefetch).toContain('root.page.target (data)')
      expect(result.refetched).toEqual({ me: 'authorized' })
    },
    { retry: 2 },
  )
})
