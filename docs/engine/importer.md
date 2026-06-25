---
index: 1000
title: Importer
description:
  Compile-time import protection — keep server code out of the client bundle,
  and the other way around.
---

Point0 compiles the same source twice: once for the server, once for the client.
That makes it easy to accidentally pull a server-only module (Prisma, a secret,
`fs`) into a file the client also reaches. The importer is the compiler's guard:
per-side rules that, at compile time, **forbid** a wrong-side import (`deny`),
**replace** it with a harmless proxy (`mock`), or mark a file as a dev-restart
trigger (`cold`).

```ts
// examples/basic/src/lib/prisma.ts
import '@point0/core/cold' // editing this file restarts the dev server
import { PrismaClient } from '@/generated/prisma/client'
import { serverEnv } from '@/lib/env/server'
import '@point0/core/server-only' // this file can never reach the client bundle
```

If any client-reachable file imports this module, the client build fails — the
server code physically cannot land in the browser bundle.

## Two ways to declare a rule

You can protect a module from **inside the module** (a marker import) or from
**the engine config** (a rule that matches the import path). Same effect.

**In-file markers** — add one of three bare imports to a file:

```ts
import '@point0/core/server-only' // deny this file on the client side
import '@point0/core/client-only' // deny this file on the server side
import '@point0/core/cold' // (dev --hot only) editing restarts the server
```

These are marker modules with **no runtime value** — `server-only.ts` and
`client-only.ts` are literally `export {}`. The compiler recognizes the
specifier string and rewrites the marker import on the wrong side; on the
correct side the import stays put and loads a harmless empty module. Use a
marker when you own the file.

**Config rules** — match the import **target** on `server.importer` /
`client.importer`, for files you can't or don't want to edit (third-party
packages, generated code):

```ts
// engine.ts
export const engine = Engine.create({
  client: {
    importer: {
      deny: [
        './lib/prisma.ts', // file paths start with a dot
        'dotenv', // bare libraries by package name
      ],
    },
  },
})
```

A `deny` config rule and a `server-only`/`client-only` marker are two distinct
code paths that produce the same denial — the markers are always on, independent
of any config.

## `deny` — forbid a wrong-side import

A denied import is rewritten to a virtual module that throws at module-eval
time. Importing it from the wrong side surfaces this message:

```
Import denied on side "server" for scope "root"
  Rule: ./lib/prisma.ts
  Importer: src/pages/home.tsx:12:8
  Import: @/lib/prisma
  Resolved: src/lib/prisma.ts

To know trace of imports to target "@/lib/prisma" from source <source-file-path> run in terminal:
point0 trace --side server --scope root "./lib/prisma.ts" "<source-file-path>"

Suggestions:
  - To see how <source-file-path> looks after compiling without client code, run in terminal: point0 compile --side server --scope root "<source-file-path>"
```

`Import denied on side "server"` (or `"client"`) is the line to grep for. (When
no scope is set, the message prints `--scope <scope>` as a literal placeholder.)
The message hands you two commands to debug it:

- [`point0 trace`](cli) — print the chain of imports that pulled the denied
  module in, so you can find which file to fix.
- [`point0 compile`](compiler) — show how a source file looks after the compiler
  strips the opposite side's code, which is why the import is denied.

## `mock` — let the server _see_ but not _run_ client code

Sometimes the server must be **allowed to see** client code (it shares a file
with a server loader) but must **not execute** it. You can't `deny` it — denying
would fail the build. You `mock` it: the import is replaced with a no-op proxy.

```ts
// examples/expo/src/engine.ts — an Expo page declares
// `const styles = StyleSheet.create({})` and imports react-native, but the
// page also carries a server loader. The server compiles the file, so it must
// see react-native — but never run it.
export const engine = Engine.create({
  server: {
    scope: 'root',
    importer: {
      mock: ['react-native', 'expo-router'],
    },
  },
})
```

The proxy comes from `createMock()` — a recursive `Proxy`. Any property access,
call, `new`, or `await` on a mocked module returns another mock, so the code
"runs" and nothing happens:

```ts
import { StyleSheet } from 'react-native' // mocked on the server
const styles = StyleSheet.create({}) // => a mock; no error, no real work
```

The same module is the **real** value on its own side. Mocking is per-side: on
the side whose `importer` config lists the module, the import resolves to a
`createMock()` proxy; on the other side, whose config doesn't mock it, the
import keeps its real value. A `mock` never denies — even with
`onDeny: 'throw'`, a mocked import emits no error.

## `cold` — dev-hot-reload only

`cold` is a different beast from `deny`/`mock`. It has **no effect on builds,
prod, or non-hot dev** — it is read only when building the server hot-reload
store under `point0 dev --hot`. It also matches the file's **own path**, not an
import target.

```ts
import '@point0/core/cold' // this file + its static-import subtree run cold
```

A cold file is externalized from the hot graph: editing it **restarts** the
server child instead of hot-swapping. Use it for server boot singletons (a DB
client, a queue connection) whose state shouldn't survive a hot swap. Cold flows
downward through static imports and stops at lazy `import()`. The config-side
equivalent is `server.importer.cold` (a list of globs); a cold rule on a client
importer is a silent no-op. Full behavior is on [dev](dev).

## `onDeny` — log in dev vs throw in build

This is the headline rule. When a `deny` or marker fires, what happens depends
on `onDeny`:

- `'log'` — `console.error` the message and keep going. The throwing virtual
  module is still emitted, so the code errors only if it actually runs.
