---
index: 1300
title: Deploy
description:
  Build with point0 build, then run the built server entry with Bun — one
  process that serves the API, SSR, and the client bundle.
---

Deploying a point0 app is two steps: build it, then run the built server entry
with Bun. There is no `point0 start` command — production runs the bundle
directly, and that one process serves the API, the SSR, and the static client.

```sh
point0 build                            # → dist/ (server + client), production by default
NODE_ENV=production bun run ./dist/server/index.server.js
```

`point0 build` writes the whole app to `dist/`; the server entry it produces
hosts both the API/SSR and the client files, so a minimal deploy is a Bun image,
`dist/`, and `NODE_ENV=production`. The rest of this page fills in the build
output, the Docker setup, env, and the production error behavior.

## Build

`point0 build` is the production build. It runs [generate](generator) first,
then bundles the client and the server in parallel into `dist/`:

```sh
point0 build              # production build into dist/
point0 build --watch      # rebuild on change (a built bundle, not a server)
point0 build --side client   # build only one side (see the deploy gotcha below)
```

Build is **production by default** — it loads the production `.env` cascade and
sets the mode to `production` before importing your engine, so you no longer
need `cross-env NODE_ENV=production` in front of it (a shell-exported `NODE_ENV`
still wins). If `NODE_ENV` ends up something other than `production`, the build
warns:

```
Building with NODE_ENV=development, not "production": the client gets inline
sourcemaps and unminified bundles. Intentional? If not, set NODE_ENV=production
```

Build always generates first — there is no "build without generate". A fresh
deploy therefore does **not** need a separate `point0 generate` before
`point0 build`; build does it. (Examples still run `point0 generate` in their
`setup` for typecheck and dev.)

See [Build](build) for the full flag list and the build internals; the table at
the bottom of this page lists the deploy-relevant flags.

## What lands in dist/

```
dist/
  client/                              # the browser bundle, served at /
    _point0/assets/<hash>.png           # asset bytes (only copy)
    **.js
  server/
    index.server.js                    # the production server entry — run this
    **.js
```

- **Client** is built for the browser (`target: 'browser'`, code-split). In
  production it is **minified** with **external** sourcemaps.
- **Server** is built for Bun (`target: 'bun'`, minified, code-split). `vite`,
  `esbuild`, and friends are marked external, so a Bun-only app runs in
  production without them installed.
- **Assets** are content-hashed and served from `dist/client` at
  `/_point0/assets/<hash>.<ext>`. The production server serves these statically;
  it does not use the dev-only asset route. Details on [Assets](assets).

The server entry filename comes from your engine `entry` map. The basic example
uses `entry: { main: './index.server.ts' }`, which builds to
`dist/server/index.server.js` — that is the file you run.

> **Deploy gotcha — build both sides.** URL-mode asset bytes are written by the
> **client** build. `point0 build --side server` alone does not populate
> `dist/client`, so `/_point0/assets/<hash>` 404s. A real deploy builds both
> sides — which is the default. Only `?file` assets are self-contained on a
> server-only build.

## Running the built server

The server entry runs the engine. In the basic example it is two files: a
`preload` import, then `app.server`:

```ts
// dist source: index.server.ts
// The preload must finish first: it registers the point0 compiler plugins (and
// env consts), so everything app.server imports goes through them.
await import('./preload.js')
await import('./app.server.js')
export {}
```

```ts
// dist source: app.server.ts
// Validate server env before anything else so a misconfigured server fails fast.
import '@/lib/env/server'
import { engine } from '@/engine.js'

await engine.serve()

// app.server is not only the api entry point — workers, crons, and initializers
// can live here too.
```

In the **built** server the `preload` step is inert (the code is already
compiled, so there is no plugin to register), but the call stays in the bundle.
The order — preload before app — only matters when running source directly; see
[Engine runtime](engine-runtime).

`engine.serve(options?)` prepares the engine and starts a Bun server that serves
the API, SSR, and the client. If your engine declares a `requiredCtx`, `serve`
requires an options argument carrying it; otherwise the argument is optional.
The `options` object is Bun's `Serve` config (`hostname`, `idleTimeout`, TLS, a
custom `fetch` / `websocket`, …) — the same shape as the `bunServeConfig` engine
option. Calling `serve()` twice is a no-op (it returns early if a server is
already running), which matters for dev re-serve, not production.

### Port

