import { Point0 } from '@point0/core'
import type { Prettify } from '@point0/core'
import { describe, expect, expectTypeOf, it } from 'bun:test'
import { createTestThings, ymlify } from './utils/internal-testing.js'

describe('loader', () => {
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
    await render(page.route(), async ({ waitContent, tale, click }) => {
      const result = await mutation.fetchServerDetailed()
      expect(result.response?.status).toBe(201)
      expect(result.data?.x).toBe(1)
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
})
