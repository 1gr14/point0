---
index: 400
title: Dev
description:
  point0 dev — one process tree that watches, regenerates, restarts the server
  and keeps the client alive.
---

`point0 dev` starts your whole app for development: the server, the client dev
servers, file watching, and codegen on the fly. It's a thin wrapper over
[`engine.dev()`](engine-runtime) — the [CLI](cli) parses flags and calls it. The
canonical [basic example](example-basic) wires it as:

```json
// package.json
"scripts": {
  "dev": "point0 dev --hot"
}
```

```sh
bun run dev
# regenerates points/routes, starts the client dev server, boots the server,
# and watches src — edit a page and it hot-swaps without restarting the server.
```

The rest of this page shows what happens on a file change: when the server
restarts, when it hot-swaps (`--hot`), why the client never reloads underneath
you, and how the process tree cleans up after itself.

## What a dev run is

A dev run is a small process **tree**:

```
point0 dev                 # the orchestrator (the engine.dev() process)
├─ server child            # a `bun run` of your server entry (or in-process for Vite)
└─ client dev server(s)    # one per client scope, in the orchestrator process
```

The orchestrator owns the file watcher. The **client dev servers always run
inside the orchestrator process** as a single instance — they own HMR / Fast
Refresh and are never restarted by an edit. The **server** runs as a child
process (for the bun-native pipeline) and is the thing that restarts.

`engine.dev()` does this in order:

```ts
await engine.dev()
// 1. apply the app logger
// 2. install dev shutdown handlers (SIGINT/SIGTERM/SIGHUP)
// 3. generate points/routes once, then watch and regenerate on change
// 4. start the client dev server(s) in this process
// 5. start the server child (bun-native) or in-process Vite server
```

It defaults `NODE_ENV` to `development` when unset; an explicit `--mode` /
`NODE_ENV` is preserved.

## Two ports in dev, one in prod — and no CORS

In production the server and the client are served from **one origin** on a
single port: the same server that renders pages also answers [queries](query)
and [mutations](mutation). In development point0 splits them across **two
ports** on purpose — a dedicated client dev server (one per client scope) and
the server — so the client dev server can stay alive forever and never lose its
HMR / Fast Refresh state when the server restarts.

That split would normally mean cross-origin requests, but point0 keeps
everything same-origin for the browser:

- **The client dev server is the only origin the browser talks to.** It serves
  the page and its assets, and it **forwards every other request through to the
  server** — including the query/mutation POSTs your code fires. Each forwarded
  request is tagged `X-Point0-Forwarded-From-Dev-Client` so the server answers
  it instead of bouncing it back. The browser only ever sees the client dev
  server's origin, so there are **no CORS preflights and no
  [`@point0/cors`](cors) needed** in dev — just as in prod, where it's all one
  port.
- **Hit the server port directly and dev redirects you to the client.** Opening
  a page URL on the server's port during dev `302`s you to the matching client
  dev server port (same path), so the browser lands on the origin that owns HMR
  and your Fast Refresh connection never breaks. (Production does no such
  redirect.)

If you turn the client side off (`point0 dev --side server`), there's no client
dev server to forward through — the browser would hit the server cross-origin,
so in that setup you'd add the [`@point0/cors`](cors) middleware yourself,
exactly as you would for any external client.

## Server restarts vs client restarts

There are two reload axes, and they behave differently.

**The client never restarts on an edit.** The client dev server owns HMR (Bun's
HTMLBundle bundler, or Vite when configured). It stays alive for the whole
session and patches modules in place. Because it's also the front door the
browser hits and proxies everything through to the server (see above), even a
full server restart is invisible in the browser — point0 retries
connection-refused quietly across the brief moment the server re-binds its port,
so the client proxy doesn't 502.

**The server, by default, restarts on every change.** point0's server dev does
not truly hot-reload without `--hot`: on any watched change it kills the server
child and respawns it. That's slow and drops all in-memory state — DB pools,
caches, the open socket:

