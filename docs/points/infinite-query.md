---
index: 700
title: Infinite Query
description:
  A query that loads in pages — cursor or offset pagination, one loader per
  page, with the full TanStack infinite cache.
---

An infinite query is a [query](query) that loads its data page by page. You
write one loader that returns a single page; Point0 turns it into a standard
TanStack
[`useInfiniteQuery`](https://tanstack.com/query/latest/docs/framework/react/reference/useInfiniteQuery)
with a page cache, `fetchNextPage`, and `hasNextPage`. It's the real react-query
infinite query — the closing `.infiniteQuery({...})` takes the same options
you'd pass `useInfiniteQuery` (`getNextPageParam`, `initialPageParam`,
`maxPages`, `staleTime`, …). You finalize it with `.infiniteQuery(options)`
instead of `.query()`, and the one Point0-specific addition is
`pageParamFromInput`, which tells Point0 where the page cursor lives in the
input.

```tsx
import { root } from '@/lib/root'
import { z } from 'zod'

export const ideaListQuery = root.lets
  .infiniteQuery()
  .input(
    z.object({ cursor: z.number().optional(), limit: z.number().default(20) }),
  )
  .loader(async ({ input: { cursor, limit } }) => {
    // runs on the server — one page per call
    const ideas = await prisma.idea.findMany({
      take: limit + 1,
      orderBy: { sn: 'desc' },
      where: cursor ? { sn: { lte: cursor } } : {},
    })
    return { ideas, nextCursor: ideas[limit]?.sn } // nextCursor undefined → last page
  })
  .infiniteQuery({
    getNextPageParam: (lastPage) => lastPage.nextCursor, // undefined ⇒ no more pages
    initialPageParam: undefined,
    pageParamFromInput: 'cursor', // the cursor lives at input.cursor
  })
```

Where each call ends up: `.input` and `.loader` are cut from the client bundle —
their bodies and the imports they use are removed, so this code never ships to
the browser (it runs on the server). `.infiniteQuery({...})` is the closer and
is not cut from either bundle — kept in both (isomorphic), so its options
(`getNextPageParam`, `pageParamFromInput`, …) ship to the client too.

```tsx
// anywhere in a component:
const query = ideaListQuery.useInfiniteQuery()
const ideas = query.data?.pages.flatMap((page) => page.ideas) ?? []
// query.fetchNextPage(), query.hasNextPage, query.isFetchingNextPage
```

## Finite vs infinite

A finite [query](query) is one request, one result. An infinite query is many
requests of the same shape stitched into a list. The chain is identical up to
the finalizer:

```tsx
.loader(/* ... */).query()         // finite: data is one page
.loader(/* ... */).infiniteQuery() // infinite: data is { pages, pageParams }
```

The differences, all driven by that last call:

- **The loader contract is the same.** One server `.loader` (or `.clientLoader`)
  that returns one plain page object. It must not return a `Response` — a
  standalone infinite query (or action) throws a type error
  `InfiniteQuery can not return response.` if it does; on a mountable point
  (page/layout/component/provider) the same guard reports
  `Query can not return response.`
- **The result shape differs.** `useQuery` gives you the page directly;
  `useInfiniteQuery` gives you `InfiniteData<page>` —
  `{ pages: page[], pageParams: param[] }`.
- **`.infiniteQuery` needs three options** — `getNextPageParam`,
  `initialPageParam`, and Point0's `pageParamFromInput` — where a finite
  `.query()` takes an optional options object and can be called with nothing.
- **The cache key differs by one field.** The key carries
  `finiteness: 'infinite'` instead of `'finite'`; everything else is the same.
  So the same point fetched as a finite query and as an infinite query produces
  two separate cache entries — they never collide.

Every cache/fetch helper has an infinite twin: `fetchInfiniteQuery` for
`fetchQuery`, `invalidateInfiniteQuery` for `invalidateQuery`, and so on.

## Declaring an infinite query

Open with `.infiniteQuery()`, declare input and a loader, close with
`.infiniteQuery(options)`:

```tsx
export const ideaListQuery = root.lets
  .infiniteQuery() // open
  .input(z.object({ cursor: z.number().optional() }))
  .loader(async ({ input }) => loadPage(input))
  .infiniteQuery({
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
    pageParamFromInput: 'cursor',
  })
```

Input, validation, `.loader` / `.clientLoader`, `.ctx`, and the endpoint rules
all work exactly as on a finite [query](query) — see that page for the shared
mechanics. The rest of this page is what's specific to infinite.

Stripping is the same as on a finite query: `.input`, `.loader`, and `.ctx` are
cut from the client bundle — their bodies and the imports they use are removed,
so they never ship to the browser; while `.clientLoader` is cut from the server
bundle — body and its imports removed (it runs in the browser regardless of
SSR). The `.infiniteQuery({...})` closer itself is not cut from either bundle —
kept in both (isomorphic).

