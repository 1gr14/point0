# CI & release

point0 follows the classic OSS shape: one `main` trunk, contributors fork → PR →
`main`, and **a `v*` git tag is the only thing that publishes**. Pushing code
never releases. Five workflow files, one decision script.

## Workflows (`.github/workflows/`)

- **`ci.yml`** — the test GATE. Runs on `pull_request → main` and on opt-in
  branch pushes (`push` to any branch except `main`). A cheap `decide` job runs
  [`scripts/ci-decide.ts`](../../scripts/ci-decide.ts), then calls `check.yml`
  and `test.yml`. Never publishes. `main` is **not** gated on push — the PR is
  the gate, and a push-to-main gate would just re-test (and would defeat
  `--skip-tests` on a release commit).
- **`check.yml`** — the reusable format + lint gate (`workflow_call`): builds,
  runs codegen (ESLint is type-aware, so it needs the real dist + generated
  code), then `bun run format:check` (prettier) and `bun run lint:check`
  (eslint, no fix). Called by both the gate and the release with no `needs` and
  no `if`, so it runs on **every** path — including a docs-only PR (where the
  build/test matrix is skipped) and a `--skip-tests` prerelease. The pre-commit
  hook is advisory (`--no-verify` exists); this is the hard gate.
- **`build.yml`** — builds the framework once (ubuntu-only) and uploads the
  single `dist` artifact. Called by both the gate and the release, so the tested
  bytes are the published bytes and the code is never built twice.
- **`test.yml`** — the reusable cross-OS matrix (`workflow_call`, inputs
  `oses` + `slow`). Downloads the `dist` artifact rather than building. Shared
  by the gate and the release. See [the matrix](#the-test-matrix).
- **`release.yml`** — PUBLISH. Runs on `push` of a `v*` tag (and
  `workflow_dispatch` for an idempotent retry). Guards the tag, runs the tests,
  then publishes. Reachable only via a tag — a fork can't push one, so untrusted
  code can never publish.

## `decide` — the one place policy lives

[`scripts/ci-decide.ts`](../../scripts/ci-decide.ts) maps the event + the commit
message to `{ oses, slow, publish }`. It's unit-tested
([`ci-decide.unit.test.ts`](../../scripts/ci-decide.unit.test.ts)) so the
invariants can't silently regress. The full table:

| event                        | tests                           | publish        |
| ---------------------------- | ------------------------------- | -------------- |
| `pull_request → main`        | full matrix                     | no             |
| `push` tag `v*` (stable)     | full matrix, **mandatory**      | yes → `latest` |
| `push` tag `v*` (prerelease) | full unless `--skip-tests[=os]` | yes → `next`   |
| `push` to a branch           | only if `--run-tests[=os]`      | no             |
| any with `--skip-ci`         | none (ignored on a stable tag)  | no             |

**Commit-message flags** (dash style): `--skip-tests[=os]`, `--run-tests[=os]`,
`--skip-ci`. OS = `linux`/`windows` (`macos` accepted, off by default).
`--run-tests=linux,windows` runs both; bare flags mean all OSes.

## Invariants (the things that must always hold)

1. **A stable tag can never skip tests.** Flags are ignored on a stable
   (`vX.Y.Z`) tag — it always runs the full matrix before publishing.
2. **Publishing is only reachable via a tag.** No PR, fork, or branch push can
   publish; the `publish` job's guard
   (`!cancelled() && decide succeeded && check succeeded && build succeeded && tests green-or-skipped`)
   means a _failed_ gate never publishes, while a _deliberately skipped_
   prerelease gate still does.
3. **Format + lint can never be skipped.** `check.yml` (prettier + eslint) runs
   unconditionally on every PR and every tag; `ci.yml`'s `gate` and
   `release.yml`'s `publish` both require its result to be exactly `success` —
   unlike `test`, a skipped `check` is never legitimate. So unformatted or
   unlinted code can't land via a `--no-verify` commit, a docs-only PR, or a
   `--skip-tests` prerelease.
4. **The major version is pinned.**
   [`scripts/release.ts`](../../scripts/release.ts) refuses any bump whose major
   ≠ `PINNED_MAJOR` — no command or flag can raise it. A major is cut only by a
   human hardcoding that constant. Never automatic, never accidental.

## The test matrix

`test.yml` is sharded so no runner sits for ~an hour and Windows can't
accumulate leaked browser/dev processes until it starves. The `dist` artifact is
built once by `build.yml` (ubuntu-only) and downloaded by each shard — its
upload must include the root `package.json` to anchor `packages/*/dist` at the
repo root:

- **`test-fast`** — the ~78 fast files fanned across 3 runners per OS
  (`NO_SLOW_TESTS=1 … --shard i/3`).
- **`test-slow`** — each heavy integration file on its own runner, retried once
  on a fresh process.

The OS list is `FULL_OSES` in `ci-decide.ts`: **Linux + Windows**. macOS is out
(POSIX-identical to Linux, so it adds no coverage); run it ad-hoc with
`--run-tests=macos`. The slow-file list is `scripts/slow-tests.ts` (shared with
the local runner `scripts/test-parallel.ts`).

## Releasing

You release by tagging. `bun run release <bump>` bumps every package in
lockstep, commits + tags `v<version>`, and pushes nothing; you review and
`git push origin main --follow-tags`. The tag triggers `release.yml`. Full flow,
the channel/dist-tag rules, and the tag↔version guard:
[releasing.md](releasing.md).

## What's important to know

- **Forks are safe.** PR CI uses `pull_request` (not `pull_request_target`), so
  fork code runs without repository secrets. Publishing is reachable only from
  the tag-triggered publish job, which authenticates via OIDC — there is no
  long-lived npm token for fork code to reach.
- **One Windows exception.** `assets.int.test.tsx`'s "dev" sub-test is
  quarantined on Windows (`it.skipIf(process.platform === 'win32')`) — the dev
  server intermittently ECONNRESETs mid-request on the `--hot` path there. Build
  mode and the unit cases still run; macOS/Linux run everything. Re-enable once
  the dev-server crash is fixed.
- **Cost.** GitHub-hosted runners are free for this public repo. A full
  Linux+Windows run is ~32 jobs; macOS stays opt-in (×10 multiplier on billed
  minutes).
