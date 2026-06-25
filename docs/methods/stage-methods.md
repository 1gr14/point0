---
index: 900
title: Stage Methods
description: Every builder method you call before a point is finalized — what each one does, which point types accept it, and whether it survives into the client or server bundle.
---

These are the methods you use to **declare** a point before it is finalized. A
point is a chain: it opens with `.lets`, runs through a sequence of builder
methods, and closes with the method that matches its type (`.page()`, `.query()`,
`.mutation()`, …). Everything **between** the opening and the closing call is a
**stage-method** — the code types call this a `StagePoint`. After the closing call
you hold a `ReadyPoint`, with a different, smaller surface (`.useQuery`,
`.route`, `.id`, …) covered on each point's own page.

This page is the reference for stage-methods (and the **closing** methods that
finalize the chain — `.page`/`.layout`/`.component`/`.provider`/`.query`/
`.infiniteQuery`/`.mutation`/`.action`/`.root`/`.base`/`.plugin`). Most have their
own page with the full treatment — this one links there and gives the one-line
gist. A few small setters live only here and are described in full. Each entry says
**which point types accept it** and **what the compiler does with it** — which of
the four strip categories below it falls in, and how `ssr` and `.clientOnly()`
change that.

```tsx
export const ideaPage = root.lets
  .page('/ideas/:id') // .lets — opens the chain
  .use(authorizedPlugin) //         ↑ stage-methods
  .ctx(({ request }) => ({ me: getMe(request) })) //
  .loader(({ params }) => ({ idea: getIdea(params.id) })) //
  .head(({ data: { idea } }) => idea.title) //
  .page(({ data: { idea } }) => <h1>{idea.title}</h1>) // .page — closes the chain
```

## How the strip notes read

Point0 server-renders the first page load (when SSR is enabled) and behaves like an
SPA only for client-side navigation after that. So most points exist in **two**
bundles at once — a server build and a browser build — and the compiler decides,
per method, what goes where. Stripping removes the call's body **and prunes the
imports that only that code used**, so the dependency never lands in that bundle; the
chained call itself stays (so the types still resolve). Every method falls into one
of **four** categories:

- **Server-only** — **cut from the client bundle**: its body and the imports it uses
  are removed, so it never ships to the browser. Safe for secrets, DB access, request
  headers (it runs only on the server).
- **Client-only** — **cut from the server bundle**: body and its imports removed, so
  it never bloats the server build, regardless of SSR (it runs only in the browser).
- **Server-and-client** — **not cut from either bundle**: kept in both (isomorphic),
  nothing pruned. Config and closers that carry no side-specific code.
- **Server-SSR-and-client** — **cut from the server bundle when `ssr: false`** (or
  after an earlier `.clientOnly()` in the chain): body and imports removed from the
  server build. Kept in the client build always, and in the server build only when SSR
  is on. This is the render-side family.

`.clientOnly()` is the switch: it sets the rest of the chain to behave as if
`ssr: false`, so every **server-SSR-and-client** method after it
(`.page`/`.layout`/`.with`/`.head`/`.loading`/`.error`/…) is cut from the **server**
build and runs in the browser only. A point built under `ssr: false` behaves the
same way from the start.

> The short `.lets.page('/x')` form, the variable-name rule, and why some closing
> methods take no argument are all on the [points](points) page — not repeated here.

## Setup methods (before the loader)

These shape the point's data and request. They must come **before** the single
`.loader()`; once the loader runs, the setup is locked.

### .ctx

