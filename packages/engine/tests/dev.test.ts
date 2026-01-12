import { afterAll, beforeAll, describe, expect, it, setDefaultTimeout } from 'bun:test'
import type { Engine } from '../src/engine.js'
import { PlaywrightBrowser } from './utils/playwright.js'
import type { TestProject, TestProjectFactoryCreateProjectOptions } from './utils/project.js'
import { TestProjectFactory } from './utils/project.js'
import { throwOnBundlersLengthNot2 } from './utils/other.js'

setDefaultTimeout(20000)

const tpf = TestProjectFactory.create({
  namespace: 'dev',
  portsRange: [3200, 3299],
})

type ItFn = (done: (err?: unknown) => any) => any

let preventFinalFilesCleanup = false
function wrp(
  options: TestProjectFactoryCreateProjectOptions & { preserve?: boolean },
  callback: ({ tp, engine }: { tp: TestProject; engine: Engine }) => any,
): ItFn
function wrp(callback: ({ tp, engine }: { tp: TestProject; engine: Engine }) => any): ItFn
function wrp(
  ...args:
    | [callback: ({ tp, engine }: { tp: TestProject; engine: Engine }) => any]
    | [
        options: TestProjectFactoryCreateProjectOptions & { preserve?: boolean },
        callback: ({ tp, engine }: { tp: TestProject; engine: Engine }) => any,
      ]
): ItFn {
  const [options, callback] = args.length === 1 ? [{}, args[0]] : args
  const { preserve = false, ...tpOptions } = options
  if (preserve) {
    preventFinalFilesCleanup = true
  }
  const tp = tpf.create({ ...tpOptions, fixedId: preserve })
  return async () => {
    try {
      await tp.cleanup('ports')
      await tp.init()
      const engine = await tp.importEngine()
      await callback({ tp, engine })
      await tp.cleanup({ files: !preserve, ports: true, processes: true })
    } catch (error) {
      await tp.cleanup({ files: !preserve, ports: true, processes: true })
      throw error
    }
  }
}

const bundlers = ['bun', 'vite']

describe('dev', () => {
  beforeAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
    tpf.setBrowser(await PlaywrightBrowser.init())
  })

  afterAll(async () => {
    await tpf.cleanup({ files: !preventFinalFilesCleanup, processes: true, ports: true, browser: true })
    throwOnBundlersLengthNot2(bundlers)
  })

  describe.each(bundlers)('%s', (bundler) => {
    it(
      'start ssr dev server',
      wrp({ ssr: true, vite: bundler === 'vite' }, async ({ tp, engine }) => {
        if (bundler === 'vite') {
          expect(engine.server.viteConfig).toBeString()
        } else {
          expect(engine.server.viteConfig).toBeNull()
        }
        expect(engine.server.port).toBeNumber()
        expect(engine.clients[0].port).toBeNumber()
        expect(engine.server.hmrPort).toBeNull()
        expect(engine.clients[0].hmrPort).toBeNull()
        await tp.write(
          'src/page.tsx',
          `import { root } from './lib/root.js'
          export const page = root.lets('page', 'home', '/').page(() => <div>Hello</div>)`,
        )
        tp.spawn(['bun', 'run', 'dev'])
        await tp.waitStarted()
        const response = await tp.fetchServer('/')
        const html = await response.text()
        expect(html).toContain('__POINT0_ENV__')
        expect(html).toContain('<div>Hello</div>')
        const page = await tp.gotoServer('/')
        expect(page.tale).toMatchInlineSnapshot(`
        "http://localhost/
          div: Hello
          "
      `)
      }),
      {
        retry: 3,
      },
    )

    it(
      'start spa dev server',
      wrp({ ssr: false, vite: bundler === 'vite' }, async ({ tp, engine }) => {
        expect(engine.server.port).toBeNumber()
        expect(engine.clients[0].port).toBeNumber()
        expect(engine.server.hmrPort).toBeNull()
        expect(engine.clients[0].hmrPort).toBeNull()
        await tp.write(
          'src/page.tsx',
          `import { root } from './lib/root.js'
        export const page = root.lets('page', 'home', '/').page(() => <div>Hello</div>)`,
        )
        tp.spawn(['bun', 'run', 'dev'])
        await tp.waitStarted()
        const html = await tp.fetchServerHtml('/')
        expect(html).toContain('__POINT0_ENV__')
        expect(html).not.toContain('<div>Hello</div>')
        const page = await tp.gotoServer('/')
        await page.stable
        expect(page.tale).toMatchInlineSnapshot(`
        "http://localhost/
          (Empty)

          div: Hello
          "
      `)
      }),
      {
        retry: 3,
      },
    )

    // Sad, becouse it is main thing and sometimes failed... But in real it works
    it(
      'have hmr client updates',
      wrp({ ssr: true, clientHmr: true, vite: bundler === 'vite' }, async ({ tp, engine }) => {
        await tp.waitPortsFree()
        expect(engine.server.hmrPort).toBeNull()
        expect(engine.clients[0].hmrPort).toBeNumber()
        await tp.write(
          'src/page.tsx',
          `import { root } from './lib/root.js'
        export const page = root.lets('page', 'home', '/').page(() => <div>Hello</div>)`,
        )
        tp.spawn(['bun', 'run', 'dev'])
        await tp.waitStarted()
        await new Promise((resolve) => setTimeout(resolve, 700))
        const page = await tp.gotoClient('/')
        await new Promise((resolve) => setTimeout(resolve, 400))
        await page.waitContent('Hello')
        await new Promise((resolve) => setTimeout(resolve, 400))
        await tp.replace('src/page.tsx', 'Hello', 'Ciao')
        await new Promise((resolve) => setTimeout(resolve, 400))
        await page.waitContent('Ciao', 3000)
        expect(page.history.length).toBe(1)
      }),
      {
        retry: 10,
      },
    )
  })
})
