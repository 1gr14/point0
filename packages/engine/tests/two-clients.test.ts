import type { Engine } from '../src/engine.js'
import { afterAll, beforeAll, describe, expect, it, setDefaultTimeout } from 'bun:test'
import { PlaywrightBrowser } from './utils/playwright.js'
import { TestProjectTwoClientFactory } from './utils/project.two-clients.js'
import type { TestProjectFactoryCreateProjectOptions, TestProjectTwoClient } from './utils/project.two-clients.js'

setDefaultTimeout(20000)

const tpf = TestProjectTwoClientFactory.create({
  namespace: 'two-clients',
  portsRange: [3500, 3599],
})

type ItFn = (done: (err?: unknown) => void) => void | Promise<void>

let preventFinalFilesCleanup = false
function wrp(
  options: TestProjectFactoryCreateProjectOptions & { preserve?: boolean },
  callback: ({ tp, engine }: { tp: TestProjectTwoClient; engine: Engine }) => void | Promise<void>,
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
      const engine = await tp.importEngine()
      await callback({ tp, engine })
      await tp.cleanup({ files: !preserve, ports: true, processes: true })
    } catch (error) {
      await tp.cleanup({ files: !preserve, ports: true, processes: true })
      throw error
    }
  }
}

describe('two-clients', () => {
  beforeAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
    tpf.setBrowser(await PlaywrightBrowser.init())
  })

  afterAll(async () => {
    void tpf.cleanup({ files: !preventFinalFilesCleanup, processes: true, ports: true, browser: true })
    // throwOnBundlersLengthNot2(bundlers)
  })

  it(
    'serve two spa client on different baseurls as full root urls',
    wrp(
      {
        ssr1: false,
        ssr2: false,
        baseurl1: true,
        baseurl2: true,
        preserve: true,
      },
      async ({ tp, engine }) => {
        await tp.write(
          'src/client1.tsx',
          `import { root1 } from './lib/root1.js'
          export const page = root1.lets('page', 'home', '/').page(() => <div>First Client</div>)
          `,
        )
        await tp.write(
          'src/client2.tsx',
          `import { root2 } from './lib/root2.js'
          export const page = root2.lets('page', 'home', '/').page(() => <div>Second Client</div>)
          `,
        )
        tp.spawn(['bun', 'run', 'dev'])
        await tp.waitStarted()

        // server return first client by default
        const response = await tp.fetchServer('/')
        const html = await response.text()
        expect(html).toContain('__POINT0_ENV_VARS__')
        expect(html).toContain('__POINT0_ENV_CONSTS__')
        expect(html).toContain('Client')
        expect(html).toContain('VARX')
        expect(html).toContain('CONSTX')
        expect(html).toContain('FIRST_VAR')
        expect(html).toContain('FIRST_CONST')
        expect(html).not.toContain('SECOND_VAR')
        expect(html).not.toContain('SECOND_CONST')

        // first client return itsefl becouse of base url
        const page = await tp.gotoClient1('/')
        expect(page.tale).toMatchInlineSnapshot(`
        "
        /
          div: First Client
          "
        `)

        // second client return itself becouse of base url
        const page2 = await tp.gotoClient2('/')
        expect(page2.tale).toMatchInlineSnapshot(`
        "
        /
          div: Second Client
          "
        `)

        // const publicDirResponse = await tp.fetchServer('/hello.txt')
        // const publicDirText = await publicDirResponse.text()
        // expect(publicDirText).toBe('Hi!')
        // const publicDirResponse1 = await tp.fetchClient1('/hello.txt')
        // const publicDirText1 = await publicDirResponse1.text()
        // expect(publicDirText1).toBe('Hi!')
      },
    ),
    {
      // retry: 3,
    },
  )
})
