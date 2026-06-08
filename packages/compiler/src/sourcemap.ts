import type { EncodedSourceMap } from '@jridgewell/remapping'

/**
 * Source-map plumbing that works around Bun ignoring the inline maps we emit (Bun #6173). One module, two concerns:
 *
 * 1. The inline-map WIRE FORMAT — the single `//# sourceMappingURL=data:…base64` encoder/decoder. Defined here ONCE so it
 *    can't drift across the producers/consumers that must agree byte-for-byte: the compiler's bun onLoad plugin, the
 *    engine's hot store (`server-hot-store.ts`), and the engine's build-time chainer (`sourcemap-chain.ts`).
 * 2. The dev onLoad REGISTRY — a process-global map of `compiled module → its source map`, for the case where the map
 *    lives only in memory (the on-disk file is the untransformed original).
 *
 * Why both exist: under Bun a thrown error's `.stack` points at the COMPILED file, not the original. Bun won't apply
 * our maps to runtime stacks, so the engine installs `source-map-support` (it remaps via `Error.prepareStackTrace`).
 * SMS gets each module's map two ways — the hot store appends it inline on disk (SMS reads the file), while onLoad
 * stashes it in this registry (SMS reads it back via {@link lookupDevSourceMap}). The build-time chainer reuses the same
 * format.
 */

const INLINE_MAP_PREFIX = '//# sourceMappingURL=data:application/json;charset=utf-8;base64,'

/** Matches the (last) trailing inline-map comment, so a chained one can be spliced in its place. */
export const INLINE_MAP_TRAILING_RE = /\/\/# sourceMappingURL=data:application\/json[^\n]*\s*$/

/**
 * Encode a source map as an inline `//# sourceMappingURL=data:…base64` comment (no surrounding newlines). Accepts a map
 * object or a pre-serialized JSON string.
 */
export function encodeInlineSourceMap(map: unknown): string {
  const json = typeof map === 'string' ? map : JSON.stringify(map)
  return `${INLINE_MAP_PREFIX}${Buffer.from(json, 'utf8').toString('base64')}`
}

/**
 * Append an inline source map comment to `code` (a falsy map leaves `code` untouched). Read by `source-map-support`
 * (NOT by Bun) to remap compiled-file stack frames back to the original source.
 */
export function appendInlineSourceMap(code: string, map: unknown): string {
  if (!map) {
    return code
  }
  return `${code}\n${encodeInlineSourceMap(map)}\n`
}

/** Extract the LAST inline `//# sourceMappingURL=data:…base64` map embedded in a file's text, or null. */
export function extractInlineSourceMap(content: string | null | undefined): EncodedSourceMap | null {
  if (!content) {
    return null
  }
  const at = content.lastIndexOf('sourceMappingURL=data:application/json')
  if (at === -1) {
    return null
  }
  const match = content.slice(at).match(/base64,([A-Za-z0-9+/=]+)/)
  if (!match) {
    return null
  }
  try {
    return JSON.parse(Buffer.from(match[1], 'base64').toString('utf8'))
  } catch {
    return null
  }
}

type DevSourceMapRegistry = { set: (file: string, map: string) => void; get: (source: string) => string | undefined }

/**
 * Normalize a module path/URL to the key form used by both `set` (filepath) and `get` (stack-frame source): strip a
 * `?query` suffix and resolve a `file://` URL to its pathname, so the producer and consumer agree on the key.
 */
function normSourceKey(p: string): string {
  let s = p.split('?', 1)[0] ?? p
  if (s.startsWith('file://')) {
    try {
      s = new URL(s).pathname
    } catch {
      /* keep raw */
    }
  }
  return s
}

/**
 * The process-global onLoad source-map registry (a singleton on `globalThis`, shared across bundled copies of this
 * module). The plugin writes maps here; {@link lookupDevSourceMap} reads them.
 */
export function getDevSourceMapRegistry(): DevSourceMapRegistry {
  const holder = globalThis as unknown as { __POINT0_DEV_SOURCEMAPS__?: DevSourceMapRegistry }
  if (!holder.__POINT0_DEV_SOURCEMAPS__) {
    const map = new Map<string, string>()
    holder.__POINT0_DEV_SOURCEMAPS__ = {
      set: (file, m) => map.set(normSourceKey(file), m),
      get: (source) => map.get(normSourceKey(source)),
    }
  }
  return holder.__POINT0_DEV_SOURCEMAPS__
}

/**
 * Look up the onLoad source map for a stack-frame source (the read side of {@link getDevSourceMapRegistry}). Returns the
 * serialized map string, or undefined if this source has no in-memory map (e.g. a hot-store file, whose map is inline
 * on disk instead).
 */
export function lookupDevSourceMap(source: string): string | undefined {
  return getDevSourceMapRegistry().get(source)
}
