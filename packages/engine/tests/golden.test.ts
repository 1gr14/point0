import { afterAll, beforeAll, describe, it, setDefaultTimeout } from 'bun:test'
import { PlaywrightBrowser } from './utils/playwright.js'
import type { TestProject } from './utils/project.js'
import { TestProjectFactory } from './utils/project.js'
import { throwOnBundlersLengthNot2 } from './utils/other.js'

setDefaultTimeout(30000)

const tpf = TestProjectFactory.create({
  namespace: 'golden',
  portsRange: [3300, 3399],
})

const bundlers = ['bun', 'vite']
const ssrs = ['ssr', 'spa']
const modes = ['dev', 'build']

const writeGoldenProject = async (tp: TestProject) => {
  await tp.write(
    'src/pages.tsx',
    `import { root } from './lib/root.js'
import { SimpleLink } from '@point0/wouter'

export const stats = root.lets('query', 'stats').loader(() => ({ value: 1 })).query()
export const increment = root.lets('mutation', 'increment').loader(() => ({ count: 1 })).mutation()

export const layout = root.lets('layout', 'app').layout(({ children }) => (
  <div id="layout">
    <nav id="nav">
      <SimpleLink id="to-home" to="/">
        Home
      </SimpleLink>
      <SimpleLink id="to-about" to="/about">
        About
      </SimpleLink>
    </nav>
    {children}
  </div>
))

export const home = layout
  .lets('page', 'home', '/')
  .query(stats)
  .page(({ data }) => (
    <div id="home">
      <h1>Home Page</h1>
      <div id="stats">Stats={data?.value ?? 0}</div>
    </div>
  ))

export const about = layout.lets('page', 'about', '/about').page(() => {
  const mutation = increment.useMutation()
  return (
    <div id="about">
      <h1>About Page</h1>
      <div id="count">Count={mutation.data?.count ?? 0}</div>
      <button id="mutate" onClick={() => mutation.mutate()}>
        Mutate
      </button>
    </div>
  )
})
`,
  )
}

describe('golden', () => {
  beforeAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
    tpf.setBrowser(await PlaywrightBrowser.init())
  })

  afterAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
    throwOnBundlersLengthNot2(bundlers)
  })

  describe.each(bundlers)('%s', (bundler) => {
    describe.each(ssrs)('%s', (ssr) => {
      describe.each(modes)('%s', (mode) => {
        let tp: TestProject

        beforeAll(async () => {
          tp = tpf.create({ ssr: ssr === 'ssr', vite: bundler === 'vite' })
          await tp.init()
          await writeGoldenProject(tp)

          if (mode === 'build') {
            await tp.generate()
            const buildProcess = tp.spawn(['bun', 'run', 'build'])
            await buildProcess.exited
            tp.spawn(['bun', 'run', 'start'])
          } else {
            tp.spawn(['bun', 'run', 'dev'])
          }

          await tp.waitStarted()
        })

        afterAll(async () => {
          await tp.cleanup({ files: true, processes: true, ports: true })
        })

        it('renders layout and query', async () => {
          const page = await tp.gotoServer('/')
          await page.waitContent('#layout')
          await page.waitContent('#home')
          await page.waitContent('Stats: 1')
          await page.close()
        })

        it('navigates via link', async () => {
          const page = await tp.gotoServer('/')
          await page.waitContent('#home')
          await page.original.click('#to-about')
          await page.waitContent('#about')
          await page.original.click('#to-home')
          await page.waitContent('#home')
          await page.close()
        })

        it('runs mutation on about page', async () => {
          const page = await tp.gotoServer('/about')
          await page.waitContent('#about')
          await page.waitContent('Count: 0')
          await page.original.click('#mutate')
          await page.waitContent('Count: 1')
          await page.close()
        })
      })
    })
  })
})
