# Point0 — capacitor example

Simple ideas app built with Point0 for web, plus Capacitor wrappers for iOS and
Android.

## Features

- List ideas
- Create a new idea
- Persist ideas in Prisma + SQLite
- No auth

## Setup

From the repo root, install deps and build the `@point0/*` packages so the
`point0` CLI works:

```bash
bun install
bun run build
```

Then, in this folder:

```bash
bun run prisma:generate
bun run prisma:push
bun run generate   # point0 points/routes — src/generated is gitignored
```

## Run Web

```bash
bun run web
```

## iOS / Android (Capacitor)

First time:

```bash
bun run cap:add:ios
bun run cap:add:android
```

Then each update:

```bash
bun run cap:sync
```

Open native projects:

```bash
bun run ios
bun run android
```

## For a real app

This example shows Point0 in isolation. Building something real? See
[FOR_A_REAL_APP.md](./FOR_A_REAL_APP.md).
