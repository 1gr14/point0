import { describe, expect, it } from 'bun:test'
import { Point0 } from '@point0/core'
import type { FetcherFetchDetailedResult, MiddlewareFnOptions } from '@point0/core'
import { brotliDecompressSync, gunzipSync } from 'node:zlib'
import { createTestThings } from '../../engine/tests/utils/internal-testing.js'
import { compress, tuneCompress } from '../src/index.js'

// The internal state key compress() reads (kept off the developer's typed RequestState — see the package source).
const COMPRESS_STATE_KEY = '__POINT0_COMPRESS__'

const BODY = 'point0 '.repeat(500) // ~3.5 KB of comfortably compressible text

// Direct-invocation harness: compress only reads the request (headers, from, state, method) and the `next()` result's
// response, so a minimal fake covers the decision matrix honestly — no engine needed.
const run = async ({
  options,
  response = new Response(BODY, { headers: { 'content-type': 'text/html' } }),
  acceptEncoding = 'gzip, deflate, br, zstd',
  fromServer = false,
  state = {},
  method = 'GET',
  variantType = 'page',
}: {
  options?: Parameters<typeof compress>[0]
  response?: Response
  acceptEncoding?: string | null
  fromServer?: boolean
  state?: Record<string, unknown>
  method?: string
  variantType?: string
} = {}): Promise<Response> => {
  const result = {
    response,
    request: {},
    scope: 'root',
    error: undefined,
    variant: { type: variantType },
  } as unknown as FetcherFetchDetailedResult<any>
  const request = {
    from: { server: fromServer },
    state,
    method,
    original: new Request('http://localhost/x', {
      headers: acceptEncoding === null ? {} : { 'accept-encoding': acceptEncoding },
    }),
  }
  const middleware = compress(options)
  const middlewareOptions = { request, next: async () => result } as unknown as MiddlewareFnOptions<any>
  const output = await middleware(middlewareOptions)
  return output instanceof Response ? output : output.response
}

const decompressed = async (response: Response): Promise<string> => {
  const bytes = Buffer.from(await response.arrayBuffer())
  const encoding = response.headers.get('content-encoding')
  if (encoding === 'br') {
    return brotliDecompressSync(bytes).toString('utf8')
  }
  if (encoding === 'gzip') {
    return gunzipSync(bytes).toString('utf8')
  }
  return bytes.toString('utf8')
}

