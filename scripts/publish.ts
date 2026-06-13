#!/usr/bin/env bun
/**
 * publish — publish every packages/* whose current version isn't on npm yet. Idempotent: already-published versions are
 * skipped, so it's safe to run on every push. Access comes from each package's publishConfig (restricted now, public at
 * launch). `private: true` packages (create-app while unscoped) are skipped. Runs in CI with npm auth.
 *
 * The dist-tag comes from the version: a prerelease x.y.z-next.N publishes under `--tag next`, a stable x.y.z under
 * `latest`. The branch ↔ version channel invariant (scripts/check-channel.ts) is asserted first, so a prerelease can
 * never land on main/latest (and a stable can never land on next).
 */
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const packagesDir = join(rootDir, 'packages')

// Channel guard first — refuse to publish anything if the version doesn't match the branch.
const guard = Bun.spawnSync(['bun', join(rootDir, 'scripts/check-channel.ts')], {
  stdout: 'inherit',
  stderr: 'inherit',
})
if (guard.exitCode !== 0) process.exit(guard.exitCode)

const distTag = (version: string): string => (version.includes('-') ? version.split('-')[1].split('.')[0] : 'latest')

let published = 0
for (const dir of readdirSync(packagesDir)) {
  const pkgPath = join(packagesDir, dir, 'package.json')
  let pkg: { name?: string; version?: string; private?: boolean }
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
  } catch {
    continue
  }
  if (!pkg.name || !pkg.version || pkg.private) continue

  const id = `${pkg.name}@${pkg.version}`
  const onNpm = Bun.spawnSync(['npm', 'view', id, 'version']).exitCode === 0
  if (onNpm) {
    console.info(`skip ${id} (already published)`)
    continue
  }

  const tag = distTag(pkg.version)
  console.info(`publish ${id} (tag: ${tag})`)
  const res = Bun.spawnSync(['npm', 'publish', '--tag', tag], {
    cwd: join(packagesDir, dir),
    stdout: 'inherit',
    stderr: 'inherit',
  })
  if (res.exitCode !== 0) {
    console.error(`FAILED to publish ${id}`)
    process.exit(res.exitCode)
  }
  published++
}

console.info(
  published === 0 ? 'Nothing to publish (all current versions already on npm).' : `Published ${published} package(s).`,
)
