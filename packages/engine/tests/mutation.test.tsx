import { Point0 } from '@point0/core'
import { describe, expect, it } from 'bun:test'
import { createTestThings } from './utils/internal-testing.js'
import z from 'zod'

describe('mutation', () => {
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
      .lets('mutation', 'test')
      .loader(() => ({ x: 1 }))
      .mutation()
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
          "/
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
        "mutation.test (client) < {}
        "
      `)
  })

  it('with clientLoader', async () => {
    const q = root
      .lets('mutation', 'test')
      .clientLoader(() => ({ y: 2 }))
      .mutation()
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
          "/
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

  it('with loader and clientLoader', async () => {
    const q = root
      .lets('mutation', 'test')
      .loader(() => ({ x: 1 }))
      .clientLoader(({ data }) => ({ y: 2, ...data }))
      .mutation()
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
          "/
            #page:
              #data: x=nothing y=nothing
              #mutate: Mutate

            #page:
              #data: x=1 y=2
              #mutate: Mutate
          "
        `)
      expect(await fetchesTale()).toMatchInlineSnapshot(`
        "mutation.test (client) < {}
        "
      `)
    })
  })

  it('with input and loader', async () => {
    const q = root
      .lets('mutation', 'test')
      .input(z.object({ y: z.number() }))
      .loader(({ input }) => ({ x: input.y * 2 }))
      .mutation()
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
          "/
            #page:
              #data: x=nothing
              #mutate: Mutate

            #page:
              #data: x=246
              #mutate: Mutate
          "
        `)
      expect(await fetchesTale()).toMatchInlineSnapshot(`
        "mutation.test (client) < {"y":123}
        "
      `)
    })
  })

  it('with input and clientLoader', async () => {
    const q = root
      .lets('mutation', 'test')
      .clientInput(z.object({ y: z.number() }))
      .clientLoader(({ input }) => ({ x: input.y * 2 }))
      .mutation()
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
          "/
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

  it('with input and clientLoader and loader', async () => {
    const q = root
      .lets('mutation', 'test')
      .combinedInput(z.object({ y: z.number() }))
      .loader(({ data }) => ({ z: 3 }))
      .clientLoader(({ input }) => ({ x: input.y * 2 }))
      .mutation()
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
          "/
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
        "mutation.test (client) < {"y":123}
        "
      `)
  })
})
