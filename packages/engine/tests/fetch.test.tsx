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
      ssr: true,
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

  it('cookies used cookies of first request, and do not propagate them when ssr request another points', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/')
      .loader(({ set, request }) => {
        set.cookies('zxc', undefined)
        set.cookies('page1', 'pageValue1')
        set.cookies('page2', 'pageValue2')
        return { ...request.cookies }
      })
      .page(({ data }) => (
        <>
          <div id="page-content">{ymlifyline(data)}</div>
          <div id="page-inner">
            <c1.X />
          </div>
        </>
      ))
    const c1 = root
      .lets('component', 'c1')
      .loader(({ set, request }) => {
        set.cookies('c1', 'c1Value')
        set.cookies('page1', undefined)
        return { ...request.cookies }
      })
      .component(({ data }) => (
        <>
          <div id="c1-content">{ymlifyline(data)}</div>
          <div id="c1-inner">
            <c2.X />
          </div>
        </>
      ))
    const c2 = root
      .lets('component', 'c2')
      .loader(({ set, request }) => {
        set.cookies('c2', 'c2Value')
        return { ...request.cookies }
      })
      .component(({ data }) => (
        <>
          <div id="c2-content">{ymlifyline(data)}</div>
        </>
      ))
    const { render, fetchPreview, client } = await createTestThings({ ssr: true, points: [root, page, c1, c2] })

    await client.setCookie({ name: 'zxc', value: 'zxcValue', expires: new Date(Date.now() + 99999) })

    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #page-content: zxc: zxcValue
      #page-inner:
        #c1-content: zxc: zxcValue
        #c1-inner:
          #c2-content: zxc: zxcValue
      "
    `)

    await client.pruneCookies()
    await client.setCookie({ name: 'zxc', value: 'zxcValue', expires: new Date(Date.now() + 99999) })

    // when we render as spa it is just two different requests
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#c2-content')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /
          #loading: ...

          #page-content: zxc: zxcValue
          #page-inner:
            #c1-content: page1: pageValue1, page2: pageValue2
            #c1-inner:
              #c2-content: c1: c1Value, page2: pageValue2
        "
      `)
    })
  })
})
