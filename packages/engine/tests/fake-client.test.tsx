import { CookieStore } from '@point0/cookie-store'
import { env, Point0, createQueryClient } from '@point0/core'
import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import assert from 'node:assert'
// import '@testing-library/jest-dom'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react/pure.js'
import { Engine } from '../src/engine.js'
import { FakeClient } from '../src/fake-client.js'
import { ElementViewer } from './utils/element-viewer.js'
import { FetchRecorder } from './utils/fetch-recorder.js'
// import { PlaywrightBrowser } from './utils/playwright.js'
// import type { TestProject, TestProjectFactoryCreateProjectOptions } from './utils/project.one-client.js'
// import { TestProjectFactory } from './utils/project.one-client.js'
import { getFakeBrowserGlobals, ymlify } from './utils/internal-testing.js'
import { ClientPoints } from '@point0/core'
import { createNavigation } from '@point0/react-dom/router'
import { QueryClientProvider } from '@tanstack/react-query'

// const tpf = TestProjectFactory.create({
//   namespace: 'test-client',
// })

// type ItFn = (done: (err?: unknown) => any) => any

// let preventFinalFilesCleanup = false
// function wrp(
//   options: TestProjectFactoryCreateProjectOptions & { preserve?: boolean },
//   callback: ({ tp, engine }: { tp: TestProject; engine: Engine }) => any,
// ): ItFn
// function wrp(callback: ({ tp, engine }: { tp: TestProject; engine: Engine }) => any): ItFn
// function wrp(
//   ...args:
//     | [callback: ({ tp, engine }: { tp: TestProject; engine: Engine }) => any]
//     | [
//         options: TestProjectFactoryCreateProjectOptions & { preserve?: boolean },
//         callback: ({ tp, engine }: { tp: TestProject; engine: Engine }) => any,
//       ]
// ): ItFn {
//   const [options, callback] = args.length === 1 ? [{}, args[0]] : args
//   const { preserve = false, ...tpOptions } = options
//   if (preserve) {
//     preventFinalFilesCleanup = true
//   }
//   const tp = tpf.create({ ...tpOptions, fixedId: preserve })
//   return async () => {
//     try {
//       await tp.cleanup('ports')
//       await tp.init()
//       const engine = await tp.importEngine()
//       await callback({ tp, engine })
//       await tp.cleanup({ files: !preserve, ports: true, processes: true })
//     } catch (error) {
//       await tp.cleanup({ files: !preserve, ports: true, processes: true })
//       throw error
//     }
//   }
// }

