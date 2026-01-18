import { afterAll, beforeAll, describe, expect, it, setDefaultTimeout } from 'bun:test'
import type { Engine } from '../src/engine.js'
import { throwOnBundlersLengthNot2 } from './utils/other.js'
import type { TestProject, TestProjectFactoryCreateProjectOptions } from './utils/project.js'
import { TestProjectFactory } from './utils/project.js'

setDefaultTimeout(15000)

const tpf = TestProjectFactory.create({
  namespace: 'build',
  portsRange: [3100, 3199],
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

describe('build', () => {
  beforeAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
    await tpf.initBrowser()
  })

  afterAll(async () => {
    await tpf.cleanup({ files: !preventFinalFilesCleanup, processes: true, ports: true, browser: true })
    throwOnBundlersLengthNot2(bundlers)
  })

  describe.each(bundlers)('%s', (bundler) => {
    it(
      'build and start ssr server',
      wrp({ ssr: true, vite: bundler === 'vite' }, async ({ tp, engine }) => {
        if (bundler === 'bun') {
          return
        }
        await tp.write(
          'src/page.tsx',
          `import { root } from './lib/root.js'
        export const page = root.lets('page', 'home', '/').page(() => <div>My Cool Page</div>)`,
        )
        await tp.generate()
        const bp = tp.spawn(['bun', 'run', 'build'])
        await bp.exited

        const serverFilesContent = await tp.getDistServerFilesContent()
        const clientFilesContent = await tp.getDistClientFilesContent()
        expect(serverFilesContent).toContain('My Cool Page')
        expect(clientFilesContent).toContain('My Cool Page')
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
        "/
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
        const clientFilesContent = await tp.getDistClientFilesContent()
        const serverFilesContent = await tp.getDistServerFilesContent()
        expect(serverFilesContent).not.toContain('My Cool Page')
        expect(clientFilesContent).toContain('My Cool Page')
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
        "/
          (Empty)
          
          div: My Cool Page
          "
      `)
      }),
      {
        retry: 3,
      },
    )

    it.concurrent(
      'prune client and server',
      wrp({ ssr: true, vite: bundler === 'vite' }, async ({ tp, engine }) => {
        await tp.write(
          'src/page.tsx',
          `import { root } from './lib/root.js'
          import { env } from '@point0/core'
          export const page = root.lets('page', 'home', '/').page(() => <div>MY_CLIENT_SERVER1</div>) // will persist everywhere becouse ssr enabled in root
          export const page2 = root.lets('page', 'page2', '/2').ssr(false).page(() => <div>MY_CLIENT_ONLY3</div>) //  becouse ssr was diabled
          export const page3 = root.lets('page', 'page3', '/3').page(() => (env.target.is.server ? <div>MY_SERVER_ONLY4</div> : <div>MY_CLIENT_ONLY5</div>))
          export const page4 = root.lets('page', 'page4', '/4').page(() => { if (env.target.is.server) { return <div>MY_SERVER_ONLY6</div> } else { return <div>MY_CLIENT_ONLY7</div> } })
          export const page5 = root.lets('page', 'page5', '/5').loader(() => { console.info('MY_SERVER_ONLY8'); return {y:2} }).page(() => <div>MY_CLIENT_SERVER9</div>) // it is ok
        `,
        )
        const generateResult = await tp.generate()
        expect(generateResult.points.length).toBe(6)
        const bp = tp.spawn(['bun', 'run', 'build'])
        await bp.exited
        const clientFilesContent = await tp.getDistClientFilesContent()
        const serverFilesContent = await tp.getDistServerFilesContent()
        expect(clientFilesContent.includes('MY_CLIENT_SERVER9')).toBe(true)
        expect(clientFilesContent.includes('MY_CLIENT_SERVER1')).toBe(true)
        expect(clientFilesContent.includes('MY_CLIENT_ONLY5')).toBe(true)

        expect(clientFilesContent.includes('MY_CLIENT_ONLY3')).toBe(true)
        expect(clientFilesContent.includes('MY_CLIENT_ONLY7')).toBe(true)

        expect(clientFilesContent.includes('MY_SERVER_ONLY4')).toBe(false)
        expect(clientFilesContent.includes('MY_SERVER_ONLY8')).toBe(false)
        expect(clientFilesContent.includes('MY_SERVER_ONLY6')).toBe(false)

        expect(serverFilesContent.includes('MY_CLIENT_SERVER9')).toBe(true)
        expect(serverFilesContent.includes('MY_CLIENT_SERVER1')).toBe(true)
        expect(serverFilesContent.includes('MY_SERVER_ONLY4')).toBe(true)

        expect(serverFilesContent.includes('MY_CLIENT_ONLY5')).toBe(false)
        expect(serverFilesContent.includes('MY_CLIENT_ONLY3')).toBe(false)
        expect(serverFilesContent.includes('MY_CLIENT_ONLY7')).toBe(false)

        expect(serverFilesContent.includes('MY_SERVER_ONLY8')).toBe(true)
        expect(serverFilesContent.includes('MY_SERVER_ONLY6')).toBe(true)

        tp.spawn(['bun', 'run', 'start'])
        expect(engine.server.port).toBeNumber()
        expect(engine.clients[0].port).toBeNumber()
        await tp.waitStarted()
        const response = await tp.fetchServer('/4')
        const html = await response.text()
        expect(html).toContain('__POINT0_ENV__')
        expect(html).toContain('<div>MY_SERVER_ONLY6</div>')
        const page = await tp.gotoServer('/3')
        await page.stable
        expect(page.tale).toMatchInlineSnapshot(`
          "/3
            div: MY_SERVER_ONLY4
            
            div: MY_CLIENT_ONLY5
            "
        `)
      }),
      {
        retry: 3,
      },
    )
  })

  it.concurrent(
    'prune vite config from engine',
    wrp({ ssr: true, vite: true }, async ({ tp, engine }) => {
      await tp.write(
        'src/page.tsx',
        `import { root } from './lib/root.js'
      export const page = root.lets('page', 'home', '/').page(() => <div>My Cool Page</div>)`,
      )
      await tp.prepend(
        tp.files.engine,
        `
        import react from '@vitejs/plugin-react'
        import svgr from 'vite-plugin-svgr'
        import tsconfigPaths from 'vite-tsconfig-paths'
      `,
      )
      await tp.replace(
        tp.files.engine,
        `viteConfig: '../vite.config.ts'`,
        `viteConfig: {
            plugins: [react(), svgr(), tsconfigPaths()],
            define: {
              I_WILL_BE_REMOVED_ON_BUILD_STAGE_FORM_HERE: JSON.stringify('I_WILL_BE_REMOVED_ON_BUILD_STAGE_FORM_HERE'),
            },
          }`,
      )
      await tp.generate()
      const bp = tp.spawn(['bun', 'run', 'build'])
      await bp.exited
      const serverFilesContent = await tp.getDistServerFilesContent()
      const clientFilesContent = await tp.getDistClientFilesContent()
      expect(serverFilesContent).not.toContain('I_WILL_BE_REMOVED_ON_BUILD_STAGE_FORM_HERE')
      expect(clientFilesContent).not.toContain('I_WILL_BE_REMOVED_ON_BUILD_STAGE_FORM_HERE')
      tp.spawn(['bun', 'run', 'start'])
      expect(engine.server.port).toBeNumber()
      expect(engine.clients[0].port).toBeNumber()
      await tp.waitStarted()
      const page = await tp.gotoServer('/')
      await page.stable
      expect(page.tale).toMatchInlineSnapshot(`
      "/
        div: My Cool Page
        "
    `)
    }),
    {
      retry: 3,
    },
  )
})
