import { Point0 } from '@point0/core'
import '@testing-library/jest-dom'
import { describe, expect, it } from 'bun:test'
import { Engine } from '../src/engine.js'
import { TestClient } from '../src/test-client.js'

describe('TestClient', () => {
  it('should fetch page with loader', async () => {
    const root = Point0.lets('root', 'root').serverurl('http://localhost:3000').root()
    const page = root
      .lets('page', 'page')
      .loader(() => ({ x: 1 }))
      .page(({ data }) => <div>Hello {data.x}</div>)
    const engine = await Engine.init({
      compiler: false,
      file: import.meta.url,
      clients: [[root, page]],
    })
    const testClient = TestClient.create({ engine, scope: 'root' })
    await testClient.run(async () => {
      const data = await page.fetch()
      expect(data.x).toBe(1)
    })
  })

  // it('should execute page with loader and client loader', async () => {
  //   const root = Point0.lets('root', 'root').serverurl('http://localhost:3000').root()
  //   const page = root
  //     .lets('page', 'page')
  //     .loader(() => ({ x: 1 }))
  //     .clientLoader(({ data }) => ({ ...data, y: 2 }))
  //     .page(({ data }) => (
  //       <div>
  //         Hello {data.x} {data.y}
  //       </div>
  //     ))
  //   const engine = await Engine.init({
  //     compiler: false,
  //     file: import.meta.url,
  //     server: [root, page],
  //   })
  //   Fetch0.apply(engine)
  //   const data = await page.execute()
  //   expect(data.x).toBe(1)
  //   expect(data.y).toBe(2)
  // })

  // // it('should render page with loader and client loader', async () => {
  // //   const _root = Point0.lets('root', 'root').serverurl('http://localhost:3000').root()
  // //   const page = _root
  // //     .lets('page', 'page')
  // //     .loader(() => ({ x: 1 }))
  // //     .clientLoader(({ data }) => ({ ...data, y: 2 }))
  // //     .page(({ data }) => (
  // //       <div>
  // //         Hello {data.x} {data.y}
  // //       </div>
  // //     ))
  // //   const engine = await Engine.init({
  // //     file: import.meta.url,
  // //     server: {
  // //       scope: 'root',
  // //       points: async () => ({
  // //         _root,
  // //         page,
  // //       }),
  // //     },
  // //   })
  // //   Fetch0.apply(engine)
  // //   const pointsManager = engine.allPointsManagers.pointsManagers[0]
  // //   if (!pointsManager) {
  // //     throw new Error('Points manager not found')
  // //   }

  // //   // Set up browser-like environment ONLY for client-side rendering
  // //   // This ensures window/document/location are available for client code
  // //   const { dom, cleanup: cleanupBrowserEnv } = setupBrowserEnvironment()

  // //   // Ensure points manager is registered in global registry
  // //   if (!(globalThis as any).__POINT0_POINTS_MANAGER__) {
  // //     ;(globalThis as any).__POINT0_POINTS_MANAGER__ = {}
  // //   }
  // //   ;(globalThis as any).__POINT0_POINTS_MANAGER__[pointsManager.scope] = pointsManager

  // //   // Since env.target.is.client is evaluated at module load time (before browser env setup),
  // //   // we need to work around SuperStore.getState() which checks env.
  // //   // We'll temporarily override getState to return clientState when in browser environment
  // //   const originalGetState = SuperStore.getState
  // //   const clientState = (SuperStore as any).clientState as Record<string, unknown>
  // //   clientState.__POINT0_SCOPE__ = pointsManager.scope
  // //   clientState.__POINT0_TRANSFORMER__ = pointsManager.transformer

  // //   // Override getState to return clientState when browser environment is detected
  // //   ;(SuperStore as any).getState = () => {
  // //     // If window/document exist, we're in browser-like environment, use clientState
  // //     if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  // //       return clientState
  // //     }
  // //     return originalGetState.call(SuperStore)
  // //   }

  // //   try {
  // //     const queryClient = new QueryClient({
  // //       defaultOptions: {
  // //         queries: {
  // //           retry: false,
  // //         },
  // //       },
  // //     })
  // //     const location = Route0.getLocation('/page')

  // //     // Render happens in browser-like environment, so client code runs correctly
  // //     // The Page component and Router will use window/document/location from the browser environment
  // //     const { container, unmount } = render(
  // //       <QueryClientProvider client={queryClient}>
  // //         <Router ssrLocation={location} routes={pointsManager.routes}>
  // //           <page.Page />
  // //         </Router>
  // //       </QueryClientProvider>,
  // //       { container: dom.window.document.body },
  // //     )

  // //     // Use container to query instead of screen, since we're using a custom document
  // //     await waitFor(
  // //       () => {
  // //         const element = container.querySelector('div')
  // //         expect(element).toBeDefined()
  // //         expect(element?.textContent).toBe('Hello 1 2')
  // //       },
  // //       { container },
  // //     )

  // //     // Unmount React component first
  // //     unmount()
  // //   } finally {
  // //     // Explicitly call React Testing Library cleanup and wait for it
  // //     cleanup()
  // //     // Wait a bit to ensure all async cleanup completes
  // //     await new Promise((resolve) => setTimeout(resolve, 10))

  // //     // Restore original getState
  // //     ;(SuperStore as any).getState = originalGetState
  // //     // Clean up browser environment after React cleanup completes
  // //     // This prevents leakage to other tests
  // //     cleanupBrowserEnv()
  // //   }
  // // })

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
  //   const points = [root, page, mutation] as const
  //   const engine = await Engine.init({
  //     compiler: false,
  //     file: import.meta.url,
  //     server: points,
  //   })
  //   Fetch0.apply(engine)

  //   // await withFakeBrowser(async () => {
  //   //   PointsManager.create(points)

  //   //   render(
  //   //     <QueryClientProvider client={new QueryClient()}>
  //   //       <Router>
  //   //         <page.Page />
  //   //       </Router>
  //   //     </QueryClientProvider>,
  //   //   )

  //   //   await waitFor(() => {
  //   //     expect(within(document.body).getByText('Hello 1 2')).toBeDefined()
  //   //   })
  //   // })

  //   console.log('isClient before', env.target.is.client)

  //   await withFakeBrowser(async () => {
  //     console.log('isClient after', env.target.is.client)
  //     PointsManager.create(points)
  //     console.log(window.location.pathname)

  //     const { container } = render(
  //       <QueryClientProvider>
  //         <Router />
  //       </QueryClientProvider>,
  //     )

  //     await waitFor(() => {
  //       const element = container.querySelector('div')
  //       expect(element).toBeDefined()
  //       expect(element?.textContent).toContain('Hello 1 2')
  //     })

  //     console.log('Initial Container HTML:', container.innerHTML)

  //     // Subscribe to HTML changes
  //     const observer = new window.MutationObserver((mutations) => {
  //       console.log('HTML Changed:', container.innerHTML)
  //       mutations.forEach((mutation) => {
  //         // console.log('Mutation:', {
  //         //   type: mutation.type,
  //         //   target: mutation.target,
  //         //   addedNodes: Array.from(mutation.addedNodes).map((n) => n.textContent),
  //         //   removedNodes: Array.from(mutation.removedNodes).map((n) => n.textContent),
  //         //   attributeName: mutation.attributeName,
  //         //   oldValue: mutation.oldValue,
  //         // })
  //       })
  //     })

  //     observer.observe(container, {
  //       childList: true,
  //       subtree: true,
  //       attributes: true,
  //       characterData: true,
  //       attributeOldValue: true,
  //       characterDataOldValue: true,
  //     })

  //     const button = container.querySelector('button')
  //     assert(button)
  //     expect(button.textContent).toBe('Increment -')
  //     fireEvent.click(button)
  //     await waitFor(() => expect(button.textContent).toBe('Increment 0'))
  //     fireEvent.click(button)
  //     await waitFor(() => expect(button.textContent).toBe('Increment 1'))
  //     observer.disconnect()
  //   })
  // })
})
