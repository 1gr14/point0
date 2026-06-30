# Server-side hot reload (point0 dev)

Bun-native dev (no Vite) hot-swaps the SSR output on a source edit with **no
process restart and no React tear**: a page/component/handler/mutation edit
re-renders with the new code while the process — React, react-dom, the engine,
Prisma, open sockets, DB pools — stays up. Editing a **cold** file (the boot
entry, crons, workers, singletons like `lib/prisma.ts`) triggers a **full child
restart** instead; the client dev server stays alive and proxies, so a restart
is cheap and invisible to the browser. Off by default.

## Enabling

Bun-native dev only (the Vite path is unchanged). Three ways:

```sh
point0 dev --hot                          # CLI flag
```

```ts
await engine.dev({ serverHot: true }) // programmatic
```

```sh
POINT0_DEV_SERVER_HOT=true point0 dev     # env var (fallback when the option is omitted)
```

Precedence: the explicit `serverHot` option (set by `--hot`) wins; otherwise it
falls back to the env var.

## Why a content-addressed store

The mechanism is forced by two constraints:

- **The compiler is a Bun `onLoad` plugin, and `onLoad`-transformed files are
  invisible to `bun --watch`/`--hot`** ([bun#5844]). So you can't watch source —
  the compiled output has to be materialized somewhere Bun can see it.
- **`bun --hot` is the wrong reload tool for React SSR.** It does a _partial_
  module-graph reload, and React's cross-module dispatcher singleton tears
  (`Invalid hook call` / `more than one copy of React` /
  `resolveDispatcher().useRef is null`) because the `react-dom/server` renderer
  lives in the framework `dist` (unwatched) and does **not** reload together
  with the edited component. This is delivery-independent — it happens whether
  the pre-compiled output is shipped as a bundle or a per-file mirror — and it
  is **not** fixable by code-splitting, single-file output, or `accept()`
  boundaries. (Vite's `ModuleRunner` would solve SSR HMR correctly because it
  controls module identity, but point0 is a pure-Bun framework — pulling Vite
  into the server-dev path defeats the point. Off the table.)

So the server process stays **stable** — React, react-dom, the engine, Prisma
load **once and never reload** — and changes are picked up by **re-importing the
points/pages with a fresh module identity**. A re-imported module imports
`react` by **bare specifier** → the **same cached instance** the renderer
already uses → no dispatcher tear. An unchanged module keeps its identity →
stays cached → **state persists, no leak**.

The materialized form is **content-addressed modules**: each source file is
compiled (`compiler.compile`, point0 transforms only), written under a
**content-hash filename**, with its **relative** and `@/` import specifiers
rewritten to its deps' hashed filenames. **Bare** specifiers (`react`,
`@prisma/*`, `@point0/*`, `zod`, `superjson`) are left alone → cached
singletons. Hashing is per **strongly-connected component, dependency-first** (a
plain topological order doesn't exist once imports form cycles): each SCC is
hashed as one unit so a change cascades **up** the importer chain and
intra-cycle imports still rewrite to consistent, resolvable names. The store
filename also carries a per-file relpath hash, so two paths that sanitize alike
can't collide. On a change, only the changed file **and its importer chain** get
new hashes; everything else keeps its hash. The engine re-imports the **current
points aggregator** (by a manifest hash) per request.

## Engine wiring

- **`packages/engine/src/server-hot-store.ts`** — the content-addressed store.
  Generalised to **many entries** (the server points aggregator **and** each
  client points aggregator — the stable child re-imports both for SSR, see
  `readEverything`) with **auto cold detection** via the `@point0/core/cold`
  marker (no explicit cold-root list). The store dir lives under
  `node_modules/.cache/server-hot/<scope>-<port>`; hashed names strip `point0`,
  so `compiler.filter` rejects the whole store for free (asserted after every
  build) and the child's compiler `onLoad` plugin never re-transforms a
  pre-compiled store file. Keying the dir by `<scope>-<port>` (matching the
  dev-client temp-dir convention) gives two `point0 dev --hot` processes on the
  same folder but different ports **isolated** stores + manifests — disjoint
  dirs remove the only cross-process hazards (the initial `clean` and a shared
  manifest).
- **`EngineServer.startBunDevProcess`** (orchestrator, `server.ts:728`) — in hot
  mode: build the store, spawn a **stable** child (no `--watch`), pass
  `POINT0_DEV_STORE_DIR`. The existing import-graph `FilesWatcher` (not
  `buildWatchGlob`) then decides per change: a **hot** store node → rebuild the
  store + bump the manifest (no restart; the child re-imports on its next
  request); anything else (a cold-marker subtree, the boot entry, files outside
  the store) → **full child restart**.
- **`EngineServer.readPoints`** (`server.ts:359`) **/
  `EngineClient.readPoints`** (`client.ts:360`) — in hot mode re-import the
  matching aggregator from the store, **gated by the manifest hash** (unchanged
  → cached `this.points` → singletons live; changed → fresh module identity).
  Aggregator abs paths come from the generator tasks, so the parent's store
  entries and the child's lookup keys line up. Wired via
  `Engine._setupServerHotStore` / `_resolveServerHotStore`
  (`engine.ts:276`/`:295`).
- **`Fetcher.fetchDetailed`** — the per-request points re-read (via
  `engine.readEverything`) fires when `server.hotStore` is set. This is the
  manifest hook.

## Hot vs cold: the `@point0/core/cold` marker

Not every server file is safe to hot-swap: the server has boot/runtime side
effects — crons, workers, queues, warmup, singletons like the DB client.
Classification is **declarative and default-hot**, mirroring the existing
`@point0/core/client-only` convention:

```ts
import '@point0/core/cold' // this file + its static-import subtree is COLD → editing it restarts the server
```

- **Default:** every server file is **hot**.
- **Cold root — two ways to declare:** (a) the in-file marker
  `import '@point0/core/cold'`, or (b) a config glob on `server.importer.cold`
  (e.g. `cold: ['**/prisma.*']`) for files you can't or don't want to edit —
  same effect, matched against the file's own path (`isImporterColdPath` in
  `@point0/compiler`, consumed by the store builder). The **server entry is cold
  by default** (it _is_ boot).
- **Cold flows DOWNWARD** through imports (a cold file's deps are part of its
  cold unit, so editing a cold helper restarts too) and **stops at an aggregator
  entry** (aggregators are pinned hot — they must stay re-importable). Boot
  stays cold while the lazily-loaded points subtree stays hot _without_
  reasoning about points: the store graph is rooted at the points aggregators,
  which boot reaches through a lazy `import()`, so the boot/cold chain is never
  in the store at all. `markColdFrom` (in the store builder) walks the in-app
  import edges from each cold root, halting at aggregator entries.
- **Importers of a cold file stay hot:** a page importing `prisma` (cold) is
  still hot; `prisma` just isn't re-evaluated on a page hot-swap (its content
  hash is unchanged → cached).
