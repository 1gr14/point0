---
index: 500
title: Loading & error
description:
  Declare loading and error UI once on the chain; the nearest one up the chain
  renders while data is pending or after it throws.
---

A point with pending data shows a **loading** component; a point whose data
throws shows an **error** component. You declare both with `.loading` and
`.error` — usually once near the [root](root), overriding per point when you
need to. Point0 picks the nearest one up the chain, so a page never has to write
a loading branch itself.

```tsx
export const root = Point0.lets
  .root()
  .loading(() => <Spinner size="3xl" className="m-auto" />)
  .error(({ error }) => <ErrorScreen error={error} />)
  .root()
```

Every page, layout, and component below this root now has a loading and an error
screen — without repeating them. The rest of this page shows where each piece
comes from.

## The component contracts

A loading component receives only its render position; an error component also
receives the error:

```tsx
.loading(({ type }) => <Spinner />)
// type is 'page' | 'component' | 'layout' — where this loading renders

.error(({ type, error }) => <ErrorScreen error={error} />)
// error is an ErrorPoint0 (or any error class you configured), never a raw Error
```

`type` lets one component branch on where it sits — a full-page spinner for
`'page'`, an inline one for `'component'`. `error` is normalized through the
configured error class first (`ErrorPoint0.from(...)` by default), so
`error.message` is typed and you can read `error.status`, `error.code`, and the
rest. The error class is `ErrorPoint0` unless you swap it for your own — any
class with a compatible (same-or-wider) structure works. See
[Error handling](error-handling).

If you set nothing, Point0 falls back to its defaults: `Loading...` text, and a
`<pre>` dump of the error. The default error component **never renders the stack
in production** — only in dev — to avoid baking a server stack trace into the
SSR HTML.

