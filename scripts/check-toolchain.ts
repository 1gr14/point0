#!/usr/bin/env bun
/**
 * check-toolchain — asserts that the TypeScript wiring in `node_modules` is the one we declared.
 *
 * The monorepo deliberately installs TWO TypeScripts, because 7.0 dropped the classic JS compiler API:
 *
 * - `typescript` (6.x) — the API. typescript-eslint's type-aware rules and tsdown's `.d.ts` emit load it as a module;
 *   neither works against 7 until 7.1 ships a stable API.
 * - `@typescript/native` (`npm:typescript@7`) — the compiler. It owns `node_modules/.bin/tsc`, so `bun run types` checks
 *   against the TypeScript our users actually run.
 *
 * Both failure modes here are SILENT, which is why they get a gate instead of a comment: nothing errors, the wrong
 * compiler just quietly does the work. A stale incremental `bun install` can leave a nested `typescript` inside a
 * workspace package, whose local `.bin/tsc` then shadows the root one — `bun run types` reports success having
 * type-checked with 6. And if `typescript` itself ever resolved to 7, `import 'typescript'` would hand eslint an object
 * whose every member is `undefined`.
 *
 * Run after install, before anything that type-checks. `--quiet` suppresses the success line.
 */
import { createRequire } from 'node:module'
import { lstatSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const quiet = process.argv.includes('--quiet')
const problems: string[] = []

const rootPkg = JSON.parse(await Bun.file(join(rootDir, 'package.json')).text())

/** The `tsc` entry in a package's `.bin`, or null. Windows gets `.exe`/`.cmd`/`.bat` shims instead of a bare name. */
const findTscBin = (packageDir: string): string | null => {
  for (const name of ['tsc', 'tsc.exe', 'tsc.cmd', 'tsc.bat']) {
    const bin = join(packageDir, 'node_modules', '.bin', name)
    try {
      // lstat, not stat: the entry is a symlink into the package, and a broken one shadows just as effectively.
      lstatSync(bin)
      return bin
    } catch {
      // keep looking
    }
  }
  return null
}

// 1. `tsc` must be TypeScript 7 — this is what every `types` script invokes.
const rootTsc = findTscBin(rootDir)
if (!rootTsc) {
  console.info('check-toolchain: no node_modules/.bin/tsc — run `bun install` first. Skipped.')
  process.exit(0)
}
const tscVersion = (await Bun.$`${rootTsc} --version`.quiet().text()).trim()
if (!/\bVersion 7\./.test(tscVersion)) {
  problems.push(
    `node_modules/.bin/tsc is "${tscVersion}", expected TypeScript 7.\n` +
      `    The \`@typescript/native\` alias should own this bin. Try a clean install: \`bun run clean:nm && bun install\`.`,
  )
}

// 2. The `typescript` MODULE must stay on 6 — typescript-eslint and tsdown resolve it by name and need the classic API.
const require = createRequire(join(rootDir, 'package.json'))
try {
  const ts = require('typescript') as { version?: string; sys?: unknown }
  if (!ts.version?.startsWith('6.')) {
    problems.push(`\`require('typescript')\` is ${ts.version ?? 'unknown'}, expected 6.x.`)
  }
  if (typeof ts.sys !== 'object') {
    problems.push(
      `\`require('typescript')\` exposes no \`sys\` — that is the TypeScript 7 package, which ships no compiler API.\n` +
        `    typescript-eslint and tsdown's dts emit would both break in confusing ways.`,
    )
  }
} catch (error) {
  problems.push(`\`require('typescript')\` failed: ${(error as Error).message}`)
}

// 3. Whichever `tsc` a package's `types` script picks up must be TypeScript 7. A package may legitimately carry its
//    own nested one — the scaffold template declares its own 7 and so always will — but a stale 6 left over from an
//    incremental install shadows the root bin, and the run then reports success from the wrong compiler.
//
//    Only packages that HAVE a `types` script are checked: that is the only thing a shadowed bin can make lie.
//    `examples/expo` nests a TypeScript 5 from the Expo SDK and never invokes it, which is nobody's problem.
const IGNORE_DIRS = new Set(['node_modules', 'dist', '.git'])
const workspaceDirs: string[] = []
const findWorkspaceDirs = (dir: string) => {
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return
  }
  if (entries.includes('package.json')) workspaceDirs.push(dir)
  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry) || entry.startsWith('.')) continue
    const full = join(dir, entry)
    try {
      if (statSync(full).isDirectory()) findWorkspaceDirs(full)
    } catch {
      // ignore
    }
  }
}
for (const glob of (rootPkg.workspaces?.packages ?? []) as string[]) {
  findWorkspaceDirs(join(rootDir, glob.split('/*')[0]!))
}

const hasTypesScript = (dir: string): boolean => {
  try {
    return Boolean(JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8')).scripts?.types)
  } catch {
    return false
  }
}

const shadowed: string[] = []
for (const dir of workspaceDirs) {
  if (!hasTypesScript(dir)) continue
  const bin = findTscBin(dir)
  if (!bin) continue
  const version = await Bun.$`${bin} --version`
    .quiet()
    .text()
    .then((out) => out.trim())
    .catch(() => 'unreadable')
  if (!/\bVersion 7\./.test(version)) shadowed.push(`${relative(rootDir, dir)} → ${version}`)
}
if (shadowed.length > 0) {
  problems.push(
    `${shadowed.length} workspace package(s) have a nested tsc that is not TypeScript 7, shadowing the root one:\n` +
      shadowed.map((d) => `      ${d}`).join('\n') +
      `\n    Usually left over from an incremental install. Fix with \`bun run clean:nm && bun install\`.`,
  )
}

if (problems.length > 0) {
  console.error('check-toolchain: the TypeScript wiring is not what package.json declares:\n')
  for (const problem of problems) console.error(`  - ${problem}\n`)
  process.exit(1)
}
if (!quiet) console.info(`check-toolchain: tsc ${tscVersion.replace(/^Version /, '')}, typescript module 6.x. ✓`)
