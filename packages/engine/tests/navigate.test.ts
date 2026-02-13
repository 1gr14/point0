import { afterAll, beforeAll, describe, expect, it, setDefaultTimeout } from 'bun:test'
import type { PlaywrightPage } from './utils/playwright.js'
import { PlaywrightBrowser } from './utils/playwright.js'
import type { TestProject } from './utils/project.js'
import { TestProjectFactory } from './utils/project.js'

setDefaultTimeout(20000)

const tpf = TestProjectFactory.create({
  namespace: 'navigate',
  portsRange: [3400, 3499],
})

let tp: TestProject

const layoutNavTsx = `import { root } from '../lib/root.js'
import { SimpleLink } from '@point0/wouter'

export const navLayout = root.lets('layout', 'navLayout').layout(({ children }) => (
  <div>
    <nav>
      <SimpleLink to="/">/</SimpleLink>
      <SimpleLink to="/with-server">/with-server</SimpleLink>
      <SimpleLink to="/with-client">/with-client</SimpleLink>
      <SimpleLink to="/with-both">/with-both</SimpleLink>
      <SimpleLink to="/with-none">/with-none</SimpleLink>
    </nav>
    <hr />
    {children}
  </div>
))
`

const pageHomeTsx = `import { navLayout } from '../layouts/nav.js'

export const homePage = navLayout.lets('page', 'home', '/').page(() => <div id="home">home</div>)
`

const pageWithServerTsx = `import { navLayout } from '../layouts/nav.js'

export const withServerPage = navLayout.lets('page', 'withServer', 'with-server')
  .loader(async () => {
    await new Promise((r) => setTimeout(r, 400))
    return { x: 1 }
  })
  .page(({ data }) => <div id="with-server">{data.x}</div>)
`

const pageWithClientTsx = `import { navLayout } from '../layouts/nav.js'

export const withClientPage = navLayout.lets('page', 'withClient', 'with-client')
  .clientLoader(async () => {
    await new Promise((r) => setTimeout(r, 400))
    return { y: 2 }
  })
  .page(({ data }) => <div id="with-client">{data.y}</div>)
`

const pageWithBothTsx = `import { navLayout } from '../layouts/nav.js'

export const withBothPage = navLayout.lets('page', 'withBoth', 'with-both')
  .loader(async () => {
    await new Promise((r) => setTimeout(r, 400))
    return { a: 1 }
  })
  .clientLoader(async ({ data }) => {
    await new Promise((r) => setTimeout(r, 400))
    return { ...data, b: 2 }
  })
  .page(({ data }) => <div id="with-both">{data.a},{data.b}</div>)
`

const pageWithNoneTsx = `import { navLayout } from '../layouts/nav.js'

export const withNonePage = navLayout.lets('page', 'withNone', '/with-none').page(() => <div id="with-none">none</div>)
`

async function writeNavigatePages(tp: TestProject) {
  await tp.write('src/layouts/nav.tsx', layoutNavTsx)
  await tp.write('src/pages/home.tsx', pageHomeTsx)
  await tp.write('src/pages/with-server.tsx', pageWithServerTsx)
  await tp.write('src/pages/with-client.tsx', pageWithClientTsx)
  await tp.write('src/pages/with-both.tsx', pageWithBothTsx)
  await tp.write('src/pages/with-none.tsx', pageWithNoneTsx)
}

const getTale = (page: PlaywrightPage) => {
  const originalTale = page.tale
  return originalTale.replaceAll(
    `
    nav:
      a: /
      a: /with-server
      a: /with-client
      a: /with-both
      a: /with-none
    hr:`,
    '',
  )
}

describe('navigate', () => {
  describe('ssr', () => {
    beforeAll(async () => {
      await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
      tpf.setBrowser(await PlaywrightBrowser.init())
      tp = tpf.create({ ssr: true, vite: false })
      await tp.cleanup('ports')
      await tp.init()
      await writeNavigatePages(tp)
      tp.spawn(['bun', 'run', 'dev'])
      await tp.waitStarted()
    })

    afterAll(async () => {
      await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
    })

    it('navigate between pages by links via browser', async () => {
      const page = await tp.gotoServer('/')
      await page.waitContent('#home')

      await page.original.getByText('/with-server').click()
      await page.waitContent('#with-server')

      await page.original.getByText('/with-client').click()
      await page.waitContent('#with-client')

      await page.original.getByText('/with-both').click()
      await page.waitContent('#with-both')

      await page.original.getByText('/with-none').click()
      await page.waitContent('#with-none')

      await page.original.getByText('/', { exact: true }).click()
      await page.waitContent('#home')

      expect(getTale(page)).toMatchInlineSnapshot(`
      "/
        div:
          #home: home
        
      /with-server
        div:
          #with-server: 1
        
      /with-client
        div:
          #with-client: 2
        
      /with-both
        div:
          #with-both: 1,2
        
      /with-none
        div:
          #with-none: none
        
      /
        div:
          #home: home
        "
    `)
    })
  })

  describe('spa', () => {
    beforeAll(async () => {
      await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
      tpf.setBrowser(await PlaywrightBrowser.init())
      tp = tpf.create({ ssr: false, vite: false })
      await tp.cleanup('ports')
      await tp.init()
      await writeNavigatePages(tp)
      tp.spawn(['bun', 'run', 'dev'])
      await tp.waitStarted()
    })

    afterAll(async () => {
      await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
    })

    it('navigate between pages by links via browser', async () => {
      const page = await tp.gotoServer('/')
      await page.waitContent('#home')

      await page.original.getByText('/with-server').click()
      await page.waitContent('#with-server')

      await page.original.getByText('/with-client').click()
      await page.waitContent('#with-client')

      await page.original.getByText('/with-both').click()
      await page.waitContent('#with-both')

      await page.original.getByText('/with-none').click()
      await page.waitContent('#with-none')

      await page.original.getByText('/', { exact: true }).click()
      await page.waitContent('#home')

      expect(getTale(page)).toMatchInlineSnapshot(`
      "/
        (Empty)
        
        div:
          #home: home
        
      /with-server
        div:
          #with-server: 1
        
      /with-client
        div:
          #with-client: 2
        
      /with-both
        div:
          #with-both: 1,2
        
      /with-none
        div:
          #with-none: none
        
      /
        div:
          #home: home
        "
    `)
    })
  })
})