These are **server-ssr-and-client** methods (see
[stage-methods](stage-methods)): `.loading` / `.error` and their per-variant
forms (`.pageLoading`, `.layoutError`, …) are render-side, so they always ship
to the browser bundle and run wherever the point renders. They also run on the
server, but **only when SSR is on** — under `ssr: false`, or after a
`.clientOnly()` earlier in the chain (which makes the rest of the chain behave
as `ssr: false`), their bodies are stripped from the server bundle along with
the other render methods (`.page` / `.layout` / `.with` / …). They never carry
server-only secrets, so gate auth in a [`.with`](with), not here (see
[below](#security-dont-gate-auth-with-loadingerror-alone)).

> **Strip category — server-ssr-and-client.** Applies to `.loading` and `.error`
> and every per-variant form (`.pageLoading` / `.pageError`, `.layoutLoading` /
> `.layoutError`, `.componentLoading` / `.componentError`): kept on the client
> always; on the server only when SSR is enabled.

## Where to declare them

`.loading` and `.error` live on the points that _render_ — [root](root),
[base](base), [plugin](plugin), [page](page), [layout](layout),
[component](component), and [provider](provider). They are **not** available on
a [query](query), [infinite-query](infinite-query), [mutation](mutation), or
[action](action): a data-only point has no UI, so you declare its loading and
error on whatever page, layout, or component consumes it.

```tsx
// ✅ on the page that shows the query
export const ideaPage = root.lets
  .page('/ideas/:id')
  .loading(() => <IdeaSkeleton />)
  .with(ideaQuery, ({ params }) => ({ id: Number(params.id) }))
  .page(({ data: { idea } }) => <h1>{idea.title}</h1>)

// ❌ a query has no .loading / .error — type error
export const ideaQuery = root.lets.query() /* .loading(...) */
```

A page, component, or provider has only the unified `.loading` and `.error`. A
[provider](provider) renders in the page position, so its loading and error
components receive `type: 'page'`. The [root](root), [base](base), and
[plugin](plugin) have the full set, and a [layout](layout) has six of them — see
[the matrix](#which-points-have-which) at the bottom.

## Nearest up the chain wins

When data is pending, Point0 walks up the chain and uses the nearest `.loading`;
on a thrown error, the nearest `.error`. Declare once high, override low:

```tsx
export const root = Point0.lets
  .root()
  .loading(() => <Spinner />) // the default for everything below
  .error(({ error }) => <ErrorScreen error={error} />)
  .root()

export const ideaPage = root.lets
  .page('/ideas/:id')
  .loading(() => <IdeaSkeleton />) // overrides the root spinner for this page
  .with(ideaQuery, ({ params }) => ({ id: Number(params.id) }))
  .page(/* ... */)
```

Loading and error resolve **independently**: a page can override `.loading` and
still inherit the root's `.error`, or the other way round.

A [plugin](plugin) can carry its own `.loading` / `.error`; when you `.use` it
on a point, its declarations join the chain at that position and override what
came before — handy for shipping a loading/error theme as a plugin.

## Where to put `.loading` in the chain

Inside one point, the placement of `.loading` relative to a `.with(query)` is
relaxed. Wiring a query in with `.with(query)` doesn't suspend on its own —
every query on the chain starts fetching in **parallel**, and the point only
blocks on that pending data right before it renders (`.page` / `.layout` /
`.component`). So `.loading` works whether it sits before or after the `.with`:

```tsx
export const ideaPage = root.lets
  .page('/ideas/:id')
  .with(ideaQuery, ({ params }) => ({ id: Number(params.id) }))
  .loading(() => <IdeaSkeleton />) // applies — render is what blocks, not .with
  .page(/* ... */)
```

Order _does_ matter when a `.with` callback itself decides to show loading or
throw — there the rule is sequential. A `.with` that returns `'loading'` or an
error (see [below](#driving-loading-and-error-by-hand-from-with)) renders the
nearest `.loading` / `.error` declared **above** it; one declared lower in the
chain wasn't in scope yet:

```tsx
export const ideaPage = root.lets
  .page('/ideas/:id')
  .loading(() => <IdeaSkeleton />) // ✅ in scope for the .with below
  .with(() => (useSomethingReady() ? undefined : 'loading'))
  .page(/* ... */)
```

Chain position is what counts, not where the data was declared: a page's
`.loading` placed before such a `.with` overrides the loading even for a query
inherited from a [base](base) upstream.

## Per-variant declarations

On the [root](root), [base](base), [plugin](plugin), or a [layout](layout) — the
points that span more than one render variant — you can target a single variant.
A layout, for example, renders its own UI _and_ hosts a page below it, so it can
set loading for each independently:

```tsx
export const ideasLayout = root.lets
  .layout('/ideas')
  .layoutLoading(() => <LayoutSkeleton />) // while the layout's own loader runs
  .pageLoading(() => <PageSkeleton />) // while a page below it loads
  .layoutError(({ error }) => <LayoutError error={error} />)
  .pageError(({ error }) => <PageError error={error} />)
  .layout(/* ... */)
```

The full set, per render position:

- `.pageLoading` / `.pageError` — for a page rendered below this point.
- `.layoutLoading` / `.layoutError` — for this point's own layout render.
- `.componentLoading` / `.componentError` — for a component rendered below.

Every variant above is **server-ssr-and-client**, same as the collapsing
`.loading` / `.error`: always on the client, on the server only under SSR.

The plain `.loading` / `.error` are the **collapsing aliases**: on these
multi-variant points they set page, layout, and component at once. For the
active variant, a unified `.loading` wins over the variant-specific one — when
you declare both on the same point, the unified one is resolved first. A layout
has the page and layout variants only — it can't host arbitrary components in
this surface, so it has no `.componentLoading` / `.componentError`.

## SSR hides the first-paint loading — for server data

With SSR on, the server runs each point's loaders, renders the resolved HTML,
and ships the query cache alongside it as a **dehydrated React Query state**
(the same `dehydrate`/`hydrate` mechanism you'd use with TanStack Query by hand
— not loader data hand-inlined into the markup). The browser hydrates that
snapshot, so every server-loaded query is already `success` on first paint and
its loading component never appears:

```tsx
// page + component both use a server .loader →
// the SSR HTML shows the real content, and the dehydrated cache
// hydrates so no query re-fetches or flashes "Loading..."
```

The catch: this only holds for data the server actually has in that snapshot. A
[`.clientLoader`](loader) runs in the browser, so the server has nothing to
dehydrate for it — its loading component **does** show in the SSR HTML and
resolves once the client takes over. See [SSR](ssr).

## Prefetch decides loading on navigation

On client navigation, whether the loading component flashes depends on the
[prefetch policy](navigation). With no prefetch, the destination's data starts
loading after the click, so its `.loading` shows:

```tsx
// prefetchPagePolicy 'none' / false → loading shows on every navigation
```

Prefetch the page before the transition — on hover, or eagerly — and the data is
already in cache when the route commits, so no loading appears:

```tsx
export const ideaPage = root.lets
  .page('/ideas/:id')
  .prefetchPageOnLinkHover('serverAndClientQuery') // fetch on hover → no flash
  .with(ideaQuery, ({ params }) => ({ id: Number(params.id) }))
  .page(/* ... */)
```

`serverAndClientQuery` is the cheap policy (fetch the data, no SSR render);
`pageDehydratedStateAndClientQuery` does a full server render and is heavier.
The policies and `.prefetchPageOnNavigate` / `.prefetchPageOnLinkHover` are
covered on [Navigation](navigation) and [SSR](ssr).

## A top progress bar (NProgress)

`.loading` covers a point that has no data yet. For the _transition itself_ —
the gap between click and the next page committing — drive a top bar from the
navigation hook. Mount this once in your client app:

```tsx
import { useOnNavigate } from '@point0/core/navigation'
import nprogress from 'nprogress'

export const NProgress = () => {
  useOnNavigate(() => {
    // runs when a navigation starts
    const timeout = setTimeout(() => nprogress.start(), 30)
    // the returned cleanup runs when the navigation ends
    return () => {
      clearTimeout(timeout)
      nprogress.done()
    }
  })
  return null
}
```

The 30 ms timeout keeps the bar from flashing on instant transitions — a
convention, not a framework rule. `useOnNavigate(fn)` runs `fn` at the start of
a navigation and its returned cleanup at the end. Related: `useIsNavigating()`
returns a boolean you can use to dim the page during a transition (the basic
example does this), and `useNavigationPageState()` exposes the `status` /
`loading` / `error` of the current transition. All ship from
`@point0/core/navigation` — see [Navigation](navigation).

## Driving loading and error by hand from `.with`

When data isn't a plain query — you compute readiness from a hook, say — return
the reserved values from a [`.with`](with) function to render the same
components:

```tsx
.with(() => {
  const ready = useSomethingReady()
  if (!ready) return 'loading' // → renders the active loading component
  if (broke) return new ErrorPoint0('Failed', { status: 500 }) // → error component
})
```

`.with` also hands you `LoadingComponent` and `ErrorComponent` as props, so you
can render them directly — `return <LoadingComponent />`. The full set of
reserved returns is on [`.with`](with).

## Security: don't gate auth with loading/error alone

A loading or error screen is UI — it doesn't keep data off the client. The
browser bundle is public (after the initial SSR render, navigation is
client-side, SPA-style), so the page body ships to the browser; only server-only
code — `.ctx`, server `.loader` bodies — is stripped at compile time. Gate
access in a [`.with`](with) by returning an error, not by hiding content behind
a loading state:

```tsx
import { authPlugin } from '@/lib/auth' // puts the user in props.me
import { ErrorPoint0 } from '@point0/core'

export const adminPage = root.lets
  .page('/admin')
  .use(authPlugin)
  .with(({ props: { me } }) => {
    if (!me?.isAdmin) return new ErrorPoint0('Forbidden', { code: 'FORBIDDEN' })
    return { me }
  })
  .page(/* ... */)
```

The returned error short-circuits to the error component. Because it carries a
`status`, it also sets the HTTP status during SSR. Don't use `.ctx` for this — a
`.ctx` gate runs only when the point has a loader, so a loader-less page never
fires it. See [`.with`](with).

## Reference

### Which points have which

| Method                                  | root / base / plugin | page / component / provider | layout |
| --------------------------------------- | :------------------: | :-------------------------: | :----: |
| `.loading` / `.error`                   |          ✅          |             ✅              |   ✅   |
| `.pageLoading` / `.pageError`           |          ✅          |              —              |   ✅   |
| `.layoutLoading` / `.layoutError`       |          ✅          |              —              |   ✅   |
| `.componentLoading` / `.componentError` |          ✅          |              —              |   —    |

[query](query), [infinite-query](infinite-query), [mutation](mutation), and
[action](action) expose none of these. So does a finalized (ready) point —
declare loading and error during the build phase, before the point is closed.

### The component props

| Component | Props received    | Notes                                                        |
| --------- | ----------------- | ------------------------------------------------------------ |
| loading   | `{ type }`        | `type` is `'page' \| 'component' \| 'layout'`                |
| error     | `{ type, error }` | `error` is an `ErrorPoint0` (or your configured error class) |

### Resolution rules

- **Nearest up the chain.** Pending data → nearest `.loading`; thrown data →
  nearest `.error`. Loading and error resolve independently.
- **Position matters.** `.loading` / `.error` apply only to data methods
  declared _after_ them — declare them before the suspending `.loader` /
  `.with`.
- **Unified beats variant.** For the active render variant, a plain `.loading` /
  `.error` wins over the variant-specific setter, which wins over the built-in
  default.
- **Plugins override.** A `.use`d plugin's `.loading` / `.error` joins the chain
  at the `.use` position and overrides what came before.
- **SSR hides loading** for server-available data only; a `.clientLoader`'s
  loading still renders in the SSR HTML.
- **Prefetch hides loading** on navigation when the data is fetched before the
  route commits (`serverAndClientQuery`, `pageDehydratedStateAndClientQuery`,
  the on-hover variants); `'none'` / `false` shows it.
- **Errors with `.redirect`** render a redirect instead of the error component.
- **The error sets the HTTP status** (`error.status`) during SSR; off-server
  it's a no-op.
- **Strip category — server-ssr-and-client.** `.loading` / `.error` and all
  their per-variant forms ship to the client always and to the server only when
  SSR is on (stripped under `ssr: false` or after `.clientOnly()`).

## `.error` vs a React error boundary

`.error` is a **data** error path, not a render error boundary. It fires when a
loader or query resolves to an error state, or when a [`.with`](with) returns an
error — Point0 surfaces that as the point's error status and renders the nearest
`.error` in its place. It does **not** catch a throw from your own render: a
component body that throws, or a [`.mapper`](mapper) that throws, is a
render-phase error, and Point0 ships no React error boundary around your tree.
An uncaught render throw bubbles to whatever boundary your app mounts (and fails
the SSR render). So keep render code total and signal errors from the data phase
— return an error from a [`.with`](with), and `.error` handles it.
