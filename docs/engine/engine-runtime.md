---
index: 200
title: Engine Runtime
description:
  The engine instance is your app's config and its runtime — one object that the
  CLI drives and the server serves.
---

`Engine.create({...})` returns one object that is both the config and the
runtime. You describe the app once in `src/engine.ts`, then call methods on the
same instance — `engine.serve()`, `engine.dev()`, `engine.build()`,
`engine.fetch(req)` — to run it. The CLI calls those exact methods for you; your
own code can call them directly.

```ts
// src/engine.ts — the one object
import { Engine } from '@point0/engine'

export const engine = Engine.create({
  file: import.meta.url, // the engine must know where it lives
  ssr: true,
  pointsGlob: '**/*.{ts,tsx,mdx}',
  server: {
    scope: 'root',
    port: process.env.PORT,
    entry: { main: './index.server.ts' },
  },
  client: {
    scope: 'root',
    indexHtml: './index.html',
    app: async () => await import('./app.client'),
  },
})
```

```ts
// src/app.server.ts — that same object, now running
import { engine } from '@/engine.js'
await engine.serve() // Server started http://localhost:3000 in 42ms
```

The full set of `Engine.create` options is on [engine-config](engine-config).
This page is the runtime side: the methods on the instance, and the few wiring
files that boot it.

## Config and runtime are one object

There is no separate "app server" abstraction. The CLI finds your exported
`engine` and calls a method on it; that's the whole indirection.

```ts
// what `point0 dev` does, in essence:
const { engine } = await import('./src/engine.ts')
await engine.dev() // `point0 build` → engine.build(), `point0 generate` → engine.generate()
```

Every request the server answers also runs through the same instance —
`engine.fetch(request)` is the entry point.

The CLI looks for the engine file in `./`, `./src`, `./lib`, and a few `point0`
subfolders, basename `engine`, and imports `module.engine ?? module.default`. So
your `src/engine.ts` must export the instance as a named `engine` or a default
export — otherwise the CLI throws
`engine.ts must export "engine" or have a default export`. Override the path
with `--engine <path>` or the `POINT0_ENGINE_FILE` env var.

> **GOTCHA — the engine file must be side-effect free.** The CLI and
> `preload.ts` import its module graph raw, before the compiler plugins are
> installed. Don't validate env or throw at module scope in `engine.ts` (or
> anything it imports eagerly). Import env _shapes_, not eager validation — see
> [env](env).

## Serving requests

`engine.serve()` starts the Bun server. It prepares the engine first, so you
don't call `prepare()` yourself:

```ts
// src/app.server.ts
import { engine } from '@/engine.js'
await engine.serve()
// logs: Server started http://localhost:3000 in 42ms
```

`serve()` binds on the server `port` from your config. If the port is taken, it
does **not** kill the holder — it names it and throws:

```
Port 3000 is already in use by pid 123 (bun src/index.server.ts).
Stop that process or change the port.
```

(Under the dev orchestrator the bind is retried for up to 10s while the old
process exits — see [dev](dev).) Calling `serve()` when the engine is already
serving returns early without error, which is what lets Vite re-run the entry on
HMR.

When your engine's `RequiredCtx` is non-`undefined`, `serve` requires a
`requiredCtx` argument; otherwise it's optional. You can also pass partial Bun
`Serve.Options` — a custom `fetch` here runs before point0's and wins if it
returns a response:

```ts
await engine.serve({ requiredCtx: { db } }) // only when the engine requires ctx
```

## Answering a request without a server: `engine.fetch`

`engine.fetch(req)` runs a request through the engine and returns a `Response` —
no socket, no port. This is how tests and server-to-server calls hit your
points:

```ts
await engine.prepare() // required before fetch (serve() does this for you)
const response = await engine.fetch('http://localhost:3000/api/ideas/123', {
  method: 'POST',
})
```

`engine.fetchDetailed(req)` is the same call but returns the full result
(`{ response, data, error, ... }`) instead of just the `Response`.

> **GOTCHA — `fetch`/`fetchDetailed` need `prepare()` first.** Both throw
> `Engine server is not prepared. Please call await engine.prepare() first.` if
> you skip it. `serve()` prepares internally, so you only call `prepare()` by
> hand when you use `fetch` standalone (tests, SSR, scripts). See
> [testing](testing).

