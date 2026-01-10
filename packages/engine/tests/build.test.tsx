import { afterAll, beforeAll, describe, expect, it, setDefaultTimeout } from 'bun:test'
import type { Engine } from '../src/engine.js'
import type { TestProject, TestProjectFactoryCreateProjectOptions } from './utils/project.js'
import { TestProjectFactory } from './utils/project.js'
import { throwOnBundlersLengthNot2 } from './utils/other.js'

setDefaultTimeout(15000)

const tpf = TestProjectFactory.create({
  namespace: 'build',
  portsRange: [3100, 3199],
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
  const tp = tpf.create({ ...tpOptions, fixedId: !deleteFiles })
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

const bundlers = ['bun', 'vite']

describe('build', () => {
  beforeAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
    await tpf.initBrowser()
  })

  afterAll(async () => {
    await tpf.cleanup({ files: !preventFinalFilesCleanup, processes: true, ports: true, browser: true })
    throwOnBundlersLengthNot2(bundlers)
  })

  describe.concurrent.each(bundlers)('%s', (bundler) => {
    it.concurrent(
      'build and start ssr server',
      wrp({ ssr: true, vite: bundler === 'vite' }, async ({ tp, engine }) => {
        await tp.write(
          'src/page.tsx',
          `import { root } from './lib/root.js'
        export const page = root.lets('page', 'home', '/').page(() => <div>My Cool Page</div>)`,
        )
        await tp.generate()
        const bp = tp.spawn(['bun', 'run', 'build'])
        await bp.exited
        expect(await tp.distServerContainsText('My Cool Page')).toBe(true)
        expect(await tp.distClientContainsText('My Cool Page')).toBe(true)
        tp.spawn(['bun', 'run', 'start'])
        expect(engine.server.port).toBeNumber()
        expect(engine.clients[0].port).toBeNumber()
        await tp.waitStarted()
        const response = await tp.fetchServer('/')
        expect(response).toBeDefined()
        const html = await response.text()
        expect(html).toContain('<div>My Cool Page</div>')
        expect(html).toContain('__POINT0_ENV__')
        const page = await tp.gotoServer('/')
        await page.stable
        expect(page.tale).toMatchInlineSnapshot(`
        "http://localhost/
          div: My Cool Page
          "
      `)
      }),
      {
        retry: 3,
      },
    )

    it.concurrent(
      'build and start spa server',
      wrp({ ssr: false, vite: bundler === 'vite' }, async ({ tp, engine }) => {
        await tp.write(
          'src/page.tsx',
          `import { root } from './lib/root.js'
        export const page = root.lets('page', 'home', '/').page(() => <div>My Cool Page</div>)`,
        )
        await tp.generate()
        const bp = tp.spawn(['bun', 'run', 'build'])
        await bp.exited
        expect(await tp.distServerContainsText('My Cool Page')).toBe(false)
        expect(await tp.distClientContainsText('My Cool Page')).toBe(true)
        tp.spawn(['bun', 'run', 'start'])
        expect(engine.server.port).toBeNumber()
        expect(engine.clients[0].port).toBeNumber()
        await tp.waitStarted()
        const response = await tp.fetchServer('/')
        const html = await response.text()
        expect(html).toContain('__POINT0_ENV__')
        expect(html).not.toContain('<div>My Cool Page</div>')
        const page = await tp.gotoServer('/')
        await page.stable
        expect(page.tale).toMatchInlineSnapshot(`
        "http://localhost/
          (Empty)

          div: My Cool Page
          "
      `)
      }),
      {
        retry: 3,
      },
    )
  })
})
