---
index: 400
title: CORS
description:
  A CORS middleware — add the cross-origin headers and answer preflight so a
  separate front-end or native app can call your API.
---

`@point0/cors` is a CORS middleware. `cors(options)` returns a Point0
[middleware](middleware) function: mount it on your `root` and every response
gets the `Access-Control-*` headers, and every preflight `OPTIONS` request gets
a `204` — so a client on a different origin (a native/mobile app, or a front-end
served from another domain) can call your API.

```tsx
import { Point0 } from '@point0/core'
import { cors } from '@point0/cors'

// examples/expo/src/lib/root.tsx — let the native app reach the API
export const root = Point0.lets
  .root()
  .middleware(cors()) // ← every response carries CORS headers; OPTIONS → 204
  // ...
  .root()
```

That bare `cors()` **reflects** whatever `Origin` the request carried, mirrors
the request method, and echoes the requested headers back — but it sends **no**
`Access-Control-Allow-Credentials`, so the browser makes those cross-origin
calls anonymously. That is the safe half of permissive: reflecting an origin
_and_ allowing credentials is the one combination that lets any site on the
internet read your authenticated responses with the visitor's own cookies. You
opt into credentials deliberately, together with an `origin` — see
[Credentials and caching](#credentials-and-caching). The shipped `expo` example
uses bare `cors()` because the Expo app and the API server live on different
origins and it authenticates nothing by cookie.

`cors()` is **cut from the client bundle — its body and the imports it uses are
removed, so it never ships to the browser.** `.middleware(...)` arguments are
server-only, and the compiler prunes the then-unused `@point0/cors` import with
them.

## Mounting it

`cors(...)` is a plain Point0 middleware, so it goes wherever
[`.middleware`](middleware) goes. On the `root` it covers the whole API, which
is the usual placement:

```tsx
export const root = Point0.lets
  .root()
  .middleware(cors({ origin: 'https://app.example.com' }))
  .root()
```

`.middleware` also takes a route, so you can scope CORS to a subtree:

```tsx
export const root = Point0.lets.root().middleware('/api/*', cors()).root()
```

## Locking down the origin: `origin`

`origin` decides which request origins are allowed. It defaults to `true`.

```tsx
export const root = Point0.lets
  .root()
  .middleware(cors({ origin: 'https://app.example.com' }))
  .root()
```

It takes `true` (any origin), `false` (none), one origin string, a RegExp, a
predicate, or an array mixing them. How each form resolves:

- **`true`** — reflects the request's `Origin` header back. With no `Origin`
  header it falls back to `*`. Anonymous-only unless you also pass
  `credentials: true`, which spells out that you mean any origin _with_ cookies.
- **`false`** — never sets `Access-Control-Allow-Origin`; no cross-origin client
  is allowed.
- **string** — compared against the request origin. A bare host like
  `'example.com'` matches `http://example.com` _and_ `https://example.com` (the
  protocol is ignored). Include a protocol — `'https://example.com'` — and the
  protocol must match too. The match is **exact on the host**, not a substring:
  `'example.com'` does **not** match `notexample.com`.
- **RegExp** — `.test(requestOrigin)`; the full origin string (with protocol) is
  tested.
- **function** — receives the middleware context and returns `boolean` (may be
  async). Return `true` to allow the request's origin.
- **array** — any mix of the above; the first entry that allows the origin wins.

When a request origin is allowed, that exact origin is echoed back in
`Access-Control-Allow-Origin` (not a literal `*`), which is what browsers
require once credentials are in play.

## Preflight: `preflight`

A cross-origin request that isn't "simple" makes the browser send an `OPTIONS`
preflight first. By default (`preflight: true`) `cors()` answers it with a bare
`204` carrying the CORS headers — the real request then follows. Set
`preflight: false` to let `OPTIONS` fall through to your own handler untouched
(no CORS headers added):

```tsx
export const root = Point0.lets
  .root()
  // OPTIONS is passed through to next(), no CORS headers
  .middleware(cors({ preflight: false }))
  .root()
```

## Methods and headers

```tsx
export const root = Point0.lets
  .root()
  .middleware(
    cors({
      methods: ['GET', 'POST'], //                           Access-Control-Allow-Methods
      allowedHeaders: ['Content-Type', 'Authorization'], //  Access-Control-Allow-Headers
      exposeHeaders: ['X-Total-Count'], //                   Access-Control-Expose-Headers
    }),
  )
  .root()
```

Each of `methods`, `allowedHeaders`, and `exposeHeaders` takes a string, a
string array (joined with `, `), or a boolean. They default to `true`, which
means "reflect what the request asked for":

- **`methods: true`** — mirrors the incoming request's method (or the
  `Access-Control-Request-Method` on a preflight). `'*'` and a single method
  like `'GET'` are also accepted; `false` omits the header.
