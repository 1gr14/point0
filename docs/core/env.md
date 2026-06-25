---
index: 600
title: Env
description:
  The env helper — mode, side, scope, runtime, os, build, vars — plus how Point0
  keeps secrets out of the client bundle.
---

"Env" in Point0 covers two separate things. The first is the **`env` helper**
from `@point0/core` — one object that answers _where am I running_: server or
client, which mode, which runtime. The second is **env variables**: who can read
them, and which ones reach the browser. They share a name and nothing else; keep
them apart.

```ts
import { env } from '@point0/core'

env.mode.is.production // => true on a prod build
env.side.is.server // => true on the server, false in the browser
env.vars.NODE_ENV // => 'production' — reads process.env, typed
```

The `env` helper is also the safe boundary. Most of its fields are **rewritten
to literals at compile time** — `env.side.is.server` becomes `false` in the
client bundle, and a server-only branch behind it is deleted as dead code. The
rest of this page shows each field, then how env variables cross the compile
boundary without leaking secrets.

## The `env` helper at a glance

One import, seven fields:

```ts
import { env } from '@point0/core'

env.mode // production / development / test
env.side // server / client (+ ssr flag)
env.scope // which client/root, in a multi-client app
env.runtime // browser / nodejs / bun / deno / reactNative / worker
env.os // ios / android / linux / mac / windows
env.build // was this code bundled by `point0 build`?
env.vars // the env variables, as a typed record
```

Every field but `vars` and `build` follows the same shape: `.name`,
`.is.<value>`, and (except `mode`) a `.define(...)` that picks a value by the
current field. `env.build` is the odd one out — it exposes `.was` (boolean) and
`.define` instead of `.name`/`.is` (see its section below). We'll go field by
field, then come back to `vars`.

## `env.side` — server or client

The one you reach for most. `is` is the cheap check; `name` is the
discriminator.

```ts
env.side.is.server // => true on the server
env.side.is.client // => true in the browser
env.side.is.ssr // => true while a server render is in progress (server only)

if (env.side.name === 'server') {
  // TS narrows here — name is the discriminator
}
```

> **Gotcha:** `if (env.side.is.client)` does **not** narrow `env.side.name` for
> TypeScript. Branch on `env.side.name === 'server'` when you need narrowing.

### `env.side.define` — pick a value per side

`define` returns a different value on each side. The missing side is
`undefined`:

```ts
// isomorphic helper: real client impl in the browser, server impl on the server
export const trackEvent = env.side.define({
  client: mixpanelClientTrackEvent,
  server: mixpanelServerTrackEvent,
})

env.side.define.server(secret) // => secret on the server, undefined on the client
env.side.define.client(token) // => token on the client, undefined on the server
```

Because the compiler replaces the whole `define(...)` call with the live branch,
the other side's value (and its imports) is removed from the bundle — this is
how an isomorphic helper ships only the right implementation to each side.

> **Gotcha:** `env.side.define.unsafe.server(v)` types the result as `T` (no
> `| undefined`), but at runtime it **still returns `undefined` on the wrong
> side**. The `unsafe` is a type assertion, not a behavior change — use it only
> when you've already guaranteed the side some other way.

## `env.mode` — production / development / test

```ts
env.mode.name // => 'production' (whatever NODE_ENV is)
env.mode.is.production // => true
env.mode.is.development // => false
env.mode.is.test // => false
```

`name` is `NODE_ENV` verbatim, so it can be any string — the three booleans
cover the normal values (`production`, `development`, `test`). There's no
`env.mode.define`; mode only exposes `name` and `is`.

> **Gotcha:** TypeScript can't narrow `env.mode.is.*` from
> `env.mode.name === 'development'`, because `name` is a free string. Use the
> `is` booleans directly.

## `env.scope` — which client/root

In a multi-client app (one server, several clients), `scope` says which one this
code belongs to. It mirrors `side`: `name`, `is`, and `define`.

```ts
env.scope.name // => 'web' | 'admin' | … — the active scope
env.scope.is.web // => true when the scope is 'web'

env.scope.define({ web: webConfig, admin: adminConfig }) // value for the active scope
env.scope.define.admin(x) // => x only in the 'admin' scope, else undefined
```

