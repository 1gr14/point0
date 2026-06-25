---
index: 1400
title: Bun or Vite
description: Point0 builds and serves with pure Bun by default, or with Vite — one config key flips between them.
---

Point0 ships two bundler paths. By default it runs on **pure Bun** — no Vite
involved. Add a `viteConfig` to the engine and it switches to **Vite** for both
`dev` and `build`. Nothing else in your app changes: the same points, the same
`index.server.ts` and `app.client.tsx`, the same CLI.

The snippets below are from `examples/basic` and `examples/vite`, which use a
single `client` key and `index.html`. (The production boilerplate uses a
`clients: []` array and `index.client.html` instead — same mechanics, different
key/filename names.)

```ts
// examples/basic — pure Bun: no viteConfig anywhere
export const engine = Engine.create({
  file: import.meta.url,
  ssr: true,
  client: {
    bunPlugins: ['bun-plugin-tailwind'], // bundler plugins are Bun plugins
    // ...
  },
})
```

```ts
// examples/vite — same app, with Vite: one extra key flips the bundler
export const engine = Engine.create({
  file: import.meta.url,
  ssr: true,
  viteConfig: ({ plugins, side }) => ({
    plugins: [...plugins, react(/* ... */), tailwindcss()],
  }),
  client: {
    // no bunPlugins here — tailwind moves into viteConfig.plugins
    // ...
  },
})
```

The presence of `viteConfig` *is* the switch. There is no `useVite` or
`mode: 'bun' | 'vite'` flag — a `viteConfig` that resolves means Vite, its
absence means Bun. The rest of this page shows what each path gives you, how they
differ, and how to move between them.

## Bun is the default

Both [examples/basic](example-basic) and the production boilerplate ship pure
Bun. Bun starts the dev server faster and handles HMR well enough that Point0
treats it as the recommended path; Vite is an opt-in for projects that already
lean on the Vite plugin ecosystem.

<!-- TODO(low): "Bun starts faster / better HMR" is the author's claim — no benchmark number is recorded in the repo. Add a measured figure before quoting one. -->

Vite is a **devDependency** of `@point0/engine`, not a production peer
dependency, and Point0 imports it lazily (`await import('vite')`) only on the
Vite path. A Bun-only app never loads Vite at all — the Bun server build even
force-externalizes `vite` and `esbuild`, so a pure-Bun app builds and runs with
neither installed.

## Babel runs under Bun too

This is the headline reason a Bun-only Point0 app is not "just `Bun.build`": the
Point0 **compiler** runs Babel inside its own transform, the same way under both
bundlers. Bun's native bundler has no Babel stage on its own — Point0 supplies
one.

```ts
// works identically on Bun and on Vite — the compiler runs babel internally
export const engine = Engine.create({
  client: {
    compiler: { babel: ['babel-plugin-react-compiler'] },
    // ...
  },
})
```

The compiler is offered in three plugin formats — a Bun plugin, a Vite plugin,
and a Babel plugin — over one shared codebase, so they behave the same. Your
`compiler.babel` plugins are threaded into that shared transform regardless of
the bundler. `babel-plugin-react-compiler` is the common case and both example
apps enable it. See [compiler](compiler) for the full transform and
`point0 compile` for inspecting the output.

## What differs between the two paths

Most of the engine config is identical across the Bun and Vite examples. Only a
handful of keys are bundler-specific.

| Concern              | Bun path                                  | Vite path                                  |
| -------------------- | ----------------------------------------- | ------------------------------------------ |
| Switch key           | _(no `viteConfig`)_                        | `viteConfig`                               |
| Bundler plugins      | `bunPlugins` (Bun plugins)                | `viteConfig.plugins` (Vite plugins)        |
| Build tuning         | `bunBuildConfig`                          | `viteConfig` (`build.rolldownOptions`, …)  |
| Tailwind             | `bun-plugin-tailwind` in `bunPlugins`     | `@tailwindcss/vite` in `viteConfig.plugins`|
| `preload`            | `preventLoadBunPlugins` off               | `preventLoadBunPlugins: true`              |
| Server reload in dev | import-graph restart; `--hot` for point hot-swap | Vite HMR (re-runs the entry); `--hot` is a no-op |

