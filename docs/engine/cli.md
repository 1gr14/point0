---
index: 300
title: CLI
description: The point0 command — dev, build, generate, and the inspection tools — a thin wrapper over the engine.
---

The `point0` CLI ships in [`@point0/engine`](engine-runtime). Every command finds
your [engine file](engine-config), imports it, and calls the matching engine
method — `point0 dev` runs `engine.dev()`, `point0 build` runs `engine.build()`,
and so on. The CLI's own job is small: resolve the environment, find the engine,
parse flags.

```jsonc
// package.json — the scripts a scaffolded app ships with
{
  "scripts": {
    "dev": "point0 dev --hot",
    "generate": "point0 generate",
    "build": "point0 build",
    // there is NO `point0 start` — production runs the built server directly:
    "start": "cross-env NODE_ENV=production bun run ./dist/server/index.server.js"
  }
}
```

You rarely type these by hand — they live in `package.json` and you run them with
`bun run dev` / `bun run build`. The rest of this page is one section per command,
then a full flag reference.

## point0 dev

Start the dev server and client dev servers. Thin wrapper over
[`engine.dev()`](dev).

```sh
point0 dev          # serve everything
point0 dev --hot    # + bun-native server hot reload (the scaffold default)
```

By default `dev` also **generates** the `src/generated/point0` tree before
serving and watches for changes; pass `--no-generate` to skip it, `--no-watch`
to stop restarting on change.

Narrow what runs with `--side` and `--scope`:

```sh
point0 dev --side server          # serve only the server
point0 dev --side client --scope web  # one client scope
```

Anything after `--` is forwarded to the spawned bun server process (bun-native
server only):

```sh
point0 dev -- --inspect   # pass --inspect to the server runtime
```

`--hot` hot-swaps edited points without restarting the server; cold files (the
`@point0/core/cold` subtree, the boot entry) still restart. It is
**experimental** and only affects the bun-native server — the Vite path ignores
it. See [Dev](dev) for the full restart / hot-reload model.

> There is no `point0 stop` and no lock file — a running dev tree always sits in
> a terminal, and the `--no-orphans` shebang (below) tears the whole process
> tree down when that terminal dies. See [Dev](dev).

## point0 build

Build the server and every client for production. Thin wrapper over
[`engine.build()`](build).

```sh
point0 build               # clean build of server + clients
point0 build --side client # build only the clients
```

Build **always generates first** — there is no "build without generate". It also
forces `LOG_MODE=pretty` and defaults `NODE_ENV` to `production`; building with
any other mode warns and ships unminified, inline-sourcemapped client bundles.

`--watch` rebuilds on change. With no glob it watches the **import graph** of
your build entries — no glob needed; a glob value is added on top of that:

```sh
point0 build --watch                 # watch the entries' import graph
point0 build --watch 'src/**/*.css'  # + an extra glob
```

`--keep-alive` holds the process open after a one-shot build, so a long-lived
build plugin (a bundle-analyzer server, say) keeps running until Ctrl-C:

```sh
point0 build --keep-alive
```

Other toggles: `--no-clean` (skip the pre-build clean), `--no-publicdir` (skip
copying [public assets](publicdir)). Full build flow on [Build](build).

## point0 generate

Generate the `src/generated/point0` tree — `points.server` / `points.client`,
`routes`, `meta`, `assets.d.ts`. Thin wrapper over `engine.generate()`. This
output is gitignored, so a fresh checkout must run it before typechecking.

```sh
point0 generate          # generate once
point0 generate --watch  # regenerate on change
```

It runs as part of every app's `setup` script:

```jsonc
// package.json
{ "scripts": { "setup": "… && point0 generate && …" } }
```

What each file contains is on [Generator](generator).

## point0 compile &lt;file&gt;

Print the point0-compiled output of one source file to stdout — useful to see
exactly what the [compiler](compiler) strips (server-only code, babel-plugin
rewrites).

```sh
point0 compile src/pages/home.tsx --side server
point0 compile src/pages/home.tsx -c          # -c = --side client
```

`--side` (or the `-c` / `-s` shorthands) picks which side to compile; `--scope`
is inferred from the side when there is only one. Mode shorthands `-p` / `-d` /
`-t` map to `--mode production|development|test`. `--no-babel` strips babel
plugins from the compiler options.

> **GOTCHA — `-h` is not help here.** `compile` reassigns help to `--help` only,
> so `-h` is free for `--hmr` (force the HMR fix on). This is unique to
> `compile`; every other command keeps `-h` as help.

## point0 trace &lt;target&gt; &lt;source&gt;

Trace the import chain from a `source` file to a `target` import, using the
engine's compiler. Prints each step on its own line.

```sh
point0 trace @prisma/client src/pages/home.tsx --side server
```

