---
index: 700
title: Mapper
description:
  Fold loader and query results into the one shape your render reads — the data
  prop, computed once.
---

`.mapper` turns the raw loader and query results into the final `data` your
render reads. By default `data` is just the first query's data; once you add a
`.mapper`, `data` is whatever the mapper returns. Reach for it when one point
pulls several queries together, or when a query's shape (paginated, nested)
isn't the shape your component wants.

```tsx
export const ideaListPage = generalLayout.lets
  .page('/ideas')
  .search(
    z.object({
      page: z.coerce.number().default(0),
      limit: z.coerce.number().default(2),
    }),
  )
  .loader(async ({ search: { page, limit } }) => {
    const ideasCount = await prisma.idea.count()
    const ideas = await prisma.idea.findMany({
      take: limit,
      skip: page * limit,
    })
    const nextCursor = ideasCount > (page + 1) * limit ? page + 1 : undefined
    return { ideas, ideasCount, nextCursor }
  })
  .infiniteQuery({
    getNextPageParam: (last) => last.nextCursor,
    initialPageParam: 0,
    pageParamFromInput: '?.page',
  })
  .mapper(({ data }) => ({
    ideas: data.pages.flatMap((page) => page.ideas), // flatten the paginated shape
    total: data.pages[0].ideasCount,
  }))
  .head(({ data: { total } }) => `${total} ideas`)
  .page(({ data: { ideas, total } }) => (
    <IdeaList ideas={ideas} total={total} />
  ))
```

An infinite query hands you `data.pages` — an array of page objects. The mapper
flattens that into `{ ideas, total }`, and from there `.head` and `.page` read
the clean shape, not the pagination machinery.

> **Stripping:** server-ssr-and-client — cut from the SERVER bundle when
> `ssr:false` (or after an earlier `.clientOnly()` in the chain): the mapper's
> body and the imports it uses are removed from the server build, where the
> framework substitutes an identity passthrough. Kept in the client build
> always, and in the server build only when SSR is on (it runs on the client
> always, and on the server only when SSR is on).

## What the mapper receives

The mapper is one synchronous function. It gets a single object and returns a
plain object — the new `data`:

```tsx
.mapper(({ data, queries, props, location }) => {
  return { /* the new data */ }
})
```

| Key        | What                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------- |
| `data`     | the current `data` — the first query's data, or the previous mapper's output                            |
| `queries`  | every query, in `.with` order, **all loaded** (success state)                                           |
| `props`    | props contributed by [`.with`](with) wrappers and plugins                                               |
| `location` | present whenever the point has a route location (pages and layouts); components and providers have none |

There is no separate `params`, `search`, or `input` key on the mapper argument
at runtime — reach for `location.params` / `location.search` instead, as the
self-query example below does.

The mapper runs **only on success** — by the time it runs, every query has
loaded, so `queries[n].data` is always there. There is no `loading`, `error`,
`status`, or `ctx` key here: a mapper transforms data that is already resolved,
it doesn't decide loading or error (that's [`.with`](with) and
[Loading & error](loading-error)).

A mapper that throws is **not** caught by `.error`. The mapper runs inside the
render (in a `useMemo`), so a throw there is a render-phase error, not a data
error — and `.error` only handles the resolved error _state_ of a loader or
query. Point0 ships no React error boundary around your render, so the throw
bubbles to whatever boundary your app provides (and fails the SSR render). Keep
the mapper total: return data, don't throw. To signal an error from the data
phase, return one from a [`.with`](with) instead — that routes to `.error`.

## `data` shadows `queries[0].data`

Without a mapper, `data` is a shorthand for the first query's data:

```tsx
.with(ideaQuery, ({ params }) => ({ id: Number(params.id) }))
.page(({ data, queries }) => {
  // data === queries[0].data
})
```

A mapper replaces it. After `.mapper`, `data` is the mapper's return value,
while `queries` still hold the raw per-query results:

```tsx
.with(ideaQuery, ({ params }) => ({ id: Number(params.id) }))      // queries[0]
.with(commentsQuery, ({ params }) => ({ ideaId: Number(params.id) })) // queries[1]
.mapper(({ queries: [idea, comments] }) => ({
  idea: idea.data.idea,
  comments: comments.data.comments,
}))
.page(({ data }) => <Idea idea={data.idea} comments={data.comments} />)
// data is the mapper's shape; queries[0]/queries[1] still hold the raw results
```

This is exactly why the mapper exists for **multiple `.with` queries**: each
query lands at its own index, but a render usually wants one merged object, not
an array of results to thread through by hand.

With no loader and no queries, `data` is the empty object `{}` — the mapper
still runs and its return becomes `data`.

