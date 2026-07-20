import * as nodeFs from 'node:fs'
import * as nodeFsPath from 'node:path'
import { createPathsMatcher, getTsconfig, type TsConfigResult } from 'get-tsconfig'
import { toPosixPath } from './utils.js'

/** Maps a non-relative specifier to the absolute, extension-less targets its `paths` alias expands to. */
type PathsMatcher = (specifier: string) => string[]

/**
 * Extensions appended to a specifier that names no file on its own. TS-first, so `./x` prefers `x.ts` over a stale
 * sibling `x.js`; `.mts`/`.cts`/`.jsx` are here because a specifier may legitimately point at them and nothing else
 * resolves modules for us.
 */
const CANDIDATE_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs']

/**
 * An ESM specifier names the file that will EXIST at runtime, so TypeScript sources are imported by their output name
 * (`./x.js` for `x.ts`). Mapped back the way TypeScript maps them, and tried before the literal path: when a built
 * `x.js` sits next to its `x.ts`, both Bun and Vite compile the source, and the walker must read the same file.
 */
const SOURCE_EXTENSIONS_BY_OUTPUT: Record<string, string[] | undefined> = {
  '.js': ['.ts', '.tsx'],
  '.jsx': ['.tsx'],
  '.mjs': ['.mts'],
  '.cjs': ['.cts'],
}

export class FileResolver {
  /**
   * Directory → `paths` matcher, or null when the directory has no tsconfig above it (or one without `paths`). Mirrors
   * the shape of the old per-directory tsconfig cache: the walk up the tree is the expensive part, and the walker hits
   * this for every import of every file.
   */
  private static readonly pathsMatcherCache = new Map<string, PathsMatcher | null>()

  /** `get-tsconfig`'s own read/parse cache, keyed by path — shared across lookups, cleared alongside ours. */
  private static tsConfigCache = new Map<string, TsConfigResult | undefined | null>()

  /**
   * Clears the resolver caches. Useful for testing or when tsconfig files are modified.
   */
  static clearCache(): void {
    FileResolver.pathsMatcherCache.clear()
    FileResolver.tsConfigCache = new Map()
  }

  /**
   * Builds (and caches) the tsconfig `paths` matcher that applies to a directory. `get-tsconfig` owns the walk up the
   * tree, `extends` chains (including `extends` from an npm package), JSONC, `${configDir}`, and the `baseUrl`-less
   * case where `paths` resolve against the directory of the tsconfig that declared them.
   *
   * Returns null when there is no tsconfig above `dir`, or it declares no `paths` — both mean "nothing to expand", not
   * an error: relative specifiers still resolve, and bare npm specifiers are meant to be left alone.
   */
  private static getPathsMatcher({ dir }: { dir: string }): PathsMatcher | null {
    const cached = FileResolver.pathsMatcherCache.get(dir)
    if (cached !== undefined) {
      return cached
    }
    let matcher: PathsMatcher | null = null
    try {
      const tsConfig = getTsconfig(dir, 'tsconfig.json', FileResolver.tsConfigCache)
      matcher = tsConfig ? createPathsMatcher(tsConfig) : null
    } catch {
      // A malformed tsconfig must not take the whole compile down — resolution degrades to relative-only, and the
      // real diagnostic comes from the caller failing to resolve the specifier.
      matcher = null
    }
    FileResolver.pathsMatcherCache.set(dir, matcher)
    return matcher
  }

  /**
   * Detects the actual file path for an import path: expands tsconfig `paths` aliases, then probes the filesystem for
   * the file the specifier means (extension guessing and `directory` → `directory/index.*`).
   *
   * point0 deliberately resolves this itself instead of asking the user's TypeScript: TypeScript 7 ships no JS compiler
   * API, so any such dependency would make the compiler hostage to the TypeScript version in the user's project. We
   * only ever need to find first-party source files, which is a far smaller job than real module resolution — bare npm
   * specifiers match no alias, resolve to nothing, and are left untouched on purpose.
   *
   * The result is posix-normalized so resolved identifiers match on every OS.
   */
  static resolveFilePath(args: { importer?: string; path?: string; existing?: boolean }): string | undefined {
    const resolved = FileResolver.resolveFilePathRaw(args)
    return resolved === undefined ? undefined : toPosixPath(resolved)
  }

