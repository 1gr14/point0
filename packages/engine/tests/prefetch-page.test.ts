import { afterAll, beforeAll, describe, expect, it, setDefaultTimeout } from 'bun:test'
import type { PlaywrightPage } from './utils/playwright.js'
import { PlaywrightBrowser } from './utils/playwright.js'
import type {
  TestProjectOneClient,
  TestProjectOneClientFactoryCreateProjectOptions,
} from './utils/project.one-client.js'
import { TestProjectOneClientFactory } from './utils/project.one-client.js'
import { toKebabCase } from '@point0/core'

setDefaultTimeout(20000)

const tpf = TestProjectOneClientFactory.create({
  namespace: 'prefetch-page',
  portsRange: [3400, 3499],
})

const loaderDuration = 300
const hoverBiggerThanLoaderDuration = 450
const hoverSmallerThanLoaderDuration = 50

const stringify1 = (value: any) => (typeof value === 'string' ? value : JSON.stringify(value))
const stringify2 = (value: any) => (typeof value === 'string' ? `'${value}'` : value ? 'true' : 'false')
const toMark = (polh: string | boolean, pon: string | boolean) => `polh-${stringify1(polh)}_pon-${stringify1(pon)}`

const layoutNavTsx = (polh: string | boolean, pon: string | boolean) => {
  const mark = toMark(polh, pon)
  return `import { root } from '../lib/root.js'
import { Link, NavLink, navigate } from '../lib/navigate.js'
export const layout = root.lets('layout', 'layout_${toMark(polh, pon)}', '/${toMark(polh, pon)}')
  .prefetchPageOnLinkHover(${stringify2(polh)})
  .prefetchPageOnNavigate(${stringify2(pon)})
  .layout(({ children }) => (
    <>
      <nav>
        <Link to="/${mark}">/</Link>
        <Link to="/${mark}/with-server">/with-server</Link>
        <Link to="/${mark}/with-client">/with-client</Link>
        <Link to="/${mark}/with-both" onClick={(e) => { e.preventDefault(); navigate.to('/${mark}/with-both') }}>/with-both</Link>
        <Link to="/${mark}/with-related-query">/with-related-query</Link>
        <Link to="/${mark}/with-mounted-query">/with-mounted-query</Link>
        <NavLink to="/${mark}/with-none">/with-none</NavLink>
      </nav>
      <hr />
      {children}
    </>
  ))
`
}

const pageHomeTsx = (mark: string) => `import { layout } from './layout.js'
export const homePage = layout.lets('page', 'home_${mark}', '/').page(() => <div id="home">home</div>)
`

const pageWithServerTsx = (mark: string) => `import { layout } from './layout.js'
export const withServerPage = layout.lets('page', 'withServer_${mark}', 'with-server')
  .loader(async () => {
    await new Promise((r) => setTimeout(r, ${loaderDuration}))
    return { x: 1 }
  })
  .page(({ data }) => <div id="with-server">{data.x}</div>)
`

const pageWithClientTsx = (mark: string) => `import { layout } from './layout.js'
export const withClientPage = layout.lets('page', 'withClient_${mark}', 'with-client')
  .clientLoader(async () => {
    await new Promise((r) => setTimeout(r, ${loaderDuration}))
    return { x: 1 }
  })
  .page(({ data }) => <div id="with-client">{data.x}</div>)
`

const pageWithBothTsx = (mark: string) => `import { layout } from './layout.js'
export const withBothPage = layout.lets('page', 'withBoth_${mark}', 'with-both')
  .loader(async () => {
    await new Promise((r) => setTimeout(r, ${loaderDuration / 2}))
    return { a: 1 }
  })
  .clientLoader(async ({ data }) => {
    await new Promise((r) => setTimeout(r, ${loaderDuration / 2}))
    return { ...data, b: 2 }
  })
  .page(({ data }) => <div id="with-both">{data.a},{data.b}</div>)
`