> There is no `engine.execute(...)`. `.execute(...)` is a method on a
> [mutation](mutation), not on the engine — the engine's request entry point is
> `fetch` / `fetchDetailed`.

`engine.withFetch(cb)` runs a callback inside the server's request context (the
server port, a bound `fetch`, a query client) and passes the bound `fetch` to
the callback. Inside it, server-side point methods — a query's `fetchServer`, a
mutation's `fetchServer`/`fetchServerDetailed`, a loader calling another loader
— resolve their in-process fetch directly through the engine, with no socket and
no running server. Outside that context they throw, because the server-only
fetch fn has nowhere to read its port and query client from.

This makes `withFetch` the tool for **integration tests**: you hit your points
in-process, with full types, without booting a server. Start0's test suite
exercises its API this way:

```ts
import { engine } from '@/engine'
import { ideaCreateMutation, ideaListQuery } from '@/features/idea/api'

test('returns the newest ideas first', async () => {
  const user = await createTestUser()
  await seedIdea({ authorId: user.id, title: 'First' })
  await seedIdea({ authorId: user.id, title: 'Second' })

  const result = await engine.withFetch(async () => {
    return await ideaListQuery.fetchServer({})
  })

  expect(result.items.map((i) => i.title)).toEqual(['Second', 'First'])
})

test('rejects anonymous users', async () => {
  const result = await engine.withFetch(async () => {
    return await ideaCreateMutation.fetchServerDetailed(
      { title: 'Nope', content: 'Nope' },
      { headers: {} },
    )
  })
  expect(result.error?.code).toBe('UNAUTHORIZED')
})
```

`fetchServer` returns the data and throws on error; `fetchServerDetailed`
returns `{ data, error, response, … }` so you can assert on a failure without a
`try`. Pass `headers` to simulate an authenticated caller. The same pattern
covers any server-to-server call where you want a point's typed result inside an
existing request — call `query.fetch()` (or `fetchServer`) from within
`withFetch`. See [testing](testing).

## Dev, build, generate

These three are what the CLI commands map to.

```ts
await engine.dev() // start dev (server + clients), watch, regenerate, hot-reload
await engine.build() // production build of every side
await engine.generate() // codegen only (points, routes, meta, assets types)
```

`engine.dev()` forces `NODE_ENV=development`, generates and watches by default,
and installs the dev-tree shutdown handler so the whole process tree dies as a
unit. `engine.build()` forces `NODE_ENV=production`, **always generates first**
("no build without generate"), and warns if it isn't actually production:

```
Building with NODE_ENV=development, not "production": the client gets inline
sourcemaps and unminified bundles…
```

Each takes options — `dev` has `side`, `scope`, `entries`, `watch`, `serverHot`,
and more; `build` has `side`, `scope`, `clean`, `publicdir`. The full option and
flag tables live on [dev](dev) and [build](build); the command-to-method mapping
is on [cli](cli). The matching watch and codegen variants are
`engine.buildWatch(...)`, `engine.generateWatch(...)`, and
`engine.preparePublicdirs()`.

## Preparing and tearing down

`engine.prepare()` sets up the server, hot-store, source maps, and each serving
client. It's idempotent and required before `fetch`. `serve()` and the lifecycle
methods call it for you; native shells (capacitor, expo) call it explicitly:

```ts
await engine.prepare()
await engine.serve()
```

Cleanup methods:

```ts
await engine.dispose() // dispose all clients + the server (close handles)
await engine.clean() //   remove build outputs
await engine.prune() //   remove the @point0 temp dir + the server hot-reload store
```

`prune` is the `point0 prune` command. In production you wire `dispose` into
your shutdown path so handles (DB pools, the server) close cleanly:

```ts
// src/app.server.ts (start0)
onShutdown('engine', ['prisma'], async () => await engine.dispose())
await Promise.all([engine.serve(), createInitialAdmin()])
```

## preload(): one call that sets up the process

`engine.preload()` does the process-level setup that must happen **before** any
app code is imported: it normalizes `NODE_ENV` + writes the `POINT0_*` and env
consts into `process.env`, and it installs the point0 compiler as a process-wide
`Bun.plugin` (which strips client code from the server bundle and vice-versa).

```ts
// src/preload.ts
import { engine } from '@/engine'
await engine.preload({ nodeEnvFallback: 'development' })
```

