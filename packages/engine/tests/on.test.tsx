import { describe, expect, it } from 'bun:test'
import type { AnyEventerEvent } from '@point0/core'
import { Point0 } from '@point0/core'
import { createTestThings } from './utils/internal-testing.js'

describe('on', () => {
  it.concurrent('*', async () => {
    const events: AnyEventerEvent[] = []
    const root = Point0.lets('root', 'root')
      .on('*', (e) => {
        events.push(e)
      })
      .baseurl('http://localhost/')
      .ssr(true)
      .root()
    const page = root
      .lets('page', 'home', '/')
      .loader(() => ({ x: 1 }))
      .page(({ data }) => <div id="page">x={data.x}</div>)
    const { render } = await createTestThings({ points: [root, page] })
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

  it.concurrent('name', async () => {
    const events: AnyEventerEvent[] = []
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
      .baseurl('http://localhost/')
      .ssr(true)
      .root()
    const page = root
      .lets('page', 'home', '/')
      .loader(() => ({ x: 1 }))
      .page(({ data }) => <div id="page">x={data.x}</div>)
    const { render } = await createTestThings({ points: [root, page] })
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

  it.concurrent('[name, name]', async () => {
    const events: AnyEventerEvent[] = []
    const root = Point0.lets('root', 'root')
      .on('engineFetchStart', (e) => {
        events.push(e)
      })
      .on(['pointQuerySuccess', 'pointInfiniteQuerySuccess', 'pointMutationSuccess'], (e) => {
        events.push(e)
      })
      .baseurl('http://localhost/')
      .ssr(true)
      .root()
    const page = root
      .lets('page', 'home', '/')
      .loader(() => ({ x: 1 }))
      .page(({ data }) => <div id="page">x={data.x}</div>)
    const { render } = await createTestThings({ points: [root, page] })
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

  it.concurrent('error', async () => {
    const events: AnyEventerEvent[] = []
    const root = Point0.lets('root', 'root')
      .on('error', (e) => {
        events.push(e)
      })
      .baseurl('http://localhost/')
      .ssr(true)
      .root()
    const page = root
      .lets('page', 'home', '/')
      .loader(() => {
        if (Math.random() + 1) {
          throw new Error('test error')
        }
        return { x: 1 }
      })
      .page(({ data }) => <div id="page">x={data.x}</div>)
    const { render } = await createTestThings({ points: [root, page] })
    await render(page.route(), async ({ waitContent }) => {
      await waitContent('error')
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
