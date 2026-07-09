---
index: 500
title: Cache-Control
description:
  A Cache-Control middleware — immutable hashed assets, no-store SSR HTML, a
  correct caching header for every response variant out of the box.
---

`@point0/cache-control` sets the `Cache-Control` header. Point0's handlers leave
it unset, so browsers and CDNs are left to guess how long a response may live.
`cacheControl(options)` returns a Point0 [middleware](middleware): mount it on
your `root` and every response variant gets a correct value.

```tsx
import { Point0 } from '@point0/core'
import { cacheControl } from '@point0/cache-control'

export const root = Point0.lets
  .root()
  .middleware(cacheControl()) // ← every response gets a correct Cache-Control
  // ...
  .root()
```

The bare `cacheControl()` already does the right thing:

| Variant     | Default                               | Why                                                                                                     |
| ----------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `asset`     | `public, max-age=31536000, immutable` | content-hashed URLs (build chunks, `/_point0/assets/*`) can never serve different bytes — cache forever |
| `publicdir` | `public, max-age=3600`                | stable names, mutable content (favicons, `robots.txt`, …) — cache briefly, revalidate                   |
| `page`      | `private, no-store`                   | SSR HTML embeds the dehydrated store — the current user's data — a shared cache must never store it     |
| `error`     | `private, no-store`                   | error HTML is rendered the same way                                                                     |
| `endpoint`  | — (untouched)                         | API caching is the endpoint's own decision — set it in the handler when you want it                     |

The `page`/`error` default is a safety property, not a taste: a misconfigured
CDN in front of an app whose HTML has no `Cache-Control` can cache one user's
server-rendered page — with their data dehydrated into it — and serve it to the
next user. `private, no-store` closes that door by default.

## The `asset` / `publicdir` split

The engine itself classifies every statically served file into two
[request variants](request#requestvariant) by what the URL promises. An `asset`
is a file whose name carries a content hash — a bundler chunk of the built
client (including the entry) or the asset pipeline's
`/_point0/assets/<hash>.<ext>`. The build persists the exact list of those files
into `_point0/<scope>/build-assets.json`, and the server classifies against it —
so the cache-forever set is exact, never guessed from file name patterns.
Everything else the publicdir serves keeps a stable name and stays `publicdir`.

That's why the middleware needs no path regexes and no `isImmutable` callback:
the framework already knows which of its files are immutable.

## An existing header always wins

`cacheControl()` never overwrites a `Cache-Control` the app already set — an
auth action's or a download's `no-store` survives untouched:

```tsx
.loader(({ set }) => {
  set.headers('Cache-Control', 'no-store') // ← cacheControl() will not touch this response
  // ...
})
```

## Tuning the slots

Every option slot takes a header string (**set** it) or `undefined` (**skip** —
leave the response's header untouched). The built-in default applies only when
you **leave the slot out**; passing the slot — even as `undefined` — means
you're taking control:

```tsx
cacheControl({
  page: 'public, max-age=60', // a fully public site may let its HTML be cached
  publicdir: undefined, //       skip static files — don't set any Cache-Control
})
```

Deleting a header (`false`) is not a slot value — that's an
[`override`](#override--the-top-level-escape-hatch) capability, because it would
overrule a header the app set. Slots stay safe: they set-or-skip, and always
defer to an app-set header (above).

A callback decides per response. It receives the same detailed result object the
middleware got back from `next()` — `response`, `request`, `variant` (narrowed
to the slot's variant), `scope`, `error` — and returns a string (set) or
`undefined` (**skip**). Note `undefined` skips; it does not fall back to the
default — to keep the default from a callback, return it explicitly:

```tsx
import { cacheControl, cacheControlValues } from '@point0/cache-control'

cacheControl({
  publicdir: ({ request }) =>
    request.location.pathname.endsWith('.pdf')
      ? 'public, max-age=604800' //         PDFs are versioned by hand — cache a week
      : cacheControlValues.revalidate, //   everything else: keep the default explicitly
})
```

`cacheControlValues` exports the three default strings (`immutable`,
`revalidate`, `noStore`) so callbacks don't retype header values.

## `override` — the top-level escape hatch

The slots only cover the five variants above, and they always defer to a
`Cache-Control` the app already set. `override` sits above both: it runs for
**every** response and **above** the existing-header rule. It returns a string
(set it, overwriting any existing value), `false` (delete the header), or
`undefined` (fall through to the normal per-variant procedure).

```tsx
cacheControl({
  // maintenance window: force no-store on everything, even responses that set their own header
  override: () => 'no-store',
})
```

Two things only `override` can do: reach variants without a slot (`middleware`,
`options`), and overrule a header a handler set. Because it bypasses the
existing-header rule, an override that wants to _respect_ an app-set header
checks `result.response.headers` itself:

```tsx
cacheControl({
  override: ({ response, request }) =>
    request.location.pathname.startsWith('/downloads/') &&
    !response.headers.has('cache-control')
      ? 'private, max-age=0'
      : undefined, // everything else: normal procedure
})
```

## Pairing with compress

`cacheControl()` and [`compress()`](compress) compose in either order —
`compress` copies response headers onto the compressed response, so the
`Cache-Control` rides along:

```tsx
.middleware(compress())
.middleware(cacheControl())
```

## Reference

### `cacheControl(options)`

Every option is optional; `cacheControl()` with no argument is the correct
default for a typical app. Each slot is
`string | undefined | (result) => string | undefined | Promise<...>` (set / skip
— no `false`; deletion is `override`-only).

| Option      | Default                               | Applies to                                                                             |
| ----------- | ------------------------------------- | -------------------------------------------------------------------------------------- |
| `asset`     | `public, max-age=31536000, immutable` | content-hashed build files                                                             |
| `publicdir` | `public, max-age=3600`                | stable-name static files                                                               |
| `page`      | `private, no-store`                   | server-rendered page HTML                                                              |
| `error`     | `private, no-store`                   | error responses                                                                        |
| `endpoint`  | untouched (unconfigured)              | query/mutation/action endpoints                                                        |
| `override`  | — (runs for every variant)            | top-level escape hatch: string sets (overwriting), `false` deletes, `undefined` defers |

### Behavior at a glance

| Aspect               | Behavior                                                                                                                                                                                                         |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Side                 | cut from the client bundle — the `.middleware(...)` argument and its imports are removed, so it never ships to the browser                                                                                       |
| Existing header      | a `Cache-Control` already on the response always wins — unless `override` overrules it                                                                                                                           |
| Other variants       | `middleware` / `options` have no slot; only `override` can set them                                                                                                                                              |
| Slot value           | string sets, `undefined` skips; the built-in default applies only when the slot is left unconfigured                                                                                                             |
| Callback `undefined` | skips (does not fall back to the default — return the default explicitly to keep it)                                                                                                                             |
| Streamed endpoints   | a [`defer()`](rsc)-streamed NDJSON response already carries `private, no-store` from the framework, so the existing-header rule leaves it alone — an `endpoint` policy only ever caches the non-streamed variant |
