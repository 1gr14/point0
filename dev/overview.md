# Point0 — overview

> Internal, maintainer-facing overview. It's the seed for the public
> `intro/overview` article. Snippets are trimmed from real files under
> `examples/*` (path in a comment above each) and use the idiomatic short
> builder notation — see "Two notations" below. No invented code, no slogans;
> describe Point0 as it is.

Point0 is a fullstack TypeScript framework on Bun. You build the whole app —
pages, layouts, data, endpoints — out of one typed primitive: a **point**. You
compose points with a builder (`.lets(...)` then a chain of methods). Points are
collected statically, so the whole app graph is visible from any single place —
to you, and to tools and agents. Types come from generics; codegen is minimal
and optional.

The rest of this page builds a small app step by step, so the pieces show up the
moment you'd reach for them.

## A page

A page is a point. Declare it off the root and give it a route:

```tsx
// examples/capacitor/src/pages/ideas.tsx (short notation)
export const ideasPage = root.lets
  .page('/ideas')
  .head('Ideas')
  .page(() => {
    return <h1>Ideas</h1>
  })
```

That's a working route at `/ideas`. `.page(...)` takes a normal React component.

**Two notations.** The explicit `root.lets('page', 'ideas', '/ideas')` is the
full form — valid on its own, with or without the compiler. In practice you
write the shorter `root.lets.page('/ideas')`, and the compiler expands it to the
explicit form, taking the point's name from the variable (`ideasPage` →
`ideas`). These docs use the short form everywhere, for every point type
(`.lets.query()`, `.lets.layout()`, …). The one exception is `action`, which has
extra terminal options — covered in its article.

## A layout

Want a shared shell — header, nav, a frame around pages? That's a layout point.
Pages hang off it instead of off the root, and render inside its `children`:

```tsx
// examples/basic/src/layouts/general.tsx (short notation)
export const generalLayout = root.lets.layout().layout(({ children }) => {
  const isNavigating = useIsNavigating()
  return <div style={{ opacity: isNavigating ? 0.6 : 1 }}>{children}</div>
})
```

```tsx
// examples/basic/src/pages/home.tsx — this page now lives inside generalLayout
export const homePage = generalLayout.lets
  .page('/')
  .head('Home')
  .page(() => <h1>Welcome to IdeaNick</h1>)
```

Layouts nest: a page off a layout that's off another layout renders inside both.

## Pull the data into its own point

Page bodies shouldn't hand-roll fetching. Move the data into a **query** point:
an input schema and a server `loader`.

```tsx
// examples/basic/src/lib/idea.ts
export const ideaViewQuery = root.lets
  .query()
  .input(z.object({ id: z.number() }))
  .loader(async ({ input }) => {
    const idea = await prisma.idea.findUniqueOrThrow({
      where: { id: input.id },
    })
    return { idea }
  })
  .query()
```

The `loader` runs on the server (Prisma never reaches the browser). A query —
like a mutation or an action — is also exposed as a **real HTTP endpoint**: its
own path, in the OpenAPI spec, callable with `curl` or from another service.
(Pages can become endpoints too, when they have a loader or when SSR is on —
each point's own article spells out exactly when. Not every point is an
endpoint: a component that just composes other queries is a mountable, not an
endpoint.)

## Use the query — two ways

**Call it in the render and handle loading yourself.** The query exposes a typed
`useQuery` hook; you read `data` / `isLoading` like any React Query result:

```tsx
// examples/capacitor/src/pages/ideas.tsx (short notation)
import { ideasQuery } from '@/ideas'

export const ideasPage = root.lets
  .page('/ideas')
  .head('Ideas')
  .page(() => {
    const { data, isLoading } = ideasQuery.useQuery()
    return isLoading ? (
      <p>Loading ideas...</p>
    ) : (
      <ul>
        {(data?.ideas ?? []).map((idea) => (
          <li key={idea.id}>{idea.title}</li>
        ))}
      </ul>
    )
  })
```

**Or hand the query to the point with `.with`,** and the framework resolves it
up the chain — the component just gets the data, already loaded:

```tsx
// examples/basic/src/pages/idea-create-update.tsx
export const ideaUpdatePage = generalLayout.lets
  .page('/ideas/:id/edit')
  .with(ideaViewQuery, ({ params: { id } }) => ({ id: +id }))
  .head(({ data: { idea } }) => `Edit Idea: ${idea.title}`)
  .page(({ data: { idea } }) => {
    // `idea` is already here — no loading/error branch in this component
    return <h1>Edit Idea: {idea.title}</h1>
  })
```

Loading and error aren't your problem in the `.with` form — they're handled in
the chain. The root sets the defaults; any point can override them:

```tsx
// examples/basic/src/lib/root.tsx
export const root = Point0.lets
  .root()
  // ...
  .loading(() => <p>Loading...</p>)
  .error(({ error }) => <p>Error: {error.message}</p>)
  .root()
```

This is the loading/error handling every app writes by hand, every time — here
it's built in, and it's per-point in the chain, not one error boundary bolted on
the client.

## SSR just worked — both times

Turn SSR on once, in the engine:

```ts
// examples/basic/src/engine.ts
export const engine = Engine.create({
  file: import.meta.url,
  ssr: true /* ... */,
})
```

