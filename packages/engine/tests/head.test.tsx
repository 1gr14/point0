import { Point0 } from '@point0/core'
import { describe, expect, it } from 'bun:test'
import { createTestThings, waitReturn } from './utils/internal-testing.js'

describe('head', () => {
  const root = Point0.lets('root', 'root')
    .ssr(true)
    .baseurl('http://localhost/')
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

  it('empty', async () => {
    const page = root.lets('page', 'home', '/').page(() => <div id="page" />)

    const { render, fetchTitle } = await createTestThings({ points: [root, page] })
    await render(page.route(), async ({ waitContent, titlesTale }) => {
      await waitContent('#page')
      expect(await titlesTale()).toMatchInlineSnapshot(`
            "

            "
          `)
    })
    expect(await fetchTitle(page)).toMatchInlineSnapshot(`"Test"`)
  })

  it('simple', async () => {
    const page = root
      .lets('page', 'home', '/')
      .head({ title: 'Home' })
      .page(() => <div id="page" />)

    const { render, fetchTitle } = await createTestThings({ points: [root, page] })
    await render(page.route(), async ({ waitContent, titlesTale }) => {
      await waitContent('#page')
      expect(await titlesTale()).toMatchInlineSnapshot(`
          "
          Home
          "
        `)
    })
    expect(await fetchTitle(page)).toMatchInlineSnapshot(`"Home"`)
  })

  it('title as string', async () => {
    const page = root
      .lets('page', 'home', '/')
      .head('Home')
      .page(() => <div id="page" />)

    const { render, fetchTitle } = await createTestThings({ points: [root, page] })
    await render(page.route(), async ({ waitContent, titlesTale }) => {
      await waitContent('#page')
      expect(await titlesTale()).toMatchInlineSnapshot(`
          "
          Home
          "
        `)
    })
    expect(await fetchTitle(page)).toMatchInlineSnapshot(`"Home"`)
  })

  it('loading by universal head after query show loading state', async () => {
    const page = root
      .lets('page', 'home', '/')
      .loader(async () => await waitReturn({ x: 1 }))
      .head('universal', ({ loading, status }) => {
        return { title: loading ? 'Loading...' : 'Ready' }
      })
      .page(() => <div id="page" />)

    const { render, fetchTitle } = await createTestThings({ points: [root, page] })
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
  })

  it('loading by universal head before query not show loading state (becouse it depends on current chain state)', async () => {
    const page = root
      .lets('page', 'home', '/')
      .head('universal', ({ loading, status }) => {
        return { title: loading ? 'Loading...' : 'Ready' }
      })
      .loader(async () => await waitReturn({ x: 1 }))
      .page(() => <div id="page" />)

    const { render, fetchTitle } = await createTestThings({ points: [root, page] })
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
  })

  it('loading by global head before query show loading state (becouse it depend on global page state', async () => {
    const page = root
      .lets('page', 'home', '/')
      .head('global', ({ loading, status }) => {
        return { title: loading ? 'Loading...' : 'Ready' }
      })
      .loader(async () => await waitReturn({ x: 1 }))
      .page(() => <div id="page" />)

    const { render, fetchTitle } = await createTestThings({ points: [root, page] })
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
  })

  it('head can override universal head', async () => {
    const page = root
      .lets('page', 'home', '/')
      .loader(async () => await waitReturn({ x: 1 }))
      .head('universal', ({ loading, status }) => {
        return { title: loading ? 'Loading...' : 'Ready' }
      })
      .head(({ data }) => `x=${data.x}`)
      .page(() => <div id="page" />)

    const { render, fetchTitle } = await createTestThings({ points: [root, page] })
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
  })

  it('head can override global head', async () => {
    const page = root
      .lets('page', 'home', '/')
      .head('global', ({ loading, initial, error, status }) => {
        return {
          title: loading ? 'Loading...' : initial ? 'Initial...' : error ? `My Error Title: ${error.message}` : 'Ready',
        }
      })
      .loader(async () => await waitReturn({ x: 1 }))
      .head(({ data }) => `x=${data.x}`)
      .page(() => <div id="page" />)

    const { render, fetchTitle } = await createTestThings({ points: [root, page] })
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
  })

  it('loading by error head show error', async () => {
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

    const { render, fetchTitle } = await createTestThings({ points: [root, page] })
    await render(page.route(), async ({ waitContent, titlesTale }) => {
      await waitContent('#error')
      await waitReturn(100)
      expect(await titlesTale()).toMatchInlineSnapshot(`
          "
          My Error Title: my message
          "
        `)
    })
    expect(await fetchTitle(page)).toMatchInlineSnapshot(`"Test"`) // it is default head of our html, in facte here was initial state, so better use 'global' head for this things
  })

  it('loading by global head show error', async () => {
    const page = root
      .lets('page', 'home', '/')
      .head('global', ({ loading, error, initial, status }) => {
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

    const { render, fetchTitle } = await createTestThings({ points: [root, page] })
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
    // expect((await fetchView(page)).html).toMatchInlineSnapshot(`
    //   "<!DOCTYPE html>
    //     <html lang="en">
    //     <head><script id="__POINT0_DEHYDRATED_SUPER_STORE_SCRIPT__">
    //            window.__POINT0_DEHYDRATED_SUPER_STORE__ = "{\\"__POINT0_QUERY_CLIENT__\\":{\\"mutations\\":[],\\"queries\\":[{\\"dehydratedAt\\":1770284839664,\\"queryHash\\":\\"[\\\\\\"point0\\\\\\",\\\\\\"root\\\\\\",\\\\\\"page\\\\\\",\\\\\\"home\\\\\\",\\\\\\"server\\\\\\",\\\\\\"finite\\\\\\",\\\\\\"{}\\\\\\",\\\\\\"queryClientDehydratedState\\\\\\"]\\",\\"queryKey\\":[\\"point0\\",\\"root\\",\\"page\\",\\"home\\",\\"server\\",\\"finite\\",\\"{}\\",\\"queryClientDehydratedState\\"],\\"state\\":{\\"data\\":{\\"dehydratedState\\":{\\"mutations\\":[],\\"queries\\":[{\\"dehydratedAt\\":1770284839663,\\"queryHash\\":\\"[\\\\\\"point0\\\\\\",\\\\\\"root\\\\\\",\\\\\\"page\\\\\\",\\\\\\"home\\\\\\",\\\\\\"server\\\\\\",\\\\\\"finite\\\\\\",\\\\\\"{}\\\\\\",\\\\\\"data\\\\\\"]\\",\\"queryKey\\":[\\"point0\\",\\"root\\",\\"page\\",\\"home\\",\\"server\\",\\"finite\\",\\"{}\\",\\"data\\"],\\"state\\":{\\"dataUpdateCount\\":0,\\"dataUpdatedAt\\":0,\\"error\\":{\\"__I_AM_ERROR_0\\":true,\\"expected\\":false,\\"httpStatus\\":500,\\"message\\":\\"my message\\",\\"meta\\":{},\\"stack\\":\\"Error: my message\\\\n    at \\\\u003Canonymous\\\\u003E (/Users/iserdmi/cc/opensource/devp0nt/point0/packages/engine/tests/head.test.tsx:229:21)\\\\n    at processTicksAndRejections (native:7:39)\\"},\\"errorUpdateCount\\":1,\\"errorUpdatedAt\\":1770284839662,\\"fetchFailureCount\\":1,\\"fetchFailureReason\\":{\\"__I_AM_ERROR_0\\":true,\\"expected\\":false,\\"httpStatus\\":500,\\"message\\":\\"my message\\",\\"meta\\":{},\\"stack\\":\\"Error: my message\\\\n    at \\\\u003Canonymous\\\\u003E (/Users/iserdmi/cc/opensource/devp0nt/point0/packages/engine/tests/head.test.tsx:229:21)\\\\n    at processTicksAndRejections (native:7:39)\\"},\\"fetchMeta\\":null,\\"fetchStatus\\":\\"idle\\",\\"isInvalidated\\":true,\\"status\\":\\"error\\"}}]}},\\"dataUpdateCount\\":1,\\"dataUpdatedAt\\":1770284839663,\\"error\\":null,\\"errorUpdateCount\\":0,\\"errorUpdatedAt\\":0,\\"fetchFailureCount\\":0,\\"fetchFailureReason\\":null,\\"fetchMeta\\":null,\\"fetchStatus\\":\\"idle\\",\\"isInvalidated\\":false,\\"status\\":\\"success\\"}}]},\\"__POINT0_SSR_LOCATION__\\":{\\"abs\\":true,\\"children\\":false,\\"exact\\":true,\\"hash\\":\\"\\",\\"host\\":\\"example.com\\",\\"hostname\\":\\"example.com\\",\\"href\\":\\"https://example.com/\\",\\"hrefRel\\":\\"/\\",\\"origin\\":\\"https://example.com\\",\\"params\\":{},\\"parent\\":false,\\"pathname\\":\\"/\\",\\"route\\":\\"/\\",\\"search\\":\\"\\",\\"searchParams\\":{}}}";
    //          </script><script id="__POINT0_ENV__" type="text/javascript">
    //     const __POINT0_ENV__ = {"NODE_ENV":"test"};
    //     window.process = window.process || {};
    //     window.process.env = { ...(window.process.env || {}), ...__POINT0_ENV__ };
    //     window.import = window.import || {};
    //     window.import.meta = window.import.meta || {};
    //     window.import.meta.env = { ...(window.import.meta.env || {}), ...__POINT0_ENV__ };
    //   </script>
    //     <meta charset="utf-8">
    //   <meta name="viewport" content="width=device-width, initial-scale=1">
    //   <title>Initial...</title></head>
    //     <body>
    //       <div id="root"><div id="loading">...</div></div>
    //     </body>
    //   </html>"
    // `)
    expect(await fetchTitle(page)).toMatchInlineSnapshot(`"Loading..."`)
  })
})

// USE HEAD keep array and call all AGAIN in loading or error or usccess component of page
