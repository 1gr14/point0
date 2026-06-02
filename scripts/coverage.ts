import * as nodeFs from 'node:fs'
import * as nodePath from 'node:path'

/**
 * Merges per-shard lcov files produced by `bun test --coverage` and writes an agent-friendly report. No external deps:
 * we run under Bun and parse lcov by hand.
 *
 * Why this exists: `test-parallel.ts` runs every test file in its own `bun test` process, and Bun has no native way to
 * merge coverage across processes. Each shard writes `coverage/raw/<shard>/lcov.info`; here we sum them into one
 * picture.
 *
 * Line coverage only. Bun's lcov reporter emits per-line `DA` records but no per-function `FN`/`FNDA` records, so
 * function coverage can't be merged reliably — we report lines, which is the precise, meaningful metric for "what isn't
 * tested".
 *
 * Scope: levels 1–2 only (code executed in-process). e2e/slow tests spawn `point0` as a child process which Bun cannot
 * instrument, so their runtime isn't line-counted here by design — it's covered behaviourally by the e2e suite.
 */

const repoRoot = nodePath.resolve(__dirname, '..')

/** source line -> summed hit count across all shards that loaded the file */
type FileCoverage = Map<number, number>

const findLcovFiles = (rawDir: string): string[] => {
  if (!nodeFs.existsSync(rawDir)) return []
  const glob = new Bun.Glob('**/lcov.info')
  return [...glob.scanSync(rawDir)].map((p) => nodePath.join(rawDir, p))
}

const parseInto = (merged: Map<string, FileCoverage>, lcovText: string): void => {
  let current: FileCoverage | null = null
  for (const rawLine of lcovText.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (line.startsWith('SF:')) {
      const sf = line.slice(3)
      current = merged.get(sf) ?? new Map<number, number>()
      merged.set(sf, current)
    } else if (!current) {
      continue
    } else if (line.startsWith('DA:')) {
      // DA:<line>,<hits>
      const [lineNoStr, hitsStr] = line.slice(3).split(',')
      const lineNo = Number(lineNoStr)
      const hits = Number(hitsStr)
      if (Number.isFinite(lineNo) && Number.isFinite(hits)) {
        current.set(lineNo, (current.get(lineNo) ?? 0) + hits)
      }
    } else if (line === 'end_of_record') {
      current = null
    }
  }
}

const mergeLcov = (rawDir: string): Map<string, FileCoverage> => {
  const merged = new Map<string, FileCoverage>()
  for (const file of findLcovFiles(rawDir)) {
    parseInto(merged, nodeFs.readFileSync(file, 'utf8'))
  }
  return merged
}

const writeMergedLcov = (merged: Map<string, FileCoverage>, outFile: string): void => {
  const parts: string[] = []
  for (const sf of [...merged.keys()].sort()) {
    const das = [...merged.get(sf)!.entries()].sort((a, b) => a[0] - b[0])
    const lineHit = das.filter(([, h]) => h > 0).length
    parts.push('TN:')
    parts.push(`SF:${sf}`)
    for (const [ln, h] of das) parts.push(`DA:${ln},${h}`)
    parts.push(`LF:${das.length}`)
    parts.push(`LH:${lineHit}`)
    parts.push('end_of_record')
  }
  nodeFs.writeFileSync(outFile, parts.join('\n') + '\n')
}

/** All source files we expect to cover, so 0%-files (never imported by a test) show up too. */
const findSourceFiles = (): string[] => {
  const glob = new Bun.Glob('packages/*/src/**/*.{ts,tsx}')
  return [...glob.scanSync(repoRoot)].filter((p) => !/\.(test|spec)\.[tj]sx?$/.test(p) && !p.endsWith('.d.ts')).sort()
}

const compressRanges = (lines: number[]): string => {
  if (lines.length === 0) return ''
  const sorted = [...lines].sort((a, b) => a - b)
  const ranges: string[] = []
  let start = sorted[0]
  let prev = sorted[0]
  for (let i = 1; i < sorted.length; i++) {
    const n = sorted[i]
    if (n === prev + 1) {
      prev = n
      continue
    }
    ranges.push(start === prev ? `${start}` : `${start}-${prev}`)
    start = prev = n
  }
  ranges.push(start === prev ? `${start}` : `${start}-${prev}`)
  return ranges.join(', ')
}

const pct = (hit: number, found: number): number => (found === 0 ? 100 : (hit / found) * 100)
const fmtPct = (v: number): string => `${v.toFixed(1)}%`

export type CoverageSummary = {
  /** line coverage over files that were executed by at least one in-process test */
  linesPct: number
  filesTotal: number
  filesExecuted: number
  filesZero: number
  filesFull: number
}

