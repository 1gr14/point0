import { Point0 } from '@point0/core'
import { describe, expect, it } from 'bun:test'
import { createTestThings } from './utils/internal-testing.js'

describe('query', () => {
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
    const q = root
      .lets('query', 'test')
      .loader(() => ({ x: 1 }))
      .query()
    const page = root.lets('page', 'home', '/').page(() => {
      const query = q.useLoader()
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
})