Options: `nodeEnvFallback` (apps pass `'development'`), `preventLoadBunPlugins`
(pass `!!engine.server.viteConfig` — Vite doesn't need the Bun plugin),
`preventSetEnvVars`, and `prepare` (also run `prepare()` in the same call).

```ts
// vite app: skip the Bun plugin
await engine.preload({
  nodeEnvFallback: 'development',
  preventLoadBunPlugins: !!engine.server.viteConfig,
})
```

`preload()` is a **no-op in a built process** — the build baked everything in,
and re-running it could even flip a production server to development. The call
stays in the bundle and does nothing.

## The wiring files

A point0 app boots through a few small files you write once; `create-point0-app`
scaffolds them. The boot order is the point.

### src/preload.ts

Imported explicitly — never ambient. One call to `engine.preload()` (above); it
must finish before any app code is imported.

### src/index.server.ts

The server boot entry (your `server.entry.main` points at it). It imports
preload first, then the actual server code:

```ts
// src/index.server.ts
await import('./preload.js')
await import('./app.server.js')

// Vite dev only: the server-HMR teardown belongs on THIS entry — the module the engine re-imports on a
// reload. A bare accept here makes any edit that bubbles up to the entry (a page, a layout, a lib) a
// granular re-run that disposes the old server before the next serve() rebinds; without it that edit is a
// full SSR reload, which skips dispose and leaves the old server bound → "port already in use". `engine` is
// grabbed dynamically so the preload-first order holds. No-op under Bun and in a build (`import.meta.hot`).
if (import.meta.hot) {
  const { engine } = await import('./engine.js')
  import.meta.hot.dispose(() => engine.dispose())
  import.meta.hot.accept()
}

export {} // marks the file as a module
```

> **GOTCHA — the HMR block goes on the entry, not `app.server.ts`.** A bare
> `import.meta.hot.accept()` only catches edits to its _own_ module, so on
> `app.server.ts` (which the entry imports) a page edit bubbles _past_ it to the
> un-accepting entry and Vite full-reloads. Put it on `index.server.ts`.

> **GOTCHA — dynamic imports only, in order.** A static `import` hoists above
> any `await`, so a static preload import would run _after_ the app code it's
> meant to set up. Use `await import('./preload.js')` as the first line, never a
> top static import. You can interleave other dynamic imports (env validation,
> telemetry) between preload and `app.server`, as long as they stay dynamic.

### src/app.server.ts

The real server code. It calls `engine.serve()` — and is also where any other
server-side code lives (workers, crons, env validation, seeding):

```ts
// src/app.server.ts
import { engine } from '@/engine.js'
await engine.serve()
// it is not only the API entry point — put server initializers here too
```

### src/app.client.tsx

The client app root, a default-exported component. It wraps the router and your
providers (query client, head). The client config references it via
`app: async () => await import('./app.client')`:

```tsx
// src/app.client.tsx
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UnheadProvider>
        <Head>{/* global head tags */}</Head>
        <Router>
          <RouterRoutes />
        </Router>
      </UnheadProvider>
    </QueryClientProvider>
  )
}
```

### src/index.client.tsx and mount()

The browser entry — the `<script type="module">` your `index.html` loads. It
imports the generated client points, then calls `mount()`:

```tsx
// src/index.client.tsx
import App from '@/app.client'
import points from '@/generated/point0/points.client'
import { ErrorBoundary } from '@/ui/error-boundary'
import { mount } from '@point0/react-dom/mount'

mount(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
  points,
)

if (import.meta.hot) {
  import.meta.hot.accept() // HMR: see below
}
```

`mount` from `@point0/react-dom/mount` takes the root element, the points, and
an optional `domRootElement`:

```ts
mount(element, points, { domRootElement }?)
```

- Without `domRootElement`, it mounts into `document.getElementById('root')` and
  throws `Element #root not found…` if it's missing — pair it with
  `<div id="root">` in your `index.html`. (Pass `domRootElement` to target a
  different element; an explicit falsy value throws.)
- **Hydration vs CSR is automatic.** On the first call, if the root already has
  child nodes (SSR markup) it `hydrateRoot`s; otherwise it
  `createRoot().render`s.
- **HMR re-renders into the same root.** Later calls (from `import.meta.hot`)
  reuse the existing React root and just re-render, so Fast Refresh keeps hook
  state.

### src/index.html

The shell: a mount target and the client entry script.

```html
<div id="root"></div>
<script type="module" src="./index.client.tsx"></script>
```

`index.html` is the authoring format, not the response: the engine parses it
once and React renders the whole document — `<html>` through `</html>` — on
every request (SSR and SPA alike). Titles, metas and links from the template
merge with per-page [`.head()`](../core/head) values (the page wins), while
`<script>` and `<noscript>` tags never join that merge — they render exactly
where you put them, in order. The app renders inside your `#root` element
([`domRootElementId`](engine-config)); everything else in `<body>` ships
verbatim. The engine guarantees `<meta charset="utf-8">` is the first thing in
`<head>` (deduping whatever charset the template declares). Two normalizations
to know about: HTML comments from the template don't reach the browser, and
attributes render in React's form (`<script defer>` becomes `defer=""`,
`crossorigin` becomes `crossorigin=""` — byte-different, spec-identical).

