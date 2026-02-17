import { Point0 } from '@point0/core'
// import '@testing-library/jest-dom'
import { describe, expect, it } from 'bun:test'
// import { PlaywrightBrowser } from './utils/playwright.js'
// import type { TestProject, TestProjectFactoryCreateProjectOptions } from './utils/project.js'
// import { TestProjectFactory } from './utils/project.js'
import { createTestThings } from './utils/internal-testing.js'

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
//       await tp.init.concurrent()
//       const engine = await tp.importEngine()
//       await callback({ tp, engine })
//       await tp.cleanup({ files: !preserve, ports: true, processes: true })
//     } catch (error) {
//       await tp.cleanup({ files: !preserve, ports: true, processes: true })
//       throw error
//     }
//   }
// }

describe('midleware', () => {
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

  it.concurrent('without', async () => {
    const root = Point0.lets('root', 'root').baseurl('http://localhost/').ssr(true).root()
    const page = root
      .lets('page', 'home', '/')
      .loader(({ request }) => ({ x: 1, y: request.headers.x }))
      .page(({ data }) => (
        <div id="page">
          x={data.x},y={data.y}
        </div>
      ))
    const { loadPoint, fetchPreview } = await createTestThings({ points: [root, page] })
    const data = await loadPoint(page)
    expect(data.x).toBe(1)
    const preview = await fetchPreview(page)
    expect(preview).toMatchInlineSnapshot(`
      "
      #page: x=1,y=
      "
    `)
  })

  it.concurrent('change headers', async () => {
    const root = Point0.lets('root', 'root')
      .middleware(async ({ request, set, next }) => {
        set.headers('y', '3')
        return await next()
      })
      .middleware(async ({ request, set, next }) => {
        set.headers('z', '4')
        const result = await next()
        set.headers('y', 'NEVER')
        return result // ok fine, I just want to check meta, now I want it going forward
      })
      .ssr(true)
      .baseurl('http://localhost/')
      .root()
    const page = root
      .lets('page', 'home', '/')
      .loader(({ set }) => ({ x: 1, y: set.inspect.headers.y, z: set.inspect.headers.z }))
      .page(({ data }) => (
        <div id="page">
          x={data.x},y={data.y},z={data.z}
        </div>
      ))
    const { loadPoint, fetchPreview } = await createTestThings({ points: [root, page] })
    const data = await loadPoint(page)
    expect(data.x).toBe(1)
    const preview = await fetchPreview(page)
    expect(preview).toMatchInlineSnapshot(`
      "
      #page: x=1,y=3,z=4
      "
    `)
  })

  it.concurrent('return custom response', async () => {
    const root = Point0.lets('root', 'root')
      .middleware(async ({ request, set, next }) => {
        set.headers('y', '3')
        return await next()
      })
      .middleware(async ({ request, set, next }) => {
        return new Response('custom response')
      })
      .ssr(true)
      .baseurl('http://localhost/')
      .root()
    const page = root
      .lets('page', 'home', '/')
      .loader(({ set }) => ({ x: 1, y: set.inspect.headers.y, z: set.inspect.headers.z }))
      .page(({ data }) => (
        <div id="page">
          x={data.x},y={data.y},z={data.z}
        </div>
      ))
    const { fetch } = await createTestThings({ points: [root, page] })
    const response = await fetch(page.route.flat({}, true))
    expect(await response.text()).toBe('custom response')
  })

  it.concurrent('throws error', async () => {
    const root = Point0.lets('root', 'root')
      .middleware(async ({ request, set, next }) => {
        set.headers('y', '3')
        return await next()
      })
      .middleware(async ({ request, set, next }) => {
        throw new Error('custom error')
      })
      .ssr(true)
      .baseurl('http://localhost/')
      .root()
    const page = root
      .lets('page', 'home', '/')
      .loader(({ set }) => ({ x: 1, y: set.inspect.headers.y, z: set.inspect.headers.z }))
      .page(({ data }) => (
        <div id="page">
          x={data.x},y={data.y},z={data.z}
        </div>
      ))
    const { fetch } = await createTestThings({ points: [root, page] })
    const response = await fetch(page.route.flat({}, true))
    expect(response.status).toBe(500)
    expect(response.headers.get('y')).toBe('3')
    expect(await response.text()).toContain('custom error')
  })

  it.concurrent('override final response', async () => {
    const root = Point0.lets('root', 'root')
      .middleware(async ({ request, set, next }) => {
        set.headers('y', '3')
        return await next()
      })
      .middleware(async ({ request, set, next }) => {
        const result = await next()
        if (result.variant === 'page') {
          return new Response('overriden page response', { status: 200 })
        }
        return result
      })
      .ssr(true)
      .baseurl('http://localhost/')
      .root()
    const page = root
      .lets('page', 'home', '/')
      .loader(({ set }) => ({ x: 1, y: set.inspect.headers.y, z: set.inspect.headers.z }))
      .page(({ data }) => (
        <div id="page">
          x={data.x},y={data.y},z={data.z}
        </div>
      ))
    const { fetch } = await createTestThings({ points: [root, page] })
    const response = await fetch(page.route.flat({}, true))
    expect(response.status).toBe(200)
    expect(response.headers.get('y')).toBe('3')
    expect(await response.text()).toContain('overriden page response')
  })

  it.concurrent('applied only to specific point', async () => {
    const calledMiddlewres: string[] = []
    const root = Point0.lets('root', 'root')
      .middleware(async ({ request, set, next }) => {
        calledMiddlewres.push('root')
        return await next()
      })
      .ssr(true)
      .baseurl('http://localhost/')
      .root()
    const page1 = root
      .lets('page', 'home1', '/home1')
      .middleware(async ({ request, set, next }) => {
        calledMiddlewres.push('page1')
        return await next()
      })
      .loader(({ set }) => ({ x: 1 }))
      .page(({ data }) => <div id="page1">x={data.x}</div>)
    const page2 = root
      .lets('page', 'home2', '/home2')
      .middleware(async ({ request, set, next }) => {
        calledMiddlewres.push('page2')
        return await next()
      })
      .loader(({ set }) => ({ y: 2 }))
      .page(({ data }) => <div id="page2">y={data.y}</div>)

    const { fetchPreview, fetchesTale, fetchRecorder } = await createTestThings({ points: [root, page1, page2] })

    const prview1 = await fetchPreview(page1)
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      page.home1 (client) (page) < {}
      page.home1 (server) < {}
      "
    `)
    expect(prview1).toMatchInlineSnapshot(`
      "
      #page1: x=1
      "
    `)
    // we call it twice, becouse of ssr, which rernder all app before all pending queries resolved
    expect(calledMiddlewres).toEqual(['root', 'page1', 'root', 'page1'])
    calledMiddlewres.length = 0
    fetchRecorder.prune()

    const prview2 = await fetchPreview(page2)
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      page.home2 (client) (page) < {}
      page.home2 (server) < {}
      "
    `)
    expect(prview2).toMatchInlineSnapshot(`
      "
      #page2: y=2
      "
    `)
    // we call it twice, becouse of ssr, which rernder all app before all pending queries resolved
    expect(calledMiddlewres).toEqual(['root', 'page2', 'root', 'page2'])
  })
})
