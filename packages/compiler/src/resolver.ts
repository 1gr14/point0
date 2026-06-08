import * as nodeFs from 'node:fs'
import * as nodeFsPath from 'node:path'
import * as ts from 'typescript'

export class FileResolver {
  // Cache for TypeScript compiler options per directory
  // Value can be: ParsedCommandLine, null (no tsconfig found), or undefined (not checked yet)
  private static readonly tsConfigCache = new Map<string, ts.ParsedCommandLine | null>()

  /**
   * Clears the TypeScript config cache. Useful for testing or when tsconfig files are modified.
   */
  static clearCache(): void {
    FileResolver.tsConfigCache.clear()
  }

  /**
   * Loads and caches TypeScript compiler options for a given directory. Searches up the directory tree to find the
   * nearest tsconfig.json. Returns null if TypeScript is not available or no tsconfig is found.
   */
  private static getTsConfigForDirectory({ dir }: { dir: string }): ts.ParsedCommandLine | null {
    // Check cache first
    if (FileResolver.tsConfigCache.has(dir)) {
      return FileResolver.tsConfigCache.get(dir) ?? null
    }

    // Find the nearest tsconfig.json by walking up the directory tree
    let currentDir = nodeFsPath.resolve(dir)
    const root = nodeFsPath.parse(currentDir).root

    while (currentDir !== root) {
      const tsConfigPath = nodeFsPath.join(currentDir, 'tsconfig.json')
      try {
        // Use synchronous read for caching (ts.sys.readFile is synchronous)
        const configFileText = ts.sys.readFile(tsConfigPath)
        if (configFileText) {
          const configFile = ts.readConfigFile(tsConfigPath, ts.sys.readFile.bind(ts.sys))
          if (configFile.error) {
            // Don't cache errors - allow retry in case tsconfig is created later
            return null
          }

          const parsedConfig = ts.parseJsonConfigFileContent(
            configFile.config,
            ts.sys,
            currentDir,
            undefined,
            tsConfigPath,
          )

          // Cache for this directory and all parent directories we checked
          let cacheDir = dir
          while (cacheDir !== currentDir && cacheDir !== root) {
            FileResolver.tsConfigCache.set(cacheDir, parsedConfig)
            cacheDir = nodeFsPath.dirname(cacheDir)
          }
          FileResolver.tsConfigCache.set(currentDir, parsedConfig)
          FileResolver.tsConfigCache.set(dir, parsedConfig)

          return parsedConfig
        }
      } catch {
        // File doesn't exist, continue searching up
      }

      const parentDir = nodeFsPath.dirname(currentDir)
      if (parentDir === currentDir) break
      currentDir = parentDir
    }

    // No tsconfig found - don't cache null to allow retry
    return null
  }

  /**
   * Resolves an import path using TypeScript's module resolution. This handles TypeScript path aliases (paths in
   * tsconfig.json) and relative paths. TypeScript's resolver can handle:
   *
   * - Path aliases (e.g., @/lib/client)
   * - Relative paths with extension resolution
   * - Index file resolution (e.g., ./dir -> ./dir/index.ts) Returns undefined if TypeScript is not available or
   *   resolution fails.
   */
  private static resolveTsImport({ importer, path }: { importer: string; path: string }): string | undefined {
    // we already check for importer absolute paths in the caller
    const containingDir = nodeFsPath.dirname(importer)
    const tsConfig = FileResolver.getTsConfigForDirectory({ dir: containingDir })
    if (!tsConfig) {
      return undefined
    }

    try {
      const result = ts.resolveModuleName(path, importer, tsConfig.options, ts.sys)
      const resolvedFileName = result.resolvedModule?.resolvedFileName
      // TypeScript's resolver might return a path even if the file doesn't exist yet
      // (e.g., for .d.ts files or when resolving path aliases)
      return resolvedFileName || undefined
    } catch {
      // Silently fail - TypeScript resolution might not work in all cases
      return undefined
    }
  }

