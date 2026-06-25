---
index: 1200
title: Query client
description:
  How Point0 creates, holds, and shares the TanStack QueryClient — one per SSR
  request, one per tab, dehydrated across the wire.
---

Point0 runs every query and mutation through TanStack Query's `QueryClient`. You
create it once in a tiny module, hand it to React Query's provider, and never
think about it again — Point0 holds it, gives each SSR request its own instance,
and ships its cache to the browser for you.

```tsx
// src/lib/query-client.ts
import { createQueryClient } from '@point0/core'
import { QueryClient } from '@tanstack/react-query'

// Safe on both server and client — each SSR request gets its own instance.
export const queryClient = createQueryClient(() => new QueryClient())
```

```tsx
// src/app.client.tsx
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/query-client'

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <RouterRoutes />
      </Router>
    </QueryClientProvider>
  )
}
```

That's the whole setup. The rest of this page explains what `queryClient` really
is, how to reach it, and how it crosses the SSR boundary.

## `createQueryClient` returns a proxy, not a client

The value you export is **not** a real `QueryClient` — it's a proxy that always
forwards to whichever real client is current:

```tsx
export const queryClient = createQueryClient(() => new QueryClient())
// queryClient is typed as QueryClient, but every method call is delegated, at
// call time, to the active client for the current context.
```

This is the load-bearing design fact. On the server, each request runs in its
own context with its own `QueryClient`; the same
`queryClient.invalidateQueries(...)` line resolves to the right per-request
instance, so one user's data never leaks into another's render. In the browser
there's a single client for the tab, so the proxy always lands on it.

The `init` argument — `() => new QueryClient()` — is the factory Point0 calls to
build each real client. It's **optional**; omit it and Point0 uses a bare
`new QueryClient()`:

```tsx
export const queryClient = createQueryClient() // bare new QueryClient() per context
```

Point0 sets no `defaultOptions` of its own — the defaults are TanStack's. To
tune the client app's defaults (`staleTime`, `retry`, `refetchOnWindowFocus`,
…), pass them to your `new QueryClient({ defaultOptions: { … } })`, or set
per-query defaults higher in the chain with [`.queryOptions`](query) — see
[Query](query).

## The QueryClientProvider is yours to wire

Point0 does not render `QueryClientProvider` for you — `mount()` only mounts the
points and hydrates the store. Wire the provider yourself in `app.client.tsx`,
passing the proxy as `client`:

```tsx
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from '@/lib/query-client'
;<QueryClientProvider client={queryClient}>
  <ReactQueryDevtools initialIsOpen={true} />
  {/* your app */}
</QueryClientProvider>
```

React Query calls methods on the client you give it; because the proxy forwards
each call to the live instance, the provider stays correct across SSR requests
without a fresh provider per request.

## Reaching the client

Most code never touches the client directly — `useQuery`, `fetchQuery`,
`setQueryData`, and the rest live on each [query](query) and
[mutation](mutation) point. When you do need the raw client, you have two
routes.

**The `queryClient` module export.** Import it anywhere — inside a loader, a
component, an event handler — and call TanStack methods on it. Clear the whole
cache on a sign-out or identity change:

```tsx
import { queryClient } from '@/lib/query-client'

await authClient.admin.impersonateUser({ userId: id })
queryClient.clear() // drop every cached query
void navigate('profile', undefined, { replace: true })
```

Pair a raw `invalidateQueries` with a point-scoped predicate to invalidate one
point's queries by hand after a mutation:

```tsx
import { getQueryPredicate } from '@point0/core'

const { idea } = await ideaCreateMutation.fetch({ title, content })
void queryClient.invalidateQueries({
  predicate: getQueryPredicate({ id: ideaListQuery.id }), // every ideaListQuery cache entry
})
ideaViewQuery.setQueryData({ sn: idea.sn }, { idea }) // seed the view cache
```

`getQueryPredicate` is covered in full below.

## Matching cache entries: `getQueryPredicate`

Point0 stores every query under a structured key, so you rarely match by raw
TanStack key. `getQueryPredicate(options)` builds a `(query) => boolean`
predicate from a point's identity instead — drop it into any TanStack call that
takes one (`invalidateQueries`, `removeQueries`, `getQueryCache().findAll`, …):

