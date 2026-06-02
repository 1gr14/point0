import { ErrorPoint0, Point0 } from '@point0/core'
import type { EmptyObject } from '@point0/core'
import { describe, expect, expectTypeOf, it } from 'bun:test'
import React from 'react'
import { createTestThings, ymlify } from './utils/internal-testing.js'

describe('clientLoader', () => {
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

  it('returns data in page', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/')
      .clientLoader(() => ({ x: 1, date: new Date('2026-01-01') }))
      .page(({ data }) => {
        expectTypeOf<typeof data>().toEqualTypeOf<{ x: number; date: Date }>()
        expect(data.date).toBeInstanceOf(Date)
        return <div id="page">{ymlify({ ...data, date: data.date.toISOString() })}</div>
      })
    const { render } = await createTestThings({ ssr: true, points: [root, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
            "
            /
              #loading: ...
    
              #page: x: 1
              date: 2026-01-01T00:00:00.000Z
            "
          `)
    })
  })

  it('throws error in page', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/')
      .clientLoader(() => {
        throw new ErrorPoint0('test error')
      })
      .page(({ data }) => {
        expectTypeOf<typeof data>().toEqualTypeOf<EmptyObject>()
        return <div id="page">{ymlify(data)}</div>
      })
    const { render } = await createTestThings({ ssr: true, points: [root, page] })
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
  })

  it('returns data in mutation', async () => {
    const root = createRoot()
    const page = root.lets('page', 'home', '/').page(() => {
      const m = mutation.useMutation()
      React.useEffect(() => {
        m.mutate()
      }, [])
      return <div id="page">{m.isPending ? 'pending' : ymlify({ ...m.data, date: m.data?.date.toISOString() })}</div>
    })
    const mutation = root
      .lets('mutation', 'test')
      .clientLoader(() => ({ x: 1, date: new Date('2026-01-01') }))
      .mutation()
    const { render } = await createTestThings({ ssr: true, points: [root, page, mutation] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /
          #page: pending

          #page: x: 1
          date: 2026-01-01T00:00:00.000Z
        "
      `)
    })
  })

  it('throws error in mutation', async () => {
    const root = createRoot()
    const page = root.lets('page', 'home', '/').page(() => {
      const m = mutation.useMutation()
      React.useEffect(() => {
        m.mutate()
      }, [])
      return <div id="page">{m.isPending ? 'pending' : (m.error?.message ?? 'no error')}</div>
    })
    const mutation = root
      .lets('mutation', 'test')
      .clientLoader(() => {
        throw new ErrorPoint0('test error')
      })
      .mutation()
    const { render } = await createTestThings({ ssr: true, points: [root, page, mutation] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /
          #page: pending

          #page: test error
        "
      `)
    })
  })

  it('returns error in mutation', async () => {
    const root = createRoot()
    const page = root.lets('page', 'home', '/').page(() => {
      const m = mutation.useMutation()
      React.useEffect(() => {
        m.mutate()
      }, [])
      return <div id="page">{m.isPending ? 'pending' : (m.error?.message ?? 'no error')}</div>
    })
    const mutation = root
      .lets('mutation', 'test')
      .clientLoader(() => {
        return new ErrorPoint0('test error')
      })
      .mutation()
    const { render } = await createTestThings({ ssr: true, points: [root, page, mutation] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /
          #page: pending

          #page: test error
        "
      `)
    })
  })

  it('undefined equals to empty data', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/')
      .clientLoader(() => undefined)
      .page(({ data }) => {
        expectTypeOf<typeof data>().toEqualTypeOf<EmptyObject>()
        return <div id="page">{Object.keys(data).length ? 'exists' : 'empty'}</div>
      })
    const { render } = await createTestThings({ ssr: true, points: [root, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /
          #loading: ...

          #page: empty
        "
      `)
    })
  })

  it('forbids returning array as data', () => {
    const root = createRoot()
    root
      .lets('page', 'home', '/')
      // @ts-expect-error -- array is forbidden to return as data
      .clientLoader(() => [{ x: 1 }])
      .page()
  })

  it('forbids returning string as data', () => {
    const root = createRoot()
    root
      .lets('page', 'home', '/')
      // @ts-expect-error -- string is forbidden to return as data
      .clientLoader(() => 'zxc')
      .page()
  })

  it('forbids returning response from page loader', () => {
    const root = createRoot()
    root
      .lets('page', 'home', '/')
      // @ts-expect-error -- response is forbidden to return as data in pages
      .clientLoader(() => new Response('zxc'))
      .page()
  })

  it('return never then empty data by type', async () => {
    const root = createRoot()
    root
      .lets('page', 'home', '/')
      .clientLoader(() => {
        throw new Error('test error')
      })
      .page(({ data }) => {
        expectTypeOf<typeof data>().toEqualTypeOf<EmptyObject>()
        return ymlify(data)
      })
  })

  // only one loader per point: a (server) loader may not come after a clientLoader

  it('forbids loader after clientLoader', () => {
    const root = createRoot()
    root
      .lets('page', 'home', '/')
      .clientLoader(() => ({ x: 1 }))
      // @ts-expect-error -- only one loader per point: no (server) loader after a clientLoader
      .loader(() => ({ y: 2 }))
      .page()
  })

  it('forbids empty loader after clientLoader', () => {
    const root = createRoot()
    root
      .lets('page', 'home', '/')
      .clientLoader(() => ({ x: 1 }))
      // @ts-expect-error -- only one loader per point: no (server) loader after a clientLoader
      .loader()
      .page()
  })

  it('forbids clientLoader after clientLoader', () => {
    const root = createRoot()
    root
      .lets('page', 'home', '/')
      .clientLoader(() => ({ x: 1 }))
      // @ts-expect-error -- only one loader per point: no clientLoader after a clientLoader
      .clientLoader(() => ({ y: 2 }))
      .page()
  })
})
