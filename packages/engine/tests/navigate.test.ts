import { afterAll, beforeAll, describe, expect, it, setDefaultTimeout } from 'bun:test'
import type { PlaywrightPage } from './utils/playwright.js'
import { PlaywrightBrowser } from './utils/playwright.js'
import type { TestProject, TestProjectFactoryCreateProjectOptions } from './utils/project.js'
import { TestProjectFactory } from './utils/project.js'
import type { Engine } from '../src/engine.js'

setDefaultTimeout(20000)

const tpf = TestProjectFactory.create({
  namespace: 'navigate',
  portsRange: [3400, 3499],
})

const loaderDuration = 300
const hoverBiggerThanLoaderDuration = 400
const hoverSmallerThanLoaderDuration = 150

const layoutNavTsx = `import { root } from '../lib/root.js'
import { SimpleLink } from '@point0/wouter'
export const navLayout = root.lets('layout', 'navLayout').layout(({ children }) => (
  <div>
    <nav>
      <SimpleLink to="/">/</SimpleLink>
      <SimpleLink to="/with-server">/with-server</SimpleLink>
      <SimpleLink to="/with-client">/with-client</SimpleLink>
      <SimpleLink to="/with-both">/with-both</SimpleLink>
      <SimpleLink to="/with-related-query">/with-related-query</SimpleLink>
      <SimpleLink to="/with-mounted-query">/with-mounted-query</SimpleLink>
      <SimpleLink to="/with-none">/with-none</SimpleLink>
    </nav>
    <hr />
    {children}
  </div>
))
`

const pageHomeTsx = `import { navLayout } from '../layouts/nav.js'
export const homePage = navLayout.lets('page', 'home', '/').page(() => <div id="home">home</div>)
`

const pageWithServerTsx = `import { navLayout } from '../layouts/nav.js'
export const withServerPage = navLayout.lets('page', 'withServer', 'with-server')
  .loader(async () => {
    await new Promise((r) => setTimeout(r, ${loaderDuration}))
    return { x: 1 }
  })
  .page(({ data }) => <div id="with-server">{data.x}</div>)
`

const pageWithClientTsx = `import { navLayout } from '../layouts/nav.js'
export const withClientPage = navLayout.lets('page', 'withClient', 'with-client')
  .clientLoader(async () => {
    await new Promise((r) => setTimeout(r, ${loaderDuration}))
    return { x: 1 }
  })
  .page(({ data }) => <div id="with-client">{data.x}</div>)
`

const pageWithBothTsx = `import { navLayout } from '../layouts/nav.js'
export const withBothPage = navLayout.lets('page', 'withBoth', 'with-both')
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

const pageWithRelatedQueryTsx = `import { navLayout } from '../layouts/nav.js'
import { root } from '../lib/root.js'
export const relatedQuery = root.lets('query', 'relatedQuery').loader(() => ({ x: 1 })).query()
export const withRelatedQueryPage = navLayout.lets('page', 'withRelatedQuery', 'with-related-query')
  .relatedQuery(relatedQuery)
  .page(({ data }) => <div id="with-related-query">{data.x}</div>)
`

const pageWithMountedQueryTsx = `import { navLayout } from '../layouts/nav.js'
import { root } from '../lib/root.js'
export const mountedQuery = root.lets('query', 'mountedQuery').loader(() => ({ x: 1 })).query()
export const withMountedQueryPage = navLayout.lets('page', 'withMountedQuery', 'with-mounted-query')
  .with(mountedQuery)
  .page(({ data }) => <div id="with-mounted-query">{data.x}</div>)
`

const pageWithNoneTsx = `import { navLayout } from '../layouts/nav.js'