The port resolves from your engine config, defaulting to **3000**:

```ts
// examples/basic/src/engine.ts
export const engine = Engine.create({
  // ...
  server: {
    port: process.env.SERVER_PORT || process.env.PORT, // → 3000 when unset
  },
  // ...
})
```

Hosting platforms typically inject `PORT` in production — read it from the
environment, do not hardcode it. In a Docker compose setup you set it yourself
(e.g. `PORT=3094`).

> **Production binds once.** In production the server binds the port a single
> time and fails immediately on conflict — no retries, and it never kills the
> process holding the port. (The retry/handover logic is dev-only.) A port
> already in use in production is a hard `EADDRINUSE` failure.

### Bind address

point0 sets no explicit bind hostname — the serve config carries only the port.
The bind address therefore falls through to `Bun.serve`'s default, which is
`0.0.0.0` (all interfaces) — the right default behind a proxy or in a container.
To pin it (e.g. `127.0.0.1` to listen locally only), pass `hostname` through the
`bunServeConfig` engine option or as a `serve()` argument; both forward straight
to `Bun.serve`.

### Graceful shutdown

The running server installs a process-exit handler that catches `SIGINT`,
`SIGTERM`, and `SIGHUP` and stops the Bun server, so a normal container stop
drains the HTTP listener — no extra wiring needed for the common case. What the
built entry does **not** do is call `engine.dispose()` on a signal:
`engine.dispose()` exists and tears down clients too, but the per-signal handler
only stops the server, and the richer shutdown coordinator is dev-orchestrator
only. In production a client has nothing server-side to dispose, so this is
rarely a gap. If you hold resources that need an explicit close on shutdown (a
DB pool, a worker), add your own `SIGTERM`/`SIGINT` handler in `app.server` that
runs your teardown (and `engine.dispose()` if you want it).

## Docker

The simplest image: a Bun base, install, build, run the entry.

```dockerfile
FROM oven/bun:1
WORKDIR /app
COPY . .
RUN bun install && bun run build
CMD ["bun", "run", "./dist/server/index.server.js"]
```

