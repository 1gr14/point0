import * as nodePath from 'node:path'

/**
 * Per-client preload manifest, written to the client `outdir` at build time and read by the server at serve time.
 *
 * The server, for each page request, injects `<link rel="modulepreload">` for exactly the chunks that page needs (see
 * {@link import('./render.js')}). Two parts:
 *
 * - `entryPreload`: the entry bundle's STATIC import closure (the shared eager set — react/router/schemas/etc.). Same on
 *   every page; preloading it turns the browser's "load entry → parse → discover its imports → load those → …"
 *   waterfall into one parallel fetch straight from the HTML.
 * - `byPoint`: per page POINT (keyed by the point's `name`, which is stable and present on the runtime point at serve
 *   time), that page's own lazy chunk + its layouts' chunks (and their static closures), minus whatever is already in
 *   `entryPreload`. So a hard request to a page preloads that page's JS with the document instead of discovering it
 *   client-side after hydration. (Keyed by name, not route pattern, so concrete vs parameterized URLs don't matter and
 *   we never have to stringify a Route0.)
 *
 * Public paths (leading `/`) so they drop straight into `href`.
 */
export type PreloadManifest = {
  /** The bootstrap entry chunk public path (the `<script type=module>` the HTML already loads), or null if unknown. */
  entry: string | null
  /** The entry's transitive static-import closure (excluding the entry itself). */
  entryPreload: string[]
  /** page point name → extra chunks to preload for that page (page + layouts closures, minus `entryPreload`). */
  byPoint: Record<string, string[]>
}

export const PRELOAD_MANIFEST_BASENAME = '__point0_preload__.json'

/** A bundler-agnostic view of the emitted chunk graph. Keys and import paths are CLIENT PUBLIC paths (e.g.
`/chunk-x.js`). */
export type ChunkGraph = {
  /** Public path of the bootstrap entry chunk, or null if it could not be determined. */
  entryFile: string | null
  chunks: Record<
    string,
    {
      /** `import ... from "..."` — eagerly fetched with the importer. */
      staticImports: string[]
      /** `import("...")` — lazily fetched only when the dynamic import runs. */
      dynamicImports: string[]
      /** Source module that this chunk is the (dynamic) entry of, if any — absolute or cwd-relative source path. */
      entryPoint?: string
      /** Source modules bundled into this chunk — absolute or cwd-relative source paths. */
      inputs: string[]
    }
  >
}

type BunMetafileImport = { path?: string; kind?: string }
type BunMetafileOutput = {
  entryPoint?: string
  inputs?: Record<string, unknown>
  imports?: BunMetafileImport[]
}
type BunMetafile = { outputs?: Record<string, BunMetafileOutput> }

/** Normalize an emitted-output path (`./chunk-x.js`, `dist/client/chunk-x.js`) to a client public path (`/chunk-x.js`). */
const toPublicPath = (outputPath: string, outdir: string): string => {
  let rel = outputPath
  if (nodePath.isAbsolute(rel)) {
    rel = nodePath.relative(outdir, rel)
  } else {
    // Bun metafile keys are cwd-relative and usually start with the outdir (e.g. `dist/client/chunk-x.js`).
    const outdirRel = nodePath.relative(process.cwd(), outdir)
    if (outdirRel && rel.startsWith(`${outdirRel}/`)) {
      rel = rel.slice(outdirRel.length + 1)
    } else if (rel.startsWith('./')) {
      rel = rel.slice(2)
    }
  }
  rel = rel.replaceAll('\\', '/')
  return rel.startsWith('/') ? rel : `/${rel}`
}

/**
 * Build a {@link ChunkGraph} from a Bun.build metafile. Bun marks each output import with `kind` (`import-statement` =
 * static, `dynamic-import` = lazy) and sets `entryPoint` on entry / dynamic-entry chunks.
 *
 * @param indexHtmlKey - the build entrypoint (the index.html), cwd-relative — the entry JS chunk is the one whose
 *   `entryPoint` is that html (Bun attributes the bootstrap module to its html entry).
 */
