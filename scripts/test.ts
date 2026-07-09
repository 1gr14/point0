#!/usr/bin/env bun
/**
 * test.ts — the single brain for running point0's tests, locally and in CI. It discovers every test file, reads its
 * CLASS from the filename suffix, verifies the suffix against the file's actual imports, plans how the files are
 * distributed across processes/runners, and runs them with a wall-clock guard so a hung file fails fast and named.
 *
 * The CLASS lives in the filename — `foo.unit.test.ts` / `foo.int.test.ts` / `foo.e2e.test.ts` — so there is no
 * registry to drift out of date (the old scripts/slow-tests.ts is gone):
 *
 * - **unit** — pure in-process logic. No real processes, no servers, no browser.
 * - **int** — boots real machinery in-process or as child processes: `createTestThings`, `TestProject*` (dev
 *   servers/builds), `Bun.spawn`. No browser.
 * - **e2e** — drives a real browser (Playwright/CDP) against a real served app. The heaviest class.
 *
 * The suffix is ENFORCED, not advisory: a file that imports the browser util must be `.e2e`, a `.e2e` file must
 * actually import it, and a file that boots real machinery can't call itself `.unit` ({@link verifyClasses}).
 *
 * Dispatch (the plan, {@link buildPlan}):
 *
 * - e2e files and the {@link SOLO_INT} heavies run SOLO — one file per process locally, one runner per file in CI. They
 *   boot full dev/build trees and browsers; sharing a process bleeds module state and ports, and sharing a runner
 *   stacks resource pressure (the documented source of the CI flakes).
 * - Known-long fast files are PINNED to their own named CI group ({@link PINNED_GROUPS}) so they never stretch a shared
 *   runner. Everything else lands in the auto `unit` / `int-N` groups. Nothing is ever dropped: the plan validates that
 *   every discovered file is planned exactly once.
 *
 * CLI:
 *
 *     bun scripts/test.ts                 # everything (parallel classes first, then solo/e2e)
 *     bun scripts/test.ts fast            # unit + int, minus the SOLO_INT heavies — the tight iteration loop
 *     bun scripts/test.ts unit int e2e    # explicit classes (any combination)
 *     bun scripts/test.ts slow            # the solo lane only: SOLO_INT + e2e
 *     bun scripts/test.ts --file <path>   # specific file(s), guard included (repeatable)
 *     bun scripts/test.ts --group <id>    # one planned CI group (what a fast-lane runner executes)
 *     bun scripts/test.ts --plan          # print the CI plan as JSON (consumed by scripts/ci-decide.ts)
 *     bun scripts/test.ts --list          # print every file with its class and lane
 *
 * Env: TEST_PARALLEL_LIMIT (parallel-phase concurrency, default cpus), TEST_FILE_TIMEOUT_MS (default 5 min),
 * TEST_SOLO_FILE_TIMEOUT_MS (solo/e2e lane, default 15 min), TEST_FILE_RETRIES (default 1), LIVE_TEST_OUTPUT=1 (stream
 * output instead of buffering).
 */
import { cpus } from 'node:os'
import * as nodePath from 'node:path'

export type TestClass = 'unit' | 'int' | 'e2e'

/** Repo root — every path in the plan is relative to it (posix separators). */
export const ROOT = nodePath.resolve(__dirname, '..')

/** Dirs whose test-looking files are never suite files (build output, deps, VCS). */
const IGNORED_DIR_NAMES = ['node_modules', 'dist', 'packages-dist-npm', '.git']

/**
 * Int files that run SOLO (one process / one CI runner per file) even though they don't drive a browser: each boots
 * full dev/build trees and runs for minutes, so a shared runner would stretch and starve its siblings. Every entry must
 * exist and be `.int` — {@link buildPlan} validates, so a stale path is an error, not a silent hole.
 */
export const SOLO_INT = [
  'packages/engine/tests/assets.int.test.tsx',
  'packages/engine/tests/build.int.test.ts',
  'packages/engine/tests/cli.int.test.tsx',
  'packages/engine/tests/mcp.int.test.ts',
  'packages/engine/tests/module-preload-serve.int.test.ts',
  'packages/engine/tests/publicdir.int.test.ts',
] as const