```tsx
import { getQueryPredicate } from '@point0/core'

// Every cache entry belonging to one point
queryClient.getQueryCache().findAll({
  predicate: getQueryPredicate({ id: ideaListQuery.id }),
})
```

It only ever matches Point0's own queries (entries keyed under `'point0'`);
plain TanStack queries you registered yourself are skipped. Every option you
pass is an **AND** filter — omit an option and it's ignored. The fields mirror a
point's identity:

| Option       | Matches                                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------ |
| `id`         | the point id `<scope>:<type>:<name>` — pass `somePoint.id`, the cleanest way to target one point |
| `scope`      | the point's scope (e.g. `'root'`)                                                                |
| `type`       | the point type (`'query'`, `'page'`, …)                                                          |
| `name`       | the point name                                                                                   |
| `tags`       | the point's [tags](query) — see below                                                            |
| `mode`       | `'server'` or `'client'` query mode                                                              |
| `finiteness` | `'finite'` or `'infinite'` (an [infinite query](infinite-query))                                 |
| `output`     | the fetch output type the cache entry holds                                                      |

`tags` accepts three shapes: a single string matches entries carrying that tag;
an **array** matches only entries that carry **all** of them; a function
`(tags: string[]) => boolean` lets you decide:

```tsx
getQueryPredicate({ tags: 'my-tag' }) // has 'my-tag'
getQueryPredicate({ tags: ['a', 'b'] }) // has BOTH 'a' and 'b'
getQueryPredicate({ tags: (tags) => tags.includes('a') })

// Combine identity filters — AND across options
getQueryPredicate({
  scope: 'root',
  type: 'query',
  name: 'ideaList',
  mode: 'client',
})
```

For matching mutations rather than queries, there's a parallel
`getMutationPredicate` with the same `id` / `scope` / `type` / `name` / `tags`
options, returning a `(mutation) => boolean` predicate for the mutation cache.

**`getQueryClient()`** returns the **real** current client (not the proxy) for
the active context:

```tsx
import { getQueryClient } from '@point0/core'

const client = getQueryClient() // the live QueryClient for this request / tab
```

It takes no arguments and always resolves the ambient client. It's part of the
public `@point0/core` surface — the `queryClient` proxy covers most app code,
but `getQueryClient()` is the way to get the real client when you need one.

**Don't call `queryClient` at module top level on the server.** The proxy
resolves against the active request context, which only exists inside a server
run. Use it inside loaders, components, hooks, and handlers — never at import
time.

## Targeting a specific client: `{ queryClient }`

Every imperative cache and fetch helper on a query or mutation takes a trailing
options object with an optional `queryClient`:

```tsx
await ideaQuery.fetchQuery({ id }, undefined, { queryClient: someOtherClient })
ideaQuery.invalidateQuery({ id }, undefined, { queryClient: someOtherClient })
const m = ideaCreateMutation.getMutationCache(
  { id: 7 },
  { queryClient: someOtherClient },
)
```

When you omit it — the normal case — the helper uses the ambient global client,
which the proxy already resolves to the correct per-request (server) or
singleton (client) instance:

```tsx
await ideaQuery.fetchQuery({ id }) // uses the ambient client — what you want almost always
```

So `{ queryClient }` is an escape hatch: pass it only when you already hold a
second client and need to act on _that_ one (a manual multi-client setup, or
hand-rolled SSR control). Build the second `QueryClient` yourself and thread it
through.

## One client per request, one per tab

The isolation that makes the proxy safe comes from _where_ the real client
lives.

**Server: one `QueryClient` per request.** Each incoming request gets a fresh
client from your `init` factory, so caches never mix across users. A nested or
recursive server fetch _reuses_ the parent request's client, so the inner run
shares the same cache instead of starting cold.

**Client: one shared `QueryClient` per tab.** There's a single client for the
whole browser session, so the proxy resolves to the same instance everywhere —
which is exactly what `QueryClientProvider client={queryClient}` needs.

**Multiple apps share one proxy.** Even with several mounted apps (different
scopes, e.g. an admin app and a public app on one server), you keep a single
`createQueryClient()` module. The proxy resolves the right underlying client per
context; you don't create a distinct `QueryClient` per scope. Isolation is by
context, not by separate proxy modules.

## SSR: dehydrate on the server, hydrate on the client

