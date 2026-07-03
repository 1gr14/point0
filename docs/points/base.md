---
index: 1100
title: Base
description:
  A base holds shared settings for a subset of points — a route prefix,
  defaults, gating — that its children inherit.
---

A base is a point that holds shared settings — a route prefix, query defaults,
loading and error UI, a [plugin](plugin), injected queries — for a _subset_ of
your points. You build other points off it, and they inherit everything it set.
A base is authoring-time only: it has no route and no endpoint of its own, and
it never reaches the server or client points files.

```tsx
import { root } from '@/lib/root'
import { adminOnlyPlugin } from '@/modules/auth/plugins'

export const adminBase = root.lets
  .base()
  .basePath('/admin') // every child route gets the /admin prefix
  .use(adminOnlyPlugin) // every child is gated by this plugin
  .base()
```

Every admin point now grows from `adminBase` and inherits both:

```tsx
export const adminUserListQuery = adminBase.lets
  .query()
  .input(adminUserListSchema)
  .loader(/* ... */)
  .query()
// served under /admin, gated by adminOnlyPlugin — nothing extra to write
```

## Declaring a base

A base opens with `.lets.base()` and **closes with a second `.base()`**:

```tsx
export const adminBase = root.lets.base().basePath('/admin').base()
//                            ▲ open                        ▲ close
```

`.lets.base()` starts the composition; the trailing `.base()` finalizes it. The
name (`'adminBase'`) comes from the variable — see [points](points) for how the
short `.lets` notation works.

The `.base` closer is **server-and-client** — not cut from either bundle. A base
is authoring-time only, so the closer carries no payload to cut.

A base can grow from the [root](root), from another base (bases chain), or from
a [layout](layout):

```tsx
export const base = root.lets.base().base() // from root
export const apiBase = base.lets.base().basePath('/api').base() // from a base
export const sectionBase = someLayout.lets.base().base() // from a layout
```

After the closing `.base()` you can only start children off it (`.lets`) or read
`.id` / `.type` / `.tags` / `.Infer`; to add more shared settings, chain a new
base off it (above).

## A route prefix

`.basePath(prefix)` extends the route for every descendant. It accumulates:

```tsx
export const adminBase = root.lets.base().basePath('/admin').base()

export const usersPage = adminBase.lets
  .page('/users') // final route: /admin/users
  .page(/* ... */)
```

