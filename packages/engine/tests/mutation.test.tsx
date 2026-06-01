import { describe, expect, it } from 'bun:test'
import { getMutationPredicate, Point0 } from '@point0/core'
import { QueryClient } from '@tanstack/react-query'
import z from 'zod'
import { createTestThings } from './utils/internal-testing.js'

describe('mutation', () => {
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

  it.concurrent('simple', async () => {
    const root = createRoot()
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

    const { render, fetchesTale } = await createTestThings({ ssr: true, points: [root, q, page] })
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

    const { render, fetchesTale } = await createTestThings({ ssr: true, points: [root, q, page] })
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

    const { render, fetchesTale } = await createTestThings({ ssr: true, points: [root, q, page] })
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

    const { render, fetchesTale } = await createTestThings({ ssr: true, points: [root, q, page] })
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

    const { render, fetchesTale } = await createTestThings({ ssr: true, points: [root, q, page] })
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
      .lets('mutation', 'test')
      .sharedInput(z.object({ y: z.number() }))
      .loader(() => ({ z: 3 }))
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

    const { render, fetchesTale } = await createTestThings({ ssr: true, points: [root, q, page] })
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

  it.concurrent('with file loader', async () => {
    const root = createRoot()
    const q = root
      .lets('mutation', 'test')
      .input(z.object({ file: z.instanceof(File) }))
      .loader(({ input }) => {
        expect(input.file).toBeInstanceOf(File)
        expect(input.file.name).toBe('test.txt')
        expect(input.file.type).toContain('text/plain')
        expect(input.file.size).toBeGreaterThan(0)
        return { x: input.file.name }
      })
      .mutation({
        onError: (error) => {
          console.error(error)
        },
      })
    const page = root.lets('page', 'home', '/').page(() => {
      const mutation = q.useMutation()
      return (
        <div id="page">
          <div id="data">x={mutation.data?.x ?? 'nothing'}</div>
          <button
            id="mutate"
            onClick={() =>
              mutation.mutate({
                file: new File(['hello from test payload'], 'test.txt', { type: 'text/plain' }),
              })
            }
          >
            Mutate
          </button>
        </div>
      )
    })

    const { render, fetchesTale } = await createTestThings({ ssr: true, points: [root, q, page] })
    await render(page.route(), async ({ waitContent, tale, click }) => {
      await waitContent('#data')
      await click('#mutate')
      await waitContent('x=test.txt')
      expect(await tale()).toMatchInlineSnapshot(`
          "
          /
            #page:
              #data: x=nothing
              #mutate: Mutate

            #page:
              #data: x=test.txt
              #mutate: Mutate
          "
        `)
      expect(await fetchesTale()).toMatchInlineSnapshot(`
        "
        mutation.test (client) < {"file":{}}
        "
      `)
    })
  })

  describe('helpers', () => {
    it.concurrent('mutation helper methods', async () => {
      const root = createRoot()
      const q = root
        .lets('mutation', 'helpers')
        .sharedInput(z.object({ id: z.number().optional() }))
        .clientLoader(({ input }) => ({ id: input.id ?? 0, ok: true }))
        .mutation()
      const queryClient = new QueryClient()
      const input = { id: 7 }

      expect(q.getMutationKey()).toEqual(['point0', { scope: 'root', type: 'mutation', name: 'helpers', tags: [] }])
      expect(q.getMutationOptions().mutationKey).toEqual(q.getMutationKey())

      expect(q.getMutationCache(input, { queryClient })).toBeUndefined()
      expect(q.getMutationsCache(true, { queryClient })).toEqual([])

      const mutation = queryClient.getMutationCache().build(queryClient, {
        ...q.getMutationOptions(),
        mutationFn: async (variables: typeof input) => ({ id: variables.id, ok: true }),
      } as any)
      const result = await mutation.execute(input)
      expect(result).toEqual({ id: 7, ok: true })

      const cachedMutation = q.getMutationCache(input, { queryClient })
      expect(cachedMutation?.state.variables).toEqual(input)
      expect(cachedMutation?.state.data).toEqual({ id: 7, ok: true })

      const allMutations = q.getMutationsCache(true, { queryClient })
      expect(allMutations.length).toBe(1)
      expect(allMutations[0]?.state.variables).toEqual(input)
      expect(allMutations[0]?.state.data).toEqual({ id: 7, ok: true })

      const filteredMutations = q.getMutationsCache((variables) => variables.id === 7, { queryClient })
      expect(filteredMutations.length).toBe(1)
      expect(filteredMutations[0]?.state.variables).toEqual(input)
    })

    it.concurrent('getMutationPredicate filters mutation cache by tags', async () => {
      const root = createRoot()
      const ma = root
        .lets('mutation', 'helpers-tag-a')
        .tag('my-tag-a')
        .sharedInput(z.object({ id: z.number() }))
        .clientLoader(({ input }) => ({ id: input.id, ok: true }))
        .mutation()
      const mb = root
        .lets('mutation', 'helpers-tag-b')
        .tag('my-tag-b')
        .sharedInput(z.object({ id: z.number() }))
        .clientLoader(({ input }) => ({ id: input.id, ok: true }))
        .mutation()
      const queryClient = new QueryClient()

      const mutationA = queryClient.getMutationCache().build(queryClient, {
        ...ma.getMutationOptions(),
        mutationFn: async (variables: { id: number }) => ({ id: variables.id, ok: true }),
      } as any)
      const mutationB = queryClient.getMutationCache().build(queryClient, {
        ...mb.getMutationOptions(),
        mutationFn: async (variables: { id: number }) => ({ id: variables.id, ok: true }),
      } as any)
      await mutationA.execute({ id: 1 })
      await mutationB.execute({ id: 2 })

      const tagAMutations = queryClient.getMutationCache().findAll({
        predicate: getMutationPredicate({ tags: 'my-tag-a' }),
      })
      expect(tagAMutations.length).toBe(1)
      expect(tagAMutations[0]?.state.data).toEqual({ id: 1, ok: true })

      const tagBMutations = queryClient.getMutationCache().findAll({
        predicate: getMutationPredicate({ tags: ['my-tag-b'] }),
      })
      expect(tagBMutations.length).toBe(1)
      expect(tagBMutations[0]?.state.data).toEqual({ id: 2, ok: true })

      const scopedByName = queryClient.getMutationCache().findAll({
        predicate: getMutationPredicate({ type: 'mutation', name: 'helpers-tag-a', scope: 'root' }),
      })
      expect(scopedByName.length).toBe(1)
      expect(scopedByName[0]?.state.data).toEqual({ id: 1, ok: true })

      // `id` is exposed on every point as `scope:type:name`, and predicates accept it
      expect(ma.id).toBe('root:mutation:helpers-tag-a')
      const byId = queryClient.getMutationCache().findAll({
        predicate: getMutationPredicate({ id: ma.id }),
      })
      expect(byId.length).toBe(1)
      expect(byId[0]?.state.data).toEqual({ id: 1, ok: true })
    })
  })
})
