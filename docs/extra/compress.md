---
index: 600
title: Compress
description:
  A streaming compression middleware — brotli/gzip at the origin, negotiated per
  Accept-Encoding, with progressive delivery preserved.
---

`@point0/compress` compresses responses at the origin. `compress(options)`
returns a Point0 [middleware](middleware): mount it on your `root` and every
compressible response — HTML, JSON, JS/CSS chunks, SVG — ships brotli- or
gzip-encoded, per the client's `Accept-Encoding`.

```tsx
import { Point0 } from '@point0/core'
import { compress } from '@point0/compress'

export const root = Point0.lets
  .root()
  .middleware(compress()) // ← text responses ship brotli/gzip encoded
  // ...
  .root()
```

It earns its keep wherever responses leave the server uncompressed — an app
served straight from its host with no CDN edge in front, where the ~100 KB SSR
HTML would otherwise go over the wire as-is. And since that SSR HTML is
`private, no-store` (see [cache-control](cache-control)), no CDN would cache and
compress it for you anyway — the origin is the only place it can happen.

## Streaming, not buffering

The body is piped through the compressor (`node:zlib`) with a **flush after
every incoming chunk**:

- a streamed SSR document keeps its progressive delivery — the shell reaches the
  browser as soon as React emits it, instead of sitting in the compressor's
  window until enough bytes accumulate;
- no second copy of the body is ever held in memory, so there is no response
  size limit.

Because the compressed size isn't known ahead of the stream, `Content-Length` is
dropped and the response goes out chunked. `Vary: Accept-Encoding` is appended
so caches key the variants correctly, and a strong `ETag` is weakened to `W/…`
(the compressed bytes are an equivalent, not identical, representation).

## What gets compressed

Text-like content types: `text/*`, `image/svg+xml`, and `application/*` that is
JSON, XML, JavaScript, or wasm (including suffixed types like `manifest+json`).
Images, fonts, video, and archives arrive already compressed and are left alone.

The middleware skips by itself:

- internal server-to-server fetches (`request.from.server`) — they are consumed
  programmatically, not sent over the wire;
- already-encoded responses (`Content-Encoding` present);
- `HEAD`, bodyless, and `204`/`205`/`304` responses;
- `text/event-stream` — SSE frames must not be re-chunked;
- known-small bodies: a response with a `Content-Length` under `minBytes`
  (default `1024`) isn't worth the encoding overhead. Streams of unknown length
  always compress.

## Encoding negotiation

`Accept-Encoding` is parsed with honest q-values: `br;q=0` is an explicit
refusal, `*` covers encodings the client didn't list. Among the encodings the
client accepts, the option's preference order decides — the default
`['br', 'gzip']` prefers brotli (denser) and falls back to gzip (universal):

```tsx
compress({ encodings: ['gzip'] }) // gzip only — e.g. to save origin CPU
compress({ brotliQuality: 4 }) //    default 5 — the origin sweet spot
compress({ gzipLevel: 9 }) //        default: zlib's own (6)
```

## Per-response control: `tune` and `tuneCompress`

Compression has one per-response decision, reachable from two sides. Both yield
the same value — `false` / `true` / a settings object / `undefined`:

- `false` — skip this response;
- `true` — compress it even when its content type isn't in the built-in set (you
  know the payload is compressible);
- an object `{ encodings?, brotliQuality?, gzipLevel?, minBytes? }` — compress
  it with these per-response settings (each falls back to the global option);
  this also forces past the content-type check;
- `undefined` — the default content-type decision.

### From config: the `tune` option

`tune` decides per response from the config. It receives the same detailed
result object the middleware got back from `next()` (`response`, `request`,
`variant`, `scope`, `error`):

```tsx
compress({
  tune: (result) => {
    if (result.variant.type === 'endpoint') return false // never compress API responses
    if (result.variant.type === 'page') return { brotliQuality: 11 } // max density for the SSR document
    return undefined
  },
})
```

### From a handler: `tuneCompress()`

`tuneCompress(value)` sets the same decision imperatively for the current
request, and **overrides the config `tune`** (hand-set beats policy). It reads
the current request through point0's `getRequest()` itself, so you pass only the
value:

```tsx
import { tuneCompress } from '@point0/compress'

.action(async () => {
  tuneCompress(false) // a long-lived LLM stream — nothing may sit between us and the client
  return new Response(llmStream, { headers: { 'content-type': 'text/plain' } })
})
```

`tuneCompress(false)` is the common opt-out (a stream that must not be buffered
or re-chunked); `tuneCompress(true)` forces a payload whose content type the
sniff doesn't recognize; `tuneCompress({ brotliQuality: 11 })` forces + tunes;
`tuneCompress(undefined)` clears a prior call. It is **scoped to the one request
whose handler calls it** — kept on that request's per-instance state, under an
internal key (so it never shows up on your typed `request.state`). That scope is
deliberate: a query running during a page's SSR is its own sub-request, so its
`tuneCompress(false)` affects only that query's response, never the page
document. A no-op off any request context.

### The guardrails

Neither `tune` nor `tuneCompress` can un-skip the cases the middleware always
leaves raw: internal server-to-server fetches, already-encoded responses, and
bodyless / `HEAD` / `204`/`304` responses. They control the compression policy,
not these correctness invariants.

## Reference

### `compress(options)`

Every option is optional; `compress()` with no argument is the correct default
for a typical app.

| Option          | Type                                           | Default          | What                                                                                           |
| --------------- | ---------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------- |
| `encodings`     | `('br' \| 'gzip')[]`                           | `['br', 'gzip']` | preference order; first one the client accepts wins                                            |
| `minBytes`      | `number`                                       | `1024`           | skip bodies with a known `Content-Length` under this                                           |
| `brotliQuality` | `number` (`0..11`)                             | `5`              | brotli quality — near-top density at a fraction of the top levels' CPU                         |
| `gzipLevel`     | `number` (`0..9`)                              | zlib default     | gzip level                                                                                     |
| `tune`          | `(result) => boolean \| settings \| undefined` | —                | per-response: `false` skip, `true` force, settings object to force + tune, `undefined` default |

### Behavior at a glance

| Aspect           | Behavior                                                                                                                   |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Side             | cut from the client bundle — the `.middleware(...)` argument and its imports are removed, so it never ships to the browser |
| Delivery         | streaming with a per-chunk flush — progressive SSR stays progressive, no buffering                                         |
| `Content-Length` | dropped on compressed responses (size unknown ahead of the stream)                                                         |
| `Vary`           | `Accept-Encoding` appended for every compressible response, even when negotiation ends with no encoding                    |
| `ETag`           | a strong validator is weakened to `W/…`                                                                                    |
| Opt-out          | `tuneCompress(false)` from any handler                                                                                     |

### Exports

| Export                | What                                                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `compress(options)`   | build the middleware                                                                                                           |
| `tuneCompress(value)` | set the per-request decision from a handler (`false` \| `true` \| settings object \| `undefined`); overrides the config `tune` |
