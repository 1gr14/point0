---
index: 800
title: Project MCP
description:
  An MCP server that lets an agent navigate your Point0 project — list points,
  find one by URL, compile a file, trace an import chain.
---

`point0-project-mcp` is an [MCP](https://modelcontextprotocol.io) server shipped
with `@point0/engine`. Point it at your project and an agent (Claude Code,
Cursor, …) gets four tools for navigating the codebase: list every
[point](points), find one by URL, see what a file compiles to on the server vs.
the client, and trace why one file imports another. It reads a generated
`meta.ts`, so it answers questions about _your_ points, not generic ones.

```jsonc
// .mcp.json (Claude Code) — or .cursor/mcp.json for Cursor (byte-identical)
{
  "mcpServers": {
    "point0-project": { "command": "bun", "args": ["run", "mcp:project"] },
    "point0-docs": { "command": "bun", "args": ["run", "mcp:docs"] },
  },
}
```

```jsonc
// package.json — the script the config above runs
"mcp:project": "point0-project-mcp --meta ./src/generated/point0/meta.ts",
```

`create-point0-app` writes both files for you, so a fresh app has the project
MCP (and the [docs MCP](mcp-docs)) wired out of the box.

## Wiring it in

The config calls `bun run mcp:project`, not the bin directly. That indirection
matters: the script runs with the working directory set to the project root, so
a relative `--meta` path resolves correctly and the workspace
`point0-project-mcp` bin is found.

```jsonc
// .mcp.json — Claude Code reads this from the project root
{
  "mcpServers": {
    "point0-project": { "command": "bun", "args": ["run", "mcp:project"] },
  },
}
```

The same JSON goes in `.cursor/mcp.json` for Cursor — the two files are
identical; only the location differs.

`create-point0-app` writes only these two files — the Claude Code and Cursor
configs. Other MCP clients (VS Code, Windsurf, Zed, …) aren't scaffolded, but
the server is plain stdio: give any stdio-MCP client the same `command`/`args`
(`bun run mcp:project`) in its own config location.

> **NAME GOTCHA.** Three names look alike, don't mix them up: the **bin** is
> `point0-project-mcp`; the server's advertised **name** is `point0-project`
> (the key under `mcpServers`); the **docs** server is a separate bin,
> `point0-docs-mcp`. An older `point0-mcp` bin name shows up in some configs in
> the wild — it does not exist. Use `point0-project-mcp`.

## The `--meta` flag

The server takes one or more `--meta <path>` flags and nothing else:

```sh
point0-project-mcp --meta ./src/generated/point0/meta.ts
```

```sh
# multiple metas — one MCP across several apps in a monorepo
point0-project-mcp --meta ./apps/web/src/generated/point0/meta.ts \
                   --meta ./apps/admin/src/generated/point0/meta.ts
```

Rules, enforced at parse time:

- **At least one `--meta` is required** — none throws
  `At least one '--meta <path>' flag is required.`
- **Each `--meta` must be followed by a path** — a missing value, or a value
  that starts with `--`, throws `Each '--meta' flag must be followed by a path.`
- A relative path resolves against the working directory, which is why you
  launch via `bun run mcp:project` (cwd = project root).

There are no other flags — no `--help`, no `--version`. Anything that isn't a
`--meta` pair is ignored.

> **CONNECT GOTCHA.** `--meta` is validated lazily: the server connects fine
> even with no `--meta`, and the "required" error only surfaces on the **first
> tool call**. A clean connection does not mean the flags are right.

## The `meta.ts` it reads

The MCP does not analyze your source live. It loads a generated `meta.ts` — a
snapshot of every point: id, type, name, tags, route, endpoint, source position,
validity, SSR flag, parents, layouts. You produce it by setting `generate.meta`
in the [engine config](engine-config):

```ts
// src/engine.ts
export const engine = Engine.create({
  file: import.meta.url,
  generate: {
    meta: './generated/point0/meta.ts', // the file the MCP reads
    assetsTypes: './generated/point0/assets.d.ts',
  },
  // …
})
```

Run [`point0 generate`](generator) (your app's `generate` script) once and the
meta appears. It lives under `src/generated/`, which is gitignored — so a fresh
checkout must run `generate` before the MCP can answer.

You **do not restart the MCP** after regenerating. The server is long-lived; it
re-checks each meta's modification time on every tool call and re-imports it
when it changed. After `point0 generate` rewrites the meta, the next tool call
sees the new points.

## Four tools

### `list_points` — list with filters

Lists points, with filtering, pagination, and optional field selection.

```jsonc
// arguments
{ "type": "page", "ssr": true, "fields": ["id", "name", "route"], "limit": 50 }
```

```jsonc
// structuredContent
{
  "points": [
    /* … */
  ],
  "total": 12,
  "hasMore": false,
  "nextOffset": null,
}
```

`limit` defaults to `100`, `offset` to `0`. `hasMore` is true when
`total > offset + limit`, and `nextOffset` is the offset to pass next (otherwise
absent). The result also comes back as pretty-printed JSON text, so an agent
that ignores `structuredContent` still reads it.

### `get_point` — first match

Returns the first point matching the filters — same filter shape as
`list_points`, minus `limit`/`offset`. This is the tool an agent reaches for
when you hand it a concrete coordinate and ask "what point is this?": _here's my
URL, find me the page_, or _find me the layout named `dashboard`_.

Ask for one field and you get just that — the cheapest way to resolve a URL to a
point id:

```jsonc
// arguments — "here's my URL, find me the page serving it"
{ "url": "/mcp", "fields": ["id"] }
```

```jsonc
// structuredContent
{ "id": "root:page:mcpPage" }
```

Drop `fields` and the full point comes back — the same snapshot `list_points`
returns, so an agent can read everything it knows about that point in one call:

```jsonc
// arguments — "find me the layout named dashboard, with all its details"
{ "type": "layout", "name": "dashboard" }
```

```jsonc
// structuredContent — the full point record
{
  "id": "root:layout:dashboard",
  "scope": "root",
  "type": "layout",
  "name": "dashboard",
  "tags": ["root", "layout"],
  "description": "App shell with the sidebar nav.",
  "route": "/dashboard",
  "endpoint": null,
  "pos": { "file": "/abs/src/layouts/dashboard.tsx", "line": 4, "column": 0 },
  "valid": true,
  "errors": [],
  "ssr": true,
  "parents": [
    { "id": "root:root:root", "scope": "root", "type": "root", "name": "root" },
  ],
  "layouts": [],
}
```

That record is what makes the MCP useful: from a single URL or name the agent
learns the point's `id`, its source `pos` (file + line, so it can jump straight
to the definition), whether it server-renders (`ssr`), its `endpoint` (HTTP
method + route) if it has one, and the `parents`/`layouts` it sits inside. A
query or mutation comes back with its `endpoint`
(`{ "method": "POST", "route": "/_point0/root/mutation/sign-in" }`) instead of a
page `route`.

No match is **not an error**: the text comes back as `"null"` and
`structuredContent` is absent.

### `compile` — see the compiled output

Shows what a file compiles to, using the compiler options from your engine.
Useful for seeing which server-only or client-only code is stripped — the same
transform as [`point0 compile`](compiler).

```jsonc
// arguments
{ "file": "src/mcp.points.tsx", "side": "server", "scope": "root" }
```

```ts
// structuredContent.code — server side: the `.lets` page/action stay as runtime calls
import { root } from './lib/root.js';
export const mcpPage = root.lets('page', 'mcpPage', '/mcp').tag('root', 'page').page(() => <div>MCP page</div>);
export const mcpActionAction = root.lets("action", "mcpAction", 'GET', '/api/mcp').tag('root', 'action').action(() => ({
  ok: true
}));
```

`side` (`'server'` / `'client'`) and `scope` are optional — Point0 infers them
when it can. `hmr: true` turns on the HMR fix in the output; it defaults to
**off** here (unlike the CLI, which inherits the engine's `hmrFix` when you pass
no flag). A relative `file` resolves against the working directory. A compile
error is surfaced as a thrown MCP error.

### `trace` — follow an import chain

Traces how one file reaches an import target, through the compiler — useful for
understanding why a file pulls in another (and catching a server util that
leaked to the client).

```jsonc
// arguments
{
  "target": "./mcp-target.js",
  "source": "src/mcp-source.ts",
  "side": "server",
  "scope": "root",
}
```

```jsonc
// structuredContent — each line is "file:line:column"
{ "trace": ["/abs/src/mcp-source.ts:3:0", "/abs/src/mcp-mid.ts:1:0", "…"] }
```

`source` resolves against the working directory if relative. `cwd` is optional —
it defaults to the **engine file's directory**, not the process cwd. If no chain
is found, the tool throws `Trace was not found`.

## Reference

### `--meta`

| Flag            | Meaning                                                                                                                 |
| --------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `--meta <path>` | A generated `meta.ts` to load. Repeatable. At least one required. Relative paths resolve against the working directory. |

No other flags exist (`--help` / `--version` are not handled). Validation is
lazy: errors surface on the first tool call, not at connect.

### Tools

| Tool          | Does                                    | Key inputs                                                 |
| ------------- | --------------------------------------- | ---------------------------------------------------------- |
| `list_points` | List points with filtering + pagination | filter fields, `fields`, `limit` (100), `offset` (0)       |
| `get_point`   | First point matching the filter         | filter fields, `fields`                                    |
| `compile`     | Compiled output of a file               | `file`\*, `side`, `scope`, `hmr`, `engineFile`             |
| `trace`       | Import chain from a source to a target  | `target`_, `source`_, `side`, `scope`, `cwd`, `engineFile` |

`*` = required.

### Filters (shared by `list_points` + `get_point`)

| Filter           | Type                 | Matches                                                              |
| ---------------- | -------------------- | -------------------------------------------------------------------- |
| `id`             | `string`             | exact point id                                                       |
| `ids`            | `string[]`           | id is in the list                                                    |
| `tags`           | `string \| string[]` | string = any tag equals it; array = **all** required                 |
| `scope`          | `string`             | exact scope                                                          |
| `type`           | `string`             | exact type — `page` / `layout` / `query` / `mutation` / `action` / … |
| `name`           | `string`             | exact name                                                           |
| `route`          | `string`             | exact route definition                                               |
| `url`            | `string`             | full URL or path, matched against `point.route` via route0           |
| `endpointMethod` | `string`             | exact endpoint HTTP method                                           |
| `endpointRoute`  | `string`             | exact endpoint route definition                                      |
| `endpointUrl`    | `string`             | full URL or path, matched against the endpoint route                 |
| `valid`          | `boolean`            | point validity                                                       |
| `ssr`            | `boolean`            | SSR flag                                                             |
| `file`           | `string`             | exact source file path (`point.pos.file`)                            |
| `parentId`       | `string`             | one of the point's parents has this id                               |
| `layoutId`       | `string`             | one of the point's layouts has this id                               |

`fields` selects which point fields come back. Selectable: `id`, `scope`,
`type`, `name`, `tags`, `description`, `route`, `endpoint`, `pos`, `valid`,
`errors`, `ssr`, `parents`, `layouts`. The `import` thunk is never selectable
and never appears in output.

### `compile` / `trace` engine resolution

Both tools import the real engine from the meta, then pick a side and scope.

- **`engineFile`** — required only when several metas each carry an engine; with
  one engine it's inferred. An unknown file, or zero engines, throws.
- **`side` / `scope`** — inferred when unambiguous. A scope available on both
  server and client without an explicit `side` throws, as does a missing scope.
- **Compiler disabled** for the chosen side/scope throws
  `Compiler is disabled for <side> scope "<scope>"`.
- Both set `NODE_ENV` to `development` when it's unset, and **throw** on a value
  outside `production` / `development` / `test`. (`list_points` / `get_point`
  never touch `NODE_ENV`.)

#### Compiling against a built project

`compile` and `trace` apply the same transform as a dev build by default. To run
the **built** transform instead — the same as `point0 compile --built` — pass
`built: true` on the call:

```jsonc
{ "file": "src/pages/home.tsx", "built": true } // compile / trace input
```

It mirrors the CLI flag, per call. (`POINT0_BUILT=true` in the server's env is
the fallback default when the input is omitted.)

## See also

- [Generator](generator) — produces the `meta.ts` this server reads.
- [Compiler](compiler) — the transform behind `compile` and `trace`; also the
  `point0 compile` CLI.
- [CLI](cli) — `point0 generate` and friends.
- [Docs MCP](mcp-docs) — the companion `point0-docs-mcp` server for searching
  the Point0 docs.
