// import '@testing-library/jest-dom'
import { describe, expect, expectTypeOf, it } from 'bun:test'
import { ErrorPoint0, Point0 } from '@point0/core'
// import { PlaywrightBrowser } from './utils/playwright.js'
// import type { TestProject, TestProjectFactoryCreateProjectOptions } from './utils/project.one-client.js'
// import { TestProjectFactory } from './utils/project.one-client.js'
import { createTestThings } from './utils/internal-testing.js'

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
    const root = Point0.lets('root', 'root').root()
    const page = root
      .lets('page', 'home', '/')
      .loader(({ request }) => ({ x: 1, y: request.headers.x }))
      .page(({ data }) => (
        <div id="page">
          x={data.x},y={data.y}
        </div>
      ))
    const { loadPoint, fetchPreview } = await createTestThings({ ssr: true, points: [root, page] })
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
      .middleware(async ({ set, next }) => {
        set.headers('y', '3')
        return await next()
      })
      .middleware(async ({ set, next }) => {
        set.headers('z', '4')
        const result = await next()
        set.headers('y', 'NEVER')
        return result // ok fine, I just want to check meta, now I want it going forward
      })
      .root()
    const page = root
      .lets('page', 'home', '/')
      .loader(({ set }) => ({ x: 1, y: set.inspect.headers.y, z: set.inspect.headers.z }))
      .page(({ data }) => (
        <div id="page">
          x={data.x},y={data.y},z={data.z}
        </div>
      ))
    const { loadPoint, fetchPreview } = await createTestThings({ ssr: true, points: [root, page] })
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
      .middleware(async ({ set, next }) => {
        set.headers('y', '3')
        return await next()
      })
      .middleware(async () => {
        return new Response('custom response')
      })
      .root()
    const page = root
      .lets('page', 'home', '/')
      .loader(({ set }) => ({ x: 1, y: set.inspect.headers.y, z: set.inspect.headers.z }))
      .page(({ data }) => (
        <div id="page">
          x={data.x},y={data.y},z={data.z}
        </div>
      ))
    const { fetch } = await createTestThings({ ssr: true, points: [root, page] })
    const response = await fetch(page.route.get({}, { origin: 'http://localhost' }))
    expect(await response.text()).toBe('custom response')
  })

  it.concurrent('mutiple middlewares in one method', async () => {
    const root = Point0.lets('root', 'root')
      .middleware(
        async ({ set, next }) => {
          set.headers('y', '3')
          return await next()
        },
        async () => {
          return new Response('custom response')
        },
      )
      .root()
    const page = root
      .lets('page', 'home', '/')
      .loader(({ set }) => ({ x: 1, y: set.inspect.headers.y, z: set.inspect.headers.z }))
      .page(({ data }) => (
        <div id="page">
          x={data.x},y={data.y},z={data.z}
        </div>
      ))
    const { fetch } = await createTestThings({ ssr: true, points: [root, page] })
    const response = await fetch(page.route.get({}, { origin: 'http://localhost' }))
    expect(response.status).toBe(200)
    expect(response.headers.get('y')).toBe('3')
    expect(await response.text()).toBe('custom response')
  })

  it.concurrent('throws error', async () => {
    const root = Point0.lets('root', 'root')
      .middleware(async ({ set, next }) => {
        set.headers('y', '3')
        return await next()
      })
      .middleware(async () => {
        throw new Error('custom error')
      })

      .root()
    const page = root
      .lets('page', 'home', '/')
      .loader(({ set }) => ({ x: 1, y: set.inspect.headers.y, z: set.inspect.headers.z }))
      .page(({ data }) => (
        <div id="page">
          x={data.x},y={data.y},z={data.z}
        </div>
      ))
    const { fetch } = await createTestThings({ ssr: true, points: [root, page] })
    const response = await fetch(page.route.get({}, { origin: 'http://localhost' }))
    expect(response.status).toBe(500)
    expect(response.headers.get('y')).toBe('3')
    expect(await response.text()).toContain('custom error')
  })

  it.concurrent('throws error with status code', async () => {
    const root = Point0.lets('root', 'root')
      .middleware(async ({ set, next }) => {
        set.headers('y', '3')
        return await next()
      })
      .middleware(async () => {
        throw new ErrorPoint0('restricted error', { status: 403 })
      })

      .root()
    const page = root
      .lets('page', 'home', '/')
      .loader(({ set }) => ({ x: 1, y: set.inspect.headers.y, z: set.inspect.headers.z }))
      .page(({ data }) => (
        <div id="page">
          x={data.x},y={data.y},z={data.z}
        </div>
      ))
    const { fetch } = await createTestThings({ ssr: true, points: [root, page] })
    const response = await fetch(page.route.get({}, { origin: 'http://localhost' }))
    expect(response.status).toBe(403)
    expect(response.headers.get('y')).toBe('3')
    expect(await response.text()).toContain('restricted error')
  })

  it.concurrent('override final response', async () => {
    const root = Point0.lets('root', 'root')
      .middleware(async ({ set, next }) => {
        set.headers('y', '3')
        return await next()
      })
      .middleware(async ({ next }) => {
        const result = await next()
        if (result.variant.type === 'page') {
          return new Response('overriden page response', { status: 200 })
        }
        return result
      })
      .root()
    const page = root
      .lets('page', 'home', '/')
      .loader(({ set }) => ({ x: 1, y: set.inspect.headers.y, z: set.inspect.headers.z }))
      .page(({ data }) => (
        <div id="page">
          x={data.x},y={data.y},z={data.z}
        </div>
      ))
    const { fetch } = await createTestThings({ ssr: true, points: [root, page] })
    const response = await fetch(page.route.get({}, { origin: 'http://localhost' }))
    expect(response.status).toBe(200)
    expect(response.headers.get('y')).toBe('3')
    expect(await response.text()).toContain('overriden page response')
  })

  it.concurrent('applied only to specific point', async () => {
    const calledMiddlewres: string[] = []
    const root = Point0.lets('root', 'root')
      .middleware(async ({ next }) => {
        calledMiddlewres.push('root')
        return await next()
      })

      .root()
    const page1 = root
      .lets('page', 'home1', '/home1')
      .middleware(async ({ next }) => {
        calledMiddlewres.push('page1')
        return await next()
      })
      .loader(() => ({ x: 1 }))
      .page(({ data }) => <div id="page1">x={data.x}</div>)
    const page2 = root
      .lets('page', 'home2', '/home2')
      .middleware(async ({ next }) => {
        calledMiddlewres.push('page2')
        return await next()
      })
      .loader(() => ({ y: 2 }))
      .page(({ data }) => <div id="page2">y={data.y}</div>)

    const { fetchPreview, fetchesTale, fetchRecorder } = await createTestThings({
      ssr: true,
      points: [root, page1, page2],
    })

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

  it.concurrent('available by route', async () => {
    const root = Point0.lets('root', 'root')
      .middleware('/zxc/:id', async ({ params }) => {
        expectTypeOf<typeof params>().toEqualTypeOf<{ id: string }>()
        expect(params).toEqual({ id: '123' })
        return Response.json({ id: params.id }, { status: 201 })
      })
      .root()
    const { engine } = await createTestThings({ ssr: true, points: [root] })
    const response1 = await engine.fetch('http://localhost:3001/zxc/123', { method: 'POST' })
    expect(response1.status).toBe(201)
    expect(await response1.json()).toEqual({ id: '123' })
    const response2 = await engine.fetch('http://localhost:3001/zxc/123', { method: 'PUT' })
    expect(response2.status).toBe(201)
    expect(await response2.json()).toEqual({ id: '123' })
  })

  it.concurrent('available by method and route', async () => {
    const root = Point0.lets('root', 'root')
      .middleware('POST', '/zxc/:id', async ({ params }) => {
        expectTypeOf<typeof params>().toEqualTypeOf<{ id: string }>()
        expect(params).toEqual({ id: '123' })
        return Response.json({ id: params.id }, { status: 201 })
      })
      .root()
    const { engine } = await createTestThings({ ssr: true, points: [root] })
    const response1 = await engine.fetch('http://localhost:3001/zxc/123', { method: 'POST' })
    expect(response1.status).toBe(201)
    expect(await response1.json()).toEqual({ id: '123' })
    const response2 = await engine.fetch('http://localhost:3001/zxc/123', {
      method: 'PUT',
      headers: { Accept: 'application/json' },
    })
    expect(response2.status).toBe(404)
    expect(await response2.json()).toMatchObject({ message: 'Not Found' })
  })

  it.concurrent('available by methods and route', async () => {
    const root = Point0.lets('root', 'root')
      .middleware(['POST', 'PUT'], '/zxc/:id', async ({ params }) => {
        expectTypeOf<typeof params>().toEqualTypeOf<{ id: string }>()
        expect(params).toEqual({ id: '123' })
        return Response.json({ id: params.id }, { status: 201 })
      })
      .root()

    const { engine } = await createTestThings({ ssr: true, points: [root] })
    const response1 = await engine.fetch('http://localhost:3001/zxc/123', { method: 'POST' })
    expect(response1.status).toBe(201)
    expect(await response1.json()).toEqual({ id: '123' })

    const response2 = await engine.fetch('http://localhost:3001/zxc/123', { method: 'PUT' })
    expect(response2.status).toBe(201)
    expect(await response2.json()).toEqual({ id: '123' })

    const response3 = await engine.fetch('http://localhost:3001/zxc/123', {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
    })
    expect(response3.status).toBe(404)
    expect(await response3.json()).toMatchObject({ message: 'Not Found' })
  })
})
