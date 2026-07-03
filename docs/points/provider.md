---
index: 400
title: Provider
description:
  A provider point loads or computes a value once and hands it to every child —
  read it with .useValue() or .getValue().
---

A provider is a point that produces one value and exposes it down the tree. A
child reads it with `.useValue()` (a hook, fine-grained) or `.getValue()` (a
plain read). The provider can compute the value, fetch it through a
[loader](loader) or injected [queries](query), or build it from React hooks —
then every descendant gets it without prop drilling.

```tsx
import { root } from '@/lib/root'

export const AppProvider = root.lets.provider().provider(() => ({ x: 1, y: 2 }))
```

```tsx
// mount it once, high in the tree:
;<AppProvider>{children}</AppProvider>

// read it anywhere below:
const { x, y } = AppProvider.useValue() // => { x: 1, y: 2 }
```

See [points](points) for the short vs. explicit `.lets` notation.

## Declaring a provider

Open with `.provider()` and close with `.provider(mapper?)`. The closing call's
argument is the **mapper** — it maps the provider's accumulated state into the
value children will read:

```tsx
export const AppProvider = root.lets
  .provider() // open
  .provider(({ data }) => ({ user: data.user })) // close, with a mapper
```

The mapper is **optional**. Omit it and the provided value is the provider's
`data` as-is:

```tsx
export const AppProvider = root.lets
  .provider()
  .loader(() => ({ flags: readFlags() }))
  .provider() // value = data = { flags }
```

This `mapper` is the same as [`.mapper`](mapper), expressed in the closing call.
With no loader, no query, and no mapper, the value is the empty data object.

The mountable closer `.provider()` (and `.mapper`) is **server-ssr-and-client**
— cut from the SERVER bundle when `ssr:false` (or after a `.clientOnly()`
earlier in the chain): its body and the imports it uses are removed from the
server build. Kept in the client build always, and in the server build only when
SSR is on (so it can render during SSR).

## Getting a value into a provider

A provider fills its value the same way a [page](page) does. Three sources, and
you can combine them.

**A loader.** Put a [`.loader`](loader) on the provider:

```tsx
export const MeProvider = root.lets
  .provider()
  .loader(async () => ({ me: await getCurrentUser() }))
  .provider()
```

`.loader` is **server-only** — cut from the client bundle: its body and the
imports it uses are removed, so it never ships to the browser (it runs only on
the server). A provider's self-query (a loader-backed provider is also a query)
is **finite by default**; close with `.infiniteQuery({...})` after the loader to
make it infinite instead.

**Injected queries.** Hand a reusable [query](query) to the provider with
[`.with`](with):

```tsx
export const MeProvider = root.lets
  .provider()
  .with(getMeQuery)
  .provider(({ data: { me } }) => ({ me }))
```

**React hooks via `.with(fn)`.** A function form of [`.with`](with) runs at
render, so it can call hooks; merge their result into props and read it in the
mapper:

```tsx
export const MeProvider = root.lets
  .provider()
  .with(() => {
    const theme = useTheme()
    return { theme }
  })
  .with(getMeQuery)
  .provider(({ data: { me }, props: { theme } }) => ({ me, theme }))
```

`.with` is **server-ssr-and-client** — like the closer, cut from the SERVER
bundle when `ssr:false` (or after a `.clientOnly()`). A query handed to it is
injected the same way on both sides.

The mapper callback receives `data`, `props`, `queries`, and — when the matching
schema exists — `input`. Its return value is exactly what children read.

## Input and props

A provider may take an **input** schema (for its loader / queries) and **outer
props** (passed to its React element). It uses `input` — never `params`,
`search`, or `body`; those belong to [pages](page) and [actions](action) and are
a type error on a provider.

```tsx
export const DataProvider = root.lets
  .provider()
  .input(z.object({ z: z.number() }))
  .loader(({ input }) => ({ z: input.z * 2 }))
  .provider(({ data }) => ({ doubled: data.z }))

// mount with input:
<DataProvider input={{ z: 4 }}>{children}</DataProvider>
// the loader fetches once; children read { doubled: 8 }
```

`.input` on a provider is a non-action mountable schema, so it is
**server-and-client** — not cut from either bundle, kept in both (unlike
`.input` on an [action](action), which is cut from the client bundle —
server-only).

Declare outer props with a generic on `.lets`, then pass them on the element:

```tsx
export const DataProvider = root.lets<{ z: number }>('provider', 'app')
  .provider(({ props }) => ({ scaled: props.z * 10 }))

<DataProvider z={4}>{children}</DataProvider> // children read { scaled: 40 }
```

Changing an outer prop re-renders the provider and the children that read the
affected value.

## Mounting: the provider is its own component

The closing `.provider()` returns a mountable component, so the point itself is
the wrapper — no `.X` needed:

```tsx
<AppProvider>{children}</AppProvider> // short notation
```

`AppProvider.X` and `AppProvider.Provider` are the same component under explicit
names and still work. Wherever you mount it, that subtree (and only that
subtree) can read the value.

## Reading the value

Two readers, with different rules. Both are ready-methods on the closed
mountable, not chain stage-methods, so they are never stripped — they read the
value wherever the provider's subtree renders (the browser, and the server
during SSR).

### `.useValue()` — the hook

`.useValue()` subscribes to the value inside a component's render. It is a React
hook, so it follows the rules of hooks (top level of render only):

