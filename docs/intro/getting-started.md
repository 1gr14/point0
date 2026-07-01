---
index: 200
title: Getting Started
description: Scaffold a Point0 app with one command, then run it.
---

The fastest way into Point0 is the scaffolder. One command writes a complete app
— SSR, Prisma + SQLite, Tailwind, type-safe routing — installs it, and runs
codegen, so you can go straight to the dev server.

```sh
bun create point0-app@latest
# prompts for a name and a bundler (Bun or Vite), installs deps, runs setup
cd my-app
bun run dev # http://localhost:3001 (client) + http://localhost:3000 (server)
```

You need Bun — `bun create point0-app` resolves to the `create-point0-app`
package by Bun's `create-<x>` convention. The rest of this page covers the
scaffolder's flags, the first-run commands, and — if you'd rather wire an app by
hand — exactly which files and scripts to create.

## `bun create point0-app`

Run it with no arguments and it prompts interactively; pass a name and flags to
skip the prompts:

```sh
bun create point0-app@latest my-app          # name as a positional argument
bun create point0-app@latest my-app --vite   # use Vite for the client bundle
bun create point0-app@latest my-app --no-install   # scaffold only, don't install
bun create point0-app@latest my-app -I       # non-interactive, take all defaults
```

It scaffolds into `<cwd>/<name>`. If that directory already exists and is not
empty, the run stops unless you pass `--override` (or confirm the prompt).

### Flags

| Flag                         | Default           | What it does                                          |
| ---------------------------- | ----------------- | ----------------------------------------------------- |
| `[name]`                     | `my-app`          | Directory name for the new app                        |
| `--vite` / `--no-vite`       | `--no-vite` (Bun) | Bundle the client with Vite instead of Bun            |
| `--install` / `--no-install` | `--install`       | Run `bun install` + `bun run setup` after scaffolding |
| `-O, --override`             | off               | Allow writing into a non-empty target directory       |
| `-I, --no-interactive`       | off               | Skip every prompt and use the defaults above          |

Interactively, the same four choices come as prompts: project name, bundler
(`Bun` or `Vite`, default `Bun`), install now (default yes), and override (only
asked if the target directory is non-empty, default no).

### Bun is required

The scaffolder checks for Bun first. With `-I` and no Bun on `PATH`, it errors
out (`Bun is required but was not found in PATH`). Interactively, it offers to
install Bun globally with `npm install -g bun` before continuing.

`bun create point0-app` is the only supported entry point — there's no `npx` /
`pnpm dlx` / `yarn create` equivalent. Those would resolve the
`create-point0-app` bin, but both the scaffolder and the app it writes run on
Bun, so they'd dead-end the moment you tried to use the result.

### Bun or Vite — pick at scaffold time

The `--vite` choice changes which files you get. The two are mutually exclusive:

- **Bun** (default) — Bun bundles the client; Tailwind comes from
  `bun-plugin-tailwind`, declared as `bunPlugins` in `engine.ts`. No
  `vite.config.ts`.
- **Vite** — Vite bundles the client via a `viteConfig` block in `engine.ts` and
  a `vite.config.ts`; CSS is linked from `index.html`; `preload.ts` gets
  `preventLoadBunPlugins: true`.

You can't have both — `engine.ts` carries `viteConfig` _or_ `bunPlugins`, never
both. The trade-offs are in [bun-vs-vite](bun-vs-vite); the Vite walkthrough is
[vite](example-vite).

## First run

With `--install` (the default), the scaffolder already ran `bun install` and
`bun run setup` for you, so you can jump straight to the dev server:

```sh
cd my-app
bun run dev # point0 dev --hot
```

If you scaffolded with `--no-install`, or cloned a fresh checkout, or reset the
database, run the setup chain first:

```sh
bun install
bun run setup   # migrate the SQLite DB, generate Prisma + point0 code, seed data
bun run dev     # dev server + client, with server hot reload
```

