import { Point0 } from '@point0/core'
import { describe, expect, expectTypeOf, it } from 'bun:test'
import { z } from 'zod'
import { createTestThings, ymlify, ymlifyline } from './utils/internal-testing.js'

describe('plugin', () => {
  const createRoot = () =>
    Point0.lets('root', 'root')
      .loading(() => <div id="loading">...</div>)
      .error(({ error }) => <div id="error">{error.message}</div>)
      .queryOptions({
        retry: false,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchInterval: false,
        refetchIntervalInBackground: false,
      })
      .root()

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
      .ctx(() => ({ pluginExposed: 'ok9' }), true)
      .plugin()
    const root = Point0.lets('root', 'root')
      .ctx(() => ({ rootBefore: 'ok2' }))
      .use(plugin)
      .ctx(() => ({ rootAfter: 'ok3' }), true)
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
      .loader(({ request }) => ({
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
      .with(() => ({ rootBefore: 'ok2' }))
      .use(plugin)
      .with(() => ({ rootAfter: 'ok3' }))
      .root()
    const page = root
      .lets('page', 'home', '/')
      .with(() => ({ page: 'ok4' }))
      .page(({ props }) => <div id="page">{ymlifyline(props)}</div>)

    const { fetchPreview } = await createTestThings({ ssr: true, points: [root, page] })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #page: rootBefore: ok2, plugin: ok1, rootAfter: ok3, page: ok4
      "
    `)
  })

  it.concurrent('merges input', async () => {
    const plugin = Point0.lets('plugin', 'test-plugin')
      .input(z.object({ plugin: z.number().transform((v) => v * 2) }))
      .plugin()
    const root = Point0.lets('root', 'root').root()
    const query = root
      .lets('query', 'test')
      .use(plugin)
      .input(z.object({ query: z.number().transform((v) => v * 3) }))
      .loader(({ input }) => {
        expectTypeOf<typeof input>().toEqualTypeOf<{ plugin: number; query: number }>()
        expect(input.plugin).toBe(200)
        expect(input.query).toBe(600)
        return input
      })
      .query()
    const page = root
      .lets('page', 'home', '/')
      .with(query, { plugin: 100, query: 200 })
      .page(({ data }) => <div id="page">{ymlifyline(data)}</div>)

    const { fetchPreview } = await createTestThings({ ssr: true, points: [root, page, query] })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #page: plugin: 200, query: 600
      "
    `)
  })

  it.concurrent('merges headers', async () => {
    const plugin = Point0.lets('plugin', 'test-plugin')
      .headers(z.object({ 'x-plugin': z.string().transform((v) => +v * 2) }))
      .plugin()
    const root = Point0.lets('root', 'root').root()
    const query = root
      .lets('query', 'test')
      .use(plugin)
      .fetchOptions(() => ({ headers: { 'X-Plugin': '100' } }))
      .loader(({ headers }) => {
        expectTypeOf<typeof headers>().toEqualTypeOf<{ 'x-plugin': number }>()
        expect(headers['x-plugin']).toBe(200)
        return headers
      })
      .query()
    const page = root
      .lets('page', 'home', '/')
      .with(query)
      .page(({ data }) => <div id="page">{ymlifyline(data)}</div>)

    const { fetchPreview } = await createTestThings({ ssr: true, points: [root, page, query] })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #page: x-plugin: 200
      "
    `)
  })

  it.concurrent('merges search', async () => {
    const plugin = Point0.lets('plugin', 'test-plugin')
      .search(z.object({ plugin: z.string().transform((v) => +v * 2) }))
      .plugin()
    const root = Point0.lets('root', 'root').root()
    const action = root
      .lets('action', 'test', 'GET', '/test')
      .use(plugin)
      .loader(({ search }) => {
        expectTypeOf<typeof search>().toEqualTypeOf<{ plugin: number }>()
        expect(search.plugin).toBe(200)
        return search
      })
      .query()
    const page = root
      .lets('page', 'home', '/')
      .with(action, { search: { plugin: '100' } })
      .page(({ data }) => <div id="page">{ymlifyline(data)}</div>)

    const { fetchPreview } = await createTestThings({ ssr: true, points: [root, page, action] })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #page: plugin: 200
      "
    `)
  })

  it.concurrent('merges body', async () => {
    const plugin = Point0.lets('plugin', 'test-plugin')
      .body(z.object({ plugin: z.number().transform((v) => v * 2) }))
      .plugin()
    const root = Point0.lets('root', 'root').root()
    const action = root
      .lets('action', 'test', 'GET', '/test')
      .use(plugin)
      .loader(({ body }) => {
        expectTypeOf<typeof body>().toEqualTypeOf<{ plugin: number }>()
        expect(body.plugin).toBe(200)
        return body
      })
      .query()
    const page = root
      .lets('page', 'home', '/')
      .with(action, { body: { plugin: 100 } })
      .page(({ data }) => <div id="page">{ymlifyline(data)}</div>)

    const { fetchPreview } = await createTestThings({ ssr: true, points: [root, page, action] })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #page: plugin: 200
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
    const root = Point0.lets('root', 'root').root()
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

    const { fetchPreview } = await createTestThings({ ssr: true, points: [root, page] })
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
    const root = Point0.lets('root', 'root').root()
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

    const { fetchPreview } = await createTestThings({ ssr: true, points: [root, page] })
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
    const root = Point0.lets('root', 'root').root()
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

    const { fetchPreview } = await createTestThings({ ssr: true, points: [root, page] })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #page: page1: page1
      page2: page2
      page21: page1
      plugin1: plugin1
      plugin2: plugin2
      plugin21: plugin1
      pluginPage1: ❌
      pluginPage2: ❌
      page3: page3
      "
    `)
  })

  it.concurrent('nested plugin props', async () => {
    const plugin1 = Point0.lets('plugin', 'test-plugin1')
      .with(() => ({ plugin1: 'plugin1' }))
      .plugin()
    const plugin2 = Point0.lets('plugin', 'test-plugin2')
      .use(plugin1)
      .with(({ props }) => ({ plugin2: 'plugin2', plugin21: props.plugin1 }))
      .plugin()
    const root = Point0.lets('root', 'root').root()
    const page = root
      .lets('page', 'home', '/')
      .use(plugin2)
      .with(({ props }) => {
        expectTypeOf(props.plugin2).toEqualTypeOf<string>()
        expectTypeOf(props.plugin21).toEqualTypeOf<string>()
        return { page3: 'page3' }
      })
      .page(({ props }) => <div id="page">{ymlify(props)}</div>)

    const { fetchPreview } = await createTestThings({ ssr: true, points: [root, page] })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #page: plugin1: plugin1
      plugin2: plugin2
      plugin21: plugin1
      page3: page3
      "
    `)
  })

  it.concurrent('merges head', async () => {
    const plugin = Point0.lets('plugin', 'test-plugin')
      .input(z.object({ plugin: z.number() }))
      .plugin()
    const root = Point0.lets('root', 'root').root()
    const query = root
      .lets('query', 'test')
      .use(plugin)
      .input(z.object({ query: z.number() }))
      .loader(({ input }) => {
        expectTypeOf<typeof input>().toEqualTypeOf<{ plugin: number; query: number }>()
        return input
      })
      .query()
    const page = root
      .lets('page', 'home', '/')
      .with(query, { plugin: 123, query: 456 })
      .page(({ data }) => <div id="page">{ymlifyline(data)}</div>)

    const { fetchPreview } = await createTestThings({ ssr: true, points: [root, page, query] })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #page: plugin: 123, query: 456
      "
    `)
  })

  // related queries are allowed inside plugins too; the actions merge into whatever mountable `.use()`s
  // the plugin, and the input getter receives `location` (typed as `AnyLocation` — a plugin is not bound
  // to a single route).

  it('allows a related query inside a plugin', async () => {
    const root = createRoot()
    const query = root
      .lets('query', 'test')
      .loader(() => ({ x: 1 }))
      .query()
    const plugin = Point0.lets('plugin', 'test-plugin').relatedQuery(query).plugin()
    const page = root
      .lets('page', 'home', '/home')
      .use(plugin)
      .page(({ data }) => <div id="page">{ymlify(data)}</div>)

    const { render, fetchesTale } = await createTestThings({ ssr: true, points: [root, page, query] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /home
          #loading: ...

          #page: x: 1
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      query.test (client) < {}
      "
    `)
  })

  it('related query inside a plugin receives location', async () => {
    const root = createRoot()
    const query = root
      .lets('query', 'test')
      .input(z.object({ path: z.string() }))
      .loader(({ input }) => ({ x: input.path }))
      .query()
    // `location` here is `AnyLocation` (a plugin is not bound to a route), so `location.pathname` is typed
    const plugin = Point0.lets('plugin', 'test-plugin')
      .relatedQuery(query, ({ location }) => ({ path: location.pathname }))
      .plugin()
    const page = root
      .lets('page', 'home', '/home')
      .use(plugin)
      .page(({ data }) => <div id="page">{ymlify(data)}</div>)

    const { render, fetchesTale } = await createTestThings({ ssr: true, points: [root, page, query] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /home
          #loading: ...

          #page: x: /home
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      query.test (client) < {"path":"/home"}
      "
    `)
  })

  it('page recognizes a search key contributed by a plugin (getQueryKey routing)', () => {
    const root = Point0.lets('root', 'root').root()
    const searchPlugin = Point0.lets('plugin', 'search-plugin')
      .search(z.object({ q: z.string().optional() }))
      .plugin()
    const page = root
      .lets('page', 'via-plugin', '/via-plugin')
      .use(searchPlugin)
      .loader(() => ({}))
      .page(() => null)

    // The plugin contributed a `.search()` schema, so `q` must be routed as a search param — a query key
    // with `q` set must differ from one without it. If `use()` drops the plugin's `_searchSchemaKeys`, the
    // page filters `q` out as unknown and both keys collapse to the same value.
    const withValue = page.getQueryKey({ '?': { q: 'x' } })
    const without = page.getQueryKey({ '?': {} })
    expect(withValue).not.toEqual(without)
  })

  it('use() rejects a non-plugin point at runtime', () => {
    const root = Point0.lets('root', 'root').root()
    const notAPlugin = root
      .lets('page', 'home', '/')
      .loader(() => ({ a: 1 }))
      .page(() => null)
    // `notAPlugin` is type "page", not "plugin" — injecting it via `.use()` must throw rather than silently
    // merging its loader/mount actions. The type already forbids it; this is the runtime backstop.
    expect(() => root.lets('page', 'other', '/other').use(notAPlugin as never)).toThrow('expects a plugin')
  })

  // it.concurrent('forbidden different ssr settings when mount actions provided', async () => {
  //   const pluginNoSsr = Point0.lets('plugin', 'test-plugin-no-ssr')
  //   .clientOnly()
  //     .with(() => ({ plugin: 'noSsr' }))
  //     .plugin()
  //   const pluginSsr = Point0.lets('plugin', 'test-plugin-ssr')
  //     .with(() => ({ plugin: 'ssr' }))
  //     .plugin()
  //   const rootSsr = Point0.lets('root', 'root').root()
  //   const rootNoSsr = Point0.lets('root', 'root').root()
  //   expect(() =>
  //     rootSsr
  //       .lets('page', 'home', '/')
  //       .use(pluginNoSsr)
  //       .page(({ props }) => <div id="page">{ymlifyline(props)}</div>),
  //   ).toThrow()
  //   expect(() =>
  //     rootNoSsr
  //       .lets('page', 'home', '/')
  //       .use(pluginSsr)
  //       .page(({ props }) => <div id="page">{ymlifyline(props)}</div>),
  //   ).toThrow()
  //   rootSsr
  //     .lets('page', 'home', '/')
  //     .use(pluginSsr)
  //     .page(({ props }) => <div id="page">{ymlifyline(props)}</div>)
  //   rootNoSsr
  //     .lets('page', 'home', '/')
  //     .use(pluginNoSsr)
  //     .page(({ props }) => <div id="page">{ymlifyline(props)}</div>)
  // })

  // it.concurrent('merge error head', async () => {
  //   const root = Point0.lets('root', 'root')
  //     .error(({ error }) => <div id="error">{error.message}</div>)
  //     .root()
  //   const plugin = Point0.lets('plugin', 'test-plugin')
  //     .head('global', ({ error }) => {
  //       if (error) {
  //         return { title: `My Error Title: ${error.message}` }
  //       }
  //       return {}
  //     })
  //     .plugin()
  //   const page = root
  //     .lets('page', 'home', '/')
  //     .loader(async () => {
  //       await waitReturn()
  //       if (Math.random() + 1) {
  //         throw new Error('my message')
  //       }
  //       return { x: 1 }
  //     })
  //     .use(plugin)
  //     .page(() => <div id="page" />)

  //   const { render } = await createTestThings({ ssr: true, points: [root, page] })
  //   await render(page.route(), async ({ waitContent, titlesTale, tale }) => {
  //     await waitContent('#error')
  //     expect(await titlesTale()).toMatchInlineSnapshot(`
  //         "
  //         My Error Title: my message
  //         "
  //       `)
  //   })
  // })
})
