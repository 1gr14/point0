// Content-addressed module store for point0 SERVER-SIDE hot reload (`point0 dev --hot`, bun-native only) + cold
// externalization. Owns the whole hot-reload PROTOCOL (graph build, content-hash naming, manifest, the per-request read
// gate, cold classification) so it's understandable in one place; engine/server/client only CREATE a `ServerHotStore`,
// REGISTER their points aggregator, and READ from it. (The one exception: the cold-config-glob MATCHER itself —
// `isImporterColdPath` — is a compiler importer rule this store consumes, since cold sits alongside `deny`/`mock`;
// cold can be declared either by that glob or by the in-file `@point0/core/cold` marker.)
//
// Two roles, one class, two processes:
//  - ORCHESTRATOR side (`ServerHotStore.forBuild`, the `point0 dev` process): has the compiler + app src dir, (re)builds
//    the store on file change (`rebuild`) and classifies a changed file as hot-swap vs restart (`isHotNode`).
//  - CHILD side (`ServerHotStore.forChild`, the stable server subprocess): read-only — given a registered aggregator's
//    original path, returns the CURRENT store module url + a `changed` flag (`current`), gated by the manifest hash.
//
// HOT (the user's editable source): compiled via the REAL @point0/compiler, written under a content-hash filename,
// in-app import specifiers rewritten to deps' hashed names. Only a changed file + its importer chain re-hash; unchanged
// files keep their hash -> their module record stays cached -> state persists. The stable server re-imports the current
// aggregators per request (gated by manifest hash) -> hot content with no React tear (react/@point0/@prisma stay BARE
// -> same cached singletons).
//
// COLD (a file that imports `@point0/core/cold`, propagated DOWNWARD through static imports): NOT flattened. A hot
// file's import of a cold target is rewritten to the cold file's ABSOLUTE real path, so it loads once at its real
// location (its own `../` / wasm / `import.meta` intact, via the stable process's compiler plugin) and stays a cached
// singleton. Editing a cold file => full restart. Proven necessary by exp9: Prisma's generated client can't be flattened.
//
// ASSETS (png/svg/…): rewritten to the asset's absolute path for the MVP (resolvable; proper served
// `/_point0/asset/<hash>` URLs via the existing dev-ssr-fix-assets transform come later).
//
// Skip-from-compiler: the store dir lives under `node_modules/.cache/server-hot/` — NO "point0" substring after
// `node_modules/`, and hashed names strip "point0" — so `compiler.filter` rejects the whole store dir for free (the
// stable child's compiler onLoad plugin never re-transforms the already-compiled store files). We assert this invariant
// after writing (a future rename that reintroduces "point0" fails loudly, not silently).
import type { Compiler } from '@point0/compiler'
import { appendInlineSourceMap, FileResolver, isImporterColdPath, resolveCacheDirPath } from '@point0/compiler'
import type { LogFn, PointsDefinitionSource } from '@point0/core'
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import nodePath from 'node:path'
import { pathToFileURL } from 'node:url'

/** The declarative cold marker. A file importing it (and its downward static closure) is externalized. */
export const COLD_MARKER = '@point0/core/cold'

export type ServerHotStoreManifest = {
  version: number
  /** Map of each entry's ORIGINAL absolute path -> its hashed store filename (re-imported by the child). */
  aggregators: Record<string, string>
}

type ServerHotStoreBuildResult = {
  manifest: ServerHotStoreManifest
  hashedByAbs: Record<string, string>
  order: string[]
  /** Absolute paths of cold files (externalized to their real location). A change here => full restart. */
  coldExternalized: string[]
  diagnostics: {
    nodeCount: number
    hotCount: number
    coldCount: number
    rewritten: number
    assets: Array<{ file: string; spec: string }>
    /** Relative module specifiers still present after rewrite — must be EMPTY for a valid store (asserted). */
    misses: Array<{ file: string; spec: string }>
    importMeta: string[]
  }
}