The server renders with its request-scoped client, serializes the client's cache
into the HTML, and the browser rehydrates it — so the first paint already has
the data and the client doesn't refetch what the server already fetched.

You write none of this. The client is registered with Point0's store as a
transferable item, so it rides along automatically: the server injects
`window.__POINT0_DEHYDRATED_SUPER_STORE__` into the page, and `mount()` reads it
back and hydrates on first access. See [SSR](ssr) and the [SsrStore](ssr-store)
for the transport mechanics.

Two Point0-specific things happen during that roundtrip:

**Errors are projected for the wire.** Errors sitting in the cache (a failed
query) are serialized before they cross to the browser — the **public**
projection in production, the **private** one in development, where the
developer is the audience. This means a production client never receives a
server stack trace or private error fields. See
[Error handling](error-handling).

**Hydrated data is treated as fresh.** On hydration Point0 rewrites the cache
timestamps to "now", so data that arrived with the HTML isn't immediately
considered stale and refetched on mount.

When a page is prefetched via the `pageDehydratedState` policy, the dehydrated
cache is narrowed to just that page's snapshot, and a re-prefetch from a
still-fresh snapshot reads the _current_ store rather than resurrecting a query
the user removed in the meantime (e.g. `getMe` after sign-out). Those prefetch
policies live under [navigation](navigation) (and [SSR](ssr)).

## Security: the dehydrated cache is public

When SSR is enabled Point0 server-renders the first page load; only _after_ that
first render does navigation between pages go client-side (SPA-style). Either
way, whatever the server puts in the cache and dehydrates is serialized into the
page and visible in the browser. Don't cache secret data on the server expecting
it to stay there — it ships to the client. Gate access in a [`.with`](with)
wrapper (and resolve server-side identity in [`.ctx`](ctx) for loaders), and let
the error projection above keep private error detail off the wire.

## Reference

### `createQueryClient(init?)`

```tsx
createQueryClient(init?: () => QueryClient) // => QueryClient (a proxy)
```

- `init` — optional factory for each real client. Provided once, it overrides
  the default `() => new QueryClient()`. You cannot replace a _built_ client
  instance later (the item is read-only); you only replace the factory, and only
  by calling `createQueryClient` again.
- Returns the proxy. Use it as `queryClient` everywhere, including as the
  `QueryClientProvider client` prop.

### `getQueryClient()`

```tsx
getQueryClient() // => QueryClient (the real current client)
```

Returns the live client for the active context. No arguments. Only valid inside
a server run or in the browser — not at module top level on the server.

### `getQueryPredicate(options)` / `getMutationPredicate(options)`

```tsx
getQueryPredicate(options) // => (query: Query) => boolean
getMutationPredicate(options) // => (mutation: Mutation) => boolean
```

Build a predicate that matches Point0's own cache entries by point identity, for
any TanStack call that takes a `predicate`. Options (all optional,
AND-combined): `id` (`<scope>:<type>:<name>`), `scope`, `type`, `name`, `tags`
(string · all-of array · `(tags) => boolean`). `getQueryPredicate` additionally
takes `mode` (`'server'`/`'client'`), `finiteness` (`'finite'`/`'infinite'`),
and `output`. Non-Point0 entries never match. See
[Matching cache entries](#matching-cache-entries-getquerypredicate).

### The `{ queryClient }` option

Accepted on the imperative cache/fetch helpers of every [query](query) and
[mutation](mutation) — `fetchQuery`, `prefetchQuery`, `ensureQueryData`,
`getQueryData`, `setQueryData`, `refetchQuery`, `invalidateQuery`,
`cancelQuery`, `removeQuery`, `resetQuery`, `getQueryState`, `getQueryCache`,
`getQueriesCache`, `getQueryKey`'s siblings, their infinite-query mirrors, and
the mutation cache accessors (`getMutationCache`, `getMutationsCache`,
`fetchMutation`). Always optional; defaults to the ambient client. The position
varies by method — it's a member of the **trailing options object**, not a
positional argument (see the method tables on [Query](query) and
[Mutation](mutation)).

### The global item

The client lives in Point0's store under the name `__POINT0_QUERY_CLIENT__`. You
normally reach it through the `queryClient` proxy or `getQueryClient()`; the raw
item is an advanced surface. It is **read-only**: you can swap the factory but
not `.set` a client instance, which is what keeps per-request isolation intact.
