// import '@testing-library/jest-dom'
import { describe, expect, expectTypeOf, it } from 'bun:test'
import type { InputParsed, Prettify } from '@point0/core'
import { Point0 } from '@point0/core'
import { z } from 'zod'
import { createTestThings, ymlify } from './utils/internal-testing.js'

describe('input', () => {
  it.concurrent('empty and available in page component by location params', async () => {
    const root = Point0.lets('root', 'root').ssr(true).root()
    let result: InputParsed | undefined
    const page = root.lets('page', 'test', '/test').page(({ location }) => {
      result = location.params
      return <div />
    })
    expectTypeOf<Prettify<typeof page.Infer.InputRaw>>().toEqualTypeOf<Record<never, never>>()
    expectTypeOf<typeof page.Infer.InputRawOrUndefined>().toEqualTypeOf<undefined>()
    expectTypeOf<typeof page.Infer.IsInputOptional>().toEqualTypeOf<true>()
    const { fetchSsr } = await createTestThings({ points: [root, page] })
    await fetchSsr(page)
    expect(result).toMatchInlineSnapshot(`{}`)
  })

  it.concurrent('available in page component by location params', async () => {
    const root = Point0.lets('root', 'root').ssr(true).root()
    let result: InputParsed | undefined
    const page = root.lets('page', 'test', '/test/:id').page(({ location }) => {
      result = location.params
      return <div />
    })
    const { fetchSsr } = await createTestThings({ points: [root, page] })
    await fetchSsr(page, { id: '123' })
    expect(result).toMatchInlineSnapshot(`
      {
        "id": "123",
      }
    `)
  })

  it.concurrent('available in page component and loader and clientLoader by route definition', async () => {
    const root = Point0.lets('root', 'root').ssr(true).root()
    let loaderResult: InputParsed | undefined
    let clientLoaderResult: InputParsed | undefined
    let pageResult: InputParsed | undefined
    const page = root
      .lets('page', 'test', '/test/:id')
      .loader(({ input }) => {
        loaderResult = input
        return { x: 1 }
      })
      .clientLoader(({ input }) => {
        clientLoaderResult = input
        return { y: 2 }
      })
      .page(({ location }) => {
        pageResult = location.params
        return <div id="page" />
      })
    const { render } = await createTestThings({ points: [root, page] })
    await render(page.route({ id: '123' }), async ({ waitContent }) => {
      await waitContent('#page')
    })
    expect(ymlify(loaderResult)).toMatchInlineSnapshot(`
      "
      id: "123"
      "
    `)
    expect(ymlify(clientLoaderResult)).toMatchInlineSnapshot(`
      "
      id: "123"
      "
    `)
    expect(ymlify(pageResult)).toMatchInlineSnapshot(`
      "
      id: "123"
      "
    `)
  })

  it.concurrent(
    'available in mutation loader by input schema definition, and empty object in clientLoader',
    async () => {
      const root = Point0.lets('root', 'root').ssr(true).root()
      const mutation = root
        .lets('mutation', 'test')
        .input(z.object({ id: z.number() }))
        .loader(({ input }) => {
          return { loader: { input } }
        })
        .clientLoader(({ input, data }) => {
          expectTypeOf<typeof input>().toEqualTypeOf<Record<never, never>>()
          return { clientLoader: { input }, ...data }
        })
        .mutation()
      expectTypeOf<Prettify<typeof mutation.Infer.InputRaw>>().toEqualTypeOf<{ id: number }>()
      expectTypeOf<typeof mutation.Infer.IsInputOptional>().toEqualTypeOf<false>()
      expectTypeOf<typeof mutation.Infer.InputRawOrUndefined>().toEqualTypeOf<{ id: number }>()
      const { loadPointYml } = await createTestThings({ points: [root, mutation] })
      const result = await loadPointYml(mutation, { id: 123 })
      expect(result).toMatchInlineSnapshot(`
      "
      clientLoader: 
        input: 
          {}
      loader: 
        input: 
          id: 123
      "
    `)
    },
  )

  it.concurrent('works with unions', async () => {
    const root = Point0.lets('root', 'root').ssr(true).root()
    const mutation = root
      .lets('mutation', 'test')
      .input(z.union([z.object({ id: z.string() }), z.object({ sn: z.number() })]))
      .loader(({ input }) => {
        return { loader: { input } }
      })
      .mutation()
    expectTypeOf<Prettify<typeof mutation.Infer.InputRaw>>().toEqualTypeOf<{ id: string } | { sn: number }>()
    expectTypeOf<typeof mutation.Infer.IsInputOptional>().toEqualTypeOf<false>()
    expectTypeOf<typeof mutation.Infer.InputRawOrUndefined>().toEqualTypeOf<{ id: string } | { sn: number }>()
    const { loadPointYml } = await createTestThings({ points: [root, mutation] })
    const result = await loadPointYml(mutation, { id: '123' })
    expect(result).toMatchInlineSnapshot(`
      "
      loader: 
        input: 
          id: "123"
      "
    `)
  })

  it.concurrent('works with unions when one is optional', async () => {
    const root = Point0.lets('root', 'root').ssr(true).root()
    const mutation = root
      .lets('mutation', 'test')
      .input(z.union([z.object({ id: z.string() }), z.object({ sn: z.number().optional() })]))
      .loader(({ input }) => {
        return { loader: { input } }
      })
      .mutation()
    expectTypeOf<Prettify<typeof mutation.Infer.InputRaw>>().toEqualTypeOf<{ id: string } | { sn?: number }>()
    expectTypeOf<typeof mutation.Infer.IsInputOptional>().toEqualTypeOf<true>()
    expectTypeOf<typeof mutation.Infer.InputRawOrUndefined>().toEqualTypeOf<{ id: string } | { sn?: number }>()
    const { loadPointYml } = await createTestThings({ points: [root, mutation] })
    const result = await loadPointYml(mutation)
    expect(result).toMatchInlineSnapshot(`
      "
      loader: 
        input: 
          {}
      "
    `)
  })

  it.concurrent('can be extended by union', async () => {
    const root = Point0.lets('root', 'root').ssr(true).root()
    const mutation = root
      .lets('mutation', 'test')
      .input(z.object({ x: z.string() }))
      .input(z.union([z.object({ id: z.string() }), z.object({ sn: z.number().optional() })]))
      .loader(({ input }) => {
        return { loader: { input } }
      })
      .mutation()
    expectTypeOf<typeof mutation.Infer.InputRaw>().toEqualTypeOf<{ x: string } & ({ id: string } | { sn?: number })>()
    expectTypeOf<typeof mutation.Infer.IsInputOptional>().toEqualTypeOf<false>()
    expectTypeOf<typeof mutation.Infer.InputRawOrUndefined>().toEqualTypeOf<
      { x: string } & ({ id: string } | { sn?: number })
    >()
    const { loadPointYml } = await createTestThings({ points: [root, mutation] })
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

  it.concurrent('union can be extended by non union', async () => {
    const root = Point0.lets('root', 'root').ssr(true).root()
    const mutation = root
      .lets('mutation', 'test')
      .input(z.union([z.object({ id: z.string() }), z.object({ sn: z.number().optional() })]))
      .input(z.object({ x: z.string() }))
      .loader(({ input }) => {
        return { loader: { input } }
      })
      .mutation()
    expectTypeOf<typeof mutation.Infer.InputRaw>().toEqualTypeOf<{ x: string } & ({ id: string } | { sn?: number })>()
    expectTypeOf<typeof mutation.Infer.IsInputOptional>().toEqualTypeOf<false>()
    expectTypeOf<typeof mutation.Infer.InputRawOrUndefined>().toEqualTypeOf<
      { x: string } & ({ id: string } | { sn?: number })
    >()
    const { loadPointYml } = await createTestThings({ points: [root, mutation] })
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

  it.concurrent('available in mutation loader and clientLoader by schema definition', async () => {
    const root = Point0.lets('root', 'root').ssr(true).root()
    const mutation = root
      .lets('mutation', 'test')
      .input(z.object({ id: z.string() }))
      .loader(({ input }) => {
        return { loader: { input } }
      })
      .clientInput(z.object({ sn: z.number() }))
      .clientLoader(({ input, data }) => {
        return { clientLoader: { input }, ...data }
      })
      .mutation()
    const { loadPointYml } = await createTestThings({ points: [root, mutation] })
    const result = await loadPointYml(mutation, { id: '123', sn: 234 })
    expect(result).toMatchInlineSnapshot(`
      "
      clientLoader: 
        input: 
          sn: 234
      loader: 
        input: 
          id: "123"
      "
    `)
  })

  it.concurrent('available in mutation loader by schema definition and function and generic', async () => {
    const root = Point0.lets('root', 'root').ssr(true).root()
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
    expectTypeOf<Prettify<(typeof mutation)['Infer']['InputRaw']>>().toEqualTypeOf<{ id: string; sn: number; o: 1 }>()
    expectTypeOf<Prettify<(typeof mutation)['Infer']['ServerInputParsed']>>().toEqualTypeOf<{
      id: string
      sn: number
      xxx: number
      o: 1
    }>()
    const { loadPointYml } = await createTestThings({ points: [root, mutation] })
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

  it.concurrent('available in mutation clientLoader by schema definition and function and generic', async () => {
    const root = Point0.lets('root', 'root').ssr(true).root()
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
    expectTypeOf<Prettify<(typeof mutation)['Infer']['InputRaw']>>().toEqualTypeOf<{ id: string; sn: number; o: 1 }>()
    expectTypeOf<Prettify<(typeof mutation)['Infer']['ClientInputParsed']>>().toEqualTypeOf<{
      id: string
      sn: number
      xxx: number
      o: 1
    }>()
    const { loadPointYml } = await createTestThings({ points: [root, mutation] })
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

  it.concurrent('correctly typed when default in schema exists in mutation', async () => {
    const root = Point0.lets('root', 'root').ssr(true).root()
    const mutation = root
      .lets('mutation', 'test')
      .input(z.object({ id: z.string(), sn: z.coerce.number().default(234) }))
      .loader(({ input }) => {
        return { loader: { input } }
      })
      .mutation()
    expectTypeOf<(typeof mutation)['Infer']['InputRaw']>().toEqualTypeOf<{ id: string; sn?: unknown }>()
    expectTypeOf<(typeof mutation)['Infer']['ServerInputParsed']>().toEqualTypeOf<{ id: string; sn: number }>()
    const { loadPointYml } = await createTestThings({ points: [root, mutation] })
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

  it.concurrent('correctly typed when default in schema exists in page', async () => {
    const root = Point0.lets('root', 'root').ssr(true).root()
    const layout = root.lets('layout', 'layout').layout(({ children }) => {
      return <div>{children}</div>
    })
    const page = root
      .lets('page', 'test')
      .input(z.object({ id: z.string(), sn: z.number().default(234) }))
      .loader(({ input }) => {
        expectTypeOf<typeof input>().toEqualTypeOf<{ id: string; sn: number }>()
        return { loader: { input } }
      })
      .page()
    const { loadPointYml } = await createTestThings({ points: [root, layout, page] })
    const result = await loadPointYml(page, { id: '123' })
    expect(result).toMatchInlineSnapshot(`
      "
      loader: 
        input: 
          id: "123"
          sn: 234
      "
    `)
  })

  it.concurrent('can be combined in different ways', async () => {
    const root = Point0.lets('root', 'root').ssr(true).root()
    const mutation = root
      .lets('mutation', 'test')
      .input(z.object({ a: z.string() }))
      .clientInput(z.object({ b: z.number() }))
      .sharedInput(z.object({ c: z.number() }))
      .clientInput(z.object({ d: z.boolean() }))
      .input(z.object({ e: z.number() }))
      .loader(({ input }) => {
        expectTypeOf<Prettify<typeof input>>().toEqualTypeOf<{ a: string; c: number; e: number }>()
        return { loader: { input } }
      })
      .clientLoader(({ input, data }) => {
        expectTypeOf<Prettify<typeof input>>().toEqualTypeOf<{ b: number; c: number; d: boolean }>()
        return { clientLoader: { input }, ...data }
      })
      .mutation()
    const { loadPointYml } = await createTestThings({ points: [root, mutation] })
    const result = await loadPointYml(mutation, { a: '123', b: 234, c: 345, d: true, e: 456 })
    expect(result).toMatchInlineSnapshot(`
      "
      clientLoader: 
        input: 
          b: 234
          c: 345
          d: true
      loader: 
        input: 
          a: "123"
          c: 345
          e: 456
      "
    `)
  })

  it.concurrent('do not allow conflicted schema by route', async () => {
    const root = Point0.lets('root', 'root').root()
    const layout = root
      .lets('layout', 'layout', '/:x')
      .input(z.object({ x: z.string(), z: z.number() })) // it is ok
      .layout(({ children }) => {
        return <div>{children}</div>
      })
    layout
      .lets('page', 'test', '/:y')
      .input(z.object({ y: z.number() }))
      // @ts-expect-error - it is bad
      .page()
  })

  it.concurrent('do not allow conflicted schema by schema', async () => {
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

  it.concurrent('do not allow conflicted schema by schema after unions', async () => {
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

  it.concurrent('do not allow conflicted schema by generic', async () => {
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

  it.concurrent('do not allow conflicted schema by function', async () => {
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
})
