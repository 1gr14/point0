---
index: 500
title: Build
description:
  point0 build — generate, then bundle the server and every client in parallel
  into dist/.
---

`point0 build` turns your app into a `dist/` you can run in production. It
always generates first, then bundles the **server** and every **client** in
parallel — each side with Bun (the default) or Vite. The server bundle runs your
app and server-renders each first page load (when SSR is on); the client bundle
is the static browser code it serves — the one that hydrates that render and
then drives client-side navigation between pages (SPA-style).

```sh
point0 build
# Build...
# Build completed in 1843ms
```

That command is a thin wrapper over `engine.build()` (see [CLI](cli)). The
result is two trees under your configured `outdir`s:

```
dist/
  server/index.server.js   # the server entry — `bun run` this in prod
  client/index.html         # the HTML shell (server-rendered into on first load)
  client/**.js              # client chunks (lazy page chunks, shared chunks)
  client/_point0/assets/…    # hashed asset bytes, served at /_point0/assets/<hash>
  client/_point0/preload.json     # per-page module preload manifest
  client/_point0/<scope>/build-version.json  # the build identity ([deploy](deploy) invalidation)
```

## Generate runs first, always

There is no "build without generate". `engine.build()` calls the
[generator](generator) before it bundles anything:

```ts
// inside engine.build()
await this.generator.sync({ logOnNotWritten: true }) // codegen first
// ...then clean + bundle server and clients
```

This is on purpose: a stale points aggregator means wrong or missing pages, and
an empty in-memory point set means no per-page preload. Generate emits the files
your app imports — the points aggregators (`points.server.ts` /
`points.client.ts`), the [routes](navigation) table, the analyzer `meta.ts`, and
the asset `*.d.ts` — all under `src/generated/point0/` (gitignored). Wiring
lives in the engine config:

```ts
// examples/basic/src/engine.ts
generate: { meta: './generated/point0/meta.ts', assetsTypes: './generated/point0/assets.d.ts' },
server: { generate: { points: './generated/point0/points.server.ts' } },
client: { generate: {
  points: './generated/point0/points.client.ts',
  routes: { outfile: './generated/point0/routes.ts', origin: 'process.env.CLIENT_URL' },
} },
```

You can run codegen on its own with `point0 generate` — full details on
[Generator](generator).

## Server and client build in parallel

After generate, the two sides bundle at the same time:

```ts
await Promise.all([buildClientsPromise, buildServerPromise])
```

All clients build in parallel too, so a multi-client app doesn't pay for each
one in series. The whole run is timed and logged as `Build completed in {ms}ms`.

The two sides differ in target and intent:

|                  | Server bundle                        | Client bundle                                |
| ---------------- | ------------------------------------ | -------------------------------------------- |
| Target           | `bun` (or `ssr: true` under Vite)    | `browser`                                    |
| Format           | ESM                                  | ESM, code-split (`splitting: true`)          |
| Minified         | always                               | only when `NODE_ENV=production`              |
| Served to users? | no — you run it                      | yes — the server serves `dist/client` at `/` |
| Entry            | your `entry` files + the engine file | the `indexHtml`                              |

The server is never sent over the wire, so it's always minified. The client
bundle is public — treat it as code anyone can read: server-only code is
stripped by the [compiler](compiler) at build time, not guarded at runtime.

## Bun or Vite, per side

By default each side builds with **Bun** (`Bun.build`), with no config needed —
`examples/basic`, the canonical Bun app, sets no build config at all. To reach
into the Bun build, pass `bunBuildConfig` on that side: a plain
`Partial<Bun.BuildConfig>` (or `({ mode, side }) => …`) spread **over** Point0's
defaults, so you can override **any** default — `target`, `minify`, `define`,
`external`, `naming`, plugins, anything `Bun.build` accepts:

```ts
export const engine = Engine.create({
  file: import.meta.url,
  server: {
    // …entry, points, outdir…
    bunBuildConfig: { minify: false }, // override the always-minified server
  },
  client: {
    // …indexHtml, app, points, outdir…
    bunBuildConfig: ({ mode }) => ({
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    }),
  },
})
```

To switch a side to **Vite/Rolldown**, give that side a `viteConfig`. The choice
is per side: build the **client** with Vite while the **server** stays on Bun
(or vice versa) by setting the option on the side you want, not at the top of
the config:

```ts
export const engine = Engine.create({
  file: import.meta.url,
  server: {
    // …no viteConfig here → server stays on Bun…
  },
  client: {
    // …viteConfig here → only the client switches to Vite…
    viteConfig: ({ plugins, side }) => ({
      resolve: { tsconfigPaths: true },
      plugins: [
        ...plugins, // Point0's compiler plugin is already in here
        react({ include: /\.(jsx|js|mdx|md|tsx|ts)$/ }),
        tailwindcss(),
        side === 'client'
          ? analyzer({ analyzerMode: 'static', openAnalyzer: false })
          : null,
      ],
    }),
  },
})
```