Prefixes from chained bases (and the root's own `basePath`) stack in order:

```tsx
export const apiBase = root.lets.base().basePath('/api').base()
export const v2Base = apiBase.lets.base().basePath('/v2').base()
// a page off v2Base at '/users' → /api/v2/users
```

A base is **transparent to the layout chain**: it can sit between two layouts
and add a route prefix, but it never shows up in a page's `layouts` array — it
isn't a layout in the render tree. `.basePath` is also available on the
[root](root), but sharing a prefix is the main reason a base exists.

`.basePath` is **server-and-client** — not cut from either bundle: the route
prefix is needed for routing on both sides.

## Shared defaults

Set a default on the base and every child inherits it. Most config methods are
available while composing a base.

```tsx
export const base = root.lets
  .base()
  .queryOptions({ retry: false, staleTime: 60_000 }) // default for child queries
  .loading(() => <Spinner />) // default loading UI for child pages/layouts/components
  .error(({ error }) => <ErrorScreen error={error} />) // default error UI
  .base()
```

Strip categories here: `.queryOptions` (and the per-type `*QueryOptions` family)
is **server-and-client** — not cut from either bundle. `.loading` and `.error`
(and their `.page*` / `.layout*` / `.component*` variants) are
**server-ssr-and-client** — cut from the SERVER bundle when `ssr:false` (or
after a `.clientOnly()` earlier in the chain): their bodies and the imports they
use are removed from the server build. Kept in the client build always, and in
the server build only when SSR is on.

A child's own setting **wins** over the inherited default:

```tsx
export const specialPage = base.lets
  .page('/special')
  .loading(() => <SpecialSpinner />) // overrides the base's .loading for this page
  .page(/* ... */)
```

Two details:

- **`.loading` / `.error` on a base cover every child kind.** On a base,
  `.loading(c)` sets the page, layout, _and_ component loading default at once
  (same for `.error`). Use the variant-specific setters — `.pageLoading` /
  `.layoutLoading` / `.componentLoading`, `.pageError` / `.layoutError` /
  `.componentError` — to target just one.
- **`queryOptions` merges, it doesn't replace.** A base's `.queryOptions(...)`
  stacks with whatever the child sets, rather than overwriting it. Full
  precedence (root/base → type default → the query's own options → call site) is
  on the [query](query) page; the per-type `*QueryOptions` methods are in
  [stage-methods](stage-methods).

## Injecting a query into every child

`.with(query)` on a base injects that query into every child — its result lands
in the child's `queries`, before any query the child adds itself:

```tsx
export const base = root.lets.base().with(bannerQuery).base()

export const homePage = base.lets
  .page('/')
  .with(ideaQuery, ({ params }) => ({ id: Number(params.id) }))
  .page(({ queries: [banner, idea] }) => /* banner from base, idea from page */)
```

`.with` is **server-ssr-and-client** — cut from the SERVER bundle when
`ssr:false` (or after a `.clientOnly()`); kept in the client build always, in
the server build only when SSR is on.

See [`.with`](with) for the full range of forms.

## Context and gating

A base can carry `.ctx`, `.middleware`, and `.use(plugin)`, and all of them
reach its children:

```tsx
export const base = root.lets
  .base()
  .ctx(async ({ request }) => ({ me: await resolveUser(request) }))
  .base()
```

Strip categories: `.ctx` and `.middleware` are **server-only** — cut from the
client bundle: their bodies and the imports they use are removed, so they never
ship to the browser. `.use` is **server-and-client** — not cut from either
bundle; the plugin it attaches carries its own per-method strip behavior. The
`.with` gate below is **server-ssr-and-client** — cut from the SERVER bundle
when `ssr:false` (or after a `.clientOnly()`); kept in the client build always,
in the server build only under SSR.

But mind the security rule that applies everywhere in Point0: **`.ctx` runs only
when the point has a loader.** A loader-less page makes no server request, so
its `.ctx` never executes and can't protect anything. For an authorization gate
that always fires, gate in [`.with`](with) — returning an error (`ErrorPoint0`,
or your own [error class](error-handling)) short-circuits to the error
component:

```tsx
import { AppError } from '@/lib/error' // your own error class

export const adminBase = root.lets
  .base()
  .use(adminOnlyPlugin) // resolves `me` into props upstream
  .with(({ props: { me } }) => {
    if (!me?.isAdmin) return new AppError('Forbidden', { code: 'FORBIDDEN' })
    return { me }
  })
  .base()
```

This is exactly what `adminBase` does in Start0: it doesn't inline the gate, it
`.use(adminOnlyPlugin)` — and the plugin's `.ctx` (for loaders) and `.with` (for
the render) both ride along to every admin point.

## Base or plugin?

A base and a [plugin](plugin) overlap heavily: both can carry `.ctx`, `.with`,
`.use`, `.loading`, `.error`. **Prefer a plugin** for shared behavior — it's the
more flexible of the two.

The difference is in how each attaches:

```tsx
// a base: the child must start its chain FROM the base object
export const adminUserQuery = adminBase.lets.query()./* ... */.query()

// a plugin: injected mid-chain on a point that started anywhere
export const adminUserQuery = root.lets.query().use(adminOnlyPlugin)./* ... */.query()
```

A plugin drops a bundle of methods into any point's chain at any position; a
base requires every consumer to build _off_ it. So:

- **Use a plugin** for shared `.ctx` / `.with` / `.loading` / `.error` / gating
  — it composes anywhere, and a point can use several.
- **Use a base** when you specifically want a shared **route prefix**
  (`.basePath`) plus a single parent to grow a section from. A plugin has no
  `.basePath` — it can't add a route prefix.

In practice the two combine: a thin base for the prefix, a plugin (used by the
base) for the behavior — the Start0 `adminBase` above.

## Inheritance, briefly

Children inherit a base's settings through two mechanisms:

- **The child continues the base's chain.** `base.lets.<type>()` carries the
  base's middlewares, plugins (`.use`), wrappers, injected queries (`.with`),
  context (`.ctx`), input schemas, and its `.head`. `.onPrefetchPage` rides
  along too and runs during the prefetch of any page built under the base.
- **The base's broadcast defaults are re-applied** to each child: `basePath`,
  all the `*QueryOptions`, `fetchOptions`, loading/error components, and the
  scroll (`.scrollPosition` / `.scrollRestore`) and prefetch (`.prefetchPage*`)
  settings.

You don't manage either by hand — set it on the base, read it on the child.

## What you can't do on a base

A base has no route of its own and isn't a query, so a few methods are off the
table:

- **No `.params`** — params come from a consumer's route, not the base.
- **No `.loader` / `.clientLoader`** — a base doesn't load; its children do.
- **`.search` / `.body` are allowed but risky for query children.** A base can
  set a `.search` or `.body` schema, and children inherit it — but a
  [query](query) doesn't accept `search` / `body`, so a query child of such a
  base is a **type error**:

  ```tsx
  const baseWithSearch = root.lets
    .base()
    .search(z.object({ id: z.string() }))
    .base()

  baseWithSearch.lets
    .query()
    // @ts-expect-error — search schema not allowed for query
    .loader(() => ({ x: 1 }))
    .query()
  ```

  Shared input schemas on a base only make sense when the children are pages or
  actions, never queries.

## Reference

### A real base (Start0)

```tsx
import { root } from '@/lib/root'
import { adminOnlyPlugin } from '@/modules/auth/plugins'

export const adminBase = root.lets
  .base()
  .basePath('/admin')
  .use(adminOnlyPlugin)
  .base()
```

Children pick up the `/admin` prefix and the gate for free — a paged query, a
cursor query, a mutation, a layout, all built with `adminBase.lets.<type>()`:

```tsx
export const adminUserListPagedQuery = adminBase.lets.query()./* ... */.query()
export const adminUserListCursorQuery = adminBase.lets.infiniteQuery()./* ... */.infiniteQuery({})
export const adminUserCreateMutation = adminBase.lets.mutation()./* ... */.mutation()
export const adminLayout = adminBase.lets.layout().layout(/* admin shell */)
```

Mount admin pages on `adminLayout` (itself a child of the base) so they also get
the admin shell, not just the prefix and the gate.

### Methods that apply to a base

Each group below carries its strip category (per the four categories:
server-only / client-only / server-and-client / server-ssr-and-client).

Routing & defaults: `.basePath`, [`.queryOptions`](query) and the per-type
`*QueryOptions` / `.mutationOptions` / `.fetchOptions` are **server-and-client**
(not cut from either bundle). `.scrollPosition`, `.scrollRestore`,
`.prefetchPageOnNavigate` / `.prefetchPageOnLinkHover` / `.prefetchPagePolicy`
are **client-only** — cut from the server bundle. `.onPrefetchPage` is
**server-and-client**; it runs on the client during prefetch and on the server
before the first render. Its side-pinned variants `.serverOnPrefetchPage`
(**server-only**) and `.clientOnPrefetchPage` (**client-only**) keep one side's
body out of the other bundle. `.scrollPosition` / `.scrollRestore` are
documented in full on the [navigation](navigation) page.

UI: [`.loading`](loading-error) (and `.pageLoading` / `.layoutLoading` /
`.componentLoading`), [`.error`](loading-error) (and `.pageError` /
`.layoutError` / `.componentError`) are **server-ssr-and-client** — cut from the
SERVER bundle when `ssr:false` (or after a `.clientOnly()`); kept in the client
build always, in the server build only when SSR is on.

Data & context: [`.ctx`](ctx), `.headers`, `.cookies`, `.body` are
**server-only** — cut from the client bundle. `.search` is **server-only** only
when it sits on an action; on a base it's **server-and-client** — not cut from
either bundle. [`.with`](with) and [`.mapper`](mapper) are
**server-ssr-and-client** — cut from the SERVER bundle when `ssr:false` (or
after a `.clientOnly()`); kept in the client build always, server build only
under SSR.

Shared: [`.use`](plugin) (plugins) is **server-and-client** — not cut from
either bundle (the plugin carries its own per-method strip behavior).
[`.middleware`](middleware) and `.serverOn` are **server-only** — cut from the
client bundle. `.clientOn` is **client-only** — cut from the server bundle.
`.on` is **server-and-client** — not cut from either bundle. `.wrapper` and
`.head` are **server-ssr-and-client** — cut from the server bundle when
`ssr:false`, kept in the client build always and the server build only under
SSR. `.description` and `.openapi` are **server-only** — cut from the client
bundle; `.tag` is **server-and-client** — not cut from either bundle.

Not available on a base: `.loader` / `.clientLoader`, `.params`, and `.query` /
`.mutation` finalizers (a base is not itself a query or mutation).
