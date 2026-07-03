---
index: 1000
title: Root
description:
  The point you build everything from — the server entry point and the holder of
  defaults for every point beneath it.
---

A root is the point every other point grows from. It's the only point created
straight from `Point0` instead of inherited, it's the server's entry point, and
it holds the defaults — server and client URLs, the data transformer, the error
class, prefetch policies, query options, loading and error UI — that every page,
layout, query, and mutation below it inherits.

```tsx
import { Point0 } from '@point0/core'
import { zodSchemaHelper } from '@point0/core/schema/zod'
import superjson from 'superjson'
import { AppError } from '@/lib/error'
import { sharedEnv } from '@/lib/env/shared'

export const root = Point0.lets
  .root() // open
  .serverUrl(sharedEnv.SERVER_URL)
  .clientUrl(sharedEnv.CLIENT_URL)
  .transformer(superjson)
  .schemaHelper(zodSchemaHelper())
  .errorClass(AppError)
  .prefetchPageOnNavigate('pageDehydratedStateAndClientQuery')
  .prefetchPageOnLinkHover('pageDehydratedStateAndClientQuery')
  .queryOptions({
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  })
  .loading(() => <Spinner />)
  .error(({ error }) => <ErrorScreen error={error} />)
  .root() // close
```

Every other point is then opened off this `root` — `root.lets.page(...)`,
`root.lets.query(...)`, and so on — and inherits everything set here.

## Declaring a root

A root opens with `.lets.root()` and closes with `.root()` — same as every
point, "what you open it with, you close it with". While the chain is open it's
a `StagePoint` and every default-setter is available; the closing `.root()`
turns it into the finalized `ReadyPoint` that children grow from — the
stage-methods are gone, leaving the ready surface (`.lets`, `.id`, `.point`, …).
The closing `.root()` is server-and-client — not cut from either bundle, kept in
both (isomorphic). See [points](points) for the stage-method / ready-method
split and the `.lets` notation.

```tsx
export const root = Point0.lets.root().root()

Point0.lets('root', 'app') // a root named 'app'
```

The name `'plugin'` is reserved — `Point0.lets('root', 'plugin')` throws,
because that scope is used internally for [plugin](plugin) points.

A root holds no data of its own — it has **no** `.loader`, `.clientLoader`,
`.mapper`, or `.params`. It sets defaults and (on the server) mounts middleware;
everything else is for the points below it.

## Server and client URLs

`.serverUrl` is the origin the server uses to resolve absolute routes — where
`query.fetchQuery(...)` sends its request, and what `route.abs()` returns when
there's no browser `location`:

```tsx
.serverUrl('https://app.example.com')
// action.route.abs() // => "https://app.example.com/api/..."
```

On the server, `serverUrl` is required: without it, `route.abs()` throws
`origin for route /api/x is not set`.

`.clientUrl` is the public origin pages live on, for when it differs from
`serverUrl` — split dev ports, a native shell, or a CDN in front. Page and
layout routes resolve against `clientUrl`; **action (API) routes always use
`serverUrl`**, because the API lives on the server:

```tsx
.serverUrl(sharedEnv.SERVER_URL) // API origin
.clientUrl(sharedEnv.CLIENT_URL) // page origin
```

The split is by route kind, not by runtime side — so server-rendered and
client-rendered hrefs come out identical. Without `clientUrl`, pages fall back
to `serverUrl`.

`.serverUrl` and `.clientUrl` are server-and-client — not cut from either bundle
(they configure URL resolution on either side).

## The transformer

`.transformer` sets how input and loader data are serialized over the wire — the
same idea as tRPC's transformer. It runs both ways: query input on send/receive,
and the data loaders return.

```tsx
import superjson from 'superjson'

.transformer(superjson) // Date, Map, Set, BigInt survive the round-trip
```

The transformer needs `{ serialize, deserialize }`. Without one, the default is
a plain pass-through (raw JSON). With superjson set, special types are also
encoded into the [query key](query). Details on [Transformer](transformer).

