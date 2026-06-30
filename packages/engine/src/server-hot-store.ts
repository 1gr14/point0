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
// COLD (NOT flattened — loaded once from its real path, propagated DOWNWARD through in-app import edges): a hot file's
// import of a cold target is rewritten to the cold file's ABSOLUTE real path, so it loads at its real location (its own
// `../` / wasm / `import.meta` intact, via the stable process's compiler plugin) and stays a cached singleton. Editing a
// cold file => full restart. Cold roots come from THREE sources: (1) the in-file `@point0/core/cold` marker; (2) the
// `server.importer.cold` glob; (3) AUTO — a node the store can't faithfully flatten: a location-relative `import.meta`
// (.url/.dir/…, which would resolve to the store dir), or one left with an un-rewritable relative import after the
// rewrite pass (a "miss"). Proven necessary by exp9: Prisma's generated client can't be flattened.
//
// ASSETS (png/svg/…): rewritten to the asset's ABSOLUTE real path (keeping any `?url`/`?file`/`?text`/`?react` query).
// That's complete, not a stopgap: the compiler's asset plugin (`@point0/compiler` `assets.ts`) keys its onLoad/onResolve
// on the EXTENSION, not the path, so when the stable child imports that absolute asset path the plugin intercepts it and
// emits the same content-hashed served URL (`/_point0/assets/<hash>.<ext>`) it would in non-hot dev — verified by the
// "resolves an asset import through the hot store" test. Absolute paths are fine here: the store is dev-only and
// machine-local (under `node_modules/.cache`), never shipped.
//
// Skip-from-compiler: the store dir lives under `node_modules/.cache/server-hot/` — NO "point0" substring after
// `node_modules/`, and hashed names strip "point0" — so `compiler.filter` rejects the whole store dir for free (the
// stable child's compiler onLoad plugin never re-transforms the already-compiled store files). We assert this invariant
// after writing (a future rename that reintroduces "point0" fails loudly, not silently).
import type { Compiler } from '@point0/compiler'
import {
  appendInlineSourceMap,
  FileResolver,
  isImporterColdPath,
  resolveCacheDirPath,
  toPosixPath,
} from '@point0/compiler'
import type { LogFn, PointsDefinitionSource } from '@point0/core'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
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
    /** Asset import sites rewritten to absolute paths (counts import sites, not distinct assets). */
    assets: Array<{ file: string; spec: string }>
    importMeta: string[]
    /** Hot nodes the store could not flatten and auto-externalized (loaded from their real path; edit => restart). */
    autoExternalized: string[]
    /** Stale store files reclaimed by this build's GC sweep. */
    gcDeleted: number
  }
}

// Strip `?query` and posix-normalize at the single keying chokepoint. The hot-store sets are keyed on posix graph paths
// (FileResolver), but the watcher reports changes native-separator — so without this a hot edit misses the `hotNodes`
// set and is misclassified as cold, forcing a full restart instead of a hot-swap.
const norm = (p: string): string => toPosixPath(p.split('?', 1)[0] as string)
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

/**
 * Replace quoted occurrences of an exact import specifier with `replacement`, meant for import/export/dynamic-import
 * source positions.
 *
 * KNOWN BUG: this is a text-level regex replace, so it also rewrites the specifier where it appears quoted INSIDE a
 * string or template literal (e.g. a page that shows `import x from '@/foo'` as a code sample). The dev hot store then
 * serves — and SSR renders — that literal with the specifier swapped for its absolute store/real path. A correct fix
 * must be AST-aware (rewrite only real import/export/`import()`/`require()` source nodes); a keyword anchor isn't
 * enough, since a code sample contains a literal `from '...'` too. Regression test: `replaceSpecifier` in
 * `tests/server-hot-store.test.ts` (currently `it.failing`).
 */
