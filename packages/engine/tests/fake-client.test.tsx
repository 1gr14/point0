import { Point0, QueryClientProvider, env } from '@point0/core'
import { Router } from '@point0/wouter'
import '@testing-library/jest-dom'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'bun:test'
import assert from 'node:assert'
import { Engine } from '../src/engine.js'
import { FakeClient } from '../src/fake-client.js'
// import { PlaywrightBrowser } from './utils/playwright.js'
// import type { TestProject, TestProjectFactoryCreateProjectOptions } from './utils/project.js'
// import { TestProjectFactory } from './utils/project.js'
import { getFakeBrowserGlobals } from './utils/test-client.js'

// const tpf = TestProjectFactory.create({
//   namespace: 'test-client',
//   portsRange: [3300, 3399],
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

  // const originalError = console.error
  // beforeAll(() => {
  //   console.error = (...args: any[]) => {
  //     const message = args[0]
  //     if (
  //       typeof message === 'string' &&
  //       message.includes('Detected multiple renderers concurrently rendering the same context provider')
  //     ) {
  //       // Suppress this specific warning
  //       return
  //     }
  //     originalError.apply(console, args)
  //   }
  // })

  // afterAll(() => {
  //   console.error = originalError
  // })

  // afterEach(cleanup)

  it('fetch page with loader', async () => {
    const root = Point0.lets('root', 'root').serverurl('http://localhost:3000').root()
    const page = root
      .lets('page', 'page')
      .loader(() => ({ serverLoaderTargetName: env.target.name }))
      .page(({ data }) => <div>Hello from {data.serverLoaderTargetName}</div>)
    expect(env.target.name).toBe('server')
    const points = [root, page] as const
    const engine = await Engine.init({
      compiler: false,
      file: import.meta.url,
      server: { scope: 'root', points },
      clients: [{ scope: 'root', points }],
    })
    expect(env.target.name).toBe('server')
    const fakeClient = FakeClient.create({ engine, scope: 'root', globals: getFakeBrowserGlobals() })
    await fakeClient.run(async () => {
      expect(env.target.name).toBe('client')
      const data = await page.fetch()
      expect(env.target.name).toBe('client')
      expect(data.serverLoaderTargetName).toBe('server')
    })
    expect(env.target.name).toBe('server')
  })

  it('respect cookies', async () => {
    const root = Point0.lets('root', 'root').root()
    const page = root
      .lets('page', 'page')
      .loader(() => ({ serverLoaderTargetName: env.target.name }))
      .page(({ data }) => <div>Hello from {data.serverLoaderTargetName}</div>)
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
    expect(env.target.name).toBe('server')
    const points = [root, page, mutation] as const
    const engine = await Engine.init({
      compiler: false,
      file: import.meta.url,
      server: { scope: 'root', points },
      clients: [{ scope: 'root', points }],
    })
    const client = FakeClient.create({ engine, scope: 'root', globals: getFakeBrowserGlobals() })
    await client.run(async () => {
      expect(await client.getCookies()).toEqual([])
      const { current } = await mutation.fetch()
      expect(current).toEqual({})
      const cookies = await client.getCookies()
      expect(cookies.length).toBe(1)
      expect(cookies[0].key).toBe('x')
      expect(cookies[0].value).toBe('1')
      const { current: current2 } = await mutation.fetch()
      expect(current2).toEqual({ x: '1', y: '2' })
      const cookies2 = await client.getCookies()
      expect(cookies2.length).toBe(1)
      expect(cookies2[0].key).toBe('x')
      expect(cookies2[0].value).toBe('1')
    })
    expect(env.target.name).toBe('server')
  })

  it('execute page with loader and client loader', async () => {
    const root = Point0.lets('root', 'root').serverurl('http://localhost:3000').root()
    const page = root
      .lets('page', 'page')
      .loader(() => ({ serverLoaderTargetName: env.target.name }))
      .clientLoader(({ data }) => ({ ...data, clientLoaderTargetName: env.target.name }))
      .page(({ data }) => (
        <div>
          Hello from {data.serverLoaderTargetName} and {data.clientLoaderTargetName}
        </div>
      ))
    const points = [root, page] as const
    const engine = await Engine.init({
      compiler: false,
      file: import.meta.url,
      server: { scope: 'root', points },
      clients: [{ scope: 'root', points }],
    })
    const fakeClient = FakeClient.create({ engine, scope: 'root', globals: getFakeBrowserGlobals() })
    expect(env.target.name).toBe('server')
    await fakeClient.run(async () => {
      expect(env.target.name).toBe('client')
      const data = await page.execute()
      expect(env.target.name).toBe('client')
      expect(data.serverLoaderTargetName).toBe('server')
      expect(data.clientLoaderTargetName).toBe('client')
    })
    expect(env.target.name).toBe('server')
  })

  it('should render page with loader and client loader', async () => {
    const root = Point0.lets('root', 'root').serverurl('http://localhost:3000').root()
    let counter = 0
    const mutation = root
      .lets('mutation', 'mutation')
      .loader(() => ({ index: counter++, serverMutationTargetName: env.target.name }))
      .clientLoader(({ data }) => ({ ...data, clientMutationTargetName: env.target.name }))
      .mutation()
    const page = root
      .lets('page', 'page', '/')
      .loader(() => ({ x: 1, serverLoaderTargetName: env.target.name }))
      .clientLoader(({ data }) => ({ ...data, clientLoaderTargetName: env.target.name }))
      .page(({ data }) => {
        const inc = mutation.useMutation()
        return (
          <div>
            <div id="pageTargetName">{env.target.name}</div>
            <div id="serverLoaderTargetName">{data.serverLoaderTargetName}</div>
            <div id="clientLoaderTargetName">{data.clientLoaderTargetName}</div>
            <div id="serverMutationTargetName">{inc.data?.serverMutationTargetName || '-'}</div>
            <div id="clientMutationTargetName">{inc.data?.clientMutationTargetName || '-'}</div>
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
    const engine = await Engine.init({
      compiler: false,
      file: import.meta.url,
      server: { scope: 'root', points },
      clients: [{ scope: 'root', points }],
    })
    const client = FakeClient.create<{ container: HTMLElement; getButton: () => HTMLButtonElement }>({
      engine,
      scope: 'root',
      globals: getFakeBrowserGlobals(),
      onDestroyInside: () => cleanup(),
    })
    await client.run(async (state) => {
      const { container } = render(
        <QueryClientProvider>
          <Router />
        </QueryClientProvider>,
      )
      state.container = container
      await waitFor(() => {
        expect(container.querySelector('#pageTargetName')?.textContent).toBe('client')
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
      expect(env.target.name).toBe('client')
    })
    expect(env.target.name).toBe('server')
    await client.run(async ({ container, getButton }) => {
      expect(env.target.name).toBe('client')
      const button = getButton()
      fireEvent.click(button)
      await waitFor(() => expect(button.textContent).toBe('Increment 2'))
      expect(container.querySelector('#serverLoaderTargetName')?.textContent).toBe('server')
      expect(container.querySelector('#clientLoaderTargetName')?.textContent).toBe('client')
      expect(container.querySelector('#serverMutationTargetName')?.textContent).toBe('server')
      expect(container.querySelector('#clientMutationTargetName')?.textContent).toBe('client')
    })

    await client.destroy()
  })

  // it('should render page with loader and client loader from ssr', async () => {
  //   const root = Point0.lets('root', 'root').ssr(true).serverurl('http://localhost:3000').root()
  //   let counter = 0
  //   const mutation = root
  //     .lets('mutation', 'mutation')
  //     .loader(() => ({ index: counter++, serverMutationTargetName: env.target.name }))
  //     .clientLoader(({ data }) => ({ ...data, clientMutationTargetName: env.target.name }))
  //     .mutation()
  //   const page = root
  //     .lets('page', 'page', '/')
  //     .loader(() => ({ x: 1, serverLoaderTargetName: env.target.name }))
  //     .page(({ data }) => {
  //       const inc = mutation.useMutation()
  //       return (
  //         <div>
  //           <div id="serverMutationTargetName">{inc.data?.serverMutationTargetName || '-'}</div>
  //           <div id="clientMutationTargetName">{inc.data?.clientMutationTargetName || '-'}</div>
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
  //   // console.log(headHtml, bodyHtml)
  //   expect(html).toContain('<div id="serverMutationTargetName">-</div>')
  //   expect(html).toContain('<div id="clientMutationTargetName">-</div>')
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
  //     expect(container.querySelector('#serverMutationTargetName')?.textContent).toBe('server')
  //     expect(container.querySelector('#clientMutationTargetName')?.textContent).toBe('client')
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

  //   it.only(
  //     'should render ssr page with loader and client loader',
  //     wrp({ ssr: true, preserve: true }, async ({ tp }) => {
  //       await tp.write(
  //         'src/page.tsx',
  //         `import { root } from './lib/root.js'
  //         import { env } from '@point0/core'
  //         let counter = 0
  //         export const mutation = root
  //           .lets('mutation', 'mutation')
  //           .loader(() => ({ index: counter++, serverMutationTargetName: env.target.name }))
  //           .clientLoader(({ data }) => ({ ...data, clientMutationTargetName: env.target.name }))
  //           .mutation()
  //         export const page = root
  //           .lets('page', 'page', '/')
  //           .loader(() => ({ x: 1, serverLoaderTargetName: env.target.name }))
  //           .page(({ data }) => {
  //             const inc = mutation.useMutation()
  //             return (
  //               <div>
  //                 <div id="pageTargetName">{env.target.name}</div>
  //                 <div id="serverLoaderTargetName">{data.serverLoaderTargetName}</div>
  //                 <div id="serverMutationTargetName">{inc.data?.serverMutationTargetName || '-'}</div>
  //                 <div id="clientMutationTargetName">{inc.data?.clientMutationTargetName || '-'}</div>
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
  //           expect(container.querySelector('#pageTargetName')?.textContent).toBe('client')
  //         })
  //         const button = container.querySelector('button')
  //         assert(button)
  //         fireEvent.click(button)
  //         await waitFor(() => expect(button.textContent).toBe('Increment 0'))
  //         fireEvent.click(button)
  //         await waitFor(() => expect(button.textContent).toBe('Increment 1'))
  //         expect(container.querySelector('#serverLoaderTargetName')?.textContent).toBe('server')
  //         expect(container.querySelector('#clientLoaderTargetName')?.textContent).toBe('client')
  //         expect(container.querySelector('#serverMutationTargetName')?.textContent).toBe('server')
  //         expect(container.querySelector('#clientMutationTargetName')?.textContent).toBe('client')
  //       })
  //     }),
  //   )
  // })

  // it('should render ssr page with loader and client loader', async () => {
  //   const root = Point0.lets('root', 'root').ssr(true).serverurl('http://localhost:3000').root()
  //   let counter = 0
  //   const mutation = root
  //     .lets('mutation', 'mutation')
  //     .loader(() => ({ index: counter++, serverMutationTargetName: env.target.name }))
  //     .clientLoader(({ data }) => ({ ...data, clientMutationTargetName: env.target.name }))
  //     .mutation()
  //   const page = root
  //     .lets('page', 'page', '/')
  //     .loader(() => ({ x: 1, serverLoaderTargetName: env.target.name }))
  //     .clientLoader(({ data }) => ({ ...data, clientLoaderTargetName: env.target.name }))
  //     .page(({ data }) => {
  //       const inc = mutation.useMutation()
  //       return (
  //         <div>
  //           <div id="pageTargetName">{env.target.name}</div>
  //           <div id="serverLoaderTargetName">{data.serverLoaderTargetName}</div>
  //           <div id="clientLoaderTargetName">{data.clientLoaderTargetName}</div>
  //           <div id="serverMutationTargetName">{inc.data?.serverMutationTargetName || '-'}</div>
  //           <div id="clientMutationTargetName">{inc.data?.clientMutationTargetName || '-'}</div>
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
  //   })
  //   const client = FakeClient.create({
  //     engine,
  //     scope: 'root',
  //     globals: getFakeBrowserGlobals(),
  //     cleanup,
  //   })
  //   const response = await client.fetch(new Request(page.route({ abs: true })))
  //   const html = await response.text()
  //   console.log(html)
  //   return
  //   expect(html).toContain('pageTargetName')
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

  //       console.log('Initial Container HTML:', container.innerHTML)

  //       // Subscribe to HTML changes
  //       const observer = new window.MutationObserver((mutations) => {
  //         console.log('HTML Changed:', container.innerHTML)
  //         mutations.forEach((mutation) => {
  //           // console.log('Mutation:', {
  //           //   type: mutation.type,
  //           //   target: mutation.target,
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