Like `bunBuildConfig`, `viteConfig` is a plain Vite `UserConfig` (object or
`({ plugins, side, mode }) => …`). The function form receives `plugins`
(Point0's compiler plugin is already included) and `side` (`'server'` or
`'client'`). `examples/vite` puts one `viteConfig` at the top level so both
sides build on Vite. When to pick which is on [Bun or Vite](bun-vs-vite); the
asset-pipeline differences are on [Assets](assets).

For the Bun path, `vite` and `esbuild` are kept `external` in the server bundle
— a Bun-only app builds and runs without either installed.

## The build is production by default

`build` defaults to `NODE_ENV=production`. That's what enables minification and
external source maps. Build in any other mode and Point0 warns you:

```sh
point0 build --mode development
# WARN  Building with NODE_ENV=development, not "production": the client gets
#       inline sourcemaps and unminified bundles. Intentional? If not, set
#       NODE_ENV=production
```

Mode resolution (`--mode` > `--env NODE_ENV=…` > shell `NODE_ENV` > the command
default) decides which `.env` files load and which env consts get inlined into
the bundle. Full mode/env rules are on [Engine config](engine-config).

Two kinds of env behave differently at build time:

- **`env.consts` are inlined.** At compile time the bundler replaces each
  `process.env.X` with the literal value (`"prod"`), so the const is frozen into
  the bundle and survives minification/tree-shaking. The client also gets these
  consts written into `dist/client/index.html`. Change a const → you must
  rebuild.
- **`env.vars` are NOT inlined.** They stay real environment variables read at
  run time. The client receives them as `window.__POINT0_ENV_VARS__` (injected
  into the served HTML by the running server, not baked into the JS); on the
  server they're plain `process.env` values from the machine you run on.

One internal const matters at runtime regardless: `POINT0_BUILT='true'` is
defined into the server bundle and flips the engine into **built mode** — in
built mode `engine.preload` skips the dev-only work (no plugin loading, no dev
server, no `NODE_ENV` fallback) but still applies your server `env.vars` to
`process.env`, and module preload links inject. See
[Engine runtime](engine-runtime).

## Running the build

The server entry name comes from your engine's `server.entry` — `main` becomes
`dist/server/index.server.js`, and that's exactly the file you run:

```ts
export const engine = Engine.create({
  file: import.meta.url,
  server: {
    entry: { main: './index.server.ts' }, // → dist/server/index.server.js
    // …points, outdir…
  },
})
```

```json
// examples/basic/package.json
"build": "point0 build",
"start": "bun run ./dist/server/index.server.js"
```

The built server serves `dist/client` at `/`, so the HTML shell, the JS chunks,
and the hashed assets (`GET /_point0/assets/<hash>`) all resolve out of the
client build. Run it with `NODE_ENV=production` in the environment — a built
server started with no `NODE_ENV` falls into Bun's dev cascade. In production
that var is part of the machine's environment, so the `start` script above
doesn't set it inline. Deployment, including Docker, is on [Deploy](deploy).

## Source maps

Production client builds emit **external** source maps (`.map` files), and after
the Bun client build Point0 re-chains them so a browser stack trace points at
your **original** source, not the compiler's intermediate transform:

```sh
point0 build
# Source maps: re-chained 12/18 client chunk maps to original source
```

The reason: Bun's bundler composes its `bundle→intermediate` map but drops the
compiler's inline `intermediate→original` map ([Bun #6173][bun6173]), so the raw
maps would resolve to generated code (`react/compiler-runtime`, `_temp`, `_c(`).
The post-build pass (`chainBundledSourceMaps`) composes the two with
`@jridgewell/remapping` and relativizes the sources. It only runs when Point0's
compiler ran on the build, and it's a no-op when there's nothing to chain.

Source-map mode is per side and per mode:

|                    | Bun                       | Vite                                             |
| ------------------ | ------------------------- | ------------------------------------------------ |
| Client, production | `external` (`.map` files) | `hidden` (`.map`, no `sourceMappingURL` comment) |
| Client, dev build  | `inline`                  | `true`                                           |
| Server             | `linked`                  | `true`                                           |

