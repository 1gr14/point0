---
index: 300
title: Request
description:
  The incoming request — headers, cookies, URL, method, client IP — handed to
  every server loader, ctx, and middleware.
---

`request` is the incoming HTTP request, parsed once and handed to your
server-side code. A [loader](loader), a [`.ctx`](ctx), and a
[`.middleware`](middleware) all receive it. Read headers, cookies, the URL, the
method, or the client IP off it; write the _response_ with the separate
[`set`](response) helper that arrives alongside it.

```tsx
export const meQuery = root.lets
  .query()
  .loader(async ({ request }) => {
    const token = request.headers['authorization'] // header keys are lowercased
    const session = request.cookies['session'] // cookies already parsed
    const me = await findUser(token, session)
    return { me }
  })
  .query()
```

`request` is a `Request0` — a thin, parsed wrapper over the native `Request`.
Field access is cheap; the heavier parsing (headers, cookies, client IP) is
deferred until first read and then cached.

## Where you get it

`request` is injected into the three server-side callbacks:

```tsx
.loader(({ request }) => { /* ... */ })       // a query/mutation/page loader
.ctx(({ request }) => { /* ... */ })          // .ctx
.middleware(({ request, next }) => next())    // .middleware
```

Outside those, reach it from anywhere on the server with `getRequest()`:

```tsx
import { getRequest, getRequestOrUndefined } from '@point0/core'

const request = getRequest() // throws if no request is in scope
const request = getRequestOrUndefined() // undefined instead of throwing
```

Use `getRequestOrUndefined()` in helpers that may run off-request — an analytics
call, an error reporter:

```tsx
const request = getRequestOrUndefined()
mixpanel?.track(event, { ip: request?.from.ip ?? undefined })
```

`request` is **server-only** — there is no request object in the browser. The
request lives in server-only async storage, so the two accessors behave
differently on the client:

- `getRequest()` is strict: on the client it throws
  `Cannot access serverOnlyStorage item "..." from client`.
- `getRequestOrUndefined()` returns `undefined` on the client instead of
  throwing, so isomorphic helpers stay safe to call from a component or hook.

## Reading headers

`request.headers` is a plain object with **all keys lowercased**:

```tsx
request.headers['authorization'] // => 'Bearer ...' | undefined
request.headers['content-type'] // => 'application/json' | undefined
request.headers['x-anything'] // any key works, always lowercase
```

It's a snapshot (`Record<string, string | undefined>`), not a `Headers` instance
— no `.get()`, no multi-value semantics, a missing key is `undefined`. When a
library wants a real `Headers`, hand it `request.original.headers` instead —
this is the usual shape for auth:

```tsx
const me = await authServer.api.getSession({
  headers: request.original.headers,
})
```

`request.headers` is built by iterating the native `Headers` with
`Headers.forEach`, which collapses a duplicated header into a single
comma-joined value per key (except `set-cookie`, which the runtime keeps
separate). When you need the per-value list — multiple `set-cookie`, say — use
`request.original.headers` and its `Headers` API.

## Reading cookies

`request.cookies` is the **incoming** cookies, already parsed into an object:

```tsx
request.cookies['session'] // => 'abc123' | undefined
```

Values are URL-decoded and surrounding quotes are stripped; no `cookie` header
gives an empty object `{}`. This view is **read-only** — it's what the client
sent. To _set_ or _delete_ a cookie on the response, use the `set` helper, not
`request.cookies`:

```tsx
.loader(({ request, set }) => {
  const current = request.cookies['session'] // read incoming
  set.cookies('session', newToken) // write outgoing
})
```

See [Response](response) for `set.cookies`, and [CookieStore](cookie-store) for
the reactive store that layers your outgoing changes over `request.cookies`.

Parsing details:

- **Quoted values** — a leading `"` strips the surrounding quotes (`"abc"` reads
  back as `abc`).
- **Percent-encoding** — `%XX` sequences in the value are URL-decoded; if a
  value is malformed and decoding throws, the unquoted value is kept as-is. The
  cookie name is decoded too, and if _that_ throws the raw name and raw value
  are stored untouched.
- **Duplicate names** — last one wins; the cookies are parsed into a plain
  object, so a later `name=` overwrites an earlier one.
- **`__Host-` / `__Secure-` prefixes** — no special handling; they're ordinary
  names parsed like any other cookie.

## The URL and route

There is **no `request.url`**. For the parsed URL use `request.location`, for
the raw string use `request.original.url`:

```tsx
request.location.pathname // => '/ideas/42'
request.location.search // => { tab: 'posts' }  (parsed query object)
request.location.searchString // => '?tab=posts' (raw, or '')
request.location.hash // => '#section'  (raw, or '')
request.location.href // => full absolute href (absolute inputs only)
request.original.url // => the raw URL string
```

`request.location` is a [Route0](navigation) location. Its `pathname` is the raw
URL pathname, trailing slash preserved as-is (a request to `/ideas/` reads back
`'/ideas/'`, not `'/ideas'`); route _matching_ normalizes internally. `search`
is the parsed query object.

