---
index: 1200
title: Plugin
description: A plugin is a bundle of methods you define once and inject into any point's chain with .use().
---

A plugin is a point that does nothing on its own. Instead it bundles up methods —
`.ctx`, `.with`, `.middleware`, input schemas, related queries — and injects them
into another point's chain when you call `.use(plugin)`. It's the tool for sharing
setup across points in *your* app, not a third-party extension system.

```tsx
import { Point0 } from '@point0/core'
import { getMe } from '@/modules/auth/server'
import { getMeQuery } from '@/modules/auth/api'

export const mePlugin = Point0.lets
  .plugin()
  .ctx(async ({ request }) => {
    return { me: await getMe({ request }) } // server: resolve the user, put it in ctx
  })
  .with(({ resolve }) => {
    // client: resolve the same user into props (returned from `with` so it lands in props, not queries)
    return resolve(getMeQuery.useQuery(), ({ data }) => ({ me: data.me }))
  })
  .plugin()
```

Any point can now `.use(mePlugin)` and read `me` — from `ctx` in its loader, from
`props` in its component:

```tsx
export const generalLayout = root.lets
  .layout() // no argument — the route defaults to `/`, so this is a root-level layout
  .use(mePlugin)
  .layout(({ children, props: { me } }) => (
    <div>{me ? <SignOut /> : <SignIn />}{children}</div>
  ))
```

## Declaring a plugin

Open with `.plugin()`, add methods, close with `.plugin()` — the same name appears
twice (open the chain, close it):

```tsx
export const tagsPlugin = Point0.lets
  .plugin()
  .search(z.object({ tag: z.string().optional() }))
  .plugin()
```

