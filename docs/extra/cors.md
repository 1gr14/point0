---
index: 400
title: CORS
description: A CORS middleware — add the cross-origin headers and answer preflight so a separate front-end or native app can call your API.
---

`@point0/cors` is a CORS middleware. `cors(options)` returns a Point0
[middleware](middleware) function: mount it on your `root` and every response
gets the `Access-Control-*` headers, and every preflight `OPTIONS` request gets a
`204` — so a client on a different origin (a native/mobile app, or a front-end
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

That bare `cors()` is the most permissive default: it **reflects** whatever
`Origin` the request carried, allows credentials, mirrors the request method, and
echoes the requested headers back. It's exactly what the shipped `expo` example
uses, because the Expo app and the API server live on different origins. The rest
of this page covers locking that down with `origin`, and the other options.

`cors()` is **cut from the client bundle — its body and the imports it uses are
removed, so it never ships to the browser.** Middleware is server-only; the package
also has an explicit client branch that just calls `next()`, so even where the call
survives on the client it's a no-op.

## Mounting it

`cors(...)` is a plain Point0 middleware, so it goes wherever
[`.middleware`](middleware) goes. On the `root` it covers the whole API, which is
the usual placement:

```tsx
Point0.lets.root().middleware(cors({ origin: 'https://app.example.com' })).root()
```

`.middleware` also takes a route, so you can scope CORS to a subtree:

```tsx
.middleware('/api/*', cors())
```

<!-- TODO(low): no shipped example mounts cors() path-scoped; the form follows from the .middleware contract (it runs only on matching routes) but isn't exercised in tests. -->

## Locking down the origin: `origin`

`origin` decides which request origins are allowed. It defaults to `true`.

```tsx
cors({ origin: true }) //                          allow any origin (default)
cors({ origin: false }) //                         allow none
cors({ origin: 'https://app.example.com' }) //     one origin
cors({ origin: ['https://app.example.com', 'https://admin.example.com'] }) // a list
cors({ origin: /\.example\.com$/ }) //             a RegExp tested against the origin
cors({ origin: (ctx) => isAllowed(ctx) }) //       a predicate
```

How each form resolves:

- **`true`** — reflects the request's `Origin` header back. With no `Origin`
  header it falls back to `*`.
- **`false`** — never sets `Access-Control-Allow-Origin`; no cross-origin client
  is allowed.
- **string** — compared against the request origin. A bare host like
  `'example.com'` matches `http://example.com` *and* `https://example.com` (the
  protocol is ignored). Include a protocol — `'https://example.com'` — and the
  protocol must match too. The match is **exact on the host**, not a substring:
  `'example.com'` does **not** match `notexample.com`.
- **RegExp** — `.test(requestOrigin)`; the full origin string (with protocol) is
  tested.
- **function** — receives the middleware context and returns `boolean` (may be
  async). Return `true` to allow the request's origin.
- **array** — any mix of the above; the first entry that allows the origin wins.

When a request origin is allowed, that exact origin is echoed back in
`Access-Control-Allow-Origin` (not a literal `*`), which is what browsers require
once credentials are in play.

## Preflight: `preflight`

A cross-origin request that isn't "simple" makes the browser send an `OPTIONS`
preflight first. By default (`preflight: true`) `cors()` answers it with a bare
`204` carrying the CORS headers — the real request then follows. Set
`preflight: false` to let `OPTIONS` fall through to your own handler untouched (no
CORS headers added):

```tsx
cors({ preflight: false }) // OPTIONS is passed through to next(), no CORS headers
```

## Methods and headers

```tsx
cors({
  methods: ['GET', 'POST'], //              Access-Control-Allow-Methods
  allowedHeaders: ['Content-Type', 'Authorization'], // Access-Control-Allow-Headers
  exposeHeaders: ['X-Total-Count'], //      Access-Control-Expose-Headers
})
```

Each of `methods`, `allowedHeaders`, and `exposeHeaders` takes a string, a string
array (joined with `, `), or a boolean. They default to `true`, which means
"reflect what the request asked for":

- **`methods: true`** — mirrors the incoming request's method (or the
  `Access-Control-Request-Method` on a preflight). `'*'` and a single method like
  `'GET'` are also accepted; `false` omits the header.
- **`allowedHeaders: true`** — echoes the `Access-Control-Request-Headers` the
  preflight asked for (falling back to the keys present on the request).
- **`exposeHeaders: true`** — exposes the keys present on the request.

## Credentials and caching

```tsx
cors({
  credentials: true, // Access-Control-Allow-Credentials: true (default)
  maxAge: 600, //       Access-Control-Max-Age in seconds
})
```

- **`credentials`** defaults to `true`, which sends
  `Access-Control-Allow-Credentials: true`. Set it to `false` to drop the header.
  Note that with credentials on, an allowed origin is always echoed back
  literally — the spec forbids `*` together with credentials, and `cors()` honors
  that.
- **`maxAge`** is the preflight cache lifetime in seconds, written to
  `Access-Control-Max-Age`. It defaults to `5`. A `maxAge` of `0` omits the
  header entirely.

## Reference

### `cors(options)`

Every option is optional; `cors()` with no argument is the permissive default.

| Option          | Type                                                        | Default | What                                                            |
| --------------- | ---------------------------------------------------------- | ------- | -------------------------------------------------------------- |
| `origin`        | `boolean` \| `string` \| `RegExp` \| `fn` \| array of those | `true`  | which origins are allowed (`true` reflects the request origin) |
| `methods`       | `boolean` \| `'*'` \| method \| method[]                    | `true`  | `Access-Control-Allow-Methods` (`true` mirrors the request)    |
| `allowedHeaders`| `true` \| `string` \| `string[]`                            | `true`  | `Access-Control-Allow-Headers` (`true` reflects the request)   |
| `exposeHeaders` | `true` \| `string` \| `string[]`                            | `true`  | `Access-Control-Expose-Headers` (`true` reflects the request)  |
| `credentials`   | `boolean`                                                   | `true`  | send `Access-Control-Allow-Credentials: true`                  |
| `maxAge`        | `number`                                                    | `5`     | `Access-Control-Max-Age` in seconds (`0` omits the header)     |
| `preflight`     | `boolean`                                                   | `true`  | answer `OPTIONS` preflight with `204` (else pass through)      |

### Behavior at a glance

| Aspect              | Behavior                                                                  |
| ------------------- | ------------------------------------------------------------------------- |
| Side                | cut from the client bundle — body and its imports removed, never ships to the browser (server-only; a no-op on the client via `next()`) |
| Default origin      | reflects the request `Origin`; `*` only when there's no `Origin` header   |
| Credentials + origin| an allowed origin is echoed literally, never `*` (spec requirement)       |
| String origin match | host-only by default; add a protocol to require a protocol match          |
| Preflight `OPTIONS` | answered with `204` when `preflight: true`; passed through otherwise      |
| `Vary`              | set to `Origin` for a reflected origin, `*` for a wildcard                |

If you also expose [OpenAPI](openapi) docs from a separate origin, the same
`cors()` on the root covers those routes too.