## The three finalizer options

`.infiniteQuery({...})` is just the
[`useInfiniteQuery`](https://tanstack.com/query/latest/docs/framework/react/reference/useInfiniteQuery)
options object — every native react-query infinite option passes straight
through. Three of them are required: two are TanStack's own (`getNextPageParam`,
`initialPageParam`), and one is Point0's (`pageParamFromInput`). Pass `{}` and
you get a type error naming the missing fields — `.infiniteQuery` is one
signature, not overloads, so the error points at the real gap instead of "no
overload matches":

```tsx
.infiniteQuery({}) // type error: getNextPageParam / initialPageParam / pageParamFromInput missing
```

### getNextPageParam

Returns the page param for the **next** page from the last loaded page. Return
`undefined` to say "there are no more pages" — that's what sets `hasNextPage` to
`false`.

```tsx
getNextPageParam: (lastPage) => lastPage.nextCursor // typed as your loader's return
```

`lastPage` is one page — the exact type your loader returns. This is TanStack's
own option; offset and cursor pagination both work, you just compute the next
param from whatever the last page carries.

Backward pagination (`getPreviousPageParam` / `fetchPreviousPage`) is part of
TanStack's options and passes straight through.

### initialPageParam

The page param for the very first page. Use `0` for offset pagination, or
`undefined` for cursor pagination that starts with no cursor:

```tsx
initialPageParam: 0 // offset: start at page 0
initialPageParam: undefined // cursor: no initial cursor
```

### pageParamFromInput

This one is Point0-specific and **required**. Native `useInfiniteQuery` keeps
the page param separate from the query; Point0 has a single typed `input` per
query, so it needs to know where in that input the page param goes. It's the
bridge between TanStack's `pageParam` and your loader's input.

Two forms. A string path points at the field that holds the cursor:

```tsx
pageParamFromInput: 'cursor' // input.cursor
pageParamFromInput: 'page' // input.page
```

Or an explicit get/set pair for nested or computed placement:

```tsx
pageParamFromInput: {
  get: ({ input, get }) => get(input, 'cursor'),
  set: ({ input, value, set }) => set(input, 'cursor', value),
}
```

The string form supports dotted paths; `get`/`set` receive Point0's path
helpers, which also understand dotted paths and array indices.

**How it resolves at fetch time.** For each page the value used is
`pageParam ?? <value read from input>`. After the first page, the param from
`getNextPageParam` drives the loader. On the first page `pageParam` is
`initialPageParam`; when that is nullish (e.g. `undefined` for cursor
pagination), the value already in the input is used instead. The chosen value is
written back into the input before the loader runs. A practical consequence:
with `initialPageParam: undefined`, a deep link to `?cursor=500` reads its first
page straight from the input.

## Mountable-embedded: a mountable that paginates itself

Any [mountable](page) — a [page](page), [layout](layout),
[component](component), or [provider](provider) — with a loader is itself a
query, and is **finite by default**. Finalize that self query with
`.infiniteQuery({...})` after its loader instead of leaving the loader plain,
and the mountable paginates its own data. This is not special to pages: the same
`.loader` → `.infiniteQuery({...})` close works on any of the four. A mountable
has no `.input` — it uses `params` and `search` — so the cursor lives in the
search params, and you reach it with the `?.` prefix:

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
    const ideas = await prisma.idea.findMany({
      take: limit,
      skip: page * limit,
    })
    const ideasCount = await prisma.idea.count()
    const nextCursor = ideasCount > (page + 1) * limit ? page + 1 : undefined
    return { ideas, ideasCount, nextCursor }
  })
  .infiniteQuery({
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
    pageParamFromInput: '?.page', // ?. = the page's search-params namespace
  })
  .mapper(({ data }) => ({
    ideas: data.pages.flatMap((page) => page.ideas), // data is InfiniteData here
    total: data.pages[0].ideasCount,
  }))
  .page(({ data: { ideas, total }, queries: [query] }) => (
    <div>
      <h1>{total} ideas</h1>
      {ideas.map((idea) => (
        <IdeaCard key={idea.id} idea={idea} />
      ))}
      {query.hasNextPage && (
        <button
          disabled={query.isFetchingNextPage}
          onClick={() => query.fetchNextPage().catch(console.error)}
        >
          Load more
        </button>
      )}
    </div>
  ))
