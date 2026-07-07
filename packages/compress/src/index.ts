import type { FetcherFetchDetailedResult, MiddlewareFn } from '@point0/core'
import { getRequestOrUndefined } from '@point0/core'
import { Readable } from 'node:stream'
import { constants, createBrotliCompress, createGzip } from 'node:zlib'

// The per-request compression override {@link tuneCompress} stashes and the middleware reads back after `next()` — the
// same CompressTuneResult the `tune` option produces, but set imperatively. Kept under an internal, namespaced key
// (point0's `__POINT0_*__` convention) so it never shows up on the developer's typed RequestState. Lives on
// `request.state` (PER-INSTANCE), deliberately NOT `request.cache` (chain-shared): a query/loader that runs as its own
// sub-request during a page's SSR must control ONLY its own response — a chain-shared value would leak that one
// sub-request's decision onto the whole page (a query asking not to be compressed would silently turn compression off
// for the entire document).
const COMPRESS_STATE_KEY = '__POINT0_COMPRESS__'

/**
 * Imperatively set the compression decision for the response of the request currently in context — the handler-side
 * twin of the {@link CompressOptions.tune} option, and it wins over it (hand-set always beats the config policy). Call
 * it from inside the handler whose OWN response you want to control (an endpoint / query / action / `.ctx`); it reads
 * the current request through point0's `getRequest()` itself, so nothing is passed in. Takes the same
 * {@link CompressTuneResult} that `tune` returns:
 *
 * - `false` — leave this response uncompressed. The common opt-out: a long-lived stream (an LLM answer, a custom event
 *   protocol over a compressible content type) where even flushed compression must not sit between the handler and the
 *   client.
 * - `true` — compress it, even when its content type isn't in the built-in compressible set (the handler knows its own
 *   payload better than the content-type sniff).
 * - a {@link CompressTuning} object — compress it with per-response settings (merged over the global options; also forces
 *   past the content-type check).
 * - `undefined` — clear a prior call, deferring back to the `tune` option / the default decision.
 *
 * Scoped to that one request: it's stored on the request's per-instance state, so a query calling it during a page's
 * SSR controls only its own (internal) response, never the page document. A no-op off any request context. It cannot
 * override the correctness cases the middleware always leaves raw (internal server-to-server fetches, already-encoded /
 * bodyless responses).
 *
 *     .action(async () => {
 *       tuneCompress(false) // don't sit between the stream and the client
 *       return new Response(llmStream, { headers: { 'content-type': 'text/plain' } })
 *     })
 *
 * Full reference: https://1gr14.dev/point0/latest/compress
 */
export const tuneCompress = (value: CompressTuneResult): void => {
  const request = getRequestOrUndefined()
  if (request) {
    request.state[COMPRESS_STATE_KEY] = value
  }
}

/** The content encodings {@link compress} can produce, in the option's preference order. */
export type CompressEncoding = 'br' | 'gzip'

/**
 * Per-response compression settings the {@link CompressOptions.tune} option (or {@link tuneCompress}) can supply to
 * override the global options for a single response. Every field is optional and falls back to the corresponding global
 * option (then its default). Supplying this object also means "compress this response" — the built-in content-type
 * check is bypassed (you've decided), while the effective `minBytes` still gates a known-length body.
 *
 * Full reference: https://1gr14.dev/point0/latest/compress
 */
export type CompressTuning = {
  /** Preference order for this response; first the client accepts wins. Falls back to the global `encodings`. */
  encodings?: CompressEncoding[]
  /** Brotli quality `0..11` for this response. Falls back to the global `brotliQuality`. */
  brotliQuality?: number
  /** Gzip level `0..9` for this response. Falls back to the global `gzipLevel`. */
  gzipLevel?: number
  /** Size floor for this response. Falls back to the global `minBytes`. `0` compresses even tiny bodies. */
  minBytes?: number
}

/**
 * The compression decision, produced by the {@link CompressOptions.tune} option or set imperatively via
 * {@link tuneCompress}: `false` to skip this response, `true` to compress it even when its content type isn't in the
 * built-in compressible set (default settings), a {@link CompressTuning} object to compress it with per-response
 * settings (also bypasses the content-type check), or `undefined` to fall back to the normal content-type decision.
 *
 * Full reference: https://1gr14.dev/point0/latest/compress
 */
export type CompressTuneResult = boolean | CompressTuning | undefined

/**
 * Options for {@link compress}. All optional. `encodings` / `minBytes` / `brotliQuality` / `gzipLevel` are the global
 * defaults; `tune` overrides the decision and settings per response.
 *
 * Full reference: https://1gr14.dev/point0/latest/compress
 */
