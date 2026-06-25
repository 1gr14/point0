---
index: 500
title: Mountable
description:
  Page, layout, component, and provider share one method-injection model — same
  .with, .wrapper, loaders, mapper, and render-prop bag.
---

A **mountable** is a point that renders React. There are four: [page](page),
[layout](layout), [component](component), and [provider](provider). They differ
in what they mount (a route, a wrapper around children, a piece of UI, a context
value) but share one model: the same composition methods, the same loading/error
wiring, and the same render-prop bag (`data`, `queries`, `props`, …). Learn it
once and it transfers across all four.

```tsx
// a component, a layout, a page — the same chain shape:
export const UserCard = root.lets
  .component()
  .with(userQuery, ({ props }) => ({ id: props.userId })) // inject a query
  .component(({ data: { user } }) => <span>{user.name}</span>) // read its data

export const ideaLayout = generalLayout.lets
  .layout('/ideas/:id')
  .with(ideaQuery, ({ params }) => ({ id: Number(params.id) }))
  .layout(({ children, data: { idea } }) => (
    <section>
      <h1>{idea.title}</h1>
      {children}
    </section>
  ))
```

`UserCard` and `ideaLayout` use the same `.with`, the same `data`/`queries`
destructure, the same loading and error behavior. The rest of this page is the
shared surface; each point type's own page covers its specifics.

## The four mountables

| Type                   | Closes with      | Mounts                                    | Extra render-prop keys              |
| ---------------------- | ---------------- | ----------------------------------------- | ----------------------------------- |
| [page](page)           | `.page(c?)`      | a component at a route                    | `location`, `setSearch`             |
| [layout](layout)       | `.layout(c)`     | a wrapper around child pages (`children`) | `children`, `location`, `setSearch` |
| [component](component) | `.component(c?)` | a reusable piece of UI                    | —                                   |
| [provider](provider)   | `.provider(m?)`  | a context value (read via `useValue`)     | `children`                          |

Everything else — how data arrives, what the component receives, how loading and
error render — is identical. A non-mountable point ([query](query),
[mutation](mutation), [action](action)) renders nothing and has none of this.

## The shared method surface

Every mountable, while you compose it, exposes the same core methods:

```tsx
point
  .with(...)        // inject queries / props / state / wrappers
  .wrapper(...)     // wrap the whole mountable from outside
  .loading(...)     // the loading component
  .error(...)       // the error component
  .loader(...)      // server data (also makes the point an endpoint — see below)
  .clientLoader(...)// browser-side data
  .ctx(...)         // server context (runs only with a loader)
  .mapper(...)      // reshape `data`
  .clientOnly(...)  // opt out of SSR
  .use(plugin)      // mix in a plugin
  .middleware(...)  // server middleware
  .on / .serverOn / .clientOn(...) // events
  .tag(...).description(...)        // metadata
```

The closing method (`.page` / `.layout` / `.component` / `.provider`) ends
composition and returns the ready point. After that the composition methods are
gone — the ready point exposes only render helpers (`.X`, `.route`, queries,
`.Infer`, …). You compose, then close; you can't compose a closed point.

The closer (`.page`/`.layout`/`.component`/`.provider`) is
**server-ssr-and-client**: cut from the SERVER bundle when `ssr:false` (or after
a `.clientOnly()` earlier in the chain) — its body and the imports it uses are
then removed from the server build; kept in the client build always, and in the
server build only when SSR is on.

