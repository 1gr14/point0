/**
 * The slow integration test files — single source of truth, shared by the test runner (scripts/test-parallel.ts) and
 * the CI matrix builder (scripts/ci-decide.ts).
 *
 * "Slow" = heavy integration files that boot a full dev/build tree. They run strictly one file per process (never a
 * combined `bun test`) so module-level state and ports can't bleed across them, and in CI each one gets its own runner
 * (one shard per file). Paths are relative to `packages/`.
 */
export const SLOW_TESTS = [
  'engine/tests/build.int.test.ts',
  'engine/tests/module-preload-serve.int.test.ts',
  'engine/tests/cli.int.test.tsx',
  'engine/tests/mcp.int.test.ts',
  // dev.test.ts was split into three files (each its own slow shard) to shorten the critical path.
  'engine/tests/dev-bundler.e2e.test.ts',
  'engine/tests/dev-hot-reload.e2e.test.ts',
  'engine/tests/dev-source-maps.e2e.test.ts',
  'engine/tests/prefetch-page.e2e.test.ts',
  'engine/tests/scroll-restoration.e2e.test.ts',
  // deploy invalidation: builds the project twice (the "redeploy") + Playwright tabs that outlive it
  'engine/tests/client-build-stale.e2e.test.ts',
  // only the e2e half of the suspend and rsc coverage (dev server + Playwright) is slow; the
  // in-process halves (suspend.int.test.tsx, rsc.int.test.tsx) run with the fast set. The
  // fast/slow suffix pair marks a feature split by speed — everywhere else a file is a distinct
  // feature and carries no suffix.
  'engine/tests/suspend.e2e.test.tsx',
  // per-point SSR switch: .ssr(false) SPA section + .ssr({allowedDiscoveryRenders}) render-count tuning, browser e2e
  'engine/tests/ssr.e2e.test.tsx',
  // RSC browser e2e (dev server + Playwright) + production-build strip/chunk assertions — the
  // same shared assertions run on both bundlers (bun and vite dev/build describes)
  'engine/tests/rsc.e2e.test.tsx',
  'engine/tests/two-clients.e2e.test.ts',
  'engine/tests/publicdir.int.test.ts',
  'engine/tests/assets.int.test.tsx',
  'create-app/tests/index.test.tsx',
] as const
