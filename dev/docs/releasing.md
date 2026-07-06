# Releasing point0

We publish on our own terms — no version is derived from commits, nothing is
auto-cut. All `@point0/*` packages move in **lockstep** (one shared version),
and the version can never accidentally reach 1.0.0.

The model is classic OSS: one `main` trunk, and **a `v*` git tag is the only
thing that publishes**. Pushing code never releases — you release by tagging.

## Two channels, one branch

| Version                   | git tag         | npm dist-tag | Auth              |
| ------------------------- | --------------- | ------------ | ----------------- |
| prerelease `x.y.z-next.N` | `vX.Y.Z-next.N` | `next`       | OIDC + provenance |
| stable `x.y.z`            | `vX.Y.Z`        | `latest`     | OIDC + provenance |

The channel is derived from the **version itself** (prerelease vs stable), not
from a branch. The **tag ↔ version invariant** is enforced by
[`scripts/check-channel.ts`](../../scripts/check-channel.ts): a release tag must
be exactly `v${version}` from `package.json`. It runs in the CI publish job and
in the local `pre-push` hook, so a stale or mistyped tag can never publish the
wrong version.

Consumers get a prerelease only on purpose — via the `next` dist-tag
(`"@point0/core": "next"`) or an exact `x.y.z-next.N`. A normal `^0.1.0` range
never resolves a prerelease.

## The scripts

- [`scripts/release.ts`](../../scripts/release.ts) (`bun run release`) — bumps
  the version everywhere (lockstep), fixes dep ranges, promotes the changelog
  (on a stable cut), then **commits + tags** `v<version>`. You run it locally;
  it pushes nothing. Add `--no-git` to bump only.
- [`scripts/publish.ts`](../../scripts/publish.ts) (`bun run publish:packages`)
  — publishes to npm, dist-tag from the version, `--provenance` for public
  packages. CI runs it from the tag; it's idempotent (skips versions already on
  npm).
- [`scripts/check-channel.ts`](../../scripts/check-channel.ts)
  (`bun run check:channel`) — the tag ↔ version guard.

```sh
bun run release prerelease   # 0.1.0        → 0.1.0-next.0   (re-run → -next.1, -next.2 …)
bun run release stable       # 0.1.0-next.3 → 0.1.0          (strip the prerelease suffix)
bun run release patch        # 0.1.0        → 0.1.1
bun run release minor        # 0.1.0        → 0.2.0
bun run release 0.2.0-next.0 # explicit (stays in 0.x; an explicit jump out of 0.x is refused)
```

## As you work — jot changelog notes

Add a bullet under `## Unreleased` in [CHANGELOG.md](../../CHANGELOG.md)
whenever you do something worth mentioning. Prereleases leave `## Unreleased`
untouched; only a **stable** cut promotes it.

## Cut a release

From `main` (with a clean tree):

```sh
bun run release prerelease    # or: stable | patch | minor | <explicit>
                              # → bumps, commits "chore(release): v<version>", tags v<version>
git show v<version>           # review — nothing is pushed yet
git push origin main --follow-tags   # the TAG triggers CI to build → test → publish
```

What the tag run does
([`.github/workflows/release.yml`](../../.github/workflows/release.yml)): build
→ **format + lint check** (prettier + eslint, `check.yml`) → **tests** → tag
guard → `publish:packages`. The dist-tag (`next` / `latest`) comes from the
version.

**Tests on a release:**

- A **stable** tag always runs the full test matrix — it can never be skipped.
- A **prerelease** tag runs it too, but you can skip it by putting
  `--skip-tests` (or `--skip-tests=windows`) in the release commit message — the
  commit already passed CI as a PR, so re-testing is optional. See
  [`scripts/ci-decide.ts`](../../scripts/ci-decide.ts) for the full flag set.
- The **format + lint check** (`check.yml`) can never be skipped — it runs on
  every tag, `--skip-tests` or not, and `publish` requires it green.

## Notes

- **Publishing is OIDC + provenance.** Each `@point0/*` package has an npm
  **Trusted Publisher** (this repo + `release.yml`), so CI publishes with
  provenance and no `NPM_TOKEN`. There is **no** `SKIP_TESTS` repo variable —
  test control lives in commit flags.
- `create-point0-app` publishes **public** (unscoped), alongside the `@point0/*`
  packages.
