---
index: 700
title: Head
description:
  Set the document head — title, SEO meta, canonical — from a point, statically
  or from loaded data, per state and up the chain.
---

`.head` sets the document `<head>` for a point — the title, SEO meta, the
canonical link. It's built on [unhead](https://unhead.unjs.io): the object you
pass is an unhead head plus a flat set of SEO keys, and Point0 renders it on the
server (real `<meta>` in the HTML) and updates it on client navigation.

```tsx
export const ideaPage = root.lets
  .page('/ideas/:id')
  .with(ideaQuery, ({ params }) => ({ id: Number(params.id) }))
  .head(({ data: { idea } }) => ({
    title: idea.title, // <title>idea.title</title>
    description: idea.content.slice(0, 140), // <meta name="description" …>
  }))
  .page(/* ... */)
```

`.head` reads the same per-state context every point method gets — here `data`
is the loaded idea — so the head can come from your data, not just static
strings.

> Stripping: `.head` is **server-ssr-and-client** — cut from the SERVER bundle
> when `ssr: false` (or after a [`.clientOnly()`](page) earlier in the chain):
> its body and the imports it uses are removed from the server build, so they
> never ship there. Kept in the client build always, and in the server build
> only when SSR is on. See [SSR and what runs where](#ssr-and-what-runs-where)
> below.

## Required setup

`.head` needs unhead's provider mounted around the app tree. The provider comes
from `@point0/core/unhead` (it picks the client or server variant for you):

```tsx
// app.client.tsx
import { UnheadProvider } from '@point0/core/unhead'

export const App = () => (
  <UnheadProvider>{/* ...router, pages... */}</UnheadProvider>
)
```

With the provider mounted you can also call unhead's own `useHead()` /
`useSeoMeta()` directly inside a component — `.head` is the declarative path,
not the only one.

## The three forms

`.head` accepts a string, an object, or a function:

```tsx
.head('Home')                                    // string → the title
.head({ title: 'Home', description: 'Welcome' }) // object → head + SEO keys
.head(({ data }) => ({ title: data.idea.title })) // function → returns string or object
```

A **string** is shorthand for the title:

```tsx
.head('New Idea') // => <title>New Idea</title>
```

A **function** receives the point's per-state context and returns a string or an
object — that's how you build the head from loaded data, params, or search:

```tsx
.head(({ data: { total, idea } }) => `${total} news for idea "${idea.title}"`)
.head(({ params }) => `User #${params.sn}`)
```

## The head object

The object form is everything unhead's `useHead` takes **plus** flat SEO keys at
the same level:

```tsx
.head({
  // unhead head keys
  title: 'Idea',
  titleTemplate: '%s | IdeaNick',
  htmlAttrs: { lang: 'en' },
  // flat SEO keys (unhead's useSeoMeta schema)
  description: 'A short idea',
  ogTitle: 'Idea',
  ogImage: { url: 'https://app.example.com/og.png', width: 1200 },
  robots: { index: true, follow: true },
  // special: rendered as <link rel="canonical">
  canonical: 'https://app.example.com/ideas/1',
})
```

Point0 splits the object into two groups and feeds them to unhead's `useHead`
and `useSeoMeta`:

- **Head keys** go to `useHead`: `title`, `titleTemplate`, `templateParams`,
  `base`, `link`, `meta`, `style`, `script`, `noscript`, `htmlAttrs`,
  `bodyAttrs`.
- **Everything else** (e.g. `description`, `ogTitle`, `ogImage`, `twitterCard`,
  `robots`, …) is a flat SEO key, rendered as the matching `<meta>` tag.
- **`canonical`** is special — it becomes `<link rel="canonical" href="…">`,
  appended after any `link` entries you set.

```tsx
.head({ description: 'About us', ogTitle: 'About', canonical: 'https://app.example.com/about' })
// => <meta name="description" content="About us">
//    <meta property="og:title" content="About">
//    <link rel="canonical" href="https://app.example.com/about">
```

Unknown keys are a type error:

```tsx
.head({ descriptio: 'typo' }) // type error — unknown head key
```

`undefined`-valued keys are dropped, so a conditional spread is safe:

```tsx
.head({ title: 'Home', description: hasDesc ? text : undefined })
// description omitted when hasDesc is false — no empty <meta>
```

### Flat key wins over a meta array

If a flat SEO key and a `meta: [...]` entry target the same tag, the flat key
wins and only one tag renders:

```tsx
.head({
  description: 'Flat',
  meta: [{ name: 'description', content: 'From array' }],
})
// => exactly one <meta name="description" content="Flat">  ("From array" is dropped)
```

## titleTemplate

`titleTemplate` wraps the page title with a suffix or prefix. `%s` is the
placeholder for the title. Set it once high in the chain and let each page
supply just its `title`:

```tsx
// on the root's global head (see below)
.head('global', () => ({ titleTemplate: '%s | IdeaNick' }))

// a page sets only the title
.head({ title: 'Ideas' }) // => <title>Ideas | IdeaNick</title>
```

Pass `titleTemplate: null` on a page to opt out of the template — the title
shows verbatim:

```tsx
.head({ title: 'IdeaNick Forever!', titleTemplate: null })
// => <title>IdeaNick Forever!</title>  (no suffix)
```

`titleTemplate` and `templateParams` pass straight through to unhead, which does
the `%s` substitution — so the finer rules (more than one `%s`, function-form
`titleTemplate`, separator handling, `templateParams` interpolation) are
unhead's.

## Per-state head: `.head(status, fn)`

A point moves through states — loading, error, success — and you can give each a
different head. Pass a status as the first argument:

```tsx
export const ideaPage = root.lets
  .page('/ideas/:id')
  .with(ideaQuery, ({ params }) => ({ id: Number(params.id) }))
  .head('success', ({ data: { idea } }) => ({ title: idea.title }))
  .head('error', ({ error }) => ({ title: `Error: ${error.message}` }))
  .page(/* ... */)
```

The five statuses are
`'loading' | 'error' | 'success' | 'universal' | 'global'`.

A `.head` with no status defaults to `'success'`:

```tsx
.head({ title: 'Home' })        // same as .head('success', () => ({ title: 'Home' }))
.head('Home')                   // same — success-only
```

A success-only head still renders on a page with no loader, because a
loader-less point is immediately in the `success` state.

Each status fires only in its state:

| Status      | Fires when                               | Context it receives                          |
| ----------- | ---------------------------------------- | -------------------------------------------- |
| `loading`   | the point's own chain is loading         | the point's loading state                    |
| `error`     | the point's own chain errored            | the point's error state (typed `error`)      |
| `success`   | the point's own chain succeeded          | the point's success state (typed `data`)     |
| `universal` | every state of the point's chain         | the point's current state (status-dependent) |
| `global`    | every state of the whole-page navigation | the page navigation state + `location`       |

The `success` / `error` / `loading` callbacks get the same per-state context as
the rest of the point's methods — `data` typed on success, `error` typed on
error, plus `params`, `search`, `input`, `props`, `queries`, `location`.

### `universal` vs `global` — which state they see

Both run on every state, but they read **different** state, and this is the part
that trips people up.

**`universal`** sees the **current point's own chain state** — and that depends
on _where in the chain_ you put it. Placed after a `.loader` it sees the
loading→ready transition; placed before, it never sees that loader's loading:

```tsx
// after the loader → sees loading then success
.loader(/* ... */)
.head('universal', ({ loading }) => ({ title: loading ? 'Loading…' : 'Ready' }))

// before the loader → only ever 'Ready' (this loader hasn't run yet at that point)
.head('universal', ({ loading }) => ({ title: loading ? 'Loading…' : 'Ready' }))
.loader(/* ... */)
```

**`global`** sees the **whole page's navigation state**, regardless of where in
the chain you declare it. It reacts to navigation, not to one point's data — so
a global head before the loader _still_ shows loading:

```tsx
.head('global', ({ loading, error, initial }) => ({
  ...(loading ? { title: 'Loading…' } : {}),
  ...(error ? { title: error.message } : {}),
}))
.loader(/* ... */) // global head still reflects the page-level loading state
```

The global callback gets a navigation state — `status`, `loading`, `error`,
`success`, `initial` — plus the current `location`. Note `initial` (the
pre-navigation state) is a state **only the global head sees**; a `success` /
`error` split alone has no head in the initial state, so the document falls back
to its default `<title>`. Use a `global` head for anything that must always have
a title:

```tsx
.head('global', ({ initial, loading }) =>
  initial ? 'IdeaNick' : loading ? 'Loading…' : 'IdeaNick',
)
```

> Note: the `'global'` form takes a function or an object — not a bare string —
> in the types. The other statuses accept a string too.

## Precedence: nearest wins, later overrides

Heads accumulate along the chain and replay in declaration order. Because
unhead's later calls override earlier ones for the same key, **the head declared
later in the chain wins** per key. A plain `.head` placed after a `universal` or
`global` head overrides it on conflicting keys, while the earlier head still
fills the keys the later one doesn't touch:

```tsx
.head('global', ({ loading }) => ({ title: loading ? 'Loading…' : 'Ready' }))
.loader(/* ... */)
.head(({ data }) => ({ title: `x=${data.x}` }))
// while loading → "Loading…" (from global); on success → "x=1" (the later head wins)
```

### Layout above, page below

`.head` renders only on **pages and layouts** (not on a query, mutation,
component, or provider). When a page sits under a layout, both run their heads;
the page renders below the layout, so it applies later — **the page wins** on
any conflicting key (nearest-to-leaf wins). The canonical pattern is a
`titleTemplate` on the layout (or root global head) and a plain `title` on each
page.

A `.head('global', …)` on the [root](root) or a [base](base) does not render
there directly — it flows down and is applied at the page or layout that mounts.
That's why you put the app-wide `titleTemplate` and loading/error title on the
root's global head:

```tsx
// root.tsx — applies to every page/layout below
.head('global', ({ loading, error }) => ({
  ...(loading ? { title: 'Loading...' } : {}),
  ...(error ? { title: error.message } : {}),
  titleTemplate: '%s | IdeaNick',
  htmlAttrs: { lang: 'en' },
}))
```

The "page wins" rule follows from declaration order: heads replay in mount
order, the layout applies before the page, and unhead's later call overrides the
earlier one per key — flat SEO keys included. A `canonical` set on more than one
point up the chain follows the same rule: unhead treats canonical as a singleton
link, so the later, nearer-to-leaf one wins.

## SSR and what runs where

When SSR is enabled, the first page load is server-rendered: the head renders on
the server through unhead's server provider, producing real `<title>`, `<meta>`,
and `<link>` in the HTML — so search engines and link unfurlers see them without
running your JS. After that first render, navigation between pages is
client-side (SPA-style), and the head updates there too.

`.head` is a render-side method, so it strips like the others — it's
**server-ssr-and-client**. When the point is **not under SSR** (`ssr: false`, or
after a [`.clientOnly()`](page) call), the `.head` body and the imports it uses
are **cut from the server bundle** — removed from the server build just like
`.with`, `.mapper`, `.loading`, and `.error`, so they never ship there (the
server never renders it). It's kept in the client build always, and in the
server build only when SSR is on — under SSR both renders need to produce the
same `<head>`, so the body stays in both bundles and runs on each side. Either
way, whatever you return from a `.head` that _does_ run is part of the public
document. Keep secrets out of head values; gate access to a page with a
[`.with`](with) wrapper, not by hiding it in a head string.

Each head action records an `ssr` flag at declaration time, but nothing reads it
back: the render loop calls `useHead` / `useSeoMeta` unconditionally, so a head
that reaches a render always runs. What keeps a non-SSR head off the server is
the compiler stripping its body from the server bundle, not this runtime flag.

> A loader body, DB calls, and other server-only code are stripped from the
> client bundle by the compiler — but a value you _return into_ `.head` is
> rendered into the document on both sides, so treat it as public.

## Reference

### Where `.head` is available

`.head` is a **stage-method** — you call it while building a point, before the
finalizer (`.page` / `.layout` / `.root` / the base path) turns it into a
ready-method point. It's available on:

| Point type                                                                                  | `.head`                                            |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| [root](root)                                                                                | yes (flows down; renders at the page/layout below) |
| [base](base)                                                                                | yes (flows down)                                   |
| [page](page)                                                                                | yes (renders here)                                 |
| [layout](layout)                                                                            | yes (renders here)                                 |
| [component](component)                                                                      | no                                                 |
| [provider](provider)                                                                        | no                                                 |
| [plugin](plugin)                                                                            | no                                                 |
| [query](query) / [infinite-query](infinite-query) / [mutation](mutation) / [action](action) | no                                                 |

It is not exposed on any finalized (_ready_) point — only while the chain is
still open. Strip category: **server-ssr-and-client** — cut from the server
bundle when `ssr: false` (body and imports removed from the server build); kept
in the client build always, and in the server build only when SSR is on.

A base-level `.head` flows down like everything else on a base: it becomes a
mount action on the chain and replays at the page or layout that mounts, so it
never renders on the base itself.

### The head object — full key set

`.head({...})` is
`ResolvableHead & DeepResolvableProperties<MetaFlat> & { canonical }`:

| Group       | Keys                                                                                                                        | Renders as                        |
| ----------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Head keys   | `title`, `titleTemplate`, `templateParams`, `base`, `link`, `meta`, `style`, `script`, `noscript`, `htmlAttrs`, `bodyAttrs` | passed to unhead `useHead`        |
| Flat SEO    | `description`, `ogTitle`, `ogImage`, `ogDescription`, `twitterCard`, `robots`, … (every `useSeoMeta` key)                   | the matching `<meta>` tag         |
| `canonical` | `canonical: string`                                                                                                         | `<link rel="canonical" href="…">` |

Every value may be a resolvable (a function), per unhead. A flat SEO key beats a
`meta` array entry for the same tag; `canonical` is appended after existing
`link` entries.

`title`, `titleTemplate`, `templateParams`, `base`, `link`, `meta`, `style`,
`script`, `noscript`, `htmlAttrs`, and `bodyAttrs` are the keys Point0 routes to
`useHead` (the `headOwnKeys` set in `head.ts`); every other key goes to
`useSeoMeta`. Point0 only sorts these into the two buckets — it does not
interpret them, so what each one renders is unhead's job.

### `.head` signatures

```tsx
// no status → defaults to 'success'
.head(headFn | headObject | string)

// explicit status
.head('loading' | 'error' | 'success' | 'universal', headFn | headObject | string)
.head('global', globalHeadFn | headObject)   // no bare string in the 'global' types
```

The function form returns `HeadObject | string`. The types require at least one
argument: calling `.head()` with none produces an empty head, which is
meaningless, so the typings don't offer it even though the runtime would accept
it. (You only ever see an arg-less stage-method where the empty call _does_ mean
something — e.g. `.clientOnly()` on a [page](page), which tells the compiler to
strip the rest of the chain from the server. `.head` isn't one of those.)
