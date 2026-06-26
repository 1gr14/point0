# Server-side hot reload (point0 dev)

**Status:** **LANDED and proven on `point0 dev`** (real `examples/basic`).
Approach proven by experiment (exp7/exp8/exp9); engine integration now wired
(exp10 + the engine code below) and demonstrated end-to-end: a page edit
hot-swaps the SSR output with **no process restart, no React tear**; editing the
cold-marked `lib/prisma.ts` triggers a **full restart**. Pure Bun — no Vite.

Worktree: `hotreload-server` (branch `hotreload-server-exp`). Bun 1.3.14.

## Landed — what shipped (engine integration)

Enable it (bun-native dev only; Vite path unchanged) any of three ways — CLI
flag, `dev()` option, or env var:

```sh
point0 dev --hot                 # CLI flag
```

```ts
await engine.dev({ serverHot: true }) // programmatic
```

```sh
POINT0_DEV_SERVER_HOT=true point0 dev   # env var (fallback when the option is omitted)
```

Precedence: the explicit `serverHot` option (set by `--hot`) wins; otherwise it
falls back to the env var. Off by default. Under the hood:

- **`packages/engine/src/server-hot-store.ts`** — the content-addressed store
  builder ported from exp9, generalised to **many entries** (the server points
  aggregator **and** each client points aggregator — the stable child re-imports
  both for SSR, see `readEverything`) and **auto cold detection** by the
  `@point0/core/cold` marker (no explicit cold-root list). Store dir lives under
  `node_modules/.cache/server-hot/<scope>-<port>` and hashed names strip
  `point0`, so `compiler.filter` rejects the whole store for free (asserted
  after every build) — the child's compiler `onLoad` plugin never re-transforms
  a pre-compiled store file. The dir is keyed by `<scope>-<port>` (matching the
  dev-client temp dir convention) so two `point0 dev --hot` processes on the
  same folder but different ports get **isolated** stores + manifests and can't
  clobber each other (the initial `clean` and the shared manifest were the only
  cross-process hazards; disjoint dirs remove both).
- **`EngineServer.startBunDevProcess`** (orchestrator) — in hot mode: build the
  store, spawn a **stable** child (no `--watch`), pass `POINT0_DEV_STORE_DIR`.
  The existing import-graph `FilesWatcher` then decides per change: a **hot**
  store node → rebuild the store + bump the manifest (NO restart; the child
  re-imports on its next request); anything else (cold-marker subtree, the boot
  entry, files outside the store) → **full child restart**.
- **`EngineServer.readPoints` / `EngineClient.readPoints`** (child) — in hot
  mode re-import the matching aggregator from the store, **gated by the manifest
  hash** (unchanged → cached `this.points` → singletons live; changed → fresh
  module identity). Aggregator abs paths come from the generator tasks, so the
  parent's store entries and the child's lookup keys line up. Wired in
  `Engine.prepare` via `_setupServerHotStore` / `_resolveServerHotStore`.
- **`Fetcher.fetchDetailed`** — the per-request points re-read (previously
  Vite-only) now also fires when `server._serverHotStore` is set. This is the
  manifest hook.

Proof: the live `point0 dev` run (page edit → `store v2`, no `Server started`;
`prisma.ts` edit → `Server restarting` + a new `Server started`) + the automated
suite in `packages/engine/tests/dev.test.ts` →
`describe('server hot reload (bun-native, --hot)')` (plus the pure-unit
`server-hot-store.test.ts` for the SCC primitive): a point edit keeps the server
`process.pid` (hot-swap, no restart) while a `@point0/core/cold` edit changes it
(restart). The full bun + vite `dev.test.ts` suite stays green (no regression to
the default restart-based dev).

