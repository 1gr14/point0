# Server `env.vars` are silently dropped in a built server (applied only in dev)

**Status:** open · **Area:** engine / env injection / built-server runtime ·
**Impact:** any app that declares `server.env.vars` and runs the **built**
artifacts gets those variables **missing from `process.env`** at runtime — no
error, just empty. Server `env.consts` are fine; only `env.vars` are affected.

## Symptom

Declaring server vars in the engine config:

```ts
Engine.create({
  server: {
    // …
    env: {
      vars: {
        SOURCE_VERSION:
          process.env.SOURCE_VERSION || process.env.RAILWAY_GIT_COMMIT_SHA,
      },
    },
  },
})
```

works in **dev** (the value lands in `process.env.SOURCE_VERSION`) but is a
**no-op in the built/prod server**: `process.env.SOURCE_VERSION` stays whatever
it was (empty), even though the runtime config evaluated the expression
correctly and `engine.server.envVars` holds the right value.

Real-world hit: the 1gr14 site used `server.env.vars` to resolve
`SOURCE_VERSION` from Railway's runtime-injected `RAILWAY_GIT_COMMIT_SHA`. In
the deployed (built) server the release tag came out empty; the same config
works in dev. The site had to work around it with a direct
`process.env.SOURCE_VERSION = process.env.RAILWAY_GIT_COMMIT_SHA` assignment in
its `index.server.ts` before `preload()`.

## Root cause

`Engine.preload()` early-returns in built mode and never reaches the server's
`setEnvVars()` — which is the only place server `env.vars` are written to
`process.env`.

`packages/engine/src/engine.ts:200` (`Engine.preload`):

```ts
// In a process running built artifacts the work is already baked in — plugins would be dead
// weight and the env fallback could flip a production server to development — so preload is a no-op there.
if (_point0_env.build.was) {
  return this …
}
await this.server.preload({ preventSetEnvVars, nodeEnvFallback, preventLoadBunPlugins })
```

`_point0_env.build.was` = `process.env.POINT0_BUILT === 'true'`
(`packages/core/src/env.ts`), and the built server's banner sets
`POINT0_BUILT="true"` on its first line — so in prod the early `return` fires
and `Server.preload()` is never called.

`Server.preload()` (`packages/engine/src/server.ts:323`) is what applies the
vars:

```ts
if (!preventSetEnvVars) {
  this.setEnvVars({ assignToProcessEnv: true, nodeEnvFallback })
}
```

and `setEnvVars` (`packages/engine/src/server.ts:281`) writes both sets to
`process.env`:

```ts
if (assignToProcessEnv && !this.envVarsApplied) {
  this.envVarsApplied = true
  for (const [k, v] of Object.entries({ ...this.envVars, ...this.envConsts }))
    process.env[k] = v
}
```

The early-return's rationale ("the work is already baked in") holds for
`env.consts` but **not** for `env.vars`:

## Why `env.consts` survive but `env.vars` don't

`getBuildInjectedEnvs()` (`packages/engine/src/server.ts:1249`) builds the
build-time banner (`injectEnvsScript`, prepended to the server bundle) from
**`envConsts` only** (`NODE_ENV`, `POINT0_*`, cwd markers). `this.envVars` are
**not** in `injectedEnvs`. So:

- `env.consts` → baked into the banner at build → present at runtime regardless
  of `preload()`.
- `env.vars` → applied **only** by the runtime `setEnvVars()` call inside
  `Server.preload()` → which built mode skips.

Net: `env.vars` are effectively a **dev-only** feature.

## Proposed fix (the real one)

Apply server `env.vars` to `process.env` in built mode too. The value must be
**re-evaluated at runtime** (confirmed: the built bundle keeps `env.vars` as
live `process.env.…` expressions and `Engine.create` re-runs at import, so
`this.envVars` already holds the correct runtime value) — so the fix is to run
the assignment, **not** to bake `env.vars` into the banner (baking would freeze
runtime-dependent values like `RAILWAY_GIT_COMMIT_SHA` to their empty build-time
state). Options to explore:

1. In `Engine.preload`, before the `build.was` early-return, still call
   `this.server.setEnvVars({ assignToProcessEnv: true, nodeEnvFallback })` —
   keep the dev-only parts (`loadBunPlugins`, the nodeEnvFallback concern) gated
   by `build.was`, but not the env-var application. In built mode `NODE_ENV` is
   already set by the banner, so the "fallback could flip prod→dev" worry
   doesn't apply to the assignment.
2. Or split `Server.preload` so the `setEnvVars` step is reachable in built mode
   while `loadBunPlugins({ built: false })` stays dev-only.
3. Or include `envVars` in the banner **as runtime reads** rather than baked
   literals (harder; option 1/2 is cleaner).

Needs testing on both bun and vite builds, and a regression test asserting a
declared `server.env.vars` entry reaches `process.env` in a built server.

## Evidence (local repro on a built `dist/server`)

Built the consuming app, then imported the built engine and ran preload:

```
engine.server.envVars        = { SOURCE_VERSION: "TESTSHA_deadbeef" }   // runtime expr evaluated correctly
envVarsApplied BEFORE preload = false
await engine.preload(...)
envVarsApplied AFTER preload  = false                                   // ← setEnvVars never ran
process.env.SOURCE_VERSION    = ""                                      // ← not applied
// manual engine.server.setEnvVars({ assignToProcessEnv: true }) →
process.env.SOURCE_VERSION    = "TESTSHA_deadbeef"                       // logic itself is fine
```

So `this.envVars` is correct; the assignment is simply never invoked in built
mode.

## References

- Early-return: `packages/engine/src/engine.ts:200` (`Engine.preload`).
- Env application: `packages/engine/src/server.ts:323` (`Server.preload` →
  `setEnvVars`), `packages/engine/src/server.ts:281` (`setEnvVars` writes
  `{ ...envVars, ...envConsts }` to `process.env`).
- Banner (consts only): `packages/engine/src/server.ts:1249`
  (`getBuildInjectedEnvs`), used at `server.ts:1337` (`banner`).
- Built flag: `packages/core/src/env.ts` (`build.was` ← `POINT0_BUILT`).
