import { describe, expect, expectTypeOf, it } from 'bun:test'
import { Point0 } from '@point0/core'
import React from 'react'
import { z } from 'zod'
import { createTestThings } from './utils/internal-testing.js'

describe('provider', () => {
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
    const provider = root.lets('provider', 'app').provider(() => ({ x: 1, y: 2 }))
    const page = root.lets('page', 'home', '/home').page(() => {
      const usedValue = provider.useValue()
      const getValue = provider.getValue()
      return (
        <div id="page">
          x={usedValue.x} y={getValue.y}
        </div>
      )
    })

    const { render, fetchPreview, fetchesTale } = await createTestThings({
      ssr: true,
      points: [root, provider, page],
      wrapper: ({ children }) => <provider.X>{children}</provider.X>,
    })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
          "
          /home
            #page: x=1 y=2
          "
        `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
        "

        "
      `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
        "
        #page: x=1 y=2
        "
      `)
  })

  it('with input', async () => {
    const root = createRoot()
    const provider = root
      .lets('provider', 'app')
      .input(z.object({ z: z.number() }))
      .loader(({ input }) => ({ z: input.z * 2 }))
      .provider(({ data }) => ({ x: data.z * 10, y: data.z * 100 }))
    const page = root.lets('page', 'home', '/home').page(() => {
      const usedValue = provider.useValue()
      const getValue = provider.getValue()
      return (
        <div id="page">
          x={usedValue.x} y={getValue.y}
        </div>
      )
    })

    const { render, fetchPreview, fetchesTale } = await createTestThings({
      ssr: true,
      points: [root, provider, page],
      wrapper: ({ children }) => <provider.X input={{ z: 4 }}>{children}</provider.X>,
    })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
          "
          /home
            #loading: ...

            #page: x=80 y=800
          "
        `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
        "
        provider.app (client) < {"z":4}
        "
      `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
        "
        #page: x=80 y=800
        "
      `)
  })

  it('with props', async () => {
    const root = createRoot()
    const provider = root
      .lets<{ z: number }>('provider', 'app')
      .provider(({ props }) => ({ x: props.z * 10, y: props.z * 100 }))
    const page = root.lets('page', 'home', '/home').page(() => {
      const usedValue = provider.useValue()
      const getValue = provider.getValue()
      return (
        <div id="page">
          x={usedValue.x} y={getValue.y}
        </div>
      )
    })

    const { render, fetchPreview, fetchesTale } = await createTestThings({
      ssr: true,
      points: [root, provider, page],
      wrapper: ({ children }) => <provider.X z={4}>{children}</provider.X>,
    })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
          "
          /home
            #page: x=40 y=400
          "
        `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
        "

        "
      `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
        "
        #page: x=40 y=400
        "
      `)
  })

  it('with dynamic props', async () => {
    const root = createRoot()
    const provider = root
      .lets<{ z: number }>('provider', 'app')
      .provider(({ props }) => ({ x: props.z * 10, y: props.z * 100 }))
    const page = root.lets('page', 'home', '/home').page(() => {
      const usedValue = provider.useValue()
      const getValue = provider.getValue()
      return (
        <div id="page">
          x={usedValue.x} y={getValue.y}
        </div>
      )
    })

    const { render, fetchPreview, fetchesTale } = await createTestThings({
      ssr: true,
      points: [root, provider, page],
      wrapper: ({ children }) => {
        const [z, setZ] = React.useState(4)
        React.useEffect(() => {
          setTimeout(() => {
            setZ(8)
          }, 100)
        }, [])
        return <provider.X z={z}>{children}</provider.X>
      },
    })

    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('800')
      expect(await tale()).toMatchInlineSnapshot(`
          "
          /home
            #page: x=40 y=400

            #page: x=80 y=800
          "
        `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
        "

        "
      `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
        "
        #page: x=40 y=400
        "
      `)
  })

  it('use specific key', async () => {
    const root = createRoot()
    const provider = root.lets('provider', 'app').provider(() => ({ x: 1, y: 2, z: 3 }))
    const page = root.lets('page', 'home', '/home').page(() => {
      const x = provider.useValue('x')
      return <div id="page">x={x}</div>
    })

    const { render, fetchPreview, fetchesTale } = await createTestThings({
      ssr: true,
      points: [root, provider, page],
      wrapper: ({ children }) => <provider.X>{children}</provider.X>,
    })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
          "
          /home
            #page: x=1
          "
        `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
        "

        "
      `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
        "
        #page: x=1
        "
      `)
  })

  it('use specific dynamic key', async () => {
    const root = createRoot()
    const provider = root
      .lets<{ x: number; y: number; z: number }>('provider', 'app')
      .provider(({ props }) => ({ x: props.x, y: props.y, z: props.z }))
    const page = root.lets('page', 'home', '/home').page(() => {
      const x = provider.useValue('x')
      return <div id="page">x={x}</div>
    })

    const { render, fetchPreview, fetchesTale } = await createTestThings({
      ssr: true,
      points: [root, provider, page],
      wrapper: ({ children }) => {
        const [x, setX] = React.useState(1)
        React.useEffect(() => {
          setTimeout(() => {
            setX(10)
          }, 100)
        }, [])
        return (
          <provider.X x={x} y={2} z={3}>
            {children}
          </provider.X>
        )
      },
    })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('10')
      expect(await tale()).toMatchInlineSnapshot(`
          "
          /home
            #page: x=1

            #page: x=10
          "
        `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
        "

        "
      `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
        "
        #page: x=1
        "
      `)
  })

  it('use specific keys', async () => {
    const root = createRoot()
    const provider = root.lets('provider', 'app').provider(() => ({ x: 1, y: 2, z: 3 }))
    const page = root.lets('page', 'home', '/home').page(() => {
      const { x, y } = provider.useValue(['x', 'y'])
      return (
        <div id="page">
          x={x} y={y}
        </div>
      )
    })

    const { render, fetchPreview, fetchesTale } = await createTestThings({
      ssr: true,
      points: [root, provider, page],
      wrapper: ({ children }) => <provider.X>{children}</provider.X>,
    })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
          "
          /home
            #page: x=1 y=2
          "
        `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
        "

        "
      `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
        "
        #page: x=1 y=2
        "
      `)
  })

  it('use specific dynamic keys', async () => {
    const root = createRoot()
    const provider = root
      .lets<{ x: number; y: number; z: number }>('provider', 'app')
      .provider(({ props }) => ({ x: props.x, y: props.y, z: props.z }))
    const page = root.lets('page', 'home', '/home').page(() => {
      const { x, y } = provider.useValue(['x', 'y'])
      return (
        <div id="page">
          x={x} y={y}
        </div>
      )
    })

    const { render, fetchPreview, fetchesTale } = await createTestThings({
      ssr: true,
      points: [root, provider, page],
      wrapper: ({ children }) => {
        const [x, setX] = React.useState(1)
        const [y, setY] = React.useState(2)
        React.useEffect(() => {
          setTimeout(() => {
            setX(10)
            setY(20)
          }, 100)
        }, [])
        return (
          <provider.X x={x} y={y} z={3}>
            {children}
          </provider.X>
        )
      },
    })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('20')
      expect(await tale()).toMatchInlineSnapshot(`
          "
          /home
            #page: x=1 y=2

            #page: x=10 y=20
          "
        `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
        "

        "
      `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
        "
        #page: x=1 y=2
        "
      `)
  })

  // short notation: a provider now *is* its own component, so `<App>{children}</App>` works without
  // reaching for `.X`. The old `<App.X>` notation keeps working, and every point helper
  // (`App.useValue`, `App.getValue`, ...) stays available on the short-notation export.

  it('short notation works as a wrapper without reaching for .X', async () => {
    const root = createRoot()
    const App = root.lets('provider', 'app').provider(() => ({ x: 1, y: 2 }))
    const page = root.lets('page', 'home', '/home').page(() => {
      const usedValue = App.useValue()
      return (
        <div id="page">
          x={usedValue.x} y={usedValue.y}
        </div>
      )
    })

    const { render } = await createTestThings({
      ssr: true,
      points: [root, App, page],
      // new short notation in the wrapper (was `<provider.X>`)
      wrapper: ({ children }) => <App>{children}</App>,
    })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /home
          #page: x=1 y=2
        "
      `)
    })
  })

  it('keeps point methods on the short-notation provider', () => {
    const root = createRoot()
    const App = root.lets('provider', 'app').provider(() => ({ x: 1, y: 2 }))

    // value helpers are still here on the short notation (it is `point.X` decorated with them)
    expect(typeof App.useValue).toBe('function')
    expect(typeof App.getValue).toBe('function')
    expect(typeof App.getValueWeak).toBe('function')
    expectTypeOf(App.useValue).toBeFunction()
    expectTypeOf(App.getValue).toBeFunction()
    expectTypeOf(App.getValueWeak).toBeFunction()
    // and the explicit `.X` / `.Provider` accessors are still reachable too
    expect(typeof App.X).toBe('function')
    expect(typeof App.Provider).toBe('function')
  })
})
