import { Point0 } from '@point0/core'
import { describe, expect, it } from 'bun:test'
import { createTestThings } from './utils/internal-testing.js'

describe('plugin', () => {
  it('merges loader actions', async () => {
    const plugin = Point0.lets('plugin', 'test-plugin')
      .loader(() => ({ plugin: 'ok' }))
      .plugin()
    const root = Point0.lets('root', 'root').use(plugin).root()
    const page = root
      .lets('page', 'home', '/')
      .loader(() => ({ page: 'ok' }))
      .page()

    const { loadPoint } = await createTestThings({ points: [root, page] })
    const data = await loadPoint(page)
    expect(data).toMatchInlineSnapshot(`
      {
        "page": "ok",
      }
    `)
  })
})