- `'throw'` — a fatal `CriticalCompilerError`. The bundler plugin re-throws it,
  so **the build fails** (exit code 1).

You rarely set `onDeny` yourself, because Point0 sets it for you by phase:

```
dev    → onDeny defaults to 'log'   → denial is logged, dev keeps running
build  → onDeny forced to 'throw'   → denial is fatal, the build fails
```

So a wrong-side import slips through in `point0 dev` (logged, the module errors
at runtime if evaluated) but becomes a hard failure in `point0 build`. The build
is where import protection is enforced. There is no flag to make `dev` fail fast
on a denial — `dev` always logs, `build` always throws.

## How the guard works

The importer runs as part of the compiler, which is a bundler plugin (Bun or
Vite). For each file with a known side:

1. The compiler walks every import in the file.
2. A matching rule (marker, `deny`, or `mock`) rewrites the import specifier to
   a `@point0/virtual` module path. First match wins, in order: marker → `deny`
   → `mock`.
3. The bundler resolves that virtual path back through the same plugin, which
   builds the module: a `deny` becomes a module that `throw`s; a `mock` becomes
   the proxy.
4. In a build, the deny throw is a `CriticalCompilerError` → the bundle never
   completes → **the server module cannot be emitted into the client bundle.**

All three import forms are rewritten — static `import`, dynamic `import()`, and
`require()`. Import protection runs only when the [compiler](compiler) is
enabled for that side: the importer is part of the compiler plugin, so setting
`compiler: false` for a side turns its import protection off entirely — no
plugin, no rewrites, no denial. A built engine also has the compiler off (it
never compiles sources at runtime), so import protection lives in the build
itself, not in the running app.

## Pattern syntax

`deny` / `mock` / `cold` each take an array of strings or `RegExp`. Strings are
normalized so the common cases just work:

```ts
deny: [
  'react', // bare package → matches the package and everything under it
  './lib/prisma.ts', // relative path → resolved against cwd
  '/abs/path/secret.ts', // absolute path → used verbatim
  '*.server.ts', // glob starting with * → used verbatim
  /\.secret\./, // RegExp → matched with .test()
  '!react-dom', // leading ! → an exclude (un-matches a broader rule)
  './deps/package.json', // package.json → expands to a deny per dependency
]
```

A few details:

- **Bare package names** expand to `**/node_modules/<name>{,/**}`, so a rule
  like `'react'` matches the package and its whole subtree.
- **Relative patterns** need `cwd` to resolve. The engine always fills `cwd`
  (from the engine file's directory), so this only bites raw-compiler users.
  String matching uses `minimatch`; regexes use `.test()`.
- **`package.json` reference** — a pattern ending in `package.json` is read at
  compiler-init time, and **every** dependency name in it (from `dependencies`,
  `devDependencies`, `peerDependencies`, `optionalDependencies`, and the bundle
  variants) becomes its own bare-package rule. A malformed file throws and fails
  compiler init.
- **Order matters.** Rules evaluate in declared order, last match wins. With `!`
  excludes you can include a directory, exclude a subtree, then re-include a
  leaf:

  ```ts
  deny: ['./dir/**', '!./dir/special/**', './dir/special/keep/**']
  //      include dir   exclude special     re-include keep   → keep is denied
  ```

## Reference

### `ImporterOptionsInput`

Lives on `server.importer` and `client.importer` (also reachable via
`compiler.importer`).

| Option   | Type                      | Default               | What it does                                                                                                                                                        |
| -------- | ------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `deny`   | `Array<string \| RegExp>` | none                  | Forbid a matched import target. Rewrites it to a throwing module. Every mode (dev/build/prod).                                                                      |
| `mock`   | `Array<string \| RegExp>` | none                  | Replace a matched import target with a `createMock()` proxy. Every mode.                                                                                            |
| `cold`   | `Array<string \| RegExp>` | none                  | **Dev `--hot` only.** Matches the file's own path; the file + its static subtree restart instead of hot-swap. No-op outside `server.importer`. See [dev](dev).      |
| `cwd`    | `string`                  | the engine file's dir | Relative patterns and reported paths resolve against this. Auto-filled by the engine.                                                                               |
| `onDeny` | `'throw' \| 'log'`        | `'log'`               | What a denial does: `'throw'` → fatal `CriticalCompilerError` (fails the build); `'log'` → `console.error` and continue. Build forces `'throw'`; dev keeps `'log'`. |

### Marker modules

| Import                              | Effect                                                       |
| ----------------------------------- | ------------------------------------------------------------ |
| `import '@point0/core/server-only'` | The importing file is denied on the **client** side.         |
| `import '@point0/core/client-only'` | The importing file is denied on the **server** side.         |
| `import '@point0/core/cold'`        | The file (+ its static subtree) runs cold under `dev --hot`. |

Each is a no-runtime-value marker; the compiler recognizes the specifier and
rewrites the import on the wrong side. On the correct side it stays a harmless
empty module.

The compiler spots a marker by the import string it finds in the file it's
compiling. So a marker only guards a file that carries it: to guard a
third-party package this way, the package's own source must import
`@point0/core/server-only` (or `client-only`). For a dependency you can't edit,
reach for a `deny` config rule on the import target instead.

### Rule precedence

For each import, the first matching rule wins, in order: marker → `deny` →
`mock`. The marker stage only applies to the bare marker import itself (an
import of `@point0/core/server-only` or `@point0/core/client-only`); `deny` and
`mock` match the import target. An import that matches both a `deny` and a
`mock` rule is **denied**, not mocked.
