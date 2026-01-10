import { afterAll, beforeAll, describe, expect, it, setDefaultTimeout } from 'bun:test'
import type { Engine } from '../src/engine.js'
import type { TestProject, TestProjectFactoryCreateProjectOptions } from './utils/project.js'
import { TestProjectFactory } from './utils/project.js'
import { PlaywrightBrowser } from './utils/playwright.js'

setDefaultTimeout(15000)

const tpf = TestProjectFactory.create({
  namespace: 'dev',
  portsRange: [3000, 3099],
})

type ItFn = (done: (err?: unknown) => any) => any

let preventFinalFilesCleanup = false
function wrp(
  options: TestProjectFactoryCreateProjectOptions & { deleteFiles?: boolean },
  callback: ({ tp, engine }: { tp: TestProject; engine: Engine }) => any,
): ItFn
function wrp(callback: ({ tp, engine }: { tp: TestProject; engine: Engine }) => any): ItFn
function wrp(
  ...args:
    | [callback: ({ tp, engine }: { tp: TestProject; engine: Engine }) => any]
    | [
        options: TestProjectFactoryCreateProjectOptions & { deleteFiles?: boolean },
        callback: ({ tp, engine }: { tp: TestProject; engine: Engine }) => any,
      ]
): ItFn {
  const [options, callback] = args.length === 1 ? [{}, args[0]] : args
  const { deleteFiles = true, ...tpOptions } = options
  if (!deleteFiles) {
    preventFinalFilesCleanup = true
  }
  const tp = tpf.create({ ...tpOptions })
  return async () => {
    try {
      await tp.init()
      const engine = await tp.importEngine()
      await callback({ tp, engine })
      await tp.cleanup({ files: deleteFiles, ports: true, processes: true })
    } catch (error) {
      await tp.cleanup({ files: deleteFiles, ports: true, processes: true })
      throw error
    }
  }
}

describe.concurrent('dev', () => {
  beforeAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
    tpf.setBrowser(await PlaywrightBrowser.init())
  })

  afterAll(async () => {
    await tpf.cleanup({ files: !preventFinalFilesCleanup, processes: true, ports: true, browser: true })
  })

  it.concurrent(
    'start ssr dev server',
    wrp({ ssr: true }, async ({ tp, engine }) => {
      tp.spawn(['bun', 'run', 'dev'])
      expect(engine.server.port).toBe(3000)
      expect(engine.clients[0].port).toBe(3001)
      await tp.waitStarted()
      const response = await tp.fetchServer('/')
      const html = await response.text()
      expect(html).toContain('__POINT0_ENV__')
      expect(html).toContain('<div>Page Not Found</div>')
      const page = await tp.gotoServer('/')
      await page.stable
      expect(page.tale).toMatchInlineSnapshot(`
        "http://localhost/
          div: Page Not Found
          "
      `)
    }),
  )

  it.concurrent(
    'start spa dev server',
    wrp({ ssr: false }, async ({ tp, engine }) => {
      tp.spawn(['bun', 'run', 'dev'])
      expect(engine.server.port).toBe(tp.serverPort)
      expect(engine.clients[0].port).toBe(tp.clientPort)
      await tp.waitStarted()
      const html = await tp.fetchServerHtml('/')
      expect(html).toContain('__POINT0_ENV__')
      expect(html).not.toContain('<div>Page Not Found</div>')
      const page = await tp.gotoServer('/')
      await page.stable
      expect(page.tale).toMatchInlineSnapshot(`
        "http://localhost/
          (Empty)

          div: Page Not Found
          "
      `)
    }),
  )

  // Sad test, sometimes failed...
  it.concurrent(
    'have hmr client updates',
    wrp({ ssr: true, deleteFiles: false }, async ({ tp, engine }) => {
      await tp.write(
        'src/page.tsx',
        `import { root } from './lib/root.js'
        export const page = root.lets('page', 'home', '/').page(() => <div>Hello</div>)`,
      )
      tp.spawn(['bun', 'run', 'dev'])
      await tp.waitStarted()
      const page = await tp.gotoClient('/')
      await page.waitContent('Hello')
      await new Promise((resolve) => setTimeout(resolve, 300))
      // await page.waitLog('Hot-module-reloading socket connected, waiting for changes', 2000)
      await tp.replace('src/page.tsx', 'Hello', 'Ciao')
      await page.waitContent('Ciao', 3000)
      await new Promise((resolve) => setTimeout(resolve, 300))
      await tp.replace('src/page.tsx', 'Ciao', 'Wow')
      await new Promise((resolve) => setTimeout(resolve, 300))
      await page.stable
      await page.waitContent('Wow', 3000)
      console.dir(page.story, { depth: null })
      expect(page.history.length).toBeLessThan(3) // maybe on first bun con connected yet, but in second change evrything should work
    }),
  )
})
