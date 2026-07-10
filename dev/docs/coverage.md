# Coverage

What our line coverage measures, what it deliberately doesn't, and how to read
the report without chasing a number that doesn't mean what it looks like.

## Run it

```sh
bun run cov          # unit + non-solo int, with coverage — the local loop
bun run cov:all      # ...plus the heavy solo int files (cli, mcp, publicdir, module-preload-serve)
bun run cov:report   # re-merge coverage/raw/** without re-running anything
```

Each writes three things into `coverage/` (gitignored):

| file           | for                                                 |
| -------------- | --------------------------------------------------- |
| `coverage.md`  | you and your agent — ranked by what's worth testing |
| `lcov.info`    | Codecov, and any lcov viewer                        |
| `summary.json` | scripts                                             |

`coverage.md` opens with a per-package table, then **the 30 files with the most
uncovered lines**, then everything never executed in-process. The ranking is by
absolute uncovered lines, not by percentage: a 60%-covered 2000-line file hides
far more untested behaviour than a 0%-covered 12-line one, and it's where a new
test pays for itself first.

## How it works

`bun test --coverage` is the only way to collect coverage on Bun, and it only
sees code that runs **inside the test process**.
[scripts/test.ts](../../scripts/test.ts) already runs every test file in its own
`bun test` process, so `--coverage` gives each file its own
`coverage/raw/<slug>/lcov.info`. Bun cannot merge across processes, so
[scripts/coverage.ts](../../scripts/coverage.ts) unions the shards, sums the
per-line hits, and renders the report.

Lines only. Bun's lcov carries per-file function totals (`FNF`/`FNH`) but no
per-function records, so function coverage can't be merged across processes
without double-counting. Lines are also the metric that answers the question we
actually ask: what has nothing ever run.

## The tsconfig `paths` invariant

A test imports its own package relatively (`../src/…`) but a **sibling** package
by name (`@point0/core`). By plain node resolution that name would land in the
sibling's built `dist/` — gitignored, stale between builds, and meaningless to
Codecov.

It doesn't, because every package that imports a sibling maps it back to source
in its **`tsconfig.json`**:

```json
{ "compilerOptions": { "paths": { "@point0/core": ["../core/src/index.ts"] } } }
```

Bun applies the tsconfig nearest to the _importing_ file, so `src` is what runs
and `src` is what gets counted. This matters beyond coverage: without the
mapping, a package's tests run against whatever core was last built, and your
core change simply doesn't show up until you rebuild.

`tsconfig.build.json` carries no `paths` — that's what `tsdown` and the `types`
script use, so the build and the type-check still resolve siblings through
`dist`, exactly as a user does.

**Adding a package that imports a sibling? Add the `paths` entry.** If you
forget, `bun run cov` prints

```
⚠ loaded from dist, so their coverage was DROPPED: core
```

and names the offender in `coverage.md`. That warning is the whole enforcement
mechanism — it exists because this was silently wrong for `@point0/compiler`
until coverage went looking.

## What is not counted, and why that's fine

The `.e2e` suite spawns `point0 dev | build | start` as child processes and
drives a real browser. Bun instruments neither. So:

- the CLI, the dev server, the production build pipeline, and every line of
  browser-side hydration are covered **behaviourally** and never line-counted;
- their files land in `coverage.md` under **"never executed in-process"**.

That is a hole in the _number_, not necessarily a hole in the _testing_. Don't
write a unit test for `cli.ts` just to move the percentage — check whether the
e2e suite already proves the behaviour, and if it does, leave it.

The headline percentage is computed over **executed files only**: a file no test
ever imported contributes no lines to cover, so it can't drag the percentage
down. Codecov shows the same optimistic number. The file counts printed next to
it (`N executed, M never executed in-process`) are what keep it honest — read
both.

## CI and Codecov

**Off by default.** The `coverage` job in `ci.yml` is gated on the repository
variable `ENABLE_COVERAGE=1` (Settings → Secrets and variables → Actions →
Variables) — flip it on once the repo is enabled on codecov.io, no code change
needed. Until then coverage is local-only (`bun run cov`), which costs nothing
extra: the flag instruments the same single test run.

When enabled,
[.github/workflows/coverage.yml](../../.github/workflows/coverage.yml) runs the
same command on ubuntu only, sharded across the same plan groups the test matrix
uses, plus one runner per solo `.int` heavy. Every shard uploads its own
`lcov.info`; Codecov merges the uploads for a commit, so the number there equals
the number you get locally from `cov:all`.

Note this **is a second run** of the unit+int suite, on top of the gating
matrix. Deliberate: the gate is cross-OS (coverage on Windows would count the
same lines twice for nothing), and nothing coverage-related — a flag, an upload
step, a Codecov hiccup — is allowed inside a gating job. Isolation is bought
with duplicated ubuntu minutes; if that ever gets expensive, the alternative is
passing `--coverage` to the ubuntu legs of `test.yml` and uploading from there.

The job authenticates with **OIDC**, not a token — same posture as the npm
publish. Fork PRs get no `id-token`, so coverage is skipped there rather than
failing.

Coverage never gates a PR. [codecov.yml](../../codecov.yml) sets the project and
patch checks to `informational`, and the job sits outside the `gate` job's
`needs`. A flaky int test in the coverage lane must never turn a green PR red —
the test matrix is the verdict, coverage is a read-out.

The signal worth acting on is Codecov's **patch coverage** comment: "the lines
you just added have no test". That is a far better prompt than any repo-wide
percentage.

## Where the gaps get written down

Coverage tells you what isn't executed. Whether it's worth a test is a judgement
call, and the outcome belongs in
[dev/backlog/add-tests.md](../backlog/add-tests.md) — not in a TODO comment and
not in a coverage threshold.

The plan for closing the e2e blind spot (browser-side V8 coverage via
Playwright, and what to do about the spawned server) lives in
[dev/backlog/coverage.md](../backlog/coverage.md). Until that lands, the
repo-wide percentage is structurally understated — don't publish it.
