#!/usr/bin/env bun
/**
 * coverage.ts — merge the per-file lcov shards `scripts/test.ts --coverage` leaves in `coverage/raw/` and write the
 * three artifacts we care about: a merged `coverage/lcov.info` (what Codecov eats), an agent-facing
 * `coverage/coverage.md` ranked by what is worth testing next, and a machine-readable `coverage/summary.json`.
 *
 * Why a merge step exists: `test.ts` runs EVERY test file in its own `bun test` process, and Bun cannot merge coverage
 * across processes. Each process writes `coverage/raw/<slug>/lcov.info` covering only the modules it happened to load;
 * the union is the real picture.
 *
 * ## Why every hit already lands on `src`
 *
 * A test imports its own package relatively (`../src/…`) but a SIBLING package by name (`@point0/core`), which through
 * `node_modules` would resolve to that package's built `dist` — gitignored, and useless to Codecov. It doesn't, because
 * each package's `tsconfig.json` maps `@point0/*` onto the sibling's `src`, and Bun applies the tsconfig nearest to the
 * importing file. So `src` is what runs and `src` is what gets counted.
 *
 * That mapping is load-bearing and easy to forget when adding a package, so a `dist` file that shows up with coverage
 * is not silently dropped: {@link generateCoverageReport} names the package and the fix.
 *
 * ## What is NOT counted, by design
 *
 * Only code executed IN the `bun test` process is instrumented. The `.e2e` suite spawns `point0 dev|build|start` as
 * child processes and drives a real browser; Bun cannot instrument either, so the CLI, the dev server, the production
 * build pipeline and all browser-side hydration are covered BEHAVIOURALLY, never line-counted. Their files appear in
 * the report under "never executed in-process" rather than being hidden — a hole in the NUMBER, not necessarily a hole
 * in the TESTING. Don't chase them with unit tests just to move the percentage.
 *
 * Note that the headline percentage is computed over EXECUTED files only (never-executed files carry no lcov records at
 * all, so Codecov shows the same optimistic number). The file counts next to it are what keep that honest.
 *
 * CLI:
 *
 *     bun scripts/coverage.ts            # merge coverage/raw/** and write the report
 *     bun scripts/coverage.ts --print    # ...and dump coverage.md to stdout
 */
import * as nodeFs from 'node:fs'
import * as nodePath from 'node:path'

export const ROOT = nodePath.resolve(__dirname, '..')

const toPosix = (p: string) => p.split(nodePath.sep).join('/')

/** Source line -> summed hit count across every shard that loaded the file. */
type FileCoverage = Map<number, number>
/** Root-relative posix source path -> its merged line hits. */
type MergedCoverage = Map<string, FileCoverage>

/** A package whose `dist` was loaded by a test — i.e. its `tsconfig.json` is missing the `@point0/*` -> src paths. */
export type DistLeak = { pkg: string; file: string }

/**
 * Resolve an lcov `SF:` path onto a root-relative `packages/<pkg>/src/…` path.
 *
 * `undefined` for everything we deliberately don't measure (node_modules, examples, test files). A `dist` hit is
 * `undefined` too, but pushes a {@link DistLeak} first — it means a sibling import escaped to the built output.
 */
