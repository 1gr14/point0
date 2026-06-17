# Point0 — expo example

A minimal example showing how to use Point0 queries and mutations with an Expo
(React Native) client.

## Structure

- **Server** (`src/engine.ts`, `src/index.server.ts`) — Point0 server with
  Prisma/SQLite, runs on Bun
- **Shared** (`src/ideas.ts`, `src/lib/root.ts`) — Query and mutation
  definitions shared between server and client
- **Client** (`src/app/`) — Expo Router screens that use Point0 queries and
  mutations
- **Compiler** (`metro-transformer.js`) — Custom Metro transformer using
  `@point0/compiler` to prune server code from the client bundle

## Setup

```bash
# From monorepo root, install deps
bun install

# Build the compiler package (needed for Metro transformer)
cd packages/compiler && bun run build && cd -

# Setup the database
cd examples/expo
bunx prisma generate
bunx prisma db push
```

## Running

```bash
# Terminal 1: Start the Point0 server
bun run dev:server

# Terminal 2: Start the Expo dev server
bun run dev
```

When testing on a physical device, update `EXPO_PUBLIC_SERVER_URL` in `.env` to
your machine's local IP (e.g., `http://192.168.1.100:3000`).

## For a real app

This example shows Point0 in isolation. Building something real? See
[FOR_A_REAL_APP.md](./FOR_A_REAL_APP.md).