```

Two things to note in `.mapper` and `.page`: the `data` you receive is the
`InfiniteData` itself (so `data.pages.flatMap(...)`, not a single page), and the
finalized infinite query shows up in `queries` — `queries: [query]` — so you can
drive `fetchNextPage` from the render. Under SSR, Point0 reads
`finiteness: 'infinite'` from the key and prefetches the page as an infinite
query automatically — you wire nothing.

Where each call ends up here: `.search` (and `.params`) on a mountable is not
cut from either bundle — kept in both (isomorphic) — so navigation can build the
query input in the browser. `.loader` is cut from the client bundle — its body
and the imports it uses are removed, so it never ships to the browser (it runs
on the server). `.mapper` and the `.page` body are cut from the SERVER bundle
when `ssr:false` (or after a `.clientOnly()` earlier in the chain) — their
bodies and imports are then removed from the server build; kept in the client
build always, and in the server build only when SSR is on.
`.infiniteQuery({...})` is not cut from either bundle — kept in both
(isomorphic).

An [action](action) can also be finalized with `.infiniteQuery({...})`. It needs
a server loader — without one it throws
`Point has no server loader. Please add .loader() before calling .infiniteQuery() to finalize action`.

## Using the result

`useInfiniteQuery` returns TanStack's infinite result, typed to your loader's
page:

```tsx
const query = ideaListQuery.useInfiniteQuery() // input optional when all keys are optional
const query = ideaListQuery.useInfiniteQuery({ authorSn }) // with input
const query = ideaListQuery.useInfiniteQuery(undefined, { staleTime: 0 }) // 2nd arg = options

query.data?.pages // page[] — each is one loader return
query.data?.pages.flatMap((p) => p.items) // the flat list you usually render
query.data?.pages.at(-1) // the last loaded page
query.hasNextPage // false once getNextPageParam returns undefined
query.fetchNextPage() // load the next page
query.isFetchingNextPage // true while a next page is loading
query.isLoading / query.error // first-load and error states
```

A "Load more" button is the common shape: show it while `hasNextPage`, disable
on `isFetchingNextPage`, call `fetchNextPage` on click (see the page-embedded
example above).

## Invalidating from a mutation

After a [mutation](mutation) changes the underlying data, invalidate the
infinite query so it refetches. The infinite helper is
`invalidateInfiniteQuery`:

```tsx
export const addIdeaMutation = root.lets
  .mutation()
  .input(z.object({ title: z.string() }))
  .loader(async ({ input }) => ({ ideaId: await createIdea(input) }))
  .mutation({
    onSuccess: async ({ ideaId }) => {
      void ideaListPage.invalidateInfiniteQuery() // refetch the list
    },
  })