export function chunkGraphFromBunMetafile({
  metafile,
  outdir,
  indexHtmlKey,
}: {
  metafile: unknown
  outdir: string
  indexHtmlKey: string | null
}): ChunkGraph {
  const mf = toBunMetafileOrNull(metafile)
  const chunks: ChunkGraph['chunks'] = {}
  let entryFile: string | null = null
  if (!mf?.outputs) {
    return { entryFile, chunks }
  }
  for (const [outputPath, output] of Object.entries(mf.outputs)) {
    if (!outputPath.endsWith('.js')) {
      continue
    }
    const publicPath = toPublicPath(outputPath, outdir)
    const staticImports: string[] = []
    const dynamicImports: string[] = []
    for (const im of output.imports ?? []) {
      if (!im.path || !im.path.endsWith('.js')) {
        continue
      }
      const imPublic = toPublicPath(im.path, outdir)
      if (im.kind === 'dynamic-import') {
        dynamicImports.push(imPublic)
      } else if (im.kind === 'import-statement') {
        staticImports.push(imPublic)
      }
    }
    chunks[publicPath] = {
      staticImports,
      dynamicImports,
      entryPoint: output.entryPoint,
      inputs: output.inputs ? Object.keys(output.inputs) : [],
    }
    if (indexHtmlKey && output.entryPoint === indexHtmlKey) {
      entryFile = publicPath
    }
  }
  return { entryFile, chunks }
}

/** A minimal structural view of a Rollup/Rolldown output chunk (what `vite build` returns in `output`). */
export type RollupChunkLike = {
  type?: string
  fileName: string
  isEntry?: boolean
  facadeModuleId?: string | null
  imports?: string[]
  dynamicImports?: string[]
  moduleIds?: string[]
  modules?: Record<string, unknown>
}

/** Build a {@link ChunkGraph} from Rollup/Rolldown output chunks (vite build). Rollup separates `imports` (static) from
`dynamicImports`. */
export function chunkGraphFromRollup({ chunks }: { chunks: RollupChunkLike[] }): ChunkGraph {
  const graphChunks: ChunkGraph['chunks'] = {}
  let entryFile: string | null = null
  for (const chunk of chunks) {
    if (chunk.type && chunk.type !== 'chunk') {
      continue
    }
    if (!chunk.fileName.endsWith('.js')) {
      continue
    }
    const publicPath = chunk.fileName.startsWith('/') ? chunk.fileName : `/${chunk.fileName}`
    graphChunks[publicPath] = {
      staticImports: (chunk.imports ?? []).map((f) => (f.startsWith('/') ? f : `/${f}`)),
      dynamicImports: (chunk.dynamicImports ?? []).map((f) => (f.startsWith('/') ? f : `/${f}`)),
      entryPoint: chunk.facadeModuleId ?? undefined,
      inputs: chunk.moduleIds ?? (chunk.modules ? Object.keys(chunk.modules) : []),
    }
    if (chunk.isEntry) {
      entryFile = publicPath
    }
  }
  return { entryFile, chunks: graphChunks }
}

/** Transitive STATIC-import closure of a chunk (the chunk itself excluded), in deterministic order. */
export function staticClosure(graph: ChunkGraph, start: string): string[] {
  const seen = new Set<string>([start]) // never include the start node itself (even via an import cycle back to it)
  const order: string[] = []
  const visit = (file: string) => {
    const chunk = graph.chunks[file]
    // Record index access is non-undefined in the type but CAN be undefined at runtime (a static import may point at a
    // chunk filtered out of the graph), so this guard is real.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!chunk) {
      return
    }
    for (const dep of chunk.staticImports) {
      if (!seen.has(dep)) {
        seen.add(dep)
        order.push(dep)
        visit(dep)
      }
    }
  }
  visit(start)
  return order
}

/**
 * Find the chunk whose dynamic-entry `entryPoint` (or, failing that, inputs) corresponds to a given source file. Paths
 * are normalized to absolute before comparing: Bun metafile inputs/entryPoints are cwd-relative while Rollup
 * `facadeModuleId`/`moduleIds` and FileResolver results are absolute — `resolve(cwd, …)` makes them comparable.
 */
function findChunkForSourceFile(graph: ChunkGraph, sourceFileVariants: string[]): string | null {
  const abs = (p: string) => nodePath.resolve(process.cwd(), p.replaceAll('\\', '/').split('?', 1)[0]!)
  const wanted = new Set(sourceFileVariants.map(abs))
  // Prefer an exact dynamic-entry match (entryPoint === source file).
  for (const [file, chunk] of Object.entries(graph.chunks)) {
    if (chunk.entryPoint && wanted.has(abs(chunk.entryPoint))) {
      return file
    }
  }
  // Fall back to the chunk that bundled the source file as an input.
  for (const [file, chunk] of Object.entries(graph.chunks)) {
    if (chunk.inputs.some((i) => wanted.has(abs(i)))) {
      return file
    }
  }
  return null
}

/** A page point (by `name`) → the source files (the page module + its layout modules) whose chunks to preload for it. */
export type PagePreloadSources = { name: string; sourceFiles: string[] }

