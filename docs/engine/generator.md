---
index: 700
title: Generator
description: The codegen step that turns your points into the points/routes/meta/asset files the app imports.
---

The generator scans your source for [points](points), then writes a small set of
files the app imports at boot: a server points aggregator, a client one, a typed
route table, a metadata file, and ambient asset typings. You don't hand-write any
of them — you point each output at a path in the engine config, and `point0
generate` fills it in.

```ts
// engine.ts — every generated file is opt-in
export const engine = Engine.create({
  file: import.meta.url,
  pointsGlob: '**/*.{ts,tsx,mdx}',
  generate: { meta: './generated/point0/meta.ts', assetsTypes: './generated/point0/assets.d.ts' },
  server: {
    points: async () => await import('./generated/point0/points.server'),
    generate: { points: './generated/point0/points.server.ts' },
  },
  client: {
    points: async () => await import('./generated/point0/points.client'),
    generate: {
      points: './generated/point0/points.client.ts',
      routes: { outfile: './generated/point0/routes.ts', origin: 'process.env.CLIENT_URL' },
    },
  },
})
```

Run it with the CLI:

```sh
point0 generate       # one-shot: scan points, write the files
point0 generate -w    # ...and keep watching for changes
```

`dev` and `build` run it for you — `point0 dev` generates once at startup and
watches; `point0 build` always generates first. The rest of this page covers each
generated file, when it reruns, and the config that controls it.

## The generated files

The generator writes a separate file per output, and **only the outputs you name
in `generate`** — there are no implicit defaults. The example apps put them all
under `src/generated/point0/`, but the path is yours.

### points.server.ts — server points

The server's aggregator: a flat array of every server-side point, static-imported
so it all lands in the server bundle.

```ts
// generated points.server.ts
import type { PointsDefinition } from '@point0/core'
import { root as root_0, page as page_1, layout as layout_2 } from './file0.js'
export default [
  root_0,
  page_1,
  layout_2,
] as PointsDefinition<typeof root_0['Infer']['RequiredCtx'], typeof root_0['Infer']['Error']>
```

A point lands here when it's the [root](root) of the scope or has an HTTP
endpoint — a [query](query), [mutation](mutation), or [action](action), or any
other point ([page](page), [layout](layout), [component](component),
[provider](provider)) that has a [`.loader`](loader) (and pages also come whenever
`ssr: true`). The app feeds it back to the engine:

```ts
// engine.ts → server
points: async () => await import('./generated/point0/points.server'),
generate: { points: './generated/point0/points.server.ts' },
```

**SSR changes the contents.** With `ssr: true` every page comes to the server (it
gets server-rendered). With `ssr: false` only pages that have a `.loader` come —
they have an endpoint to fetch; loader-less pages are client-only and stay out.

### points.client.ts — client points

The client's aggregator: pages, layouts, and the root for the SPA. By default each
point is a **lazy** dynamic import, so it becomes its own chunk loaded on
navigation:

```ts
// generated points.client.ts (lazy — the default)
import type { PointsDefinition } from '@point0/core'
import { root as root_0 } from './file0.js'
export default [
  root_0,
  {
    type: 'page',
    name: 'mypage',
    route: '/news',
    polh: false, // prefetch-on-link-hover (from .prefetchPageOnLinkHover)
    point: async () => (await import('./file0.js')).page,
  },
  {
    type: 'layout',
    name: 'mylayout',
    route: '/layout',
    point: async () => (await import('./file0.js')).layout,
  },
] as PointsDefinition<typeof root_0['Infer']['RequiredCtx'], typeof root_0['Infer']['Error']>
```

Each page record carries its `route`, its `polh` flag (the hover-prefetch setting,
`boolean` or a debounce in ms), and any `layouts` it sits under. The root is always
imported statically — it has to be present from the first render.

Set `lazy: false` and the client file becomes the same static-import shape as the
server one — every point in a single bundle, no per-page chunks:

```ts
// engine.ts → client
generate: { points: { outfile: './generated/point0/points.client.ts', lazy: false } },
```

There is no per-page `.lazy()` method; lazy-vs-ready is a whole-file switch in the
codegen config. See the [page](page) authoring notes for the trade-off.

### routes.ts — the typed route table

Every page route, collected into a [route0](navigation) table you import for
`<Link>`s and `navigate`:

```ts
// generated routes.ts
import { Routes } from '@1gr14/route0'

export const routes = Routes.create({
  mypage: '/news',
})
```

```ts
import { routes } from '@/generated/point0/routes'
```

Only pages with a route are included. A page's [`.basePath`](stage-methods) prefix
is already folded into its route string. Set an `origin` and it rides along on the
table — a raw expression when it starts with `process.env.` / `import.meta.env.` /
a backtick, otherwise a quoted string:

```ts
generate: { routes: { outfile: './generated/point0/routes.ts', origin: 'process.env.CLIENT_URL' } }
// => Routes.create({ mypage: '/news' }, { origin: process.env.CLIENT_URL })
```

