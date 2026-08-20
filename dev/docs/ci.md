# CI & release

point0 follows the classic OSS shape: one `main` trunk, contributors fork → PR →
`main`, and **a release is a push to `main` whose pipeline goes green**. The
release job publishes the version if npm doesn't have it yet, then creates the
`v<version>` tag — the tag is the **result** of a release, never its trigger,
and nothing runs on a tag push. Seven workflow files, one policy script, one
test planner.

The pipeline is a single linear path on every trigger:

```
decide → build → check → test → gate (ci.yml) / release (release.yml)
                     └→ coverage (ci.yml, off to the side — never gates)
```

## Workflows (`.github/workflows/`)

- **`ci.yml`** — the test GATE. Runs on `pull_request → main` and on opt-in
  branch pushes (`push` to any branch except `main`). A cheap `decide` job runs
  [`scripts/ci-decide.ts`](../../scripts/ci-decide.ts) (policy + the test plan),
  then `build` → `check` → `test` → `gate`. Never publishes. Pushes to `main`
  are excluded here because `release.yml` owns them — same pipeline, plus the
  release job at the end. One pipeline per push, never two.
- **`build.yml`** — builds the framework once (ubuntu-only) and uploads the
  single `dist` artifact. Runs on **every** run of the gate and the release —
  `check` and `test` consume the artifact, and on a release so does `release`,
  so the published bytes are the ones the pipeline ran against and the code is
  never built twice. (Which jobs really exercise those bytes: the `.e2e` and
  heavy `.int` files, which spawn the real `point0` bin, plus the type-aware
  lint. The `unit`/`int` lane runs `src` on purpose — see
  [coverage](./coverage.md).)
- **`check.yml`** — the reusable format + lint gate (`workflow_call`):
  **downloads the `dist` artifact** (no second build), runs codegen (ESLint is
  type-aware, so it needs the real dist + generated code), then
  `bun run format:check` (prettier), `bun run lint:check` (eslint, no fix) and
  `bun run size:audit` — which fails if a package reached the browser without a
  row in [`scripts/size.ts`](../../scripts/size.ts), i.e. if the docs now
  under-report what a Point0 app downloads. Runs on **every** path — including a
  prose/assets PR, where the test matrix is skipped. The pre-commit hook is
  advisory (`--no-verify` exists); this is the hard gate.
