---
index: 600
title: Query
description:
  A query is an input schema plus a server loader — a real HTTP endpoint and a
  TanStack Query in one.
---

A query pairs an input schema with a server loader. It's a real HTTP endpoint
(its own path, in the OpenAPI spec) and, at the same time, an ordinary TanStack
Query — declared once, called anywhere by importing it directly.

```tsx
import { root } from '@/lib/root'
import { z } from 'zod'

export const ideaQuery = root.lets
  .query()
  .input(z.object({ id: z.number() }))
  .loader(async ({ input }) => {
    // cut from the client bundle — body and its imports removed, so it runs server-side
    const idea = await prisma.idea.findUniqueOrThrow({
      where: { id: input.id },
    })
    return { idea }
  })
  .query()
```

```tsx
// anywhere in a component:
const { data, isLoading } = ideaQuery.useQuery({ id: 123 })
// or imperatively, on the server or the client:
const { idea } = await ideaQuery.fetchQuery({ id: 123 })
```

The first argument to every query method is the **input** — that's what forms
the cache key and gets validated and sent to the loader.

## Declaring a query

Open with `.query()`, declare input and a loader, close with `.query(options?)`:

```tsx
export const ideaQuery = root.lets
  .query() // open
  .input(z.object({ id: z.number() }))
  .loader(async ({ input }) => ({ idea: await findIdea(input.id) }))
  .query({ staleTime: 60_000 }) // close, with default react-query options
```

The options you pass to the closing `.query({...})` are standard TanStack Query
options (`staleTime`, `gcTime`, `retry`, `select`, `refetch*`, …); `queryKey`
and `queryFn` are supplied by Point0. They become the query's defaults and can
be overridden at every call site.

The closing `.query(...)` closer is **not cut from either bundle** — kept in
both (isomorphic), nothing pruned (it has to resolve the query on the server and
the client alike).

## A real endpoint

A query with a server loader is served over HTTP at an auto-generated path —
roughly `POST /_point0/<scope>/query/<kebab-name>` — and shows up in the
generated [OpenAPI](openapi) spec. It's a **POST with the input in the body**
(never a GET with search params). You never write the path; calling `fetchQuery`
/ `useQuery` routes to it for you.

A query whose only loader is a `.clientLoader` runs in the browser and has **no
endpoint** (and no OpenAPI entry) — it's a client-side query that still gets the
full cache and method surface.

## Input and validation

`.input(schema)` takes any [Standard Schema](validation) — zod, valibot,
arktype, typebox, and others — or a custom validate function:

```tsx
.input(z.object({ id: z.number(), withAuthor: z.boolean().optional() }))
```

Input schemas **merge down the chain**: a parent (a [base](base) or
[plugin](plugin)) can declare part of the input and the query adds the rest. A
child can't _widen_ the parent's input, and input can't collide with
params/search/body.

A query uses `.input` (plus `.clientInput` / `.sharedInput` for client-loader
cases) — **not** `.params`, `.search`, or `.body`; those are for [pages](page)
and [actions](action) and are a type error on a query. Full schema mechanics
live in [Validation](validation).

`.input` is the **server schema** — cut from the client bundle: its body and the
imports it uses are removed, so it never ships to the browser (it runs
server-side). `.clientInput` is the mirror image — cut from the server bundle:
body and its imports removed (it runs client-side). `.sharedInput` is not cut
from either bundle — kept in both (isomorphic).

## The loader

`.loader` runs on the server and returns the data:

```tsx
.loader(async ({ input, ctx, request, set }) => {
  const idea = await prisma.idea.findUniqueOrThrow({ where: { id: input.id } })
  return { idea }
})
```

The callback receives the parsed `input`, any `ctx` from `.ctx`/plugins, the
`request`, a `set` helper for response headers/status/cookies, and `points`. A
query's loader must return plain data, **not** a `Response`. Use `.clientLoader`
for a browser-side loader. See [Loader](loader) for the full surface and how
server code is removed from the client build.

`.loader` is **cut from the client bundle** — its body and the imports it uses
are removed, so it never ships to the browser (it runs server-side).
`.clientLoader` is the inverse: **cut from the server bundle** — body and its
imports removed, so it runs in the browser regardless of SSR.