```sh
point0 dev
# edit any server file →
# Server restarting... (changed: src/pages/home.tsx)
# Server started http://localhost:3000 in 412ms
```

The child runs as a plain `bun run` (never `bun --watch`) — the orchestrator's
own import-graph watcher is the sole watcher and owns every restart. Bursts of
edits coalesce into **one** respawn (a 120 ms settle window), and a respawn is
polite: SIGTERM first, a grace window for your shutdown hooks, then SIGKILL for
stragglers.

To keep server state across edits, turn on hot mode.

## Server hot mode (`--hot`)

`--hot` keeps the server **process** stable — React, react-dom, the engine,
Prisma all load once and never reload — and picks up changes by re-importing
just the edited points with a fresh module identity. Edit a page and the SSR
output updates with **no restart**; the process pid stays the same:

```sh
point0 dev --hot
# edit src/pages/home.tsx →
# Server hot reloading... (changed: src/pages/home.tsx)
# Server hot reloaded
# (no "Server started" — same process, DB pool and caches intact)
```

Enable it three ways — the flag, the `dev()` option, or an env var:

```sh
point0 dev --hot                          # CLI flag
```

```ts
await engine.dev({ serverHot: true }) // programmatic
```

```sh
POINT0_DEV_SERVER_HOT=true point0 dev     # env-var fallback
```

The explicit option wins; otherwise it falls back to the env var. Off by
default. **Bun-native only** — under [Vite](bun-vs-vite) the dev path is
unchanged. It's marked **experimental**.

### Why not `bun --hot`

There are two reasons, and the second is the decisive one.

First, `bun --hot` does a _partial_ module-graph reload, which tears React's
cross-module dispatcher singleton (`Invalid hook call` /
`more than one copy of React`) because `react-dom/server` lives in the unwatched
framework `dist` and doesn't reload with your edited component. Reproduced on
the real app, and not fixable with accept-boundaries.

