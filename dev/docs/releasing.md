# Releasing point0

We publish on our own terms — no version is derived from commits, nothing is
auto-cut. All `@point0/*` packages move in **lockstep** (one shared version),
and the version can never accidentally reach 1.0.0.

## Two channels

| Branch | Version                   | npm dist-tag | Auth                                                             |
| ------ | ------------------------- | ------------ | ---------------------------------------------------------------- |
| `next` | prerelease `x.y.z-next.N` | `next`       | granular `NPM_TOKEN` (no provenance)                             |
| `main` | stable `x.y.z`            | `latest`     | OIDC Trusted Publisher → provenance _(enabled at public launch)_ |

The **branch ↔ version invariant** is enforced by
[`scripts/check-channel.ts`](../../scripts/check-channel.ts): `next` may only
publish a `-next.N` prerelease, `main` may only publish a stable version. It
runs in the CI publish job, in the local `pre-push` hook, and inside
`publish.ts` — so a prerelease can never land on `latest` (and a stable can
never land on `next`), even if branches or versions get crossed.

Consumers get a prerelease only on purpose — via the `next` dist-tag
(`"@point0/core": "next"`) or an exact `x.y.z-next.N`. A normal `^0.1.0` range
never resolves a prerelease.

## The scripts

- [`scripts/release.ts`](../../scripts/release.ts) (`bun run release`) — bumps
  the version everywhere
  - fixes dep ranges + (on a stable cut) promotes the changelog. You run it
    locally.
- [`scripts/publish.ts`](../../scripts/publish.ts) (`bun run publish:packages`)
  — publishes to npm, picking the dist-tag from the version. CI runs it; it's
  idempotent (skips versions already on npm).
- [`scripts/check-channel.ts`](../../scripts/check-channel.ts)
  (`bun run check:channel`) — the guard.

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

## Cut a prerelease (the private week)

On `dev`:

```sh
bun run release prerelease                 # e.g. 0.1.0-next.0 → -next.1
git add -A && git commit -m "chore(release): <version>"
git checkout next && git merge --ff-only dev && git push origin next
```

The push triggers build → tests → channel guard → `publish:packages`, which
publishes each scoped package as the new prerelease under the `next` dist-tag
(`restricted`, token auth). Watch the Action.

## Cut a stable release (the public launch)

When the prerelease has proven itself and the repo is public (so OIDC +
provenance work):

```sh
bun run release stable                     # 0.1.0-next.N → 0.1.0  (promotes the changelog)
git add -A && git commit -m "chore(release): 0.1.0" && git tag v0.1.0
git checkout main && git merge --ff-only dev && git push origin main --follow-tags
```

Launch switches (one-time, see
[backlog/launch-plan.md](../../backlog/launch-plan.md)): flip every
`publishConfig.access` to `public`; remove `"private": true` from
`packages/create-app`; turn the `publish` job on for `main` and switch CI auth
from `NPM_TOKEN` to OIDC Trusted Publisher; make the repo public and add branch
protection.

## Notes

- **GitHub setup** (one-time): repo Actions secret `NPM_TOKEN` (granular,
  `@point0` read+write); repo variable `SKIP_TESTS=true` mutes the (currently
  Linux-broken) test gate during the private week — unset it once the suite is
  fixed (see backlog) to restore the gate.
- `create-point0-app` is `private: true` (unscoped → can't be private on npm),
  so it's skipped while private and goes public at launch.
