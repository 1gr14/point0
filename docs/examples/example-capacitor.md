---
index: 400
title: Capacitor Example
description:
  The ideas app wrapped in a Capacitor native shell — one static client build
  packaged into an iOS / Android webview.
label: Capacitor
example: examples/capacitor
---

> **Experimental.** This example is a work in progress — it ships a
> `WIP_EXAMPLE_NOT_READY.md` marker and still carries scaffold leftovers. It
> shows the _shape_ of a web-to-mobile build, not a polished template. For a
> real mobile app, start from [start0](#for-a-real-app).

`examples/capacitor` is the same ideas app as [basic](example-basic), stripped
down (no auth, no layouts, no OpenAPI, no Tailwind), wrapped in a
[Capacitor](https://capacitorjs.com) native shell. Point0 builds the client to a
static bundle; Capacitor packages that bundle into an iOS or Android webview.
The buttons above and below open the full source.

The whole integration is one config line — there is **no Point0-specific native
code**:

```ts
// capacitor.config.ts
const config: CapacitorConfig = {
  appId: 'dev.p0nt.examples.capacitor',
  appName: 'Point0 Capacitor Ideas',
  webDir: 'dist/client', // ← the Point0 client build is what gets shipped
}
```

`webDir: 'dist/client'` is the load-bearing line: it must match the engine's
`client.outdir`, because the client build directory _is_ the native app's web
root. The native commands all run the web build first, then sync it into the
native projects (`bun run build && cap sync`). A committed `ios/` Xcode project
is stock Capacitor boilerplate; there's no `android/` yet (`cap add android`
creates it).

Authoring points is identical to any other Point0 app — a stripped [root](root)
(transformer, query defaults, prefetch, a global head), then queries and
mutations off it, consumed by pages with `.useQuery()` / `.useMutation()`.

The production topology is the one thing to plan for. A **shipped** Capacitor
app loads the static `dist/client` in a webview and reaches a Point0 server over
HTTP at a remote URL — the bundled app never runs `index.server.ts`. Build the
client as a `serving: false` client (the bundle, not bound to a server — see
[engine-config](engine-config#serving-false-clients)), point the [root](root) at
the backend with `.serverUrl(…)`, and mount [@point0/cors](cors) on that backend
since the webview origin is cross-origin. This example wires a full local server
instead, which keeps dev simple.

## Running it

From the repo root, `bun install && bun run build` so the `point0` CLI resolves.
Then in `examples/capacitor`: `bun run prisma:generate`, `bun run prisma:push`
(this example uses `prisma db push`, not migrations), `bun run generate`, and
`bun run web` (an alias of `point0 dev --hot`) for the web app. For the native
shells, `bun run ios` / `bun run android` build the web bundle and open Xcode /
Android Studio. See [getting-started](getting-started).

## For a real app

This example shows Point0's web-to-mobile build in isolation. For a real app,
start from **[start0](https://1gr14.dev/start0)** — the SaaS boilerplate with
the pieces already wired (`bun create start0@latest my-app`).