Second — and this is why `bun --hot` is a non-starter here, not just awkward —
the files point0 rewrites on the fly (the content-hashed modules it feeds the
server, see below) never land in Bun's own hot store, so native Bun hot reload
simply doesn't fire for them. It's an open Bun limitation
([oven-sh/bun#5844](https://github.com/oven-sh/bun/issues/5844) — filed against
`--watch`, but `--hot` is affected the same way).

point0's hot mode sidesteps both by never reloading the framework and by
managing its own module store — it only re-imports your edited points, with a
fresh identity, against the unchanged framework singletons.

### How it works: the content-addressed store

In hot mode the orchestrator compiles each of your source files, writes it under
a content-hash filename, and rewrites relative import specifiers to its deps'
hashed names. Bare specifiers (`react`, `@prisma/*`, `@point0/*`) are left
alone, so they resolve to the same cached singletons the renderer already uses.

```
node_modules/.cache/server-hot/<scope>-<port>/
```

The store lives there, keyed by `<scope>-<port>` so two `--hot` processes on the
same folder but different ports get isolated stores and can't clobber each
other. On a change, only the changed file **and its importer chain** get new
hashes; everything else keeps its hash. The server child re-imports the current
points aggregator per request, gated by a manifest hash: unchanged → cached
module (singletons live); changed → fresh module identity.
([`point0 prune`](cli) deletes this cache.)

### Hot vs cold

Not every file is safe to hot-swap — a file with boot side effects (crons,
queues, the DB client) needs a full restart. point0 classifies **default-hot**:

- **Every server file is hot by default** — editing it hot-swaps.
- **Cold roots** restart on edit. Three sources:
  1. The in-file marker — this file and its static-import subtree are cold:
     ```ts
     import '@point0/core/cold' // editing this file (or its static deps) restarts the server
     ```
  2. A config glob on the server importer:
     ```ts
     // engine.ts (server config)
     importer: {
       cold: ['**/prisma.*']
     } // matched against the file's own path
     ```
  3. **Auto** — a file the store provably can't flatten (a location-relative
     `import.meta`, or an un-rewritable relative import like a generated
     client's `./enums` dir or wasm). These are logged at startup:
     `N file(s) can't be flattened, running cold (edit => restart): …`.
- **The server entry is cold by default** — it _is_ boot.

Cold flows **downward** through static imports and **stops at a lazy
`import()`** (the hot boundary). Importers of a cold file stay hot: a page
importing `prisma` (cold) still hot-swaps; `prisma` just isn't re-evaluated,
because its content hash is unchanged. **Prisma forces a minimal cold boundary
even on day one** — its generated client (a directory + wasm + `import.meta`)
can't be flattened, so it's externalized to its real path and runs cold.

The decision per change is simply: changed file is cold → full restart;
otherwise → hot-swap.

### What hot-swaps and what doesn't

Editing an **existing** file behaves as you'd expect:

| Change                                                           | Result                                        |
| ---------------------------------------------------------------- | --------------------------------------------- |
| Edit a page / layout / component                                 | hot-swap (pid stable)                         |
| Edit a mutation / query / loader                                 | hot-swap (next call returns the edited value) |
| Edit a server loader, shared lib, or `.mdx` page body            | hot-swap                                      |
| Delete a file                                                    | route drops, tree stays alive                 |
| Rename a file                                                    | route follows the new file                    |
| Edit a `@point0/core/cold` file, the boot entry, or `app.client` | full restart                                  |

Two MVP cuts to know:

- **Adding a brand-new file restarts** (it doesn't hot-swap). The new point is
  picked up automatically — the generator regenerates the aggregators — but it
  comes in via a child restart, not a hot-swap.
- **The client app shell (`app.client`) is not in the store** — editing it
  restarts.

### Crash resilience

`--hot` is built so a typo never forces you to re-run `point0 dev`:

- A **hot-file compile error** is caught and the previous store is kept:
  `Hot reload failed — keeping the previous store (fix the error and save again)`.
  Fix and save → it recovers.
- A **cold/boot syntax error** prints the error and leaves the tree alive; the
  child exits, and the next save respawns it.
- Starting `--hot` on an **already-broken hot file**: the store builds, the
  child crashes importing it before binding the port, and that never-booted
  child is dropped without tearing down the tree. The next save respawns it:
  `Server failed to boot (entry "...", code N) — fix the error and save; it will start automatically.`
- An **initial store build failure** defers the server child entirely; the
  watcher retries the build on each save and starts the server the moment it
  succeeds.

To bound memory across a long session, the orchestrator periodically restarts
instead of hot-swapping (every 200th hot reload by default) to release Bun's
module cache; the store dir is mark-and-swept on disk.

## The HMR fix: export anything from a point file

A point file exports **points** — objects and method-decorated functions, not
React components. Bun's bundler and Vite only enable React Fast Refresh for a
module that _looks like_ it exports a component; a plain points file wouldn't
qualify, and every edit would trigger a full page reload instead of HMR.

point0 fixes this in the compiler. It appends a decoy component-shaped function
to the final point in the chain:

```ts
// what the compiler appends to the last point in a file
._tail(function X() { return null })
```

That statically-declared, capitalized `function X` is all the bundler's static
pass needs to wire up Fast Refresh. At runtime `_tail` returns the real thing —
a mountable point's actual mount component, or the decoy decorated with the
point's methods for everything else. The inline render function of a
page/layout/ component is also hoisted to a top-level declaration so Fast
Refresh tracks edits to the render body.

The payoff: **a single file can export a page, a query, a mutation, a provider,
and plain values all at once, and HMR keeps working.** Put points anywhere, mix
freely, several per file.

```tsx
// one file, mixed exports — HMR survives all of them
export const ideaQuery = root.lets
  .query() /* ... */
  .query()
export const likeIdea = root.lets
  .mutation() /* ... */
  .mutation()
export const ideaPage = root.lets
  .page('/ideas/:id') /* ... */
  .page(/* ... */)
```

The fix is on by default for the client side and off for the server side. It's
not an [engine config](engine-config) option — you can only override it per
compile through the [`point0 compile`](compiler) CLI (`-h/--hmr`,
`-H/--no-hmr`).

## The dev lifecycle: no orphans

A dev tree cleans up after itself. The invariant:

> **No point0 process can outlive whatever launched it.**

This is enforced at the kernel level, not by bookkeeping. The CLI shebang
carries `--no-orphans` (Bun >= 1.3.14):

```sh
#!/usr/bin/env -S bun --no-orphans --no-env-file --config=/dev/null
```

A flagged process exits when its parent dies — even on SIGKILL — and on its own
exit SIGKILLs every descendant (Bun re-verifies parentage first, so recycled
PIDs are safe). The flag is inherited by nested bun processes, so the server
child and the client dev servers are covered automatically. Each app's
`bunfig.toml` extends the invariant one level up, to the `bun run dev` wrapper
itself:

```toml
# bunfig.toml
[run]
noOrphans = true
```

Verified empirically (bun 1.3.14, macOS): SIGKILL the orchestrator and both
children are gone, ports free, in ~2s. Because a tree can't leak, there's
**nothing to find, list, or stop from outside** — so point0 has no dev lockfile
and no `point0 stop` command. Stopping a dev run is Ctrl-C, or killing the
terminal.

### Graceful teardown

`--no-orphans` SIGKILLs. For a _polite_ shutdown — so your DB pool closes and
your job queue drains — `engine.dev()` installs SIGINT/SIGTERM/SIGHUP handlers
that SIGTERM every child first, wait a grace window
(`POINT0_DEV_SHUTDOWN_GRACE_MS`, default 5000 ms), then SIGKILL stragglers. The
same path runs if a core child dies unexpectedly — the tree lives and dies as
one unit. Ctrl-C stays graceful end-to-end because `bun run` waits for its child
after forwarding SIGINT.

### Ports are named, never killed

point0 **never kills whoever holds a port.** Since trees can't leak, a busy port
always means a live process someone owns. A real conflict fails with an error
that names the holder, and you decide:

```
Port 3000 is already in use by pid 123 (bun src/index.server.ts).
Stop that process or change the port.
```

Under the orchestrator the server child binds with patient retries
(`POINT0_DEV_BIND_TIMEOUT_MS`, default 10000 ms) — because a transient conflict
during a respawn is just the predecessor draining its shutdown hooks. Any other
dev run binds once.

> **Windows caveat:** `--no-orphans` is a no-op on Windows, so a SIGKILLed tree
> can leave children behind. The port-conflict error then names them for a
> manual kill.

## Stability under rapid edits

`point0 dev` and `--hot` survive fast edit bursts — the way an AI agent saves,
30–150 ms apart, written atomically (`<file>.tmp.<pid>.<hex>` + rename). The
invariants that hold:

- **One watcher pipeline, strictly serial.** Events are deduped by path (latest
  wins) and drained one at a time; the watcher never runs concurrently with
  itself.
- **Junk never enters.** Atomic-write and editor artifacts (`*.tmp.<pid>.<hex>`,
  `*.tmp`, `*.vsctmp`, `*.crswap`, vim/JetBrains/emacs swap files, `~`,
  `.DS_Store`, …) are dropped at the watcher source, so every consumer — dev
  restarts, the generator, [`build --watch`](build) — is immune.
- **At most one respawn in flight, one queued.** A burst settles
  (`POINT0_DEV_RESTART_SETTLE_MS`, default 120 ms) into a single respawn;
  respawns chain, never run in parallel.
- **A hot edit never kills a live child** — an alive-but-booting child plus a
  hot-node change rebuilds the store only; the child serves the latest code once
  it's up.

While the server is still booting, the watch set is **broad** (the whole app-src
tree), because the precise import walk can't yet be trusted to include the file
that fixes a broken build. Once the server is confirmed up, it narrows to the
precise import graph.

## Reference

### CLI flags

Every flag on `point0 dev` (each maps to an `engine.dev()` option). Full CLI
reference on [CLI](cli).

| Flag                      | Default               | What it does                                                                                                            |
| ------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `--hot`                   | off                   | Server-side hot reload (bun-native). Hot-swap edited points without restarting; cold files still restart. Experimental. |
| `-G, --no-generate`       | generate on           | Skip files generation.                                                                                                  |
| `--side <server\|client>` | both                  | Serve only one side.                                                                                                    |
| `--scope <scope>`         | all                   | Serve only one scope.                                                                                                   |
| `-w, --watch [glob]`      | engine `devWatchGlob` | Watch files and rebuild on change (comma-separated or repeated; no value = the engine's `devWatchGlob`).                |
| `-W, --no-watch`          | watch on              | Disable file watching (no restart / regenerate on change).                                                              |
| `--entry <name\|path>`    | all server entries    | Server entry points, by name or path (comma-separated or repeated).                                                     |
| `--engine <path>`         | auto-find             | Path to the engine file.                                                                                                |
| `--env <name=value>`      | none                  | Define env vars (override `.env`); repeatable.                                                                          |
| `--mode <mode>`           | `development`         | `production` \| `development` \| `test` — which `.env` files apply.                                                     |
| `-- <args>`               | none                  | Everything after `--` is forwarded to the spawned `bun run`.                                                            |

### `engine.dev()` options

```ts
await engine.dev({
  generateFiles, // boolean — run codegen first + watch (default true)
  side, // 'server' | 'client' — one side only
  scope, // a single points scope
  entries, // string[] — server entry names or paths
  bunRunArgs, // string[] — extra args for the server child's `bun run`
  watch, // string | string[] | boolean — watch globs, or true/false
  cwd, // string — defaults to process.cwd()
  serverHot, // boolean — hot mode; defaults to POINT0_DEV_SERVER_HOT
})
```

### Env vars (dev tuning)

| Env var                               | Default | Effect                                                                                   |
| ------------------------------------- | ------- | ---------------------------------------------------------------------------------------- |
| `POINT0_DEV_SERVER_HOT`               | `false` | Enable server hot mode (fallback when `--hot` / `serverHot` is omitted).                 |
| `POINT0_DEV_BIND_TIMEOUT_MS`          | `10000` | Server child's port-bind retry window under the orchestrator.                            |
| `POINT0_DEV_SHUTDOWN_GRACE_MS`        | `5000`  | Graceful teardown grace window before SIGKILL.                                           |
| `POINT0_DEV_RESTART_SETTLE_MS`        | `120`   | Burst-coalescing settle delay before a respawn.                                          |
| `POINT0_DEV_RESTART_GRACE_MS`         | `1500`  | Per-respawn SIGTERM → SIGKILL grace.                                                     |
| `POINT0_DEV_SERVER_HOT_RESTART_EVERY` | `200`   | Restart instead of hot-swap every Nth reload, to release Bun's module cache (`0` = off). |
| `POINT0_DEV_SERVER_HOT_GC_GRACE_MS`   | `30000` | Disk-GC grace before sweeping stale store files.                                         |

`POINT0_DEV_CHILD` and `POINT0_DEV_STORE_DIR` are set internally by the
orchestrator on the server child (they mark it as orchestrator-owned and hand it
the hot store) — you don't set them.

### Related

- [CLI](cli) — `point0 dev` is a wrapper over `engine.dev()`; see also
  `generate`, `build`, `compile`, `prune`.
- [Build](build) — the production counterpart, `point0 build`.
- [Engine runtime](engine-runtime) — `engine.dev()` alongside the other engine
  methods.
- [Bun vs Vite](bun-vs-vite) — the two dev pipelines (hot mode is bun-native
  only).
- [Compiler](compiler) — where the HMR fix and the `-h/--hmr` override live.
