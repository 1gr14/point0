# Releasing point0

We publish on our own terms — no version is derived from commits, nothing is
auto-cut. All `@point0/*` packages move in **lockstep** (one shared version),
and the version can never accidentally reach 1.0.0.

The model is classic OSS with one `main` trunk, and **a release is a push to
`main` whose pipeline goes green**. `bun run release` bumps and commits locally
— it does not tag. The one CI run on that push builds, checks and tests as on
any push, and its final `release` job publishes the version if npm doesn't have
it yet and only **then** creates the annotated `v<version>` tag, at the exact
commit that was built and tested.

**The tag is the result of a release, not its trigger.** Nothing runs on a tag
push. That's what makes a version unburnable: if the release commit is broken,
CI goes red, nothing publishes and nothing is tagged — you fix it with a normal
commit and push again, and the same version ships. Versions are never skipped
and a tag can never point at a commit CI hasn't proven.

## Two channels, one branch

| Version                   | git tag         | npm dist-tag | Auth              |
| ------------------------- | --------------- | ------------ | ----------------- |
| prerelease `x.y.z-next.N` | `vX.Y.Z-next.N` | `next`       | OIDC + provenance |
| stable `x.y.z`            | `vX.Y.Z`        | `latest`     | OIDC + provenance |

The channel is derived from the **version itself** (prerelease vs stable), not
from a branch. The **tag ↔ version invariant** now holds by construction: CI
reads the version out of `package.json` and builds the tag from it, so the two
cannot drift — there is nothing left to cross-check.
[`scripts/check-channel.ts`](../../scripts/check-channel.ts) kept the half that
still matters: the **version shape** (`x.y.z` or `x.y.z-next.N`), so a
hand-edited version can't invent a third npm channel.

Consumers get a prerelease only on purpose — via the `next` dist-tag
(`"@point0/core": "next"`) or an exact `x.y.z-next.N`. A normal `^0.1.0` range
never resolves a prerelease.

## The scripts

- [`scripts/release.ts`](../../scripts/release.ts) (`bun run release`) — bumps
  the version everywhere (lockstep), fixes dep ranges, promotes the changelog
  (on a stable cut), then **commits**. No tag, nothing pushed. Add `--no-git` to
  bump only.
- [`scripts/publish.ts`](../../scripts/publish.ts) (`bun run publish:packages`)
  — publishes to npm, dist-tag from the version, `--provenance` for public
  packages. CI runs it from the green `main` run; it's idempotent (skips
  versions already on npm).
- [`scripts/check-channel.ts`](../../scripts/check-channel.ts)
  (`bun run check:channel`) — the version-shape guard, asserted by `publish.ts`
  before anything reaches npm.

```sh
bun run release prerelease   # 0.1.0        → 0.1.0-next.0   (re-run → -next.1, -next.2 …)
bun run release stable       # 0.1.0-next.3 → 0.1.0          (strip the prerelease suffix)
bun run release patch        # 0.1.0        → 0.1.1
bun run release minor        # 0.1.0        → 0.2.0
bun run release 0.2.0-next.0 # explicit (stays in 0.x; an explicit jump out of 0.x is refused)
```

`release` refuses to bump when the version in the tree **isn't on npm yet** —
that means the last release never made it through, so there is nothing to bump:
push a fix and the same version ships. (`--force` bumps anyway, deliberately
skipping that number.)

## When a dependency bumps — extra checks

- **A React minor bump → re-run the RSC suites** (`rsc.unit.test.tsx`,
  `rsc.fast`, `rsc.slow` on both bundlers). The RSC contract is ours (element
  shape, `Suspense`, `memo`/`forwardRef` unwrap, Fizz reveal behavior) — a small
  surface, but it sits directly on React internals drift.

## As you work — jot changelog notes

Add a bullet under `## Unreleased` in [CHANGELOG.md](../../CHANGELOG.md)
whenever you do something worth mentioning. Prereleases leave `## Unreleased`
untouched; only a **stable** cut promotes it.

## Cut a release

From `main` (with a clean tree):

```sh
bun run release prerelease    # or: stable | patch | minor | <explicit>
                              # → bumps, commits "chore(release): v<version>". No tag.
git show HEAD                 # review — nothing is pushed yet
git push origin main          # the green run publishes, then tags v<version>
```

What the run does
([`.github/workflows/release.yml`](../../.github/workflows/release.yml)): build
→ **format + lint check** (prettier + eslint, `check.yml`) → **tests** → "is
this version on npm?" → `publish:packages` → `git tag -a v<version>` + push. The
dist-tag (`next` / `latest`) comes from the version.

**Tests on a release:**

- **Every** push to `main` — stable, prerelease or an ordinary fix — runs the
  full test matrix; there is no skip flag (`--skip-tests` died in the CI rework,
  and `--skip-ci` is ignored on `main`). See
  [`scripts/ci-decide.ts`](../../scripts/ci-decide.ts).
- The **format + lint check** (`check.yml`) runs on every push too, and the
  `release` job requires the whole pipeline green.

## When something goes wrong

| What happened                            | What to do                                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------------------- |
| Release commit is **broken**             | Fix with a normal commit on `main` and push. The version stays; the green run publishes it. |
| **Flake** in the matrix                  | `gh run rerun <id> --failed` — the release job resumes. Nothing was published or tagged.    |
| Published, but **tagging** died          | Re-run the job: publish is skipped (already on npm), the tag step runs and heals the tag.   |
| Change your mind **before** it publishes | Revert the bump commit. The release job sees the version already on npm and skips.          |

## Notes

- **Publishing is OIDC + provenance.** Each `@point0/*` package has an npm
  **Trusted Publisher** (this repo + `release.yml`), so CI publishes with
  provenance and no `NPM_TOKEN`. The trusted publisher is keyed to the
  **workflow filename** — `release.yml` must keep its name, even though it is
  now triggered by a branch push rather than a tag. There is **no** `SKIP_TESTS`
  repo variable — test control lives in commit flags, and `main` ignores them.
- The release job is serialized (`concurrency: release`, never cancelled), so
  two release commits pushed back to back publish in order and can't re-point
  `latest` at the older version.
- `create-point0-app` publishes **public** (unscoped), alongside the `@point0/*`
  packages.

## Why the tag comes last

`0.3.0`–`0.3.2` are dead tags. The old model tagged locally and pushed the tag
with `main`, so the tag existed **before** CI had ever built that commit — when
the release commit itself was broken, the tag was already stuck on a broken
commit forever (tags are immutable here, never rewritten), and the only way
forward was a new version: a dead tag on GitHub, a skipped version on npm. Flaky
infra was never the problem — a re-run republishes the same tag. **Only a broken
release commit burned a version.**

Alternatives that were rejected: pushing `main`, waiting for green and then
pushing the tag (two pipeline runs and a manual wait); deleting or moving a bad
tag (tags are published history — rewriting them breaks every clone and the
provenance trail); running the full matrix locally before tagging (slower than
CI, weaker than CI — no Windows/Linux shards — and it still burns a version on
anything it misses).