export type CompressOptions = {
  /**
   * Preference order; the first encoding the client accepts wins. Default `['br', 'gzip']` — brotli is denser, gzip is
   * the universal fallback.
   */
  encodings?: CompressEncoding[]
  /**
   * Don't compress a body smaller than this when its size is known (`Content-Length`); below ~1 KB the encoding +
   * framing overhead cancels the savings. Streams of unknown length always compress. Default `1024`.
   */
  minBytes?: number
  /**
   * Brotli quality `0..11`. Default `5`: the origin-compression sweet spot — close to the density of the high levels at
   * a fraction of their CPU.
   */
  brotliQuality?: number
  /** Gzip level `0..9`. Default: zlib's own default (`6`). */
  gzipLevel?: number
  /**
   * Per-response policy, within the middleware's guardrails. Receives the same detailed result the middleware got back
   * from `next()` (`response`, `request`, `variant`, `scope`, `error`) and returns a {@link CompressTuneResult}: `false`
   * to skip, `true` to force past the content-type check, a settings object to compress with per-response
   * {@link CompressTuning}, or `undefined` for the default decision. A handler that calls {@link tuneCompress} sets the
   * same value imperatively and overrides this callback for its own response. Neither can un-skip the correctness cases
   * the middleware always leaves raw (internal server-to-server fetches, already-encoded / bodyless responses).
   */
  tune?: (result: FetcherFetchDetailedResult<any>) => CompressTuneResult | Promise<CompressTuneResult>
}

// Text-like payloads worth compressing: text/*, svg, and application/* that is json/xml/javascript/wasm (including
// suffixed types like manifest+json, xhtml+xml). Images/fonts/video/archives arrive already compressed.
const compressibleContentTypeRegex =
  /^(?:text\/|image\/svg\+xml|application\/(?:(?:x-)?javascript|ecmascript|wasm|(?:[\w.+-]+\+)?(?:json|xml)))/i

const isCompressibleContentType = (contentType: string): boolean =>
  compressibleContentTypeRegex.test(contentType) && !contentType.toLowerCase().includes('event-stream')

/**
 * Pick the first of `encodings` the client's `Accept-Encoding` allows. Honest q-value parsing: `q=0` explicitly forbids
 * an encoding, `*` stands for any encoding not listed. Server preference decides among the allowed ones (clients rarely
 * rank encodings themselves).
 */
const pickEncoding = (acceptEncoding: string | null, encodings: CompressEncoding[]): CompressEncoding | undefined => {
  if (!acceptEncoding) {
    return undefined
  }
  const qualities = new Map<string, number>()
  for (const part of acceptEncoding.toLowerCase().split(',')) {
    const [name, ...params] = part.trim().split(';')
    const trimmedName = name.trim()
    if (!trimmedName) {
      continue
    }
    let q = 1
    for (const param of params) {
      const [key, value] = param.trim().split('=')
      if (key.trim() === 'q') {
        const parsed = Number(value)
        if (!Number.isNaN(parsed)) {
          q = parsed
        }
      }
    }
    qualities.set(trimmedName, q)
  }
  for (const encoding of encodings) {
    const q = qualities.get(encoding) ?? qualities.get('*')
    if (q !== undefined && q > 0) {
      return encoding
    }
  }
  return undefined
}

const appendVaryAcceptEncoding = (headers: Headers): void => {
  const vary = headers.get('vary')
  if (vary === '*') {
    return
  }
  if (!/\baccept-encoding\b/i.test(vary ?? '')) {
    headers.append('Vary', 'Accept-Encoding')
  }
}

/**
 * Build a compression Point0 middleware — brotli/gzip at the origin, per the client's `Accept-Encoding`. Mount it on
 * your `root` and every compressible response (text, HTML, JSON, JS/CSS chunks, SVG — not already-compressed images,
 * fonts, or archives) ships encoded. It earns its keep wherever responses leave the server uncompressed — e.g. an app
 * served straight from its host with no CDN edge in front, where the ~100 KB SSR HTML would otherwise go over the wire
 * as-is.
 *
 * STREAMING, not buffering: the body is piped through the compressor (`node:zlib`) with a flush after every incoming
 * chunk, so a streamed SSR document keeps its progressive delivery and no second copy of the body is ever held in
 * memory. `Content-Length` is dropped (the compressed size isn't known ahead), `Vary: Accept-Encoding` is appended, and
 * a strong `ETag` is weakened (the compressed bytes are an equivalent, not identical, representation).
 *
 * Skips by itself: internal server-to-server fetches (`request.from.server`), already-encoded responses, `HEAD` /
 * bodyless / `204`/`205`/`304` responses, non-compressible content types (SSE — `text/event-stream` — among them), and
 * known-small bodies (`minBytes`). Two escape hatches within those guardrails: the `tune` option decides per response
 * from config, and {@link tuneCompress} sets the same decision imperatively from a handler (and overrides `tune`) — to
 * skip a long-lived stream (an LLM answer) where even flushed compression must not sit between the handler and the
 * client, force a normally-skipped content type, or set per-response encodings/quality/floor. Server-only by
 * construction: the compiler strips `.middleware(...)` arguments from the client bundle.
 *
 *     export const root = Point0.lets.root().middleware(compress()).root()
 *
 * Full reference: https://1gr14.dev/point0/latest/compress
 */
