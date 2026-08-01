# Compiler cache: real-project optimizations

**Status:** open · **Area:** compiler cache / dev hot store / prune

## Scope — optimize for the REAL-project case

The multi-GB cache dirs seen in this repo are a TEST artifact: test temp
projects live at random paths, cache entries are keyed by path-hash, so every
test run mints new partitions/entries forever. A real app lives in one folder —
its partitions are stable, per-file self-cleanup keeps a live partition at ≈ one
entry per source file, growth is slow. Git operations are NOT a cache problem
either: checkout/pull/stash rewrite only files whose content actually changed
(unchanged files keep their mtime), so the post-checkout recompile is work that
genuinely needs doing — and the cache itself sits in gitignored `node_modules`,
untouched by git. SQLite was considered and rejected: the hit path (`statSync` +
one small read) is already near-optimal, real entry counts are hundreds, and
eviction needs are covered by item 2 below — a DB would add multi-process
WAL/busy/migration complexity to solve non-problems. Revisit only if the cache
ever becomes a hot lookup path (e.g. a persisted import-graph index for the dev
watcher).

Facts verified 2026-06-11, useful to the implementer:

- Partition = `node_modules/.cache/@point0/compiler-cache/<sha256(settings)>/`;
  settings include side, `map`, `hmrFix`, built, mode, resolved env-const
  VALUES, routes/markdown/babel config (compiler.ts `getSettingsHash`).
  Partitions churn only on real config/env changes — full invalidation is then
  semantically required (consts inline into output).
- Entry = `<sha256(absPath)>.<mtimeMs>` → JSON
  `{code, map, modified, imports, reads}` (file.ts `getCache`/`writeCache`);
  each write glob-cleans the same file's older-mtime entries — fine at real
  sizes. `reads` (added 2026-08-01) is the compile's read log — see below.
- Hot store, generator, asset cache are already write-optimal (content-addressed
  / write-only-on-change) — verified.

## Items, by payoff

1. **Stop double-compiling across the `map` partitions (the headline — costs
   every dev session).** Partitions split on the `map` flag, but the cached
   entry already stores `{code, map}` separately and `code` is identical either
   way — only the map's presence differs. Today the dev orchestrator's
   import-graph walk (map:false) and the actual serving compiles (map:true) land
   in different partitions and compile every file TWICE. Fix shape: take `map`
   out of the partition key; a `map:false` request is served by any entry
   (ignore its map); a `map:true` request that hits a map-less entry recompiles
   with map and upgrades the entry in place. Keep `hmrFix` in the key — it
   changes emitted code. Verify `modified`/`imports`/`reads` fields are
   map-independent before merging (they should be — same transform).
2. **Partition GC + workspace-aware `point0 prune` (hygiene, near-zero
   effort).** On dev/build startup, async-delete partitions whose dir-mtime is
   older than ~30 days. Teach `prune` to sweep every
   `node_modules/.cache/@point0` under the workspace root — today it cleans only
   the nearest `node_modules` from cwd, so a monorepo-root prune misses
   `packages/*/node_modules/.cache`. Also closes the stale-partition bug class
   (a poisoned old entry produced wrong build output in tests on 2026-06-11 —
   the "Hi!" failures in build.e2e.test.ts).
3. **Hot-store manifest micro-fix.** `manifest.json` is rewritten (tmp+rename)
   on EVERY store rebuild because the `version` counter bumps, while the child
   reads only `aggregators` (server-hot-store.ts) — skip the write when the
   aggregators map didn't change.
4. **Optional, accurately scoped: survive branch round-trips.**
   `checkout main && checkout feature` recompiles the branch-diff set twice:
   returning to `feature` restores old content with a new mtime, and the
   matching old entry was already evicted (one entry per file). If wanted: keep
   up to N entries per file keyed by content-hash (mtime as the fast path,
   content-hash as the fallback). Niche — only frequent branch-hoppers feel it;
   do last or not at all.
5. **Test-infra hygiene (not a user issue).** tpf cleanup could reap the cache
   roots its temp projects grow
   (`packages/engine/node_modules/.cache/@point0/compiler-cache` gained ~0.7 GB
   / 17k files per test-suite hour).

Recommended order: 1 (when the compiler is open anyway), 2+3 as a small chore,
4/5 opportunistic.

## What invalidation still misses (2026-07-31)

Two dependency-driven staleness bugs were fixed on this date, both scoped to
`packages/compiler`:

- A cache hit now re-resolves the imports the entry recorded (`file.ts`
  `cachedImportsStillResolveTheSame`, called from `getCache`) and treats any
  moved resolution as a miss. Before that, renaming `b.ts → b.tsx` or moving
  `x.ts → x/index.ts` left every importer's entry valid forever — its own path,
  mtime and settings never moved — so stale resolved paths AND the deny/mock
  rewrites decided from them survived process restarts until `point0 prune`.
- A compile handed explicit `content` (Vite's `transform`, the babel
  `parserOverride`) no longer touches the disk cache at all (`compiler.ts`,
  `useCache`). It used to write under `<hash>.0` (a content-backed
  `CompilerFile` carries `mtime: 0`), which no read ever looks up while its
  glob-based sweep deleted the valid entries the content-less compiles wrote —
  and on the read side it could answer a content compile with an emit computed
  from what was on disk. Keying those by content hash is not wanted: Vite caches
  upstream.

### Hole 1 — cached emit also depends on dependency CONTENT — CLOSED (2026-08-01)