The client dir is served publicly, so a common production flow uploads the
client `.map` files to an error tracker (e.g. Sentry) and then deletes them,
while keeping the server maps (the server runs, it isn't served). Dev source
maps are a separate mechanism — see [Dev](dev).

[bun6173]: https://github.com/oven-sh/bun/issues/6173

## Module preload manifest

Each client build writes `dist/client/_point0/preload.json`, a map from page
name to the JS chunks that page needs. The built server reads it and injects
`<link rel="modulepreload">` tags so a page's chunks download in parallel with
the HTML instead of after hydration:

```jsonc
{
  "entry": "/chunk-abc.js",
  "entryPreload": ["/chunk-def.js"], // entry's static closure (empty on Vite)
  "byPoint": { "idea": ["/chunk-idea.js"] }, // per-page lazy chunk + its closure
}
```

The manifest is computed from the bundler's chunk graph (Bun's metafile, or
Rolldown's output). Mapping a page to its chunks needs the in-memory compiler
points, so `engine.build` feeds each client its page sources right before
bundling. The whole thing is **best-effort**: a glitch resolving sources logs a
warning and falls back to entry-closure-only preload; it never fails the build.

Set `POINT0_MODULE_PRELOAD=false` (also `0` / `off`) to disable both the
manifest and its injection. The manifest is only _served_ in the built prod
runtime — a stale one is ignored in dev.

## Watch mode

`point0 build --watch` rebuilds on change. With no glob it watches the **import
graph** of your build entries — it resolves what your server entries and each
client's `<script src>` actually import, so a deep source edit triggers a
rebuild without you listing files:

```sh
point0 build --watch
# rebuilds when any file in the entries' import graph changes
```

A glob value (`--watch '<glob>'`, comma-separated or repeated) and the config's
`buildWatchGlob` are **additive** on top of the import-graph watch, not a
replacement. Each rebuild re-spawns a fresh `point0 build` child and re-collects
the import graph, since an edit can add or remove imports. Use `--keep-alive`
when a build plugin runs a long-lived server (like a bundle-analyzer on `:8888`)
that you want to stay up after the build.

## Partial builds

Build one side or one [scope](root) instead of everything:

```sh
point0 build --side client        # only the client bundle
point0 build --side server        # only the server bundle
point0 build --scope root         # only the 'root' scope
```

**Gotcha with url-mode assets.** The bytes for url-mode assets are written
**only by the client build** (the server build references the same
`/_point0/assets/<hash>` string but writes no bytes). So `--side server` alone
does **not** produce servable assets — `/_point0/assets/<hash>` 404s unless a
client build already populated `dist/client`. Build both sides (the default)
whenever the app uses url-mode assets; only `?file` assets are self-contained on
a server-only build. See [Assets](assets).

## Clean and publicdir

By default the build cleans each `outdir` before bundling (the clean runs up
front, in parallel, so the actual builds skip it). Two flags turn the
housekeeping off:

```sh
point0 build --no-clean       # keep the existing dist/ (incremental over it)
point0 build --no-publicdir   # skip copying the publicdir into the client outdir
```

The [publicdir](publicdir) is copied into the client `outdir` **before** the JS
build, so on a name collision the built `dist` files win over a static file. See
[Publicdir](publicdir).

## Reference

### `point0 build` flags

From the CLI (`packages/engine/src/cli.ts`). Each maps to an `engine.build()` /
`engine.buildWatch()` option.

| Flag                 | What it does                                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `--engine <path>`    | Path to the engine file (absolute or relative to cwd).                                                                         |
| `-w, --watch [glob]` | Rebuild on change. No value → watch the entries' import graph; a glob is additive on top of that and `buildWatchGlob`.         |
| `--side <side>`      | Build only one side: `server` or `client`.                                                                                     |
| `--scope <scope>`    | Build only the matching scope.                                                                                                 |
| `-C, --no-clean`     | Do not clean the outdir before building.                                                                                       |
| `-P, --no-publicdir` | Do not copy the publicdir into the client outdir.                                                                              |
| `-k, --keep-alive`   | Don't exit after the build — wait for Ctrl+C so long-lived build plugins (e.g. a bundle-analyzer server) keep running.         |
| `--env <name=value>` | Define env vars, repeatable; these override `.env` file values.                                                                |
| `--mode <mode>`      | NODE_ENV mode: `production` \| `development` \| `test`. Decides which `.env` files apply. Default for `build` is `production`. |

Without `--keep-alive`, the process ends naturally once build plugins flush,
with a 5-second safety-net force-exit.

### `engine.build()`

```ts
await engine.build({
  side, // 'server' | 'client' — default: both
  scope, // restrict to one scope — default: all
  clean, // default: true
  publicdir, // default: true
})
// => {
//   clients: Array<{ client, publicdir, scope }>,
//   server: { server, publicdir },
// }
```

The arrays hold the written file paths per side (`null` when that side was
skipped). `engine.buildWatch()` takes the same options plus the watch glob. Both
refuse to run from an already-built engine
(`You can not build by built engine`). The instance methods are on
[Engine runtime](engine-runtime).

### Per-side build config

Knobs you set on `general` / `server` / `client` in the engine config (full
reference on [Engine config](engine-config)):

| Option                         | Effect                                                                                                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `outdir`                       | Output dir for that side (e.g. `'../dist/server'`, `'../dist/client'`).                                                                                       |
| `viteConfig`                   | Object or `({ plugins, side }) => UserConfig`. Presence switches the side to Vite.                                                                            |
| `bunBuildConfig`               | `Partial<Bun.BuildConfig>` or `({ mode, side }) => …`, spread over Point0's Bun defaults (override `target`, `minify`, …).                                    |
| `bunPlugins`                   | Bun plugins for the build (e.g. `'bun-plugin-tailwind'`).                                                                                                     |
| `banner`                       | A `string` merged into the bundle banner alongside the injected env script.                                                                                   |
| `buildWatchGlob`               | Extra glob(s) watched in `--watch`, additive on top of the import graph.                                                                                      |
| `compiler` / `compiler.assets` | The asset pipeline that rides inside the build; `compiler: false` falls back to native bundler asset behavior. See [Assets](assets) and [Compiler](compiler). |
