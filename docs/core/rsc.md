---
index: 250
title: RSC
description:
  Return React elements from a server loader — server components render on the
  server and ship as data, component points hydrate as interactive islands.
---

A server loader can return React elements — as the whole output, or nested
inside the data object next to regular values:

```tsx
const Hero = async ({ ideasCount }: { ideasCount: number }) => (
  <section>
    <h1>Ideas</h1>
    <p>{ideasCount} ideas so far</p>
  </section>
)

export const HomeCta = root.lets
  .component<{ label: string }>()
  .component(({ props }) => (
    <button onClick={() => signUp()}>{props.label}</button>
  ))

export const homePage = root.lets
  .page('/')
  .rscDepth(1) // allow elements in first-level fields (0 = whole output only)
  .loader(async () => {
    const ideasCount = await prisma.idea.count()
    return {
      ideasCount, // plain data, as always
      hero: <Hero ideasCount={ideasCount} />, // server component — renders HERE, never ships to the browser
      cta: <HomeCta label="Join" />, // component point — an interactive island on the client
    }
  })
  .page(({ data }) => (
    <main>
      {data.hero}
      {data.cta}
      <footer>{data.ideasCount}</footer>
    </main>
  ))
```

This is Point0's take on React Server Components: **an element is just data**.
It travels to the client through the same pipe as every other loader value — the
[data transformer](transformer) — and lands in `data` like everything else.
There is no separate protocol, no second module graph, no `'use client'`
directives. Because it rides the normal data pipe, it works everywhere data
works: pages, layouts, [queries](query), [mutations](mutation), components,
providers; SSR and hydration; [streamed SSR](ssr) pushes; client-side refetches
— a refetch simply delivers fresh elements.

## Where elements may appear: `.rscDepth`

`.rscDepth(n)` declares how deep in the output object elements are allowed. It
is an explicitness gate — elements never leak into data by accident:

```tsx
.loader(async () => <Hello />)                    // rscDepth 0 (the default): element as the whole output
.rscDepth(1)
.loader(async () => ({ hero: <Hero /> }))         // elements in first-level fields
.rscDepth(1)
.loader(async () => ({ items: [<Row key="1" />] })) // arrays don't consume a level
```

An element deeper than the declared depth fails the loader with an error naming
the exact path and the depth to set:

```
RSC (at hero): root:page:home returned a React element deeper than its rscDepth
allows. Raise it with .rscDepth(1) on the point …
```

Inside an element tree the depth no longer applies — props and children nest
freely, including further elements.

`.rscDepth` is available on every point type and on `root`/`base`/`plugin`, so
an app can set a default once at the root. Server-and-client — kept on both
bundles (isomorphic config).

## Server components

A plain function component inside loader data is a **server component**: Point0
calls it on the server right after the loader resolves (async components are
awaited), and only its output — host elements like `<section>` — travels to the
client. Its code never ships to the browser: the loader is
[server-only](stage-methods), so the component's import is pruned from the
client bundle with it.

```tsx
// Heavy dependencies stay on the server — the client receives plain markup.
import { renderMarkdown } from 'heavy-markdown-lib'

const Article = async ({ slug }: { slug: string }) => {
  const post = await prisma.post.findUniqueOrThrow({ where: { slug } })
  return (
    <article dangerouslySetInnerHTML={{ __html: renderMarkdown(post.body) }} />
  )
}

export const postPage = root.lets
  .page('/posts/:slug')
  .loader(async ({ params }) => <Article slug={params.slug} />)
  .page(({ data }) => <main>{data}</main>)
```

