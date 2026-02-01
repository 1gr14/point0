import { Mountable, Point0 } from '@point0/core'
import { describe, expect, it } from 'bun:test'
import { createTestThings } from '../utils/internal-testing.js'

describe('mountable', () => {
  const root = Point0.lets('root', 'root')
    .ssr(true)
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
    const page = root.lets('page', 'home', '/').page(() => (
      <div id="page">
        <Mountable>{({ data }) => <div id="component">x=undefined</div>}</Mountable>
      </div>
    ))

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#component')
      expect(await tale()).toMatchInlineSnapshot(`
          "/
            #page:
              #component: x=undefined
          "
        `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
        "
        "
      `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
        "#page:
          #component: x=undefined
        "
      `)
  })

  it('with query', async () => {
    const q = root
      .lets('query', 'test')
      .loader(() => ({ x: 1 }))
      .query()
    const page = root.lets('page', 'home', '/').page(() => (
      <div id="page">
        <Mountable query={q.getQueryOptions()}>
          {({ data, queries, query }) => (
            <>
              <div id="data">{JSON.stringify(data)}</div>
              <div id="query-data">{JSON.stringify(query?.data)}</div>
              <div id="queries-length">{queries.length}</div>
            </>
          )}
        </Mountable>
      </div>
    ))

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, page, q] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#data')
      expect(await tale()).toMatchInlineSnapshot(`
          "/
            #page:

            #page:
              #data: {"x":1}
              #query-data:
              #queries-length: 1
          "
        `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
        "query.test (client) < {}
        "
      `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
        "#page:
          #data: {&quot;x&quot;:1}
          #query-data:
          #queries-length: 1
        "
      `)
  })
})
