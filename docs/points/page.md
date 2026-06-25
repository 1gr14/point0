---
index: 100
title: Page
description:
  A page is a point — a route and a component, with data, loading, error, and
  SSR handled up the chain.
---

A page is a point. You give it a route and a component; everything else — data,
loading and error states, SSR, the client-side (SPA-style) navigation — is wired
through the point chain it grows from.

```tsx
import { generalLayout } from '@/layouts/general'
import { ideaQuery } from '@/queries/idea'

export const ideaPage = generalLayout.lets
  .page('/ideas/:id')
  .with(ideaQuery, ({ params }) => ({ id: Number(params.id) }))
  .head(({ data: { idea } }) => idea.title)
  .page(({ data: { idea } }) => (
    <article>
      <h1>{idea.title}</h1>
      <p>{idea.content}</p>
    </article>
  ))
```

`/ideas/123` now renders that component, with `idea` already loaded — no loading
branch in sight. The rest of this page shows where each piece comes from.

## Declaring a page

A page is opened off a parent — the [root](root), a [base](base), or a
[layout](layout) — with a route, and closed with `.page(component)`:

```tsx
export const homePage = root.lets.page('/').page(() => <h1>Home</h1>)
```

The short `root.lets.page('/')` form needs the compiler; it expands to the
explicit `root.lets('page', 'home', '/')`, where `'home'` is read from the
variable name. Both forms are valid and identically typed — see [points](points)
for the notation. A page can only grow from a `root`, `base`, or `layout`; you
can't open a page off a query or a mutation.

The `.page(component)` closer is **server-ssr-and-client** — it's cut from the
SERVER bundle when `ssr:false` (or after a `.clientOnly()` earlier in the
chain): its body and imports are removed from the server build. Kept in the
client build always, and in the server build only when SSR is on.

The component argument is **optional**. Omit it and the page renders nothing
(`() => null`) — useful when the page only runs an effect or a loader:

```tsx
export const logoutPage = root.lets
  .page('/logout')
  .page(({ LoadingComponent }) => {
    useLogoutOnMount()
    return <LoadingComponent />
  })
```

### Typed route params

Write params into the route string and they arrive typed — Point0 parses the
route at the type level:

```tsx
export const ideaPage = root.lets
  .page('/ideas/:id') // params is { id: string }
  .page(({ params }) => <h1>Idea {params.id}</h1>)
```

Params are strings; coerce them yourself (`Number(params.id)`), or validate and
transform them with [`.params(schema)`](validation). Optional and wildcard
segments work too — `'/files/:dir?/*?'` gives you `params.dir` and
`params['*']`.

### The route prefix is inherited

A page's public route extends its parent's. Open a page off a layout that owns
`/ideas`, give the page `/:id`, and its route is `/ideas/:id`:

```tsx
export const ideasLayout = root.lets.layout('/ideas').layout(/* ... */)

export const ideaPage = ideasLayout.lets
  .page('/:id') // final route: /ideas/:id
  .page(/* ... */)
```

Everything that shapes the page — its route prefix, loading and error UI,
defaults — is reachable by following the parent chain from the point itself. No
config in another file changes it.

## Getting data into a page

A page renders only once its data is ready, so the component never sees a
half-loaded state. There are two ways to attach data.

**Own loader.** Put a [`.loader`](loader) on the page. It runs on the server, so
your database code never ships to the browser:

```tsx
export const ideaPage = root.lets
  .page('/ideas/:id')
  .loader(async ({ params }) => {
    const idea = await prisma.idea.findUniqueOrThrow({
      where: { id: Number(params.id) },
    })
    return { idea } // becomes `data`
  })
  .page(({ data: { idea } }) => <h1>{idea.title}</h1>)
```

`.loader` is **server-only** — cut from the client bundle: its body and the
imports it uses are removed, so it never ships to the browser. Stays in the
server build.

**Injected query.** When the data lives in a reusable [query](query), hand it to
the page with [`.with`](with) and map the route params to its input:

```tsx
export const ideaPage = root.lets
  .page('/ideas/:id')
  .with(ideaQuery, ({ params }) => ({ id: Number(params.id) }))
  .page(({ data: { idea } }) => <h1>{idea.title}</h1>)
```

Both forms feed `data`. Inject more than one query and read them from `queries`
(in declaration order), or fold them into one shape with [`.mapper`](mapper) —
see [`.with`](with) for the full range. You can also skip `.with` entirely and
call `ideaQuery.useQuery({ id })` inside the component, handling `isLoading`
yourself — the page doesn't force either style.

