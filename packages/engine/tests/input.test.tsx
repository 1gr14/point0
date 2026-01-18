import type { InputParsed, InputRawUnknown } from '@point0/core'
import { Point0 } from '@point0/core'
import '@testing-library/jest-dom'
import { describe, expect, it } from 'bun:test'
import { createTestThings } from './utils/internal-testing.js'
import { z } from 'zod'

type InputResult = {
  input: InputParsed
  inputRaw: InputRawUnknown
}

describe('input', () => {
  it('empty and available in page component by route definition', async () => {
    const root = Point0.lets('root', 'root').ssr(true).root()
    let result: InputResult | undefined
    const page = root.lets('page', 'test', '/test').page(({ input, inputRaw }) => {
      result = { input, inputRaw }
      return <div />
    })
    const { fetchSsr } = await createTestThings({ points: [root, page] })
    await fetchSsr(page)
    expect(result).toMatchInlineSnapshot(`
      {
        "input": {},
        "inputRaw": {},
      }
    `)
  })

  it('available in page component by route definition', async () => {
    const root = Point0.lets('root', 'root').ssr(true).root()
    let result: InputResult | undefined
    const page = root.lets('page', 'test', '/test/:id').page(({ input, inputRaw }) => {
      result = { input, inputRaw }
      return <div />
    })
    const { fetchSsr } = await createTestThings({ points: [root, page] })
    await fetchSsr(page, { id: '123' })
    expect(result).toMatchInlineSnapshot(`
      {
        "input": {
          "id": "123",
        },
        "inputRaw": {
          "id": "123",
        },
      }
    `)
  })

  it('available in page component and loader by route definition', async () => {
    const root = Point0.lets('root', 'root').ssr(true).root()
    let loaderResult: InputResult | undefined
    let pageResult: InputResult | undefined
    const page = root
      .lets('page', 'test', '/test/:id')
      .loader(({ input, inputRaw }) => {
        loaderResult = { input, inputRaw }
        return { x: input.id }
      })
      .page(({ input, inputRaw }) => {
        pageResult = { input, inputRaw }
        return <div />
      })
    const { fetchSsr } = await createTestThings({ points: [root, page] })
    await fetchSsr(page, { id: '123' })
    expect(loaderResult).toMatchInlineSnapshot(`
      {
        "input": {
          "id": "123",
        },
        "inputRaw": {
          "id": "123",
        },
      }
    `)
    expect(pageResult).toMatchInlineSnapshot(`
      {
        "input": {
          "id": "123",
        },
        "inputRaw": {
          "id": "123",
        },
      }
    `)
  })

  it('available in mutation loader by schema definition', async () => {
    const root = Point0.lets('root', 'root').ssr(true).root()
    const mutation = root
      .lets('mutation', 'test')
      .input(z.object({ id: z.number() }))
      .loader(({ input, inputRaw }) => {
        return { input, inputRaw }
      })
      .mutation()
    const { loadPoint } = await createTestThings({ points: [root, mutation] })
    const result = await loadPoint(mutation, { id: 123 })
    expect(result).toMatchInlineSnapshot(`
      {
        "input": {
          "id": 123,
        },
        "inputRaw": {
          "id": 123,
        },
      }
    `)
  })

  it('available in mutation loader and client loader by schema definition', async () => {
    const root = Point0.lets('root', 'root').ssr(true).root()
    const mutation = root
      .lets('mutation', 'test')
      .input(z.object({ id: z.number() }))
      .loader(({ input, inputRaw }) => {
        return { loader: { input, inputRaw } }
      })
      .clientLoader(({ input, inputRaw, data }) => {
        return { clientLoader: { input, inputRaw }, ...data }
      })
      .mutation()
    const { loadPoint } = await createTestThings({ points: [root, mutation] })
    const result = await loadPoint(mutation, { id: 123 })
    expect(result).toMatchInlineSnapshot(`
      {
        "clientLoader": {
          "input": {},
          "inputRaw": {
            "id": 123,
          },
        },
        "loader": {
          "input": {
            "id": 123,
          },
          "inputRaw": {
            "id": 123,
          },
        },
      }
    `)
  })
})