Route params are **not** on `request`. They arrive as a separate, typed and
validated `params` option prop when you declare a
[`.params(schema)`](validation) — same for `search`, `body`, and the validated
`headers`/`cookies` subsets:

```tsx
.loader(({ request, params }) => {
  params // typed & validated — only present if .params(schema) was declared
})
```

There is no raw, untyped route-params view on `request`. `request.location` is
an unrouted location, so its `params` is `undefined`. The matched params do live
on the engine's classified variant — `request.variant.location.params` for an
`endpoint` — but that is internal plumbing, not stable read-side API.

So `headers`/`cookies` exist twice with different meanings: **on `request`**
they are the raw, full set (`string | undefined`); **as an option prop** they
are the validated subset you declared a schema for. See
[Validation](validation).

## The method

Always **uppercase**:

```tsx
request.method // => 'GET' | 'POST' | 'PUT' | ...
```

Typed as `WideRequestMethod` — the standard methods plus an open `string`, so
custom methods type-check.

## Where the request came from: `request.from`

`request.from` carries the request's origin — IP, user agent, referrer, scope.
Each member is parsed lazily on first read and cached:

```tsx
request.from.ip // => '203.0.113.7' | null   (unspoofable Bun requestIP, safe for security)
request.from.ips // => ['203.0.113.7', '70.41.3.18']   (all candidates, incl. spoofable)
request.from.userAgent // => 'Mozilla/5.0 ...' | null
request.from.location // => the referrer as a parsed location | null
request.from.scope // => an internal point0 scope header | null
request.from.server // => true if this is a server-to-server request
```

A structured log from `from` and `location`:

```tsx
console.log({
  request: {
    ip: request.from.ip,
    userAgent: request.from.userAgent,
    pathname: request.location.pathname,
    method: request.method,
    variant: request.variant.type,
  },
})
```

### IP resolution

`from.ip` is **always** Bun's `requestIP` — the real socket peer address, which
can't be spoofed — or `null` when no Bun server is wired in. It never falls back
to headers, so it's safe for security decisions.

`from.ips` is the full list of every candidate, de-duplicated, in this order:

1. Bun's `requestIP(...)` — the unspoofable peer address (when a Bun server is
   wired in); it leads the list.
2. `x-forwarded-for` — split on `,`, each entry trimmed, in order.
3. `x-real-ip`.
4. `cf-connecting-ip` (Cloudflare).

Everything after Bun's `requestIP` comes from headers the client **can spoof** —
treat `from.ips` as hints, not proof.

```tsx
// behind a Bun server, with x-forwarded-for: '1.1.1.1'
request.from.ip // => the real peer address — the forwarded header can't override it
request.from.ips // => [<peer address>, '1.1.1.1']

// no Bun server wired in (e.g. a synthetic request)
request.from.ip // => null — header values never become `ip`
request.from.ips // => ['1.1.1.1']   (header candidates are still listed)
```

During SSR the loaders Point0 prefetches run on internal server-to-server
requests, but `request.from` still reports the **original visitor** — Point0
reads it from the first request in the chain. So `from.ip` in a loader is the
real client IP, not the server's loopback. (`from.server` is the exception: it's
`true` on those internal hops.)

### Referrer, scope, server flag

- `from.location` is the `referer` (or native `referrer`) parsed into a
  location, or `null`. `request.from.location?.pathname` gives the page the
  request came from.
- `from.scope` is the scope of the **client** that sent the request — usually
  `root`. With several clients it's whichever client the request came from.
  point0 carries it in the internal `X-Point0-From-Scope` header on its own
  server-to-server fetch; `null` when no client scope is attached.
