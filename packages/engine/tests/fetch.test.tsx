import { Point0 } from '@point0/core'
import { describe, expect, it } from 'bun:test'
import { z } from 'zod'
import { createTestThings, ymlifyline } from './utils/internal-testing.js'

declare module '@point0/core/request0' {
  interface RequestCache {
    logs?: string[]
  }
  interface RequestState {
    logs?: string[]
  }
}

describe('fetch', () => {
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

  it('state new each server request, but cache shared between requests', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/:x')
      .loader(({ params, request }) => {
        request.cache.logs = request.cache.logs ? [...request.cache.logs, 'page'] : ['page']
        request.state.logs = request.state.logs ? [...request.state.logs, 'page'] : ['page']
        return { x: +params.x * 2, state: request.state.logs.join(','), cache: request.cache.logs.join(',') }
      })
      .page(({ data }) => (
        <div id="page">
          {ymlifyline(data)}
          {<component.X input={{ y: 3 }} />}
        </div>
      ))
    const component = root
      .lets('component', 'component')
      .input(z.object({ y: z.number() }))
      .loader(({ input, request }) => {
        request.cache.logs = request.cache.logs ? [...request.cache.logs, 'component'] : ['component']
        request.state.logs = request.state.logs ? [...request.state.logs, 'component'] : ['component']
        return { y: +input.y * 2, state: request.state.logs.join(','), cache: request.cache.logs.join(',') }
      })
      .component(({ data }) => <div id="component">{ymlifyline(data)}</div>)
    const { render, fetchPreview, fetchesTale, fetchRecorder } = await createTestThings({
      points: [root, page, component],
    })

    // when we render as spa it is just two different requests
    await render(page.route({ x: '2' }), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
          "
          /2
            #loading: ...

            #page:
              text: cache: page, state: page, x: 4
              #component: cache: component, state: component, y: 6
          "
        `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
        "
        page.home (client) < {"x":"2"}
        component.component (client) < {"y":3}
        "
      `)

    // when we render as ssr component request goes from server
    fetchRecorder.prune()
    expect(await fetchPreview(page, { x: 'zxc' })).toMatchInlineSnapshot(`
        "
        #page:
          text: cache: page, state: page, x: null
          #component: cache: &quot;page,component&quot;, state: component, y: 6
        "
      `)
    expect(await fetchesTale()).toMatchInlineSnapshot(`
          "
          page.home (client) (page) < {}
          page.home (server) < {"x":"zxc"}
          component.component (server) < {"y":3}
          "
        `)
  })
})
