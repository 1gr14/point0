# Env modes and the explicit preload — how a point0 process boots

How NODE_ENV / .env files and the app preload work across every process point0
is involved in, and why it is designed this way. Landed in
`feat(engine): env-mode CLI` (2026-06). Read this before touching
`packages/engine/src/cli.ts`, `packages/engine/src/env-files.ts`,
`Engine.preload`, or any app's `bunfig.toml` / `preload.ts` / `index.server.ts`.

## The two Bun behaviors everything revolves around

Bun does two things to a process BEFORE the first line of user code runs:

1. **.env auto-loading.** Bun picks the file set from NODE_ENV alone — unset
   NODE_ENV means development — and loads, in order (later overrides earlier):
   `.env` → `.env.<mode>` → `.env.local` → `.env.<mode>.local` (in test mode
   `.env.local` is skipped, `.env.test.local` is not). Already-exported shell
   variables always win over files. Values support `$REF` / `${REF:-fallback}`
   expansion (even inside single quotes), `\$` escapes, `#` cuts an unquoted
   value with or without preceding whitespace. An unknown NODE_ENV (e.g.
   `staging`) behaves as development.
2. **bunfig preload.** `preload = [...]` from `bunfig.toml` in the cwd runs in
   EVERY bun process started there. Under `bun test`, a `[test].preload`
   REPLACES the main preload (it does not merge).

Why this matters: the mode must be resolved before any .env loads, not after.
Setting `NODE_ENV ??= 'production'` in CLI code is too late — dev values are
already loaded, and a `NODE_ENV=development` line inside `.env` makes the `??=`
a no-op entirely. And an app preload that validates env at import would capture
wrong values before any CLI code could fix them.

## The CLI: hermetic process, explicit env mode

The `point0` bin (`packages/engine/src/cli.ts`) ships a flag-free shebang:

```
#!/usr/bin/env bun
```

It is deliberately flag-free: passing flags needs `env -S` to split them, and
Bun's Windows bin shim mis-parses `-S` (it takes `-S` as the interpreter and
dies with `interpreter "-S" not found`), so a flagged shebang would make
`point0` unlaunchable on Windows. The flags the CLI wants are handled in code
instead:

- `--no-env-file` (don't let Bun auto-load a .env cascade for the wrong,
  startup-derived NODE_ENV) is the job of `applyEnvMode` below — each command
  resolves its own mode and makes process.env the genuine shell environment plus
  exactly that mode's cascade. Since the flag-free shebang lets Bun auto-load on
  every platform, the genuine environment is recovered from the native OS env
  block (`env-os.ts`), which Bun's JS-only auto-load never touches.
- `--no-orphans` (bun >= 1.3.14 — hence the `engines` field in `@point0/engine`)
  ties each dev/build child's process tree to its parent — it is passed on every
  spawn, not on the shebang; out of scope here, see
  [dev-lifecycle](./dev-lifecycle.md).
- The app's bunfig (and so its preload) never runs in the CLI process: the CLI
  imports the engine directly and does not need it — see "who needs plugins"
  below.

Every command that imports the user engine (`dev`, `build`, `generate`,
`compile`, `trace`, `prune`) calls `applyEnvMode`
(`packages/engine/src/env-files.ts`) BEFORE `Engine.findAndImportSelf` — because
the user's `engine.ts` reads `process.env` at module scope. It:

1. Resolves the target mode. Precedence: `--mode` flag (compile also keeps the
   `-p`/`-d`/`-t` shorthands; dev/build deliberately only have `--mode`) >
   `--env NODE_ENV=...` > shell-exported NODE_ENV > the command default
   (**production for build, development for everything else**). Invalid values
   throw.
