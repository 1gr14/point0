# CI & release

point0 follows the classic OSS shape: one `main` trunk, contributors fork → PR →
`main`, and **a `v*` git tag is the only thing that publishes**. Pushing code
never releases. Six workflow files, one policy script, one test planner.

The pipeline is a single linear path on every trigger:

```
decide → build → check → test → gate (ci.yml) / publish (release.yml)
```

## Workflows (`.github/workflows/`)

- **`ci.yml`** — the test GATE. Runs on `pull_request → main` and on opt-in
  branch pushes (`push` to any branch except `main`). A cheap `decide` job runs
  [`scripts/ci-decide.ts`](../../scripts/ci-decide.ts) (policy + the test plan),
  then `build` → `check` → `test` → `gate`. Never publishes. `main` is **not**
  gated on push — the PR is the gate, and a push-to-main gate would just
  re-test.
- **`build.yml`** — builds the framework once (ubuntu-only) and uploads the
  single `dist` artifact. Runs on **every** run of the gate and the release —
  `check` and `test` consume the artifact, and on a release so does `publish`,
  so the checked/tested bytes are the published bytes and the code is never
  built twice.
- **`check.yml`** — the reusable format + lint gate (`workflow_call`):
  **downloads the `dist` artifact** (no second build), runs codegen (ESLint is
  type-aware, so it needs the real dist + generated code), then
  `bun run format:check` (prettier) and `bun run lint:check` (eslint, no fix).
  Runs on **every** path — including a docs-only PR, where the test matrix is
  skipped. The pre-commit hook is advisory (`--no-verify` exists); this is the
  hard gate.
- **`test.yml`** — the reusable cross-OS matrix (`workflow_call`, inputs
  `oses` + `groups` + `solo`). Downloads the `dist` artifact rather than
  building. Shared by the gate and the release. See
  [the matrix](#the-test-matrix).
- **`test-one.yml`** — point-run a SINGLE test file on a real runner
  (`workflow_dispatch`, inputs `file` + `os` + `repeat`) — the flake-debugging
  tool. Reproduces a release-matrix leg (built artifact, guarded runner) without
  burning the whole matrix:
  `gh workflow run test-one.yml --ref <branch> -f file=… -f os=… -f repeat=5`.
- **`release.yml`** — PUBLISH. Runs on `push` of a `v*` tag (and
  `workflow_dispatch` for an idempotent retry). Same linear pipeline, then
  publishes. Reachable only via a tag — a fork can't push one, so untrusted code
  can never publish.

## `decide` — the one place policy lives

[`scripts/ci-decide.ts`](../../scripts/ci-decide.ts) maps the event + the commit
message to `{ oses, publish }` and forwards the test plan (`groups` + `solo`)
from [`scripts/test.ts`](../../scripts/test.ts). It's unit-tested
([`ci-decide.unit.test.ts`](../../scripts/ci-decide.unit.test.ts)) so the
invariants can't silently regress. The full table:

| event                 | tests                      | publish               |
| --------------------- | -------------------------- | --------------------- |
| `pull_request → main` | full matrix                | no                    |
| …docs-only diff       | none (only build + check)  | no                    |
| `push` tag `v*`       | full matrix, **mandatory** | yes → `latest`/`next` |
| `push` to a branch    | only if `--run-tests[=os]` | no                    |
| any with `--skip-ci`  | none (ignored on a tag)    | no                    |

**Commit-message flags** (dash style): `--run-tests[=os]`, `--skip-ci`. OS =
`linux`/`windows` (`macos` accepted, off by default).
`--run-tests=linux,windows` runs both; a bare flag means all OSes. There is **no
`--skip-tests`** — every tag tests, stable or prerelease (it died in the CI
rework: when a prerelease must ship despite a broken suite, fix the suite
locally instead of publishing untested bytes).

## Invariants (the things that must always hold)

1. **A tag can never skip tests.** Stable or prerelease — a `v*` tag always runs
   the full matrix before publishing; no flag weakens it.
2. **Publishing is only reachable via a tag.** No PR, fork, or branch push can
   publish; the `publish` job requires `decide`, `build`, `check` AND `test` to
   all be exactly `success` (tags always test, so there is no
   legitimately-skipped stage on a release).
3. **Format + lint can never be skipped.** `check.yml` runs on every PR and
   every tag; `ci.yml`'s `gate` and `release.yml`'s `publish` both require its
   result to be exactly `success`. So unformatted or unlinted code can't land
   via a `--no-verify` commit or a docs-only PR.
4. **The major version is pinned.**
   [`scripts/release.ts`](../../scripts/release.ts) refuses any bump whose major
   ≠ `PINNED_MAJOR` — no command or flag can raise it. A major is cut only by a
   human hardcoding that constant. Never automatic, never accidental.

## The test matrix

Every test file carries its class in its name — `.unit` (pure in-process logic),
`.int` (real processes/dev servers, no browser), `.e2e` (real browser) — and
[`scripts/test.ts`](../../scripts/test.ts) is the single runner AND planner: it
validates the suffixes against each file's actual imports (a browser import ⇒
`.e2e`, real machinery ⇒ not `.unit`) and distributes the files across two
lanes. The matrices below **self-size from the plan** — nothing is hardcoded in
the workflows.

- **`test-fast`** — one runner per (OS × group): the `unit` group, the auto
  `int-N` groups, plus a few known-long files pinned to their own named groups
  (`PINNED_GROUPS`). Files run in parallel within a runner, each in its own
  process with a wall-clock guard. **No browser anywhere in this lane** (every
  browser file is `.e2e` ⇒ solo), so it skips the Playwright install.
- **`test-solo`** — one runner per (OS × file): every `.e2e` file plus the heavy
  solo `.int` files (`SOLO_INT`: build/cli/mcp/…). One file per runner keeps
  failures attributable and stops leaked browser/dev processes from starving a
  runner.

Both lanes run through `scripts/test.ts`, which wraps every file in a wall-clock
timeout (a hung file fails fast and NAMED — `▶` with no matching `✓`/`✗` in the
breadcrumbs is the culprit), kills the process tree + reaps stray browsers on a
hang, retries a timed-out file once on a fresh process, and treats "all tests
green but the process would not exit" as a **pass with a loud warning** (the
known bun-on-Windows teardown hang), not a failure.

The OS list is `FULL_OSES` in `ci-decide.ts`: **Linux + Windows**. macOS is out
(POSIX-identical to Linux, so it adds no coverage); run it ad-hoc with
`--run-tests=macos` or a `test-one.yml` dispatch.

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
- **Cost.** GitHub-hosted runners are free for this public repo (4-vCPU/16 GB
  VMs; each matrix job is its own VM — memory is never shared between jobs, and
  the account-level cap is 20 concurrent jobs, extra legs just queue). A full
  Linux+Windows run is ~50 jobs; macOS stays opt-in (×10 multiplier on billed
  minutes).
