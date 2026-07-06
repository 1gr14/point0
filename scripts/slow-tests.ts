/**
 * The slow integration test files — single source of truth, shared by the test runner (scripts/test-parallel.ts) and
 * the CI matrix builder (scripts/ci-decide.ts).
 *
 * "Slow" = heavy integration files that boot a full dev/build tree. They run strictly one file per process (never a
 * combined `bun test`) so module-level state and ports can't bleed across them, and in CI each one gets its own runner
 * (one shard per file). Paths are relative to `packages/`.
 */
export const SLOW_TESTS = [
  'engine/tests/build.test.ts',
  'engine/tests/module-preload-serve.test.ts',
  'engine/tests/cli.test.tsx',
  'engine/tests/mcp.test.ts',
  // dev.test.ts was split into three files (each its own slow shard) to shorten the critical path.
  'engine/tests/dev-bundler.test.ts',
  'engine/tests/dev-hot-reload.test.ts',
  'engine/tests/dev-source-maps.test.ts',
  'engine/tests/prefetch-page.test.ts',
  'engine/tests/scroll-restoration.test.ts',
  // deploy invalidation: builds the project twice (the "redeploy") + Playwright tabs that outlive it
  'engine/tests/client-build-stale.test.ts',
  // only the e2e half of the suspend coverage (dev server + Playwright + vite smoke) is slow;
  // the in-process half (suspend.fast.test.tsx) runs with the fast set. The fast/slow suffix
  // pair is a deliberate one-off: one feature split by speed — everywhere else a file is a
  // distinct feature and carries no suffix.
  'engine/tests/suspend.slow.test.tsx',
  'engine/tests/two-clients.test.ts',
  'engine/tests/publicdir.test.ts',
  'engine/tests/assets.test.tsx',
  'create-app/tests/index.test.tsx',
] as const
