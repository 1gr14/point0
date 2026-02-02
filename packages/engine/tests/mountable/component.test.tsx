import { Point0 } from '@point0/core'
import { describe, expect, it } from 'bun:test'
import { createTestThings } from '../utils/internal-testing.js'

describe('component', () => {
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
    const component = root.lets('component', 'stats').component(() => <div id="component">x=nothing</div>)
    const page = root.lets('page', 'home', '/').page(() => (
      <div id="page">
        <component.X />
      </div>
    ))

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, component, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#component')
      expect(await tale()).toMatchInlineSnapshot(`
        "/
          #page:
            #component: x=nothing
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      "
    `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "#page:
        #component: x=nothing
      "
    `)
  })

  it('loader', async () => {
    const component = root
      .lets('component', 'stats')
      .loader(() => ({ x: 1 }))
      .component(({ data }) => <div id="component">x={data.x}</div>)
    const page = root.lets('page', 'home', '/').page(() => (
      <div id="page">
        <component.X />
      </div>
    ))

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, component, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#component')
      expect(await tale()).toMatchInlineSnapshot(`
        "/
          #page:
            #loading: ...

          #page:
            #component: x=1
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "component.stats (client) < {}
      "
    `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "#page:
        #component: x=1
      "
    `)
  })

  it('loader error', async () => {
    const component = root
      .lets('component', 'stats')
      .loader(() => {
        if (Math.random()) {
          throw new Error('test error')
        }
        return { x: 1 }
      })
      .component(({ data }) => <div id="component">x={data.x}</div>)
    const page = root.lets('page', 'home', '/').page(() => (
      <div id="page">
        <component.X />
      </div>
    ))

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, component, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#error')
      expect(await tale()).toMatchInlineSnapshot(`
        "/
          #page:
            #loading: ...

          #page:
            #error: test error
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "component.stats (client) < {}
      "
    `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "#page:
        #error: test error
      "
    `)
  })

  it('props and input', async () => {
    const component = root
      .lets('component', 'stats')
      .combinedInput<{ id: string; mult: number }>()
      .props<{ x: number; y: number }>()
      .loader(({ input }) => ({ value: `${input.id}-${input.mult}` }))
      .component(({ data, props }) => (
        <div id="component">
          x={props.x} y={props.y} v={data.value}
        </div>
      ))
    const page = root.lets('page', 'home', '/').page(() => (
      <div id="page">
        <component.X input={{ id: 'zxc', mult: 2 }} x={1} y={2} />
      </div>
    ))

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, component, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#component')
      expect(await tale()).toMatchInlineSnapshot(`
        "/
          #page:
            #loading: ...

          #page:
            #component: x=1 y=2 v=zxc-2
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "component.stats (client) < {"id":"zxc","mult":2}
      "
    `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "#page:
        #component: x=1 y=2 v=zxc-2
      "
    `)
  })

  it('wrapper', async () => {
    const component = root
      .lets('component', 'stats')
      .combinedInput<{ id: string }>()
      .loader(({ input }) => ({ x: input.id }))
      .wrapper(({ children, queries, input }) => (
        <div id="wrapper">
          <div id="input">{input?.id}</div>
          <div id="query-status">{queries?.map((q) => q.status).join(', ') || 'undefined'}</div>
          {children}
        </div>
      ))
      .component(({ data }) => <div id="component">x={data.x}</div>)
    const page = root.lets('page', 'home', '/').page(() => (
      <div id="page">
        <component.X input={{ id: 'zxc' }} />
      </div>
    ))

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, component, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#component')
      expect(await tale()).toMatchInlineSnapshot(`
        "/
          #page:
            #wrapper:
              #input: zxc
              #query-status: pending
              #loading: ...

          #page:
            #wrapper:
              #input: zxc
              #query-status: success
              #component: x=zxc
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "component.stats (client) < {"id":"zxc"}
      "
    `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "#page:
        #wrapper:
          #input: zxc
          #query-status: success
          #component: x=zxc
      "
    `)
  })

  it('outer can block query', async () => {
    const component = root
      .lets('component', 'stats')
      .combinedInput<{ id: string }>()
      .loader(({ input }) => ({ x: input.id }))
      .outer(({ children, input }) => {
        if (!input || input.id.length > 2) {
          return <div id="outer">you shell not pass</div>
        }
        return children
      })
      .component(({ data }) => <div id="component">x={data.x}</div>)
    const page = root.lets('page', 'home', '/').page(() => (
      <div id="page">
        <component.X input={{ id: 'zxc' }} />
      </div>
    ))

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, component, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#outer')
      expect(await tale()).toMatchInlineSnapshot(`
        "/
          #page:
            #outer: you shell not pass
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      "
    `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "#page:
        #outer: you shell not pass
      "
    `)
  })
})