export const classifySourceFile = (sf: string, leaks: DistLeak[]): string | undefined => {
  let abs = nodePath.isAbsolute(sf) ? sf : nodePath.join(ROOT, sf)
  // `@point0/*` resolve through a node_modules symlink; realpath lands them back under `packages/`.
  try {
    abs = nodeFs.realpathSync(abs)
  } catch {
    return undefined
  }
  const rel = toPosix(nodePath.relative(ROOT, abs))
  if (rel.startsWith('..') || rel.includes('node_modules/')) return undefined
  if (/^packages\/[^/]+\/src\//.test(rel)) return rel

  const dist = /^packages\/([^/]+)\/dist\//.exec(rel)
  if (dist) leaks.push({ pkg: dist[1], file: rel })
  return undefined
}

// ---------------------------------------------------------------------------------------------------------------
// lcov
// ---------------------------------------------------------------------------------------------------------------

const findLcovFiles = (rawDir: string): string[] => {
  if (!nodeFs.existsSync(rawDir)) return []
  const glob = new Bun.Glob('**/lcov.info')
  return [...glob.scanSync(rawDir)].map((p) => nodePath.join(rawDir, p)).sort()
}

/**
 * Parse one shard's lcov into `merged`.
 *
 * Only `SF`/`DA`/`end_of_record` matter. Bun emits `FNF`/`FNH` (per-file function totals) but no per-function
 * `FN`/`FNDA` records, so function coverage cannot be merged across processes without double-counting. Lines only —
 * which is also the metric that answers "what has nothing ever run".
 */
export const parseInto = (merged: MergedCoverage, lcovText: string, leaks: DistLeak[]): void => {
  let current: FileCoverage | null = null
  for (const rawLine of lcovText.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (line.startsWith('SF:')) {
      const source = classifySourceFile(line.slice(3), leaks)
      if (!source) {
        current = null
        continue
      }
      current = merged.get(source) ?? new Map<number, number>()
      merged.set(source, current)
    } else if (!current) {
      continue
    } else if (line.startsWith('DA:')) {
      const [lineNoStr, hitsStr] = line.slice(3).split(',')
      const lineNo = Number(lineNoStr)
      const hits = Number(hitsStr)
      if (Number.isFinite(lineNo) && Number.isFinite(hits)) current.set(lineNo, (current.get(lineNo) ?? 0) + hits)
    } else if (line === 'end_of_record') {
      current = null
    }
  }
}

/** One entry per package: every shard that loaded a leaked `dist` file reports it again. */
const dedupeLeaks = (leaks: readonly DistLeak[]): string[] => [...new Set(leaks.map((l) => l.pkg))].sort()

export const mergeLcov = (rawDir: string): { merged: MergedCoverage; leakedPackages: string[]; shards: number } => {
  const merged: MergedCoverage = new Map()
  const leaks: DistLeak[] = []
  const files = findLcovFiles(rawDir)
  for (const file of files) parseInto(merged, nodeFs.readFileSync(file, 'utf8'), leaks)
  return { merged, leakedPackages: dedupeLeaks(leaks), shards: files.length }
}

const writeMergedLcov = (merged: MergedCoverage, outFile: string): void => {
  const parts: string[] = []
  for (const sf of [...merged.keys()].sort()) {
    const das = [...merged.get(sf)!.entries()].sort((a, b) => a[0] - b[0])
    parts.push('TN:', `SF:${sf}`)
    for (const [lineNo, hits] of das) parts.push(`DA:${lineNo},${hits}`)
    parts.push(`LF:${das.length}`, `LH:${das.filter(([, h]) => h > 0).length}`, 'end_of_record')
  }
  nodeFs.writeFileSync(outFile, `${parts.join('\n')}\n`)
}

// ---------------------------------------------------------------------------------------------------------------
// report
// ---------------------------------------------------------------------------------------------------------------

/** Every file we expect to cover, so a module no test ever imports shows up as a zero instead of vanishing. */
export const findSourceFiles = (): string[] => {
  const glob = new Bun.Glob('packages/*/src/**/*.{ts,tsx}')
  return [...glob.scanSync(ROOT)]
    .map(toPosix)
    .filter((p) => !p.endsWith('.d.ts'))
    .sort()
}

/**
 * `[3, 4, 5, 9]` -> `"3-5, 9"` — an uncovered-line list an agent can jump to.
 *
 * `maxRanges` truncates: a barely-covered 11k-line file yields hundreds of ranges, and a table cell holding all of them
 * is a wall, not a hint. The complete set always lives in `lcov.info`.
 */
export const compressRanges = (lines: readonly number[], maxRanges = Infinity): string => {
  if (lines.length === 0) return ''
  const sorted = [...lines].sort((a, b) => a - b)
  const ranges: string[] = []
  let start = sorted[0]
  let prev = sorted[0]
  for (const n of sorted.slice(1)) {
    if (n === prev + 1) {
      prev = n
      continue
    }
    ranges.push(start === prev ? `${start}` : `${start}-${prev}`)
    start = prev = n
  }
  ranges.push(start === prev ? `${start}` : `${start}-${prev}`)
  if (ranges.length <= maxRanges) return ranges.join(', ')
  return `${ranges.slice(0, maxRanges).join(', ')}, … +${ranges.length - maxRanges} more`
}

const pct = (hit: number, found: number): number => (found === 0 ? 0 : (hit / found) * 100)
const fmtPct = (v: number): string => `${v.toFixed(1)}%`
/** A package with nothing executed has no percentage — `0.0%` would read as "tested and failing", which it isn't. */
const fmtPctOrDash = (v: number, found: number): string => (found === 0 ? '—' : fmtPct(v))

type Row = { file: string; pkg: string; found: number; hit: number; uncovered: number[] }

export type CoverageSummary = {
  /** Line coverage over EXECUTED files only — files nothing imported carry no lines to cover. */
  linesPct: number
  linesFound: number
  linesHit: number
  filesTotal: number
  filesExecuted: number
  filesNeverExecuted: number
  byPackage: Array<{ pkg: string; linesPct: number; linesFound: number; filesNeverExecuted: number }>
}

const buildRows = (merged: MergedCoverage): Row[] =>
  findSourceFiles().map((file) => {
    const pkg = /^packages\/([^/]+)\//.exec(file)![1]
    const cov = merged.get(file)
    if (!cov) return { file, pkg, found: 0, hit: 0, uncovered: [] }
    const entries = [...cov.entries()]
    return {
      file,
      pkg,
      found: entries.length,
      hit: entries.filter(([, h]) => h > 0).length,
      uncovered: entries.filter(([, h]) => h === 0).map(([lineNo]) => lineNo),
    }
  })

const summarize = (rows: readonly Row[]): CoverageSummary => {
  const executed = rows.filter((r) => r.found > 0)
  const packages = [...new Set(rows.map((r) => r.pkg))].sort()
  return {
    linesPct: pct(
      executed.reduce((acc, r) => acc + r.hit, 0),
      executed.reduce((acc, r) => acc + r.found, 0),
    ),
    linesFound: executed.reduce((acc, r) => acc + r.found, 0),
    linesHit: executed.reduce((acc, r) => acc + r.hit, 0),
    filesTotal: rows.length,
    filesExecuted: executed.length,
    filesNeverExecuted: rows.length - executed.length,
    byPackage: packages.map((pkg) => {
      const own = rows.filter((r) => r.pkg === pkg)
      const ownExecuted = own.filter((r) => r.found > 0)
      return {
        pkg,
        linesPct: pct(
          ownExecuted.reduce((acc, r) => acc + r.hit, 0),
          ownExecuted.reduce((acc, r) => acc + r.found, 0),
        ),
        linesFound: ownExecuted.reduce((acc, r) => acc + r.found, 0),
        filesNeverExecuted: own.length - ownExecuted.length,
      }
    }),
  }
}

/** How many files the "what to test next" table shows before it stops being a list and starts being a dump. */
const WORST_FILES = 30
/** ...and how many line ranges each of those rows spells out before it does the same. */
const WORST_RANGES = 12

const renderMarkdown = (rows: readonly Row[], summary: CoverageSummary, leakedPackages: readonly string[]): string => {
  const md: string[] = []
  md.push('# Coverage — in-process line coverage')
  md.push('')
  md.push(
    `**${fmtPct(summary.linesPct)}** of executed lines (${summary.linesHit} / ${summary.linesFound}), across ` +
      `${summary.filesExecuted} of ${summary.filesTotal} source files.`,
  )
  md.push('')
  md.push(
    '> Only code running inside the `bun test` process is counted. The `.e2e` suite spawns `point0 dev|build|start`',
    '> as child processes and drives a real browser — Bun instruments neither, so the CLI, the dev server, the build',
    '> pipeline and browser-side hydration are covered behaviourally and never line-counted. They land below under',
    '> "never executed in-process". That is a hole in the NUMBER, not necessarily a hole in the TESTING.',
  )
  md.push('')

  md.push('## By package')
  md.push('')
  md.push('| package | lines | measured lines | files never executed |')
  md.push('| --- | ---: | ---: | ---: |')
  for (const p of summary.byPackage) {
    md.push(`| ${p.pkg} | ${fmtPctOrDash(p.linesPct, p.linesFound)} | ${p.linesFound} | ${p.filesNeverExecuted} |`)
  }
  md.push('')

  // Ranked by UNCOVERED LINE COUNT, not by percentage: a 60%-covered 2000-line file hides more untested behaviour than
  // a 0%-covered 12-line one, and it is the first place a new test pays for itself.
  const worst = rows
    .filter((r) => r.uncovered.length > 0)
    .sort((a, b) => b.uncovered.length - a.uncovered.length)
    .slice(0, WORST_FILES)
  md.push(`## What to test next — the ${WORST_FILES} files with the most uncovered lines`)
  md.push('')
  if (worst.length === 0) {
    md.push('_Every executed file is fully covered._')
  } else {
    md.push('| file | lines | uncovered | uncovered lines |')
    md.push('| --- | ---: | ---: | --- |')
    for (const r of worst) {
      const ranges = compressRanges(r.uncovered, WORST_RANGES)
      md.push(`| ${r.file} | ${fmtPct(pct(r.hit, r.found))} | ${r.uncovered.length} | ${ranges} |`)
    }
  }
  md.push('')

  const never = rows.filter((r) => r.found === 0)
  md.push('## Never executed in-process')
  md.push('')
  if (never.length === 0) {
    md.push('_None._')
  } else {
    md.push('No `.unit`/`.int` test ever imported these. Either they are e2e-only by design (CLI, dev server, build')
    md.push('pipeline, browser entry points), or they are genuinely untested.')
    md.push('')
    for (const r of never) md.push(`- ${r.file}`)
  }
  md.push('')

  if (leakedPackages.length > 0) {
    md.push('## Packages loaded from `dist`')
    md.push('')
    md.push('A test imported these by name and got their built output instead of their source, so those hits were')
    md.push("dropped. Add the missing `@point0/*` -> `src` entries to the IMPORTING package's `tsconfig.json`:")
    md.push('')
    for (const pkg of leakedPackages) md.push(`- ${pkg}`)
    md.push('')
  }
  return md.join('\n')
}

export const generateCoverageReport = (options?: { rawDir?: string; outDir?: string }): CoverageSummary => {
  const outDir = options?.outDir ?? nodePath.join(ROOT, 'coverage')
  const rawDir = options?.rawDir ?? nodePath.join(outDir, 'raw')
  nodeFs.mkdirSync(outDir, { recursive: true })

  const { merged, leakedPackages, shards } = mergeLcov(rawDir)
  if (shards === 0) {
    throw new Error(
      `coverage.ts: no lcov shards under ${toPosix(nodePath.relative(ROOT, rawDir))} — run \`bun run cov\` first.`,
    )
  }
  writeMergedLcov(merged, nodePath.join(outDir, 'lcov.info'))

  const rows = buildRows(merged)
  const summary = summarize(rows)
  nodeFs.writeFileSync(nodePath.join(outDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`)
  nodeFs.writeFileSync(nodePath.join(outDir, 'coverage.md'), renderMarkdown(rows, summary, leakedPackages))

  // A package loaded from dist means its importer's tsconfig lost the `paths` mapping, and every hit routed through it
  // was thrown away. Say so where it can't be missed, rather than publishing a number that's quietly incomplete.
  if (leakedPackages.length > 0) {
    process.stderr.write(
      `\n⚠ loaded from dist, so their coverage was DROPPED: ${leakedPackages.join(', ')}\n` +
        "  Add the missing `@point0/*` -> src entries to the importing package's tsconfig.json " +
        '(see dev/docs/coverage.md).\n',
    )
  }
  return summary
}

export const printCoverageSummary = (summary: CoverageSummary, outDir = nodePath.join(ROOT, 'coverage')): void => {
  const rel = (p: string) => toPosix(nodePath.relative(ROOT, p))
  const out = [
    '',
    '===== Coverage (in-process line coverage) =====',
    `Lines: ${fmtPct(summary.linesPct)}  (${summary.linesHit} / ${summary.linesFound})`,
    `Files: ${summary.filesExecuted} executed, ${summary.filesNeverExecuted} never executed in-process`,
    '',
    ...summary.byPackage.map(
      (p) => `  ${p.pkg.padEnd(14)} ${fmtPctOrDash(p.linesPct, p.linesFound).padStart(6)}  (${p.linesFound} lines)`,
    ),
    '',
    `Report: ${rel(nodePath.join(outDir, 'coverage.md'))}  — what to test next, ranked`,
    `LCOV:   ${rel(nodePath.join(outDir, 'lcov.info'))}`,
    '',
  ]
  process.stdout.write(`${out.join('\n')}\n`)
}

if (import.meta.main) {
  const summary = generateCoverageReport()
  printCoverageSummary(summary)
  if (process.argv.includes('--print')) {
    process.stdout.write(nodeFs.readFileSync(nodePath.join(ROOT, 'coverage', 'coverage.md'), 'utf8'))
  }
}
