# point0 — launch plan & versioning/local-install design

The plan to take point0 public and stand игрич + start0 on top of it, plus the
record of the versioning + local-install refactor done in prep. Cross-repo:
point0 (`~/cc/opensource/1gr14/point0`), игрич (`~/cc/projects/1gr14`), start0
(`~/cc/projects/start0`).

**Sequencing:** point0 → npm (private week) → игрич on Railway → point0 public →
start0 first release.

> **⚠️ Release tooling — UPDATED.** We dropped semantic-release **and**
> changesets: both fight a lockstep + 0.x + caret-peer-deps monorepo (they
> force-bump to 1.0.0 — changesets via fixed-group escalation and via "peer dep
> out of range → major"). We now use small scripts:
> `bun run release <patch|minor|prerelease|stable|x.y.z>` (local: bumps all
> packages lockstep, fixes ranges, promotes the CHANGELOG on a stable cut; can
> never reach 1.0 by accident), `bun run publish:packages` (CI: idempotent npm
> publish, dist-tag from the version) and `bun run check:channel` (the guard).
> The canonical flow lives in [dev/docs/releasing.md](../dev/docs/releasing.md).
> The semantic-release mechanics described below are **historical** — the launch
> _sequence_ (private→public, provenance, scope ownership, create-app exclusion)
> still holds; the _tooling_ does not.

> **⚠️ Channel model (private week vs launch).** Two channels, hard branch ↔
> version invariant (`scripts/check-channel.ts`, enforced in CI + pre-push +
> `publish.ts`): **`next` → prerelease `x.y.z-next.N`, dist-tag `next`, token
> auth**; **`main` → stable `x.y.z`, dist-tag `latest`, OIDC + provenance**.
> Private week: publish ONLY from `next` (publish job is `next`-only) so the
> stable `0.1.0` can never be burned early; игрич/start0 install via the `next`
> dist-tag. Launch: cut stable from `main` (`bun run release stable`), switch
> the publish job to `main` + OIDC. A `-next` build physically cannot reach
> `latest`.

> **🧪 TODO (later, not blocking launch): get the test suite green on Linux.**
> The CI `test` job has never passed on Linux — naive `bun test` runs everything
> in one process (1010 pass / 294 fail), and even the proper fast runner needs
> Playwright browsers + env-specific fixes (e.g. `port.test.ts` times out). For
> now the gate is muted via repo var `SKIP_TESTS=true`. Task: run the full suite
> in a Linux/Docker env, fix the offending tests/code (Playwright install step,
> env-specific tests, isolation), switch CI off naive `bun test` → the repo
> runner, then unset `SKIP_TESTS` to restore the real gate on `next`/`main`.

---

## Design decisions (the "why")

- **Lockstep versions.** `.releaserc.mjs` runs one semantic-release with N
  `@semantic-release/npm` instances (one `pkgRoot` per package) → a single
  `nextRelease.version` bumps and publishes all 8 packages together. So internal
  deps are always just `^<the one version>`.
- **Materialize, don't transform.** Every workspace `package.json` carries REAL
  ranges — no `catalog:` / `workspace:*`. The committed file is always what
  ships; no publish-time mutate/restore. A copied example installs straight from
  npm.
  - The root `workspaces.catalog` stays as a **data table only** (source of
    truth for `sync-versions`); the `catalog:` protocol is used nowhere.
  - Workspace linking still works without `workspace:*`: bun links a workspace
    package when the local version satisfies the range
    (`linkWorkspacePackages = true` in `bunfig.toml`), and under lockstep
    `^x.y.z` always satisfies the local `x.y.z`. Verified:
    `node_modules/@point0/core → packages/core`.
- **caret-on-0.x + examples.** `^0.1.0` does not satisfy `0.2.0`. At release the
  npm plugins bump `packages/*` and `@semantic-release/git` commits them — so
  examples must be bumped + committed too, or they stop linking the local build
  after a release. Handled by `@semantic-release/exec` (below) + adding
  `examples/*/package.json` and the create-app template to the git assets.
- **Local install = Verdaccio**, not `bun link` or `file:` tarballs. Faithful
  (real install path, peer deps from the consumer → no duplicate React),
  portable (localhost, no abs paths), and doubles as a publish-artifact check.
  `bun link` stays an unused option; it would need React strictly peer-only.
- **Provenance forces public.** CI publishes via OIDC Trusted Publisher
  (`id-token: write`) which auto-generates provenance, and provenance requires a
  **public package AND a public source repo**. The repo is private and packages
  are `restricted` → publishing privately through the current pipeline will
  fail. So the private week needs provenance off + a classic token (see
  Remaining).

---

## Done in this pass (point0, uncommitted)

- **`scripts/sync-versions.ts`** — `--check` (default; drift → exit 1),
  `--write`, `--point0-version X`. Materializes external deps from the catalog
  table and internal `@point0/*` → `^<version>`, across root + all packages +
  examples + template. Ran `--write`: 18 files materialized, `--check` clean,
  zero `catalog:`/`workspace:*` left. Scripts: `versions:write`,
  `versions:check`.
- **Stripped** `prepublishOnly` / `postpublish` / `pack:dist` from all 9
  packages; **deleted** `transform-package-for-publish.ts`,
  `transform-package-for-local.ts`, `restore-package.ts`,
  `pack-local-registry.ts`, `install-local-start0.ignore.sh`; removed root
  `pack:dist` / `pack:local-registry`.
- **`.releaserc.mjs`** — removed the bogus `packages/cookies-store` pkgRoot
  (would have crashed the first release); added `@semantic-release/exec`
  (`prepareCmd: sync-versions --write --point0-version ${nextRelease.version}`)
  after the npm plugins so internal ranges move to the new version; added
  `examples/*` + template to the git `assets`. Added `@semantic-release/exec` +
  `verdaccio` devDeps.
- **`bunfig.toml`** — `linkWorkspacePackages = true`.
- **`scripts/local-registry.ts`** + `bun run local-registry` — Verdaccio on
  :4873, wiped temp storage, builds, publishes all 8, keeps serving.
- **Consumers (игрич + start0)** — `@point0/*` swapped from `file:` tarballs to
  `^0.1.0`; `install-point0.js` rewritten for the Verdaccio flow (writes
  gitignored `.npmrc`, force-reinstalls `@point0/*`, keeps env/prisma bits, no
  build/pack); `.npmrc` gitignored in both.
- **Docs** — `dev/docs/local-registry.md` (enable/disable/refresh/troubleshoot).

**Verified:** `bun install` clean; workspace symlinks resolve to local packages;
`versions:check` clean; `local-registry` publishes all 8 with clean manifests
(no `catalog:`/`workspace:*`, real ranges, `@point0/engine` peer
`@point0/core: ^0.1.0`); a throwaway consumer `bun install` pulled engine +
transitive core/compiler from the registry. **Not yet run:** full typecheck/test
suite (pending).

---

## Remaining before launch

### Dep audit (point0) — done, with 2 open decisions

depcheck across the 8 packages. Applied: **compiler** now declares `fast-glob` +
`safe-stable-stringify` (it imported them but relied on hoisting — would break
consumers); **engine** dropped dead runtime deps `magic-string`, `p-retry`, `qs`
and stale devDeps `lodash`, `@types/lodash`, `@types/qs` (typecheck still
green). `@svgr/plugin-jsx` is used via a string in `assets.ts` (kept).
`fast-glob` added to the catalog table.

**Resolved — schema-adapter deps are optional peers.** The adapters
(`core/schema/{zod,yup,valibot,arktype,superstruct,typebox}`) are separate entry
points — a user pulls in ONLY their chosen schema lib, nothing auto-installs. So
the adapter libs + json-schema helpers are declared as optional
`peerDependencies` (`peerDependenciesMeta.optional`): `arktype`,
`@sinclair/typebox`, `superstruct`, `valibot`, `zod`, `@valibot/to-json-schema`,
`@sodaru/yup-to-json-schema`. Declared and discoverable in the manifest, but NOT
installed. Document per-adapter install in the docs. (Earlier
`optionalDependencies` was wrong — it auto-installs.)

**Resolved — `@point0/docs` published.** Added as the 9th `pkgRoot` in
`.releaserc.mjs`. We publish everything (all 9) — privately now, public at
launch; no code leaks while private.

Minor (still open): `compiler/src/plugin/vite.ts` has a type-only
`import type { Plugin } from 'vite'` — consider `vite` as an optional peerDep of
compiler so the published `.d.ts` resolves for consumers.

### CI auth, tests, branch protection — status

- **Token (wired).** Release step reads `NPM_TOKEN`. With a token,
  semantic-release uses token auth → no OIDC, no provenance, `restricted`
  publish — exactly the private week. Use a **granular** access token (classic
  is gone), read+write on the `@point0` scope, no 2FA/IP limits; store as repo
  Actions secret **`NPM_TOKEN`**; revoke after release. Confirm the `@point0`
  scope owner is on a plan that allows private publish (personal Pro vs npm org
  Team).
- **Tests (wired).** CI `test` job runs `bun test` sequentially and gates
  `release`. On `main` tests ALWAYS run (publication never bypasses them). On
  `next` set repo variable **`SKIP_TESTS_ON_NEXT=true`** to skip during the
  early phase (steps skip but the job still succeeds, so the prerelease still
  publishes). Unset it later to enable tests on `next` too.
- **Branch protection (BLOCKED until public / GitHub Pro).** Rulesets and
  classic protection both 403 on this private repo: "Upgrade to GitHub Pro or
  make the repo public." So protect `main` + `next` at **launch day** (repo goes
  public) — or upgrade the GitHub plan to do it now. Target: `main` + `next`,
  rules = `non_fast_forward` (block force-push) + `deletion` (block delete);
  leave `dev` unprotected (it's deliberately rewritable). This is compatible
  with the semantic-release bot's fast-forward release commits. (Note: repo
  default branch is currently `next` — confirm that's intended.)

### Manual GitHub setup needed (you, in repo settings)

- Add Actions secret `NPM_TOKEN` (granular, @point0 read+write).
- Add Actions variable `SKIP_TESTS_ON_NEXT=true` for the early private phase.
- At launch: make repo public, add the branch-protection ruleset above, remove
  `NPM_TOKEN` (→ OIDC + provenance), flip `publishConfig.access` to public.

### Private week

- Buy npm Pro ($7) on the `@point0` owner.
- Publish all 8 privately via the `next` prerelease channel (don't burn stable
  versions): classic token, provenance off → `x.y.z-next.N`.
- игрич: depend on the published private versions; on Railway add a granular
  **read-only** npm token (env + `.npmrc`). Deploy.
- start0: same, or stay on the local registry until launch.

### Launch day — open point0

- Repo `1gr14/point0` → public.
- Restore OIDC + provenance (drop `NPM_CONFIG_PROVENANCE=false` + classic
  token).
- `restricted` → `public` in all 8 `publishConfig.access`.
- Stable release from `main` → first **public** versions ship **with**
  provenance (flipping already-published private versions to public would lack
  provenance — it's attached at publish time).
- Open all 8 at once (a private dep under a public package breaks installs).
- игрич: repoint to the stable range, drop the Railway read-token, redeploy.

### After — start0 first release (gated on public point0)

- Swap start0's local `@point0/*` for published versions; drop the local
  `.npmrc` and the `install-point0.js` step.
- `main` from `dev`, make default, tag `v0.1.0` (ritual in start0
  `dev/AGENTS.md`).
- Update the start0 landing on 1gr14.dev to "available".

## After point0 ships & the release flow proves itself

Only once point0 has actually been released a few times and we're **fully
happy** with the custom release flow (`scripts/release.ts` +
`scripts/publish.ts`):

- **Migrate the other 1gr14 libs off semantic-release** — `error0`, `route0`,
  `flat`, `blank0` (boilerplate), … Drop semantic-release + `.releaserc` and add
  this same release script (adapt: most are single-package, not a lockstep
  monorepo). Per-lib, verify each.
- **Then fix the release docs in the `agents` repo** —
  `~/cc/agents/docs/1gr14/release.md` (and `new.md`) describe the
  semantic-release flow; rewrite them for the custom-script flow. The
  `1gr14-release` / `1gr14-new` skills point at those docs.

---

## Notes / watch-outs

- Verdaccio republishes the same version with new content; bun caches by
  version, so consumers must force-refresh (`install-point0.js` /
  `bun install --force`).
- `docs` package is not published (not in `.releaserc.mjs`); it kept transform
  hooks that are now removed.
- The consumer `.npmrc` is gitignored on purpose — it must never reach
  Railway/CI.
