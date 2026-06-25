---
index: 600
title: Compiler
description: The source transform that strips server/client code, desugars .lets, and lets both sides share one file.
---

The compiler (`@point0/compiler`) is the source transform that runs on every
file as the [engine](engine-config) builds or serves your app. It started life
just stripping server code out of the client and client code out of the server,
but it grew. Today, on a single file, it:

- **strips point method bodies per side** — your loader and your component live
  in **one file**, and each side only ships the parts it needs (the headline
  feature, below);
- **shakes [`env.*`](env) guards** and your `process.env.X` constants down to a
  literal, then deletes the dead branch and its now-unused imports;
- **swaps forbidden imports** for [virtual modules](importer) (`server-only` /
  `client-only` markers, `mock`/`deny`) so a leak fails the build;
- **finds the points themselves** and powers the short [`.lets`](points)
  notation by rewriting it into the explicit form;
- **compiles `.md` / `.mdx` / `.mdc`** through [MDX](mdx) and routes
  [static assets](assets) (`?url`, `?react`, …) before its other passes;
- **runs your [babel](#user-babel-plugins) plugins** and keeps the HMR boundary
  alive so any mix of points hot-reloads;
- **caches** every result on disk, so after the first run it only recompiles
  files that actually changed.

It's the same compiler in every form: a Bun plugin, a Vite plugin, and a Babel
plugin all wrap one class — so it drops into any toolchain (web, Expo, Electron,
…); see [One compiler, any bundler](#one-compiler-any-bundler). You rarely touch
it directly — the [`point0` CLI](cli) and those plugins drive it, and it's on by
default for every side. The rest of this page shows what it does to your code,
and how to inspect or tune it.

## See it work: `point0 compile`

The fastest way to understand the compiler is to watch it transform one file. The
[`point0 compile`](cli) command prints the compiled output for a single file:

```sh
point0 compile src/lib/prisma.ts --server   # how the file looks in the server bundle
point0 compile src/pages/home.tsx --client  # ...and in the client bundle
```

The same source comes out different per side — that difference is the whole point
of the compiler. Useful flags:

```sh
point0 compile <file> --client          # compile for the client side
point0 compile <file> --server          # compile for the server side
point0 compile <file> --scope <scope>   # points scope (inferred from side if omitted)
point0 compile <file> --no-babel        # skip your babel plugins, show point0-only transforms
point0 compile <file> --no-hmr          # don't inject the HMR decoy (see below)
```

Full flag list is in the [reference](#point0-compile-flags) at the bottom.

## What gets stripped from a point

This is the headline: you write the loader and the component in the **same
file**, and each side's bundle only carries the methods it actually runs. The
compiler reads the point chain and removes the bodies that don't belong to the
side it's compiling — keeping the chain shape (so the call still type-checks and
runs), just emptying the callbacks that were stripped.

Take one page with a server loader and a client component:

```tsx
// src/pages/idea.tsx
import { prisma } from '@/lib/prisma'
import { SomethingForClient } from '@/components/something-for-client'

export const ideaPage = root.lets
  .page('/ideas/:id')
  .loader(async ({ params }) => {
    const idea = await prisma.idea.findUniqueOrThrow({ where: { id: params.id } })
    return { idea }
  })
  .page(({ data: { idea } }) => (
    <div>
      <h1>{idea.title}</h1>
      <SomethingForClient />
    </div>
  ))
```

**On the client**, the server-only methods are cut from the client bundle — their
bodies and the imports they use are removed, so they never ship to the browser.
That's the loader and everything else that's server-only (`.ctx`, `.input`,
`.middleware`, `.headers`, `.cookies`, `.body`, `.response`, `.description`,
`.openapi`). The client still knows the point's name and route, so it can still
call the loader over the network — it just doesn't carry its code (and `prisma`,
now unused, is pruned with it):

```tsx
// point0 compile src/pages/idea.tsx --client
import { SomethingForClient } from '@/components/something-for-client'

export const ideaPage = root.lets
  .page('/ideas/:id')
  .loader() // body gone — prisma never reaches the browser
  .page(({ data: { idea } }) => (
    <div>
      <h1>{idea.title}</h1>
      <SomethingForClient />
    </div>
  ))
```

**On the server**, what happens to the `.page` body depends on `ssr`.

### `ssr: true` vs `ssr: false`

`ssr` is an engine option (per client, or a default at the top):

```ts
export const engine = Engine.create({
  // ...
  clients: [
    {
      // ...
      ssr: true, // server-render the first load; default is false
    },
  ],
})
```

The render methods (`.page`, `.layout`, `.component`, `.provider`, `.with`,
`.wrapper`, `.mapper`, `.head`, and the `.loading` / `.error` family) are cut
from the **server** bundle when `ssr: false` — bodies and the imports they use
removed from the server build. They stay in the server build only when SSR is on,
and in the client build always.

- **`ssr: true`** — nothing is cut: the server renders the first page load, so it
  **keeps** those render-method bodies, and the client ships them too for
  client-side navigation after that first render.
- **`ssr: false`** — those render bodies (and their now-unused imports) are
  **removed from the server bundle**; the server keeps only the loader (to answer
  data requests) and the rest of the server-only chain. The client keeps the
  render bodies. This is exactly the compile output of the page above when `ssr`
  is off — `.page()` empties on the server, `.loader()` empties on the client.

Client-only methods are cut from the other bundle: `.clientLoader`,
`.clientInput`, `.clientOn`, and the navigation/prefetch methods
(`.onPrefetchPage`, `.prefetchPageOnLinkHover`, `.scrollRestore`, …) have their
bodies and imports removed from the **server** bundle regardless of `ssr` — that
code never ships to the server (it only runs in the browser).

> Every method's own page repeats this in its terms: which bundle the method is
> cut from, and how `ssr` changes it. Read it there for the exact rule per method.

### `.clientOnly()` — turn off SSR for the rest of one point

`.clientOnly()` makes a single point behave as if `ssr: false` **for that point
only** — from that call onward in the chain, the render methods (`.page`,
`.with`, `.component`, …) are cut from the server bundle — their bodies and the
imports they use removed — even when the app is otherwise `ssr: true`. Use it for
UI that genuinely can't render on the
server (it touches `window`, a client-only library, etc.). You can pass a
server-side fallback to show while the client takes over, or call it with no
argument at all:

```tsx
export const dashboardPage = root.lets
  .page('/dashboard')
  .loader(async () => ({ stats: await loadStats() }))
  .clientOnly(() => <Skeleton />) // server renders the skeleton…
  .page(({ data }) => <Charts stats={data.stats} />) // …this body is stripped from the server

export const WidgetComponent = root.lets
  .component()
  .clientOnly() // no fallback — server renders nothing for this point
  .component(() => <BrowserOnlyWidget />)
```

Everything **before** `.clientOnly()` (here the `.loader`) still runs on the
server as usual; only the chain after it goes client-only. See [SSR](ssr) for
when you'd reach for this.

## env shaking and virtual modules

Method stripping handles the point chain. For plain code outside the chain —
secrets, server libraries, branches that should only exist on one side — the
compiler offers two more tools.

### `env.*` shaking and dead-code elimination

When you guard code with the [`env`](env) helpers from `@point0/core`, the
compiler replaces the guard with a literal `true` / `false` for the side it's
compiling, then deletes the dead branch:

```tsx
import { env } from '@point0/core'

const value = env.side.is.server ? readSecret() : 'public'
// compiled for client → const value = false ? readSecret() : 'public'
//                     → const value = 'public'   (readSecret import pruned too)
```

`env.side.define` makes this explicit — the matching side keeps the value, the
other gets `undefined` and the code is pruned:

```ts
// examples/better-auth/src/lib/auth/server.ts
export const authServer = env.side.define.unsafe.server(
  betterAuth({ database: prismaAdapter(prisma, { provider: 'sqlite' }) }),
)
// on the client this whole expression becomes `undefined` — better-auth and
// prisma never reach the browser bundle
```

The same shaking covers `env.mode.*` (production/development/test),
`env.build.was`, `env.runtime.*`, `env.os.*`, `env.scope.*`, and `env.vars.*`,
plus `process.env.X` / `import.meta.env.X` against your configured constants. Each
resolves to a literal at compile time; the now-dead branches and their unused
imports are removed by a dead-code-elimination pass. The full list lives on the
[env](env) page.

The compiler also handles [`<ClientOnly>`](env): on the server, its children are
replaced with `null`, so client-only UI never renders server-side.

<!-- TODO(low): enumerate the allowed values for env.runtime.is.<X> and env.os.is.<X> (the EnvRuntimeName / EnvOsName string sets in @point0/core) on the env page and link here. -->

### Import stripping → virtual modules

The other half is the [importer](importer): instead of (or in addition to) `env`
guards, you can forbid a whole import from one side. The compiler swaps the
import for a **virtual module** so the real module never enters that bundle.

The `server-only` / `client-only` markers are the common case:

```ts
// examples/basic/src/lib/prisma.ts
import '@point0/core/server-only' // importing this from client code throws

export const prisma = new PrismaClient(/* ... */)
```

When the compiler builds the **client** side and finds an import that reaches
`@point0/core/server-only` (directly or through a denied import), it replaces it
with a virtual module that **throws at import time** — so a leak fails the build,
not in production. The marker files themselves are empty (`export {}`); all the
work is the compiler's.

You can also configure this in the engine, matching by import target:

```ts
// examples/expo/src/engine.ts
compiler: {
  importer: {
    mock: ['react-native', 'expo-router'], // replace with a no-op mock module
  },
}
```

- `mock` swaps the import for a recursive no-op proxy (`createMock()`) — every
  access returns another mock, so the import resolves but does nothing.
- `deny` swaps it for a throwing virtual module (like the markers).
- The deny error includes a `point0 trace ...` command you can run to see the
  import path that pulled the forbidden module in.

Full configuration — patterns, `cold`, `onDeny` — is on the [importer](importer)
page.

## The HMR decoy

Bun's native bundler and Vite only enable React Fast Refresh for modules that
*look like* they export a React component. A point file exports points, not
components — from React's point of view a mutation, a query, and a provider
aren't components at all — so without help every edit would trigger a full page
reload.

The compiler fixes this by appending a `_tail` decoy to the **last point in each
chain** in the file. Put a mutation and the page that uses it side by side:

```tsx
// you write — one file, a mutation and a page:
export const ideaUpdateMutation = root.lets
  .mutation()
  .input(z.object({ id: z.string(), title: z.string() }))
  .loader(async ({ input }) => prisma.idea.update({ where: { id: input.id }, data: input }))
  .mutation()

export const ideaPage = root.lets
  .page('/ideas/:id')
  .page(() => <h1>Idea</h1>)
```

```tsx
// the compiler appends a decoy to each (in dev):
export const ideaUpdateMutation = root.lets/* ... */.mutation()._tail(() => null)
export const ideaPage = root.lets/* ... */.page(() => <h1>Idea</h1>)._tail(() => null)
```

Each export *is* the function returned from `_tail(() => null)`, so both Bun and
Vite treat both exports as ordinary React components and wire up Fast Refresh for
the module — even though one is really a mutation. You never access
`ideaUpdateMutation` directly, only its methods, and they're all still in place;
the real runtime export is decided by `Point0._tail` in `@point0/core` (a
mountable returns its mount component, everything else returns the decoy). That's
why a file can export any mix of pages, queries, and mutations and still hot
reload — see [Dev](dev) for the dev/HMR story. The decoy is on by default for the
client and off for the server; `point0 compile --no-hmr` turns it off.

## User babel plugins

Your own babel plugins and presets run inside the compiler, after its own
transforms. Set them under `compiler.babel` in the engine config — at the top
for a default, or per client:

```ts
// examples/basic/src/engine.ts
export const engine = Engine.create({
  // ...
  clients: [
    {
      // ...
      compiler: {
        babel: ['babel-plugin-react-compiler'], // array form = plugins
        // or the object form for presets too:
        // babel: { plugins: ['babel-plugin-react-compiler'], presets: [...] },
      },
    },
  ],
})
```

The compiler has special handling for **React Compiler**. React Compiler only
memoizes things that look like top-level components, but point logic lives in
chain callbacks (`.page`, `.layout`, `.component`, `.provider`, `.wrapper`,
`.with`). So the compiler injects a `"use memo"` directive into those callbacks
so React Compiler memoizes them too. The behavior keys off React Compiler's own
`compilationMode` option, which you pass to the plugin the usual way:

```ts
compiler: {
  babel: [['babel-plugin-react-compiler', { compilationMode: 'infer' }]],
}
```

- unset / `'infer'` / `'syntax'` → keep the plugin **and** inject `"use memo"`.
- `'all'` → keep the plugin, no directive (it compiles everything anyway).
- `'point0'` → **strip** React Compiler from babel (you run it elsewhere, e.g.
  via Vite) but still inject `"use memo"`.

## MDX, Markdown, and assets

The compiler also claims `.md`, `.mdx`, and `.mdc` files — it compiles them to JS
(via `@mdx-js/mdx`) before its other passes run, so `env` shaking and
`<ClientOnly>` work inside MDX too. Configure remark/rehype/recma plugins through
`compiler.markdown`. Details on [MDX](mdx).

Static asset imports (`import logo from './logo.png'`, `?url`, `?file`, `?text`,
`?react` for SVGR) also ride through the compiler plugin. See [Assets](assets)
for modes and config.

<!-- TODO(low): the native bun dev server passes compiler options to a child process as JSON, which drops function-valued options (markdown / babel plugin functions, assets.svgr); the compiler re-attaches them in-process via a ref. Internal mechanism — mention only if a native-dev-server page needs it. -->

## Caching

The compiler caches every result on disk, keyed on the file's contents (via its
mtime) and the compiler's own settings. The first run of a project costs a little
extra; after that it's fast, and a file is only recompiled when it actually
changes — or when the compiler settings that produced its cache entry change.
Cache is on by default (`compiler.cache`); clear it with:

