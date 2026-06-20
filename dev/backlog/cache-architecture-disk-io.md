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
- Entry = `<sha256(absPath)>.<mtimeMs>` → JSON `{code, map, modified, imports}`
  (file.ts `getCache`/`writeCache`); each write glob-cleans the same file's
  older-mtime entries — fine at real sizes.
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
   changes emitted code. Verify `modified`/`imports` fields are map-independent
   before merging (they should be — same transform).
2. **Partition GC + workspace-aware `point0 prune` (hygiene, near-zero
   effort).** On dev/build startup, async-delete partitions whose dir-mtime is
   older than ~30 days. Teach `prune` to sweep every
   `node_modules/.cache/@point0` under the workspace root — today it cleans only
   the nearest `node_modules` from cwd, so a monorepo-root prune misses
   `packages/*/node_modules/.cache`. Also closes the stale-partition bug class
   (a poisoned old entry produced wrong build output in tests on 2026-06-11 —
   the "Hi!" failures in build.test.ts).
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