For an app with **Prisma or native addons** (sharp, Prisma's engines), use a
multi-stage build. point0 bundles the server into `dist/`, but two things the
bundle can't carry are `prisma migrate deploy` (needs the Prisma CLI + schema)
and native addons — so the runtime stage keeps a production-only `node_modules`:

```dockerfile
# ── build stage ── full install, then build. Only its dist/ ships.
FROM oven/bun:1 AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates openssl
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bunx prisma generate          # throwaway URL — no DB needed at build time
RUN bun run build

# ── runtime stage ── dist + a production node_modules + the Prisma schema.
FROM oven/bun:1 AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates openssl
COPY --from=build /app/package.json /app/bun.lock ./
RUN bun install --frozen-lockfile --production
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts

# Apply pending migrations, then start.
CMD ["sh", "-c", "bunx prisma migrate deploy && bun run start"]
```

The `prisma generate` call at build time uses a throwaway database URL, so the
image builds anywhere without a real `DATABASE_URL`. A pure point0 app with no
Prisma and no native addons can ship `dist/` and Bun alone — the multi-stage
`node_modules` only earns its keep once you have those.

For local Docker, the examples ship a `docker-compose.yml` and `docker:build` /
`docker:up` / `docker:down` scripts. A production-grade compose (see start0)
adds a `db` service, an `env_file` cascade, a healthcheck, and `depends_on`
ordering.

## Env in production

All config — server and client — is read from the environment **at runtime**:
the server injects the client-safe keys into the page on each request, so
nothing is baked into the bundle. The same image deploys to any environment; you
set the variables on the platform.

The assumption is simply that the variables are already present in the
environment of the process that runs the server — typically set on whatever host
you deploy to (a platform's env config, a compose `env_file`, the shell that
starts the process). point0 reads them from there; it does not fetch or manage
secrets itself.

Two rules that bite in production:

- **Set `NODE_ENV=production` explicitly.** point0's CLI can't help a process it
  doesn't start. Running `bun dist/server/index.server.js` **without**
  `NODE_ENV` gets Bun's own development `.env` cascade and skips production-only
  behavior (minify tier, the error projection below). Set it via the Dockerfile
  (`ENV NODE_ENV=production`), compose, or `cross-env` in your `start` script.
- **Fail fast in `app.server`, not in the engine file.** The engine file is
  imported raw (no plugins) in some processes, so it must be side-effect free —
  no env validation at module scope. Eager validation lives in `app.server`
  (`import '@/lib/env/server'` as the first line), which runs at runtime.

point0 loads Bun's native `.env` cascade by `NODE_ENV`: `.env` → `.env.<mode>` →
`.env.local` → `.env.<mode>.local` (shell-exported vars always win). A real
production variable set looks like `DATABASE_URL`, `SERVER_URL` + `CLIENT_URL`
(the public domain), `PORT` (injected), `NODE_ENV=production`, plus your
secrets. Full env model on [Env](env).

## Production SSR errors never render the stack

When a point throws and the error component renders into SSR HTML, point0
projects the error differently by environment — and **never** renders the stack
in production:

```tsx
// packages/core/src/point0.ts — the default error component
const { stack, ...json } = _point0_env.mode.is.production
  ? this._Error.serializePublic(error) // no stack, no meta
  : this._Error.serializePrivate(error) // full operator view

// In production stackToShow is forced undefined — the stack is never rendered
// into the SSR HTML, not even as a fallback to the live error.stack.
const stackToShow = _point0_env.mode.is.production
  ? undefined
  : stack || error.stack
```

- **Production** uses `serializePublic` → `{ message, code?, redirect? }`. No
  stack, no meta, no class name. The stack is never written into the HTML the
  client receives. (When there is no stack, nothing is rendered — no empty
  `<pre>`.)
- **Development** uses `serializePrivate` → the full chain (`status`, `meta`,
  `stack`, `cause`, …) and renders the stack in a `<pre>`.
- **Logs always use `serializePrivate`**, regardless of environment — so the
  operator still sees the full stack in server logs in production; only the SSR
  HTML omits it.

The gate is `_point0_env.mode.is.production` (i.e. `NODE_ENV === 'production'`),
which is one more reason to set `NODE_ENV=production` on deploy: forget it, and
the public could see server stacks. The public/private split, your error class,
and `.errorClass(...)` are covered on [Error handling](error-handling).

## Scaling and migrations

point0 has no opinion on how many instances of the server you run — that is
entirely up to where and how you deploy it. The only thing to watch is database
migrations.

Running `prisma migrate deploy && bun run start` in the start command is fine
when a single instance starts. **If you run more than one instance, move
`migrate deploy` out of the start command** into a deploy-time step (a platform
pre-deploy hook, a separate job), so the instances don't race on migrations.

### Healthchecks

point0 has no built-in healthcheck endpoint — there is no default path to point
a load balancer or compose `healthcheck` at. If your host wants one, add it as
an app point: a small action point that returns `200`, e.g.
`root.lets.action('GET', '/api/health').action(() => new Response('OK'))`. The
path is yours to choose (start0 ships one at `/api/health` as an example).

## Reference

### Deploy commands

| Command                                 | What it does                                                             |
| --------------------------------------- | ------------------------------------------------------------------------ |
| `point0 build`                          | Production build → `dist/` (generate, then client + server in parallel). |
| `point0 generate`                       | Regenerate points/routes/meta. Not needed before build (build does it).  |
| `point0 prune`                          | Clear temporary/cache directories before a clean build.                  |
| `bun run ./dist/server/index.server.js` | Run the built server in production (set `NODE_ENV=production`).          |

There is **no** `point0 start` — production is the built entry run with Bun.

### Build flags relevant to deploy

| Flag                      | Effect                                                                                   |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| `-w, --watch [glob]`      | Rebuild on change; watches the entry import graph (plus any glob). Not a server.         |
| `--side <server\|client>` | Build only one side. **Deploy both** — `--side server` alone leaves url assets unserved. |
| `--scope <scope>`         | Limit to one client scope.                                                               |
| `-C, --no-clean`          | Don't clean `dist/` first (build cleans by default).                                     |
| `-P, --no-publicdir`      | Don't build the [publicdir](publicdir).                                                  |
| `-k, --keep-alive`        | Don't exit after build — keep long-lived build plugins (e.g. a bundle analyzer) running. |
| `--env <name=value>`      | Set an env pair for the build (repeatable).                                              |
| `--mode <mode>`           | Override the `NODE_ENV` mode (build defaults to `production`).                           |

The full flag reference is on [Build](build) and [CLI](cli).
