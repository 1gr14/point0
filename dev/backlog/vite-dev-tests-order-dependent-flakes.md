# Vite dev/build integration tests are order- and load-sensitive (pass isolated, flake in-suite)

**Status:** open · **Area:** test infra / vite dev startup · **Blocks:**
trustworthy full runs of `packages/engine/tests/dev-bundler.e2e.test.ts` (vite
half) and occasionally `build.e2e.test.ts` / `two-clients.e2e.test.ts`.

## Symptom

Vite-bundler integration tests fail **only when run as part of a larger
sequence**, each one passing 2/2 when run isolated. Evidence collected
2026-06-11 (paired runs with/without that day's engine changes — failures
identical on baseline, so none of this is a code regression):

- Full dev-suite runs (now `dev-bundler.e2e.test.ts`): 41 pass / 2 fail, the 2
  failing names ROTATE between runs (`have hmr client updates`,
  `mock imports on client side`, `have server updates`, `start ssr dev server`,
  `keeps error stack`, `deny imports…`). Every single one of them passes
  isolated via `-t`.
- Failure mode is almost always the same: the spawned `point0 dev` prints
  **nothing at all** (not even the generator line) for 30s →
  `Timeout waiting for output: started http://localhost:32XX`. Under load,
  CLI/toolchain cold-start of a fresh temp project takes longer than the
  harness's 30s `waitStarted` budget.
- The suite is self-saturating: each test scaffolds a fresh project (cold
  compiler cache, cold vite optimizer), spawns builds + dev trees + Playwright;
  on an 8-core machine load climbs to 20–50 by mid-suite and stays there. With
  the machine pre-loaded (e.g. post-reboot Spotlight reindex), even the FIRST
  test times out.
- `have hmr client updates` also has a real known functional issue on vite — see
  [vite-fast-refresh-point-state-loss](./vite-fast-refresh-point-state-loss.md)
  — but today it passes isolated, so the in-suite failure is the load/order
  effect, not (only) that bug.

## Proposal

Make vite tests resilient to their own load rather than chasing each flake:

1. **Reuse a warm vite deps cache** across temp projects (same deps every time):
   point `optimizeDeps`/`cacheDir` at a shared warm dir under the engine tests
   temp root, or prebundle once in `beforeAll` and copy. Cold optimizer runs are
   the single biggest chunk of vite dev boot here.
2. ✅ **Done (ci-rework, 2026-07-09):** `waitStarted` is 90s on vite projects
   (30s on bun) — a slow start is not a failed start; the negative pattern
   (`!Failed to start server`) still fails fast on real errors. Same session:
   the two HMR tests' `waitContent` calls carry 15s ceilings (the old 2s default
   read a slow-but-correct HMR round-trip as a flake) and
   `have hmr client updates` retries on a fresh project (retry 2) like its
   server sibling.
3. Consider running the vite half with `FOCUS_VITE=1` semantics in CI (its own
   job) so the bun half's process churn doesn't precede it.
4. Optional hygiene: `tpf.cleanup` should also reap the per-package compiler
   cache its temp projects grow
   (`packages/engine/node_modules/.cache/@point0/compiler-cache` gained ~0.7 GB
   / 17k files per test-suite hour — see
   [cache-architecture-disk-io](./cache-architecture-disk-io.md)).