Per-request server values, merged and handed to every `.loader()` and later `.ctx()`
that follows. **Server-only** — cut from the client bundle: its body and the imports
it uses are removed, so it never ships to the browser. (It only runs when the point
actually has a loader — otherwise there's no request.) Available on **every point
type**. Full page: [ctx](ctx).

### .loader / .clientLoader

The one callback that produces the point's data. `.loader` is **server-only** — cut
from the client bundle, body and imports removed, so it never ships to the browser
(it runs on the server); `.clientLoader` is **client-only** — cut from the server
bundle, body and its imports removed (it runs in the browser). A mountable
(page/layout/component/provider) that declares a loader **also becomes a query** — it
gains `.useQuery`, `.fetchQuery`, and the rest. Available on **every point type**
except the structural ones. Full page: [loader](loader).

### .input / .clientInput / .sharedInput

The validation schema for a point's input. `.input` is **server-only** — cut from the
client bundle, body and imports removed (it validates on the server); `.clientInput`
is **client-only** — cut from the server bundle, body and imports removed (it
validates in the browser); `.sharedInput` is **server-and-client** — not cut from
either bundle, kept in both (it runs on both). On **query, infinite-query,
mutation, component, provider** (and the chain heads — root, base, plugin). Full
page: [validation](validation).

### .params / .search / .body

Route-shaped input schemas. `.params` and `.search` validate the URL params and
search string of a routed point; `.body` is the request body of an
[action](action). On a non-action routed point `.params`/`.search` are
**server-and-client** — not cut from either bundle, kept in both, because the client
needs them to build hrefs. Inside an **action** they are **server-only** — cut from
the client bundle, body and imports removed (the action runs on the server) — as is
`.body` everywhere: **server-only**, cut from the client bundle. On **page, layout, action**
(`.params`/`.search`) and **action** (`.body`), plus the chain heads. Full page:
[validation](validation).

### .headers / .cookies

Schemas for request headers and cookies. **Server-only** — cut from the client
bundle, body and imports removed, so they never ship to the browser. On **every point
type**. Full page: [validation](validation).

## Render methods (mountables)

These describe how a mountable — [page](page), [layout](layout),
[component](component), [provider](provider) — turns its data into UI. All of them
are **server-SSR-and-client**: cut from the **server** bundle when `ssr: false` (or
after a `.clientOnly()`) — body and imports removed from the server build. Kept in
the client build always, and in the server build only when SSR is on.

### .with

The builder's swiss-army knife: inject a query, intercept loading/error, pass props,
or wrap the render. On every **mountable** (and the chain heads). Full page:
[with](with).

### .mapper

Reshape the loaded queries/props into the `data` the render receives — the same
thing the final `.provider(fn)` does inline. On every **mountable** (and the chain
heads). Full page: [mapper](mapper).

### .wrapper

Wrap everything the rest of the chain renders in a component, without the
prop-threading `.with(({ children }) => …)` gives you. On every **mountable** (and
the chain heads).

```tsx
export const IdeaPage = root.lets
  .page('/ideas/:id')
  .wrapper(({ children }) => <Card>{children}</Card>)
  .page(() => <h1>Idea</h1>)
```

### .loading / .error (and the per-type variants)

The components shown while a mountable's data is loading or after it errors. The last
one found in the chain wins. `.componentLoading` / `.componentError`,
`.pageLoading` / `.pageError`, `.layoutLoading` / `.layoutError` target one
mountable kind from a shared parent. **Server-SSR-and-client** — cut from the server
bundle (body and imports removed) when `ssr: false` or after a `.clientOnly()`; kept
in the client build always, and in the server build only when SSR is on. On
**mountables** and the chain heads (the
per-type variants live on root/base/plugin and, for the page/layout pair, on
layout). Full page: [loading-error](loading-error).

### .head

Set the document head from the point's data (a string title or an
[unhead](head) object). The `'global'` form, per-status heads, and SEO keys all live
on the [head](head) page. On **page, layout** (and root, base, plugin).
**Server-SSR-and-client** — cut from the server bundle (body and imports removed) when
`ssr: false` or after a `.clientOnly()`, like the other render methods; kept in the
client build always, and in the server build only when SSR is on.

### .clientOnly

Opt a mountable out of SSR: its render runs in the browser only, and the server
bundle drops the render chain. Takes an optional fallback component shown on the
server while the client mounts. On **page, layout, component, provider** (and root,
plugin). It is itself **server-and-client** — not cut from either bundle, kept in
both: the server needs to know to skip the render, so the switch ships to both
bundles.

```tsx
export const ChartPage = root.lets
  .page('/chart')
  .clientOnly(() => <Spinner />) // optional SSR fallback
  .page(() => <HeavyClientChart />)
```

