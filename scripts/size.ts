#!/usr/bin/env bun
/**
 * size.ts — the single source of truth for "how much does Point0 weigh in a client bundle". It measures the numbers,
 * writes them into every doc that quotes them, and audits the client module graph so a new third-party dependency can't
 * sneak into the browser un-listed.
 *
 * The numbers used to live hand-typed in three files ([README.md](../README.md), [overview](../docs/intro/overview.md),
 * [full-overview](../docs/intro/full-overview.md)) and drifted the moment a dep bumped. Now each of those files carries
 * a generated block between `<!-- point0:size:start -->` and `<!-- point0:size:end -->`, and this script owns
 * everything between the markers.
 *
 * ## How a row is measured
 *
 * Each row is bundled ALONE for the browser with Bun, minified, `NODE_ENV=production`, with every OTHER row's packages
 * marked external — plus `react`/`react-dom`, which an app ships regardless of Point0. So a row's number is the code
 * that package adds and nobody else would have added. `raw` is the minified byte count; `gzip` and `brotli` compress
 * that same bundle. The entry imports the package's whole namespace, so nothing tree-shakes away: the number is an
 * honest ceiling, not a best case for some app that happens to use two exports.
 *
 * `total` is ONE bundle containing every non-optional row at once — what an app actually downloads. Rows are disjoint
 * by construction (each externalizes the others), so it lands a few percent above the column sum: the combined bundle
 * also carries the CommonJS interop and module glue that the separate ones don't need.
 *
 * ## The audit
 *
 * {@link auditClientGraph} bundles the entry points a real app imports (see [examples/basic](../examples/basic)) and
 * reads the resulting sourcemap's `sources` to get the exact module graph. Every npm package in it must be accounted
 * for by some row's {@link SizeRow.packages}, or the audit fails and names the intruder. That is how `wouter` — a peer
 * of `@point0/react-dom` that had never been listed — got caught, and how the next one will be.
 *
 * CLI:
 *
 *     bun scripts/size.ts            # measure + audit, print the table
 *     bun scripts/size.ts --write    # ...and rewrite the generated block in every doc
 *     bun scripts/size.ts --check    # ...and fail if a doc's block is stale (numbers drifted)
 *     bun scripts/size.ts --audit    # audit only — no bundling of the individual rows
 *
 * CI runs `--audit` (in `check.yml`), never `--check`: the graph is deterministic, the minified byte counts are not —
 * they move with the Bun release the runner happens to pick up. Refresh the numbers by hand with `--write`.
 *
 * Requires a built tree: every row resolves through `node_modules` to a package's `dist`, so run `bun run build` first.
 */
import * as nodeFs from 'node:fs'
import * as nodePath from 'node:path'
import * as zlib from 'node:zlib'
import prettier from 'prettier'

const ROOT = nodePath.resolve(__dirname, '..')
const toPosix = (p: string) => p.split(nodePath.sep).join('/')
/** Inside node_modules so the synthetic entries resolve bare specifiers, and so nothing lands in the working tree. */
const TMP_DIR = nodePath.join(ROOT, 'node_modules', '.cache', 'point0-size')
/** The npm-shaped copy of the workspace that everything is measured against — see {@link materializeTree}. */
const TREE_DIR = nodePath.join(TMP_DIR, 'tree')

/**
 * Copy every built `@point0/*` into a plain `node_modules/@point0/<pkg>` tree and measure from THERE, not from
 * `packages/`.
 *
 * This is not tidiness. Each package's `tsconfig.json` maps `@point0/*` onto a sibling's `src`, and Bun applies the
 * tsconfig nearest to the importing file — so bundling `packages/react-dom/dist/router.js` straight out of the
 * workspace pulls in core's SOURCE, on top of the core the entry already resolved from `dist`. Two copies of core, and
 * a "total" 49 KB heavier than the sum of its parts. Users never see that: what npm ships is `dist` and a
 * `package.json`, with no tsconfig anywhere. So that is what we measure.
 *
 * Third-party deps still resolve upward into the real root `node_modules`.
 */
const materializeTree = (): void => {
  nodeFs.rmSync(TREE_DIR, { recursive: true, force: true })
  const scope = nodePath.join(TREE_DIR, 'node_modules', '@point0')
  nodeFs.mkdirSync(scope, { recursive: true })
  for (const pkg of nodeFs.readdirSync(nodePath.join(ROOT, 'packages'))) {
    const from = nodePath.join(ROOT, 'packages', pkg)
    if (!nodeFs.existsSync(nodePath.join(from, 'dist'))) continue
    const to = nodePath.join(scope, pkg)
    nodeFs.mkdirSync(to, { recursive: true })
    nodeFs.cpSync(nodePath.join(from, 'dist'), nodePath.join(to, 'dist'), { recursive: true })
    nodeFs.copyFileSync(nodePath.join(from, 'package.json'), nodePath.join(to, 'package.json'))
  }
}