const pageWithRelatedQueryTsx = (mark: string) => `import { layout } from './layout.js'
import { root } from '../lib/root.js'
export const relatedQuery = root.lets('query', 'relatedQuery_${mark}')
  .loader(async () => {
    await new Promise((r) => setTimeout(r, ${loaderDuration}))
    return { x: 1 }
  })
  .query()
export const withRelatedQueryPage = layout.lets('page', 'withRelatedQuery_${mark}', 'with-related-query')
  .relatedQuery(relatedQuery)
  .page(({ data }) => <div id="with-related-query">{data.x}</div>)
`

const pageWithMountedQueryTsx = (mark: string) => `import { layout } from './layout.js'
import { root } from '../lib/root.js'
export const mountedQuery = root.lets('query', 'mountedQuery_${mark}')
  .loader(async () => {
    await new Promise((r) => setTimeout(r, ${loaderDuration}))
    return { x: 1 }
  })
  .query()
export const withMountedQueryPage = layout.lets('page', 'withMountedQuery_${mark}', 'with-mounted-query')
  .with(mountedQuery)
  .page(({ data }) => <div id="with-mounted-query">{data.x}</div>)
`

const pageWithNoneTsx = (mark: string) => `import { layout } from './layout.js'
export const withNonePage = layout.lets('page', 'withNone_${mark}', '/with-none').page(() => <div id="with-none">none</div>)
`

async function writePages(tp: TestProjectOneClient) {
  const polhs = [false, true]
  const pons = [false, true]

  for (const polh of polhs) {
    for (const pon of pons) {
      const mark = toMark(polh, pon)
      await tp.write(`src/${mark}/layout.tsx`, layoutNavTsx(polh, pon))
      await tp.write(`src/${mark}/home.tsx`, pageHomeTsx(mark))
      await tp.write(`src/${mark}/with-server.tsx`, pageWithServerTsx(mark))
      await tp.write(`src/${mark}/with-client.tsx`, pageWithClientTsx(mark))
      await tp.write(`src/${mark}/with-both.tsx`, pageWithBothTsx(mark))
      await tp.write(`src/${mark}/with-related-query.tsx`, pageWithRelatedQueryTsx(mark))
      await tp.write(`src/${mark}/with-mounted-query.tsx`, pageWithMountedQueryTsx(mark))
      await tp.write(`src/${mark}/with-none.tsx`, pageWithNoneTsx(mark))
    }
  }
}

async function navigatePages(
  tp: TestProjectOneClient,
  hover: number,
  mark: string,
): Promise<{ tale: string; requestsTale: string; page: PlaywrightPage }> {
  const page = await tp.gotoServer(`/${mark}`)
  const click = async (selector: string) => {
    const link = page.original.getByRole('link', { name: selector, exact: true })
    await link.hover()
    await new Promise((resolve) => setTimeout(resolve, hover))
    await link.click()
  }
  await new Promise((resolve) => setTimeout(resolve, 1000))
  await page.waitContent('#home')

  await click('/with-server')
  await page.waitContent('#with-server')

  await click('/with-client')
  await page.waitContent('#with-client')

  await click('/with-both')
  await page.waitContent('#with-both')

  await click('/with-related-query')
  await page.waitContent('#with-related-query')

  await click('/with-mounted-query')
  await page.waitContent('#with-mounted-query')

  await click('/with-none')
  await page.waitContent('#with-none')

  return { tale: getTale(page, mark), requestsTale: getRequestsTale(page, mark), page }
}

