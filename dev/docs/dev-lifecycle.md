# Dev-tree lifecycle: one invariant, no bookkeeping

How the `point0 dev` process tree (orchestrator + server child + client
children) is tied together and torn down. The model is deliberately primitive —
**a process dies with its parent, period** — and everything else follows from
it. The code is [dev-shutdown.ts](../../packages/engine/src/dev-shutdown.ts)
(~135 lines, the only lifecycle module) plus the bind loop in
[server.ts](../../packages/engine/src/server.ts) `serve`.

There is no PID bookkeeping — no lockfile, no `point0 stop`, no reap-on-start,
no `ps`-based identity checks before a kill. Those all exist to find and kill a
tree you lost; the invariant makes losing a tree impossible, so the whole
problem they solve is gone. Before reintroducing any of it, re-read "What we
deliberately do NOT do" below.

## The invariant and who enforces it

**No point0 process can outlive whatever launched it.**

- **`--no-orphans`** (bun >= 1.3.14 — the reason for `@point0/engine`'s
  `engines` field) is passed explicitly on the dev child spawns
  (`bun run --no-orphans …` in `server.ts`/`client.ts`); the CLI shebang stays
  flag-free so `point0` launches through Bun's Windows shim. A flagged process
  exits when its _parent_ dies — even by SIGKILL (Linux: `PR_SET_PDEATHSIG`;
  macOS: kqueue `NOTE_EXIT`) — and on its own exit SIGKILLs every descendant,
  with Bun re-verifying parentage before each kill so recycled PIDs are safe.
  The flag is inherited by nested bun processes, so each spawn's own children
  are covered automatically.
- **`[run] noOrphans = true`** in each app's `bunfig.toml` (examples + the
  create-app template) extends the same invariant one level up, to the user's
  `bun run dev` wrapper: terminal dies — even SIGKILLed — wrapper dies → CLI
  dies → children die. Without it the wrapper (a user process, not ours) would
  survive a SIGKILLed shell and keep the tree alive.

Verified empirically (bun 1.3.14, macOS): SIGKILL the orchestrator → both
children gone and ports free in ~2s.

What this means in practice: there are no lost dev servers, so there is nothing
to find, list, or stop from outside — which is why there is **no lockfile and no
`point0 stop`**. A running tree always sits in a terminal (or under a parent an
agent owns); stopping it is Ctrl-C / killing that parent.

## Graceful teardown (the one thing `--no-orphans` can't do)

`--no-orphans` SIGKILLs. For a _polite_ shutdown — the app's own signal handlers
closing the DB pool, draining a job queue —
[dev-shutdown.ts](../../packages/engine/src/dev-shutdown.ts) installs the
orchestrator's SIGINT/SIGTERM/SIGHUP handlers: SIGTERM every registered child,
wait up to `POINT0_DEV_SHUTDOWN_GRACE_MS` (5s) for them to exit on their own,
SIGKILL stragglers, exit. The same path runs when a core child dies unexpectedly
(`requestDevShutdown` — the tree lives and dies as one unit). An `exit` backstop
SIGKILLs anything still registered; `--no-orphans` remains the kernel-level
backstop for paths that skip handlers entirely. Ctrl-C stays graceful end-to-end
because `bun run` waits for its child after forwarding SIGINT (verified against
bun 1.3.14).

## Ports: never killed, only named

point0 **never kills a port holder**. Since trees cannot leak, a busy port
always means a _live_ process someone owns — another dev instance in a second
terminal, some unrelated server. Killing it is exactly how a dev tool murders an
innocent process.

- Under the orchestrator (`POINT0_DEV_CHILD=true`) the server child binds with
  patient retries up to `POINT0_DEV_BIND_TIMEOUT_MS` (10s) — respawns are
  serialized, so a transient conflict is just the predecessor draining its
  shutdown hooks during a restart handover.
- Any other dev run binds once.
- Either way, a real conflict fails with an error that names the holder —
  `Port 3000 is already in use by pid 123 (bun src/index.server.ts). Stop that process or change the port.`
  (`describePortHolders` in [port.ts](../../packages/engine/src/port.ts),
  read-only `lsof`/`ps`) — and the developer decides. Production binds once and
  throws, as always.

## What we deliberately do NOT do

- **No lockfile / PID registry.** A lockfile is a claim that goes stale the
  moment an orchestrator is SIGKILLed; acting on stale claims means signaling
  recycled PIDs and sweeping ports now owned by innocent processes. The
  invariant removes the problem a registry exists to solve, so there is no
  registry to keep honest.
- **No `point0 stop`.** Nothing can be running that you don't already own a
  terminal/parent for.
- **No port takeover.** See above; the clear error is the feature.
- **Windows caveat:** `--no-orphans` is a no-op there, so a SIGKILLed tree can
  leave children behind; the port-conflict error then names them for a manual
  kill. Acceptable for now — the alternative was platform-specific kill
  machinery for everyone.

## How to re-verify

1. `SERVER_PORT=4581 CLIENT_PORT=4582 bun run dev` in an example, then
   `kill -9 <point0 dev pid>` → children gone and ports free in ~2s, zero
   `no-orphans` leftovers in `ps`; an immediate dev restart binds cleanly.
2. Ctrl-C (or SIGTERM the orchestrator) → children get SIGTERM first (app
   shutdown hooks run), everything exits, ports free.
3. Bind a foreign server on the app's port, start dev → dev fails with the
   holder named in the error; the foreign server is untouched.