`--side` / `--scope` work as in `compile`; `--cwd` overrides the trace root
(defaults to the engine file's directory). Throws `Trace was not found` when
there is no path from source to target.

## point0 prune

Remove point0's temporary directories — the `@point0` temp namespace
(`node_modules/.cache/@point0`) and the server hot-reload store
(`node_modules/.cache/server-hot`). No flags. Best-effort: errors are swallowed.

```sh
point0 prune
```

## point0 points

Inspect the points your app declares, read from the generated `meta.ts`. Two
subcommands, both printing JSON. Every invocation needs at least one
`--meta <path>`.

```sh
# list points, with filters / pagination / field selection
point0 points list --meta ./src/generated/point0/meta.ts --type query --limit 20

# get the first point matching the filters
point0 points get --meta ./src/generated/point0/meta.ts --name idea
```

Filters include `--ids` / `--id`, `--tags` (every tag must match), `--scope`,
`--type`, `--name`, `--route` / `--url`, the `--endpoint-*` trio, `--valid` /
`--ssr` booleans, `--file`, `--parent-id`, `--layout-id`, and `--fields` to
select output keys. `list` adds `--limit` (default 100) and `--offset`
(default 0). These are the CLI mirror of the [project MCP](mcp-project)'s
`list_points` / `get_point` tools.

## point0 docs

Search and read the Point0 documentation offline. Needs the `@point0/docs`
package installed (`bun add -D @point0/docs`); the docs and a search index ship
inside it.

```sh
point0 docs search "server only imports"   # hybrid keyword + semantic search
point0 docs list                            # table of contents
point0 docs get cli                         # full markdown of one doc, by slug
```

`search` and `list` take `--limit` / `--offset`; `search` defaults to 8 results.
This is the CLI mirror of the [docs MCP](mcp-docs).

## The other bins

`@point0/engine` and `@point0/docs` also ship MCP servers, and there's a
separate scaffolding CLI. Each has its own page.

### point0-project-mcp

An MCP server that exposes your app's points (and `compile` / `trace`) to an AI
agent. It reads the generated `meta.ts` and re-reads it on every call, so it
never serves stale points after a `generate`.

```jsonc
// package.json
{ "scripts": { "mcp:project": "point0-project-mcp --meta ./src/generated/point0/meta.ts" } }
```

Tools: `list_points`, `get_point`, `compile`, `trace`. Full setup on
[MCP: project](mcp-project).

### point0-docs-mcp

An MCP server (shipped in `@point0/docs`) that serves the Point0 docs to an
agent — `list_docs`, `search_docs`, `get_doc`. No `--meta`, no project setup; it
runs offline.

```jsonc
// .mcp.json — run the installed copy, matching your point0 version
{ "mcpServers": { "point0-docs": { "command": "bunx", "args": ["point0-docs-mcp"] } } }
```

Full setup, plus the "always latest" variant, on [MCP: docs](mcp-docs).

### create-point0-app

Scaffold a new app. Run it once; it asks for a directory name and a bundler
([Bun or Vite](bun-vs-vite)), scaffolds the template, installs deps, and runs
`setup`.

```sh
bun create point0-app my-app          # interactive
bun create point0-app my-app --vite --no-interactive
```

`bun create point0-app` resolves to the `create-point0-app` bin. Flags:
`--vite` / `--no-vite`, `--install` / `--no-install`, `-O, --override`,
`-I, --no-interactive`. See [Getting started](getting-started).

## How a command runs

Every command does the same three things before it touches your app, in order.

**1. Resolve the env mode and load `.env` files.** A command resolves its mode
from flags (`--mode`, or the `-p` / `-d` / `-t` shorthands where present) and
calls `applyEnvMode` **before** importing your engine — your engine reads
`process.env` at module scope, so the cascade must be loaded first. Precedence:
flag mode &gt; `--env NODE_ENV=…` &gt; a shell-exported `NODE_ENV` &gt; the
command's default. The `.env` cascade (later overrides earlier) is `.env`,
`.env.<mode>`, `.env.local` (skipped in `test`), `.env.<mode>.local`; shell
exports always win over files. Defaults: `dev` / `generate` / `compile` /
`trace` → `development`, `build` → `production`.

```sh
point0 build --mode test                 # load the test cascade
point0 dev --env API_URL=http://localhost # define a var, overrides .env files
```

**2. Find the engine file.** `--engine <path>` is explicit; otherwise the CLI
checks `POINT0_ENGINE_FILE`, then auto-finds a file named `engine` (`.ts` / `.js`
/ `.tsx` / `.jsx`) in `.`, `./src`, `./lib`, and a few `point0` subfolders. Not
found:

```
Could not find engine.ts or engine.js file. Searched in: ./, ./src/.
Use --engine <path> to specify the engine file location
```

The module must export `engine` (named) or `default`, an `Engine` instance.

**3. The hermetic shebang.** The bin starts with:

```sh
#!/usr/bin/env -S bun --no-orphans --no-env-file --config=/dev/null
```

`--no-env-file` stops Bun from auto-loading any `.env` cascade before any CLI
code runs (with `NODE_ENV` unset it would assume development and load `.env` +
`.env.development`); the CLI loads the right-mode cascade itself; `--config=/dev/null` keeps your app's
`bunfig` out of the CLI process; `--no-orphans` (bun ≥ 1.3.14, no-op on Windows)
ties the whole process tree to its parent — the CLI dies when its launcher dies,
even by SIGKILL, and SIGKILLs every descendant on exit. This is why
`@point0/engine` carries an `engines` field, and why each app's `bunfig.toml`
sets `[run] noOrphans = true` to extend it to your `bun run dev` wrapper.

> **AGENT GOTCHA:** because of `--no-orphans`, a backgrounded `bun run dev &`
> dies the moment the shell that spawned it returns — run it in a real
> long-lived process, not a throwaway shell.

## Reference

### Commands

| Command | Wraps | Does |
| --- | --- | --- |
| `dev` | [`engine.dev()`](dev) | dev server + client dev servers |
| `build` | [`engine.build()`](build) | production build of server + clients |
| `generate` | `engine.generate()` | write `src/generated/point0` |
| `compile <file>` | [Compiler](compiler) | print compiled output of one file |
| `trace <target> <source>` | [Compiler](compiler) | print import chain source → target |
| `prune` | `engine.prune()` | remove temp dirs + hot store |
| `points list` / `points get` | analyzer `meta.ts` | inspect declared points (JSON) |
| `docs search` / `list` / `get` | `@point0/docs` | search / read the docs offline |

### Shared flags

Available across most commands (each command's full set is in its section above).

| Flag | On | Effect |
| --- | --- | --- |
| `--engine <path>` | dev, build, generate, compile, trace | engine file, absolute or relative to cwd |
| `--mode <mode>` | dev, build, compile | `production` \| `development` \| `test` — picks the `.env` cascade |
| `-p` / `-d` / `-t` | compile | shorthand for `--mode production` / `development` / `test` |
| `--env <name=value>` | dev, build | define a var (repeatable); overrides `.env` files |
| `--side <side>` | dev, build, compile, trace | `server` or `client` |
| `--scope <scope>` | dev, build, compile, trace | one scope (inferred from side when single) |

### point0 dev flags

| Flag | Effect |
| --- | --- |
| `-G, --no-generate` | skip generation before serving |
| `-W, --no-watch` | do not restart / regenerate on change |
| `-w, --watch [glob]` | watch glob(s); no value = server config's `devWatchGlob` |
| `--side <side>` / `--scope <scope>` | serve one side / one scope |
| `--entry <name\|path>` | server entry points (comma-separated or repeated) |
| `--hot` | server hot reload (bun-native, experimental) |
| `--env` / `--mode` / `--engine` | see [shared flags](#shared-flags) |
| `-- <args>` | forwarded to the spawned bun server process |

### point0 build flags

| Flag | Effect |
| --- | --- |
| `-w, --watch [glob]` | watch the entries' import graph; a glob adds to it |
| `--side <side>` / `--scope <scope>` | build one side / one scope |
| `-C, --no-clean` | do not clean before building |
| `-P, --no-publicdir` | do not copy the public dir |
| `-k, --keep-alive` | hold open after the build (for long-lived plugins) |
| `--env` / `--mode` / `--engine` | see [shared flags](#shared-flags) |

### point0 compile flags

| Flag | Effect |
| --- | --- |
| `--side <side>` / `-c` / `-s` | compile side (`-c` = client, `-s` = server) |
| `--scope <scope>` | compile scope (inferred from side when omitted) |
| `-b, --built` | treat the engine as built (else `POINT0_BUILT === 'true'`) |
| `-B, --no-babel` | strip babel plugins from compiler options |
| `-h, --hmr` / `-H, --no-hmr` | force the HMR fix on / off (else engine config) |
| `-p` / `-d` / `-t` / `--mode` / `--engine` | see [shared flags](#shared-flags) |

### Environment variables

| Var | Effect |
| --- | --- |
| `POINT0_ENGINE_FILE` | engine file fallback when no `--engine` |
| `POINT0_DEV_SERVER_HOT='true'` | enables dev server hot reload when `--hot` is omitted |
| `POINT0_BUILT='true'` | `compile` / `trace` treat the engine as built |
| `POINT0_MODULE_PRELOAD='false'` (also `0`/`off`) | kill switch: disables per-page modulepreload (manifest emission at build + link injection at serve); any other / unset value keeps it on |
| `NODE_ENV` | mode resolution (after flags and `--env`) |
| `LOG_MODE` | `build` forces `pretty` |

<!-- TODO(med): `point0 --version` prints a hardcoded `0.1.0` (cli.ts), not the installed `@point0/engine` version — fix the bug rather than document the stale string. -->