const norm = (p: string): string => p.split('?', 1)[0] as string
/**
 * Split a specifier into its path and its trailing `?query` (the `?` included), e.g. `x.svg?react` → `['x.svg',
 * '?react']`.
 */
const splitQuery = (s: string): [string, string] => {
  const i = s.indexOf('?')
  return i === -1 ? [s, ''] : [s.slice(0, i), s.slice(i)]
}
const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const ASSET_RE = /\.(png|jpe?g|gif|webp|avif|ico|bmp|svg|mp[34]|wav|ogg|webm|mov|woff2?|ttf|otf|eot|pdf|css|wasm)$/i

/** Replace quoted occurrences of an exact import specifier (import/export/dynamic-import positions). */
function replaceSpecifier(code: string, spec: string, replacement: string): string {
  const re = new RegExp(`(['"])${escapeRe(spec)}\\1`, 'g')
  return code.replace(re, (_m, q: string) => `${q}${replacement}${q}`)
}

/**
 * A line-level identity source map (store line N → original line N, column 0). Used for store files the compiler
 * returned UNMODIFIED (no map of its own): they are line-identical to the original (only import specifiers were
 * rewritten in place), so an identity map is all `source-map-support` needs to rewrite the store PATH back to the
 * original file. `mappings` is `AAAA` for line 1 then `AACA` (advance source line by 1) for each subsequent line.
 */
function identitySourceMap(
  sourceAbs: string,
  code: string,
): { version: number; sources: string[]; names: string[]; mappings: string } {
  const lineCount = code.split('\n').length
  const mappings = lineCount > 0 ? 'AAAA' + ';AACA'.repeat(lineCount - 1) : ''
  return { version: 3, sources: [sourceAbs], names: [], mappings }
}

/**
 * A readable, unique base derived from the path relative to the app src dir, with "point0" stripped so the hashed name
 * never reintroduces the substring `compiler.filter` keys on (see header).
 */
function sanitizeBase(abs: string, appSrcDir: string): string {
  return nodePath
    .relative(appSrcDir, abs)
    .replace(/\.[^./]+$/, '')
    .replace(/point0/gi, 'p0')
    .replace(/[^a-zA-Z0-9]+/g, '_')
}

