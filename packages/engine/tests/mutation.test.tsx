import { describe, expect, it } from 'bun:test'
import { Point0 } from '@point0/core'
import z from 'zod'
import { createTestThings } from './utils/internal-testing.js'

describe('mutation', () => {
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

  it.concurrent('simple', async () => {
    const root = createRoot()
    const q = root
      .lets('action', 'test')
      .loader(() => ({ x: 1 }))
      .mutation()
      .action()
    const page = root.lets('page', 'home', '/').page(() => {
      const mutation = q.useMutation()
      return (
        <div id="page">
          <div id="data">x={mutation.data?.x ?? 'nothing'}</div>
          <button id="mutate" onClick={() => mutation.mutate()}>
            Mutate
          </button>
        </div>
      )
    })

    const { render, fetchesTale } = await createTestThings({ points: [root, q, page] })
    await render(page.route(), async ({ waitContent, tale, click }) => {
      await waitContent('#data')
      await click('#mutate')
      await waitContent('x=1')
      expect(await tale()).toMatchInlineSnapshot(`
          "
          /
            #page:
              #data: x=nothing
              #mutate: Mutate

            #page:
              #data: x=1
              #mutate: Mutate
          "
        `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
        "
        mutation.test (client) < {}
        "
      `)
  })

  it.concurrent('with clientLoader', async () => {
    const root = createRoot()
    const q = root
      .lets('action', 'test')
      .clientLoader(() => ({ y: 2 }))
      .mutation()
      .action()
    const page = root.lets('page', 'home', '/').page(() => {
      const mutation = q.useMutation()
      return (
        <div id="page">
          <div id="data">y={mutation.data?.y ?? 'nothing'}</div>
          <button id="mutate" onClick={() => mutation.mutate()}>
            Mutate
          </button>
        </div>
      )
    })

    const { render, fetchesTale } = await createTestThings({ points: [root, q, page] })
    await render(page.route(), async ({ waitContent, tale, click }) => {
      await waitContent('#data')
      await click('#mutate')
      await waitContent('y=2')
      expect(await tale()).toMatchInlineSnapshot(`
          "
          /
            #page:
              #data: y=nothing
              #mutate: Mutate

            #page:
              #data: y=2
              #mutate: Mutate
          "
        `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
        "

        "
      `)
  })

  it.concurrent('with loader and clientLoader', async () => {
    const root = createRoot()
    const q = root
      .lets('action', 'test')
      .loader(() => ({ x: 1 }))
      .clientLoader(({ data }) => ({ y: 2, ...data }))
      .mutation()
      .action()
    const page = root.lets('page', 'home', '/').page(() => {
      const mutation = q.useMutation()
      return (
        <div id="page">
          <div id="data">
            x={mutation.data?.x ?? 'nothing'} y={mutation.data?.y ?? 'nothing'}
          </div>
          <button id="mutate" onClick={() => mutation.mutate()}>
            Mutate
          </button>
        </div>
      )
    })

    const { render, fetchesTale } = await createTestThings({ points: [root, q, page] })
    await render(page.route(), async ({ waitContent, tale, click }) => {
      await waitContent('#data')
      await click('#mutate')
      await waitContent('x=1 y=2')
      expect(await tale()).toMatchInlineSnapshot(`
          "
          /
            #page:
              #data: x=nothing y=nothing
              #mutate: Mutate

            #page:
              #data: x=1 y=2
              #mutate: Mutate
          "
        `)
      expect(await fetchesTale()).toMatchInlineSnapshot(`
        "
        mutation.test (client) < {}
        "
      `)
    })
  })

  it.concurrent('with input and loader', async () => {
    const root = createRoot()
    const q = root
      .lets('action', 'test')
      .input(z.object({ y: z.number() }))
      .loader(({ input }) => ({ x: input.y * 2 }))
      .mutation()
      .action()
    const page = root.lets('page', 'home', '/').page(() => {
      const mutation = q.useMutation()
      return (
        <div id="page">
          <div id="data">x={mutation.data?.x ?? 'nothing'}</div>
          <button id="mutate" onClick={() => mutation.mutate({ y: 123 })}>
            Mutate
          </button>
        </div>
      )
    })

    const { render, fetchesTale } = await createTestThings({ points: [root, q, page] })
    await render(page.route(), async ({ waitContent, tale, click }) => {
      await waitContent('#data')
      await click('#mutate')
      await waitContent('x=246')
      expect(await tale()).toMatchInlineSnapshot(`
          "
          /
            #page:
              #data: x=nothing
              #mutate: Mutate

            #page:
              #data: x=246
              #mutate: Mutate
          "
        `)
      expect(await fetchesTale()).toMatchInlineSnapshot(`
        "
        mutation.test (client) < {"y":123}
        "
      `)
    })
  })

  it.concurrent('with input and clientLoader', async () => {
    const root = createRoot()
    const q = root
      .lets('action', 'test')
      .clientInput(z.object({ y: z.number() }))
      .clientLoader(({ input }) => ({ x: input.y * 2 }))
      .mutation()
      .action()
    const page = root.lets('page', 'home', '/').page(() => {
      const mutation = q.useMutation()
      return (
        <div id="page">
          <div id="data">x={mutation.data?.x ?? 'nothing'}</div>
          <button id="mutate" onClick={() => mutation.mutate({ y: 123 })}>
            Mutate
          </button>
        </div>
      )
    })

    const { render, fetchesTale } = await createTestThings({ points: [root, q, page] })
    await render(page.route(), async ({ waitContent, tale, click }) => {
      await waitContent('#data')
      await click('#mutate')
      await waitContent('x=246')
      expect(await tale()).toMatchInlineSnapshot(`
          "
          /
            #page:
              #data: x=nothing
              #mutate: Mutate

            #page:
              #data: x=246
              #mutate: Mutate
          "
        `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
        "

        "
      `)
  })

  it.concurrent('with input and clientLoader and loader', async () => {
    const root = createRoot()
    const q = root
      .lets('action', 'test')
      .sharedInput(z.object({ y: z.number() }))
      .loader(() => ({ z: 3 }))
      .clientLoader(({ input }) => ({ x: input.y * 2 }))
      .mutation()
      .action()
    const page = root.lets('page', 'home', '/').page(() => {
      const mutation = q.useMutation()
      return (
        <div id="page">
          <div id="data">x={mutation.data?.x ?? 'nothing'}</div>
          <button id="mutate" onClick={() => mutation.mutate({ y: 123 })}>
            Mutate
          </button>
        </div>
      )
    })

    const { render, fetchesTale } = await createTestThings({ points: [root, q, page] })
    await render(page.route(), async ({ waitContent, tale, click }) => {
      await waitContent('#data')
      await click('#mutate')
      await waitContent('x=246')
      expect(await tale()).toMatchInlineSnapshot(`
          "
          /
            #page:
              #data: x=nothing
              #mutate: Mutate

            #page:
              #data: x=246
              #mutate: Mutate
          "
        `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
        "
        mutation.test (client) < {"y":123}
        "
      `)
  })
})