`.with` and `.mapper` are **server-ssr-and-client** — cut from the SERVER bundle
when `ssr:false` (or after a `.clientOnly()`): their bodies and imports are
removed from the server build. Kept in the client build always, and in the
server build only when SSR is on. A `.with` query is discovered only by
rendering the page, so it's prefetched only under the expensive
`pageDehydratedState*` policies (the full SSR render); see
[`.relatedQuery` vs `.with`](#relatedquery-vs-with) below for the cheaper,
render-free path.

### `.relatedQuery` vs `.with` {#relatedquery-vs-with}

[`.relatedQuery`](query) declares a query the page depends on. Like a `.with`
query, it **adds its query to the `queries` array** and feeds `data` — it does
not skip them. The difference is **prefetch**: a related query is statically
discoverable, so prefetch can self-fetch it **without rendering** the page,
under the cheap policies (`serverQuery` / `clientQuery` /
`serverAndClientQuery`). A `.with` query is found only by rendering, so it's
prefetched only under the expensive, SSR-only `pageDehydratedState*` policies.
Reach for `.relatedQuery` when you want a page's data warm before navigation
without paying for a full render.

`.relatedQuery` is **server-and-client** — not cut from either bundle: kept in
both builds (isomorphic), nothing pruned.

## Loading and error states

When a page has pending data, Point0 shows the nearest `.loading` component up
the chain; on a thrown error, the nearest `.error`. Set them once on the root
and override per point as needed:

```tsx
export const root = Point0.lets
  .root()
  .loading(() => <Spinner />)
  .error(({ error }) => <ErrorScreen error={error} />)
  .root()
```

A page can override either:

```tsx
export const ideaPage = root.lets
  .page('/ideas/:id')
  .loading(() => <IdeaSkeleton />)
  .loader(/* ... */)
  .page(/* ... */)
```

The `.loading` must appear before the data method that can suspend. You won't
see the loading state when SSR is on (the data arrives with the HTML) or when
the page is prefetched before navigation. Full rules, including prefetch
policies, are in [Loading & error](loading-error).

`.loading` and `.error` are **server-ssr-and-client** — cut from the SERVER
bundle when `ssr:false` (or after a `.clientOnly()`): their bodies and imports
are removed from the server build. Kept in the client build always, and in the
server build only when SSR is on.

## Head and SEO

Set the document head from the page, statically or from loaded data:

```tsx
export const ideaPage = root.lets
  .page('/ideas/:id')
  .with(ideaQuery, ({ params }) => ({ id: Number(params.id) }))
  .head(({ data: { idea } }) => ({
    title: idea.title,
    description: idea.content.slice(0, 140),
  }))
  .page(/* ... */)
```

`.head` accepts a string (shorthand for the title) or an [unhead](head) object,
and can be set per state. Details on [Head](head).

`.head` is **server-ssr-and-client** — cut from the SERVER bundle when
`ssr:false` (or after a `.clientOnly()`): its body and imports are removed from
the server build. Kept in the client build always, and in the server build only
when SSR is on.

## A page is also a query

A page with a loader is itself a query under the hood — Point0 attaches a _self
query_ so the page can be fetched and prefetched like any other:

```tsx
ideaPage.useQuery({ id: 123 })
ideaPage.fetchQuery({ id: 123 })
ideaPage.getQueryKey({ id: 123 })
ideaPage.prefetchQuery({ id: 123 })
```

This is what makes SSR and navigation prefetch work without you wiring anything.
The page's self query is **finite by default**. To make it infinite, close the
chain with [`.infiniteQuery({...})`](infinite-query) after the loader (instead
of a plain loader) — wire the cursor to search with `pageParamFromInput`:

```tsx
export const ideaListPage = root.lets
  .page('/ideas')
  .search(z.object({ page: z.coerce.number().default(0) }))
  .loader(async ({ search }) => {
    /* ... */ return { ideas, nextCursor }
  })
  .infiniteQuery({
    getNextPageParam: (last) => last.nextCursor,
    initialPageParam: 0,
    pageParamFromInput: '?.page',
  })
  .mapper(({ data }) => ({ ideas: data.pages.flatMap((p) => p.ideas) }))
  .page(({ data: { ideas }, queries: [query] }) => {
    /* ...query.fetchNextPage() */
  })
```

`.infiniteQuery` and `.query` (the self-query closers) are **server-and-client**
— not cut from either bundle: kept in both builds (isomorphic), nothing pruned.

A page with no loader issues no request and exposes no useful query — calling
`.useQuery()` on it returns an empty result, not an error.

## Page or endpoint?

Not every page is an HTTP endpoint. The distinction matters because a query, a
mutation, or an action is _always_ a real endpoint (its own path, in the OpenAPI
spec), but a page is only sometimes one:

- **SSR on** → the page is server-rendered, so it's an endpoint.
- **SSR off** → the page is an endpoint **only if it has a server `.loader()`**
  (the loader needs a URL to fetch). A page that only composes other queries —
  no server loader — is a pure **mountable**: client-only, no endpoint.

Either way, a page with a route is always reachable in the client (after the
initial SSR render, navigation is client-side, SPA-style). "Endpoint" is about
whether the server serves it directly.

## Gating a page

The page component is browser code, and the page's route is reachable in the
client. The server-only parts of the chain — your loader body, secrets, DB calls
— are stripped from the client bundle at compile time, so they never leak, but a
render that depends on access has to be guarded in code that always runs:

- Don't put secret content in the rendered markup expecting it to be server-only
  — the markup ships to the browser.
- Gate access in a [`.with`](with) wrapper (or a [plugin](plugin) that combines
  `.ctx` and `.with`), not with `.ctx` alone. `.ctx` is **server-only** (its
  body is stripped from the client bundle). A page's `.ctx` runs **only when the
  page has a loader** — a loader-less page makes no server request, so its
  `.ctx` never executes and can't protect anything.

```tsx
import { authPlugin } from '@/lib/auth' // a plugin that resolves the user into props.me
import { AppError } from '@/lib/error' // your own error class — ErrorPoint0 or any compatible one

export const adminPage = root.lets
  .page('/admin')
  .use(authPlugin)
  .with(({ props: { me } }) => {
    if (!me?.isAdmin) return new AppError('Forbidden', { code: 'FORBIDDEN' })
    return { me }
  })
  .page(/* ... */)
```

`me` has to come from somewhere — here a [plugin](plugin) puts it in `props`
first. Returning an [`AppError`](error-handling) from `.with` short-circuits to
the error component.

## Authoring notes

- **Pages are lazy by default.** Each page is its own dynamically imported
  chunk, loaded on navigation. Turn this off in the client's codegen config —
  `client: { generate: { points: { lazy: false } } }` — there is no per-page
  method for it.
- **Put pages anywhere.** Any file, any folder, several per file. Point0 finds
  them by static analysis; hot-reload survives mixing pages, queries, and
  mutations in one file.
- **Wrap the render with [`.wrapper`](mountable).**
  `.wrapper(({ children }) => …)` wraps the page's tree; a wrapper can also
  short-circuit before the data loads.

## Reference

### Component props

The page component receives one object:

| Prop               | Type                                            | When                                  |
| ------------------ | ----------------------------------------------- | ------------------------------------- |
| `data`             | mapper output, or the first query's data        | always (`{}` if none)                 |
| `queries`          | tuple of loaded query results, in `.with` order | always (`[]` if none)                 |
| `params`           | parsed route params                             | when the route has params / `.params` |
| `search`           | parsed query string                             | when `.search` is set                 |
| `setSearch`        | update the URL query (replace / patch / drop)   | always (client-only; SSR no-op)       |
| `props`            | props contributed by `.with` wrappers           | always (`{}` if none)                 |
| `location`         | the current location (`location.params`, …)     | always (pages have a route)           |
| `LoadingComponent` | the resolved loading component                  | always                                |
| `ErrorComponent`   | the resolved error component (`{ error }`)      | always                                |

A page has no `input` prop — pages use `params`/`search`, not `.input`. Writing
`.input` or `.body` on a page is a type error.

### Methods that apply to a page

Data & context: [`.loader`](loader), `.clientLoader`, [`.ctx`](ctx),
[`.with`](with), [`.mapper`](mapper), [`.relatedQuery`](query),
[`.params` / `.search`](validation), `.headers`, `.cookies`. `.headers` /
`.cookies` validate the incoming request and type it into the loader, so they
only do something on a page with a `.loader` — a loader-less page has no request
to parse.

UI: [`.head`](head), [`.loading`](loading-error), [`.error`](loading-error),
`.wrapper`, [`.layout`](layout).

Navigation & prefetch: `.prefetchPageOnNavigate`, `.prefetchPageOnLinkHover`,
`.prefetchPagePolicy`, `.onPrefetchPage`, `.scrollRestore`, `.scrollPosition`,
`.clientOnly`. See [Navigation](navigation) (and [SSR](ssr)) for the prefetch
policies.

Shared: [`.use`](plugin) (plugins), [`.middleware`](middleware), `.on` /
`.serverOn` / `.clientOn` (events), `.tag`, `.description`. `.middleware` runs
server-side around the page's request, so it fires only when the page is served
as an endpoint (a loader, or SSR on).

`.infiniteQuery` and `.query` are valid only to finalize a loader-bearing page's
self query; they're otherwise unavailable on a page.

The per-status `.head` forms work on a page the same as on any mountable:
`.head('global', …)` is the app-wide base head, `.head('universal', …)` applies
in every render state, and `.head('loading' | 'error' | 'success', …)` targets
one state. A bare `.head(value)` defaults to the `'success'` state.

### The page's route

`page.route` is a callable [route0](navigation) route:

```tsx
page.route({ id: 123 }) // => "/ideas/123"   (relative)
page.route.abs({ id: 123 }) // => "https://app.example.com/ideas/123"
page.route.getRelation(href) // match the current URL against this route
```
