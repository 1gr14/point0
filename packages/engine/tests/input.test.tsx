import type { InputParsed } from '@point0/core'
import { Point0 } from '@point0/core'
import '@testing-library/jest-dom'
import { describe, expect, it } from 'bun:test'
import { z } from 'zod'
import { createTestThings } from './utils/internal-testing.js'

describe('input', () => {
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
})
