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

// const bundlers = ['bun', 'vite']
const bundlers = ['bun']

describe('build', () => {
  beforeAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
    await tpf.initBrowser()
  })

  afterAll(async () => {
    await tpf.cleanup({ files: !preventFinalFilesCleanup, processes: true, ports: true, browser: true })
    // throwOnBundlersLengthNot2(bundlers)
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

    it.only(
      'prune client and server',
      wrp({ ssr: true, vite: bundler === 'vite', deleteFiles: false }, async ({ tp, engine }) => {
        await tp.write(
          'src/page.tsx',
          `import { root } from './lib/root.js'
          import { env } from '@point0/env'
          export const page = root.lets('page', 'home', '/').page(() => <div>MY_CLIENT_SERVER</div>) // will persist everywhere becouse ssr enabled in root
          export const page1 = root.lets('page1', 'page1', '/1').clientLoader(() => ({x:1})).page(() => <div>MY_CLIENT_ONLY</div>) // becouse after client loader all components pruned for server
          export const page2 = root.lets('page2', 'page2', '/2').ssr(false).page(() => <div>MY_CLIENT_ONLY</div>) //  becouse ssr was diabled
          export const page3 = root.lets('page3', 'page3', '/3').page(() => (env.target.is.server ? <div>MY_SERVER_WRONG_HOPE</div> : <div>MY_CLIENT_WRONG_HOPE</div>)) // it is becouse trenary not pruned by dead code
          export const page4 = root.lets('page4', 'page4', '/4').page(() => { if (env.target.is.server) { return <div>MY_SERVER_ONLY</div> } else { return <div>MY_CLIENT_ONLY</div> } }) // it is ok
          export const page5 = root.lets('page5', 'page5', '/5').loader(() => { console.info('MY_SERVER_ONLY'); return {y:2} }).page(() => <div>MY_CLIENT_SERVER</div>) // it is ok
        `,
        )
        const generateResult = await tp.generate()
        expect(generateResult.points.length).toBe(7)
        const bp = tp.spawn(['bun', 'run', 'build'])
        await bp.exited
        bp.logOutput()
        return
        expect(await tp.distServerContainsText('MY_SERVER_ONLY')).toBe(true)
        expect(await tp.distServerContainsText('MY_SERVER_ONLY')).toBe(true)
        expect(await tp.distServerContainsText('MY_CLIENT_ONLY')).toBe(false)
        expect(await tp.distClientContainsText('MY_SERVER_ONLY')).toBe(false)
        expect(await tp.distClientContainsText('MY_CLIENT_ONLY')).toBe(true)
        tp.spawn(['bun', 'run', 'start'])
        expect(engine.server.port).toBeNumber()
        expect(engine.clients[0].port).toBeNumber()
        await tp.waitStarted()
        const response = await tp.fetchServer('/3')
        const html = await response.text()
        expect(html).toContain('__POINT0_ENV__')
        expect(html).toContain('<div>MY_SERVER_ONLY</div>')
        const page = await tp.gotoServer('/3')
        await page.stable
        expect(page.tale).toMatchInlineSnapshot()
      }),
      {
        // retry: 3,
      },
    )
  })
})
