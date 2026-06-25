---
index: 300
title: Context
description: Server-only values, computed once per request and read by every loader and ctx that follows.
---

`.ctx` adds values to a server-only context. The function runs on the server
during a request; what it returns is merged into the running context, and every
later `.ctx` and the `.loader` can read it. It's the place to resolve real
request-scoped values — the current user, a request-scoped flag — once, before
the loaders. (A DB client or anything that doesn't depend on the request belongs
in a plain `import`, not in `ctx` — the import is stripped from the client bundle
anyway.)

```tsx
.ctx(async ({ request }) => {
  return { me: await getMe({ request }) } // me is now in ctx for every loader below
})
.loader(async ({ ctx }) => {
  const ideas = await prisma.idea.findMany({ where: { authorId: ctx.me?.id } })
  return { ideas }
})
```

**Cut from the client bundle — its body and the imports it uses are removed, so
it never ships to the browser.** The compiler strips the `.ctx` callback's body
from the browser bundle, and prunes anything it imports along with it, so that
code never reaches the client. This holds whether or not the point has
`ssr: true`. (It runs on the server, during the request, before the loader.)

## Which points

`.ctx` is available on every point — [root](root), [base](base),
[plugin](plugin), [page](page), [layout](layout), [component](component),
[provider](provider), [query](query), [infinite-query](infinite-query),
[mutation](mutation), and [action](action) — while it's still being composed
(before the loader). After you finalize a point, `.ctx` is gone; calling it on a
finalized or already-loaded point is a type error and throws at runtime.

It runs only on points that issue a server request. An [action](action) always
has a server loader, so its `.ctx` always runs when it executes. A
[query](query), [infinite-query](infinite-query), or [mutation](mutation) runs
its `.ctx` only when it has a server `.loader()`; a `.clientLoader()`-only
query/mutation runs in the browser with no endpoint, so — like a loader-less
[page](page) — its server-only `.ctx` never runs. A [page](page) or
[layout](layout) **without** a loader also makes no request — see
[the gotcha](#it-runs-only-when-the-point-has-a-loader) below.

## The merge

What you return is shallow-merged onto the previous context — later keys win:

```tsx
.ctx(() => ({ x: 1 }))
.ctx(({ ctx }) => ({ y: ctx.x + 1, x: 999 })) // reads x from the previous ctx
// nextCtx = { ...prevCtx, ...returned }  =>  { x: 999, y: 2 }
```

You can stack as many `.ctx` calls as you like — each sees the context built up
by the ones before it. There is still only **one loader** per point.

Return `undefined` (or nothing) and the context is left untouched — useful for a
`.ctx` that only validates or redirects:

```tsx
.ctx(({ ctx }) => {
  if (!ctx.feature) return // no override
  return { extra: load() }
})
```

## What the function receives

The callback gets one object:

```tsx
.ctx(({ ctx, request, set, points }) => {
  // ctx     — the context accumulated so far (fully typed)
  // request — the incoming Request0
  // set     — response helper for headers / cookies / status
  // points  — the server-side points collection (e.g. openapi reads it to build its schema)
  return {}
})
```

Parsed `input` / `params` / `search` / `body` / `headers` / `cookies` are also
present when the matching schema is declared **above** this `.ctx` in the chain.

<!-- TODO(med): no test or example reads `set`, `points`, or parsed input from inside `.ctx` — confirm the runtime shape before documenting these as recommended. -->

## Plain object instead of a function

When the values don't depend on the request, pass an object directly:

```tsx
.ctx({ tenant: 'acme' })          // same as .ctx(() => ({ tenant: 'acme' }))
.ctx(() => ({ now: Date.now() }))  // a function for request-time values
```

Passing a function where an object is expected is a type error
(`Use ctx(fn) for function values`). Returning an array from a `.ctx` function is
also a type error (`Ctx fn should not return array`).

## Redirect and error

Return (or throw) a `RedirectTask` to redirect — later `.ctx` calls and the
loader don't run:

```tsx
.ctx(({ ctx }) => {
  if (!ctx.me) return redirect('signIn')
  return { me: ctx.me } // narrows me to non-null for the rest of the chain
})
```

Return (or throw) an `Error` to abort the request with that error:

```tsx
.ctx(({ ctx }) => {
  if (!ctx.me) throw new ErrorPoint0('Only for authorized users', { code: 'UNAUTHORIZED' })
  return { me: ctx.me }
})
```

`ErrorPoint0` is the framework's default error class; returning it and throwing
it behave the same. You can swap it for your own class of the same-or-wider
shape — `AppError` in the rest of this page is just such a class. See
[Error handling](error-handling).

## Exposing keys

By default a `.ctx` value is reachable only through `ctx.x`. Pass `expose` to
also spread the key at the top level of later `.ctx` and `.loader` arguments:

```tsx
.ctx({ x: 1 }, true)            // expose every returned key
.loader(({ ctx, x }) => ...)   // both ctx.x and bare x are available

.ctx({ x: 1, y: 2 }, ['x'])    // expose only x
.loader(({ x }) => ...)        // x is here; y is NOT — only ctx.y
```

`expose: true` exposes all returned keys; a string array exposes only those.
Exposed keys accumulate across multiple `.ctx` calls. These keys are reserved and
can't be exposed (it's a type error): `request`, `input`, `inputRaw`, `data`,
`set`, `execute`, `ctx`.