export const withNonePage = navLayout.lets('page', 'withNone', '/with-none').page(() => <div id="with-none">none</div>)
`

async function writePages(tp: TestProject) {
  await tp.write('src/layouts/nav.tsx', layoutNavTsx)
  await tp.write('src/pages/home.tsx', pageHomeTsx)
  await tp.write('src/pages/with-server.tsx', pageWithServerTsx)
  await tp.write('src/pages/with-client.tsx', pageWithClientTsx)
  await tp.write('src/pages/with-both.tsx', pageWithBothTsx)
  await tp.write('src/pages/with-related-query.tsx', pageWithRelatedQueryTsx)
  await tp.write('src/pages/with-mounted-query.tsx', pageWithMountedQueryTsx)
  await tp.write('src/pages/with-none.tsx', pageWithNoneTsx)
}

async function navigatePages(
  tp: TestProject,
  hover: number | false,
): Promise<{ tale: string; requestsTale: string; page: PlaywrightPage }> {
  const page = await tp.gotoServer('/')
  const click = async (selector: string) => {
    const link = page.original.getByRole('link', { name: selector, exact: true })
    if (hover !== false) {
      await link.hover()
      // React's onMouseEnter is synthesized from mouseover/mouseout listeners.
      // Dispatch mouseover explicitly to make hover prefetch deterministic in tests.
      await link.dispatchEvent('mouseover')
      await new Promise((resolve) => setTimeout(resolve, hover))
    }
    await link.click()
  }
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

  return { tale: getTale(page), requestsTale: page.requestsTale, page }
}

const getTale = (page: PlaywrightPage) => {
  const originalTale = page.tale
  return originalTale.replaceAll(
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
}

type ItFn = (done: (err?: unknown) => any) => any

let preventFinalFilesCleanup = false
function wrp(
  options: TestProjectFactoryCreateProjectOptions & { preserve?: boolean },
  callback: ({ tp, engine }: { tp: TestProject; engine: Engine }) => any,
): ItFn
function wrp(callback: ({ tp, engine }: { tp: TestProject; engine: Engine }) => any): ItFn
function wrp(
  ...args:
    | [callback: ({ tp, engine }: { tp: TestProject; engine: Engine }) => any]
    | [
        options: TestProjectFactoryCreateProjectOptions & { preserve?: boolean },
        callback: ({ tp, engine }: { tp: TestProject; engine: Engine }) => any,
      ]
): ItFn {
  const [options, callback] = args.length === 1 ? [{}, args[0]] : args
  const { preserve = false, ...tpOptions } = options
  if (preserve) {
    preventFinalFilesCleanup = true
  }
  const tp = tpf.create({ ...tpOptions, fixedId: preserve })
  return async () => {
    try {
      const tries = 3
      for (let tryIndex = 0; tryIndex < tries; tryIndex++) {
        try {
          await tp.cleanup('ports')
          await tp.init()
          await writePages(tp)
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
      const engine = await tp.importEngine()
      await callback({ tp, engine })
      await tp.cleanup({ files: !preserve, ports: true, processes: true })
    } catch (error) {
      await tp.cleanup({ files: !preserve, ports: true, processes: true })
      throw error
    }
  }
}

describe('navigate', () => {
  beforeAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
    tpf.setBrowser(await PlaywrightBrowser.init())
  })

  afterAll(async () => {
    await tpf.cleanup({ files: !preventFinalFilesCleanup, processes: true, ports: true, browser: true })
  })

  describe('ssr', () => {
    it(
      'polh=false, pon=false, hover=false',
      wrp({ ssr: true, prefetchPageOnLinkHover: false, prefetchPageOnNavigate: false }, async ({ tp }) => {
        const { tale, requestsTale } = await navigatePages(tp, false)
        expect(tale).toMatchInlineSnapshot(`
          "/
            div:
              #home: home
            
          /with-server
            div:
              div: Loading...
            
            div:
              #with-server: 1
            
          /with-client
            div:
              div: Loading...
            
            div:
              #with-client: 1
            
          /with-both
            div:
              div: Loading...
            
            div:
              #with-both: 1,2
            
          /with-related-query
            div:
              div: Loading...
            
            div:
              #with-related-query: 1
            
          /with-mounted-query
            div:
              div: Loading...
            
            div:
              #with-mounted-query: 1
            
          /with-none
            div:
              #with-none: none
            "
        `)
        expect(requestsTale).toMatchInlineSnapshot()
      }),
    )

    it(
      'polh=false, pon=false, hover=bigger',
      wrp({ ssr: true, prefetchPageOnLinkHover: false, prefetchPageOnNavigate: false }, async ({ tp }) => {
        const { tale, requestsTale } = await navigatePages(tp, hoverBiggerThanLoaderDuration)
        expect(tale).toMatchInlineSnapshot(`
          "/
            div:
              #home: home
            
          /with-server
            div:
              div: Loading...
            
            div:
              #with-server: 1
            
          /with-client
            div:
              div: Loading...
            
            div:
              #with-client: 1
            
          /with-both
            div:
              div: Loading...
            
            div:
              #with-both: 1,2
            
          /with-related-query
            div:
              div: Loading...
            
            div:
              #with-related-query: 1
            
          /with-mounted-query
            div:
              div: Loading...
            
            div:
              #with-mounted-query: 1
            
          /with-none
            div:
              #with-none: none
            "
        `)
        expect(requestsTale).toMatchInlineSnapshot()
      }),
    )

    // skip hover=smaller becouse nothing should be changed when polh=false, pon=false

    it(
      'polh=false, pon=everything, hover=false',
      wrp({ ssr: true, prefetchPageOnLinkHover: false, prefetchPageOnNavigate: 'everything' }, async ({ tp }) => {
        const { tale, requestsTale } = await navigatePages(tp, false)
        expect(tale).toMatchInlineSnapshot(`
          "/
            div:
              #home: home
            
          /with-server
            div:
              #with-server: 1
            
          /with-client
            div:
              #with-client: 1
            
          /with-both
            div:
              #with-both: 1,2
            
          /with-related-query
            div:
              #with-related-query: 1
            
          /with-mounted-query
            div:
              #with-mounted-query: 1
            
          /with-none
            div:
              #with-none: none
            "
        `)
        expect(requestsTale).toMatchInlineSnapshot()
      }),
    )

    it(
      'polh=false, pon=everything, hover=bigger',
      wrp({ ssr: true, prefetchPageOnLinkHover: false, prefetchPageOnNavigate: 'everything' }, async ({ tp }) => {
        const { tale, requestsTale } = await navigatePages(tp, hoverBiggerThanLoaderDuration)
        expect(tale).toMatchInlineSnapshot(`
          "/
            div:
              #home: home
            
          /with-server
            div:
              #with-server: 1
            
          /with-client
            div:
              #with-client: 1
            
          /with-both
            div:
              #with-both: 1,2
            
          /with-related-query
            div:
              #with-related-query: 1
            
          /with-mounted-query
            div:
              #with-mounted-query: 1
            
          /with-none
            div:
              #with-none: none
            "
        `)
        expect(requestsTale).toMatchInlineSnapshot()
      }),
    )

    // skip hover=smaller becouse nothing should be changed when polh=false, pon=everything

    it(
      'polh=everything, pon=false, hover=false',
      wrp({ ssr: true, prefetchPageOnLinkHover: 'everything', prefetchPageOnNavigate: false }, async ({ tp }) => {
        const { tale, requestsTale } = await navigatePages(tp, false)
        expect(tale).toMatchInlineSnapshot(`
            "/
              div:
                #home: home
              
            /with-server
              div:
                div: Loading...
              
              div:
                #with-server: 1
              
            /with-client
              div:
                div: Loading...
              
              div:
                #with-client: 1
              
            /with-both
              div:
                div: Loading...
              
              div:
                #with-both: 1,2
              
            /with-related-query
              div:
                div: Loading...
              
              div:
                #with-related-query: 1
              
            /with-mounted-query
              div:
                div: Loading...
              
              div:
                #with-mounted-query: 1
              
            /with-none
              div:
                #with-none: none
              "
          `)
        expect(requestsTale).toMatchInlineSnapshot()
      }),
    )

    it(
      'polh=everything, pon=false, hover=bigger',
      wrp({ ssr: true, prefetchPageOnLinkHover: 'everything', prefetchPageOnNavigate: false }, async ({ tp }) => {
        const { tale, requestsTale } = await navigatePages(tp, hoverBiggerThanLoaderDuration)
        expect(tale).toMatchInlineSnapshot(`
            "/
              div:
                #home: home
              
            /with-server
              div:
                #with-server: 1
              
            /with-client
              div:
                #with-client: 1
              
            /with-both
              div:
                #with-both: 1,2
              
            /with-related-query
              div:
                #with-related-query: 1
              
            /with-mounted-query
              div:
                #with-mounted-query: 1
              
            /with-none
              div:
                #with-none: none
              "
          `)
        expect(requestsTale).toMatchInlineSnapshot(`
            "url GET /
            url GET /_bun/client/index-00000000565b345f.js
            point root.page.withServer
            point root.page.withClient
            point root.page.withBoth
            point root.page.withRelatedQuery
            point root.page.withMountedQuery
            point root.page.withNone"
          `)
      }),
    )

    it(
      'polh=everything, pon=false, hover=smaller',
      wrp({ ssr: true, prefetchPageOnLinkHover: 'everything', prefetchPageOnNavigate: false }, async ({ tp }) => {
        const { tale, requestsTale } = await navigatePages(tp, hoverSmallerThanLoaderDuration)
        expect(tale).toMatchInlineSnapshot(`
            "/
              div:
                #home: home
              
            /with-server
              div:
                div: Loading...
              
              div:
                #with-server: 1
              
            /with-client
              div:
                div: Loading...
              
              div:
                #with-client: 1
              
            /with-both
              div:
                div: Loading...
              
              div:
                #with-both: 1,2
              
            /with-related-query
              div:
                div: Loading...
              
              div:
                #with-related-query: 1
              
            /with-mounted-query
              div:
                div: Loading...
              
              div:
                #with-mounted-query: 1
              
            /with-none
              div:
                #with-none: none
              "
          `)
        expect(requestsTale).toMatchInlineSnapshot()
      }),
    )

    it(
      'polh=everything, pon=everything, hover=false',
      wrp(
        { ssr: true, prefetchPageOnLinkHover: 'everything', prefetchPageOnNavigate: 'everything' },
        async ({ tp }) => {
          const { tale, requestsTale } = await navigatePages(tp, false)
          expect(tale).toMatchInlineSnapshot(`
            "/
              div:
                #home: home
              
            /with-server
              div:
                #with-server: 1
              
            /with-client
              div:
                #with-client: 1
              
            /with-both
              div:
                #with-both: 1,2
              
            /with-related-query
              div:
                #with-related-query: 1
              
            /with-mounted-query
              div:
                #with-mounted-query: 1
              
            /with-none
              div:
                #with-none: none
              "
          `)
          expect(requestsTale).toMatchInlineSnapshot()
        },
      ),
    )

    it(
      'polh=everything, pon=everything, hover=bigger',
      wrp(
        { ssr: true, prefetchPageOnLinkHover: 'everything', prefetchPageOnNavigate: 'everything' },
        async ({ tp }) => {
          const { tale, requestsTale } = await navigatePages(tp, hoverBiggerThanLoaderDuration)
          expect(tale).toMatchInlineSnapshot(`
            "/
              div:
                #home: home
              
            /with-server
              div:
                #with-server: 1
              
            /with-client
              div:
                #with-client: 1
              
            /with-both
              div:
                #with-both: 1,2
              
            /with-related-query
              div:
                #with-related-query: 1
              
            /with-mounted-query
              div:
                #with-mounted-query: 1
              
            /with-none
              div:
                #with-none: none
              "
          `)
          expect(requestsTale).toMatchInlineSnapshot()
        },
      ),
    )

    it(
      'polh=everything, pon=everything, hover=smaller',
      wrp(
        { ssr: true, prefetchPageOnLinkHover: 'everything', prefetchPageOnNavigate: 'everything' },
        async ({ tp }) => {
          const { tale, requestsTale } = await navigatePages(tp, hoverSmallerThanLoaderDuration)
          expect(tale).toMatchInlineSnapshot(`
            "/
              div:
                #home: home
              
            /with-server
              div:
                #with-server: 1
              
            /with-client
              div:
                #with-client: 1
              
            /with-both
              div:
                #with-both: 1,2
              
            /with-related-query
              div:
                #with-related-query: 1
              
            /with-mounted-query
              div:
                #with-mounted-query: 1
              
            /with-none
              div:
                #with-none: none
              "
          `)
          expect(requestsTale).toMatchInlineSnapshot()
        },
      ),
    )
  })

  describe('spa', () => {
    it(
      'polh=false, pon=false, hover=false',
      wrp({ ssr: false, prefetchPageOnLinkHover: false, prefetchPageOnNavigate: false }, async ({ tp }) => {
        const { tale, requestsTale } = await navigatePages(tp, false)
        expect(tale).toMatchInlineSnapshot(`
          "/
            (Empty)
            
            div:
              #home: home
            
          /with-server
            div:
              div: Loading...
            
            div:
              #with-server: 1
            
          /with-client
            div:
              div: Loading...
            
            div:
              #with-client: 1
            
          /with-both
            div:
              div: Loading...
            
            div:
              #with-both: 1,2
            
          /with-related-query
            div:
              div: Loading...
            
            div:
              #with-related-query: 1
            
          /with-mounted-query
            div:
              div: Loading...
            
            div:
              #with-mounted-query: 1
            
          /with-none
            div:
              #with-none: none
            "
        `)
        expect(requestsTale).toMatchInlineSnapshot()
      }),
    )

    it(
      'polh=false, pon=false, hover=bigger',
      wrp({ ssr: false, prefetchPageOnLinkHover: false, prefetchPageOnNavigate: false }, async ({ tp }) => {
        const { tale, requestsTale } = await navigatePages(tp, hoverBiggerThanLoaderDuration)
        expect(tale).toMatchInlineSnapshot(`
          "/
            (Empty)
            
            div:
              #home: home
            
          /with-server
            div:
              div: Loading...
            
            div:
              #with-server: 1
            
          /with-client
            div:
              div: Loading...
            
            div:
              #with-client: 1
            
          /with-both
            div:
              div: Loading...
            
            div:
              #with-both: 1,2
            
          /with-related-query
            div:
              div: Loading...
            
            div:
              #with-related-query: 1
            
          /with-mounted-query
            div:
              div: Loading...
            
            div:
              #with-mounted-query: 1
            
          /with-none
            div:
              #with-none: none
            "
        `)
        expect(requestsTale).toMatchInlineSnapshot()
      }),
    )

    // skip hover=smaller becouse nothing should be changed when polh=false, pon=false

    it(
      'polh=false, pon=everything, hover=false',
      wrp({ ssr: false, prefetchPageOnLinkHover: false, prefetchPageOnNavigate: 'everything' }, async ({ tp }) => {
        const { tale, requestsTale } = await navigatePages(tp, false)
        expect(tale).toMatchInlineSnapshot(`
          "/
            (Empty)
            
            div:
              #home: home
            
          /with-server
            div:
              #with-server: 1
            
          /with-client
            div:
              #with-client: 1
            
          /with-both
            div:
              #with-both: 1,2
            
          /with-related-query
            div:
              #with-related-query: 1
            
          /with-mounted-query
            div:
              div: Loading...
            
            div:
              #with-mounted-query: 1
            
          /with-none
            div:
              #with-none: none
            "
        `)
        expect(requestsTale).toMatchInlineSnapshot()
      }),
    )

    it(
      'polh=false, pon=everything, hover=bigger',
      wrp({ ssr: false, prefetchPageOnLinkHover: false, prefetchPageOnNavigate: 'everything' }, async ({ tp }) => {
        const { tale, requestsTale } = await navigatePages(tp, hoverBiggerThanLoaderDuration)
        expect(tale).toMatchInlineSnapshot(`
          "/
            (Empty)
            
            div:
              #home: home
            
          /with-server
            div:
              #with-server: 1
            
          /with-client
            div:
              #with-client: 1
            
          /with-both
            div:
              #with-both: 1,2
            
          /with-related-query
            div:
              #with-related-query: 1
            
          /with-mounted-query
            div:
              div: Loading...
            
            div:
              #with-mounted-query: 1
            
          /with-none
            div:
              #with-none: none
            "
        `)
        expect(requestsTale).toMatchInlineSnapshot()
      }),
    )

    // skip hover=smaller becouse nothing should be changed when polh=false, pon=everything

    it(
      'polh=everything, pon=everything, hover=false',
      wrp(
        { ssr: false, prefetchPageOnLinkHover: 'everything', prefetchPageOnNavigate: 'everything' },
        async ({ tp }) => {
          const { tale, requestsTale } = await navigatePages(tp, false)
          expect(tale).toMatchInlineSnapshot(`
            "/
              (Empty)
              
              div:
                #home: home
              
            /with-server
              div:
                #with-server: 1
              
            /with-client
              div:
                #with-client: 1
              
            /with-both
              div:
                #with-both: 1,2
              
            /with-related-query
              div:
                #with-related-query: 1
              
            /with-mounted-query
              div:
                div: Loading...
              
              div:
                #with-mounted-query: 1
              
            /with-none
              div:
                #with-none: none
              "
          `)
          expect(requestsTale).toMatchInlineSnapshot()
        },
      ),
    )

    it(
      'polh=everything, pon=everything, hover=bigger',
      wrp(
        { ssr: false, prefetchPageOnLinkHover: 'everything', prefetchPageOnNavigate: 'everything' },
        async ({ tp }) => {
          const { tale, requestsTale } = await navigatePages(tp, hoverBiggerThanLoaderDuration)
          expect(tale).toMatchInlineSnapshot(`
            "/
              (Empty)
              
              div:
                #home: home
              
            /with-server
              div:
                #with-server: 1
              
            /with-client
              div:
                #with-client: 1
              
            /with-both
              div:
                #with-both: 1,2
              
            /with-related-query
              div:
                #with-related-query: 1
              
            /with-mounted-query
              div:
                div: Loading...
              
              div:
                #with-mounted-query: 1
              
            /with-none
              div:
                #with-none: none
              "
          `)
          expect(requestsTale).toMatchInlineSnapshot()
        },
      ),
    )

    it(
      'polh=everything, pon=everything, hover=smaller',
      wrp(
        { ssr: false, prefetchPageOnLinkHover: 'everything', prefetchPageOnNavigate: 'everything' },
        async ({ tp }) => {
          const { tale, requestsTale } = await navigatePages(tp, hoverSmallerThanLoaderDuration)
          expect(tale).toMatchInlineSnapshot(`
            "/
              (Empty)
              
              div:
                #home: home
              
            /with-server
              div:
                #with-server: 1
              
            /with-client
              div:
                #with-client: 1
              
            /with-both
              div:
                #with-both: 1,2
              
            /with-related-query
              div:
                #with-related-query: 1
              
            /with-mounted-query
              div:
                div: Loading...
              
              div:
                #with-mounted-query: 1
              
            /with-none
              div:
                #with-none: none
              "
          `)
          expect(requestsTale).toMatchInlineSnapshot()
        },
      ),
    )
  })
})
