import { Point0 } from '@point0/core'
import { describe, expect, expectTypeOf, it } from 'bun:test'
import { z } from 'zod'
import { createTestThings } from './utils/internal-testing.js'

describe('input', () => {
  it('params by route definition (server loader)', async () => {
    const root = Point0.lets('root', 'root').root()
    const page = root
      .lets('page', 'test', '/test/:id')
      .loader(({ params }) => {
        expectTypeOf<typeof params>().toEqualTypeOf<{ id: string }>()
        expect(params).toEqual({ id: '123' })
        return { x: 1 }
      })
      .page(({ params, data }) => {
        expectTypeOf<typeof params>().toEqualTypeOf<{ id: string }>()
        expect(params).toEqual({ id: '123' })
        return <div id="page">{data.x}</div>
      })
    const { render } = await createTestThings({ ssr: true, points: [root, page] })
    await render(page.route({ id: '123' }), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /test/123
          Loading...

          #page: 1
        "
      `)
    })
  })

  it('params by route definition (client loader)', async () => {
    const root = Point0.lets('root', 'root').root()
    const page = root
      .lets('page', 'test', '/test/:id')
      .clientLoader(({ params }) => {
        expectTypeOf<typeof params>().toEqualTypeOf<{ id: string }>()
        expect(params).toEqual({ id: '123' })
        return { y: 2 }
      })
      .page(({ params, data }) => {
        expectTypeOf<typeof params>().toEqualTypeOf<{ id: string }>()
        expect(params).toEqual({ id: '123' })
        return <div id="page">{data.y}</div>
      })
    const { render } = await createTestThings({ ssr: true, points: [root, page] })
    await render(page.route({ id: '123' }), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /test/123
          Loading...

          #page: 2
        "
      `)
    })
  })

  it('params by schema (server loader)', async () => {
    const root = Point0.lets('root', 'root').root()
    const page = root
      .lets('page', 'test', '/test/:id')
      .params(z.object({ id: z.string().transform((val) => +val) }))
      .loader(({ params }) => {
        expectTypeOf<typeof params>().toEqualTypeOf<{ id: number }>()
        expect(params).toEqual({ id: 123 })
        return { x: 1 }
      })
      .page(({ params, data }) => {
        expectTypeOf<typeof params>().toEqualTypeOf<{ id: number }>()
        expect(params).toEqual({ id: 123 })
        return <div id="page">{data.x}</div>
      })
    const { render } = await createTestThings({ ssr: true, points: [root, page] })
    await render(page.route({ id: '123' }), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /test/123
          Loading...

          #page: 1
        "
      `)
    })
  })

  it('params by schema (client loader)', async () => {
    const root = Point0.lets('root', 'root').root()
    const page = root
      .lets('page', 'test', '/test/:id')
      .params(z.object({ id: z.string().transform((val) => +val) }))
      .clientLoader(({ params }) => {
        expectTypeOf<typeof params>().toEqualTypeOf<{ id: number }>()
        expect(params).toEqual({ id: 123 })
        return { y: 2 }
      })
      .page(({ params, data }) => {
        expectTypeOf<typeof params>().toEqualTypeOf<{ id: number }>()
        expect(params).toEqual({ id: 123 })
        return <div id="page">{data.y}</div>
      })
    const { render } = await createTestThings({ ssr: true, points: [root, page] })
    await render(page.route({ id: '123' }), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /test/123
          Loading...

          #page: 2
        "
      `)
    })
  })

  it('params by custom validate fn (server loader)', async () => {
    const root = Point0.lets('root', 'root').root()
    const page = root
      .lets('page', 'test', '/test/:id')
      .params((params) => {
        return {
          id: +params.id,
        }
      })
      .loader(({ params }) => {
        expectTypeOf<typeof params>().toEqualTypeOf<{ id: number }>()
        expect(params).toEqual({ id: 123 })
        return { x: 1 }
      })
      .page(({ params, data }) => {
        expectTypeOf<typeof params>().toEqualTypeOf<{ id: number }>()
        expect(params).toEqual({ id: 123 })
        return <div id="page">{data.x}</div>
      })
    const { render } = await createTestThings({ ssr: true, points: [root, page] })
    await render(page.route({ id: '123' }), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /test/123
          Loading...

          #page: 1
        "
      `)
    })
  })

  it('params by custom validate fn (client loader)', async () => {
    const root = Point0.lets('root', 'root').root()
    const page = root
      .lets('page', 'test', '/test/:id')
      .params((params) => {
        return {
          id: +params.id,
        }
      })
      .clientLoader(({ params }) => {
        expectTypeOf<typeof params>().toEqualTypeOf<{ id: number }>()
        expect(params).toEqual({ id: 123 })
        return { y: 2 }
      })
      .page(({ params, data }) => {
        expectTypeOf<typeof params>().toEqualTypeOf<{ id: number }>()
        expect(params).toEqual({ id: 123 })
        return <div id="page">{data.y}</div>
      })
    const { render } = await createTestThings({ ssr: true, points: [root, page] })
    await render(page.route({ id: '123' }), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /test/123
          Loading...

          #page: 2
        "
      `)
    })
  })

  it('search by schema (server loader)', async () => {
    const root = Point0.lets('root', 'root').root()
    const page = root
      .lets('page', 'test', '/test/:id')
      .search(z.object({ cursor: z.string().transform((val) => +val) }))
      .loader(({ params, search }) => {
        expectTypeOf<typeof params>().toEqualTypeOf<{ id: string }>()
        expect(params).toEqual({ id: '123' })
        expectTypeOf<typeof search>().toEqualTypeOf<{ cursor: number }>()
        expect(search).toEqual({ cursor: 777 })
        return { x: 1 }
      })
      .page(({ params, search, data }) => {
        expectTypeOf<typeof params>().toEqualTypeOf<{ id: string }>()
        expect(params).toEqual({ id: '123' })
        expectTypeOf<typeof search>().toEqualTypeOf<{ cursor: number }>()
        expect(search).toEqual({ cursor: 777 })
        return <div id="page">{data.x}</div>
      })
    const { render } = await createTestThings({ ssr: true, points: [root, page] })
    await render(page.route({ id: '123', '?': { cursor: '777' } }), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /test/123?cursor=777
          Loading...

          #page: 1
        "
      `)
    })
  })

  it('search by schema (client loader)', async () => {
    const root = Point0.lets('root', 'root').root()
    const page = root
      .lets('page', 'test', '/test/:id')
      .search(z.object({ cursor: z.string().transform((val) => +val) }))
      .clientLoader(({ params, search }) => {
        expectTypeOf<typeof params>().toEqualTypeOf<{ id: string }>()
        expect(params).toEqual({ id: '123' })
        expectTypeOf<typeof search>().toEqualTypeOf<{ cursor: number }>()
        expect(search).toEqual({ cursor: 777 })
        return { y: 2 }
      })
      .page(({ params, search, data }) => {
        expectTypeOf<typeof params>().toEqualTypeOf<{ id: string }>()
        expect(params).toEqual({ id: '123' })
        expectTypeOf<typeof search>().toEqualTypeOf<{ cursor: number }>()
        expect(search).toEqual({ cursor: 777 })
        return <div id="page">{data.y}</div>
      })
    const { render } = await createTestThings({ ssr: true, points: [root, page] })
    await render(page.route({ id: '123', '?': { cursor: '777' } }), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /test/123?cursor=777
          Loading...

          #page: 2
        "
      `)
    })
  })

  it('search by custom validate fn (server loader)', async () => {
    const root = Point0.lets('root', 'root').root()
    const page = root
      .lets('page', 'test', '/test/:id')
      .search((search) => {
        return {
          cursor: +search.cursor,
        }
      })
      .loader(({ params, search }) => {
        expectTypeOf<typeof params>().toEqualTypeOf<{ id: string }>()
        expect(params).toEqual({ id: '123' })
        expectTypeOf<typeof search>().toEqualTypeOf<{ cursor: number }>()
        expect(search).toEqual({ cursor: 777 })
        return { x: 1 }
      })
      .page(({ params, search, data }) => {
        expectTypeOf<typeof params>().toEqualTypeOf<{ id: string }>()
        expect(params).toEqual({ id: '123' })
        expectTypeOf<typeof search>().toEqualTypeOf<{ cursor: number }>()
        expect(search).toEqual({ cursor: 777 })
        return <div id="page">{data.x}</div>
      })
    const { render } = await createTestThings({ ssr: true, points: [root, page] })
    await render(page.route({ id: '123', '?': { cursor: '777' } }), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /test/123?cursor=777
          Loading...

          #page: 1
        "
      `)
    })
  })

  it('search by custom validate fn (client loader)', async () => {
    const root = Point0.lets('root', 'root').root()
    const page = root
      .lets('page', 'test', '/test/:id')
      .search((search) => {
        return {
          cursor: +search.cursor,
        }
      })
      .clientLoader(({ params, search }) => {
        expectTypeOf<typeof params>().toEqualTypeOf<{ id: string }>()
        expect(params).toEqual({ id: '123' })
        expectTypeOf<typeof search>().toEqualTypeOf<{ cursor: number }>()
        expect(search).toEqual({ cursor: 777 })
        return { y: 2 }
      })
      .page(({ params, search, data }) => {
        expectTypeOf<typeof params>().toEqualTypeOf<{ id: string }>()
        expect(params).toEqual({ id: '123' })
        expectTypeOf<typeof search>().toEqualTypeOf<{ cursor: number }>()
        expect(search).toEqual({ cursor: 777 })
        return <div id="page">{data.y}</div>
      })
    const { render } = await createTestThings({ ssr: true, points: [root, page] })
    await render(page.route({ id: '123', '?': { cursor: '777' } }), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /test/123?cursor=777
          Loading...

          #page: 2
        "
      `)
    })
  })

  it('search by type (unsafe) (server loader)', async () => {
    const root = Point0.lets('root', 'root').root()
    const page = root
      .lets('page', 'test', '/test/:id')
      .search<{ cursor?: string }>()
      .loader(({ params, search }) => {
        expectTypeOf<typeof params>().toEqualTypeOf<{ id: string }>()
        expect(params).toEqual({ id: '123' })
        expectTypeOf<typeof search>().toEqualTypeOf<{ cursor?: string }>()
        expect(search).toEqual({ cursor: '777' })
        return { x: 1 }
      })
      .page(({ params, search, data }) => {
        expectTypeOf<typeof params>().toEqualTypeOf<{ id: string }>()
        expect(params).toEqual({ id: '123' })
        expectTypeOf<typeof search>().toEqualTypeOf<{ cursor?: string }>()
        expect(search).toEqual({ cursor: '777' })
        return <div id="page">{data.x}</div>
      })
    const { render } = await createTestThings({ ssr: true, points: [root, page] })
    await render(page.route({ id: '123', '?': { cursor: '777' } }), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /test/123?cursor=777
          Loading...

          #page: 1
        "
      `)
    })
  })

  it('search by type (unsafe) (client loader)', async () => {
    const root = Point0.lets('root', 'root').root()
    const page = root
      .lets('page', 'test', '/test/:id')
      .search<{ cursor?: string }>()
      .clientLoader(({ params, search }) => {
        expectTypeOf<typeof params>().toEqualTypeOf<{ id: string }>()
        expect(params).toEqual({ id: '123' })
        expectTypeOf<typeof search>().toEqualTypeOf<{ cursor?: string }>()
        expect(search).toEqual({ cursor: '777' })
        return { y: 2 }
      })
      .page(({ params, search, data }) => {
        expectTypeOf<typeof params>().toEqualTypeOf<{ id: string }>()
        expect(params).toEqual({ id: '123' })
        expectTypeOf<typeof search>().toEqualTypeOf<{ cursor?: string }>()
        expect(search).toEqual({ cursor: '777' })
        return <div id="page">{data.y}</div>
      })
    const { render } = await createTestThings({ ssr: true, points: [root, page] })
    await render(page.route({ id: '123', '?': { cursor: '777' } }), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /test/123?cursor=777
          Loading...

          #page: 2
        "
      `)
    })
  })

  it('works with unions', async () => {
    const root = Point0.lets('root', 'root').root()
    const mutation = root
      .lets('mutation', 'test')
      .input(z.union([z.object({ id: z.string() }), z.object({ sn: z.number() })]))
      .loader(({ input }) => {
        return { loader: { input } }
      })
      .mutation()
    expectTypeOf<typeof mutation.Infer.InputRaw>().toEqualTypeOf<{ id: string } | { sn: number }>()
    expectTypeOf<typeof mutation.Infer.IsInputOptional>().toEqualTypeOf<false>()
    expectTypeOf<typeof mutation.Infer.InputRawOrUndefined>().toEqualTypeOf<{ id: string } | { sn: number }>()
    const { loadPointYml } = await createTestThings({ ssr: true, points: [root, mutation] })
    const result = await loadPointYml(mutation, { id: '123' })
    expect(result).toMatchInlineSnapshot(`
      "
      loader: 
        input: 
          id: "123"
      "
    `)
  })

  it('works with unions when one is optional', async () => {
    const root = Point0.lets('root', 'root').root()
    const mutation = root
      .lets('mutation', 'test')
      .input(z.union([z.object({ id: z.string() }), z.object({ sn: z.number().optional() })]))
      .loader(({ input }) => {
        return { loader: { input } }
      })
      .mutation()
    expectTypeOf<typeof mutation.Infer.InputRaw>().toEqualTypeOf<{ id: string } | { sn?: number }>()
    expectTypeOf<typeof mutation.Infer.IsInputOptional>().toEqualTypeOf<true>()
    expectTypeOf<typeof mutation.Infer.InputRawOrUndefined>().toEqualTypeOf<{ id: string } | { sn?: number }>()
    const { loadPointYml } = await createTestThings({ ssr: true, points: [root, mutation] })
    const result = await loadPointYml(mutation)
    expect(result).toMatchInlineSnapshot(`
      "
      loader: 
        input: 
          {}
      "
    `)
  })

  it('works with unions and additional extension', async () => {
    const root = Point0.lets('root', 'root').root()
    const mutation = root
      .lets('mutation', 'test')
      .input(z.union([z.object({ id: z.string() }), z.object({ sn: z.number() })]))
      .input(z.object({ x: z.string() }))
      .loader(({ input }) => {
        return { loader: { input } }
      })
      .mutation()
    expectTypeOf<typeof mutation.Infer.InputRaw>().toEqualTypeOf<
      { x: string; id: string } | { x: string; sn: number }
    >()
    expectTypeOf<typeof mutation.Infer.IsInputOptional>().toEqualTypeOf<false>()
    expectTypeOf<typeof mutation.Infer.InputRawOrUndefined>().toEqualTypeOf<
      { x: string; id: string } | { x: string; sn: number }
    >()
    const { loadPointYml } = await createTestThings({ ssr: true, points: [root, mutation] })
    const result = await loadPointYml(mutation, { id: '456', x: '123' })
    expect(result).toMatchInlineSnapshot(`
      "
      loader: 
        input: 
          id: "456"
          x: "123"
      "
    `)
  })

  it('can be extended by union', async () => {
    const root = Point0.lets('root', 'root').root()
    const mutation = root
      .lets('mutation', 'test')
      .input(z.object({ x: z.string() }))
      .input(z.union([z.object({ id: z.string() }), z.object({ sn: z.number().optional() })]))
      .loader(({ input }) => {
        return { loader: { input } }
      })
      .mutation()
    expectTypeOf<typeof mutation.Infer.InputRaw>().toEqualTypeOf<
      { x: string; id: string } | { x: string; sn?: number | undefined }
    >()
    expectTypeOf<typeof mutation.Infer.IsInputOptional>().toEqualTypeOf<false>()
    expectTypeOf<typeof mutation.Infer.InputRawOrUndefined>().toEqualTypeOf<
      { x: string; id: string } | { x: string; sn?: number }
    >()
    const { loadPointYml } = await createTestThings({ ssr: true, points: [root, mutation] })
    const result = await loadPointYml(mutation, { x: '123', id: '456' })
    expect(result).toMatchInlineSnapshot(`
      "
      loader: 
        input: 
          id: "456"
          x: "123"
      "
    `)
  })

  it('union can be extended by non union', async () => {
    const root = Point0.lets('root', 'root').root()
    const mutation = root
      .lets('mutation', 'test')
      .input(z.union([z.object({ id: z.string() }), z.object({ sn: z.number().optional() })]))
      .input(z.object({ x: z.string() }))
      .loader(({ input }) => {
        return { loader: { input } }
      })
      .mutation()
    expectTypeOf<typeof mutation.Infer.InputRaw>().toEqualTypeOf<
      { x: string; id: string } | { x: string; sn?: number }
    >()
    expectTypeOf<typeof mutation.Infer.IsInputOptional>().toEqualTypeOf<false>()
    expectTypeOf<typeof mutation.Infer.InputRawOrUndefined>().toEqualTypeOf<
      { x: string; id: string } | { x: string; sn?: number }
    >()
    const { loadPointYml } = await createTestThings({ ssr: true, points: [root, mutation] })
    const result = await loadPointYml(mutation, { x: '123', id: '456' })
    expect(result).toMatchInlineSnapshot(`
      "
      loader: 
        input: 
          id: "456"
          x: "123"
      "
    `)
  })

  it('available in mutation loader by schema definition and function and generic', async () => {
    const root = Point0.lets('root', 'root').root()
    const mutation = root
      .lets('mutation', 'test')
      .input(z.object({ id: z.string() }))
      .input<{ o: 1 }>()
      .input<{ id: string; sn: number }, { sn: number; xxx: number }>((raw) => {
        if (typeof raw.sn !== 'number') {
          throw new Error('sn is not a number')
        }
        return { sn: raw.sn * 2, xxx: 3 }
      })
      .loader(({ input }) => {
        return { loader: { input } }
      })
      .mutation()
    expectTypeOf<(typeof mutation)['Infer']['InputRaw']>().toEqualTypeOf<{ id: string; sn: number; o: 1 }>()
    expectTypeOf<(typeof mutation)['Infer']['ServerInputParsed']>().toEqualTypeOf<{
      id: string
      sn: number
      xxx: number
      o: 1
    }>()
    const { loadPointYml } = await createTestThings({ ssr: true, points: [root, mutation] })
    const result = await loadPointYml(mutation, { id: '123', sn: 234, o: 1 })
    expect(result).toMatchInlineSnapshot(`
      "
      loader: 
        input: 
          id: "123"
          o: 1
          sn: 468
          xxx: 3
      "
    `)
  })

  it('available in mutation clientLoader by schema definition and function and generic', async () => {
    const root = Point0.lets('root', 'root').root()
    const mutation = root
      .lets('mutation', 'test')
      .clientInput(z.object({ id: z.string() }))
      .clientInput<{ o: 1 }>()
      .clientInput<{ id: string; sn: number }, { sn: number; xxx: number }>((raw) => {
        if (typeof raw.sn !== 'number') {
          throw new Error('sn is not a number')
        }
        return { sn: raw.sn * 2, xxx: 3 }
      })
      .clientLoader(({ input }) => {
        return { clientLoader: { input } }
      })
      .mutation()
    expectTypeOf<(typeof mutation)['Infer']['InputRaw']>().toEqualTypeOf<{ id: string; sn: number; o: 1 }>()
    expectTypeOf<(typeof mutation)['Infer']['ClientInputParsed']>().toEqualTypeOf<{
      id: string
      sn: number
      xxx: number
      o: 1
    }>()
    const { loadPointYml } = await createTestThings({ ssr: true, points: [root, mutation] })
    const result = await loadPointYml(mutation, { id: '123', sn: 234, o: 1 })
    expect(result).toMatchInlineSnapshot(`
      "
      clientLoader: 
        input: 
          id: "123"
          sn: 468
          o: 1
          xxx: 3
      "
    `)
  })

  it('correctly typed when default in schema exists in mutation', async () => {
    const root = Point0.lets('root', 'root').root()
    const mutation = root
      .lets('mutation', 'test')
      .input(z.object({ id: z.string(), sn: z.coerce.number().default(234) }))
      .loader(({ input }) => {
        return { loader: { input } }
      })
      .mutation()
    expectTypeOf<(typeof mutation)['Infer']['InputRaw']>().toEqualTypeOf<{ id: string; sn?: unknown }>()
    expectTypeOf<(typeof mutation)['Infer']['ServerInputParsed']>().toEqualTypeOf<{ id: string; sn: number }>()
    const { loadPointYml } = await createTestThings({ ssr: true, points: [root, mutation] })
    const result = await loadPointYml(mutation, { id: '123' })
    expect(result).toMatchInlineSnapshot(`
      "
      loader: 
        input: 
          id: "123"
          sn: 234
      "
    `)
  })

  it('correctly typed when default in schema exists in page', async () => {
    const root = Point0.lets('root', 'root').root()
    const layout = root.lets('layout', 'layout').layout(({ children }) => {
      return <div>{children}</div>
    })
    const page = root
      .lets('page', 'test', '/test')
      .search(z.object({ id: z.string(), sn: z.number().default(234) }))
      .loader(({ search }) => {
        expectTypeOf<typeof search>().toEqualTypeOf<{ id: string; sn: number }>()
        return { loader: { search } }
      })
      .page()
    const { loadPointYml } = await createTestThings({ ssr: true, points: [root, layout, page] })
    const result = await loadPointYml(page, { '?': { id: '123' } })
    expect(result).toMatchInlineSnapshot(`
      "
      loader: 
        search: 
          id: "123"
          sn: 234
      "
    `)
  })

  it('input and sharedInput combine for the server loader', async () => {
    const root = Point0.lets('root', 'root').root()
    const mutation = root
      .lets('mutation', 'test')
      .input(z.object({ a: z.string() }))
      .sharedInput(z.object({ c: z.number() }))
      .input(z.object({ e: z.number() }))
      .loader(({ input }) => {
        expectTypeOf<typeof input>().toEqualTypeOf<{ a: string; c: number; e: number }>()
        return { loader: { input } }
      })
      .mutation()
    const { loadPointYml } = await createTestThings({ ssr: true, points: [root, mutation] })
    const result = await loadPointYml(mutation, { a: '123', c: 345, e: 456 })
    expect(result).toMatchInlineSnapshot(`
      "
      loader: 
        input: 
          a: "123"
          c: 345
          e: 456
      "
    `)
  })

  it('clientInput and sharedInput combine for the client loader', async () => {
    const root = Point0.lets('root', 'root').root()
    const mutation = root
      .lets('mutation', 'test')
      .clientInput(z.object({ b: z.number() }))
      .sharedInput(z.object({ c: z.number() }))
      .clientInput(z.object({ d: z.boolean() }))
      .clientLoader(({ input }) => {
        expectTypeOf<typeof input>().toEqualTypeOf<{ b: number; c: number; d: boolean }>()
        return { clientLoader: { input } }
      })
      .mutation()
    const { loadPointYml } = await createTestThings({ ssr: true, points: [root, mutation] })
    const result = await loadPointYml(mutation, { b: 234, c: 345, d: true })
    expect(result).toMatchInlineSnapshot(`
      "
      clientLoader: 
        input: 
          b: 234
          c: 345
          d: true
      "
    `)
  })

  it('do not allow conflicted schema by route', async () => {
    const root = Point0.lets('root', 'root').root()
    const layout = root
      .lets('layout', 'layout', '/:x')
      .params(z.object({ x: z.string() }))
      .search(z.object({ z: z.number() })) // it is ok
      .layout(({ children }) => {
        return <div>{children}</div>
      })
    layout
      .lets('page', 'test', '/:y')
      .params(z.object({ y: z.number() }))
      // @ts-expect-error - it is bad
      .page()
  })

  it('do not allow conflicted schema by schema', async () => {
    const root = Point0.lets('root', 'root').root()
    root
      .lets('mutation', 'test')
      .input(z.object({ x: z.union([z.string(), z.number()]), z: z.number() })) // it is ok
      .input(z.object({ x: z.string(), z: z.number() })) // it is ok
      .input(z.object({ x: z.number(), z: z.number() }))
      // @ts-expect-error - it is bad
      .loader(({ input }) => {
        return { input }
      })
      .mutation()
  })

  it('do not allow conflicted schema by schema after unions', async () => {
    const root = Point0.lets('root', 'root').root()
    root
      .lets('mutation', 'test')
      .input(z.union([z.object({ id: z.string() }), z.object({ sn: z.number() })])) // it is ok
      .input(z.object({ x: z.string() })) // it is ok
      .input(z.object({ id: z.number() }))
      // @ts-expect-error - it is bad
      .loader(({ input }) => {
        return { input }
      })
      .mutation()
  })

  it('do not allow conflicted schema by generic', async () => {
    const root = Point0.lets('root', 'root').root()
    root
      .lets('mutation', 'test')
      .input(z.object({ x: z.union([z.string(), z.number()]), z: z.number() })) // it is ok
      .input<{ x: string; z: number }>() // it is ok
      .input<{ x: number; z: number }>()
      // @ts-expect-error - it is bad
      .loader(({ input }) => {
        return { input }
      })
      .mutation()
  })

  it('do not allow conflicted schema by function', async () => {
    const root = Point0.lets('root', 'root').root()
    root
      .lets('mutation', 'test')
      .input(z.object({ x: z.union([z.string(), z.number()]), z: z.number() })) // it is ok
      .input<{ x: string; z: number }>((raw) => {
        if (typeof raw.x !== 'string') {
          throw new Error('x is not a string')
        }
        if (typeof raw.z !== 'number') {
          throw new Error('z is not a number')
        }
        return { x: raw.x, z: raw.z }
      }) // it is ok
      // @ts-expect-error - it is bad
      .input<{ x: number; z: number }>((raw) => {
        if (typeof raw.x !== 'number') {
          throw new Error('x is not a number')
        }
        if (typeof raw.z !== 'number') {
          throw new Error('z is not a number')
        }
        return { x: raw.x, z: raw.z }
      })
      // @ts-expect-error - it is bad
      .loader(({ input }) => {
        return { input }
      })
      .mutation()
  })

  it('a malformed query input fails with a 400 and our parse-error code — on GET (?input=) and POST (body)', async () => {
    const root = Point0.lets('root', 'root').root()
    const items = root
      .lets('query', 'items')
      .input(z.object({ id: z.string() }))
      .loader(({ input }) => ({ id: input.id }))
      .query()
    const { engine } = await createTestThings({ ssr: true, points: [root, items] })

    // GET: the input rides in the ?input= param — a non-JSON value fails to parse before it reaches the schema.
    const getResponse = await engine.fetch(
      new Request('http://localhost:3000/_point0/root/query/items?input=not-json', {
        headers: { Accept: 'application/json' },
      }),
    )
    expect(getResponse.status).toBe(400)
    expect(await getResponse.text()).toContain('POINT0_INPUT_PARSE_FAILED')

    // POST: the input rides in the body — a non-JSON body fails the same way (the endpoint answers to both methods).
    const postResponse = await engine.fetch(
      new Request('http://localhost:3000/_point0/root/query/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: 'not-json',
      }),
    )
    expect(postResponse.status).toBe(400)
    expect(await postResponse.text()).toContain('POINT0_INPUT_PARSE_FAILED')
  })
})
