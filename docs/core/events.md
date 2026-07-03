---
index: 1300
title: Events
description:
  Subscribe to the framework's query/mutation/fetch lifecycle — for logging,
  metrics, and error reporting.
---

Point0 emits a lifecycle event for every query, mutation, and fetch it runs.
Subscribe to them on any point with `.on` / `.serverOn` / `.clientOn` to log,
report errors, or collect metrics — without touching the loaders themselves. The
common case is one error subscriber on the [root](root):

```tsx
export const root = Point0.lets
  .root()
  .on('error', ({ side, name, error, meta }) => {
    // 'error' is sugar for the four error events; meta is a log-friendly projection
    console.error({ side, name, error, ...meta })
  })
  .root()
```

Every failed query or mutation now reaches your handler, with `side`, the event
`name`, the typed `error`, and a slim `meta` you can spread straight in.

## Subscribing

Three methods, all on **every point type**, all chainable (they return the same
point):

```tsx
.on('pointQuerySuccess', (e) => { /* kept in both bundles */ })
.serverOn('engineFetchError', (e) => { /* cut from the client bundle */ })
.clientOn('pointMutationSuccess', (e) => { /* cut from the server bundle */ })
```

- **`.on`** — not cut from either bundle: kept in both (isomorphic), so it fires
  on both sides.
- **`.serverOn`** — cut from the client bundle: its body and the imports it uses
  are removed, so the handler — server secrets included — never ships to the
  browser. It fires only for server-side events.
- **`.clientOn`** — cut from the server bundle: body and its imports removed. It
  fires only for client-side events.

The `side` is decided when the event is emitted, from where the emitting code
runs — not from the event name. A `.serverOn` callback never sees a client-side
event, and vice versa.

Subscriptions accumulate: each call adds to the list, and a point inherits every
subscription from its parents up the chain. Put app-wide logging on the root and
it covers everything beneath.

### By name, by list, or everything

```tsx
.on('pointQueryStart', (e) => { /* one event */ })
.on(['pointQuerySuccess', 'pointMutationSuccess'], (e) => { /* several */ })
.on('*', (e) => { /* every event */ })
```

With `'*'` the callback receives the full event union; with a single name it's
narrowed to that event. The wildcard still respects the side filter —
`.serverOn('*')` fires only for server-side events.

## The full event set