- `from.server` is `true` for an internal request point0 made on the server
  during SSR (see [Server-to-server chains](#server-to-server-chains)).

`from.location` parses the referrer the same way `request.location` parses the
URL. A **relative** `referer` (e.g. `/dashboard`) still gives you a location —
`pathname`, `search`, `hash` resolve, but `href`/`origin`/`host` come back
`undefined` (no absolute base to fill them). A **malformed** `referer` that
can't be parsed at all surfaces as an error from the getter rather than `null`,
so this is not the place to validate untrusted input.

## Per-request storage: `state` vs `cache`

Two scratch maps hang off the request. They differ in **lifetime**.

`request.state` is **per request instance** — set something in middleware, read
it in a later loader of the **same** request:

```tsx
.middleware(({ request, next }) => {
  request.state.startedAt = Date.now()
  return next()
})
.loader(({ request }) => {
  const elapsed = Date.now() - (request.state.startedAt as number)
})
```

`request.cache` is **shared along the whole request chain**. During SSR, point0
spawns extra server requests to prefetch page data; they travel the same path,
and `cache` is the same object across all of them. Use it to memoize work once
per render, like the current user:

```tsx
// runs once per request, even across SSR's chained sub-requests
export const getMe = async ({ request }: { request?: Request0 } = {}) => {
  request ??= getRequest()
  if (request.cache.me !== undefined) return request.cache.me // already resolved
  const me = await authServer.api.getSession({
    headers: request.original.headers,
  })
  request.cache.me = me
  return me
}
```

Both `state` and `cache` are typed `{ [key: string]: unknown }`. Add typed keys
by augmenting the module:

```tsx
declare module '@point0/core/request0' {
  interface RequestCache {
    me?: Me | null
  }
  interface RequestState {
    startedAt?: number
  }
}
```

## The native request: `request.original`

`request.original` is the underlying Fetch API `Request`. It's the escape hatch
for anything that wants the raw request — auth libraries, a handler you delegate
to:

```tsx
// hand the whole raw request to an auth handler
.middleware('/api/auth/*', async ({ request }) => authServer.handler(request.original))
```

Reach for `request.original` when you need native `Headers`, the request body
stream, or `formData()`. Point0 reads the body off `request.original` for you
and exposes it **parsed** as the loader's `body` option (when a
[`.body`](validation) schema is declared) — you rarely consume
`request.original` directly for the body.

`request.rawBody` is the engine's internal raw/parsed body cache — not stable
read-side API. Consume the parsed `body` option instead.

## Server-to-server chains

When a loader triggers another point0 query on the server during SSR, point0
builds a child request linked to the parent. The child:

- inherits the parent's `cookie` header (so auth carries through);
- shares the parent's `request.cache` (so per-request memoization holds);
- has `request.from.server === true`;
- links back via `request.prev` (the parent) and `request.first` (the root of
  the chain).

```tsx
request.prev // => the parent Request0 | undefined
request.first // => the first Request0 in the chain | undefined
request.from.server // => true inside such a chained request
```

For cross-hop work use `request.cache`, not `request.state`: each hop gets a
fresh `state` but the **same** `cache`.

## Reference

### Fields

| Field            | Type                                  | Notes                                                     |
| ---------------- | ------------------------------------- | --------------------------------------------------------- |
| `original`       | `Request`                             | the native Fetch request — the escape hatch               |
| `headers`        | `Record<string, string \| undefined>` | lowercased keys; a snapshot, not `Headers`                |
| `cookies`        | `Record<string, string \| undefined>` | incoming, parsed, read-only                               |
| `location`       | `AnyLocation`                         | parsed URL — `pathname`, `search`, `hash`, `href`, …      |
| `method`         | `WideRequestMethod`                   | always uppercase                                          |
| `from`           | `RequestFrom`                         | origin info (see below)                                   |
| `state`          | `RequestState`                        | per-instance scratch map; augmentable                     |
| `cache`          | `RequestCache`                        | chain-shared scratch map; augmentable                     |
| `renders`        | `number`                              | SSR render-pass count; `0` for plain endpoints; read-only |
| `variant`        | `RequestVariant`                      | how point0 classified the request (see below)             |
| `id`             | `string`                              | per-hop request id (each chain hop gets its own)          |
| `prev` / `first` | `Request0 \| undefined`               | parent / root in a server-to-server chain                 |
| `rawBody`        | `unknown`                             | engine-managed raw/parsed body cache — advanced/internal  |

### `request.from`

| Member      | Type                  | Notes                                             |
| ----------- | --------------------- | ------------------------------------------------- |
| `ip`        | `string \| null`      | Bun `requestIP` or `null` — never a header value  |
| `ips`       | `string[]`            | all IP candidates, de-duped, trusted-first        |
| `userAgent` | `string \| null`      | the `user-agent` header                           |
| `location`  | `AnyLocation \| null` | referrer parsed into a location                   |
| `scope`     | `string \| null`      | scope of the client that sent it (usually `root`) |
| `server`    | `boolean`             | `true` for an internal server-to-server request   |

### `request.variant`

`request.variant` is how the engine classified this request. It starts
`{ type: 'unknown' }` and the engine sets it as the request is routed, so early
middleware may still see `'unknown'`. The discriminant is
`'publicdir' | 'endpoint' | 'page' | 'error' | 'unknown'`:

```tsx
request.variant.type // => 'page' | 'endpoint' | ...
'point' in request.variant ? request.variant.point?.id : undefined // => 'root:page:home'
```

### `request.renders`

The SSR render-pass counter, backed by `cache` (so chain-shared). Live during
SSR — a loader prefetched on the first pass reads `1` — and the final total once
the request settles; `0` for a plain endpoint request with no SSR. It's
**read-only**: assigning to it throws (getter with no setter). The engine also
emits the final total as a dev-only `X-Point0-Renders-Count` response header.

### `request.id`

An opaque id, generated when the request is created. It identifies a single hop,
not the whole chain — each server-to-server hop gets its own fresh `id`. To
correlate across a chain, follow `prev`/`first` (or read `request.first.id`),
not `id` alone.

### Reading vs writing

`request` is the **read** side. To **write** the response — headers, cookies,
status — use the `set` helper that arrives next to `request` in every loader,
`.ctx`, and middleware:

```tsx
.loader(({ request, set }) => {
  const token = request.headers['authorization'] // read
  set.status(201) // write
  set.cookies('session', token) // write
})
```

Full response surface is on [Response](response); the reactive cookie store is
on [CookieStore](cookie-store).
