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
      .loading(() => <div id="loading">...</div>)
      .root()
    const page = root
      .lets('page', 'home', '/')
      .loader(() => ({ x: 1 }))
      .page(({ data }) => (
        <div id="home">
          <h1>Home Page ({data.x})</h1>
          <SimpleLink id="link" to={'/news'}>
            News
          </SimpleLink>
        </div>
      ))
    const news = root.lets('page', 'news').page(({ data }) => (
      <div id="news">
        <h1>News Page</h1>
        <SimpleLink id="link" to={'/'}>
          Home
        </SimpleLink>
      </div>
    ))
    const { client } = await createTestThings({ points: [root, page, news] })
    await client.run(async ({ tale, click, waitContent }) => {
      expect(await tale()).toMatchInlineSnapshot(`
        "/
          #loading: ...

          #home:
            h1: Home Page (1)
            #link: News
        "
      `)

      await click('#link')
      await waitContent('#news')
      expect(await tale()).toMatchInlineSnapshot(`
        "/
          #loading: ...

          #home:
            h1: Home Page (1)
            #link: News

        /news
          #news:
            h1: News Page
            #link: Home
        "
      `)
      await click('#link')
      await waitContent('#home')
      expect(await tale()).toMatchInlineSnapshot(`
        "/
          #loading: ...

          #home:
            h1: Home Page (1)
            #link: News

        /news
          #news:
            h1: News Page
            #link: Home

        /
          #home:
            h1: Home Page (1)
            #link: News
        "
      `)
    })
    await client.destroy()
  })
})
