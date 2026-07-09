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

## Where elements may appear: `.rsc({ depth })`

`.rsc({ depth: n })` declares how deep in the output object elements are
allowed. It is an explicitness gate — elements never leak into data by accident.

The usual setup is one `.rsc({ depth: 1 })` on the root — every point inherits
it, no loader declares it again, and that is what every other example on this
page assumes:

```tsx
export const root = Point0.lets
  .root()
  .rsc({ depth: 1 }) // the whole app may return elements in first-level fields
  // …the rest of your root defaults
  .root()
```

Setting it on a single point works the same way and overrides the inherited
value:

```tsx
// depth 0 (the default): an element as the whole output
.loader(async () => <Hello />)
```

```tsx
// elements in first-level fields
.rsc({ depth: 1 })
.loader(async () => ({ hero: <Hero /> }))
```

```tsx
// any depth — every object level consumes one, arrays don't consume any
.rsc({ depth: 3 })
.loader(async () => ({
  blocks: { main: { hero: <Hero />, items: [<Row key="1" />] } },
}))
```

An element deeper than the declared depth fails the loader with an error naming
the exact path and the depth to set:

```
RSC (at hero): root:page:home returned a React element deeper than its rsc
depth allows. Raise it with .rsc({ depth: 1 }) on the point …
```

Inside an element tree the depth no longer applies — props and children nest
freely, including further elements.

`.rsc(options)` is available on every point type and on `root`/`base`/`plugin`,
and merges per key down the chain — the root sets the app default, a point
overrides only the keys it names. Its second knob, `holeTimeoutMs`, bounds the
point's [`defer()` holes](#defer--stream-slow-server-markup). Server-and-client
— kept on both bundles (isomorphic config).

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

Event handlers cannot travel over the wire, so a function anywhere in a host
element's or island's props — a direct prop or nested inside a prop object or
array — fails the loader with the path:

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

An island is not an RSC-only thing — it's a perfectly ordinary
[component point](component). The same `<HomeCta label="Join" />` mounts
directly in any page or component markup, exactly as the
[component page](component) shows; returning it from a loader is just a second
way to place the same component. Nothing about it changes between the two uses.

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
[mutation](mutation) returns them the same way, with the same `.rsc({ depth })`
gate. A query with elements is an ordinary query: call it with `useQuery`
anywhere, inject it with [`.with`](with), warm it in `.onPrefetchPage`:

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

## Streaming a slow part: `defer`, `suspend`, and promise props

Point0 awaits every async server component in the output before the payload
ships, so one slow `<Analytics />` holds back the **whole** loader output — the
SSR shell and the client-fetch response alike. Three tools stream the slow part
instead of blocking on it, and the choice between them is simple:

- **`defer`** — for slow server **markup** (a server component with no query of
  its own);
- **a `suspend: 'server'` query** — for slow **interactive** content whose value
  is a **query** (an island);
