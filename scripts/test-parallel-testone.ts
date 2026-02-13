/**
 * Run testone for each package test file in parallel. Uses only Bun (Bun.Glob + Bun.spawn).
 * No shell / find / xargs. Parallelism managed by Bun.
 */
import { cpus } from 'node:os'
import * as nodePath from 'node:path'

const cwd = nodePath.resolve(import.meta.dir, '..', 'packages')
const glob = new Bun.Glob('**/*.{test,spec}.{ts,tsx,js,jsx}')
const ignoredDirs = new Set(['node_modules', 'dist', 'packages-dist-npm', '.git'])

const files = [...(await Array.fromAsync(glob.scan(cwd)))]
  .map((p) => nodePath.resolve(cwd, p))
  .filter((p) => !p.split(nodePath.sep).some((seg) => ignoredDirs.has(seg)))
  .sort((a, b) => a.localeCompare(b))

if (files.length === 0) {
  console.info('No test files found.')
  process.exit(0)
}

const limit = Math.max(1, Math.min(files.length, Number(process.env.TEST_PARALLEL_LIMIT ?? cpus().length) || 1))
console.info(`Running testone for ${files.length} files (parallelism=${limit})`)

let index = 0
let failed = 0

const runNext = async (): Promise<void> => {
  const i = index++
  if (i >= files.length) return
  const proc = Bun.spawn({
    cmd: ['bun', 'run', 'testone', '--', files[i]],
    cwd: nodePath.resolve(import.meta.dir, '..'),
    stdout: 'inherit',
    stderr: 'inherit',
  })
  const code = await proc.exited
  if (code !== 0) failed = 1
  await runNext()
}

await Promise.all(Array.from({ length: limit }, () => runNext()))
process.exit(failed)
