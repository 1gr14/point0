import { ErrorPoint0, Point0 } from '@point0/core'
import { describe, expect, expectTypeOf, it } from 'bun:test'
import superjson from 'superjson'
import { createTestThings, ymlify } from './utils/internal-testing.js'
import type { EmptyObject } from '@point0/core'

describe('loader', () => {
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
  const createRootWithTransformer = () =>
    Point0.lets('root', 'root')
      .transformer(superjson)
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
      .loader(() => ({ x: 1, date: new Date('2026-01-01') }))
      .page(({ data }) => {
        // but actually without transformer date is string
        expectTypeOf<typeof data>().toEqualTypeOf<{ x: number; date: Date }>()
        expect(data.date).toBe('2026-01-01T00:00:00.000Z' as never)
        return ymlify(data)
      })
    const { fetchPreview, fetchSsr } = await createTestThings({ ssr: true, points: [root, page] })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
          "
          date: 2026-01-01T00:00:00.000Z
          x: 1
          "
        `)
    const { response } = await fetchSsr(page)
    expect(response.status).toBe(200)
  })

  it('returns transformed data', async () => {
    const root = createRootWithTransformer()
    const page = root
      .lets('page', 'home', '/')
      .loader(() => ({ x: 1, date: new Date('2026-01-01') }))
      .page(({ data }) => {
        expectTypeOf<typeof data>().toEqualTypeOf<{ x: number; date: Date }>()
        expect(data.date).toBeInstanceOf(Date)
        return ymlify({ ...data, date: data.date.toISOString() })
      })
    const { fetchPreview, fetchSsr } = await createTestThings({ ssr: true, points: [root, page] })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
          "
          date: 2026-01-01T00:00:00.000Z
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
    const { fetchPreview, fetchSsr } = await createTestThings({ ssr: true, points: [root, page] })
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
          throw new ErrorPoint0('test error', { status: 410 })
        }
        return { x: 1 }
      })
      .page(({ data }) => {
        expectTypeOf(data).toEqualTypeOf<{ x: number }>()
        return ymlify(data)
      })
    const { render, fetchSsr } = await createTestThings({ ssr: true, points: [root, page] })
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
    const { render } = await createTestThings({ ssr: true, points: [root, mutation] })
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
        throw new ErrorPoint0('test error', { status: 410 })
      })
      .mutation()
    const { render } = await createTestThings({ ssr: true, points: [root, mutation, page] })
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
        expectTypeOf<typeof data>().toEqualTypeOf<{ x: number; y: number; z: number }>()
        return ymlify(data)
      })
    const { fetchPreview, fetchSsr } = await createTestThings({ ssr: true, points: [root, page] })
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

  it('undefined equals to empty data', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/')
      .loader(() => ({ x: 1, y: 2 }))
      .loader(() => undefined)
      .page(({ data }) => {
        expectTypeOf<typeof data>().toEqualTypeOf<EmptyObject>()
        return Object.keys(data).length ? 'exists' : 'empty'
      })
    const { fetchPreview, fetchSsr } = await createTestThings({ ssr: true, points: [root, page] })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      empty
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
      .page()
  })

  it('forbids returning string as data', () => {
    const root = createRoot()
    root
      .lets('page', 'home', '/')
      // @ts-expect-error -- string is forbidden to return as data
      .loader(() => 'zxc')
      .page()
  })

  it('forbids returning response from page loader', () => {
    const root = createRoot()
    root
      .lets('page', 'home', '/')
      // @ts-expect-error -- response is forbidden to return as data
      .loader(() => new Response('zxc'))
      .page()
  })

  it('return never then empty data by type', async () => {
    const root = createRoot()
    root
      .lets('page', 'home', '/')
      .loader(() => {
        throw new Error('test error')
      })
      .page(({ data }) => {
        expectTypeOf<typeof data>().toEqualTypeOf<EmptyObject>()
        return ymlify(data)
      })
  })
})