`bun run setup` is the important one. `src/generated/` (the Prisma client and
point0's points / routes / assets) is **gitignored** — `setup` produces it.
Without it, typecheck fails and the app won't run:

```jsonc
// the setup chain, from package.json
"setup": "bun run prisma:migrate:deploy && bun run prisma:generate && point0 generate && bun run seed"
```

> **Why `setup`, not `prepare`?** A `prepare` script runs on every `bun install`
> — which breaks installs where no database exists yet (CI, a monorepo). So the
> codegen + DB step is named `setup` and run explicitly, not on install.

For production you build and start:

```sh
bun run build   # point0 build → dist/
bun run start   # cross-env NODE_ENV=production bun run ./dist/server/index.server.js
```

There is no `point0 start` command — production runs the built server entry
directly. See [deploy](deploy).

## The package.json scripts

If you wire an app by hand, these are the scripts to add. The four core ones map
directly to the `point0` CLI:

```jsonc
{
  "scripts": {
    "dev": "point0 dev --hot", //   dev server + clients, server hot reload
    "generate": "point0 generate", // write src/generated/point0/* from your points
    "build": "point0 build", //     build server + clients into dist/
    "start": "cross-env NODE_ENV=production bun run ./dist/server/index.server.js",
  },
}
```

`point0 dev` and `point0 build` are thin wrappers over `engine.dev()` /
`engine.build()` — full flag lists are in [cli](cli), [dev](dev), and
[build](build). `--hot` turns on server-side hot reload (hot-swap edited points
without restarting the server); it's marked **experimental** in the CLI help.

The supporting scripts complete the setup chain — Prisma helpers, a seed, and
typecheck:

```jsonc
{
  "scripts": {
    "setup": "bun run prisma:migrate:deploy && bun run prisma:generate && point0 generate && bun run seed",
    "seed": "cross-env NODE_ENV=development bun --preload ./src/preload.ts ./src/lib/seed.ts",
    "prisma:generate": "cross-env NODE_ENV=development prisma generate",
    "prisma:migrate:deploy": "cross-env NODE_ENV=development prisma migrate deploy",
    "types": "tsgo --noEmit",
  },
}
```

Note `seed` runs with `--preload ./src/preload.ts` — any direct `bun src/<file>`
that imports app code needs the preload first, so the point0 compiler plugins
are registered before that code loads (more on this below).

## Wiring an app by hand

The scaffolder is the easy path, but Point0 is just a set of packages — you can
assemble an app from a handful of files. These are the entry files
`create-point0-app` writes, each cited from the template so you can copy them.

### `src/engine.ts` — the engine config

Everything starts from one `Engine.create(...)` call. It declares SSR, where to
find points, where to write generated code, and one config block per side
(`server`, `client`):

```ts
// src/engine.ts (Bun-bundled form)
import { Engine } from '@point0/engine'
import { clientEnvKeys } from '@/lib/env/client-shape'

export const engine = Engine.create({
  file: import.meta.url, // engine anchors all relative paths to this file
  ssr: true,
  pointsGlob: '**/*.{ts,tsx,mdx}', // where points live
  generate: {
    meta: './generated/point0/meta.ts',
    assetsTypes: './generated/point0/assets.d.ts',
  },
  server: {
    scope: 'root',
    port: process.env.SERVER_PORT || process.env.PORT,
    entry: { main: './index.server.ts' },
    points: async () => await import('./generated/point0/points.server'),
    generate: { points: './generated/point0/points.server.ts' },
    outdir: '../dist/server',
  },
  client: {
    scope: 'root',
    port: process.env.CLIENT_PORT,
    indexHtml: './index.html',
    app: async () => await import('./app.client'),
    points: async () => await import('./generated/point0/points.client'),
    generate: {
      points: './generated/point0/points.client.ts',
      routes: {
        outfile: './generated/point0/routes.ts',
        origin: 'process.env.CLIENT_URL',
      },
    },
    bunPlugins: ['bun-plugin-tailwind'], // Vite mode replaces this with `viteConfig`
    env: { vars: clientEnvKeys }, // which env keys are bundled into the client
    publicdir: {
      source: [
        '../public',
        { 'robots.txt': () => 'User-agent: *\nDisallow: /' },
      ],
      outdir: '../dist/client',
    },
    outdir: '../dist/client',
  },
})
```

Every option here has a page: the full schema is [engine-config](engine-config),
the codegen keys are [generator](generator), `publicdir` is
[publicdir](publicdir), and `env.vars` is [env](env). The `examples/basic`
engine adds one extra block —
`client.compiler.babel: ['babel-plugin-react-compiler']` — which the template
omits.

### The four entry files

Around the engine sit four small files. Order is load-bearing in two of them.

**`src/preload.ts`** — registers the point0 compiler plugins and env constants.
Anything that imports app code must run this first:

```ts
// src/preload.ts
import { engine } from '@/engine'

await engine.preload({ nodeEnvFallback: 'development' })
```

**`src/index.server.ts`** — the server entry (this is what `start` runs in
production, as `dist/server/index.server.js`). Preload before app code, via
dynamic imports so the order holds:

```ts
// src/index.server.ts
await import('./preload.js')
await import('./app.server.js') // imports @/engine and calls engine.serve()
export {}
```

`app.server.ts` validates the server env, then calls `await engine.serve()`. See
[engine-runtime](engine-runtime) for `serve()` and the rest of the engine
instance.

**`src/app.client.tsx`** — the React app shell, default-exported. It nests the
providers your points expect (react-query, unhead) and mounts the router:

```tsx
// src/app.client.tsx
import { Router, RouterRoutes } from '@/lib/navigation'
import { UnheadProvider } from '@point0/core/unhead'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/query-client'

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UnheadProvider>
        <Router>
          <RouterRoutes />
        </Router>
      </UnheadProvider>
    </QueryClientProvider>
  )
}
```

**`src/index.client.tsx`** — the browser entry. It hands your `App` and the
generated points to `mount` from `@point0/react-dom/mount`:

```tsx
// src/index.client.tsx
import '@/lib/env/client' // validate client env before mounting
import App from '@/app.client'
import points from '@/generated/point0/points.client'
import '@/styles/index.css'
import { ErrorBoundary } from '@/ui/error-boundary'
import { mount } from '@point0/react-dom/mount'

mount(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
  points,
)

if (import.meta.hot) {
  import.meta.hot.accept()
}
```

`mount` mounts into `#root` by default (it throws if `#root` is missing) and
hydrates from the SSR-dehydrated store when one is present. `index.html` is the
HTML template the client builds from — a `#root` div plus a
`<script type="module" src="./index.client.tsx">`.

### What else the scaffolder gives you

The four entry files above are the wiring; the rest of the template is the
working example built on top of them:

- **`src/lib/root.tsx`** — the [root](root) point (`Point0.lets.root()...`),
  where you set the transformer, schema helper, error class, prefetch policy,
  and global middleware like [openapi](openapi). Every page and query grows from
  here.
- **`src/lib/navigation.ts`** — the router wiring (`createNavigation` over
  wouter), exporting `Link`, `navigate`, `Router`, `RouterRoutes`, etc. See
  [navigation](navigation).
- **`src/lib/query-client.ts`**, **`src/lib/prisma.ts`**, **`src/lib/error.ts`**
  (a custom `AppError` class wired in via `.errorClass(...)` — the template
  builds it with [error0](error-handling), but any compatible class works, and
  the default is `ErrorPoint0`), and the four-file **`src/lib/env/*`** system
  (shared / client / server [env](env) shapes and validators).
- **Example points**: `src/layouts/general.tsx` (a [layout](layout)),
  `src/pages/home.tsx` (a [page](page)), `src/pages/about.mdx` (an [mdx](mdx)
  page).
- **`src/generated/`** — never hand-edited; produced by `point0 generate` and
  `prisma generate`, and gitignored. See [generator](generator).

Plus project-level files: `package.json`, `tsconfig.json` (with the `@/*` →
`./src/*` path alias), `bunfig.toml`, `prisma.config.ts` +
`prisma/schema.prisma`, `env.example`, a `Dockerfile`, and `.gitignore`.

> **Gotcha — the template `docker-compose.yml` points at the monorepo.** It
> references `examples/basic` (build context `../..`), a stale artifact that
> does not work in a standalone generated app. Don't rely on `docker compose`
> from the scaffolded app until you rewrite it — see [deploy](deploy) for the
> real deploy path.

## No leaked dev servers

The `point0` CLI shebang is
`#!/usr/bin/env -S bun --no-orphans --no-env-file --config=/dev/null`, and the
scaffolded `bunfig.toml` sets `[run] noOrphans = true`. Together they tie the
whole process tree to its launcher: close the terminal and the dev server (and
all its children) exits with it — no orphaned servers holding ports.

`--no-orphans` landed in **Bun 1.3.14**, so that's the floor — the generated
`package.json` declares it as `"engines": { "bun": ">=1.3.14" }`. On an older
Bun the dev server still runs, but it can leak orphaned processes that keep
holding ports; upgrade with `bun upgrade`.

## Reference

### Scaffolder defaults (`-I` non-interactive)

| Choice   | Default  |
| -------- | -------- |
| name     | `my-app` |
| bundler  | Bun      |
| install  | yes      |
| override | no       |

### Scripts the CLI backs

| Script     | Command                                              | CLI page               |
| ---------- | ---------------------------------------------------- | ---------------------- |
| `dev`      | `point0 dev --hot`                                   | [dev](dev)             |
| `build`    | `point0 build`                                       | [build](build)         |
| `generate` | `point0 generate`                                    | [generator](generator) |
| `start`    | `bun run ./dist/server/index.server.js` (prod)       | [deploy](deploy)       |
| `setup`    | prisma migrate + generate + `point0 generate` + seed | —                      |

### Entry files

| File                   | Role                                                       |
| ---------------------- | ---------------------------------------------------------- |
| `src/engine.ts`        | `Engine.create(...)` — the whole app config                |
| `src/preload.ts`       | registers compiler plugins + env consts (`engine.preload`) |
| `src/index.server.ts`  | server entry; preload, then `app.server` (`engine.serve`)  |
| `src/app.client.tsx`   | React app shell (providers + router), default export       |
| `src/index.client.tsx` | browser entry; `mount(<App/>, points)`                     |
| `src/index.html`       | HTML template with `#root` + the client `<script>`         |
