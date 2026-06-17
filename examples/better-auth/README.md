# Point0 — better-auth example

The ideas board plus authentication via [Better Auth](https://better-auth.com):
sign-in, protected pages, and a typed `AppError` with `UNAUTHORIZED` /
`FORBIDDEN` codes. The error class lives in
[`src/lib/error.ts`](src/lib/error.ts), its component and hook in
[`src/ui/error.tsx`](src/ui/error.tsx).

## Run

From the **repo root** (once) — install deps and build the `@point0/*` packages
so the `point0` CLI is available:

```bash
bun install
bun run build
```

Then, in this folder:

```bash
bun run setup   # create the SQLite DB, generate the Prisma + point0 code, seed data
bun run dev     # dev server + client, with server hot reload (point0 dev --hot)
```

`src/generated/` (the Prisma client and point0's points/routes/assets) is
gitignored — `bun run setup` (or `point0 generate`) produces it. Without it
typecheck fails and the app won't run.

## Production build

```bash
bun run build
bun run start
```

## For a real app

This example shows Point0 in isolation. Building something real? See
[FOR_A_REAL_APP.md](./FOR_A_REAL_APP.md).