```sh
point0 prune
```

## One compiler, any bundler

The compiler is just one class, and every integration is a thin wrapper around
it: a **Bun plugin**, a **Vite plugin**, and a **Babel plugin** all run the exact
same transform. That's what lets a Point0 codebase target whatever you point it
at — a web client on Bun or Vite, an Expo app, an Electron build, anything with a
bundler — without a different compiler per target. You almost never construct it
yourself; the engine wires the right plugin in for you:

| Bundler / context | Plugin |
| --- | --- |
| Bun (build + dev runtime) | `@point0/compiler/plugin/bun` — `compilerBunPlugin` |
| Vite | `@point0/compiler/plugin/vite` — `compilerVitePlugin` |
| Babel (`parserOverride`) | `@point0/compiler/plugin/babel` — default export |
| Bun native dev server | `@point0/compiler/plugin/bun-static` |

Each plugin accepts either a `CompilerOptions` object (it builds a `Compiler` for
you) or an existing `Compiler` instance. These are subpath exports — they are
**not** in the package's main barrel.

A file is always compiled **for one specific target** — a fixed side, scope, and
mode — so the same source runs through fresh per side and yields two different
outputs (which is why `--client` and `--server` differ above). The compiler does
**not** strip TypeScript syntax itself; it parses TS, transforms it, and emits
TS, leaving the bundler (Bun / esbuild / Vite) to handle types.