describe('compress', () => {
  it('brotli wins when the client accepts it, and the body round-trips', async () => {
    const response = await run()
    expect(response.headers.get('content-encoding')).toBe('br')
    expect(response.headers.get('vary')).toBe('Accept-Encoding')
    expect(response.headers.get('content-length')).toBeNull()
    expect(await decompressed(response)).toBe(BODY)
  })

  it('falls back to gzip when brotli is not accepted', async () => {
    const response = await run({ acceptEncoding: 'gzip' })
    expect(response.headers.get('content-encoding')).toBe('gzip')
    expect(await decompressed(response)).toBe(BODY)
  })

  it('honors q=0 as an explicit refusal', async () => {
    const response = await run({ acceptEncoding: 'br;q=0, gzip' })
    expect(response.headers.get('content-encoding')).toBe('gzip')
  })

  it('* covers encodings not listed', async () => {
    const response = await run({ acceptEncoding: '*' })
    expect(response.headers.get('content-encoding')).toBe('br')
  })

  it('leaves the response raw without accept-encoding, but still marks Vary', async () => {
    const response = await run({ acceptEncoding: null })
    expect(response.headers.get('content-encoding')).toBeNull()
    expect(response.headers.get('vary')).toBe('Accept-Encoding')
    expect(await decompressed(response)).toBe(BODY)
  })

  it('respects the encodings preference order', async () => {
    const response = await run({ options: { encodings: ['gzip'] } })
    expect(response.headers.get('content-encoding')).toBe('gzip')
  })

  it('skips internal server-to-server fetches', async () => {
    const response = await run({ fromServer: true })
    expect(response.headers.get('content-encoding')).toBeNull()
    expect(response.headers.get('vary')).toBeNull()
  })

  // The middleware reads the same state key tuneCompress() writes, so setting it directly on the fake request exercises
  // the whole handler-override path without an engine. A separate integration test proves tuneCompress() actually
  // writes it through getRequest().
  it('a handler-set false skips; a plain `compress` name is not read (namespaced key)', async () => {
    const response = await run({ state: { [COMPRESS_STATE_KEY]: false } })
    expect(response.headers.get('content-encoding')).toBeNull()
    const plain = await run({ state: { compress: false } })
    expect(plain.headers.get('content-encoding')).toBe('br')
  })

  it('a handler-set true forces past the content-type check', async () => {
    const response = await run({
      state: { [COMPRESS_STATE_KEY]: true },
      response: new Response(BODY, { headers: { 'content-type': 'application/octet-stream' } }),
    })
    expect(response.headers.get('content-encoding')).toBe('br')
    expect(await decompressed(response)).toBe(BODY)
  })

  it('a handler-set object forces + supplies per-response settings', async () => {
    const response = await run({
      state: { [COMPRESS_STATE_KEY]: { encodings: ['gzip'] } },
      response: new Response(BODY, { headers: { 'content-type': 'application/octet-stream' } }),
    })
    expect(response.headers.get('content-encoding')).toBe('gzip')
    expect(await decompressed(response)).toBe(BODY)
  })

  it('a handler-set value overrides the config tune both ways', async () => {
    // handler false beats tune true…
    const off = await run({ state: { [COMPRESS_STATE_KEY]: false }, options: { tune: () => true } })
    expect(off.headers.get('content-encoding')).toBeNull()
    // …and handler true beats tune false (forcing past content-type)
    const on = await run({
      state: { [COMPRESS_STATE_KEY]: true },
      options: { tune: () => false },
      response: new Response(BODY, { headers: { 'content-type': 'application/octet-stream' } }),
    })
    expect(on.headers.get('content-encoding')).toBe('br')
  })

  it('tuneCompress(false) opts out the endpoint handler own response; (undefined) clears it', async () => {
    const fetchEndpoint = async (kind: 'off' | 'clear' | 'none') => {
      const root = Point0.lets('root', 'root')
        .middleware(compress({ minBytes: 0 }))
        .root()
      const endpoint = root
        .lets('action', `data-${kind}`, 'GET', `/api/data-${kind}`)
        .loader(() => {
          if (kind === 'off') {
            tuneCompress(false)
          } else if (kind === 'clear') {
            tuneCompress(false)
            tuneCompress(undefined) // clear — back to the normal decision
          }
          return { blob: BODY }
        })
        .query()
      const tt = await createTestThings({ points: [root, endpoint] })
      return await tt.fetch(endpoint.route.get({}, { origin: 'http://localhost:3001' }), {
        headers: { 'accept-encoding': 'gzip' },
      })
    }
    expect((await fetchEndpoint('off')).headers.get('content-encoding')).toBeNull()
    expect((await fetchEndpoint('clear')).headers.get('content-encoding')).toBe('gzip')
    expect((await fetchEndpoint('none')).headers.get('content-encoding')).toBe('gzip')
  })

  it('a query calling tuneCompress(false) during SSR does NOT leak onto the page document', async () => {
    // The decision is per-instance state — a sub-request (the query) opting out must never turn off compression for the
    // whole page. This is the guarantee that keeps chain-shared cache OUT of the design.
    const root = Point0.lets('root', 'root')
      .middleware(compress({ minBytes: 0 }))
      .root()
    const query = root
      .lets('action', 'leaky', 'GET', '/api/leaky')
      .loader(() => {
        tuneCompress(false) // the query opts ITS OWN (internal) response out…
        return { n: 1 }
      })
      .query()
    const page = root
      .lets('page', 'home', '/')
      .with(query, () => undefined)
      .page(() => <div>{BODY}</div>)
    const tt = await createTestThings({ points: [root, query, page], ssr: true })
    const response = await tt.fetch(page.route.get({}, { origin: 'http://localhost:3001' }), {
      headers: { 'accept-encoding': 'gzip' },
    })
    // …yet the page document is still compressed — the query's decision did not leak.
    expect(response.headers.get('content-encoding')).toBe('gzip')
  })

  it('tuneCompress is a no-op off any request context', () => {
    // getRequestOrUndefined() returns undefined here — the call must not throw.
    expect(() => {
      tuneCompress(false)
      tuneCompress(true)
    }).not.toThrow()
  })

  it('skips already-encoded, non-compressible, and SSE responses', async () => {
    const encoded = await run({
      response: new Response(BODY, { headers: { 'content-type': 'text/html', 'content-encoding': 'br' } }),
    })
    expect(await encoded.text()).toBe(BODY)
    const png = await run({ response: new Response(BODY, { headers: { 'content-type': 'image/png' } }) })
    expect(png.headers.get('content-encoding')).toBeNull()
    expect(png.headers.get('vary')).toBeNull()
    const sse = await run({ response: new Response(BODY, { headers: { 'content-type': 'text/event-stream' } }) })
    expect(sse.headers.get('content-encoding')).toBeNull()
  })

  it('skips known-small bodies via minBytes but compresses unknown-length streams', async () => {
    const small = await run({
      response: new Response('tiny', {
        headers: { 'content-type': 'text/plain', 'content-length': '4' },
      }),
    })
    expect(small.headers.get('content-encoding')).toBeNull()
    expect(small.headers.get('vary')).toBe('Accept-Encoding')
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(BODY))
        controller.close()
      },
    })
    const unknownLength = await run({ response: new Response(stream, { headers: { 'content-type': 'text/plain' } }) })
    expect(unknownLength.headers.get('content-encoding')).toBe('br')
    expect(await decompressed(unknownLength)).toBe(BODY)
  })

  it('tune overrides the content-type decision both ways', async () => {
    const forcedOff = await run({ options: { tune: () => false } })
    expect(forcedOff.headers.get('content-encoding')).toBeNull()
    const forcedOn = await run({
      options: { tune: () => true },
      response: new Response(BODY, { headers: { 'content-type': 'application/octet-stream' } }),
    })
    expect(forcedOn.headers.get('content-encoding')).toBe('br')
    expect(await decompressed(forcedOn)).toBe(BODY)
  })

  it('tune returning an object forces compression with per-response settings', async () => {
    // A non-compressible content type, forced on with gzip via the settings object (which also bypasses content-type).
    const response = await run({
      options: { tune: () => ({ encodings: ['gzip'] }) },
      response: new Response(BODY, { headers: { 'content-type': 'application/octet-stream' } }),
    })
    expect(response.headers.get('content-encoding')).toBe('gzip')
    expect(await decompressed(response)).toBe(BODY)
  })

  it('tune can override minBytes per response', async () => {
    const small = new Response('tiny', { headers: { 'content-type': 'text/plain', 'content-length': '4' } })
    // Global minBytes would skip a 4-byte body; the object lowers the floor to 0 for this one response.
    const forced = await run({ options: { tune: () => ({ minBytes: 0 }) }, response: small.clone() })
    expect(forced.headers.get('content-encoding')).toBe('br')
    // Without the override the same tiny body is left raw.
    const skipped = await run({ response: small.clone() })
    expect(skipped.headers.get('content-encoding')).toBeNull()
  })

  it('tuneCompress(false) wins over a config tune forcing compression, through the real chain', async () => {
    const root = Point0.lets('root', 'root')
      .middleware(compress({ minBytes: 0, tune: () => true }))
      .root()
    const endpoint = root
      .lets('action', 'streamy', 'GET', '/api/streamy')
      .loader(() => {
        tuneCompress(false)
        return { blob: BODY }
      })
      .query()
    const tt = await createTestThings({ points: [root, endpoint] })
    const response = await tt.fetch(endpoint.route.get({}, { origin: 'http://localhost:3001' }), {
      headers: { 'accept-encoding': 'gzip' },
    })
    // config tune says "force compress", but the handler's tuneCompress(false) is the last word.
    expect(response.headers.get('content-encoding')).toBeNull()
  })

  it('appends to an existing Vary and weakens a strong ETag', async () => {
    const response = await run({
      response: new Response(BODY, {
        headers: { 'content-type': 'text/html', vary: 'Origin', etag: '"abc"' },
      }),
    })
    expect(response.headers.get('vary')).toBe('Origin, Accept-Encoding')
    expect(response.headers.get('etag')).toBe('W/"abc"')
  })

  it('skips bodyless and not-modified responses', async () => {
    const noContent = await run({ response: new Response(null, { status: 204 }) })
    expect(noContent.status).toBe(204)
    expect(noContent.headers.get('content-encoding')).toBeNull()
    const notModified = await run({ response: new Response(null, { status: 304 }) })
    expect(notModified.headers.get('content-encoding')).toBeNull()
  })

  it('compresses the page HTML through the real middleware chain', async () => {
    const root = Point0.lets('root', 'root')
      .middleware(compress({ minBytes: 0 }))
      .root()
    const page = root
      .lets('page', 'home', '/')
      .loader(() => ({ ok: true }))
      .page(() => <div>{BODY}</div>)
    const tt = await createTestThings({ points: [root, page] })
    const response = await tt.fetch(page.route.get({}, { origin: 'http://localhost:3001' }), {
      headers: { 'accept-encoding': 'gzip' },
    })
    expect(response.status).toBe(200)
    expect(response.headers.get('content-encoding')).toBe('gzip')
    expect(response.headers.get('vary')).toBe('Accept-Encoding')
    // ssr is off in this harness, so the HTML is the SPA shell — the round-trip through gunzip is the point.
    const text = gunzipSync(Buffer.from(await response.arrayBuffer())).toString('utf8')
    expect(text).toContain('<div id="root">')
  })
})
