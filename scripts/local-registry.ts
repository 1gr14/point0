#!/usr/bin/env bun
/**
 * local-registry — serve the @point0/* packages from a local npm registry (Verdaccio) so any project can install the
 * unpublished local build exactly like the real thing.
 *
 * bun run local-registry build + publish all packages, then keep serving bun run local-registry --skip-build skip the
 * build (use the current dist/)
 *
 * In the consumer project add an `.npmrc`:
 *
 * @point0:registry=http://localhost:4873 //localhost:4873/:_authToken=local
 *
 * then `bun install`. To refresh: rebuild here, restart this command, `bun update @point0/*` there. Full guide:
 * dev/docs/local-registry.md. Storage is a wiped temp dir — nothing persists between runs, so every restart republishes
 * cleanly with no version conflicts.
 */
import { spawn } from 'bun'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const skipBuild = process.argv.includes('--skip-build')

const PORT = 4873
const REGISTRY = `http://localhost:${PORT}`

// The packages to serve locally (all 9, incl create-app + docs — locally they can all be used).
const PACKAGES = ['core', 'compiler', 'engine', 'react-dom', 'cors', 'openapi', 'basic-auth', 'create-app', 'docs']

const workDir = join(tmpdir(), 'point0-local-registry')
const storageDir = join(workDir, 'storage')
const configPath = join(workDir, 'config.yaml')
const npmrcPath = join(workDir, 'publish.npmrc')

const log = (msg: string) => process.stdout.write(`\n[local-registry] ${msg}\n`)

const run = async (cmd: string[], cwd: string) => {
  const code = await spawn(cmd, { cwd, stdout: 'inherit', stderr: 'inherit' }).exited
  if (code !== 0) throw new Error(`failed (${code}): ${cmd.join(' ')}`)
}

// Fresh storage every run → publishing the same version never 409s.
rmSync(workDir, { recursive: true, force: true })
mkdirSync(storageDir, { recursive: true })

writeFileSync(
  configPath,
  `storage: ${storageDir}
uplinks:
  npmjs:
    url: https://registry.npmjs.org/
    cache: false
packages:
  '@point0/*':
    access: $all
    publish: $all
    unpublish: $all
  'create-point0-app':
    access: $all
    publish: $all
    unpublish: $all
  '@*/*':
    access: $all
    publish: $all
    proxy: npmjs
  '**':
    access: $all
    publish: $all
    proxy: npmjs
log: { type: stdout, format: pretty, level: warn }
`,
)

// Dummy auth so `npm publish` is happy; Verdaccio allows anonymous publish here anyway.
writeFileSync(npmrcPath, `@point0:registry=${REGISTRY}/\n//localhost:${PORT}/:_authToken=local\n`)

if (!skipBuild) {
  log('building @point0/* (use --skip-build to skip)…')
  await run(['bun', 'run', 'build'], rootDir)
}

const verdaccioBin = join(rootDir, 'node_modules', '.bin', 'verdaccio')
log(`starting Verdaccio on ${REGISTRY} …`)
const verdaccio = spawn([verdaccioBin, '--config', configPath, '--listen', String(PORT)], {
  cwd: workDir,
  stdout: 'inherit',
  stderr: 'inherit',
})

const waitForUp = async () => {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`${REGISTRY}/-/ping`)
      if (res.ok) return
    } catch {
      // not up yet
    }
    await Bun.sleep(500)
  }
  throw new Error('Verdaccio did not come up within 30s')
}

const shutdown = (code = 0) => {
  try {
    verdaccio.kill()
  } catch {
    // ignore
  }
  rmSync(workDir, { recursive: true, force: true })
  process.exit(code)
}
process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

try {
  await waitForUp()
  log('publishing packages…')
  for (const pkg of PACKAGES) {
    await run(['npm', 'publish', '--registry', REGISTRY, '--userconfig', npmrcPath], join(rootDir, 'packages', pkg))
  }
  log(
    `serving ${PACKAGES.length} packages on ${REGISTRY}\n` +
      `  In a project add .npmrc:  @point0:registry=${REGISTRY}\n` +
      `  then \`bun install\`. Ctrl-C here to stop (storage is wiped on exit).`,
  )
  await verdaccio.exited
  shutdown(0)
} catch (error) {
  console.error(error)
  shutdown(1)
}
