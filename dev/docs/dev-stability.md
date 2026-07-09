# Dev-tree stability under rapid edits

`point0 dev` (and `--hot`) must survive files changing _fast_ — exactly the way
an AI agent saves them: bursts of edits 30–150 ms apart, written atomically
(`<file>.tmp.<pid>.<hex>` + rename). A human typing rarely stresses this; an
agent does within a minute. This note records the invariants that keep the dev
tree alive under that load and how to re-verify them. The per-mechanism "why"
lives in code comments ([watcher.ts](../../packages/engine/src/watcher.ts),
[server.ts](../../packages/engine/src/server.ts) `startBunDevProcess`/`serve`);
this is the cross-component story you can't reconstruct from any single one. The
teardown half — why a tree dies with its parent (`--no-orphans`) and why point0
never kills a port holder — lives in [dev-lifecycle](./dev-lifecycle.md).

## Invariants that hold

- **One watcher pipeline, strictly serial.** `FilesWatcher` queues raw events
  (deduped by path — the latest event wins; real state is re-checked at
  processing time) and drains them one at a time, across batches. `onEvent`
  never runs concurrently with itself.
- **Junk never enters.** Atomic-write/editor artifacts (`*.tmp.<pid>.<hex>`,
  `*.tmp`, vim/JetBrains/VS Code swap files, `~`, `.DS_Store`…) are dropped at
  the watcher source (`isJunkPath`), so every consumer (dev restarts, generator,
  `build --watch`) is immune.
- **Restart-without-resubscribe.** `restart()` only re-subscribes when the
  OS-level identity (watch dir + native excludes) changed; a patterns-only swap
  — the per-event case — touches no subscription. Lifecycle transitions are
  mutex-chained, so two concurrent starts can't both replace `this.subscription`
  and leak the loser (which would keep firing, processing every event N×).
- **At most one respawn in flight, one queued.** `scheduleRestart` settles
  `POINT0_DEV_RESTART_SETTLE_MS` (120 ms) so a burst lands as ONE respawn;
  respawns are chained, never parallel.
- **A hot edit never kills a live child.** Alive-but-booting child + hot-node
  change → store rebuild only; the child reads the manifest per request and
  serves the latest code once it's up. Only a _gone_ child (crashed boot)
  respawns. Killing a booting child mid-boot would only restart the boot, and
  under a steady stream of agent edits that loop never converges.
- **Children die politely.** Respawn sends SIGTERM, waits
  `POINT0_DEV_RESTART_GRACE_MS` (1.5 s) for the app's own shutdown hooks
  (Prisma/pg-boss in start0), then SIGKILLs stragglers.
- **No port murder, ever.** Under the orchestrator (`POINT0_DEV_CHILD=true`)
  `serve()` binds with retries (`POINT0_DEV_BIND_TIMEOUT_MS`, 10 s) — a conflict
  is a restart handover, waited out. A conflict that persists (or any conflict
  outside the orchestrator) fails with an error naming the holder; nothing is
  killed. Production binds once and throws. See
  [dev-lifecycle](./dev-lifecycle.md).
- **A superseded child can't kill the tree.** The unexpected-exit handler
  ignores any child that is no longer the entry's tracked one — a late exit from
  a replaced child (e.g. it lost a port race) must not tear down a healthy tree
  whose replacement is already running — and nothing spawns into a tree that
  began tearing down.

## How to re-verify (stress recipe)

Unit: `bun test packages/engine/tests/watcher.unit.test.ts`. Integration: the
bun-native half of `packages/engine/tests/dev-hot-reload.e2e.test.ts` (its
`server hot reload (bun-native, --hot)` suite asserts hot-swap keeps the child
pid). Real-world: run an app (start0) with `bun dev --hot`, then script
agent-style bursts — 2–4 edits per burst, 30–150 ms apart, ~60 % written via
tmp+rename — across several hot files, plus a burst on a **cold** file (one
absent from `node_modules/.cache/server-hot/<scope>-<port>/`). Healthy log:
`hot reloading...` only, `Server started` once, a cold burst coalescing into ~1
restart, zero `Failed to restart entry` / `Tearing down dev` / `*.tmp.*`
mentions, no `[xN]` duplicate growth; after SIGTERM — zero
`bun run --no-orphans` leftovers, ports free.

Caveat for the vite half of `dev-bundler.e2e.test.ts` (the one `dev-*.test.ts`
suite that runs both bundlers, via `describe.each(bundlers)` — `dev-source-maps`
and `dev-hot-reload` are bun-native only): it saturates the machine (every test
gets a fresh project, a cold compile, vite, and Playwright) and starts timing
out en masse (`Timeout waiting for output: started http://…`) regardless of code
under test — compare against a paired baseline run in the same conditions before
believing a regression.
