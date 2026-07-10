---
index: 200
title: SSR
description:
  Server-render a page by fetching its queries on the server, then ship the HTML
  with the data already in the cache.
---

With SSR on, a page is rendered on the server with its data already loaded, so
the browser gets real HTML on the first response — not an empty shell that
fetches afterward. Point0 does this without you marking anything: it renders the
page, finds the queries it tried to run, fetches them on the server, and
re-renders until nothing is left pending. Then it ships the HTML plus a
dehydrated query cache, and the page hydrates into the normal SPA.

```ts
// engine.ts
import { Engine } from '@point0/engine'

export const engine = Engine.create({
  ssr: true, // server-render pages; off unless you turn it on
  clients: [
    /* ... */
  ],
})
```

That single line is the whole setup.

## How a render becomes HTML

SSR runs a **render-to-discover** loop. There's no manifest of "what this page
needs" — Point0 learns it by rendering:

1. Render the page once on the server.
2. Look at the query cache for any [query](query) that is **pending** — a query
   the render started but couldn't resolve synchronously.
3. Fetch those queries on the server (their loaders run here, with your server
   code).
4. Render again. Now those queries resolve from cache, which may reveal _new_
   pending queries deeper in the tree.
5. Repeat until a render adds no new pending queries.

```tsx
// this page renders, the loader is found pending, fetched, then re-rendered
export const ideaPage = root.lets
  .page('/ideas/:id')
  .with(ideaQuery, ({ params }) => ({ id: Number(params.id) }))
  .page(({ data: { idea } }) => <h1>{idea.title}</h1>)
// server ships HTML with <h1> already filled in; no loading flash on the client
```

In practice this is **2–4 re-renders per request** — one to discover, one or two
to fetch and settle. A page with no data settles in a single render; a chain
where one query's result feeds the next (via an [SsrStore](ssr-store)) can take
five. You don't manage any of this; it's the price of not having to declare your
data dependencies up front.

