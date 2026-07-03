---
index: 200
label: Vite
title: Vite Example
description: The basic app, with the client bundled by Vite instead of Bun.
example: examples/vite
---

`examples/vite` is the **same app as [basic](example-basic)** — the IdeaNick
ideas board, SSR, Prisma, Tailwind, pages, layouts, queries, mutations — with
exactly one thing changed: the client is bundled by **Vite (Rolldown)** instead
of Bun's native bundler. The app code is identical; only a handful of wiring
files differ. The buttons above and below open the full source.

The switch is a single engine option. Add `viteConfig`, drop `client.bunPlugins`
— there is no `useVite` flag, the _presence_ of `viteConfig` is the switch:

```ts
// examples/vite/src/engine.ts
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export const engine = Engine.create({
  file: import.meta.url,
  ssr: true,
  pointsGlob: '**/*.{ts,tsx,mdx}',
  viteConfig: ({ plugins, side }) => ({
    plugins: [
      ...plugins, // point0's own Vite compiler plugin — spread it in where you want
      react({ include: /\.(jsx|js|mdx|md|tsx|ts)$/ }),
      tailwindcss(), // replaces bun-plugin-tailwind
    ],
  }),
  // server / client config — as in basic, minus client.bunPlugins
})
```

`viteConfig` is a callback returning a Vite `UserConfig`. Its argument carries
`plugins` (point0's compiler plugin, already inside — spread it), plus `side`,
`command`, `mode`, and `scope` to branch on. You only add what you want on top;
the engine injects `root`, `define`, the SSR/dev middleware, sourcemaps, and
merges your callback over them. `bun create point0-app@latest --vite` scaffolds
this wiring (`--no-vite` is the Bun default).

Beyond `engine.ts`, the Vite path differs in a few small ways: `preload.ts`
passes `preventLoadBunPlugins: true`, `index.html` uses an absolute script src
plus an explicit stylesheet `<link>`, `index.server.ts` (the entry) self-accepts
Vite's SSR program via `import.meta.hot` (dispose → re-serve granularly, not a
full reload), and there is a thin `vite.config.ts` so external tooling (vitest,
the IDE) sees a normal Vite project. Two behavioral notes: `--hot` is a no-op
under Vite (Bun-native feature), and the build is `vite build` for both client
and server.

For why you'd pick one bundler over the other and how each pipeline works, see
[bun-vs-vite](bun-vs-vite) — that page owns the full Vite story.

## Running it

Identical to [basic](example-basic) — `bun install && bun run build` at the repo
root, then `bun run setup && bun run dev` inside `examples/vite`. (The `start`
script runs `./dist/server/main.js` — Vite names the SSR entry by its `entry`
key, where Bun names it by source basename; always read the example's own
`start` script.) See [getting-started](getting-started).

## For a real app

This example shows the Vite path in isolation. For a real product, start from
**[Start0](https://1gr14.dev/start0)** — the SaaS boilerplate with auth, admin,
forms, CRUD, email, and deploy already wired together
(`bun create start0@latest my-app`).
