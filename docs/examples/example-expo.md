---
index: 500
title: Expo Example
description: React Native through Expo — Point0's server and points, with Expo Router as the client.
label: Expo
example: examples/expo
---

> **Experimental.** This example is a work in progress (it ships a
> `WIP_EXAMPLE_NOT_READY.md` marker). It shows how a React Native client can use
> Point0's queries, mutations, and components, but it isn't a polished path yet —
> there's no `create-point0-app` template for it and no end-to-end test. For a
> real app, start from [start0](#for-a-real-app), not this.

`examples/expo` is a React Native client built with [Expo](https://expo.dev)
that talks to a Point0 server. It is the opposite trade from
[capacitor](example-capacitor): capacitor *keeps* the Point0 client (Point0
builds the web bundle the shell wraps), while expo **drops** it. Point0 keeps
only the parts that don't touch the DOM — the [root](root), [queries](query),
[mutations](mutation), and [components](component) — and Expo Router owns routing
while Metro bundles the client. The buttons above and below open the full source.

The distinctive shape: the data hooks are the same ones you'd call in any Point0
app, but they live inside a plain Expo screen and route through Expo Router, not
a Point0 page:

```tsx
// examples/expo/src/app/index.tsx
import { useRouter } from 'expo-router'
import { ideasQuery, createIdeaMutation } from '../ideas'

export default function IdeasScreen() {
  const router = useRouter()
  const { data, refetch } = ideasQuery.useQuery() // a Point0 query
  const mutation = createIdeaMutation.useMutation() // a Point0 mutation
  // <FlatList ... onPress={() => router.push(`/${item.id}`)} />  ← routing is Expo Router
}
```

Two things make the client-less setup work. The engine config is **server only**
(no `client` block), and `server.importer.mock` rewrites client-only imports
(`react-native`, `expo-router`) to an empty proxy at compile time so the same
point files load on the server too. On the client side there is no Point0 build
at all — a single Babel plugin runs the compiler with `side: 'client'`, stripping
the server-only method bodies (`loader`, `input`, `ctx`, …) before Metro bundles:

```js
// examples/expo/babel.config.js
plugins: [['@point0/compiler/plugin/babel', { side: 'client', scope: 'site' }]]
```

The [root](root) carries `serverUrl` (the client has no co-located server),
`@point0/cors` middleware (it's cross-origin), and a transformer, and its
`.loading` / `.error` render **React Native** components. One more quirk: expo
**commits** its `points.server.ts` and has no `generate` script — Metro and Babel
have no `point0 generate` integration, so a committed registry gives the server a
stable source to load. See [compiler](compiler), [importer](importer), and
[root](root).

<!-- TODO(med): the Babel plugin uses `scope: 'site'` while the engine server uses `scope: 'root'`. Whether the mismatch is intentional, and which scope a React Native client should use, is NOT FOUND in code or tests. -->

<!-- TODO(low): not exercised here — whether the example builds/runs end to end (WIP marker), a production / physical-device `serverUrl` strategy beyond "set the LAN IP", and compatibility of other modules (OpenAPI, auth) with the React Native path. NOT FOUND. -->

## Running it

Two processes, in two terminals: `bun run dev:server` (the Point0 server,
`point0 dev --hot`) and `bun run dev` (the Expo client, `expo start`; or
`bun run ios` / `android` / `web`). Set up SQLite with `bun run prisma:generate`
and `bun run prisma:push`. The server boots through the usual Point0 wiring. See
[getting-started](getting-started) and [engine-runtime](engine-runtime).

<!-- TODO(low): the example's README references a `metro-transformer.js` and a `src/lib/root.ts` that don't exist — compilation is via the Babel plugin above, and the root is `src/lib/root.tsx`. Trust the code over that README. -->

## For a real app

This example shows Point0 as a React Native data layer in isolation. For a real
app, start from **[start0](https://1gr14.dev/start0)** — the SaaS boilerplate
with the pieces already wired (`bun create start0 my-app`).
