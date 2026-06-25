---
index: 200
title: Layout
description:
  A shared shell around pages — its own route, data, loading, and error, that
  pages inherit and read from.
---

A layout is a point that wraps a set of pages in a shared shell — a header, a
sidebar, a frame. It can own part of the route those pages sit under, load its
own data with its own loading and error states, and hand that data down to the
pages inside it. When you navigate between pages in the same layout, the layout
stays mounted: it does not re-render and its data is not re-fetched.

```tsx
import { root } from '@/lib/root'
import { NavLink } from '@/lib/navigation'

export const generalLayout = root.lets.layout(({ children }) => (
  <div className="app">
    <header>
      <NavLink route="home">Home</NavLink>
      <NavLink route="ideaList">Browse Ideas</NavLink>
    </header>
    <main>{children}</main>
  </div>
))
```

Every page built off `generalLayout` now renders inside that shell, in place of
`{children}`. The rest of this page shows where each piece comes from.

## Declaring a layout

A layout is opened off a parent — the [root](root), a [base](base), or another
layout — and closed with `.layout(component)`:

```tsx
export const generalLayout = root.lets.layout(({ children }) => (
  <div className="app">{children}</div>
))
```

`.layout` is **server-ssr-and-client**: cut from the SERVER bundle when
`ssr: false` (or after a `.clientOnly()` earlier in the chain) — body and
imports removed from the server build; kept in the client build always, and in
the server build only when SSR is on.

The name comes from the variable — see [points](points) for the `.lets`
notation.

The component argument is **optional**. Omit it and the layout renders just its
children (`({ children }) => children`) — still useful for prefixing a route,
loading shared data, or acting as a [provider](provider) without any visible
shell:

```tsx
export const dataLayout = root.lets.layout('/app').layout()
// no shell, but it owns /app and can carry loaders/queries for its pages
```

## Owning part of the route

Pass a route to the layout and the pages inside it inherit it as a prefix. A
layout that owns `/ideas/:id` with a page at `/` resolves the page to
`/ideas/:id`:

```tsx
export const ideaLayout = generalLayout.lets
  .layout('/ideas/:id')
  .layout(/* ... */)

export const ideaViewPage = ideaLayout.lets
  .page('/') // final route: /ideas/:id
  .page(/* ... */)
```

