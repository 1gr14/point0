---
index: 800
title: Transformer
description: Serialize rich types (Date, Map, Set, BigInt) over the wire and into the query key by setting one transformer on the root.
---

`.transformer` sets how Point0 serializes data crossing the wire — query inputs
and outputs, request bodies, the SSR dehydrated state. By default that's plain
JSON, which can't carry a `Date`, `Map`, `Set`, or `BigInt`. Pass `superjson`
and those types survive the round trip, on both ends and inside the query key.

```tsx
import superjson from 'superjson'

export const root = Point0.lets
  .root()
  .serverUrl(sharedEnv.SERVER_URL)
  .clientUrl(sharedEnv.CLIENT_URL)
  .transformer(superjson) // Date / Map / Set / BigInt now round-trip
  .schemaHelper(zodSchemaHelper())
  .errorClass(AppError) // optional — your own error class; default is ErrorPoint0
  .root()
```

This is the canonical production wiring: one transformer on the root, applied to
every point beneath it.

Stripping: `.transformer` is **server-and-client** — it's a root setter, kept on
both bundles and never stripped, because serialization has to run identically on
the server and in the browser.

## Root only

`.transformer` is a **root method** — you call it on `Point0.lets.root()…` and
nowhere else. It's not available on a [page](page), [query](query),
[mutation](mutation), [action](action), or [layout](layout); writing it there is
a type error. One root, one transformer, shared by every point in that root's
[scope](query#mode-tags-scope).

`superjson` is not a Point0 dependency — install it yourself:

```sh
bun add superjson
```

It just needs to be a `{ serialize, deserialize }` pair, which is exactly the
shape `.transformer` takes (see [Reference](#reference)). `superjson` satisfies
that out of the box.

## Why you'd set it

Without a transformer, the wire is plain JSON, and the type lies. A loader can
return a `Date`, the type says `Date`, but what arrives on the client is a
string:

```tsx
export const ideaPage = root.lets
  .page('/ideas/:id')
  .loader(() => ({ createdAt: new Date('2026-01-01') }))
  .page(({ data }) => {
    // type says data.createdAt: Date
    // runtime (no transformer): data.createdAt === '2026-01-01T00:00:00.000Z' — a string
    return <time>{String(data.createdAt)}</time>
  })
  .page()
```

This is the single most common surprise. `JSON.stringify` turns a `Date` into an
ISO string, drops a `Map`/`Set` to `{}`, and throws on a `BigInt`. The data
degrades on the way out and never reconstructs on the way in.

Set `.transformer(superjson)` on the root and the same loader gives the page a
real `Date`:

```tsx
.page(({ data }) => {
  // runtime (with superjson): data.createdAt instanceof Date === true
  return <time>{data.createdAt.toISOString()}</time>
})
```

The same holds for request bodies. A `BigInt` in a mutation or [action](action)
body survives both directions only when the root has a transformer:

```tsx
// action body schema: z.object({ amount: z.bigint() })
await transferAction.fetch({ body: { amount: 100n } })
// server receives amount === 100n (with superjson) — not a string, not a throw
```

On the server, validation runs **after** the transformer deserializes, so a
`z.bigint()` schema sees a real `bigint` and accepts it. With plain JSON the same
schema would reject the value.

<!-- TODO(med): only `Date` and `BigInt` are proven by Point0 tests (`packages/engine/tests/loader.test.tsx`, `action.test.tsx`). `Map`/`Set` are superjson capabilities — link superjson's own list of supported types here once confirmed end to end in a Point0 test. -->

## The default transformer

When you never call `.transformer`, Point0 uses a blank transformer:
`serialize`/`deserialize` are identity (pass-through), and the wire format is
plain JSON with **stable key order** (it stringifies via `safe-stable-stringify`,
a Point0 runtime dependency). So the default is "plain stable JSON":

```tsx
// default transformer, serializing { date, string }:
'{"date":"2017-01-01T00:00:00.000Z","string":"value"}'
// keys sorted; the Date is already a string — its type is gone
```

`superjson` instead wraps the value in a `{ json, meta }` envelope, where `meta`
records which fields need reconstructing:

```tsx
// superjson, same input:
'{"json":{"date":"2017-01-01T00:00:00.000Z","string":"value"},' +
'"meta":{"v":1,"values":{"date":["Date"]}}}'
// meta.values.date = ["Date"] tells deserialize to rebuild a Date
```

That `meta` is what carries the type across the wire — and it's why the
serialized form is larger than plain JSON.

<!-- TODO(low): no benchmark in the repo for superjson's serialization cost on large payloads. Don't quantify the overhead until measured. -->

## How it bakes into the query key

The transformer is part of the cache key, not only the wire. A query key's
`input` field is the transformer's stringified input:

```tsx
ideaQuery.getQueryKey({ id: 123 })
// [
//   'point0',
//   { scope, type, name, mode, finiteness, tags, output,
//     input: '{"id":123}' }, // = transformer.stringify(routedInput)
// ]
```

`input` is `safe-stable-stringify(transformer.serialize(routedInput))`. With the
default transformer that's plain stable JSON. With `superjson`, the superjson
serialization (its `{ json, meta }` shape, then stable-stringified) is what keys
the cache — so an `input` containing a `Date` produces a distinct, reconstructable
key instead of a lossy string.

Stable stringification means key order doesn't matter: `{ a, b }` and `{ b, a }`
hit the same cache entry. See [Query](query#the-query-key) for the full key
shape; for what counts as `routedInput` (page/layout search filtering, action
sections), see [Validation](validation).

Because the transformer is in the key, **changing it changes cache keys
app-wide**. If you add or swap `.transformer` in an existing app, persisted or
in-flight keys built with the old transformer won't match the new ones.

<!-- TODO(med): Point0 has no built-in cache-bust on transformer change, and the TanStack-persistence implications aren't covered by a test. Flag the migration caveat; confirm the recommended reset path before documenting one. -->

## Not the same as the store transformers

Two other surfaces take a transformer with the same `{ serialize, deserialize }`
shape, but they're **separate knobs** from the root `.transformer`:

- [`CookieStore`](cookie-store) accepts a per-store `transformer` option.
- [`SsrStore`](ssr-store) / `SuperStore` expose `setTransformer(transformer)`.

Both default to the blank transformer independently. Setting `.transformer` on
the root does not configure them, and vice versa.

## Reference

### Signature

```tsx
.transformer(transformer: DataTransformer): this // root only, chainable
```

`DataTransformer` is the minimal pair both `serialize` and `deserialize` round
through:

```tsx
type DataTransformer = {
  serialize: (data: any) => any
  deserialize: (data: any) => any
}
```

Any object of that shape works — `superjson` is the recommended default, but a
hand-rolled transformer is valid too. Point0 wraps whatever you pass to also
derive a stable `stringify`/`parse` pair for query keys and the wire (`stringify`
= `safe-stable-stringify(serialize(data))`, `parse` =
`deserialize(JSON.parse(str))`).

### Where it runs

| Boundary                          | Direction       | What it does                          |
| --------------------------------- | --------------- | ------------------------------------- |
| query / mutation / action request | client → server | `serialize` the body                  |
| request parse                     | server reads    | `deserialize` the body                |
| query / loader output             | server → client | `stringify` the result                |
| page dehydrated state (SSR)       | server → client | `stringify` the dehydrated state      |
| response read                     | client reads    | `deserialize` the JSON                |
| query key `input`                 | both            | `stringify` the routed input          |

### Edge cases

- **`serialize` returning `undefined` is an error.** If a custom transformer
  returns `undefined` for an input, Point0 throws
  `Transformer returned undefined for input … on point …` rather than sending an
  empty body.

<!-- TODO(low): `.transformer` called more than once should be last-wins (the builder merges via `_continue`), but there's no explicit test. Verify before stating it. -->

The configured transformer always handles your query, mutation, and action
data.