Six families, each with four lifecycle phases — `Start`, `Settled`, `Success`,
`Error` — plus one `emitError` event: twenty-five events in all. The table below
lists the families; the [Reference](#event-names) enumerates every name:

| Family                | What it tracks                                          | Side             |
| --------------------- | ------------------------------------------------------- | ---------------- |
| `pointQuery*`         | a query running (`useQuery` / `fetchQuery`)             | client \| server |
| `pointInfiniteQuery*` | an infinite query running                               | client \| server |
| `pointMutation*`      | a mutation running                                      | client \| server |
| `pointFetchServer*`   | a point's server-fetch step (the SSR / fetch machinery) | client \| server |
| `pointPrefetchPage*`  | a page being prefetched before navigation               | client \| server |
| `engineFetch*`        | the engine's outgoing HTTP fetch (the actual request)   | **server only**  |
| `emitError`           | a subscriber callback itself threw (see below)          | client \| server |

Each family gives you `<Family>Start`, `<Family>Settled`, `<Family>Success`, and
`<Family>Error`.

### Lifecycle phases

For any one run:

- **`Start`** fires before the work begins.
- **`Settled`** fires on **every** outcome — success or error.
- **`Success`** fires on a successful result.
- **`Error`** fires only on a genuine error.

```tsx
// a query that succeeds:  pointQueryStart → pointQuerySettled → pointQuerySuccess
// a query that throws:     pointQueryStart → pointQuerySettled → pointQueryError
```

One edge case: **a redirect is a success, not an error.** When a loader
redirects (`throw redirect(...)`), the query settles down the _success_ path —
`Settled` then `Success` fire, not `Error`. See [Navigation](navigation) for
redirects.

### Why `engineFetch*` is server-only

`engineFetch*` wraps the actual outgoing HTTP request, which only the server
makes — so those events are typed `'server'` and are only reachable through
`.on` and `.serverOn`. Naming `engineFetch*` inside `.clientOn` is a **type
error**: it isn't in the client event set.

The other `point*` events report `side: 'client'` even during SSR, because the
query/fetch code that emits them is client-authored (it runs on the server under
SSR, but it's the same code). Only `engineFetch*` — the HTTP layer — reports
`side: 'server'`. During one SSR page load you'll see both:

```tsx
.on('*', (e) => order.push([e.name, e.side]))
// pointQueryStart        client
// pointFetchServerStart  client
// engineFetchStart       server   ← the actual HTTP request
// engineFetchSettled     server
// engineFetchSuccess     server
// pointFetchServerSettled client
// pointFetchServerSuccess client
// pointQuerySettled      client
// pointQuerySuccess      client
```

## The `'error'` shorthand

`.on('error', cb)` is sugar — it expands to **four** subscriptions, one per
error event:

```tsx
.on('error', (e) => { /* … */ })
// equivalent to:
.on(['pointMutationError', 'pointQueryError', 'pointInfiniteQueryError', 'engineFetchError'], (e) => { /* … */ })
```

Inside the callback, `error` is narrowed to a non-`undefined` error instance.
One user `throw` can produce more than one of them: a failing server query
surfaces as `engineFetchError` (server) **and** `pointQueryError` (client), so
an `.on('error')` logger may see the same failure from two angles.

> **GOTCHA:** the shorthand covers query, infinite-query, mutation, and
> engineFetch errors — **not** `pointFetchServerError` or
> `pointPrefetchPageError`. To catch those two, name them explicitly:
> `.on(['pointFetchServerError', 'pointPrefetchPageError'], cb)`.

## The event object

Every callback receives one object with the same five fields:

```tsx
.on('pointQueryError', ({ side, name, data, error, meta }) => {
  side  // => 'client' | 'server' — where the emitting code ran
  name  // => 'pointQueryError'
  data  // the raw payload — rich, but heavy to log
  error // the typed error instance (your error class — ErrorPoint0 by default; undefined on non-error events)
  meta  // a slim, log-friendly projection of data
})
```

- **`side`** — `'client'` or `'server'`, set at emit time (see
  [side](#why-enginefetch-is-server-only) above).
- **`name`** — the event name.
- **`data`** — the full payload (the query result, the request object, the
  `QueryClient`, …). Prefer `meta` for logging.
- **`error`** — the error instance, hoisted to the top level so an `'error'`
  handler can read it directly — the **same object** as `data.error`. Typed
  (your [error class](error-handling)) on error events, `undefined` on every
  other event (the key is always present).
- **`meta`** — the log-friendly projection, below.

## `meta`: the log-friendly projection

`meta` is a plain record (`Record<string, unknown>`) built per event from
`data`, meant to go straight into a logger:

```tsx
.on('pointQueryStart', ({ meta }) => {
  meta.point // => 'root:page:home' — the point's id (<scope>:<type>:<name>), not the object
  meta.input // => { id: 123 }      — the input, sanitized (see below)
})
```

`data` carries heavy objects (responses, requests, query results) that you don't
want in a log line; `meta` replaces them with compact forms: points become their
string id (`<scope>:<type>:<name>`), requests become `{ method, path }`, errors
and redirects are serialized, and it drops bulky members. For an engineFetch
event, `meta.result` and `meta.response` are dropped; for the SSR case, a
`settled` event's `meta.request.renders` reports how many SSR render passes ran.

`meta` does **not** carry the error — on an error event, `meta.error` is
`undefined`. The error lives on the envelope `error` (and `data.error`). So a
typical error log spreads `meta` and adds the parts it needs:

```tsx
.on('error', ({ side, name, error, meta }) => {
  console.error({ ...meta, side, name, error })
})
```

### Binaries in the input are sanitized

`meta.input` runs through a sanitizer that replaces binary values with
placeholder strings, so file uploads never bloat or break a log line:

```tsx
// a mutation input of { photo: File, note: 'hi' } logs as:
meta.input // => { photo: '[File: photo.png (5120 bytes)]', note: 'hi' }
```

`File` → `[File: <name> (<size> bytes)]`, `Blob` → `[Blob: <size> bytes]`,
`FormData` → `[FormData]`. Nested binaries (inside arrays/objects) are replaced
too; everything else passes through unchanged.

## Subscriber errors and `emitError`

Callbacks are **fire-and-forget**: they may be sync or async, and Point0 does
not await them. A slow handler never blocks a request, and the completion order
of async handlers across subscriptions isn't guaranteed.

If a callback throws, the framework does not crash. The error is caught and
re-emitted as an `emitError` event, carrying the original event and the thrown
error — so you can observe your own handler failures:

```tsx
.on('emitError', ({ error, data, meta }) => {
  // error      — what your handler threw (coerced to the error class)
  // data.event — the full original event that was being handled
  // meta.event — its slim { name, meta } projection
  console.error('event handler failed', data.event.name, error)
})
```

A throw **inside** an `emitError` handler is swallowed silently — there's no
recursion, so a broken error reporter can't cause an emit loop.

## Wiring events to your observability

Funnel events through one subscriber on the root and let your logging stack fan
out — the `.on('error')` subscriber at the top of this page is the whole
pattern. Swap `console.error` for your own logger and you get error reporting
with no extra call sites at the points. In Start0, for example, that subscriber
writes to a LogTape logger whose sink forwards `error` records to Sentry — the
same single root subscription, just a richer sink behind it.

Subscribe to the success/settled events the same way for request metrics or
audit logs.

## Reference

### Event names

```
pointQueryStart          pointQuerySettled          pointQuerySuccess          pointQueryError
pointInfiniteQueryStart  pointInfiniteQuerySettled  pointInfiniteQuerySuccess  pointInfiniteQueryError
pointMutationStart       pointMutationSettled       pointMutationSuccess       pointMutationError
pointFetchServerStart    pointFetchServerSettled    pointFetchServerSuccess    pointFetchServerError
pointPrefetchPageStart   pointPrefetchPageSettled   pointPrefetchPageSuccess   pointPrefetchPageError
engineFetchStart         engineFetchSettled         engineFetchSuccess         engineFetchError
emitError
```

### Subscription methods

| Method      | Fires on           | Name argument accepts                                  |
| ----------- | ------------------ | ------------------------------------------------------ |
| `.on`       | both sides         | any event name, `'error'`, `'*'`, or an array of names |
| `.serverOn` | server-side events | server event names, `'error'`, `'*'`, array            |
| `.clientOn` | client-side events | client event names, `'error'`, `'*'`, array            |

All three are on every point type, accumulate, and are inherited down the chain.
`engineFetch*` names are valid in `.on` / `.serverOn` only — a type error in
`.clientOn`.

### Event object fields

| Field   | Type                           | Notes                                                |
| ------- | ------------------------------ | ---------------------------------------------------- |
| `side`  | `'client' \| 'server'`         | where the emitting code ran, set at emit time        |
| `name`  | the event name                 |                                                      |
| `data`  | the raw payload (per event)    | rich; not log-friendly                               |
| `error` | error instance, or `undefined` | present on error events; same object as `data.error` |
| `meta`  | `Record<string, unknown>`      | log-friendly projection of `data`                    |

### Per-event `data`

| Family                | `data` carries                                                        |
| --------------------- | --------------------------------------------------------------------- |
| `pointQuery*`         | `{ queryKey, point, input, mode, data?, error?, redirect? }`          |
| `pointInfiniteQuery*` | same as query, for the infinite case                                  |
| `pointMutation*`      | `{ point, input }` + one of `output` / `error` / `redirect`           |
| `pointFetchServer*`   | `{ input, point }` + the fetch-server output on settled/success/error |
| `pointPrefetchPage*`  | `{ point, input, options, error? }`                                   |
| `engineFetch*`        | `{ request, scope, result?, error? }`                                 |
| `emitError`           | `{ error, event }` — the original event and the thrown error          |

### Public types

The event types are exported from `@point0/core`: `AnyEventerEvent`,
`EventerEvent`, `EventerEventMeta`, `EventerSide`, and the per-event types. The
barrel is type-only (`export type * from './eventer.js'`), so the runtime
`uniqEventerErrorEventNames` constant — the four names the `'error'` shorthand
expands to — is **not** importable as a value.
