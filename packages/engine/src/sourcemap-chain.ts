import type { EncodedSourceMap } from '@jridgewell/remapping'
import remappingModule from '@jridgewell/remapping'
import { encodeInlineSourceMap, extractInlineSourceMap, INLINE_MAP_TRAILING_RE, toPosixPath } from '@point0/compiler'
import nodeFs from 'node:fs/promises'
import nodePath from 'node:path'

// @jridgewell/remapping ships as a UMD bundle whose ESM default-interop varies by loader; unwrap a possible `.default`.
const remapping = (remappingModule as unknown as { default?: typeof remappingModule }).default ?? remappingModule

/**
 * Collapse ONE Bun-bundle source map through our compiler's embedded `intermediate → original` inline maps. Bun emits
 * `bundle → intermediate` and (per Bun #6173) does NOT chain the inline map an onLoad plugin returned — but that map
 * still rides along in the bundle map's `sourcesContent` (the transformed intermediate text ends with its own `//#
 * sourceMappingURL=data:…`). So we hand each such source's embedded map to @jridgewell/remapping, collapsing the chain
 * to `bundle → original`. Sources are relativized to `mapDir` (drop `file://` + build-machine absolute paths). Returns
 * null when this map carries none of our intermediates (nothing to do — left untouched).
 *
 * Exported for unit testing; the production entry point is {@link chainBundledSourceMaps}.
 */
export function chainSourceMap(bundleMap: EncodedSourceMap, mapDir: string): EncodedSourceMap | null {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const sources = bundleMap.sources ?? []
  const sourcesContent = bundleMap.sourcesContent ?? []
  if (!sourcesContent.some((content) => extractInlineSourceMap(content) !== null)) {
    return null
  }
  const chained = remapping(bundleMap, (sourcefile: string) => {
    const index = sources.indexOf(sourcefile)
    // A source with no embedded map (vendor code / an untransformed file) returns null and stays a leaf.
    return index === -1 ? null : extractInlineSourceMap(sourcesContent[index])
  })
  const out: EncodedSourceMap = JSON.parse(chained.toString())
  return {
    ...out,
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    sources: (out.sources ?? []).map((source) => {
      if (!source) {
        return source
      }
      const abs = source.startsWith('file://') ? new URL(source).pathname : source
      // Source-map `sources` are URL-style (forward slashes); `nodePath.relative` emits `\` on Windows.
      return nodePath.isAbsolute(abs) ? toPosixPath(nodePath.relative(mapDir, abs)) : source
    }),
  }
}

async function findFiles(dir: string, match: (name: string) => boolean): Promise<string[]> {
  const found: string[] = []
  const entries = await nodeFs.readdir(dir, { withFileTypes: true }).catch(() => [])
  for (const entry of entries) {
    const full = nodePath.join(dir, entry.name)
    if (entry.isDirectory()) {
      found.push(...(await findFiles(full, match)))
    } else if (match(entry.name)) {
      found.push(full)
    }
  }
  return found
}

/**
 * Chain every bundled source map under `outdir` (in place) so browser stack traces / error monitoring resolve to the
 * REAL source instead of our transformed intermediate. The client-side counterpart to the server's `source-map-support`
 * install — both work around Bun ignoring the inline maps our compiler emits (Bun #6173): the server hooks
 * `prepareStackTrace` at runtime, here we compose the bundler's emitted maps at build time. Handles BOTH map shapes the
 * bundler can emit (independent of NODE_ENV): external sidecar `*.js.map`, and inline `//# sourceMappingURL=data:…` at
 * the end of a `*.js`. Returns counts.
 */
export async function chainBundledSourceMaps(outdir: string): Promise<{ rewritten: number; total: number }> {
  const files = await findFiles(outdir, (name) => name.endsWith('.js') || name.endsWith('.js.map'))
  const sidecars = new Set(files.filter((file) => file.endsWith('.js.map')))
  let rewritten = 0
  let total = 0

  for (const file of files) {
    const dir = nodePath.dirname(file)
    if (file.endsWith('.js.map')) {
      // external sidecar map
      total++
      const text = await nodeFs.readFile(file, 'utf8').catch(() => '')
      let bundleMap: EncodedSourceMap
      try {
        bundleMap = JSON.parse(text)
      } catch {
        continue
      }
      const out = chainSourceMap(bundleMap, dir)
      if (!out) {
        continue
      }
      await nodeFs.writeFile(file, JSON.stringify(out))
      rewritten++
    } else {
      // *.js — only the inline case; an external build points the `.js` at a `.js.map` URL we already handled above.
      if (sidecars.has(`${file}.map`)) {
        continue
      }
      const code = await nodeFs.readFile(file, 'utf8').catch(() => '')
      const inline = extractInlineSourceMap(code)
      if (!inline) {
        continue
      }
      total++
      const out = chainSourceMap(inline, dir)
      if (!out) {
        continue
      }
      await nodeFs.writeFile(file, code.replace(INLINE_MAP_TRAILING_RE, `${encodeInlineSourceMap(out)}\n`))
      rewritten++
    }
  }
  return { rewritten, total }
}