/**
 * Long non-solo files pinned to their own named CI group, so they never share a runner with (and stretch) the auto
 * groups. Validated like {@link SOLO_INT}: entries must exist and must not also be solo.
 */
export const PINNED_GROUPS: Record<string, readonly string[]> = {
  'core-rsc': ['packages/core/tests/rsc.unit.test.tsx'],
  'engine-rsc': ['packages/engine/tests/rsc.int.test.tsx'],
  'engine-suspend': ['packages/engine/tests/suspend.int.test.tsx'],
}

/** How many files an auto `int-N` group carries at most — the int lane self-sizes from this. */
export const INT_GROUP_SIZE = 25

const toPosix = (p: string) => p.split(nodePath.sep).join('/')

/** Discover every test file under packages/ and scripts/, as root-relative posix paths, sorted. */
export const discoverTestFiles = async (): Promise<string[]> => {
  const glob = new Bun.Glob('{packages,scripts}/**/*.{test,spec}.{ts,tsx,js,jsx}')
  const files: string[] = []
  for await (const rel of glob.scan(ROOT)) {
    if (rel.split(nodePath.sep).some((part) => IGNORED_DIR_NAMES.includes(part))) continue
    files.push(toPosix(rel))
  }
  return files.sort((a, b) => a.localeCompare(b))
}

/** A file's class, from its suffix. Suffixless (or double-suffixed) test files are a hard error. */
export const classOf = (file: string): TestClass => {
  const m = /\.(unit|int|e2e)\.(?:test|spec)\.[jt]sx?$/.exec(file)
  if (!m) {
    throw new Error(
      `test.ts: "${file}" carries no class suffix — every test file must be *.unit.test.*, *.int.test.* or *.e2e.test.*`,
    )
  }
  return m[1] as TestClass
}

const stripComments = (src: string): string =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => {
      const i = line.indexOf('//')
      return i === -1 ? line : line.slice(0, i)
    })
    .join('\n')

// Any import of the real-browser util (absolute `…/utils/playwright.js` or the relative `../playwright.js` its own
// test uses) or of playwright itself.
const BROWSER_RE = /from\s+'(?:[^']*\/)?playwright(?:\.js)?'/
const INT_MARKERS_RE =
  /createTestThings|internal-testing|project\.one-client|project\.two-clients|TestProject|TestProcess|Bun\.spawn|spawnSync/

/**
 * Enforce that every file's suffix matches what the file actually does — the suffix is the dispatch plan, so a wrong
 * one silently misroutes the file (a browser test in a shared parallel group is exactly the flake source the plan
 * exists to prevent). Checks, on comment-stripped source:
 *
 * - imports the real-browser util ⇒ must be `.e2e`; is `.e2e` ⇒ must import it (else it's just an int file),
 * - uses int machinery (createTestThings / TestProject / Bun.spawn) ⇒ must not be `.unit`.
 */
export const verifyClasses = async (files: readonly string[]): Promise<void> => {
  const problems: string[] = []
  for (const file of files) {
    const cls = classOf(file)
    const src = stripComments(await Bun.file(nodePath.join(ROOT, file)).text())
    const browser = BROWSER_RE.test(src)
    if (browser && cls !== 'e2e') problems.push(`${file}: imports the real browser util — must be .e2e, is .${cls}`)
    if (!browser && cls === 'e2e')
      problems.push(`${file}: is .e2e but never imports the real browser util — demote to .int`)
    if (!browser && cls === 'unit' && INT_MARKERS_RE.test(src)) {
      problems.push(`${file}: boots real machinery (createTestThings/TestProject/spawn) — must be .int, is .unit`)
    }
  }
  if (problems.length > 0) {
    throw new Error(`test.ts: class suffixes don't match file contents:\n  ${problems.join('\n  ')}`)
  }
}

export type PlanGroup = { id: string; files: string[] }
export type Plan = {
  /** Parallel-lane groups (unit / int-N / pinned) — one CI runner per group, files parallel within it. */
  groups: PlanGroup[]
  /** Solo lane ({@link SOLO_INT} + every e2e file) — one process locally, one CI runner per file. */
  solo: string[]
}