Server components run as plain function calls — hooks and context are not
available (the same rule as React's own server components). A component that
needs state or effects belongs on the client: make it a component point.

Event handlers cannot travel over the wire, so a function in a host element's
props fails the loader with the path:

```
RSC (at onClick): functions cannot travel over the wire (prop "onClick" of
<button>). Event handlers and render props belong inside a component point.
```

## Interactive islands: component points

A [component point](component) inside loader data serializes as a **reference**
— its name — and its props as data. Component points are points, so the points
collection is the registry: [`point0 generate`](generator) lists every component
in the client aggregator as a lazy record, and a reference resolves from that
collection — in the browser and during SSR alike (the server renders with its
own per-request copy of the client points) — starting the record's dynamic
import on demand:

```tsx
// cta.tsx — its own file: no page imports it, so it lands in its own chunk
export const HomeCta = root.lets
  .component<{ label: string }>()
  .component(({ props }) => (
    <button onClick={() => signUp()}>{props.label}</button>
  ))
```

- **Declared in a separate file**, the component stays out of every page's chunk
  — the browser downloads it only when a payload references it.
- **During SSR** the server renders the real component, so the first paint is
  complete HTML. On the client the chunk is fetched before hydration (and
  production builds inject `<link rel="modulepreload">` for every reference in
  the payload, so the fetch runs in parallel with the entry bundle).
- **After a client-side fetch** (a query refetch, a mutation result), the query
  resolves only when the referenced chunks are warm — an island never flashes a
  Suspense fallback because its code is still downloading.
- Props travel through the transformer like any data — including nested
  elements, so children-style slots work:
  `<Card title="Pro" footer={<Hint />} />`.
- A component point with its own [`.loader`](loader) or
  [`.sharedInput`](validation) keeps working: referenced from data, it mounts on
  the client and runs its own query machinery as usual.
- To skip server rendering for such an island, set
  [`.clientOnly()`](stage-methods) on the component point itself.
  (`<ClientOnly>` inside loader data is rejected — the loader never runs in the
  browser, so the wrapper has no meaning there.)

Component point names are the reference keys, so they must be unique per scope —
`point0 generate` fails with the two file paths when they collide.

## The wire format

Elements encode into plain JSON markers inside the regular payload:

```jsonc
{
  "ideasCount": 12,
  "hero": { "__p0e": { "t": "section", "p": { "children": "…" } } }, // host element
  "cta": { "__p0e": { "t": { "c": "HomeCta" }, "p": { "label": "Join" } } }, // component-point reference
}
```

`t` is the host tag (`0` = Fragment, `1` = Suspense, `{ c: name }` = component
point), `k` the key, `p` the props. User data keys that collide with `__p0e` are
`$`-escaped and restored on decode. Because the codec wraps your
[transformer](transformer), custom types keep working **inside element props** —
a `Date` in `<Hero since={date} />` round-trips like any other `Date`.

Decoding is one-way by design: the server encodes elements into responses, the
SSR-embedded state, and streamed pushes, but **never decodes elements from
client input** — element markers arriving in an `input` stay inert JSON.

## What is rejected

Every rejection fails the loader with an error naming the path.

| In loader data                       | Result                                                               |
| ------------------------------------ | -------------------------------------------------------------------- |
| plain function component             | unfolds on the server (async supported), `memo` unwrapped            |
| component point                      | reference — resolves from the points collection, renders client-side |
| host element, `Fragment`, `Suspense` | kept, props walked                                                   |
| function in host/reference props     | error — handlers belong inside a component point                     |
| `ref` prop                           | error — refs cannot travel over the wire                             |
| class component                      | error — server components are functions                              |
| context / `React.lazy` elements      | error                                                                |
| `<ClientOnly>`                       | error — use `.clientOnly()` on a component point instead             |
| page / layout / provider point       | error — only component points can be referenced                      |
| element deeper than `.rscDepth`      | error naming the path and the depth to set                           |
| hooks inside a server component      | the component throws — the error says to make it a component point   |

## Where next

- [Loader](loader) — everything a loader can return.
- [Component](component) — component points, the reference targets.
- [Transformer](transformer) — the data pipe the codec wraps.
- [SSR](ssr) — streaming, suspense queries, and push-hydration.