## Composition methods

### .use

Inject a [plugin](plugin) — a reusable bundle of stage-methods — into this point's
chain, at the position you call it. On **every point type**. Each method the plugin
contributes is stripped exactly as if you'd written it inline.

### .relatedQuery

Attach another point's query to this mountable — it goes into the `queries` array
just like a `.with(query)` result, so its data is available. The difference is
**prefetch**: a related query is statically discoverable, so prefetch self-fetches it
**without rendering**, under the cheap policies (`serverQuery` / `clientQuery` /
`serverAndClientQuery`); a `.with(query)` is only discovered by rendering, so it's
prefetched only under the expensive `pageDehydratedState*` policies (a full SSR
render). On **mountables** and **plugins**. **Server-and-client** — not cut from either
bundle, kept in both (isomorphic config).

## Routing & networking

### .serverUrl / .clientUrl

The two origins the app resolves routes against. **Root only** (and plugin).
`.serverUrl` is where the server and the API live; `.clientUrl` is the public origin
pages live on, for when that differs (split dev ports, a native shell, a CDN front).

```tsx
export const root = Point0.lets
  .root()
  .serverUrl(sharedEnv.SERVER_URL)
  .clientUrl(sharedEnv.CLIENT_URL) // optional; falls back to serverUrl
  .root()
```

The origin is chosen by **route kind, not runtime side**: page/layout routes resolve
against `clientUrl` (falling back to `serverUrl`); action and endpoint routes always
use `serverUrl`. A side-dependent origin would mismatch SSR-rendered hrefs during
hydration. **Server-and-client** — not cut from either bundle, kept in both
(isomorphic config values).

### .basePath

A type-level route prefix that every point built off this base inherits. Pair it with
a gating [plugin](plugin) for a whole section behind one prefix and one check.
**Root and base** (and plugin). **Server-and-client** — not cut from either bundle,
kept in both.

```tsx
export const adminBase = root.lets
  .base()
  .basePath('/admin') // every page/query under adminBase inherits /admin
  .base()
```

### .middleware

Mount raw request middleware on the server — third-party handlers (better-auth),
OpenAPI's scalar/swagger UIs, anything that wants the bare `Request`. On **every
point type**, but it only does anything on the server entry. **Server-only** — cut
from the client bundle, body and imports removed, so it never ships to the browser.
Full page: [middleware](middleware).

### .fetchOptions

Customize the `fetch` Point0 makes for server queries and mutations — an object
(merged) or a function (re-evaluated per request, for a fresh token each time). Calls
**stack**: headers merge, later non-header keys override. On **every point type**.
**Server-and-client** — not cut from either bundle, kept in both (the browser is the
one making most of these calls).

```tsx
.fetchOptions({ credentials: 'include' })
.fetchOptions(() => ({ headers: { authorization: `Bearer ${getToken()}` } }))
```

### .transformer

Serialize query input and loader output across the wire — pass any tRPC-style
transformer (e.g. `superjson`). **Root only** (and plugin). **Server-and-client** —
not cut from either bundle, kept in both (both ends must agree on the format). Full
page: [transformer](transformer).

### .schemaHelper

Teach the root how to read one validation library's schemas (detect, extract keys,
spot file uploads, emit JSON for OpenAPI). Helpers **accumulate** — call once per
library; the first whose `isSuitable` matches wins. **Root only**.
**Server-and-client** — not cut from either bundle, kept in both. Built-ins ship for
zod, valibot, arktype, yup, superstruct, typebox
(`@point0/core/schema/<lib>`). Full surface: [validation](validation).

```tsx
import { zodSchemaHelper } from '@point0/core/schema/zod'

export const root = Point0.lets.root().schemaHelper(zodSchemaHelper()).root()
```

### .errorClass

Set the app's error class. **Root only.** The default is `ErrorPoint0`; you may
replace it with any class of the same-or-wider structure — your own `AppError`, or
one built with [error0](error-handling) — and it threads through the chain as the
point's error type (a query result's `.error`, the `.on('error', …)` argument, the
error a `.with` may return). **Server-and-client** — not cut from either bundle, kept
in both. Full treatment: [error handling](error-handling).