- **`test.yml`** — the reusable cross-OS matrix (`workflow_call`, inputs
  `oses` + `groups` + `solo`). Downloads the `dist` artifact rather than
  building. Shared by the gate and the release. See
  [the matrix](#the-test-matrix).
- **`coverage.yml`** — line coverage → Codecov (`workflow_call`, inputs `groups`
  and `soloInt`). Ubuntu-only, called from `ci.yml` **outside** the `gate` job's
  `needs`, so it can never redden a PR. Only `unit`/`int` run: Bun instruments
  nothing that happens in a spawned `point0` or a browser. **Off by default** —
  gated on the repo variable `ENABLE_COVERAGE=1`. See [coverage](./coverage.md).
- **`test-one.yml`** — point-run a SINGLE test file on a real runner
  (`workflow_dispatch`, inputs `file` + `os` + `repeat`) — the flake-debugging
  tool. Reproduces a release-matrix leg (built artifact, guarded runner) without
  burning the whole matrix:
  `gh workflow run test-one.yml --ref <branch> -f file=… -f os=… -f repeat=5`.
- **`release.yml`** — the gate for `main` AND the publish path. Runs on `push`
  to `main` (and `workflow_dispatch`, which tests but never publishes). Same
  linear pipeline, then the `release` job: ask npm whether `package.json`'s
  version is already there → publish if not → create and push the annotated
  `v<version>` tag at that commit. Reachable only from a push to `main` in this
  repo — a fork can't push there, so untrusted code can never publish. The job
  is serialized (`concurrency: release`, never cancelled) so two releases can't
  interleave their `latest` moves. Keeping the publish in **this filename**
  matters: npm's Trusted Publisher is keyed to repo + workflow file.

## `decide` — the one place policy lives

[`scripts/ci-decide.ts`](../../scripts/ci-decide.ts) maps the event + the commit
message to `{ oses, publish }` and forwards the test plan (`groups` + `solo`)
from [`scripts/test.ts`](../../scripts/test.ts). It's unit-tested
([`ci-decide.unit.test.ts`](../../scripts/ci-decide.unit.test.ts)) so the
invariants can't silently regress. The full table:

| event                 | tests                            | publish                         |
| --------------------- | -------------------------------- | ------------------------------- |
| `pull_request → main` | full matrix                      | no                              |
| …prose/assets diff    | none (only build + check)        | no                              |
| `push` to `main`      | full matrix, **mandatory**       | if not on npm → `latest`/`next` |
| `push` to a branch    | only if `--run-tests[=os]`       | no                              |
| branch `--skip-ci`    | none (`main` or a PR ignores it) | no                              |
| `push` of a tag       | —                                | nothing listens on tags         |

**Commit-message flags** (dash style): `--run-tests[=os]`, `--skip-ci` — both
apply to the maintainer's own **branch pushes only**: a PR ignores every flag
(no one can merge an untested change by writing `--skip-ci` into the tip
commit), and `main` always tests, because a push to `main` is the release path.
OS = `linux`/`windows` (`macos` accepted, off by default).
`--run-tests=linux,windows` runs both; a bare flag means all OSes. There is **no
`--skip-tests`** — every release tests, stable or prerelease (it died in the CI
rework: when a prerelease must ship despite a broken suite, fix the suite
locally instead of publishing untested bytes).

## Invariants (the things that must always hold)

1. **`main` can never skip tests.** Stable, prerelease or an ordinary fix — a
   push to `main` always runs the full matrix before the release job; no flag
   weakens it.
2. **Publishing is only reachable from a push to `main`.** No PR, fork, feature
   branch or tag can publish; the `release` job requires `decide`, `build`,
   `check` AND `test` to all be exactly `success` (`main` always tests, so there
   is no legitimately-skipped stage on a release).
3. **A tag never precedes a green run.** The tag is created by the release job
   after the publish, from the version in `package.json`, at the commit that was
   built and tested — so a tag can't point at unproven code, and tag ↔ version
   can't drift. Tags are never moved: an existing one is left alone.
4. **Format + lint can never be skipped.** `check.yml` runs on every PR and
   every push to `main`; `ci.yml`'s `gate` and `release.yml`'s `release` both
   require its result to be exactly `success`. So unformatted or unlinted code
   can't land via a `--no-verify` commit or a PR the matrix skips.
5. **The major version is pinned.**
   [`scripts/release.ts`](../../scripts/release.ts) refuses any bump whose major
   ≠ `PINNED_MAJOR` — no command or flag can raise it. A major is cut only by a
   human hardcoding that constant. Never automatic, never accidental.
6. **The Bun the runners use is pinned too.** Every `setup-bun` step names an
   exact version (**1.4.0**), never `latest`. Bun is the package manager, the
   test runner and the framework's runtime all at once, so `latest` let a
   release on the other side of the world change how our installs resolve, how
   bins get linked and how many bytes the bundler emits — with no commit of ours
   in sight, and nothing in the log saying the ground had moved. Bumping it is
   now an edit someone makes on purpose, in one place per workflow, and the diff
   says so.

   **Two Buns, and the second one is the one that runs the tests.**
   `bun-plugin-tailwind` peer-depends on `bun`, so the npm `bun` package sits in
   `node_modules` — and `bun run` puts `node_modules/.bin` first on `PATH`, so
   every `bun` a script spawns (the whole test runner) is _that_ binary, not the
   runner's. It is therefore declared in the root `devDependencies`
   (`"bun": "^1.4.0"`) and must be bumped together with `setup-bun`; left
   implicit, it silently froze at the version first resolved into the lockfile.
   Check with `node_modules/.bin/bun --version`.

## The test matrix

Every test file carries its class in its name — `.unit` (pure in-process logic),
`.int` (real processes/dev servers, no browser), `.e2e` (real browser) — and
[`scripts/test.ts`](../../scripts/test.ts) is the single runner AND planner: it
validates the suffixes against each file's actual imports (a browser import ⇒
`.e2e`, real machinery ⇒ not `.unit`) and distributes the files across two
lanes. The matrices below **self-size from the plan** — nothing is hardcoded in
the workflows.

- **`test-fast`** — one runner per (OS × group): the `unit` group, the auto
  `int-N` groups, plus a few files pinned to their own named groups
  (`PINNED_GROUPS`) — known-long ones, and `engine-backplane`, the real-store
  lane: its Linux runner provisions a `redis-server` binary, a running Redis
  (`REDIS_URL`) and the runner image's PostgreSQL (`POSTGRES_URL`) before the
  run, so the five redis/postgres suites actually gate there instead of skipping
  (on other OSes they skip themselves, like on a dev machine without the
  binaries). Files run in parallel within a runner, each in its own process with
  a wall-clock guard. **No browser anywhere in this lane** (every browser file
  is `.e2e` ⇒ solo), so it skips the Playwright install.
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

You release by pushing. `bun run release <bump>` bumps every package in lockstep
and commits — no tag, nothing pushed; you review and `git push origin main`.
That push runs `release.yml`, and the green run publishes and then tags
`v<version>`. A red run costs a fix commit, not a version. Full flow, the
channel/dist-tag rules and the failure replays: [releasing.md](releasing.md).

## What's important to know

- **Forks are safe.** PR CI uses `pull_request` (not `pull_request_target`), so
  fork code runs without repository secrets. Publishing is reachable only from
  the release job on a push to `main` in this repo, which authenticates via OIDC
  — there is no long-lived npm token for fork code to reach.
- **One Windows exception.** `assets.e2e.test.tsx`'s "dev" sub-test is
  quarantined on Windows (`it.skipIf(process.platform === 'win32')`) — the dev
  server intermittently ECONNRESETs mid-request on the `--hot` path there. Build
  mode and the unit cases still run; macOS/Linux run everything. Re-enable once
  the dev-server crash is fixed.
- **Cost.** GitHub-hosted runners are free for this public repo (4-vCPU/16 GB
  VMs; each matrix job is its own VM — memory is never shared between jobs, and
  the account-level cap is 20 concurrent jobs, extra legs just queue). A full
  Linux+Windows run is ~50 jobs; macOS stays opt-in (×10 multiplier on billed
  minutes).
