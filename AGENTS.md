# point0 — agent guide

Agent guide for the point0 monorepo. point0 is a fullstack TypeScript framework
on Bun; its `point0` CLI (from `@point0/engine`) drives dev/build/generate for
apps built on it. This file gets you oriented — the real conventions live in the
code, its JSDoc, and [docs/](docs/); trust those over priors.

## First-time setup (fresh checkout or worktree)

A fresh tree has no `node_modules` and no `dist/`. Bootstrap once, in order:

```sh
bun install   # deps (+ Bun's native binary on first run)
bun run build # every @point0/* dist + .d.ts, in dependency order
bun run setup # codegen across the workspace: prisma generate + point0 generate
```

- **`build` is mandatory** — every `@point0/*` imports its siblings from their
  built `dist/`. Skip it and you get hundreds of phantom
  `TS2307 Cannot find module '@point0/…'` and `point0: command not found`.
- **`setup` is codegen-only** (no DB) — needed before `bun run types`, because
  every app's `src/generated` (Prisma client + point0 points/routes/assets) is
  gitignored. (`examples/expo` is the exception: no `generate`, commits its
  `points.server.ts`.)
- `install` is safe in a fresh tree — the apps' migrate/seed lives in their own
  `setup`, not `prepare`. If it ever stops with "Bun's postinstall script was
  not run", finish with `bun node_modules/bun/install.js`.
- To run an example after building: `bun install` once more to relink the
  `point0` bin, then `bun run setup` inside the example for its SQLite DB.

## Golden rules

- **Don't read giant files whole.** `packages/core/src/point0.ts` is ~11,300
  lines; grep for the symbol, Read only that range (`offset`/`limit`). Same for
  any `>1000`-line file ([types.ts](packages/core/src/types.ts),
  [mountable.ts](packages/core/src/mountable.ts)). Serena MCP (`mcp__serena__*`)
  is nicer _if you've enabled it_, but it's off by default and this repo
  configures no MCP — Read + grep is the baseline.
- **Don't rebuild manually in the main checkout.** `bun run build:watch` is
  usually running there, so a manual `bun run build` just races it — rebuild
  only if a `dist/` is clearly stale or the user asks. In a `git worktree`
  (yours alone) rebuild freely. Either way, a fresh tree needs the bootstrap
  above.
- **Never run the full suite.** `bun test` / `bun run testa` is slow
  (integration-heavy). Use `bun run testf`, `bun test path/to/file.int.test.ts`,
  or `bun --filter '@point0/<pkg>' test` — the narrowest run that proves the
  change. Every test file carries its class in the name — `.unit` (pure logic),
  `.int` (real processes/servers, no browser), `.e2e` (real browser) — and
  `scripts/test.ts` is the single runner/planner (`--list` / `--plan`).
- **Never commit, push, publish, tag, or release on your own** — no
  `git commit/push`, `npm/bun publish`, `bun run release`/`publish:packages`,
  unless asked in the current chat. Prior approval doesn't carry over.
- **Don't create README files** — docs live in [docs/](docs/), managed
  separately.
- **Versions live in the root `workspaces.catalog`**
  ([package.json](package.json)) as a data table; each package carries the
  materialized version (no `catalog:`/`workspace:*`). Change the catalog, then
  `bun run versions:write` (CI/pre-commit run `versions:check`).
  `bun run release` bumps internal `@point0/*` ranges + the version (see
  [dev/docs/releasing.md](dev/docs/releasing.md)).

## Repo layout

```
packages/
  core/        isomorphic kernel: Point0, points-manager, eventer, super-store, env, error, navigation, schema adapters. Pure logic, no server I/O.
  engine/      server runtime + CLI + build orchestration. Owns the `point0` and `point0-project-mcp` bins; dev/build/generate, vite/bun integration.
  compiler/    source transform: walker, point detection, virtual modules, babel/mdx plugins, bun/vite plugin entry points.
  react-dom/   React/DOM bindings on top of core.
  openapi/     OpenAPI generation from points.
  basic-auth/  basic-auth helper points.    cors/  CORS helper.
  create-app/  scaffolding CLI (`create-point0-app`).
  docs/        docs content + search/embeddings; owns the `point0-docs-mcp` bin.
examples/      basic (canonical: Prisma + tailwind + wouter), better-auth, capacitor, expo, vite.
docs/          user-facing docs (don't write here unless asked).
scripts/       repo tooling (publish, local-registry, test runner/planner, setup, release).
```