`.transformer` is server-and-client — not cut from either bundle (it runs on
both sides: serialize on send, deserialize on receive).

## The schema helper

`.schemaHelper` teaches Point0 about your validation library, mainly for
[OpenAPI](openapi) generation and a few search-param edge cases. It's optional —
validation already works through Standard Schema:

```tsx
import { zodSchemaHelper } from '@point0/core/schema/zod'

.schemaHelper(zodSchemaHelper())
```

Helpers ship as subpath exports: `@point0/core/schema/zod`, `/valibot`, `/yup`,
`/arktype`, `/typebox`, `/superstruct`. You can call `.schemaHelper` more than
once to register several — the calls accumulate. A falsy argument is a no-op
that keeps the existing helpers, not a reset. More in [Validation](validation).

`.schemaHelper` is server-and-client — not cut from either bundle (validation
runs on both sides).

## The error class

`.errorClass` sets the error type for the whole tree. It's the one method that
re-types errors everywhere below: after it, `.error(({ error }) => …)`,
`.on('error', …)`, and `result.error` all see your class instead of the default
`ErrorPoint0`:

```tsx
import { AppError } from '@/lib/error' // your own error class

.errorClass(AppError)
```

Without `.errorClass` the default is `ErrorPoint0`. You can replace it with any
class of the same-or-wider shape — a constructor taking
`(message, { cause?, status?, code?, redirect?, response?, headers?, meta? })`
plus static `from`, `serializePublic`, and `serializePrivate`. How you build
that class is up to you; [Error0](error-handling) is one way, but it's optional.
Full surface on [Error handling](error-handling).

`.errorClass` is server-and-client — not cut from either bundle (errors are
raised, serialized, and rendered on both sides).

## Prefetch policies

The root sets how pages are prefetched. Three setters:

```tsx
.prefetchPageOnNavigate('serverAndClientQuery') // when a navigation starts
.prefetchPageOnLinkHover('serverQuery', 200) // on link hover, after 200ms
.prefetchPagePolicy('serverAndClientQuery') // sets both at once
```

The policy is one of `'serverQuery'`, `'clientQuery'`, `'serverAndClientQuery'`,
`'pageDehydratedState'`, `'pageDehydratedStateAndClientQuery'`,
`'onPrefetchOnly'`, `'none'`, or `false` (which means `'none'`). The optional
second argument on the hover setters is a debounce in milliseconds. Set these on
the root and override them per page or per link.

Costs differ: `pageDehydratedStateAndClientQuery` is the most reliable but the
most expensive (it runs a full SSR render). The policies live on
[Navigation](navigation) (and [SSR](ssr)).

All three setters are **client-only** — cut from the server bundle, body and its
imports removed (navigation and link-hover prefetch are browser behaviours).
`.prefetchPagePolicy` just sets the other two at once, so it's cut the same way.

## Query option defaults

`.queryOptions` sets default TanStack Query options for every query beneath the
root. It accumulates across calls and can be overridden at query creation and at
each call site:

```tsx
.queryOptions({
  retry: false,
  refetchOnWindowFocus: false,
  staleTime: 60_000,
})
```

There are type-specific siblings too — `.pageQueryOptions`,
`.componentQueryOptions`, `.layoutQueryOptions`, `.providerQueryOptions`,
`.pageDehydratedStateQueryOptions`, `.infiniteQueryOptions`, `.mutationOptions`,
`.fetchOptions` — each merging into its own slot. On the **server**, Point0
hard-overrides a few of these (`retry: false`, no refetch,
`staleTime`/`gcTime: Infinity`) since a server render fetches once. See
[Query](query) for precedence and [stage-methods](stage-methods) for the full
list.

`.queryOptions` and its whole `*QueryOptions` family, plus `.mutationOptions`
and `.fetchOptions`, are server-and-client — not cut from either bundle
(query/mutation options are applied on both sides).

## Events and logging

`.on` subscribes to runtime events on both sides; `.serverOn` and `.clientOn`
narrow to one side. The `'error'` shorthand subscribes to every error event —
this is where app-wide error logging goes:

