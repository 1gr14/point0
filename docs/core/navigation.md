---
index: 100
title: Navigation
description: Type-safe routing, links, and programmatic navigation by point name — plus redirects and prefetch policies.
---

Navigation is one factory call. `createNavigation` reads your generated `routes`
and hands back everything the client needs to move between pages: a `<Link>`, an
imperative `navigate()`, a `<Redirect>`, the `<Router>` that renders pages, and
the location/search hooks. The first page load is server-rendered (when SSR is
on); after that, navigation between pages is client-side (SPA-style) — no full
reload. Everything is typed against your real routes — you navigate by **point
name and params**, never by hand-built URL strings.

```tsx
// src/lib/navigation.ts
import { createNavigation } from '@point0/react-dom/router'
import { navigate as browserNavigate, useBrowserLocation as hook } from 'wouter/use-browser-location'
import { routes } from '@/generated/point0/routes'
import { AppError } from '@/lib/error' // your own error class, or just the built-in ErrorPoint0

export const { navigate, Link, NavLink, Redirect, redirect, Router, RouterRoutes, useNavLink, InferNavigation } =
  createNavigation({
    routes,
    navigate: browserNavigate,
    hook,
    ErrorClass: AppError, // optional — defaults to ErrorPoint0
  })

// Embeddable link props with this app's routes baked in (see InferNavigation, below).
export type AppLinkProps = typeof InferNavigation.LinkProps
export type AppNavLinkProps = typeof InferNavigation.NavLinkProps
```

```tsx
// anywhere in a component:
<Link route="ideaView" input={{ id: idea.id }}>{idea.title}</Link>
await navigate('ideaView', { id: idea.id }) // same target, imperatively
```

You export these once and import them across the app. The rest of this page walks
each one, then the redirect mechanics, then the prefetch policy matrix.

## Setup: `createNavigation`

`routes` comes from codegen (`@/generated/point0/routes`); the `hook` is the
wouter location hook for your platform. Everything else is optional. If you omit
`routes` and never call `ClientPoints.mount(points)` first, setup throws:

```tsx
createNavigation({ navigate: browserNavigate, hook })
// throws "You should provide routes, or call ClientPoints.mount(points) before createNavigation"
```

`ErrorClass` is the error class navigation uses — it types the `error` you get
back from `navigate()` and lets `<Redirect>` carry your errors. It defaults to
the built-in `ErrorPoint0`; pass your own class (any class of the same or wider
shape) to override it. See [error handling](error-handling). Pass `hook` and
Point0 derives the imperative adapter-navigate and the search hook from it
automatically; passing `navigate: browserNavigate` as well (as the examples do) is
harmless but redundant when `hook` is `useBrowserLocation`.

