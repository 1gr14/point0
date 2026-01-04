import babel from '@babel/parser'
import type traverseType from '@babel/traverse'
import type { NodePath } from '@babel/traverse'
import traverseModule from '@babel/traverse'
import type { File, Node } from '@babel/types'
import type { AnyRoute, RoutesPretty } from '@devp0nt/route0'
import type { EndPointType, PointName, PointsScope } from '@point0/core'
import * as nodeFs from 'node:fs/promises'
import * as nodePath from 'node:path'

// Glossary: Babel AST Node Types and Concepts
//
// This glossary explains the AST (Abstract Syntax Tree) node types used in this file
// to parse Point0.lets() calls from source code.
//
// CallExpression:
//   - Definition: Represents a function call with parentheses and arguments
//   - Example: Point0.lets('root', 'myroot') is a CallExpression
//   - Because: It calls the lets() function with arguments ('root', 'myroot')
//   - Properties:
//     * callee: The function being called (e.g., Point0.lets)
//     * arguments: Array of argument nodes (e.g., ['root', 'myroot'])
//
// MemberExpression:
//   - Definition: Represents accessing a property or method of an object using dot notation
//   - Example: In Point0.lets('root', 'myroot'), the "Point0.lets" part is a MemberExpression
//   - Because: It accesses the "lets" property/method on the "Point0" object using dot notation
//   - Properties:
//     * object: The object being accessed (e.g., Point0)
//     * property: The property/method being accessed (e.g., lets)
//   - Note: Computed properties like obj[someVar] are also MemberExpressions, but with computed: true
//
// Identifier:
//   - Definition: A simple identifier name (variable name, property name, etc.)
//   - Example: In Point0.lets, both "Point0" and "lets" are Identifiers
//   - Because: They are direct names, not computed properties like Point0[someVar]
//   - Properties:
//     * name: The string name of the identifier (e.g., "Point0", "lets")
//
// VariableDeclarator:
//   - Definition: Represents a variable declaration (part of const/let/var statements)
//   - Example: const root = Point0.lets(...) - "root = Point0.lets(...)" is a VariableDeclarator
//   - Properties:
//     * id: The identifier being declared (e.g., root)
//     * init: The initializer expression (e.g., Point0.lets(...))
//
// VariableDeclaration:
//   - Definition: Represents a variable declaration statement (const/let/var)
//   - Example: const root = Point0.lets(...) - the entire statement is a VariableDeclaration
//   - Properties:
//     * kind: The declaration kind ('const', 'let', or 'var')
//     * declarations: Array of VariableDeclarator nodes
//
// ExportNamedDeclaration:
//   - Definition: Represents a named export statement
//   - Example: export const root = Point0.lets(...) is an ExportNamedDeclaration
//   - Properties:
//     * declaration: The declaration being exported (e.g., VariableDeclaration)
//
// ExportDefaultDeclaration:
//   - Definition: Represents a default export statement
//   - Example: export default Point0.lets(...) is an ExportDefaultDeclaration
//   - Properties:
//     * declaration: The declaration being exported as default
//
// NodePath (Babel concept):
//   - Definition: A wrapper around an AST node that provides traversal and manipulation methods
//   - Example: letsNodePath is a NodePath wrapping the CallExpression node
//   - Methods:
//     * .get('property'): Get a NodePath for a specific property (e.g., get('callee'))
//     * .get('arguments')[0]: Get a NodePath for array element (e.g., first argument)
//     * .findParent(): Find parent node matching a condition
//     * .node: Access the underlying AST node
//
// Common AST Node Properties:
//   - callee: In CallExpression, the function being called (can be Identifier or MemberExpression)
//   - object: In MemberExpression, the object being accessed (e.g., Point0 in Point0.lets)
//   - property: In MemberExpression, the property being accessed (e.g., lets in Point0.lets)
//   - arguments: In CallExpression, array of argument nodes passed to the function
//   - type: The node type string (e.g., 'CallExpression', 'MemberExpression', 'Identifier')
//   - loc: Location information (line, column) for the node in source code
//

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
        // MemberExpression: A property/method access using dot notation
        // Example: In Point0.lets('root', 'myroot'), the "Point0.lets" part is a MemberExpression
        // Because: It accesses the "lets" property/method on the "Point0" object using dot notation
        if (callee.type !== 'MemberExpression') return

        // Identifier: A simple identifier name (not a computed property like [someVar])
        // Example: In Point0.lets, the "lets" part is an Identifier
        // Because: It's a direct property name, not a computed property access like Point0[someVar]
        if (callee.property.type !== 'Identifier') return

        // Check if the property name is 'lets'
        // Example: Point0.lets('root', 'myroot') - we're looking for calls to .lets()
        // Because: We only want to parse Point0.lets() calls, not other method calls
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

    // CallExpression: A function call with parentheses and arguments
    // Example: Point0.lets('root', 'myroot') is a CallExpression
    // Because: It calls the lets() function with arguments ('root', 'myroot')
    if (letsNode.type !== 'CallExpression') return { parsedPoint: undefined, errors }

    // MemberExpression: A property/method access using dot notation
    // Example: In Point0.lets('root', 'myroot'), the "Point0.lets" part is a MemberExpression
    // Because: It accesses the "lets" property/method on the "Point0" object using dot notation
    if (letsNode.callee.type !== 'MemberExpression') return { parsedPoint: undefined, errors }

    // Extract the base object from the MemberExpression
    // Example: In Point0.lets('root', 'myroot'), this extracts "Point0"
    // Because: We need to know what object .lets() is being called on (Point0 or something else)
    // The callee is "Point0.lets" (MemberExpression), and its "object" property is "Point0"
    const baseNodePath = letsNodePath.get('callee').get('object')

    // Extract arguments from the CallExpression
    // Example: In Point0.lets('root', 'myroot'), letsArgs contains ['root', 'myroot']
    // Because: We need to access the NodePaths for each argument to parse them later
    const letsArgs = letsNode.arguments
    // Access NodePaths for each argument using array indexing
    // Note: Checking length instead of truthiness to handle falsy argument values (0, false, null)
    const firstLetsArgNodePath = letsArgs.length > 0 ? letsNodePath.get('arguments')[0] : undefined
    const secondLetsArgNodePath = letsArgs.length > 1 ? letsNodePath.get('arguments')[1] : undefined
    const thirdLetsArgNodePath = letsArgs.length > 2 ? letsNodePath.get('arguments')[2] : undefined

    // Check if the base object is Point0 (the root entry point)
    // Example: In Point0.lets('root', 'myroot'), this returns true
    // Example: In root.lets('page', 'mypage'), this returns false (base is "root", not "Point0")
    // Identifier: The base must be a simple identifier name (not a computed property or expression)
    const isBasePoint0 = baseNodePath.node.type === 'Identifier' && baseNodePath.node.name === 'Point0'

    // Extract the source code location (line and column) of the lets() call
    // Example: In Point0.lets('root', 'myroot'), this gets the position where "lets" appears
    // Because: We need to report errors and provide source locations for debugging
    // Note: loc may be undefined if:
    //   - The node was programmatically created (not parsed from source)
    //   - Error recovery created a placeholder node without location info
    //   - The AST was transformed and location info was lost
    //   - Edge cases where Babel couldn't determine the location
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

    // Extract how the point was exported (if it was exported)
    // Example: export const root = Point0.lets(...) → exportName = "root"
    // Example: export default Point0.lets(...) → exportName = "default"
    // Example: const root = Point0.lets(...) → exportName = undefined (not exported)
    // Because: We need to know the export name to reference this point from other files
    const exportName: string | undefined = (() => {
      // Find the parent export declaration node (ExportNamedDeclaration or ExportDefaultDeclaration)
      // This walks up the AST tree to find where the lets() call is exported
      // Note: We only check for export declarations, not VariableDeclarator, because:
      //   - If exported, findParent will find ExportNamedDeclaration or ExportDefaultDeclaration
      //   - If not exported, findParent won't find these types, and we return undefined
      const decl = letsNodePath.findParent((p) => {
        const n = p.node
        return (
          n.type === 'ExportNamedDeclaration' || // Example: export const root = Point0.lets('root', 'myroot')
          n.type === 'ExportDefaultDeclaration' // Example: export default Point0.lets('root', 'myroot')
        )
      })

      // If no export declaration was found, the point is not exported
      if (!decl) {
        return undefined
      }
      const declNode = decl.node

      // Case 1: Named export - export const root = Point0.lets(...)
      // Example: export const root = Point0.lets('root', 'myroot')
      // Because: ExportNamedDeclaration wraps a VariableDeclaration, which contains the variable name
      if (declNode.type === 'ExportNamedDeclaration') {
        const variableDecl = declNode.declaration
        if (variableDecl?.type === 'VariableDeclaration' && variableDecl.declarations[0]?.id.type === 'Identifier') {
          return variableDecl.declarations[0].id.name
        }
      }

      // Case 2: Default export - export default Point0.lets(...)
      // Example: export default Point0.lets('root', 'myroot')
      // Because: Default exports use the special name "default"
      else if (declNode.type === 'ExportDefaultDeclaration') {
        return 'default'
      }

      // Fallback: If we found a declaration but it doesn't match expected types, return undefined
      return undefined
    })()

    const lastCalledMethod = (() => {
      // --- last called method ---
      // Find the last method called in the chain after .lets()
      // Rule: Code that starts with .lets('XXX') should end with .XXX()
      // Example: Point0.lets('page', 'mypage').page(() => <div>Hello</div>)
      //   - The chain starts with .lets('page', ...)
      //   - The chain ends with .page(...)
      //   - lastCalledMethod = 'page'
      // Example: Point0.lets('page', 'mypage').one().two().page(() => <div>Hello</div>)
      //   - The chain has intermediate calls: .one().two()
      //   - The chain ends with .page(...)
      //   - lastCalledMethod = 'page'
      // Because: Our compiler enforces that the first argument to .lets() must match the final method call
      //   This ensures type safety: .lets('page', ...) must be followed by .page() (even with intermediate calls)
      let maybeLastCalledMethod: string | undefined
      // Traverse UP the AST tree (towards the ast root) to find the topmost CallExpression
      // In the AST, method chains are nested: .lets() is deeper, .page() is higher (closer to ast root)
      // Example: Point0.lets('page', 'mypage').one().two().page()
      //   AST structure (from ast root down): CallExpression(page) contains CallExpression(two) contains CallExpression(one) contains CallExpression(lets)
      //   So .lets() is nested inside .one(), which is nested inside .two(), which is nested inside .page()
      //   To find .page(), we traverse UP from .lets() using parentPath (child -> parent -> grandparent -> ...)
      // Because: parentPath goes from child to parent, which moves UP the tree towards the ast root
      let current: NodePath<Node> | null = letsNodePath.parentPath
      while (current) {
        // If we find a CallExpression, check if its callee is a MemberExpression
        // This means we found a method call in the chain (e.g., .one(), .two(), .page())
        if (current.node.type === 'CallExpression' && current.node.callee.type === 'MemberExpression') {
          const callee = current.node.callee
          if (callee.property.type === 'Identifier') {
            // Update lastCalledMethod with each method we find
            // The last one will be the topmost (final) method call in the chain
            maybeLastCalledMethod = callee.property.name
          }
        }
        // Continue traversing UP the AST tree (towards the root)
        // We continue while we're in CallExpressions or MemberExpressions (part of the method chain)
        if (current.node.type === 'CallExpression' || current.node.type === 'MemberExpression') {
          current = current.parentPath // parentPath goes UP (child -> parent)
        } else {
          // We've reached the end of the chain (e.g., VariableDeclarator, AssignmentExpression, etc.)
          break
        }
      }
      return maybeLastCalledMethod
    })()

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