Page and layout add the route-bound methods (`.params`, `.search`, `.head`,
`.scrollRestore`, the `prefetchPage*` family); component and provider, which
have no route, add input methods (`.input`, `.clientInput`, `.sharedInput`)
instead. The full per-type list is in the [reference](#reference) below.

## Getting data in

Two ways, the same on every mountable.

**A `.loader`** — **server-only**: cut from the client bundle — its body and the
imports it uses are removed, so it never ships to the browser (it runs on the
server):

```tsx
export const IdeaCard = root.lets
  .component()
  .input(z.object({ id: z.number() }))
  .loader(async ({ input }) => ({ idea: await findIdea(input.id) }))
  .component(({ data: { idea } }) => <h3>{idea.title}</h3>)
```

**An injected [query](query) via [`.with`](with)** — when the data lives in a
reusable query:

```tsx
export const IdeaCard = root.lets
  .component()
  .with(ideaQuery, ({ props }) => ({ id: props.id }))
  .component(({ data: { idea } }) => <h3>{idea.title}</h3>)
```

Both feed `data`. The mountable renders only once its data is ready, so the
closing component never sees a half-loaded state. Inject several queries and
read them from `queries` in declaration order, or fold them with
[`.mapper`](mapper). See [`.with`](with) for the full range.

`.with` and `.mapper` are both **server-ssr-and-client** — cut from the SERVER
bundle when `ssr:false` (or after a `.clientOnly()`): their bodies and imports
are then removed from the server build; kept in the client build always, and in
the server build only when SSR is on.

## The render-prop bag

The closing component receives one object. These keys are shared by all four
mountables:

```tsx
.component(({ data, queries, props, LoadingComponent, ErrorComponent }) => ...)
```

- **`data`** — the [`.mapper`](mapper) output, or the first injected query's
  data, or `{}` if neither. (`.mapper` overrides it.)
- **`queries`** — the injected query results, in `.with` order (`[]` if none).
- **`props`** — props contributed by `.with` (`{}` if none).
- **`LoadingComponent` / `ErrorComponent`** — the resolved boundary components.

Plus keys that exist only when the matching schema or route is set: `params` /
`search` / `input`, and `location` (page and layout only — component and
provider have no location). Page and layout also get `setSearch`; layout and
provider get `children`. The exact per-type bag is in the
[reference](#reference).

```tsx
.mapper(({ data }) => ({ ideas: data.pages.flatMap((p) => p.ideas) }))
.component(({ data: { ideas } }) => <List items={ideas} />)
```

A `.mapper` reshapes `data` for the component. On a [provider](provider), the
mapper's return value _is_ the provided value — what `useValue()` and
`getValue()` hand out. `.mapper` is **server-ssr-and-client** — cut from the
server bundle when `ssr:false`: body and imports removed from the server build;
kept in the client build always, and in the server build only when SSR is on.

## Loading and error

When a mountable's data is pending, Point0 renders the nearest `.loading`
component up the chain; on a thrown error or an `Error` returned from `.with`,
the nearest `.error`. Set them once on the [root](root) and override per point:

```tsx
export const root = Point0.lets
  .root()
  .loading(() => <Spinner />)
  .error(({ error }) => <ErrorScreen error={error} />)
  .root()

export const IdeaCard = root.lets
  .component()
  .loading(() => <CardSkeleton />) // override for this mountable
  .with(ideaQuery, ({ props }) => ({ id: props.id }))
  .component(/* ... */)
```

The error component receives `{ type, error }` where `type` is the mountable's
variant (`'page' | 'component' | 'layout'`; a provider reports as `'page'`); the
loading component receives `{ type }`. A [layout](layout) can set separate
boundaries for itself and for the pages beneath it — `.layoutError` /
`.pageError`, `.layoutLoading` / `.pageLoading`. Full rules, including prefetch
interaction, are in [Loading & error](loading-error).

`.loading` and `.error` (and their split forms) are **server-ssr-and-client** —
cut from the SERVER bundle when `ssr:false` (or after a `.clientOnly()`): their
bodies and imports are then removed from the server build; kept in the client
build always, and in the server build only when SSR is on.

## Wrapping: `.wrapper` vs a `.with` wrapper

Two ways to wrap a mountable's render, with a real difference.

**`.with(({ children }) => …)`** sits _inside_ the lifecycle — it sees the
resolved `data`, `queries`, and `props`, and can short-circuit to loading/error
before they load:

```tsx
.with(({ children, data }) => <section data-idea={data.idea.id}>{children}</section>)
```

**`.wrapper(Component)`** wraps the whole mountable from the _outside_,
including its loading and error boundary. It gets `props` and (on page/layout)
`location`, but **not** the resolved `data`/`queries` — it renders before they
exist:

```tsx
.wrapper(({ children }) => <ErrorBoundaryProvider>{children}</ErrorBoundaryProvider>)
```

Multiple `.wrapper` calls nest with the first-registered outermost. Use
`.wrapper` for things that must exist around the loading state itself (a theme,
an outer error boundary); use a `.with` wrapper when you need the loaded data.

Both `.wrapper` and the `.with` wrapper are **server-ssr-and-client** — cut from
the SERVER bundle when `ssr:false` (or after a `.clientOnly()`): their bodies
and imports are then removed from the server build; kept in the client build
always, and in the server build only when SSR is on.

A `.wrapper` wraps the render of the point it's set on. A [layout](layout)'s
wrappers don't carry to the pages beneath it — see that page for why.

## Opting out of SSR: `.clientOnly`

`.clientOnly()` marks a mountable as client-only: it's skipped during SSR and
mounts in the browser. From this point on, the rest of the chain (the remaining
`.with`, the closing `.component`/`.page`, …) is treated as if `ssr: false` for
this point — those bodies and the imports they use are cut from the server
bundle, so that code never ships to the server (it runs only in the browser).
Call it bare, or pass an optional `Fallback` to render server-side in its place:

```tsx
export const MetricsChart = root.lets
  .component()
  .clientOnly(() => <ChartSkeleton />) // shown server-side until the client mounts
  .with(metricsQuery)
  .component(({ data }) => <Chart data={data} />)
```

The `Fallback` renders in the server HTML and on the first client paint; once
the point hydrates, Point0 swaps in the real component. The fallback receives
the mount state plus `LoadingComponent` and `ErrorComponent`. With no
`Fallback`, nothing renders in that slot until hydration.

## Mountable vs endpoint

A mountable renders UI. An **endpoint** is served over HTTP (its own path, an
[OpenAPI](openapi) entry). These are orthogonal: a mountable becomes an endpoint
**only if it has a server `.loader()` or SSR is on** — the loader needs a URL to
fetch.

- A mountable with a server `.loader()` is also its own query
  (`point.useQuery()`, `point.fetchQuery()`, `point.getQueryKey()`) — Point0
  attaches a _self query_, which is what makes SSR and prefetch work. That self
  query needs an endpoint.
- A mountable that only composes other queries (no server loader) is
  **client-only**: it renders, but it isn't an endpoint and has no OpenAPI
  entry.

A [query](query), [mutation](mutation), or [action](action) is _always_ an
endpoint; a mountable is one only sometimes. "Endpoint" is about whether the
server serves the point directly, not about whether it renders. The [page](page)
page covers the page case (`SSR on` vs loader) in detail.

## Gating a mountable: `.with`, not `.ctx`

The closing component is browser code. Server-only code (loader bodies, secrets,
DB calls) is stripped from the client bundle at compile time — but the rendered
markup is not: under SSR it's produced on the server and shipped to the browser,
and after the initial render every mountable re-renders client-side. So don't
put secret content in the markup expecting it to stay on the server.

Gate access in a [`.with`](with), not in `.ctx`. A mountable's `.ctx` runs
**only when the point has a loader** (no loader → no server request → `.ctx`
never runs), so a loader-less mountable's `.ctx` protects nothing. `.ctx` is
**server-only** — cut from the client bundle: its body and the imports it uses
are removed, so it never ships to the browser (it runs server-side). A `.with`
runs at render, every time, on the client and (under SSR) the server:

```tsx
import { authPlugin } from '@/lib/auth' // a plugin that resolves the user into props.me
import { AppError } from '@/lib/error' // your own error class — ErrorPoint0 or a compatible one

export const AdminPanel = root.lets
  .component()
  .use(authPlugin)
  .with(({ props: { me } }) => {
    if (!me?.isAdmin) return new AppError('Forbidden', { code: 'FORBIDDEN' })
    return { me }
  })
  .component(/* ... */)
```

`me` comes from a [plugin](plugin) upstream (it doesn't appear on its own).
Returning an error from `.with` short-circuits to the error component. The class
can be the default [`ErrorPoint0`](error-handling) or any error class of the
same-or-wider structure (one option for building one is
[error0](https://1gr14.dev/error0)). See [`.with`](with) for the full gate
pattern.

## `.X` — the bound component

Closing a mountable produces a ready point that is itself a React component
carrying the full point API. The same component is exposed two ways, and they
are identical:

```tsx
<UserCard userId={1} />   // short — the ready point IS the component
<UserCard.X userId={1} /> // explicit — the bound component on `.X`
```

The short form only works because the variable starts with a capital letter —
JSX treats a lowercase tag (`<userCard />`) as an HTML element, so a lowercase
point forces you into the explicit `<userCard.X />` form. Declare every
mountable in **PascalCase** and prefer `<UserCard />`.

A [provider](provider) is mounted the same way and hands its value out below:

```tsx
export const AppProvider = root.lets.provider().provider(() => ({ theme: 'dark' }))

// mount it:
<AppProvider>{children}</AppProvider>
// and read its value anywhere below:
AppProvider.useValue('theme') // => 'dark'
```

[Page](page) and [layout](layout) mount on their own — the router renders them
from their route — so you rarely write them as JSX. A page's `.X` is its `Page`,
a layout's its `Layout`, a component's its `Component`.

## Reference

### Component-prop bag, per type

All four share `data`, `queries`, `props`, `LoadingComponent`, `ErrorComponent`,
plus `params` / `search` / `input` when the matching schema is set. Differences:

| Key         | page      | layout                | component | provider |
| ----------- | --------- | --------------------- | --------- | -------- |
| `location`  | ✓ (exact) | ✓ (ancestor or exact) | —         | —        |
| `setSearch` | ✓         | ✓                     | —         | —        |
| `children`  | —         | ✓                     | —         | ✓        |

A provider's closing argument is a [`.mapper`](mapper)-style function whose
return value becomes the provided context value.

### Methods per mountable type

Each stage-method is tagged with what compile-time stripping cuts and from which
bundle (the body and the imports it pulls in go together) — one of
**server-only** (cut from the client bundle, never ships to the browser),
**client-only** (cut from the server bundle), **server-and-client** (kept in
both, isomorphic, nothing pruned), or **server-ssr-and-client** (cut from the
server bundle when `ssr:false`; kept in the client build always, in the server
build only when SSR is on).

**Shared by all four** (while composing):

- `.with` — server-ssr-and-client
- `.wrapper` — server-ssr-and-client
- `.mapper` — server-ssr-and-client
- `.loading` — server-ssr-and-client
- `.error` — server-ssr-and-client
- the closer `.page` / `.layout` / `.component` / `.provider` —
  server-ssr-and-client
- `.loader` — server-only
- `.ctx` — server-only
- `.middleware` — server-only
- `.headers` — server-only
- `.cookies` — server-only
- `.serverOn` — server-only
- `.description` — server-only
- `.clientLoader` — client-only
- `.clientOn` — client-only
- `.clientOnly` — the SSR switch; from here on, `server-ssr-and-client` methods
  behave as `ssr:false`
- `.use` — server-and-client (a plugin's own methods strip by their own
  category)
- `.fetchOptions` — server-and-client
- `.on` — server-and-client
- `.tag` — server-and-client
- `.query` / `.infiniteQuery` (to finalize a loader-bearing self query) —
  server-and-client. The self query is **finite by default**; close with
  `.infiniteQuery({...})` after the loader to make it infinite.

**Page / layout add** (route-bound):

- `.params` / `.search` — server-and-client here (a non-action mountable keeps
  them isomorphic; they're server-only only on an [action](action))
- `.head` — server-ssr-and-client
- `.scrollPosition` / `.scrollRestore` — client-only. Documented in full on
  [navigation](navigation); see that page.
- `.relatedQuery` — server-and-client. It DOES add its query to `queries` (like
  a `.with(query)`); the difference is prefetch — a related query is statically
  discoverable, so prefetch self-fetches it without rendering under the cheap
  policies (`serverQuery` / `clientQuery` / `serverAndClientQuery`), whereas a
  `.with(query)` is only discovered by rendering and is prefetched only under
  the expensive `pageDehydratedState*`.
- `.onPrefetchPage` — server-and-client. It runs on the client AND during
  server-side prefetch.
- `.prefetchPageOnNavigate` / `.prefetchPageOnLinkHover` / `.prefetchPagePolicy`
  — client-only

Layout also adds the split boundaries `.pageError` / `.layoutError` and
`.pageLoading` / `.layoutLoading` (both **server-ssr-and-client**, like `.error`
/ `.loading`), and `.pageQueryOptions` / `.layoutQueryOptions`
(**server-and-client**).

**Component / provider add** (no route): `.input` / `.sharedInput` —
server-and-client on a non-action mountable (isomorphic); `.clientInput` —
client-only. They have no `.params` / `.search` / `.head` / scroll / prefetch
methods, and no `.relatedQuery` or `.onPrefetchPage` — both are
page/layout-only.

### What counts as a mountable

At runtime, exactly `page | layout | component | provider`. Every mountable can
carry and inject queries; not every query-carrying point is a mountable — a
standalone [query](query) or [infinite query](infinite-query) is queryable but
not mountable (it renders nothing).
