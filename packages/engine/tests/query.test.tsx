import { Point0 } from '@point0/core'
import { describe, expect, it } from 'bun:test'
import { createTestThings } from './utils/internal-testing.js'
import z from 'zod'

describe('query', () => {
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

  it('simple', async () => {
    const q = root
      .lets('query', 'test')
      .loader(() => ({ x: 1 }))
      .query()
    const page = root.lets('page', 'home', '/').page(() => {
      const query = q.useQuery()
      return (
        <div id="page">
          <div id="data">{query.data?.x ?? 'nothing'}</div>
        </div>
      )
    })

    const { render, fetchPreview, fetchesTale, fetchRecorder } = await createTestThings({ points: [root, q, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#data')
      expect(await tale()).toMatchInlineSnapshot(`
          "/
            #page:
              #data: nothing
  
            #page:
              #data: 1
          "
        `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
        "query.test (client) < {}
        "
      `)
    fetchRecorder.prune()
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
        "#page:
          #data: 1
        "
      `)
    expect(await fetchesTale()).toMatchInlineSnapshot(`
        "page.home (client) (page) < {}
        query.test (server) < {}
        "
      `)
  })

  it('with page loader and query loader', async () => {
    const q = root
      .lets('query', 'test')
      .loader(() => ({ x: 1 }))
      .query()
    const page = root
      .lets('page', 'home', '/')
      .loader(() => ({ y: 2 }))
      .page(({ data }) => {
        const query = q.useQuery()
        return (
          <div id="page">
            q={query.data?.x ?? 'nothing'} y={data.y}
          </div>
        )
      })

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, q, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
          "/
            #loading: ...

            #page: q=nothing y=2

            #page: q=1 y=2
          "
        `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
        "page.home (client) < {}
        query.test (client) < {}
        "
      `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
        "#page: q=1 y=2
        "
      `)
  })

  it('with clientLoader', async () => {
    const q = root
      .lets('query', 'test')
      .clientLoader(() => ({ y: 2 }))
      .query()
    const page = root.lets('page', 'home', '/').page(() => {
      const query = q.useQuery()
      return <div id="page">y={query.data?.y ?? 'nothing'}</div>
    })

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, q, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
          "/
            #page: y=nothing

            #page: y=2
          "
        `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
        "
        "
      `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
        "#page: y=nothing
        "
      `)
  })

  it('with loader and clientLoader', async () => {
    const q = root
      .lets('query', 'test')
      .loader(() => ({ x: 1 }))
      .clientLoader(({ data }) => ({ y: 2, ...data }))
      .query()
    const page = root.lets('page', 'home', '/').page(() => {
      const query = q.useQuery()
      return (
        <div id="page">
          q={query.data?.x ?? 'nothing'} y={query.data?.y ?? 'nothing'}
        </div>
      )
    })

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, q, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
          "/
            #page: q=nothing y=nothing

            #page: q=1 y=2
          "
        `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
        "query.test (client) < {}
        "
      `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
        "#page: q=nothing y=nothing
        "
      `)
  })

  it('with input and loader', async () => {
    const q = root
      .lets('query', 'test')
      .input(z.object({ y: z.number() }))
      .loader(({ input }) => ({ x: input.y * 2 }))
      .query()
    const page = root.lets('page', 'home', '/').page(() => {
      const query = q.useQuery({ y: 123 })
      return <div id="page">x={query.data?.x ?? 'nothing'}</div>
    })

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, q, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
          "/
            #page: x=nothing

            #page: x=246
          "
        `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
        "query.test (client) < {"y":123}
        "
      `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
        "#page: x=246
        "
      `)
  })

  it('with input and clientLoader', async () => {
    const q = root
      .lets('query', 'test')
      .combinedInput(z.object({ y: z.number() }))
      .clientLoader(({ input }) => ({ x: input.y * 2 }))
      .query()
    const page = root.lets('page', 'home', '/').page(() => {
      const query = q.useQuery({ y: 123 })
      return <div id="page">x={query.data?.x ?? 'nothing'}</div>
    })

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, q, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
          "/
            #page: x=nothing

            #page: x=246
          "
        `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
        "
        "
      `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
        "#page: x=nothing
        "
      `)
  })

  it('with input and clientLoader and loader', async () => {
    const q = root
      .lets('query', 'test')
      .combinedInput(z.object({ y: z.number() }))
      .loader(({ data }) => ({ z: 3 }))
      .clientLoader(({ input }) => ({ x: input.y * 2 }))
      .query()
    const page = root.lets('page', 'home', '/').page(() => {
      const query = q.useQuery({ y: 123 })
      return <div id="page">x={query.data?.x ?? 'nothing'}</div>
    })

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, q, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
          "/
            #page: x=nothing

            #page: x=246
          "
        `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
        "query.test (client) < {"y":123}
        "
      `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
        "#page: x=nothing
        "
      `)
  })
})
