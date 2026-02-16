import { Routes } from '@devp0nt/route0'
import { Point0 } from '@point0/core'
import type { PrefetchPagePolicy } from '@point0/core'
import { createLink, createNavLink, SimpleLink } from '@point0/wouter'
import { describe, expect, it, setDefaultTimeout } from 'bun:test'
import { createTestThings } from './utils/internal-testing.js'
import type { ItFn, TestThings } from './utils/internal-testing.js'
import { PlaywrightBrowser } from './utils/playwright.js'
import type { PlaywrightPage } from './utils/playwright.js'

// setDefaultTimeout(20000)
setDefaultTimeout(20000000)

const loaderDuration = 300
const hoverBiggerThanLoaderDuration = 400
const hoverSmallerThanLoaderDuration = 50

type RichTestThings = TestThings & {
  browser: PlaywrightBrowser
}

const createTestPoints = ({
  ssr,
  prefetchPageOnLinkHover,
  prefetchPageOnNavigate,
}: {
  ssr: boolean
  prefetchPageOnLinkHover: PrefetchPagePolicy | boolean
  prefetchPageOnNavigate: PrefetchPagePolicy | boolean
}) => {
  const routes = Routes.create({
    home: '/',
    withServer: '/with-server',
    withClient: '/with-client',
    withBoth: '/with-both',
    withRelatedQuery: '/with-related-query',
    withMountedQuery: '/with-mounted-query',
    withNone: '/with-none',
  })

  const Link = createLink(routes)
  const NavLink = createNavLink(routes)
  // const useNavigate = createUseNavigate(routes)
  // const navigate = createNavigate(routes, nativeNavigate)

  const root = Point0.lets('root', 'root')
    .ssr(ssr)
    .baseurl('http://localhost/')
    .loading(() => <div id="loading">...</div>)
    .error(({ error }) => <div id="error">{error.message}</div>)
    .prefetchPageOnLinkHover(prefetchPageOnLinkHover)
    .prefetchPageOnNavigate(prefetchPageOnNavigate)
    .queryOptions({
      retry: false,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false,
      refetchIntervalInBackground: false,
    })
    .root()
  const navLayout = root.lets('layout', 'navLayout').layout(({ children }) => (
    <>
      <nav>
        <SimpleLink to="/">/</SimpleLink>
        <SimpleLink to="/with-server">/with-server</SimpleLink>
        <Link to="/with-client">/with-client</Link>
        <SimpleLink to="/with-both">/with-both</SimpleLink>
        <SimpleLink to="/with-related-query">/with-related-query</SimpleLink>
        <SimpleLink to="/with-mounted-query">/with-mounted-query</SimpleLink>
        <NavLink to="/with-none">/with-none</NavLink>
      </nav>
      <hr />
      {children}
    </>
  ))

  const homePage = navLayout.lets('page', 'home', '/').page(() => <div id="home">home</div>)

  const withServerPage = navLayout
    .lets('page', 'withServer', 'with-server')
    .loader(async () => {
      await new Promise((resolve) => setTimeout(resolve, loaderDuration))
      return { x: 1 }
    })
    .page(({ data }) => <div id="with-server">{data.x}</div>)

  const withClientPage = navLayout
    .lets('page', 'withClient', 'with-client')
    .clientLoader(async () => {
      await new Promise((resolve) => setTimeout(resolve, loaderDuration))
      return { x: 1 }
    })
    .page(({ data }) => <div id="with-client">{data.x}</div>)

  const withBothPage = navLayout
    .lets('page', 'withBoth', 'with-both')
    .loader(async () => {
      await new Promise((resolve) => setTimeout(resolve, loaderDuration / 2))
      return { a: 1 }
    })
    .clientLoader(async ({ data }) => {
      await new Promise((resolve) => setTimeout(resolve, loaderDuration / 2))
      return { ...data, b: 2 }
    })
    .page(({ data }) => (
      <div id="with-both">
        {data.a},{data.b}
      </div>
    ))

  const relatedQuery = root
    .lets('query', 'relatedQuery')
    .loader(async () => {
      await new Promise((resolve) => setTimeout(resolve, loaderDuration))
      return { x: 1 }
    })
    .query()

  const withRelatedQueryPage = navLayout
    .lets('page', 'withRelatedQuery', 'with-related-query')
    .relatedQuery(relatedQuery)
    .page(({ data }) => <div id="with-related-query">{data.x}</div>)

  const mountedQuery = root
    .lets('query', 'mountedQuery')
    .loader(async () => {
      await new Promise((resolve) => setTimeout(resolve, loaderDuration))
      return { x: 1 }
    })
    .query()
  const withMountedQueryPage = navLayout
    .lets('page', 'withMountedQuery', 'with-mounted-query')
    .with(mountedQuery)
    .page(({ data }) => <div id="with-mounted-query">{data.x}</div>)

  const withNonePage = navLayout.lets('page', 'withNone', '/with-none').page(() => <div id="with-none">none</div>)
  const points = [
    root,
    navLayout,
    homePage,
    withServerPage,
    withClientPage,
    withBothPage,
    withRelatedQueryPage,
    withMountedQueryPage,
    withNonePage,
  ] as const
  return { points }
}

