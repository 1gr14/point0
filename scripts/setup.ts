#!/usr/bin/env bun
// One-time codegen setup so `bun run types` (tsgo) / `bun run types:6` (tsc) pass on the example apps + the create-app template.
// Those are workspace packages, so `bun --filter '**' types` typechecks them — but their entire `src/generated` is
// gitignored (the Prisma client AND point0's generated points/routes/assets), and the template
// (`packages/create-app/template`, package name `my-app`) ships only `env.example` (its own `.env` is gitignored). On a
// fresh checkout / git worktree / CI runner those are missing and typecheck fails (`Cannot find module
// '@/generated/prisma/client'` / `Cannot find module './generated/point0/points.client'`).
//
// This script, run AFTER `bun install` + `bun run build`:
//   1. copies `env.example` -> `.env` for any Prisma app that lacks a `.env` (only the template needs it — `prisma
//      generate` loads `.env` via the app's `prisma.config.ts`/dotenv to resolve `DATABASE_URL`);
//   2. runs `prisma generate` across the workspace (`bun --filter '**' prisma:generate`);
//   3. runs `point0 generate` across the workspace (`bun --filter '**' generate`) — needs the built `point0` bin and
//      the Prisma client from step 2, since it imports each app's engine config.
// Codegen only — NO migrate / seed / DB. (Running the app still needs the app's own `setup` script.)
import { Glob } from 'bun'
import { copyFileSync, existsSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'

const root = process.cwd()

// Prisma apps = workspace packages that ship a `prisma.config.ts` (examples/* + the create-app template).
const prismaDirs: string[] = []
for (const rel of new Glob('{examples,packages}/**/prisma.config.ts').scanSync(root)) {
  if (rel.includes('node_modules') || rel.includes('/dist/')) continue
  prismaDirs.push(dirname(join(root, rel)))
}

if (prismaDirs.length === 0) {
  console.info('setup: no Prisma apps found — nothing to do')
  process.exit(0)
}

// 1. Ensure every Prisma app has a `.env` (the template ships only `env.example`; examples commit their `.env`).
for (const dir of prismaDirs) {
  const envFile = join(dir, '.env')
  const envExample = join(dir, 'env.example')
  if (!existsSync(envFile) && existsSync(envExample)) {
    copyFileSync(envExample, envFile)
    console.info(`setup: created ${relative(root, envFile)} from env.example`)
  }
}

// 2. Generate the Prisma client in every workspace package that defines the `prisma:generate` script.
console.info('setup: generating Prisma clients (bun --filter "**" prisma:generate)…')
const prismaProc = Bun.spawnSync(['bun', '--filter', '**', 'prisma:generate'], {
  cwd: root,
  stdio: ['inherit', 'inherit', 'inherit'],
})
if (!prismaProc.success) {
  process.exit(1)
}

// 3. Generate point0 files (points/routes/assets.d.ts) in every workspace package that defines the `generate` script
//    (`point0 generate`). These live under the now-gitignored `src/generated/point0`, so a fresh checkout / worktree /
//    CI must produce them before `bun run types` or the apps' `./generated/point0/*` imports won't resolve.
console.info('setup: generating point0 files (bun --filter "**" generate)…')
const generateProc = Bun.spawnSync(['bun', '--filter', '**', 'generate'], {
  cwd: root,
  stdio: ['inherit', 'inherit', 'inherit'],
})
process.exit(generateProc.success ? 0 : 1)