/**
 * React and its scheduler are the app's cost, not Point0's: you ship them whether or not you use this framework. They
 * are external in every measurement and exempt from the audit.
 */
const REACT_RUNTIME = ['react', 'react-dom', 'scheduler']

export type SizeRow = {
  /** Row label — a package name, as it reads in the docs. */
  id: string
  /** What it is there for, one short phrase. Rendered as the `role` column. */
  role: string
  /** Module specifiers whose full namespace the measurement entry imports. */
  entries: string[]
  /**
   * Every npm package this row's number accounts for — itself plus the transitive deps it drags into the browser. The
   * audit checks the real module graph against the union of these, so a dep that appears here is "declared", and one
   * that doesn't is a bug in the docs.
   */
  packages: string[]
  /** Not in the default client graph — an app opts in. Excluded from `total` and from the audit's expectations. */
  optional?: boolean
}

/**
 * Everything a Point0 app ships to the browser beyond React itself. Keep `packages` exhaustive: it is what the audit
 * measures against, and an under-listed row silently swallows an intruder.
 */
export const ROWS: readonly SizeRow[] = [
  {
    id: '@point0/core',
    role: 'the framework itself',
    entries: ['@point0/core'],
    // `safe-stable-stringify` and `use-context-selector` are real dependencies of core, bundled into it — no row of
    // their own, because their bytes are already inside core's number. (`@standard-schema/spec` is types-only and
    // never reaches the browser at all, so it isn't listed: if it ever emitted runtime code, the audit should shout.)
    packages: ['@point0/core', 'safe-stable-stringify', 'use-context-selector'],
  },
  {
    id: '@point0/react-dom',
    role: 'React/DOM bindings — `mount` and the router',
    entries: ['@point0/react-dom/mount', '@point0/react-dom/router'],
    packages: ['@point0/react-dom'],
  },
  {
    id: '@1gr14/route0',
    role: 'peer — typed routes and URL building',
    entries: ['@1gr14/route0'],
    packages: ['@1gr14/route0', '@1gr14/flat'],
  },
  {
    id: '@tanstack/react-query',
    role: 'peer — the cache every loader rides on',
    entries: ['@tanstack/react-query'],
    packages: ['@tanstack/react-query', '@tanstack/query-core'],
  },
  {
    id: 'wouter',
    role: 'peer — history and route matching',
    entries: ['wouter', 'wouter/use-browser-location'],
    packages: ['wouter', 'regexparam', 'use-sync-external-store'],
  },
  {
    id: 'unhead',
    role: 'peer — the `<head>`',
    entries: ['unhead', '@unhead/react'],
    packages: ['unhead', '@unhead/react', 'hookable'],
  },
  {
    id: '@1gr14/error0',
    role: 'optional peer — typed errors across the wire',
    entries: ['@1gr14/error0'],
    packages: ['@1gr14/error0'],
    optional: true,
  },
]

/** The entry points a real app pulls into its client bundle — see `examples/basic/src`. Drives {@link auditClientGraph}. */
const CLIENT_APP_ENTRIES = [
  '@point0/react-dom/mount', // src/index.client.tsx
  '@point0/react-dom/router', // src/lib/navigation.ts
  '@point0/core', // everywhere
  '@point0/core/unhead', // src/app.client.tsx
  'wouter/use-browser-location', // src/lib/navigation.ts
  '@unhead/react', // src/app.client.tsx
]

// ---------------------------------------------------------------------------------------------------------------
// measuring
// ---------------------------------------------------------------------------------------------------------------

export type Measurement = { raw: number; gzip: number; brotli: number }

const writeEntry = async (name: string, specifiers: readonly string[]): Promise<string> => {
  const file = nodePath.join(TREE_DIR, `${name.replace(/[^a-zA-Z0-9]+/g, '-')}.ts`)
  // Import the namespace and pin it to a global: without a consumer, tree-shaking would erase the whole package and
  // every row would measure a few hundred bytes of nothing.
  const lines = specifiers.map((spec, index) => `import * as m${index} from '${spec}'`)
  const kept = specifiers.map((_, index) => `m${index}`).join(', ')
  lines.push(`;(globalThis as unknown as Record<string, unknown>).__keep = [${kept}]`)
  await Bun.write(file, `${lines.join('\n')}\n`)
  return file
}