## Combine queries with props

The mapper sees `props` too, so you can fold a value from an upstream
[`.with`](with) (or a [plugin](plugin)) into the same object as your query data:

```tsx
export const ideaNewsPage = ideaLayout.lets
  .page('/news')
  .loader(async ({ params, search }) => {
    /* ... */ return { newsPosts, newsCount, nextCursor }
  })
  .infiniteQuery({
    getNextPageParam: (last) => last.nextCursor,
    initialPageParam: 0,
    pageParamFromInput: '?.page',
  })
  .with(() => ({ idea: ideaLayout.useValue('idea') })) // idea comes from the layout
  .mapper(({ data, props }) => ({
    newsPosts: data.pages.flatMap((page) => page.newsPosts),
    total: data.pages[0]?.newsCount ?? 0, // first page may be empty — guard it
    idea: props.idea, // merge the prop in
  }))
  .head(({ data: { total, idea } }) => `${total} news for idea "${idea.title}"`)
  .page(({ data: { newsPosts, total, idea } }) => (
    <IdeaNews idea={idea} posts={newsPosts} total={total} />
  ))
```

The render now reads one object — query data and the layout's `idea` side by
side — and so does `.head`.

## Where `data` comes from (the self query)

Calling `.mapper` (like `.with` and `.head`) finalizes a page's or component's
own loader into its **self query**. After a `.loader`, that loader's output
becomes `queries[0]` and is what `data` shadows by default:

```tsx
.loader(() => ({ z: 3 }))              // becomes the self query → queries[0]
.with(query, ({ location }) => ({ y: +location.params.y })) // → queries[1]
.mapper(({ data, queries, location }) => ({
  x: queries[1].data.x,        // the injected query
  y: location.params.y,        // route param
  z: data.z,                   // the page's own loader output, via shadowed data
}))
```

So a page with a loader and extra `.with` queries reads its own data through
`data` (the self query) and the injected ones through `queries[1…]`. See
[Page](page) for the self-query model in full.

## Which points have `.mapper`

`.mapper` is a method on the [**mountables**](mountable) — the points that
produce UI:

- [page](page), [layout](layout), [component](component), and
  [provider](provider).

It is **not** on a [query](query), [infinite-query](infinite-query),
[mutation](mutation), or [action](action) — those return data, they don't map it
for a render. It's also off on [root](root) and [plugin](plugin).

On a [provider](provider), the final `.provider(mapperFn)` argument is the same
as a trailing `.mapper` — a shorthand for the common case:

```tsx
export const meProvider = Point0.lets
  .provider()
  .with(({ resolve }) =>
    resolve(getMeQuery.useQuery(), ({ data }) => ({ me: data.me })),
  )
  .provider(({ data: { me }, props: { x } }) => ({ me, x })) // === a trailing .mapper
```

The trailing `.provider(mapperFn)` is also server-ssr-and-client — same as a
`.mapper`: cut from the SERVER bundle when `ssr:false` (or after an earlier
`.clientOnly()`), with its body and imports removed from the server build; kept
in the client build always, and in the server build only when SSR is on.

## Edge cases and gotchas

- **Return an object.** The mapper's return is the new `data`, which must be a
  plain object — not an array, primitive, or `Response`.
- **Synchronous only.** No `async`/`await` — the mapper runs inside `useMemo` at
  render. It transforms already-loaded data; it never fetches.
- **Success only.** The mapper doesn't run during loading or on error, so its
  inputs are always resolved.
- **Keep it pure.** The result is memoized on its inputs (`location`, `props`,
  the previous data, and each `queries[n].data`). Closing over a value outside
  those and the memo can go stale — derive everything from the argument.
- **Guard empty pages.** With an infinite query, `data.pages[0]` can be missing
  on an empty first page — read it as `data.pages[0]?.field ?? fallback`, as the
  news example does.
- **`.mapper` chains.** Declare it more than once and each mapper feeds the
  previous one's output as its `data`, so the last `.mapper` produces the final
  shape. `queries` stays the raw per-query results throughout — only `data`
  advances from one mapper to the next.

## Security

The mapper is cut from the SERVER bundle when `ssr:false` (or after an earlier
`.clientOnly()` in the chain) — its body and the imports it uses are removed
from the server build, where the framework substitutes an identity passthrough.
It's kept in the client build always, and in the server build only when SSR is
on (server-ssr-and-client): it runs on the client always, and on the server only
when SSR is on. Don't put a server-only secret or gate in a mapper: it isn't
guaranteed to run on the server, and on the client it ships to the browser. Gate
access in a [`.with`](with) wrapper instead.
