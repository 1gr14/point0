---
index: 100
title: Basic Example
description:
  The canonical Point0 app — a collective ideas blog on Prisma, Tailwind,
  wouter, and a Bun-bundled client.
label: Basic
example: examples/basic
---

`examples/basic` is the canonical Point0 app, **IdeaNick** — a collective ideas
blog where anyone posts an idea and adds news updates to it. It is the reference
the other four examples are described against: each of them is "the same app,
but with one piece swapped". The buttons above and below open it on CodeSandbox,
GitHub, and github.dev; this page only sketches the shape.

What it puts together:

- SSR for the first load, then client-side (SPA-style) navigation between pages
- the whole point family wired up — pages, layouts, queries, mutations,
  components — plus an MDX page
- Prisma + SQLite, type-safe routing through wouter, Tailwind v4, React 19 with
  the React Compiler
- a client bundled by **Bun** (this is the distinctive choice — the
  [vite](example-vite) example bundles the same client with Vite instead)
- a file upload, infinite-query pagination, and an OpenAPI spec behind basic
  auth

Everything grows from the **root** — one builder chain that sets the
serialization wire, the schema helper, the error class, the prefetch policy, the
global head, the loading/error fallbacks, and the OpenAPI middleware:

```tsx
// examples/basic/src/lib/root.tsx
export const root = Point0.lets
  .root()
  .serverUrl(sharedEnv.SERVER_URL)
  .clientUrl(sharedEnv.CLIENT_URL)
  .transformer(superjson) // Date/Map/etc survive the SSR wire
  .schemaHelper(zodSchemaHelper()) // teach Point0 to read zod schemas
  .errorClass(AppError) // your own error class (default is ErrorPoint0)
  .head('global', () => ({
    titleTemplate: '%s | IdeaNick',
    htmlAttrs: { lang: 'en' },
  }))
  .loading(() => <LoadingCard />) // shown while any point's data is pending
  .error(({ error }) => <ErrorCard error={error} />) // shown on a thrown error
  .middleware(
    openapi({
      route: '/openapi.json',
      filter: 'all',
      before: basicAuth({ users: { admin: 'admin' } }),
    }),
  )
  .root()
```

Every page, query, and mutation in the app starts from `root.lets`. From there a
typical point is a short `.lets` chain — a server `.loader` (Prisma never ships
to the browser), then the closing call that picks its kind:

```ts
// examples/basic/src/lib/idea.ts — a query: a reusable, cacheable read
export const ideaViewQuery = root.lets
  .query()
  .input(z.object({ id: z.number() }))
  .loader(async ({ input }) => ({
    idea: await prisma.idea.findUniqueOrThrow({ where: { id: input.id } }),
  }))
  .query()
```

For each piece — [pages](page), [layouts](layout), [queries](query),
[mutations](mutation), [components](component), [assets](assets),
[file upload](file-upload), [infinite query](infinite-query), [MDX](mdx),
[OpenAPI](openapi) — follow the link to its own page; the source shows how they
come together here.

## Running it

From the repo root once, then inside `examples/basic`:

```sh
# repo root — build the @point0/* packages so the `point0` CLI exists
bun install
bun run build

# in examples/basic
bun run setup   # SQLite DB + prisma generate + point0 generate + seed
bun run dev     # point0 dev --hot — server + client, server hot reload
```

`src/generated/` (the Prisma client and Point0's points/routes/assets) is
**gitignored** — `bun run setup` produces it. For production, `bun run build`
then `bun run start`. See [getting-started](getting-started), [CLI](cli), and
[Dev](dev).

## For a real app

This example shows Point0 in isolation. For a real product, start from
**[Start0](https://1gr14.dev/start0)** — the SaaS boilerplate with auth, admin,
forms, CRUD, email, and deploy already wired together
(`bun create start0@latest my-app`).

## The other examples

- [vite](example-vite) — same app, client bundled by Vite instead of Bun.
- [better-auth](example-better-auth) — same app, plus Better Auth.
- [capacitor](example-capacitor) — same app, wrapped in a native mobile shell.
  _Experimental._
- [expo](example-expo) — Point0's server and data layer behind a React Native
  client. _Experimental._
