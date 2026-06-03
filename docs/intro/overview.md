---
index: 100
title: Overview
description:
  Point0 in one page — build a small app and watch pages, data, endpoints, and
  SSR fall out of one typed primitive.
---

Point0 is a fullstack TypeScript framework on Bun. You build the whole app —
pages, layouts, data, endpoints — from one typed building block, a **point**,
composed with a builder. Types come straight from your code (no type codegen),
and every point is collected statically, so the whole app is visible from one
place — to you and to your tools.

This page builds a small app step by step, so each piece shows up the moment
you'd reach for it.

## A page

A page is a point. Declare it off the root with a route:

```tsx
export const ideasPage = root.lets
  .page('/ideas')
  .head('Ideas')
  .page(() => {
    return <h1>Ideas</h1>
  })
```

`/ideas` now renders that component. The compiler reads the point's name from
the variable, so `root.lets.page('/ideas')` is short for the explicit
`root.lets('page', 'ideas', '/ideas')` — both work, and every point type has the
same short form.

## Add a layout

Want a shared shell around your pages? That's a layout. Pages hang off it and
render inside its `children`:

```tsx
export const generalLayout = root.lets.layout().layout(({ children }) => {
  return <div className="app-shell">{children}</div>
})

// the page now lives inside the layout:
export const homePage = generalLayout.lets
  .page('/')
  .head('Home')
  .page(() => <h1>Home</h1>)
```

Layouts nest — a page can sit inside a chain of them.

## Move data into a query

When a page needs data, don't fetch by hand. Put it in a **query**: an input
schema and a server loader.

```tsx
export const ideaQuery = root.lets
  .query()
  .input(z.object({ id: z.number() })) // input is typed { id: number }, and validated
  .loader(async ({ input }) => {
    // runs on the server — your DB code never ships to the browser
    const idea = await prisma.idea.findUniqueOrThrow({
      where: { id: input.id },
    })
    return { idea }
  })
  .query()
```

A query — like a mutation or an action — is a **real HTTP endpoint**: its own
path, in the generated OpenAPI spec, callable with `curl` or from another
service. (Not everything is an endpoint — a component that only composes other
queries is just a mountable. Each point's own page says exactly when.)

## Use the query — two ways

Call it in your component and handle loading yourself:

```tsx
export const ideaPage = root.lets
  .page('/ideas/:id')
  .head('Idea')
  .page(({ params }) => {
    const { data, isLoading } = ideaQuery.useQuery({ id: Number(params.id) })
    if (isLoading) return <p>Loading…</p>
    return <h1>{data.idea.title}</h1>
  })
```

Or hand it to the point with `.with`, and the component just gets the data —
already loaded, no loading or error branch:

```tsx
export const ideaPage = generalLayout.lets
  .page('/ideas/:id')
  .with(ideaQuery, ({ params }) => ({ id: Number(params.id) }))
  .head(({ data: { idea } }) => idea.title)
  .page(({ data: { idea } }) => <h1>{idea.title}</h1>)
```

In the `.with` form, loading and error are handled up the chain. You set the
defaults once on the root, and any point can override them:

```tsx
export const root = Point0.lets
  .root()
  // ...
  .loading(() => <p>Loading…</p>)
  .error(({ error }) => <p>Error: {error.message}</p>)
  .root()
```

That's the loading/error wiring most apps repeat in every component — here it's
built in, per point, all the way up the chain.

## SSR is a switch

Turn it on in the engine:

```ts
export const engine = Engine.create({ file: import.meta.url, ssr: true })
```

The server now sends ready HTML — no spinner on first paint. You didn't write a
prefetch step: Point0 renders the page, sees which queries are pending, fetches
them (it has their server code), and re-renders until nothing is pending — then
ships the page with its data. Both forms above are covered. After that, the
client navigates like an SPA, fetching only data and any missing JS.

Want to skip the server re-renders? Keep SSR on and tune it instead of dropping
it: `ssr: { allowedRerendersCount: 0 }` stops the re-render passes, and
`prefetchBeforePageRender: true` prefetches each page and its layouts up front
so the render finds the data in cache. Or `ssr: false` to turn SSR off entirely.
Your points don't change either way.

## One file, mixed exports

A point isn't a React component, but you export points from ordinary files —
even several kinds in one file — and hot-reload keeps working. A feature's page
and the mutation it uses can sit side by side:

```tsx
// one file:
export const createIdeaMutation = root.lets
  .mutation()
  .input(ideaSchema)
  .loader(/* ... */)
  .mutation()

export const newIdeaPage = generalLayout.lets
  .page('/ideas/new')
  .head('New Idea')
  .page(() => {
    const create = createIdeaMutation.useMutation()
    // ...a form that calls create.mutateAsync(...)
  })
```

## A few more nice things

- **The engine is config and runtime in one.** `Engine.create({...})` is your
  config; the same object runs the app — `engine.serve()`, `engine.dev()`,
  `engine.build()`, `engine.fetch(req)`.
- **Test endpoints without a server.** Hand a request to `engine.fetch` — it
  runs in-process and returns the response.
- **Real endpoints, with OpenAPI.** Every query, mutation, and action gets its
  own path and shows up in the spec — not one opaque RPC endpoint.
- **No giant router type.** Your index of points is a runtime registry, not an
  aggregated type. Each point's types live in the point itself, so the editor
  and the type-checker stay fast as the app grows.
- **Bun-native.** Point0 runs on pure Bun — no Vite required. Want Vite? Use it.
  Don't? Drop it. (Point0 even runs Babel plugins under Bun, which Bun alone
  doesn't.)
- **No imposed file structure.** Put points wherever you like; the framework
  finds them.
- **Reactive state through SSR.** A reactive SSR store and a cookie store let you
  set state during the server render; the render settles on the final value and
  ships it to the client, so SSR-aware code reads like ordinary state code.
- **Server-only or client-only.** Build a backend-only app, or a client-only one
  — pages, queries, and mutations all support a client loader.
- **Drop into another framework, or host one.** Skip the compiler and pass
  requests to `engine.fetch` to mount Point0 inside Elysia (or anything); or
  mount Elysia inside Point0 through middleware. Auth kits like Better Auth
  mount as middleware — no point required.
- **The builder reads itself.** `.lets.page('/x')` opens a page and `.page(...)`
  closes it — the same word at both ends. The first method holds what comes
  before the point (its route); the last holds what comes at the end (its
  component).

## Next

Scaffold a project in [Getting Started](getting-started), then dig into the
point model in the Concepts section.
