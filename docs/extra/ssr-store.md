---
index: 100
title: SsrStore
description:
  A reactive value you set during the server render — the render settles on the
  final value and ships it to the client.
---

An `SsrStore` is a piece of state you compute during the server render and want
on the client too. The canonical case is **breadcrumbs**: the trail lives in the
layout's header, but only the page knows what to put in it — and often only
_after_ a query resolves. You `set` it deep in the tree (in the page), the SSR
render settles on the final value, and that value is transferred to the client.
SSR-aware code up in the layout then reads it like ordinary state. The flow is
one-way: server → client, never back.

```tsx
import { SsrStore } from '@point0/core/ssr-store'

// declared once, shared across the app
export const $breadcrumb = SsrStore.define<BreadcrumbItem[]>(
  'breadcrumb',
  () => [],
)

// in the layout's header, read it reactively
const items = $breadcrumb.use()

// in a page deeper in the tree, publish the trail during SSR after data loads
useEffectSsr(() => {
  $breadcrumb.set([['Ideas', '/ideas'], [idea.title]])
}, [idea.title])
```

The layout renders _above_ the page, so on the first pass its header reads the
empty default. The page's `.set` stages the real trail; the SSR loop commits it
and re-renders, so the layout's header ends up showing the page's breadcrumbs —
in the HTML and on the client.

> Import from the subpath `@point0/core/ssr-store` — `SsrStore` is **not** in
> the `@point0/core` barrel. `useEffectSsr` is
> (`import { useEffectSsr } from '@point0/core'`).

## Declare a value

`SsrStore.define(name, init)` declares one value and returns a handle:

```ts
export const $title = SsrStore.define('page.title', () => 'Default title')
//    └ handle    └ globally unique key      └ lazy default, called on first read
```

- `name` is a **globally unique** key — it's the underlying store item's name,
  so two `define`s with the same name collide.
- `init` produces the server-side default. It's **lazy**: called on first
  access, not at `define` time.

Pass the value type explicitly when the default doesn't pin it down:

```ts
const $breadcrumb = SsrStore.define<BreadcrumbItem[]>('breadcrumb', () => [])
const $count = SsrStore.define<number>('count', () => 0)
```

The `$` prefix is a convention, not a requirement — it marks the variable as a
store handle.

## Read, write, subscribe

The handle has three author-facing methods.

**`.get()`** — read the committed value. Same on both sides; the server reads
the SSR render scope, the client reads the hydrated state:

```ts
$title.get() // => 'Default title'
```

**`.use(onChange?)`** — read it reactively. On the server it returns the
committed value directly (no hooks). On the client it's React state that
re-renders every reader when the value changes:

```ts
const title = $title.use() // re-renders on the client when set() runs
```

The optional `onChange` fires on the client when the value changes:

```ts
const title = $title.use((next) => console.log('title is now', next))
```

> Client change detection is reference equality (`!==`). A _new but deeply
> equal_ object or array still triggers a client re-render. (Server
> stabilization uses deterministic serialization instead — see below.)

**`.set(value)`** — write it. This is where server and client differ.

## `.set` on the server: staged, not immediate

On the server, `.set` does **not** change the value for the current render. It
_stages_ the value. Between renders the SSR loop applies staged values
(`commitPending`) and re-renders until they stop changing — exactly like a React
state setter never affects the render it's called in.

```ts
// inside a server render scope:
$title.get() // => 'Default title'
$title.set('overridden')
$title.get() // => 'Default title'  ← still the old value this pass
// ...the loop commits between passes, then:
$title.get() // => 'overridden'     ← next pass sees it
```

