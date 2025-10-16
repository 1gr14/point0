import { Route0 } from '@devp0nt/route0'
import { afterEach, beforeEach, describe, expect, expectTypeOf, it } from 'bun:test'
import * as nodeFs from 'node:fs'
import * as nodePath from 'node:path'
import { ClientPage0 } from './client-page.js'
import { ServerPage0 } from './server-page.js'
import type { EmptyCtx, EmptyData, UndefinedCtx } from './shared.js'

describe('ClientPage0', () => {
  const testDir = nodePath.join(__dirname, 'test-temp')

  beforeEach(() => {
    nodeFs.mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    nodeFs.rmSync(testDir, { recursive: true, force: true })
  })

  it('creates an empty instance', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const serverPage0 = new ServerPage0().ctx(() => ({
      a: 1,
      b: 2,
    }))
    const clientPage0 = new ClientPage0<typeof serverPage0>()
    expect(clientPage0).toBeInstanceOf(ClientPage0)
    expectTypeOf(clientPage0).toEqualTypeOf<ClientPage0>()
    expectTypeOf(clientPage0).toEqualTypeOf<ClientPage0<UndefinedCtx, EmptyCtx, EmptyData>>()
    expect(clientPage0.extendFns).toEqual([])
  })

  it('creates ready page', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const serverPage0 = new ServerPage0()
      .ctx(() => ({
        a: 1,
        b: 2,
        say: (text: string) => `server says ${text}!`,
        hello: (name: string) => `server says hello to ${name}!`,
      }))
      .loader(({ data }) => ({
        preloadedServer: 'something',
      }))
    const clientPage0 = new ClientPage0<typeof serverPage0, { r: number }>()
      // ctx is client only in ctx fns
      .ctx(({ ctx }) => ({
        ...ctx,
        addedToServerFromClient: 'something',
      }))
      .ctx(({ ctx }) => ({
        ...ctx,
        hello: (name: string) => `client says hello to ${name}!`,
        b: 'b',
        sum: async (a: number, b: number) => a + b,
      }))
      // but in loaders ctx is both server and client
      .loader(async ({ ctx, data }) => ({
        ...data,
        preloadedClient: 'something',
        preloadedClientFromServer: await ctx.server.say('something good'),
      }))
    const routeX = Route0.create('/my/:id')
    const pageX = clientPage0
      .route(routeX)
      .ctx(({ ctx, location }) => ({
        ...ctx,
        loadedCtxAfterRoute: `something: ${location.params.id}`,
      }))
      .loader(({ data, location }) => ({
        ...data,
        loadedDataAfterRoute: `something: ${location.params.id}`,
      }))
      .component(({ data }) => {
        return <pre>{JSON.stringify(data, null, 2)}</pre>
      })
  })
})