async function navigatePages(
  t: RichTestThings,
  hover: number,
): Promise<{ tale: string; requestsTale: string; page: PlaywrightPage }> {
  const page = await t.browser.goto(`http://localhost:${t.engine.clients[0].port}/`)
  const click = async (selector: string) => {
    const link = page.original.getByRole('link', { name: selector, exact: true })
    await link.hover()
    await new Promise((resolve) => setTimeout(resolve, hover))
    await link.click()
  }
  await page.waitContent('#home')

  await click('/with-server')
  await page.waitContent('#with-server')

  await click('/with-client')
  await new Promise((resolve) => setTimeout(resolve, 30000000))
  page.logStory()
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

function wrp(
  options: {
    ssr: boolean
    prefetchPageOnLinkHover: PrefetchPagePolicy | boolean
    prefetchPageOnNavigate: PrefetchPagePolicy | boolean
  },
  callback: (t: RichTestThings) => any,
): ItFn {
  const { ssr, prefetchPageOnLinkHover, prefetchPageOnNavigate } = options
  let richTestThings: RichTestThings | undefined
  let browser: PlaywrightBrowser | undefined
  return async () => {
    try {
      const tries = 3
      for (let tryIndex = 0; tryIndex < tries; tryIndex++) {
        try {
          const { points } = createTestPoints({ ssr, prefetchPageOnLinkHover, prefetchPageOnNavigate })
          const testThings = await createTestThings({
            points,
            engineOptions: { viteConfig: {} },
            preventClientDevServers: false,
          })
          browser = await PlaywrightBrowser.init()
          richTestThings = { ...testThings, browser }
          await testThings.engine.init()
          const x = await testThings.engine.serve()
          // await tp.waitStarted()
        } catch (error) {
          if (tryIndex === tries - 1) {
            throw error
          }
          continue
        }
        break
      }
      if (!richTestThings) {
        throw new Error('Rich test things not created')
      }
      await callback(richTestThings)
    } catch (error) {
      if (browser) {
        void browser.close()
      }
      throw error
    }
  }
}

describe('prefetch-page', () => {
  // beforeAll(async () => {
  //   await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
  //   tpf.setBrowser(await PlaywrightBrowser.init())
  // })

  // afterAll(async () => {
  //   await tpf.cleanup({ files: !preventFinalFilesCleanup, processes: true, ports: true, browser: true })
  // })

  describe('ssr', () => {
    it.only(
      'polh=false, pon=false, hover=smaller',
      wrp({ ssr: true, prefetchPageOnLinkHover: false, prefetchPageOnNavigate: false }, async (t) => {
        const { tale, requestsTale } = await navigatePages(t, hoverSmallerThanLoaderDuration)
        expect(tale).toMatchInlineSnapshot(`
          "/
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
          "GET /
          root.page.withServer (data)
          root.page.withBoth (data)
          root.query.relatedQuery (data)
          root.query.mountedQuery (data)"
        `)
      }),
    )

    it(
      'polh=false, pon=false, hover=bigger',
      wrp({ ssr: true, prefetchPageOnLinkHover: false, prefetchPageOnNavigate: false }, async (t) => {
        const { tale, requestsTale } = await navigatePages(t, hoverBiggerThanLoaderDuration)
        expect(tale).toMatchInlineSnapshot(`
            "/
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
            "GET /
            root.page.withServer (data)
            root.page.withBoth (data)
            root.query.relatedQuery (data)
            root.query.mountedQuery (data)"
          `)
      }),
    )

    it(
      'polh=false, pon=everything, hover=smaller',
      wrp({ ssr: true, prefetchPageOnLinkHover: false, prefetchPageOnNavigate: 'everything' }, async (t) => {
        const { tale, requestsTale } = await navigatePages(t, hoverSmallerThanLoaderDuration)
        expect(tale).toMatchInlineSnapshot(`
              "/
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
              "GET /
              root.page.withServer (queryClientDehydratedState)
              root.page.withClient (queryClientDehydratedState)
              root.page.withBoth (queryClientDehydratedState)
              root.page.withRelatedQuery (queryClientDehydratedState)
              root.page.withMountedQuery (queryClientDehydratedState)
              root.page.withNone (queryClientDehydratedState)"
            `)
      }),
    )

    it(
      'polh=false, pon=everything, hover=bigger',
      wrp({ ssr: true, prefetchPageOnLinkHover: false, prefetchPageOnNavigate: 'everything' }, async (t) => {
        const { tale, requestsTale } = await navigatePages(t, hoverBiggerThanLoaderDuration)
        expect(tale).toMatchInlineSnapshot(`
              "/
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
              "GET /
              root.page.withServer (queryClientDehydratedState)
              root.page.withClient (queryClientDehydratedState)
              root.page.withBoth (queryClientDehydratedState)
              root.page.withRelatedQuery (queryClientDehydratedState)
              root.page.withMountedQuery (queryClientDehydratedState)
              root.page.withNone (queryClientDehydratedState)"
            `)
      }),
    )

    it(
      'polh=everything, pon=false, hover=smaller',
      wrp({ ssr: true, prefetchPageOnLinkHover: 'everything', prefetchPageOnNavigate: false }, async (t) => {
        const { tale, requestsTale } = await navigatePages(t, hoverSmallerThanLoaderDuration)
        expect(tale).toMatchInlineSnapshot(`
              "/
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
        // requests looks ugly, but behavior is correct
        // so better use same policy for prefetchPageOnLinkHover and prefetchPageOnNavigate
        expect(requestsTale.split('\n').sort().join('\n')).toMatchInlineSnapshot(`
              "GET /
              root.page.withBoth (data)
              root.page.withBoth (queryClientDehydratedState)
              root.page.withClient (queryClientDehydratedState)
              root.page.withMountedQuery (queryClientDehydratedState)
              root.page.withNone (queryClientDehydratedState)
              root.page.withRelatedQuery (queryClientDehydratedState)
              root.page.withServer (data)
              root.page.withServer (queryClientDehydratedState)
              root.query.mountedQuery (data)
              root.query.relatedQuery (data)"
            `)
      }),
    )

    it(
      'polh=everything, pon=false, hover=bigger',
      wrp({ ssr: true, prefetchPageOnLinkHover: 'everything', prefetchPageOnNavigate: false }, async (t) => {
        const { tale, requestsTale } = await navigatePages(t, hoverBiggerThanLoaderDuration)
        expect(tale).toMatchInlineSnapshot(`
              "/
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
              "GET /
              root.page.withServer (queryClientDehydratedState)
              root.page.withClient (queryClientDehydratedState)
              root.page.withBoth (queryClientDehydratedState)
              root.page.withRelatedQuery (queryClientDehydratedState)
              root.page.withMountedQuery (queryClientDehydratedState)
              root.page.withNone (queryClientDehydratedState)"
            `)
      }),
    )

    it(
      'polh=everything, pon=everything, hover=smaller',
      wrp({ ssr: true, prefetchPageOnLinkHover: 'everything', prefetchPageOnNavigate: 'everything' }, async (t) => {
        const { tale, requestsTale } = await navigatePages(t, hoverSmallerThanLoaderDuration)
        expect(tale).toMatchInlineSnapshot(`
              "/
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
              "GET /
              root.page.withServer (queryClientDehydratedState)
              root.page.withClient (queryClientDehydratedState)
              root.page.withBoth (queryClientDehydratedState)
              root.page.withRelatedQuery (queryClientDehydratedState)
              root.page.withMountedQuery (queryClientDehydratedState)
              root.page.withNone (queryClientDehydratedState)"
            `)
      }),
    )

    it(
      'polh=everything, pon=everything, hover=bigger',
      wrp({ ssr: true, prefetchPageOnLinkHover: 'everything', prefetchPageOnNavigate: 'everything' }, async (t) => {
        const { tale, requestsTale } = await navigatePages(t, hoverBiggerThanLoaderDuration)
        expect(tale).toMatchInlineSnapshot(`
              "/
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
              "GET /
              root.page.withServer (queryClientDehydratedState)
              root.page.withClient (queryClientDehydratedState)
              root.page.withBoth (queryClientDehydratedState)
              root.page.withRelatedQuery (queryClientDehydratedState)
              root.page.withMountedQuery (queryClientDehydratedState)
              root.page.withNone (queryClientDehydratedState)"
            `)
      }),
    )
  })

  describe('spa', () => {
    it(
      'polh=false, pon=false, hover=smaller',
      wrp({ ssr: false, prefetchPageOnLinkHover: false, prefetchPageOnNavigate: false }, async (t) => {
        const { tale, requestsTale } = await navigatePages(t, hoverSmallerThanLoaderDuration)
        expect(tale).toMatchInlineSnapshot(`
            "/
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
            "GET /
            root.page.withServer (data)
            root.page.withBoth (data)
            root.query.relatedQuery (data)
            root.query.mountedQuery (data)"
          `)
      }),
    )

    it(
      'polh=false, pon=false, hover=bigger',
      wrp({ ssr: false, prefetchPageOnLinkHover: false, prefetchPageOnNavigate: false }, async (t) => {
        const { tale, requestsTale } = await navigatePages(t, hoverBiggerThanLoaderDuration)
        expect(tale).toMatchInlineSnapshot(`
            "/
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
            "GET /
            root.page.withServer (data)
            root.page.withBoth (data)
            root.query.relatedQuery (data)
            root.query.mountedQuery (data)"
          `)
      }),
    )

    it(
      'polh=false, pon=everything, hover=smaller',
      wrp({ ssr: false, prefetchPageOnLinkHover: false, prefetchPageOnNavigate: 'everything' }, async (t) => {
        const { tale, requestsTale } = await navigatePages(t, hoverSmallerThanLoaderDuration)
        // mounted queries not preloaded, this the reason why we have relatedQuery
        // mounted queries can be prefetched only in ssr via fetching queryClientDehydratedState
        expect(tale).toMatchInlineSnapshot(`
              "/
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
              "GET /
              root.page.withServer (data)
              root.page.withBoth (data)
              root.query.relatedQuery (data)
              root.query.mountedQuery (data)"
            `)
      }),
    )

    it(
      'polh=false, pon=everything, hover=bigger',
      wrp({ ssr: false, prefetchPageOnLinkHover: false, prefetchPageOnNavigate: 'everything' }, async (t) => {
        const { tale, requestsTale } = await navigatePages(t, hoverBiggerThanLoaderDuration)
        expect(tale).toMatchInlineSnapshot(`
              "/
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
              "GET /
              root.page.withServer (data)
              root.page.withBoth (data)
              root.query.relatedQuery (data)
              root.query.mountedQuery (data)"
            `)
      }),
    )

    it(
      'polh=everything, pon=false, hover=smaller',
      wrp({ ssr: false, prefetchPageOnLinkHover: 'everything', prefetchPageOnNavigate: false }, async (t) => {
        const { tale, requestsTale } = await navigatePages(t, 10)
        expect(tale).toMatchInlineSnapshot(`
              "/
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
              "GET /
              root.page.withServer (data)
              root.page.withBoth (data)
              root.query.relatedQuery (data)
              root.query.mountedQuery (data)"
            `)
      }),
    )

    it(
      'polh=everything, pon=false, hover=bigger',
      wrp({ ssr: false, prefetchPageOnLinkHover: 'everything', prefetchPageOnNavigate: false }, async (t) => {
        const { tale, requestsTale } = await navigatePages(t, hoverBiggerThanLoaderDuration)
        expect(tale).toMatchInlineSnapshot(`
              "/
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
              "GET /
              root.page.withServer (data)
              root.page.withBoth (data)
              root.query.relatedQuery (data)
              root.query.mountedQuery (data)"
            `)
      }),
    )

    it(
      'polh=everything, pon=everything, hover=smaller',
      wrp({ ssr: false, prefetchPageOnLinkHover: 'everything', prefetchPageOnNavigate: 'everything' }, async (t) => {
        const { tale, requestsTale } = await navigatePages(t, hoverSmallerThanLoaderDuration)
        expect(tale).toMatchInlineSnapshot(`
              "/
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
            "GET /
            root.page.withServer (data)
            root.page.withBoth (data)
            root.query.relatedQuery (data)
            root.query.mountedQuery (data)"
          `)
      }),
    )

    it(
      'polh=everything, pon=everything, hover=bigger',
      wrp({ ssr: false, prefetchPageOnLinkHover: 'everything', prefetchPageOnNavigate: 'everything' }, async (t) => {
        const { tale, requestsTale } = await navigatePages(t, hoverBiggerThanLoaderDuration)
        expect(tale).toMatchInlineSnapshot(`
              "/
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
              "GET /
              root.page.withServer (data)
              root.page.withBoth (data)
              root.query.relatedQuery (data)
              root.query.mountedQuery (data)"
            `)
      }),
    )
  })
})