```

Like the finite helpers, the infinite cache helpers are **exact-key**: they
target the precise input you pass. To match many inputs at once, use
`getInfiniteQueriesCache(true)` or a predicate.

## Reference

### `.infiniteQuery(options)`

A **finalizer** — terminal in the chain, like `.query()`. It applies to three
point kinds:

- a standalone **infinite query** point (`root.lets.infiniteQuery()…`);
- a **mountable** point ([page](page), [layout](layout), [component](component),
  [provider](provider)) — finalizes that point's own self query as infinite;
- an [action](action) — finalizes the action as an infinite query (server loader
  required).

It requires a loader. On a loader-less point it's a type error
(`…has no loaders. Please add .loader() or .clientLoader()…`); on an
already-finalized point it's a type error (`…already finalized`).

The closer is not cut from either bundle — kept in both (isomorphic) in all
three cases. (Note: on an **action**, `.input`/`.params`/`.search` are cut from
the client bundle — body and imports removed, never shipped to the browser —
whereas on a mountable they're kept in both bundles (isomorphic); this only
affects the stage-methods, not the `.infiniteQuery` closer.)

### Options

`.infiniteQuery({...})` takes TanStack's native `useInfiniteQuery` options
(minus `queryFn` / `queryKey`, which Point0 generates) plus the required
`pageParamFromInput`.

| Option                                                           | Required | What                                                                 |
| ---------------------------------------------------------------- | -------- | -------------------------------------------------------------------- |
| `getNextPageParam`                                               | yes      | `(lastPage) => nextParam \| undefined` — `undefined` ends pagination |
| `initialPageParam`                                               | yes      | the page param for the first page                                    |
| `pageParamFromInput`                                             | yes      | string path, or `{ get, set }` — where the cursor lives in the input |
| `staleTime`, `gcTime`, `retry`, `select`, lifecycle callbacks, … | no       | any native TanStack infinite option, passes through                  |

Lifecycle callbacks (`onSuccess` / `onError` / `onSettled`) from multiple layers
are **chained, not overwritten** — each runs in order.

### Defaults and precedence

Set infinite defaults with `.infiniteQueryOptions(...)` on the root or a base
(partial, so `pageParamFromInput` is optional there). For one query, options
resolve lowest-to-highest:

1. root/base `.queryOptions(...)`
2. root/base `.infiniteQueryOptions(...)`
3. the closing `.infiniteQuery({...})`
4. the call-site options on `useInfiniteQuery` / `fetchInfiniteQuery` / …

`.infiniteQueryOptions(...)` and `.queryOptions(...)` are option setters —
they're not cut from either bundle, kept in both (isomorphic) like the closer
itself.

On the **server**, Point0 hard-overrides retry/refetch/`staleTime` the same way
it does for finite queries (a server render fetches once). See
[Query → Defaults](query) and [stage-methods](stage-methods).

### Method surface

Each helper takes the **input** first and a trailing `options` object
(`{ queryClient?, fetchOptions?, outputType? }`, members varying by method). For
a client-loader-only infinite query only the server-fetch trio (`fetchServer`,
`fetchServerDetailed`, `getFetchServerOptions`) drops off; `fetch`,
`useInfiniteQuery`, and the cache/fetch helpers all stay.

| Method                    | Signature                                      | Returns                             |
| ------------------------- | ---------------------------------------------- | ----------------------------------- |
| `useInfiniteQuery`        | `(input?, infiniteOptions?, options?)`         | TanStack infinite result            |
| `fetchInfiniteQuery`      | `(input?, infiniteOptions?, options?)`         | `Promise<InfiniteData>`             |
| `prefetchInfiniteQuery`   | `(input?, infiniteOptions?, options?)`         | `Promise<void>`                     |
| `ensureInfiniteQueryData` | `(input?, infiniteOptions?, options?)`         | `Promise<InfiniteData>`             |
| `getInfiniteQueryData`    | `(input?, options?)`                           | `InfiniteData \| undefined`         |
| `setInfiniteQueryData`    | `(input?, updater, setDataOptions?, options?)` | the new page (single page)¹         |
| `refetchInfiniteQuery`    | `(input?, refetchOptions?, options?)`          | `Promise<void>`                     |
| `invalidateInfiniteQuery` | `(input?, invalidateOptions?, options?)`       | `Promise<void>`                     |
| `cancelInfiniteQuery`     | `(input?, cancelOptions?, options?)`           | `Promise<void>`                     |
| `removeInfiniteQuery`     | `(input?, options?)`                           | `void`                              |
| `resetInfiniteQuery`      | `(input?, resetOptions?, options?)`            | `Promise<void>`                     |
| `getInfiniteQueryState`   | `(input?, options?)`                           | TanStack query state `\| undefined` |
| `getInfiniteQueryCache`   | `(input?, options?)`                           | the `Query \| undefined`            |
| `getInfiniteQueriesCache` | `(input \| predicate \| true, options?)`       | `Query[]`                           |
| `getInfiniteQueryOptions` | `(input?, infiniteOptions?, options?)`         | fully built infinite options        |
| `getInfiniteQueryKey`     | `(input?, options?)`                           | the infinite `QueryKey` tuple       |
| `getQueryKey`             | `(input?, options?)`                           | the finite `QueryKey` tuple         |

¹ `setInfiniteQueryData`'s updater and return are currently typed as a single
page (`Updater<page, page>`), not `InfiniteData<page>` — a known typing rough
edge. The cache entry it writes is an `InfiniteData`, so an updater typed
against `{ pages, pageParams }` will fight the declared type until this is
fixed.

### The infinite query key

An infinite read sits in its own cache entry, keyed with
`finiteness: 'infinite'`. The tuple is the same two-element shape as a finite
[query](query)'s, with that one field flipped:

```tsx
// the infinite cache entry's key:
// [ 'point0', { scope, type, name, mode, finiteness: 'infinite', tags, output, input } ]
```

Only `finiteness` differs from the finite key — which is exactly why a finite
and an infinite read of the same point sit in separate cache entries and never
collide. The `input` is serialized deterministically; for page/layout infinite
queries, only declared `.search` keys survive into the key. Full key mechanics
are on the [Query](query) page.

Two key getters sit on the typed surface: `getInfiniteQueryKey` returns the
**infinite** key (`finiteness: 'infinite'`) — the one for this point's cache
entry — and `getQueryKey` returns the **finite** key, for matching a finite read
of the same point. Pass the same input to either. The infinite helpers
(`invalidateInfiniteQuery`, `getInfiniteQueriesCache`, …) target the infinite
entry without building a key by hand.

### Events

An infinite query emits its own lifecycle events around the fetch —
`pointInfiniteQueryStart`, `pointInfiniteQuerySettled`,
`pointInfiniteQuerySuccess`, `pointInfiniteQueryError` — distinct from the
finite `pointQuery*` events. See [Events](events).

### Other native options pass straight through

The option layers are merged and spread onto the final `useInfiniteQuery`
options without a key whitelist, so native TanStack options Point0 doesn't name
explicitly — `maxPages`, `select`, `structuralSharing`, and so on — flow through
unchanged. Point0 only overrides `queryKey` / `queryFn` (it generates those)
and, on the server, the retry/refetch/`staleTime`/`gcTime` fields. A non-default
`outputType` (passed in the trailing `options`) is honored as well.