export const generateCoverageReport = (options?: { rawDir?: string; outDir?: string }): CoverageSummary => {
  const outDir = options?.outDir ?? nodePath.join(repoRoot, 'coverage')
  const rawDir = options?.rawDir ?? nodePath.join(outDir, 'raw')
  nodeFs.mkdirSync(outDir, { recursive: true })

  const merged = mergeLcov(rawDir)
  writeMergedLcov(merged, nodePath.join(outDir, 'lcov.info'))

  // Totals + per-file rows. Include every source file: ones with no lcov record are 0%.
  let totalLF = 0
  let totalLH = 0
  const rows: Array<{ sf: string; linesPct: number; lf: number; uncovered: string }> = []
  const sources = findSourceFiles()

  for (const sf of sources) {
    const cov = merged.get(sf)
    if (!cov) {
      rows.push({ sf, linesPct: 0, lf: 0, uncovered: '— (not executed)' })
      continue
    }
    const lf = cov.size
    const lh = [...cov.values()].filter((h) => h > 0).length
    totalLF += lf
    totalLH += lh
    const uncoveredLines = [...cov.entries()].filter(([, h]) => h === 0).map(([ln]) => ln)
    rows.push({ sf, linesPct: pct(lh, lf), lf, uncovered: compressRanges(uncoveredLines) })
  }

  const filesExecuted = rows.filter((r) => r.lf > 0).length
  const summary: CoverageSummary = {
    linesPct: pct(totalLH, totalLF),
    filesTotal: sources.length,
    filesExecuted,
    filesZero: sources.length - filesExecuted,
    filesFull: rows.filter((r) => r.lf > 0 && r.uncovered === '').length,
  }

  nodeFs.writeFileSync(nodePath.join(outDir, 'coverage-summary.json'), JSON.stringify(summary, null, 2) + '\n')

  // Agent-facing markdown: least-covered first, then the zero-coverage list.
  const gaps = rows
    .filter((r) => r.lf > 0 && r.uncovered !== '') // skip 100%-covered and zero-coverage files
    .sort((a, b) => a.linesPct - b.linesPct || b.lf - a.lf)
  const zeros = rows.filter((r) => r.lf === 0).map((r) => r.sf)

  const md: string[] = []
  md.push('# Coverage (levels 1–2 · in-process tests · line coverage)')
  md.push('')
  md.push(`**Overall:** ${fmtPct(summary.linesPct)} of lines, over ${summary.filesExecuted} executed files.`)
  md.push('')
  md.push(
    `${summary.filesTotal} source files · ${summary.filesExecuted} executed · ${summary.filesFull} fully covered · ${summary.filesZero} never executed.`,
  )
  md.push('')
  md.push(
    '> Slow/e2e-only modules (CLI, build pipeline, dev server) run in spawned `point0` child processes that Bun cannot instrument, so they are **not line-counted here by design** — they are covered behaviourally by the e2e suite. Low/zero coverage on those files is expected.',
  )
  md.push('')
  md.push('## Least covered first')
  md.push('')
  if (gaps.length === 0) {
    md.push('_Nothing partially covered — every executed file is at 100%._')
  } else {
    md.push('| file | lines | uncovered lines |')
    md.push('| --- | ---: | --- |')
    for (const r of gaps) md.push(`| ${r.sf} | ${fmtPct(r.linesPct)} | ${r.uncovered || '—'} |`)
  }
  md.push('')
  md.push('## Zero coverage (not exercised by any in-process test)')
  md.push('')
  if (zeros.length === 0) {
    md.push('_None._')
  } else {
    for (const sf of zeros) md.push(`- ${sf}`)
  }
  md.push('')
  nodeFs.writeFileSync(nodePath.join(outDir, 'coverage.md'), md.join('\n'))

  return summary
}

export const printCoverageSummary = (summary: CoverageSummary, outDir = nodePath.join(repoRoot, 'coverage')): void => {
  const rel = (p: string) => nodePath.relative(repoRoot, p)
  process.stdout.write('\n===== Coverage (levels 1–2 · line coverage) =====\n')
  process.stdout.write(`Lines: ${fmtPct(summary.linesPct)}  (over ${summary.filesExecuted} executed files)\n`)
  process.stdout.write(`Never executed: ${summary.filesZero} / ${summary.filesTotal} source files\n`)
  process.stdout.write(`Report: ${rel(nodePath.join(outDir, 'coverage.md'))}  (least-covered first)\n`)
  process.stdout.write(`LCOV:   ${rel(nodePath.join(outDir, 'lcov.info'))}\n`)
}

// Allow running standalone to re-merge/report from existing coverage/raw without re-running tests.
if (import.meta.main) {
  const summary = generateCoverageReport()
  printCoverageSummary(summary)
}
