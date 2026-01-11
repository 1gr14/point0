import { Point0 } from '@point0/core'
import { describe, expect, it } from 'bun:test'
import { Engine } from '../src/engine.js'
import { Fetch0 } from '../src/fetch0.js'

describe('fetch0', () => {
  it('should fetch page with loader', async () => {
    const _root = Point0.lets('root', 'root').serverurl('http://localhost:3000').root()
    const page = _root
      .lets('page', 'page')
      .loader(() => ({ x: 1 }))
      .page(({ data }) => <div>Hello {data.x}</div>)
    const engine = Engine.create({
      file: import.meta.url,
      server: {
        scope: 'root',
        points: async () => ({
          _root,
          page,
        }),
      },
    })
    const fetch0 = Fetch0.apply(engine)
    expect(fetch0).toBeDefined()
    const data = await page.fetch()
    expect(data.x).toBe(1)
  })
})
