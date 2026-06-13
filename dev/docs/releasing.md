# Releasing point0

We publish on our own terms — no version is derived from commits, nothing is
auto-cut. All `@point0/*` packages move in **lockstep** (one shared version),
and the version can never accidentally reach 1.0.0.

Two small scripts do everything:

- [`scripts/release.ts`](../../scripts/release.ts) (`bun run release`) — bumps
  the version everywhere + fixes dep ranges + promotes the changelog. You run it
  locally.
- [`scripts/publish.ts`](../../scripts/publish.ts) (`bun run publish:packages`)
  — publishes to npm. CI runs it; it's idempotent (skips versions already on
  npm).

## As you work — jot changelog notes

Add a bullet under `## Unreleased` in [CHANGELOG.md](../../CHANGELOG.md)
whenever you do something worth mentioning. Rough is fine — you'll tidy it at
release.

## To cut a release

1. **Bump.** On `dev`:

   ```sh
   bun run release minor    # 0.1.0 → 0.2.0   (patch / minor / explicit x.y.z)
   ```

   This sets the new version in every workspace `package.json` (lockstep),
   rewrites internal `@point0/*` ranges to `^<new>` (+ external from the
   catalog), and promotes `## Unreleased` → `## <version>`. `patch`/`minor`
   always stay in **0.x** — they can't reach 1.0.0. (An explicit jump out of 0.x
   is refused; edit `release.ts` if you ever truly mean it.)

2. **Review & polish.** Check the diff; tidy the new CHANGELOG section into
   final wording.

3. **Commit, tag, push** to a release branch (`main` or `next`):

   ```sh
   git add -A && git commit -m "chore(release): 0.2.0" && git tag v0.2.0
   git checkout main && git merge --ff-only dev && git push origin main --follow-tags
   ```

4. **CI publishes.** The push triggers build → tests →
   `bun run publish:packages`, which publishes the new version of each scoped
   package (`restricted`). Watch the Action.

## First release / private week

The packages already sit at `0.1.0`. For the first private release you don't
need a bump — run `bun run release 0.1.0` (no version change, just promotes the
changelog), commit, push. CI publishes `@point0/*@0.1.0` as **private**
(`restricted`). `create-point0-app` is `private: true` (unscoped → can't be
private on npm), so it's skipped. Consumers (игрич/start0) keep `^0.1.0` and
resolve it from the private registry.

**GitHub setup** (one-time, you): repo Actions secret `NPM_TOKEN` (granular,
`@point0` read+write); for `next`, repo variable `SKIP_TESTS_ON_NEXT=true` to
skip tests early.

## Public launch (later)

- Flip every package's `publishConfig.access` to `public` (and the root).
- Remove `"private": true` from `packages/create-app/package.json` so
  `create-point0-app` publishes too (it goes public — unscoped packages always
  do).
- Switch CI auth from the `NPM_TOKEN` to OIDC Trusted Publisher to get
  **provenance** (needs the repo public + Node 24, already set). Provenance
  attaches at publish, so cut a fresh version publicly rather than flipping the
  private one.
- Make the repo public and add the branch-protection ruleset for `main`/`next`.
