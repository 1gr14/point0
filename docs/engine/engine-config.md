---
index: 100
title: Engine Config
description:
  Every option you pass to Engine.create({ ... }) — file, ssr, server/client
  blocks, generate, env, and the rest.
---

The engine is the one object that ties an app together: it knows where your
points live, how to build them, which ports to serve on, and whether to render
on the server. You create it once with `Engine.create({ ... })` and export it as
`engine` — the `point0` CLI finds that export and drives dev, build, and codegen
off it.

```ts
// src/engine.ts
import { Engine } from '@point0/engine'
import { clientEnvKeys } from './client-shape'

export const engine = Engine.create({
  file: import.meta.url, // REQUIRED — how the engine locates itself
  ssr: true,
  pointsGlob: '**/*.{ts,tsx,mdx}',
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
    compiler: { babel: ['babel-plugin-react-compiler'] },
    bunPlugins: ['bun-plugin-tailwind'],
    env: { vars: clientEnvKeys },
    publicdir: { source: '../public', outdir: '../dist/client' },
    outdir: '../dist/client',
  },
})
```

That's the canonical Bun setup from `examples/basic`. The config object is
**flat general options** (`file`, `ssr`, `generate`, …) plus nested blocks:
`server` and `client` (or `clients` for several), each with its own options. The
rest of this page walks through them by need; the full per-option tables are at
the bottom.

The CLI accepts a named `engine` export or a default export — either must be an
`Engine` instance.

## `file` — the one required option

```ts
Engine.create({ file: import.meta.url /* ... */ })
```

`file` is almost always `import.meta.url`. The engine uses it to locate itself
on disk — that drives `cwd`, build-output paths, and auto-discovery. Omit it and
`Engine.create` throws:

```
You should provide engine file path via file: import.meta.url, it is critical
for engine to work
```

It accepts a `file://` URL (what `import.meta.url` gives you) or a plain path.

Because the CLI imports your `engine.ts` raw — before any compiler transforms —
the module must not throw or do real work at load time. Keep it to
`Engine.create({ ... })` and shape-only values.

## Server, client, clients

An app has one `server` block and one or more clients. Use `client` for a single
client, `clients: [...]` for several:

```ts
Engine.create({
  file: import.meta.url,
  server: { scope: 'root' /* ... */ },
  client: { scope: 'root' /* ... */ }, // shorthand for one client
})
```

```ts
Engine.create({
  file: import.meta.url,
  server: { scope: 'root' /* ... */ },
  clients: [
    {
      scope: 'root',
      port: process.env.CLIENT_PORT,
      indexHtml: './index.client.html',
    },
    // ...more clients
  ],
})
```

`client` and `clients` are concatenated, so you can use both. If you omit the
server entirely, it defaults to `{ scope: 'root', ssr: false }`.

Both blocks share many options (`scope`, `points`, `generate`, `port`,
`importer`, `env`, `compiler`, `assets`, `viteConfig`, …) but each side also has
its own. The server runs your API and SSR; a client builds and serves the
browser bundle. The client-only options you almost always set are `indexHtml`
(the HTML shell) and `app` (the client app component):

```ts
client: {
  scope: 'root',
  indexHtml: './index.html',
  app: async () => await import('./app.client'),
}
```

### `serving: false` clients

A client can opt out of being served by the engine — useful for a native shell
(Capacitor, Expo) you build but don't host:

```ts
clients: [
  { scope: 'root' }, // served (serving: true is the default)
  { scope: 'native', serving: false }, // built, but not bound to the server or dev serve
]
```

A `serving: false` client is excluded from the server, from prepare, and from
dev serve — only its build runs.

## SSR

`ssr` decides whether pages render on the server. Set it at the top level as the
engine default, or per side:

```ts
Engine.create({
  file: import.meta.url,
  ssr: true, // engine default; server and client inherit unless they override
})
```

The object form tunes the re-render loop. Point0 may re-render a page during SSR
until its data store stabilizes; these options bound that:

```ts
ssr: {
  enabled: true,                          // default true when you pass an object
  allowedDiscoveryRenders: 5,             // soft budget of discovery renders (default Infinity)
  forbiddenDiscoveryRenders: 25,          // hard cap — stop AND log a server error (default 25)
  prefetchLoadersBeforePageRender: true,  // prefetch declared loaders first, so fewer re-renders (default false)
}
```