const getRequestsTale = (page: PlaywrightPage, mark: string) => {
  return page.requestsTale
    .replaceAll(`/${mark}/`, '/')
    .replaceAll(`/${mark}`, '/')
    .replaceAll(`_${mark}`, '')
    .replaceAll(`-${toKebabCase(mark)}`, '')
    .replaceAll(`with-server`, 'withServer')
    .replaceAll(`with-client`, 'withClient')
    .replaceAll(`with-both`, 'withBoth')
    .replaceAll(`with-related-query`, 'withRelatedQuery')
    .replaceAll(`with-mounted-query`, 'withMountedQuery')
    .replaceAll(`with-none`, 'withNone')
    .replaceAll(`related-query`, 'relatedQuery')
    .replaceAll(`mounted-query`, 'mountedQuery')
  // -polh-false-pon-false → ''
}

const getTale = (page: PlaywrightPage, mark: string) => {
  const originalTale = page.tale
  return originalTale
    .replaceAll(
      `
  nav:
    a: /
    a: /with-server
    a: /with-client
    a: /with-both
    a: /with-related-query
    a: /with-mounted-query
    a: /with-none
  hr:`,
      '',
    )
    .replaceAll(`/${mark}/`, '/')
    .replaceAll(`/${mark}`, '/')
}

type ItFn = (done: (err?: unknown) => void) => void | Promise<void>

let preventFinalFilesCleanup = false
function wrp(
  options: Required<
    Pick<TestProjectOneClientFactoryCreateProjectOptions, 'prefetchPageOnLinkHover' | 'prefetchPageOnNavigate'>
  > & {
    mode: 'dev' | 'build'
    bundler: 'bun' | 'vite'
  },
  callback: ({ mark }: { mark: string }) => void | Promise<void>,
): ItFn {
  const mark = toMark(options.prefetchPageOnLinkHover, options.prefetchPageOnNavigate)
  return async () => {
    if (options.mode === 'build' && options.bundler === 'bun') {
      // it is randmoly false negative tests becouse of unknown bun bug, after buld it set main index js file to layout not to index.client.ts
      return
    }
    await callback({ mark })
  }
}

const initTestProject = async (
  options: TestProjectOneClientFactoryCreateProjectOptions & { preserve?: boolean; mode: 'dev' | 'build' },
) => {
  const { preserve = false, mode, ...tpOptions } = options
  if (preserve) {
    preventFinalFilesCleanup = true
  }
  const tp = tpf.create({ ...tpOptions, fixedId: preserve })
  try {
    const tries = 3
    for (let tryIndex = 0; tryIndex < tries; tryIndex++) {
      try {
        await tp.cleanup('ports')
        await tp.init()
        await writePages(tp)
        if (mode === 'dev') {
          tp.spawn(['bun', 'run', 'dev'])
        } else {
          const bp = tp.spawn(['bun', 'run', 'build'])
          await bp.exited
          tp.spawn(['bun', 'run', 'start'])
        }
        await tp.waitStarted()
      } catch (error) {
        if (tryIndex === tries - 1) {
          throw error
        }
        continue
      }
      break
    }
    const engine = await tp.importEngine()
    return { tp, engine }
  } catch (error) {
    await tp.cleanup({ files: !preserve, ports: true, processes: true })
    throw error
  }
}

