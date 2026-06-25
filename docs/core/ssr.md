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

That single line is the whole setup. The rest of this page explains the loop,
the tuning options, and the prefetch policies that decide how much work each
navigation does.

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

And if you don't want to pay it, you don't have to. The re-renders are a
convenience, not a tax: tell Point0 up front what a page needs — with
[`.onPrefetchPage`](#onprefetchpage) or `prefetchBeforePageRender` (both below)
— and the first render already has the data, so the loop settles in a single
pass. So there are two comfortable modes: **convenient but with re-renders**
(write nothing, let the loop discover), or **a little extra work and zero
re-renders** (declare the data once). Pick per page.

Two things the loop deliberately does **not** do:

- **Client loaders don't run on the server.** A `.clientLoader()` query stays
  pending through SSR and renders its loading state — the data arrives after
  hydration. Only server queries are fetched during SSR.
- **Disabled queries are skipped.** A query with `enabled: false` is never
  prefetched, which is exactly how a dependent query waits for its input.

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

The HTML ships **whole**. Point0 waits for the entire React tree
(`stream.allReady`) before it sends a byte — there's no progressive,
Suspense-boundary streaming and no out-of-order chunks. That's the intent: if
you turned SSR on, you asked for the finished page in the first response, and
streaming a half-built page full of spinners would undo that. When you _do_ want
a slow part to load in pieces, reach for the explicit tools instead — turn SSR
off so the whole page fetches on the client (`ssr: false`), or mark just that
part client-only with `.clientOnly()` / `<ClientOnly>`
([below](#turning-ssr-off)), so SSR ships its fallback and the real content
mounts after hydration. React Server Components aren't supported either — not a
current goal. Point0's render-to-discover SSR already fetches on the server and
strips server-only code from the client bundle; we don't see much additional
value in RSC on top of that. If you do have a concrete picture of what RSC would
unlock here — why you need it and who it would help — we're open to the likely
first step: letting a `.loader()` return React elements directly. Spell out that
motivation in a [GitHub issue](https://github.com/1gr14/point0) — who it helps
and why the current model isn't enough.

When the server render throws (anything that isn't a [redirect](navigation)),
the engine falls back to serving the bare `index.html` with the error attached —
the page still loads as an SPA instead of 500-ing.

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
no server render to keep them around for; they stay in the client build. (Of the
four strip categories, only this one tracks the SSR flag: server-only and
client-only code is cut the same way with SSR on or off, and server-and-client
code is never stripped.)

You can also opt **one point** out while SSR is globally on, with
[`.clientOnly`](mountable) — it forces that point to client-only render and
shows an optional fallback during SSR:

```tsx
export const ChartPage = root.lets
  .page('/chart')
  .clientOnly(() => <Skeleton />) // SSR renders the fallback; the real chart mounts on the client
  .page(/* a component that only works in the browser */)
```

The fallback is optional — call `.clientOnly()` with no argument and SSR renders
nothing for the point (an empty placeholder) until it mounts on the client:

```tsx
export const ChartPage = root.lets
  .page('/chart')
  .clientOnly() // no fallback; the slot is empty during SSR, filled after hydration
  .page(/* a browser-only chart */)
```

`.clientOnly()` makes the rest of the point's chain client-only — exactly as if
`ssr: false` applied to this one point. It targets one of the four strip
categories: the **server-ssr-and-client** render methods. After `.clientOnly()`
(or globally, with `ssr: false`) those are **cut from the server bundle** —
their bodies and the imports they use are removed from the server build, kept in
the client build always and in the server build only when SSR is on. So a
browser-only library you reach for in them never lands in the server build, and
never executes during SSR. The full set: `.page` / `.layout` / `.component` /
`.provider`; `.loading` (and `.pageLoading` / `.layoutLoading` /
`.componentLoading`); `.error` (and `.pageError` / `.layoutError` /
`.componentError`); `.wrapper`; `.with`; `.mapper`; `.head`.

The other three categories are unaffected by `.clientOnly()` / `ssr: false`.
**server-only** methods before it (`.ctx`, a server `.loader`, `.input`, …) stay
cut from the client bundle either way — their bodies and imports never ship to
the browser (they run on the server as usual); **client-only** methods
(`.clientLoader`, `.onPrefetchPage`, …) stay cut from the server bundle — body
and imports removed regardless of SSR; and **server-and-client** methods
(closers like `.query`, the `*QueryOptions` setters, `.relatedQuery`, …) are cut
from neither bundle — kept in both (isomorphic). `.clientOnly()` only
client-restricts what _renders_, not what loads.

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

Two things make this hook pull its weight:

- **It runs on both sides.** The same `.onPrefetchPage` runs on the server
  (during SSR) and on the client (when you navigate to the page). You write the
  prefetch once and it covers the first load and every client-side navigation.
- **On the client it doesn't cost an HTTP round-trip just to "be on the
  client".** A `prefetchQuery`/`fetchQuery` on a point's loader goes over the
  network on the client only because the loader is server code; that's expected.
  But there's no duplicate hop on the server — during SSR the same call resolves
  **in-process through `engine.fetch()`**, not by Point0 making an HTTP request
  back to itself. The point's `fetch` is wired straight into the engine.

Warming the queries this way is what removes the data-discovery passes. A
separate source of re-renders is store/cookie stabilization, which you cap
independently with `allowedRerendersCount` (below) — set it to `0` to also stop
those.

Pass an object instead of a boolean to tune the re-render loop. The object form
is **SSR on** unless you set `enabled: false`:

```ts
export const engine = Engine.create({
  ssr: {
    // best case: prefetch up front so the first render already has the data
    prefetchBeforePageRender: true,
    allowedRerendersCount: 0,
  },
})
```

### prefetchBeforePageRender

By default the loop _discovers_ queries by rendering. With
`prefetchBeforePageRender: true`, Point0 first prefetches the page and its
layouts declaratively — running their [`.onPrefetchPage`](#onprefetchpage) hooks
and server queries, with inputs derived from the route — **before** the first
render. The render then finds the data already in cache and needs fewer, often
zero, extra passes. The discover loop still runs as a fallback for queries whose
inputs are only known at render time.

```tsx
// a page with a layout loader + a page loader:
//   default                          → 3 renders (initial, layout, page)
//   prefetchBeforePageRender: true   → 1 render
```

Default `false`.

### allowedRerendersCount (soft cap)

A budget on the SsrStore/cookie **stabilization** re-renders. Once this many of
those passes happen, the loop **stops quietly** — no error, it just uses the
last render. Default `Infinity` (re-render until stable). Set it to `0` or `1`
to opt out of the stabilization re-renders that an [SsrStore](ssr-store) or
cookie write would otherwise trigger:

```ts
ssr: {
  allowedRerendersCount: 0
} // never re-render just to settle a store/cookie
```

When the soft cap is hit, any staged `SsrStore` change from the last render is
**left uncommitted** — the HTML and the transferred store value stay consistent.

### forbiddenRerendersCount (hard cap)

A safety net. Reaching it stops the loop **and logs a server error**. It catches
non-deterministic values — `Date.now()`, `Math.random()` in a store or cookie —
that never stabilize and would otherwise re-render forever. Default `25`.

```
// after 25 passes, logged at level 'error', category ['ssr']:
// "SSR stores/cookies did not stabilize after 25 re-renders (forbiddenRerendersCount);
//  using the last render. Check for non-deterministic SsrStore or cookie values..."
```

If both caps are set, the hard cap is checked first.

> **Dev only:** a server render sets an `X-Point0-Renders-Count` response header
> with the final pass count, so you can eyeball how many re-renders a page took
> straight from the network tab. It's not set in production.
>
> For anything beyond eyeballing, read the count in code:
> [`request.renders`](request) holds the pass count for the current request, in
> dev **and** production. From a [middleware](middleware) you can log it, alert
> on pages that re-render too much, or feed it into metrics — it's a real number
> on every request, not just a debug header.

## Prefetch policies

The loop above is the _first_ load. Once the SPA is running, **navigations** no
longer ask the server for HTML — instead Point0 prefetches the next page's data
before it swaps the view, so the page appears already filled in. The **policy**
decides what "prefetch its data" means, and the policies differ in one key way:
**whether the prefetch renders the page on the server or not.**

That distinction is where the old framing goes wrong, so be precise about it:

- With **`pageDehydratedStateAndClientQuery`** (and `pageDehydratedState`) the
  server _does_ render the page — in memory, to discover and resolve its
  queries. It just doesn't send back HTML; it sends back the **dehydrated query
  cache**, which the client drops into its own cache. A real server render
  happens, it's the most thorough policy, and it's the most expensive one.
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
single-pass. Add `allowedRerendersCount: 0` if you also want to forbid
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
`.loading()` components show until the data arrives. The simplest model, and
perfectly fine when a brief loading state is acceptable.

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

`serverAndClientQuery` renders nothing, so it can only see queries declared on
the points themselves (`.loader`, `.with` on the page/layout). A query declared
_inside_ a component isn't discovered — it shows its loading state after
navigation. Cheap to run, looser coverage; close the gap with `.onPrefetchPage`.

```tsx
// EXPENSIVE: full in-memory SSR render of the target page, just to collect its cache.
.prefetchPageOnNavigate('pageDehydratedStateAndClientQuery')
```

`pageDehydratedState*` asks the server to **render the page in memory** and
return only its dehydrated query cache (the page's HTML is thrown away). It runs
the same render-to-discover loop, so it finds _every_ query, including the ones
inside components — best coverage, no per-page work, but you pay a full server
render per prefetch.

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
callback that runs during prefetch (and during `prefetchBeforePageRender`),
where you can warm up data the policy wouldn't otherwise discover. It's on
[base](base), [page](page), [layout](layout), and [plugin](plugin); calls
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

It receives `{ location, props }`. It runs **only via prefetch** — never in the
normal render-to-discover loop, never for the `'none'` policy, and never for the
server-only `'pageDehydratedState'` policy (which returns right after the
in-memory render, before the hooks fire; `pageDehydratedStateAndClientQuery`
still runs them). As shown in [Tuning the loop](#tuning-the-loop), it runs on
**both sides**: on the server during SSR (and `prefetchBeforePageRender`) and on
the client when you navigate to the page — so the same warm-up code covers the
first load and every navigation.

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
  satisfy the navigation that follows (and repeat hovers), instead of asking the
  server to re-render the page again and again.

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
  allowedRerendersCount?: number // soft cap; default Infinity
  forbiddenRerendersCount?: number // hard cap (+ logs an error); default 25
  prefetchBeforePageRender?: boolean // prefetch before first render; default false
}

// engine config accepts: boolean | SsrOptions
ssr: true // on, all loop defaults
ssr: false // off — bare index.html, client-side fetch
// (omitting `ssr` entirely)             // off — same as `ssr: false`
ssr: {
  enabled: false
} // off (object form, explicitly disabled)
ssr: {
  allowedRerendersCount: 0
} // on, no stabilization re-renders
```

SSR is **off** unless you turn it on — omitting `ssr` resolves the same as
`ssr: false`. Turn it on with `ssr: true` or an object (the `enabled: true`
default applies only to the object form: `ssr: {}` is on). A boolean turns SSR
on or off with every loop default; an object overrides only the keys you set,
keeping the default for anything left out. Per-point, [`.clientOnly`](mountable)
forces that one point off.

### Prefetch policy values

`'none'` · `false` · `'onPrefetchOnly'` · `'serverQuery'` · `'clientQuery'` ·
`'serverAndClientQuery'` · `'pageDehydratedState'` ·
`'pageDehydratedStateAndClientQuery'`. Set via `.prefetchPagePolicy` (both
triggers), `.prefetchPageOnNavigate`, `.prefetchPageOnLinkHover` (optional hover
delay, default 30ms), or per `<Link>` / `navigate`. When you set none of them,
the policy is `'none'` — no prefetch. The `pageDehydratedState*` ones require
SSR. Resolution and link wiring are on [navigation](navigation); the setter gist
is in [stage-methods](stage-methods).