> With Vite the shell is `index.client.html` instead, and `index.server.ts` /
> `index.client.tsx` use `import.meta.hot` for dispose + accept. See
> [bun-vs-vite](bun-vs-vite) and [example-vite](example-vite).

## Reference

### Instance methods

`engine.` —

| Method                         | Does                                                                                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `serve(options?)`              | Prepare, then start the Bun server. `requiredCtx` required when the engine's ctx is non-`undefined`; accepts partial Bun `Serve.Options`. → [cli](cli) |
| `dev(options?)`                | Dev: server + clients, watch, regenerate, hot-reload. Forces `NODE_ENV=development`. → [dev](dev)                                                      |
| `build(options?)`              | Production build of every side. Generates first; forces `NODE_ENV=production`. → [build](build)                                                        |
| `buildWatch(options?)`         | `build` in watch mode (watches the entry import graph). → [build](build)                                                                               |
| `generate(options?)`           | Codegen only (points, routes, meta, assets types). → [generator](generator)                                                                            |
| `generateWatch(options?)`      | `generate` then watch. → [generator](generator)                                                                                                        |
| `prepare()`                    | Idempotent runtime setup. Required before `fetch`; called by `serve`.                                                                                  |
| `fetch(req, options?)`         | Run a request through the engine, return a `Response`. Needs `prepare()`.                                                                              |
| `fetchDetailed(req, options?)` | As `fetch`, but returns `{ response, data, error, … }`.                                                                                                |
| `withFetch(cb)`                | Run `cb` inside the server request context, so a point's `fetchServer`/`fetch` works in-process (tests, server-to-server).                             |
| `preload(options?)`            | Process setup: env + compiler Bun plugin. No-op in a built process.                                                                                    |
| `dispose()`                    | Dispose all clients + the server.                                                                                                                      |
| `clean()`                      | Remove build outputs.                                                                                                                                  |
| `prune()`                      | Remove the `@point0` temp dir + server hot-reload store (`point0 prune`).                                                                              |
| `getViteConfig(env?)`          | The full Vite `UserConfig` the engine would use — for `vite.config.ts` and vitest. → [bun-vs-vite](bun-vs-vite)                                        |

CLI-internal helpers also live on the instance — `preparePublicdirs`,
`serveClientDevServers`, `toEntryPath`, `guessSideAndScope`, `getEmit`,
`readEverything`, and the statics `Engine.findSelfFile` /
`Engine.findAndImportSelf`. They drive the CLI and rarely appear in app code.

### Instance fields

A few are useful in app and config code:

| Field                                 | Is                                                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------------------- |
| `engine.clients` / `engine.client`    | the configured clients; `.client` is the first one (throws `No clients available…` if none) |
| `engine.server`                       | the server runtime (`engine.server.viteConfig`, `engine.server.entry`, …)                   |
| `engine.file` / `engine.cwd`          | the engine file URL and its working directory                                               |
| `engine.log` / `engine.logger`        | the resolved log fn / logger                                                                |
| `engine.prepared` / `engine.wasBuilt` | runtime flags                                                                               |

### Boot order

```
src/index.server.ts        # server entry (server.entry.main)
  → await import preload.ts   # engine.preload(): env + compiler plugin
  → await import app.server.ts# engine.serve()

index.html                 # browser shell
  → src/index.client.tsx      # mount(<App/>, points) → hydrate or createRoot
      → src/app.client.tsx    # the App component (router + providers)
```
