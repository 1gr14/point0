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
   REPLACES the main preload (verified, not merged).

Consequences we got burned by: `point0 build` setting
`NODE_ENV ??= 'production'` in CLI code was too late (dev values already loaded;
with a `NODE_ENV=development` line inside `.env` the `??=` was a no-op
entirely), and an app preload that validates env at import crashed or captured
wrong values before any CLI code could fix anything.

## The CLI: hermetic process, explicit env mode

The `point0` bin (`packages/engine/src/cli.ts`) starts with:

```
#!/usr/bin/env -S bun --no-orphans --no-env-file --config=/dev/null
```

- `--no-orphans` (bun >= 1.3.14 — hence the `engines` field in
  `@point0/engine`): ties the CLI's process tree to its parent — out of scope
  here, see [dev-lifecycle](./dev-lifecycle.md).
- `--no-env-file` (bun >= 1.3.3): no .env auto-loading; process.env is the
  genuine shell environment.
- `--config=/dev/null`: the app's bunfig (and so its preload) never runs in the
  CLI process. The CLI does not need it — see "who needs plugins" below.
- `env -S` splits the shebang into arguments (macOS, Linux). Windows shims and
  direct `bun .../cli.js` runs bypass the shebang — detected via
  `process.execArgv` and handled by a legacy fallback (below).

Every command that imports the user engine (`dev`, `build`, `generate`,
`compile`, `trace`, `prune`) calls `applyEnvMode`
(`packages/engine/src/env-files.ts`) BEFORE `Engine.findAndImportSelf` — because
the user's `engine.ts` reads `process.env` at module scope. It:

1. Resolves the target mode. Precedence: `--mode` flag (compile also keeps the
   `-p`/`-d`/`-t` shorthands; dev/build deliberately only have `--mode`) >
   `--env NODE_ENV=...` > shell-exported NODE_ENV > the command default
   (**production for build, development for everything else**). Invalid values
   throw.
2. Loads the right-mode cascade into process.env. **There is no hand-rolled
   dotenv parser**: a short-lived bun child is spawned in the app cwd with the
   current env plus the target NODE_ENV, and whatever its auto-load added is
   copied over (shell-wins precedence and $REF expansion are therefore Bun's
   own, forever). The probe passes `--config=<empty tmp bunfig>` so the app's
   bunfig never runs in probes either (note: `--config` must be the `=` form —
   with a space bun treats the value as a script path).
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

**Legacy fallback** (shebang bypassed): Bun already polluted process.env with a
startup cascade. `repairStartupEnv` re-reads those files through a bun probe and
drops every entry whose value matches the file value (NODE_ENV included when it
merely echoes the files). Two documented caveats (shell var that coincidentally
equals the file value; $REF-of-shell-var mismatch) exist ONLY on this path — the
shebang path never deletes anything.

## The explicit preload convention (no ambient preload)

Apps do NOT have a main `preload = [...]` in bunfig anymore (only `[test]`).
`src/preload.ts` stays — it is the app's process-initialization file, but it is
**imported explicitly** by the processes that need it, never run ambiently:

- `src/index.server.ts` — the server entry (engine config
  `entry: { main: './index.server.ts' }`, used for dev AND build):

  ```ts
  await import('./preload')
  await import('./app.server')

  export {} // only dynamic imports here — the order matters; this marks the file as a module for TS
  ```

- `src/preload.ts` — no guards, no conditions ("вызвали — значит вызвали"):

  ```ts
  import { engine } from './engine'

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

| process                          | plugins from                                                                                                                             |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| point0 CLI (dev/build/generate)  | NONE — generate is static analysis (Walker), builds pass plugins explicitly to `Bun.build`/vite                                          |
| dev server child                 | `index.server.ts` → `preload.ts`                                                                                                         |
| client dev child                 | generated bunfig `[serve.static]` (bun-static re-imports the engine via `POINT0_STATIC_*` env refs); it runs `engine.applyLogger()` only |
| built prod server (`dist/`)      | none needed — `Engine.preload` is a no-op when `_point0_env.build.was` (the bundle still contains the call; the gate makes it inert)     |
| user scripts / tests             | their explicit `await import('@/preload')`                                                                                               |
| foreign bun tools in the app dir | nothing runs at all — no ambient preload                                                                                                 |

Because the CLI no longer runs the app preload,
`engine.dev/build/buildWatch/ generate` call `this.applyLogger()` themselves so
the orchestrator's logs use the app's logger config.

### Why the old guard died

`preload.ts` used to wrap everything in
`if (engine.isFileInEngineDir() || engine.isCliFile())` to keep point0's plugins
out of foreign bun tools. But the guard ran AFTER `import { engine }` — a
foreign tool still executed the whole app engine module (~500ms import of the
engine dependency graph, plus any module-scope side effects). With no ambient
preload, foreign tools execute nothing, the guard has no job, and
`Bun.main`-based heuristics are gone from the system. The only gate left inside
`Engine.preload` is the objective `_point0_env.build.was` check.

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

`bun dist/server/app.server.js` run locally without NODE_ENV still gets Bun's
own development-cascade auto-load — the CLI can't help a process it doesn't
start. On platforms NODE_ENV comes from the environment; locally use
`bun run start` knowing `.env`/`.env.development` apply. If this ever hurts, the
wrapper entry could pin it, but that's a deliberate non-goal for now.