Import resolution is not the only thing a compile reads out of its dependencies.
Base-point resolution walks the import graph and PARSES the files it lands on:
`walker.ts` `findLetsNodePathByExportName` resolves an import and reads the
imported file to find the `.lets()` chain behind an identifier, and the
re-export pass does the same through `export … from`. The point type, scope,
`basePath` and sugar-relatedness that come back shape the emitted code of the
importer. Edit only the dependency — same filename, so the resolved path is
unchanged and the importer's mtime is unchanged — and the importer's cache entry
kept serving an emit built from the dependency's OLD content. Reproduced across
fresh processes (the exact shape of dev restarts, `build --watch` rebuild
spawns, consecutive `point0 build` runs).

Closed with the read-log: every file whose content a compile consumes reports
`(abs, mtimeMs)` through the single choke point `CompilerFile.readSync` into the
walker's read-log stack (`Walker.readLogs`); the entry payload stores the list
(`reads`), and `getCache` stats each recorded file — any mismatch or missing
file drops the entry. Entries in the previous format (no `reads`) read as a miss
and get rewritten. Two structural details:

- **The resolve-recheck stays — the read-log does NOT subsume it.** The earlier
  design note said it would; that was wrong on two counts. Plain imports are
  only ever RESOLVED, never read, so a renamed plain dependency changes nothing
  the read log recorded — only re-resolution notices it. And a newly CREATED
  file can win resolution over the recorded one while everything recorded still
  stats clean. Conversely the recheck cannot see content edits. Measured on warm
  entries (M-series, APFS): the recheck costs ~3 µs per first-party import, the
  read-log check ~1.2 µs per recorded read and ~0.04 µs when the list is empty
  (the common plain-module case). Warm-hit total stays ~50–80 µs/file — the
  additions are noise against it.
- **`CompilerPoint.chainReads`** — each point records, at `parse()` time, every
  file its chain resolution read (the walker read-log stack makes nested parses
  transitive). Compiles that serve points from walker memory replay those reads
  into the open log. Load-bearing in one real pattern (proven by test): one
  persistent compiler writing into two cache partitions — the dev orchestrator
  compiles `map: true` for the hot store and `map: false` for the watch-graph
  collect, and the second compile of an unchanged file collects zero-parse from
  memory (`allPointsWasCollected`). Cross-compile point reuse via NodePath
  identity (`pointFromMemory` / the `exPoint` binding match) empirically never
  fires — every fresh collect re-parses the chain and re-reads its files — but
  the replay is wired on those paths too, so the invariant does not depend on
  babel's path-cache behavior staying as it is.

### Hole 2 — the in-memory twin — VERDICT: no watcher machinery needed (2026-08-01)

The same staleness lives in memory, where the disk cache cannot help: with
`pruneWalker: false` the walker keeps every `CompilerFile` and its memos for the
process lifetime. Mapped every long-lived compiler in the engine and checked
whether stale memory is REACHABLE in real usage:

- **Dev server child (Bun runtime plugin)** — `built: false`, so every compile
  prunes the walker (`pruneWalker = !built`). Not reachable.
- **Vite dev / Vite build** — transform passes content, disk cache bypassed; dev
  prunes per compile; build is one-shot. Not reachable.
- **Hot-store rebuild (dev orchestrator)** — the compiler is long-lived, but
  every node compile uses the default `pruneWalker: true`. In-memory not
  reachable; the disk cache was the actual exposure (Hole 1, closed).
- **`point0 build`** — `built: true`, walker persists, but the process is
  one-shot and files are assumed static for the duration of a build (the
  standing invariant). Not reachable within a build; ACROSS builds it is the
  disk cache's job (closed).
- **`build --watch`** — every rebuild is a freshly spawned `point0 build`
  process; no memory carries over. The PARENT keeps compilers for the
  watch-graph re-collect — see next bullet.
- **`collectImportsDeep` (watch graph: dev orchestrator + `build --watch`
  parent)** — the one truly long-lived `pruneWalker: false` consumer. Two
  reachable staleness bugs found here and FIXED at the compiler layer, no engine
  change:
  - `pruneMemory` did not clear `_collectImports*`, `_applyImporter`,
    `_applyUserBabelPlugins`, `_preUserBabelMap`, `_shakeForBuiltEngine`, or
    `imports` — so an EDITED file (own mtime changed, memory pruned, AST
    re-parsed) still answered with its old import list and skipped the importer
    rewrite on the fresh AST. Now they all fall with the mtime.
  - A dependency change invalidates the disk entry, but the walker's memoized
    state for the importer was derived from the same stale world — the fresh
    pass would recompile from memory and rewrite a poisoned entry. Now an
    INVALIDATED entry (as opposed to a merely absent one) also triggers
    `CompilerFile.refresh()` on the importer: memos drop, content stays, the
    pass re-derives everything.
- **Generator** — builds a fresh `Walker` per `process()` run. Not reachable.

So the designed watcher-event invalidation (reverse dep map, dropping importers
on file events) is NOT built — no emit-serving path can reach in-memory
staleness, and the watch-graph consumer is covered by the two fixes above.

Residual, accepted and documented rather than machinery'd:

- With `cache: false` in the engine config there is no invalidation signal, so a
  long-lived `pruneWalker: false` compiler CAN serve memoized points whose chain
  files changed. Only the watch-graph collect fits that shape, and its consumed
  output (the import list) does not depend on chain content; every emit-serving
  flow prunes per compile or runs one-shot.
- A content change that preserves `mtimeMs` exactly defeats the read-log the
  same way it defeats the entry key itself — inherent to mtime-based identity.
