import { Point0 } from '@point0/core'
import { describe, expect, it } from 'bun:test'
import { createTestThings } from './utils/internal-testing.js'
import { z } from 'zod'

describe('provider', () => {
  const createRoot = () =>
    Point0.lets('root', 'root')
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
    const root = createRoot()
    const provider = root.lets('provider', 'app').provider(() => ({ x: 1, y: 2 }))
    const page = root.lets('page', 'home').page(() => {
      const usedValue = provider.useValue()
      const getValue = provider.getValue()
      return (
        <div id="page">
          x={usedValue.x} y={getValue.y}
        </div>
      )
    })

    const { render, fetchPreview, fetchesTale } = await createTestThings({
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
    const page = root.lets('page', 'home').page(() => {
      const usedValue = provider.useValue()
      const getValue = provider.getValue()
      return (
        <div id="page">
          x={usedValue.x} y={getValue.y}
        </div>
      )
    })

    const { render, fetchPreview, fetchesTale } = await createTestThings({
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

  it('use specific key', async () => {
    const root = createRoot()
    const provider = root.lets('provider', 'app').provider(() => ({ x: 1, y: 2, z: 3 }))
    const page = root.lets('page', 'home').page(() => {
      const x = provider.useValue('x')
      return <div id="page">x={x}</div>
    })

    const { render, fetchPreview, fetchesTale } = await createTestThings({
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

  it('use specific keys', async () => {
    const root = createRoot()
    const provider = root.lets('provider', 'app').provider(() => ({ x: 1, y: 2, z: 3 }))
    const page = root.lets('page', 'home').page(() => {
      const { x, y } = provider.useValue(['x', 'y'])
      return (
        <div id="page">
          x={x} y={y}
        </div>
      )
    })

    const { render, fetchPreview, fetchesTale } = await createTestThings({
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
})
