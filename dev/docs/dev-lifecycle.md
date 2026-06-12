# Dev-tree lifecycle: lockfile, `point0 stop`, orphans (the 2026-06 hygiene pass)

How the `point0 dev` process tree is tied together, found again after a crash,
and torn down — without ever killing a process that is not provably ours. The
mechanisms live in [devlock.ts](../../packages/engine/src/devlock.ts) (lockfile

- verification + shutdown coordinator),
  [proc.ts](../../packages/engine/src/proc.ts) (`ps`-based process identity) and
  [port.ts](../../packages/engine/src/port.ts) (verified port takeover); this
  note is the cross-component story and the design decisions you cannot
  reconstruct from one file.

## The tree, and why orphans are rare by construction

`point0 dev` is an orchestrator that spawns a server child
(`bun run --no-orphans --watch <entry>`) and bun-native client children
(`bun run --no-orphans <cache>/serve.js`); vite clients run in-process. Teardown
has three layers:

1. **Graceful coordinator** (`installDevShutdown`): SIGINT/SIGTERM/SIGHUP →
   catchable SIGTERM to every child, `POINT0_DEV_SHUTDOWN_GRACE_MS` (5s) for
   their own shutdown hooks, SIGKILL stragglers, exit. The `exit` backstop
   SIGKILLs leftovers and removes the lockfile.
2. **Bun's `--no-orphans`** (>= 1.3.14, the reason for the `engines` field;
   no-op on Windows): every process started with it exits when its _parent_ dies
   — even by SIGKILL — and on exit SIGKILLs its own descendants (Bun re-verifies
   parentage before each kill, so recycled PIDs are safe). The flag sits in the
   CLI shebang (`cli.ts`) and is inherited by every nested bun process, so the
   whole tree — dev children, `build --watch`'s spawned builds — dies with the
   CLI. The children also pass it explicitly for invocations that bypass the
   shebang (direct `bun .../cli.js`). Verified empirically: SIGKILL the
   orchestrator → both children gone and ports free in under ~2s. Ctrl-C stays
   graceful because `bun run` waits for its child after forwarding SIGINT — the
   orchestrator finishes its grace teardown before the wrapper exits (verified
   against bun 1.3.14).
3. **The lockfile + verified sweeps** — for whatever the first two missed
   (Windows, a pre-flag bun, exotic detaches). This is the rest of this note.

What `--no-orphans` deliberately does NOT cover: the `bun run dev` _wrapper_ is
the user's process, not ours — if the terminal/shell is SIGKILLed, the wrapper
survives reparented and keeps the tree alive. That is the wrapper's policy, not
the CLI's; an app that wants the full chain tied to the terminal can opt in via
its own bunfig: `[run] noOrphans = true` (it inherits down). We don't set it in
templates — it changes the behavior of every bun process in the app dir, which
is the app author's call.

## The lockfile is a claim, not proof

The orchestrator writes
`node_modules/.cache/@point0/dev/<hash(cwd)>-<hash(ports)>.json` before spawning
anything: `{ pid, ppid, cwd, ports, startedAt, pidStartedAt, cli }`. Keyed by
cwd + ports, so two instances of one folder on different ports never reap each
other; `point0 stop` enumerates a folder's locks by the `<hash(cwd)>-` prefix.

Which `node_modules`? The nearest one above the project — but that anchor is
**not stable across a session**: vite's dep optimizer creates an app-local
`node_modules` (for its `.vite` cache) during the first boot, so in a fresh
monorepo checkout the orchestrator writes the lock at the workspace root and a
later `point0 stop` would resolve the new app-local dir and miss it (observed
live with `examples/vite`). So reads (`point0 stop`, reap) check **every**
`node_modules` level above the project, writes go to the nearest, and the
orchestrator's exit handler removes the exact path it wrote rather than
recomputing it.

A SIGKILLed orchestrator never runs its exit handler, so **a lockfile can
outlive its tree** — and the OS recycles PIDs and ports. Treating the recorded
pid/ports as facts is how a dev tool SIGKILLs an innocent process a week later.
So every kill path verifies first, using two identity fields written into the
lock:

- `pidStartedAt` — the orchestrator _process_ birth time
  (`Date.now() - process.uptime()`), checked against `ps -o etime=` within 10s
  tolerance. A live process on the recorded PID that started at a different
  moment is a reused PID → never signaled.
- `cli` — `process.argv[1]` (the `point0` bin / `cli.js` absolute path), checked
  as a substring of `ps -o command=` (bare `point0` is the lenient fallback for
  locks from older versions). An absolute path, so it also distinguishes
  checkouts.

Port holders are verified by `devProcessCommandMarkers`: a holder is killed only
when its command line carries the project cwd (server children run the app's
entry by absolute path), the checkout's `node_modules/.cache/@point0` (client
serve scripts), or the recorded cli path. Real dev children always match because
every spawn uses absolute paths. An unrelated process squatting a recorded port
matches nothing and is left alone. Orphans that ARE ours get a catchable
SIGTERM + the same grace window first — they are app code with shutdown hooks,
not garbage.

On win32 there is no `ps`: verification is unavailable and the legacy unverified
behavior is kept on purpose — there `--no-orphans` is a no-op too, so the port
sweep is the only orphan cleanup that exists at all.

## Honest reporting

`stopTree` returns what actually happened, and `point0 stop` says it plainly:

- a live verified orchestrator was SIGTERMed (its own graceful teardown ran) →
  `dev stopped (pid N)`;
- no orchestrator, but verified orphans were killed off the recorded ports →
  `cleaned up N orphaned dev processes`;
- the lock referenced nothing of ours →
  `no running dev server found. Removed N stale dev lockfiles.` — the file is
  deleted and _nothing_ is killed.

The old code reported `stopped` whenever the lock listed ports (always), so
`point0 stop` claimed "dev stopped, freed ports" against a dead tree — and
worse, blind-SIGTERM/SIGKILLed the recorded PID. Both are gone.

`point0 dev`'s reap-on-start runs the same verified `stopTree` for its exact
cwd + ports (debug-logs which of the three cases it hit), so a true restart
takes over its predecessor's leftovers and nothing else's.

## Port takeover during bind is verified too

`serve()`'s dev bind loop (see the comment at
[server.ts](../../packages/engine/src/server.ts) `serve`) waits out transient
handovers and only frees a persistent holder — now only a _verified_ one (cwd /
cache markers, plus the generic `point0` marker for a predecessor orchestrator).
The same applies to the client children's startup takeover and the vite client's
pre-bind sweep. If the holder is genuinely foreign, dev fails with the real
`EADDRINUSE` after `POINT0_DEV_BIND_TIMEOUT_MS` (10s) instead of silently
murdering it — the error names the port; the developer decides.

## Knobs

- `POINT0_DEV_SHUTDOWN_GRACE_MS` (5s) — children's grace window, used by the
  coordinator, by orphan sweeps, and folded into `point0 stop`'s wait-for-exit
  timeout (`max(8s, grace + 3s)`).
- `POINT0_DEV_BIND_TIMEOUT_MS` (10s) / `POINT0_DEV_RESTART_*` — see
  [dev-stability](./dev-stability.md).

## How to re-verify

Unit: `bun test packages/engine/tests/devlock.test.ts` (identity parsing, every
spare/kill decision against real spawned processes; fast). End-to-end recipe in
an example app (custom ports to stay isolated):

1. `SERVER_PORT=4581 CLIENT_PORT=4582 bun run dev`, then `point0 stop` →
   `dev stopped (pid N)`, ports free, lockfile gone, zero `no-orphans` leftovers
   in `ps`.
2. Same, then `kill -9 <orchestrator pid from the lockfile>` → children gone and
   ports free in ~2s on their own; the lockfile remains; `point0 stop` →
   `no running dev server found. Removed 1 stale dev lockfile.`
3. Bind a foreign server on 4581, write/leave a stale lock, start dev → the
   holder is _left alive_, dev surfaces `EADDRINUSE`. Replace the holder with a
   script whose absolute path sits under the app dir (a fake leaked child) →
   reap logs `Cleaned up orphaned dev processes (pids …)`, the orphan gets
   SIGTERM (not -9), dev boots.
