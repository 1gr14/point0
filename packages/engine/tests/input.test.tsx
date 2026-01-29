import type { InputParsed, Prettify } from '@point0/core'
import { Point0 } from '@point0/core'
// import '@testing-library/jest-dom'
import { describe, expect, expectTypeOf, it } from 'bun:test'
import { z } from 'zod'
import { createTestThings } from './utils/internal-testing.js'

describe('input', () => {
  // it('types utils work', () => {
  //   type X = CustomValidationFnToRecordValidationSchema<(input: { x: number }) => { x: string }>
  //   expectTypeOf<X>().toEqualTypeOf<StandardSchemaV1<{ x: number }, { x: string }>>()
  //   type Y = CustomValidationFnToRecordValidationSchema<(input: { x: number; y: number }) => { x: string; y: string }>
  //   expectTypeOf<Y>().toEqualTypeOf<StandardSchemaV1<{ x: number; y: number }, { x: string; y: string }>>()
  //   type IsConflictXY = IsInputSchemaConflicts<X, Y>
  //   expectTypeOf<IsConflictXY>().toEqualTypeOf<false>()
  //   type IsConflictYX = IsInputSchemaConflicts<Y, X>
  //   expectTypeOf<IsConflictYX>().toEqualTypeOf<false>()
  //   type Z = CustomValidationFnToRecordValidationSchema<(input: { x: boolean }) => { x: string }>
  //   type IsConflictXZ = IsInputSchemaConflicts<X, Z>
  //   expectTypeOf<IsConflictXZ>().toEqualTypeOf<true>()
  //   type IsConflictZX = IsInputSchemaConflicts<Z, X>
  //   expectTypeOf<IsConflictZX>().toEqualTypeOf<true>()
  //   // eslint-disable-next-line @typescript-eslint/no-unused-vars
  //   const xZod = z.object({ x: z.number().transform((x) => x.toString()) })
  //   type XZod = typeof xZod
  //   expectTypeOf<XZod['~standard']['types']>().toEqualTypeOf<
  //     StandardSchemaV1<{ x: number }, { x: string }>['~standard']['types']
  //   >()
  //   type IsConflictXZodX = IsInputSchemaConflicts<XZod, X>
  //   expectTypeOf<IsConflictXZodX>().toEqualTypeOf<false>()
  //   type IsConflictXXZod = IsInputSchemaConflicts<X, XZod>
  //   expectTypeOf<IsConflictXXZod>().toEqualTypeOf<false>()
  //   type IsConflictXZodZ = IsInputSchemaConflicts<XZod, Z>
  //   expectTypeOf<IsConflictXZodZ>().toEqualTypeOf<true>()
  //   type IsConflictZXZod = IsInputSchemaConflicts<Z, XZod>
  //   expectTypeOf<IsConflictZXZod>().toEqualTypeOf<true>()
  //   // eslint-disable-next-line @typescript-eslint/no-unused-vars
  //   const xZodDefault = z.object({ x: z.number().default(123) })
  //   type XZodDefault = typeof xZodDefault
  //   expectTypeOf<NonNullable<XZodDefault['~standard']['types']>['input']>().toEqualTypeOf<{ x?: number }>()
  //   expectTypeOf<NonNullable<XZodDefault['~standard']['types']>['output']>().toEqualTypeOf<{ x: number }>()
  // })

  it('empty and available in page component by route definition', async () => {
    const root = Point0.lets('root', 'root').ssr(true).root()
    let result: InputParsed | undefined
    const page = root.lets('page', 'test', '/test').page(({ input }) => {
      result = input
      return <div />
    })
    const { fetchSsr } = await createTestThings({ points: [root, page] })
    await fetchSsr(page)
    expect(result).toMatchInlineSnapshot(`{}`)
  })

  it('available in page component by route definition', async () => {
    const root = Point0.lets('root', 'root').ssr(true).root()
    let result: InputParsed | undefined
    const page = root.lets('page', 'test', '/test/:id').page(({ input }) => {
      result = input
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

  it('available in page component and loader and client loader by route definition', async () => {
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
      .page(({ input }) => {
        pageResult = input
        return <div id="page" />
      })
    const { render } = await createTestThings({ points: [root, page] })
    await render(page.route({ id: '123' }), async ({ waitContent }) => {
      await waitContent('#page')
    })
    expect(loaderResult).toMatchInlineSnapshot(`
      {
        "id": "123",
      }
    `)
    expect(clientLoaderResult).toMatchInlineSnapshot(`
      {
        "id": "123",
      }
    `)
    expect(pageResult).toMatchInlineSnapshot(`
      {
        "id": "123",
      }
    `)
  })

  it('available in mutation loader by schema definition', async () => {
    const root = Point0.lets('root', 'root').ssr(true).root()
    const mutation = root
      .lets('mutation', 'test')
      .input(z.object({ id: z.number() }))
      .loader(({ input }) => {
        return { input }
      })
      .mutation()
    const { loadPoint } = await createTestThings({ points: [root, mutation] })
    const result = await loadPoint(mutation, { id: 123 })
    expect(result).toMatchInlineSnapshot(`
      {
        "input": {
          "id": 123,
        },
      }
    `)
  })

  it('available in mutation loader and client loader by schema definition', async () => {
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
    const { loadPoint } = await createTestThings({ points: [root, mutation] })
    const result = await loadPoint(mutation, { id: '123', sn: 234 })
    expect(result).toMatchInlineSnapshot(`
      {
        "clientLoader": {
          "input": {
            "sn": 234,
          },
        },
        "loader": {
          "input": {
            "id": "123",
          },
        },
      }
    `)
  })

  it('available in mutation loader by schema definition and function', async () => {
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
    const { loadPoint } = await createTestThings({ points: [root, mutation] })
    const result = await loadPoint(mutation, { id: '123', sn: 234, o: 1 })
    expect(result).toMatchInlineSnapshot(`
      {
        "loader": {
          "input": {
            "id": "123",
            "o": 1,
            "sn": 468,
            "xxx": 3,
          },
        },
      }
    `)
  })

  it('correctly typed when default in schema exists in mutation', async () => {
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
    const { loadPoint } = await createTestThings({ points: [root, mutation] })
    const result = await loadPoint(mutation, { id: '123' })
    expect(result).toMatchInlineSnapshot(`
      {
        "loader": {
          "input": {
            "id": "123",
            "sn": 234,
          },
        },
      }
    `)
  })

  it('correctly typed when default in schema exists in page', async () => {
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
    const { loadPoint } = await createTestThings({ points: [root, layout, page] })
    const result = await loadPoint(page, { id: '123' })
    expect(result).toMatchInlineSnapshot(`
      {
        "loader": {
          "input": {
            "id": "123",
            "sn": 234,
          },
        },
      }
    `)
  })
})
