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

  it.concurrent('not show previous chain related options', async () => {
    const root = Point0.lets('root', 'root').ssr(true).baseurl('http://localhost/').root()
    const query = root
      .lets('query', 'test-query')
      .input(z.object({ y: z.number() }))
      .loader(() => ({ x: 1 }))
      .query()
    const plugin = Point0.lets('plugin', 'test-plugin')
      .relatedQuery(query, (options) => {
        expectTypeOf<typeof options>().toHaveProperty('location')
        expectTypeOf<typeof options>().not.toHaveProperty('props')
        return { y: 1 }
      })
      .head('success', (options) => {
        expectTypeOf<typeof options>().toHaveProperty('location')
        expectTypeOf<typeof options>().not.toHaveProperty('status')
        return { title: 'Plugin Head' }
      })
      .head((options) => {
        expectTypeOf<typeof options>().toHaveProperty('location')
        expectTypeOf<typeof options>().not.toHaveProperty('status')
        return { title: 'Plugin Head' }
      })
      .with((options) => {
        expectTypeOf<typeof options>().not.toHaveProperty('data')
        expectTypeOf<typeof options>().not.toHaveProperty('error')
        expectTypeOf<typeof options>().not.toHaveProperty('loading')
        expectTypeOf<typeof options>().not.toHaveProperty('props')
        expectTypeOf<typeof options>().not.toHaveProperty('queries')
        expectTypeOf<typeof options>().not.toHaveProperty('status')
        return {
          pluginProps: {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            location: options.location ? '✅' : '❌',
            // @ts-expect-error -- should be undefined
            data: options.data ? '✅' : '❌',
            // @ts-expect-error -- should be undefined
            error: options.error ? '✅' : '❌',
            // @ts-expect-error -- should be undefined
            loading: options.loading ? '✅' : '❌',
            // @ts-expect-error -- should be undefined
            props: options.props ? '✅' : '❌',
            // @ts-expect-error -- should be undefined
            queries: options.queries ? '✅' : '❌',
            // @ts-expect-error -- should be undefined
            status: options.status ? '✅' : '❌',
          },
        }
      })
      .wrapper((options) => {
        expectTypeOf<typeof options>().toHaveProperty('location')
        expectTypeOf<typeof options>().toHaveProperty('children')
        expectTypeOf<typeof options>().toHaveProperty('LoadingComponent')
        expectTypeOf<typeof options>().toHaveProperty('ErrorComponent')
        expectTypeOf<typeof options>().not.toHaveProperty('error')
        expectTypeOf<typeof options>().not.toHaveProperty('loading')
        expectTypeOf<typeof options>().not.toHaveProperty('props')
        expectTypeOf<typeof options>().not.toHaveProperty('queries')
        expectTypeOf<typeof options>().not.toHaveProperty('status')
        return (
          <div id="wrapper">
            {ymlifyline({
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
              location: options.location ? '✅' : '❌',
              children: options.children ? '✅' : '❌',
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
              LoadingComponent: options.LoadingComponent ? '✅' : '❌',
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
              ErrorComponent: options.ErrorComponent ? '✅' : '❌',
              // @ts-expect-error -- should be undefined
              error: options.error ? '✅' : '❌',
              // @ts-expect-error -- should be undefined
              loading: options.loading ? '✅' : '❌',
              // @ts-expect-error -- should be undefined
              props: options.props ? '✅' : '❌',
              // @ts-expect-error -- should be undefined
              queries: options.queries ? '✅' : '❌',
              // @ts-expect-error -- should be undefined
              status: options.status ? '✅' : '❌',
            })}
            {options.children}
          </div>
        )
      })
      .ctx((options) => {
        expectTypeOf<typeof options>().not.toHaveProperty('ctx')
        expectTypeOf<typeof options>().not.toHaveProperty('execute')
        expectTypeOf<typeof options>().not.toHaveProperty('input')
        return {
          pluginCtx: {
            point: options.point ? '✅' : '❌',
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            request: options.request ? '✅' : '❌',
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            set: options.set ? '✅' : '❌',
            // @ts-expect-error -- should be undefined
            ctx: options.ctx ? '✅' : '❌',
            // @ts-expect-error -- should be undefined
            execute: options.execute ? '✅' : '❌',
            // @ts-expect-error -- should be undefined
            input: options.input ? '✅' : '❌',
          },
        }
      })
      // .loader((options) => {
      //   expectTypeOf<typeof options.ctx>().toEqualTypeOf<undefined>()
      //   expectTypeOf<typeof options.execute>().toEqualTypeOf<undefined>()
      //   expectTypeOf<typeof options.input>().toEqualTypeOf<undefined>()
      //   return {
      //     ctx: options.ctx,
      //     execute: options.execute,
      //     input: options.input,
      //   }
      // })
      .plugin()
    const page = root
      .lets('page', 'home', '/')
      .use(plugin)
      .loader(({ ctx }) => ({
        pluginCtx: ctx.pluginCtx,
      }))
      .ctx((options) => ({ pageCtx: 'ok5' }))
      .page(({ props, data, queries }) => (
        <div id="page">
          <div id="related-query">{ymlifyline(data)}</div>
          <div id="with">{ymlifyline(props.pluginProps)}</div>
          <div id="ctx">{ymlifyline(queries[1].data.pluginCtx)}</div>
        </div>
      ))

    const { fetchPreview } = await createTestThings({ points: [root, page, query] })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #wrapper:
        text: location: ✅, children: ✅, LoadingComponent: ✅, ErrorComponent: ✅, error: ❌, loading: ❌, props: ❌, queries: ❌, status: ❌
        #page:
          #related-query: x: 1
          #with: location: ✅, data: ❌, error: ❌, loading: ❌, props: ❌, queries: ❌, status: ❌
          #ctx: ctx: ❌, execute: ❌, input: ❌, point: ✅, request: ✅, set: ✅
      "
    `)
  })
})