const bundle = async (entry: string, external: readonly string[], sourcemap: boolean) => {
  const built = await Bun.build({
    entrypoints: [entry],
    target: 'browser',
    minify: true,
    external: [...external],
    sourcemap: sourcemap ? 'external' : 'none',
    define: { 'process.env.NODE_ENV': '"production"' },
  })
  if (!built.success) {
    throw new Error(
      `size.ts: failed to bundle ${nodePath.relative(ROOT, entry)} — is the tree built? Run \`bun run build\`.\n` +
        built.logs.map(String).join('\n'),
    )
  }
  return built
}

const compress = async (built: Awaited<ReturnType<typeof bundle>>): Promise<Measurement> => {
  const js = built.outputs.find((o) => o.kind === 'entry-point')!
  const buf = Buffer.from(await js.arrayBuffer())
  return {
    raw: buf.length,
    gzip: zlib.gzipSync(buf, { level: zlib.constants.Z_BEST_COMPRESSION }).length,
    brotli: zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }).length,
  }
}

/** Every package NOT owned by `row` — what a row's own measurement must treat as somebody else's bytes. */
const externalsFor = (row: SizeRow): string[] => {
  const own = new Set(row.packages)
  const others = ROWS.flatMap((other) => other.packages).filter((pkg) => !own.has(pkg))
  return [...new Set([...others, ...REACT_RUNTIME])]
}

export const measureRows = async (): Promise<Array<SizeRow & Measurement>> => {
  materializeTree()
  const measured: Array<SizeRow & Measurement> = []
  for (const row of ROWS) {
    const entry = await writeEntry(row.id, row.entries)
    measured.push({ ...row, ...(await compress(await bundle(entry, externalsFor(row), false))) })
  }
  return measured
}

/**
 * One bundle with every non-optional row in it — what the browser actually downloads. Expect a few percent ABOVE the
 * column sum, not below: the rows are disjoint (each externalizes the others), so nothing dedupes, while the combined
 * bundle still pays for CommonJS interop and module glue the separate ones skip.
 */
export const measureTotal = async (): Promise<Measurement> => {
  materializeTree()
  const entries = ROWS.filter((r) => !r.optional).flatMap((r) => r.entries)
  const entry = await writeEntry('total', entries)
  return compress(await bundle(entry, REACT_RUNTIME, false))
}

// ---------------------------------------------------------------------------------------------------------------
// audit
// ---------------------------------------------------------------------------------------------------------------

/**
 * `…/node_modules/@scope/name/dist/x.js` -> `@scope/name`; a workspace path -> `@point0/<pkg>`.
 *
 * The `(?!\.)` skips node_modules' dot-dirs — `.cache` (where this script's own synthetic entry lives) and `.bin`. No
 * real package name starts with a dot.
 */
export const packageOf = (source: string): string | undefined => {
  const dep = /node_modules\/(?!\.)((?:@[^/]+\/)?[^/]+)\//.exec(source)
  if (dep) return dep[1]
  // A workspace path here means the measurement escaped the materialized tree and hit `packages/` directly — count it
  // rather than let it vanish, `src` included (that is what a stray tsconfig `paths` mapping produces).
  const workspace = /(?:^|\/)packages\/([^/]+)\/(?:dist|src)\//.exec(source)
  return workspace ? `@point0/${workspace[1]}` : undefined
}

export type AuditResult = { packages: string[]; undeclared: string[]; unusedRows: string[]; unattributed: string[] }

/**
 * Bundle what a real app imports and read every module in the graph off the sourcemap. Any npm package present but not
 * claimed by a row is `undeclared` — a dependency the docs don't tell users they are shipping.
 */
export const auditClientGraph = async (): Promise<AuditResult> => {
  materializeTree()
  const entry = await writeEntry('client-app', CLIENT_APP_ENTRIES)
  const built = await bundle(entry, REACT_RUNTIME, true)
  const map = built.outputs.find((o) => o.kind === 'sourcemap')
  if (!map) throw new Error('size.ts: bundler produced no sourcemap — cannot audit the client module graph.')
  const { sources } = JSON.parse(await map.text()) as { sources: string[] }

  const entryRel = toPosix(nodePath.relative(ROOT, entry))
  const found = new Set<string>()
  const unattributed: string[] = []
  for (const source of sources) {
    const pkg = packageOf(source)
    if (pkg) found.add(pkg)
    // A module the patterns can't name is a HOLE, not a nothing: a dep whose dist ships sourcemaps can report its own
    // `src` path, and if that path matched neither pattern the module would ship un-audited. Fail instead.
    else if (toPosix(source) !== entryRel) unattributed.push(toPosix(source))
  }
  const declared = new Set([...ROWS.flatMap((row) => row.packages), ...REACT_RUNTIME])
  const expected = new Set(ROWS.filter((row) => !row.optional).flatMap((row) => row.packages))
  return {
    packages: [...found].sort(),
    unattributed: unattributed.sort(),
    undeclared: [...found].filter((pkg) => !declared.has(pkg)).sort(),
    // A row claims a package the graph never loads: the dep is gone, or it moved behind an opt-in and the row should be
    // `optional`. Reported, never fatal.
    unusedRows: [...expected].filter((pkg) => !found.has(pkg)).sort(),
  }
}