export function replaceSpecifier(code: string, spec: string, replacement: string): string {
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

/**
 * GC the content-addressed store dir: delete `.tsx` files that the CURRENT build no longer references (`keep`) AND that
 * have been stale for at least `graceMs`. Without this the dir grows unbounded over a long dev session — every hot edit
 * cascade-rehashes the changed file + its importers into NEW content-hashed files and the old versions just linger.
 *
 * The grace window is the safety margin against a concurrent child read: a request reads the manifest then dynamically
 * imports the store files it points at, so a JUST-stale file might still be mid-first-import. A content-addressed
 * file's mtime is fixed once written (unchanged files are never rewritten), so "stale for ≥ graceMs" means it dropped
 * out of the live set at least `graceMs` ago — long after any in-flight import of it finished. Resilient: a file
 * already gone or racing a write is skipped. Returns the count deleted. `now` is injected for testability.
 */
export function sweepStaleStoreFiles({
  dir,
  keep,
  graceMs,
  now,
}: {
  dir: string
  keep: Set<string>
  graceMs: number
  now: number
}): number {
  let deleted = 0
  let names: string[]
  try {
    names = readdirSync(dir)
  } catch {
    return 0
  }
  for (const name of names) {
    if (keep.has(name) || !name.endsWith('.tsx')) continue
    const full = nodePath.join(dir, name)
    try {
      if (statSync(full).mtimeMs < now - graceMs) {
        unlinkSync(full)
        deleted++
      }
    } catch {
      // Already removed, or racing a write — skip; the next sweep catches it.
    }
  }
  return deleted
}

/**
 * Strongly-connected components of a directed graph, returned in DEPENDENCY-FIRST order: for a condensation edge A→B (A
 * imports B), B's component is emitted before A's. Iterative Tarjan (no recursion → safe on a deep import graph). The
 * hot store hashes each SCC as one unit, so import CYCLES (which have no plain topological order) still get consistent,
 * fully-resolvable store names — see {@link ServerHotStore} `_build` phase 4.
 */
export function stronglyConnectedComponents(nodes: Iterable<string>, neighbors: (n: string) => string[]): string[][] {
  let counter = 0
  const index = new Map<string, number>()
  const low = new Map<string, number>()
  const onStack = new Set<string>()
  const stack: string[] = []
  const out: string[][] = []
  for (const start of nodes) {
    if (index.has(start)) continue
    const work: Array<{ v: string; ns: string[]; i: number }> = [{ v: start, ns: neighbors(start), i: 0 }]
    index.set(start, counter)
    low.set(start, counter)
    counter++
    stack.push(start)
    onStack.add(start)
    while (work.length > 0) {
      const frame = work[work.length - 1] as { v: string; ns: string[]; i: number }
      if (frame.i < frame.ns.length) {
        const w = frame.ns[frame.i] as string
        frame.i++
        if (!index.has(w)) {
          index.set(w, counter)
          low.set(w, counter)
          counter++
          stack.push(w)
          onStack.add(w)
          work.push({ v: w, ns: neighbors(w), i: 0 })
        } else if (onStack.has(w)) {
          low.set(frame.v, Math.min(low.get(frame.v) as number, index.get(w) as number))
        }
      } else {
        if (low.get(frame.v) === index.get(frame.v)) {
          const comp: string[] = []
          for (;;) {
            const w = stack.pop() as string
            onStack.delete(w)
            comp.push(w)
            if (w === frame.v) break
          }
          out.push(comp)
        }
        work.pop()
        const parent = work[work.length - 1]
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (parent) low.set(parent.v, Math.min(low.get(parent.v) as number, low.get(frame.v) as number))
      }
    }
  }
  return out
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
  /** Monotonic build counter (orchestrator). Recorded in the manifest so the child can detect a new build. */
  private version = 0
  /**
   * True once a build has SUCCEEDED and cleaned the dir. Gates the one-time clean off success, not `version===1` — a
   * failed first build (which threw before cleaning) must still clean on the next attempt rather than skip it.
   */
  private cleaned = false
  /** Orchestrator: the current hot store node set — a change to one is a hot-swap, anything else a restart. */
  private hotNodes = new Set<string>()
  /** Child: the manifest hash last successfully imported per aggregator, so an unchanged read is a cheap cache hit. */
  private readonly lastHashByAbs = new Map<string, string>()

  private constructor(opts: { dir: string; log: LogFn; compiler?: Compiler; appSrcDir?: string }) {
    this.dir = opts.dir
    this.log = opts.log
    this.compiler = opts.compiler
    // Posix-normalize: the graph keys on posix `FileResolver` results, so a native `appSrcDir` would make `isInApp`'s
    // prefix check reject every resolved import on Windows (deps then "cannot flatten").
    this.appSrcDir = opts.appSrcDir === undefined ? undefined : toPosixPath(opts.appSrcDir)
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

  /** (Re)build the content-addressed store from the registered aggregators. The first SUCCESSFUL build cleans the dir. */
  rebuild(): void {
    if (!this.compiler || !this.appSrcDir) {
      throw new Error('ServerHotStore.rebuild() requires a compiler + appSrcDir (orchestrator side only)')
    }
    this.version += 1
    // `clean` on the first SUCCESSFUL build (not `version===1`): if the first build throws before cleaning, the next
    // attempt must still wipe any stale dir from a prior session rather than skip the clean.
    const result = this._build({ clean: !this.cleaned, version: this.version })
    this.cleaned = true
    this.hotNodes = new Set(result.order)
    const d = result.diagnostics
    // DEBUG, not info: these are hot-store internals (store stats, the auto-cold set) — noise in a normal `--hot`
    // session. The per-action feedback the developer wants — `Server hot reloading...` / `Server hot reloaded` on a
    // hot-swap, `Server restarting...` on a cold-file change — is emitted by the watcher in server.ts, in the right
    // context (rebuild() also runs after a cold-file RESTART for mere bookkeeping, so a completion log here would
    // misreport a restart as a hot reload).
    if (this.version === 1) {
      this.log({
        level: 'debug',
        category: ['server'],
        message: `Server hot-reload store ready (${d.hotCount} hot, ${d.coldCount} cold, ${d.assets.length} assets)`,
      })
      if (d.autoExternalized.length > 0) {
        const rel = (p: string) => nodePath.relative(this.appSrcDir as string, p)
        const shown = d.autoExternalized.slice(0, 8).map(rel).join(', ')
        const more = d.autoExternalized.length > 8 ? `, +${d.autoExternalized.length - 8} more` : ''
        this.log({
          level: 'debug',
          category: ['server'],
          message: `Server hot-reload: ${d.autoExternalized.length} file(s) can't be flattened, running cold (edit => restart): ${shown}${more}`,
        })
      }
    }
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
    // `appSrcDir` is posix (see constructor) and graph paths are posix, so the prefix uses `/`, not `nodePath.sep`.
    const srcPrefix = appSrcDir.endsWith('/') ? appSrcDir : appSrcDir + '/'
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
    // Nodes using a LOCATION-relative `import.meta` (`.url`/`.dir`/`.dirname`/`.path`/`.filename`/`.file`/`.resolve`):
    // these resolve against the MODULE's own path, which a flattened store file moves to the store dir — so the path
    // silently resolves wrong. Such a node must be externalized (loaded from its real path), not flattened. `.env`/`.hot`/
    // `.main` don't depend on file location, so they stay hot.
    const importMetaReloc: string[] = []
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
      if (/import\.meta\.(url|dir|dirname|path|filename|file|resolve)\b/.test(r.code)) importMetaReloc.push(abs)
    }

    // 3. Cold classification. A cold node is loaded once from its REAL path (not flattened into the store) and stays a
    //    cached singleton; editing it => full restart. Two sources of cold ROOTS: explicit (`@point0/core/cold` marker
    //    or `server.importer.cold` glob, collected above) and AUTOMATIC (un-flattenable nodes discovered by the build
    //    loop below). Cold propagates DOWNWARD through in-node import edges, EXCEPT it never crosses into an aggregator
    //    entry — entries must stay re-importable (hot), so they're pinned and stop propagation. (Pinning is safe: in hot
    //    mode the engine reads each aggregator from the store, never via a cold importer's own dynamic `import()` thunk.)
    const entrySet = new Set(entryAbsList)
    const markColdFrom = (roots: Iterable<string>): Set<string> => {
      const coldSet = new Set<string>()
      const markCold = (abs: string): void => {
        if (coldSet.has(abs) || !nodes.has(abs) || entrySet.has(abs)) return
        coldSet.add(abs)
        for (const e of outByAbs.get(abs) ?? []) if (nodes.has(e.pathResolved)) markCold(e.pathResolved)
      }
      for (const root of roots) markCold(root)
      return coldSet
    }

    // 4+5. Build the HOT store for a given cold set: hash + rewrite every hot node IN MEMORY (no disk writes — the caller
    //      writes only the converged build). Hashing is per STRONGLY-CONNECTED-COMPONENT, deps-first: cascade hashing
    //      needs every dep's final store name known before a node is hashed, and import CYCLES have no plain topo order,
    //      so each SCC is hashed as ONE unit (all members share one content hash) and its members' intra-cycle imports
    //      rewrite to consistent, resolvable names. Singleton SCCs (the acyclic norm) reduce to per-node cascade hashing.
    const buildHot = (
      coldSet: Set<string>,
    ): {
      hashedByAbs: Record<string, string>
      order: string[]
      codeByStoreAbs: Map<string, string>
      assets: Array<{ file: string; spec: string }>
      rewritten: number
      misses: Array<{ file: string; spec: string }>
    } => {
      const isHot = (abs: string): boolean => nodes.has(abs) && !coldSet.has(abs)
      const hotNeighbors = (abs: string): string[] => {
        const seenN = new Set<string>()
        const ns: string[] = []
        for (const e of outByAbs.get(abs) ?? []) {
          if (isHot(e.pathResolved) && !seenN.has(e.pathResolved)) {
            seenN.add(e.pathResolved)
            ns.push(e.pathResolved)
          }
        }
        return ns
      }
      const hotNodes: string[] = []
      for (const abs of nodes) if (isHot(abs)) hotNodes.push(abs)
      const sccs = stronglyConnectedComponents(hotNodes, hotNeighbors) // deps-first

      // Store-filename base: the sanitized relpath PLUS a short hash of the FULL relpath. `sanitizeBase` is lossy
      // ("point0"->"p0", every non-alnum run -> "_"), so two distinct paths (`foo/bar.ts`, `foo-bar.ts`) can sanitize to
      // the same string. Within ONE SCC (whose members share a single `sccHash`) that would collide to one filename and
      // the write loop would silently drop the second member's body. The relpath hash makes the base injective per file.
      const storeBase = (m: string): string =>
        `${sanitizeBase(m, appSrcDir)}_${Bun.hash(nodePath.relative(appSrcDir, m)).toString(16).padStart(16, '0').slice(0, 8)}`

      const hashedByAbs: Record<string, string> = {}
      const order: string[] = []
      const codeByStoreAbs = new Map<string, string>()
      const assets: Array<{ file: string; spec: string }> = []
      const misses: Array<{ file: string; spec: string }> = []
      let rewritten = 0
      // Rewrite one node's import specifiers: hot dep -> its store name (`nameOf`); cold dep -> its absolute real path
      // (singleton); asset -> its absolute path, keeping any `?query` (e.g. `?react` for svgr).
      const rewriteNode = (abs: string, nameOf: (target: string) => string): string => {
        let code = codeByAbs.get(abs) ?? ''
        for (const e of outByAbs.get(abs) ?? []) {
          if (isHot(e.pathResolved)) code = replaceSpecifier(code, e.pathOriginal, './' + nameOf(e.pathResolved))
          else if (coldSet.has(e.pathResolved)) code = replaceSpecifier(code, e.pathOriginal, e.pathResolved)
          else if (ASSET_RE.test(e.pathResolved))
            code = replaceSpecifier(code, e.pathOriginal, e.pathResolved + splitQuery(e.pathOriginal)[1])
        }
        return code
      }
      for (const scc of sccs) {
        const sccSet = new Set(scc)
        // Hash pass: external hot deps already carry their final names (deps-first); intra-SCC deps don't exist yet, so
        // they use a stable, name-free placeholder — the SCC's one content hash thus depends on every member's body +
        // its external deps' hashes (so a change anywhere cascades) but not on the not-yet-known intra names.
        const placeholder = (t: string): string => `${storeBase(t)}.scc`
        let hashInput = ''
        for (const m of [...scc].sort()) {
          const code = rewriteNode(m, (t) => (sccSet.has(t) ? placeholder(t) : (hashedByAbs[t] ?? placeholder(t))))
          hashInput += nodePath.relative(appSrcDir, m) + '\0' + code + '\0'
        }
        const sccHash = Bun.hash(hashInput).toString(16).padStart(16, '0').slice(0, 12)
        for (const m of scc) hashedByAbs[m] = `${storeBase(m)}.${sccHash}.tsx`
        // Final pass: every name (external + intra-SCC) is known now -> rewrite, validate, stash the code.
        for (const m of scc) {
          order.push(m)
          const code = rewriteNode(m, (t) => hashedByAbs[t] as string)
          codeByStoreAbs.set(m, code)
          for (const e of outByAbs.get(m) ?? [])
            if (ASSET_RE.test(e.pathResolved)) assets.push({ file: m, spec: e.pathOriginal })
          // Validate: any relative specifier still present in the final code is either a rewritten store name (ok), an
          // asset (ok), or an UNRESOLVED import the store couldn't flatten (a miss — the build loop externalizes it).
          for (const x of code.matchAll(/(['"])(\.\.?\/[^'"]+)\1/g)) {
            const spec = x[2] as string
            if (/\.[0-9a-f]{12}\.tsx$/.test(spec)) rewritten++
            else if (ASSET_RE.test(spec)) {
              /* asset, already counted */
            } else misses.push({ file: m, spec })
          }
        }
      }
      return { hashedByAbs, order, codeByStoreAbs, assets, rewritten, misses }
    }

    // 5b. Build, externalizing un-flattenable nodes until the store is clean. A hot node the store can't flatten — a
    //     LOCATION-relative `import.meta` (resolves wrong once relocated; seeded up front from `importMetaReloc`), or an
    //     un-rewritable relative import (a generated client's `./enums` dir / wasm, discovered as a "miss") — is
    //     AUTO-EXTERNALIZED (treated like an explicit cold file: loaded from its real path) rather than failing the whole
    //     build. Editing such a file => full restart; it's infra (generated clients, engine config), not the points/pages
    //     you hot-edit. Entries can't be externalized (they must stay re-importable), so a miss on one is a real error.
    //     Converges fast — each round externalizes its offenders + their downward cold closure; `MAX_ROUNDS` only bounds a
    //     pathological graph.
    const autoExternalized = new Set<string>(importMetaReloc.filter((m) => !entrySet.has(m)))
    let coldSet!: Set<string>
    let built!: ReturnType<typeof buildHot>
    const MAX_ROUNDS = 8
    for (let round = 0; ; round++) {
      coldSet = markColdFrom([...coldRoots, ...autoExternalized])
      built = buildHot(coldSet)
      if (built.misses.length === 0) break
      const offenders = [...new Set(built.misses.map((m) => m.file))].filter(
        (f) => !autoExternalized.has(f) && !entrySet.has(f),
      )
      if (offenders.length === 0 || round >= MAX_ROUNDS) {
        // Every remaining miss is on an aggregator ENTRY (can't be externalized — it must stay re-importable) or we hit
        // the round cap. Name the aggregator explicitly: an entry with an un-flattenable import is a real, actionable bug
        // (usually a non-module relative import dragged into the generated aggregator).
        const entryMiss = built.misses.find((m) => entrySet.has(m.file))
        if (entryMiss) {
          throw new Error(
            `Server hot-reload store: the points aggregator "${nodePath.relative(appSrcDir, entryMiss.file)}" has an ` +
              `import the store cannot flatten ("${entryMiss.spec}") — and an aggregator entry cannot be externalized. ` +
              `Make that import resolvable, or move it behind a \`@point0/core/cold\` file.`,
          )
        }
        const shown = built.misses.map((m) => `${nodePath.relative(appSrcDir, m.file)} -> ${m.spec}`).join(', ')
        throw new Error(
          `Server hot-reload store has ${built.misses.length} unresolved import(s) after ${round} round(s): ${shown}`,
        )
      }
      for (const f of offenders) autoExternalized.add(f)
    }
    const { hashedByAbs, order } = built

    // Invariant: store filenames are injective (each maps to exactly one source). `storeBase` already disambiguates by a
    // relpath hash, so a collision means a relpath-hash clash — assert loudly rather than let the write loop's
    // existsSync-skip silently drop a member's body (the failure mode this guards against).
    const nameToAbs = new Map<string, string>()
    for (const abs of order) {
      const name = hashedByAbs[abs] as string
      const prev = nameToAbs.get(name)
      if (prev !== undefined && prev !== abs) {
        throw new Error(`Server hot-reload store filename collision: "${name}" maps to both "${prev}" and "${abs}".`)
      }
      nameToAbs.set(name, abs)
    }

    // 6. Write the converged build. Content-addressed: the filename IS the content hash, so an existing file with this
    //    name already holds this exact code — skip it. Only changed files (new hash => new name) are written, keeping
    //    unchanged store files' mtimes stable (the child's `bun --watch` never sees a rebuild) and the I/O minimal.
    if (clean) rmSync(storeDir, { recursive: true, force: true })
    mkdirSync(storeDir, { recursive: true })
    for (const abs of order) {
      const code = built.codeByStoreAbs.get(abs) as string
      const storeFilePath = nodePath.join(storeDir, hashedByAbs[abs] as string)
      if (!existsSync(storeFilePath)) {
        // The map derives from the same source, so an existing same-hash file already has its inline map → content-
        // addressing holds. Unmodified files carry no compiler map → a line-identity map still rewrites the store PATH
        // back to the original source for `source-map-support`.
        const map = mapByAbs.get(abs) ?? identitySourceMap(abs, code)
        writeFileSync(storeFilePath, appendInlineSourceMap(code, map))
      }
    }

    const diagnostics: ServerHotStoreBuildResult['diagnostics'] = {
      nodeCount: nodes.size,
      hotCount: order.length,
      coldCount: coldSet.size,
      rewritten: built.rewritten,
      assets: built.assets,
      importMeta,
      autoExternalized: [...autoExternalized],
      gcDeleted: 0,
    }

    // 6a. Invariant: no written store file may match `compiler.filter` (else the child's compiler onLoad plugin would
    //     re-transform an already-compiled file). This is the contract that lets us skip the store dir for free via path
    //     placement + "point0"-free names — assert it so a regression is loud, not silent.
    for (const abs of order) {
      // Test the posix form: `compiler.filter` excludes `node_modules/` with a forward slash, so a native store path
      // (`…\node_modules\.cache\…`) would slip past the exclusion and falsely look compilable on Windows.
      const storeFileAbs = toPosixPath(nodePath.join(storeDir, hashedByAbs[abs] as string))
      if (compiler.filter.test(storeFileAbs)) {
        throw new Error(
          `Server hot-reload store file would be re-compiled by the point0 compiler plugin (matches compiler.filter): ` +
            `${storeFileAbs}. The store dir or hashed names contain "point0" after node_modules/. Pick a dir without it.`,
        )
      }
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

    // GC the dir AFTER the manifest swap (the new files are live, the old ones are now superseded). Reclaims store files
    // no longer referenced by this build that have been stale past the grace window — bounds the dir over a long session.
    const graceMs = Number(process.env.POINT0_DEV_SERVER_HOT_GC_GRACE_MS ?? 30_000)
    diagnostics.gcDeleted = sweepStaleStoreFiles({
      dir: storeDir,
      keep: new Set(order.map((abs) => hashedByAbs[abs] as string)),
      graceMs,
      now: Date.now(),
    })
    return { manifest, hashedByAbs, order, coldExternalized: [...coldSet], diagnostics }
  }
}