Route keys are quoted only when they aren't a valid JS identifier (`mypage:` bare,
`'my-page':` quoted) — matching Prettier's `quoteProps: 'as-needed'`, so diffs stay
clean.

> **NOTE — routes are emitted as bare path strings, untyped.** Typed-search routes
> are intentionally disabled to avoid a `routes.ts → page → Link → routes.ts` type
> cycle, so a page that declares `.search()` still emits a plain string here.

### meta.ts — point metadata for tooling

A full description of every point — including invalid ones — for tools that need to
reason about your app without importing it. The [project MCP](mcp-project) reads it.

```ts
// generated meta.ts (engine block)
export default {
  engine: {
    file: '<file>',
    import: async () => (await Engine.findAndImportSelf({ engineFile: '<file>' })).engine,
    server: { scope: 'myroot' },
    clients: [{ scope: 'myroot' }],
  },
  points: [
    {
      scope: 'myroot',
      type: 'page',
      name: 'mypage',
      id: 'myroot:page:mypage',
      tags: ['ideas'],
      description: `...`,
      route: undefined, // or Route0.create(...) when the point has a route
      endpoint: undefined, // or { method, route } for query/mutation/action
      pos: { file: '<file>', line: 5, column: 20 }, // source position
      import: async () => (await import('./file0.js')).page,
      valid: true,
      errors: [],
      ssr: false,
      parents: [],
      layouts: [],
    },
    // ...one entry per point, invalid and plugin points included
  ],
}
```

Each entry carries the point's scope, type, name, id, tags, description, route,
endpoint, source position, a lazy `import`, validity, and its linked parents and
layouts. The [project MCP](mcp-project) bin consumes it:

```sh
point0-project-mcp --meta ./src/generated/point0/meta.ts
```

The MCP re-reads the file on every call, so it never serves stale points after a
`point0 generate`.

### assets.d.ts — ambient asset typings

Ambient declarations that type imported static assets, so `import logo from
'./logo.png'` and its `?url` / `?file` / `?text` / `?raw` / `?react` forms type
correctly:

```ts
generate: { assetsTypes: './generated/point0/assets.d.ts' }
```

```ts
// generated assets.d.ts (excerpt)
declare module '*.png' { const src: string; export default src }
declare module '*.png?url' { const src: string; export default src }
declare module '*.svg?react' {
  import type { FC, SVGProps } from 'react'
  const ReactComponent: FC<SVGProps<SVGSVGElement>>
  export default ReactComponent
}
```

The extension list and the bare-import type both default from the general
[`compiler.assets`](assets) config (`defaultMode: 'url'` out of the box) — one
source of truth — and you can override them per output:

```ts
generate: { assetsTypes: { outfile: './generated/point0/assets.d.ts', extensions: ['png', 'svg', 'pdf'] } }
```

Reference the file from your `tsconfig` `types` or `include`, or with a `/// <reference path="..." />`.
The asset pipeline as a whole is on [Assets](assets).

<!-- TODO(low): dev/docs/asset-pipeline.md describes assets.d.ts as emitted via a customFile generator task; the current code uses a dedicated assetsTypes task. The dev doc may be stale — code wins. -->

## When it regenerates

```sh
point0 generate       # one-shot
point0 generate -w    # watch and regenerate on change
```

- **`point0 dev`** generates once at startup, then runs a watcher in parallel.
  `-G` / `--no-generate` skips generation; `-W` / `--no-watch` disables watching.
- **`point0 build`** always generates first — there is no "build without generate"
  (skipping it would leave a stale aggregator on disk).
- The watcher follows `pointsGlob`. Add, edit, or delete a point file and it logs
  `add: page.mypage` / `remove: page.mypage` and rewrites only the affected files.

Two things keep the output stable:

- **Idempotent writes.** A file is rewritten only when its content actually
  changes, and points are sorted deterministically — so unrelated edits produce no
  diff. Writes are atomic (temp file under `node_modules/.cache`, then renamed).
- **Safe on errors.** A point with parse or collection errors is logged but doesn't
  break generation; the previous good point set is kept, so a broken edit never
  blows away your aggregators.

Hot reload does **not** need a regenerate — the dev server resolves points from the
engine's source, not from the generated file. Generation matters when a point is
*added or removed*, which is exactly what the watcher catches.

> **NOTE:** the generator's watcher is `pointsGlob`, separate from the server's
> `devWatchGlob` (restart trigger) and `buildWatchGlob`. Vite/expo exclude
> `meta.ts` from `devWatchGlob` because meta changes on every point edit and would
> otherwise restart the server needlessly.

## Gitignored output

Generated code is **gitignored** — the example apps ignore `src/generated`
wholesale. So a fresh checkout, worktree, or CI run must generate before
typechecking, or imports like `./generated/point0/points.client` won't resolve.
That's what `bun run setup` does at the repo level (it runs `point0 generate` per
app); per-app, the `generate` script is wired to `point0 generate`.

`examples/expo` is the exception: it has no client `generate` and commits its
`points.server.ts`, ignoring only `meta.ts` and the Prisma client.

