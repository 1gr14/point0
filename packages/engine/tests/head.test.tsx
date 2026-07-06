import { describe, expect, it } from 'bun:test'
import { Point0 } from '@point0/core'
import { createTestThings, waitReturn } from './utils/internal-testing.js'

describe('head', () => {
  const root = Point0.lets('root', 'root')
    .loading(() => <div id="loading">...</div>)
    .error(({ error }) => <div id="error">{error.message}</div>)
    .queryOptions({
      retry: false,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false,
      refetchIntervalInBackground: false,
    })
    .root()

  it(
    'empty',
    async () => {
      const page = root.lets('page', 'home', '/').page(() => <div id="page" />)

      const { render, fetchTitle } = await createTestThings({ ssr: true, points: [root, page] })
      await render(page.route(), async ({ waitContent, titlesTale }) => {
        await waitContent('#page')
        expect(await titlesTale()).toMatchInlineSnapshot(`
            "

            "
          `)
      })
      expect(await fetchTitle(page)).toMatchInlineSnapshot(`"Test"`)
    },
    {
      retry: 3,
    },
  )

  it(
    'simple',
    async () => {
      const page = root
        .lets('page', 'home', '/')
        .head({ title: 'Home' })
        .page(() => <div id="page" />)

      const { render, fetchTitle } = await createTestThings({ ssr: true, points: [root, page] })
      await render(page.route(), async ({ waitContent, titlesTale }) => {
        await waitContent('#page')
        expect(await titlesTale()).toMatchInlineSnapshot(`
          "
          Home
          "
        `)
      })
      expect(await fetchTitle(page)).toMatchInlineSnapshot(`"Home"`)
    },
    {
      retry: 3,
    },
  )

  it(
    'title as string',
    async () => {
      const page = root
        .lets('page', 'home', '/')
        .head('Home')
        .page(() => <div id="page" />)

      const { render, fetchTitle } = await createTestThings({ ssr: true, points: [root, page] })
      await render(page.route(), async ({ waitContent, titlesTale }) => {
        await waitContent('#page')
        expect(await titlesTale()).toMatchInlineSnapshot(`
          "
          Home
          "
        `)
      })
      expect(await fetchTitle(page)).toMatchInlineSnapshot(`"Home"`)
    },
    {
      retry: 3,
    },
  )

  it(
    'loading by universal head after query show loading state',
    async () => {
      const page = root
        .lets('page', 'home', '/')
        .loader(async () => await waitReturn({ x: 1 }))
        .head('universal', ({ loading }) => {
          return { title: loading ? 'Loading...' : 'Ready' }
        })
        .page(() => <div id="page" />)

      const { render, fetchTitle } = await createTestThings({ ssr: true, points: [root, page] })
      await render(page.route(), async ({ waitContent, titlesTale }) => {
        await waitContent('#page')
        await waitReturn(100)
        expect(await titlesTale()).toMatchInlineSnapshot(`
          "
          Loading...
          Ready
          "
        `)
      })
      expect(await fetchTitle(page)).toMatchInlineSnapshot(`"Ready"`)
    },
    {
      retry: 3,
    },
  )

  it(
    'loading by universal head before query not show loading state (becouse it depends on current chain state)',
    async () => {
      const page = root
        .lets('page', 'home', '/')
        .head('universal', ({ loading }) => {
          return { title: loading ? 'Loading...' : 'Ready' }
        })
        .loader(async () => await waitReturn({ x: 1 }))
        .page(() => <div id="page" />)

      const { render, fetchTitle } = await createTestThings({ ssr: true, points: [root, page] })
      await render(page.route(), async ({ waitContent, titlesTale }) => {
        await waitContent('#page')
        await waitReturn(100)
        expect(await titlesTale()).toMatchInlineSnapshot(`
          "
          Ready
          "
        `)
      })
      expect(await fetchTitle(page)).toMatchInlineSnapshot(`"Ready"`)
    },
    {
      retry: 3,
    },
  )

  it(
    'loading by global head before query show loading state (becouse it depend on global page state',
    async () => {
      const page = root
        .lets('page', 'home', '/')
        .head('global', ({ loading }) => {
          return { title: loading ? 'Loading...' : 'Ready' }
        })
        .loader(async () => await waitReturn({ x: 1 }))
        .page(() => <div id="page" />)

      const { render, fetchTitle } = await createTestThings({ ssr: true, points: [root, page] })
      await render(page.route(), async ({ waitContent, titlesTale }) => {
        await waitContent('#page')
        await waitReturn(100)
        expect(await titlesTale()).toMatchInlineSnapshot(`
          "
          Loading...
          Ready
          "
        `)
      })
      expect(await fetchTitle(page)).toMatchInlineSnapshot(`"Ready"`)
    },
    {
      retry: 3,
    },
  )

  it(
    'head can override universal head',
    async () => {
      const page = root
        .lets('page', 'home', '/')
        .loader(async () => await waitReturn({ x: 1 }))
        .head('universal', ({ loading }) => {
          return { title: loading ? 'Loading...' : 'Ready' }
        })
        .head(({ data }) => `x=${data.x}`)
        .page(() => <div id="page" />)

      const { render, fetchTitle } = await createTestThings({ ssr: true, points: [root, page] })
      await render(page.route(), async ({ waitContent, titlesTale }) => {
        await waitContent('#page')
        await waitReturn(100)
        expect(await titlesTale()).toMatchInlineSnapshot(`
          "
          Loading...
          x=1
          "
        `)
      })
      expect(await fetchTitle(page)).toMatchInlineSnapshot(`"x=1"`)
    },
    {
      retry: 3,
    },
  )

  it(
    'head can override global head',
    async () => {
      const page = root
        .lets('page', 'home', '/')
        .head('global', ({ loading, initial, error }) => {
          return {
            title: loading
              ? 'Loading...'
              : initial
                ? 'Initial...'
                : error
                  ? `My Error Title: ${error.message}`
                  : 'Ready',
          }
        })
        .loader(async () => await waitReturn({ x: 1 }))
        .head(({ data }) => `x=${data.x}`)
        .page(() => <div id="page" />)

      const { render, fetchTitle } = await createTestThings({ ssr: true, points: [root, page] })
      await render(page.route(), async ({ waitContent, titlesTale }) => {
        await waitContent('#page')
        await waitReturn(100)
        expect(await titlesTale()).toMatchInlineSnapshot(`
          "
          Loading...
          x=1
          "
        `)
      })
      expect(await fetchTitle(page)).toMatchInlineSnapshot(`"x=1"`)
    },
    {
      retry: 3,
    },
  )

  it(
    'loading by error head show error',
    async () => {
      const page = root
        .lets('page', 'home', '/')
        .loader(async () => {
          await waitReturn()
          if (Math.random() + 1) {
            throw new Error('my message')
          }
          return { x: 1 }
        })
        .head('success', ({ data }) => {
          return `x=${data.x}`
        })
        .head('error', ({ error }) => {
          return { title: `My Error Title: ${error.message}` }
        })
        .page(() => <div id="page" />)

      const { render, fetchTitle } = await createTestThings({ ssr: true, points: [root, page] })
      await render(page.route(), async ({ waitContent, titlesTale, tale }) => {
        await waitContent('#error')
        await waitReturn(100)
        expect(await tale()).toMatchInlineSnapshot(`
        "
        /
          #loading: ...

          #error: my message
        "
      `)
        expect(await titlesTale()).toMatchInlineSnapshot(`
          "
          My Error Title: my message
          "
        `)
      })
      expect(await fetchTitle(page)).toMatchInlineSnapshot(`"My Error Title: my message"`) // it is default head of our html, in facte here was initial state, so better use 'global' head for this things
    },
    {
      retry: 3,
    },
  )

  it(
    'loading by global head show error',
    async () => {
      const page = root
        .lets('page', 'home', '/')
        .head('global', ({ loading, error, initial }) => {
          return loading ? 'Loading...' : initial ? 'Initial...' : error ? `My Error Title: ${error.message}` : 'Ready'
        })
        .loader(async () => {
          await waitReturn()
          if (Math.random() + 1) {
            throw new Error('my message')
          }
          return { x: 1 }
        })
        .page(() => <div id="page" />)

      const { render, fetchTitle } = await createTestThings({ ssr: true, points: [root, page] })
      await render(page.route(), async ({ waitContent, titlesTale }) => {
        await waitContent('#error')
        await waitReturn(100)
        expect(await titlesTale()).toMatchInlineSnapshot(`
          "
          Loading...
          My Error Title: my message
          "
        `)
      })
      expect(await fetchTitle(page)).toMatchInlineSnapshot(`"My Error Title: my message"`)
    },
    {
      retry: 3,
    },
  )

  it(
    'flat seo meta and canonical',
    async () => {
      const page = root
        .lets('page', 'home', '/')
        .head({
          title: 'Home',
          description: 'My description',
          ogTitle: 'OG Home',
          canonical: 'https://example.com/home',
        })
        .page(() => <div id="page" />)

      const { render, fetchView } = await createTestThings({ ssr: true, points: [root, page] })
      await render(page.route(), async ({ waitContent, document }) => {
        await waitContent('#page')
        expect(document.head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('My description')
        expect(document.head.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe('OG Home')
        expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
          'https://example.com/home',
        )
      })
      const view = await fetchView(page)
      expect(view.html).toContain('<meta name="description" content="My description"')
      expect(view.html).toContain('<meta property="og:title" content="OG Home"')
      expect(view.html).toContain('<link rel="canonical" href="https://example.com/home"')
    },
    {
      retry: 3,
    },
  )

  it(
    'flat seo meta wins over meta array',
    async () => {
      const page = root
        .lets('page', 'home', '/')
        .head({
          description: 'Flat',
          meta: [{ name: 'description', content: 'From array' }],
        })
        .page(() => <div id="page" />)

      const { render, fetchView } = await createTestThings({ ssr: true, points: [root, page] })
      await render(page.route(), async ({ waitContent, document }) => {
        await waitContent('#page')
        const descriptions = document.head.querySelectorAll('meta[name="description"]')
        expect(descriptions.length).toBe(1)
        expect(descriptions[0].getAttribute('content')).toBe('Flat')
      })
      const view = await fetchView(page)
      expect(view.html).toContain('<meta name="description" content="Flat"')
      expect(view.html).not.toContain('From array')
    },
    {
      retry: 3,
    },
  )

  it(
    'flat seo meta from head fn with loader data',
    async () => {
      const page = root
        .lets('page', 'home', '/')
        .loader(async () => await waitReturn({ x: 1 }))
        .head(({ data }) => ({ title: `x=${data.x}`, description: `desc x=${data.x}` }))
        .page(() => <div id="page" />)

      const { render, fetchView } = await createTestThings({ ssr: true, points: [root, page] })
      await render(page.route(), async ({ waitContent, document }) => {
        await waitContent('#page')
        await waitReturn(100)
        expect(document.head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('desc x=1')
      })
      const view = await fetchView(page)
      expect(view.html).toContain('<meta name="description" content="desc x=1"')
    },
    {
      retry: 3,
    },
  )

  it(
    'forces <meta charset="utf-8"> first in <head> and serves a utf-8 content-type',
    async () => {
      const page = root.lets('page', 'home', '/').page(() => <div id="page" />)
      const { fetch } = await createTestThings({ ssr: true, points: [root, page] })

      const response = await fetch(page.route.get({}, { origin: 'http://localhost' }))
      // (a) authoritative transport charset — wins over the browser's content-encoding guess unconditionally.
      expect(response.headers.get('content-type')).toContain('text/html')
      expect(response.headers.get('content-type')).toContain('charset=utf-8')

      const html = await response.text()
      // (b) defense in depth: the charset meta is the FIRST <head> child (inside the 1024-byte prescan window), ahead
      //     of the dehydrated super-store script that used to push it past it → UTF-8-as-Windows-1252 mojibake.
      expect(html).toMatch(/<head\b[^>]*>\s*<meta\s+charset="utf-8">/i)
      const charsetIndex = html.search(/<meta\s+charset="utf-8">/i)
      expect(charsetIndex).toBeLessThan(1024)
      expect(html.indexOf('__POINT0_DEHYDRATED_SUPER_STORE_SCRIPT__')).toBeGreaterThan(charsetIndex)
      // exactly one charset meta — the engine dedups whatever the template declared.
      expect(html.match(/<meta\b[^>]*charset/gi)?.length).toBe(1)
    },
    {
      retry: 3,
    },
  )
})
