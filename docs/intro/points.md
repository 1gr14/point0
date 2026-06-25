---
index: 400
title: Points
description: Everything you build in Point0 is a point — one class, one builder, eleven types.
---

A point is the one building block in Point0. A page is a point; so is a query, a
mutation, a layout, the root itself. They're all instances of a single `Point0`
class, composed with the same builder — you open a point, configure it, and close
it. The word **points** is the umbrella term: pages, layouts, queries, mutations,
and the rest *are* points.

```tsx
export const ideaQuery = root.lets
  .query() //                        open a query point
  .input(z.object({ id: z.number() }))
  .loader(async ({ input }) => ({ idea: await getIdea(input.id) }))
  .query() //                        close it into a ready query

export const ideaPage = root.lets
  .page('/ideas/:id') //             open a page point
  .with(ideaQuery, ({ params }) => ({ id: Number(params.id) }))
  .page(({ data: { idea } }) => <h1>{idea.title}</h1>) // close it
```

Two points, two types, one grammar. The rest of this page lists every point type
and explains the two ways to write `.lets`.

## The point types

There are eleven. They split into three groups by what they do.

**Mountables — they render UI.**

- [page](page) — a route and a component, with data, loading, error, and SSR
  handled up the chain.
- [layout](layout) — a shared shell around pages, with its own route, data,
  loading, and error that pages inherit.
- [component](component) — composes queries and UI but has no route: a reusable
  mountable, not a page.
- [provider](provider) — loads or computes a value once and hands it to every
  child; read it with `.useValue()` or `.getValue()`.

Page, layout, component, and provider share one method-injection model — see
[mountable](mountable) for what they have in common.

**Data and endpoints — they move data, often over HTTP.**

- [query](query) — an input schema plus a server loader: a real HTTP endpoint and
  a TanStack Query in one.
- [infinite-query](infinite-query) — a query that loads in pages (cursor or
  offset), with the full TanStack infinite cache.
- [mutation](mutation) — an input schema plus a loader: a real HTTP `POST`
  endpoint and a TanStack Mutation in one.
- [action](action) — a server endpoint where you control the HTTP method and
  path, and may return a raw `Response`.

**Structure — they hold defaults and shape the tree.**

- [root](root) — the point you build everything from: the server entry point and
  the holder of defaults for every point beneath it.
- [base](base) — shared settings for a subset of points (a route prefix,
  defaults, gating) that its children inherit.
- [plugin](plugin) — a bundle of methods you define once and inject into any
  point's chain with `.use()`.

A point is not always an HTTP endpoint. A query, mutation, or action always is
(its own path, in the OpenAPI spec). A page or component is an endpoint only when
it has a server loader (or SSR is on) — otherwise it's a pure mountable. Each
point's own page says exactly when.

## The short `.lets` notation

Every example in these docs opens a point with the short form —
`root.lets.page('/ideas')`, `root.lets.query()`, `root.lets.mutation()`. It reads
cleanly because the point's **type is the method name** and its **name is read
from the variable**:

```tsx
export const ideaPage = root.lets.page('/ideas/:id').page(/* ... */)
//                 ▲                ▲
//          name → 'idea'      type → 'page'
```

The variable is `ideaPage`; the compiler strips the type suffix and the point's
name becomes `idea`. Same rule everywhere — `ideaQuery` → `idea`, `saveAction` →
`save`, `mainRoot` → `main`. A variable with no matching suffix is kept as-is
(`ideaX` stays `ideaX`). If the variable name strips to nothing, or you use a
default export, the name falls back to the file path — the filename, or the
directory name for an `index` file.

The short notation **needs the compiler.** It's a compile-time rewrite, not a
runtime feature: without the compiler, `root.lets.page(...)` throws

```
lets[type] notation can not work without compiler, please use compiler
```

So short `.lets.<type>()` only works inside a Point0 app, where the compiler runs.

## The full `.lets(type, name, …)` form

The short form is sugar. The compiler rewrites every `.lets.<type>(...)` into one
explicit `.lets(...)` call — type first, name second, then whatever arguments the
short form took:

```tsx
root.lets.page('/ideas')          // → root.lets('page', 'idea', '/ideas')
root.lets.query()                 // → root.lets('query', 'idea')
root.lets.action('POST', '/save') // → root.lets('action', 'save', 'POST', '/save')
```