This staging is what lets a layout pick up a page's override: the loop commits
the page's `set` and re-renders the whole tree, so the layout now reads it.
Always write from inside a render or effect — use
[`useEffectSsr`](#useeffectssr-the-companion-hook), not module top-level.

A `set` in a render that is never followed by another render is simply dropped —
so with `ssr.allowedDiscoveryRenders: 1` (or at the soft cap) a final-pass `set`
never reaches the HTML, keeping the markup and the transferred value consistent.

## `.set` on the client: plain React state

On the client `.set` is a React state update — every reader through `.use`
re-renders immediately:

```ts
$title.set('overridden')
$title.get() // => 'overridden'  ← immediate on the client
```

No staging, no loop.

## How it transfers (dehydrate → hydrate)

You don't wire the transfer — it rides on the underlying store:

1. **Server render** settles on the committed value.
2. At the end of the render, the store is serialized into an inline script in
   the HTML (`window.__POINT0_DEHYDRATED_SUPER_STORE__`).
3. On boot, the client reads that script and hydrates the store **lazily** — the
   value is decoded on its first read.

Only `SsrStore` values cross the wire; other store policies stay local:

```ts
SsrStore.define('desc', () => 'default')
// ...elsewhere, a client-only store value:
// → only `desc` is in the dehydrated payload; the client-only value is not
```

Serialization is deterministic JSON by default, so a `Date` survives only with a
richer transformer (e.g. superjson). There's no per-value serialization — every
value rides the one store transformer shared by the whole app, set on the root
with [`.transformer`](transformer) (`.transformer(superjson)`).

## The re-render loop and its caps

The headline behavior — a layout seeing a page's override — comes from the SSR
prefetch loop. It commits staged values at the start of each pass and re-renders
until the values stabilize. Two engine options bound it (under `ssr` in
[engine config](engine-config)):

```ts
Engine.create({
  // ...
  ssr: {
    allowedDiscoveryRenders: Infinity, // soft budget of discovery renders (default Infinity)
    forbiddenDiscoveryRenders: 25, // hard cap — stop AND log a server error (default 25)
  },
})
```

Both count **discovery renders** (the final render is not counted — there is
always exactly one).

- **`allowedDiscoveryRenders`** — soft budget. When spent the loop stops
  quietly, no error, **without committing** the staged change. `1` opts out of
  stabilization re-renders for performance; `0` skips discovery entirely (see
  [SSR](ssr)).
- **`forbiddenDiscoveryRenders`** — hard cap. Reaching it stops the loop **and**
  logs a server error — the safety net for values that never stabilize:

  ```
  SSR stores/cookies did not stabilize after 25 discovery renders (forbiddenDiscoveryRenders);
  using the last render. Check for non-deterministic SsrStore or cookie values
  (e.g. Date.now(), Math.random()).
  ```

Stabilization compares staged vs committed by **deterministic serialization**,
so re-setting an equal value (even a freshly built object) ends the loop. A
non-deterministic default or set — `Date.now()`, `Math.random()` — never
stabilizes and hits the hard cap.

The render count grows with the work: a default-only value settles in 1 render;
a page overriding a layout default takes 2; add queries on both and a store-fed
dependent query and it climbs (4–5 passes). You don't manage this — it's why a
query can feed an `SsrStore` whose value becomes the input of another query, and
both end up prefetched.

> To collapse this loop, warm the data up front in
> [`.onPrefetchPage`](ssr#onprefetchpage) (runs server-side before the first
> render), or flip on `prefetchLoadersBeforePageRender` to prefetch the declared
> loaders automatically. Not specific to `SsrStore`; see [ssr](ssr).

## `useEffectSsr`: the companion hook

A normal `useEffect` does not run during SSR, so a `.set` inside one would never
reach the server render. `useEffectSsr` is the hook for an effect that must
_also_ run during SSR: on the server it runs synchronously during render (deps
ignored, cleanup skipped); on the client it's a plain `useEffect`.

```ts
useEffectSsr(() => {
  $title.set(idea.title)
}, [idea.title])
```

The production breadcrumb pattern in Start0 shows the full shape — declare once,
write from a hook with a cleanup, read in a component:

```tsx
import { useEffectSsr } from '@point0/core'
import { SsrStore } from '@point0/core/ssr-store'
import stringify from 'safe-stable-stringify'

export const $breadcrumb = SsrStore.define<BreadcrumbItem[]>(
  'breadcrumb',
  () => [],
)

// a page calls this to publish its breadcrumb
export const useBreadcrumb = (...items: BreadcrumbItem[]) => {
  useEffectSsr(() => {
    $breadcrumb.set(items)
    return () => $breadcrumb.set([]) // cleanup resets on the client (ignored during SSR)
  }, [stringify(items)]) // serialized deps — a new array identity alone won't re-fire
}

// the layout reads it reactively
const storeItems = $breadcrumb.use()
```

Two details worth copying: the **serialized deps** (`[stringify(items)]`) avoid
re-firing on a new-but-equal array, and the **cleanup** resets the store on
unmount (it only matters on the client; SSR ignores cleanups).

## When to use it — and when not

Use `SsrStore` when a value computed _during render_ — usually deep in the tree,
often after a query resolves — must appear in an **ancestor's** SSR output and
on the client before any JS recompute. Breadcrumbs, page title, page
description.

Reach for [CookieStore](cookie-store) instead when the value must travel **both
ways** (client → server too). The two APIs are deliberately parallel (`define` /
`get` / `set` / `use`), but a cookie is never dropped on the final render —
losing one is worse than a hydration mismatch — whereas an `SsrStore` value _is_
intentionally dropped on a dropped final pass.

## Gotchas

- **Unique names.** `name` is the underlying store key; redefining the same name
  overwrites. Use a clear, namespaced key.
- **No non-deterministic defaults or sets.** `Date.now()`, `Math.random()`, a
  raw `new Date()` make the loop never stabilize → it hits
  `forbiddenDiscoveryRenders` and logs an error.
- **Write from render/effects, not module top-level.** Server `set` needs the
  SSR render scope; in a real app the engine sets that up per request. Call
  `set` from inside a component or `useEffectSsr`.
- **`init` is lazy.** The default isn't materialized until the first
  `get`/`use`.
- **Client re-render on equal values.** `.use` change detection is reference
  `!==`, so a new object that's deeply equal still re-renders on the client.

## Reference

### Import

```ts
import { SsrStore } from '@point0/core/ssr-store' // NOT from '@point0/core'
import { useEffectSsr } from '@point0/core' // the companion hook IS in the barrel
```

### `SsrStore.define`

| Signature                                                   | Returns                          |
| ----------------------------------------------------------- | -------------------------------- |
| `SsrStore.define<TValue>(name: string, init: () => TValue)` | an `SsrStoreItem<TValue>` handle |

`name` is the globally-unique key; `init` is the lazy server-side default.

### Handle methods

| Method            | Server                                           | Client                                              |
| ----------------- | ------------------------------------------------ | --------------------------------------------------- |
| `.get()`          | committed value from the SSR scope               | committed value from hydrated state                 |
| `.set(value)`     | **stages** — applied between renders by the loop | plain React state update; readers re-render         |
| `.use(onChange?)` | committed value, synchronous (no hooks)          | React state; re-renders on change; `onChange` fires |
| `.name`           | the key passed to `define`                       | same                                                |

`SsrStore.hasPendingChanges()`, `SsrStore.commitPending()`, and the handle's
`getCommitted()` / `commit()` are server-lifecycle internals (the engine calls
them) — not part of the author surface.

### Engine `ssr` options (loop control)

| Option                            | Default    | Effect                                                               |
| --------------------------------- | ---------- | -------------------------------------------------------------------- |
| `allowedDiscoveryRenders`         | `Infinity` | soft budget of discovery renders (staged change not committed at it) |
| `forbiddenDiscoveryRenders`       | `25`       | hard cap; stop **and** log a server error                            |
| `prefetchLoadersBeforePageRender` | `false`    | prefetch declared loaders up front to need fewer passes              |

Full SSR options live in [engine-config](engine-config) and [ssr](ssr).
