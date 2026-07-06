import { describe, expect, expectTypeOf, it } from 'bun:test'
import { Point0 } from '@point0/core'
import { createTestThings } from './utils/internal-testing.js'
import z from 'zod'

describe('component', () => {
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

  it('simple', async () => {
    const root = createRoot()
    const component = root.lets('component', 'stats').component(() => <div id="component">x=nothing</div>)
    const page = root.lets('page', 'home', '/').page(() => (
      <div id="page">
        <component.X />
      </div>
    ))

    const { render, fetchPreview, fetchesTale } = await createTestThings({ ssr: true, points: [root, component, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#component')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /
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
      "
      #page:
        #component: x=nothing
      "
    `)
  })

  it('loader', async () => {
    const root = createRoot()
    const component = root
      .lets('component', 'stats')
      .loader(() => ({ x: 1 }))
      .component(({ data }) => <div id="component">x={data.x}</div>)
    const page = root.lets('page', 'home', '/').page(() => (
      <div id="page">
        <component.X />
      </div>
    ))

    const { render, fetchPreview, fetchesTale } = await createTestThings({ ssr: true, points: [root, component, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#component')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /
          #page:
            #loading: ...

          #page:
            #component: x=1
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      component.stats (client) < {}
      "
    `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #page:
        #component: x=1
      "
    `)
  })

  it('loader error', async () => {
    const root = createRoot()
    const component = root
      .lets('component', 'stats')
      .loader(() => {
        if (Math.random() + 1) {
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

    const { render, fetchPreview, fetchesTale } = await createTestThings({ ssr: true, points: [root, component, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#error')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /
          #page:
            #loading: ...

          #page:
            #error: test error
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      component.stats (client) < {}
      "
    `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #page:
        #error: test error
      "
    `)
  })

  it('props and input', async () => {
    const root = createRoot()
    const component = root
      .lets<{ x: number; y: number }>('component', 'stats')
      .sharedInput<{ id: string; mult: number }>()
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

    const { render, fetchPreview, fetchesTale } = await createTestThings({ ssr: true, points: [root, component, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#component')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /
          #page:
            #loading: ...

          #page:
            #component: x=1 y=2 v=zxc-2
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      component.stats (client) < {"id":"zxc","mult":2}
      "
    `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #page:
        #component: x=1 y=2 v=zxc-2
      "
    `)
  })

  it('client input parsed on mount', async () => {
    const root = createRoot()
    const component = root
      .lets<{ x: number; y: number }>('component', 'stats')
      .sharedInput(z.object({ id: z.string(), mult: z.number().transform((v) => v * 2) }))
      .loader(({ input }) => ({ value: `${input.id}-${input.mult}` }))
      .component(({ data, props, input }) => (
        <>
          <div id="data">v={data.value}</div>
          <div id="props">
            x={props.x} y={props.y}
          </div>
          <div id="input">
            id={input.id} mult={input.mult}
          </div>
        </>
      ))
    const page = root.lets('page', 'home', '/').page(() => (
      <div id="page">
        <component.X input={{ id: 'zxc', mult: 2 }} x={1} y={2} />
      </div>
    ))

    const { render, fetchPreview, fetchesTale } = await createTestThings({ ssr: true, points: [root, component, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#input')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /
          #page:
            #loading: ...

          #page:
            #data: v=zxc-4
            #props: x=1 y=2
            #input: id=zxc mult=4
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      component.stats (client) < {"id":"zxc","mult":2}
      "
    `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #page:
        #data: v=zxc-4
        #props: x=1 y=2
        #input: id=zxc mult=4
      "
    `)
  })

  it('earlier defined props overrides', async () => {
    const root = createRoot()
    const base = root
      .lets('base', 'base')
      .with(() => ({ x: 100, z: 3 }))
      .base()
    const component = base.lets<{ x: number; y: number }>('component', 'stats').component(({ props }) => (
      <div id="component">
        x={props.x} y={props.y} z={props.z}
      </div>
    ))
    const page = root.lets('page', 'home', '/').page(() => (
      <div id="page">
        <component.X x={1} y={2} />
      </div>
    ))

    const { render, fetchPreview, fetchesTale } = await createTestThings({
      ssr: true,
      points: [root, base, component, page],
    })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#component')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /
          #page:
            #component: x=1 y=2 z=3
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "

      "
    `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #page:
        #component: x=1 y=2 z=3
      "
    `)
  })

  it('wrapper', async () => {
    const root = createRoot()
    const component = root
      .lets<{ x: number }>('component', 'stats')
      .sharedInput<{ id: string }>()
      .loader(({ input }) => ({ x: input.id }))
      .wrapper(({ children, props }) => (
        <div id="wrapper">
          <div id="x">x={props.x}</div>
          {children}
        </div>
      ))
      .component(({ data }) => <div id="component">x={data.x}</div>)
    const page = root.lets('page', 'home', '/').page(() => (
      <div id="page">
        <component.X input={{ id: 'zxc' }} x={1} />
      </div>
    ))

    const { render, fetchPreview, fetchesTale } = await createTestThings({ ssr: true, points: [root, component, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#component')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /
          #page:
            #wrapper:
              #x: x=1
              #loading: ...

          #page:
            #wrapper:
              #x: x=1
              #component: x=zxc
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      component.stats (client) < {"id":"zxc"}
      "
    `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #page:
        #wrapper:
          #x: x=1
          #component: x=zxc
      "
    `)
  })

  it('compoent as wrapper', async () => {
    const root = createRoot()
    const wrapper = root
      .lets<{ children: React.ReactNode }>('component', 'wrapper')
      .sharedInput<{ sn: string }>()
      .loader(({ input }) => ({ y: input.sn }))
      .component(({ props, data }) => (
        <div id="wrapper">
          <div id="y">{data.y}</div>
          {props.children}
        </div>
      ))
    const component = root
      .lets('component', 'stats')
      .sharedInput<{ id: string }>()
      .loader(({ input }) => ({ x: input.id }))
      .component(({ data }) => <div id="component">x={data.x}</div>)
    const page = root.lets('page', 'home', '/').page(() => (
      <div id="page">
        <wrapper.X input={{ sn: '123' }}>
          <component.X input={{ id: 'zxc' }} />
        </wrapper.X>
      </div>
    ))

    const { render, fetchPreview, fetchesTale } = await createTestThings({
      ssr: true,
      points: [root, component, wrapper, page],
    })
    await render(page.route(), async ({ waitContent, tale }) => {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      await waitContent('#component')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /
          #page:
            #loading: ...

          #page:
            #wrapper:
              #y: 123
              #component: x=zxc
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      component.wrapper (client) < {"sn":"123"}
      component.stats (client) < {"id":"zxc"}
      "
    `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #page:
        #wrapper:
          #y: 123
          #component: x=zxc
      "
    `)
  })

  // short notation: a mountable point now *is* its own component, so `<Stats />` renders it
  // without reaching for `.X`. The old `<Stats.X />` notation keeps working, and every point
  // helper (queries, etc.) stays available on the short-notation export (`Stats.fetchQuery`).

  it('short notation renders without reaching for .X (old notation still works)', async () => {
    const root = createRoot()
    const Stats = root.lets('component', 'stats').component(() => <div id="component">x=nothing</div>)
    const page = root.lets('page', 'home', '/').page(() => (
      <div id="page">
        {/* new short notation */}
        <Stats />
        {/* old notation still works */}
        <Stats.X />
      </div>
    ))

    const { render } = await createTestThings({ ssr: true, points: [root, Stats, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#component')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /
          #page:
            #component: x=nothing
            #component: x=nothing
        "
      `)
    })
  })

  it('keeps point methods on the short-notation component', () => {
    const root = createRoot()
    const Stats = root
      .lets('component', 'stats')
      .loader(() => ({ x: 1 }))
      .component(({ data }) => <div id="component">x={data.x}</div>)

    // query/fetch helpers are still here on the short notation (it is `point.X` decorated with them)
    expect(typeof Stats.fetchQuery).toBe('function')
    expect(typeof Stats.useQuery).toBe('function')
    expect(typeof Stats.prefetchQuery).toBe('function')
    expectTypeOf(Stats.fetchQuery).toBeFunction()
    expectTypeOf(Stats.useQuery).toBeFunction()
    expectTypeOf(Stats.prefetchQuery).toBeFunction()
    // and the explicit `.X` / `.Component` accessors are still reachable too
    expect(typeof Stats.X).toBe('function')
    expect(typeof Stats.Component).toBe('function')
  })
})