describe('FakeClient', () => {
  // Suppress React's "Detected multiple renderers" warning in tests
  // This warning occurs when @testing-library/react and our mount function
  // both create React roots, even though they use the same React instance

  const originalError = console.error
  beforeAll(() => {
    console.error = (...args: any[]) => {
      const message = args[0]
      if (
        typeof message === 'string' &&
        message.includes('Detected multiple renderers concurrently rendering the same context provider')
      ) {
        // Suppress this specific warning
        return
      }
      originalError.apply(console, args)
    }
  })

  afterAll(() => {
    console.error = originalError
  })

  // afterEach(cleanup)

  it.concurrent('fetch page with loader', async () => {
    const root = Point0.lets('root', 'root').serverurl('http://localhost:3000').root()
    const page = root
      .lets('page', 'page', '/page')
      .loader(() => ({ serverLoaderSideName: env.side.name }))
      .page(({ data }) => <div>Hello from {data.serverLoaderSideName}</div>)
    expect(env.side.name).toBe('server')
    const points = [root, page] as const
    const engine = await Engine.create({
      compiler: false,
      file: import.meta.url,
      server: { scope: 'root', points },
      clients: [{ scope: 'root', points }],
    }).prepare()
    expect(env.side.name).toBe('server')
    const fakeClient = FakeClient.create({ engine, scope: 'root', globals: getFakeBrowserGlobals() })
    await fakeClient.run(async () => {
      expect(env.side.name).toBe('client')
      const data = await page.fetch()
      expect(env.side.name).toBe('client')
      expect(data.serverLoaderSideName).toBe('server')
    })
    expect(env.side.name).toBe('server')
  })

  it.concurrent('uses scoped client env vars in fake client globals', async () => {
    const root = Point0.lets('root', 'root').root()
    const page = root
      .lets('page', 'page', '/page')
      .loader(() => ({
        POINT0_CLIENT_ENV_ONLY: env.vars.POINT0_CLIENT_ENV_ONLY,
        POINT0_SERVER_ENV_ONLY: env.vars.POINT0_SERVER_ENV_ONLY,
        POINT0_SHARED_ENV: env.vars.POINT0_SHARED_ENV,
      }))
      .page(({ data }) => ymlify(data))
    const points = [root, page] as const
    const prevProcessEnvValues: Record<string, any> = {
      POINT0_CLIENT_ENV_ONLY: process.env.POINT0_CLIENT_ENV_ONLY,
      POINT0_SERVER_ENV_ONLY: process.env.POINT0_SERVER_ENV_ONLY,
      POINT0_SHARED_ENV: process.env.POINT0_SHARED_ENV,
    }
    // process.env.POINT0_CLIENT_ENV_ONLY = 'point0_client_env_only'
    process.env.POINT0_SERVER_ENV_ONLY = 'point0_server_env_only'
    process.env.POINT0_SHARED_ENV = 'point0_shared_env'

    try {
      const engine = await Engine.create({
        compiler: false,
        file: import.meta.url,
        server: { scope: 'root', points },
        clients: [
          {
            scope: 'root',
            points,
            env: {
              vars: ['POINT0_SHARED_ENV', { POINT0_CLIENT_ENV_ONLY: 'point0_client_env_only' }],
            },
          },
        ],
      }).prepare()
      const fakeClient = FakeClient.create({ engine, scope: 'root', globals: getFakeBrowserGlobals() })
      await fakeClient.run(async () => {
        expect(env.side.name).toBe('client')
        expect(env.vars.POINT0_CLIENT_ENV_ONLY).toBe('point0_client_env_only')
        expect(env.vars.POINT0_SERVER_ENV_ONLY).toBe(undefined)
        expect(env.vars.POINT0_SHARED_ENV).toBe('point0_shared_env')
        const result = await page.fetchServerDetailed()
        assert(result.data)
        expect(result.data.POINT0_CLIENT_ENV_ONLY).toBe(undefined)
        expect(result.data.POINT0_SERVER_ENV_ONLY).toBe('point0_server_env_only')
        expect(result.data.POINT0_SHARED_ENV).toBe('point0_shared_env')
      })
    } finally {
      for (const [key, value] of Object.entries(prevProcessEnvValues)) {
        process.env[key] = value
      }
    }
  })

  it.concurrent('respect cookies', async () => {
    const root = Point0.lets('root', 'root').root()
    const page = root
      .lets('page', 'page', '/page')
      .loader(() => ({ serverLoaderSideName: env.side.name }))
      .page(({ data }) => <div>Hello from {data.serverLoaderSideName}</div>)
    const cooka = CookieStore.define({ name: 'z' })
    const mutation = root
      .lets('mutation', 'mutation')
      .loader(({ set, request }) => {
        set.cookies({ name: 'x', value: '1' })
        set.cookies({ name: 'y', value: '2', httpOnly: true })
        return {
          current: request.cookies,
        }
      })
      .mutation()
    expect(env.side.name).toBe('server')
    const points = [root, page, mutation] as const
    const engine = await Engine.create({
      compiler: false,
      file: import.meta.url,
      server: { scope: 'root', points },
      clients: [{ scope: 'root', points }],
    }).prepare()
    const client = FakeClient.create({
      engine,
      scope: 'root',
      globals: getFakeBrowserGlobals(),
      cookieGetter: CookieStore.clientDocumentCookieGetter,
      cookieSetter: (options) => {
        if (options.httpOnly) {
          return
        }
        CookieStore.clientDocumentCookieSetter(options)
      },
    })
    await client.run(async () => {
      cooka.set('3')

      // httpOnly = false
      expect(await client.getCookies(undefined, false)).toEqual({
        z: '3',
      })

      // httpOnly = true
      expect(await client.getCookies(undefined, true)).toEqual({})

      const { current } = await mutation.fetch()
      expect(current).toEqual({
        z: '3',
      })

      // httpOnly = false
      expect(await client.getCookies(undefined, false)).toEqual({
        z: '3',
        x: '1',
      })

      // httpOnly = true
      expect(await client.getCookies(undefined, true)).toEqual({
        y: '2',
      })

      const { current: current2 } = await mutation.fetch()
      expect(current2).toEqual({ x: '1', y: '2', z: '3' })

      // httpOnly = false
      expect(await client.getCookies(undefined, false)).toEqual({
        z: '3',
        x: '1',
      })

      // httpOnly = true
      expect(await client.getCookies(undefined, true)).toEqual({
        y: '2',
      })
    })
    expect(env.side.name).toBe('server')
  })

  it.concurrent('execute page with loader and client loader', async () => {
    const root = Point0.lets('root', 'root').serverurl('http://localhost:3000').root()
    const page = root
      .lets('page', 'page', '/page')
      .loader(() => ({ serverLoaderSideName: env.side.name }))
      .clientLoader(({ data }) => ({ ...data, clientLoaderSideName: env.side.name }))
      .page(({ data }) => (
        <div>
          Hello from {data.serverLoaderSideName} and {data.clientLoaderSideName}
        </div>
      ))
    const points = [root, page] as const
    const engine = await Engine.create({
      compiler: false,
      file: import.meta.url,
      server: { scope: 'root', points },
      clients: [{ scope: 'root', points }],
    }).prepare()
    const fakeClient = FakeClient.create({ engine, scope: 'root', globals: getFakeBrowserGlobals() })
    expect(env.side.name).toBe('server')
    await fakeClient.run(async () => {
      expect(env.side.name).toBe('client')
      const data = await page.fetchQuery()
      expect(env.side.name).toBe('client')
      expect(data.serverLoaderSideName).toBe('server')
      expect(data.clientLoaderSideName).toBe('client')
    })
    expect(env.side.name).toBe('server')
  })

  it.concurrent('should render page with loader and client loader', async () => {
    const fetchRecorder = FetchRecorder.create({
      limit: 100,
    })
    const root = Point0.lets('root', 'root')
      .middleware(fetchRecorder.middleware)
      .serverurl('http://localhost:3000')
      .root()
    let counter = 0
    const mutation = root
      .lets('mutation', 'mutation')
      .loader(() => ({ index: counter++, serverMutationSideName: env.side.name }))
      .clientLoader(({ data }) => ({ ...data, clientMutationSideName: env.side.name }))
      .mutation()
    const page = root
      .lets('page', 'page', '/')
      .loader(() => ({ x: 1, serverLoaderSideName: env.side.name }))
      .clientLoader(({ data }) => ({ ...data, clientLoaderSideName: env.side.name }))
      .page(({ data }) => {
        const inc = mutation.useMutation()
        return (
          <div>
            <div id="pageSideName">{env.side.name}</div>
            <div id="serverLoaderSideName">{data.serverLoaderSideName}</div>
            <div id="clientLoaderSideName">{data.clientLoaderSideName}</div>
            <div id="serverMutationSideName">{inc.data?.serverMutationSideName || '-'}</div>
            <div id="clientMutationSideName">{inc.data?.clientMutationSideName || '-'}</div>
            <button
              onClick={() => {
                inc.mutateAsync().catch((err: unknown) => {
                  console.error(err)
                })
              }}
            >
              Increment {inc.data?.index ?? '-'}
            </button>
          </div>
        )
      })
    const points = [root, page, mutation] as const
    const engine = await Engine.create({
      compiler: false,
      file: import.meta.url,
      server: { scope: 'root', points },
      clients: [{ scope: 'root', points }],
    }).prepare()
    const client = FakeClient.create<
      {
        container: HTMLElement
        getButton: () => HTMLButtonElement
        viewer: ElementViewer
      },
      any
    >({
      engine,
      scope: 'root',
      globals: getFakeBrowserGlobals(),
      onDestroyInside: () => cleanup(),
    })
    const routes = ClientPoints.createFromDefintion(points).routes
    const { Router } = createNavigation({ routes })
    const queryClient = createQueryClient()
    await client.run(async (state) => {
      const { container } = render(
        <QueryClientProvider client={queryClient}>
          <Router />
        </QueryClientProvider>,
      )
      state.viewer = ElementViewer.create(container)
      state.container = container
      await waitFor(() => {
        expect(container.querySelector('#pageSideName')?.textContent).toBe('client')
      })
      state.getButton = () => {
        const button = container.querySelector('button')
        assert(button)
        return button
      }
      const button = state.getButton()
      assert(button)
      fireEvent.click(button)
      await waitFor(() => expect(button.textContent).toBe('Increment 0'))
      fireEvent.click(button)
      await waitFor(() => expect(button.textContent).toBe('Increment 1'))
      //   expect(env.side.name).toBe('client')
      // })
      // expect(env.side.name).toBe('server')
      // await client.run(async ({ container, getButton, viewer }) => {
      expect(env.side.name).toBe('client')
      // const button = getButton()
      fireEvent.click(button)
      await waitFor(() => expect(button.textContent).toBe('Increment 2'))
      expect(container.querySelector('#serverLoaderSideName')?.textContent).toBe('server')
      expect(container.querySelector('#clientLoaderSideName')?.textContent).toBe('client')
      expect(container.querySelector('#serverMutationSideName')?.textContent).toBe('server')
      expect(container.querySelector('#clientMutationSideName')?.textContent).toBe('client')
      const results = await fetchRecorder.waitFinishedResults({ pointType: 'mutation', variant: 'endpoint' })
      expect(results).toHaveLength(3)
    })

    await client.destroy()
  })

  it.concurrent('send recieve client request id, and also recieve server request id', async () => {
    const root = Point0.lets('root', 'root').root()
    const page = root
      .lets('page', 'page', '/page')
      .loader(() => ({ serverLoaderSideName: env.side.name }))
      .page(({ data }) => <div>Hello from {data.serverLoaderSideName}</div>)
    const mutation = root
      .lets('mutation', 'mutation')
      .loader(({ request }) => {
        return {
          serverRequestId: request.id,
          clientRequestId: request.headers['x-point0-client-request-id'],
        }
      })
      .mutation()

    expect(env.side.name).toBe('server')
    const points = [root, page, mutation] as const
    const engine = await Engine.create({
      compiler: false,
      file: import.meta.url,
      server: { scope: 'root', points },
      clients: [{ scope: 'root', points }],
    }).prepare()
    const client = FakeClient.create({
      engine,
      scope: 'root',
      globals: getFakeBrowserGlobals(),
      cookieGetter: CookieStore.clientDocumentCookieGetter,
      cookieSetter: CookieStore.clientDocumentCookieSetter,
    })
    await client.run(async () => {
      const result = await mutation.fetchServerDetailed()
      assert(result.error === undefined && result.data)
      expect(result.data.serverRequestId).toBeDefined()
      expect(result.data.clientRequestId).toBeDefined()
      expect(result.response.headers.get('x-point0-request-id')).toBe(result.data.serverRequestId)
      expect(result.response.headers.get('x-point0-client-request-id')).toBe(result.data.clientRequestId || null)
    })
    expect(env.side.name).toBe('server')
  })

  // it('should render page with loader and client loader from ssr', async () => {
  //   const root = Point0.lets('root', 'root').serverurl('http://localhost:3000').root()
  //   let counter = 0
  //   const mutation = root
  //     .lets('mutation', 'mutation')
  //     .loader(() => ({ index: counter++, serverMutationSideName: env.side.name }))
  //     .clientLoader(({ data }) => ({ ...data, clientMutationSideName: env.side.name }))
  //     .mutation()
  //   const page = root
  //     .lets('page', 'page', '/')
  //     .loader(() => ({ x: 1, serverLoaderSideName: env.side.name }))
  //     .page(({ data }) => {
  //       const inc = mutation.useMutation()
  //       return (
  //         <div>
  //           <div id="serverMutationSideName">{inc.data?.serverMutationSideName || '-'}</div>
  //           <div id="clientMutationSideName">{inc.data?.clientMutationSideName || '-'}</div>
  //           <button
  //             onClick={() => {
  //               inc.mutateAsync().catch((err: unknown) => {
  //                 console.error(err)
  //               })
  //             }}
  //           >
  //             Increment {inc.data?.index ?? '-'}
  //           </button>
  //         </div>
  //       )
  //     })
  //   const points = [root, page, mutation] as const
  //   const App = () => {
  //     return (
  //       <QueryClientProvider>
  //         <Router />
  //       </QueryClientProvider>
  //     )
  //   }
  //   const engine = await Engine.create({
  //     compiler: false,
  //     file: import.meta.url,
  //     server: { scope: 'root', points },
  //     clients: [{ scope: 'root', points, indexHtml: '__POINT0_TEST_INDEX_HTML__', app: App }],
  //     ssr: true,
  //   }).init({ preventClientDevServers: true })
  //   const client = FakeClient.create({
  //     engine,
  //     scope: 'root',
  //     globals: getFakeBrowserGlobals(),
  //     onDestroyInside: () => cleanup(),
  //   })
  //   const response = await client.fetch(page.route({ abs: true }))
  //   const html = await response.text()
  //   const headHtml = html.split(/<head>/)[1].split(/<\/head>/)[0]
  //   const bodyHtml = html.split(/<body>/)[1].split(/<\/body>/)[0]
  //   const ssScript = html.split(/<script id="__POINT0_DEHYDRATED_SUPER_STORE_SCRIPT__">/)[1].split(/<\/script>/)[0]
  //   expect(html).toContain('<div id="serverMutationSideName">-</div>')
  //   expect(html).toContain('<div id="clientMutationSideName">-</div>')
  //   await client.run(async () => {
  //     // Set the SSR HTML as initial page HTML
  //     // Parse the HTML and set up the document structure

  //     // Clear existing content

  //     // Use React's act() from the same React instance to ensure consistency
  //     React.act(() => {
  //       document.head.innerHTML = headHtml
  //       document.body.innerHTML = bodyHtml
  //       eval(ssScript)
  //       mount(App, points)
  //       // const pointsManager = PointsManager.create(points)
  //       // superstore.prepare((window as any).__POINT0_DEHYDRATED_SUPER_STORE__, pointsManager.transformer)
  //       // const appElement = React.createElement(App, {
  //       //   points: PointsManager.create(points),
  //       // })
  //       // const domRootElement = document.getElementById('root')
  //       // assert(domRootElement)
  //       // const reactRoot = ReactDOMClient.createRoot(domRootElement)
  //       // reactRoot.render(appElement)
  //     })

  //     return

  //     // Get container for assertions
  //     const container = document.getElementById('root')
  //     assert(container)
  //     const button = container.querySelector('button')
  //     assert(button)
  //     expect(button.textContent).toBe('Increment -')

  //     // Test mutation
  //     fireEvent.click(button)
  //     await waitFor(() => expect(button.textContent).toBe('Increment 0'))
  //     fireEvent.click(button)
  //     await waitFor(() => expect(button.textContent).toBe('Increment 1'))
  //     fireEvent.click(button)
  //     await waitFor(() => expect(button.textContent).toBe('Increment 2'))

  //     // Verify mutation data after hydration
  //     expect(container.querySelector('#serverMutationSideName')?.textContent).toBe('server')
  //     expect(container.querySelector('#clientMutationSideName')?.textContent).toBe('client')
  //   })

  //   await client.destroy()
  // })

  // describe('ssr', () => {
  //   beforeAll(async () => {
  //     await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
  //     tpf.setBrowser(await PlaywrightBrowser.init())
  //   })

  //   afterAll(async () => {
  //     await tpf.cleanup({ files: !preventFinalFilesCleanup, processes: true, ports: true, browser: true })
  //   })

  //   it(
  //     'should render ssr page with loader and client loader',
  //     wrp({ ssr: true, preserve: false }, async ({ tp }) => {
  //       await tp.write(
  //         'src/page.tsx',
  //         `import { root } from './lib/root.js'
  //         import { env } from '@point0/core'
  //         let counter = 0
  //         export const mutation = root
  //           .lets('mutation', 'mutation')
  //           .loader(() => ({ index: counter++, serverMutationSideName: env.side.name }))
  //           .clientLoader(({ data }) => ({ ...data, clientMutationSideName: env.side.name }))
  //           .mutation()
  //         export const page = root
  //           .lets('page', 'page', '/')
  //           .loader(() => ({ x: 1, serverLoaderSideName: env.side.name }))
  //           .page(({ data }) => {
  //             const inc = mutation.useMutation()
  //             return (
  //               <div>
  //                 <div id="pageSideName">{env.side.name}</div>
  //                 <div id="serverLoaderSideName">{data.serverLoaderSideName}</div>
  //                 <div id="serverMutationSideName">{inc.data?.serverMutationSideName || '-'}</div>
  //                 <div id="clientMutationSideName">{inc.data?.clientMutationSideName || '-'}</div>
  //                 <button
  //                   onClick={() => {
  //                     inc.mutateAsync().catch((err: unknown) => {
  //                       console.error(err)
  //                     })
  //                   }}
  //                 >
  //                   Increment {inc.data?.index ?? '-'}
  //                 </button>
  //               </div>
  //             )
  //           })
  //         `,
  //       )
  //       await tp.generate()
  //       const engine = await tp.importEngine(true)
  //       await engine.init()
  //       const client = FakeClient.create({
  //         engine,
  //         scope: 'root',
  //         globals: getFakeBrowserGlobals(),
  //         cleanup,
  //       })
  //       const response = await client.fetch(`http://localhost:${engine.server.port}/`)
  //       const html = await response.text()
  //       expect
  //       await client.run(async () => {
  //         const { container } = render(
  //           <QueryClientProvider>
  //             <Router />
  //           </QueryClientProvider>,
  //         )
  //         await waitFor(() => {
  //           expect(container.querySelector('#pageSideName')?.textContent).toBe('client')
  //         })
  //         const button = container.querySelector('button')
  //         assert(button)
  //         fireEvent.click(button)
  //         await waitFor(() => expect(button.textContent).toBe('Increment 0'))
  //         fireEvent.click(button)
  //         await waitFor(() => expect(button.textContent).toBe('Increment 1'))
  //         expect(container.querySelector('#serverLoaderSideName')?.textContent).toBe('server')
  //         expect(container.querySelector('#clientLoaderSideName')?.textContent).toBe('client')
  //         expect(container.querySelector('#serverMutationSideName')?.textContent).toBe('server')
  //         expect(container.querySelector('#clientMutationSideName')?.textContent).toBe('client')
  //       })
  //     }),
  //   )
  // })

  // it('should render ssr page with loader and client loader', async () => {
  //   const root = Point0.lets('root', 'root').serverurl('http://localhost:3000').root()
  //   let counter = 0
  //   const mutation = root
  //     .lets('mutation', 'mutation')
  //     .loader(() => ({ index: counter++, serverMutationSideName: env.side.name }))
  //     .clientLoader(({ data }) => ({ ...data, clientMutationSideName: env.side.name }))
  //     .mutation()
  //   const page = root
  //     .lets('page', 'page', '/')
  //     .loader(() => ({ x: 1, serverLoaderSideName: env.side.name }))
  //     .clientLoader(({ data }) => ({ ...data, clientLoaderSideName: env.side.name }))
  //     .page(({ data }) => {
  //       const inc = mutation.useMutation()
  //       return (
  //         <div>
  //           <div id="pageSideName">{env.side.name}</div>
  //           <div id="serverLoaderSideName">{data.serverLoaderSideName}</div>
  //           <div id="clientLoaderSideName">{data.clientLoaderSideName}</div>
  //           <div id="serverMutationSideName">{inc.data?.serverMutationSideName || '-'}</div>
  //           <div id="clientMutationSideName">{inc.data?.clientMutationSideName || '-'}</div>
  //           <button
  //             onClick={() => {
  //               inc.mutateAsync().catch((err: unknown) => {
  //                 console.error(err)
  //               })
  //             }}
  //           >
  //             Increment {inc.data?.index ?? '-'}
  //           </button>
  //         </div>
  //       )
  //     })
  //   const points = [root, page, mutation] as const
  //   const engine = await Engine.init({
  //     compiler: false,
  //     file: import.meta.url,
  //     server: { scope: 'root', points },
  //     clients: [{ scope: 'root', points }],
  //     ssr: true,
  //   })
  //   const client = FakeClient.create({
  //     engine,
  //     scope: 'root',
  //     globals: getFakeBrowserGlobals(),
  //     cleanup,
  //   })
  //   const response = await client.fetch(new Request(page.route({ abs: true })))
  //   const html = await response.text()
  //   return
  //   expect(html).toContain('pageSideName')
  // })

  // it('should render page with loader and client loader', async () => {
  //   const root = Point0.lets('root', 'root').serverurl('http://localhost:3000').root()
  //   let counter = 0
  //   const mutation = root
  //     .lets('mutation', 'mutation')
  //     .loader(() => ({ index: counter++ }))
  //     .mutation()
  //   const page = root
  //     .lets('page', 'page', '/')
  //     .loader(() => ({ x: 1 }))
  //     .clientLoader(({ data }) => ({ ...data, y: 2 }))
  //     .page(({ data }) => {
  //       const inc = mutation.useMutation()
  //       return (
  //         <div>
  //           Hello {data.x} {data.y}
  //           <button
  //             onClick={() => {
  //               inc.mutateAsync().catch((err: unknown) => {
  //                 console.error(err)
  //               })
  //             }}
  //           >
  //             Increment {inc.data?.index ?? '-'}
  //           </button>
  //         </div>
  //       )
  //     })
  //   const engine = await Engine.init({
  //     compiler: false,
  //     file: import.meta.url,
  //     clients: [[root, page, mutation]],
  //   })
  //   const fakeClient = FakeClient.create({ engine, scope: 'root' })
  //   await fakeClient.run(async () => {
  //     await withFakeBrowser(async () => {
  //       const { container } = render(
  //         <QueryClientProvider>
  //           <Router />
  //         </QueryClientProvider>,
  //       )

  //       await waitFor(() => {
  //         const element = container.querySelector('div')
  //         expect(element).toBeDefined()
  //         expect(element?.textContent).toContain('Hello 1 2')
  //       })

  //       // Subscribe to HTML changes
  //       const observer = new window.MutationObserver((mutations) => {
  //         mutations.forEach((mutation) => {
  //           // console.info('Mutation:', {
  //           //   type: mutation.type,
  //           //   side: mutation.side,
  //           //   addedNodes: Array.from(mutation.addedNodes).map((n) => n.textContent),
  //           //   removedNodes: Array.from(mutation.removedNodes).map((n) => n.textContent),
  //           //   attributeName: mutation.attributeName,
  //           //   oldValue: mutation.oldValue,
  //           // })
  //         })
  //       })

  //       observer.observe(container, {
  //         childList: true,
  //         subtree: true,
  //         attributes: true,
  //         characterData: true,
  //         attributeOldValue: true,
  //         characterDataOldValue: true,
  //       })

  //       const button = container.querySelector('button')
  //       assert(button)
  //       expect(button.textContent).toBe('Increment -')
  //       fireEvent.click(button)
  //       await waitFor(() => expect(button.textContent).toBe('Increment 0'))
  //       fireEvent.click(button)
  //       await waitFor(() => expect(button.textContent).toBe('Increment 1'))
  //       observer.disconnect()
  //     })
  //   })
  // })
})
