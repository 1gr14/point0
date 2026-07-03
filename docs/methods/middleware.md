---
index: 400
title: Middleware
description:
  Server middleware — optionally route- or method-scoped — for CORS, third-party
  handlers, and integrations that sit outside the point chain.
---

`.middleware` adds a server-side function that runs around a request, the same
idea as Express or Koa middleware. You reach for it to mount things that live
_outside_ the point model — CORS, a third-party auth library, an OpenAPI doc
server — not to load data or guard a point. For point0's own data and access
control you use [loaders](loader), [`.ctx`](ctx), and [`.with`](with) instead;
middleware is the escape hatch for everything else.

```tsx
export const root = Point0.lets
  .root()
  // hand the whole /api/auth/* tree to better-auth
  .middleware('/api/auth/*', async ({ request }) =>
    authServer.handler(request.original),
  )
  // serve the OpenAPI spec + Scalar/Swagger UIs
  .middleware(
    openapi({
      route: '/openapi.json',
      scalar: '/scalar',
      swagger: '/swagger',
      filter: 'all',
      before: basicAuth({ users: serverEnv.OPENAPI_CREDENTIALS }),
    }),
  )
  .root()
```

Mounted on the root, a middleware runs on **every** server request.

## Where it runs, and where it doesn't

`.middleware` is **server-only** — cut from the client bundle: the
[compiler](compiler) empties its arguments, so the body and anything it pulls in
(your `authServer`, `prisma`, secrets) never ships to the browser; on the client
it's a no-op. It stays in the server build, where it runs — call server-only
code inside it freely.

This is also why middleware is the wrong tool for an authorization gate. After
the initial SSR render, navigation is client-side (SPA-style), and a point that
isn't server-rendered still renders in the browser — whether or not a server
middleware ran. Gate access in a [`.with`](with) wrapper, which runs at render
on both server and client.

## Which points have it

`.middleware` is a **stage-method** — you call it while building a point, before
the closing `.root()` / `.page()` / `.query()` / etc. It's available on every
stage point: [root](root), [base](base), [plugin](plugin), [page](page),
[layout](layout), [component](component), [provider](provider), [query](query),
[infinite-query](infinite-query), [mutation](mutation), and [action](action). It
is **not** a ready-method — once the point is closed it's gone.

In practice it lives on the [root](root) (run on every request) or on an
individual point. A point's own middleware runs only when that point is hit:

```tsx
const page = root.lets
  .page('/dashboard')
  .middleware(async ({ next }) => {
    // runs only for a request to /dashboard, after root's middleware
    return next()
  })
  .page(/* ... */)
```

A query, infinite-query, mutation, and action each have their own server
endpoint, so their middleware fires on a request to that endpoint. A component
or provider has an endpoint only when it carries a [loader](loader); without one
it's never hit on the server, so its middleware never runs. A plugin is not a
server point at all — its middleware folds into whatever point applies the
plugin, and runs there. Whichever point a request resolves to, that point's full
middleware list — inherited (from the root down) then its own — runs around it.

## The middleware function

A middleware receives one options object and returns a `Promise` of either a
`Response` or the result of `next()`:

```tsx
.middleware(async ({ request, set, next, points }) => {
  // ...do something before the request is handled
  const result = await next() // run the rest of the chain + the point
  // ...do something after
  return result
})
```

`next()` runs the remaining middleware and finally the point itself. Call it
once and return either its result or your own `Response`. Calling `next()` twice
throws `next() called multiple times`.

The options object:

| Key       | What                                                                                                                                                                                                                                  |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `request` | the [Request0](request) wrapper. `request.original` is the native Fetch `Request`; also `request.headers`, `request.method`, `request.location`, `request.from.ip`, and `request.state` / `request.cache` for passing data downstream |
| `set`     | the [response effects](response) helper — `set.headers(...)`, `set.cookies(...)`, `set.status(n)`, plus `set.inspect` to read back what's set                                                                                         |
| `next`    | run the rest of the chain; returns a detailed result (see below)                                                                                                                                                                      |
| `points`  | the server [points collection](engine-runtime) — `collection`, `findPoint`, `findEndpoint`, `findPage`                                                                                                                                |
| `scope`   | the points [scope](query#mode-tags-scope) this middleware belongs to                                                                                                                                                                  |
| `params`  | parsed route params — **present only when the scoping route has params**                                                                                                                                                              |

### What `next()` returns

`next()` does not return a bare `Response` — it returns a detailed result so an
outer middleware can inspect what the inner chain produced before deciding what
to send:

```tsx
.middleware(async ({ next }) => {
  const result = await next()
  // result.variant.type: 'page' | 'endpoint' | 'middleware' | 'error' | 'options' | 'publicdir'
  if (result.variant.type === 'page') {
    return new Response('overriden page response', { status: 200 })
  }
  return result // pass it through unchanged
})
```

`result` carries `response`, `request`, `scope`, `error` (your error class, or
`undefined`), and `variant`. Return a new `Response` to override, or the
`result` to forward.

## Scope by route

Pass a route string (or a [Route0](navigation) route object) as the first
argument, then the function(s). The middleware runs only on an **exact** path
match; on any other path it transparently forwards via `next()`:

```tsx
// only on /api/auth/* — better-auth owns that whole subtree
.middleware('/api/auth/*', async ({ request }) => authServer.handler(request.original))
```

A trailing `*` is a wildcard segment that captures the remainder of the path, so
`/api/auth/*` matches `/api/auth/sign-in/email`. Named params arrive typed in
`params`:

```tsx
.middleware('/zxc/:id', async ({ params }) => {
  // params is { id: string }
  return Response.json({ id: params.id }, { status: 201 })
})
```

This only illustrates route params and a returned `Response` — don't build your
own JSON endpoints this way. For an endpoint, author an [action](action) point
instead.

The wildcard's captured remainder arrives in `params` under the key `*`. For
`/api/auth/*` matching `/api/auth/sign-in/email`, `params` is
`{ '*': '/sign-in/email' }`:

```tsx
.middleware('/api/auth/*', async ({ request, params }) => {
  // params['*'] is the part after /api/auth, e.g. '/sign-in/email'
  return authServer.handler(request.original)
})
```

A **string** route is extended off the point's own route, so a route on a based
point composes with its inherited prefix — exactly like a [page's route](page).
A route object is used as-is.

## Scope by method

Put a method (or array of methods) before the route to also filter by HTTP
method. A request that misses the method falls through — for an
otherwise-unknown path that means a 404:

```tsx
.middleware('POST', '/zxc/:id', async ({ params }) => {
  return Response.json({ id: params.id }, { status: 201 })
})
// POST /zxc/123 => 201
// PUT  /zxc/123 => 404 Not Found  (method didn't match, nothing else handles it)

.middleware(['POST', 'PUT'], '/zxc/:id', () => { /* ... */ })
// POST and PUT => handled; DELETE => 404
```

A route-only middleware (no method) reacts to **any** method on that path.

## Setting headers, cookies, status

`set` mutates the response that the chain finally returns — the effects are
applied even when a later middleware returns its own `Response` or throws:

```tsx
.middleware(async ({ set, next }) => {
  set.headers('x-timing', 'on')
  return next()
})
```

`set` in a middleware is the same helper a loader gets, so `set.cookies(...)`
and `set.status(n)` work alongside `set.headers(...)`:

```tsx
.middleware(async ({ set, next }) => {
  set.headers('x-timing', 'on')
  set.cookies('seen', '1')
  set.status(201)
  return next()
})
```

`set.inspect` reads back what's been set so far (`set.inspect.headers.y`),
useful when one middleware reacts to another's headers. Full surface is on the
[Response](response) page.

## Composition and order

Multiple `.middleware` calls accumulate in declaration order, and several
functions in one call merge into one. Inherited middleware runs **first**: a
point built off the root runs the root's middleware, then its own.

```tsx
const root = Point0.lets
  .root()
  .middleware(async ({ next }) => {
    /* 'root' */ return next()
  })
  .root()

const page = root.lets
  .page('/home')
  .middleware(async ({ next }) => {
    /* 'page' */ return next()
  })
  .page(/* ... */)
// order for a /home request: root, then page
```

Under [SSR](ssr) a page request can run the middleware chain more than once:
point0 uses a render-to-discover loop, so a page may re-render a few times (or
just once, if it has no pending data) before the HTML settles. Keep middleware
side-effect-light and idempotent. See [SSR](ssr) for how the loop works and
`request.renders` on the [Request0](request) page for the live render-pass
count.

## Errors thrown inside

Throwing from a middleware turns into an error response. A plain `Error` becomes
`500`; an [`ErrorPoint0`](error-handling) (or your own error class) carries its
status:

```tsx
.middleware(async () => {
  throw new ErrorPoint0('restricted error', { status: 403 }) // => 403
})
.middleware(async () => {
  throw new Error('custom error') // => 500
})
```

Headers you set with `set.headers` before the throw survive onto the error
response.

## Passing data to loaders

A middleware can stash data on the request for a later loader or [`.ctx`](ctx)
to read, instead of forcing it through the point chain. There are two scratch
maps — `request.state` is per request instance, `request.cache` is shared along
the whole request chain (and across SSR render passes), so a value written in
middleware reaches every downstream loader:

```tsx
.middleware(({ request, next }) => {
  request.state.x = 123 // per-instance scratch
  request.cache.y = 456 // chain-shared — survives across SSR hops & re-renders
  return next()
})
```

See [Request0](request#per-request-storage-state-vs-cache) for when to use
which.

## Built-in middleware

These ship as functions you pass straight to the functions-only form — they are
`MiddlewareFn`s. Each is server-only too: cut from the client bundle (body and
its imports removed), so it never ships to the browser and is a no-op there.

```tsx
.middleware(cors({ origin: true, credentials: true }))
.middleware(basicAuth({ users: { admin: 'adminpassword' } }))
.middleware(openapi({ route: '/openapi.json', scalar: '/scalar' }))
```

- **`cors`** (`@point0/cors`) — sets CORS headers and answers preflight
  `OPTIONS`. Accepts-all by default; configure `origin`, `methods`,
  `allowedHeaders`, `credentials`, `maxAge`, `preflight`.
- **[`basicAuth`](basic-auth)** (`@point0/basic-auth`) — HTTP Basic auth gate.
  `users` is a `Record<user, pass>` (or a string / list / `validator` fn);
  either forwards via `next()` or returns a `401`/`429`.
- **[`openapi`](openapi)** (`@point0/openapi`) — serves the generated OpenAPI
  JSON (and optional Scalar / Swagger UIs) on `GET` of the configured routes.
  Its options and the separate per-point `.openapi()` method live on the
  [openapi](openapi) page.

## Reference

### Signatures

```tsx
.middleware(...fns)                  // run on every request to this point
.middleware(route, ...fns)           // only on an exact route match
.middleware(method, route, ...fns)   // ...and only for these HTTP method(s)
```

- `route` is a route string (extended off the point's own route) or a
  [Route0](navigation) route object.
- `method` is one of point0's request methods (`'GET'`, `'POST'`, …) or an array
  of them — any string is accepted.
- At least **one** function is required. Each returns
  `Promise<Response | (the next() result)>`. Multiple functions in one call
  merge into a single koa-style chain.
- Returns the same stage point, so it chains.

### Result variants from `next()`

`result.variant.type` is one of: `'page'`, `'endpoint'`, `'middleware'`,
`'error'`, `'options'`, `'publicdir'`. Each result also has `response`,
`request`, `scope`, and `error` (`undefined` when there was no error).
