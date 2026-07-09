import { cpus } from 'node:os'
import * as nodePath from 'node:path'
import { buildFastGroups, SLOW_TESTS } from './test-plan.js'

const slowTestsOnly = process.env.SLOW_TESTS_ONLY === '1'
const noSlowTests = process.env.NO_SLOW_TESTS === '1'
const noTestUtilsTests = process.env.NO_TEST_UTILS_TESTS === '1'
const liveTestOutput = process.env.LIVE_TEST_OUTPUT === '1'

const slowTests = process.env.SLOW_TESTS_NOT_SLOW === '1' ? [] : [...SLOW_TESTS]
const testUtilsTests = ['engine/tests/utils/*']

// Single source of truth for CI's slow-test shard matrix (one runner per file). `discover` calls this
// to build the matrix; each shard then runs `bun test packages/<file>`. Paths are relative to packages/.
if (process.argv.includes('--print-slow-files')) {
  process.stdout.write(JSON.stringify(slowTests))
  process.exit(0)
}

// Optional `--group <id>`: run only the files in fast group <id> — CI's per-group fast runner. The groups
// (pinned heavies + auto `rest-N`) are the single source of truth in scripts/test-plan.ts, so the matrix
// self-sizes from that file; there is no round-robin here and no shard count to keep in sync. Without the
// flag we run every non-solo file in parallel (local `bun run testf`/`testa`), then the solo phase.
const groupId =
  process.argv.find((a) => a.startsWith('--group='))?.slice('--group='.length) ??
  (process.argv.includes('--group') ? process.argv[process.argv.indexOf('--group') + 1] : undefined)

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

let parallelFiles: string[]
let pendingSlowFiles: string[]

