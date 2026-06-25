---
index: 200
title: CookieStore
description:
  Read and write a cookie as reactive state that works across SSR — set it on
  the server, read it on the client, no extra wiring.
---

`CookieStore` makes a cookie behave like a small reactive store that works on
both sides. You `define` a cookie once; reading it is reactive on the client and
plain on the server, writing it goes to the response. A value you set during SSR
reaches the browser through the normal `Set-Cookie` round-trip — no separate
hydration channel. Import it from its own subpath; if you never import it, it
stays out of the client bundle.

```tsx
// src/components/ui/theme.tsx — from start0
import { CookieStore } from '@point0/core/cookie-store'

type ColorMode = 'dark' | 'light' | 'system'

// define the cookie once, anywhere
export const colorModeCookie = CookieStore.define<ColorMode>('color-mode')

export const useTheme = () => {
  const mode = colorModeCookie.use() // reactive on the client, plain read on the server
  return { mode }
}

export const setTheme = (mode: ColorMode) => {
  colorModeCookie.set(mode) // writes the cookie; readers update right away
}
```

`colorModeCookie.use()` reads the theme during SSR, so the server renders the
HTML with the right `<html class="dark">` already on it — no flash on the
client. The rest of this page shows where each piece comes from.

## Installing it

`CookieStore` reacts to cookies the server sets during a point fetch (e.g. a
mutation). Install its plugin on the [root](root) once so client readers refresh
after such a fetch:

```tsx
import { CookieStore } from '@point0/core/cookie-store'

export const root = Point0.lets.root().use(CookieStore.plugin()).root()
```

