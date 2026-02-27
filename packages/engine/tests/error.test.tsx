import { Error0 } from '@devp0nt/error0'
import { codePlugin } from '@devp0nt/error0/plugins/code'
import { metaPlugin } from '@devp0nt/error0/plugins/meta'
import { statusPlugin } from '@devp0nt/error0/plugins/status'
import { ErrorPoint0, Point0 } from '@point0/core'
import { describe, expect, expectTypeOf, it } from 'bun:test'
import { createTestThings } from './utils/internal-testing.js'

describe('error', () => {
  const AppError = Error0.use(statusPlugin({ isPublic: true }))
    .use(codePlugin({ isPublic: true }))
    .use(metaPlugin({ isPublic: true }))
  type AppError = InstanceType<typeof AppError>
  const createRoot = () =>
    Point0.lets('root', 'root')
      .ssr(true)
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
  const createRoot0 = () =>
    Point0.lets('root', 'root')
      .ssr(true)
      .errorClass(AppError)
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

  it('simple', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/')
      .error(({ error }) => {
        expectTypeOf(error).toEqualTypeOf<ErrorPoint0>()
        expect(error).toBeInstanceOf(ErrorPoint0)
        return <div id="error">{error.message}</div>
      })
      .loader(() => {
        throw new Error('test error')
      })
      .page(() => <div id="page">x=nothing</div>)
    const { render } = await createTestThings({ points: [root, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#error')
      expect(await tale()).toMatchInlineSnapshot(`
              "
              /
                #loading: ...
    
                #error: test error
              "
            `)
    })
  })

  it('with code', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/')
      .error(({ error }) => {
        expectTypeOf(error).toEqualTypeOf<ErrorPoint0>()
        expect(error).toBeInstanceOf(ErrorPoint0)
        expect(error.code).toBe('test-code')
        return <div id="error">{error.message}</div>
      })
      .loader(() => {
        throw new ErrorPoint0('test error', { code: 'test-code' })
      })
      .page(() => <div id="page">x=nothing</div>)
    const { render } = await createTestThings({ points: [root, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#error')
      expect(await tale()).toMatchInlineSnapshot(`
              "
              /
                #loading: ...
    
                #error: test error
              "
            `)
    })
  })

  it('with error0', async () => {
    const root = createRoot0()
    const page = root
      .lets('page', 'home', '/')
      .error(({ error }) => {
        expectTypeOf(error).toEqualTypeOf<AppError>()
        expect(error).toBeInstanceOf(AppError)
        expect(error.code).toBe('test-code')
        return <div id="error">{error.message}</div>
      })
      .loader(() => {
        throw new AppError('test error', { code: 'test-code', status: 404, meta: { x: 1, a: { b: 2 } } })
      })
      .page(() => <div id="page">x=nothing</div>)
    const { render } = await createTestThings({ points: [root, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#error')
      expect(await tale()).toMatchInlineSnapshot(`
              "
              /
                #loading: ...
    
                #error: test error
              "
            `)
    })
  })
})