// ---------------------------------------------------------------------------------------------------------------
// rendering
// ---------------------------------------------------------------------------------------------------------------

const kb = (bytes: number): string => `${(bytes / 1024).toFixed(1)} KB`

export const renderBlock = (rows: readonly (SizeRow & Measurement)[], total: Measurement): string => {
  const md = [
    'Every package a Point0 app ships to the browser, measured as npm delivers it: bundled, minified, with `react` and',
    '`react-dom` left out because you pay for those either way. Each row imports the whole surface of its package, so',
    'nothing tree-shakes away — these are ceilings, not best cases. **Total** is one bundle holding every non-optional',
    'row at once: what the browser actually downloads.',
    '',
    '| package | role | raw | gzip | brotli |',
    '| --- | --- | ---: | ---: | ---: |',
  ]
  for (const row of rows) {
    md.push(`| \`${row.id}\` | ${row.role} | ${kb(row.raw)} | ${kb(row.gzip)} | ${kb(row.brotli)} |`)
  }
  md.push(
    `| **total** | everything above, minus the optional peer | **${kb(total.raw)}** | **${kb(total.gzip)}** | ` +
      `**${kb(total.brotli)}** |`,
  )
  return md.join('\n')
}

const START = '<!-- point0:size:start -->'
const END = '<!-- point0:size:end -->'

/** Docs that quote the numbers. Each must already carry the two markers — this script never invents a section. */
export const DOC_FILES = ['README.md', 'docs/intro/overview.md', 'docs/intro/full-overview.md']

export const replaceBlock = (content: string, block: string, file: string): string => {
  const start = content.indexOf(START)
  const end = content.indexOf(END)
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`size.ts: ${file} is missing the ${START} / ${END} markers.`)
  }
  return `${content.slice(0, start + START.length)}\n\n${block}\n\n${content.slice(end)}`
}

const formatMarkdown = async (content: string, filepath: string): Promise<string> => {
  const config = await prettier.resolveConfig(filepath)
  return prettier.format(content, { ...config, filepath })
}

// ---------------------------------------------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------------------------------------------

if (import.meta.main) {
  const args = process.argv.slice(2)
  const write = args.includes('--write')
  const check = args.includes('--check')
  const auditOnly = args.includes('--audit')

  const audit = await auditClientGraph()
  process.stdout.write(`\nClient bundle graph — ${audit.packages.length} packages:\n  ${audit.packages.join(', ')}\n`)
  if (audit.unusedRows.length > 0) {
    process.stdout.write(`\n⚠ declared but never loaded: ${audit.unusedRows.join(', ')}\n`)
  }
  if (audit.unattributed.length > 0) {
    process.stderr.write(
      '\n✗ these modules ship to the browser but could not be traced to a package:\n' +
        `${audit.unattributed.map((p) => `  - ${p}`).join('\n')}\n` +
        '  Teach `packageOf` to name them — until then they are audited by nobody.\n',
    )
    process.exit(1)
  }
  if (audit.undeclared.length > 0) {
    process.stderr.write(
      '\n✗ these ship to the browser but no row in scripts/size.ts accounts for them:\n' +
        `${audit.undeclared.map((p) => `  - ${p}`).join('\n')}\n` +
        "  Add each to an existing row's `packages`, or give it a row of its own.\n",
    )
    process.exit(1)
  }
  process.stdout.write('✓ every client dependency is declared\n')
  if (auditOnly) process.exit(0)

  const rows = await measureRows()
  const total = await measureTotal()
  const block = renderBlock(rows, total)
  process.stdout.write(`\n${block}\n\n`)

  if (!write && !check) process.exit(0)

  const stale: string[] = []
  for (const file of DOC_FILES) {
    const path = nodePath.join(ROOT, file)
    const before = nodeFs.readFileSync(path, 'utf8')
    const after = await formatMarkdown(replaceBlock(before, block, file), path)
    if (after === before) continue
    if (write) {
      nodeFs.writeFileSync(path, after)
      process.stdout.write(`updated ${file}\n`)
    } else {
      stale.push(file)
    }
  }
  if (check && stale.length > 0) {
    process.stderr.write(
      `\n✗ stale size block in:\n${stale.map((f) => `  - ${f}`).join('\n')}\n  Run \`bun run size:write\`.\n`,
    )
    process.exit(1)
  }
  process.stdout.write(write ? '\nDocs are up to date.\n' : '\n✓ docs match the measured sizes.\n')
}
