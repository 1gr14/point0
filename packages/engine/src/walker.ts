import babel from '@babel/parser'
import type traverseType from '@babel/traverse'
import type { NodePath } from '@babel/traverse'
import traverseModule from '@babel/traverse'
import type { File, Node } from '@babel/types'
import type { AnyRoute, RoutesPretty } from '@devp0nt/route0'
import type { EndPointType, PointName, PointsScope } from '@point0/core'
import * as nodeFs from 'node:fs/promises'
import * as nodePath from 'node:path'

const traverse = ((traverseModule as any).default ?? traverseModule) as typeof traverseType extends { default: infer T }
  ? T
  : typeof traverseType

export class Walker {
  readonly cwd: string

  // <scope, Routes>
  readonly routes: Record<string, RoutesPretty>

  constructor(options: { cwd?: string; routes?: Record<string, RoutesPretty> } = {}) {
    this.cwd = options.cwd ?? process.cwd()
    this.routes = options.routes ?? {}
  }

  // Parse points from files

  async readAndParsePointsFromFile(fileAbs: string): Promise<{ parsedPoints: ParsedPoint[]; errors: unknown[] }> {
    const file = await WalkerFile.create(fileAbs).read()
    return this.parsePointsFromFile({ file })
  }

  private parsePointsFromFile({ file }: { file: WalkerFile<'read' | 'parsed'> }): {
    parsedPoints: ParsedPoint[]
    errors: unknown[]
  } {
    const parsedPoints: ParsedPoint[] = []
    const errors: unknown[] = []

    if (!file.mayContainPoints()) {
      return { parsedPoints, errors }
    }
    const fileParsed = file.parse()

    traverse(fileParsed.ast, {
      CallExpression: (p) => {
        const callee = p.node.callee
        if (callee.type !== 'MemberExpression') return
        if (callee.property.type !== 'Identifier') return
        if (callee.property.name !== 'lets') return

        const result = this.parsePointByLetsNodePath({ letsNodePath: p, file: fileParsed })
        errors.push(...result.errors)
        if (result.parsedPoint) {
          parsedPoints.push(result.parsedPoint)
        }
      },
    })

    return { parsedPoints, errors }
  }

  private parsePointByLetsNodePath({
    letsNodePath,
    file,
  }: {
    letsNodePath: NodePath<Node>
    file: WalkerFile<'parsed'>
  }): {
    parsedPoint: ParsedPoint | undefined
    errors: unknown[]
  } {
    const errors: unknown[] = []

    const letsNode = letsNodePath.node
    if (letsNode.type !== 'CallExpression') return { parsedPoint: undefined, errors }
    if (letsNode.callee.type !== 'MemberExpression') return { parsedPoint: undefined, errors }

    // --- base ---
    const baseNodePath = letsNodePath.get('callee').get('object')

    // --- arguments ---
    const args = letsNode.arguments
    const firstLetsArgNodePath = args[0] ? letsNodePath.get('arguments')[0] : undefined
    const secondLetsArgNodePath = args[1] ? letsNodePath.get('arguments')[1] : undefined
    const thirdLetsArgNodePath = args[2] ? letsNodePath.get('arguments')[2] : undefined

    // --- is Point0 ---
    const isBasePoint0 = baseNodePath.node.type === 'Identifier' && baseNodePath.node.name === 'Point0'

    // --- position ---
    const loc = letsNode.loc?.start
    const letsPosition = loc
      ? {
          line: loc.line,
          column: loc.column,
        }
      : undefined
    if (!letsPosition) {
      errors.push(new Error('lets position not found'))
      return { parsedPoint: undefined, errors }
    }

    // --- export / variable ---
    let exportName: string | undefined
    let variableName: string | undefined
    let isTopLevelVariable = false

    const decl = letsNodePath.findParent((p) => {
      const n = p.node
      return (
        n.type === 'VariableDeclarator' || n.type === 'ExportNamedDeclaration' || n.type === 'ExportDefaultDeclaration'
      )
    })

    if (decl) {
      const n = decl.node
      if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier') {
        variableName = n.id.name
        isTopLevelVariable = true
      }
      if (n.type === 'ExportNamedDeclaration') {
        const d = n.declaration
        if (d?.type === 'VariableDeclaration' && d.declarations[0]?.id.type === 'Identifier') {
          exportName = d.declarations[0].id.name
          isTopLevelVariable = true
        }
      }
      if (n.type === 'ExportDefaultDeclaration') {
        exportName = 'default'
        isTopLevelVariable = true
      }
    }