The suite covers: a page edit (hot-swap, pid stable), a `@point0/core/cold`
marker edit (restart), a config-glob cold file (restart), cold/boot syntax-error
keep-alive + recovery, a layout + server loader + shared-lib cascade + page all
hot-swapping, a **mutation** hot-resolving (a button click returns the edited
value, pid stable), a **brand-new page file** added at runtime (route served
automatically), an **`.mdx` page body** edit (hot-swap, pid stable), a **file
deletion** (route drops, dev tree alive), a **file rename** keeping the same
route, **per-port store-dir isolation**, a **real import cycle** (`a ↔ b`)
hot-swapping with no `./undefined` regression (SCC hashing end-to-end), an
**`import.meta.url` node auto-externalizing** (runs cold; edit restarts), a
**`--hot` session started on an already-broken hot file** recovering (no
teardown; boots on fix), and the three interaction tests below.

### User babel plugins & importer rules × the hot store

Both compose cleanly with the content-addressed store — verified, because **the
store only relocates compiled OUTPUT to content-hashed paths and rewrites import
SPECIFIERS to point at relocated siblings; every per-source decision is still
made earlier, during the store-build compile, on the ORIGINAL path.** So:

- **User babel plugins (e.g. `babel-plugin-react-compiler`)** put on the
  _server_ compiler run INSIDE the store compile. Tests: react-compiler enabled
  → a page still hot-swaps (pid stable), and a thrown stack still remaps to the
  original line (`toCode()` chains react-compiler's `intermediate → original`
  map before the store appends it inline — the chaining survives into the store
  map). Sourcemaps and hot-swap both hold.
- **`importer.mock`** (replace an import with a proxy) keys on the import TARGET
  specifier → the decision is baked in at store-build time; test: a client-only
  module imported on the server is mocked to a proxy _through_ the store, and
  the mock still applies after a hot edit (pid stable).
