import { cpus } from 'node:os'
import * as nodePath from 'node:path'

const slowTestsOnly = process.env.SLOW_TESTS_ONLY === '1'
const noSlowTests = process.env.NO_SLOW_TESTS === '1'
const noTestUtilsTests = process.env.NO_TEST_UTILS_TESTS === '1'
const liveTestOutput = process.env.LIVE_TEST_OUTPUT === '1'

const slowTests =
  process.env.SLOW_TESTS_NOT_SLOW === '1'
    ? []
    : [
        'engine/tests/build.test.ts',
        'engine/tests/module-preload-serve.test.ts',
        'engine/tests/cli.test.tsx',
        'engine/tests/mcp.test.ts',
        'engine/tests/dev.test.ts',
        'engine/tests/prefetch-page.test.ts',
        'engine/tests/two-clients.test.ts',
        'engine/tests/publicdir.test.ts',
        'engine/tests/assets.test.tsx',
        'create-app/tests/index.test.tsx',
      ]
const testUtilsTests = ['engine/tests/utils/*']

// Single source of truth for CI's slow-test shard matrix (one runner per file). `discover` calls this
// to build the matrix; each shard then runs `bun test packages/<file>`. Paths are relative to packages/.
if (process.argv.includes('--print-slow-files')) {
  process.stdout.write(JSON.stringify(slowTests))
  process.exit(0)
}

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