The explicit equivalent is `Point0.lets('plugin', 'me')` — the second argument is
the name, and the scope is always the literal `'plugin'` (it's reserved):

```tsx
export const mePlugin = Point0.lets('plugin', 'me') // explicit form
  .ctx(/* ... */)
  .plugin()
```

Both forms type-identically. Unlike every other point, a plugin always grows from
`Point0` directly, not from a `root` / `base` / `layout` — it isn't tied to any
client or route. See [points](points) for the notation.

The `.plugin()` closer itself is not cut from either bundle — kept in both
(isomorphic), nothing pruned (server-and-client). The methods it bundles keep
*their own* strip categories: a plugin's `.ctx` is still cut from the client bundle
(server-only), its `.with` is still cut from the server bundle when `ssr:false`
(server-ssr-and-client), and so on. `.use()` just merges those bodies into the
consumer at the call site; it doesn't change what gets cut from which bundle.

A plugin is never an endpoint and never has a route of its own. It carries no
`.loader`, `.clientLoader`, `.mapper`, `.head`, `.params`, or `.query` — writing
any of those on a plugin is a type error. It only carries methods that *merge into*
the point that uses it.

## Injecting with `.use()`

`.use(plugin)` is available on every point that has a setup stage — `root`,
`base`, `page`, `layout`, `component`, `provider`, `query`, `infiniteQuery`,
`mutation`, `action`, and `plugin` itself (so plugins can nest). Call it **before**
the point is finalized — before `.loader()` / before the closing terminal:

```tsx
export const profilePage = generalLayout.lets
  .page('/profile')
  .use(redirectUnauthorizedPlugin) // me is guaranteed non-null after this
  .page(({ props: { me } }) => <h1>{me.user.name}</h1>)
```

You can `.use()` as many plugins as you like, interleaved with the point's own
methods. Each plugin's middleware, ctx, and with-functions slot in at the call
site, in order.

The argument must be a finalized plugin. Pass anything else and you get a type
error; bypass the type with `as any` and it throws at startup:

```tsx
.use(somePage) // throws: .use() expects a plugin created via .plugin(), but received a point of type "page" (...). Used on point <consumer>.
```

## What `.use()` merges

A plugin contributes everything it declared into the consuming point:

- **`ctx`** — appended to the consumer's `ctx` (visible in its loader and later `.ctx`).
- **`props`** — props the plugin's `.with` returns merge into the consumer's `props`.
- **Input schemas** — `.input` / `.search` / `.body` / `.headers` / `.cookies`
  merge down (a schema can only narrow, never widen, what's already declared).
- **`.middleware`** — runs at the `.use()` call site, between the consumer's
  before- and after-middlewares.
- **Related queries**, event subscriptions, wrappers, tags, and description — all
  fold in.

```tsx
const accountPage = root.lets
  .page('/account')
  .ctx(() => ({ page: 'account' }))
  .use(mePlugin) // adds `me` to ctx
  .loader(({ ctx }) => {
    ctx.page // 'account'  — the page's own ctx
    ctx.me //   from the plugin
  })
  .page(/* ... */)
```

### Encapsulation

A plugin sees only its own accumulated `ctx`/`props`, never the consumer's
surrounding state — so a plugin can't accidentally depend on whatever point used
it. The flow is one-way: the consumer gains the plugin's output, the plugin stays
sealed.

```tsx
const plugin = Point0.lets
  .plugin()
  .ctx(({ ctx }) => {
    ctx.page // ❌ does not exist — the consumer's ctx is invisible here
    return { fromPlugin: true }
  })
  .plugin()
```

Nesting is the exception in one direction: when a plugin does `.use(otherPlugin)`,
the inner plugin's `ctx`/`props` *are* visible to the outer one — that's how the
gating plugins below build on `mePlugin`.

## The only point you can build dynamically

Every other point must be exported exactly as written, so the compiler can find
and analyze it statically — you can't create one inside a function. A plugin is
the exception: you can wrap it in a factory and parametrize it.

```tsx
export const requirePermission = (permission: string) =>
  Point0.lets
    .plugin()
    .use(mePlugin)
    .ctx(({ ctx: { me } }) => {
      if (!me?.permissions.includes(permission)) {
        throw new AppError('Forbidden', { code: 'FORBIDDEN' })
      }
      return { me }
    })
    .plugin()

// each call site gets its own configured plugin:
const ideaPage = root.lets.page('/ideas/:id').use(requirePermission('ideaRead')).page(/* ... */)
```

<!-- TODO(med): the parametrized-plugin factory is shown in the intro article; the live examples and start0 export plugins as plain consts. Confirm a verified-in-repo factory before presenting this as the canonical pattern. -->

## Auth plugins: `.ctx` + `.with` together

The headline use of a plugin is an authorization gate. It needs **both** `.ctx`
and `.with` — and these are two genuinely different mechanisms, not two copies of
one check:

- `.ctx` builds **server context**. Cut from the client bundle — its body and the
  imports it uses are removed, so it never ships to the browser (server-only). This
  is where you resolve a value from the request — the session, the current user —
  for the server data path; it runs on the server, and only when the point has a
  loader.
- `.with` is a **render wrapper**. Each `.with` wraps the rendered remainder of the
  chain, exactly like nesting one React component inside another; it just reads as
  a builder method. It runs at render — on the client, and on the server under SSR
  — can call hooks, and decides what renders next by what it returns (props, a
  query, an `Error`, a `redirect`, an element). It never sees `ctx`. Cut from the
  SERVER bundle when `ssr:false` (or after a `.clientOnly()` earlier in the chain) —
  body and imports removed from the server build; kept in the client build always,
  and in the server build only when SSR is on (server-ssr-and-client).

So a gate written in `.ctx` alone protects only the server loader path: a
loader-less page is rendered straight on the client, where `.ctx` never runs, and
nothing stops it. The render wrapper is what actually guards what the user sees, so
the gate has to live in `.with`. You add the matching `.ctx` not to duplicate the
check but to cover the other path — to resolve the same value server-side for
loaders and short-circuit there before any data work happens. One side or the
other always runs, on any point — page, query, mutation, layout. See
[`.with`](with) and [ctx](ctx) for each side in depth.

First, the building block — resolve the user once, on both sides:

```tsx
export const mePlugin = Point0.lets
  .plugin()
  .onPrefetchPage(async () => {
    await getMeQuery.prefetchQuery() // warm the client cache to avoid a waterfall
  })
  .ctx(async ({ request }) => {
    return { me: await getMe({ request }) }
  })
  .with(({ resolve }) => {
    // returned from `with` (not a bare `useQuery()`) so `me` lands only in props, not in `queries`
    return resolve(getMeQuery.useQuery(), ({ data }) => ({ me: data.me }))
  })
  .plugin()
```

Three different strip categories sit in this one chain: `.onPrefetchPage` is meant
to stay in both bundles (it should run on the client *and* during server-side
prefetch), but today it's cut from the server bundle — body and imports removed
(client-only as shipped); `.ctx` is cut from the client bundle — body and imports
removed (server-only); `.with` is cut from the server bundle when `ssr:false`
(server-ssr-and-client).
<!-- TODO(high): onPrefetchPage is stripped from the server bundle (point.ts ~1056) but should also run during server prefetch — stop stripping it. -->

Then the gate — `.use(mePlugin)` to get `me`, throw on the server, return the error
on the client:

```tsx
export const authorizedOnlyPlugin = Point0.lets
  .plugin()
  .use(mePlugin)
  .ctx(({ ctx: { me } }) => {
    if (!me) {
      throw new AppError('Only for authorized users', { code: 'UNAUTHORIZED' })
    }
    return { me } // returning the narrowed value makes `me` non-null downstream
  })
  .with(({ props: { me } }) => {
    if (!me) {
      return new AppError('Only for authorized users', { code: 'UNAUTHORIZED' })
    }
    return { me }
  })
  .plugin()
```

Two details worth copying:

- `.ctx` **throws** the error; `.with` **returns** it. A returned `Error` from
  `.with` short-circuits to the error component — see [Loading & error](loading-error).
- Both branches `return { me }` on success. That narrows `me` to non-null for every
  point that uses the plugin, so consumers never re-check it.

`AppError` here stands in for your own error class. Point0's built-in
`ErrorPoint0` works just as well; you can swap in any class of the same-or-wider
shape via `.errorClass(...)` — see [Error handling](error-handling).

### Gate by redirect instead of error

Same shape, but return a [`redirect`](navigation) instead of throwing — friendlier
for sign-in flows:

```tsx
export const redirectUnauthorizedPlugin = Point0.lets
  .plugin()
  .use(mePlugin)
  .ctx(({ ctx: { me } }) => {
    if (!me) {
      return redirect('signIn')
    }
    return { me } // return so the type narrows to me !== null
  })
  .with(({ props: { me } }) => {
    if (!me) {
      return redirect('signIn')
    }
    return { me }
  })
  .plugin()
```

A nice pattern: apply the gate once on a [base](base) or [layout](layout) and every
point beneath it inherits the check — e.g. an `adminBase` that `.use(adminOnlyPlugin)`,
so admin pages get the gate for free.

## Related queries in a plugin

A plugin can declare a [`.relatedQuery`](query); it merges into whatever mountable
point uses the plugin, even though the plugin isn't bound to a route. Inside the
related query's input getter, `location` is typed as a generic location (the plugin
doesn't know which route it'll end up on):

```tsx
export const sidebarPlugin = Point0.lets
  .plugin()
  .relatedQuery(sidebarQuery, ({ location }) => ({ path: location.pathname }))
  .plugin()
```

`.relatedQuery` is not cut from either bundle — kept in both (isomorphic),
server-and-client. It adds its query to the consumer's `queries` array, exactly
like a `.with(query)` result;
the difference is prefetch. A related query is statically discoverable, so prefetch
self-fetches it *without* rendering under the cheap policies
(`serverQuery`/`clientQuery`/`serverAndClientQuery`), whereas a `.with(query)` is
only found by rendering and so is prefetched only under the expensive, SSR-only
`pageDehydratedState*`. See [query](query).

## Reference

### Construction

| Form                              | Notes                                       |
| --------------------------------- | ------------------------------------------- |
| `Point0.lets.plugin()`            | name read from the variable                 |
| `Point0.lets('plugin', 'name')`   | explicit name; scope is always `'plugin'`   |

Close the chain with `.plugin()`. A plugin always grows from `Point0`, never from
a `root` / `base` / `layout`.

### Methods allowed inside a plugin

A plugin only bundles these methods; each keeps the strip category it has anywhere
else, and `.use()` carries that category into the consumer unchanged.

Setup & data: [`.ctx`](ctx) (server-only), [`.with`](with)
(server-ssr-and-client), [`.use`](plugin) (nesting; server-and-client),
[`.middleware`](middleware) (server-only), `.relatedQuery` (server-and-client),
`.input` (server-only) / `.clientInput` (client-only) / `.sharedInput`, `.search`
/ `.body` / `.headers` / `.cookies` (server-only), `.wrapper`
(server-ssr-and-client).
<!-- TODO(med): confirm `.sharedInput`'s strip category against the compiler (point.ts ~1014-1170) — it isn't named in R3's four lists. -->

Defaults & UI: `.queryOptions` / `.pageQueryOptions` / `.componentQueryOptions` /
`.layoutQueryOptions` / `.mutationOptions` / `.infiniteQueryOptions`,
`.fetchOptions` — all server-and-client (option setters, kept on both bundles).
`.openapi` is server-only. `.loading` / `.error` (and per-state variants) are
server-ssr-and-client. `.scrollPosition` / `.scrollRestore` are cut from the server
bundle — body and imports removed (client-only; see [navigation](navigation)).
`.onPrefetchPage` is meant to stay in both bundles (run on the client and during
server prefetch), but is currently cut from the server bundle — body and imports
removed (client-only as shipped).
<!-- TODO(high): onPrefetchPage is stripped from the server bundle (point.ts ~1056) but should also run during server prefetch — stop stripping it. -->

Events & meta: `.on` / `.use` config (server-and-client), `.serverOn` (server-only),
`.clientOn` (client-only), `.clientOnly` (the switch — flips the rest of the chain
to behave as `ssr:false`), `.tag` / `.description` (server-and-client; `.description`
itself is server-only).
<!-- TODO(med): verify `.tag` vs `.description` strip split against R3 — `.tag` is listed server-and-client (root setter), `.description` server-only. -->

**Not available on a plugin:** `.params`, `.loader`, `.clientLoader`, `.mapper`,
`.head`, `.query`, `.layout`, `.transformer`, `.serverUrl` / `.clientUrl` /
`.basePath`, `.prefetchPageOnNavigate` / `.prefetchPageOnLinkHover`. A plugin
contributes methods; it never *is* a mountable or routable point.

### Where `.use()` applies

`.use(plugin)` is on every point with a setup stage: `root`, `base`, `page`,
`layout`, `component`, `provider`, `query`, `infiniteQuery`, `mutation`, `action`,
and `plugin`. It must come before the point is finalized — it's a setup-stage
method, so it's a type error after `.loader()` or once the point is closed.

<!-- TODO(low): confirm whether `.use()` *after* `.loader()` throws at runtime with a specific message — only the type-level guard is verified; no runtime test exercises a post-loader `.use()`. -->

<!-- TODO(low): two plugins declaring conflicting input keys — the type carries a not-mashed-schemas assertion, but no test exercises the conflict path. Verify the behavior before documenting it. -->