/**
 * Distribute every discovered file across the two lanes. Pure — pass {@link discoverTestFiles}()'s result so the planner
 * stays testable without touching the disk. Validates that the pinned/solo lists are live (no stale paths, no
 * double-listing) and that every file lands in exactly one place.
 */
export const buildPlan = (allFiles: readonly string[]): Plan => {
  const all = [...allFiles].sort((a, b) => a.localeCompare(b))
  const present = new Set(all)

  const solo = new Set<string>()
  for (const file of SOLO_INT) {
    if (!present.has(file)) throw new Error(`test.ts: SOLO_INT lists a missing file: "${file}"`)
    if (classOf(file) !== 'int') throw new Error(`test.ts: SOLO_INT must list .int files only, got "${file}"`)
    solo.add(file)
  }
  for (const file of all) if (classOf(file) === 'e2e') solo.add(file)

  const pinnedOf = new Map<string, string>()
  for (const [id, files] of Object.entries(PINNED_GROUPS)) {
    for (const file of files) {
      if (!present.has(file)) throw new Error(`test.ts: PINNED_GROUPS["${id}"] lists a missing file: "${file}"`)
      if (solo.has(file)) throw new Error(`test.ts: "${file}" is both solo and pinned to group "${id}"`)
      const prev = pinnedOf.get(file)
      if (prev) throw new Error(`test.ts: "${file}" is pinned to two groups ("${prev}" and "${id}")`)
      pinnedOf.set(file, id)
    }
  }

  const rest = all.filter((file) => !solo.has(file) && !pinnedOf.has(file))
  const unit = rest.filter((file) => classOf(file) === 'unit')
  const int = rest.filter((file) => classOf(file) === 'int')
  const intGroupCount = Math.max(1, Math.ceil(int.length / INT_GROUP_SIZE))
  const intGroups: string[][] = Array.from({ length: intGroupCount }, () => [])
  int.forEach((file, index) => intGroups[index % intGroupCount].push(file))

  const groups: PlanGroup[] = [
    ...Object.entries(PINNED_GROUPS).map(([id, files]) => ({ id, files: [...files] })),
    { id: 'unit', files: unit },
    ...intGroups.map((files, index) => ({ id: `int-${index + 1}`, files })),
  ].filter((group) => group.files.length > 0)

  const planned = new Set([...solo, ...groups.flatMap((group) => group.files)])
  for (const file of all) {
    if (!planned.has(file)) throw new Error(`test.ts: "${file}" fell through the plan — this is a planner bug`)
  }
  return { groups, solo: [...solo].sort((a, b) => a.localeCompare(b)) }
}

// ---------------------------------------------------------------------------------------------------------------
// Runner — per-file processes with a wall-clock guard, breadcrumbs, retries and honest failure reporting.
// ---------------------------------------------------------------------------------------------------------------

const liveTestOutput = process.env.LIVE_TEST_OUTPUT === '1'
const FILE_TIMEOUT_MS = Number(process.env.TEST_FILE_TIMEOUT_MS ?? 5 * 60_000)
const SOLO_FILE_TIMEOUT_MS = Number(process.env.TEST_SOLO_FILE_TIMEOUT_MS ?? 15 * 60_000)
const FILE_RETRIES = Number(process.env.TEST_FILE_RETRIES ?? 1)

/**
 * Pull the lines that actually explain a failure. Matches REAL failure markers only — `(fail)`, `✗`, a non-zero `N
 * fail` summary, bun's `timed out after …ms`, our own `[harness] TIMED OUT` — never a `fail`/`error` substring in a
 * passing test's NAME or a deliberately-logged error. No marker at all (e.g. a hard crash) ⇒ the log TAIL, where a hang
 * or crash ends, not the head.
 */
export const extractFailureLines = (output: string): string[] => {
  const lines = output.split(/\r?\n/).filter(Boolean)
  const matched = lines.filter(
    (line) =>
      /^\s*[✗×]/.test(line) ||
      line.includes('(fail)') ||
      line.includes('[harness] TIMED OUT') ||
      /\btimed out after \d+m?s\b/.test(line) ||
      /\b[1-9]\d* fail\b/.test(line),
  )
  return matched.length > 0 ? matched : lines.slice(-20)
}

