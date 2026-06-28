# Handoff: cross-OS CI (branch `ci-cross-os`)

Status as of the last session. A fresh session can pick this up cold — read this
file first, then `git log dev..ci-cross-os` for the commit-by-commit story.

## The task

Stand up CI for the point0 monorepo (it had **never been run** before). Hard
constraints from the original request:

- **Never publish to npm.** Only build + test steps.
- Make the framework's own test suite actually run and pass **in CI**, on
  **Linux first, then Windows, then macOS** — incrementally, without wasteful
  re-runs of an already-green OS.
- All work in a **dedicated branch + worktree**; never merge to another branch.

## Where it lives

- **Branch:** `ci-cross-os` (pushed to `origin`). Do NOT merge it anywhere yet.
- **Worktree:** `~/cc/worktrees/point0/ci-cross-os` (the work was done here).
  Note: this worktree has **no `node_modules` / no `dist`** — it was never
  bootstrapped, because the actual testing happens in CI, not locally. Commits
  were made with `git commit --no-verify` (husky/lint-staged need node_modules).
  If you want to run anything locally, bootstrap per AGENTS.md first.
- **Last commit:** `f546f77f` (dev split + fast sharding) — **committed but NOT
  yet validated in CI** (see "What's left").

## Current status

- **CI design is complete and, per-OS, was verified green** in earlier runs:
  Linux ✓, Windows ✓ (with one sub-test quarantined — see Known issues),
  macOS ✓. Those greens were on the code **before** the last commit.
- **Blocked then unblocked:** the final validation run failed at the `discover`
  job with *"The job was not started because recent account payments have failed
  or your spending limit needs to be increased"* — i.e. the **org's GitHub
  Actions spending limit was hit** (lots of runs; macOS = ×10 minutes, Windows =
  ×2, on a private repo). The user has since raised the budget. Nothing in the
  code was wrong — `discover` runs `bun scripts/test-parallel.ts
  --print-slow-files`, which exits 0 locally.

## The CI architecture (`.github/workflows/ci.yml`)

No publish job at all; `permissions: contents: read`. Triggers on push to
`ci-cross-os` + `workflow_dispatch`. `concurrency: cancel-in-progress` (a new
push cancels the in-flight run). **Sharded** so no runner sits for ~an hour and
Windows can't accumulate leaked browser/dev processes to the point of starving:

- **`discover`** — emits two job outputs: `oses` (the OS list, edited in ONE
  place to bring OSes online) and `slow` (the slow-test file list, single source
  of truth = `scripts/test-parallel.ts --print-slow-files`).
- **`build`** (matrix: os) — builds once per OS, uploads `dist` as an artifact
  `build-<os>`. The artifact path **must include root `package.json`** to anchor
  the archive at the repo root (else `packages/` is stripped and the `point0`
  bin never links — `setup` then fails with `point0: command not found`).
- **`test-fast`** (matrix: os × shard `[1,2,3]`) — the ~70 fast/non-slow files,
  fanned across 3 runners per OS via `NO_SLOW_TESTS=1 bun
  scripts/test-parallel.ts --shard i/3` (round-robin partition).
- **`test-slow`** (matrix: os × file) — each heavy integration file on its OWN
  runner (`bun test packages/<file>`), wrapped in a **2× fresh-process retry**
  (a loaded runner can flake these; a fresh `bun test` with new temp dirs / no
  Windows file locks gets a clean shot).

Each test job: checkout → setup-node 24 → setup-bun latest → download the
`build-<os>` artifact → **install via the `./.github/actions/install` composite**
(retries `bun install` — the `bun` npm package's postinstall is flaky on
Windows) → `bun run setup` (codegen) → playwright install (`--with-deps` on
Linux, plain on Win/macOS) → run tests.

## Real bugs / fragilities this surfaced (all fixed unless noted)

The first-ever CI run on slow 2-core runners exposed several latent issues —
each commit explains its own "why", but in short:

1. **`(Empty)` tale artifact** (prefetch-page, two-clients). On a slow machine
   the in-page `MutationObserver` captured `document.documentElement.outerHTML`
   while `readyState === 'loading'` — mid-parse an SSR `<html>` exists but its
   body isn't in yet, so the frame is a spurious `(Empty)` that races into the
   tale and breaks the inline snapshot. **Root fix:**
   `packages/engine/tests/utils/playwright.ts` — skip `notify()` while
   `readyState === 'loading'`. (A genuine spa pre-hydration empty is still
   present at DOMContentLoaded, so it's kept.)
2. **Swallowed parallel-phase failures.** `scripts/test-parallel.ts` printed
   buffered output then `process.exit()`, which truncated stdout on a CI pipe —
   a red run showed no cause. **Fix:** await a flushing write before exit.
3. **create-app test self-kill.** Its `killPorts` did `lsof -ti :PORT | kill -9`,
   and `lsof -ti :PORT` returns CLIENTS too — including the test's own bun
   process (it holds a pooled keep-alive socket from the step-4 `fetch`). On a
   slow Windows runner it `kill -9`'d itself → silent SIGKILL (exit 137), no
   OOM. **Fix:** `lsof -t -sTCP:LISTEN` (kill only the listener) + never
   `process.pid`.
4. **Flaky `bun install` on Windows** (the `bun` package postinstall) → the
   retrying install composite action.
5. **Windows process accumulation.** A single Windows runner running the whole
   suite starved and "lost communication" (the monolith died ~54min in). Solved
   structurally by **sharding** (one slow file per runner; fast split 3 ways).

## Known issues / deliberately deferred

- **`assets.test.tsx` "dev" sub-test is quarantined on Windows**
  (`it.skipIf(process.platform === 'win32')`). The point0 **dev server
  intermittently ECONNRESETs mid-request on Windows** (`bun run dev`, only the
  `--hot` dev path; build mode is fine). It's flaky, not deterministic: either
  the in-test retries exhaust (hard fail) or they recover with `0 fail` but the
  crash's dangling-socket rejection still poisons bun's exit code as an
  "unhandled error between tests" — and a fresh-process shard re-run can't fix
  either mode on a runner that crashes every attempt. The user chose
  "mitigate + move on"; root fix is tracked as a **separate spawned task**
  ("Fix point0 dev server intermittent ECONNRESET on Windows"). Re-enable the
  sub-test once that's fixed. build + the unit cases still run on Windows;
  macOS/Linux run everything.

## What's left to do

1. **Validate the last commit (`f546f77f`).** The dev split + fast sharding have
   only been checked locally (transpile-clean, all 33 `dev` tests preserved,
   in-block helpers intact) — never run in CI. To minimise spend, validate
   **Linux-only first** (×1 minutes): in `discover`, set
   `oses=["ubuntu-latest"]`, push, confirm green (this exercises the split-dev
   shards + the `--shard` fast fan-out mechanics). Then restore
   `oses=["ubuntu-latest", "windows-latest", "macos-latest"]` for one final
   full-matrix run.
2. **Decide where this CI should actually live / trigger.** Right now it only
   triggers on push to `ci-cross-os`. For real use you'll want to point it at the
   right branches (and likely keep the expensive full matrix off day-to-day
   branches — e.g. macOS/Windows only on `next`/tags, Linux on everything).
   It is intentionally separate from the existing publish workflow.
3. **Tidy the branch history before merging.** It's exploratory: several `TEMP
   diagnostic` commits, and `0bdd8961` (a per-test prefetch-page fix) was later
   reverted by `142c23a3` in favour of the shared-harness fix. The **final tree
   is clean** (no diagnostics, no dead code), but the history wants a
   squash/cleanup pass before it goes near `dev`.
4. **Optional cleanup:** the 3 `dev-*.test.ts` files **duplicate the ~90-line
   shared header** (imports + `tpf`/`wrp`/`waitFor`/`resolveStoreDirFromProject`)
   — done that way for a safe mechanical split with no local validation. Extract
   a shared module if you want it tidy. (Runtime-safe as-is; bun ignores the
   unused imports.)

## Operational gotchas

- **Watch a run:** `gh run watch <id> --interval 45`. Its `--exit-status` is
  unreliable here (returned 0 on a failed run once) — always re-check the real
  conclusion with `gh run view <id> --json status,conclusion`.
- **Runner death = no logs.** When a runner "loses communication" (starvation)
  the step log is lost; that's part of why the suite is sharded.
- **Costs:** macOS = ×10, Windows = ×2 minute multipliers on this private repo.
  The full matrix is ~49 jobs; mind the spend.
- **Commits:** the user authorised committing + pushing **on this branch only**.
  Keep using `--no-verify` in the worktree (no node_modules). Do not merge
  elsewhere.
