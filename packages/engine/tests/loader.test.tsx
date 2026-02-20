import { describe, expect, expectTypeOf, it } from 'bun:test'
import { Error0 } from '@devp0nt/error0'
import type { Prettify } from '@point0/core'
import { Point0 } from '@point0/core'
import { createTestThings, ymlify } from './utils/internal-testing.js'

describe('loader', () => {
  const createRoot = () =>
    Point0.lets('root', 'root')
      .ssr(true)
      .baseurl('http://localhost:3001/')
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

  it('returns data', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/')
      .loader(() => ({ x: 1 }))
      .page(({ data }) => {
        expectTypeOf<Prettify<typeof data>>().toEqualTypeOf<{ x: number }>()
        return ymlify(data)
      })
    const { fetchPreview, fetchSsr } = await createTestThings({ points: [root, page] })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      x: 1
      "
    `)
    const { response } = await fetchSsr(page)
    expect(response.status).toBe(200)
  })

  it('returns status code with page', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/')
      .loader(() => [201, { x: 1 }])
      .page(({ data }) => {
        expectTypeOf(data).toEqualTypeOf<{ x: number }>()
        return ymlify(data)
      })
    const { fetchPreview, fetchSsr } = await createTestThings({ points: [root, page] })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      x: 1
      "
    `)
    const { response } = await fetchSsr(page)
    expect(response.status).toBe(201)
  })

  it('returns error status code with page', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/')
      .loader(() => {
        if (Math.random() + 1) {
          throw new Error0('test error', { httpStatus: 410 })
        }
        return { x: 1 }
      })
      .page(({ data }) => {
        expectTypeOf(data).toEqualTypeOf<{ x: number }>()
        return ymlify(data)
      })
    const { render, fetchSsr } = await createTestThings({ points: [root, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#error')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /
          #loading: ...

          #error: test error
        "
      `)
    })
    const { response } = await fetchSsr(page)
    expect(response.status).toBe(410)
  })

  it('returns status code with mutation', async () => {
    const root = createRoot()
    const page = root.lets('page', 'home', '/').page(() => {
      return <div id="page">Home</div>
    })
    const mutation = root
      .lets('mutation', 'test')
      .loader(() => [201, { x: 1 }])
      .mutation()
    const { render } = await createTestThings({ points: [root, mutation] })
    await render(page.route(), async () => {
      const result = await mutation.fetchServerDetailed()
      expect(result.response?.status).toBe(201)
      expect(result.data?.x).toBe(1)
    })
  })

  it('returns error status code with mutation', async () => {
    const root = createRoot()
    const page = root.lets('page', 'home', '/').page(() => {
      return <div id="page">Home</div>
    })
    const mutation = root
      .lets('mutation', 'test')
      .loader(() => {
        throw new Error0('test error', { httpStatus: 410 })
      })
      .mutation()
    const { render } = await createTestThings({ points: [root, mutation, page] })
    await render(page.route(), async () => {
      const result = await mutation.fetchServerDetailed()
      expect(result.response?.status).toBe(410)
    })
  })

  it('overrides data', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/')
      .loader(() => ({ x: 1, y: 2 }))
      .loader(({ data }) => ({ ...data, y: 100, z: 3 }))
      .page(({ data }) => {
        expectTypeOf<Prettify<typeof data>>().toEqualTypeOf<{ x: number; y: number; z: number }>()
        return ymlify(data)
      })
    const { fetchPreview, fetchSsr } = await createTestThings({ points: [root, page] })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      x: 1
      y: 100
      z: 3
      "
    `)
    const { response } = await fetchSsr(page)
    expect(response.status).toBe(200)
  })

  it('forbids returning array as data', () => {
    const root = createRoot()
    root
      .lets('page', 'home', '/')
      // @ts-expect-error -- array is forbidden to return as data
      .loader(() => [{ x: 1 }])
  })
})