/**
 * Whether a timed-out run actually PASSED and only the process refused to exit — bun printed a full summary with zero
 * failures, so the assertions all ran green and something (a leaked handle, a Bun teardown quirk — the known case is
 * bun-on-Windows in core's rsc.unit) kept the event loop alive. We kill the tree and count it as a pass with a loud
 * warning instead of failing the run: coverage is real, the non-exit is tracked separately.
 */
export const passedButWouldNotExit = (output: string): boolean =>
  /\b[1-9]\d* pass\b/.test(output) && /\b0 fail\b/.test(output) && !output.includes('(fail)')

const formatDuration = (ms: number) => {
  if (ms < 1000) return `${ms.toFixed(0)}ms`
  const seconds = ms / 1000
  if (seconds < 60) return `${seconds.toFixed(2)}s`
  const minutes = Math.floor(seconds / 60)
  return `${minutes}m${(seconds - minutes * 60).toFixed(1)}s`
}

// Kill the whole process tree of a timed-out test. On Windows the bun process spawns chrome-headless-shell
// (CDP) children that survive a plain kill — `taskkill /T` takes the tree; on POSIX SIGKILL the process.
const killTree = async (pid: number) => {
  if (process.platform === 'win32') {
    await Bun.$`taskkill /F /T /PID ${pid}`.nothrow().quiet()
  }
}
// After a forced kill (and between solo files), sweep orphaned test browsers — Windows only: Linux/macOS
// use chromium.launch, which playwright reaps itself. Safe: it's our test browser, never the user's chrome.exe.
const reapTestBrowsers = async () => {
  if (process.platform === 'win32') {
    await Bun.$`taskkill /F /IM chrome-headless-shell.exe /T`.nothrow().quiet()
  }
}

type RunResult = { code: number; output: string; timedOut: boolean }

const runOnce = async (file: string, timeoutMs: number): Promise<RunResult> => {
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
    cmd: ['bun', 'test', file],
    cwd: ROOT,
    stdout: liveTestOutput ? 'inherit' : undefined,
    stderr: liveTestOutput ? 'inherit' : undefined,
    terminal,
  })

  // Race the test process against a wall-clock deadline. Deriving timedOut from the RACE RESULT (not a flag
  // flipped inside a timer callback) keeps the control flow legible, and a hung file gets its process tree
  // killed + browsers reaped instead of freezing the phase until the CI job timeout.
  const TIMED_OUT = Symbol('timed-out')
  let timer: ReturnType<typeof setTimeout> | undefined
  const deadline = new Promise<typeof TIMED_OUT>((resolve) => {
    timer = setTimeout(() => resolve(TIMED_OUT), timeoutMs)
  })
  const raced = await Promise.race([proc.exited, deadline])
  if (timer) clearTimeout(timer)
  const timedOut = raced === TIMED_OUT
  if (timedOut) {
    // Best-effort kill of the whole tree, then move on. Crucially do NOT `await proc.exited` here: on Windows a
    // process killed externally (taskkill) may never resolve Bun's exited promise, so awaiting it would re-hang
    // the phase until the CI job timeout — the exact failure this guard exists to prevent.
    proc.kill(9)
    await killTree(proc.pid)
    await reapTestBrowsers()
  }

  if (terminal) {
    terminal.close()
    output += decoder.decode()
  }
  if (timedOut) {
    output += `\n[harness] TIMED OUT after ${Math.round(timeoutMs / 1000)}s — process tree killed.\n`
  }
  // A killed process may report exit 0; force a non-zero code so a timeout always fails the attempt.
  const code = typeof raced === 'number' ? raced : 124
  return { code, output, timedOut }
}

type FileOutcome = { file: string; code: number; output: string; warning?: string }