> **NOTE:** `setup` is not a CLI command. `bun run setup` is repo/app `package.json`
> orchestration (Prisma generate + `point0 generate`); the only generator CLI verb
> is `point0 generate`.

## Reference

### CLI

| Command | Flag | Effect |
| --- | --- | --- |
| `point0 generate` | — | scan points, write the configured files once |
| `point0 generate` | `-w`, `--watch` | regenerate on every change |
| `point0 generate` | `--engine <path>` | engine file (absolute or relative to cwd) |
| `point0 dev` | `-G`, `--no-generate` | skip generation in dev |
| `point0 dev` | `-W`, `--no-watch` | don't restart/regenerate on change |

`point0 build` always generates; it has no skip flag.

### Where each output is configured

`generate` lives in three places, each carrying different outputs:

| Output | Config location | Key |
| --- | --- | --- |
| `points.server.ts` | `server.generate` | `points` |
| `points.client.ts` | `client.generate` | `points` (`lazy?`) |
| `routes.ts` | `client.generate` | `routes` (`origin?`) |
| `meta.ts` | `generate` (general) | `meta` |
| `assets.d.ts` | `generate` (general) | `assetsTypes` (`extensions?`) |

Each value is either a string (the outfile path) or an object with `outfile` plus
extra keys. **Omit `generate` and nothing is generated** — it defaults to `[]`.

### Per-output options

| Option | Type | Default | Effect |
| --- | --- | --- | --- |
| `points.outfile` (server/client) | string | — | aggregator path |
| `points.banner` | string \| null | none | text prepended to the file |
| `points.lazy` (client) | boolean | `true` | lazy per-page chunks vs one static bundle |
| `routes.outfile` | string | — | route table path |
| `routes.origin` | string \| null | none | route origin; raw if `process.env.` / `import.meta.env.` / backtick prefix |
| `routes.banner` | string \| null | none | prepended text |
| `meta.outfile` | string | — | metadata path |
| `meta.banner` | string \| null | none | prepended text |
| `assetsTypes.outfile` | string | — | `.d.ts` path |
| `assetsTypes.extensions` | string[] | `compiler.assets.extensions`, else point0's built-in asset extension list | managed extensions |
| `assetsTypes.banner` | string \| null | none | prepended text |

The bare-import type (`defaultMode` — `'url'` \| `'file'` \| `'text'` \| `'react'` \| `false`, where `false` omits the bare declaration) is **not** a key on the simple object config; in that form it always comes from [`compiler.assets`](assets) (`'url'` out of the box). To set it per output you need the raw array form: `generate: [{ what: 'assetsTypes', outfile, defaultMode: 'file' }]`.

A page record needs a [root](root) in the scope; the `points` and `routes` outputs
throw `Root point not found for scope <scope>` without one.

### Custom outputs

Beyond the named outputs, `generate` accepts custom tasks for generating your own
files from the point set:

- `{ what: 'customFile', handler, outfile }` — `handler` returns the file content
  and the generator writes it to `outfile` atomically, just like the built-ins.
- `{ what: 'customControlled', handler }` — `handler` writes its own files (no
  `outfile`); use it when one task emits several files or a path you compute
  yourself.

Both handlers receive the same options object and run on every (re)generation:

```ts
type Handler = (options: {
  points: CompilerPoint[]   // the valid points, after collection
  cwd: string               // engine cwd — resolve your output paths against it
  log: LogFn                // the generator's logger
  tempDir: string           // scratch dir for atomic temp files
  emitPointsImports: (options: {
    points: CompilerPoint[]
    // customControlled also passes the target `outfile` so imports resolve relative to it
  }) => EmitNamedImportsResult // ready-to-write import lines for the given points
}) => /* customFile */ string | Promise<string>
   // /* customControlled */ | void | Promise<void>
```

`customFile`'s `handler` returns a `string` (or `Promise<string>`) — the full file
content. `customControlled`'s `handler` returns `void` (or `Promise<void>`) and is
responsible for writing whatever files it needs itself.

```ts
// engine.ts → generate
generate: {
  custom: [
    {
      what: 'customFile',
      outfile: './generated/point0/point-ids.ts',
      handler: ({ points }) =>
        `export const pointIds = ${JSON.stringify(points.map((p) => p.id))}`,
    },
  ],
},
```

Supply them either as the full raw array form (`generate: [{ what: 'customFile', … }]`)
or via a `custom` array inside the simple object config (`generate: { custom: [...] }`,
and likewise under `server.generate` / `client.generate`).

<!-- TODO(low): no example app or start0 uses a custom generator task — the shapes are confirmed in code/tests, but there's no worked production example to adapt. -->

<!-- TODO(med): document the EmitNamedImportsResult shape (importLines, importedPoints, …) so callers know how to assemble a file that imports points — currently only named, not described. -->

<!-- TODO(low): CompilerPoint is a compiler-internal type; consider exposing/aliasing a public type for handler authors, or describe the fields a handler actually needs (id, scope, type, name, route, endpoint). -->


