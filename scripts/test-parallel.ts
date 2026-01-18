import { cpus } from 'node:os'
import * as nodePath from 'node:path'

const noSlowTests = process.env.NO_SLOW_TESTS === '1'
console.log('noSlowTests', noSlowTests)
const noTestUtilsTests = process.env.NO_TEST_UTILS_TESTS === '1'
const liveTestOutput = process.env.LIVE_TEST_OUTPUT === '1'

const slowTests = ['engine/tests/build.test.ts', 'engine/tests/dev.test.ts']
const testUtilsTests = ['engine/tests/utils/*']

const cwd = nodePath.resolve(__dirname, '..', 'packages')
const glob = new Bun.Glob('**/*.{test,spec}.{ts,tsx,js,jsx}')

const ignoredDirsNames = ['node_modules', 'dist', 'packages-dist-npm', '.git']

const toAbsolute = (pattern: string) => nodePath.resolve(cwd, pattern)
const matchPattern = (filePath: string, pattern: string) => {
  if (pattern.endsWith(`${nodePath.sep}*`)) {
    const prefix = pattern.slice(0, -2)
    return filePath.startsWith(prefix + nodePath.sep)
  }
  return filePath === pattern
}

const slowTestsAbs = slowTests.map(toAbsolute)
const testUtilsTestsAbs = testUtilsTests.map(toAbsolute)

const thorIfFilesNotFound = (allAbsFiles: string[], presentFiles: string[]) => {
  console.log('allAbsFiles', allAbsFiles)
  for (const presnetFile of presentFiles) {
    if (presnetFile.endsWith('*')) {
      const prefix = presnetFile.slice(0, -1)
      if (!allAbsFiles.some((file) => file.startsWith(prefix))) {
        throw new Error(`Present test file not found: ${presnetFile}`)
      }
    } else {
      if (!allAbsFiles.some((file) => file === presnetFile)) {
        throw new Error(`Present test file not found: ${presnetFile}`)
      }
    }
  }
}

const shouldExclude = (filePath: string) => {
  if (noSlowTests && slowTestsAbs.some((pattern) => matchPattern(filePath, pattern))) {
    return true
  }
  if (noTestUtilsTests && testUtilsTestsAbs.some((pattern) => matchPattern(filePath, pattern))) {
    return true
  }
  return false
}

const allAbsFiles = [...(await Array.fromAsync(glob.scan(cwd)))]
  .map((path) => nodePath.resolve(cwd, path))
  .filter((path) => !ignoredDirsNames.some((dirName) => path.split(nodePath.sep).includes(dirName)))

thorIfFilesNotFound(allAbsFiles, slowTestsAbs)
thorIfFilesNotFound(allAbsFiles, testUtilsTestsAbs)

const files = allAbsFiles.filter((path) => !shouldExclude(path)).sort((a, b) => a.localeCompare(b))

if (files.length === 0) {
  console.log('No test files found.')
  process.exit(0)
}

const maxParallel = Number(process.env.TEST_PARALLEL_LIMIT ?? cpus().length)
const limit = Number.isFinite(maxParallel) && maxParallel > 0 ? maxParallel : 1

console.log(`Running ${files.length} test files with parallelism=${limit}`)

let failed = 0
let index = 0
const outputs = new Map<string, string>()

const runFile = async (filePath: string) => {
  const proc = Bun.spawn({
    cmd: ['bun', 'test', filePath],
    stdout: liveTestOutput ? 'inherit' : 'pipe',
    stderr: liveTestOutput ? 'inherit' : 'pipe',
  })
  let stdout = ''
  let stderr = ''
  if (!liveTestOutput) {
    if (proc.stdout) {
      stdout = await new Response(proc.stdout).text()
    }
    if (proc.stderr) {
      stderr = await new Response(proc.stderr).text()
    }
  }
  const code = await proc.exited
  if (code !== 0) {
    failed = 1
  }
  if (!liveTestOutput) {
    const header = `\n===== ${filePath} =====\n`
    outputs.set(filePath, `${header}${stdout}${stderr}`)
  }
}

const runNext = async (): Promise<void> => {
  const i = index++
  if (i >= files.length) {
    return
  }
  await runFile(files[i])
  await runNext()
}

await Promise.all(Array.from({ length: Math.min(limit, files.length) }, async () => await runNext()))

if (!liveTestOutput) {
  for (const filePath of files) {
    const output = outputs.get(filePath)
    if (output) {
      process.stdout.write(output)
    }
  }
}

process.exit(failed)