  private static resolveFilePathRaw({
    path,
    importer,
    existing = true,
  }: {
    importer?: string
    path?: string
    existing?: boolean
  }): string | undefined {
    if (!path) {
      return undefined
    }
    if (nodeFsPath.isAbsolute(path)) {
      return path
    }
    if (!importer) {
      return undefined
    }
    if (!nodeFsPath.isAbsolute(importer)) {
      return undefined
    }

    // A relative specifier resolves against the importer's directory; a non-relative one expands through the
    // importer's tsconfig `paths` aliases — so non-module specifiers like `@/assets/gem.png` resolve too. Bare npm
    // specifiers (no relative prefix, no alias match) yield no candidates → undefined, left as-is.
    const importerDir = nodeFsPath.dirname(importer)
    const candidates = path.startsWith('.')
      ? [nodeFsPath.resolve(importerDir, path)]
      : (FileResolver.getPathsMatcher({ dir: importerDir })?.(path) ?? [])

    for (const candidate of candidates) {
      const probed = FileResolver.probeCandidate({ candidate })
      if (probed) {
        return probed
      }
    }

    // `existing: false` asks for the intended path of something that need not exist yet (a generated asset, a file the
    // watcher is about to see). Nothing on disk matched, so hand back the first candidate as-is.
    return existing ? undefined : candidates[0]
  }

  /**
   * Probes one absolute candidate path for the file it stands for, returning the first hit:
   *
   * 1. The TypeScript source behind an ESM output name — `./x.js` → `x.ts`. Before the literal path, so a built `x.js`
   *    lying next to `x.ts` never wins over the source the bundler will actually compile.
   * 2. The candidate itself, when it is a file — a specifier that already names a real file, assets included.
   * 3. The candidate with an extension APPENDED. This covers the extension-less `./x`, and equally `./points.server`,
   *    where `.server` only looks like an extension — hence append rather than replace: replacing would strip a piece
   *    of the filename and go looking for `points.ts`, which is either missing or, worse, a different module.
   * 4. `candidate/index.<ext>` — a directory specifier.
   *
   * The file check is `isFile()`, not `existsSync`: a directory named `./points` exists, and treating it as the
   * resolved module would hand the walker a path it cannot parse instead of `points/index.ts`.
   */
  private static probeCandidate({ candidate }: { candidate: string }): string | undefined {
    const currentExt = nodeFsPath.extname(candidate)

    const sourceExtensions = SOURCE_EXTENSIONS_BY_OUTPUT[currentExt]
    if (sourceExtensions) {
      const candidateWithoutExt = candidate.slice(0, -currentExt.length)
      for (const ext of sourceExtensions) {
        const withExt = candidateWithoutExt + ext
        if (FileResolver.isFile(withExt)) {
          return withExt
        }
      }
    }

    if (FileResolver.isFile(candidate)) {
      return candidate
    }

    for (const ext of CANDIDATE_EXTENSIONS) {
      const withExt = candidate + ext
      if (FileResolver.isFile(withExt)) {
        return withExt
      }
    }

    if (FileResolver.isDirectory(candidate)) {
      for (const ext of CANDIDATE_EXTENSIONS) {
        const indexFile = nodeFsPath.join(candidate, `index${ext}`)
        if (FileResolver.isFile(indexFile)) {
          return indexFile
        }
      }
    }

    return undefined
  }

  private static isFile(path: string): boolean {
    try {
      return nodeFs.statSync(path).isFile()
    } catch {
      return false
    }
  }

  private static isDirectory(path: string): boolean {
    try {
      return nodeFs.statSync(path).isDirectory()
    } catch {
      return false
    }
  }
}