```tsx
AppProvider.useValue() // => the whole value
AppProvider.useValue('x') // => the value of one key
AppProvider.useValue(['x', 'y']) // => { x, y } — a Pick
```

It is **fine-grained**: reading one key re-renders the component only when that
key changes, not when the rest of the value does. Read inside a page or another
point's render — including via [`.with`](with), the way the basic example reads
a layout (see below):

```tsx
export const ideaViewPage = ideaLayout.lets
  .page('/')
  // read the layout's value straight in .with, like from a provider
  .with(() => ({ idea: ideaLayout.useValue('idea') }))
  .page(({ props: { idea } }) => <h1>{idea.title}</h1>)
```

Calling `.useValue()` outside a mounted provider throws:

```
useValue must be used within a Provider on point <provider>
```

### `.getValue()` — the plain read

`.getValue()` reads the same value without subscribing — not a hook, so you can
call it anywhere (event handlers, loaders, plain functions):

```tsx
const { me } = AppProvider.getValue()
```

It throws if the provider has not mounted and loaded yet:

```
Provider value not found. You should call getValue only after Provider component
is mounted and loaded. On point <provider>
```

When the provider might not be mounted, use `.getValueOrUndefined()` — it
returns `undefined` instead of throwing:

```tsx
const value = AppProvider.getValueOrUndefined() // => value | undefined
```

If the provider was mounted with an `input`, address that instance by passing
the same input: `AppProvider.getValue({ z: 4 })`. The value is stored under a
key derived from the input, so two instances mounted with distinct inputs each
keep their own slot and `getValue(input)` reads the matching one. `.getValue()`
with no input reads the value the provider last wrote without an input — under
two instances that returns whichever mounted last.

`.useValue()` takes only a key / keys / nothing — it has **no** `input`
argument, because it resolves through React context, not by input. It reads the
nearest mounting provider above it in the tree; that tree position disambiguates
instances. To read a specific input-keyed value outside the subtree, use
`.getValue(input)`.

## A layout is a provider too

A [layout](layout) carries the same value machinery: it exposes `.useValue()`,
`.getValue()`, and `.getValueOrUndefined()`, so a page below it reads the
layout's data like a provider's. This is the common production shape — load once
in the layout, read it in each child page:

```tsx
// the layout loads the idea once
export const ideaLayout = generalLayout.lets
  .layout('/ideas/:id')
  .with(ideaViewQuery, ({ params: { id } }) => ({ id: +id }))
  .layout(({ children, data: { idea } }) => (
    <section>
      <h2>{idea.title}</h2>
      {children}
    </section>
  ))

// a child page reads it without re-fetching
export const ideaNewsPage = ideaLayout.lets.page('/news').page(() => {
  const idea = ideaLayout.useValue('idea')
  return <Feed ideaId={idea.id} />
})
```

A [component](component) is **not** a provider — it has no `.useValue()` /
`.getValue()`. Only providers and layouts expose values.

## Endpoint behavior

A provider becomes an HTTP [endpoint](query) **only if it has a server
`.loader()`** — then it gets a path
(`POST /_point0/<scope>/provider/<kebab-name>`) so children can fetch its data.
A provider with no loader (a pure computed or props-driven value) issues no
request and has no endpoint. An auth gate belongs in a [`.with`](with) wrapper,
not in `.ctx` alone (`.ctx` runs only when the point has a loader).

## Reference

### Closing method

`.provider(mapper?)` applies **only to a provider-stage point** (a point opened
with `.lets.provider()` / `.lets('provider', name)`). It is terminal: it returns
a `Mountable`, after which only the value/component helpers below remain. As a
mountable closer it is **server-ssr-and-client** — cut from the server bundle
when `ssr:false` or after a `.clientOnly()`.

| Argument  | Type              | Notes                                                         |
| --------- | ----------------- | ------------------------------------------------------------- |
| `mapper?` | `(opts) => value` | optional; same as [`.mapper`](mapper). Omit → value is `data` |

The mapper receives `{ data, props, queries }` plus `input` when an input schema
exists.

### Value helpers

These are exposed on a **closed provider** and on a [layout](layout) — not on a
[component](component).

| Method                | Signature  | Returns                                     |
| --------------------- | ---------- | ------------------------------------------- |
| `useValue`            | `()`       | the whole value (hook)                      |
| `useValue`            | `(key)`    | one key's value (hook)                      |
| `useValue`            | `(keys[])` | `Pick` of those keys (hook)                 |
| `getValue`            | `(input?)` | the value; **throws** if not mounted/loaded |
| `getValueOrUndefined` | `(input?)` | the value, or `undefined`                   |

`.useValue()` subscribes (fine-grained re-render); `.getValue()` /
`.getValueOrUndefined()` read once without subscribing.

### Element props

The provider's React element accepts:

| Prop          | Type                | Notes                                        |
| ------------- | ------------------- | -------------------------------------------- |
| `children`    | `ReactNode`         | the subtree that may read the value          |
| `input`       | the input schema    | when `.input` is set; addresses the instance |
| _outer props_ | from `.lets<...>()` | spread directly on the element               |

### Default query options

`.providerQueryOptions(...)` sets the default react-query options for a
provider's auto-generated self-query. It is configured on the [root](root), a
[base](base), or a [plugin](plugin) — not on the provider itself — alongside the
other `*QueryOptions` methods (see [stage-methods](stage-methods)). Like the
rest of the `*QueryOptions` family it is **server-and-client** — not cut from
either bundle.
