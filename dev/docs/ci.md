# CI & release

point0 follows the classic OSS shape: one `main` trunk, contributors fork → PR →
`main`, and **a `v*` git tag is the only thing that publishes**. Pushing code
never releases. Three workflow files, one decision script.

## Workflows (`.github/workflows/`)

- **`ci.yml`** — the test GATE. Runs on `pull_request → main` and on opt-in
  branch pushes (`push` to any branch except `main`). A cheap `decide` job runs
  [`scripts/ci-decide.ts`](../../scripts/ci-decide.ts), then calls `test.yml`.
  Never publishes. `main` is **not** gated on push — the PR is the gate, and a
  push-to-main gate would just re-test (and would defeat `--skip-tests` on a
  release commit).
- **`test.yml`** — the reusable cross-OS matrix (`workflow_call`, inputs
  `oses` + `slow`). Shared by the gate and the release. See [the matrix](#the-test-matrix).
- **`release.yml`** — PUBLISH. Runs on `push` of a `v*` tag (and
  `workflow_dispatch` for an idempotent retry). Guards the tag, runs the tests,
  then publishes. Reachable only via a tag — a fork can't push one, so untrusted
  code can never publish.

## `decide` — the one place policy lives

[`scripts/ci-decide.ts`](../../scripts/ci-decide.ts) maps the event + the commit
message to `{ oses, slow, publish }`. It's unit-tested
([`ci-decide.test.ts`](../../scripts/ci-decide.test.ts)) so the invariants can't
silently regress. The full table:

| event                        | tests                            | publish        |
| ---------------------------- | -------------------------------- | -------------- |
| `pull_request → main`        | full matrix                      | no             |
| `push` tag `v*` (stable)     | full matrix, **mandatory**       | yes → `latest` |
| `push` tag `v*` (prerelease) | full unless `--skip-tests[=os]`  | yes → `next`   |
| `push` to a branch           | only if `--run-tests[=os]`       | no             |
| any with `--skip-ci`         | none (ignored on a stable tag)   | no             |

**Commit-message flags** (dash style): `--skip-tests[=os]`, `--run-tests[=os]`,
`--skip-ci`. OS = `linux`/`windows` (`macos` accepted, off by default).
`--run-tests=linux,windows` runs both; bare flags mean all OSes.

## Invariants (the things that must always hold)

1. **A stable tag can never skip tests.** Flags are ignored on a stable
   (`vX.Y.Z`) tag — it always runs the full matrix before publishing.
2. **Publishing is only reachable via a tag.** No PR, fork, or branch push can
   publish; the `publish` job's guard (`!cancelled() && decide succeeded &&
   tests green-or-skipped`) means a *failed* gate never publishes, while a
   *deliberately skipped* prerelease gate still does.
3. **The major version is pinned.** [`scripts/release.ts`](../../scripts/release.ts)
   refuses any bump whose major ≠ `PINNED_MAJOR` — no command or flag can raise
   it. A major is cut only by a human hardcoding that constant. Never automatic,
   never accidental.

## The test matrix

`test.yml` is sharded so no runner sits for ~an hour and Windows can't accumulate
leaked browser/dev processes until it starves:

- **`build`** — one runner per OS, builds once, uploads `dist` (the artifact must
  include root `package.json` to anchor `packages/*/dist` at the repo root).
- **`test-fast`** — the ~70 fast files fanned across 3 runners per OS
  (`NO_SLOW_TESTS=1 … --shard i/3`).
- **`test-slow`** — each heavy integration file on its own runner, retried once on
  a fresh process.

The OS list is `FULL_OSES` in `ci-decide.ts`: **Linux + Windows**. macOS is out
(×10 runner minutes on a private repo, POSIX-identical to Linux); run it ad-hoc
with `--run-tests=macos`. The slow-file list is `scripts/slow-tests.ts` (shared
with the local runner `scripts/test-parallel.ts`).

## Releasing

You release by tagging. `bun run release <bump>` bumps every package in lockstep,
commits + tags `v<version>`, and pushes nothing; you review and
`git push origin main --follow-tags`. The tag triggers `release.yml`. Full flow,
the channel/dist-tag rules, and the tag↔version guard: [releasing.md](releasing.md).

## What's important to know

- **Forks are safe.** PR CI uses `pull_request` (not `pull_request_target`), so
  fork code runs without repository secrets. `NPM_TOKEN` is reachable only from
  the tag-triggered publish job.
- **Going public** (launch-day, one-time): npm Trusted Publisher per `@point0/*`
  package; `publishConfig.access` → `public` (turns on `--provenance`
  automatically); drop the `NPM_TOKEN` secret (→ OIDC); make the repo public;
  protect `main` (no force-push/delete, require PR + green CI, linear) + tag
  protection for `v*`. Until the Trusted Publisher exists the publish job uses
  `NPM_TOKEN` when present, OIDC when not.
- **One Windows exception.** `assets.test.tsx`'s "dev" sub-test is quarantined on
  Windows (`it.skipIf(process.platform === 'win32')`) — the dev server
  intermittently ECONNRESETs mid-request on the `--hot` path there. Build mode
  and the unit cases still run; macOS/Linux run everything. Re-enable once the
  dev-server crash is fixed.
- **Cost.** Minute multipliers on a private repo: Linux ×1, Windows ×2, macOS
  ×10. A full Linux+Windows run is ~27 jobs.