if (groupId !== undefined) {
  // CI fast runner: exactly the files of one fast group. buildFastGroups validates the plan (no stale
  // paths, no double-listing) and fans the unpinned "rest" files across the auto rest-N groups.
  const relFiles = allAbsFiles.map((abs) => nodePath.relative(cwd, abs).split(nodePath.sep).join('/'))
  const groups = buildFastGroups(relFiles)
  const group = groups.find((g) => g.id === groupId)
  if (!group) {
    throw new Error(`Unknown fast group "${groupId}". Known groups: ${groups.map((g) => g.id).join(', ')}`)
  }
  parallelFiles = group.files.map(toAbsolute)
  pendingSlowFiles = []
  console.info(`Fast group "${groupId}": ${group.files.length} file(s)`)
} else {
  // Local / default: every non-solo file in parallel, then the solo phase (unless NO_SLOW_TESTS).
  parallelFiles = allAbsFiles
    .filter((path) => {
      // exclude all slow tests always, because we run them after if needed
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
  pendingSlowFiles = noSlowTests ? [] : slowTestsAbs
}

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

// Pull the lines that actually explain a failure. Deliberately NARROW: match real failure MARKERS, never
// a substring like "fail"/"error" anywhere in a line — that used to surface passing tests whose NAME says
// "failed" (`✓ … a failed chunk import`) and errors a test logs on purpose while asserting error handling
// (`[ssr] Failed to hydrate …`, a `SyntaxError` from a "swallows a malformed line" test), burying the real
// cause (e.g. our own `[harness] TIMED OUT`). On no match, fall back to the TAIL — a crash/hang ends the log.
const extractFailureLines = (output: string) => {
  const lines = output.split(/\r?\n/).filter(Boolean)
  const isFailure = (line: string) =>
    /\[harness\] TIMED OUT/.test(line) || // our per-file wall-clock kill (the real cause of a hang)
    /^\s*\(fail\)/.test(line) || // bun's failing-test line
    /^\s*[✗×]/.test(line) || // failing-test marker
    /^\s*[1-9]\d* fail\b/.test(line) || // bun's summary "N fail" with N > 0 (never "0 fail")
    /timed out after \d+ms/.test(line) || // bun's per-test timeout note
    /\(exit code [1-9]/.test(line) ||
    /\bpanic\b|Segmentation fault/.test(line)
  const matched = lines.filter(isFailure)
  return matched.length > 0 ? matched : lines.slice(-20)
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

// A spawned `bun test <file>` can hang indefinitely — most often on Windows, where a test that doesn't reap
// its dev-server / chrome-headless-shell child leaves a handle that keeps the process alive even after the
// assertions pass. Without a per-file deadline ONE hung file freezes the whole parallel phase until the CI
// job's 30-min timeout, and because each file's output is buffered and only flushed after Promise.all, the
// log can't even name the culprit. So: guard every file with a wall-clock timeout and emit live breadcrumbs,
// turning a silent 30-min hang into a fast, attributable failure.
const FILE_TIMEOUT_MS = Number(process.env.TEST_FILE_TIMEOUT_MS ?? 5 * 60_000)
const FILE_RETRIES = Number(process.env.TEST_FILE_RETRIES ?? 1) // extra attempts when a file times out
const rel = (filePath: string) => nodePath.relative(cwd, filePath)

// Kill the whole process tree of a timed-out test. On Windows the bun process spawns chrome-headless-shell
// (CDP) children that survive a plain kill — `taskkill /T` takes the tree; on POSIX SIGKILL the process.
const killTree = async (pid: number) => {
  if (process.platform === 'win32') {
    await Bun.$`taskkill /F /T /PID ${pid}`.nothrow().quiet()
  }
}
// After a forced kill, sweep orphaned test browsers (Windows only — Linux/macOS reap chromium.launch).
const reapTestBrowsers = async () => {
  if (process.platform === 'win32') {
    await Bun.$`taskkill /F /IM chrome-headless-shell.exe /T`.nothrow().quiet()
  }
}

const runOnce = async (filePath: string): Promise<{ code: number; output: string; timedOut: boolean }> => {
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

  // Race the test process against a wall-clock deadline. Deriving timedOut from the RACE RESULT (not a flag
  // flipped inside a timer callback) keeps the control flow legible to TS/eslint, and a hung file gets its
  // process tree killed + browsers reaped instead of freezing the phase until the 30-min job timeout.
  const TIMED_OUT = Symbol('timed-out')
  let timer: ReturnType<typeof setTimeout> | undefined
  const deadline = new Promise<typeof TIMED_OUT>((resolve) => {
    timer = setTimeout(() => resolve(TIMED_OUT), FILE_TIMEOUT_MS)
  })

  const raced = await Promise.race([proc.exited, deadline])
  if (timer) clearTimeout(timer)
  const timedOut = raced === TIMED_OUT
  if (timedOut) {
    // Best-effort kill of the whole tree, then move on. Crucially do NOT `await proc.exited` here: on Windows a
    // process killed externally (taskkill) may never resolve Bun's exited promise, so awaiting it would re-hang
    // the phase until the 30-min job timeout — the exact failure this guard exists to prevent. taskkill /F is
    // synchronous, so by the time killTree resolves the tree is already gone and the slot can free immediately.
    proc.kill(9)
    await killTree(proc.pid)
    await reapTestBrowsers()
  }

  if (terminal) {
    terminal.close()
    output += decoder.decode()
  }
  if (timedOut) {
    output += `\n[harness] TIMED OUT after ${Math.round(FILE_TIMEOUT_MS / 1000)}s — process tree killed.\n`
  }
  // A killed process may report exit 0; force a non-zero code so a timeout always fails the run.
  const code = typeof raced === 'number' ? raced : 124
  return { code, output, timedOut }
}

const runFile = async (filePath: string) => {
  const started = Date.now()
  // START breadcrumb, flushed immediately (NOT buffered into the per-file Terminal): if the phase hangs, the
  // log shows every ▶ with no matching ✓/✗ — that's the file that froze the runner.
  process.stdout.write(`▶ ${rel(filePath)}\n`)

  let result = await runOnce(filePath)
  for (let attempt = 1; result.timedOut && attempt <= FILE_RETRIES; attempt++) {
    process.stdout.write(`⟲ ${rel(filePath)} timed out — retry ${attempt}/${FILE_RETRIES} on a fresh process\n`)
    result = await runOnce(filePath)
  }

  const { code, output, timedOut } = result
  exitCodes.set(filePath, code)
  if (code !== 0) {
    failed = 1
  }
  process.stdout.write(
    `${code === 0 ? '✓' : '✗'} ${rel(filePath)} (${formatDuration(Date.now() - started)})${timedOut ? ' [TIMED OUT]' : ''}\n`,
  )

  if (!liveTestOutput) {
    const header = `\n===== ${filePath} =====\n`
    outputs.set(filePath, `${header}${output}`)
    if (code !== 0) {
      failureLines.set(filePath, extractFailureLines(output))
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
