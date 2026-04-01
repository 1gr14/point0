import * as nodeFs from 'node:fs'
import * as nodeFsPath from 'node:path'
import * as ts from 'typescript'

export class FileResolver {
  // Cache for TypeScript compiler options per directory
  // Value can be: ParsedCommandLine, null (no tsconfig found), or undefined (not checked yet)
  private static readonly tsConfigCache = new Map<string, ts.ParsedCommandLine | null>()

  /**
   * Clears the TypeScript config cache.
   * Useful for testing or when tsconfig files are modified.
   */
  static clearCache(): void {
    FileResolver.tsConfigCache.clear()
  }

  /**
   * Loads and caches TypeScript compiler options for a given directory.
   * Searches up the directory tree to find the nearest tsconfig.json.
   * Returns null if TypeScript is not available or no tsconfig is found.
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
   * Resolves an import path using TypeScript's module resolution.
   * This handles TypeScript path aliases (paths in tsconfig.json) and relative paths.
   * TypeScript's resolver can handle:
   * - Path aliases (e.g., @/lib/client)
   * - Relative paths with extension resolution
   * - Index file resolution (e.g., ./dir -> ./dir/index.ts)
   * Returns undefined if TypeScript is not available or resolution fails.
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

  // /**
  //  * Detects the actual file path for an import path.
  //  * First tries TypeScript resolution (for path aliases and relative paths),
  //  * then falls back to relative path resolution with extension guessing.
  //  */
  // static detectExistingFilePathByImportPath({
  //   importPath,
  //   containingFile,
  // }: {
  //   importPath: string
  //   containingFile?: string
  // }): string | undefined {
  //   // Skip absolute paths if we don't have a containing file
  //   // Absolute paths need TypeScript resolution which requires containingFile
  //   if (nodeFsPath.isAbsolute(importPath) && !containingFile) {
  //     return undefined
  //   }

  //   // If we have a containing file, try TypeScript resolution first
  //   // This handles both path aliases (like @/lib/client) and relative paths
  //   if (containingFile) {
  //     const tsResolved = FileResolver.resolveTsImport({ importPath, containingFile })
  //     if (tsResolved) {
  //       // Check if the resolved file exists
  //       if (nodeFs.existsSync(tsResolved)) {
  //         return tsResolved
  //       }

  //       // File doesn't exist at the exact path, try adding extensions if path has no extension
  //       const ext = nodeFsPath.extname(tsResolved)
  //       if (!ext) {
  //         const exts = ['.ts', '.tsx', '.js', '.mjs', '.cjs', '.d.ts']
  //         for (const tryExt of exts) {
  //           const candidate = tsResolved + tryExt
  //           if (nodeFs.existsSync(candidate)) {
  //             return candidate
  //           }
  //         }
  //       }

  //       // If it's a path alias (not starting with .), return the resolved path even if file doesn't exist
  //       // TypeScript might resolve to a .d.ts file or the file might be created later
  //       if (!importPath.startsWith('.')) {
  //         return tsResolved
  //       }
  //       // For relative paths, continue to fallback
  //     }
  //   }

  //   // Fallback: try relative path resolution with extension guessing
  //   // Only works for relative paths (starting with .) when we have a containing file
  //   if (!importPath.startsWith('.') || !containingFile) {
  //     return undefined
  //   }

  //   const basePath = nodeFsPath.dirname(containingFile)
  //   const exts = ['.ts', '.tsx', '.js', '.mjs', '.cjs']
  //   const currentExt = nodeFsPath.extname(importPath)
  //   const importPathWithoutExt = importPath.replace(currentExt, '')

  //   for (const ext of exts) {
  //     const candidatePath = importPathWithoutExt + ext
  //     const abs = nodeFsPath.resolve(basePath, candidatePath)
  //     try {
  //       nodeFs.accessSync(abs)
  //       return abs
  //     } catch {
  //       // File doesn't exist, try next extension
  //     }
  //   }
  //   return undefined
  // }

  /**
   * Detects the actual file path for an import path.
   * First tries TypeScript resolution (for path aliases and relative paths),
   * then falls back to relative path resolution with extension guessing.
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

    if (path.startsWith('.')) {
      const importerDir = nodeFsPath.dirname(importer)
      if (existsing) {
        const allExts = ['.ts', '.tsx', '.js', '.mjs', '.cjs']
        const currentExt = nodeFsPath.extname(path)
        const exts = [currentExt, ...allExts.filter((ext) => currentExt !== ext)]
        const importPathWithoutExt = path.replace(currentExt, '')

        for (const ext of exts) {
          const candidatePath = importPathWithoutExt + ext
          const abs = nodeFsPath.resolve(importerDir, candidatePath)
          if (nodeFs.existsSync(abs)) {
            return abs
          }
        }
      } else {
        return nodeFsPath.resolve(importerDir, path)
      }
    }

    return undefined
  }
}
