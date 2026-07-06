# Contributing to point0

Thanks for considering a contribution! point0 follows the standard GitHub flow:
**fork → branch → pull request into `main`**. `main` is the one trunk; releases
are cut from it by tagging (you don't need to touch that).

## Setup

point0 is a Bun monorepo. After cloning your fork (a fresh tree has no
`node_modules` / `dist`):

```sh
bun install      # deps (+ Bun's native binary on first run)
bun run build    # build every @point0/* package (siblings import from dist/)
bun run setup    # codegen across the workspace (prisma generate + point0 generate)
```

[AGENTS.md](AGENTS.md) is the full developer guide — repo layout, conventions,
and the fast/slow test split. Read it before a non-trivial change.

## Making a change

1. Branch off `main`: `git checkout -b my-fix`.
2. Make your change. Keep it focused; match the surrounding code's style.
3. Run the relevant checks locally (the narrowest run that proves your change):
   ```sh
   bun run testf                       # fast test subset
   bun test packages/<pkg>/tests/x.test.ts   # one file
   bun run types && bun run lint       # typecheck + lint
   ```
4. Add a bullet under `## Unreleased` in [CHANGELOG.md](CHANGELOG.md) if your
   change is user-visible.
5. Open a pull request against `main`.

## CI

Every pull request runs the full cross-OS test matrix (Linux + Windows)
automatically, plus a format + lint check (`prettier --check` + `eslint`, no
autofix) — together they are the merge gate. The format/lint check runs on
_every_ PR, even a docs-only one where the test matrix is skipped, so run
`bun run format && bun run lint` before pushing. PRs from forks run **without
repository secrets**, and nothing a PR does can ever publish to npm (only a
maintainer's release tag publishes), so it's safe to propose anything.

You don't normally need CI before opening a PR, but if you want to run it on a
branch (in a clone of this repo, not a fork) without a PR, add a flag to your
commit message:

- `--run-tests` — run the full matrix.
- `--run-tests=linux` (or `=windows`, `=linux,windows`) — run only those OSes.

Use `--skip-ci` (or GitHub's native `[skip ci]`) to skip CI on a trivial commit.

## Merging & attribution

PRs are **squash-merged**, so `main` keeps a clean, linear history — one commit
per PR. Your authorship is preserved: GitHub records you as the commit author
(and adds `Co-authored-by:` for everyone who committed to the PR), so you show
up in the contributors list. The full commit-by-commit detail stays on the PR
page.

## Releases

Releasing is maintainer-only and tag-driven — see
[dev/docs/releasing.md](dev/docs/releasing.md). You never need to bump versions
or tag in a PR.