/**
 * Assemble the {@link PreloadManifest} from a normalized chunk graph and the per-page source files. `byPoint` only
 * carries chunks NOT already in `entryPreload` (no point preloading the same chunk twice).
 */
export function buildPreloadManifest({
  graph,
  pages = [],
}: {
  graph: ChunkGraph
  pages?: PagePreloadSources[]
}): PreloadManifest {
  const entry = graph.entryFile
  const entryPreload = entry ? staticClosure(graph, entry) : []
  const entrySet = new Set([entry, ...entryPreload].filter((x): x is string => !!x))

  const byPoint: Record<string, string[]> = {}
  for (const page of pages) {
    const chunkFiles = new Set<string>()
    for (const sourceFile of page.sourceFiles) {
      const chunk = findChunkForSourceFile(graph, [sourceFile])
      if (!chunk) {
        continue
      }
      if (!entrySet.has(chunk)) {
        chunkFiles.add(chunk)
      }
      for (const dep of staticClosure(graph, chunk)) {
        if (!entrySet.has(dep)) {
          chunkFiles.add(dep)
        }
      }
    }
    if (chunkFiles.size > 0) {
      byPoint[page.name] = [...chunkFiles]
    }
  }

  return { entry, entryPreload, byPoint }
}

/** The chunks to preload for a given page point: the entry's shared closure plus that page's extras (deduped, entry
excluded). */
export function resolvePreloadsForPoint(manifest: PreloadManifest, pointName: string | undefined): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  const push = (file: string) => {
    if (file !== manifest.entry && !seen.has(file)) {
      seen.add(file)
      out.push(file)
    }
  }
  for (const f of manifest.entryPreload) {
    push(f)
  }
  const extras = pointName ? manifest.byPoint[pointName] : undefined
  if (extras) {
    for (const f of extras) {
      push(f)
    }
  }
  return out
}

/** Render `<link rel="modulepreload">` tags for a list of chunk public paths. `crossorigin` matches the module script. */
export function renderModulePreloadLinks(files: string[]): string {
  return files.map((href) => `<link rel="modulepreload" crossorigin href="${href}">`).join('')
}

/** One point entry parsed out of a points-aggregator module (the `points` source the engine actually imports). */
export type ParsedAggregatorPoint = {
  type: string
  name: string
  /** Layout point names this point composes (from its `layouts: [...]`). */
  layoutNames: string[]
  /** The lazy `import('…')` specifier of the point's module, or undefined for a statically-imported point. */
  importSpec: string | undefined
}

/**
 * Best-effort parse of a points-aggregator module's text into per-point `{ type, name, layoutNames, importSpec }`.
 *
 * Targets the canonical generated lazy aggregator (`{ type, name, route, layouts, point: () => import('…') }`). Each
 * entry's body is bounded to the span up to the NEXT `type: '…', name: '…'` so a statically-imported point (no
 * `import('…')` in its body) yields `importSpec: undefined` instead of grabbing a neighbour's import — i.e. non-lazy
 * points degrade to "no per-point preload" rather than mis-mapping. A hand-written aggregator that doesn't match this
 * shape simply yields fewer/no entries (the feature falls back to the entry closure only). Consistent with how
 * {@link import('./server-hot-store.js').resolvePointsAggregatorAbs} parses the importer body by regex.
 */
export function parseAggregatorPoints(content: string): ParsedAggregatorPoint[] {
  const entryRe = /type:\s*'(\w+)'\s*,\s*name:\s*'([^']+)'\s*,([\s\S]*?)(?=type:\s*'\w+'\s*,\s*name:|$)/g
  const layoutsRe = /layouts:\s*\[([^\]]*)\]/
  const importRe = /import\(\s*['"]([^'"]+)['"]\s*\)/
  const out: ParsedAggregatorPoint[] = []
  for (const match of content.matchAll(entryRe)) {
    const [, type, name, body = ''] = match
    if (!type || !name) {
      continue
    }
    const layoutsRaw = layoutsRe.exec(body)?.[1] ?? ''
    const layoutNames = [...layoutsRaw.matchAll(/'([^']+)'/g)].map((m) => m[1]!).filter(Boolean)
    const importSpec = importRe.exec(body)?.[1]
    out.push({ type, name, layoutNames, importSpec })
  }
  return out
}

function toBunMetafileOrNull(value: unknown): BunMetafile | null {
  if (!value) {
    return null
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as BunMetafile
    } catch {
      return null
    }
  }
  if (typeof value === 'object') {
    return value as BunMetafile
  }
  return null
}
