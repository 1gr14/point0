---
index: 200
title: Loader
description:
  The server (or client) callback that produces a point's data — cut from the
  client bundle, so it ships nothing to the browser.
---

A loader is the callback that produces a point's data. Each point has **one**
loader. The server `.loader` is **cut from the client bundle** — its body and
the imports it uses are removed, so it never ships to the browser, and your
database code never reaches it. `.clientLoader` is the inverse.

The two loaders are strict opposites in stripping. The server `.loader` is
**server-only**: cut from the client bundle — its body and the imports it uses
are removed, so it never ships to the browser (it runs on the server). The
`.clientLoader` is **client-only**: cut from the server bundle — body and its
imports removed, regardless of SSR (it runs in the browser).

```tsx
export const ideaViewQuery = root.lets
  .query()
  .input(z.object({ sn: z.string() }))
  .loader(async ({ input: { sn } }) => {
    // cut from the client bundle — this whole callback is removed from the client
    // build, and so is every import only it uses (your Prisma client included)
    const idea = await prisma.idea.findUniqueOrThrow({ where: { sn } })
    return { idea } // becomes the point's `data`
  })
  .query()
```

Whatever the loader returns becomes the point's `data`. On a
[mountable](mountable) — page, layout, component, provider — that `data` is then
ready for `.with`, `.head`, `.mapper`, and the component itself. And the moment
you put a `.loader` on a mountable, that point **is also a query**: it exposes
the full query surface (`useQuery`, `fetchQuery`, prefetch, `getQueryKey`, …) so
you can load and cache its data like any other [query](query). The rest of this
page shows the argument the loader receives, what it can return, and which
bundle each loader is cut from.

## Which points have loaders

`.loader` and `.clientLoader` are available on every concrete point:
[page](page), [layout](layout), [component](component), [provider](provider),
[query](query), [infinite-query](infinite-query), [mutation](mutation), and
[action](action).

```tsx
// a query is just input + loader
export const listAccountsQuery = root.lets
  .query()
  .loader(async ({ request }) => ({
    accounts: await authServer.api.listUserAccounts({
      headers: request.original.headers,
    }),
  }))
  .query()
```

Two exceptions:

