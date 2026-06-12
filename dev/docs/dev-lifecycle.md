# Dev-tree lifecycle: one invariant, no bookkeeping (the 2026-06 simplification)

How the `point0 dev` process tree (orchestrator + server child + client
children) is tied together and torn down. The model is deliberately primitive —
**a process dies with its parent, period** — and everything else follows from
it. The code is [dev-shutdown.ts](../../packages/engine/src/dev-shutdown.ts)
(~100 lines, the only lifecycle module) plus the bind loop in
[server.ts](../../packages/engine/src/server.ts) `serve`.

This replaced a much heavier design (dev lockfiles keyed by cwd+ports, a
`point0 stop` command, reap-on-start, `ps`-based PID/port identity verification
before every kill). All of it existed to answer one question — "how do we find
and kill a tree we lost?" — and the honest fix was to make losing a tree
impossible instead. If you are tempted to reintroduce any of it, first re-read
"What we deliberately do NOT do" below.

## The invariant and who enforces it

**No point0 process can outlive whatever launched it.**

- **`--no-orphans`** (bun >= 1.3.14 — the reason for `@point0/engine`'s
  `engines` field) sits in the CLI shebang (`cli.ts`). A flagged process exits
  when its _parent_ dies — even by SIGKILL (Linux: `PR_SET_PDEATHSIG`; macOS:
  kqueue `NOTE_EXIT`) — and on its own exit SIGKILLs every descendant, with Bun
  re-verifying parentage before each kill so recycled PIDs are safe. The flag is
  inherited by nested bun processes, so the dev children and `build --watch`'s
  spawned builds are covered automatically (the dev spawns also pass it
  explicitly for direct `bun .../cli.js` runs that bypass the shebang).
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
terminal, some unrelated server. Killing it (the old takeover/`killPort`
behavior) is exactly how a dev tool murders an innocent process.

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
  recycled PIDs and sweeping ports now owned by innocent processes. We tried the
  verified version (ps-based identity checks) — it worked, but it was a pile of
  subtle code solving a problem the invariant removes outright. That full
  implementation (lockfile keyed by cwd+ports, `point0 stop`, reap-on-start,
  `ps`-verified kills, honest stale-lock reporting) is preserved on the
  **`devlock-hygiene` branch** — if a real need ever brings it back (e.g. heavy
  native-Windows demand), start from there, not from scratch; its Windows path
  is unverified-legacy and would still need PowerShell-based identity checks.
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
