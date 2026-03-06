import { Point0 } from '@point0/core'
import { describe, expect, it } from 'bun:test'
import { createTestThings } from './utils/internal-testing.js'
import { z } from 'zod'

describe('action', () => {
  const createRoot = () =>
    Point0.lets('root', 'root')
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

  it.concurrent('GET, no params, no search', async () => {
    const root = createRoot()
    const q = root
      .lets('action', 'test', 'GET', '/api/my-test')

      // params should be strictly same keys as we see in route params
      .params(z.object({ a: z.number().min(1) }))

      // hedares can be defined anywhere and not changes TInput
      .headers(z.object({ x: z.string().min(1) }))

      // defining search or body immediatelly tranform TInputRaw to {search, body, params} so we can not pass there flat value
      // if not provided, then all usual inputs just will be applied to
      // but inside loaders and ctx fns we see flat input as usual
      .search(z.object({ y: z.number().min(1) }))
      .body(z.object({ b: z.number().min(1) }))

      // .output(z.object({ b: z.number().min(1) }))

      .loader(() => ({ x: 1 }))
      .action()
    const page = root.lets('page', 'home', '/').page(() => {
      const query = q.useQuery()
      return (
        <div id="page">
          <div id="data">{query.data?.x ?? 'nothing'}</div>
        </div>
      )
    })

    const { render, fetchPreview, fetchesTale, fetchRecorder } = await createTestThings({
      points: [root, q, page],
    })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#data')
      expect(await tale()).toMatchInlineSnapshot(`
          "
          /
            #page:
              #data: nothing
            #page:
              #data: 1
          "
        `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
        "
        action.test (client) < {}
        "
      `)
    fetchRecorder.prune()
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
        "
        #page:
          #data: 1
        "
      `)
    expect(await fetchesTale()).toMatchInlineSnapshot(`
        "
        page.home (client) (page) < {}
        action.test (server) < {}
        "
      `)
  })

  it.concurrent('GET without params', async () => {
    const root = createRoot()
    const q = root
      .lets('action', 'test')

      // params should be strictly same keys as we see in route params
      .params(z.object({ a: z.number().min(1) }))

      // hedares can be defined anywhere and not changes TInput
      .headers(z.object({ x: z.string().min(1) }))

      // defining search or body immediatelly tranform TInputRaw to {search, body} so we can not pass there flat value
      // if not provided, then all usual inputs just will be applied to
      // but inside loaders and ctx fns we see flat input as usual
      .search(z.object({ y: z.number().min(1) }))
      .body(z.object({ b: z.number().min(1) }))

      .output(z.object({ b: z.number().min(1) }))

      .loader(() => ({ x: 1 }))
      .query()

      .action()
  })
})