Now the server renders the page to ready HTML — no spinner flash on first paint.
You didn't write a prefetch step: Point0 renders the tree, sees which queries
are pending, prefetches them (it has their server code), and re-renders until
nothing is pending, then ships the page plus the dehydrated query state. Both
forms above — `useQuery` in render and `.with` — get prefetched this way. On
later navigations the client fetches only data and any missing JS, so pages come
up fast.

Worried about re-render cost on the server? You don't have to drop SSR for that.
Give `ssr` an options object: `allowedRerendersCount: 0` keeps SSR on but stops
the re-render passes, and `prefetchBeforePageRender: true` prefetches the page
and its layouts up front (their loaders and queries, with inputs taken from the
route) so the render finds the data in cache. It's still SSR — you just take a
bit more care to prefetch everything ahead, instead of leaning on the
render-to-discover loop. (`ssr: false` drops SSR entirely.) Either way the
points don't change — it's a config switch.

## One file, mixed exports, HMR intact

A point isn't a React component, but you still export points from ordinary files
— even several kinds from one file — and hot-reload keeps working:

```tsx
// examples/basic/src/pages/idea-create-update.tsx exports, from one file:
//   ideaCreateMutation, ideaUpdateMutation   (mutations)
//   ideaCreatePage, ideaUpdatePage           (pages)
```

```tsx
// examples/basic/src/index.client.tsx
mount(<App />, points)
if (import.meta.hot) import.meta.hot.accept()
```

You can keep a feature's page and its data side by side, in one small file, and
HMR doesn't break.

## Why it holds together

- **One primitive.** Pages, layouts, components, providers, queries, mutations,
  actions are all points, built the same way. Each has a stable id
  (`scope:type:name`).
- **The builder grows the type.** Each method in the chain refines the point's
  type — that's why it's a chain and not one function call, and why a new
  capability is just one more method.
- **Data points are real endpoints.** Queries, mutations, and actions get real
  paths and OpenAPI out of the box — unlike an opaque single RPC endpoint.
- **Bun-native.** Point0 is built around Bun and runs on pure Bun — the `basic`
  example has no Vite at all. You can use Vite if you want (there's a `vite`
  example), or drop it and stay on Bun. Point0 also lets you run Babel plugins
  under Bun, which Bun alone doesn't do — the compiler adds that.
- **SSR is a switch.** It works on its own, prefetch and all, and toggles with
  no code change. A reactive SSR store and cookie store make the SSR-aware code
  read like ordinary code.
- **Statically collected.** Every point hangs off the root and is gathered at
  build, so the whole graph is visible from anywhere — to you and to tools (an
  MCP server exposes the points to agents). A small file can hold a whole app.

## A few more nice things

Beyond the tour, things that come up once you build for real:

- **The engine is config and runtime in one.** `Engine.create({...})` is the
  config; the same object is the runtime you call — `engine.serve()`,
  `engine.dev()`, `engine.build()`, `engine.fetch(req)`.
- **Test endpoints without a server.** Hand a request to `engine.fetch` — it
  runs in-process and returns the response, so you hit any endpoint from a test
  with nothing to boot.
- **No imposed file structure.** Point0 doesn't dictate folders. Points are
  found wherever you put them; you own the layout and organize it your way.
- **Mount any endpoint via middleware — no point required.** Drop arbitrary
  handlers in through middleware, so auth kits like Better Auth work out of the
  box: their handler just mounts.
- **Plugins are ordinary code.** A plugin is written as normal point code and
  attaches wherever you need it.
- **Codegen is optional, and what it makes is for you.** Nothing forces
  generation. Routes come out as a plain object you use directly, and your
  points are collected into one index file for you — the wiring you wrote by
  hand in tRPC.
- **That index is runtime-only, so types stay fast.** In tRPC everything folds
  into one `AppRouter` type, and on a large app that type gets heavy — the
  editor and the type-checker slow down. Point0's index is just a registry the
  engine reads at runtime to find an endpoint; each point's types live in the
  point itself and are imported where used. Nothing balloons, so editing stays
  fast as the app grows.
- **Server-only, or client-only.** It can be a server-only app, or a client-only
  one — queries, mutations, and pages all support a client loader.
- **Reactive state through SSR.** A reactive SSR store and a cookie store let you
  set state during the server render; the render settles on the final value and
  ships it to the client, so SSR-aware code reads like ordinary state code.
- **Use it without the compiler, or inside another framework.** Skip the
  compiler and pass requests to `engine.fetch` — Point0 drops into Elysia (or
  anything). The other way works too: mount Elysia inside Point0 through
  middleware.
- **The builder reads itself.** `.lets.page('/home')` opens it and `.page(…)`
  closes it — the same word at both ends shows what it is at a glance. The first
  method holds what the point needs before it starts (a page's route); the last
  holds what comes at the end (the page component).

## Where to go next

The public docs are planned and tracked in [`dev/docs.md`](./docs.md) — the
category structure, the article list with per-article source references, and the
coverage tracker. Each section above maps to one or more planned articles, where
the exact rules (when a page is an endpoint, the full builder surface, SSR
internals) get spelled out. How to write those articles:
[`dev/writing-docs.md`](./writing-docs.md).
