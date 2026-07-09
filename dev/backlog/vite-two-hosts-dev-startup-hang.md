# Vite dev with two clients on different hosts hangs at startup (SSR entry never loads)

**Status:** open · **Area:** vite dev / engine.dev / dep-optimizer · **Blocks:**
the `two-clients > vite > serve two ssr clients on different hosts in dev` test
(`packages/engine/tests/two-clients.e2e.test.ts`).

## Symptom

`point0 dev` (vite bundler) with **two clients on different hosts** never
reports `Server started …` — the test's `waitStarted()` times out after 30s on
every retry attempt. The process output stops at:

```
[client] Client started http://localhost:3513 in 582ms
[client] Client started http://localhost:3514 in 586ms
[server] Server starting...
[vite] (client) [optimizer] bundling dependencies...
```

…and then silence: the SSR entry load (`engine.dev` → `loadViteDevEntries` →
`ssrEnv.runner.import(entry)`) never completes and never throws. Both vite
client dev servers start fine; it's the SSR environment that hangs while the
client optimizer is "bundling dependencies".

Scope of the breakage — it is specific to the **two-hosts vite topology**:

- bun bundler, same test: **passes**;
- vite bundler, two clients on the **same host with basePaths**
  (`serve two ssr clients on same host but different basePaths`): **passes**;
- vite bundler, two **hosts**: hangs, deterministically (all 4 retry attempts,
  reproduces in isolation too).

## What was verified (2026-06-11)

- **Pre-existing, not from the dev-stability changes**: the test fails
  identically with and without the watcher/respawn fixes (paired stash/build
  runs, same machine, same conditions).
- Not load flakiness: reproduces in isolation on a calm machine
  (`bun test tests/two-clients.e2e.test.ts -t "serve two ssr clients on different hosts in dev"`
  — bun variant passes, vite variant fails every attempt).
- `POINT0_LOG_LEVEL=debug` adds nothing after the optimizer line — the hang
  gives no error anywhere.

## Hypothesis

Vite dep-optimizer deadlock/never-completion when two vite client dev servers
plus the SSR environment live in one process: the SSR runner import waits on a
module the (client) optimizer is rebundling, while the optimizer's completion is
somehow tied to a request that never comes (we drive vite programmatically; in
the two-hosts shape nothing ever hits the second client's middleware during
boot). The basePaths variant shares one host/server, so its optimizer round
completes.

## Proposal

1. Instrument `loadViteDevEntries` / `createViteDevServer` (engine) with debug
   logs around `runner.import` and the optimizer lifecycle to pin WHERE it
   parks.
2. Try `optimizeDeps.noDiscovery: true` + explicit `optimizeDeps.include` for
   the dev topology, or `server.warmup`/`optimizeDeps.holdUntilCrawlEnd: false`,
   in the engine-generated vite config for client dev servers — the optimizer
   should not be able to park the SSR boot.
3. Check whether the two client vite servers share a `cacheDir`
   (`node_modules/.vite`) — two optimizers racing one dir could explain the
   never-finishing bundling; give each scope its own cacheDir if so.
4. While there: add `/* @vite-ignore */` to the dynamic `import(mod.url)` in
   `EngineServer.readPoints` / `EngineClient` hot-store path (dist/server.js,
   dist/client.js) to silence the cosmetic vite import-analysis warning that
   spams every vite dev boot.

Verify with the test above only (don't run the whole suite).
