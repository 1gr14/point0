import type { Prettify } from '@point0/core'
import { Point0 } from '@point0/core'
import { describe, expect, expectTypeOf, it } from 'bun:test'
import { createTestThings, ymlifyline } from './utils/internal-testing.js'
import { z } from 'zod'

describe('plugin', () => {
  it.concurrent('merges ctx', async () => {
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

  it.concurrent('merges ctx with exposed keys', async () => {
    const plugin = Point0.lets('plugin', 'test-plugin')
      .ctx(() => ({ plugin: 'ok1' }))
      .ctx(() => [{ pluginExposed: 'ok9' }])
      .plugin()
    const root = Point0.lets('root', 'root')
      .ctx(() => ({ rootBefore: 'ok2' }))
      .use(plugin)
      .ctx(() => [{ rootAfter: 'ok3' }])
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

  it.concurrent('merges middlewares', async () => {
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

  it.concurrent('merges props', async () => {
    const plugin = Point0.lets('plugin', 'test-plugin')
      .with(() => {
        return { plugin: 'ok1' }
      })
      .plugin()
    const root = Point0.lets('root', 'root')
      .ssr(true)
      .baseurl('http://localhost/')
      .with(() => ({ rootBefore: 'ok2' }))
      .use(plugin)
      .with(() => ({ rootAfter: 'ok3' }))
      .root()
    const page = root
      .lets('page', 'home', '/')
      .with(() => ({ page: 'ok4' }))
      .page(({ props }) => <div id="page">{ymlifyline(props)}</div>)

    const { fetchPreview } = await createTestThings({ points: [root, page] })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #page: rootBefore: ok2, plugin: ok1, rootAfter: ok3, page: ok4
      "
    `)
  })

  it.concurrent('merges input', async () => {
    const plugin = Point0.lets('plugin', 'test-plugin')
      .input(z.object({ plugin: z.number() }))
      .plugin()
    const root = Point0.lets('root', 'root').ssr(true).baseurl('http://localhost/').root()
    const query = root
      .lets('query', 'test')
      .use(plugin)
      .input(z.object({ query: z.number() }))
      .loader(({ input }) => {
        expectTypeOf<Prettify<typeof input>>().toEqualTypeOf<{ plugin: number; query: number }>()
        return input
      })
      .query()
    const page = root
      .lets('page', 'home', '/')
      .with(query, { plugin: 123, query: 456 })
      .page(({ data }) => <div id="page">{ymlifyline(data)}</div>)

    const { fetchPreview } = await createTestThings({ points: [root, page, query] })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #page: plugin: 123, query: 456
      "
    `)
  })
})
