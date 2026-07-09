import { describe, expect, it } from 'bun:test'
import { Point0 } from '@point0/core'
import type { FetcherFetchDetailedResult, MiddlewareFnOptions } from '@point0/core'
import { createTestThings } from '../../engine/tests/utils/internal-testing.js'
import { cacheControl, cacheControlValues } from '../src/index.js'

// Direct-invocation harness: cacheControl only reads the `next()` result (variant type + response headers), so a
// minimal fake covers every variant honestly — no engine needed.
const run = async ({
  options,
  variantType,
  response = new Response('body'),
}: {
  options?: Parameters<typeof cacheControl>[0]
  variantType: string
  response?: Response
}): Promise<Response> => {
  const result = {
    response,
    request: {},
    scope: 'root',
    error: undefined,
    variant: { type: variantType },
  } as unknown as FetcherFetchDetailedResult<any>
  const middleware = cacheControl(options)
  const middlewareOptions = { next: async () => result } as unknown as MiddlewareFnOptions<any>
  const output = await middleware(middlewareOptions)
  return output instanceof Response ? output : output.response
}

describe('cacheControl', () => {
  it('defaults: asset immutable, publicdir revalidate, page/error no-store, endpoint untouched', async () => {
    expect((await run({ variantType: 'asset' })).headers.get('cache-control')).toBe(cacheControlValues.immutable)
    expect((await run({ variantType: 'publicdir' })).headers.get('cache-control')).toBe(cacheControlValues.revalidate)
    expect((await run({ variantType: 'page' })).headers.get('cache-control')).toBe(cacheControlValues.noStore)
    expect((await run({ variantType: 'error' })).headers.get('cache-control')).toBe(cacheControlValues.noStore)
    expect((await run({ variantType: 'endpoint' })).headers.get('cache-control')).toBeNull()
  })

  it('never touches middleware and options variants', async () => {
    expect((await run({ variantType: 'middleware' })).headers.get('cache-control')).toBeNull()
    expect((await run({ variantType: 'options' })).headers.get('cache-control')).toBeNull()
  })

  it('an existing cache-control always wins', async () => {
    const response = new Response('body', { headers: { 'cache-control': 'no-store' } })
    expect((await run({ variantType: 'page', response })).headers.get('cache-control')).toBe('no-store')
  })

  it('a fixed string overrides the slot default', async () => {
    const response = await run({ variantType: 'page', options: { page: 'public, max-age=60' } })
    expect(response.headers.get('cache-control')).toBe('public, max-age=60')
  })

  it('a slot set to undefined skips (leaves the header unset)', async () => {
    const response = await run({ variantType: 'asset', options: { asset: undefined } })
    expect(response.headers.get('cache-control')).toBeNull()
  })

  it('an unconfigured slot uses the default; explicit undefined skips (does NOT use the default)', async () => {
    // omit publicdir → default revalidate
    expect((await run({ variantType: 'publicdir' })).headers.get('cache-control')).toBe(cacheControlValues.revalidate)
    // explicit publicdir: undefined → skip, NOT the default
    expect(
      (await run({ variantType: 'publicdir', options: { publicdir: undefined } })).headers.get('cache-control'),
    ).toBeNull()
  })

  it('a callback decides per response; undefined skips (keep the default by returning it explicitly)', async () => {
    const options: Parameters<typeof cacheControl>[0] = {
      publicdir: ({ response }) =>
        response.headers.get('content-type') === 'application/pdf' ? 'public, max-age=604800' : undefined,
    }
    const pdf = await run({
      variantType: 'publicdir',
      options,
      response: new Response('pdf', { headers: { 'content-type': 'application/pdf' } }),
    })
    expect(pdf.headers.get('cache-control')).toBe('public, max-age=604800')
    // callback returned undefined → skip (NOT the revalidate default — the slot is configured)
    const txt = await run({ variantType: 'publicdir', options })
    expect(txt.headers.get('cache-control')).toBeNull()
    // to keep the default from a callback, return it explicitly
    const kept = await run({
      variantType: 'publicdir',
      options: { publicdir: () => cacheControlValues.revalidate },
    })
    expect(kept.headers.get('cache-control')).toBe(cacheControlValues.revalidate)
  })

  it('a callback may return undefined to skip', async () => {
    const response = await run({ variantType: 'page', options: { page: () => undefined } })
    expect(response.headers.get('cache-control')).toBeNull()
  })

  it('an async callback works', async () => {
    const response = await run({ variantType: 'page', options: { page: async () => 'public, max-age=1' } })
    expect(response.headers.get('cache-control')).toBe('public, max-age=1')
  })

  it('override runs above the existing-header rule and can overwrite an app-set value', async () => {
    const response = new Response('body', { headers: { 'cache-control': 'no-store' } })
    const out = await run({ variantType: 'page', response, options: { override: () => 'public, max-age=10' } })
    expect(out.headers.get('cache-control')).toBe('public, max-age=10')
  })

  it('override returning false deletes an existing header', async () => {
    const response = new Response('body', { headers: { 'cache-control': 'public, max-age=99' } })
    const out = await run({ variantType: 'publicdir', response, options: { override: () => false } })
    expect(out.headers.get('cache-control')).toBeNull()
  })

  it('override returning undefined falls through to the normal procedure', async () => {
    const out = await run({ variantType: 'asset', options: { override: () => undefined } })
    expect(out.headers.get('cache-control')).toBe(cacheControlValues.immutable)
  })

  it('override reaches variants that have no slot (middleware/options)', async () => {
    const out = await run({ variantType: 'middleware', options: { override: () => 'no-store' } })
    expect(out.headers.get('cache-control')).toBe('no-store')
  })

  it('sets no-store on the page HTML through the real middleware chain', async () => {
    const root = Point0.lets('root', 'root').middleware(cacheControl()).root()
    const page = root
      .lets('page', 'home', '/')
      .loader(() => ({ ok: true }))
      .page(() => <div>Home</div>)
    const tt = await createTestThings({ points: [root, page] })
    const response = await tt.fetch(page.route.get({}, { origin: 'http://localhost:3001' }))
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe(cacheControlValues.noStore)
  })
})