- **`importer.deny`** fires during the store compile exactly as in non-hot dev;
  test: a wrong-side import logs `Import denied on side "server"` from inside
  the store build. (A hard deny without `mock` is a fatal import in both modes —
  it isn't a hot-swap scenario.)
- **`importer.cold`** keys on the file's OWN path and is consumed only at
  store-build time on the original path (see the config-glob cold test above) —
  so the store's content-hashed paths never reach the cold matcher.

### Crash resilience (cold/boot errors)

The hot child runs under `bun --watch` (same as normal dev). bun's watcher only
sees the entry's **static** import graph — the boot/cold chain — because the
points/pages are reached **dynamically** through the store and are invisible to
it (bun#5844). So `--watch` gives the cold chain restart-on-edit +
**keep-alive-on-crash for free** without ever fighting the hot-swap: a syntax
error in a cold/boot file prints bun's error and leaves the dev tree **alive**,
and fixing the file recovers it (proven by `dev.test.ts`). A hot-file compile
error is caught separately and keeps the previous store. The store also skips
rewriting unchanged files (content-hash names), so a rebuild never bumps a
watched file's mtime.

Two more recovery paths make "infinite dev" hold even at startup (never a forced
`point0 dev` re-run for a typo):

- **Initial store build fails** (an un-flattenable import in an aggregator; a
  compile error that throws) → the orchestrator logs the cause and stays alive
  with the server child **deferred** (`storeReady=false`); the watcher retries
  the build on each save and starts the server the moment it succeeds.
- **`--hot` started on an already-broken hot file** → the store builds (the
  compiler passes broken code through), so the child crashes importing it before
  binding the port. The orchestrator tracks whether the child ever **booted**
  (it scrapes the `Server started http…` line): a never-booted child that exits
  is dropped **without** tearing the tree down (it's a fixable error, not a dead
  tree), and the next save **respawns** it (a hot-swap can't revive a server
  that never came up). Both are covered in `dev.test.ts`. Note: this leans on
  the file watcher being subscribed before the fix — in a real app the watch
  tree is just `src` (node_modules excluded), so that's instant.

### Known follow-ups (MVP cut)

- ~~Assets rewrite to an absolute path (MVP)~~ **RESOLVED.** The store rewrites
  an asset import to its absolute real path, and that's complete — the
  compiler's asset plugin (`@point0/compiler` `assets.ts`) keys on the
  EXTENSION, not the path, so the stable child intercepts the absolute asset
  import and emits the same content-hashed `/_point0/assets/<hash>.<ext>` served
  URL as non-hot dev (the `?url`/`?file`/`?text`/`?react` queries are preserved
  too). Verified by the "resolves an asset import through the hot store" test.
  Absolute paths are fine: the store is dev-only and machine-local, never
  shipped.
- The cold downward closure follows all import edges, not strictly static-only
  (no `kind` flag on compiler imports yet) — fine for the current targets
  (Prisma has no lazy edges); revisit if a cold file lazy-imports a hot subtree.
- The store is rebuilt in full on each hot change (discovery + compile; only
  changed files are written). Bun compiles fast, so this is fine for now;
  incremental discovery is a later optimization.
- `app.client` (the client app shell) is not in the store, so editing it does
  not hot-swap (it restarts, like any non-store file).
- **Adding a brand-new file restarts (does not hot-swap).** A new page/point is
  picked up automatically (the generator regenerates the aggregators, no manual
  restart needed), but it currently comes in via a **child restart** rather than
  a hot-swap — the new path enters the watch graph as an unknown node and lands
  in the restart branch. Acceptable for now (it's new code, and old point0
  restarted on everything); making new files hot-swap (treat an add as
  "regenerate aggregator → hot rebuild") is a possible later refinement.
  Verified by `dev.test.ts`. Editing/deleting/renaming an _existing_ file
  behaves as expected (edit → hot-swap; delete → route drops; rename → route
  follows).

> **History:** an earlier version of this doc recommended “build → temp dir →
> atomic swap into `dist/server` → `bun --hot`”. That approach was **built and
> disproven** on the real `examples/basic` — see _Dead end_ below. Don’t
> resurrect it.

## TL;DR

- point0’s **server** dev doesn’t truly hot-reload: on any change it
  **`SIGKILL`s the child and respawns** — slow, drops all in-memory state (DB
  pools, caches, the open socket).
- **The constraint:** the compiler runs as a Bun **`onLoad`** plugin, and files
  transformed by an `onLoad` plugin are **invisible to `bun --watch`/`--hot`**
  ([bun#5844]). So we can’t just watch source; the compiled output has to be
  materialized somewhere Bun can see it.
- **Dead end — `bun --hot` on pre-compiled output.** Tried two deliveries: a
  built **bundle** swapped into place, and a per-file compiled **mirror**.
  **Both break React SSR after a reload.** `bun --hot` does a **partial**
  module-graph reload, and React’s cross-module dispatcher singleton tears
  (`Invalid hook call` / `more than one copy of React` /
  `resolveDispatcher().useRef is null`) because the `react-dom/server` renderer
  (in the framework `dist`, unwatched) does **not** reload together with the
  edited component. Reproduced on the real app. **Not** fixable by
  code-splitting / single-file / `accept()` boundaries.
- **Winning approach (proven, pure Bun, NO `--hot`):** keep the server process
  **stable** — React, react-dom, the engine, Prisma all load **once and never
  reload** — and pick up changes by **re-importing the points/pages with a fresh
  module identity**. A new page module imports `react` by **bare specifier** →
  the **same cached instance** the renderer uses → no dispatcher tear. Unchanged
  modules (Prisma) keep their identity → cached → **state persists, no leak**.
- **Mechanism: content-addressed modules.** Compile each source file
  (`compiler.compile`, point0 transforms only), write it under a **content-hash
  filename**, and rewrite its **relative** import specifiers to its deps’ hashed
  filenames. On change, only the changed file **and its importer chain** get new
  hashes; everything else keeps its hash. The engine **re-imports the current
  points aggregator** (by a manifest hash) per request. No bundling, no `--hot`,
  stable process.

## Proven by experiment

The mechanism was proven by a series of standalone `bun` experiments
(exp7→exp10, kept out of this repo); the early `--hot`/mirror dead-ends that led
here were pruned — their findings survive as the chain below:

1. **An `onLoad`-transformed file is invisible to `bun --watch`/`--hot`**
   ([bun#5844]) — so raw-source watch can’t work and the compiled output must be
   pre-materialized. Early `--hot` probes (state preserved / new files / dynamic
   `import()` / atomic folder swap) **passed on toys with no React**, which is
   what made `--hot` look viable…
2. **…until the real app:** `bun --hot` on the real **bundle** _and_ on a
   per-file **mirror** both **tear React SSR** (dispatcher → `null`).
   Delivery-independent — `--hot` is simply the wrong reload tool for React SSR.
3. **`exp7-stable-reimport`** — **proof of the core:** plain `bun` (NO `--hot`),
   per-request re-import of a leaf with a fresh module URL → content updates,
   **process and state preserved** (`startedAt` identical), **no React tear**.
4. **`exp8-content-addressed`** — **proof of the full mechanism:** the
   content-hash cascade. Editing a **deep child** updates it; a Prisma-like
   **singleton** keeps its hash → stays cached → **state persists** (counter
   keeps climbing, `startedAt` stable); **no tear**. Only the changed file + its
   importer chain re-hash.
5. **`exp9-real-store`** — **the mechanism on the REAL `examples/basic`** (real
   `@point0/compiler`, not a toy). **51/51 of the user's own module imports
   rewrite cleanly** (pages, lib, layouts, ui, aggregator, routes — 22 nodes);
   `react`/`@point0/*`/`@prisma/*`/`zod`/`superjson` stay **bare** → cached
   singletons. The **only** things a flat store can't relocate: **Prisma's
   generated client** (6 dir/wasm/`import.meta` imports) and **2 asset** imports
   (png/svg). **Finding: pure all-hot is impossible on a real app — Prisma
   forces the cold boundary.** Both unswappable categories are exactly the
   cold/asset cases below.

## Why not…

- **Vite ModuleRunner.** It would solve SSR HMR correctly (it controls module
  identity), but **point0 is a pure-Bun framework** — pulling Vite into the
  server-dev path defeats the whole point. Off the table.
- **`bun --hot` (any delivery).** Tears React SSR (above). The minimal harness
  hid it because there the renderer was in the watched/reloaded set; in a real
  framework the renderer lives in unwatched `dist`.
- **The old hand-rolled “mirror” (`.js` + regex fixes).** Wrong layer — but the
  lesson was misattributed. The per-file compile is fine; the mistake was
  driving it with `--hot`. We keep the clean mirror, drop `--hot`.

## The mirror is still the right way to produce watchable JS (just not under `--hot`)

The clean per-file compile **did** run the real server correctly in dev
(proven): full SSR with Prisma (HTTP 200), the 302 redirect to the dev client,
etc. And crucially it has **none of the build-flag conflation** the bundle had —
the mirror is **not** “built” (`_point0_env.build.was === false`), so redirect /
dev-ssr-fix-assets work natively and **no `fetcher` change is needed**. Keep it,
with these tricks:

- **Sibling-depth.** Put compiled output at the **same depth as `src`** (e.g.
  `examples/basic/.dev-mirror/`, a sibling of `src/`). Then `../`-relative paths
  (`../public`, `../dist`) and `import.meta` resolve **identically** to source —
  no rewriting.
- **`@/` alias** → a `tsconfig.json` inside the mirror mapping `@/* → ./*`.
- **`.mdx` → `.tsx`** (rename + rewrite `.mdx` specifiers; Bun has no native mdx
  loader).
- The compiler’s `writeVirtual: true` already materializes virtual modules to a
  temp dir — reuse it.

## Hot vs cold: the `@point0/core/cold` marker (design — not yet implemented)

Not every server file is safe to hot-swap: the server is a **real server** with
boot/runtime side effects — crons, workers, queues, warmup, and singletons like
the DB client. Editing those needs a **full restart** (the client dev server
stays alive and proxies, so a restart is cheap and invisible to the browser).
Editing a page/component/handler should **hot-swap**.

How we classify — **declarative, default-hot**, mirroring the existing
`@point0/core/client-only` convention:

```ts
import '@point0/core/cold' // this file + its static-import subtree is COLD → editing it restarts the server
```

Rules:

- **Default:** every server file is **hot**.
- **Cold root — two ways to declare:** (a) the in-file marker
  `import '@point0/core/cold'`, or (b) a config glob on `server.importer.cold`
  (e.g. `cold: ['**/prisma.*']`) for files you can't or don't want to edit —
  same effect, matched against the file's own path. (Implemented:
  `isImporterColdPath` in `@point0/compiler`, consumed by the store builder.)
  The **server entry is cold by default** (it _is_ boot).
- **Cold flows DOWNWARD** through **static** imports (a cold file’s deps are
  part of its cold unit, so editing a cold helper restarts too) and **stops at a
  lazy `import()`** (deferred = re-importable = the hot boundary — this is what
  keeps boot cold while the lazily-loaded points subtree stays hot, _without
  reasoning about points_).
- **Importers of a cold file stay hot:** a page importing `prisma` (cold) is
  still hot; `prisma` just isn’t re-evaluated on a page hot-swap (its content
  hash is unchanged → cached).
- **Decision:** a changed file that is **cold → full restart**; otherwise →
  **hot-swap** (content-addressed re-import).

Why this beats a “does the file define a point?” heuristic (an earlier idea,
since dropped): it’s declarative (the author states intent), predictable, and
consistent with `client-only` — no guessing, and shared render helpers (`ui/*`,
`lib/*`) stay hot instead of forcing restarts.

Implementation note: `collectImportsDeep` would gain an `isCold` flag,
propagated from cold roots along static-import edges and halted at lazy
`import()` — traced like `client-only` denial already is.

> **Proven by exp9 (real app):** a _pure_ all-hot first pass is **not
> achievable** — Prisma's generated client (dir + wasm + `import.meta` imports)
> **cannot be flattened** into the store, so it forces a **minimal cold boundary
> even on day one**. A cold node is **not flattened**: its import is rewritten
> to the **absolute real path** → it loads once at its real location (its own
> `../` / wasm / `import.meta` intact) and stays a cached singleton. So the
> realistic "first pass" is **all-hot for the user's source + externalize the
> unswappable (Prisma)**. _How_ to pick that cold set is the open decision
> below.

## The plan (engine integration)

1. **Stable server process.** Run the server entry **without** `--watch`/`--hot`
   — it loads engine + `serve()` once. Keep the existing crash → teardown
   wiring.
2. **Content-addressed point store.** Compile each source file via the compiler
   (`built:false`), write under a **content-hash name**, rewrite **relative** +
   `@/` specifiers to hashed names. **Bare** specifiers (`react`, `@prisma/*`,
   `@point0/*`) are left alone → cached singletons. Hash per
   **strongly-connected component, dependency-first** (a plain topological order
   doesn't exist with import cycles): each SCC is hashed as one unit so a change
   cascades **up** the importer chain and intra-cycle imports still rewrite to
   consistent, resolvable names. The store filename carries a per-file relpath
   hash so two paths that sanitize alike can't collide. (Implemented:
   `stronglyConnectedComponents` + `buildHot` in `server-hot-store.ts`.)
3. **Re-import on change.** The engine already re-imports points per request
   (`readPoints`, `server.ts:342`). Point it at the **current aggregator hash**
   (a manifest the builder updates). On a watched change (reuse the existing
   import-tree `FilesWatcher` in `startBunDevProcess` — **not**
   `buildWatchGlob`), recompile the changed file(s) → update the store +
   manifest. Next request re-imports the new aggregator → fresh changed modules,
   cached singletons.
4. **Singletons stay cached for free.** An unchanged file keeps its hash → its
   module record is reused → Prisma etc. persist. No deny-list needed for
   correctness.
5. **Restart vs hot-swap = the cold marker** (see _Hot vs cold_ above). First
   pass: **all-hot** (every change re-imports via the store). Then: a changed
   **cold** file (entry/crons/workers/singletons) → full restart; everything
   else → hot-swap.
6. **Generator — nothing special.** It writes generated files into the user’s
   source folders; the same watcher recompiles them into the store.

### Open questions / verify during implementation

- **Unbounded growth — RESOLVED.** Two mechanisms bound a long session: (1)
  **disk** — `ServerHotStore` mark-and-sweeps its dir after every build,
  deleting store files no longer referenced by the current manifest that have
  been stale past a grace window (`POINT0_DEV_SERVER_HOT_GC_GRACE_MS`, default
  30s; the grace guards a concurrent child first-import). (2) **memory** — the
  child's Bun module cache keeps every superseded hot-swapped version (no
  eviction API), so every Nth booted hot reload the orchestrator restarts
  instead of hot-swapping to release them
  (`POINT0_DEV_SERVER_HOT_RESTART_EVERY`, default 200, 0 = off). Disk GC is
  unit-tested (`sweepStaleStoreFiles`) and e2e-tested (dir stays bounded across
  many edits).
- **Asset imports** (png/svg) inside points — **DONE.** A flattened store file
  can't resolve `../assets/*`, so the store rewrites each asset import to the
  asset's ABSOLUTE real path. The compiler's asset plugin (`@point0/compiler`
  `assets.ts`) keys its `onLoad`/`onResolve` on the EXTENSION (not the path), so
  the stable child intercepts that absolute import and emits the same served
  `/_point0/assets/<hash>.<ext>` URL as non-hot dev — no separate store-build
  asset step needed. (`?url`/`?file`/`?text`/`?react` queries preserved.)
- **The content-addressed boundary** — **decided by exp9:** the store
  content-addresses the **points aggregator subtree** (re-imported per request);
  the **server entry stays a single stable load** (loaded once, re-imports go
  through the manifest, not a fresh entry). All-hot applies to the user's
  source; the **unswappable cold set (Prisma's client) is externalized to its
  real path**, not flattened.
- **How to pick the cold/externalize set** — **DECIDED & SHIPPED: explicit
  markers FIRST, automatic externalization as a safety net.** Cold roots come
  from three sources, all in ONE place (the store builder): (1) the declarative
  `@point0/core/cold` marker; (2) the `server.importer.cold` glob; (3) AUTO — a
  node the store provably **cannot** flatten: a location-relative `import.meta`
  (`.url`/`.dir`/… → would resolve to the store dir), or one left with an
  un-rewritable relative import after the rewrite pass (a "miss", e.g. a
  generated client's `./enums` dir / wasm). The original worry — that an
  auto-detect heuristic is a "wild crutch" that misfires _silently_ — is
  addressed by making auto-externalization **loud and grounded**: it triggers
  only on a provable un-flattenability (not a guess), and every
  auto-externalized file is **logged** at startup
  (`N file(s) can't be flattened — running cold`). This keeps zero-config
  `--hot` working on a real app (Prisma client + engine config externalize
  themselves) without forcing the user to hand-mark every generated/infra file.
  An explicit `@point0/core/cold` marker still works and is preferred when you
  _want_ a subtree cold deliberately. **Proven in exp9 + the igrich site:**
  Prisma's client externalizes (whether marked or auto) → store builds with **0
  misses**.
- **Client dev is unaffected** — separate path; this is server-only.

## Pointers

- `packages/compiler/src/compiler.ts`: `compile()` (with `writeVirtual` it
  materializes virtuals to a temp dir), `collectImportsDeep`.
- `packages/compiler/src/plugin/bun.ts`: the dev `onLoad` transform we replicate
  **per file** for the store.
- `packages/engine/src/server.ts`: `startBunDevProcess` (current respawn + the
  import-tree `FilesWatcher` to reuse), `readPoints` (`~342`, the per-request
  points re-import to redirect at the manifest), `getBuildPaths`,
  `getCompilerOptions`.

[bun#5844]: https://github.com/oven-sh/bun/issues/5844
