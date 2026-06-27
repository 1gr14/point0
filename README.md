# Point0

![Point0](./assets/point0-card-dark@2x.png)

> A fullstack TypeScript framework on Bun — your whole app, pages to endpoints,
> from one typed building block.

<!-- docs:start -->

The first fullstack framework on Bun, on par with Next.js and TanStack Start —
but with a different DX. Everything that affects a page lives in the page's
builder methods: no hidden config in other files, no folder structure forced on
you. The loader is plain react-query under the hood, so pages, layouts, and
components become cacheable queries themselves. Server and client code live in
the same builder; the compiler strips the loader body and all its imports out of
the client bundle. Works with and without SSR. Types aren't generated — it all
rides on the builder's generics.

```sh
bun create point0-app
```

- GitHub: https://github.com/1gr14/point0
- Docs: https://1gr14.dev/point0
- For your AI agent: https://1gr14.dev/llms.txt (the
  [llmstxt.org](https://llmstxt.org) format) — feed it to an agent and it
  answers any question about the framework

Below are five examples. That's enough to feel how Point0 works. Everything else
is in the docs — table of contents at the end.

## Root

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
  .root() // a point ends with the word it started with (.root) — same for all points
```

## A page with a loader

The path, the data, and the markup live in one place. `params` is typed straight
from the route string. The framework renders the loading and error states for
you.

```tsx
import { root } from '@/lib/root'
import { prisma } from '@/lib/prisma'

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
    }),
  )
  .loader(async ({ input }) => {
    const idea = await prisma.idea.update({
      where: { id: input.id },
      data: { title: input.title, content: input.content },
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
          await mutation.mutateAsync({
            id: idea.id,
            title: String(form.get('title')),
            content: String(form.get('content')),
          })
          await navigate('ideaView', { id: idea.id })
        }}
      >
        <input name="title" defaultValue={idea.title} />
        <textarea name="content" defaultValue={idea.content} />
        <button disabled={mutation.isPending}>Save</button>
      </form>
    )
  })
```

That's enough for a first look. The full docs go deeper.

## Client bundle size

- `@point0/core`: raw 143.4 KB, gzip 40.9 KB, brotli 36.2 KB
- `@1gr14/route0` (peer): raw 15.0 KB, gzip 4.7 KB, brotli 4.2 KB
- `@1gr14/error0` (optional peer): raw 3.6 KB, gzip 1.4 KB, brotli 1.3 KB
- `@tanstack/react-query` (peer): raw 38.2 KB, gzip 15.9 KB, brotli 14.2 KB

## Documentation

Full reference at [1gr14.dev/point0](https://1gr14.dev/point0).

**Getting started**

- [Overview](https://1gr14.dev/point0/latest/overview)
- [Getting started](https://1gr14.dev/point0/latest/getting-started)
- [Points](https://1gr14.dev/point0/latest/points)

**Points**

- [Page](https://1gr14.dev/point0/latest/page)
- [Layout](https://1gr14.dev/point0/latest/layout)
- [Component](https://1gr14.dev/point0/latest/component)
- [Provider](https://1gr14.dev/point0/latest/provider)
- [Mountable](https://1gr14.dev/point0/latest/mountable)
- [Query](https://1gr14.dev/point0/latest/query)
- [Infinite Query](https://1gr14.dev/point0/latest/infinite-query)
- [Mutation](https://1gr14.dev/point0/latest/mutation)
- [Action](https://1gr14.dev/point0/latest/action)
- [Root](https://1gr14.dev/point0/latest/root)
- [Base](https://1gr14.dev/point0/latest/base)
- [Plugin](https://1gr14.dev/point0/latest/plugin)

**Methods**

- [Validation](https://1gr14.dev/point0/latest/validation)
- [Loader](https://1gr14.dev/point0/latest/loader)
- [Context](https://1gr14.dev/point0/latest/ctx)
- [Middleware](https://1gr14.dev/point0/latest/middleware)
- [Loading & error](https://1gr14.dev/point0/latest/loading-error)
- [.with](https://1gr14.dev/point0/latest/with)
- [Mapper](https://1gr14.dev/point0/latest/mapper)
- [Transformer](https://1gr14.dev/point0/latest/transformer)
- [Stage Methods](https://1gr14.dev/point0/latest/stage-methods)

**Core**

- [Navigation](https://1gr14.dev/point0/latest/navigation)
- [SSR](https://1gr14.dev/point0/latest/ssr)
- [Request](https://1gr14.dev/point0/latest/request)
- [Response](https://1gr14.dev/point0/latest/response)
- [Error handling](https://1gr14.dev/point0/latest/error-handling)
- [Env](https://1gr14.dev/point0/latest/env)
- [Head](https://1gr14.dev/point0/latest/head)
- [MDX](https://1gr14.dev/point0/latest/mdx)
- [Assets](https://1gr14.dev/point0/latest/assets)
- [File upload](https://1gr14.dev/point0/latest/file-upload)
- [OpenAPI](https://1gr14.dev/point0/latest/openapi)
- [Query client](https://1gr14.dev/point0/latest/query-client)
- [Events](https://1gr14.dev/point0/latest/events)
- [Infer](https://1gr14.dev/point0/latest/infer)

**Engine**

- [Engine Config](https://1gr14.dev/point0/latest/engine-config)
- [Engine Runtime](https://1gr14.dev/point0/latest/engine-runtime)
- [CLI](https://1gr14.dev/point0/latest/cli)
- [Dev](https://1gr14.dev/point0/latest/dev)
- [Build](https://1gr14.dev/point0/latest/build)
- [Compiler](https://1gr14.dev/point0/latest/compiler)
- [Generator](https://1gr14.dev/point0/latest/generator)
- [Project MCP](https://1gr14.dev/point0/latest/mcp-project)
- [Docs MCP](https://1gr14.dev/point0/latest/mcp-docs)
- [Importer](https://1gr14.dev/point0/latest/importer)
- [Public dir](https://1gr14.dev/point0/latest/publicdir)
- [Testing](https://1gr14.dev/point0/latest/testing)
- [Deploy](https://1gr14.dev/point0/latest/deploy)
- [Bun or Vite](https://1gr14.dev/point0/latest/bun-vs-vite)

**Extra**

- [SsrStore](https://1gr14.dev/point0/latest/ssr-store)
- [CookieStore](https://1gr14.dev/point0/latest/cookie-store)
- [Basic Auth](https://1gr14.dev/point0/latest/basic-auth)
- [CORS](https://1gr14.dev/point0/latest/cors)

**Examples**

- [Basic](https://1gr14.dev/point0/latest/example-basic)
- [Vite](https://1gr14.dev/point0/latest/example-vite)
- [Better Auth](https://1gr14.dev/point0/latest/example-better-auth)
- [Capacitor](https://1gr14.dev/point0/latest/example-capacitor)
- [Expo](https://1gr14.dev/point0/latest/example-expo)

<!-- docs:end -->

## Community

Questions, bugs, or want to hang with other builders? Join the 1gr14 community —
one hub for all our open-source projects, this one included. Get help, share
what you built, or just say hi:
[1gr14.dev/#community](https://1gr14.dev/#community)

## Contributing

Issues and PRs welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) and the
[Code of Conduct](./CODE_OF_CONDUCT.md). Commits follow
[Conventional Commits](https://www.conventionalcommits.org/). Security reports:
[SECURITY.md](./SECURITY.md).

## License

[MIT](./LICENSE)

---

Made by [1gr14](https://1gr14.dev), driven by
[community](https://1gr14.dev/#community)
