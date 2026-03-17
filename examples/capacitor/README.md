# Point0 + Capacitor Example

Simple ideas app built with Point0 for web, plus Capacitor wrappers for iOS and Android.

## Features

- List ideas
- Create a new idea
- Persist ideas in Prisma + SQLite
- No auth

## Setup

```bash
bun install
cd examples/capacitor
bun run prisma:generate
bun run prisma:push
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