Other options you reach for less often: `Page404` / `layout404` (rendered on no
match), `addHashToLocation`, `openExternal` (see [below](#leaving-the-spa)),
`scrollToHash`, `forceRerender`, and `prependRoutes` / `appendRoutes`. The full
list is in the [reference](#createnavigation-options).

## Links

`<Link>` renders an `<a>` that the router intercepts — clicking it navigates
client-side (SPA-style), no full page reload. The target is one of three mutually
exclusive forms:

```tsx
<Link route="ideaView" input={{ id: idea.id }}>Open</Link>     // by point name + typed params
<Link to={routes.ideaView({ id: 123 })}>Open</Link>           // same target, built via the routes map
<Link to="/ideas/123?tab=news">Open</Link>                    // raw internal path
<Link href="https://example.com">External</Link>              // leaves the app (plain <a>)
```

- `route` + `input` is the form you want almost always: `input` is typed to the
  route's params, and **required exactly when the route has required params** —
  omit it on `route="about"` (no params), but `route="ideaView"` forces
  `input={{ id }}`.
- `to` is a raw internal path — useful when you already have a URL string, or
  when you build one from the [`routes`](#the-points-route-pointroute) map
  (`to={routes.ideaView({ id })}`), which some people find handier than the
  point-name form.
- `href` leaves the app entirely. It renders a plain `<a href>` with no router
  interception and **no prefetch** — for cross-origin or non-app URLs.

A `<Link>` accepts all native `<a>` attributes (`className`, `target`, `rel`,
`onClick`, …) plus the `asChild` slot pattern:

```tsx
<Link route="ideaView" input={{ id }} className="text-blue-600 hover:underline">
  {idea.title}
</Link>
```

> **GOTCHA:** an unknown `route` name on a `<Link>` does **not** throw — it logs an
> error and renders `href="#"`. `navigate(...)` with an unknown name *does* throw.

### Search and hash in the target

`input` carries route params plus two special keys: `'?'` for the query string and
`'#'` for the hash. They work on both `<Link>` and `navigate`:

```tsx
navigate('ideaList', { '?': { filter, sort } })       // => /ideas?filter=…&sort=…
navigate('ideaView', { id, '#': 'comments' })          // => /ideas/123#comments
```

## Imperative navigation

`navigate(route, input?, options?)` mirrors `<Link>`. It returns a promise that
resolves once the navigation settles:

```tsx
const { location, error } = await navigate('ideaView', { id: idea.id })
// location = the new location; error = an instance of your ErrorClass, or undefined
```

The most common spot is after a mutation:

```tsx
await mutation.mutateAsync(
  { title, content },
  { onSuccess: async ({ idea }) => { await navigate('ideaView', { id: idea.id }) } },
)
```

Variants:

```tsx
await navigate.to('/ideas/123?tab=news') // raw URL instead of a point name
navigate.back()                          // window.history.back()  (no-op on server)
navigate.forward()                       // window.history.forward()
```

`navigate(...)` resolves to `{ location, error }` rather than throwing on a failed
navigation — the transition still completes and the error (logged under the
`navigation` category) is surfaced for you to inspect.

### Adapter options: replace, state

`replace` and `state` pass through to the underlying router (wouter):

```tsx
await navigate('ideaView', { id: '123' }, { replace: true }) // replace history entry, no Back trap
```

## Per-link and per-navigate options

Both `<Link>` and `navigate` take an options object for prefetch overrides,
callbacks, and tab/scroll behavior. On `navigate` it's the third argument; on
`<Link>` they're props.

```tsx
navigate('ideaView', { id }, { prefetch: 'none' })          // skip prefetch for this nav
navigate('docs', undefined, { newTab: true })               // open in a new tab
<Link route="ideaView" input={{ id }} prefetchOnHover="serverAndClientQuery">…</Link>
<Link route="ideaView" input={{ id }} prefetch="none">…</Link> // disable both triggers
```

| Option               | On `navigate` | On `<Link>` | What it does                                         |
| -------------------- | :-----------: | :---------: | ---------------------------------------------------- |
| `prefetch`           |       ✓       |      ✓      | Override the page's prefetch policy (both triggers on a Link) |
| `prefetchOnHover`    |               |      ✓      | Override only the hover-prefetch policy              |
| `prefetchOnNavigate` |               |      ✓      | Override only the click/navigate-prefetch policy     |
| `before`             |       ✓       |      ✓      | Callback run before prefetch (`(to, options) => …`)  |
| `after`              |       ✓       |      ✓      | Callback run after the navigation commits            |
| `newTab`             |       ✓       |      ✓      | Open the target in a new tab (via `openExternal`)    |
| `scrollToHash`       |       ✓       |      ✓      | Override the global scroll-to-hash policy            |

On a `<Link>`, `prefetchOnHover ?? prefetch` controls hover and
`prefetchOnNavigate ?? prefetch` controls the click. Set `prefetch="none"`
(or `false`) to turn a single link's prefetch off. `before` / `after` are
fire-and-forget — they aren't awaited.

<!-- TODO(low): the per-state detailed navigation callback (UseOnNavigateDetailedFn) exists in the types but no hook wraps it — confirm whether a public hook is intended before documenting it. -->

## Active links: `NavLink` and `useNavLink`

`<NavLink>` is `<Link>` that knows whether it points at the current location. It
sets a class based on the **match state** between the link's route and the URL:

```tsx
<NavLink
  route="ideaList"
  className="px-3 py-2"
  exactClassName="text-blue-600 font-semibold" // exact same page
  ancestorClassName="text-blue-600"            // this route is a parent of the URL
/>
```

The state comes from matching the link's route against the current **pathname**
(via `route.getRelation`); `exact` vs `same` is then split by comparing the full
href. The five states:

| State        | Meaning                                                                          |
| ------------ | -------------------------------------------------------------------------------- |
| `exact`      | the route's pathname matches **and** the full href is identical (path + search + hash) |
| `same`       | the route's pathname matches but the full href differs — a different `?search`/`#hash`, or a different param value (`/ideas/1` while the link points at `/ideas/2`) |
| `ancestor`   | this route is a parent of the current URL                                        |
| `descendant` | this route is a child of the current URL                                         |
| `unmatched`  | no relation                                                                      |

`className` also accepts a function or an object map, so you can express all
states in one place:

```tsx
<NavLink route="ideaList" className={(state) => (state.exact ? 'active' : 'idle')} />
<NavLink route="ideaList" className={{ default: 'px-3', exact: 'active', ancestor: 'active' }} />
```

For custom active UI without rendering an `<a>`, use `useNavLink` — it returns the
state plus the resolved href:

```tsx
const { exact, ancestor, tohref } = useNavLink({ route: 'ideaList' })
return <MyButton highlighted={exact || ancestor} href={tohref} />
```

## Redirects

`redirect(...)` builds a redirect — it does **nothing** by itself. You `return` or
`throw` the result, or pass it to `<Redirect>`. Same call shape as `navigate`:

```tsx
redirect('signIn')                    // by point name
redirect('ideaView', { id })          // with params
redirect.to('/login')                 // raw path
redirect('signIn', undefined, { status: 308 }) // SSR HTTP status
```

There are three ways to fire one:

**From a page component** — return `<Redirect>`. It works under SSR (it sets the
HTTP status code) and on the client:

```tsx
export const accountPage = root.lets
  .page('/account')
  .page(({ props: { me } }) => (me ? <Account me={me} /> : <Redirect route="signIn" />))
```

**From `.with`** (the auth-gate spot) — return a `redirect(...)`:

```tsx
export const redirectAuthorizedPlugin = Point0.lets
  .plugin()
  .use(mePlugin)
  .with(({ props: { me } }) => (me ? redirect('home') : { me }))
  .plugin()
```

**From a loader or `.ctx`** — `return` or `throw` it (both work):

```tsx
.loader(async ({ ctx }) => {
  if (!ctx.me) throw redirect('signIn')
  return { idea: await findIdea() }
})
```

The same `redirect(...)` value works in all three places, so an auth plugin can
gate both server loaders (in `.ctx`) and the render (in `.with`) with one
helper — see [Plugin](plugin). What happens to it depends on **where** the
redirect is produced:

- **During the initial SSR page load** — the server short-circuits the render and
  replies with a real HTTP redirect carrying the status code (`302` by default,
  or whatever you passed). The browser follows it before any of your JS runs.
- **From a mutation or query** (a point fetched by the point0 client) — there is
  no HTTP redirect. The redirect comes back to the client as a serialized
  instruction (tagged with an `X-Point0-Redirect` header), and the client
  recognizes it and performs the navigation itself — client-side, SPA-style, no
  full page reload. This is why returning a `redirect(...)` from a mutation's
  loader transparently moves the user without a round-trip-and-reload.

`<Redirect>` also takes a `task` prop directly:

```tsx
<Redirect task={someRedirectTask} />
```

Valid `status` values are `301`, `302`, `303`, `307`, `308`; anything else (or
none) falls back to `302`. Note that `redirect(...)` carries `replace`/`state`
through to the adapter, so `redirect.to('/x', { replace: true })` replaces the
history entry instead of pushing.

## Reading the location

`location` is available as a prop on every page/layout component and via hooks from
`@point0/core/navigation`:

```tsx
import { useLocation, getLocation } from '@point0/core/navigation'

const location = useLocation()
location.pathname    // "/ideas/123"
location.search      // parsed query object
location.searchString // raw "?tab=news"
location.hash        // raw "#comments"
location.route       // the matched template, e.g. "/ideas/:id"
location.params      // parsed route params
location.href        // absolute; location.hrefRel = path+search+hash
```

`useLocation()` re-renders on navigation; `getLocation()` reads it imperatively
(and throws `"Current location is not yet initialized"` if called before the
router mounts).

### Search params: `useSearch` / `setSearch`

`useSearch` returns the raw query object and a setter; pages also get `setSearch`
as a component prop:

```tsx
const [search, setSearch] = useSearch()

setSearch({ tab: 'news' })            // REPLACES the whole query → ?tab=news
setSearch({})                          // clears the query
setSearch((prev) => ({ ...prev, tab })) // updater form patches; undefined drops a key
```

`setSearch` is a soft URL update — it updates the address bar without running the
navigation pipeline (no prefetch, no loading flash) and replaces the history entry
by default. It's a no-op on the server. The object form replaces the entire query;
the updater form lets you patch it. The query object here is **raw** — it isn't
coerced by a `.search` schema.

## Reacting to navigation: `useOnNavigate`

`useOnNavigate(fn)` fires when a navigation **starts**, and the cleanup it returns
runs when that navigation settles. This is the right tool for a progress bar:

```tsx
import { useOnNavigate } from '@point0/core/navigation'
import nprogress from 'nprogress'

export const NProgress = () => {
  useOnNavigate(() => {
    const timeout = setTimeout(() => nprogress.start(), 30)
    return () => { clearTimeout(timeout); nprogress.done() }
  })
  return null
}
```

> **GOTCHA:** `useOnNavigate` skips the very first load and fires at navigation
> **start**, not when the new page is shown. For page-view analytics that must
> catch the first load, read `useLocation()` in an effect instead.

`useIsNavigating()` is the boolean built on top of it — dim the content while a
navigation is in flight:

```tsx
const isNavigating = useIsNavigating()
return <main className={isNavigating ? 'opacity-60' : ''}>{children}</main>
```

## Scroll restoration

Two stage-methods on a mountable control where the page scrolls when you navigate
to it. They're set on the point chain (page/layout), not on `createNavigation`:

```tsx
export const ideaPage = root.lets
  .page('/ideas/:id')
  // top of the page on every arrival (the default behavior, made explicit):
  .scrollPosition('top')
  // …or restore the previous scroll offset on Back/Forward:
  .scrollRestore('auto')
  .page(IdeaView)
```

- `.scrollPosition` decides the target scroll position when this point is shown —
  e.g. jump to the top, keep the current offset, or compute one from the
  location.
- `.scrollRestore` controls browser scroll restoration for this point — whether a
  remembered offset is restored on history navigation (Back/Forward) or the page
  starts fresh.

Cut from the server bundle — body and its imports removed (there's no scroll
position to restore on the server anyway, so it only runs in the browser)
(R3: client-only).

## The point's route: `point.route`

Every routable point carries a callable [route0](https://1gr14.dev/route0)
route. You usually navigate by name, but the route is there when you need a URL
string:

```tsx
ideaPage.route({ id: 123 })          // => "/ideas/123"   (relative)
ideaPage.route.abs({ id: 123 })      // => "https://app.example.com/ideas/123"
ideaPage.route.getRelation(href)     // match the current URL against this route
ideaPage.route.extend('/edit')       // a new route with a suffix appended
```

- `route(input)` (≡ `route.get(input)`) builds the relative path. `input` is
  required only if the route has required params.
- `route.abs(input)` builds the absolute URL using the route's configured origin;
  override with `{ origin: 'https://…' }` or `{ origin: false }` for relative.
- `route.getRelation(input)` parses a URL/location and returns the match relation
  (`exact` / `ancestor` / `descendant` / `unmatched`) — this is what `NavLink`
  uses under the hood.
- `route.extend(suffix)` returns a new callable route with the suffix appended.

The app-wide `routes` object (the one you feed `createNavigation`) is a map of
these callable routes, one per routable point.

## `InferNavigation`: embeddable link props

`InferNavigation` is a **type-only** export. It lets you bake your app's routes
into a component's props so any button can become a link, fully typed:

```tsx
export type AppLinkProps = typeof InferNavigation.LinkProps     // route/to/href + behavior, no <a> attrs
export type AppNavLinkProps = typeof InferNavigation.NavLinkProps
```

At runtime, split the link props off with `splitLinkProps` — this is the
production button pattern:

```tsx
import { splitLinkProps } from '@point0/react-dom/router'

type ButtonProps = MyButtonProps & AppLinkProps
function Button(props: ButtonProps) {
  const [linkProps, restProps, isLink] = splitLinkProps(props)
  const Comp = isLink ? Link : 'button'
  return <Comp {...(isLink ? linkProps : {})} {...restProps} />
}
// <Button route="ideaView" input={{ id }}>Open</Button>  → renders a <Link>
// <Button onClick={save}>Save</Button>                   → renders a <button>
```

`isLink` is true only when a target (`route` / `to` / `href`) is present — link
*options* alone don't make a component a link.

> **GOTCHA:** `InferNavigation` is `null` at runtime — only ever read it in type
> position (`typeof InferNavigation.LinkProps`), never as a value.

## Prefetch policies

Prefetch is how a page's data is loaded **before** you arrive, so navigation feels
instant. Policies are set on the point chain (root/base/page/layout) with the
[`.prefetchPage*` setters](stage-methods), and overridden per `<Link>` /
`navigate`. By default a page prefetches nothing — set a policy to opt in.

```tsx
export const root = Point0.lets
  .root()
  .prefetchPagePolicy('pageDehydratedStateAndClientQuery') // both triggers
  // or set triggers separately:
  // .prefetchPageOnNavigate('serverAndClientQuery')
  // .prefetchPageOnLinkHover('serverAndClientQuery', 200)  // 2nd arg = hover delay (ms, default 30)
  .root()
```

Strip note: `.prefetchPagePolicy` is **not cut from either bundle** — it's a plain
config value kept in both, nothing pruned (R3: server-and-client). The trigger
setters `.prefetchPageOnNavigate` and `.prefetchPageOnLinkHover` are **cut from the
server bundle — their bodies and the imports they use are removed**, so that code
never ships to the server (prefetch is driven by the browser anyway) (R3:
client-only).

A policy decides **what** gets prefetched for the target page (its related queries
and `.onPrefetchPage` callbacks). The split that matters: the `*Query` policies
**self-fetch the page's related queries WITHOUT rendering the page** — related
queries are statically discoverable, so they're prefetched cheaply (just run the
loader, cache the result). The `pageDehydratedState*` policies instead **render
the page on the server** to collect its dehydrated state — far more expensive, and
SSR-only.

| Policy                               | What it prefetches                                                                 |
| ------------------------------------ | ---------------------------------------------------------------------------------- |
| `none` / `false`                     | Nothing.                                                                           |
| `serverQuery`                        | Only related queries that have a **server** loader (`mode: 'server'`) — self-fetched, no render. |
| `clientQuery`                        | Only related queries that have a **client** loader (`mode: 'client'`) — self-fetched, no render. |
| `serverAndClientQuery`               | Whichever loader each related query has (server or client), self-fetched without a server render. The **cheap** default. |
| `pageDehydratedState`                | Renders the page **on the server** to collect its server queries' dehydrated state, then stops — no client queries. **Requires SSR.** Expensive. |
| `pageDehydratedStateAndClientQuery`  | The server render's dehydrated state **plus** client-loader queries. **Requires SSR.** The most thorough, and the most expensive. |
| `onPrefetchOnly`                     | Only the `.onPrefetchPage` callbacks — no related queries at all.                  |

The `.onPrefetchPage` callbacks of the page and its layouts run for every policy
except `none` and `pageDehydratedState`-only.

**Cost.** The `*Query` policies are cheap: `serverAndClientQuery` (and the
single-sided `serverQuery` / `clientQuery`) self-fetch the page's related queries
and cache them — **no server-side render of the page**. `pageDehydratedState*`
runs a full server-side render of the page to capture its dehydrated state and is
the expensive one; reserve it for pages where the first paint must be instant. The
`pageDehydratedState*` policies **throw** if SSR is disabled:

```tsx
// with .prefetchPagePolicy('pageDehydratedState') and SSR off:
// throws "Query client dehydrated state can be prefetched only when ssr is enabled…"
```

### `.onPrefetchPage`: prefetch side-effects

`.onPrefetchPage` is a stage-method on a page or layout. It registers a callback
that runs when the point is prefetched — the place to warm anything that isn't a
related query (an image, a non-point fetch, an analytics ping). It runs under
every policy except `none` and `pageDehydratedState`-only:

```tsx
export const ideaPage = root.lets
  .page('/ideas/:id')
  .onPrefetchPage(({ input }) => {
    void fetch(`/og/${input.id}.png`) // warm the hero image before arrival
  })
  .page(IdeaView)
```

It is intended to run on the client **and** during server-side prefetch. Today the
compiler cuts it from the server bundle — its body and the imports it uses are
removed — so it never ships to the server and effectively runs client-only for now
(R3: client-only).

<!-- TODO(high): onPrefetchPage is stripped from the server bundle (point.ts ~1056) but should also run during server prefetch — stop stripping it. -->

### Per-call overrides

The point default is overridden per link or per navigation:

```tsx
<Link route="ideaView" input={{ id }} prefetchOnHover="serverAndClientQuery">…</Link>
<Link route="heavy" input={{ id }} prefetch="none">…</Link> // opt one link out
await navigate('ideaView', { id }, { prefetch: 'serverAndClientQuery' })
```

The same policies and their server-side angle appear on the [SSR](ssr) page.

## Reference

### `createNavigation` options

All optional except the need for routes (via `routes` or a prior
`ClientPoints.mount`).

| Option              | Default                     | What                                              |
| ------------------- | --------------------------- | ------------------------------------------------- |
| `routes`            | `getClientPoints().routes`  | The generated route map                           |
| `hook`              | `useBrowserLocation`        | The router location hook (wouter)                 |
| `searchHook`        | derived from `hook`         | The search hook                                   |
| `navigate`          | derived from `hook`         | The imperative adapter-navigate fn                |
| `ErrorClass`        | `ErrorPoint0`               | Error class used for navigation errors (any [compatible class](error-handling)) |
| `Page404`           | built-in "Page Not Found"   | Component/element rendered on no match            |
| `layout404`         | —                           | Layout(s) to wrap the 404                         |
| `scrollToHash`      | `true`                      | Global scroll-to-hash policy                      |
| `addHashToLocation` | `false`                     | Include the hash in `location`                    |
| `openExternal`      | `defaultOpenExternal`       | Hook for leaving the SPA (see below)              |
| `forceRerender`     | `false`                     | Re-render routes on every location change         |
| `prependRoutes` / `appendRoutes` | —              | Extra routes injected at the tree root            |

### What `createNavigation` returns

`navigate`, `Link`, `NavLink`, `Redirect`, `redirect`, `Router`, `RouterRoutes`,
`useNavLink`, and `InferNavigation`. The location/search hooks (`useLocation`,
`getLocation`, `useSearch`, `setSearch`, `useOnNavigate`, `useIsNavigating`) import
directly from `@point0/core/navigation` — they aren't part of the returned object.

### Leaving the SPA

`openExternal` is called when the target is cross-origin or when `newTab` is set.
The default opens a new tab with `window.open(to, '_blank', 'noopener,noreferrer')`
or replaces the location for same-tab. Override it on a native shell (capacitor /
expo) to open the system browser:

```tsx
createNavigation({ routes, hook, openExternal: (to) => Browser.open({ url: to }) })
```

### Edge cases

- **Same-URL re-navigation is a no-op** — navigating to the exact current path +
  search (no hash) does nothing: no prefetch, no callbacks, no history entry. A
  hash-only change still goes through, so in-page anchors work.
- **Hash-only `to`** (`navigate.to('#section')`) resolves against the current
  pathname.
- **Concurrent navigations** — if a second navigation starts before the first
  finishes, the stale one resolves with `error: "Another navigate has been started"`.
- **`href` links don't prefetch** — they're plain `<a>` tags outside the router.

<!-- TODO(low): asChild / Slot behavior on <Link> / <NavLink> is typed but has no point0 test or example — verify runtime behavior before documenting it in depth. -->

<!-- TODO(low): the exact effect of addHashToLocation on the rendered location.hash isn't pinned by a test — confirm before stating end-to-end behavior. -->
