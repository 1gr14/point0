import type { AnyEventerEvent } from '@point0/core'
import { Point0 } from '@point0/core'
import { describe, expect, it } from 'bun:test'
import { createTestThings } from './utils/internal-testing.js'

describe('on', () => {
  it('*', async () => {
    const events: AnyEventerEvent[] = []
    const root = Point0.lets('root', 'root')
      .on('*', (event) => {
        events.push(event)
      })
      .baseurl('http://localhost/')
      .ssr(true)
      .root()
    const page = root
      .lets('page', 'home', '/')
      .loader(({ request }) => ({ x: 1 }))
      .page(({ data }) => <div id="page">x={data.x}</div>)
    const { render } = await createTestThings({ points: [root, page] })
    await render(page.route(), async ({ waitContent }) => {
      await waitContent('#page')
      expect(events.map((e) => ({ name: e.name, target: e.target }))).toMatchInlineSnapshot(`
        [
          {
            "name": "pointQueryStart",
            "target": "client",
          },
          {
            "name": "pointFetchServerStart",
            "target": "client",
          },
          {
            "name": "fetcherStart",
            "target": "server",
          },
          {
            "name": "fetcherSettled",
            "target": "server",
          },
          {
            "name": "fetcherSuccess",
            "target": "server",
          },
          {
            "name": "pointFetchServerSettled",
            "target": "client",
          },
          {
            "name": "pointFetchServerSuccess",
            "target": "client",
          },
          {
            "name": "pointQuerySettled",
            "target": "client",
          },
          {
            "name": "pointQuerySuccess",
            "target": "client",
          },
        ]
      `)
    })
  })

  it('name', async () => {
    const events: AnyEventerEvent[] = []
    const root = Point0.lets('root', 'root')
      .on('fetcherStart', (event) => {
        events.push(event)
      })
      .on('pointQuerySuccess', (event) => {
        events.push(event)
      })
      .on('pointMutationStart', (event) => {
        events.push(event)
      })
      .baseurl('http://localhost/')
      .ssr(true)
      .root()
    const page = root
      .lets('page', 'home', '/')
      .loader(({ request }) => ({ x: 1 }))
      .page(({ data }) => <div id="page">x={data.x}</div>)
    const { render } = await createTestThings({ points: [root, page] })
    await render(page.route(), async ({ waitContent }) => {
      await waitContent('#page')
      expect(events.map((e) => ({ name: e.name, target: e.target }))).toMatchInlineSnapshot(`
        [
          {
            "name": "fetcherStart",
            "target": "server",
          },
          {
            "name": "pointQuerySuccess",
            "target": "client",
          },
        ]
      `)
    })
  })

  it('[name, name]', async () => {
    const events: AnyEventerEvent[] = []
    const root = Point0.lets('root', 'root')
      .on('fetcherStart', (event) => {
        events.push(event)
      })
      .on(['pointQuerySuccess', 'pointInfiniteQuerySuccess', 'pointMutationSuccess'], (event) => {
        events.push(event)
      })
      .baseurl('http://localhost/')
      .ssr(true)
      .root()
    const page = root
      .lets('page', 'home', '/')
      .loader(({ request }) => ({ x: 1 }))
      .page(({ data }) => <div id="page">x={data.x}</div>)
    const { render } = await createTestThings({ points: [root, page] })
    await render(page.route(), async ({ waitContent }) => {
      await waitContent('#page')
      expect(events.map((e) => ({ name: e.name, target: e.target }))).toMatchInlineSnapshot(`
        [
          {
            "name": "fetcherStart",
            "target": "server",
          },
          {
            "name": "pointQuerySuccess",
            "target": "client",
          },
        ]
      `)
    })
  })
})