The plugin subscribes to `pointFetchServerSettled` and calls
`CookieStore.refresh()` on the client when a server point settles, so a cookie
the server just set is reflected in your `use()` readers. The SSR commit (the
mechanism in
[SSR-set values reach the client](#how-an-ssr-set-value-reaches-the-client)) is
driven by the engine itself and does not need the plugin.

Skip the plugin and the SSR round-trip still works — what you lose is the
client-side `CookieStore.refresh()` after a server point settles, so `use()`
readers won't pick up a cookie the server set during a mutation until something
else refreshes them.

## Defining a cookie

`CookieStore.define` takes the cookie name (a string) or an options object, and
returns a cookie item with the read/write methods on it:

```tsx
// shortest form — just the name
export const nickCookie = CookieStore.define('nick')

// options form — name plus attributes, transformer, fallback, httpOnly
export const tokenCookie = CookieStore.define<string>({
  name: 'token',
  httpOnly: true, // server-only (see below)
})
```

Type the value with the generic: `define<ColorMode>('color-mode')` makes
`get()`/`use()` return `ColorMode` and `set()` accept it. The default value type
is `string`.

Every defined item is registered globally so `CookieStore.refresh()` can reach
it. Define cookies at module scope (like `colorModeCookie` above), not inside a
render.

### Options

The options object is the cookie attributes plus three CookieStore-specific
keys:

```tsx
CookieStore.define<string>({
  name: 'session', // the cookie name (required in object form)
  path: '/', // standard cookie attributes…
  domain: 'app.example.com',
  expires: new Date('2030-01-01'),
  maxAge: 60 * 60 * 24,
  secure: true,
  sameSite: 'lax',
  partitioned: false,
  httpOnly: true, // server-only cookie — strips use()/refresh() from the type
  transformer: 'auto', // how non-string values are stored (below)
  fallback: 'guest', // value get() returns when the cookie is absent
})
```

`value` is not a define option — you set values through `.set`. The full
attribute list (`path`, `domain`, `expires`, `secure`, `sameSite`,
`partitioned`, `maxAge`) is the same one the [response](response) `set.cookies`
helper takes.

## Reading and writing

A defined item exposes `.get`, `.set`, `.delete`, `.use`, and `.refresh`:

```tsx
nickCookie.set('alice') // write
nickCookie.get() // => 'alice'   (the current value, or the fallback if absent)
nickCookie.delete() // remove the cookie
const nick = nickCookie.use() // reactive read in a component
nickCookie.refresh() // re-read all use() readers (client-only)
```

`.set(undefined)` is the same as `.delete()` — both write an empty value with an
expiry in the past. `.get()` returns the `fallback` (or `undefined`) when the
cookie is not set:

```tsx
const guest = CookieStore.define({ name: 'nick', fallback: 'guest' })
guest.get() // => 'guest'   when no `nick` cookie exists
```

### `.use()` is the reactive read

`.use()` is a React hook. On the client it is backed by `useState` and updates
whenever the cookie changes; on the server it returns the current value directly
(no hook state). A `.set` from anywhere triggers a refresh, so every `.use()`
reader re-renders:

```tsx
const ThemeButton = () => {
  const mode = colorModeCookie.use() // re-renders when the cookie changes
  return <button onClick={() => colorModeCookie.set('dark')}>{mode}</button>
}
```

Pass an `onChange` callback to react to changes imperatively — it fires only
when the parsed value actually changed:

```tsx
colorModeCookie.use((next) => {
  document.documentElement.className = next
})
```

## Server vs client — the same cookie, both sides

The point of `CookieStore` is that the _same_ item works in three places, and
routes itself correctly:

- **In the browser** — `set` writes `document.cookie` and refreshes readers;
  `get` reads `document.cookie`.
- **In a server loader, mutation, or `.ctx`** — `set` writes the response cookie
  immediately (through the [response](response) effects); `get` reads the
  incoming request cookie merged with anything set this request.
- **During the SSR render** — `set` is staged, not applied to the current render
  (see below); `get` reflects what was set this render.

`env.side` decides which path runs — you never pass a request or a response. On
the server the request lives in async storage, so `CookieStore` finds it for
you.

### Reads merge request and response

On the server, `get()` reads the **incoming request cookie** merged with any
cookie **set during this request**, with the set value winning. So if a loader
sets a cookie and a later read happens in the same request, it sees the new
value; a `delete` hides the incoming one:

```tsx
// inside a server loader
nickCookie.set('bob')
nickCookie.get() // => 'bob'   even though the request arrived with nick=alice
```

This is exactly what makes SSR reads reflect what the page itself set.

## Relation to `set.cookies` and `request.cookies`

`CookieStore` is a typed, named convenience over the raw cookie API. You can
always do cookies by hand:

```tsx
// raw: the response helper + the request bag
.loader(async ({ set, request }) => {
  set.cookies('nick', 'alice') // write a Set-Cookie header
  const nick = request.cookies.nick // read the incoming cookie
})
```

`CookieStore` replaces that with a defined key that carries its own name,
transformer, and `httpOnly` flag — and adds reactive client reads:

```tsx
// CookieStore: same effect, one defined item
nickCookie.set('alice') // → goes through set.cookies under the hood
nickCookie.get() // → reads request.cookies + response, merged
```

Under the hood a server `CookieStore.set` calls the same `set.cookies` effect,
so the two are interchangeable on the server — Point0's tests run the identical
login/logout flow once with raw `set.cookies` + `request.cookies` and once with
`nickCookie.set`/`.delete` (reads still go through the loader's
`request.cookies`) and get byte-identical output. See [Response](response) for
`set.cookies` and [Request](request) for `request.cookies`.

When both write the same cookie name, an explicit response `Set-Cookie` wins
over a CookieStore/effects cookie of that name.

## How an SSR-set value reaches the client

This is the part that makes it "work across SSR". A cookie set during the SSR
render does not mutate the current render — it is **staged**, like a React
`setState`. The engine's render loop then:

1. commits the staged cookies into the response before the next pass;
2. re-renders if a committed cookie would change what `get()` returns, so
   ancestors that read it via `.use()` pick up the new value;
3. **always commits staged cookies on the final pass, even if it does not
   re-render** — a lost cookie is worse than a hydration mismatch.

The committed cookies become `Set-Cookie` headers on the SSR response. The
browser stores them, and on hydration `CookieStore.get()`/`use()` read them back
from `document.cookie`. There is no separate dehydration payload — the value
travels by the normal cookie round-trip.

```tsx
// a layout reads the theme during SSR
export const generalLayout = root.lets.layout('/').layout(({ children }) => {
  const mode = colorModeCookie.use() // sees a cookie a child set this render
  useHead({ htmlAttrs: { class: { dark: mode === 'dark' } } })
  return <>{children}</>
})
```

Because the value is always committed, even an app capped to zero SSR re-renders
still ships the cookie. The cost is re-renders: a non-deterministic cookie value
(`Date.now()`, `Math.random()`) keeps changing every pass and can hit the
engine's hard re-render cap (`forbiddenRerendersCount`, default 25), which logs
an SSR error. Set stable values during SSR.

This is the two-way counterpart of [SsrStore](ssr-store): an `SsrStore` value is
computed on the server and sent to the client one way and is dropped if a
re-render doesn't happen; a cookie travels both ways and is never dropped.

## httpOnly cookies are server-only

Mark a cookie `httpOnly: true` and it can only be touched on the server. The
type removes `use` and `refresh` from the item, and every client call
(`set`/`get`/`delete`/`use`/`refresh`) throws:

```tsx
export const tokenCookie = CookieStore.define<string>({
  name: 'token',
  httpOnly: true,
})

  // server — fine
  .loader(async () => {
    tokenCookie.set(makeToken()) // written as an HttpOnly Set-Cookie
  })

// client — throws "httpOnly cookies are server-only"
tokenCookie.get()
```

Use `httpOnly` for anything the browser must not read in JS (session tokens). A
non-`httpOnly` cookie (like the theme) is the right choice when the client needs
to read or write it.

## Non-string values: the transformer

A cookie is a string. The `transformer` option controls how non-string values
are stored, with three modes plus a custom transformer:

```tsx
// 'auto' (the default): strings stored as-is; non-strings are JSON-stringified,
// and parsing failures fall back to the raw string
CookieStore.define({ name: 'data' }) // .set({ role: 'admin' }) → '{"role":"admin"}'

// false: never transform — set() is String(value), get() is the raw string
CookieStore.define({ name: 'flag', transformer: false })

// true: always run the configured transformer
CookieStore.define<{ role: string }>({ name: 'data', transformer: true })

// a DataTransformer object (e.g. superjson) — preserves Date, Map, etc.
CookieStore.define<Profile>({ name: 'profile', transformer: superjson })
```

The default `'auto'` is what you want for primitives and plain JSON. For richer
values (a `Date` inside an object) pass a transformer like `superjson`.

The class-level transformer is **not** taken from the root
`.transformer(superjson)`. For a non-primitive cookie you must wire the
transformer explicitly — per item (`transformer: superjson`) or globally via
`CookieStore.plugin({ transformer: superjson })`. Without that, a value-typed
cookie uses the identity transformer and round-trips as a plain string.

## Custom client storage

`CookieStore.configure` (or passing options to `plugin`) swaps the client
getter/setter — for a native or React Native cookie store, for example:

```tsx
CookieStore.plugin({
  clientCookieGetter: nativeCookieGetter,
  clientCookieSetter: nativeCookieSetter,
})
```

By default the client getter/setter read and write `document.cookie`. The getter
takes an optional cookie name and returns the value (or the whole map when
called with no name); the setter takes the resolved cookie options (`name`,
`value`, and the attributes) and persists them however the platform stores
cookies. Point0 ships only the `document.cookie` pair — a native adapter is
yours to write against this shape.

## Reference

### Item methods

A defined cookie item exposes:

| Method        | Signature                            | Notes                                                      |
| ------------- | ------------------------------------ | ---------------------------------------------------------- |
| `.set`        | `(value) => void`                    | write; `undefined` deletes; routes server vs client        |
| `.get`        | `() => TValue \| TFallback`          | current value, or the `fallback` when absent               |
| `.delete`     | `() => void`                         | remove the cookie (empty value, past expiry)               |
| `.use`        | `(onChange?) => TValue \| TFallback` | reactive read (hook); plain `get()` on the server          |
| `.refresh`    | `() => void`                         | re-read every `use()` reader; client-only, no-op on server |
| `.name`       | getter                               | the cookie name                                            |
| `.isHttpOnly` | `() => boolean`                      | whether this item was defined `httpOnly`                   |

On an `httpOnly` item, `.use` and `.refresh` are removed from the type, and all
methods throw on the client.

### `define` options

| Key           | Type                                         | Meaning                                              |
| ------------- | -------------------------------------------- | ---------------------------------------------------- |
| `name`        | `string`                                     | cookie name (required in object form)                |
| `httpOnly`    | `boolean`                                    | server-only cookie; strips `use`/`refresh` from type |
| `transformer` | `'auto' \| true \| false \| DataTransformer` | how non-string values are stored (default `'auto'`)  |
| `fallback`    | `TValue`                                     | value `get()` returns when the cookie is absent      |
| `path`        | `string`                                     | cookie attribute                                     |
| `domain`      | `string`                                     | cookie attribute                                     |
| `expires`     | `Date \| number \| string`                   | cookie attribute (see note below)                    |
| `maxAge`      | `number`                                     | cookie attribute (seconds; floored to an integer)    |
| `secure`      | `boolean`                                    | cookie attribute                                     |
| `sameSite`    | `'strict' \| 'lax' \| 'none'`                | cookie attribute (default `'lax'`)                   |
| `partitioned` | `boolean`                                    | cookie attribute                                     |

`value` is intentionally not an option — set values with `.set`.

### Static API

| Member                                | Use                                                            |
| ------------------------------------- | -------------------------------------------------------------- |
| `CookieStore.define(name \| options)` | define a cookie item                                           |
| `CookieStore.plugin(options?)`        | the root plugin; refreshes client readers after a server fetch |
| `CookieStore.configure(options?)`     | set `transformer` / client getter / client setter              |
| `CookieStore.get(name?)` / `set(...)` | low-level static read/write (items wrap these)                 |
| `CookieStore.refresh(name?)`          | refresh all items, or one by name (client-only)                |
| `CookieStore.items`                   | the global `Set` of defined items                              |

### Edge cases

- **`.set(undefined)` deletes** the cookie (empty value, expiry in the past).
- **`'auto'` parse failure** falls back to the raw string instead of throwing.
- **Server reads prefer the just-set value** over the incoming request; a delete
  this request hides the incoming cookie.
- **SSR `set` does not affect the current render** — it is staged and appears on
  the next pass after the engine commits it.
- **A non-SSR server `set`** (loader, mutation, handler) writes the response
  cookie immediately.
- **A response `Set-Cookie` overrides** a CookieStore cookie of the same name.
- **`expires` is epoch milliseconds (or a `Date`).** A bare `number` means
  absolute epoch milliseconds on both sides — the server serializer and the
  client `document.cookie` setter agree. A `Date` (or an absolute date string)
  works too. For a relative lifetime, reach for `maxAge` (seconds) instead of
  `expires`.
- **State is global** — `CookieStore.items` and the class-level transformer are
  module-level. Reset them between tests if you define cookies at module scope.