const runFile = async (file: string, timeoutMs: number): Promise<FileOutcome> => {
  const started = Date.now()
  // START breadcrumb, flushed immediately (NOT buffered into the per-file Terminal): if the phase hangs, the
  // log shows every ▶ with no matching ✓/✗ — that's the file that froze the runner.
  process.stdout.write(`▶ ${file}\n`)

  let result = await runOnce(file, timeoutMs)
  // "Passed but the process wouldn't exit" is NOT a failure and NOT worth a retry — the assertions ran green.
  let hungAfterPass = result.timedOut && passedButWouldNotExit(result.output)
  for (let attempt = 1; result.timedOut && !hungAfterPass && attempt <= FILE_RETRIES; attempt++) {
    process.stdout.write(`⟲ ${file} timed out — retry ${attempt}/${FILE_RETRIES} on a fresh process\n`)
    result = await runOnce(file, timeoutMs)
    hungAfterPass = result.timedOut && passedButWouldNotExit(result.output)
  }

  const warning = hungAfterPass
    ? 'passed, but the process would not exit — tree killed, counted as a pass (teardown hang; see dev/backlog/test-non-exit.md)'
    : undefined
  const code = hungAfterPass ? 0 : result.code
  const mark = code === 0 ? (warning ? '⚠' : '✓') : '✗'
  process.stdout.write(
    `${mark} ${file} (${formatDuration(Date.now() - started)})${result.timedOut && !warning ? ' [TIMED OUT]' : ''}${warning ? ` [${warning}]` : ''}\n`,
  )
  return { file, code, output: result.output, warning }
}

const runParallel = async (files: readonly string[]): Promise<FileOutcome[]> => {
  const maxParallel = Number(process.env.TEST_PARALLEL_LIMIT ?? cpus().length)
  const limit = Number.isFinite(maxParallel) && maxParallel > 0 ? maxParallel : 1
  if (files.length === 0) return []
  console.info(`Running ${files.length} test files with parallelism=${Math.min(limit, files.length)}`)
  const outcomes: FileOutcome[] = []
  let index = 0
  const runNext = async (): Promise<void> => {
    const i = index++
    if (i >= files.length) return
    outcomes.push(await runFile(files[i], FILE_TIMEOUT_MS))
    await runNext()
  }
  await Promise.all(Array.from({ length: Math.min(limit, files.length) }, runNext))
  return outcomes
}

const runSolo = async (files: readonly string[]): Promise<FileOutcome[]> => {
  // Solo files run STRICTLY one per process, sequentially — never a combined `bun test`. Each boots a full
  // dev/build tree (and the e2e ones a browser); sharing a process bleeds module-level state and ports, and
  // running them concurrently stacks resource pressure — the documented CI flake source.
  const outcomes: FileOutcome[] = []
  for (const file of files) {
    outcomes.push(await runFile(file, SOLO_FILE_TIMEOUT_MS))
    await reapTestBrowsers() // between files, never during one — Windows accumulates leaked headless shells
  }
  return outcomes
}

const report = async (outcomes: readonly FileOutcome[], startTime: number): Promise<never> => {
  const failed = outcomes.filter((o) => o.code !== 0)
  if (!liveTestOutput) {
    for (const o of outcomes) process.stdout.write(`\n===== ${o.file} =====\n${o.output}`)
    if (failed.length > 0) {
      process.stdout.write('\n===== Failures =====\n')
      for (const o of failed) {
        process.stdout.write(`\n${o.file} (exit ${o.code})\n`)
        for (const line of extractFailureLines(o.output)) process.stdout.write(`${line}\n`)
      }
    }
  }
  const warned = outcomes.filter((o) => o.warning)
  if (warned.length > 0) {
    process.stdout.write('\n===== Warnings =====\n')
    for (const o of warned) process.stdout.write(`⚠ ${o.file}: ${o.warning}\n`)
  }
  // Flush every buffered stdout write before exiting. `process.exit()` drops async stdout writes mid-stream;
  // on a CI pipe that truncated the log exactly at the failure. Awaiting one final write drains the queue.
  await new Promise<void>((resolve) => {
    process.stdout.write(`\n===== Total time: ${formatDuration(Date.now() - startTime)} =====\n`, () => resolve())
  })
  process.exit(failed.length > 0 ? 1 : 0)
}

