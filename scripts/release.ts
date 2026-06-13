#!/usr/bin/env bun
/**
 * release — bump every workspace package to the next version (lockstep), fix internal dependency ranges, and promote
 * the CHANGELOG "Unreleased" section. Then you review, commit, tag, and push — CI publishes (scripts/publish.ts).
 *
 * bun run release patch 0.1.0 → 0.1.1 bun run release minor 0.1.0 → 0.2.0 bun run release prerelease 0.1.0 →
 * 0.1.0-next.0 (re-run → -next.1, -next.2 …) bun run release stable 0.1.0-next.3 → 0.1.0 (strip the prerelease suffix)
 * bun run release 0.5.0 explicit version (also accepts 0.5.0-next.0)
 *
 * Prereleases publish from `next` (dist-tag next); stable from `main` (dist-tag latest) — the branch ↔ version
 * invariant is enforced by scripts/check-channel.ts in CI and on pre-push. patch/minor always stay in 0.x — they can
 * never reach 1.0.0. An explicit jump out of 0.x is refused on purpose (edit this file if you ever truly mean 1.0).
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const readJson = (p: string) => JSON.parse(readFileSync(p, 'utf-8'))

const PRE = 'next' // prerelease identifier + channel name

const arg = process.argv[2]
if (!arg) {
  console.error('usage: bun run release <patch|minor|prerelease|stable|x.y.z[-next.N]>')
  process.exit(1)
}

const current = readJson(join(rootDir, 'package.json')).version as string
const [base, pre] = current.split('-') as [string, string?] // pre e.g. "next.3" | undefined
const [maj, min, pat] = base.split('.').map(Number)

let next: string
if (arg === 'patch') next = `${maj}.${min}.${pat + 1}`
else if (arg === 'minor') next = `${maj}.${min + 1}.0`
else if (arg === 'prerelease') {
  // open a prerelease line for the current base, or bump the -next.N counter if already on one
  const n = pre?.startsWith(`${PRE}.`) ? Number(pre.slice(PRE.length + 1)) + 1 : 0
  next = `${base}-${PRE}.${n}`
} else if (arg === 'stable') {
  if (!pre) {
    console.error(`Already stable (${current}); nothing to strip.`)
    process.exit(1)
  }
  next = base
} else if (/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(arg)) next = arg
else {
  console.error(`Bad version: "${arg}". Use patch, minor, prerelease, stable, or an explicit x.y.z[-next.N].`)
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

// Promote the CHANGELOG "Unreleased" section — only for a stable cut. Prereleases are interim,
// so they leave Unreleased to keep accumulating until the real release.
const isPre = next.includes('-')
const changelogPath = join(rootDir, 'CHANGELOG.md')
if (!isPre && existsSync(changelogPath)) {
  const date = new Date().toISOString().slice(0, 10)
  const raw = readFileSync(changelogPath, 'utf-8')
  if (raw.includes('## Unreleased')) {
    writeFileSync(changelogPath, raw.replace('## Unreleased', `## Unreleased\n\n## ${next} — ${date}`))
    console.info(`CHANGELOG: promoted Unreleased → ${next}`)
  } else {
    console.warn('CHANGELOG.md has no "## Unreleased" heading — add the release notes by hand.')
  }
}

const branch = isPre ? 'next' : 'main'
const tag = isPre ? '' : ` && git tag v${next}`
console.info(
  `\nReady (${next}, channel: ${branch}). Review the diff, then:\n` +
    `  git add -A && git commit -m "chore(release): ${next}"${tag}\n` +
    `  git checkout ${branch} && git merge --ff-only dev && git push origin ${branch}${tag ? ' --follow-tags' : ''}   # CI publishes`,
)
