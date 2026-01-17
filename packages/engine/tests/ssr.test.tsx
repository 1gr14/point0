import { Point0 } from '@point0/core'
import '@testing-library/jest-dom'
import { describe, expect, it } from 'bun:test'
import { createTestThings } from './utils/internal-testing.js'

describe('ssr', () => {
  it('page without loader', async () => {
    const root = Point0.lets('root', 'root').ssr(true).root()
    const page = root.lets('page', 'home', '/').page(({ data }) => <div id="page">x</div>)
    const { fetchSsr } = await createTestThings({ points: [root, page] })
    const result = await fetchSsr(page)
    expect(result.preview).toMatchInlineSnapshot(`
      "#page: x
      "
    `)
  })

  it('page with loader', async () => {
    const root = Point0.lets('root', 'root').ssr(true).root()
    const page = root
      .lets('page', 'home', '/')
      .loader(() => ({ x: 1 }))
      .page(({ data }) => <div id="page">x={data.x}</div>)
    const { fetchSsr } = await createTestThings({ points: [root, page] })
    const result = await fetchSsr(page)
    expect(result.queryClientQueriesPreview).toMatchInlineSnapshot(`
      "point0|root|page|home|server|finite|{}|data
      {"x":1}
      "
    `)
    expect(result.preview).toMatchInlineSnapshot(`
      "#page: x=1
      "
    `)
  })
})
