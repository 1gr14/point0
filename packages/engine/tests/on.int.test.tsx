import { Point0 } from '@point0/core'
import { type AnyEventerEvent, ErrorPoint0 } from '@point0/core'
import { describe, expect, it } from 'bun:test'
import { createTestThings } from './utils/internal-testing.js'

describe('on', () => {
  it('*', async () => {
    const events: AnyEventerEvent<ErrorPoint0>[] = []
    const root = Point0.lets('root', 'root')
      .on('*', (e) => {
        events.push(e)
      })
      .root()
    const page = root
      .lets('page', 'home', '/')
      .loader(() => ({ x: 1 }))
      .page(({ data }) => <div id="page">x={data.x}</div>)
    const { render } = await createTestThings({ ssr: true, points: [root, page] })
    await render(page.route(), async ({ waitContent }) => {
      await waitContent('#page')
      expect(events.map((e) => ({ name: e.name, side: e.side }))).toMatchInlineSnapshot(`
        [
          {
            "name": "pointQueryStart",
            "side": "client",
          },
          {
            "name": "pointFetchServerStart",
            "side": "client",
          },
          {
            "name": "engineFetchStart",
            "side": "server",
          },
          {
            "name": "engineFetchSettled",
            "side": "server",
          },
          {
            "name": "engineFetchSuccess",
            "side": "server",
          },
          {
            "name": "pointFetchServerSettled",
            "side": "client",
          },
          {
            "name": "pointFetchServerSuccess",
            "side": "client",
          },
          {
            "name": "pointQuerySettled",
            "side": "client",
          },
          {
            "name": "pointQuerySuccess",
            "side": "client",
          },
        ]
      `)

      // `meta` is a log-friendly projection of `data` built from real framework objects
      const pointEvent = events.find((e) => e.name === 'pointQueryStart')
      expect(typeof pointEvent?.meta.point).toBe('string')
      expect(pointEvent?.meta.point).toContain('home')

      const fetchEvent = events.find((e) => e.name === 'engineFetchStart')
      expect(fetchEvent?.meta.request).toMatchObject({ method: expect.any(String), path: expect.any(String) })
      expect(fetchEvent?.meta.scope).toBeDefined()
      // the start event predates rendering, so its meta has no renders count yet
      expect(fetchEvent?.meta.request).not.toHaveProperty('renders')

      // heavy payloads (the HTTP response / fetch result) are dropped from meta
      const successEvent = events.find((e) => e.name === 'engineFetchSuccess')
      expect(successEvent?.meta.result).toBeUndefined()
      expect(successEvent?.meta.response).toBeUndefined()
      // settled-family meta carries request.renders only when the SSR loop actually ran;
      // this engineFetch served the query endpoint (no SSR), so the key is absent — the
      // rendered case is covered in ssr-store.test.tsx
      expect(successEvent?.meta.request).not.toHaveProperty('renders')

      // the envelope `error` is present on every event and stays `undefined` outside error events
      expect(events.every((e) => 'error' in e)).toBe(true)
      expect(events.every((e) => e.error === undefined)).toBe(true)
    })
  })

  it('name', async () => {
    const events: AnyEventerEvent<ErrorPoint0>[] = []
    const root = Point0.lets('root', 'root')
      .on('engineFetchStart', (e) => {
        events.push(e)
      })
      .on('pointQuerySuccess', (e) => {
        events.push(e)
      })
      .on('pointMutationStart', (e) => {
        events.push(e)
      })
      .root()
    const page = root
      .lets('page', 'home', '/')
      .loader(() => ({ x: 1 }))
      .page(({ data }) => <div id="page">x={data.x}</div>)
    const { render } = await createTestThings({ ssr: true, points: [root, page] })
    await render(page.route(), async ({ waitContent }) => {
      await waitContent('#page')
      expect(events.map((e) => ({ name: e.name, side: e.side }))).toMatchInlineSnapshot(`
        [
          {
            "name": "engineFetchStart",
            "side": "server",
          },
          {
            "name": "pointQuerySuccess",
            "side": "client",
          },
        ]
      `)
    })
  })

  it('[name, name]', async () => {
    const events: AnyEventerEvent<ErrorPoint0>[] = []
    const root = Point0.lets('root', 'root')
      .on('engineFetchStart', (e) => {
        events.push(e)
      })
      .on(['pointQuerySuccess', 'pointInfiniteQuerySuccess', 'pointMutationSuccess'], (e) => {
        events.push(e)
      })
      .root()
    const page = root
      .lets('page', 'home', '/')
      .loader(() => ({ x: 1 }))
      .page(({ data }) => <div id="page">x={data.x}</div>)
    const { render } = await createTestThings({ ssr: true, points: [root, page] })
    await render(page.route(), async ({ waitContent }) => {
      await waitContent('#page')
      expect(events.map((e) => ({ name: e.name, side: e.side }))).toMatchInlineSnapshot(`
        [
          {
            "name": "engineFetchStart",
            "side": "server",
          },
          {
            "name": "pointQuerySuccess",
            "side": "client",
          },
        ]
      `)
    })
  })

  it('error', async () => {
    const events: AnyEventerEvent<ErrorPoint0>[] = []
    const root = Point0.lets('root', 'root')
      .queryOptions({
        retry: false,
      })
      .on('error', (e) => {
        events.push(e)
      })
      .root()
    const page = root
      .lets('page', 'home', '/')
      .loader(() => {
        if (Math.random() + 1) {
          throw new ErrorPoint0('test error')
        }
        return { x: 1 }
      })
      .page(({ data }) => <div id="page">x={data.x}</div>)
    const { render } = await createTestThings({ ssr: true, points: [root, page] })
    await render(page.route(), async ({ waitContent }) => {
      await waitContent('error', 10000)
      expect(events.map((e) => ({ name: e.name, side: e.side }))).toMatchInlineSnapshot(`
        [
          {
            "name": "engineFetchError",
            "side": "server",
          },
          {
            "name": "pointQueryError",
            "side": "client",
          },
        ]
      `)

      // our meta stays ours: the error is not duplicated into event meta...
      const queryErrorEvent = events.find((e) => e.name === 'pointQueryError')
      expect(queryErrorEvent?.meta.error).toBeUndefined()
      expect(queryErrorEvent?.meta.point).toContain('home')
      // ...and we don't pollute the user's thrown error with our meta either
      const thrownError = queryErrorEvent?.data.error as ErrorPoint0 | undefined
      expect(thrownError).toBeInstanceOf(ErrorPoint0)
      expect(thrownError?.meta).toBeUndefined()

      // the error is also hoisted to the event envelope — same instance as `data.error`
      expect(queryErrorEvent?.error).toBeInstanceOf(ErrorPoint0)
      expect(queryErrorEvent?.error).toBe(thrownError as ErrorPoint0)
    })
  })
})
