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
is an explicitness gate — elements never leak into data by accident.

The usual setup is one `.rscDepth(1)` on the root — every point inherits it, no
loader declares it again, and that is what every other example on this page
assumes:

```tsx
export const root = Point0.lets
  .root()
  .rscDepth(1) // the whole app may return elements in first-level fields
  // …the rest of your root defaults
  .root()
```

Setting it on a single point works the same way and overrides the inherited
value:

```tsx
// rscDepth 0 (the default): an element as the whole output
.loader(async () => <Hello />)
```

```tsx
// elements in first-level fields
.rscDepth(1)
.loader(async () => ({ hero: <Hero /> }))
```

```tsx
// any depth — every object level consumes one, arrays don't consume any
.rscDepth(3)
.loader(async () => ({
  blocks: { main: { hero: <Hero />, items: [<Row key="1" />] } },
}))
```

An element deeper than the declared depth fails the loader with an error naming
the exact path and the depth to set:

```
RSC (at hero): root:page:home returned a React element deeper than its rscDepth
allows. Raise it with .rscDepth(1) on the point …
```

Inside an element tree the depth no longer applies — props and children nest
freely, including further elements.

`.rscDepth` is available on every point type and on `root`/`base`/`plugin`.
Server-and-client — kept on both bundles (isomorphic config).

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
  [`.sharedInput`](validation) keeps working: referenced from data, it mounts
  and runs its own query machinery as usual. During SSR its loader runs
  server-side and the query ships in the dehydrated state — the reference's
  `input` prop travels as data and keys the same query, so hydration finds the
  result and never refetches. Decoded on the client (a query refetch, a mutation
  result), it fetches its own loader like any mounted component.
- To skip server rendering for such an island, set
  [`.clientOnly()`](stage-methods) on the component point itself.
  (`<ClientOnly>` inside loader data is rejected — the loader never runs in the
  browser, so the wrapper has no meaning there.)

Component point names are the reference keys, so they must be unique per scope —
`point0 generate` fails with the two file paths when they collide.

## Queries and mutations ship elements too

Elements are a loader feature, not a page feature — any [query](query) or
[mutation](mutation) returns them the same way, with the same `.rscDepth` gate.
A query with elements is an ordinary query: call it with `useQuery` anywhere,
inject it with [`.with`](with), warm it in `.onPrefetchPage`:

```tsx
export const promoQuery = root.lets
  .query()
  .loader(async () => {
    const promo = await getActivePromo()
    return {
      banner: <PromoBanner promo={promo} />, // server component — rendered here
      cta: <SignUpCta label={promo.cta} />, // component point — an island
    }
  })
  .query()
```

```tsx
// any component, not just a page:
const query = promoQuery.useQuery()
return (
  <aside>
    {query.data?.banner}
    {query.data?.cta}
  </aside>
)
```

A refetch simply delivers fresh elements — `promoQuery.invalidateQuery()` runs
the loader again and the new tree renders in place. Prefetched on the server
(`.onPrefetchPage(async () => await promoQuery.prefetchQuery())`), the elements
render into the SSR html and ship in the dehydrated state — the client hydrates
them without a request. Under [streamed SSR](ssr) (`suspend: 'server'`) the
pushed query state carries the encoded elements into the stream.

A mutation returning elements turns a write into "the server answers with the
rendered result":

```tsx
export const commentAddMutation = root.lets
  .mutation()
  .use(authorizedOnlyPlugin)
  .input(z.object({ ideaId: z.number(), text: z.string().min(1) }))
  .loader(async ({ ctx, input }) => {
    const comment = await prisma.comment.create({
      data: { ...input, authorId: ctx.me.user.id },
    })
    return { comment: <Comment comment={comment} /> }
  })
  .mutation()
```

```tsx
// after mutate(), mutation.data.comment is a live element — render it directly
const mutation = commentAddMutation.useMutation()
return <section id="comments">{mutation.data?.comment}</section>
```

Element-containing query data opts out of TanStack's deep merge automatically —
Point0's default [`structuralSharing`](query-client) hands such payloads back
fresh, so a refetch never tries to merge two element trees.

## Elements, or plain data?

Sending plain data and composing in the render stays the default — the page
knows what it renders, the types are plain, nothing travels but values:

```tsx
.loader(async () => ({ stats: await getStats() }))
.page(({ data }) => <StatsCard stats={data.stats} />)
```

Returning elements buys three things this cannot do:

1. **The server decides the composition at request time.** CMS blocks, feature
   flags, markdown with embedded widgets — the loader assembles a tree the page
   renders without knowing its shape.
2. **Component code ships per payload, not per page.** A component the page
   imports statically always sits in the page's chunk closure. A component point
   referenced from data downloads only when a payload mentions it — with
   `<link rel="modulepreload">` in production builds.
3. **Server-only dependencies render markup.** A server component runs Prisma, a
   markdown renderer, a heavy chart layout — and ships only the resulting host
   elements.

The two element kinds split the same way:

|                        | Server component (plain function)       | Component point (island)                  |
| ---------------------- | --------------------------------------- | ----------------------------------------- |
| What travels           | its rendered output (host elements)     | a reference (name) + props as data        |
| Its code               | stays on the server                     | client bundle, its own chunk              |
| Hooks, state, handlers | not available — one plain function call | a full live React component               |
| How it updates         | refetch the loader that produced it     | re-renders on its own, like any component |

When none of the three apply, keep sending data.

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
