# My Point0 app

A fullstack web app built with Point0 — SSR, Prisma + SQLite, Tailwind, and
type-safe routing, all in TypeScript.

## Run

```bash
bun install
bun run setup   # create the SQLite DB, generate the Prisma + point0 code, seed data
bun run dev     # dev server + client, with server hot reload
```

`bun create point0-app` already ran `setup` for you, so usually you can jump
straight to `bun run dev`. Run `bun run setup` again after a fresh clone or
whenever you reset the database.

`src/generated/` (the Prisma client and point0's points/routes/assets) is
gitignored — `bun run setup` (or `point0 generate`) produces it. Without it
typecheck fails and the app won't run.

## Playground

The home page demos the core loop: an `Idea` Prisma model
(`prisma/schema.prisma`), a query that lists the rows (`src/lib/idea.ts`), and a
mutation with a form that adds one (`src/pages/home.tsx`). `bun run setup` seeds
a few ideas (`src/lib/seed.ts`). Edit or delete it all freely — it's there to be
replaced.

## Production build

```bash
bun run build
bun run start
```

## For a real app

This is the bare starter. For a fuller foundation — auth, admin, billing, and
more already wired up — see [FOR_A_REAL_APP.md](./FOR_A_REAL_APP.md).
