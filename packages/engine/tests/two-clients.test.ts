import { afterAll, beforeAll, describe, expect, it, setDefaultTimeout } from 'bun:test'
import { PlaywrightBrowser } from './utils/playwright.js'
import { TestProjectTwoClientFactory } from './utils/project.two-clients.js'
import type { TestProjectFactoryCreateProjectOptions, TestProjectTwoClient } from './utils/project.two-clients.js'

setDefaultTimeout(20000)

const tpf = TestProjectTwoClientFactory.create({
  namespace: 'dev',
  portsRange: [3500, 3599],
})

type ItFn = (done: (err?: unknown) => void) => void | Promise<void>

let preventFinalFilesCleanup = false
function wrp(
  options: TestProjectFactoryCreateProjectOptions & { preserve?: boolean },
  callback: ({ tp }: { tp: TestProjectTwoClient }) => void | Promise<void>,
): ItFn {
  const { preserve = false, ...tpOptions } = options
  if (preserve) {
    preventFinalFilesCleanup = true
  }
  const tp = tpf.create({ ...tpOptions, fixedId: preserve })
  return async () => {
    try {
      await tp.cleanup('ports')
      await tp.init()
      await callback({ tp })
      await tp.cleanup({ files: !preserve, ports: true, processes: true })
    } catch (error) {
      await tp.cleanup({ files: !preserve, ports: true, processes: true })
      throw error
    }
  }
}

// const bundlers = ['bun', 'vite']
const bundlers = ['bun']

describe('two-clients', () => {
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
      'serve two spa client on different baseurls',
      wrp(
        {
          ssr1: false,
          ssr2: false,
          vite: bundler === 'vite',
          vite1: bundler === 'vite',
          vite2: bundler === 'vite',
          preserve: true,
        },
        async ({ tp }) => {
          await tp.write(
            'src/client1.tsx',
            `import { root } from './lib/root.js'
          import { env } from '@point0/core'
          export const root1 = root.lets('root', 'root1').baseurl('http://localhost:${engine.clients[0].port}').root()
          export const page = root1.lets('page1', 'home', '/').page(() => <div>First Client</div>)
          `,
          )
          await tp.write(
            'src/client2.tsx',
            `import { root } from './lib/root.js'
          import { env } from '@point0/core'
          export const root2 = root.lets('root', 'root2').baseurl('http://localhost:${engine.clients[1].port}').root()
          export const page = root2.lets('page2', 'home', '/').page(() => <div>Second Client</div>)
          `,
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
        },
      ),
      {
        retry: 3,
      },
    )
  })
})