- **Decision:** a changed **cold** file → full restart; otherwise → hot-swap
  (content-addressed re-import).

This beats a "does the file define a point?" heuristic: it's declarative (the
author states intent), predictable, and consistent with `client-only` — no
guessing, and shared render helpers (`ui/*`, `lib/*`) stay hot instead of
forcing restarts.

**Prisma forces a minimal cold boundary, even on day one.** A pure all-hot pass
is impossible on a real app: Prisma's generated client (dir + wasm +
`import.meta` imports) **cannot be flattened** into the store. A cold node is
not flattened — its import is rewritten to the **absolute real path**, so it
loads once at its real location (its own `../` / wasm / `import.meta` intact)
and stays a cached singleton. Picking the cold/externalize set comes from three
sources, all in the store builder: (1) the `@point0/core/cold` marker; (2) the
`server.importer.cold` glob; (3) **auto** — a node the store provably **cannot**
flatten: a location-relative `import.meta` (`.url`/`.dir`/…, which would resolve
to the store dir) or one left with an un-rewritable relative import after the
rewrite pass (a "miss", e.g. a generated client's `./enums` dir / wasm).
Auto-externalization is **loud and grounded** — it triggers only on a provable
un-flattenability (not a guess), and every auto-externalized file is **logged**
at startup (`N file(s) can't be flattened, running cold (edit => restart)`). So
zero-config `--hot` works on a real app (the Prisma client + engine config
externalize themselves) without hand-marking every generated/infra file; an
explicit `@point0/core/cold` marker is still preferred when you _want_ a subtree
cold deliberately.

## Crash resilience

The hot child runs as a plain `bun run` (**never** `bun --watch`) — the
orchestrator's `FilesWatcher` is the sole watcher and owns every restart. It
watches the entry's deep **static** import graph — the boot/cold chain — because
the points/pages are reached **dynamically** through the store and are invisible
to a shallow watcher ([bun#5844]). So the orchestrator gives the cold chain
restart-on-edit **plus keep-alive-on-crash** without ever fighting the hot-swap:
a syntax error in a cold/boot file makes the child exit, the unexpected-exit
handler keeps the dev tree **alive**, and fixing the file respawns it. (A plain
`bun run` is deliberate: a child under `bun --watch` stays alive after crashing
on a boot-time import, so the never-booted-respawn branch would never fire.) A
hot-file compile error is caught separately and keeps the previous store. The
store skips rewriting unchanged files (content-hash names), so a rebuild never
bumps a watched file's mtime.

Two startup recovery paths make "infinite dev" hold (never a forced `point0 dev`
re-run for a typo):

- **Initial store build fails** (an un-flattenable aggregator import; a compile
  error) → the orchestrator logs the cause and stays alive with the server child
  **deferred** (`storeReady=false`); the watcher retries the build on each save
  and starts the server the moment it succeeds.
- **`--hot` started on an already-broken hot file** → the store builds (the
  compiler passes broken code through), so the child crashes importing it before
  binding the port. The orchestrator tracks whether the child ever **booted**
  (it scrapes the `Server started http…` line): a never-booted child that exits
  is dropped **without** tearing the tree down (it's a fixable error, not a dead
  tree), and the next save **respawns** it (a hot-swap can't revive a server
  that never came up). This leans on the watcher being subscribed before the fix
  — in a real app the watch tree is just `src` (node_modules excluded), so
  that's instant.

## User babel plugins & importer rules × the hot store

These compose cleanly with the content-addressed store, because **the store only
relocates compiled OUTPUT to content-hashed paths and rewrites import SPECIFIERS
to point at relocated siblings; every per-source decision is still made earlier,
during the store-build compile, on the ORIGINAL path.** So:

- **User babel plugins** (e.g. `babel-plugin-react-compiler`) run on the
  _server_ compiler INSIDE the store compile: a page with react-compiler enabled
  still hot-swaps, and a thrown stack still remaps to the original line
  (`toCode()` chains react-compiler's `intermediate → original` map before the
  store appends it inline, so the chaining survives into the store map).
- **`importer.mock`** (replace an import with a proxy) keys on the import TARGET
  specifier → baked in at store-build time; a client-only module imported on the
  server is mocked to a proxy _through_ the store and the mock still applies
  after a hot edit.
- **`importer.deny`** fires during the store compile exactly as in non-hot dev
  (`Import denied on side "server"`). A hard deny without `mock` is a fatal
  import in both modes — not a hot-swap scenario.
- **`importer.cold`** keys on the file's OWN path and is consumed only at
  store-build time on the original path, so the store's content-hashed paths
  never reach the cold matcher.

## Bounded growth

Two mechanisms keep a long session bounded:

- **Disk** — `ServerHotStore` mark-and-sweeps its dir after every build,
  deleting store files no longer referenced by the current manifest that have
  been stale past a grace window (`POINT0_DEV_SERVER_HOT_GC_GRACE_MS`, default
  30s; the grace guards a concurrent child first-import). Covered by
  `sweepStaleStoreFiles` unit tests and an e2e dir-stays-bounded test.
- **Memory** — the child's Bun module cache keeps every superseded hot-swapped
  version (no eviction API), so every Nth booted hot reload the orchestrator
  restarts instead of hot-swapping to release them
  (`POINT0_DEV_SERVER_HOT_RESTART_EVERY`, default 200, 0 = off).

## Current limitations

- The cold downward closure follows **all** import edges, not strictly
  static-only (no `kind` flag on compiler imports yet) — fine for current
  targets (Prisma has no lazy edges); revisit if a cold file lazy-imports a hot
  subtree.
- The store is rebuilt in full on each hot change (discovery + compile; only
  changed files are written). Bun compiles fast, so this is fine; incremental
  discovery is a later optimization.
- `app.client` (the client app shell) is not in the store — editing it restarts,
  like any non-store file.
- **Adding a brand-new file restarts** (does not hot-swap). A new page/point is
  picked up automatically (the generator regenerates the aggregators), but it
  enters the watch graph as an unknown node and lands in the restart branch.
  Making an add hot-swap ("regenerate aggregator → hot rebuild") is a possible
  later refinement. Editing/deleting/renaming an _existing_ file behaves as
  expected (edit → hot-swap; delete → route drops; rename → route follows).
- Asset imports (png/svg) inside points resolve through the store: a flattened
  store file can't resolve `../assets/*`, so the store rewrites each asset
  import to the asset's **absolute real path**. The compiler's asset plugin
  (`@point0/compiler` `assets.ts`) keys its `onLoad`/`onResolve` on the
  **extension**, not the path, so the stable child intercepts the absolute
  import and emits the same served `/_point0/assets/<hash>.<ext>` URL as non-hot
  dev (`?url`/`?file`/`?text`/`?react` queries preserved). Absolute paths are
  fine — the store is dev-only and machine-local, never shipped.

## Test coverage

`packages/engine/tests/dev-hot-reload.test.ts` →
`describe('server hot reload (bun-native, --hot)')` is the e2e suite (plus the
pure-unit `server-hot-store.test.ts` for the SCC and sweep primitives). A point
edit keeps the server `process.pid` (hot-swap) while a `@point0/core/cold` edit
changes it (restart). It covers: a page edit (hot-swap, pid stable), a
`@point0/core/cold` marker edit (restart), a config-glob cold file (restart),
cold/boot syntax-error keep-alive + recovery, a layout + server loader +
shared-lib cascade + page all hot-swapping, a **mutation** hot-resolving (a
button click returns the edited value, pid stable), a **brand-new page file**
added at runtime (route served, via restart), an **`.mdx` page body** edit
(hot-swap, pid stable), a **file deletion** (route drops, tree alive), a **file
rename** keeping the same route, **per-port store-dir isolation**, a **real
import cycle** (`a ↔ b`) hot-swapping with no `./undefined` regression (SCC
hashing end-to-end), an **`import.meta.url` node auto-externalizing** (runs
cold; edit restarts), a **`--hot` session started on an already-broken hot
file** recovering (no teardown; boots on fix), and the babel/importer
interaction tests above. The full bun + vite dev suite stays green — no
regression to the default restart-based dev.

## Pointers

- `packages/compiler/src/compiler.ts`: `compile()` (with `writeVirtual` it
  materializes virtual modules to a temp dir), `collectImportsDeep`.
- `packages/compiler/src/plugin/bun.ts`: the dev `onLoad` transform replicated
  per file for the store.
- `packages/compiler/src/assets.ts`: the extension-keyed asset plugin the store
  relies on for absolute-path asset imports.
- `packages/engine/src/server.ts`: `startBunDevProcess` (`:728`, respawn + the
  import-tree `FilesWatcher`), `readPoints` (`:359`, the per-request points
  re-import gated by the manifest), `getBuildPaths`, `getCompilerOptions`.
- `packages/engine/src/server-hot-store.ts`: `ServerHotStore`,
  `stronglyConnectedComponents`, `sweepStaleStoreFiles`.
- `packages/engine/src/engine.ts`: `_setupServerHotStore` /
  `_resolveServerHotStore`.

[bun#5844]: https://github.com/oven-sh/bun/issues/5844