The route argument is optional. Omit it and the layout keeps its parent's route
(or `/` if there's none) — that's the case for `generalLayout` above, a shell
with no route of its own.

A layout's route **can't contain a wildcard**:

```tsx
root.lets.layout('/files/*') // throws: Wildcard is not allowed in layout point
```

You never need one. A layout doesn't try to match a span of URLs — the pages
decide which layout they belong to by building off it (or attaching it with
`.layout(...)`), and a page is free to carry its own wildcard. The layout just
contributes its optional route prefix to those pages; matching the actual URL is
the page's job.

## Getting data into a layout

A layout loads data the same way a [page](page) does — with its own
[`.loader`](loader) or by injecting a [query](query) with [`.with`](with). The
layout component receives that data in `data`:

```tsx
export const ideaLayout = generalLayout.lets
  .layout('/ideas/:id')
  .with(ideaQuery, ({ params: { id } }) => ({ id: Number(id) }))
  .layout(({ children, data: { idea } }) => (
    <div>
      <h2>{idea.title}</h2>
      {children}
    </div>
  ))
```

Strip categories here: [`.loader`](loader) is **server-only** — cut from the
client bundle: its body and the imports it uses are removed, so it never ships
to the browser (it runs on the server). [`.with`](with) is
**server-ssr-and-client** — cut from the server bundle when `ssr: false` (or
after a `.clientOnly()`); kept in the client build always, and in the server
build only when SSR is on. Either way it ships to the browser, so put secrets in
the loader/`.ctx`, not in a `.with` mapper. A layout that closes with a loader
is also a query, and that self-query is **finite by default**; close with
[`.infiniteQuery`](infinite-query) after the loader to make it infinite instead.

A layout owns its loading and error states, gating its whole subtree:

- While the layout's data loads, the nearest [loading](loading-error) component
  up the chain renders in place of the layout — the pages inside don't render
  yet.
- If the layout's loader throws, the nearest [error](loading-error) component
  replaces the whole subtree, and the page inside is never rendered.

Because of this gate, by the time a page inside the layout renders, the layout's
data is guaranteed to be loaded. That's what makes reading it from the page safe
(next section).

You can target the layout's own states specifically with `.layoutLoading(...)`
and `.layoutError(...)`, leaving the generic `.loading` / `.error` for
everything else. See [Loading & error](loading-error).

## A layout is also a provider

A layout publishes its loaded `data` to the pages beneath it, like a
[provider](provider). The page reads it — no prop drilling, no re-fetch.

```tsx
export const ideaViewPage = ideaLayout.lets
  .page('/')
  // read the idea straight from the layout, like from a provider
  .with(() => ({ idea: ideaLayout.useValue('idea') }))
  .head(({ props: { idea } }) => idea.title)
  .page(({ props: { idea } }) => <h1>{idea.title}</h1>)
```

`.useValue()` is a React hook for use inside the layout's subtree:

```tsx
ideaLayout.useValue() // => the whole data object
ideaLayout.useValue('idea') // => one key
ideaLayout.useValue(['idea', 'author']) // => a picked object
```

The page does **not** inherit the layout's queries or loaders — it reads the
already-loaded value through the provider. Calling `.useValue()` outside a
mounted, loaded layout throws (`useValue must be used within a Provider`); but
because the layout gates its subtree, a page inside it is always past that
point.

Outside React, read the value imperatively:

```tsx
ideaLayout.getValue() // => data; throws if not yet loaded
ideaLayout.getValueOrUndefined() // => data | undefined; never throws
```

`getValue` throws if the value isn't set yet, so call it only from code that
runs after the layout has mounted and loaded; `getValueOrUndefined` is the safe
variant when you can't guarantee that.

## Nesting layouts

A layout can be built off another layout. The child inherits the parent's route
prefix and shell — the parent wraps the child, which wraps the page:

```tsx
export const generalLayout = root.lets.layout(/* ... */)

export const ideaLayout = generalLayout.lets
  .layout('/ideas/:id') // route extends the parent's
  .layout(/* ... */)

export const ideaViewPage = ideaLayout.lets.page('/').page(/* ... */)
// rendered as: generalLayout > ideaLayout > ideaViewPage, route /ideas/:id
```

You can also attach a layout to a page from the page's own code, instead of
building the page off the layout:

```tsx
export const homePage = root.lets
  .page('/home')
  .layout(generalLayout)
  .page(/* ... */)
```

When a page declares a layout this way, the layout's route params must be
compatible with the page's, or you get a compile error
(`Layout params not compatible to current page params`).

## No re-render between sibling pages

Navigating between two pages in the same layout keeps the layout mounted — only
the inner page swaps. The layout doesn't re-render, and its loader or query is
not re-run.

```tsx
// /ideas/1  (info)  ->  /ideas/1  (news)
//   generalLayout — stays mounted
//     ideaLayout  — stays mounted, `idea` not re-fetched
//       <page>    — this is the only part that swaps
```

This is why a layout is the right place for a shell, a nav bar, or shared data
that several pages read: it loads once and survives navigation within its
subtree.

## Gating a layout's subtree

A layout is a natural place to enforce access for every page beneath it. The
layout's loader body, `.ctx`, secrets, and DB calls are cut from the client
bundle by the compiler — body and the imports they pull in are removed, so they
never reach the browser — but the shell you render is shipped to the browser, so
put the gate in the data flow, not in the markup:

- Gate with a [`.with`](with) wrapper (or a [plugin](plugin)), not by relying on
  `.ctx` alone. A layout's `.ctx` runs **only when the layout has a loader** — a
  loader-less layout makes no server request, so its `.ctx` never runs.

[`.ctx`](ctx) is **server-only** — cut from the client bundle: its body and
imports are removed, so it never reaches the browser. [`.use`](plugin) and
[`.with`](with) are **server-and-client** — not cut from either bundle, kept in
both (isomorphic): a plugin or wrapper ships to both bundles, so the gate must
do its real check in code that the loader runs, not in markup that reaches the
browser.

```tsx
import { authPlugin } from '@/lib/auth' // a plugin that resolves the user into props.me
import { ErrorPoint0 } from '@point0/core'

export const adminLayout = root.lets
  .layout('/admin')
  .use(authPlugin)
  .with(({ props: { me } }) => {
    if (!me?.isAdmin) return new ErrorPoint0('Forbidden', { code: 'FORBIDDEN' })
    return { me }
  })
  .layout(({ children, props: { me } }) => (
    <div>
      <span>{me.name}</span>
      {children}
    </div>
  ))
```

`me` has to come from somewhere — here a [plugin](plugin) puts it in `props`
first. Returning an error from `.with` short-circuits to the error component:
`ErrorPoint0` is the built-in error class, but you can use your own — see
[error handling](error-handling). The gate now covers every page under the
layout.

## Reference

### Component props

The layout component receives one object:

| Prop               | Type                                          | When                                                     |
| ------------------ | --------------------------------------------- | -------------------------------------------------------- |
| `children`         | the page (or nested layout) to render inside  | always — render it to mount the subtree                  |
| `data`             | mapper output, or the layout's loaded data    | always (`{}` if none)                                    |
| `queries`          | tuple of injected query results               | always (`[]` if none)                                    |
| `props`            | props contributed by `.with` wrappers         | always (`{}` if none)                                    |
| `params`           | parsed route params                           | when the route has params / `.params`                    |
| `search`           | parsed query string                           | when `.search` is set                                    |
| `setSearch`        | update the URL query (replace / patch / drop) | always (client-only; SSR no-op)                          |
| `location`         | the current location (`location.params`, …)   | always (a layout's location may be an ancestor location) |
| `LoadingComponent` | the resolved loading component                | always                                                   |
| `ErrorComponent`   | the resolved error component (`{ error }`)    | always                                                   |

A layout's `location` can be an ancestor location, not just the exact current
route — unlike a page, whose location always matches the page's route exactly.

### Provider accessors (after `.layout()` closes it)

Available once the layout carries a server loader or a suitable query:

| Accessor                      | Returns                                                                           |
| ----------------------------- | --------------------------------------------------------------------------------- |
| `useValue(keys?)`             | data (React hook); `keys` picks a subset; throws outside a mounted, loaded layout |
| `getValue(input?)`            | data; throws if not yet set                                                       |
| `getValueOrUndefined(input?)` | data \| undefined; never throws                                                   |

The closed layout point also exposes `.route` (a callable [route0](navigation)
route), `.Layout` / `.X` (the bound component), `.Infer`, and `.lets` to keep
building child points.

### Methods that apply to a layout

Data & context: [`.loader`](loader), `.clientLoader`, [`.ctx`](ctx),
[`.with`](with), [`.mapper`](mapper), [`.query`](query) /
[`.infiniteQuery`](infinite-query), [`.relatedQuery`](query),
[`.params` / `.search`](validation), `.headers`, `.cookies`.

UI: [`.head`](head), [`.loading`](loading-error), [`.error`](loading-error),
`.layoutLoading`, `.layoutError`, [`.wrapper`](mountable). `.wrapper` wraps even
the loading and error states (it renders outside the data gate).

Shared: [`.use`](plugin) (plugins), [`.middleware`](middleware), `.on` /
`.serverOn` / `.clientOn` (events), `.tag`, `.description`,
[`.queryOptions`](stage-methods) / `.layoutQueryOptions`.

A layout also exposes the page-level defaults `.pageError`, `.pageLoading`,
`.pageQueryOptions`, `.pageDehydratedStateQueryOptions` and the prefetch family
(`.prefetchPageOnNavigate`, `.prefetchPageOnLinkHover`, `.prefetchPagePolicy`,
`.onPrefetchPage`). Like a [base](base), a layout broadcasts these to its
subtree: each becomes the default for every page built under it (a page's own
setting still wins). The scroll defaults (`.scrollPosition` / `.scrollRestore`)
broadcast the same way. See [Navigation](navigation) and [SSR](ssr) for the
prefetch policies.

Where each of these runs (strip categories):

- **server-only** — cut from the client bundle: body and the imports it uses are
  removed, so it never ships to the browser (it runs on the server):
  [`.loader`](loader), [`.ctx`](ctx), `.headers`, `.cookies`,
  [`.middleware`](middleware), `.serverOn`, `.description`. `.params` /
  `.search` are isomorphic on a layout (server-and-client) — they're server-only
  only on an action.
- **client-only** — cut from the server bundle: body and its imports removed (it
  runs only in the browser): `.clientLoader`, `.clientOn`,
  `.prefetchPageOnNavigate`, `.prefetchPageOnLinkHover`, `.prefetchPagePolicy`.
- **server-and-client** — not cut from either bundle, kept in both (isomorphic):
  the `.layout` closer's query closers [`.query`](query) /
  [`.infiniteQuery`](infinite-query) / [`.relatedQuery`](query),
  `.onPrefetchPage` (it runs on the client and during server-side prefetch),
  [`.use`](plugin), [`.params` / `.search`](validation), `.tag`, `.on`, and the
  option setters [`.queryOptions`](stage-methods) / `.layoutQueryOptions` /
  `.pageQueryOptions` / `.pageDehydratedStateQueryOptions`.
- **server-ssr-and-client** — cut from the SERVER bundle when `ssr: false` (or
  after a `.clientOnly()`): body and imports removed from the server build; kept
  in the client build always, and in the server build only when SSR is on: the
  [`.layout`](mountable) component, [`.head`](head), [`.loading`](loading-error)
  / `.layoutLoading` / `.pageLoading`, [`.error`](loading-error) /
  `.layoutError` / `.pageError`, [`.wrapper`](mountable), [`.with`](with) mapper
  output, [`.mapper`](mapper).

[`.relatedQuery`](query) adds its query to the layout's `queries` array just
like a `.with(query)` result — the difference is prefetch: a related query is
statically discoverable, so it's self-fetched without rendering under the cheap
policies (`serverQuery` / `clientQuery` / `serverAndClientQuery`), whereas a
`.with(query)` is only found by rendering and is prefetched only under the
expensive `pageDehydratedState*` policy.

`.scrollRestore` / `.scrollPosition` are **client-only** — cut from the server
bundle: body and their imports removed — and documented in full on the
[navigation](navigation) page — see there rather than here.

`.head` on a layout sets the document `<head>` while the layout is mounted, and
because the layout wraps its pages, that head applies across the subtree. A
page's own `.head` stacks on top. `.head('global', …)` additionally broadcasts
to every child's render.

A layout's `.wrapper`s wrap the layout's own render only — they don't carry to
the pages built under it, and don't need to: a page renders inside the layout,
so it already sits within those wrappers.

### Wrapping the 404 page in a layout

When no route matches, the router renders a built-in "Page Not Found". By
default it has no shell — but you usually want the not-found screen to keep your
header and frame. Pass `layout404` to wrap it in one or more layouts, and
`Page404` to replace the default screen itself. Both are options on
[`createNavigation`](navigation) (and props you can override on
`<RouterRoutes>`):

```tsx
// src/lib/navigation.ts
import { generalLayout } from '@/lib/layouts'
import { NotFoundPage } from '@/components/NotFoundPage'

export const { Router, RouterRoutes /* … */ } = createNavigation({
  routes,
  hook,
  Page404: <NotFoundPage />,
  layout404: generalLayout, // or an array to nest several layouts around it
})
```

`layout404` takes a layout point or its name, or an array of them (rendered
outermost-first). See [Navigation](navigation) for the full option list.