<!-- TODO(low): the choice between Bun and Vite for the client is a config decision, not a compiler one — cross-link bun-vs-vite once it lands. -->

## The `.lets` sugar transform

A smaller convenience, last because it's the least essential: the compiler powers
the short [`.lets`](points) notation by rewriting it into the explicit form. The
short form only works with the compiler on; the explicit form works anywhere and
is identically typed.

```tsx
// what you write (short form):
export const ideaPage = root.lets.page('/ideas/:id')./* ... */.page()

// what the compiler emits (explicit form — runtime-identical):
export const ideaPage = root.lets('page', 'idea', '/ideas/:id')./* ... */.page()
```

It reads two things off your code: the **point type** (`.lets.page(...)` →
`'page'`, `.lets.layout(...)` → `'layout'`, and so on) and the **point name**,
taken from the variable name with the type suffix stripped (`ideaPage` → `idea`).
The exact name-inference rules, fallbacks, and edge cases live on the
[points](points) page; this page just notes that the rewrite is the compiler's
doing.

The compiler only desugars `.lets.<type>()` when the chain's base traces back to
a `Point0` imported from `@point0/core` — a look-alike on an unrelated object is
left alone:

```tsx
import { fake } from './somewhere'
export const x = fake.lets.page('/ignore') // NOT a point — left untouched
```