describe('prefetch-page', () => {
  beforeAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
    tpf.setBrowser(await PlaywrightBrowser.init())
  })

  afterAll(async () => {
    await tpf.cleanup({ files: !preventFinalFilesCleanup, processes: true, ports: true, browser: true })
  })

  const modes = ['dev', 'build']
  const bundlers = ['bun', 'vite']

  describe.each(bundlers as ['bun', 'vite'])('%s', (bundler) => {
    describe.each(modes as ['dev', 'build'])('%s', (mode) => {
      describe('ssr', () => {
        let tp: TestProjectOneClient
        const preserve = false

        beforeAll(async () => {
          const result = await initTestProject({
            ssr: true,
            mode,
            vite: bundler === 'vite',
            preserve,
          })
          tp = result.tp
        })

        afterAll(async () => {
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          void tp?.cleanup({ files: !preserve, processes: true, ports: true })
        })

        it.concurrent(
          'polh=false, pon=false, hover=smaller',
          wrp({ prefetchPageOnLinkHover: false, prefetchPageOnNavigate: false, mode, bundler }, async ({ mark }) => {
            const { tale, requestsTale } = await navigatePages(tp, hoverSmallerThanLoaderDuration, mark)
            expect(tale).toMatchInlineSnapshot(`
          "
          /
            #home: home
            
          /with-server
            div: Loading...
            
            #with-server: 1
            
          /with-client
            div: Loading...
            
            #with-client: 1
            
          /with-both
            div: Loading...
            
            #with-both: 1,2
            
          /with-related-query
            div: Loading...
            
            #with-related-query: 1
            
          /with-mounted-query
            div: Loading...
            
            #with-mounted-query: 1
            
          /with-none
            #with-none: none
            "
        `)
            expect(requestsTale).toMatchInlineSnapshot(`
          "
          GET /
          root.page.withServer (data)
          root.page.withBoth (data)
          root.query.relatedQuery (data)
          root.query.mountedQuery (data)"
        `)
          }),
          {
            retry: 3,
          },
        )

        it.concurrent(
          'polh=false, pon=false, hover=bigger',
          wrp({ prefetchPageOnLinkHover: false, prefetchPageOnNavigate: false, mode, bundler }, async ({ mark }) => {
            const { tale, requestsTale } = await navigatePages(tp, hoverBiggerThanLoaderDuration, mark)
            expect(tale).toMatchInlineSnapshot(`
            "
            /
              #home: home
              
            /with-server
              div: Loading...
              
              #with-server: 1
              
            /with-client
              div: Loading...
              
              #with-client: 1
              
            /with-both
              div: Loading...
              
              #with-both: 1,2
              
            /with-related-query
              div: Loading...
              
              #with-related-query: 1
              
            /with-mounted-query
              div: Loading...
              
              #with-mounted-query: 1
              
            /with-none
              #with-none: none
              "
          `)
            expect(requestsTale).toMatchInlineSnapshot(`
            "
            GET /
            root.page.withServer (data)
            root.page.withBoth (data)
            root.query.relatedQuery (data)
            root.query.mountedQuery (data)"
          `)
          }),
          {
            retry: 3,
          },
        )

        it.concurrent(
          'polh=false, pon=true, hover=smaller',
          wrp({ prefetchPageOnLinkHover: false, prefetchPageOnNavigate: true, mode, bundler }, async ({ mark }) => {
            const { tale, requestsTale } = await navigatePages(tp, hoverSmallerThanLoaderDuration, mark)
            expect(tale).toMatchInlineSnapshot(`
              "
              /
                #home: home
                
              /with-server
                #with-server: 1
                
              /with-client
                #with-client: 1
                
              /with-both
                #with-both: 1,2
                
              /with-related-query
                #with-related-query: 1
                
              /with-mounted-query
                #with-mounted-query: 1
                
              /with-none
                #with-none: none
                "
            `)
            expect(requestsTale).toMatchInlineSnapshot(`
              "
              GET /
              root.page.withServer (queryClientDehydratedState)
              root.page.withClient (queryClientDehydratedState)
              root.page.withBoth (queryClientDehydratedState)
              root.page.withRelatedQuery (queryClientDehydratedState)
              root.page.withMountedQuery (queryClientDehydratedState)
              root.page.withNone (queryClientDehydratedState)"
            `)
          }),
          {
            retry: 3,
          },
        )

        it.concurrent(
          'polh=false, pon=true, hover=bigger',
          wrp({ prefetchPageOnLinkHover: false, prefetchPageOnNavigate: true, mode, bundler }, async ({ mark }) => {
            const { tale, requestsTale } = await navigatePages(tp, hoverBiggerThanLoaderDuration, mark)
            expect(tale).toMatchInlineSnapshot(`
              "
              /
                #home: home
                
              /with-server
                #with-server: 1
                
              /with-client
                #with-client: 1
                
              /with-both
                #with-both: 1,2
                
              /with-related-query
                #with-related-query: 1
                
              /with-mounted-query
                #with-mounted-query: 1
                
              /with-none
                #with-none: none
                "
            `)
            expect(requestsTale).toMatchInlineSnapshot(`
              "
              GET /
              root.page.withServer (queryClientDehydratedState)
              root.page.withClient (queryClientDehydratedState)
              root.page.withBoth (queryClientDehydratedState)
              root.page.withRelatedQuery (queryClientDehydratedState)
              root.page.withMountedQuery (queryClientDehydratedState)
              root.page.withNone (queryClientDehydratedState)"
            `)
          }),
          {
            retry: 3,
          },
        )

        // it.concurrent(
        //   'polh=true, pon=false, hover=smaller',
        //   wrp({ prefetchPageOnLinkHover: true, prefetchPageOnNavigate: false, mode, bundler }, async ({ mark }) => {
        //     const { tale, requestsTale, page } = await navigatePages(tp, hoverSmallerThanLoaderDuration, mark)
        //     expect(tale).toMatchInlineSnapshot(`
        //       "
        //       /
        //         #home: home

        //       /with-server
        //         div: Loading...

        //         #with-server: 1

        //       /with-client
        //         div: Loading...

        //         #with-client: 1

        //       /with-both
        //         div: Loading...

        //         #with-both: 1,2

        //       /with-related-query
        //         div: Loading...

        //         #with-related-query: 1

        //       /with-mounted-query
        //         div: Loading...

        //         #with-mounted-query: 1

        //       /with-none
        //         #with-none: none
        //         "
        //     `)
        //     // requests looks ugly, but behavior is correct
        //     // so better use same policy for prefetchPageOnLinkHover and prefetchPageOnNavigate
        //     expect(requestsTale.split('\n').sort().join('\n')).toMatchInlineSnapshot(`
        //       "
        //       GET /
        //       root.page.withBoth (data)
        //       root.page.withBoth (queryClientDehydratedState)
        //       root.page.withClient (queryClientDehydratedState)
        //       root.page.withMountedQuery (queryClientDehydratedState)
        //       root.page.withNone (queryClientDehydratedState)
        //       root.page.withRelatedQuery (queryClientDehydratedState)
        //       root.page.withServer (data)
        //       root.page.withServer (queryClientDehydratedState)
        //       root.query.mountedQuery (data)
        //       root.query.relatedQuery (data)"
        //     `)
        //   }),
        //   {
        //     retry: 3,
        //   },
        // )

        it.concurrent(
          'polh=true, pon=false, hover=bigger',
          wrp({ prefetchPageOnLinkHover: true, prefetchPageOnNavigate: false, mode, bundler }, async ({ mark }) => {
            const { tale, requestsTale } = await navigatePages(tp, hoverBiggerThanLoaderDuration, mark)
            expect(tale).toMatchInlineSnapshot(`
              "
              /
                #home: home
                
              /with-server
                #with-server: 1
                
              /with-client
                #with-client: 1
                
              /with-both
                #with-both: 1,2
                
              /with-related-query
                #with-related-query: 1
                
              /with-mounted-query
                #with-mounted-query: 1
                
              /with-none
                #with-none: none
                "
            `)
            expect(requestsTale).toMatchInlineSnapshot(`
              "
              GET /
              root.page.withServer (queryClientDehydratedState)
              root.page.withClient (queryClientDehydratedState)
              root.page.withBoth (queryClientDehydratedState)
              root.page.withRelatedQuery (queryClientDehydratedState)
              root.page.withMountedQuery (queryClientDehydratedState)
              root.page.withNone (queryClientDehydratedState)"
            `)
          }),
          {
            retry: 3,
          },
        )

        it.concurrent(
          'polh=true, pon=true, hover=smaller',
          wrp({ prefetchPageOnLinkHover: true, prefetchPageOnNavigate: true, mode, bundler }, async ({ mark }) => {
            const { tale, requestsTale } = await navigatePages(tp, hoverSmallerThanLoaderDuration, mark)
            expect(tale).toMatchInlineSnapshot(`
              "
              /
                #home: home
                
              /with-server
                #with-server: 1
                
              /with-client
                #with-client: 1
                
              /with-both
                #with-both: 1,2
                
              /with-related-query
                #with-related-query: 1
                
              /with-mounted-query
                #with-mounted-query: 1
                
              /with-none
                #with-none: none
                "
            `)
            expect(requestsTale).toMatchInlineSnapshot(`
              "
              GET /
              root.page.withServer (queryClientDehydratedState)
              root.page.withClient (queryClientDehydratedState)
              root.page.withBoth (queryClientDehydratedState)
              root.page.withRelatedQuery (queryClientDehydratedState)
              root.page.withMountedQuery (queryClientDehydratedState)
              root.page.withNone (queryClientDehydratedState)"
            `)
          }),
          {
            retry: 3,
          },
        )

        it.concurrent(
          'polh=true, pon=true, hover=bigger',
          wrp({ prefetchPageOnLinkHover: true, prefetchPageOnNavigate: true, mode, bundler }, async ({ mark }) => {
            const { tale, requestsTale } = await navigatePages(tp, hoverBiggerThanLoaderDuration, mark)
            expect(tale).toMatchInlineSnapshot(`
              "
              /
                #home: home
                
              /with-server
                #with-server: 1
                
              /with-client
                #with-client: 1
                
              /with-both
                #with-both: 1,2
                
              /with-related-query
                #with-related-query: 1
                
              /with-mounted-query
                #with-mounted-query: 1
                
              /with-none
                #with-none: none
                "
            `)
            expect(requestsTale).toMatchInlineSnapshot(`
              "
              GET /
              root.page.withServer (queryClientDehydratedState)
              root.page.withClient (queryClientDehydratedState)
              root.page.withBoth (queryClientDehydratedState)
              root.page.withRelatedQuery (queryClientDehydratedState)
              root.page.withMountedQuery (queryClientDehydratedState)
              root.page.withNone (queryClientDehydratedState)"
            `)
          }),
          {
            retry: 3,
          },
        )
      })

      describe('spa', () => {
        let tp: TestProjectOneClient
        const preserve = false

        beforeAll(async () => {
          const result = await initTestProject({
            ssr: false,
            mode,
            vite: bundler === 'vite',
            preserve,
          })
          tp = result.tp
        })

        afterAll(async () => {
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          void tp?.cleanup({ files: !preserve, processes: true, ports: true })
        })

        it.concurrent(
          'polh=false, pon=false, hover=smaller',
          wrp({ prefetchPageOnLinkHover: false, prefetchPageOnNavigate: false, mode, bundler }, async ({ mark }) => {
            const { tale, requestsTale } = await navigatePages(tp, hoverSmallerThanLoaderDuration, mark)
            expect(tale).toMatchInlineSnapshot(`
            "
            /
              (Empty)
              
              #home: home
              
            /with-server
              div: Loading...
              
              #with-server: 1
              
            /with-client
              div: Loading...
              
              #with-client: 1
              
            /with-both
              div: Loading...
              
              #with-both: 1,2
              
            /with-related-query
              div: Loading...
              
              #with-related-query: 1
              
            /with-mounted-query
              div: Loading...
              
              #with-mounted-query: 1
              
            /with-none
              #with-none: none
              "
          `)
            expect(requestsTale).toMatchInlineSnapshot(`
            "
            GET /
            root.page.withServer (data)
            root.page.withBoth (data)
            root.query.relatedQuery (data)
            root.query.mountedQuery (data)"
          `)
          }),
          {
            retry: 3,
          },
        )

        it.concurrent(
          'polh=false, pon=false, hover=bigger',
          wrp({ prefetchPageOnLinkHover: false, prefetchPageOnNavigate: false, mode, bundler }, async ({ mark }) => {
            const { tale, requestsTale } = await navigatePages(tp, hoverBiggerThanLoaderDuration, mark)
            expect(tale).toMatchInlineSnapshot(`
            "
            /
              (Empty)
              
              #home: home
              
            /with-server
              div: Loading...
              
              #with-server: 1
              
            /with-client
              div: Loading...
              
              #with-client: 1
              
            /with-both
              div: Loading...
              
              #with-both: 1,2
              
            /with-related-query
              div: Loading...
              
              #with-related-query: 1
              
            /with-mounted-query
              div: Loading...
              
              #with-mounted-query: 1
              
            /with-none
              #with-none: none
              "
          `)
            expect(requestsTale).toMatchInlineSnapshot(`
            "
            GET /
            root.page.withServer (data)
            root.page.withBoth (data)
            root.query.relatedQuery (data)
            root.query.mountedQuery (data)"
          `)
          }),
          {
            retry: 3,
          },
        )

        it.concurrent(
          'polh=false, pon=true, hover=smaller',
          wrp({ prefetchPageOnLinkHover: false, prefetchPageOnNavigate: true, mode, bundler }, async ({ mark }) => {
            const { tale, requestsTale } = await navigatePages(tp, hoverSmallerThanLoaderDuration, mark)
            // mounted queries not preloaded, this the reason why we have relatedQuery
            // mounted queries can be prefetched only in ssr via fetching queryClientDehydratedState
            expect(tale).toMatchInlineSnapshot(`
              "
              /
                (Empty)
                
                #home: home
                
              /with-server
                #with-server: 1
                
              /with-client
                #with-client: 1
                
              /with-both
                #with-both: 1,2
                
              /with-related-query
                #with-related-query: 1
                
              /with-mounted-query
                div: Loading...
                
                #with-mounted-query: 1
                
              /with-none
                #with-none: none
                "
            `)
            expect(requestsTale).toMatchInlineSnapshot(`
              "
              GET /
              root.page.withServer (data)
              root.page.withBoth (data)
              root.query.relatedQuery (data)
              root.query.mountedQuery (data)"
            `)
          }),
          {
            retry: 3,
          },
        )

        it.concurrent(
          'polh=false, pon=true, hover=bigger',
          wrp({ prefetchPageOnLinkHover: false, prefetchPageOnNavigate: true, mode, bundler }, async ({ mark }) => {
            const { tale, requestsTale } = await navigatePages(tp, hoverBiggerThanLoaderDuration, mark)
            expect(tale).toMatchInlineSnapshot(`
              "
              /
                (Empty)
                
                #home: home
                
              /with-server
                #with-server: 1
                
              /with-client
                #with-client: 1
                
              /with-both
                #with-both: 1,2
                
              /with-related-query
                #with-related-query: 1
                
              /with-mounted-query
                div: Loading...
                
                #with-mounted-query: 1
                
              /with-none
                #with-none: none
                "
            `)
            expect(requestsTale).toMatchInlineSnapshot(`
              "
              GET /
              root.page.withServer (data)
              root.page.withBoth (data)
              root.query.relatedQuery (data)
              root.query.mountedQuery (data)"
            `)
          }),
          {
            retry: 3,
          },
        )

        it.concurrent(
          'polh=true, pon=false, hover=smaller',
          wrp({ prefetchPageOnLinkHover: true, prefetchPageOnNavigate: false, mode, bundler }, async ({ mark }) => {
            const { tale, requestsTale } = await navigatePages(tp, hoverSmallerThanLoaderDuration, mark)
            expect(tale).toMatchInlineSnapshot(`
              "
              /
                (Empty)
                
                #home: home
                
              /with-server
                div: Loading...
                
                #with-server: 1
                
              /with-client
                div: Loading...
                
                #with-client: 1
                
              /with-both
                div: Loading...
                
                #with-both: 1,2
                
              /with-related-query
                div: Loading...
                
                #with-related-query: 1
                
              /with-mounted-query
                div: Loading...
                
                #with-mounted-query: 1
                
              /with-none
                #with-none: none
                "
            `)
            expect(requestsTale).toMatchInlineSnapshot(`
              "
              GET /
              root.page.withServer (data)
              root.page.withBoth (data)
              root.query.relatedQuery (data)
              root.query.mountedQuery (data)"
            `)
          }),
          {
            retry: 3,
          },
        )

        it.concurrent(
          'polh=true, pon=false, hover=bigger',
          wrp({ prefetchPageOnLinkHover: true, prefetchPageOnNavigate: false, mode, bundler }, async ({ mark }) => {
            const { tale, requestsTale } = await navigatePages(tp, hoverBiggerThanLoaderDuration, mark)
            expect(tale).toMatchInlineSnapshot(`
              "
              /
                (Empty)
                
                #home: home
                
              /with-server
                #with-server: 1
                
              /with-client
                #with-client: 1
                
              /with-both
                #with-both: 1,2
                
              /with-related-query
                #with-related-query: 1
                
              /with-mounted-query
                div: Loading...
                
                #with-mounted-query: 1
                
              /with-none
                #with-none: none
                "
            `)
            expect(requestsTale).toMatchInlineSnapshot(`
              "
              GET /
              root.page.withServer (data)
              root.page.withBoth (data)
              root.query.relatedQuery (data)
              root.query.mountedQuery (data)"
            `)
          }),
          {
            retry: 3,
          },
        )

        it.concurrent(
          'polh=true, pon=true, hover=smaller',
          wrp({ prefetchPageOnLinkHover: true, prefetchPageOnNavigate: true, mode, bundler }, async ({ mark }) => {
            const { tale, requestsTale } = await navigatePages(tp, hoverSmallerThanLoaderDuration, mark)
            expect(tale).toMatchInlineSnapshot(`
              "
              /
                (Empty)
                
                #home: home
                
              /with-server
                #with-server: 1
                
              /with-client
                #with-client: 1
                
              /with-both
                #with-both: 1,2
                
              /with-related-query
                #with-related-query: 1
                
              /with-mounted-query
                div: Loading...
                
                #with-mounted-query: 1
                
              /with-none
                #with-none: none
                "
            `)
            expect(requestsTale).toMatchInlineSnapshot(`
            "
            GET /
            root.page.withServer (data)
            root.page.withBoth (data)
            root.query.relatedQuery (data)
            root.query.mountedQuery (data)"
          `)
          }),
          {
            retry: 3,
          },
        )

        it.concurrent(
          'polh=true, pon=true, hover=bigger',
          wrp({ prefetchPageOnLinkHover: true, prefetchPageOnNavigate: true, mode, bundler }, async ({ mark }) => {
            const { tale, requestsTale } = await navigatePages(tp, hoverBiggerThanLoaderDuration, mark)
            expect(tale).toMatchInlineSnapshot(`
              "
              /
                (Empty)
                
                #home: home
                
              /with-server
                #with-server: 1
                
              /with-client
                #with-client: 1
                
              /with-both
                #with-both: 1,2
                
              /with-related-query
                #with-related-query: 1
                
              /with-mounted-query
                div: Loading...
                
                #with-mounted-query: 1
                
              /with-none
                #with-none: none
                "
            `)
            expect(requestsTale).toMatchInlineSnapshot(`
              "
              GET /
              root.page.withServer (data)
              root.page.withBoth (data)
              root.query.relatedQuery (data)
              root.query.mountedQuery (data)"
            `)
          }),
          {
            retry: 3,
          },
        )
      })
    })
  })
})