```tsx
.on('error', ({ side, name, error, meta }) => {
  console.error({ ...meta, side, name, error })
})
```

Each callback gets `{ side, name, data, error, meta }`. `error` is set on error
events; `meta` is the log-friendly projection (points become ids, requests
become `{ method, path }`, errors are serialized) — log `meta`, not the raw
`data`. Full event list and the server/client split on [Events](events).

Strip categories differ by setter. `.on` is server-and-client — not cut from
either bundle (it subscribes on both sides). `.serverOn` is server-only — cut
from the client bundle: its body and the imports it uses are removed, so it
never ships to the browser (it runs only on the server). `.clientOn` is
client-only — cut from the server bundle (it runs only in the browser).

## Loading and error UI

The root holds the fallback loading and error components for every point below
it that renders UI. On a root, `.loading` and `.error` each set the fallback for
pages, layouts, and components at once:

```tsx
.loading(() => <Spinner />)
.error(({ error }) => <ErrorScreen error={error} />)
```

The error component receives the (possibly custom) error instance, so with
`.errorClass(AppError)` set, `error` is an `AppError`. There are granular
siblings — `.pageLoading` / `.pageError`, `.layoutLoading` / `.layoutError`,
`.componentLoading` / `.componentError` — for one slot at a time. Start0 uses
`.componentError` to give in-component errors a different look from page errors:

```tsx
.error(({ error }) => <ErrorPageComponent error={error} />)
.componentError(({ error }) => <ErrorComponent error={error} />)
```

Any point below can override these. Full rules in
[Loading & error](loading-error).

`.loading` and `.error` — and their granular siblings
(`.pageLoading`/`.pageError`, `.layoutLoading`/`.layoutError`,
`.componentLoading`/`.componentError`) — are server-ssr-and-client: cut from the
SERVER bundle when `ssr: false` (or after a `.clientOnly()` earlier in the
chain) — body and imports removed from the server build; kept in the client
build always, and in the server build only when SSR is on.

The error component renders on the server during the initial SSR pass, so watch
what it exposes: if it prints `error.stack`, the stack ends up in the
server-rendered HTML. The default error component hides the stack in production;
if you write your own, render the stack only on the client by wrapping it in
`<ClientOnly>`, so it never reaches the SSR output. The basic root does this.

## The global head

`.head('global', fn)` sets the document head for the whole app shell. Unlike a
point's own `.head`, the global head runs on every page state and reads
`{ status, loading, error }` rather than a point's loaded data — so you can
drive the `<title>` from the app's loading/error state:

```tsx
.head('global', ({ loading, error }) => ({
  ...(loading ? { title: 'Loading...' } : {}),
  ...(error ? { title: error.message } : {}),
  titleTemplate: '%s | IdeaNick',
  htmlAttrs: { lang: 'en' },
}))
```

The return is an [unhead](head) object (or a bare string treated as the title).
Flat SEO keys (`description`, `ogTitle`, …) and `canonical` are supported and
win over an explicit `meta` entry for the same tag. Details on [Head](head).

`.head` is server-ssr-and-client — cut from the SERVER bundle when `ssr: false`
(or after a `.clientOnly()` earlier in the chain); kept in the server build when
SSR is on, so the document head is server-rendered.

## Middleware — the server entry point

The root is also the server's entry point: `.middleware` mounts server-side
handlers. Because the root _is_ the entry, its middleware chain is the request
pipeline itself — it runs for every incoming request, even on a root with no
pages or queries. This is rarely needed for your own code, but it's how
third-party handlers — better-auth, an OpenAPI doc server — plug in:

```tsx
.middleware(openapi({ route: '/openapi.json', scalar: '/scalar', filter: 'all' }))
.middleware('/api/auth/*', async ({ request }) => authServer.handler(request.original))
```