And you don't have to pay it: warm a page's cache in
[`.onPrefetchPage`](#onprefetchpage), which runs once before the first render,
and the loop settles in a single pass. Pick per page — write nothing and let the
loop discover, or declare the data once and skip the re-renders.

Three things the loop deliberately does **not** wait for:

- **Client loaders don't run on the server.** A `.clientLoader()` query stays
  pending through SSR and renders its loading state — the data arrives after
  hydration. Only server queries are fetched during SSR.
- **Disabled queries are skipped.** A query with `enabled: false` is never
  prefetched, which is exactly how a dependent query waits for its input.
- **`ssr: false` and streamed (`suspend: 'server' | true`) queries don't
  block.** `ssr: false` is never executed on the server at all; a streamed query
  starts immediately but delivers its result after the shell instead of holding
  it back — see
  [the `ssr` and `suspend` query options](#the-ssr-and-suspend-query-options).

## Shipping the HTML, then the SPA

After the loop settles, the server sends the rendered HTML with a serialized
store (including the resolved query cache) injected as a `<script>` at the start
of the `<head>`. On the client, `mount()` (from `@point0/react-dom/mount`)
prepares that dehydrated superstore — which carries the query cache — then calls
React's `hydrateRoot` over the existing markup. From there the page is a normal
SPA — navigations no longer hit the server for HTML.

A page that started life as a bare `index.html` and fetched on the client ends
up identical to its SSR'd version. SSR changes _when_ the data arrives (with the
HTML vs. after a client fetch), not the final result.

By default the HTML ships **whole**: Point0 waits for the entire React tree
(`stream.allReady`) before it sends a byte. That's the intent — if you turned
SSR on, you asked for the finished page in the first response. When one slow
query shouldn't hold everything back, you don't give up on that: mark it
`suspend: 'server'` ([below](#the-ssr-and-suspend-query-options)) and the server
streams — the shell ships immediately with that mountable's `.loading()` in
place, and the real content follows **in the same response** when the loader
resolves. For a query that shouldn't run on the server at all, `ssr: false`
skips it entirely and the client fetches it after hydration. React Server
Components are supported as "elements as data": a `.loader()` returns React
elements next to regular values, server components render on the server and
never ship to the browser, and component points hydrate as interactive islands —
all through the same data pipe SSR already uses. The whole model is on the
[RSC](rsc) page.

Every mountable render (page, layout, component, provider) is wrapped in an
error boundary and a Suspense boundary. A throw inside a mountable's render
renders **that mountable's `.error()`** in place, and the rest of the page stays
alive. On the server the throw carries the same effects into the response a
RETURNED error does — its HTTP `status` applies, and a thrown redirect becomes
the real HTTP redirect; the HTML itself ships the mountable's `.loading()`
fallback for that spot and `.error()` renders after hydration (returning an
error from the data phase is what puts `.error()` into the SSR HTML itself). The
engine's SPA fallback (serving the bare `index.html` with the error attached)
still exists, but only for errors outside every boundary — a broken root, a
failing wrapper.

> **Security:** server-only code (loader bodies, secrets, DB calls) is cut from
> the client bundle — its body and the imports it uses are removed at compile
> time, so it never ships to the browser (it runs only on the server during SSR
> and query fetches). The page component itself renders on both sides, and
> anything you render into the HTML is public. Gate access with a server
> [`.ctx`](ctx) or `.loader`, not by hiding markup. In production Point0 never
> renders an error stack into the HTML.

## Turning SSR off

`ssr: false` ships the bare `index.html` and the page fetches its data on the
client (the classic SPA):

```ts
export const engine = Engine.create({ ssr: false })
```

With `ssr: false` the **server-ssr-and-client** render methods (`.page` /
`.layout` / `.component` / `.provider`, the `.loading` and `.error` families,
`.wrapper`, `.with`, `.mapper`, `.head`) are cut from the server bundle — their
bodies and the imports they use are removed from the server build, since there's
no server render to keep them around for; they stay in the client build. Of the
four strip categories, only this one tracks the SSR flag — the other three are
covered below.

### `.ssr(false)` — a page or a whole section as an SPA

While SSR is globally on, opt **one page** — or a whole subtree — out of SSR
with `.ssr(false)`. That page ships as the bare shell (like the global
`ssr: false`) and renders entirely on the client, while the rest of the app
keeps SSR:

```tsx
export const Dashboard = root.lets
  .page('/dashboard')
  .ssr(false) // a pure SPA page — the server ships the shell, the browser renders it
  .page(/* a heavy, interaction-only dashboard */)
```

`.ssr(...)` is inherited down the chain, so putting it on a **base** turns a
whole section into an SPA in one place — every page built from that base is SPA.
This is a real win, not cosmetics: the server spends **nothing** rendering those
routes, every visit is served as a static shell, and the work moves to the
browser. A server-rendered marketing site and blog can sit in front of a
pure-SPA logged-in app, all in one project.

`.ssr()` can only turn SSR **off** — `.ssr(false)`, or an options object with
`enabled: false` (the object form also [tunes the loop](#tuning-the-loop) for a
page that stays SSR). There is no `.ssr(true)`: SSR is engaged per side by the
engine `ssr` option, and a single point cannot force the server to render for a
side that does not. On root, base, page, layout — SSR is a page-level property,
so not on components/providers (use `.clientOnly()` there) or plugins.

A [prefetch policy](#prefetch-policies) that needs a server render —
`pageDehydratedState` / `pageDehydratedStateAndClientQuery` — is quietly
downgraded to `serverQuery` / `serverAndClientQuery` on an `.ssr(false)` page
(there is no dehydrated state to prefetch). Declaring such a policy _after_
`.ssr(false)` instead throws at build — that ordering is a contradiction.

### `.clientOnly()` — a browser-only render inside an SSR page

`.clientOnly()` is **not** the same as `.ssr(false)`: the page still SSRs — its
layouts render on the server and the HTML ships — but the render tail after it
is wrapped to run in the browser only, showing an optional fallback during SSR:

```tsx
export const ChartPage = root.lets
  .page('/chart')
  .clientOnly(() => <Skeleton />) // the page SSRs; only the chart is client-only, skeleton meanwhile
  .page(/* a component that only works in the browser */)
```

Call `.clientOnly()` with no argument and the slot is empty during SSR, filled
after hydration. Reach for `.clientOnly()` when a page is mostly server-rendered
but one piece (a chart, a map) is browser-only; reach for `.ssr(false)` when a
whole page or section should not be server-rendered at all.

Both cut the **server-ssr-and-client** render methods (`.page` / `.layout` /
`.component` / `.provider`, the `.loading` and `.error` families, `.wrapper`,
`.with`, `.mapper`, `.head`) from the server bundle for the affected point —
bodies and imports removed — so a browser-only library you reach for in them
never lands in the server build. Of the four strip categories, only this one
tracks SSR; the other three are unaffected. **server-only** methods (`.ctx`, a
server `.loader`, `.input`, …) stay cut from the client bundle either way;
**client-only** methods (`.clientLoader`, `.onPrefetchPage`, …) stay cut from
the server bundle regardless of SSR; and **server-and-client** methods (closers
like `.query`, the `*QueryOptions` setters, `.relatedQuery`, …) are cut from
neither. Both only restrict what _renders_, not what loads.

## The `ssr` and `suspend` query options

Every place that accepts query options — `useQuery` / `useInfiniteQuery` calls,
the `.query()` / `.infiniteQuery()` closers, `.with(query, …)`, `.relatedQuery`,
and the `*QueryOptions` defaults — accepts two per-query switches, merged like
any other query option (the later, more specific declaration wins: defaults →
point-kind defaults → `.query()` options → the call site).

**`ssr?: boolean`** — does the server execute this query during SSR?

- **`true`** (the default, same as omitting) — the server fetches the query.
- **`false`** — the server never executes the query. The HTML ships this
  mountable's loading state and the client fetches after hydration — the same
  shape a `.clientLoader()` query has during SSR, opted into per query.

**`suspend?: 'auto' | 'server' | 'client' | boolean`** — does a pending query
suspend into the nearest Suspense boundary (the closest positional
`.loading()`), and where?

- **`'auto'`** (the default, same as omitting) — while the server can still wait
  for the query, nothing special happens: the discover loop fetches it and its
  data ships inside the HTML. It suspends only when waiting is impossible — in
  the final streamed render (revealed under an already-streamed boundary, or
  left pending because [`allowedDiscoveryRenders`](#tuning-the-loop) cut the
  loop short) it suspends and streams into the response instead of shipping a
  dead pending state. Never suspends on the client.
- **`'server'`** — the server never blocks the response on this query: the
  loader starts immediately, the shell ships with the mountable's `.loading()`
  fallback, and when the loader resolves React streams the real content **into
  the same response**, together with an inline script that seeds the query cache
  — after hydration the client has the data, no refetch, no flicker. Never
  suspends on the client.
- **`true`** — like `'server'`, and the query also suspends on the **client**
  (client navigations, fresh inputs) into the same positional boundaries. For
  non-optional `data` in types, prefer
  [`useSuspenseQuery`](#usesuspensequery--usesuspenseinfinitequery).
- **`'client'`** — suspends only on the **client** (client navigations, fresh
  inputs); during SSR it never suspends — like `false` on the server, a query
  still pending at the final render ships its loading state. The mirror of
  `'server'`, for completeness.
- **`false`** — never suspends anywhere: a query still pending at the final
  render ships the loading state in the HTML and the client fetches after
  hydration.

Suspension is for **pending** queries only. A failing query never throws through
the option — on both sides the error arrives as query **state**: the chain
renders the positional `.error()`, a manual hook reads `query.error` itself.
(Only the [suspense hooks](#usesuspensequery--usesuspenseinfinitequery) throw
errors to the boundary — TanStack semantics.)

```tsx
export const statsComponent = root.lets
  .component()
  .loading(() => <StatsSkeleton />) // declared ABOVE the query — this boundary catches it
  .loader(async () => ({ stats: await computeSlowStats() })) // ~2s
  .query({ suspend: 'server' }) // don't hold the page's TTFB for it
  .component(({ data }) => <Stats stats={data.stats} />)
```

Because the options merge, **streaming-first is one declaration**:
`.queryOptions({ suspend: 'server' })` on a root, layout, or page makes the
whole subtree stream — the discover loop has nothing to wait for, the shell
ships with the first bytes, and every query streams in as it resolves.

Which fallback shows while a query streams? The boundaries are **positional**:
the `.loading()` / `.error()` declared closest above the query in the chain
catches it (a query declared before any `.loading()` uses the point's
last-declared one). Streamed queries can **cascade**: a layout's streamed query
resolves, its subtree renders, and a page below it suspends on its own query —
React streams the nested boundaries out of the box, any depth.

### `useSuspenseQuery` / `useSuspenseInfiniteQuery`

Every query point also has suspense hooks with TanStack semantics: `data` is
**non-optional in types**, a pending query suspends into the nearest Suspense
boundary, an error **throws** to the nearest ErrorBoundary (the mountable's
positional `.error()`). During SSR the shell ships with the fallback and the
resolved content streams into the same response; on the client they suspend on
navigations and fresh inputs. They take no `enabled`, `ssr`, or `suspend`
options — a suspense query always runs and always suspends.

```tsx
const { data } = ideaQuery.useSuspenseQuery({ id }) // data: never undefined
```

### What a streamed loader can't do

A loader that resolves **after the response headers are sent** cannot affect
them anymore. Point0 warns at runtime when it tries anyway:

- It cannot **redirect**, set **cookies**, or change the **status/headers** —
  the response is already streaming. This covers both the `set.*` helpers and a
  `CookieStore` write from a streamed subtree rendering after the shell. A
  redirect **thrown** from a streamed subtree's render degrades the same way: no
  HTTP redirect anymore — the client boundary performs the hop after hydration
  (silently: that degradation is normal operation, not a failure).
- It cannot feed an [SsrStore](ssr-store) or cookie value into the SSR re-render
  loop — the loop is over by the time it resolves.
- If it **throws**, what streams in place of the content follows
  [`retryOnMount`](#failed-loaders-and-retryonmount): with `retryOnMount: false`
  the mountable's `.error()`, with the default the loading state (the client
  retries on mount). Either way the error state travels to the client cache with
  the same public/private projection the dehydrated store uses, the rest of the
  page is unaffected, and the server logs the failure through the usual
  query-error events.
- A `.head()` that depends on streamed data ships the loading-state head in the
  shell; the client corrects it after hydration.

### Failed loaders and `retryOnMount`

What SSR renders for a query whose loader **failed** follows TanStack's
`retryOnMount` — the same option that drives a client-side mount, streamed or
not:

- **Default (`retryOnMount` unset → `true`).** An errored query reports itself
  as "about to be retried on mount", so the server renders the **loading
  state**. The error itself still travels to the client cache (same
  public/private projection as the dehydrated store), the client hydrates the
  identical loading view and retries the query on mount — the exact imitation of
  a client-side mount.
- **`retryOnMount: false`.** An errored query reports honestly, so the server
  renders the mountable's **`.error()`** (and its error `.head()`), and the
  error's `status` reaches the response. The client hydrates the same error view
  and does not refetch.

Two things do NOT depend on this switch: a loader **redirect** produces the real
HTTP redirect either way (it travels through the data phase, not the render),
and a failed loader's HTTP **status** reaches the response either way — the
switch only decides what the HTML shows.

Set it once on the root — the recommended setup for SSR apps, and what every
example uses:

```tsx
export const root = Point0.lets('root', 'app')
  .queryOptions({ retryOnMount: false })
  .root()
```

One deliberate exception: the suspense hooks. A "retry on mount" cannot happen
during SSR (nothing mounts), so on the server `useSuspenseQuery` /
`useSuspenseInfiniteQuery` throw a failed query's error to the boundary
regardless of `retryOnMount` — the fallback ships and the client retries after
hydration; the client half keeps native TanStack behavior.

### Point level vs query level

Don't confuse the point-level and query-level switches — they work at different
layers:

| Switch                                        | Layer                            | What it does                                                                                                                                                                   |
| --------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ssr: false` (engine) / `.clientOnly()` point | **Compiler** — build-time strip  | Cuts the render methods' bodies and imports from the server bundle; the point (or app) renders only on the client                                                              |
| `ssr` / `suspend` in query options            | **Runtime** — per-query behavior | Decide whether one query runs on the server at all (`ssr`) and whether it blocks the HTML, streams after the shell, or suspends on the client (`suspend`); nothing is stripped |

The [dehydrated-state endpoint](#the-dehydrated-state-endpoint) and the
server-render prefetch policies (`pageDehydratedState*`) skip `ssr: false` and
streamed (`suspend: 'server' | true`) queries — there is no stream to push their
results into, so the client fetches them itself after navigating. Client-side
prefetch policies are unaffected.

## Tuning the loop

The discover loop is comfortable, but every re-render is a render you paid for.
If a page's data is predictable, you can tell Point0 what it needs **before**
the first render and collapse the loop to a single pass.

The escape hatch is [`.onPrefetchPage`](#onprefetchpage): a hook where you warm
up the cache yourself. Take a page that loads a query the loop would otherwise
discover on a second pass — declare it in `.onPrefetchPage` instead:

```tsx
export const ProfilePage = root.lets
  .page('/profile')
  // runs before the first render — the cache is already warm when rendering starts
  .onPrefetchPage(async () => {
    await getMeQuery.prefetchQuery()
  })
  .with(getMeQuery)
  .page(({ data: { me } }) => <h1>Hello, {me.name}!</h1>)
```

Now the very first render finds `getMeQuery` already in cache, resolves it
synchronously, and the loop settles in **one pass** — no discover-then-fetch
round-trip.

Two things to know:

- **It runs on both sides.** The same `.onPrefetchPage` runs on the server (once
  before the first render — no opt-in) and on the client (when you navigate to
  the page), so one prefetch covers the first load and every client-side
  navigation. Need one side only?
  [`.serverOnPrefetchPage` / `.clientOnPrefetchPage`](#onprefetchpage) restrict
  it to one bundle.
- **No duplicate hop on the server.** On the client a
  `prefetchQuery`/`fetchQuery` on a point's loader goes over the network — the
  loader is server code. During SSR the same call resolves **in-process through
  `engine.fetch()`**, not by Point0 making an HTTP request back to itself.

The hook does **not** auto-prefetch your page/layout loaders. If a page's
loaders are predictable, flip on
[`prefetchLoadersBeforePageRender`](#prefetchloadersbeforepagerender) to
prefetch the declared `.loader()` queries up front as well — no hook needed.

All discovery renders — query discovery and store/cookie stabilization alike —
count against one budget, `allowedDiscoveryRenders` (below). Set it to `1` for a
single pass with no re-renders, or `0` to skip discovery entirely.

Pass an object instead of a boolean to tune the discover loop. The object form
is **SSR on** unless you set `enabled: false`:

```ts
export const engine = Engine.create({
  ssr: {
    // best case: prefetch loaders up front so the first render already has the data
    prefetchLoadersBeforePageRender: true,
    allowedDiscoveryRenders: 1,
  },
})
```

### prefetchLoadersBeforePageRender

The `.onPrefetchPage` hooks always run before the first render; this option adds
the **loaders** to that step. With `prefetchLoadersBeforePageRender: true`,
Point0 also prefetches the page's and its layouts' `.loader()` server queries
declaratively — with inputs derived from the route — **before** the first
render. The render then finds the data already in cache and needs fewer, often
zero, extra passes.

```tsx
// a page with a layout loader + a page loader:
//   default                                → 3 renders (initial, layout, page)
//   prefetchLoadersBeforePageRender: true  → 1 render
```

Only queries declared as `.loader()` are prefetched here — their inputs are the
route params, so they are always correct. Queries injected with `.with()` (or
declared inside a component) take render-time inputs and are still discovered by
the render loop, which runs as the fallback. Default `false`.

### allowedDiscoveryRenders (soft cap)

A budget of **discovery renders** — the passes that discover queries and
stabilize SsrStore/cookie values before the final render. The final render is
not counted: there is always exactly one. Once the budget is spent, the loop
**stops quietly** — no error. Default `Infinity` (render until everything is
discovered and stable).

```ts
ssr: {
  allowedDiscoveryRenders: 1
} // a single discovery render, no stabilization re-renders
```

Spending the budget doesn't lose data — it changes **how** it arrives. The
loaders discovery saw are still fetched and their data ships in the HTML; a
query the stopped loop never reached surfaces in the final render, which then
**streams** (its `suspend` option decides: `'auto'` suspends and streams,
`false` ships the loading state and leaves the fetch to the client). When the
soft cap stops a stabilization pass, any staged `SsrStore` change from the last
render is **left uncommitted** — the HTML and the transferred store value stay
consistent.

`0` is the earliest-shell mode: **no discovery render at all**. The
`.onPrefetchPage` hooks and the `prefetchLoadersBeforePageRender` warm-up still
run, then the final render streams immediately — every query it reveals behaves
as under a spent budget (suspend-and-stream or client fetch). A redirect that
renders **into the shell** of that final render (a root layout gate, a `.with`
redirect) still becomes the real HTTP redirect — nothing has been sent when the
shell settles, so the engine answers with the 30x response. The price concerns
what only resolves **after** the shell: redirects from streamed subtrees degrade
to client-side redirects, and late status/cookie writes are lost (you get the
[late-loader warnings](#what-a-streamed-loader-cant-do)). The
[data endpoint](#the-dehydrated-state-endpoint) stays useful at `0`: it serves
whatever the warm-up prefetched, so a client-navigation prefetch behaves exactly
like a direct visit — the same data preloaded, the rest loading on the client.

### forbiddenDiscoveryRenders (hard cap)

A safety net, counted the same way. Reaching it stops the loop **and logs a
server error**. It catches non-deterministic values — `Date.now()`,
`Math.random()` in a store or cookie — that never stabilize and would otherwise
re-render forever. Default `25`.

```
// after 25 discovery renders, logged at level 'error', category ['ssr']:
// "SSR stores/cookies did not stabilize after 25 discovery renders (forbiddenDiscoveryRenders);
//  using the last render. Check for non-deterministic SsrStore or cookie values..."
```

If both caps are set, the hard cap is checked first.

> **Dev only:** a server render sets an `x-point0-discovery-renders` response
> header with the discovery-render count (the final render is not counted — it
> always happens exactly once), so you can eyeball how many passes a page took
> straight from the network tab. It's not set in production.
>
> For anything beyond eyeballing, read the count in code:
> [`request.renders`](request) holds the same count for the current request, in
> dev **and** production — log it from a [middleware](middleware), alert on
> pages that re-render too much, or feed it into metrics.

## Prefetch policies

The loop above is the _first_ load. Once the SPA is running, **navigations** no
longer ask the server for HTML — instead Point0 prefetches the next page's data
before it swaps the view, so the page appears already filled in. The **policy**
decides what gets prefetched, and the policies differ in one key way: **whether
the prefetch renders the page on the server or not.**

- With **`pageDehydratedStateAndClientQuery`** (and `pageDehydratedState`) the
  server _does_ render the page — in memory, to discover and resolve its
  queries. It doesn't send back HTML; it sends back the **dehydrated query
  cache**, which the client drops into its own cache. The most thorough policy,
  and the most expensive one.
- With **`serverAndClientQuery`** there is **no server render at all**. The
  client looks at the queries declared on the target page and its layouts and
  calls them directly. Cheaper, but it only sees queries that are visible
  without rendering.

Policies are a [navigation](navigation) topic; here is the SSR-relevant gist.
Set a policy on the [root](root) (the usual place) for both triggers, or per
[`<Link>`](navigation) / [`navigate`](navigation):

```tsx
export const root = Point0.lets
  .root()
  .prefetchPagePolicy('pageDehydratedStateAndClientQuery') // sets navigate + hover
  .root()
```

The policy values, cheapest to most thorough:

| Policy                                | What it does                                             |
| ------------------------------------- | -------------------------------------------------------- |
| `'none'` / `false`                    | no prefetch — the page loads its data after navigation   |
| `'onPrefetchOnly'`                    | run only the `.onPrefetchPage` hooks                     |
| `'serverQuery'`                       | prefetch the page/layout **server** queries it can see   |
| `'clientQuery'`                       | prefetch the page/layout **client** queries              |
| `'serverAndClientQuery'`              | prefetch whichever loader each point has — **no render** |
| `'pageDehydratedState'`               | server **renders** the page in memory, returns the cache |
| `'pageDehydratedStateAndClientQuery'` | the above, plus the client loaders                       |

### The three approaches worth knowing

The table has seven values, but in practice you reach for one of three setups.
They trade **how much code you write** against **how many server renders you pay
for** against **what the user sees on navigation**.

**1. `pageDehydratedStateAndClientQuery` — least code, server renders.** Set it
once on the root and forget it. Every navigation triggers a full in-memory
server render of the target page, so _every_ query is found — even ones declared
inside deep components — and the page lands fully loaded. You write nothing
extra; you pay a server render per navigation.

```tsx
export const root = Point0.lets
  .root()
  // most reliable coverage, no per-page work, but a server render per navigation
  .prefetchPageOnNavigate('pageDehydratedStateAndClientQuery')
  .root()
```

**2. `serverAndClientQuery` + `onPrefetchPage` — a little code, no server render
on navigation.** The client calls the page's declared queries directly, no
server render. Queries buried inside components aren't seen this way, so you
make up the difference with [`.onPrefetchPage`](#onprefetchpage), warming
exactly what the page needs — and that same hook keeps the first SSR load
single-pass. Add `allowedDiscoveryRenders: 1` if you also want to forbid
store/cookie stabilization re-renders.

```tsx
export const ProfilePage = root.lets
  .page('/profile')
  // declare what the cheap policy can't see on its own
  .onPrefetchPage(async () => {
    await getMeQuery.prefetchQuery()
  })
  .with(getMeQuery)
  .page(({ data: { me } }) => <h1>Hello, {me.name}!</h1>)

export const root = Point0.lets
  .root()
  .prefetchPageOnNavigate('serverAndClientQuery') // no server render on navigation
  .root()
```

**3. `none` — no prefetch, loading states do the work.** Don't prefetch
anything. On navigation the page mounts, its queries start, and your
`.loading()` components show until the data arrives. The simplest model — fine
when a brief loading state is acceptable.

```tsx
export const root = Point0.lets
  .root()
  .prefetchPageOnNavigate('none') // mount, then resolve under .loading()
  .root()
```

### serverAndClientQuery vs pageDehydratedState in detail

The two ends of the trade-off, spelled out:

```tsx
// CHEAP: no server render. Looks at the page/layout loaders and calls them from the client.
.prefetchPageOnLinkHover('serverAndClientQuery')
```

`serverAndClientQuery` renders nothing, so it only sees queries declared
statically on the points themselves (`.loader`, `.relatedQuery` on the
page/layout). A `.with` query, or a query declared _inside_ a component, is
found only by rendering — it isn't discovered and shows its loading state after
navigation. Close the gap with `.onPrefetchPage`.

```tsx
// EXPENSIVE: full in-memory SSR render of the target page, just to collect its cache.
.prefetchPageOnNavigate('pageDehydratedStateAndClientQuery')
```

`pageDehydratedState*` **renders the page in memory** on the server and returns
only its dehydrated query cache (the HTML is thrown away). It runs the same
render-to-discover loop, so it finds _every_ query, including the ones inside
components — but you pay a full server render per prefetch.

These two **require SSR**. With `ssr: false` they throw:

```tsx
.prefetchPagePolicy('pageDehydratedState')
// throws "Query client dehydrated state can be prefetched only when ssr is enabled..."
```

A practical split: `serverAndClientQuery` on hover (fires constantly, must be
cheap), `pageDehydratedStateAndClientQuery` on the actual navigate. Pick the
expensive one only where coverage matters more than load.

## .onPrefetchPage

The escape hatch for what a cheap policy misses. `.onPrefetchPage` registers a
callback that runs during prefetch (and, on the server, once before the first
render), where you can warm up data the policy wouldn't otherwise discover. It's
on [base](base), [page](page), [layout](layout), and [plugin](plugin); calls
accumulate.

```tsx
export const profilePage = root.lets
  .page('/profile')
  .onPrefetchPage(async () => {
    const { me } = await getMeQuery.fetchQuery()
    if (me) await listAccountsQuery.prefetchQuery() // only when signed in
  })
  .page(/* ... */)
```

It receives `{ location, props }` and runs on **both sides**: on the server once
before the first render (always — no opt-in), and on the client during prefetch
when you navigate to the page. On the client it never fires in the normal
render-to-discover loop, never for the `'none'` policy, and never for the
server-only `'pageDehydratedState'` policy (which returns right after the
in-memory render, before the hooks fire; `pageDehydratedStateAndClientQuery`
still runs them).

Need one side only — server-only setup, or a client-only ping —
`.serverOnPrefetchPage` and `.clientOnPrefetchPage` are the same hook restricted
to one bundle: the server-only body (and its imports) is stripped from the
client build, the client-only body from the server build. Plain
`.onPrefetchPage` stays in both.

## The dehydrated-state endpoint

The `pageDehydratedState*` policies are powered by a third output type a page
can serve, alongside its HTML and its data. A page endpoint can be asked for
`queryClientDehydratedState` — the engine runs the full SSR loop in memory and
returns just the serialized query cache (pending queries filtered out), which
the client hydrates and then swaps for live queries.

You don't call this endpoint directly; the prefetch policy does. Two things are
worth knowing:

- **Pages always keep an endpoint** so this can be requested — even a page with
  no server loader stays addressable for its dehydrated state.
- Tune the prefetch query itself with
  [`.pageDehydratedStateQueryOptions(...)`](stage-methods) on the root, base, or
  page. This is the dehydrated-state fetch's own query options, separate from
  your page queries — and a **longer `staleTime`** here usually pays off:

  ```tsx
  export const root = Point0.lets
    .root()
    .pageDehydratedStateQueryOptions({ staleTime: Infinity })
    .root()
  ```

  It matters most when you prefetch on **link hover**: a hover fires every time
  the cursor crosses a link, and without a stale window each pass would re-fetch
  the whole dehydrated state. A longer `staleTime` lets one hover's result
  satisfy the navigation that follows (and repeat hovers) instead of
  re-rendering the page on the server each time.

## SsrStore: state that survives the loop

A value written during render that must reach the client — and may drive
re-renders — belongs in an [SsrStore](ssr-store), written through
[`useEffectSsr`](ssr-store) so the effect also runs on the server:

```tsx
import { useEffectSsr } from '@point0/core'
import { SsrStore } from '@point0/core/ssr-store'

export const $breadcrumb = SsrStore.define<BreadcrumbItem[]>(
  'breadcrumb',
  () => [],
)

export const useBreadcrumb = (...items: BreadcrumbItem[]) => {
  useEffectSsr(() => {
    $breadcrumb.set(items) // staged on the server, committed between renders
    return () => $breadcrumb.set([])
  }, [stringify(items)])
}
```

On the server a `set()` **stages** the value; the loop commits it between passes
and re-renders so ancestors reading the store see the new value. This is what
the soft/hard caps protect: a store that never settles would re-render forever.
Cookies behave similarly but are **always** committed, even on the final pass —
a dropped cookie is worse than a re-render. Full mechanics on
[SsrStore](ssr-store) and [CookieStore](cookie-store).

## Reference

### The `ssr` engine option

```ts
type SsrOptions = {
  enabled?: boolean // default true when an object is given
  allowedDiscoveryRenders?: number // soft cap on discovery renders; default Infinity
  forbiddenDiscoveryRenders?: number // hard cap (+ logs an error); default 25
  prefetchLoadersBeforePageRender?: boolean // also prefetch loaders before first render; default false
}

// engine config accepts: boolean | SsrOptions
ssr: true // on, all loop defaults
ssr: false // off — bare index.html, client-side fetch
// (omitting `ssr` entirely)             // off — same as `ssr: false`
ssr: {
  enabled: false
} // off (object form, explicitly disabled)
ssr: {
  allowedDiscoveryRenders: 1
} // on, one discovery render, no stabilization re-renders
ssr: {
  allowedDiscoveryRenders: 0
} // on, skip discovery — earliest shell, everything streams
```

SSR is **off** unless you turn it on — omitting `ssr` resolves the same as
`ssr: false`. A boolean sets every loop default; an object overrides only the
keys you set (`enabled` defaults to `true` in the object form, so `ssr: {}` is
on). Per-point, [`.clientOnly`](mountable) forces that one point off.

### The `ssr` and `suspend` query options

```ts
// in any query options: useQuery/useInfiniteQuery, .query(), .with(), *QueryOptions defaults
ssr?: boolean // does the server execute this query during SSR
ssr: true // (default) fetch on the server
ssr: false // never executed on the server; the client fetches after hydration

suspend?: 'auto' | 'server' | 'client' | boolean // does a pending query suspend into the nearest .loading()
suspend: 'auto' // (default) blocks while the server can wait; suspends and streams only when it can't
suspend: 'server' // never blocks the response: started immediately, streamed into the same response
suspend: true // like 'server' + suspends on the client too
suspend: 'client' // suspends on the client only; never on the server (the mirror of 'server')
suspend: false // never suspends; still-pending at the final render ships the loading state
```

Details:
[The `ssr` and `suspend` query options](#the-ssr-and-suspend-query-options). The
suspense hooks (`useSuspenseQuery` / `useSuspenseInfiniteQuery`) always suspend
and take neither option.

### Prefetch policy values

`'none'` · `false` · `'onPrefetchOnly'` · `'serverQuery'` · `'clientQuery'` ·
`'serverAndClientQuery'` · `'pageDehydratedState'` ·
`'pageDehydratedStateAndClientQuery'`. Set via `.prefetchPagePolicy` (both
triggers), `.prefetchPageOnNavigate`, `.prefetchPageOnLinkHover` (optional hover
delay, default 30ms), or per `<Link>` / `navigate`. When you set none of them,
the policy is `'none'` — no prefetch. The `pageDehydratedState*` ones require
SSR. Resolution and link wiring are on [navigation](navigation); the setter gist
is in [stage-methods](stage-methods).