## Reference

### `point0 compile` flags

`point0 compile <file>` — print the compiled output for one file.

| Flag | Effect |
| --- | --- |
| `--engine <path>` | path to the engine file (else auto-found) |
| `--side <side>` | which side to compile for (`server` / `client`) |
| `-c`, `--client` | shorthand for `--side client` (wins over `--side`) |
| `-s`, `--server` | shorthand for `--side server` (wins over `--side`) |
| `--scope <scope>` | points scope (inferred from side when omitted) |
| `--mode <mode>` | `production` / `development` / `test` |
| `-p`, `--production` | shorthand for `--mode production` |
| `-d`, `--development` | shorthand for `--mode development` |
| `-t`, `--test` | shorthand for `--mode test` |
| `-b`, `--built` | compile in build mode (else `POINT0_BUILT` env) |
| `-B`, `--no-babel` | skip user babel plugins — show point0-only transforms |
| `-h`, `--hmr` | force the HMR decoy on |
| `-H`, `--no-hmr` | force the HMR decoy off |

`-h` is rebound to `--hmr` here; use `--help` for help.

<!-- TODO(med): --scope inference for multi-client engines (which client's scope is picked) is not pinned down — confirm guessSideAndScope behavior before documenting the exact rule. -->

### `point0 trace` flags

`point0 trace <target> <source>` — print the import path from `<source>` to
`<target>`. This is the command the importer's deny errors tell you to run.

| Flag | Effect |
| --- | --- |
| `--engine <path>` | path to the engine file |
| `--side <side>` | which side's import graph to trace |
| `--scope <scope>` | points scope |
| `--cwd <path>` | base dir (default: the engine file's directory) |

### Engine compiler config

The `compiler` option on the engine (and per side). Set it to `false` to turn the
compiler off for that side; `true` / an object turns it on. A built engine forces
it to `false` (a built app never compiles sources at runtime).

| Option | Type | What it does |
| --- | --- | --- |
| `side` | toggle | shake server/client code for this side |
| `scope` | toggle | shake by points scope |
| `mode` | toggle | shake `env.mode.*` (NODE_ENV) |
| `runtime` | `EnvRuntimeName \| false` | resolve `env.runtime.*` |
| `os` | `EnvOsName \| false` | resolve `env.os.*` |
| `consts` | env-const table | replace `env.vars.*` / `process.env.*` |
| `filter` | `RegExp` | which files the compiler claims |
| `ssr` | toggle | set `POINT0_SSR` / `env.side.is.ssr` |
| `cache` | boolean | on-disk transform cache (default on) |
| `markdown` | MDX options | remark/rehype/recma plugins, MDX config |
| `babel` | plugins / `{ plugins, presets }` | your babel plugins (see above) |
| `assets` | assets options / `false` | static-asset pipeline ([assets](assets)) |
| `importer` | importer options | mock/deny/cold imports ([importer](importer)) |

`importer` is **per-side only**, not engine-level. The full engine config surface
is on [Engine config](engine-config); the importer options on [importer](importer).

<!-- TODO(low): cacheLimit / cacheDir appear in the per-side config types but their resolution/semantics were not traced — confirm before documenting. -->

### The default file filter

By default the compiler claims files matching:

```
.js .jsx .ts .tsx .cjs .mjs .cts .mts .md .mdx .mdc
```

It skips ids containing `shim:` / `virtual:`, and skips `node_modules` paths
**unless** the path contains `point0`. Override with `compiler.filter`.

### Package exports

```ts
import { Compiler } from '@point0/compiler' // the class + helpers, via the barrel
import { compilerBunPlugin } from '@point0/compiler/plugin/bun'
import { compilerVitePlugin } from '@point0/compiler/plugin/vite'
import compilerBabelPlugin from '@point0/compiler/plugin/babel'
```

<!-- TODO(low): the base and plugin point-type sugar (.lets.base(...) / .lets.plugin(...)) is supported in the type map but has no example/test of its sugar naming — confirm name inference for those two before documenting them. -->