## Using a query

**Inject it into a point.** Hand the query to a [page](page) or component with
[`.with`](with), mapping the surrounding context to its input:

```tsx
export const ideaPage = root.lets
  .page('/ideas/:id')
  .with(ideaQuery, ({ params }) => ({ id: Number(params.id) }))
  .page(({ data: { idea } }) => <h1>{idea.title}</h1>)
```

The injected query lands in `data` (when it's the first) and in `queries`. The
fuller forms — passing react-query options, resolving into props, using one
query's result as another's input — are all on the [`.with`](with) page.

**Call it directly.** Every query exposes the TanStack Query surface, with the
input as the first argument:

```tsx
const result = ideaQuery.useQuery({ id }) // standard useQuery result
ideaQuery.useQuery({ id }, { enabled: !!id }) // 2nd arg = react-query options
ideaQuery.useQuery(undefined, { enabled: false }) // read cache without fetching
```

When there's an error, `result.error` is an [`ErrorPoint0`](error-handling) (or
your own error class) — never `unknown`, so `result.error.message` is typed;
it's `null` otherwise.

## The query key

You rarely touch it, but knowing its shape helps when reading the cache. The key
is a two-element tuple:

```tsx
ideaQuery.getQueryKey({ id: 123 })
// [
//   'point0',
//   {
//     scope: 'root',        // which client/root this point grows from
//     type: 'query',        // the point kind ('page', 'layout', … for self queries)
//     name: 'idea',
//     mode: 'server',       // 'client' for a client-loader query
//     finiteness: 'finite', // 'infinite' for an infinite query
//     tags: [],             // from .tag(...)
//     output: 'data',       // usually 'data'
//     input: '{"id":123}',  // deterministic, stable-stringified input
//   },
// ]
```

The `input` is serialized deterministically (sorted keys), so `{ a, b }` and
`{ b, a }` produce the same key. With the default transformer that's plain JSON;
if you set [`.transformer(superjson)`](transformer), special types (Date, Map,
…) are encoded into the key too. For page/layout queries, search keys outside
the declared `.search` schema (and `undefined` values) are dropped from the key.

## Defaults and precedence

Set query defaults once and override outward. `.queryOptions(...)` on the root
or a base applies to every query beneath it:

```tsx
export const root = Point0.lets
  .root()
  .queryOptions({
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  })
  .root()
```

For one query, options resolve lowest-to-highest:

1. root/base `.queryOptions(...)`
2. the type-specific default — `.pageQueryOptions`, `.componentQueryOptions`,
   `.layoutQueryOptions`, … — which applies only to a **page / component /
   layout self query**, never to a standalone query
3. the query's own closing `.query({...})`
4. the call-site options on `useQuery` / `fetchQuery`

For a standalone query only steps 1, 3, and 4 participate.

On the **server**, Point0 hard-overrides a few of these regardless of what you
set — `retry: false`, no refetch-on-*, `staleTime`/`gcTime: Infinity` — because
a server render fetches once and ships the result. The full list of
`*QueryOptions` methods is in [stage-methods](stage-methods).

`.queryOptions` and the whole `*QueryOptions` family are **not cut from either
bundle** — kept in both (isomorphic), nothing pruned (the same defaults have to
apply server- and client-side).

## mode, tags, scope

- **mode** (`'server'` vs `'client'`) is derived, not set: a `.loader` makes it
  a server query, a `.clientLoader` a client query. There's one loader per
  query, so the mode is unambiguous.
- **tags** come from `.tag('a', 'b')` and ride along in the key, so you can
  invalidate or match groups of queries by tag. `.tag` is **not cut from either
  bundle** — kept in both (isomorphic), nothing pruned (the tag is part of the
  key on both sides).
- **scope** identifies which client/root a query belongs to in a multi-client
  setup (one server, many clients). It's set by the root you build from, not by
  a method.

## Edge cases

- **A disabled query stays pending.** `useQuery(input, { enabled: false })`
  never resolves to data — handy for using one query's output as another's input
  (it blocks downstream until enabled). [`.with`](with)'s `resolve` is the
  cleaner way to express that.