The full form runs at runtime unchanged — no compiler required. Use it when you
need to pin a name yourself (the variable name isn't a good source) or when the
compiler isn't in play:

```tsx
export const generalLayout = root.lets('layout', 'general').layout(/* ... */)
```

Both forms are valid and identically typed. The examples in these docs use the
short form throughout for readability; a few places in the example apps use the
full form where a name is pinned explicitly (and the `expo` example, which
doesn't run `generate`, uses it everywhere).

### Static vs instance `.lets`

Most points grow off another point's instance — `root.lets.page(...)`,
`generalLayout.lets.page(...)`, `root.lets.query(...)`. Two types are different:
**root** and **plugin** are created from the `Point0` class itself, with the
static `Point0.lets`:

```tsx
import { Point0 } from '@point0/core'

export const root = Point0.lets.root().serverUrl(/* ... */).root()
export const mePlugin = Point0.lets.plugin().with(/* ... */).plugin()
```

`Point0.lets` accepts only `'root'` and `'plugin'`; every other type comes from
an instance. From there, the chain flows down: a root spawns layouts, queries,
and mutations; a layout spawns pages; a base or plugin contributes shared
settings.

## The same word opens and closes

A point is opened with `.lets.<type>(...)` and closed with `.<type>(...)` — the
same word at both ends:

```tsx
root.lets.query(/* ... */).input(/* ... */).loader(/* ... */).query()
//        ▲ open                                              ▲ close
```

The opener holds what comes *before* the point (a query's nothing, a page's
route, an action's method and path); the closer holds what comes *at the end* (a
mutation's react-query options, a page's component). Between them you add the
point's methods. The closing call must match the type you opened — a page closes
with `.page(...)`, a mutation with `.mutation(...)`. (An [action](action) is the
exception: it can close as `.action()`, `.query()`, or `.mutation()`, depending
on how you want to call it.)

The two ends have names worth fixing now, so the rest of the docs stay
consistent. Everything from the opener up to (and including) the closing call is
a **stage-method** — the chain methods you call while the point is still being
built (`.input`, `.loader`, `.with`, the closing `.page(...)`, …). What you get
*after* the close is a **ready-method** — the surface on the finished point
(`useQuery`, `fetchMutation`, `.route`, `.id`, `.useValue`, …). The two states
even have their own types in the code: a point under construction is a
`StagePoint`, a closed one is a `ReadyPoint`.

```tsx
const ideaQuery = root.lets
  .query() //                          ┐
  .input(z.object({ id: z.number() })) // stage-methods (building the point)
  .loader(/* ... */) //                ┘
  .query() //                          close → from here on, ready-methods

ideaQuery.useQuery({ id: 1 }) //       ready-method on the finished query
```

## Everything lands in one collection

Because all eleven types are the same class, the compiler collects them into one
array — the points collection the engine loads. Every point, whatever its type,
sits in the same list:

```ts
// generated points file (shape)
export default [root, ideaScreenComponent, createIdeaMutation, ideaQuery] // PointsDefinition
```

Each point carries a stable id of the form `scope:type:name` (e.g.
`root:query:idea`). The engine wires this collection in; you never assemble it by
hand. See [generator](generator) for how it's produced and [engine-config](engine-config)
for how it's loaded.

## Reference

### Point types at a glance

| Type | Group | Opens off | Page |
| --- | --- | --- | --- |
| `page` | mountable | root / base / layout | [page](page) |
| `layout` | mountable | root / base / layout | [layout](layout) |
| `component` | mountable | root / base | [component](component) |
| `provider` | mountable | root / base | [provider](provider) |
| `query` | data/endpoint | root / base | [query](query) |
| `infiniteQuery` | data/endpoint | root / base | [infinite-query](infinite-query) |
| `mutation` | data/endpoint | root / base | [mutation](mutation) |
| `action` | data/endpoint | root / base | [action](action) |
| `root` | structure | `Point0` (static) / root | [root](root) |
| `base` | structure | root / base | [base](base) |
| `plugin` | structure | `Point0` (static) | [plugin](plugin) |

`query`, `mutation`, and `action` are always HTTP endpoints; `page`, `layout`,
`component`, and `provider` are endpoints only with a server loader or SSR;
`root`, `base`, and `plugin` are never endpoints.

### Notation at a glance

| | Short (`.lets.page`) | Full (`.lets('page', …)`) |
| --- | --- | --- |
| Needs the compiler | yes | no |
| Point name | read from the variable | passed explicitly |
| Runs at runtime as-is | no — rewritten | yes |
| Used in these docs | yes (default) | only where a name is pinned |

<!-- TODO(low): the claim "everything is a point" covers every building block you author with `.lets`. Point0 also has non-point primitives (env, error, navigation, eventer, super-store) — scope the claim to the authored surface, not *literally* everything. -->
