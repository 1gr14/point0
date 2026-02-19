import { describe, expect, it } from 'bun:test'
import { Point0 } from '@point0/core'
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
      .head('universal', ({ loading }) => {
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
      .head('universal', ({ loading }) => {
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
      .head('global', ({ loading }) => {
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
      .head('universal', ({ loading }) => {
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
      .head('global', ({ loading, initial, error }) => {
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
    expect(await fetchTitle(page)).toMatchInlineSnapshot(`"Test"`) // it is default head of our html, in facte here was initial state, so better use 'global' head for this things
  })

  it('loading by global head show error', async () => {
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
    expect(await fetchTitle(page)).toMatchInlineSnapshot(`"Loading..."`)
  })
})

// USE HEAD keep array and call all AGAIN in loading or error or usccess component of page