- **`allowedHeaders: true`** — echoes the `Access-Control-Request-Headers` the
  preflight asked for (falling back to the keys present on the request).
- **`exposeHeaders: true`** — exposes the keys present on the request.

## Credentials and caching

```tsx
export const root = Point0.lets
  .root()
  .middleware(
    cors({
      origin: 'https://app.example.com', // required once credentials are on
      credentials: true, //                Access-Control-Allow-Credentials: true
      maxAge: 600, //                      Access-Control-Max-Age in seconds
    }),
  )
  .root()
```

- **`credentials`** defaults to `false`. Set it to `true` to send
  `Access-Control-Allow-Credentials: true`, which is what lets a cross-origin
  browser client send cookies (and read the response) — pair it with
  [`.fetchOptions({ credentials: 'include' })`](stage-methods) on the client
  side.
- **`credentials: true` requires an explicit `origin`, and `cors()` throws
  without one.** A reflected origin plus credentials means any page the visitor
  opens can `fetch` your API with their session cookie and read the body —
  account data, a socket connect ticket, anything the session reaches. Name the
  origins you trust:
  `cors({ origin: 'https://app.example.com', credentials: true })`. Writing
  `cors({ origin: true, credentials: true })` still works and still reflects
  everything — that spelling is you saying you mean it (a closed network, a dev
  machine), not a default you can walk into.
- When the origin resolves to `*` — `origin: true` and a request with no
  `Origin` header — the credentials header is dropped: browsers reject that pair
  outright, and there is no origin to echo instead.
- **`maxAge`** is the preflight cache lifetime in seconds, written to
  `Access-Control-Max-Age`. It defaults to `5`. A `maxAge` of `0` omits the
  header entirely.

## Reference

### `cors(options)`

Every option is optional. `cors()` with no argument allows any origin
anonymously; credentials are opt-in and require an `origin`.

| Option           | Type                                                        | Default | What                                                                                    |
| ---------------- | ----------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------- |
| `origin`         | `boolean` \| `string` \| `RegExp` \| `fn` \| array of those | `true`  | which origins are allowed (`true` reflects the request origin)                          |
| `methods`        | `boolean` \| `'*'` \| method \| method[]                    | `true`  | `Access-Control-Allow-Methods` (`true` mirrors the request)                             |
| `allowedHeaders` | `true` \| `string` \| `string[]`                            | `true`  | `Access-Control-Allow-Headers` (`true` reflects the request)                            |
| `exposeHeaders`  | `true` \| `string` \| `string[]`                            | `true`  | `Access-Control-Expose-Headers` (`true` reflects the request)                           |
| `credentials`    | `boolean`                                                   | `false` | send `Access-Control-Allow-Credentials: true` (needs an explicit `origin`, else throws) |
| `maxAge`         | `number`                                                    | `5`     | `Access-Control-Max-Age` in seconds (`0` omits the header)                              |
| `preflight`      | `boolean`                                                   | `true`  | answer `OPTIONS` preflight with `204` (else pass through)                               |

### Behavior at a glance

| Aspect               | Behavior                                                                                                                   |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Side                 | cut from the client bundle — the `.middleware(...)` argument and its imports are removed, so it never ships to the browser |
| Default origin       | reflects the request `Origin`; `*` only when there's no `Origin` header                                                    |
| Default credentials  | off — a reflected origin never carries credentials unless you name an `origin` yourself                                    |
| Credentials + origin | an allowed origin is echoed literally; next to a `*` the credentials header is dropped (browsers reject that pair)         |
| String origin match  | host-only by default; add a protocol to require a protocol match                                                           |
| Preflight `OPTIONS`  | answered with `204` when `preflight: true`; passed through otherwise                                                       |
| `Vary`               | set to `Origin` for a reflected origin, `*` for a wildcard                                                                 |

If you also expose [OpenAPI](openapi) docs from a separate origin, the same
`cors()` on the root covers those routes too.
