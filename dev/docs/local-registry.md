# Local registry — running unpublished point0 in another project

To use a local point0 build in a real project (the igrich site, start0, a
scratch app) before the packages are on npm, point0 serves its `@point0/*`
packages from a throwaway local npm registry (Verdaccio). The consumer installs
them exactly like the real thing — real version ranges, real install path, peer
deps resolved from the consumer (no symlinked second React).

This works because every `@point0/*` `package.json` carries **materialized**
real versions (no `catalog:` / `workspace:*`), so what Verdaccio serves is
byte-for-byte what npm will serve at launch. See
[`sync-versions.ts`](../../scripts/sync-versions.ts).

## Enable

**1. In the point0 checkout — start the registry (keep it running):**

```sh
bun run local-registry          # build + publish all 8 packages, then serve on :4873
bun run local-registry --skip-build   # reuse the current dist/ (faster)
```

It boots Verdaccio on `http://localhost:4873` with a wiped temp storage and
publishes `@point0/core, compiler, engine, react-dom, cors, openapi, basic-auth`
and `create-point0-app` at their current version. Leave the process up; Ctrl-C
stops it and wipes the storage.

**2. In the consumer project — point `@point0` at it and install.**

Add an `.npmrc` (keep it out of git — it must never deploy):

```ini
@point0:registry=http://localhost:4873
//localhost:4873/:_authToken=local
```

and depend on the packages with normal ranges (not `file:`):

```jsonc
"@point0/core": "^0.1.0",
"@point0/engine": "^0.1.0"
```

then `bun install`. Only `@point0/*` is routed to localhost; every other dep
still comes from the real npm registry.

> In **igrich** and **start0** this is automated by `bun install-point0.js` — it
> writes the gitignored `.npmrc`, force-reinstalls `@point0/*`, and restores the
> gitignored worktree bits (`.env*`, Prisma client). Run
> `bun run local-registry` in point0 first.

## Refresh after changing point0

Verdaccio republishes the **same** version with new content on each restart, and
bun caches by version — so a plain `bun install` won't notice. To pick up
changes:

1. In point0: restart `bun run local-registry` (rebuilds + republishes).
2. In the consumer: `bun install-point0.js` (does `rm -rf node_modules/@point0`
   - `bun install --force`), or manually
     `rm -rf node_modules/@point0 && bun install --force`.

## Disable / go back to npm

Remove the `.npmrc` (or its `@point0:registry` line) and `bun install` —
`@point0/*` then resolves from the real registry again. At launch the ranges
stay as-is (`^0.1.0` etc.); only the `.npmrc` line goes away.

## Troubleshooting

- **`@point0/* not found` / `ECONNREFUSED`** — the registry isn't running. Start
  `bun run local-registry` in point0.
- **Consumer sees stale point0** — you didn't force-refresh; see _Refresh_
  above.
- **Published package is empty / missing `dist`** — `dist/` wasn't built. Run
  `bun run local-registry` without `--skip-build`.
- **`.npmrc` leaked to a deploy** — it must be gitignored; Railway/CI must
  resolve `@point0/*` from npm, never localhost.
