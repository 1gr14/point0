// circular, inconvinient

// /* eslint-disable @typescript-eslint/no-unnecessary-type-arguments */
// import { afterEach, beforeEach, describe, expect, expectTypeOf, it } from 'bun:test'
// import * as nodeFs from 'node:fs'
// import * as nodePath from 'node:path'
// import type { UndefinedCtx, EmptyData, EmptyCtx } from './types.js'
// import { Page0 } from './page.js'
// import { Route0 } from '@devp0nt/route0'
// import { afterEach, beforeEach, describe, expect, expectTypeOf, it } from 'bun:test'
// import * as nodeFs from 'node:fs'
// import * as nodePath from 'node:path'
// import type { EmptyCtx, EmptyData } from './types.js'

// describe('ServerPage0', () => {
//   const testDir = nodePath.join(__dirname, 'test-temp')

//   beforeEach(() => {
//     nodeFs.mkdirSync(testDir, { recursive: true })
//   })

//   afterEach(() => {
//     nodeFs.rmSync(testDir, { recursive: true, force: true })
//   })

//   it('creates an empty instance', () => {
//     const serverPage0 = new Page0()
//     expect(serverPage0).toBeInstanceOf(Page0)
//     expectTypeOf(serverPage0).toEqualTypeOf<Page0>()
//     expectTypeOf(serverPage0).toEqualTypeOf<Page0<UndefinedCtx, EmptyCtx, EmptyData>>()
//     expect(serverPage0.extendFns).toEqual([])
//   })

//   it('extends with ctx fn', () => {
//     const serverPage0 = new Page0()
//     const serverPage01 = serverPage0.ctx(() => ({
//       a: 1,
//       b: 2,
//     }))
//     expect(serverPage01).toBeInstanceOf(Page0)

//     expectTypeOf(serverPage01).toEqualTypeOf<Page0<UndefinedCtx, { a: number; b: number }, EmptyData>>()
//     expect(serverPage01.extendFns).toHaveLength(1)
//     // not modified original serverPage0
//     expect(serverPage0.extendFns).toHaveLength(0)
//     const serverPage02 = serverPage01.ctx(({ ctx }) => ({
//       ...ctx,
//       a: 3,
//       c: 4,
//     }))
//     expect(serverPage02).toBeInstanceOf(Page0)

//     expectTypeOf(serverPage02).toEqualTypeOf<
//       Page0<UndefinedCtx, { a: number; b: number; c: number }, EmptyData>
//     >()
//     expect(serverPage02.extendFns).toHaveLength(2)
//     // not modified original serverPage01
//     expect(serverPage01.extendFns).toHaveLength(1)
//     // not modified original serverPage0
//     expect(serverPage0.extendFns).toHaveLength(0)
//   })

//   it('extends with loader fn', () => {
//     const serverPage0 = new Page0()
//     const serverPage01 = serverPage0.loader(() => ({
//       a: 1,
//       b: 2,
//     }))
//     expect(serverPage01).toBeInstanceOf(Page0)
//     expectTypeOf(serverPage01).toEqualTypeOf<Page0<UndefinedCtx, EmptyCtx, { a: number; b: number }>>()
//     expect(serverPage01.extendFns).toHaveLength(1)
//     // not modified original serverPage0
//     expect(serverPage0.extendFns).toHaveLength(0)
//     const serverPage02 = serverPage01.loader(({ data }) => ({
//       ...data,
//       a: 3,
//       c: 4,
//     }))
//     expect(serverPage02).toBeInstanceOf(Page0)
//     expectTypeOf(serverPage02).toEqualTypeOf<Page0<UndefinedCtx, EmptyCtx, { a: number; b: number; c: number }>>()
//     expect(serverPage02.extendFns).toHaveLength(2)
//     // not modified original serverPage01
//     expect(serverPage01.extendFns).toHaveLength(1)
//     // not modified original serverPage0
//     expect(serverPage0.extendFns).toHaveLength(0)
//   })

//   it('extract ctx', async () => {
//     const serverPage0 = new Page0()
//     const url = '/z/x/c'
//     const serverPage01 = serverPage0.ctx(() => ({
//       a: 1,
//       b: 2,
//     }))
//     expect(await serverPage01.prepare(url)).toEqual({
//       output: {
//         ctx: {
//           a: 1,
//           b: 2,
//         },
//         data: {},
//       },
//       error: undefined,
//     })
//     const serverPage02 = serverPage01.ctx(({ ctx }) => ({
//       ...ctx,
//       a: 3,
//       c: 4,
//     }))
//     expect(await serverPage02.prepare(url)).toEqual({
//       output: {
//         ctx: {
//           a: 3,
//           b: 2,
//           c: 4,
//         },
//         data: {},
//       },
//       error: undefined,
//     })
//     const serverPage03 = serverPage01.ctx(({ ctx }) => ({
//       c: 5,
//     }))
//     expect(await serverPage03.prepare(url)).toEqual({
//       output: {
//         ctx: {
//           c: 5,
//         },
//         data: {},
//       },
//       error: undefined,
//     })
//   })