    // --- last called method ---
    let lastCalledMethod: string | undefined
    const parent = letsNodePath.parentPath
    if (parent?.node.type === 'MemberExpression' && parent.node.property.type === 'Identifier') {
      lastCalledMethod = parent.node.property.name
    }

    // --- recurse base ---
    let parsedBasePoint: ParsedPoint | undefined

    if (!isBasePoint0) {
      const findBaseLetsNodePathByBaseNodePathResult = this.findBaseLetsNodePathByBaseNodePath({ baseNodePath, file })
      errors.push(...findBaseLetsNodePathByBaseNodePathResult.errors)
      if (findBaseLetsNodePathByBaseNodePathResult.baseLetsNodePath) {
        const result = this.parsePointByLetsNodePath({
          letsNodePath: findBaseLetsNodePathByBaseNodePathResult.baseLetsNodePath,
          file,
        })
        errors.push(...result.errors)
        if (result.parsedPoint) {
          parsedBasePoint = result.parsedPoint
        }
      }
    }

    const parsedPoint: ParsedPoint = {
      fileAbs: file.abs,
      letsPosition,
      exportName,
      variableName,
      isTopLevelVariable,
      lastCalledMethod,

      baseNodePath,
      letsNodePath,
      firstLetsArgNodePath,
      secondLetsArgNodePath,
      thirdLetsArgNodePath,

      isBasePoint0,
      parsedBasePoint,
    }
    return { parsedPoint, errors }
  }

  private findBaseLetsNodePathByBaseNodePath({
    baseNodePath,
    file,
  }: {
    baseNodePath: NodePath<Node>
    file: WalkerFile<'parsed'>
  }): { baseLetsNodePath: NodePath<Node> | undefined; errors: unknown[] } {
    const errors: unknown[] = []
    // TODO: find base lets node path by base node path
    return { baseLetsNodePath: undefined, errors }
  }

  // TS Helpers

  // Cache for TypeScript compiler options per directory
  // Value can be: ParsedCommandLine, null (no tsconfig found), or undefined (not checked yet)
  private readonly tsConfigCache = new Map<string, any>()

  // Lazy-loaded TypeScript module (null if not available)
  private tsModule: typeof import('typescript') | null | undefined = undefined

  /**
   * Lazy-loads TypeScript module if available.
   * Returns null if TypeScript is not installed.
   */
  private async getTypeScriptModule(): Promise<typeof import('typescript') | null> {
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
  private async getTsConfigForDirectory(dir: string): Promise<{ options: any } | null> {
    // Check cache first
    if (this.tsConfigCache.has(dir)) {
      return this.tsConfigCache.get(dir) ?? null
    }

    // Check if TypeScript is available
    const ts = await this.getTypeScriptModule()
    if (!ts) {
      // Cache null for all directories to avoid repeated checks
      this.tsConfigCache.set(dir, null)
      return null
    }

    // Find the nearest tsconfig.json by walking up the directory tree
    let currentDir = nodePath.resolve(dir)
    const root = nodePath.parse(currentDir).root

    while (currentDir !== root) {
      const tsConfigPath = nodePath.join(currentDir, 'tsconfig.json')
      try {
        // Use synchronous read for caching (ts.sys.readFile is synchronous)
        const configFileText = ts.sys.readFile(tsConfigPath)
        if (configFileText) {
          const configFile = ts.readConfigFile(tsConfigPath, ts.sys.readFile.bind(ts.sys))
          if (configFile.error) {
            // Cache null to avoid re-reading
            this.tsConfigCache.set(dir, null)
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
            this.tsConfigCache.set(cacheDir, parsedConfig)
            cacheDir = nodePath.dirname(cacheDir)
          }
          this.tsConfigCache.set(currentDir, parsedConfig)
          this.tsConfigCache.set(dir, parsedConfig)

          return parsedConfig
        }
      } catch {
        // File doesn't exist, continue searching up
      }

      const parentDir = nodePath.dirname(currentDir)
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
  private async resolveTsImport(importPath: string, containingFile: string): Promise<string | undefined> {
    // Skip absolute paths - they don't need TypeScript resolution
    if (nodePath.isAbsolute(importPath)) {
      return undefined
    }

    // Check if TypeScript is available
    const ts = await this.getTypeScriptModule()
    if (!ts) {
      return undefined
    }

    const containingDir = nodePath.dirname(containingFile)
    const tsConfig = await this.getTsConfigForDirectory(containingDir)
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
  private async detectExistingFilePathByImportPath(
    importPath: string,
    containingFile?: string,
  ): Promise<string | undefined> {
    // If we have a containing file, try TypeScript resolution first
    // This handles both path aliases (like @/lib/client) and relative paths
    if (containingFile) {
      const tsResolved = await this.resolveTsImport(importPath, containingFile)
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
    const basePath = containingFile && importPath.startsWith('.') ? nodePath.dirname(containingFile) : undefined

    const exts = ['.ts', '.tsx', '.js', '.mjs', '.cjs']
    const currentExt = nodePath.extname(importPath)
    const importPathWithoutExt = importPath.replace(currentExt, '')

    for (const ext of exts) {
      const candidatePath = importPathWithoutExt + ext
      const abs = basePath ? nodePath.resolve(basePath, candidatePath) : candidatePath
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

export class WalkerFile<TState extends 'idle' | 'read' | 'parsed' = 'idle' | 'read' | 'parsed'> {
  readonly abs: string
  content: TState extends 'read' | 'parsed' ? string : undefined
  ast: TState extends 'parsed' ? babel.ParseResult<File> : undefined
  timestamp: TState extends 'read' | 'parsed' ? number : undefined
  state: TState

  static collection = new Map<string, WalkerFile>()

  private constructor({
    abs,
    content,
    ast,
    timestamp,
    state,
  }: {
    abs: string
    content?: string
    ast?: babel.ParseResult<File>
    timestamp?: number
    state: TState
  }) {
    this.abs = abs
    this.content = content as TState extends 'read' | 'parsed' ? string : undefined
    this.ast = ast as TState extends 'parsed' ? babel.ParseResult<File> : undefined
    this.timestamp = timestamp as TState extends 'read' | 'parsed' ? number : undefined
    this.state = state
    WalkerFile.collection.set(abs, this)
  }

  static create(fileAbs: string): WalkerFile {
    const exFile = this.collection.get(fileAbs)
    if (exFile) {
      return exFile
    }
    return new WalkerFile({ abs: fileAbs, state: 'idle' })
  }

  isRead(): this is WalkerFile<'read' | 'parsed'> {
    return this.state === 'read' || this.state === 'parsed'
  }

  isParsed(): this is WalkerFile<'parsed'> {
    return this.state === 'parsed'
  }

  getSelfActual(): WalkerFile {
    const exFile = WalkerFile.collection.get(this.abs)
    if (exFile) {
      return exFile
    }
    return new WalkerFile({ abs: this.abs, state: 'idle' })
  }

  async read(): Promise<WalkerFile<'read' | 'parsed'>> {
    const self = this.getSelfActual()
    const stats = await (async () => {
      try {
        return await nodeFs.stat(self.abs)
      } catch (e) {
        throw new Error(`Failed to read file ${self.abs}: ${(e as Error).message}`, { cause: e })
      }
    })()
    const currentTimestamp = stats.mtimeMs
    if (self.timestamp === currentTimestamp && self.isRead()) {
      return self
    }
    const content = await nodeFs.readFile(this.abs, 'utf8')
    return Object.assign(self, {
      content,
      timestamp: currentTimestamp,
      state: 'read',
      ast: undefined,
      mayContainPointsResult: undefined,
    }) as WalkerFile<'read'>
  }

  parse(): WalkerFile<'parsed'> {
    const self = this.getSelfActual()
    if (self.isParsed()) {
      return self
    }
    if (!self.isRead()) {
      throw new Error(`File ${self.abs} is not read yet`)
    }
    const ast = babel.parse(self.content, {
      sourceType: 'module',
      errorRecovery: true,
      plugins: [
        'typescript',
        'jsx',
        'decorators-legacy',
        'classProperties',
        'classPrivateProperties',
        'classPrivateMethods',
      ],
    })
    return Object.assign(self, {
      ast,
      state: 'parsed',
    }) as WalkerFile<'parsed'>
  }

  private mayContainPointsResult: boolean | undefined = undefined
  mayContainPoints(): boolean {
    if (!this.isRead()) {
      throw new Error(`File ${this.abs} is not read yet`)
    }
    if (this.mayContainPointsResult !== undefined) {
      return this.mayContainPointsResult
    }
    this.mayContainPointsResult = this.content.includes('.lets(')
    return this.mayContainPointsResult
  }
}

// it looks like point, but myabe not point
export type ParsedPoint = {
  fileAbs: string
  letsPosition: { column: number; line: number }
  exportName: string | undefined
  variableName: string | undefined
  isTopLevelVariable: boolean
  lastCalledMethod: string | undefined

  baseNodePath: NodePath<Node> // Point0.lets('page', 'name') ← "Point0" | root.lets('page', 'name') ← "root"
  letsNodePath: NodePath<Node>
  firstLetsArgNodePath: NodePath<Node> | undefined
  secondLetsArgNodePath: NodePath<Node> | undefined
  thirdLetsArgNodePath: NodePath<Node> | undefined
  isBasePoint0: boolean // Point0.lets('page', 'name') ← true | root.lets('page', 'name') ← false
  parsedBasePoint: ParsedPoint | undefined
}

// it is point, but it has errors in definitions
export type InvalidParsedPoint = ParsedPoint & { errors: unknown[]; valid: false }

// it is point, and it totally valid
export type ValidParsedPoint = ParsedPoint & { errors: never[]; valid: true }

export type CollectedPoint = {
  scope: PointsScope
  type: EndPointType
  name: PointName
  exportName: string
  route: AnyRoute | undefined
  polh: boolean | number
  layouts?: string[]
  fileAbs: string
  parsed: ValidParsedPoint | InvalidParsedPoint
}

export const POINT_TYPE_TO_METHOD_MAP: Record<EndPointType, EndPointType> = {
  page: 'page',
  layout: 'layout',
  component: 'component',
  mutation: 'mutation',
  query: 'query',
  infiniteQuery: 'infiniteQuery',
  provider: 'provider',
  base: 'base',
  root: 'root',
}
export const POINT_METHOD_TO_TYPE_MAP: Record<string, EndPointType> = Object.fromEntries(
  Object.entries(POINT_TYPE_TO_METHOD_MAP).map(([type, method]) => [method, type as EndPointType]),
)
export const END_POINT_TYPES: EndPointType[] = Object.keys(POINT_TYPE_TO_METHOD_MAP) as EndPointType[]

export type PruneCustomerFlat = 'client' | 'server' | 'none'
export type PruneCustomerByScope = Record<PointsScope, PruneCustomerFlat>
export type PruneCustomer = PruneCustomerFlat | PruneCustomerByScope