export const compress = (options: CompressOptions = {}): MiddlewareFn<any> => {
  const baseEncodings = options.encodings ?? ['br', 'gzip']
  const baseMinBytes = options.minBytes ?? 1024
  const baseBrotliQuality = options.brotliQuality ?? 5

  return async ({ request, next }) => {
    const result = await next()
    // Internal SSR/prefetch fetches are consumed programmatically, not sent over the wire — leave them raw.
    if (request.from.server) {
      return result
    }
    const { response } = result
    if (!response.body || response.headers.has('content-encoding')) {
      return result
    }
    const status = response.status
    if (status < 200 || status === 204 || status === 205 || status === 304) {
      return result
    }
    if (request.method.toUpperCase() === 'HEAD') {
      return result
    }
    // One decision, two sources: a handler's imperative tuneCompress() (per-instance state) overrides the config `tune`
    // callback; both yield the same CompressTuneResult, processed identically here. `false` skips, `true`/an object
    // forces past the content-type check, an object also supplies per-response settings; `undefined` (or neither set)
    // falls back to the normal content-type decision.
    const handlerValue = request.state[COMPRESS_STATE_KEY] as CompressTuneResult
    const tuned = handlerValue !== undefined ? handlerValue : options.tune ? await options.tune(result) : undefined
    if (tuned === false) {
      return result
    }
    const tuning = tuned && typeof tuned === 'object' ? tuned : undefined
    const forced = tuned === true || tuning !== undefined
    if (!forced && !isCompressibleContentType(response.headers.get('content-type') ?? '')) {
      return result
    }
    const encodings = tuning?.encodings ?? baseEncodings
    const minBytes = tuning?.minBytes ?? baseMinBytes
    const brotliQuality = tuning?.brotliQuality ?? baseBrotliQuality
    const gzipLevel = tuning?.gzipLevel ?? options.gzipLevel

    // From here the response is compressible in principle, so it varies by Accept-Encoding no matter how the
    // negotiation below ends — rebuild with the header so caches key it correctly. The body is passed by reference
    // (never read), so the rebuild costs nothing.
    const headers = new Headers(response.headers)
    appendVaryAcceptEncoding(headers)
    const init: ResponseInit = { status, statusText: response.statusText, headers }

    const encoding = pickEncoding(request.original.headers.get('accept-encoding'), encodings)
    const contentLengthRaw = response.headers.get('content-length')
    const contentLength = contentLengthRaw === null ? undefined : Number(contentLengthRaw)
    const knownLength = contentLength !== undefined && Number.isFinite(contentLength) ? contentLength : undefined
    if (!encoding || (knownLength !== undefined && knownLength < minBytes)) {
      result.response = new Response(response.body, init)
      return result
    }

    const compressor =
      encoding === 'br'
        ? createBrotliCompress({
            // Flush after every incoming chunk: a streamed SSR document keeps its progressive delivery instead of
            // sitting in the compressor's window until enough bytes accumulate.
            flush: constants.BROTLI_OPERATION_FLUSH,
            params: {
              [constants.BROTLI_PARAM_QUALITY]: brotliQuality,
              ...(knownLength !== undefined ? { [constants.BROTLI_PARAM_SIZE_HINT]: knownLength } : {}),
            },
          })
        : createGzip({
            flush: constants.Z_SYNC_FLUSH,
            ...(gzipLevel !== undefined ? { level: gzipLevel } : {}),
          })

    headers.set('Content-Encoding', encoding)
    // The compressed size isn't known ahead of the stream — an inherited Content-Length would describe the raw bytes.
    headers.delete('content-length')
    // The compressed bytes are an equivalent, not identical, representation — a strong validator would be a lie.
    const etag = headers.get('etag')
    if (etag && !etag.startsWith('W/')) {
      headers.set('ETag', `W/${etag}`)
    }

    const nodeBody = Readable.fromWeb(response.body as unknown as import('node:stream/web').ReadableStream)
    const compressedBody = Readable.toWeb(nodeBody.pipe(compressor)) as unknown as ReadableStream
    result.response = new Response(compressedBody, init)
    return result
  }
}
