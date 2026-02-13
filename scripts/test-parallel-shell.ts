/**
 * Run testone for each package test file using execa.
 * Grouped output per file, then failures summarized at the end.
 */
import execa from 'execa'
import { cpus } from 'node:os'
import * as nodePath from 'node:path'

const root = nodePath.resolve(import.meta.dir, '..')
const cwd = nodePath.resolve(root, 'packages')
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
console.info(`Running ${files.length} files with execa (parallelism=${limit})`)

const extractFailureLines = (output: string): string[] => {
  const lines = output.split(/\r?\n/).filter(Boolean)
  const matched = lines.filter(
    (line) => /^\s*[✗×]/.test(line) || /\bFAIL\b/.test(line) || /\bfailed\b/i.test(line) || /\bError:/.test(line),
  )
  return matched.length > 0 ? matched : lines.slice(-25)
}

const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms.toFixed(0)}ms`
  const s = ms / 1000
  if (s < 60) return `${s.toFixed(2)}s`
  const m = Math.floor(s / 60)
  return `${m}m${(s - m * 60).toFixed(1)}s`
}

type Result = { filePath: string; exitCode: number; output: string }

const results: Result[] = new Array(files.length)
let index = 0

const runNext = async (): Promise<void> => {
  const i = index++
  if (i >= files.length) return
  const filePath = files[i]
  const result = await execa('bun', ['test', filePath], {
    cwd: root,
    all: true,
    reject: false,
  })
  const output = (result as { all?: string }).all ?? result.stdout + (result.stderr ? `\n${result.stderr}` : '')
  results[i] = { filePath, exitCode: result.exitCode, output }
  return await runNext()
}

const startTime = Date.now()
await Promise.all(Array.from({ length: limit }, async () => await runNext()))

// Grouped output: each file's output in order
for (const { filePath, output } of results) {
  process.stdout.write(`\n===== ${filePath} =====\n`)
  process.stdout.write(output)
  if (output && !output.endsWith('\n')) process.stdout.write('\n')
}

const failed = results.filter((r) => r.exitCode !== 0)
if (failed.length > 0) {
  process.stdout.write('\n\n===== Failures =====\n')
  for (const { filePath, exitCode, output } of failed) {
    process.stdout.write(`\n--- ${filePath} (exit ${exitCode}) ---\n`)
    for (const line of extractFailureLines(output)) {
      process.stdout.write(`${line}\n`)
    }
  }
}

const duration = formatDuration(Date.now() - startTime)
process.stdout.write(`\n===== Total: ${results.length} files, ${failed.length} failed, ${duration} =====\n`)
process.exit(failed.length > 0 ? 1 : 0)
