#!/usr/bin/env bun
/**
 * release — bump every workspace package to the next version (lockstep), fix internal dependency ranges, and promote
 * the CHANGELOG "Unreleased" section. Then you review, commit, tag, and push — CI publishes (scripts/publish.ts).
 *
 * bun run release patch 0.1.0 → 0.1.1 bun run release minor 0.1.0 → 0.2.0 bun run release 0.5.0 explicit version
 *
 * patch/minor always stay in 0.x — they can never reach 1.0.0. An explicit jump out of 0.x is refused on purpose (edit
 * this file if you ever truly mean 1.0).
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const readJson = (p: string) => JSON.parse(readFileSync(p, 'utf-8'))

const arg = process.argv[2]
if (!arg) {
  console.error('usage: bun run release <patch|minor|x.y.z>')
  process.exit(1)
}

const current = readJson(join(rootDir, 'package.json')).version as string
const [maj, min, pat] = current.split('.').map(Number)

let next: string
if (arg === 'patch') next = `${maj}.${min}.${pat + 1}`
else if (arg === 'minor') next = `${maj}.${min + 1}.0`
else if (/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(arg)) next = arg
else {
  console.error(`Bad version: "${arg}". Use patch, minor, or an explicit x.y.z.`)
  process.exit(1)
}

if (maj === 0 && Number(next.split('.')[0]) !== 0) {
  console.error(`Refusing ${current} → ${next}: that leaves 0.x. Edit scripts/release.ts if you truly mean 1.0.`)
  process.exit(1)
}

// Set the version in every workspace package.json + the root (lockstep).
const pkgFiles: string[] = [join(rootDir, 'package.json')]
const walk = (dir: string) => {
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e === 'dist' || e.startsWith('.')) continue
    const f = join(dir, e)
    if (statSync(f).isDirectory()) walk(f)
    else if (e === 'package.json') pkgFiles.push(f)
  }
}
walk(join(rootDir, 'packages'))
walk(join(rootDir, 'examples'))

for (const f of pkgFiles) {
  const pkg = readJson(f)
  if (!pkg.version) continue
  pkg.version = next
  writeFileSync(f, JSON.stringify(pkg, null, 2) + '\n')
}
console.info(`version ${current} → ${next} in ${pkgFiles.length} package.json`)

// Fix internal @point0/* ranges (→ ^next) + external deps from the catalog table.
const sync = Bun.spawnSync(['bun', join(rootDir, 'scripts/sync-versions.ts'), '--write'], {
  cwd: rootDir,
  stdout: 'inherit',
  stderr: 'inherit',
})
if (sync.exitCode !== 0) process.exit(sync.exitCode)

// Promote the CHANGELOG "Unreleased" section to the new version.
const changelogPath = join(rootDir, 'CHANGELOG.md')
if (existsSync(changelogPath)) {
  const date = new Date().toISOString().slice(0, 10)
  const raw = readFileSync(changelogPath, 'utf-8')
  if (raw.includes('## Unreleased')) {
    writeFileSync(changelogPath, raw.replace('## Unreleased', `## Unreleased\n\n## ${next} — ${date}`))
    console.info(`CHANGELOG: promoted Unreleased → ${next}`)
  } else {
    console.warn('CHANGELOG.md has no "## Unreleased" heading — add the release notes by hand.')
  }
}

console.info(
  `\nReady. Review the diff, then:\n` +
    `  git add -A && git commit -m "chore(release): ${next}" && git tag v${next}\n` +
    `  git push origin <branch> --follow-tags   # CI publishes`,
)