`bunBuildConfig` has no effect under Vite, and `viteConfig` has no effect under
Bun — each path reads only its own knob.

### bunPlugins ↔ viteConfig.plugins

Bundler plugins live in different places. Under Bun, they are **Bun plugins**
passed as string names (the native dev server resolves them by name in a
generated `bunfig.toml`):

```ts
client: {
  bunPlugins: ['bun-plugin-tailwind'], // for the native dev server, only string entries work (object/function plugins are accepted by the type but error in dev — see Gotchas)
}
```

Under Vite, they are **Vite plugins** inside the `viteConfig` callback. The
callback receives `plugins` — Point0's own compiler Vite plugin is already in
that array — and you spread it in wherever you want, then add your own:

```ts
viteConfig: ({ plugins, side }) => ({
  resolve: { tsconfigPaths: true },
  plugins: [
    ...plugins, // point0 compiler vite plugin is already here
    react({ include: /\.(jsx|js|mdx|md|tsx|ts)$/ }),
    tailwindcss(),
    side === 'client' ? analyzer({ analyzerMode: 'static', openAnalyzer: false }) : null,
  ],
})
```

Everything else Vite needs — root, `define`, `build.rolldownOptions` — is
injected automatically from the rest of your engine config; the callback only
adds what you want on top. The callback gets `{ command, side, mode, scope,
plugins }`, so you can branch per side (the example above only runs the bundle
analyzer on the client).

### The dev and build architecture

The two paths run different machinery underneath, though the CLI is the same.

**Client dev server.** Bun spawns a child process that serves `index.html` as a
Bun HTMLBundle via `Bun.serve`. Vite runs a real Vite dev server wrapped by a
thin `Bun.serve` that calls `transformIndexHtml` and lets Vite own HMR.

**Server in dev.** On the Bun path the server runs as a plain `bun run`
subprocess that Point0's own file/import-graph watcher restarts on change
(SIGKILL + respawn) — it is not `bun --watch`. On the Vite path the server runs
**in-process** through Vite's SSR dev server, which re-runs the entry on change.

**Build.** Bun builds the client with `Bun.build` (target `browser`) and the
server with `Bun.build` (target `bun`). Vite builds both with `vite build`
(SSR mode for the server). Either way the output layout is the same —
`dist/client` plus `dist/server` — but the server entry filename differs: Bun
emits `dist/server/index.server.js` (named by source basename), while Vite emits
`dist/server/main.js` (rollup names by the entry key). Use each example's `start`
script rather than hardcoding one path: `examples/basic` runs
`bun run ./dist/server/index.server.js`, `examples/vite` runs
`bun run ./dist/server/main.js`. See [build](build) and [deploy](deploy).

## How to switch from Bun to Vite

Three files change. The production boilerplate keeps the Vite block commented out
right next to the Bun config, with the spots to edit marked.

**1. Add `viteConfig` to the engine** and move bundler plugins into it. Drop
`client.bunPlugins`; add the Vite equivalents (`@tailwindcss/vite` for tailwind,
`@vitejs/plugin-react` for React Fast Refresh):

```ts
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

viteConfig: ({ plugins }) => {
  // tailwind packages must be externalized under Vite
  const external = ['bun', '@tailwindcss/vite', '@tailwindcss/oxide', '@tailwindcss/node', 'tailwindcss']
  return {
    plugins: [...plugins, react(/* ... */), tailwindcss()],
    optimizeDeps: { exclude: external },
    ssr: { external },
  }
},
```

**2. Set `preventLoadBunPlugins` in `preload`.** Under Vite the Bun plugins must
not load — Vite provides the transform through its own plugin:

```ts
// preload.ts
// Bun:
await engine.preload({ nodeEnvFallback: 'development' })
// Vite:
await engine.preload({ nodeEnvFallback: 'development', preventLoadBunPlugins: true })
// Bundler-agnostic form (works either way):
await engine.preload({
  nodeEnvFallback: 'development',
  preventLoadBunPlugins: !!engine.server.viteConfig,
})
```