- **a promise as an island prop** — for slow **interactive** content fed an
  **ad-hoc value**: hand the still-resolving promise straight to the island's
  prop and read it there with React's
  [`use()`](https://react.dev/reference/react/use).

All three ship the shell first and push the rest into the **same** response,
with zero client refetch. Everything you need at the RSC level is here; the full
`suspend` reference (all the modes, positional fallbacks) lives in
[SSR → the `ssr` and `suspend` query options](ssr#the-ssr-and-suspend-query-options).

> The examples below assume `.rsc({ depth: 1 })` once on your [root](root) —
> every point inherits it, so you never repeat it.

### `defer` — stream slow server markup

Wrap a slow subtree in `defer` and the loader returns at once: a _hole_ ships in
its place under a `Suspense` boundary showing the fallback, and the resolved
markup is delivered on the same response as it settles.

```tsx
import { defer } from '@point0/core'

// a plain async server component — its code (the markdown renderer, the db call) never ships
const Article = async ({ slug }: { slug: string }) => {
  const post = await db.post.findUniqueOrThrow({ where: { slug } })
  return (
    <article dangerouslySetInnerHTML={{ __html: renderMarkdown(post.body) }} />
  )
}

export const postPage = root.lets
  .page('/posts/:slug')
  .loader(async ({ params }) => ({
    title: await getTitle(params.slug), // fast — ships in the shell
    article: defer(<Article slug={params.slug} />, <ArticleSkeleton />), // slow — streams in
  }))
  .page(({ data }) => (
    <main>
      <h1>{data.title}</h1>
      {data.article}
    </main>
  ))
```

Only the rendered host elements of `<Article />` travel; the second argument is
the fallback shown until they land.

**A third argument catches failure** — a per-hole error boundary. If the
deferred subtree throws, this renders in the hole's place instead of the error
reaching the point's [`.error`](loading-error) boundary, so the rest of the page
stays untouched:

```tsx
article: defer(<Article slug={params.slug} />, <ArticleSkeleton />, <ArticleFailed />),
```

It can be a **function of the error** instead of static markup, so the fallback
can show what actually went wrong:

```tsx
article: defer(<Article slug={params.slug} />, <ArticleSkeleton />, (error) => (
  <ArticleFailed message={error.message} />
)),
```

The function runs on the server when the subtree fails, and receives the error
already projected for the client through your [`.errorClass()`](loading-error) —
public fields in production, the full error in dev, the **same** `ErrorPoint0`
instance the point's `.error` boundary would get. If your server component
throws a typed error — `throw new AppError('Not found', { status: 404 })` — that
error reaches the fallback whole, `status` and `code` intact, so you can branch
on it. Nothing private leaks even if you render the value or pass it to an
[island](component)'s prop, and a per-hole fallback and a boundary always agree
on what the error is.

A failed deferred subtree is easy to miss on the server: the loader already
returned its shell, so the failure never becomes a loader error. Point0 emits an
[`rscError`](events) event for it — subscribe with `.on('rscError', …)`, or
catch it alongside every other failure with `.on('error', …)`:

```tsx
root.on('error', ({ name, error, meta }) => report(error, { name, ...meta }))
```

### Where `defer` streams

- **the initial SSR load** — the shell ships with the fallback, the subtree
  pushes into the same HTML as it resolves;
- **client fetches** — navigation, mutations, query refetches: the point0 client
  reads the streamed body incrementally, filling each hole as it lands.

A consumer that can't read a stream — SSG, OpenAPI, a foreign HTTP client — gets
a single JSON body where `defer` degraded to inline: the subtree awaited, the
fallback dropped, the same content without progressive delivery. The same
degrade applies when the loader sets a non-2xx status: an error response is
always a single JSON body, never a framed stream.

While a stream waits on a slow subtree, Point0 writes a no-op heartbeat every 5
seconds (a blank NDJSON line / an empty script in the HTML), so a legitimately
slow `defer` is never killed by an idle-connection reaper — Bun's server default
reaps silent responses after 10 seconds, and reverse proxies carry idle windows
of their own. The flip side: a subtree that never settles would now hold the
response open forever, so every hole carries a **deadline** — the owner point's
`.rsc({ holeTimeoutMs })`, default 60 seconds, `false` to disable (set it on the
root for an app-wide value). A hole that misses it fails with a
`POINT0_RSC_HOLE_TIMEOUT` error, rendered by the hole's error fallback or its
nearest boundary; the subtree's late result is dropped unread.

On the client, a streamed fetch resolves with line 1 immediately and keeps
reading in the background until the server delivers every hole — navigating away
does not abort it. That is deliberate: the fills land in the query cache (a
back-navigation shows the completed content instead of refetching), and the
deadline above bounds how long the connection can live.

Streamed bodies are per-request state, so they ship
`Cache-Control: private, no-store` (plus `Vary: x-point0-stream`) — a CDN never
stores or replays one. Cache a read the usual way
([cache-control](cache-control)) and its non-streamed variant stays cacheable; a
`defer` in it only ever streams to point0 clients. One infrastructure caveat: a
reverse proxy that buffers responses collapses progressive delivery into one
late chunk. Point0 sends `X-Accel-Buffering: no` (honored by nginx-style
proxies), but after deploying behind a new proxy or edge, load a page with a
`defer` and watch it stream.

### `suspend` — stream a slow interactive island

`defer` is for markup. Slow content that must stay **interactive** gets a
`suspend: 'server'` query instead — it streams the same way but comes alive. A
[component](component) with its own loader is the natural home:

```tsx
export const LiveStats = root.lets
  .component()
  .loading(() => <StatsSkeleton />) // positional fallback — declared ABOVE the query
  .loader(async () => ({ count: await db.idea.count() })) // ~2s
  .query({ suspend: 'server' }) // don't hold the shell for it
  .component(({ data }) => {
    const [open, setOpen] = useState(false)
    return (
      <button onClick={() => setOpen(!open)}>
        {data.count} ideas{open && ' — nice'}
      </button>
    )
  })
```

Drop `<LiveStats />` anywhere: the shell ships with its `.loading()`, the loader
streams into the same response, and the button works on the first paint — a
**live** island, not just markup.

### Promises as island props

A `suspend` query streams a **query** value. When the slow value is ad-hoc — a
computation, an aggregation, anything you would not model as a query — hand the
still-resolving promise **straight to the island's prop**:

```tsx
export const dashboardPage = root.lets
  .page('/dashboard')
  .loader(async () => ({
    user: await getUser(), // fast — ships in the shell
    stats: <Stats slowStats={getSlowStats()} />, // getSlowStats() returns a Promise — NOT awaited
  }))
  .page(({ data }) => (
    <main>
      <h1>{data.user.name}</h1>
      {data.stats}
    </main>
  ))
```

The island mounts **live at once** — its buttons work while the value is still
in flight — and reads the prop with React 19's `use()` behind its own
`Suspense`. The prop is declared like any other [component](component) prop —
the generic on `.component<…>()` — just typed as a `Promise`:

```tsx
import { Suspense, use, useState } from 'react'

const StatsValue = ({ slowStats }: { slowStats: Promise<StatsData> }) => {
  const stats = use(slowStats) // suspends until the value streams in, then re-renders
  return (
    <p>
      {stats.views} views · {stats.likes} likes
    </p>
  )
}

export const Stats = root.lets
  .component<{ slowStats: Promise<StatsData> }>() // declares the outer prop, typed as the promise
  .component(({ props }) => {
    const [period, setPeriod] = useState('week')
    return (
      <section>
        {/* live at once — clickable while the value is still in flight */}
        <button onClick={() => setPeriod(period === 'week' ? 'month' : 'week')}>
          Period: {period}
        </button>
        <Suspense fallback={<p>Loading…</p>}>
          <StatsValue slowStats={props.slowStats} />
        </Suspense>
      </section>
    )
  })
```

`StatsValue` is not ceremony around `use()` — it is the **waiting boundary**,
and you draw it yourself: everything outside the `Suspense` (the period button)
works immediately; the part inside is exactly what waits for the value.

The prop travels as a hole in the payload; the resolved value streams into it on
the **same** response — the SSR document or the client fetch — and `use()`
re-renders just the suspended reader. The island is never remounted: state it
accumulated while the value streamed (a toggled filter, a typed input) survives
the arrival.

Everything `defer` says about delivery applies verbatim, because promise props
ride the same machinery: streaming on the initial SSR load and on every client
fetch, heartbeats, the `.rsc({ holeTimeoutMs })` deadline (a promise that misses
it rejects with `POINT0_RSC_HOLE_TIMEOUT`), `Cache-Control: private, no-store`
on framed bodies, and the inline degrade for consumers that can't read a stream
— there the promise is awaited on the server and its value rides the payload,
still decoding to an (already-resolved) promise, so the island's `use()`
contract holds for every consumer.

Two things differ from `defer`:

- **The island is live on the first SSR paint.** The island itself is a regular
  reference in the payload — never inside a server-revealed hole — and the
  promise its `use()` reads is the client's own, filled by the stream. So the
  defer-hole limitation (below) does not apply: the island hydrates interactive,
  whether the value arrived before hydration or after.
- **A rejected promise has no per-hole fallback** — `use()` throws the error at
  render, and the nearest error boundary catches it, exactly like on the client.
  The error crosses the wire projected through your
  [`.errorClass()`](loading-error) — public fields in production, everything in
  dev. Put a boundary inside the island if you want the failure scoped to it.

A promise is accepted **only as a prop of a kept element** — an island or a host
element (anywhere inside the prop's value, arrays and objects included). A
promise in a plain data position fails the loader with an error naming the path:
data is for values, streaming is for props — `await` it or move it into an
island prop.

### Or split the data into a query, injected with `.with`

Prefer the data in a standalone [query](query) and the island in the page? Wire
them with [`.with`](with) — the query's input comes from the route, and its
`suspend: 'server'` keeps it streaming instead of blocking the shell:

```tsx
export const statsQuery = root.lets
  .query()
  .input(z.object({ projectId: z.string() }))
  .loader(async ({ input }) => ({ stats: await countStats(input.projectId) }))
  .query({ suspend: 'server' })

export const projectPage = root.lets
  .page('/projects/:projectId')
  .loading(() => <Spinner />)
  .with(statsQuery, ({ params }) => ({ projectId: params.projectId })) // inject + stream
  .page(({ data: { stats } }) => <ProjectStats stats={stats} />)
```

The page renders with `data` once the query resolves; while it streams, the
positional `.loading()` holds its place.

### Combining them in one page

Fast data, deferred markup, and a streamed island coexist on one page — each
part lands as it is ready:

```tsx
export const homePage = root.lets
  .page('/')
  .loader(async () => ({
    title: await getTitle(), // fast — in the shell
    article: defer(<Article />, <ArticleSkeleton />), // slow markup — defer
  }))
  .page(({ data }) => (
    <main>
      <h1>{data.title}</h1>
      {data.article}
      <LiveStats />
    </main>
  ))
```

The shell paints instantly with the title (plus the skeleton and
`<LiveStats />`'s loading state). The article streams in as markup; the stats
stream in as a **live** island. One page, three arrival times, one response.

### What's live where

Interactivity only differs on the **first SSR paint** — every client fetch
renders the subtree fresh on the client, so everything is live there.

|                                | first SSR paint    | client fetch (nav / mutation) |
| ------------------------------ | ------------------ | ----------------------------- |
| top-level island               | 🟢 live            | 🟢 live                       |
| island inside a `defer` hole   | 🔴 shows, but dead | 🟢 live                       |
| island via `suspend: 'server'` | 🟢 live            | 🟢 live                       |
| island reading a promise prop  | 🟢 live            | 🟢 live                       |

So the rule is one line: **`defer` for server markup; for interactive islands, a
`suspend: 'server'` query (query values) or a promise prop (ad-hoc values).** On
the first SSR paint an island revealed inside a `defer` hole displays but its
handlers stay unwired — the browser completes the server-revealed `Suspense`
boundary from the stream and never re-enters the suspended child. A `suspend`
query dodges this because its data rides react-query: when it streams in, the
observer re-renders the subscriber and mounts the island fresh. A promise prop
dodges it too: the island is an ordinary reference (never inside a
server-revealed hole), and the streamed value only settles the promise its
`use()` reads. After the first paint (any client navigation) the limit is gone —
a `defer` hole then renders fresh on the client too.

The full `suspend` semantics — `'auto' | 'server' | 'client' | true | false`,
positional fallbacks, point-vs-query level — are in
[SSR → the `ssr` and `suspend` query options](ssr#the-ssr-and-suspend-query-options).

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
2. **Component code ships per payload, not per page.** Code-splitting is by
   file: a component the page imports statically sits in the page's chunk, but a
   component point **in its own file** downloads only when a payload references
   it — with `<link rel="modulepreload">` in production builds. (One file can
   declare any number of points; the point itself isn't the split unit, the file
   is.)
3. **Server-only dependencies render markup.** A server component runs Prisma, a
   markdown renderer, a heavy chart layout — and ships only the resulting host
   elements.

The two element kinds split the same way:

|                        | Server component (plain function)       | Component point (island)                     |
| ---------------------- | --------------------------------------- | -------------------------------------------- |
| What travels           | its rendered output (host elements)     | a reference (name) + props as data           |
| Its code               | stays on the server                     | client bundle (own chunk if in its own file) |
| Hooks, state, handlers | not available — one plain function call | a full live React component                  |
| How it updates         | refetch the loader that produced it     | re-renders on its own, like any component    |

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

`t` is the node type — a host tag string like `"section"`, or `0` (Fragment),
`1` (Suspense), `2` (a deferred hole whose `id` names the fill streamed over
`__POINT0_PUSH_RSC__` — see
[`defer`](#streaming-a-slow-part-defer-suspend-and-promise-props)), `3` (a
[promise prop](#promises-as-island-props) — decodes to a promise the island
reads with `use()`; a streaming one carries the fill's `id`, an inlined one its
resolved value as `v`), or `{ c: name }` (a component-point reference); `k` is
the key, `p` the props. User data keys that collide with `__p0e` are `$`-escaped
and restored on decode. Because the codec wraps your [transformer](transformer),
custom types keep working **inside element props** — a `Date` in
`<Hero since={date} />` round-trips like any other `Date`.

Decoding is one-way by design: the server encodes elements into responses, the
SSR-embedded state, and streamed pushes, but **never decodes elements from
client input** — element markers arriving in an `input` stay inert JSON.

## What goes in loader data

Three shapes cover everything a loader can return — a server component, an
island, or plain markup:

| In loader data                         | Becomes                                                                                                    |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| a plain function component             | a **server component** — unfolds on the server (async ok, `memo` unwrapped), only its host output travels  |
| a component point                      | an **island** — a reference resolved from the points collection: server-rendered first, live on the client |
| a host element, `Fragment`, `Suspense` | kept as-is, its props walked                                                                               |

Everything interactive lives in the **island**, not the server component — the
same feature works, you just declare it in the right place:

| You want…                     | Server component                | Component point (island)     |
| ----------------------------- | ------------------------------- | ---------------------------- |
| event handlers (`onClick`, …) | ❌ can't cross the wire         | ✅                           |
| hooks, state, effects         | ❌ it's one plain function call | ✅                           |
| React context                 | ❌                              | ✅                           |
| a `ref`                       | ❌ can't cross the wire         | ✅                           |
| a code-split chunk            | ❌ `React.lazy` isn't accepted  | ✅ own file → own lazy chunk |
| render only on the client     | —                               | ✅ set `.clientOnly()` on it |

So when the loader rejects a function prop, a `ref`, or `React.lazy` — or a
plain component throws because it called a hook — the fix is always the same:
**move that piece into a component point.**

The rest are genuinely malformed, and the error names the exact path:

- a **class component** — server components and component points are both
  functions; write it as one;
- a **page, layout, or provider point** in data — only **component points** can
  be referenced;
- an element or promise **inside a `Map` or `Set`** — the codec walks plain
  objects and arrays; put element-carrying data in those (an element-free
  `Map`/`Set` passes through to the transformer untouched);
- a **promise in a data position** — a promise streams only as a
  [prop of a kept element](#promises-as-island-props); `await` the value in the
  loader or move it into an island prop;
- an element **deeper than `.rsc({ depth: n })`** — raise the depth (the error
  tells you which).

## The model's edges, and where it goes next

Point0's RSC is deliberately smaller than Flight, and its edges are explicit:

- **An island inside a `defer` hole is not interactive on the first SSR paint**
  (the matrix above). This is a known trade of the model, and the answer is not
  "wait for a fix": slow interactive content goes through `suspend: 'server'`, a
  [promise prop](#promises-as-island-props), or a top-level island — first-class
  patterns, covered on this page. Lifting the limit would take a Flight-style
  client reconciler, and that machinery is exactly what this model trades away,
  so don't plan around it changing.
- **Not planned: Flight compatibility, `'use server'` actions, a second
  react-server module graph.** Elements ride the normal data pipe — that is the
  point. Server work goes in loaders, mutations are mutations.

If an edge here costs you something real, open an issue — real usage is what
moves these.

## Where next

- [Loader](loader) — everything a loader can return.
- [Component](component) — component points, the reference targets.
- [Transformer](transformer) — the data pipe the codec wraps.
- [SSR](ssr) — streaming, suspense queries, and push-hydration.
