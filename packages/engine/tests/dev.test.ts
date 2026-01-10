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
      await tp.waitForStarted()
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

  it.only(
    'start spa dev server',
    wrp({ ssr: false }, async ({ tp, engine }) => {
      tp.spawn(['bun', 'run', 'dev'])
      expect(engine.server.port).toBe(tp.serverPort)
      expect(engine.clients[0].port).toBe(tp.clientPort)
      await tp.waitForStarted()
      const html = await tp.fetchServerHtml('/')
      expect(html).toContain('__POINT0_ENV__')
      expect(html).not.toContain('<div>Page Not Found</div>')
      const page = await tp.gotoServer('/')
      await page.stable
      console.log(page.story)
      expect(page.tale).toMatchInlineSnapshot(`
        "http://localhost/
          
          
          div: Page Not Found
          "
      `)
    }),
  )

  // it.concurrent(
  //   'have hmr client updates',
  //   wrp({ ssr: true, deleteFiles: false }, async ({ tp, engine }) => {
  //     await tp.write(
  //       'src/page.tsx',
  //       `import { root } from './lib/root.js'
  //       export const page = root.lets('page', 'home', '/').page(() => <div>Hello</div>)`,
  //     )
  //     tp.spawn(['bun', 'run', 'dev'])
  //     await tp.waitForStarted()
  //     const html = await tp.fetchServerHtml('/')
  //     expect(html).toContain('<div>Hello</div>')

  //     // Use Playwright to test HMR
  //     const playwright = new PlaywrightHelper({ headless: true })
  //     try {
  //       await playwright.start()
  //       await playwright.loadUrl(`http://localhost:${engine.server.port}`)

  //       // Check if "Hello" is in the page
  //       const hasHello = await playwright.checkContent('Hello')
  //       expect(hasHello).toBe(true)

  //       // Verify initial navigation count (should be 1 after initial load)
  //       expect(playwright.getNavigationCount()).toBe(1)

  //       // Edit file content
  //       await tp.write(
  //         'src/page.tsx',
  //         `import { root } from './lib/root.js'
  //       export const page = root.lets('page', 'home', '/').page(() => <div>Hello World</div>)`,
  //       )

  //       // Wait until content changed without page reload (HMR)
  //       // This will throw if a page reload is detected
  //       await playwright.waitForContentChange('Hello', 'Hello World', 10000)

  //       // Verify the new content is present
  //       const hasHelloWorld = await playwright.checkContent('Hello World')
  //       expect(hasHelloWorld).toBe(true)

  //       // Explicitly verify no page reload occurred (HMR should update without reload)
  //       expect(playwright.verifyNoReload()).toBe(true)
  //       expect(playwright.getNavigationCount()).toBe(1)
  //     } finally {
  //       await playwright.close()
  //     }
  //   }),
  // )
})
