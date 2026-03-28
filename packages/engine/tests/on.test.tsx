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
    })
  })
})