```tsx
import { AppError } from '@/lib/error' // your own error class

export const root = Point0.lets.root().errorClass(AppError).root()
```

## Query-option defaults

Set default TanStack Query / Mutation options once, high in the chain. Each setter
takes **one** options object and **merges** it into the matching default (it does not
replace). `.queryOptions` is the broad one; the rest target one query kind. These
default the React-Query behavior, so they are **server-and-client** — not cut from
either bundle, kept in both.

```tsx
export const root = Point0.lets
  .root()
  .queryOptions({ retry: false, refetchOnWindowFocus: false, staleTime: 60_000 })
  .root()
```

| Method                             | Defaults the…                           | Lives on                         |
| ---------------------------------- | --------------------------------------- | -------------------------------- |
| `.queryOptions`                    | every query                             | root, base, plugin               |
| `.mutationOptions`                 | every mutation                          | root, base, plugin               |
| `.infiniteQueryOptions`            | every infinite query                    | root, base, plugin               |
| `.pageQueryOptions`                | a page self query                       | root, base, layout, plugin       |
| `.componentQueryOptions`           | a component self query                  | root, base, plugin               |
| `.layoutQueryOptions`              | a layout self query                     | root, base, layout, plugin       |
| `.providerQueryOptions`            | a provider self query                   | root, base, plugin               |
| `.pageDehydratedStateQueryOptions` | the SSR dehydrated-state prefetch query | root, base, page, layout, plugin |

