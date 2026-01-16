import { Point0 } from '@point0/core'
import '@testing-library/jest-dom'
import { describe, expect, it } from 'bun:test'
// import { PlaywrightBrowser } from './utils/playwright.js'
// import type { TestProject, TestProjectFactoryCreateProjectOptions } from './utils/project.js'
// import { TestProjectFactory } from './utils/project.js'
import { SimpleLink } from '@point0/wouter'
import { createTestThings } from '../internal-testing.js'

describe('internal-testing', () => {
  it('works', async () => {
    const root = Point0.lets('root', 'root')
      .ssr(true)
      .prefetchPolicy('none')
      .loading(() => <div id="loading">...</div>)
      .root()
    const page = root.lets('page', 'home', '/').page(({ data }) => (
      <div id="home">
        <h1>Home Page</h1>
        <SimpleLink id="link" to={'/news'}>
          Go to News
        </SimpleLink>
      </div>
    ))
    const news = root
      .lets('page', 'news')
      // .loader(async () => await waitReturn({ x: 1 }))
      .loader(() => ({ x: 1 }))
      .page(({ data }) => (
        <div id="news">
          <h1>News Page ({data.x})</h1>
          <SimpleLink id="link" to={'/'}>
            Go to Home
          </SimpleLink>
        </div>
      ))
    const { client, fetchPreview } = await createTestThings({ points: [root, page, news] })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "#home:
        h1: Home Page
        #link: Go to News
      "
    `)
    await client.run(async ({ tale, click, waitContent }) => {
      await waitContent('#home')
      await click('#link')
      await waitContent('#news')
      await click('#link')
      await waitContent('#home')
      await click('#link')
      await waitContent('#news')
      expect(await tale()).toMatchInlineSnapshot(`
        "/
          #home:
            h1: Home Page
            #link: Go to News

        /news
          #loading: ...

          #news:
            h1: News Page (1)
            #link: Go to Home

        /
          #home:
            h1: Home Page
            #link: Go to News

        /news
          #news:
            h1: News Page (1)
            #link: Go to Home
        "
      `)
    })
    // await client.destroy()
  })
})