> **Gotcha:** `env.scope.name` (and `is`/`define`) **throws** when
> `POINT0_SCOPE` isn't set: `POINT0_SCOPE is not set in env vars`. In a normal
> Point0 app the engine always sets it; you only hit this reading scope before
> the engine boots.

To type the scopes, declare them once — see
[`EnvDefinition`](#typing-env-globally).

## `env.runtime` and `env.os`

Both detect the host and follow the same `name` / `is` / `define` shape.

```ts
env.runtime.name // 'browser' | 'reactNative' | 'nodejs' | 'bun' | 'deno' | 'worker'
env.runtime.is.bun // => true under Bun
env.runtime.define({ bun: x, nodejs: y }) // value for the active runtime

env.os.name // 'ios' | 'android' | 'linux' | 'mac' | 'windows'
env.os.is.ios // => true on iOS
env.os.define({ ios: a, android: b }) // value for the active OS
```

When the runtime or OS can't be detected, `name` is `undefined` and `is.unknown`
is `true`. You can only use the `'unknown'` key in `is` / `define` when the type
allows an undetectable value — i.e. when the declared union includes
`undefined`.

Detection is best-effort and reads the host directly: runtime checks
`POINT0_RUNTIME` first, then `navigator.product === 'ReactNative'` (→
`reactNative`), `window`/`document` (→ `browser`), then `Bun` / `Deno` /
`process.versions.node` globals. OS checks `POINT0_OS` first, then matches
`navigator.userAgent` / `navigator.platform` and finally `process.platform`
(iphone/ipad → `ios`, android → `android`, win → `windows`, darwin/mac → `mac`,
linux/x11 → `linux`). Set `POINT0_RUNTIME` / `POINT0_OS` to pin a value when the
host can't be sniffed — this is also what the per-side `compiler.runtime` /
`compiler.os` build options do (see
[the compile boundary](#how-the-compile-boundary-stays-safe)).

## `env.build` — was this bundled?

`env.build.was` is `true` only inside a `point0 build` bundle, `false`
everywhere else (dev, tests, source). Use `define` to pick a value by build
state:

```ts
env.build.was // => false in dev, true in a production build

env.build.define({
  before: devOnlyValue, // when NOT built (dev)
  after: prodValue, // when built
})
```

Like the other fields, the compiler inlines `env.build.was` to a literal during
the build, so the unused branch is eliminated.

> **Gotcha:** the runtime fallback for `build.was` (reading `POINT0_BUILT`) only
> matters when `@point0/*` is left **external** in the bundle
> (`bunBuildConfig: { packages: 'external' }`). In a normal inlined build the
> getter is dead code; if it weren't replaced, `build.was` would stay `false`
> and the engine would assume an un-built app and serve nothing.

## `env.vars` — reading env variables

`env.vars` is a typed read of your env variables. On the server it's essentially
`process.env` with types attached; on the client it transparently reads the
values Point0 injected into the page instead of a `process` that doesn't exist.
It's a convenience, not a mandate — most apps validate their env through their
own helper (see
[the validation pattern](#validating-env-variables-the-sharedenv--serverenv-pattern)
below) and read that.

```ts
env.vars.NODE_ENV // => 'production' — always present
env.vars.API_URL // => string | undefined (widen the type via EnvDefinition)
```

A few things to know:

- **It's a live getter**, not a snapshot — each access re-reads the source.
- **On the server** it reads `process.env` (every process variable is visible).
- **On the client** it reads what Point0 injected into the page
  (`window.__POINT0_ENV_VARS__` + consts) — only the variables you whitelisted,
  never the full `process.env`. That whitelist is the next section.

By default the value type is `Record<string, string | undefined>`. Declare your
real keys to get exact types — see [typing env globally](#typing-env-globally).

## What reaches the client: vars and consts

The server sees every process variable. The client must not — its bundle ships
to the browser and anyone can read it. (Point0 still server-renders the first
load when SSR is on; "client" here means the browser bundle, the same one that
drives SPA-style navigation after that first render.) So the client gets
**only** what you list, in the engine's client config under `env`:

```ts
// examples/basic/src/engine.ts
import { clientEnvKeys } from '@/lib/env/client-shape'

export const engine = Engine.create({
  client: {
    // ...
    env: { vars: clientEnvKeys }, // exactly these keys reach the browser
  },
})
```

There are two ways to send a variable to the client, and they behave
differently:

|                       | `env.vars`                                            | `env.consts`                                                    |
| --------------------- | ----------------------------------------------------- | --------------------------------------------------------------- |
| When resolved         | per request, injected into the HTML                   | at build/compile time, inlined as a literal                     |
| Changes on redeploy   | yes — restart and the new value is served, no rebuild | no — baked into the bundle                                      |
| Dead-code elimination | no                                                    | yes — `if (process.env.X === '…')` collapses to the live branch |

Use **vars** for anything that can change between deploys (an API URL per
environment). Use **consts** for build-time flags you want to inline and
dead-strip. Both are declared the same way:

```ts
export const engine = Engine.create({
  client: {
    env: {
      vars: ['API_URL', 'PUBLIC_SENTRY_DSN'], // sent at request time
      consts: { FEATURE_X: 'true' }, // inlined at build time
    },
  },
})
```

### Declaring which keys to expose

Each `vars` / `consts` entry accepts a few shapes:

```ts
export const engine = Engine.create({
  client: {
    env: {
      vars: [
        'API_URL', // a key — read its value from process.env
        'PUBLIC_*', // a glob — every matching process.env key (minimatch)
        { OVERRIDE: 'literal-value' }, // an object — use this value verbatim
      ],
    },
  },
})
```

A bare string reads the live value from `process.env`. A glob (`'PUBLIC_*'`)
expands to every matching process variable. An object sets the value explicitly,
overriding `process.env`.

> **Gotcha:** for the **client**, an empty string or a bare `'*'` is rejected at
> startup —
> `Environment variable "*" is not allowed for client env vars config`. A
> wildcard like `'*'` would dump the whole environment into the browser, so you
> must enumerate keys or use a scoped prefix glob (`'PUBLIC_*'`). The server
> config has no such guard — and at the type level the server's `env.vars` won't
> even accept a bare string or glob, only explicit objects.

### Always-injected keys

Point0 always adds a small `POINT0_*` set to the client, regardless of your
config: `NODE_ENV`, `POINT0_SCOPE`, `POINT0_SIDE` (`'client'`), and
`POINT0_SSR`. These are what power `env.mode`, `env.scope`, and `env.side` in
the browser. You don't declare them.

## Validating env variables (the `sharedEnv` / `serverEnv` pattern)

Point0 ships **no** `createEnv` / `serverEnv` API — env validation is app code,
and the pattern below is the convention `examples/basic` and start0 use. The
idea: parse `process.env` against a schema once, export a typed object, and read
**that** everywhere instead of `process.env`.

Split the schema by audience so a secret never leaks into the client shape. The
basic example uses five small files — two `*-shape.ts` shape files plus the
`shared.ts` / `server.ts` / `client.ts` validation files:

**1. The shared shape** — keys safe on both sides. Shape only, no top-level
_validation_, because the engine config imports it and validation that threw at
import time would crash the config before the app starts. (The basic example's
`shared-shape.ts` does keep one harmless module-scope side effect — rewriting
`SERVER_URL` to `CLIENT_URL` on the client to proxy through the client origin in
dev — but it never validates or throws at import.)

```ts
// lib/env/shared-shape.ts
import { z } from 'zod'

// Never put secrets here — every shared key is exposed to the client.
export const sharedEnvShape = {
  SERVER_URL: z.string().min(1),
  CLIENT_URL: z.string().min(1),
}
```

**2. The server env** — shared keys plus secrets, guarded so it can never reach
the client (see [import guards](#server-only-and-client-only-guards)):

```ts
// lib/env/server.ts
import { sharedEnvShape } from '@/lib/env/shared-shape'
import '@point0/core/server-only' // build fails if this file reaches the client
import { z } from 'zod'

const result = z
  .object({ ...sharedEnvShape, DATABASE_URL: z.string().min(1) /* … */ })
  .safeParse(process.env)

if (!result.success) {
  throw new Error('Invalid server environment variables', {
    cause: result.error,
  })
}

// Read server config via `serverEnv` — never process.env directly in features.
export const serverEnv = { ...result.data }
```

**3. The client shape** — shared keys plus client-only ones, and the key list
the engine consumes:

```ts
// lib/env/client-shape.ts
import { sharedEnvShape } from '@/lib/env/shared-shape'

// Never add secrets — every key here reaches the browser (a `vars` key is
// injected into the page HTML per request; a `consts` key is inlined into the JS).
export const clientEnvShape = {
  ...sharedEnvShape,
  // SOMETHING_PUBLIC: z.string().min(1),
}

// Consumed by engine.ts → client.env.vars, so the framework knows what to send.
export const clientEnvKeys = Object.keys(clientEnvShape)
```

`clientEnvKeys` is the bridge: it feeds `client.env.vars` (above), so the schema
is the single source of truth for what's whitelisted — no scattered `PUBLIC_`
prefix convention, one list managed in one place.

> **Why split shape from validation:** `engine.ts` imports `clientEnvKeys` ←
> `client-shape.ts` ← `shared-shape.ts`. If any of those validated (and threw)
> at import time, building the engine config would crash before the app starts.
> Keep the shape files free of top-level _validation_ (nothing that throws at
> import); validate in the `server.ts` / `client.ts` / `shared.ts` files that
> aren't on the config path.

This is just one way to organize it — Point0 doesn't prescribe a validation API.
Use Zod, Valibot, hand-written checks, or nothing; the only contract is that
`client.env.vars` gets the list of keys to expose.

## `server-only` and `client-only` guards

The compiler strips server code from the client bundle, but you can make the
boundary explicit and **fail the build** if a server file is ever reached from
the client. Import the marker at the top of the file:

```ts
// lib/prisma.ts
import '@point0/core/server-only' // build/dev error if this reaches the client
```

Both `@point0/core/server-only` and `@point0/core/client-only` are empty modules
— the work is the compiler's. If a `server-only` file ends up in the client
graph (or a `client-only` file on the server), the import is replaced with a
module that throws, and on a `point0 build` (which forces `onDeny: 'throw'`) the
build stops. The config default of `compiler.importer.onDeny` is `'log'`, so in
dev the violation is logged rather than fatal — the replaced module still throws
at runtime. This is the mechanism that lets you put `DATABASE_URL` and Prisma
calls in plain imported files without fear of bundling them. More in
[Importer](importer).

## How the compile boundary stays safe

The reason `env` is trustworthy across the server/client split is that the
compiler **statically rewrites** every `env.*` check into a literal, then runs
dead-code elimination. A server-only branch in a client build isn't
conditionally skipped — it's gone.

```ts
// you write:
if (env.side.is.server) {
  await prisma.idea.findMany() // server-only
}

// in the CLIENT bundle the compiler produces:
if (false) {
  // ...  → eliminated as dead code, prisma import dropped
}
```

By default this rewrite covers `env.side.is.*`, `env.scope.is.*`,
`env.mode.is.*`, `env.build.was`, and their `define(...)` calls — and env
variables declared as `consts`: `process.env.X` / `env.vars.X` /
`import.meta.env.X` become literals when `X` is a const, which is what enables
dead-stripping a feature flag. The pass runs several times so nested branches
collapse.

`env.runtime.is.*` and `env.os.is.*` are the exception: their rewrites are
**opt-in and OFF by default**. To enable them you commit to a concrete value at
compile time — set `compiler.runtime` (e.g. `'bun'`) and/or `compiler.os` in the
engine config, per side:

```ts
export const engine = Engine.create({
  server: {
    compiler: { runtime: 'bun' }, // server is built for Bun
  },
  client: {
    compiler: { runtime: 'browser' }, // client is built for the browser
  },
})
```

Setting these bakes a `POINT0_RUNTIME` / `POINT0_OS` const into that side's
build, which is what lets the compiler inline `env.runtime.is.*` / `env.os.is.*`
to literals and dead-strip the losing branch. Until you set them, a branch
behind `env.runtime.is.nodejs` or `env.os.is.ios` is **not** rewritten to a
literal and **not** dead-stripped from the client bundle — it stays a runtime
read (it evaluates `false` on the client, but the branch and its imports remain
in the bundle).

> **Gotcha:** this rewrite only fires for `env` (or its alias `_point0_env`)
> when it's imported **directly from `@point0/core`**. Shadow the name with a
> local `const env = …`, or re-export it through another module, and the static
> replacement silently stops — the checks become ordinary runtime reads. Import
> `env` straight from `@point0/core`.

## Reference

### Field surface

| Field         | `.name`                        | `.is.<x>`                             | `.define(...)`            |
| ------------- | ------------------------------ | ------------------------------------- | ------------------------- |
| `env.mode`    | `NODE_ENV` (any string)        | `production` / `development` / `test` | —                         |
| `env.side`    | `'server'` / `'client'`        | `client` / `server` / `ssr`           | per side (+ `.unsafe`)    |
| `env.scope`   | active scope (throws if unset) | per scope                             | per scope (+ `.unsafe`)   |
| `env.runtime` | runtime or `undefined`         | per runtime + `unknown`               | per runtime (+ `.unsafe`) |
| `env.os`      | OS or `undefined`              | per OS + `unknown`                    | per OS (+ `.unsafe`)      |
| `env.build`   | — (`.was: boolean`)            | —                                     | `{ before, after }`       |
| `env.vars`    | —                              | —                                     | — (typed record getter)   |

- `EnvRuntimeName` =
  `'browser' | 'reactNative' | 'nodejs' | 'bun' | 'deno' | 'worker'`.
- `EnvOsName` = `'ios' | 'android' | 'linux' | 'mac' | 'windows'`.
- `.define.<x>(v)` returns `v` only when the field equals `x`, else `undefined`.
- `.define.unsafe.<x>(v)` types the result as `v` but still returns `undefined`
  on the wrong field at runtime — a type assertion only.

### Client config: `env.vars` / `env.consts`

In the engine's `client` config (and `server` config):

| Key      | Accepts                             | Resolved                           | Client guard           |
| -------- | ----------------------------------- | ---------------------------------- | ---------------------- |
| `vars`   | key / glob / object / array of them | per request, injected into HTML    | rejects `''` and `'*'` |
| `consts` | key / glob / object / array of them | inlined at build time, dead-strips | rejects `''` and `'*'` |

Server `env.vars` accepts objects only (no bare string / glob at the type
level); server `env.consts` and both client entries accept the wide forms.

### Typing env globally

Point0 reads four optional keys off a global `EnvDefinition` interface — `vars`,
`scope`, `runtime`, and `os` — to type the matching `env.*` fields. The
interface ships empty; augment it once to declare your types:

```ts
declare module '@point0/core' {
  interface EnvDefinition {
    vars: { API_URL: string }
    scope: 'web' | 'admin'
    runtime: 'browser' | 'ios' | 'android'
    os: 'mac' | 'windows' | 'linux'
  }
}
```

With this, `env.vars.API_URL` is typed `string`, `env.scope.name` narrows to the
union, and the wrong scope key in `.define` is a type error. Each key is
independent — declare only the ones you need; an omitted key keeps its wide
default (`Record<string, string | undefined>` for `vars`, `string` for `scope`,
the full runtime/OS union for the others).

### `.env` file loading

The `point0` CLI loads `.env` files through Bun's own loader, not a hand-rolled
parser. The cascade for a mode is `.env`, `.env.<mode>`, `.env.local`,
`.env.<mode>.local` (Bun **skips `.env.local` in test mode**). Mode is resolved
by precedence: an explicit flag (`--mode` / `-p` / `-d` / `-t`) >
`--env NODE_ENV=…` > a shell-exported `NODE_ENV` > the default (production for
`build`, development otherwise). **The shell always wins over files.** Details
belong on [CLI](cli) and [Engine config](engine-config).