  /**
   * Detects the actual file path for an import path. First tries TypeScript resolution (for path aliases and relative
   * paths), then falls back to relative path resolution with extension guessing.
   */
  static resolveFilePath({
    path,
    importer,
    ts = true,
    existsing = true,
  }: {
    importer?: string
    path?: string
    ts?: boolean
    existsing?: boolean
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

    // If we have a containing file, try TypeScript resolution first
    // This handles both path aliases (like @/lib/client) and relative paths
    if (ts) {
      const tsResolved = FileResolver.resolveTsImport({ importer, path })
      if (tsResolved) {
        // Check if the resolved file exists
        if (!existsing || nodeFs.existsSync(tsResolved)) {
          return tsResolved
        }
      }
    }

    // Build candidate base paths, then probe them. A relative specifier resolves against the importer's directory; a
    // non-relative one expands via the importer's tsconfig `paths` aliases — so non-module specifiers like
    // `@/assets/gem.png` resolve too (the `ts.resolveModuleName` step above won't resolve them, since assets aren't TS
    // modules). Bare npm specifiers (no relative prefix, no alias match) yield no candidates → undefined, left as-is.
    const importerDir = nodeFsPath.dirname(importer)
    const baseCandidates = path.startsWith('.')
      ? [nodeFsPath.resolve(importerDir, path)]
      : FileResolver.resolveTsConfigPathAliases({ importer, path })

    for (const candidate of baseCandidates) {
      if (!existsing) {
        return candidate
      }
      const allExts = ['.ts', '.tsx', '.js', '.mjs', '.cjs']
      const currentExt = nodeFsPath.extname(candidate)
      const exts = [currentExt, ...allExts.filter((ext) => currentExt !== ext)]
      const candidateWithoutExt = currentExt ? candidate.slice(0, -currentExt.length) : candidate
      for (const ext of exts) {
        const withExt = candidateWithoutExt + ext
        if (nodeFs.existsSync(withExt)) {
          return withExt
        }
      }
    }

    return undefined
  }

  /**
   * Expand a non-relative import specifier through the importer's tsconfig `paths` aliases (e.g. `@/assets/gem.png` ->
   * `<src>/assets/gem.png`), returning the candidate absolute paths in declaration order. Unlike
   * `ts.resolveModuleName`, this resolves ANY specifier the alias matches — including non-module files (assets) —
   * because it only performs the path substitution, leaving extension/existence probing to the caller. Returns [] when
   * there's no tsconfig, no `paths`, or no pattern matches. `paths` are resolved against `baseUrl`, or (when `paths` is
   * used without `baseUrl`) against the directory of the tsconfig that declared them.
   */
  private static resolveTsConfigPathAliases({ importer, path }: { importer: string; path: string }): string[] {
    const tsConfig = FileResolver.getTsConfigForDirectory({ dir: nodeFsPath.dirname(importer) })
    const paths = tsConfig?.options.paths
    if (!tsConfig || !paths) {
      return []
    }
    // `pathsBasePath` (TS's resolved base for `paths` without `baseUrl`) and `configFilePath` are not declared on the
    // public `CompilerOptions`, so read them through a narrow cast rather than the broad index signature.
    const internalOptions = tsConfig.options as { pathsBasePath?: string; configFilePath?: string }
    const base =
      tsConfig.options.baseUrl ??
      internalOptions.pathsBasePath ??
      (internalOptions.configFilePath ? nodeFsPath.dirname(internalOptions.configFilePath) : undefined)
    if (!base) {
      return []
    }
    const candidates: string[] = []
    for (const [pattern, targets] of Object.entries(paths)) {
      const starIndex = pattern.indexOf('*')
      if (starIndex === -1) {
        if (pattern === path) {
          for (const target of targets) candidates.push(nodeFsPath.resolve(base, target))
        }
        continue
      }
      const prefix = pattern.slice(0, starIndex)
      const suffix = pattern.slice(starIndex + 1)
      if (path.length >= prefix.length + suffix.length && path.startsWith(prefix) && path.endsWith(suffix)) {
        const matched = path.slice(prefix.length, path.length - suffix.length)
        for (const target of targets) candidates.push(nodeFsPath.resolve(base, target.replace('*', matched)))
      }
    }
    return candidates
  }
}
