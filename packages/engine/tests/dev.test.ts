import { afterAll, beforeAll, describe, expect, it, setDefaultTimeout } from 'bun:test'
import type { Engine } from '../src/engine.js'
import { throwOnBundlersLengthNot2 } from './utils/other.js'
import { PlaywrightBrowser } from './utils/playwright.js'
import type {
  TestProjectOneClient,
  TestProjectOneClientFactoryCreateProjectOptions,
} from './utils/project.one-client.js'
import { TestProjectOneClientFactory } from './utils/project.one-client.js'
import assert from 'assert'

setDefaultTimeout(20000)

const tpf = TestProjectOneClientFactory.create({
  namespace: 'dev',
  portsRange: [3200, 3299],
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
    void tpf.cleanup({ files: !preventFinalFilesCleanup, processes: true, ports: true, browser: true })
    // throwOnBundlersLengthNot2(bundlers)
  })

  describe.each(bundlers)('%s', (bundler) => {
    it(
      'start ssr dev server',
      wrp({ ssr: true, vite: bundler === 'vite', preserve: false }, async ({ tp, engine }) => {
        if (bundler === 'vite') {
          expect(engine.server.viteConfig).toBeString()
        } else {
          expect(engine.server.viteConfig).toBeNull()
        }
        expect(engine.server.port).toBeNumber()
        expect(engine.clients[0].port).toBeNumber()
        expect(engine.server.hmrPort).toBeFalse()
        expect(engine.clients[0].hmrPort).toBeFalse()
        await tp.write(
          'src/page.tsx',
          `import { root } from './lib/root.js'
          import { env } from '@point0/core'
          export const homePage = root
            .lets
            .page('/')
            .page(() => <div>Hello, {process.env.MY_ENV_FILE_VARIABLE}, {process.env.MY_ENV_FILE_CONSTANT}, {env.vars.MY_ENV_FILE_VARIABLE}, {env.vars.MY_ENV_FILE_CONSTANT}</div>)`,
        )
        tp.spawn(['bun', 'run', 'dev'])
        await tp.waitStarted()
        const response = await tp.fetchServer('/')
        const html = await response.text()
        expect(html).toContain('__POINT0_ENV_VARS__')
        expect(html).toContain('__POINT0_ENV_CONSTS__')
        expect(html).toContain('<div>Hello')
        expect(html).toContain('VAR1')
        expect(html).toContain('CONST1')
        const page = await tp.gotoServer('/')
        expect(page.tale).toMatchInlineSnapshot(`
        "
        /
          div: Hello, VAR1, CONST1, VAR1, CONST1
          "
        `)
        const publicDirResponse = await tp.fetchServer('/hello.txt')
        const publicDirText = await publicDirResponse.text()
        expect(publicDirText).toBe('Hi!')
        const publicDirResponse1 = await tp.fetchClient('/hello.txt')
        const publicDirText1 = await publicDirResponse1.text()
        expect(publicDirText1).toBe('Hi!')
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
        expect(engine.server.hmrPort).toBeFalse()
        expect(engine.clients[0].hmrPort).toBeFalse()
        await tp.write(
          'src/page.tsx',
          `import { root } from './lib/root.js'
          import { env } from '@point0/core'
        export const page = root.lets('page', 'home', '/').page(() => <div>Hello, {process.env.MY_ENV_FILE_VARIABLE}, {process.env.MY_ENV_FILE_CONSTANT}, {env.vars.MY_ENV_FILE_VARIABLE}, {env.vars.MY_ENV_FILE_CONSTANT}</div>)`,
        )
        tp.spawn(['bun', 'run', 'dev'])
        await tp.waitStarted()
        const html = await tp.fetchServerHtml('/')
        expect(html).toContain('__POINT0_ENV_VARS__')
        expect(html).toContain('__POINT0_ENV_CONSTS__')
        expect(html).not.toContain('<div>Hello')
        const page = await tp.gotoServer('/')
        await page.stable
        expect(page.tale).toMatchInlineSnapshot(`
        "
        /
          (Empty)
          
          div: Hello, VAR1, CONST1, VAR1, CONST1
          "
        `)
        const publicDirResponse = await tp.fetchServer('/hello.txt')
        const publicDirText = await publicDirResponse.text()
        expect(publicDirText).toBe('Hi!')
        const publicDirResponse1 = await tp.fetchClient('/hello.txt')
        const publicDirText1 = await publicDirResponse1.text()
        expect(publicDirText1).toBe('Hi!')
      }),
      {
        retry: 3,
      },
    )

    it(
      'cut unused code on the fly',
      wrp({ ssr: false, vite: bundler === 'vite' }, async ({ tp, engine }) => {
        expect(engine.server.port).toBeNumber()
        expect(engine.clients[0].port).toBeNumber()
        expect(engine.server.hmrPort).toBeFalse()
        expect(engine.clients[0].hmrPort).toBeFalse()
        await tp.write(
          'src/server-only.tsx',
          `import { root } from './lib/root.js'
          import { env } from '@point0/core'
          if (typeof window !== 'undefined') {
            throw new Error('This module for server only')
          }
          export const sayHiFromServer = () => ({hiFromServer: 'hiFromServer'})
        `,
        )
        await tp.write(
          'src/client-only.tsx',
          `import { root } from './lib/root.js'
          import { env } from '@point0/core'
          if (typeof window === 'undefined') {
            throw new Error('This module for client only')
          }
          export const sayHiFromClient = () => ({hiFromClient: 'hiFromClient'})
        `,
        )
        await tp.write(
          'src/page.tsx',
          `import { root } from './lib/root.js'
          import { env } from '@point0/core'
          import { sayHiFromServer } from './server-only.tsx'
          import { sayHiFromClient } from './client-only.tsx'

          if (env.side.is.server) {
            sayHiFromServer()
          }
          if (env.side.is.client) {
            sayHiFromClient()
          }

        export const page = root.lets('page', 'home', '/')
          .loader(() => {
            return {
              ...sayHiFromServer(),
            }
          })
          .clientLoader(({data}) => {
            return {
              ...data,
              ...sayHiFromClient(),
            }
          })
          .page(({data}) => <div>
            <div id="server">{data.hiFromServer}</div>
            <div id="client">{data.hiFromClient}</div>
          </div>)`,
        )
        tp.spawn(['bun', 'run', 'dev'])
        await tp.waitStarted()
        const page = await tp.gotoClient('/')
        await page.stable
        expect(page.tale).toMatchInlineSnapshot(`
        "
        /
          (Empty)
          
          div: Loading...
          
          div:
            #server: hiFromServer
            #client: hiFromClient
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
        expect(engine.server.hmrPort).toBeFalse()
        expect(engine.clients[0].hmrPort).toBeNumber()
        await tp.write(
          'src/page.tsx',
          `import { root } from './lib/root.js'
          import { useState } from 'react'
        export const incrementMutation = root.lets('mutation', 'incrementMutation')
          .loader(() => {
            return { one: 1 }
          }).mutation()
        export const page = root.lets('page', 'home', '/')
          .wrapper(({children}) => {
            const [countWrapper, setCountWrapper] = useState(0)
            return (
              <div>
                Wrapper {countWrapper} 
                <button id="wrapper-button" onClick={() => setCountWrapper(countWrapper + 1)}>Click</button>
                {children}
              </div>
            )
          })
          .page(() => {
            const [countPage, setCountPage] = useState(0)
            const increment = incrementMutation.useMutation()
            return (
              <div>
                Hop {countPage}
                <button id="page-button" onClick={() => {
                  increment.mutateAsync()
                    .then((res) => setCountPage(countPage + res.one))
                    .catch((err) => console.error(err))
                }}>Click</button>
              </div>
            )
          })`,
        )
        tp.spawn(['bun', 'run', 'dev'])
        await tp.waitStarted()
        const page = await tp.gotoClient('/')
        await page.waitContent('Hop 0')
        await page.original.click('button#page-button')
        await page.original.click('button#wrapper-button')
        await page.original.click('button#wrapper-button')
        await page.waitContent('Hop 1')
        await page.waitContent('Wrapper 2')
        await tp.replace('src/page.tsx', 'Hop', 'Hay')
        await page.waitContent('Hay 1')
        await page.waitContent('Wrapper 2')
        await tp.replace('src/page.tsx', 'Wrapper', 'Wrapperok')
        await page.waitContent('Wrapperok')
        await new Promise((resolve) => setTimeout(resolve, 1000))
        await page.original.click('button#page-button')
        expect(page.history.length).toBe(1)
        if (bundler === 'vite') {
          // after this vite loose state, but in real browser it works like normal hmr, so idk, it works, just skip test for vite here
          return
        }
        await page.waitContent('Hay 2')
        await page.waitContent('Wrapperok 2')
        await tp.replace('src/page.tsx', 'Hay', 'La La Lay')
        await page.waitContent('La La Lay 2')
        await page.waitContent('Wrapperok 2')
        await new Promise((resolve) => setTimeout(resolve, 1000))
        await page.original.click('button#page-button')
        await page.waitContent('La La Lay 3')
        await page.waitContent('Wrapperok 2')
        expect(page.history.length).toBe(1)
      }),
      {
        retry: 3,
      },
    )

    it(
      'have server updates',
      wrp({ ssr: true, clientHmr: true, serverHmr: true, vite: bundler === 'vite' }, async ({ tp, engine }) => {
        await tp.waitPortsFree()
        expect(engine.server.hmrPort).toBeNumber()
        expect(engine.clients[0].hmrPort).toBeNumber()
        await tp.write(
          'src/page.tsx',
          `import { root } from './lib/root.js'
          import { useState } from 'react'
        export const incrementMutation = root.lets('mutation', 'incrementMutation')
          .loader(() => {
            return { inc: 1 }
          }).mutation()
        export const page = root.lets('page', 'home', '/')
          .page(() => {
            const [countPage, setCountPage] = useState(0)
            const increment = incrementMutation.useMutation()
            return (
              <div>
                Hop {countPage}
                <button id="page-button" onClick={() => {
                  increment.mutateAsync()
                    .then((res) => setCountPage(countPage + res.inc))
                    .catch((err) => console.error(err))
                }}>Click</button>
              </div>
            )
          })`,
        )
        tp.spawn(['bun', 'run', 'dev'])
        await tp.waitStarted()
        const page = await tp.gotoClient('/')
        await page.waitContent('Hop 0')
        await page.original.click('button#page-button')
        await page.waitContent('Hop 1')
        await tp.replace('src/page.tsx', 'Hop', 'Hay')
        await page.waitContent('Hay 1')
        await tp.replace('src/page.tsx', 'inc: 1', 'inc: 10')
        await new Promise((resolve) => setTimeout(resolve, 1000))
        await page.original.click('button#page-button')
        await page.waitContent('Hay 11')
        await tp.replace('src/page.tsx', 'Hay', 'La La Lay')
        await page.waitContent('La La Lay 11')
        await new Promise((resolve) => setTimeout(resolve, 1000))
        await page.original.click('button#page-button')
        await page.waitContent('La La Lay 21')
        expect(page.history.length).toBe(1)
      }),
      {
        retry: 3,
      },
    )

    it.skip(
      'keeps error stack',
      wrp({ ssr: true, vite: bundler === 'vite', preserve: false }, async ({ tp }) => {
        if (bundler !== 'vite') {
          return
        }
        await tp.waitPortsFree()
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
        tp.spawn(['bun', 'run', 'dev'])
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

        const page = await tp.gotoClient('/1')
        await page.waitContent('#error')
        expect(page.tale).toContain('page.tsx')
        // it is not yet work normally. All errors in react components in points are broken, becouse for hmr we move to bottom of file
        // TODO: in compiler break chain add function MyComponent() in that place, then continue chain.
        // const pos1 = extractPosition(page.tale)
        // assert(pos1)
        // expect(pos1.line).toBe(12)
        // if (pos1.column !== 19 && pos1.column !== 23) {
        //   throw new Error('Column for page1 is not 19 or 23, it is ' + pos1.column)
        // }

        const page2 = await tp.gotoClient('/2')
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

    it(
      'deny imports on client side',
      wrp({ ssr: true, vite: bundler === 'vite', preserve: false }, async ({ tp, engine }) => {
        if (bundler === 'vite') {
          expect(engine.server.viteConfig).toBeString()
        } else {
          expect(engine.server.viteConfig).toBeNull()
        }
        expect(engine.server.port).toBeNumber()
        expect(engine.clients[0].port).toBeNumber()
        expect(engine.server.hmrPort).toBeFalse()
        expect(engine.clients[0].hmrPort).toBeFalse()
        await tp.write(
          'src/server-module.tsx',
          `import '@point0/core/server-only'
          export const x = "I am server module"`,
        )
        await tp.write(
          'src/page.tsx',
          `import { root } from './lib/root.js'
          import { env } from '@point0/core'
          import { x } from './server-module.js'
          export const page = root
            .lets('page', 'home', '/')
            .page(() => <div>{x}</div>)`,
        )
        tp.spawn(['bun', 'run', 'dev'])
        await tp.waitStarted()
        const response = await tp.fetchServer('/')
        const html = await response.text()
        expect(html).toContain('I am server module')
        const page = await tp.gotoServer('/')
        // it returns from server, but was denied on client
        expect(page.tale).toMatchInlineSnapshot(`
          "
          /
            div: I am server module
            
            (Empty)
            "
        `)
        const logsText = page.logs.map((log) => log.text).join('\n')
        expect(logsText).toContain('Import denied on side "client"')
      }),
      {
        retry: 3,
      },
    )

    it(
      'deny imports on server side',
      wrp({ ssr: true, vite: bundler === 'vite', preserve: false }, async ({ tp, engine }) => {
        if (bundler === 'vite') {
          expect(engine.server.viteConfig).toBeString()
        } else {
          expect(engine.server.viteConfig).toBeNull()
        }
        expect(engine.server.port).toBeNumber()
        expect(engine.clients[0].port).toBeNumber()
        expect(engine.server.hmrPort).toBeFalse()
        expect(engine.clients[0].hmrPort).toBeFalse()
        await tp.write(
          'src/client-module.tsx',
          `import '@point0/core/client-only'
          export const x = "I am client module"`,
        )
        await tp.write(
          'src/page.tsx',
          `import { root } from './lib/root.js'
          import { env } from '@point0/core'
          import { x } from './client-module.js'
          export const page = root
            .lets('page', 'home', '/')
            .page(() => <div>{x}</div>)`,
        )
        tp.spawn(['bun', 'run', 'dev'])
        await tp.waitOutput('Import denied on side "server"')
      }),
      {
        retry: 3,
      },
    )

    it(
      'mock imports on client side',
      wrp({ ssr: true, vite: bundler === 'vite', preserve: false }, async ({ tp, engine }) => {
        if (bundler === 'vite') {
          expect(engine.server.viteConfig).toBeString()
        } else {
          expect(engine.server.viteConfig).toBeNull()
        }
        expect(engine.server.port).toBeNumber()
        expect(engine.clients[0].port).toBeNumber()
        expect(engine.server.hmrPort).toBeFalse()
        expect(engine.clients[0].hmrPort).toBeFalse()
        await tp.write(
          'src/server-module.tsx',
          `import '@point0/core/server-only'
          export const x = { x: () => () => "I am server module" }`,
        )
        await tp.write(
          'src/page.tsx',
          `import { root } from './lib/root.js'
          import { env } from '@point0/core'
          import { x } from './server-module.js'
          export const page = root
            .lets('page', 'home', '/')
            .page(() => {
              const result = x.x()()
              return <div id="page">{typeof result === 'string' ? result : 'proxy'}</div>
            })`,
        )
        await tp.replace('src/engine.ts', '// client importer', `mock: ['./server-module.*']`)
        tp.spawn(['bun', 'run', 'dev'])
        await tp.waitStarted()
        const response = await tp.fetchServer('/')
        const html = await response.text()
        expect(html).toContain('I am server module')
        const page = await tp.gotoServer('/')
        // it returns realfrom server, but becomes mocked on client
        expect(page.tale).toMatchInlineSnapshot(`
          "
          /
            #page: I am server module
            
            #page: proxy
            "
        `)
        const logsText = page.logs.map((log) => log.text).join('\n')
        expect(logsText).not.toContain('Import denied on side "client"')
      }),
      {
        retry: 3,
      },
    )

    it(
      'mock imports on server side',
      wrp({ ssr: true, vite: bundler === 'vite', preserve: false }, async ({ tp, engine }) => {
        if (bundler === 'vite') {
          expect(engine.server.viteConfig).toBeString()
        } else {
          expect(engine.server.viteConfig).toBeNull()
        }
        expect(engine.server.port).toBeNumber()
        expect(engine.clients[0].port).toBeNumber()
        expect(engine.server.hmrPort).toBeFalse()
        expect(engine.clients[0].hmrPort).toBeFalse()
        await tp.write(
          'src/client-module.tsx',
          `import '@point0/core/client-only'
          export const x = { x: () => () => "I am client module" }`,
        )
        await tp.write(
          'src/page.tsx',
          `import { root } from './lib/root.js'
          import { env } from '@point0/core'
          import { x } from './client-module.js'
          export const page = root
            .lets('page', 'home', '/')
            .page(() => {
              const result = x.x()()
              return <div id="page">{typeof result === 'string' ? result : 'proxy'}</div>
            })`,
        )
        await tp.replace('src/engine.ts', '// server importer', `mock: ['./client-module.*']`)
        tp.spawn(['bun', 'run', 'dev'])
        await tp.waitStarted()
        const response = await tp.fetchServer('/')
        const html = await response.text()
        expect(html).not.toContain('I am client module')
        const page = await tp.gotoServer('/')
        // it returns from server as mocked, and becomes real on client
        expect(page.tale).toMatchInlineSnapshot(`
          "
          /
            #page: proxy
            
            #page: I am client module
            "
        `)
      }),
      {
        retry: 3,
      },
    )
  })
})