## Fast navigation

| You want to…                              | Start here                                                                                                                               |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| A `Point0` API surface                    | grep (or Serena `find_symbol`) in [point0.ts](packages/core/src/point0.ts) — never read it whole                                         |
| How an app is configured                  | [examples/basic/src/engine.ts](examples/basic/src/engine.ts)                                                                             |
| How a page/component/mutation is authored | [examples/basic/src/pages/home.tsx](examples/basic/src/pages/home.tsx)                                                                   |
| Add/modify a CLI command                  | [packages/engine/src/cli.ts](packages/engine/src/cli.ts)                                                                                 |
| Engine config schema                      | [packages/engine/src/config.ts](packages/engine/src/config.ts)                                                                           |
| Compiler/transform                        | [compiler.ts](packages/compiler/src/compiler.ts), [walker.ts](packages/compiler/src/walker.ts), [file.ts](packages/compiler/src/file.ts) |
| Bun/Vite/Babel plugin glue                | [packages/compiler/src/plugin/](packages/compiler/src/plugin/)                                                                           |
| Schema adapters (zod/valibot/…)           | [packages/core/src/schema/](packages/core/src/schema/)                                                                                   |
| Test patterns                             | [packages/core/tests/](packages/core/tests/), [packages/compiler/tests/](packages/compiler/tests/)                                       |
| What's untested / what to test next       | [dev/docs/coverage.md](dev/docs/coverage.md), then `bun run cov` → `coverage/coverage.md`                                                |
| Client bundle size + its client deps      | [scripts/size.ts](scripts/size.ts) — measures, audits, and rewrites the numbers in the docs                                              |

## Commands

From repo root unless noted.

```sh
bun run build         # build all packages in dependency order
bun run build:watch   # parallel watch (usually already running in main checkout)
bun run testf         # fast: unit + int minus the solo heavies — default while iterating
bun run testa         # everything incl. e2e (slow); `tests` = solo lane only (heavy int + e2e)
bun run test:unit     # one class; also test:int, test:e2e; test:plan prints the CI plan
bun run cov           # `testf` with line coverage → coverage/coverage.md (what to test next); `cov:all` adds the heavies
bun run size          # measure Point0's client-bundle weight; `size:write` syncs the docs, `size:audit` gates in CI
bun run types         # tsgo (native-preview) --noEmit; `types:6` = tsc
bun run lint          # eslint --fix; `format` = prettier --write
```

Inside an example: `bun run dev | build | start | generate`.

## Conventions

- ESM-only (`"type": "module"`); imports use the explicit `.js` extension even
  from `.ts` sources (tsdown expects it).
- Build is tsdown. Adding a subpath export → update `exports` + `typesVersions`
  in the package's `package.json` and its `tsdown.config.ts`.
- Workspace deps use `"workspace:*"`; external deps use `"catalog:"`, declared
  once in the root.
- A package that imports a sibling maps it to source in its **`tsconfig.json`**
  `paths` (`"@point0/core": ["../core/src/index.ts"]`) — Bun uses the tsconfig
  nearest the importing file, so without it the tests run against a stale built
  `dist`. `tsconfig.build.json` stays path-less on purpose.
- Added or removed something the browser downloads? `bun run size:write` — it
  re-measures, rewrites the numbers in README + the two overviews, and fails if
  a third-party package reached the client bundle without being declared.
- Tests live in each package's `tests/` (`bun test`), fixtures under
  `tests/fixtures/`. Generated code (`examples/*/src/generated/point0/`) is
  never hand-edited.
- `bun` only — not npm/pnpm/yarn.
- After a change, run the touched package's `types` + `test` before declaring
  done — type errors in `core` cascade everywhere. Touched public API? Update
  the matching `exports`/`typesVersions` and any `examples/basic` consumer.
- **Touched public behavior? Update the docs in the same change.** Before
  declaring a task done (and before any commit), check whether the change
  affected anything the user-facing docs cover — a method, an option, a CLI
  command, an endpoint, observable behavior, the compiler's strip categories. If
  so, update the matching `docs/<category>/<slug>.md` page **and** its JSDoc
  (they must stay in sync), and re-check the `<!-- TODO(...) -->` markers. How
  the docs are structured and written: [dev/docs/docs.md](dev/docs/docs.md) — it
  covers the `<!-- TODO -->` markers and the extractor that collects them into a
  `dev/backlog/docs-todo.md` on demand (no file in the tree when none are open).