- An **action** has `.loader` (it's a server-only mutation) but **no
  `.clientLoader`** — there's no browser side to run.
- The composition stages — [root](root), [base](base), [plugin](plugin) — have
  neither, because their final point type isn't fixed yet. You add a loader once
  you've branched into a concrete point (`.page`, `.query`, …).

A [page](page) or [component](component) without any loader is a pure
[mountable](mountable): it renders, issues no server request, and exposes no
useful query.

## What the loader receives

Cut from the client bundle — the server `.loader`'s body and the imports it uses
are removed, so it never ships to the browser (it runs on the server).

The server loader gets one object. Every key below is always present except the
parsed inputs, which appear only when you declared their schema:

```tsx
.loader(async ({ input, params, search, body, ctx, request, set, data, points }) => {
  // ...
})
```

```tsx
export const ideaNewsQuery = root.lets
  .query()
  .params(z.object({ id: z.string() }))
  .search(z.object({ page: z.coerce.number().default(0) }))
  .loader(async ({ params, search }) => {
    // params and search are parsed and typed — present because their schemas exist
    return { news: await loadNews(params.id, search.page) }
  })
  .query()
```

- **`input` / `params` / `search` / `body` / `headers` / `cookies`** — the
  parsed, validated input. Each key exists only when you declared the matching
  schema (`.input`, `.params`, …). See [Validation](validation).
- **`ctx`** — the server context built by `.ctx` and plugins up the chain. `ctx`
  is server-only; you can read it here and in `.ctx`, never at render. The keys
  a `.ctx(..., { expose })` exposed are also spread at the top level of this
  object, alongside the nested `ctx`.
- **`data`** — the data accumulated so far up the chain (a shallow clone, so
  reassigning top-level keys is harmless, but mutating nested objects still
  reaches shared references). An empty `.loader()` returns exactly this.
- **`request`** — the incoming [request](request): `request.original` (the raw
  `Request`), `request.method`, `request.location`, the lazy getters
  `request.headers` and `request.cookies` (direct on the request), and the
  caller details under `request.from` (`request.from.ips`, `request.from.ip`,
  `request.from.userAgent`).
- **`set`** — a [response](response) helper: `set.headers(name, value)`,
  `set.cookies(name, value, options?)`, `set.status(code)`. It also carries
  `set.inspect` — a read-only snapshot of the headers, cookies, and status set
  so far (`set.inspect.headers.x`) — and `set.apply(response)`, which returns a
  new `Response` with the accumulated headers, cookies, and status applied.
- **`points`** — the server points registry (`points.findPoint`,
  `points.findEndpoint`, `points.collection`).

```tsx
.loader(async ({ ctx, set }) => {
  set.cookies('seen', '1') // attach a Set-Cookie to the response
  return { userId: ctx.me.user.id } // ctx populated by an upstream plugin
})
```

## What the loader returns

The return value becomes `data`. Five shapes are accepted:

```tsx
.loader(async ({ input }) => {
  return { idea }                        // 1. plain data → becomes `data`
  return undefined                       // 2. undefined / nothing → empty data {}
  return [404, { idea }]                 // 3. [status, data] → also sets the HTTP status
  return redirect('home')                // 4. a redirect → redirects
  throw new AppError('Not found')        // 5. an Error (thrown or returned) → error state
})
```

- **Plain data** — a plain object (`Record<string, unknown>`). Arrays, strings,
  and other primitives are a type error; data must be an object.
- **`undefined` / `void`** — treated as empty data `{}`.
- **`[status, data]`** — a tuple applies `set.status(...)` then uses the second
  element as the data (or a `Response`); a redirect or error in the second slot
  short-circuits first, so the status is not applied in that case.
- **A redirect** — return (or throw) a `RedirectTask` from the
  [`redirect(...)`](navigation) helper; Point0 turns it into an HTTP redirect.
- **An `Error`** — returning an `Error` is the same as throwing one: it
  short-circuits to the error state. A thrown error is converted through your
  [error class](error-handling), and its `status` is applied to the response.

```tsx
// real production loader: read ctx, gate, then return data — or throw a typed error
export const ideaUpdateMutation = root.lets
  .mutation()
  .use(authorizedOnlyPlugin) // puts the user in ctx
  .input(ideaUpdateMutationSchema)
  .loader(async ({ ctx, input: { sn, title, content } }) => {
    const existing = await prisma.idea.findUniqueOrThrow({
      select: { authorId: true },
      where: { sn },
    })
    if (existing.authorId !== ctx.me.user.id) {
      throw new AppError('Only the author can edit this idea', {
        code: 'FORBIDDEN',
      })
    }
    const idea = await prisma.idea.update({
      where: { sn },
      data: { title, content },
    })
    return { idea }
  })
  .mutation()
```

### Returning a `Response`

Only a [mutation](mutation) or an [action](action) loader may return a raw
`Response`; doing so sets the response and forces `data` to `undefined` ("a
response carries no data"). On a page, query, layout, component, or provider,
returning a `Response` is a type error:

```tsx
.loader(() => new Response('ok'))
// ✓ on a mutation / action
// ✗ on a page or query — "Output can not be type of \"Response\" for point of type \"page\""
```

A [query](query) loader specifically must return plain object data, never a
`Response`.

## Client loaders

`.clientLoader` runs in the browser instead of the server. Use it for data that
lives client-side — there's no `ctx`, `request`, `set`, or `points`, because
those are server-only:

Cut from the server bundle — `.clientLoader`'s body and its imports are removed
(it runs in the browser).

```tsx
export const settingsQuery = root.lets
  .query()
  .clientLoader(() => ({ theme: localStorage.getItem('theme') ?? 'light' }))
  .query()
```

The client loader's argument has `data`, `serverData` (the server loader's
output, if any), `response` (the server `Response`, if any), and the parsed
client inputs (`input` from `.clientInput`, plus `params` and `search`). Its
return shapes match the server loader, **minus** the `[status, data]` tuple —
status is a server concern. A `RedirectTask` redirects, an `Error` (thrown or
returned) shows the error state, `undefined` is empty data `{}`.

A query whose only loader is a `.clientLoader` runs entirely in the browser and
has **no HTTP endpoint** (and no [OpenAPI](openapi) entry). A `.loader` makes
the query a real endpoint; a `.clientLoader` does not. See [Query](query).

Data returned by a loader round-trips through the configured
[transformer](transformer), so non-JSON values survive the server-to-client hop:

```tsx
.clientLoader(() => ({ date: new Date('2026-01-01') }))
// in the component, `data.date` is a real Date instance, not a string
```

## One loader per point

A point has exactly one loader — server or client, never both, never two of the
same kind. The order is fixed: `.ctx`, all input schemas, then the single
loader. Nothing comes after it.

```tsx
root.lets.query().loader(fn).loader(fn) // ✗ second loader
root.lets.query().clientLoader(fn).loader(fn) // ✗ one loader total
root.lets.query().loader(fn).ctx(fn) // ✗ ctx must come before the loader
```

Both the type system and the runtime enforce this. The type error reads "You can
not use loader() after the loader — only one loader per point, and
ctx/input/schemas must be defined before it"; the runtime backstop throws "You
can not call .loader() … its setup stage is \"loadedStage\"".

## What runs where, and what stays secret

The server `.loader` is **server-only**: cut from the client bundle — at compile
time the compiler empties the `.loader` callback for the client build and drops
the imports only it used (your Prisma client, secrets, server SDKs all vanish),
so none of it ever ships to the browser. The `.clientLoader` is the inverse —
**client-only**: cut from the server bundle, body and its imports removed; kept
on the client. (This is purely about which bundle the code is removed from —
when SSR is enabled, the first page load is still server-rendered; it's only
navigation between pages afterward that runs client-side, SPA-style.)

This means a server `.loader` is a safe place for secrets and database access —
none of it ever reaches the browser. But it does **not** make the point itself a
security gate. A page's `.ctx` and `.loader` run only when the page actually has
a loader and is requested — a loader-less page makes no server call, so its
`ctx` never runs. Gate authorization in [`.with`](with) (or a [plugin](plugin)
that combines `.ctx` and `.with`), not in the loader alone:

```tsx
export const authorizedOnlyPlugin = Point0.lets
  .plugin()
  .with(({ props: { me } }) => {
    if (!me)
      return new AppError('Only for authorized users', { code: 'UNAUTHORIZED' })
    return { me }
  })
  .plugin()
```

`me` comes from an upstream plugin that resolves the current user. `AppError` is
your own error class — anything with the shape of the default `ErrorPoint0`. See
[error handling](error-handling) for how to build one (with
[error0](error-handling) or otherwise).

## Reference

### Server loader argument

| Key              | Type                                                       | When                                  |
| ---------------- | ---------------------------------------------------------- | ------------------------------------- |
| `input`          | parsed `.input` value                                      | when `.input` is set                  |
| `params`         | parsed route params                                        | when the route has params / `.params` |
| `search`         | parsed query string                                        | when `.search` is set                 |
| `body`           | parsed request body                                        | when `.body` is set                   |
| `headers`        | parsed request headers                                     | when `.headers` is set                |
| `cookies`        | parsed request cookies                                     | when `.cookies` is set                |
| `ctx`            | server context                                             | always (`{}` if no `.ctx`/plugin)     |
| exposed ctx keys | whatever `.ctx(expose)` exposed                            | spread at top level alongside `ctx`   |
| `data`           | accumulated data up the chain                              | always (clone)                        |
| `request`        | the [request](request)                                     | always                                |
| `set`            | [response](response) helper (`headers`/`cookies`/`status`) | always                                |
| `points`         | server points registry                                     | always                                |

### Return values

| Return                       | Effect                                                                 |
| ---------------------------- | ---------------------------------------------------------------------- |
| plain object                 | becomes `data`                                                         |
| `undefined` / `void`         | empty data `{}`                                                        |
| `[status, data]`             | sets the HTTP status, then handles `data` (server only)                |
| `Response`                   | sets the response, `data` becomes `undefined` (mutation / action only) |
| `RedirectTask`               | redirects (from the [`redirect(...)`](navigation) helper)              |
| `Error` (thrown or returned) | error state; status applied; normalized via your error class           |
| array / string / primitive   | **type error** — data must be a plain object                           |

The client loader (`.clientLoader`) takes the same return values **except** the
`[status, data]` tuple, and a `Response` only on a mutation. Its argument is
`{ data, serverData, response }` plus the parsed client inputs (`input`,
`params`, `search`) — no `ctx`, `request`, `set`, or `points`.