Each takes the TanStack option type with `queryKey`/`queryFn` (or
`mutationKey`/`mutationFn`) stripped — Point0 owns those. As a defaults setter,
`.infiniteQueryOptions` takes a **partial** object, so `pageParamFromInput` is
optional here (it's **required** on the per-point `.infiniteQuery({...})` instead).
Calling a setter twice keeps earlier plain keys (last call wins per key); the
callback keys `onSuccess` / `onError` / `onSettled` (plus `onMutate`) **chain** so
every registered callback runs. How these layer with a query's own options is on the
[query](query) page.

## Events

### .on / .serverOn / .clientOn

Subscribe to the framework's lifecycle events. `.on` is **server-and-client** — not
cut from either bundle, kept in both (it runs on both sides); `.serverOn` is
**server-only** — cut from the client bundle, body and imports removed (it runs
server-side); `.clientOn` is **client-only** — cut from the server bundle, callback
and its imports removed (it runs client-side), each typing the event accordingly. On
**every point type**.

```tsx
export const root = Point0.lets
  .root()
  .on('error', ({ side, name, error, meta }) => {
    // 'error' is sugar for the four error events
    console.error({ side, name, error, ...meta })
  })
  .root()
```

The event object carries `{ side, name, data, error, meta }`, where `meta` is a
log-friendly projection of `data` (points become [ids](events), requests become
`{ method, path }`). Full event list and per-side typing: [events](events).

## Navigation: prefetch

These are **client-only** — cut from the server bundle: their bodies and the imports
those bodies use are removed, regardless of SSR, so the prefetch triggers never bloat
the server build (they run in the browser as you move between pages).
(`.prefetchPagePolicy` is a thin convenience over the two trigger setters it fans out
into.) On **root, base, page, layout** (with the exceptions noted).

### .prefetchPageOnNavigate / .prefetchPageOnLinkHover / .prefetchPagePolicy

Choose how aggressively a page prefetches, by trigger. `.prefetchPagePolicy` is the
convenience that sets both navigate and hover at once.

```tsx
.prefetchPageOnNavigate('serverAndClientQuery')        // when a navigation starts
.prefetchPageOnLinkHover('serverAndClientQuery', 200)  // on link hover; 2nd arg = delay (ms)
.prefetchPagePolicy('serverAndClientQuery', 200)       // both triggers + hover delay
```

`.prefetchPageOnLinkHover`'s delay defaults to **30ms**. A per-`<Link>` or
per-`navigate` prefetch overrides the point default; `false` / `'none'` disables it.
`.prefetchPagePolicy` is not on plugins. Policy values and what each fetches:
[navigation](navigation). As a cost note, `serverAndClientQuery` is the cheap policy;
`pageDehydratedState` runs a full SSR render and is the expensive one (and the
`pageDehydratedState*` policies require SSR or they throw).

### .onPrefetchPage

Register a callback that runs during prefetch (accumulates across calls). On **root,
base, page, layout** and **plugin**. Today it is **client-only** — cut from the server
bundle, body and its imports removed. (Intended to also run during server-side
prefetch, so it should stay in the server build; that's not the case yet.)

<!-- TODO(high): onPrefetchPage is stripped from the server bundle (point.ts ~1056) but should also run during server prefetch — stop stripping it. -->

```tsx
.onPrefetchPage(async ({ location, props }) => { /* warm something up */ })
```

## Navigation: scroll

### .scrollRestore / .scrollPosition

Scroll-restoration controls now live on the [navigation](navigation) page, with the
full treatment of their values and defaults.

## API description (actions only)

### .response

Declare the response schema of an [action](action) — what its handler returns over
the wire. **Action only.** **Server-only** — cut from the client bundle, body and
imports removed, so it never ships to the browser. Full page: [response](response).

### .openapi

Attach OpenAPI operation metadata to an action's endpoint. On **action** (and base,
plugin). **Server-only** — cut from the client bundle, body and imports removed: it
shapes the generated spec, which the browser never needs. Full page:
[openapi](openapi).

### .models

Register named input schemas the OpenAPI generator reuses as reusable components.
**Root and base.** **Server-only** by intent — it should be cut from the client
bundle (body and imports removed), since it feeds spec generation the browser never
needs. The compiler does **not** yet strip it, though, so the schemas currently ride
along in the client bundle too.

<!-- TODO(high): add .models to the compiler client-strip list (point.ts ~1026) — it's currently shipped to the client bundle. -->

## Metadata

### .tag / .description

Attach metadata to any point. `.tag` takes one or more strings, de-dupes, and
accumulates; tags ride along in the query key so you can invalidate a group by tag.
`.description` **appends** (joined with `\n\n`) rather than replacing. On **every
point type**. `.tag` is **server-and-client** — not cut from either bundle, kept in both
(it's part of the query key); `.description` is **server-only** — cut from the client
bundle, body and imports removed. On `.use`, a child's tags union with the parent's
and descriptions concatenate.

```tsx
.tag('ideas', 'public')              // variadic, de-duped, accumulates
.description('Fetch one idea by id') // appends if called again
```

<!-- TODO(med): .tag / .description do not currently feed OpenAPI operation `tags` or `description` (the generator emits only `summary` and `operationId` from the point name). Confirm the intended mapping before documenting one here. -->

## Closing methods

The call that finalizes the chain and turns the `StagePoint` into a `ReadyPoint`.
Each one matches a point type and has its own page; here is only its strip category.

- **`.page` / `.layout` / `.component` / `.provider`** — the mountable closers.
  **Server-SSR-and-client**: cut from the server bundle (render closure and its
  imports removed) under `.clientOnly()` or `ssr: false`; kept in the client build
  always, and in the server build only while SSR is on. Pages: [page](page),
  [layout](layout), [component](component), [provider](provider).
- **`.query` / `.infiniteQuery` / `.mutation`** — the data closers.
  **Server-and-client**: the closer itself is not cut from either bundle, kept in both
  (isomorphic config); the loader it wraps is the part that's cut from the client.
  Pages: [query](query), [mutation](mutation). Any mountable with a `.loader` can close
  with `.infiniteQuery({...})` to make its self-query infinite instead of the default
  finite.
- **`.action`** — the endpoint closer. The action's server handler is
  **server-only** — cut from the client bundle (handler body and its imports removed);
  only the route metadata the client needs to call it stays. Page: [action](action).
- **`.root` / `.base` / `.plugin`** — the structural closers (no render, no handler).
  **Server-and-client** — not cut from either bundle, kept in both (pure isomorphic
  config). Pages: [root and base](root), [plugin](plugin).

## Reference: where each method lives

The authoritative per-type availability, straight from the builder types. "all" =
every point type (page, layout, component, provider, action, query, infinite-query,
mutation, root, base, plugin).

| Method                                                              | Available on                     | Strip category             |
| ------------------------------------------------------------------- | -------------------------------- | -------------------------- |
| `.ctx`                                                              | all                              | server-only                |
| `.loader`                                                           | all                              | server-only                |
| `.clientLoader`                                                     | all but action                   | client-only                |
| `.input`                                                            | query, infinite-query, mutation, component, provider; root, base, plugin | server-only |
| `.clientInput`                                                      | same as `.input`                 | client-only                |
| `.sharedInput`                                                      | same as `.input`                 | server-and-client          |
| `.params` / `.search`                                               | page, layout, action; root, base, plugin | server-and-client, but server-only under an action |
| `.body`                                                             | action; root, base, plugin       | server-only                |
| `.headers` / `.cookies`                                             | all                              | server-only                |
| `.with` / `.mapper` / `.wrapper`                                    | mountables; root, base, plugin   | server-SSR-and-client      |
| `.loading` / `.error`                                               | mountables; root, base, plugin   | server-SSR-and-client      |
| `.pageLoading` / `.pageError` / `.layoutLoading` / `.layoutError`   | root, base, plugin, layout       | server-SSR-and-client      |
| `.componentLoading` / `.componentError`                             | root, base, plugin               | server-SSR-and-client      |
| `.head`                                                             | page, layout; root, base, plugin | server-SSR-and-client      |
| `.clientOnly`                                                       | page, layout, component, provider; root, plugin | server-and-client |
| `.relatedQuery`                                                     | mountables; plugin               | server-and-client          |
| `.use`                                                              | all                              | per contributed method     |
| `.middleware`                                                       | all                              | server-only                |
| `.fetchOptions`                                                     | all                              | server-and-client          |
| `.transformer`                                                      | root, plugin                     | server-and-client          |
| `.serverUrl` / `.clientUrl`                                         | root, plugin                     | server-and-client          |
| `.basePath`                                                         | root, base, plugin               | server-and-client          |
| `.schemaHelper` / `.errorClass`                                     | root                             | server-and-client          |
| `.queryOptions` / `.mutationOptions` / `.infiniteQueryOptions`      | root, base, plugin               | server-and-client          |
| `.componentQueryOptions` / `.providerQueryOptions`                  | root, base, plugin               | server-and-client          |
| `.pageQueryOptions` / `.layoutQueryOptions`                         | root, base, layout, plugin       | server-and-client          |
| `.pageDehydratedStateQueryOptions`                                  | root, base, page, layout, plugin | server-and-client          |
| `.on`                                                               | all                              | server-and-client          |
| `.serverOn`                                                         | all                              | server-only                |
| `.clientOn`                                                         | all                              | client-only                |
| `.prefetchPageOnNavigate` / `.prefetchPageOnLinkHover`              | root, base, page, layout         | client-only                |
| `.prefetchPagePolicy`                                               | root, base, page, layout         | client-only                |
| `.onPrefetchPage`                                                   | root, base, page, layout, plugin | client-only (intended: + server prefetch) |
| `.scrollRestore` / `.scrollPosition`                               | root, base, page, layout, plugin | client-only — see [navigation](navigation) |
| `.response`                                                         | action                           | server-only                |
| `.openapi`                                                          | action; base, plugin             | server-only                |
| `.models`                                                           | root, base                       | server-only (intended; not stripped yet) |
| `.tag`                                                              | all                              | server-and-client          |
| `.description`                                                      | all                              | server-only                |
| `.page` / `.layout` / `.component` / `.provider` (closers)          | their own type                   | server-SSR-and-client      |
| `.query` / `.infiniteQuery` / `.mutation` (closers)                | their own type                   | server-and-client          |
| `.action` (closer)                                                  | action                           | server-only handler        |
| `.root` / `.base` / `.plugin` (closers)                            | their own type                   | server-and-client          |
