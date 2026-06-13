#!/usr/bin/env bun
/**
 * publish — publish every packages/* whose current version isn't on npm yet. Idempotent: already-published versions are
 * skipped, so it's safe to run on every push. Access comes from each package's publishConfig (restricted now, public at
 * launch). `private: true` packages (create-app while unscoped) are skipped. Runs in CI with npm auth.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const packagesDir = join(rootDir, 'packages')

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

  console.info(`publish ${id}`)
  const res = Bun.spawnSync(['npm', 'publish'], { cwd: join(packagesDir, dir), stdout: 'inherit', stderr: 'inherit' })
  if (res.exitCode !== 0) {
    console.error(`FAILED to publish ${id}`)
    process.exit(res.exitCode)
  }
  published++
}

console.info(
  published === 0 ? 'Nothing to publish (all current versions already on npm).' : `Published ${published} package(s).`,
)
