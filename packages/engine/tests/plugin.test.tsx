import type { Prettify } from '@point0/core'
import { Point0 } from '@point0/core'
import { describe, expect, expectTypeOf, it } from 'bun:test'
import { createTestThings, ymlify, ymlifyline } from './utils/internal-testing.js'
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

  it.concurrent('not get outside ctx, but keep ctx inside', async () => {
    const plugin = Point0.lets('plugin', 'test-plugin')
      .ctx(() => ({ plugin1: 'plugin1' }))
      .ctx(({ ctx }) => {
        expectTypeOf(ctx).toHaveProperty('plugin1')
        expectTypeOf(ctx).not.toHaveProperty('page1')
        return {
          plugin2: 'plugin2',
          plugin21: ctx.plugin1,
          pluginPage1: (ctx as any).page1 ?? '❌',
          pluginPage2: (ctx as any).page2 ?? '❌',
        }
      })
      .plugin()
    const root = Point0.lets('root', 'root').ssr(true).baseurl('http://localhost/').root()
    const page = root
      .lets('page', 'home', '/')
      .ctx(() => ({ page1: 'page1' }))
      .ctx(({ ctx }) => {
        expectTypeOf(ctx).toHaveProperty('page1')
        return { page2: 'page2', page21: ctx.page1 }
      })
      .use(plugin)
      .ctx(({ ctx }) => {
        expectTypeOf(ctx.page1).toEqualTypeOf<string>()
        expectTypeOf(ctx.page2).toEqualTypeOf<string>()
        expectTypeOf(ctx.plugin2).toEqualTypeOf<string>()
        expectTypeOf(ctx.plugin21).toEqualTypeOf<string>()
        return { page3: 'page3' }
      })
      .loader(({ ctx }) => {
        return ctx
      })
      .page(({ data }) => <div id="page">{ymlify(data)}</div>)

    const { fetchPreview } = await createTestThings({ points: [root, page] })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #page: page1: page1
      page2: page2
      page21: page1
      page3: page3
      plugin1: plugin1
      plugin2: plugin2
      plugin21: plugin1
      pluginPage1: ❌
      pluginPage2: ❌
      "
    `)
  })

  it.concurrent('nested plugin ctx', async () => {
    const plugin1 = Point0.lets('plugin', 'test-plugin1')
      .ctx(() => ({ plugin1: 'plugin1' }))
      .plugin()
    const plugin2 = Point0.lets('plugin', 'test-plugin2')
      .use(plugin1)
      .ctx(({ ctx }) => ({ plugin2: 'plugin2', plugin21: ctx.plugin1 }))
      .plugin()
    const root = Point0.lets('root', 'root').ssr(true).baseurl('http://localhost/').root()
    const page = root
      .lets('page', 'home', '/')
      .use(plugin2)
      .ctx(({ ctx }) => {
        expectTypeOf(ctx.plugin2).toEqualTypeOf<string>()
        expectTypeOf(ctx.plugin21).toEqualTypeOf<string>()
        return { page3: 'page3' }
      })
      .loader(({ ctx }) => {
        return ctx
      })
      .page(({ data }) => <div id="page">{ymlify(data)}</div>)

    const { fetchPreview } = await createTestThings({ points: [root, page] })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #page: page3: page3
      plugin1: plugin1
      plugin2: plugin2
      plugin21: plugin1
      "
    `)
  })

  it.concurrent('not get outside props, but keep props inside', async () => {
    const plugin = Point0.lets('plugin', 'test-plugin')
      .with(() => ({ plugin1: 'plugin1' }))
      .with(({ props }) => {
        expectTypeOf(props).toHaveProperty('plugin1')
        expectTypeOf(props).not.toHaveProperty('page1')
        return {
          plugin2: 'plugin2',
          plugin21: props.plugin1,
          pluginPage1: (props as any).page1 ?? '❌',
          pluginPage2: (props as any).page2 ?? '❌',
        }
      })
      .plugin()
    const root = Point0.lets('root', 'root').ssr(true).baseurl('http://localhost/').root()
    const page = root
      .lets('page', 'home', '/')
      .with(() => ({ page1: 'page1' }))
      .with(({ props }) => {
        expectTypeOf(props).toHaveProperty('page1')
        return { page2: 'page2', page21: props.page1 }
      })
      .use(plugin)
      .with(({ props }) => {
        expectTypeOf(props.page1).toEqualTypeOf<string>()
        expectTypeOf(props.page2).toEqualTypeOf<string>()
        expectTypeOf(props.plugin2).toEqualTypeOf<string>()
        expectTypeOf(props.plugin21).toEqualTypeOf<string>()
        return { page3: 'page3' }
      })
      .page(({ props }) => <div id="page">{ymlify(props)}</div>)

    const { fetchPreview } = await createTestThings({ points: [root, page] })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #page: page1: page1
      page2: page2
      page21: page1
      plugin1: plugin1
      plugin2: plugin2
      plugin21: plugin1
      pluginPage1: page1
      pluginPage2: page2
      page3: page3
      "
    `)
  })

  it.concurrent.only('nested plugin props', async () => {
    const plugin1 = Point0.lets('plugin', 'test-plugin1')
      .with(() => ({ plugin1: 'plugin1' }))
      .plugin()
    const plugin2 = Point0.lets('plugin', 'test-plugin2')
      .use(plugin1)
      .with(({ props }) => ({ plugin2: 'plugin2', plugin21: props.plugin1 }))
      .plugin()
    const root = Point0.lets('root', 'root').ssr(true).baseurl('http://localhost/').root()
    const page = root
      .lets('page', 'home', '/')
      .use(plugin2)
      .with(({ props }) => {
        expectTypeOf(props.plugin2).toEqualTypeOf<string>()
        expectTypeOf(props.plugin21).toEqualTypeOf<string>()
        return { page3: 'page3' }
      })
      .page(({ props }) => <div id="page">{ymlify(props)}</div>)

    const { fetchPreview } = await createTestThings({ points: [root, page] })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #page: plugin1: plugin1
      plugin2: plugin2
      plugin21: plugin1
      page3: page3
      "
    `)
  })
})
