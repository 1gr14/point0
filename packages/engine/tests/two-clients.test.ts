import { afterAll, beforeAll, describe, expect, it, setDefaultTimeout } from 'bun:test'
import type { Engine } from '../src/engine.js'
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

// const modes = ['dev', 'build']

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
    'serve two ssr clients on different baseurls as full root urls in dev',
    wrp(
      {
        ssr1: true,
        ssr2: true,
        baseurl1: true,
        baseurl2: true,
        // preserve: true,
      },
      async ({ tp }) => {
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

        // server return nothing becouse request not matches no one base url
        const response = await tp.fetchServer('/')
        const json = await response.json()
        expect(response.status).toBe(404)
        expect(json).toMatchObject({
          message: 'Not Found',
        })

        // first client return itsefl becouse of base url
        const page1 = await tp.gotoClient1('/')
        expect(page1.tale).toMatchInlineSnapshot(`
        "
        /
          div: First Client
          "
        `)
        const response1 = await tp.fetchClient1('/')
        const html1 = await response1.text()
        expect(html1).toContain('__POINT0_ENV_VARS__')
        expect(html1).toContain('__POINT0_ENV_CONSTS__')
        expect(html1).toContain('Client')
        expect(html1).toContain('VARX')
        expect(html1).toContain('CONSTX')
        expect(html1).toContain('FIRST_VAR')
        expect(html1).toContain('FIRST_CONST')
        expect(html1).not.toContain('SECOND_VAR')
        expect(html1).not.toContain('SECOND_CONST')

        // second client return itself becouse of base url
        const page2 = await tp.gotoClient2('/')
        expect(page2.tale).toMatchInlineSnapshot(`
        "
        /
          div: Second Client
          "
        `)
        const response2 = await tp.fetchClient2('/')
        const html2 = await response2.text()
        expect(html2).toContain('__POINT0_ENV_VARS__')
        expect(html2).toContain('__POINT0_ENV_CONSTS__')
        expect(html2).toContain('Client')
        expect(html2).toContain('VARX')
        expect(html2).toContain('CONSTX')
        expect(html2).not.toContain('FIRST_VAR')
        expect(html2).not.toContain('FIRST_CONST')
        expect(html2).toContain('SECOND_VAR')
        expect(html2).toContain('SECOND_CONST')

        expect(await tp.fetchServer('/hello.txt').then((r) => r.text())).toContain('Not Found')

        expect(await tp.fetchClient1('/hello.txt').then((r) => r.text())).toBe('Hello, from first client!')

        expect(await tp.fetchClient2('/hello.txt').then((r) => r.text())).toBe('Hello, from second client!')

        expect(await tp.fetchClient1('/first.txt').then((r) => r.text())).toBe('first')

        expect(await tp.fetchClient2('/second.txt').then((r) => r.text())).toBe('second')

        expect(await tp.fetchClient2('/first.txt').then((r) => r.text())).toContain('Not Found')

        expect(await tp.fetchClient1('/second.txt').then((r) => r.text())).toContain('Not Found')
      },
    ),
    {
      retry: 3,
    },
  )

  it(
    'serve two ssr clients on different baseurls as full root urls in prod (client1)',
    wrp(
      {
        ssr1: true,
        ssr2: true,
        baseurl1: true,
        baseurl2: true,
        // preserve: true,
      },
      async ({ tp }) => {
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

        await tp.replace(tp.files.engine, `port: ${tp.serverPort}`, `port: ${tp.client1Port}`)
        await tp.generate()
        const bp = tp.spawn(['bun', 'run', 'build'])
        await bp.exited
        tp.spawn(['bun', 'run', 'start'])
        await tp.waitStarted(tp.client1Port)

        // is is fetch server, just another port
        const page1 = await tp.gotoClient1('/')
        expect(page1.tale).toMatchInlineSnapshot(`
        "
        /
          div: First Client
          "
        `)
        expect(await tp.fetchClient1('/hello.txt').then((r) => r.text())).toBe('Hello, from first client!')
        expect(await tp.fetchClient1('/first.txt').then((r) => r.text())).toBe('first')
        expect(await tp.fetchClient1('/second.txt').then((r) => r.text())).toContain('Page Not Found')
      },
    ),
    {
      retry: 3,
    },
  )

  it(
    'serve two ssr clients on different baseurls as full root urls in prod (client2)',
    wrp(
      {
        ssr1: true,
        ssr2: true,
        baseurl1: true,
        baseurl2: true,
        // preserve: true,
      },
      async ({ tp }) => {
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

        await tp.replace(tp.files.engine, `port: ${tp.serverPort}`, `port: ${tp.client2Port}`)
        await tp.generate()
        const bp = tp.spawn(['bun', 'run', 'build'])
        await bp.exited
        tp.spawn(['bun', 'run', 'start'])
        await tp.waitStarted(tp.client2Port)

        // is is fetch server, just another port
        const page1 = await tp.gotoClient2('/')
        expect(page1.tale).toMatchInlineSnapshot(`
        "
        /
          div: Second Client
          "
        `)
        expect(await tp.fetchClient2('/hello.txt').then((r) => r.text())).toBe('Hello, from second client!')
        expect(await tp.fetchClient2('/first.txt').then((r) => r.text())).toContain('Page Not Found')
        expect(await tp.fetchClient2('/second.txt').then((r) => r.text())).toBe('second')
      },
    ),
    {
      retry: 3,
    },
  )

  it(
    'serve two ssr clients on same host but different paths',
    wrp(
      {
        ssr1: true,
        ssr2: true,
        baseurl1: '/',
        baseurl2: '/second',
        // preserve: true,
      },
      async ({ tp }) => {
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

        // server return nothing becouse request not matches no one base url
        const page01 = await tp.gotoServer('/')
        expect(page01.tale).toMatchInlineSnapshot(`
        "
        /
          div: First Client
          "
        `)
        const page02 = await tp.gotoServer('/second')
        expect(page02.tale).toMatchInlineSnapshot(`
        "
        /second
          div: Second Client
          "
        `)

        // first client return itsefl becouse of base url
        const page1 = await tp.gotoClient1('/')
        expect(page1.tale).toMatchInlineSnapshot(`
        "
        /
          div: First Client
          "
        `)
        const response1 = await tp.fetchClient1('/')
        const html1 = await response1.text()
        expect(html1).toContain('__POINT0_ENV_VARS__')
        expect(html1).toContain('__POINT0_ENV_CONSTS__')
        expect(html1).toContain('Client')
        expect(html1).toContain('VARX')
        expect(html1).toContain('CONSTX')
        expect(html1).toContain('FIRST_VAR')
        expect(html1).toContain('FIRST_CONST')
        expect(html1).not.toContain('SECOND_VAR')
        expect(html1).not.toContain('SECOND_CONST')

        // second client return itself becouse of base url
        const page2 = await tp.gotoClient2('/second')
        expect(page2.tale).toMatchInlineSnapshot(`
        "
        /second
          div: Second Client
          "
        `)
        const response2 = await tp.fetchClient2('/second')
        const html2 = await response2.text()
        expect(html2).toContain('__POINT0_ENV_VARS__')
        expect(html2).toContain('__POINT0_ENV_CONSTS__')
        expect(html2).toContain('Client')
        expect(html2).toContain('VARX')
        expect(html2).toContain('CONSTX')
        expect(html2).not.toContain('FIRST_VAR')
        expect(html2).not.toContain('FIRST_CONST')
        expect(html2).toContain('SECOND_VAR')
        expect(html2).toContain('SECOND_CONST')

        // here we have badly merged public dirs, and it is correct, we shuld think how to merge public dirs with same host
        expect(await tp.fetchServer('/hello.txt').then((r) => r.text())).toContain('Hello, from first client!')

        expect(await tp.fetchClient1('/hello.txt').then((r) => r.text())).toBe('Hello, from first client!')

        // here we have badly merged public dirs, and it is correct, we shuld think how to merge public dirs with same host
        expect(await tp.fetchClient2('/hello.txt').then((r) => r.text())).toBe('Hello, from first client!')

        expect(await tp.fetchClient1('/first.txt').then((r) => r.text())).toBe('first')

        expect(await tp.fetchClient2('/second.txt').then((r) => r.text())).toBe('second')

        expect(await tp.fetchClient2('/first.txt').then((r) => r.text())).toContain('first')

        expect(await tp.fetchClient1('/second.txt').then((r) => r.text())).toContain('second')
      },
    ),
    {
      // retry: 3,
    },
  )
})