- **`staleTime: Infinity` for hand-managed caches.** When you write the cache by
  hand after a mutation (`setQueryData`), set `staleTime: Infinity` so it never
  silently refetches.
- **Cache mutators are exact-key.** `invalidateQuery`, `refetchQuery`,
  `removeQuery`, etc. target the exact input you pass. To match many inputs, use
  `getQueriesCache(true)` or a predicate.

## Reference

### Method surface

The query method surface is **not cut from either bundle** (server-and-client) —
kept in both, nothing pruned. `useQuery` / `fetchQuery` and the cache helpers
work on the server (during SSR) and the client alike; only the underlying
`.loader` body (and its imports) is cut from the client bundle, and `fetchQuery`
routes to its endpoint over HTTP from the browser.

These are plain [TanStack Query](https://tanstack.com/query/latest) methods —
`useQuery`, `fetchQuery`, `invalidateQuery`, `setQueryData`, and the rest behave
exactly as they do in react-query. The only thing Point0 does is build the
`queryKey` and `queryFn` for you from the query's input (and route the `queryFn`
to the right endpoint or client loader), so instead of assembling a
`UseQueryOptions` object you pass the **input** and, optionally, the same
react-query options you'd pass anyway. For the behaviour of any individual
method or option, read the
[TanStack Query docs](https://tanstack.com/query/latest/docs/framework/react/reference/useQuery).

Every method takes the **input** first. The imperative cache/fetch helpers
(`fetchQuery`, `getQueryData`, `invalidateQuery`, …) take a trailing options
object — `{ queryClient?, outputType?, fetchOptions? }`, members varying by
method; `useQuery` / `useInfiniteQuery` take `{ fetchOptions? }`, and
`getQueryKey` takes `{ outputType? }`.

| Method             | Signature                                     | Returns                            |
| ------------------ | --------------------------------------------- | ---------------------------------- |
| `useQuery`         | `(input, queryOptions?, options?)`            | TanStack `useQuery` result         |
| `useInfiniteQuery` | `(input, infiniteOptions?, options?)`         | TanStack infinite result           |
| `fetchQuery`       | `(input, queryOptions?, options?)`            | `Promise<data>`                    |
| `prefetchQuery`    | `(input, queryOptions?, options?)`            | `Promise<void>`                    |
| `ensureQueryData`  | `(input, queryOptions?, options?)`            | `Promise<data>`                    |
| `getQueryData`     | `(input, options?)`                           | `data \| undefined`                |
| `setQueryData`     | `(input, updater, setDataOptions?, options?)` | the new `data`                     |
| `refetchQuery`     | `(input, refetchOptions?, options?)`          | `Promise<void>`                    |
| `invalidateQuery`  | `(input, invalidateOptions?, options?)`       | `Promise<void>`                    |
| `cancelQuery`      | `(input, cancelOptions?, options?)`           | `Promise<void>`                    |
| `removeQuery`      | `(input, options?)`                           | `void`                             |
| `resetQuery`       | `(input, resetOptions?, options?)`            | `Promise<void>`                    |
| `getQueryState`    | `(input, options?)`                           | TanStack `QueryState \| undefined` |
| `getQueryCache`    | `(input, options?)`                           | the `Query \| undefined`           |
| `getQueriesCache`  | `(input \| predicate \| true, options?)`      | `Query[]`                          |
| `getQueryKey`      | `(input, options?)`                           | the `QueryKey` tuple               |
| `getQueryOptions`  | `(input, queryOptions?, options?)`            | fully built `UseQueryOptions`      |

Each has an infinite sibling (`fetchInfiniteQuery`, `getInfiniteQueryKey`, …)
for infinite queries.

The `outputType` option selects what a fetch returns — `'data'` (the default) or
one of the dehydrated forms (`'queryClientDehydratedState'`,
`'queryClientDehydratedStateRedirect'`, `'html'`). It's prefetch/SSR plumbing
the framework drives for you, so call sites rarely set it; the [SSR](ssr) page
covers when dehydrated state is fetched. A query's `mode` (`'server'` vs
`'client'`) is derived from its loader, not a call-site option — there's no
public `mode` argument on these methods.
