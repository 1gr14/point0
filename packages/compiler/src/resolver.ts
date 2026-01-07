import * as nodeFs from 'node:fs/promises'
import * as nodeFsPath from 'node:path'

export class FileResolver {
  // Cache for TypeScript compiler options per directory
  // Value can be: ParsedCommandLine, null (no tsconfig found), or undefined (not checked yet)
  private static readonly tsConfigCache = new Map<string, any>()

  // Lazy-loaded TypeScript module (null if not available)
  private static tsModule: typeof import('typescript') | null | undefined = undefined

  /**
   * Lazy-loads TypeScript module if available.
   * Returns null if TypeScript is not installed.
   */
  private static async getTypeScriptModule(): Promise<typeof import('typescript') | null> {
    if (this.tsModule !== undefined) {
      return this.tsModule
    }
    try {
      this.tsModule = await import('typescript')
      return this.tsModule
    } catch {
      this.tsModule = null
      return null
    }
  }

  /**
   * Loads and caches TypeScript compiler options for a given directory.
   * Searches up the directory tree to find the nearest tsconfig.json.
   * Returns null if TypeScript is not available or no tsconfig is found.
   */
  private static async getTsConfigForDirectory({ dir }: { dir: string }): Promise<{ options: any } | null> {
    // Check cache first
    if (FileResolver.tsConfigCache.has(dir)) {
      return FileResolver.tsConfigCache.get(dir) ?? null
    }

    // Check if TypeScript is available
    const ts = await FileResolver.getTypeScriptModule()
    if (!ts) {
      // Cache null for all directories to avoid repeated checks
      FileResolver.tsConfigCache.set(dir, null)
      return null
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
            // Cache null to avoid re-reading
            FileResolver.tsConfigCache.set(dir, null)
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

    // No tsconfig found, cache null
    this.tsConfigCache.set(dir, null)
    return null
  }

  /**
   * Resolves an import path using TypeScript's module resolution.
   * This handles TypeScript path aliases (paths in tsconfig.json) and relative paths.
   * TypeScript's resolver can handle:
   * - Path aliases (e.g., @/lib/client)
   * - Relative paths with extension resolution
   * - Index file resolution (e.g., ./dir -> ./dir/index.ts)
   * Returns undefined if TypeScript is not available or resolution fails.
   */
  private static async resolveTsImport({
    importPath,
    containingFile,
  }: {
    importPath: string
    containingFile: string
  }): Promise<string | undefined> {
    // Skip absolute paths - they don't need TypeScript resolution
    if (nodeFsPath.isAbsolute(importPath)) {
      return undefined
    }

    // Check if TypeScript is available
    const ts = await FileResolver.getTypeScriptModule()
    if (!ts) {
      return undefined
    }

    const containingDir = nodeFsPath.dirname(containingFile)
    const tsConfig = await FileResolver.getTsConfigForDirectory({ dir: containingDir })
    if (!tsConfig) {
      return undefined
    }

    try {
      const result = ts.resolveModuleName(importPath, containingFile, tsConfig.options, ts.sys)
      return result.resolvedModule?.resolvedFileName
    } catch {
      return undefined
    }
  }

  /**
   * Detects the actual file path for an import path.
   * First tries TypeScript resolution (for path aliases and relative paths),
   * then falls back to relative path resolution with extension guessing.
   */
  static async detectExistingFilePathByImportPath({
    importPath,
    containingFile,
  }: {
    importPath: string
    containingFile?: string
  }): Promise<string | undefined> {
    // If we have a containing file, try TypeScript resolution first
    // This handles both path aliases (like @/lib/client) and relative paths
    if (containingFile) {
      const tsResolved = await FileResolver.resolveTsImport({ importPath, containingFile })
      if (tsResolved) {
        try {
          await nodeFs.access(tsResolved)
          return tsResolved
        } catch {
          // File doesn't exist, continue to fallback
        }
      }
    }

    // Fallback: try relative path resolution with extension guessing
    // For relative paths, resolve relative to containing file
    const basePath = containingFile && importPath.startsWith('.') ? nodeFsPath.dirname(containingFile) : undefined

    const exts = ['.ts', '.tsx', '.js', '.mjs', '.cjs']
    const currentExt = nodeFsPath.extname(importPath)
    const importPathWithoutExt = importPath.replace(currentExt, '')

    for (const ext of exts) {
      const candidatePath = importPathWithoutExt + ext
      const abs = basePath ? nodeFsPath.resolve(basePath, candidatePath) : candidatePath
      try {
        await nodeFs.access(abs)
        return abs
      } catch {
        // File doesn't exist, try next extension
      }
    }
    return undefined
  }
}