//   it('extract ctx with required ctx input', async () => {
//     const serverPage0 = new Page0<{ r: string }>()
//     const url = '/z/x/c'
//     const serverPage01 = serverPage0.ctx(({ ctx }) => ({
//       ...ctx,
//       a: 1,
//       b: 2,
//     }))
//     expect(await serverPage01.prepare(url, { r: 'str' })).toEqual({
//       output: {
//         ctx: {
//           r: 'str',
//           a: 1,
//           b: 2,
//         },
//         data: {},
//       },
//       error: undefined,
//     })
//     const serverPage02 = serverPage01.ctx(({ ctx }) => ({
//       ...ctx,
//       a: 3,
//       c: 4,
//     }))
//     expect(await serverPage02.prepare(url, { r: 'str' })).toEqual({
//       output: {
//         ctx: {
//           r: 'str',
//           a: 3,
//           b: 2,
//           c: 4,
//         },
//         data: {},
//       },
//       error: undefined,
//     })
//     const serverPage03 = serverPage01.ctx(({ ctx }) => ({
//       r: ctx.r,
//       c: 5,
//     }))
//     expect(await serverPage03.prepare(url, { r: 'str' })).toEqual({
//       output: {
//         ctx: {
//           r: 'str',
//           c: 5,
//         },
//         data: {},
//       },
//       error: undefined,
//     })
//   })
// })

// describe('ClientPage0', () => {
//   const testDir = nodePath.join(__dirname, 'test-temp')

//   beforeEach(() => {
//     nodeFs.mkdirSync(testDir, { recursive: true })
//   })

//   afterEach(() => {
//     nodeFs.rmSync(testDir, { recursive: true, force: true })
//   })

//   it('creates an empty instance', () => {
//     // eslint-disable-next-line @typescript-eslint/no-unused-vars
//     const serverPage0 = new ServerPage0()
//     const clientPage0 = new ClientPage0<typeof serverPage0>()
//     expect(clientPage0).toBeInstanceOf(ClientPage0)
//     expectTypeOf(clientPage0).toEqualTypeOf<ClientPage0<typeof serverPage0>>()
//     expectTypeOf(clientPage0).toEqualTypeOf<ClientPage0<typeof serverPage0, EmptyCtx, EmptyData>>()
//     expect(clientPage0._extendFns).toEqual([])
//   })

//   it('creates ready page', () => {
//     // eslint-disable-next-line @typescript-eslint/no-unused-vars
//     const serverPage0 = new ServerPage0()
//       .ctx(() => ({
//         a: 1,
//         b: 2,
//         say: async (text: string) => `server says ${text}!`,
//         hello: (name: string) => `server says hello to ${name}!`,
//       }))
//       .loader(({ data, ctx }) => ({
//         preloadedServer: 10,
//       }))
//     const clientPage0 = new ClientPage0<typeof serverPage0>()
//       // ctx is client only in ctx fns
//       .ctx(({ ctx }) => ({
//         ...ctx,
//         addedToServerFromClient: 'something',
//       }))
//       .ctx(({ ctx }) => ({
//         ...ctx,
//         hello: (name: string) => `client says hello to ${name}!`,
//         b: 'b',
//         sum: async (a: number, b: number) => a + b,
//       }))
//       // but in loaders ctx is both server and client
//       .loader(async ({ ctx, data, location }) => ({
//         ...data,
//         preloadedClient: 'something',
//         preloadedClientFromServer: await ctx.say('something good'),
//       }))
//     const routeX = Route0.create('/my/:id')
//     const pageX = clientPage0
//       .route(routeX)
//       .ctx(({ ctx, location }) => ({
//         ...ctx,
//         loadedCtxAfterRoute: `something: ${location.params.id}`,
//       }))
//       .loader(({ data, location }) => ({
//         ...data,
//         loadedDataAfterRoute: `something: ${location.params.id}`,
//       }))
//       .component(({ data, location }) => {
//         expectTypeOf(location).toEqualTypeOf<Route0.Location<typeof routeX>>()
//         expectTypeOf(data).toEqualTypeOf<{
//           loadedDataAfterRoute: string
//           preloadedClient: string
//           preloadedClientFromServer: string
//           preloadedServer: number
//         }>()
//         return (
//           <div>
//             <pre>DATA: {JSON.stringify(data, null, 2)}</pre>
//             <pre>LOCATION: {JSON.stringify(location, null, 2)}</pre>
//           </div>
//         )
//       })
//     expect(pageX.getRoute()).toEqual(routeX)
//     expect(pageX.getComponent()).toEqual(expect.any(Function))
//   })
// })
