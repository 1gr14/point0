// import '@testing-library/jest-dom'
import { describe, expect, it } from 'bun:test'
import { Point0 } from '@point0/core'
// import { PlaywrightBrowser } from './utils/playwright.js'
// import type { TestProject, TestProjectFactoryCreateProjectOptions } from './utils/project.one-client.js'
// import { TestProjectFactory } from './utils/project.one-client.js'
import { createTestThings, waitReturn } from '../internal-testing.js'
import { createNavigation } from '@point0/wouter'
import { ClientPoints } from '@point0/core'

describe('internal-testing', () => {
  it('works', async () => {
    const root = Point0.lets('root', 'root')
      .queryOptions({ refetchOnMount: false, staleTime: Infinity })
      .prefetchPageOnNavigate(false)
      .prefetchPageOnLinkHover(false)
      .loading(() => <div id="loading">...</div>)
      .root()
    const routes = ClientPoints.createFromDefintion([root]).routes
    const { Link } = createNavigation({ routes })
    const page = root.lets('page', 'home', '/').page(() => (
      <div id="home">
        <h1>Home Page</h1>
        <Link id="link" to={'/news'}>
          Go to News
        </Link>
      </div>
    ))
    const news = root
      .lets('page', 'news', '/news')
      .loader(async () => await waitReturn({ x: 1 }))
      // .loader(() => ({ x: 1 }))
      .page(({ data }) => (
        <div id="news">
          <h1>News Page ({data.x})</h1>
          <Link id="link" to={'/'}>
            Go to Home
          </Link>
        </div>
      ))
    const { fetchPreview, fetchRecorder, fetchesTale, render } = await createTestThings({
      ssr: true,
      points: [root, page, news],
    })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #home:
        h1: Home Page
        #link: Go to News
      "
    `)
    const fetchResults1 = await fetchRecorder.waitFinishedResults()
    expect(fetchResults1).toHaveLength(1)
    expect(fetchResults1[0].variant).toBe('page')
    fetchRecorder.prune()

    await render(async ({ tale, click, waitContent }) => {
      await waitContent('#home')
      await click('#link')
      await waitContent('#news')
      await click('#link')
      await waitContent('#home')
      await click('#link')
      await waitContent('#news')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /
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
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      page.news (client) < {}
      "
    `)

    // await client.destroy()
  })
})