2. Makes process.env the genuine shell environment, then loads the right-mode
   cascade on top. Because the shebang is flag-free, Bun auto-loads a cascade on
   every launch, so `restoreGenuineEnv` clears process.env and reinstates it
   wholesale from the native OS block (`readOsEnviron`), with no diffing and no
   risk of dropping a real shell export. **There is no hand-rolled dotenv
   parser**: a short-lived bun child is spawned in the app cwd with the genuine
   env plus the target NODE_ENV, and whatever its auto-load added is copied over
   (so shell-wins precedence and $REF expansion are Bun's own). The probe passes
   `--config=<empty tmp bunfig>` so the app's bunfig never runs in probes either
   (note: `--config` must be the `=` form — with a space bun treats the value as
   a script path).
3. Sets `process.env.NODE_ENV` to the resolved mode and stores a one-line
   summary in the hidden `POINT0_ENV_MODE_LOG` env var — the logger isn't
   configured yet at this point, so the engine logs it later
   (`Engine._logEnvModeDebug`, right after `applyLogger` in
   dev/build/buildWatch/generate) as a debug-level `[env]` entry:
   `NODE_ENV=production · env files: .env`. The var is consumed on logging so
   children don't repeat it; visibility follows the logger's level (the app's
   `LOG_LEVEL`, or `POINT0_LOG_LEVEL` for the default logger).

Result: `point0 build` is production by default with only the production cascade
ever loaded; `cross-env NODE_ENV=...` still works (genuine shell env wins over
the default) but is no longer needed; `point0 dev --mode test` /
`point0 build --mode development` do what they say.

## The explicit preload convention (no ambient preload)

Apps have no `preload = [...]` in bunfig at all anymore — the in-repo examples'
bunfig carries only `[run] noOrphans`; an app that ships a test suite adds a
`[test].preload` pointing at its test setup (e.g. start0), nothing else.
`src/preload.ts` stays — it is the app's process-initialization file, but it is
**imported explicitly** by the processes that need it, never run ambiently:

- `src/index.server.ts` — the server entry (engine config
  `entry: { main: './index.server.ts' }`, used for dev AND build):

  ```ts
  await import('./preload.js')
  await import('./app.server.js')

  export {} // only dynamic imports here — the order matters; this marks the file as a module for TS
  ```

- `src/preload.ts` — no guards, no conditions ("called means called"):

  ```ts
  import { engine } from './engine.js'

  await engine.preload({
    nodeEnvFallback: 'development',
    preventLoadBunPlugins: !!engine.server.viteConfig,
  })
  ```

  App-specific init (e.g. the site's USE_LT URL rewriting) lives here too, and
  runs in exactly the processes that import the file.

- **Direct script runs** (`bun src/lib/seed.ts` etc.): pass the preload on the
  command line — `bun --preload ./src/preload.ts ./src/lib/seed.ts` (see the
  `seed` scripts in the examples). The preload runs before the entry's static
  imports, so the script stays a single normal file. An
  `await import('@/preload')`-first wrapper file works too where a command line
  isn't available — but remember static imports hoist above any await, so it has
  to be a wrapper with dynamic imports, never just a first line.
- **Tests**: `[test].preload` points at the app's test setup, which imports
  `@/preload` where the suite needs app code (start0's `int.ts` does; pure unit
  setups don't).

### Who actually needs the compiler plugins (and who registers them)

`engine.preload()` does exactly two things via `server.preload`: `setEnvVars`
(`NODE_ENV` normalize + `POINT0_*` + env consts into `process.env`) and
`loadBunPlugins` (process-wide `Bun.plugin` with the point0 compiler — its
default filter matches every ts/js/md/mdx outside node_modules anywhere on disk,
which is why it must never run in foreign processes). Per process:

| process                          | plugins from                                                                                                                                                                                              |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| point0 CLI (dev/build/generate)  | NONE — generate is static analysis (Walker), builds pass plugins explicitly to `Bun.build`/vite                                                                                                           |
| dev server child                 | `index.server.ts` → `preload.ts`                                                                                                                                                                          |
| client dev child                 | generated bunfig `[serve.static]` (bun-static re-imports the engine via `POINT0_STATIC_*` env refs); it runs `engine.applyLogger()` only                                                                  |
| built prod server (`dist/`)      | none — when `_point0_env.build.was` the bundle still runs `Engine.preload`, but the gate forces `preventLoadBunPlugins: true` so only `setEnvVars` runs (the env vars must survive into prod), no plugins |
| user scripts / tests             | their explicit `await import('@/preload')`                                                                                                                                                                |
| foreign bun tools in the app dir | nothing runs at all — no ambient preload                                                                                                                                                                  |

Because the CLI no longer runs the app preload,
`engine.dev/build/buildWatch/ generate` call `this.applyLogger()` themselves so
the orchestrator's logs use the app's logger config.

### No guard inside preload.ts

`preload.ts` has no guard — it runs unconditionally ("called means called").
There is nothing to guard against: with no ambient bunfig preload, a foreign bun
tool in the app dir imports nothing of point0's, so the plugins can only load in
processes that explicitly import `preload.ts`. A guard would also be too late to
help — it sits after `import { engine }`, so reaching it already means the whole
app engine module (~500ms of dependency-graph import, plus any module-scope side
effects) has run. The only gate left inside `Engine.preload` is the objective
`_point0_env.build.was` check.

### Engine file must be side-effect free

`engine.ts`'s import graph is loaded raw (no plugins) by the CLI and by
preload.ts itself, in processes where only the CLI has fixed the env. So it must
not throw or validate at module scope. The convention: env **shapes** live in
`env/shared-shape.ts` (pure — reads like `process.env.NODE_ENV === 'production'`
for zod defaults are fine, no validation), `engine.ts` imports only shapes
(`client-shape.ts` → `shared-shape.ts`); eager validation (`shared.ts` →
`sharedEnv`, `server.ts`) is imported by runtime code (`app.server.ts`,
`root.tsx`), never by `engine.ts`.

## Facts pinned by tests

`packages/engine/tests/env-files.test.ts` spawns real bun children per scenario
(clean-shebang style and legacy style) and asserts against what Bun actually
loaded — if Bun's dotenv semantics or preload behavior drift, these fail and
point at the drift. The build/dev integration tests run the whole thing through
the test templates (`packages/engine/tests/templates/*`), which follow the same
app conventions as the examples.

## Runtime (out of scope here)

`bun dist/server/index.server.js` run locally without NODE_ENV still gets Bun's
own development-cascade auto-load — the CLI can't help a process it doesn't
start. On platforms NODE_ENV comes from the environment; locally use
`bun run start` knowing `.env`/`.env.development` apply.
