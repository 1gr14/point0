#!/usr/bin/env bun
/**
 * sync-versions — single source of truth for dependency versions across the monorepo.
 *
 * The root package.json `workspaces.catalog` is a plain version TABLE — data only. The bun `catalog:` protocol is NOT
 * used anywhere; every workspace package carries REAL, materialized version ranges. That keeps each `package.json`
 * always publishable as-is (no publish-time transform) and lets a copied example install straight from npm.
 *
 * Two jobs, applied to root + every workspace package:
 *
 * - external deps that appear in the catalog table → pinned to the table version
 * - internal @point0/* deps → ^<point0 version> (lockstep)
 * - everything else (package-private deps) → left untouched
 *
 * Workspace linking still works without `workspace:*`: bun links a workspace package whenever the local version
 * satisfies the range (link-workspace-packages=true), and under lockstep `^x.y.z` always satisfies the local `x.y.z`.
 *
 * Modes: --check (default) verify every package matches the table; exit 1 on drift --write rewrite every package to
 * match --point0-version X force internal @point0/* ranges to ^X (release time, X = nextRelease.version); default = the
 * package's own version
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const args = process.argv.slice(2)
const write = args.includes('--write')
const forcedPoint0Version = (() => {
  const i = args.indexOf('--point0-version')
  return i !== -1 ? (args[i + 1] ?? null) : null
})()

const DEP_SECTIONS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'] as const
const IGNORE_DIRS = new Set(['node_modules', 'dist', '.git'])

const readJson = (p: string) => JSON.parse(readFileSync(p, 'utf-8'))

const rootPkgPath = join(rootDir, 'package.json')
const rootPkg = readJson(rootPkgPath)
const catalog: Record<string, string> = rootPkg.workspaces?.catalog ?? {}

// Discover every workspace package.json under the workspace globs (packages/**, examples/**).
const globRoots: string[] = (rootPkg.workspaces?.packages ?? []).map((g: string) => g.split('/*')[0])

const findPackageJsons = (dir: string, out: string[]) => {
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return
  }
  if (entries.includes('package.json')) out.push(join(dir, 'package.json'))
  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry) || entry.startsWith('.')) continue
    const full = join(dir, entry)
    try {
      if (statSync(full).isDirectory()) findPackageJsons(full, out)
    } catch {
      // ignore
    }
  }
}

const pkgPaths: string[] = [rootPkgPath]
for (const root of new Set(globRoots)) findPackageJsons(join(rootDir, root), pkgPaths)

// Map of internal package name → its own version (lockstep, but read per-package to be safe).
const versionByName = new Map<string, string>()
for (const p of pkgPaths) {
  const pkg = readJson(p)
  if (pkg.name) versionByName.set(pkg.name, pkg.version)
}

const isInternal = (name: string) => name.startsWith('@point0/')

/** Desired range for a dep, or null to leave it as-is. Throws on an unresolvable protocol. */
const desiredFor = (name: string, current: string, fileForError: string): string | null => {
  if (isInternal(name)) {
    const version = forcedPoint0Version ?? versionByName.get(name)
    if (!version) throw new Error(`[sync-versions] unknown internal package ${name} (in ${fileForError})`)
    return `^${version}`
  }
  if (name in catalog) return catalog[name]
  // Not internal, not in the table: it must NOT be a protocol value, or it's a misconfig.
  if (current.startsWith('catalog:') || current.startsWith('workspace:')) {
    throw new Error(
      `[sync-versions] ${name}: "${current}" but no catalog entry / not internal (in ${fileForError}). ` +
        `Add it to workspaces.catalog or pin it inline.`,
    )
  }
  return null
}

type Drift = { file: string; section: string; dep: string; from: string; to: string }
const drifts: Drift[] = []
const changedFiles: string[] = []

for (const p of pkgPaths) {
  const raw = readFileSync(p, 'utf-8')
  const pkg = JSON.parse(raw)
  const rel = relative(rootDir, p)
  let changed = false

  for (const section of DEP_SECTIONS) {
    const deps = pkg[section]
    if (!deps) continue
    for (const [dep, value] of Object.entries(deps) as [string, string][]) {
      const desired = desiredFor(dep, value, rel)
      if (desired === null || desired === value) continue
      drifts.push({ file: rel, section, dep, from: value, to: desired })
      deps[dep] = desired
      changed = true
    }
  }

  if (changed && write) {
    writeFileSync(p, JSON.stringify(pkg, null, 2) + '\n')
    changedFiles.push(rel)
  }
}

if (write) {
  if (changedFiles.length === 0) {
    console.info('sync-versions: already in sync, nothing to write.')
  } else {
    for (const d of drifts) console.info(`  ${d.file} ${d.section}.${d.dep}: ${d.from} → ${d.to}`)
    console.info(`sync-versions: wrote ${changedFiles.length} file(s).`)
  }
} else {
  if (drifts.length === 0) {
    console.info('sync-versions: all packages in sync with the catalog table. ✓')
  } else {
    console.error('sync-versions: version drift detected (run `bun run versions:write`):\n')
    for (const d of drifts) console.error(`  ${d.file} ${d.section}.${d.dep}: ${d.from} → expected ${d.to}`)
    process.exit(1)
  }
}
