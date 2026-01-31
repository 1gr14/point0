import { Point0 } from '@point0/core'
import { describe, expect, it } from 'bun:test'
import { createTestThings } from './utils/internal-testing.js'

describe('plugin', () => {
  it('merges ctx', async () => {
    const plugin = Point0.lets('plugin', 'test-plugin')
      .ctx(() => ({ plugin: 'ok1' }))
      .plugin()
    const root = Point0.lets('root', 'root')
      .ctx(() => ({ rootBefore: 'ok2' }))
      .use(plugin)
      .ctx(() => ({ rootAfter: 'ok3' }))
      .root()
    const page = root
      .lets('page', 'home', '/')
      .ctx(() => ({ page: 'ok4' }))
      .loader(({ ctx }) => ({
        plugin: ctx.plugin,
        rootBefore: ctx.rootBefore,
        rootAfter: ctx.rootAfter,
        page: ctx.page,
      }))
      .page()

    const { loadPointYml } = await createTestThings({ points: [root, page] })
    expect(await loadPointYml(page)).toMatchInlineSnapshot(`
      "
      page: ok4
      plugin: ok1
      rootAfter: ok3
      rootBefore: ok2
      "
    `)
  })

  it('merges ctx with exposed keys', async () => {
    const plugin = Point0.lets('plugin', 'test-plugin')
      .ctx(() => ({ plugin: 'ok1' }))
      .ctx(() => [{ pluginExposed: 'ok9' }])
      .plugin()
    const root = Point0.lets('root', 'root')
      .ctx(() => ({ rootBefore: 'ok2' }))
      .use(plugin)
      .ctx(() => ({ rootAfter: 'ok3' }))
      .root()
    const page = root
      .lets('page', 'home', '/')
      .ctx(() => ({ page: 'ok4' }))
      .loader(({ ctx, pluginExposed }) => ({
        plugin: ctx.plugin,
        rootBefore: ctx.rootBefore,
        rootAfter: ctx.rootAfter,
        page: ctx.page,
        pluginExposed,
        pluginExposedInCtx: ctx.pluginExposed,
      }))
      .page()

    const { loadPointYml } = await createTestThings({ points: [root, page] })
    expect(await loadPointYml(page)).toMatchInlineSnapshot(`
      "
      page: ok4
      plugin: ok1
      pluginExposed: ok9
      pluginExposedInCtx: ok9
      rootAfter: ok3
      rootBefore: ok2
      "
    `)
  })

  it('merges middlewares', async () => {
    const plugin = Point0.lets('plugin', 'test-plugin')
      .middleware(async ({ next, request }) => {
        request.state.x = [request.state.x, 'plugin'].join(',')
        return await next()
      })
      .plugin()
    const root = Point0.lets('root', 'root')
      .middleware(async ({ next, request }) => {
        request.state.x = [request.state.x, 'rootBefore'].join(',')
        return await next()
      })
      .use(plugin)
      .middleware(async ({ next, request }) => {
        request.state.x = [request.state.x, 'rootAfter'].join(',')
        return await next()
      })
      .root()
    const page = root
      .lets('page', 'home', '/')
      .ctx(() => ({ page: 'ok4' }))
      .loader(({ ctx, request }) => ({
        x: request.state.x,
      }))
      .page()

    const { loadPointYml } = await createTestThings({ points: [root, page] })
    expect(await loadPointYml(page)).toMatchInlineSnapshot(`
      "
      x: ",rootBefore,plugin,rootAfter"
      "
    `)
  })
})