Both caps count **discovery renders** — the passes before the final render (the
final render always happens and is not counted).

- **`allowedDiscoveryRenders`** is the soft budget. Default is `Infinity`
  (render until the store is stable). Set `1` to opt out of the stabilization
  re-renders for performance, or `0` to skip discovery entirely (earliest shell,
  everything streams — see [ssr](ssr#alloweddiscoveryrenders-soft-cap)).
- **`forbiddenDiscoveryRenders`** is the safety net (default `25`). If a value
  keeps changing every render — say a stray `Date.now()` — the loop hits this
  cap, stops, and logs an error.
- **`prefetchLoadersBeforePageRender`** (default `false`) prefetches the page's
  and its layouts' `.loader()` server queries (inputs from the route) before the
  first render, so it finds the data in cache. The `.onPrefetchPage` hooks run
  before the first render regardless; this adds the declared loaders on top.
  Queries injected with `.with()` are still discovered by rendering. See
  [ssr](ssr#prefetchloadersbeforepagerender) and [navigation](navigation) for
  the prefetch model.

Resolution: an explicit `server.ssr` / `client.ssr` wins, else the engine-level
`ssr`, else `false`.

**The re-render tuning is read from the client, not the server.** A page is
server-rendered through its client, so the executor reads
`allowedDiscoveryRenders`, `forbiddenDiscoveryRenders`, and
`prefetchLoadersBeforePageRender` from the resolved **client** SSR options. The
server's `ssr` is only a boolean: it gates whether the server runs the SSR
machinery (and the `POINT0_SSR_ENABLED_DEFAULT` const). Set the object form on
the engine default or on the client — tuning fields on `server.ssr` are dropped.

## Telling the engine where points are

Three things connect your point source files to the engine: a glob to discover
them, a `points` loader to feed them in at runtime, and a `generate` config to
emit the manifests.

```ts
Engine.create({
  file: import.meta.url,
  pointsGlob: '**/*.{ts,tsx,mdx}', // which files the generator scans for points
  server: {
    scope: 'root',
    // runtime loader: import the generated server-points manifest
    points: async () => await import('./generated/point0/points.server'),
    generate: { points: './generated/point0/points.server.ts' }, // where to emit it
  },
})
```

- **`pointsGlob`** (`string | string[]`, default `[]`) is the glob the
  [generator](generator) walks to find point source files.
- **`points`** is the runtime loader — usually an `async () => import(...)` of
  the generated manifest. The server's default is a bare root point if you omit
  it; a client's default is empty.
- **`generate`** (per side) emits the manifests. See the next section.

## Code generation (`generate`)

`generate` controls codegen — the files `point0 generate` writes. There's a
**general** `generate` for app-wide outputs and a **per-side** `generate` for
the points/routes manifests. See [generator](generator) for the full picture.

General form (top level):

```ts
generate: {
  meta: './generated/point0/meta.ts',          // analyzer meta — powers `point0 points` + MCP
  assetsTypes: './generated/point0/assets.d.ts', // ambient types for asset imports
  // custom: [ /* custom file generators */ ],
}
```

Per-side form:

```ts
server: {
  generate: { points: './generated/point0/points.server.ts' },
},
client: {
  generate: {
    points: './generated/point0/points.client.ts',
    routes: { outfile: './generated/point0/routes.ts', origin: 'process.env.CLIENT_URL' },
  },
},
```

Each path can be a string or `{ outfile, banner? }`. The client `points` form
also takes a `lazy` flag, and `routes` takes an `origin`:

```ts
client: {
  generate: {
    points: { outfile: './generated/point0/points.client.ts', lazy: false }, // eager imports
    routes: { outfile: './generated/point0/routes.ts', origin: 'process.env.CLIENT_URL' },
  },
}
```

**Pages are lazy by default.** The generator forces `lazy: true` for client
points when you don't set it, so each page becomes its own dynamically imported
chunk. Set `points: { outfile, lazy: false }` to make them eager. There is no
per-page method for this — see [page](page).

`generate` also accepts a raw `FilesGeneratorTask[]` instead of the simple
object, for full control. Default when omitted: `[]` (no codegen).

## Ports

```ts
server: { port: process.env.SERVER_PORT || process.env.PORT }, // default 3000
client: { port: process.env.CLIENT_PORT },                     // default serverPort + index + 1
```

- **Server `port`** defaults to `3000`; **client `port`** to
  `serverPort + clientIndex + 1`.
- **`hmrPort`** (server and client) defaults to `port + 100`. Pass `false` to
  disable it, a number to pin it, or `true`/omit for the default.

`point0` never kills a port — if one is taken it reports the conflict and stops.
See [dev](dev) for the dev lifecycle.

## Bun build config (`bunBuildConfig`)

When a side bundles with Bun (the default — see below), `bunBuildConfig` passes
options to the underlying build. It's the same options object you'd pass to
[`Bun.build`](https://bun.sh/docs/bundler#api), and Point0 spreads it into the
build call after its own defaults. Set it at the top level for both sides, or
per side:

```ts
Engine.create({
  file: import.meta.url,
  server: {
    scope: 'root',
    bunBuildConfig: { external: ['some-native-dep'], minify: true },
  },
})
```

It also accepts a function, handed `{ mode, side, scope }`, so you can branch on
who's building:

```ts
bunBuildConfig: ({ mode, side, scope }) => ({
  minify: mode === 'production',
}),
```

Lists that Point0 manages itself (`plugins`, `external`, `entrypoints`,
`naming`, `define`, `banner`) are merged with Point0's own values rather than
replaced. Everything else passes straight through to Bun.

## Bun or Vite

There is **no `vite: true` flag**. The bundler is chosen by whether `viteConfig`
is present: set it (top level or per side) and that side builds with Vite; omit
it and you get Bun-native bundling.

```ts
client: {
  // function form: point0 hands you the injected `plugins` and the build context;
  // spread `...plugins` where you want point0's compiler plugin to run
  viteConfig: ({ plugins, side }) => ({
    resolve: { tsconfigPaths: true },
    plugins: [
      ...plugins, // point0's vite compiler plugin lives here
      react({ include: /\.(jsx|js|mdx|md|tsx|ts)$/ }),
      tailwindcss(),
      side === 'client' ? analyzer({ analyzerMode: 'static', openAnalyzer: false }) : null,
    ],
  }),
}
```

`viteConfig` accepts three forms:

```ts
viteConfig: ({ plugins, side, command, mode, scope }) => ({
  /* UserConfig */
}) // function
viteConfig: {
  /* a literal Vite UserConfig */
} // object
viteConfig: './vite.config.ts' // path to your own config
```

The function receives
`{ command: 'serve' | 'build', side: 'client' | 'server', mode, scope, plugins }`.
To switch a project between bundlers, comment the `viteConfig` out. Full
comparison and trade-offs on [bun-vs-vite](bun-vs-vite).

## Static files (`publicdir`)

`publicdir` mounts static files. It lives on the server and on each client:

```ts
client: {
  publicdir: {
    source: '../public', // a string dir → mounted at /
    outdir: '../dist/client',
  },
}
```

`source` can be a string, a record of route → file, or an array mixing both. A
function value synthesizes a file on the fly:

```ts
publicdir: {
  source: [
    '../public', // serve everything under ../public at /
    {
      '.well-known/appspecific/com.chrome.devtools.json': () => '{}',
      'robots.txt': () => 'User-agent: *\nDisallow: /',
    },
  ],
  outdir: '../dist/client',
}
```

- **`source`** — string dir, record, array, or tuples. Function values are
  evaluated lazily.
- **`outdir`** — where `publicdir` is emitted at build time. `publicdir` is
  inactive unless an `outdir` resolves.
- **`cacheLimit`** — `false`/`0` disables caching, `true`/omit caches all, a
  number caps it. Default `true`.

Production static serving of built assets uses this wiring too. See
[publicdir](publicdir).

## Env: `vars` vs `consts`

Both sides take `env: { vars?, consts? }`. The split matters:

```ts
client: {
  env: {
    vars: clientEnvKeys,        // RUNTIME — injected into the HTML, read at run time
    consts: ['PUBLIC_FLAG'],    // COMPILE-TIME — inlined into the bundle as literals
  },
}
```

- **`consts`** are inlined at compile time — `process.env.X` becomes a JSON
  literal in the bundle. They're also injected into the HTML as
  `__POINT0_ENV_CONSTS__`.
- **`vars`** are runtime values injected into the served HTML as
  `window.__POINT0_ENV_VARS__`, not inlined — read them at run time.

Each form is a string (a single var name, or a `*` glob matched against
`process.env`), a record, or an array of those:

```ts
env: {
  vars: ['SOURCE_BASE_URL']
} // pick named vars
env: {
  vars: {
    API_URL: process.env.API_URL
  }
} // explicit record
env: {
  consts: 'PUBLIC_*'
} // glob — all PUBLIC_-prefixed vars
```

**Client env is guarded.** An empty string `''` or a bare `'*'` in a client's
`vars` or `consts` throws — that would leak your entire `process.env` to the
browser. The **server** `vars` is stricter still: it only accepts
records/arrays, no string or glob form. The server can see everything, so it has
no such guard on `consts`.

Point0 always injects these consts: `NODE_ENV`, `POINT0_SCOPE`, `POINT0_SIDE`,
`POINT0_SSR_ENABLED_DEFAULT`, and `POINT0_BUILT` (at build). Full treatment on
[env](env).

## Guarding imports (`importer`)

`importer` (per side) controls which imports a build accepts, mocks, or treats
specially. The most common use is mocking native-only deps in a server build:

```ts
server: {
  importer: { mock: ['react-native', 'expo-router'] }, // rewrite these to a mock at compile time
}
```

- **`mock`** — rewrite a matched import to a mock module, at compile time, in
  every mode.
- **`deny`** — forbid a matched import (throws or logs at the import site).
- **`cold`** — dev-hot-reload only, **server only**: a file whose path matches
  is externalized from the hot graph, so editing it restarts the server child
  instead of hot-swapping. A `cold` rule on a client is a silent no-op.
- **`cwd`** — base for relative rule paths; defaults to the engine cwd.
- **`onDeny`** — `'throw'` or `'log'`. Default `'log'`. A build forces `'throw'`
  regardless, so a denied import always fails the build; `onDeny` only governs
  dev compilation.

Each list takes `string | RegExp` entries. See [importer](importer) for the full
model (it also covers the in-file `import '@point0/core/cold'` marker).

## Compiler and assets

`compiler` configures the source transform; `assets` configures static-asset
imports. Both have an engine-level default and a per-side override.

```ts
client: {
  compiler: { babel: ['babel-plugin-react-compiler'] }, // add a babel plugin to this side
}
```

`compiler` also accepts a boolean: `compiler: false` turns the transform off for
that side (native bundler asset handling, no point transforms); `compiler: true`
is on with defaults. It takes `babel`, `markdown` (MDX options), `consts`,
`filter`, `cache`, and more — the [compiler](compiler) page covers them.

`assets` is `boolean | { enabled?, extensions?, defaultMode?, svgr? }`:

```ts
assets: {
  extensions: ['png', 'svg', 'woff2'], // which extensions go through the asset pipeline
  defaultMode: 'url',                  // 'url' | 'file' | 'text' | 'react' | false
  svgr: false,                         // disable ?react SVG-to-component
}
```

`defaultMode` defaults to `'url'`; `extensions` defaults to a broad image/font/
media set; `svgr` is on by default. **One caveat:** `extensions`, `defaultMode`,
and `svgr` must agree between the client and the SSR side, or the two sides emit
different asset URLs and you get hydration mismatches. Per-side overrides are
allowed but a footgun. Full pipeline on [assets](assets).

## Logger

```ts
logger: {
  log: ({ level, category, message, error, meta }) => {
    /* ... */
  }
}
```

Pass a `{ log }` object, or a function (sync or async) that returns one. The
function form is resolved during preload, **after** the bun plugins load, so a
logger you import inside it goes through the compiler transforms:

```ts
logger: async () => {
  const { logger } = await import('@/lib/logger')
  return {
    log: ({ category, level, message, error, meta }) =>
      console.error({ level, category, input: message, props: { ...meta, ...(error ? { error } : {}) } }),
  }
},
```

See [events](events) for the event/logging model.

## Reference

### General (top-level) options

These spread directly into `Engine.create({ ... })`, alongside `server` /
`client` / `clients`.

| Option                             | Type                             | Default      | Notes                                                                      |
| ---------------------------------- | -------------------------------- | ------------ | -------------------------------------------------------------------------- |
| `file`                             | `string`                         | — (required) | `import.meta.url`. Locates the engine on disk. Throws if missing.          |
| `ssr`                              | `boolean \| SsrOptions`          | `false`      | Engine default SSR; sides inherit. See [SSR](#ssr).                        |
| `generate`                         | object \| `FilesGeneratorTask[]` | `[]`         | App-wide codegen: `meta`, `assetsTypes`, `custom`.                         |
| `pointsGlob`                       | `string \| string[]`             | `[]`         | Glob the generator scans for point files.                                  |
| `assets`                           | `boolean \| object`              | enabled      | Default asset config; per-side wins.                                       |
| `compiler`                         | `object \| boolean`              | on           | Default compiler config; per-side wins.                                    |
| `logger`                           | `{ log } \| (() => { log })`     | default log  | Object or (async) function form.                                           |
| `banner`                           | `string`                         | `null`       | Prepended to generated files.                                              |
| `bunPlugins`                       | plugin list                      | `[]`         | Shared bun plugins for **both** sides; per-side `bunPlugins` are additive. |
| `bunBuildConfig`                   | object                           | `null`       | General `Bun.build` overrides.                                             |
| `viteConfig`                       | fn \| object \| string           | —            | Presence switches to Vite. See [Bun or Vite](#bun-or-vite).                |
| `buildWatchGlob`                   | `string \| string[]`             | `[]`         | Extra `build --watch` patterns on top of the import-graph watch.           |
| `itWasBuilt`                       | `boolean`                        | from env     | Internal: flags running from built `dist/`.                                |
| `cwdBeforeBuild` / `cwdAfterBuild` | `string`                         | auto-derived | Internal: source vs build cwd.                                             |
| `autoFixBuiltPaths`                | `boolean`                        | `true`       | Rewrites relative config paths after build.                                |

`bunBuildConfig` is a `Partial<Bun.BuildConfig>` or a
`({ mode, side, scope }) => Partial<Bun.BuildConfig>` function; `bunPlugins` is
an `Array<BunPlugin | string>` or a function returning one. Both are
passthroughs to Bun — there are no Point0-specific fields. See
[Bun build config](#bun-build-config-bunbuildconfig).

The remaining general options rarely appear in app code:

- **`buildWatchGlob`** — extra globs on top of `build --watch`'s import-graph
  watch, for files outside the import graph (e.g. non-imported assets).
- **`itWasBuilt` / `cwdBeforeBuild` / `cwdAfterBuild`** — auto-derived from
  `file` and the server `outdir` (overridable via `POINT0_ENGINE_*` env vars).
  They tell a built bundle where its source tree was so relative config paths
  still resolve.

### Server block (`EngineServerOptions`)

| Option           | Type                              | Default                    | Notes                                                                                                                          |
| ---------------- | --------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `scope`          | `PointsScope`                     | — (required)               | e.g. `'root'`, `'site'`.                                                                                                       |
| `points`         | points loader                     | bare root point            | Usually `async () => import('./generated/point0/points.server')`.                                                              |
| `generate`       | object                            | `[]`                       | `{ points?, custom? }`.                                                                                                        |
| `entry`          | `string \| Record<string,string>` | `null`                     | A string becomes `{ main: <string> }`.                                                                                         |
| `port`           | `number \| string`                | `3000`                     | Coerced with `Number()`.                                                                                                       |
| `hmrPort`        | `number \| string \| boolean`     | `port + 100`               | `false` disables.                                                                                                              |
| `outdir`         | `string`                          | `'dist'`                   | Auto-set; drives the after-build cwd.                                                                                          |
| `publicdir`      | `{ source, outdir, cacheLimit? }` | `null`                     | See [publicdir](#static-files-publicdir).                                                                                      |
| `importer`       | importer options                  | `{ cwd }`                  | See [importer](#guarding-imports-importer).                                                                                    |
| `env`            | `{ vars?, consts? }`              | `{}`                       | Server `vars` is **strict** (no glob form).                                                                                    |
| `routes`         | routes loader                     | `null`                     | `() => import('./lib/routes')` or a routes object.                                                                             |
| `compiler`       | `object \| boolean`               | inherits general           |                                                                                                                                |
| `assets`         | `boolean \| object`               | inherits general           |                                                                                                                                |
| `viteConfig`     | fn \| object \| string            | inherits general           |                                                                                                                                |
| `ssr`            | `boolean \| SsrOptions`           | inherits general / `false` | Only the on/off value is used here; re-render tuning is read from the client. See [SSR](#ssr).                                 |
| `devWatchGlob`   | `string \| string[]`              | `[]`                       | Default watch glob for `point0 dev` when `--watch` has no value.                                                               |
| `bunBuildConfig` | object                            | `{}`                       |                                                                                                                                |
| `bunPlugins`     | plugin list                       | `[]`                       |                                                                                                                                |
| `bunServeConfig` | `Serve.Options`                   | `null`                     | Raw `Bun.serve` config. Options passed to `engine.serve()` win over it; `port`/`fetch`/`websocket` are always owned by Point0. |
| `banner`         | `string`                          | `null`                     |                                                                                                                                |

### Client block (`EngineClientOptions`)

| Option             | Type                              | Default                    | Notes                                                                            |
| ------------------ | --------------------------------- | -------------------------- | -------------------------------------------------------------------------------- |
| `scope`            | `PointsScope`                     | — (required)               |                                                                                  |
| `points`           | points loader                     | `null`                     |                                                                                  |
| `serving`          | `boolean \| string \| fn`         | `true`                     | `false` → not bound to the server, skips dev serve.                              |
| `generate`         | object                            | `[]`                       | `{ points?, routes?, custom? }`. `points` takes `lazy`; `routes` takes `origin`. |
| `app`              | app component loader              | `null`                     | `async () => import('./app.client')`.                                            |
| `indexHtml`        | `string`                          | `null`                     | The HTML shell, e.g. `'./index.html'`.                                           |
| `domRootElementId` | `string`                          | `'root'`                   | Mount-point element id.                                                          |
| `port`             | `number \| string`                | `serverPort + index + 1`   |                                                                                  |
| `hmrPort`          | `number \| string \| boolean`     | `port + 100`               |                                                                                  |
| `outdir`           | `string`                          | `null`                     | e.g. `'../dist/client'`.                                                         |
| `publicdir`        | `{ source, outdir, cacheLimit? }` | `null`                     |                                                                                  |
| `importer`         | importer options                  | `{ cwd }`                  |                                                                                  |
| `env`              | `{ vars?, consts? }`              | `{}`                       | Client `vars`/`consts` are **wide** but throw on `''` / `'*'`.                   |
| `routes`           | routes loader                     | `null`                     |                                                                                  |
| `compiler`         | `object \| boolean`               | inherits general           | e.g. `{ babel: ['babel-plugin-react-compiler'] }`.                               |
| `assets`           | `boolean \| object`               | inherits general           |                                                                                  |
| `viteConfig`       | fn \| object \| string            | inherits general           |                                                                                  |
| `ssr`              | `boolean \| SsrOptions`           | inherits general / `false` |                                                                                  |
| `bunBuildConfig`   | object                            | `{}`                       |                                                                                  |
| `bunPlugins`       | plugin list                       | `[]`                       | e.g. `['bun-plugin-tailwind']`.                                                  |
| `banner`           | `string`                          | `null`                     |                                                                                  |

### SSR options (`SsrOptions`)

Set on the engine default `ssr` or on a client `ssr`. The re-render tuning
(`allowedDiscoveryRenders`, `forbiddenDiscoveryRenders`,
`prefetchLoadersBeforePageRender`) is read from the client at render time; the
server keeps only the `enabled` boolean. See [SSR](#ssr).

| Option                            | Type      | Default                          | Notes                                                                                         |
| --------------------------------- | --------- | -------------------------------- | --------------------------------------------------------------------------------------------- |
| `enabled`                         | `boolean` | `true` (when an object is given) | Toggle.                                                                                       |
| `allowedDiscoveryRenders`         | `number`  | `Infinity`                       | Soft budget of discovery renders. `1` = single pass; `0` = skip discovery, stream everything. |
| `forbiddenDiscoveryRenders`       | `number`  | `25`                             | Hard cap; stop and log a server error.                                                        |
| `prefetchLoadersBeforePageRender` | `boolean` | `false`                          | Also prefetch declared `.loader()` queries before the first render.                           |

### Related pages

- The instance methods (`engine.serve()`, `engine.fetch()`, `engine.preload()`,
  the `index.server` / `app.client` / `preload` wiring) live on
  [engine-runtime](engine-runtime).
- The `point0` commands (`dev`, `build`, `generate`, `compile`, …) that consume
  this config are on [cli](cli).
- `basePath` / route prefixing is **not** an engine option — it's a `Point0`
  chain method (`.basePath()`). See [stage-methods](stage-methods) and
  [base](base).