**3. Adjust `index.html`.** Bun resolves a relative script path and picks up CSS
imported from JS. Vite wants an absolute script path and an explicit stylesheet
link:

```html
<!-- Bun -->
<script type="module" src="./index.client.tsx"></script>

<!-- Vite: absolute path, and add the stylesheet link in <head> -->
<link rel="stylesheet" href="/styles/index.css" />
<script type="module" src="/index.client.tsx"></script>
```

The runtime files — `index.server.ts`, `index.client.tsx`, `app.client.tsx` —
stay byte-for-byte identical. That is the portability promise: swap the bundler
by editing a couple of wiring files; the app's behavior does not change.

## Gotchas

- **Vite already hot-reloads the server; `--hot` is a Bun-only extra.** Under
  Vite the server runs in-process and Vite's HMR re-runs the entry on every save
  — server reload just works, with no flag. What `--hot` adds is a Bun-native
  *point* hot-swap (swap an edited point's module without restarting the
  process); that mechanism is Bun-only, so on the Vite path the flag is a no-op
  (Vite's own HMR is doing the reloading instead). Both examples ship
  `point0 dev --hot`. See [dev](dev).
- **Bun dev plugins must be string entries.** The native dev server resolves them
  by name in a generated `bunfig.toml`; function or object plugins error there.
  Use `viteConfig.plugins` for non-string plugins.
- **Tailwind may need externalizing under Vite.** The boilerplate externalizes
  the tailwind packages (`optimizeDeps.exclude` + `ssr.external`, the snippet
  above); the minimal `examples/vite` app omits it. Add them if the tailwind
  packages fail to resolve or get pre-bundled under Vite.
- **Don't forget `index.html` when switching.** A wrong script path or a missing
  stylesheet link is the usual "blank page after switching" cause.
- **`vite.config.ts` is not used by the engine.** When present, it's a thin view
  for external tooling (vitest, IDE Vite integration) that calls
  `engine.getViteConfig(env)`. `engine.dev()` / `engine.build()` read `viteConfig`
  from the engine directly and never load that file.
- **`devWatchGlob` is almost never needed.** In dev the server watcher already
  walks the entry's deep-import graph on its own and restarts on any change in
  it — you don't list your files. `server.devWatchGlob` only *adds* extra globs
  on top of that auto-detected set (for files the import walk can't see), so most
  apps leave it unset. The `examples/vite` app sets
  `['**/*.{ts,tsx,mdx}', '!generated/point0/meta.ts']` mainly to exclude a
  generated file from the watch and avoid a regen→restart loop; treat it as a
  niche tweak, not a switching step.

<!-- TODO(low): the dev docs detail only the Bun source-map workaround; whether Vite handles source maps natively here is not stated explicitly — verify before asserting parity. -->

## Reference

### The `viteConfig` option

`viteConfig` accepts three forms, on the general options and per side
(`server.viteConfig` / `client.viteConfig`, each falling back to the general
one):

| Form          | Type                                              | Use                                   |
| ------------- | ------------------------------------------------- | ------------------------------------- |
| Callback      | `(opts) => UserConfig \| Promise<UserConfig>`     | the common case — receives `plugins`  |
| Object        | a `vite` `UserConfig`                             | a static config                       |
| String        | a path to a `vite.config.ts`                      | point at an external config file      |

The callback's argument carries `{ command: 'serve' \| 'build', side: 'client' \|
'server', mode, scope, plugins }`, where `plugins` already includes Point0's
compiler Vite plugin.

### Bundler-specific config keys

| Key                       | Path | Lives on                          |
| ------------------------- | ---- | --------------------------------- |
| `viteConfig`              | Vite | general, server, client           |
| `bunPlugins`              | Bun  | general, server, client           |
| `bunBuildConfig`          | Bun  | general, server, client           |
| `devWatchGlob`            | both | server (extra dev-watch globs, on top of the auto-detected import graph) |
| `compiler.babel`          | both | client / server compiler          |

Full engine option coverage is on [engine-config](engine-config); the dev and
build internals are on [dev](dev) and [build](build); the compiler and its Babel
stage on [compiler](compiler).
