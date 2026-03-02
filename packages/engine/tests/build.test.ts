import { afterAll, beforeAll, describe, expect, it, setDefaultTimeout } from 'bun:test'
import type { Engine } from '../src/engine.js'
import { throwOnBundlersLengthNot2 } from './utils/other.js'
import type {
  TestProjectOneClient,
  TestProjectOneClientFactoryCreateProjectOptions,
} from './utils/project.one-client.js'
import { TestProjectOneClientFactory } from './utils/project.one-client.js'
import assert from 'node:assert'

setDefaultTimeout(15000)

const tpf = TestProjectOneClientFactory.create({
  namespace: 'build',
  portsRange: [3100, 3199],
})

type ItFn = (done: (err?: unknown) => void) => void | Promise<void>

let preventFinalFilesCleanup = false
function wrp(
  options: TestProjectOneClientFactoryCreateProjectOptions & { preserve?: boolean },
  callback: ({ tp, engine }: { tp: TestProjectOneClient; engine: Engine }) => void | Promise<void>,
): ItFn
function wrp(callback: ({ tp, engine }: { tp: TestProjectOneClient; engine: Engine }) => void | Promise<void>): ItFn
function wrp(
  ...args:
    | [callback: ({ tp, engine }: { tp: TestProjectOneClient; engine: Engine }) => void | Promise<void>]
    | [
        options: TestProjectOneClientFactoryCreateProjectOptions & { preserve?: boolean },
        callback: ({ tp, engine }: { tp: TestProjectOneClient; engine: Engine }) => void | Promise<void>,
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
    void tpf.cleanup({ files: !preventFinalFilesCleanup, processes: true, ports: true, browser: true })
    throwOnBundlersLengthNot2(bundlers)
  })

  describe.each(bundlers)('%s', (bundler) => {
    it(
      'build and start ssr server',
      wrp({ ssr: true, vite: bundler === 'vite', preserve: false }, async ({ tp, engine }) => {
        if (bundler === 'bun') {
          return
        }
        await tp.write(
          'src/page.tsx',
          `import { root } from './lib/root.js'
          import { env } from '@point0/core'
        export const page = root.lets('page', 'home', '/').page(() => <div>My Cool Page, {process.env.MY_ENV_FILE_VARIABLE}, {process.env.MY_ENV_FILE_CONSTANT}, {env.vars.MY_ENV_FILE_VARIABLE}, {env.vars.MY_ENV_FILE_CONSTANT}</div>)`,
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
        expect(html).toContain('<div>My Cool Page')
        expect(html).toContain('VAR1')
        expect(html).toContain('CONST1')
        expect(html).toContain('__POINT0_ENV_VARS__')
        expect(html).toContain('__POINT0_ENV_CONSTS__')
        const page = await tp.gotoServer('/')
        await page.stable
        expect(page.tale).toMatchInlineSnapshot(`
        "
        /
          div: My Cool Page, VAR1, CONST1, VAR1, CONST1
          "
        `)
        const publicDirResponse = await tp.fetchServer('/hello.txt')
        const publicDirText = await publicDirResponse.text()
        expect(publicDirText).toBe('Hi!')
      }),
      {
        retry: 3,
      },
    )

    it(
      'build and start spa server',
      wrp({ ssr: false, vite: bundler === 'vite', preserve: false }, async ({ tp, engine }) => {
        await tp.write(
          'src/page.tsx',
          `import { root } from './lib/root.js'
          import { env } from '@point0/core'
        export const page = root.lets('page', 'home', '/').page(() => <div>My Cool Page, {process.env.MY_ENV_FILE_VARIABLE}, {process.env.MY_ENV_FILE_CONSTANT}, {env.vars.MY_ENV_FILE_VARIABLE}, {env.vars.MY_ENV_FILE_CONSTANT}</div>)`,
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
        expect(html).toContain('__POINT0_ENV_VARS__')
        expect(html).toContain('__POINT0_ENV_CONSTS__')
        expect(html).not.toContain('<div>My Cool Page')
        const page = await tp.gotoServer('/')
        await page.stable
        expect(page.tale).toMatchInlineSnapshot(`
        "
        /
          (Empty)
          
          div: My Cool Page, VAR1, CONST1, VAR1, CONST1
          "
        `)
        const publicDirResponse = await tp.fetchServer('/hello.txt')
        const publicDirText = await publicDirResponse.text()
        expect(publicDirText).toBe('Hi!')
      }),
      {
        retry: 3,
      },
    )

    it(
      'prune client and server',
      wrp({ ssr: true, vite: bundler === 'vite', preserve: false }, async ({ tp, engine }) => {
        await tp.write(
          'src/page.tsx',
          `import { root } from './lib/root.js'
          import { env } from '@point0/core'
          export const page = root.lets('page', 'home', '/').page(() => <div>MY_CLIENT_SERVER1</div>) // will persist everywhere becouse ssr enabled in root
          export const page2 = root.lets('page', 'page2', '/2').ssr(false).page(() => <div>MY_CLIENT_ONLY3</div>) //  becouse ssr was diabled
          export const page3 = root.lets('page', 'page3', '/3').page(() => (env.side.is.server ? <div>MY_SERVER_ONLY4</div> : <div>MY_CLIENT_ONLY5</div>))
          export const page4 = root.lets('page', 'page4', '/4').page(() => { if (env.side.is.server) { return <div>MY_SERVER_ONLY6</div> } else { return <div>MY_CLIENT_ONLY7</div> } })
          export const page5 = root.lets('page', 'page5', '/5').loader(() => { console.info('MY_SERVER_ONLY8'); return {y:2} }).page(() => <div>MY_CLIENT_SERVER9</div>) // it is ok
          export const page6 = root.lets('page', 'page6', '/5')
            .page(() => {
              const a = process.env.MY_ENV_FILE_VARIABLE === 'VAR1' ? 'MY_MAYBE_1' : 'MY_MAYBE_2'
              const b = env.vars.MY_ENV_FILE_VARIABLE === 'VAR1' ? 'MY_MAYBE_3' : 'MY_MAYBE_4'
              const c = process.env.MY_ENV_FILE_CONSTANT === 'CONST1' ? 'MY_ALWAYS_5' : 'MY_NEVER_6'
              const d = env.vars.MY_ENV_FILE_CONSTANT === 'CONST1' ? 'MY_ALWAYS_7' : 'MY_NEVER_8'
              return <div>{a}, {b}, {c}, {d}</div>
            })
        `,
        )
        const generateResult = await tp.generate()
        expect(generateResult.points.length).toBe(7)
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

        expect(clientFilesContent.includes('MY_MAYBE_1')).toBe(true)
        expect(clientFilesContent.includes('MY_MAYBE_2')).toBe(true)
        expect(clientFilesContent.includes('MY_MAYBE_3')).toBe(true)
        expect(clientFilesContent.includes('MY_MAYBE_4')).toBe(true)
        expect(clientFilesContent.includes('MY_ALWAYS_5')).toBe(true)
        expect(clientFilesContent.includes('MY_NEVER_6')).toBe(false)
        expect(clientFilesContent.includes('MY_ALWAYS_7')).toBe(true)
        expect(clientFilesContent.includes('MY_NEVER_8')).toBe(false)

        expect(serverFilesContent.includes('MY_MAYBE_1')).toBe(true)
        expect(serverFilesContent.includes('MY_MAYBE_2')).toBe(true)
        expect(serverFilesContent.includes('MY_MAYBE_3')).toBe(true)
        expect(serverFilesContent.includes('MY_MAYBE_4')).toBe(true)
        expect(serverFilesContent.includes('MY_ALWAYS_5')).toBe(true)
        expect(serverFilesContent.includes('MY_NEVER_6')).toBe(false)
        expect(serverFilesContent.includes('MY_ALWAYS_7')).toBe(true)
        expect(serverFilesContent.includes('MY_NEVER_8')).toBe(false)

        // check for cors plugin, if it cutted correctly
        expect(serverFilesContent.includes('Access-Control-Allow-Origin')).toBe(true)
        expect(clientFilesContent.includes('Access-Control-Allow-Origin')).toBe(false)

        // check for superstore pruning
        expect(serverFilesContent.includes('async_hooks')).toBe(true)
        expect(clientFilesContent.includes('async_hooks')).toBe(false)

        tp.spawn(['bun', 'run', 'start'])
        expect(engine.server.port).toBeNumber()
        expect(engine.clients[0].port).toBeNumber()
        await tp.waitStarted()
        const response = await tp.fetchServer('/4')
        const html = await response.text()
        expect(html).toContain('__POINT0_ENV_VARS__')
        expect(html).toContain('__POINT0_ENV_CONSTS__')
        expect(html).toContain('<div>MY_SERVER_ONLY6</div>')
        const page = await tp.gotoServer('/3')
        await page.stable
        expect(page.tale).toMatchInlineSnapshot(`
          "
          /3
            div: MY_SERVER_ONLY4
            
            div: MY_CLIENT_ONLY5
            "
        `)
      }),
      {
        retry: 3,
      },
    )

    //     it.only(
    //       'keeps error stack',
    //       wrp({ ssr: true, vite: bundler === 'vite', preserve: true }, async ({ tp }) => {
    //         await tp.waitPortsFree()
    //         if (bundler !== 'vite') {
    //           return
    //         }
    //         await tp.write(
    //           'src/page.tsx',
    //           `import { root } from './lib/root.js'
    // import { useState, useEffect } from 'react'

    // const ErrorComponent = ({ error }) => <div id="error">{error.stack}</div>

    // export const page1 = root.lets('page', 'page1', '/1')
    //   .error(ErrorComponent)
    //   .loader(() => {
    //     return {x:1}
    //   })
    //   .page(({data}) => {
    //     const error = new Error('render error on line 12')
    //     return (
    //       <div id="error">
    //         {error.stack}
    //       </div>
    //     )
    //   })

    // export const page2 = root.lets('page', 'page2', '/2')
    //   .error(ErrorComponent)
    //   .loader(() => {
    //     throw new Error('loader error on line 23')
    //     return {x:1}
    //   })
    //   .page(({data}) => {
    //     return (
    //       <div>
    //         {data.x}
    //       </div>
    //     )
    //   })

    //             `,
    //         )
    //         await tp.generate()
    //         const bp = tp.spawn(['bun', 'run', 'build'])
    //         await bp.exited
    //         tp.spawn(['bun', 'run', 'start'], {
    //           env: {
    //             ...process.env,
    //             ERROR0_PUBLIC_STACKTRACE: 'true',
    //           },
    //         })
    //         await tp.waitStarted()

    //         const extractPosition = (tale: string) => {
    //           const match = tale.match(/page\.tsx:(\d+):(\d+)/)
    //           if (!match) {
    //             return undefined
    //           }
    //           return {
    //             line: Number(match[1]),
    //             column: Number(match[2]),
    //           }
    //         }

    //         const page = await tp.gotoServer('/1')
    //         await page.waitContent('#error')
    //         console.log(page.tale)
    //         expect(page.tale).toContain('page.tsx')
    //         // it is not yet work normally. All errors in react components in points are broken, becouse for hmr we move to bottom of file
    //         // TODO: in compiler break chain add function MyComponent() in that place, then continue chain.
    //         // const pos1 = extractPosition(page.tale)
    //         // assert(pos1)
    //         // expect(pos1.line).toBe(12)
    //         // if (pos1.column !== 19 && pos1.column !== 23) {
    //         //   throw new Error('Column for page1 is not 19 or 23, it is ' + pos1.column)
    //         // }

    //         const page2 = await tp.gotoServer('/2')
    //         await page2.waitContent('#error')
    //         expect(page2.tale).toContain('page.tsx')
    //         const pos2 = extractPosition(page2.tale)
    //         assert(pos2)
    //         expect(pos2.line).toBe(23)
    //         if (pos2.column !== 11 && pos2.column !== 15) {
    //           throw new Error('Column for page2 is not 11 or 15, it is ' + pos2.column)
    //         }
    //       }),
    //       {
    //         retry: 3,
    //       },
    //     )
    //   })

    it.only(
      'hvae correct sourcemap',
      wrp({ ssr: true, vite: bundler === 'vite', preserve: true }, async ({ tp }) => {
        await tp.waitPortsFree()
        if (bundler !== 'vite') {
          return
        }
        await tp.write(
          'src/page.tsx',
          `import { root } from './lib/root.js'
import { useState, useEffect } from 'react'

const ErrorComponent = ({ error }) => <div id="error">{error.stack}</div>

export const page1 = root.lets('page', 'page1', '/1')
.error(ErrorComponent)
.loader(() => {
return {x:1}
})
.page(({data}) => {
const error = new Error('render error on line 12')
return (
  <div id="error">
    {error.stack}
  </div>
)
})

export const page2 = root.lets('page', 'page2', '/2')
.error(ErrorComponent)
.loader(() => {
throw new Error('loader error on line 23')
return {x:1}
})
.page(({data}) => {
return (
  <div>
    {data.x}
  </div>
)
})
          
        `,
        )
        await tp.generate()
        const bp = tp.spawn(['bun', 'run', 'build'])
        await bp.exited
        tp.spawn(['bun', 'run', 'start'], {
          env: {
            ...process.env,
            ERROR0_PUBLIC_STACKTRACE: 'true',
          },
        })
        await tp.waitStarted()

        const extractPosition = (tale: string) => {
          const match = tale.match(/page\.tsx:(\d+):(\d+)/)
          if (!match) {
            return undefined
          }
          return {
            line: Number(match[1]),
            column: Number(match[2]),
          }
        }

        const page = await tp.gotoServer('/1')
        await page.waitContent('#error')
        console.log(page.tale)
        expect(page.tale).toContain('page.tsx')
        // it is not yet work normally. All errors in react components in points are broken, becouse for hmr we move to bottom of file
        // TODO: in compiler break chain add function MyComponent() in that place, then continue chain.
        // const pos1 = extractPosition(page.tale)
        // assert(pos1)
        // expect(pos1.line).toBe(12)
        // if (pos1.column !== 19 && pos1.column !== 23) {
        //   throw new Error('Column for page1 is not 19 or 23, it is ' + pos1.column)
        // }

        const page2 = await tp.gotoServer('/2')
        await page2.waitContent('#error')
        expect(page2.tale).toContain('page.tsx')
        const pos2 = extractPosition(page2.tale)
        assert(pos2)
        expect(pos2.line).toBe(23)
        if (pos2.column !== 11 && pos2.column !== 15) {
          throw new Error('Column for page2 is not 11 or 15, it is ' + pos2.column)
        }
      }),
      {
        retry: 3,
      },
    )
  })

  it(
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
      "
      /
        div: My Cool Page
        "
    `)
    }),
    {
      retry: 3,
    },
  )
})
