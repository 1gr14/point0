# point0 — Agent Guide

Fullstack TypeScript framework. Bun-based monorepo. The CLI `point0` (provided by `@point0/engine`) drives dev/build/generate for apps that consume the framework.

## Golden rules

- **Never read `packages/core/src/point0.ts` in full** — it is ~12,750 lines. Always use Serena MCP (`mcp__serena__find_symbol`, `get_symbols_overview`, `find_referencing_symbols`) to locate and read only the symbols you need. The same applies to any other `>1000 line` file (e.g. [packages/core/src/types.ts](packages/core/src/types.ts), [packages/core/src/mountable.ts](packages/core/src/mountable.ts)).
- **Use Serena MCP for navigation and edits** by default. Prefer `find_symbol` / `replace_symbol_body` / `insert_after_symbol` over Read+Edit for any change inside a class/function. Fall back to Read/Edit only for tiny config files or when Serena cannot resolve the symbol.
- **Do not create README files.** Docs live under [docs/](docs/) and are managed separately.
- Use catalog deps. Match versions via the root `workspaces.catalog` in [package.json](package.json) — don't pin per-package.
- **Never commit, push, publish, tag, or release on your own.** No `git commit`, `git push`, `npm publish`, `bun publish`, `pack:dist`, semantic-release, or any other state-changing remote/registry action unless the user explicitly asks for it in the current chat. A prior approval does not carry over.
- **Never run the full test suite.** The repo's full `bun test` / `bun run testa` is slow (integration-heavy). Default to a focused run: `bun test path/to/file.test.ts` or `bun --filter '@point0/<pkg>' test`. Only run a package's full `test` script when it is known to be fast (pure unit tests, no Playwright/network/fs-integration). When unsure, ask — or pick the narrowest run that proves your change.
- **Don't rebuild manually.** The developer almost always has `bun run build:watch` running, so `@point0/*` dists rebuild on save. Skip `bun run build` / per-package `build` after edits unless something is clearly out of date (e.g. a `dist/` import resolves to stale code) or the user asks for it.

## Repo layout

```
packages/
  core/         shared logic (client + server). The framework's "kernel": Point0, points-manager, eventer, super-store, env, error, navigation, schema adapters.
  engine/       server runtime + CLI + build pipeline orchestration. Owns `point0` and `point0-project-mcp` bins, dev/build/generate, vite/bun integration, MCP server.
  compiler/     source transform: file walker, point detection, virtual modules, babel/mdx plugins, bun/vite plugin entry points.
  react-dom/    React/DOM bindings on top of core.
  openapi/      OpenAPI generation from points.
  basic-auth/   basic-auth helper points.
  cookie-store/ cookie-backed store integration.
  cors/         CORS helper.
  create-app/   scaffolding CLI (`create-point0-app`-style).
examples/
  basic/        canonical reference app (Prisma + tailwind + wouter). Use this when you need to see how a real app wires things up.
  better-auth/ capacitor/ expo/ vite/   integration variants.
docs/           user-facing docs (don't write here unless asked).
scripts/        repo tooling (publish/local-registry/test-parallel).
```

### Package roles in one line
- `@point0/core` → isomorphic primitives, types, hooks. Pure logic, no server I/O.
- `@point0/engine` → runs an app: spins server, drives clients, watches files, generates artifacts, exposes CLI + MCP.
- `@point0/compiler` → transforms user source (points discovery, virtual modules, MDX, env consts) for bun/vite/babel.

## Fast navigation

| You want to… | Start here |
|---|---|
| Understand a `Point0` API surface | Serena `find_symbol` in [packages/core/src/point0.ts](packages/core/src/point0.ts) — never read the whole file |
| See how an app is configured | [examples/basic/src/engine.ts](examples/basic/src/engine.ts) |
| See how a page/component/mutation is authored | [examples/basic/src/pages/home.tsx](examples/basic/src/pages/home.tsx) |
| Add/modify a CLI command | [packages/engine/src/cli.ts](packages/engine/src/cli.ts) |
| Touch engine config schema | [packages/engine/src/config.ts](packages/engine/src/config.ts) |
| Compiler/transform behavior | [packages/compiler/src/compiler.ts](packages/compiler/src/compiler.ts), [walker.ts](packages/compiler/src/walker.ts), [file.ts](packages/compiler/src/file.ts) |
| Bun/Vite/Babel plugin glue | [packages/compiler/src/plugin/](packages/compiler/src/plugin/) |
| Schema adapter (zod/valibot/yup/arktype/typebox/superstruct) | [packages/core/src/schema/](packages/core/src/schema/) |
| Test patterns | [packages/core/tests/](packages/core/tests/), [packages/compiler/tests/](packages/compiler/tests/) |

## Commands

Run from repo root unless noted.

```sh
bun run build          # build all packages in dependency order
bun run build:watch    # parallel watch for @point0/*
bun run testa          # test-parallel (non-slow)
bun run testf          # fast subset (no slow, no test-utils)
bun run tests          # only slow tests
bun run types          # tsc --noEmit across packages
bun run lint           # eslint --fix
bun run format         # prettier --write
```

Inside an example app (e.g. `examples/basic`): `bun run dev`, `bun run build`, `bun run start`, `bun run generate`.

## Conventions

- ESM-only (`"type": "module"`); imports use explicit `.js` extension even from `.ts` sources (tsup expects this).
- Each public package has multiple subpath exports — when adding a new entry point, update both `exports` and `typesVersions` in its `package.json` and the `tsup.config.ts`.
- Workspace deps use `"workspace:*"`; external deps use `"catalog:"` and are declared once in the root `package.json`.
- Tests live in each package's `tests/` directory and run with `bun test`. Fixtures go under `tests/fixtures/`.
- Generated code (under `examples/*/src/generated/point0/`) is produced by `point0 generate` — never hand-edit.
- The user runs `bun` exclusively (not npm/pnpm/yarn). Use `bun install`, `bun --filter`, `bunx`, etc.

## When making changes

1. Locate the symbol with Serena first (`get_symbols_overview` on a file, then `find_symbol` for the target).
2. For changes inside `point0.ts` or other large files, you can edit by hand (Edit/Write are fine) — just don't pull the whole file into context. Use Serena to find the symbol, Read only the relevant range with `offset`/`limit`, or use `replace_symbol_body` / `insert_after_symbol` when convenient.
3. After edits, run the relevant package's `types` and `test` scripts before declaring done. Type errors in `core` cascade everywhere.
4. If you touched public API: update the matching `typesVersions` / `exports` block and any consumer in `examples/basic`.
