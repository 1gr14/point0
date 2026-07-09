---
index: 100
title: Overview
description:
  A fullstack TypeScript framework on Bun — your whole app, pages to endpoints,
  from one typed building block.
video: https://www.youtube.com/watch?v=lhZ6eWMXMdg
---

The first fullstack framework on Bun — the scope of Next.js and TanStack Start,
the simplicity of tRPC. One typed builder describes every point: pages, layouts,
components, providers, queries, mutations, actions. Everything that affects a
page lives in the page's builder methods: no hidden config in other files, no
folder structure forced on you. The loader is plain react-query under the hood,
so pages, layouts, and components become cacheable queries themselves. Server
and client code live in the same builder; the compiler strips the loader body
and all its imports out of the client bundle. A loader can even return React
elements — server components render on the server, component points hydrate as
interactive islands. Works with and without SSR. Types aren't generated — it all
rides on the builder's generics.

```sh
bun create point0-app@latest
```

The code lives on [GitHub](https://github.com/1gr14/point0). For your AI agent
there's [1gr14.dev/llms.txt](https://1gr14.dev/llms.txt) (the
[llmstxt.org](https://llmstxt.org) format) — feed it to an agent and it answers
any question about the framework.

Below is the root — the shared setup every point inherits — and five examples
built on it. It's a deliberately thin slice: enough to feel how Point0 works
without drowning you in features. The framework behind it is much bigger — what
it covers is summed up at the end of this page, walked end to end in
[Full Overview](full-overview), and covered in depth on each feature's own page.

## Root point

Every point grows from a root — `root`. You set the shared things once here: the
loading view, the error view, the transformer, the schema helper, and more.
Every page and component inherits those, so in the examples below you won't have
to think about loading and errors.

```tsx
import { Point0 } from '@point0/core'

export const root = Point0.lets
  .root()
  // shown while a point's data is loading
  .loading(() => <Spinner />)
  // shown if loading failed
  .error(({ error }) => <ErrorScreen error={error} />)
  // loaders may return React elements (RSC: server components & islands)
  .rsc({ depth: 1 })
  .root() // a point ends with the word it started with (.root) — same for all points
```

## A page with a loader

The path, the data, and the markup live in one place. `params` is typed straight
from the route string. The framework renders the loading and error states for
you.

```tsx
import { root } from '@/lib/root'
import { prisma } from '@/lib/prisma' // server-only — never reaches the client

export const ideaPage = root.lets
  .page('/ideas/:id') // params.id is typed because the route has :id
  .loader(async ({ params }) => {
    const idea = await prisma.idea.findUniqueOrThrow({
      where: { id: params.id },
    })
    return { idea } // whatever the loader returns is typed below
  })
  .head(({ data: { idea } }) => idea.title) // the page's <title>
  .page(({ data: { idea } }) => (
    // in .page() the data is already loaded — otherwise we never reach here,
    // the root's .loading() or .error() shows instead
    <article>
      <h1>{idea.title}</h1>
      <p>{idea.content}</p>
    </article>
  ))
```

## A page with one injected query

When a loader is reused, move it into its own query and inject it into the page
with `.with()`. The query has a single cache — no duplicate requests hit the
server.

```tsx
import { root } from '@/lib/root'
import { prisma } from '@/lib/prisma'
import * as z from 'zod'

export const ideaViewQuery = root.lets
  .query()
  .input(z.object({ id: z.string() })) // schema via any library: zod, valibot, typebox…
  .loader(async ({ input }) => {
    const idea = await prisma.idea.findUniqueOrThrow({
      where: { id: input.id },
    })
    return { idea }
  })
  .query()

export const ideaPage = root.lets
  .page('/ideas/:id')
  // inject the query and map route params onto its input
  .with(ideaViewQuery, ({ params }) => ({ id: params.id }))
  .head(({ data: { idea } }) => idea.title)
  .page(({ data: { idea } }) => (
    <article>
      <h1>{idea.title}</h1>
      <p>{idea.content}</p>
    </article>
  ))
```

You can call the same query like any react-query in any component:
`ideaViewQuery.useQuery({ id })`. The compiler strips the server code out of it
on the client.

## A page with two injected queries

`.with()` can be called more than once. The queries load in parallel; the page
renders once both are ready. `.mapper()` folds them into one tidy `data` before
the render.

```tsx
export const ideaPage = root.lets
  .page('/ideas/:id')
  .with(ideaViewQuery, ({ params }) => ({ id: params.id }))
  .with(ideaBestQuery) // a second query; both load in parallel
  .mapper(({ queries: [view, best] }) => ({
    idea: view.data.idea,
    bestIdea: best.data.bestIdea,
  }))
  .page(({ data: { idea, bestIdea } }) => (
    <article>
      <h1>{idea.title}</h1>
      <aside>Best idea: {bestIdea.title}</aside>
    </article>
  ))
```

## A page with a mutation

A mutation is a react-query mutation. Declare it anywhere, call it directly by
importing the mutation itself. Types don't bloat — the editor stays fast.

```tsx
import { root } from '@/lib/root'
import { prisma } from '@/lib/prisma'
import { navigate } from '@/lib/navigation'
import * as z from 'zod'

export const ideaUpdateMutation = root.lets
  .mutation()
  .input(
    z.object({
      id: z.string(),
      title: z.string().min(1),
      content: z.string().min(1),
      image: z.file().optional(), // a file field, like any other input
    }),
  )
  .loader(async ({ input }) => {
    // input.image is a real File on the server — or undefined if none sent
    const cover = input.image && Buffer.from(await input.image.arrayBuffer())
    const idea = await prisma.idea.update({
      where: { id: input.id },
      data: { title: input.title, content: input.content, cover },
    })
    return { idea }
  })
  .mutation()

export const ideaEditPage = root.lets
  .page('/ideas/:id/edit')
  .with(ideaViewQuery, ({ params }) => ({ id: params.id }))
  .page(({ data: { idea } }) => {
    const mutation = ideaUpdateMutation.useMutation()
    return (
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          const form = new FormData(e.currentTarget)
          const image = form.get('image') as File
          await mutation.mutateAsync({
            id: idea.id,
            title: String(form.get('title')),
            content: String(form.get('content')),
            // any File in the data → multipart; none → plain JSON.
            // the schema only validates; it doesn't pick the encoding.
            image: image.size > 0 ? image : undefined,
          })
          await navigate('ideaView', { id: idea.id })
        }}
      >
        <input name="title" defaultValue={idea.title} />
        <textarea name="content" defaultValue={idea.content} />
        <input type="file" name="image" />
        <button disabled={mutation.isPending}>Save</button>
      </form>
    )
  })
```

## A component with its own loader

More often, different parts of a page need different data. Don't pull everything
into the page loader — let a component load its own. A component is a point too:
its own loader, its own props, its own loading and error states.

```tsx
import { root } from '@/lib/root'
import { prisma } from '@/lib/prisma'

export const IdeaBestComponent = root.lets
  .component<{ cta: string }>() // the component's input props type
  .loader(async () => {
    // server-only, like every loader — this body is stripped from the client
    const bestIdea = await prisma.idea.findFirstOrThrow({
      orderBy: { rating: 'desc' },
    })
    return { bestIdea }
  })
  .component(({ data, props }) => (
    <div>
      <h2>Best idea: {data.bestIdea.title}</h2>
      <p>{props.cta}</p>
    </div>
  ))

// use it like any component — short notation (name starts with a capital letter)
export const homePage = root.lets.page('/').page(() => (
  <main>
    <h1>Home</h1>
    <IdeaBestComponent cta="It's on fire!" />
  </main>
))
```

## Streaming components with `suspend`

A component with a loader is fetched during SSR, so its data lands in the first
paint — but the page waits for it. Close its loader with
`.query({ suspend: true })` and it stops holding the page back: the shell ships
at once, each component shows its loading state, and every one streams into the
**same** response the moment its own loader resolves. These aren't server
components — they're real, live components; SSR just delivers them in pieces,
with no client refetch and no waterfall.

```tsx
import { root } from '@/lib/root'
import { prisma } from '@/lib/prisma'

// close the loader with .query({ suspend: true }) so it never blocks the page
export const IdeaStats = root.lets
  .component()
  .loader(async () => ({ count: await prisma.idea.count() }))
  .query({ suspend: true })
  .component(({ data }) => <p>{data.count} ideas so far</p>)

export const IdeaTrending = root.lets
  .component()
  .loader(async () => ({ ideas: await prisma.idea.findMany({ take: 5 }) }))
  .query({ suspend: true })
  .component(({ data }) => <IdeaList items={data.ideas} />)

// the shell ships instantly; each component streams in — with the root's
// loading state in its place — as its own loader resolves, in one response
export const dashboardPage = root.lets.page('/dashboard').page(() => (
  <main>
    <h1>Dashboard</h1>
    <IdeaStats />
    <IdeaTrending />
  </main>
))
```

Two independent widgets, two arrival times, one response — the page never blocks
on the slowest.

## Server components and islands

A loader can return React elements, not just plain data — and Point0 handles the
two kinds for you. A plain function becomes a **server component**: it runs on
the server, and only its rendered markup ships to the client, so its code and
data access never reach the browser. A component point becomes an **interactive
island**: it travels as a reference and comes alive on the client. Both ride the
same data pipe as every other loader value — no `'use client'`, no second module
graph.

```tsx
import { root } from '@/lib/root'
import { prisma } from '@/lib/prisma'

// a plain async function — its code and this prisma call stay on the server
const IdeasStats = async () => {
  const count = await prisma.idea.count()
  return <p>{count} ideas so far</p>
}

export const feedPage = root.lets
  .page('/feed')
  .loader(async () => ({
    // a server component — renders here, only its markup ships
    stats: <IdeasStats />,
    // a component point — travels as a reference, hydrates as a live island
    best: <IdeaBestComponent cta="It's on fire!" />,
  }))
  .page(({ data }) => (
    <main>
      {data.stats}
      {data.best}
    </main>
  ))
```

An element is just another value in `data`, so the same trick works in queries,
mutations, layouts, and providers — anywhere a loader runs.

## Streaming a slow part with `defer`

Point0 awaits every server component before the response ships, so one slow part
would hold back the whole page. Wrap it in `defer` and the loader returns at
once: a fallback ships in its place, and the resolved markup streams into the
**same** response as it settles — on the first SSR paint and on client
navigation alike. No second request, no client waterfall.

```tsx
import { defer } from '@point0/core'
import { root } from '@/lib/root'
import { prisma } from '@/lib/prisma'

// a slow server component — its query and imports stay on the server
const Comments = async ({ ideaId }: { ideaId: string }) => {
  const comments = await prisma.comment.findMany({ where: { ideaId } })
  return <CommentList comments={comments} />
}

export const ideaPage = root.lets
  .page('/ideas/:id')
  .loader(async ({ params }) => {
    const idea = await prisma.idea.findUniqueOrThrow({
      where: { id: params.id },
    })
    return {
      idea, // fast — ships in the first paint
      // slow — the page ships without it, then it streams into the same response
      comments: defer(<Comments ideaId={params.id} />, <Spinner />),
    }
  })
  .page(({ data }) => (
    <article>
      <h1>{data.idea.title}</h1>
      {data.comments}
    </article>
  ))
```

The full model — server components, interactive islands, and streaming with
`defer` and `suspend` — is on the [RSC](rsc) page.

## Client bundle size

- `@point0/core`: raw 169.8 KB, gzip 44.4 KB, brotli 38.4 KB
- `@1gr14/route0` (peer): raw 15.5 KB, gzip 4.9 KB, brotli 4.4 KB
- `@1gr14/error0` (optional peer): raw 10.9 KB, gzip 3.2 KB, brotli 2.9 KB
- `@tanstack/react-query` (peer): raw 49.0 KB, gzip 14.8 KB, brotli 13.2 KB

## The rest of the framework

Five examples and one builder — that's how Point0 feels, not how big it is. The
same builder carries a complete framework. Points cover pages, layouts,
components, providers, queries, infinite queries, mutations, and actions. Their
methods cover validation with any schema library, middleware, context, loading
and error states, redirects, and the `<head>`. Around the points: typed
navigation, SSR or a pure client app, React Server Components with streaming,
file uploads, OpenAPI generation, typed env, assets, MDX, events. And Point0
ships its own engine — a compiler, a dev server, a production build, a CLI,
testing helpers, and two MCP servers: one that knows your project, one that
knows the docs.

All of that, and the daily loop stays fast — every number below comes from an
open benchmark repo ([Benchmarks](benchmarks)). HMR lands an edit in the DOM in
~15 ms — 3× faster than Next.js, 11× faster than TanStack Start. At 500 pages
the production build finishes over 2× faster than both, and the per-edit
type-check stays flat where Next.js slows down 2.5×.

That's Point0: the scope of Next.js and TanStack Start, the simplicity of tRPC,
a DX no other framework has. Scaffold an app and feel it:

```sh
bun create point0-app@latest
```

## Where next

- [Getting Started](getting-started) — scaffold an app with one command and run
  it.
- [Full Overview](full-overview) — the whole framework in one long read, every
  major feature as a code example.
- [Benchmarks](benchmarks) — how Point0 measures against Next.js and TanStack
  Start, from an open benchmark repo.
- [Points](points) — the one building block behind pages, layouts, queries, and
  mutations.