const IMPORT_SPECIFIER_RE = /import\(\s*['"`]([^'"`]+)['"`]\s*\)/

/**
 * Extract the absolute path of the points-aggregator module a `points` config source re-imports, so the hot store can
 * key on the SAME file the engine actually imports — independent of whether `point0 generate` ran. Only the dynamic `()
 * => import('./aggregator.js')` form (a `PointsDefinitionSource` function whose body contains a single static
 * `import('…')`) is resolvable; an inline points array or a computed specifier returns null (the caller then falls back
 * to restart-based dev for that side). The specifier is resolved against `engineFile` (the `Engine.create({ file:
 * import.meta.url })` config module, where the thunk is authored) via the compiler's own {@link FileResolver} — so it
 * resolves exactly like the compiler would: tsconfig `paths` aliases, extension/index resolution, the `.js`→`.ts` ESM
 * convention, and the extensionless `./generated/point0/points.server` shape. We take the FIRST `import('…')` in the
 * thunk body — correct for the canonical one-line aggregator thunk; a commented-out/secondary import would mis-grab
 * (acceptable: not a shape point0 authors write). A specifier resolving into `node_modules` is rejected — the
 * aggregator is always one of the app's own modules.
 */
export function resolvePointsAggregatorAbs({
  source,
  engineFile,
}: {
  source: PointsDefinitionSource<any, any> | null | undefined
  engineFile: string | null
}): string | null {
  if (!source || typeof source !== 'function' || !engineFile) return null
  const body = Function.prototype.toString.call(source as (...args: unknown[]) => unknown)
  const match = IMPORT_SPECIFIER_RE.exec(body)
  if (!match) return null
  const resolved = FileResolver.resolveFilePath({ path: match[1], importer: engineFile })
  if (!resolved || resolved.includes('/node_modules/')) return null
  return resolved
}

/** Cache root for every scope's server hot-reload store: `node_modules/.cache/server-hot`. Used by `point0 prune`. */
export function serverHotStoreRootDir(): string {
  return resolveCacheDirPath(['server-hot'])
}

/**
 * Resolve (and create) this dev process's server hot-reload store dir. Lives under
 * `node_modules/.cache/server-hot/<scope>-<port>`, deliberately OUT of the `@point0` temp namespace
 * ({@link resolveTempDirPath}) so the path has NO "point0" substring after `node_modules/` and `compiler.filter` rejects
 * it (the stable child must not re-compile the store files). The parent computes this once and passes it to the child
 * via `POINT0_DEV_STORE_DIR`. Keyed by `<scope>-<port>` (matching the dev-client temp dir convention) so two dev
 * processes on the same folder but different ports get isolated stores and never clobber each other's manifest.
 */
export function resolveServerHotStoreDir(scope: string, port: number | string): string {
  return resolveCacheDirPath(['server-hot', `${scope}-${port}`])
}

/**
 * The single owner of the server hot-reload store. Build/watch on the orchestrator, read on the child — see the file
 * header for the two-role protocol.
 */
export class ServerHotStore {
  /** The store dir; also passed to the child via `POINT0_DEV_STORE_DIR`. */
  readonly dir: string
  private readonly log: LogFn
  /** Orchestrator-only: the compiler used to compile each node, and the src dir that bounds the store. */
  private readonly compiler: Compiler | undefined
  private readonly appSrcDir: string | undefined
  /** Each side's points-aggregator ORIGINAL abs path. Orchestrator: build entries. Child: manifest lookup keys. */
  private readonly aggregators = new Set<string>()
  /** Monotonic build counter (orchestrator). Recorded in the manifest; `1` is the initial (cleaning) build. */
  private version = 0
  /** Orchestrator: the current hot store node set — a change to one is a hot-swap, anything else a restart. */
  private hotNodes = new Set<string>()
  /** Child: the manifest hash last successfully imported per aggregator, so an unchanged read is a cheap cache hit. */
  private readonly lastHashByAbs = new Map<string, string>()

  private constructor(opts: { dir: string; log: LogFn; compiler?: Compiler; appSrcDir?: string }) {
    this.dir = opts.dir
    this.log = opts.log
    this.compiler = opts.compiler
    this.appSrcDir = opts.appSrcDir
  }

  /** Orchestrator side: a store that can build + watch. */
  static forBuild(opts: { dir: string; appSrcDir: string; compiler: Compiler; log: LogFn }): ServerHotStore {
    return new ServerHotStore(opts)
  }

  /** Child side: a read-only store bound to `POINT0_DEV_STORE_DIR`. Null when not running in hot mode. */
  static forChild(opts: { log: LogFn }): ServerHotStore | null {
    const dir = process.env.POINT0_DEV_STORE_DIR
    if (!dir) return null
    return new ServerHotStore({ dir, log: opts.log })
  }

  /** Register a side's points-aggregator original abs path (no-op for null — e.g. a client without points). */
  registerAggregator(aggregatorAbs: string | null | undefined): void {
    if (aggregatorAbs) this.aggregators.add(norm(aggregatorAbs))
  }

  /** True once at least one aggregator is registered (i.e. hot reload can actually run). */
  get hasAggregators(): boolean {
    return this.aggregators.size > 0
  }

  // ----- orchestrator (build / watch) -----

  /** (Re)build the content-addressed store from the registered aggregators. First build cleans the dir. */
  rebuild(): void {
    if (!this.compiler || !this.appSrcDir) {
      throw new Error('ServerHotStore.rebuild() requires a compiler + appSrcDir (orchestrator side only)')
    }
    this.version += 1
    const result = this._build({ clean: this.version === 1, version: this.version })
    this.hotNodes = new Set(result.order)
    const d = result.diagnostics
    this.log({
      level: 'info',
      category: ['server'],
      message:
        this.version === 1
          ? `Server hot-reload store ready (${d.hotCount} hot, ${d.coldCount} cold, ${d.assets.length} assets)`
          : // : `Server hot reloaded (store v${this.version})`,
            `Server hot reloaded`,
    })
  }

  /** Orchestrator: is a changed file a hot store node (hot-swap) rather than a restart trigger? */
  isHotNode(path: string): boolean {
    return this.hotNodes.has(norm(path))
  }

  // ----- child (read) -----

  /**
   * Child: the CURRENT store module url + hash for a registered aggregator, plus whether it changed since this store's
   * last successful {@link markLoaded}. The hash IS the store filename (content-addressed): unchanged => Bun cache hit
   * (singletons live), changed => fresh module identity (no React tear). Throws if the aggregator is absent from the
   * manifest (a contract violation — orchestrator and child resolve the same aggregator path from the same config).
   */
  currentModule(aggregatorAbs: string): { url: string; hash: string; changed: boolean } {
    const key = norm(aggregatorAbs)
    const manifest = this._readManifest()
    const hash = manifest.aggregators[key]
    if (!hash) {
      throw new Error(`Server hot-reload store manifest has no entry for the points aggregator: ${key}`)
    }
    const url = pathToFileURL(nodePath.join(this.dir, hash)).href
    return { url, hash, changed: hash !== this.lastHashByAbs.get(key) }
  }

  /** Child: record a successful import so the next unchanged read short-circuits to the cached module. */
  markLoaded(aggregatorAbs: string, hash: string): void {
    this.lastHashByAbs.set(norm(aggregatorAbs), hash)
  }

  /** Read the store manifest (child side, per request — the file is tiny and written atomically by the builder). */
  private _readManifest(): ServerHotStoreManifest {
    return JSON.parse(readFileSync(nodePath.join(this.dir, 'manifest.json'), 'utf8')) as ServerHotStoreManifest
  }

  // ----- build implementation -----

  private _build({ clean, version }: { clean: boolean; version: number }): ServerHotStoreBuildResult {
    const compiler = this.compiler as Compiler
    const appSrcDir = this.appSrcDir as string
    const storeDir = this.dir
    const entryAbsList = [...this.aggregators]
    const srcPrefix = appSrcDir.endsWith(nodePath.sep) ? appSrcDir : appSrcDir + nodePath.sep
    const isInApp = (abs: string | undefined): abs is string =>
      !!abs && compiler.filter.test(abs) && norm(abs).startsWith(srcPrefix)

    // 1+2. Discover the in-app node graph AND compile each node in a SINGLE worklist pass: starting from the entries,
    //      compile a node, read its import edges, and enqueue any unvisited in-app target. Each node is compiled exactly
    //      ONCE — we never trace the graph with a separate `collectImportsDeep` pass (which would compile every node a
    //      second time, with `map:false`, landing in a different compiler-cache partition than the `map:true` build
    //      output and wasting a full recompile per node on a cold build). Cold roots are detected two ways: by config (a
    //      file whose path matches `server.importer.cold`) or by the in-file `@point0/core/cold` marker import.
    const codeByAbs = new Map<string, string>()
    const mapByAbs = new Map<string, unknown>()
    const outByAbs = new Map<string, Array<{ pathOriginal: string; pathResolved: string }>>()
    const importMeta: string[] = []
    const coldRoots: string[] = []
    const nodes = new Set<string>()
    const queue = [...entryAbsList]
    const queued = new Set<string>(entryAbsList)
    while (queue.length > 0) {
      const abs = queue.shift() as string
      nodes.add(abs)
      // Emit an inline source map + materialize virtual modules. Bun ITSELF ignores the map at runtime (it re-transpiles
      // the .tsx and uses its own map), but `source-map-support` — installed in the dev child — reads this inline map
      // via Error.prepareStackTrace and remaps store-file frames back to the ORIGINAL source, so anything that reads
      // `err.stack` (point0's error overlay / logs) shows original file:line. The map's `sources` already point at the
      // original abs path (compiler sets `sourceFileName`). `writeVirtual` materializes importer-rewritten virtual
      // modules (deny/mock) the store output references.
      const r = compiler.compile({ file: abs, map: true, writeVirtual: true })
      codeByAbs.set(abs, r.code)
      mapByAbs.set(abs, r.map)
      let isColdRoot = isImporterColdPath({ path: abs, importer: compiler.importer })
      const outs: Array<{ pathOriginal: string; pathResolved: string }> = []
      for (const im of r.imports) {
        if (im.pathOriginal === COLD_MARKER) isColdRoot = true
        if (!im.pathResolved) continue
        const resolved = norm(im.pathResolved)
        outs.push({ pathOriginal: im.pathOriginal, pathResolved: resolved })
        if (isInApp(resolved) && !queued.has(resolved)) {
          queued.add(resolved)
          queue.push(resolved)
        }
      }
      if (isColdRoot) coldRoots.push(abs)
      outByAbs.set(abs, outs)
      if (/import\.meta/.test(r.code)) importMeta.push(abs)
    }

    // 3. Cold set = downward static closure from cold roots over in-node edges.
    const coldSet = new Set<string>()
    const markCold = (abs: string): void => {
      if (coldSet.has(abs) || !nodes.has(abs)) return
      coldSet.add(abs)
      for (const e of outByAbs.get(abs) ?? []) if (nodes.has(e.pathResolved)) markCold(e.pathResolved)
    }
    for (const root of coldRoots) markCold(root)
    const isHot = (abs: string): boolean => nodes.has(abs) && !coldSet.has(abs)

    // 4. Topological order over HOT nodes (deps first) for cascade hashing.
    const order: string[] = []
    const seen = new Set<string>()
    const visit = (abs: string): void => {
      if (seen.has(abs) || !isHot(abs)) return
      seen.add(abs)
      for (const e of outByAbs.get(abs) ?? []) if (isHot(e.pathResolved)) visit(e.pathResolved)
      order.push(abs)
    }
    for (const entry of entryAbsList) visit(entry)
    for (const abs of nodes) if (isHot(abs)) visit(abs)

    // 5. Cascade-hash + rewrite + write the HOT store. Cold/asset targets -> absolute real path.
    if (clean) rmSync(storeDir, { recursive: true, force: true })
    mkdirSync(storeDir, { recursive: true })
    const diagnostics: ServerHotStoreBuildResult['diagnostics'] = {
      nodeCount: nodes.size,
      hotCount: order.length,
      coldCount: coldSet.size,
      rewritten: 0,
      assets: [],
      misses: [],
      importMeta,
    }
    const hashedByAbs: Record<string, string> = {}
    for (const abs of order) {
      let code = codeByAbs.get(abs) ?? ''
      for (const e of outByAbs.get(abs) ?? []) {
        if (isHot(e.pathResolved)) {
          code = replaceSpecifier(code, e.pathOriginal, './' + (hashedByAbs[e.pathResolved] as string))
        } else if (coldSet.has(e.pathResolved)) {
          code = replaceSpecifier(code, e.pathOriginal, e.pathResolved) // cold -> absolute real path (singleton)
        } else if (ASSET_RE.test(e.pathResolved)) {
          // Asset -> absolute real path, preserving any `?query` from the original specifier (e.g. `?react` for svgr),
          // so the relocated store file loads it from disk and the right loader still transforms it. (MVP — proper
          // served `/_point0/asset/<hash>` URLs come with the asset-pipeline rework.)
          code = replaceSpecifier(code, e.pathOriginal, e.pathResolved + splitQuery(e.pathOriginal)[1])
          diagnostics.assets.push({ file: abs, spec: e.pathOriginal })
        }
      }
      // Validate: classify any relative specifier still present in the final code.
      for (const m of code.matchAll(/(['"])(\.\.?\/[^'"]+)\1/g)) {
        const spec = m[2] as string
        if (/\.[0-9a-f]{12}\.tsx$/.test(spec)) diagnostics.rewritten++
        else if (ASSET_RE.test(spec)) {
          /* already counted */
        } else diagnostics.misses.push({ file: abs, spec })
      }
      const hash = Bun.hash(code).toString(16).padStart(16, '0').slice(0, 12)
      const hashed = `${sanitizeBase(abs, appSrcDir)}.${hash}.tsx`
      hashedByAbs[abs] = hashed
      // Content-addressed: the filename IS the content hash, so an existing file with this name already holds this exact
      // code. Skip rewriting it — only changed files (new hash => new name) are written. Keeps unchanged store files'
      // mtimes stable (so the child's `bun --watch` never sees a rebuild) and is less I/O on every reload.
      const storeFilePath = nodePath.join(storeDir, hashed)
      if (!existsSync(storeFilePath)) {
        // Hash is over the rewritten code only (deterministic id); the map derives from the same source, so an existing
        // file with this hash already has its inline map appended → content-addressing still holds. Unmodified files
        // carry no compiler map → fall back to a line-identity map so the store PATH still gets rewritten to the original.
        const map = mapByAbs.get(abs) ?? identitySourceMap(abs, code)
        writeFileSync(storeFilePath, appendInlineSourceMap(code, map))
      }
    }

    // 6a. Invariant: no written store file may match `compiler.filter` (else the child's compiler onLoad plugin would
    //     re-transform an already-compiled file). This is the contract that lets us skip the store dir for free via path
    //     placement + "point0"-free names — assert it so a regression is loud, not silent.
    for (const abs of order) {
      const storeFileAbs = nodePath.join(storeDir, hashedByAbs[abs] as string)
      if (compiler.filter.test(storeFileAbs)) {
        throw new Error(
          `Server hot-reload store file would be re-compiled by the point0 compiler plugin (matches compiler.filter): ` +
            `${storeFileAbs}. The store dir or hashed names contain "point0" after node_modules/. Pick a dir without it.`,
        )
      }
    }

    // 6b. Invariant: every in-app import must have been rewritten (to a hashed name, a cold abs path, or an asset path).
    //     A leftover relative specifier resolves wrong (or fails) in the stable child — fail loudly instead.
    if (diagnostics.misses.length > 0) {
      const shown = diagnostics.misses.map((m) => `${nodePath.relative(appSrcDir, m.file)} -> ${m.spec}`).join(', ')
      throw new Error(`Server hot-reload store has ${diagnostics.misses.length} unresolved import(s): ${shown}`)
    }

    const aggregators: Record<string, string> = {}
    for (const entry of entryAbsList) {
      const hashed = hashedByAbs[entry]
      if (!hashed) {
        throw new Error(`Server hot-reload store entry was classified cold or unreachable (not hot): ${entry}`)
      }
      aggregators[entry] = hashed
    }
    const manifest: ServerHotStoreManifest = { version, aggregators }
    // Atomic swap: a child request may read the manifest mid-rebuild — write to a temp file, then rename (atomic on the
    // same fs) so it never observes a half-written or missing manifest.
    const manifestPath = nodePath.join(storeDir, 'manifest.json')
    const manifestTmpPath = `${manifestPath}.tmp`
    writeFileSync(manifestTmpPath, JSON.stringify(manifest, null, 2))
    renameSync(manifestTmpPath, manifestPath)
    return { manifest, hashedByAbs, order, coldExternalized: [...coldSet], diagnostics }
  }
}
