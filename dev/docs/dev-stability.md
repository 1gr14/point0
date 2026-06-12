# Dev-tree stability under rapid edits (the 2026-06 restart-storm fix)

`point0 dev` (and `--hot`) used to die when files changed _fast_ — exactly the
way an AI agent saves them: bursts of edits 30–150 ms apart, written atomically
(`<file>.tmp.<pid>.<hex>` + rename). A human typing rarely hit it; an agent hit
it within a minute. This note records what actually broke, the invariants that
now hold, and how to re-verify them. The per-mechanism "why" lives in code
comments ([watcher.ts](../../packages/engine/src/watcher.ts),
[server.ts](../../packages/engine/src/server.ts) `startBunDevProcess`/`serve`);
this is the cross-component story you can't reconstruct from any single one. The
teardown half of the story — the dev lockfile, `point0 stop`, orphan cleanup and
why every kill is identity-verified — lives in
[dev-lifecycle](./dev-lifecycle.md).

## Anatomy of the storm (four bugs, one death)

Each bug was survivable alone; together they amplified into a teardown:

1. **Watcher subscription leak.** Every `onEvent` ended with
   `FilesWatcher.restart()`. Concurrent events → concurrent `start()` → both
   unsubscribed the same old subscription, both subscribed anew, one overwrote
   `this.subscription`, the loser **leaked and kept firing forever**. Every
   future event was then processed 2×, 3×, 4×… — the growing
   `[x4] [x5] [x10] Server restarting...` duplicates in session logs were the
   leak counter, not log noise.
2. **Concurrent respawns.** Events were handled with no serialization, so N
   duplicate events → N parallel `respawnEntry` → several children racing to
   bind one port. `childByEntry` kept only the last → the rest became
   _untracked_ live processes (and survived teardown as orphans).
3. **Port murder.** Each booting child ran `killPort(force)` (= `kill -9` to
   whoever holds the port) before `Bun.serve`. With sibling children racing, the
   new child killed the healthy one (exit code 137), losers crashed with
   `Failed to start server. Is port in use?` → the app's `uncaughtException`
   handler exited 1 → the orchestrator saw "a booted child died" →
   **`Tearing down dev`**.
4. **Boot-window respawn spiral.** Atomic-write `*.tmp.*` artifacts matched the
   broad (not-yet-booted) watch set and any not-in-hot-store path forces a
   restart; _and_ a hot edit while the child was still booting respawned it from
   scratch. Boot takes seconds, agent edits land every ~300 ms → the boot never
   finished (`Server recovering a failed boot — restarting...` ×128 in the
   repro) until the agent paused.

## Invariants that now hold

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
  mutex-chained, so the leak is structurally impossible.
- **At most one respawn in flight, one queued.** `scheduleRestart` settles
  `POINT0_DEV_RESTART_SETTLE_MS` (120 ms) so a burst lands as ONE respawn;
  respawns are chained, never parallel.
- **A hot edit never kills a live child.** Alive-but-booting child + hot-node
  change → store rebuild only; the child reads the manifest per request and
  serves the latest code once it's up. Only a _gone_ child (crashed boot)
  respawns. The spiral cannot re-arm.
- **Children die politely.** Respawn sends SIGTERM, waits
  `POINT0_DEV_RESTART_GRACE_MS` (1.5 s) for the app's own shutdown hooks
  (Prisma/pg-boss in start0), then SIGKILLs stragglers.
- **No pre-emptive port murder.** `serve()` binds with retries
  (`POINT0_DEV_BIND_TIMEOUT_MS`, 10 s). Under the orchestrator
  (`POINT0_DEV_CHILD=true`) a conflict is treated as a handover — wait, then
  free a persistent zombie after ~2 s; standalone keeps "a new run takes the
  port over", just reactively. Production binds once and throws.
- **A superseded child can't kill the tree.** The unexpected-exit handler
  ignores any child that is no longer the entry's tracked one, and nothing
  spawns into a tree that began tearing down.

## How to re-verify (stress recipe)

Unit: `bun test packages/engine/tests/watcher.test.ts`. Integration: the
bun-native half of `packages/engine/tests/dev.test.ts` (the `--hot` suite
asserts hot-swap keeps the child pid). Real-world: run an app (start0) with
`bun dev --hot`, then script agent-style bursts — 2–4 edits per burst, 30–150 ms
apart, ~60 % written via tmp+rename — across several hot files, plus a burst on
a **cold** file (one absent from
`node_modules/.cache/server-hot/<scope>-<port>/`). Healthy log:
`hot reloading...` only, `Server started` once, a cold burst coalescing into ~1
restart, zero `Failed to start server` / `Tearing down dev` / `*.tmp.*`
mentions, no `[xN]` duplicate growth; after SIGTERM — zero
`bun run --no-orphans` leftovers, ports free.

Caveat for `dev.test.ts`'s vite half: it saturates the machine (every test gets
a fresh project, a cold compile, vite, and Playwright) and starts timing out en
masse (`Timeout waiting for output: started http://…`) regardless of code under
test — compare against a paired baseline run in the same conditions before
believing a regression.