## It runs only when the point has a loader

`.ctx` runs **only when the point issues a server request** — that is, only when
it has a loader. A loader-less [page](page) or [layout](layout) makes no request,
so its `.ctx` never executes.

```tsx
// This page has no loader → no request → this .ctx never runs.
export const profilePage = root.lets
  .page('/profile')
  .ctx(({ ctx }) => {
    if (!ctx.me) throw new AppError('nope', { code: 'UNAUTHORIZED' }) // NEVER fires
    return { me: ctx.me }
  })
  .page(({ props: { me } }) => <Profile me={me} />)
```

Server-only code (loader bodies, `.ctx` functions) is cut from the client bundle
by the compiler — its body and the imports it uses are removed, so it never ships
to the browser — and `.ctx` runs only when a request is actually made.
**Do not gate access in `.ctx` alone** — gate it in [`.with`](with), which runs
at render on both server and client, so it fires on the initial SSR render and on
every later client-side navigation. The production pattern pairs a `.ctx` (for
server loaders) with a `.with` (for the render):

```tsx
export const authorizedOnlyPlugin = Point0.lets
  .plugin()
  .use(mePlugin) // an upstream plugin that puts `me` in ctx and props
  .ctx(({ ctx: { me } }) => {
    if (!me) throw new AppError('Only for authorized users', { code: 'UNAUTHORIZED' })
    return { me } // narrows me to non-null in ctx
  })
  .with(({ props: { me } }) => {
    if (!me) return new AppError('Only for authorized users', { code: 'UNAUTHORIZED' })
    return { me } // narrows me to non-null in props
  })
  .plugin()
```

`me` comes from the upstream `mePlugin` — `props.me` doesn't appear on its own.
Here `AppError` is your own error class (or `ErrorPoint0`). See [`.with`](with)
and [Plugin](plugin) for the full gate.

Unlike `.ctx`, `.with` is **server-ssr-and-client**: it's cut from the server
bundle when `ssr: false` (or after a `.clientOnly()`) — its body and imports
removed from the server build — but kept in the client build always, and in the
server build only when SSR is on. So it fires on the initial SSR render and on
every later client-side navigation — which is exactly why it's the place to gate
the render. `.ctx` (cut from the client bundle) and `.with` (cut from the server
bundle only when SSR is off) cover the two halves: loaders and render.

## Reference

### Signature

```tsx
.ctx(fn)            // function: receives { ctx, request, set, points, ...parsed }
.ctx(object)        // plain object, when values don't depend on the request
.ctx(fnOrObject, true)        // expose every returned key
.ctx(fnOrObject, ['a', 'b'])  // expose only these keys
```

Returns the same point chain with `ctx` advanced. Chainable.

### Function return values

| Return                       | Effect                                                  |
| ---------------------------- | ------------------------------------------------------- |
| a plain object               | shallow-merged into `ctx` (later keys override earlier) |
| `undefined` / `void`         | leaves `ctx` unchanged                                   |
| an `Error` (returned or thrown) | aborts the request with that error                   |
| a `RedirectTask` (returned or thrown) | redirects; later `.ctx` / loader don't run     |
| an array                     | **type error** — `Ctx fn should not return array`       |

The function may be `async`; it's awaited. A plain object argument must not be a
function (`Use ctx(fn) for function values`).

### Forbidden expose keys

`request`, `input`, `inputRaw`, `data`, `set`, `execute`, `ctx`. Listing any in
`expose` is a type error (`Forbidden to expose ctx keys: ...`).