Three forms: global (runs for all requests), route-scoped (a string or route),
and method+route-scoped. `.middleware` is **server-only** — cut from the client
bundle; on the client the call no-ops to `next()`. Each callback gets
`{ request, set, scope, next, points }` (plus `params` for a route with params)
and returns a `Response` or calls `next()`. Full surface on
[Middleware](middleware).

## One server, many clients

You can have more than one root — one per client. A typical setup shares a base
root (transformer, error class, query defaults) and derives a root per client
(server + website + Expo app + admin), each with its own loading/error UI:

```tsx
const root = Point0.lets
  .root()
  .serverUrl(sharedEnv.SERVER_URL)
  .transformer(superjson)
  .errorClass(AppError)
  .root()

// a derived root inherits the parent's defaults and overrides what it needs
export const siteRoot = root.lets
  .root()
  .clientUrl('https://example.com')
  .loading(/* ... */)
  .root()
export const mobileRoot = root.lets
  .root()
  .clientUrl('https://m.example.com')
  .root()
```

A derived root **inherits** the parent's defaults — `serverUrl`, transformer,
error class, query options, prefetch policies, and the loading/error UI — and
can override any of them. `mobileRoot` above keeps the parent's `serverUrl` but
sets its own page origin. Each root's `name` becomes a **scope** that tags every
point under it, which is how a query in a multi-client build knows which client
it belongs to.

On the engine side, the config takes a single `client` or a `clients` array,
each entry carrying its own `scope` — that's how the build wires each root to
its client. See [Engine config](engine-config).

## Base vs. root

A [base](base) is the non-entry sibling of a root: derive one with
`root.lets.base()…base()` to share partial-scope defaults (a `basePath`, a
gating plugin) with a subset of points, without being a second server entry
point:

```tsx
export const adminBase = root.lets
  .base()
  .basePath('/admin')
  .use(adminOnlyPlugin)
  .base()
```

Use a root for a whole client, a base for a slice of one. See [base](base).

`.use` (attaching a plugin) and the `.base()` closer are server-and-client — not
cut from either bundle (isomorphic). Whether a plugin's own methods get stripped
is decided per method by its category, not by `.use` itself.

## How children inherit

The closing `.root()` finalizes the point and marks it as both the base and the
root for everything below. Children opened with `root.lets.<type>()` then pull
defaults up that chain — server/client URLs, base path, all the `*QueryOptions`,
prefetch policies, and the loading/error components — and the transformer, error
class, schema helpers, middleware, and event subscriptions carry through the
chain too. Nothing lives in a separate config file: everything that shapes a
point is reachable by walking the parent chain from the point itself.

## Reference

The setters shown above are the same stage-methods every point has — a root just
sets them as defaults instead of for a single point. The full catalog, with each
method's own page, lives on [stage-methods](stage-methods); the sections above
cover the ones whose default belongs on the root.

A root has **no** `.loader`, `.clientLoader`, `.mapper`, `.params`, `.fetchFn`,
or `.onPrefetchPage` — it holds defaults, not data.

### Prefetch policies

| Policy                                | Effect                                                    |
| ------------------------------------- | --------------------------------------------------------- |
| `'serverQuery'`                       | prefetch the server query                                 |
| `'clientQuery'`                       | prefetch the client query                                 |
| `'serverAndClientQuery'`              | both — the cheap, recommended default for load            |
| `'pageDehydratedState'`               | full SSR render (expensive)                               |
| `'pageDehydratedStateAndClientQuery'` | SSR render + client query — most reliable, most expensive |
| `'onPrefetchOnly'`                    | only fire the `onPrefetchPage` hook                       |
| `'none'` / `false`                    | no prefetch                                               |

### Gotchas

- A root named `'plugin'` throws — the scope is reserved.
- `serverUrl` is required on the server, or `route.abs()` throws.
- `clientUrl` splits page vs. action origin by route kind — actions always use
  `serverUrl`.
- Middlewares are server-only; on the client they no-op to `next()`.
- `.schemaHelper(falsy)` is a no-op, not a reset.
- The default error class is `ErrorPoint0`; the default transformer is a
  pass-through.