const throwIfFilesNotFound = (allAbsFiles: string[], presentFiles: string[]) => {
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

// const shouldExclude = (filePath: string) => {
//   if (noSlowTests && slowTestsAbs.some((pattern) => matchPattern(filePath, pattern))) {
//     return true
//   }
//   if (noTestUtilsTests && testUtilsTestsAbs.some((pattern) => matchPattern(filePath, pattern))) {
//     return true
//   }
//   return false
// }

const allAbsFiles = [...(await Array.fromAsync(glob.scan(cwd)))]
  .map((path) => nodePath.resolve(cwd, path))
  .filter((path) => !ignoredDirsNames.some((dirName) => path.split(nodePath.sep).includes(dirName)))

throwIfFilesNotFound(allAbsFiles, slowTestsAbs)
throwIfFilesNotFound(allAbsFiles, testUtilsTestsAbs)

const parallelFiles = allAbsFiles
  .filter((path) => {
    // exclude all sow tests always, becouse we run it after if needed
    if (slowTestsAbs.some((pattern) => matchPattern(path, pattern))) {
      return false
    }
    if (noTestUtilsTests && testUtilsTestsAbs.some((pattern) => matchPattern(path, pattern))) {
      return false
    }
    if (slowTestsOnly) {
      return false
    }
    return true
  })
  .sort((a, b) => a.localeCompare(b))

const pendingSlowFiles = noSlowTests ? [] : slowTestsAbs

if (parallelFiles.length === 0 && pendingSlowFiles.length === 0) {
  console.info('No test files found.')
  process.exit(0)
}

const maxParallel = Number(process.env.TEST_PARALLEL_LIMIT ?? cpus().length)
const limit = Number.isFinite(maxParallel) && maxParallel > 0 ? maxParallel : 1

if (parallelFiles.length > 0) {
  console.info(`Running ${parallelFiles.length} test files with parallelism=${limit}`)
}

let failed = 0
let index = 0
const outputs = new Map<string, string>()
const exitCodes = new Map<string, number>()
const failureLines = new Map<string, string[]>()

const extractFailureLines = (output: string) => {
  const lines = output.split(/\r?\n/).filter(Boolean)
  const matched = lines.filter(
    (line) => /^\s*[✗×]/.test(line) || /\bFAIL\b/.test(line) || /\bfailed\b/i.test(line) || /\bError:/.test(line),
  )
  return matched.length > 0 ? matched : lines.slice(0, 20)
}

const formatDuration = (ms: number) => {
  if (ms < 1000) {
    return `${ms.toFixed(0)}ms`
  }
  const seconds = ms / 1000
  if (seconds < 60) {
    return `${seconds.toFixed(2)}s`
  }
  const minutes = Math.floor(seconds / 60)
  const rem = seconds - minutes * 60
  return `${minutes}m${rem.toFixed(1)}s`
}

const startTime = Date.now()

const runFile = async (filePath: string) => {
  let output = ''
  const decoder = new TextDecoder()
  const terminal = liveTestOutput
    ? undefined
    : new Bun.Terminal({
        cols: typeof process.stdout.columns === 'number' ? process.stdout.columns : 80,
        rows: typeof process.stdout.rows === 'number' ? process.stdout.rows : 24,
        data(_terminal, data) {
          output += decoder.decode(data, { stream: true })
        },
      })

  const proc = Bun.spawn({
    cmd: ['bun', 'test', filePath],
    stdout: liveTestOutput ? 'inherit' : undefined,
    stderr: liveTestOutput ? 'inherit' : undefined,
    terminal,
  })

  const code = await proc.exited
  exitCodes.set(filePath, code)
  if (code !== 0) {
    failed = 1
  }
  if (terminal) {
    terminal.close()
    output += decoder.decode()
  }
  if (!liveTestOutput) {
    const header = `\n===== ${filePath} =====\n`
    const body = output
    outputs.set(filePath, `${header}${body}`)
    if (code !== 0) {
      failureLines.set(filePath, extractFailureLines(body))
    }
  }
}

const runNext = async (): Promise<void> => {
  const i = index++
  if (i >= parallelFiles.length) {
    return
  }
  await runFile(parallelFiles[i])
  await runNext()
}

await Promise.all(Array.from({ length: Math.min(limit, parallelFiles.length) }, async () => await runNext()))

if (!liveTestOutput) {
  for (const filePath of parallelFiles) {
    const output = outputs.get(filePath)
    if (output) {
      process.stdout.write(output)
    }
  }
  if (failed) {
    process.stdout.write('\n===== Failures =====\n')
    for (const filePath of parallelFiles) {
      const code = exitCodes.get(filePath)
      if (code && code !== 0) {
        process.stdout.write(`\n${filePath} (exit ${code})\n`)
        const lines = failureLines.get(filePath) ?? []
        for (const line of lines) {
          process.stdout.write(`${line}\n`)
        }
      }
    }
  }
}

const final = async () => {
  const endTime = Date.now()
  // Flush every buffered stdout write before exiting. `process.exit()` drops async stdout writes
  // mid-stream; on a CI pipe that truncated the log exactly at the failure — the per-file dumps and
  // the "===== Failures =====" summary never made it out, so a red run showed no cause at all. Awaiting
  // one final write drains everything queued ahead of it (stream writes flush in order).
  await new Promise<void>((resolve) => {
    process.stdout.write(`\n===== Total time: ${formatDuration(endTime - startTime)} =====\n`, () => {
      resolve()
    })
  })
  process.exit(failed)
}

if (failed) {
  await final()
}

if (pendingSlowFiles.length > 0) {
  // Slow integration tests run STRICTLY one file per process, sequentially — never a single combined `bun test`.
  // Each boots a full dev/build tree, so sharing one process lets module-level state and ports bleed across files
  // (the same cross-file interference the parallel phase isolates away). One process per file keeps them honest, and
  // each file's exit code gates the run — a slow failure must fail the whole script, not be silently swallowed.
  for (const slowFile of pendingSlowFiles) {
    const relativeSlowFile = nodePath.relative(cwd, slowFile)
    console.info(`bun test ${relativeSlowFile}`)
    const proc = Bun.spawn({
      cmd: ['bun', 'test', relativeSlowFile],
      cwd,
      stdout: 'inherit',
      stderr: 'inherit',
    })
    const code = await proc.exited
    if (code !== 0) {
      failed = 1
    }
    // Windows leaks browser processes across the suite: each chrome-headless-shell (driven over CDP — Bun
    // can't launch chromium on win32, see dev/docs/windows.md) holds renderer/gpu children + memory, and a
    // test that crashes or times out may not reap its own. Over the whole slow phase they accumulate until
    // the runner starves and "loses communication". Between sequential files (never during one) reap leftover
    // headless shells — safe: it's our test browser, never the user's chrome.exe. The count line is a cheap
    // accumulation probe. No-op off Windows (Linux/macOS use chromium.launch, no headless-shell).
    if (process.platform === 'win32') {
      const tasks = (await Bun.$`tasklist /NH /FO CSV`.nothrow().quiet()).stdout.toString()
      const count = (re: RegExp) => (tasks.match(re) ?? []).length
      console.info(
        `[win-procs] after ${relativeSlowFile}: bun=${count(/"bun\.exe"/gi)} headless-shell=${count(/"chrome-headless-shell\.exe"/gi)} node=${count(/"node\.exe"/gi)}`,
      )
      await Bun.$`taskkill /F /IM chrome-headless-shell.exe /T`.nothrow().quiet()
    }
  }
}

await final()