// ---------------------------------------------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------------------------------------------

const SELECTIONS = ['unit', 'int', 'e2e', 'fast', 'slow', 'all'] as const
type Selection = (typeof SELECTIONS)[number]

const collectFlag = (args: string[], name: string): string[] => {
  const values: string[] = []
  for (let i = 0; i < args.length; i++) {
    if (args[i] === `--${name}`) {
      const value = args[i + 1]
      if (!value) throw new Error(`test.ts: --${name} needs a value`)
      values.push(value)
      args.splice(i, 2)
      i--
    } else if (args[i].startsWith(`--${name}=`)) {
      values.push(args[i].slice(name.length + 3))
      args.splice(i, 1)
      i--
    }
  }
  return values
}

if (import.meta.main) {
  const args = process.argv.slice(2)
  const plan_ = args.includes('--plan')
  const list = args.includes('--list')
  const rest = args.filter((a) => a !== '--plan' && a !== '--list')
  const groupIds = collectFlag(rest, 'group')
  const fileArgs = collectFlag(rest, 'file').map((f) => toPosix(nodePath.relative(ROOT, nodePath.resolve(ROOT, f))))
  const selections = rest.filter((a) => !a.startsWith('-')) as Selection[]
  const unknown = rest.filter((a) => a.startsWith('-') || !SELECTIONS.includes(a as Selection))
  if (unknown.length > 0) {
    throw new Error(`test.ts: unknown argument(s): ${unknown.join(' ')} (selections: ${SELECTIONS.join('|')})`)
  }

  const files = await discoverTestFiles()
  await verifyClasses(files)
  const plan = buildPlan(files)

  if (plan_) {
    console.info(JSON.stringify({ groups: plan.groups, solo: plan.solo }, null, 2))
    process.exit(0)
  }
  if (list) {
    const soloSet = new Set(plan.solo)
    const groupOf = new Map(plan.groups.flatMap((g) => g.files.map((f) => [f, g.id] as const)))
    for (const file of files) {
      console.info(
        `${classOf(file).padEnd(4)} ${soloSet.has(file) ? 'solo' : (groupOf.get(file) ?? '?').padEnd(6)} ${file}`,
      )
    }
    process.exit(0)
  }

  const startTime = Date.now()
  const soloSet = new Set(plan.solo)
  const parallelFiles: string[] = []
  const soloFiles: string[] = []

  if (groupIds.length > 0) {
    for (const id of groupIds) {
      const group = plan.groups.find((g) => g.id === id)
      if (!group) {
        throw new Error(`test.ts: unknown group "${id}" (have: ${plan.groups.map((g) => g.id).join(', ')})`)
      }
      parallelFiles.push(...group.files)
    }
  } else if (fileArgs.length > 0) {
    const present = new Set(files)
    for (const file of fileArgs) {
      if (!present.has(file)) throw new Error(`test.ts: no such test file: "${file}"`)
      ;(soloSet.has(file) ? soloFiles : parallelFiles).push(file)
    }
  } else {
    const wanted = new Set<Selection>(selections.length > 0 ? selections : ['all'])
    const wantClass = (cls: TestClass): boolean =>
      wanted.has('all') ||
      wanted.has(cls) ||
      (wanted.has('fast') && cls !== 'e2e') ||
      (wanted.has('slow') && cls === 'e2e')
    for (const file of files) {
      const cls = classOf(file)
      if (soloSet.has(file)) {
        // solo int files belong to `int`/`all`/`slow`, but deliberately NOT to `fast`
        const inSelection =
          wanted.has('all') ||
          wanted.has('slow') ||
          (cls === 'int' && wanted.has('int')) ||
          (cls === 'e2e' && wantClass('e2e'))
        if (inSelection) soloFiles.push(file)
      } else if (wantClass(cls)) {
        parallelFiles.push(file)
      }
    }
  }

  if (parallelFiles.length === 0 && soloFiles.length === 0) {
    console.info('No test files selected.')
    process.exit(0)
  }

  const outcomes = [...(await runParallel(parallelFiles)), ...(await runSolo(soloFiles))]
  await report(outcomes, startTime)
}
