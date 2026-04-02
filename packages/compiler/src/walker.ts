import traverseModule from '@babel/traverse'
import type traverseType from '@babel/traverse'
import type { NodePath } from '@babel/traverse'
import type { Node } from '@babel/types'
import type { AnyRoute, RoutesPretty } from '@devp0nt/route0'
import type { ReadyPointType } from '@point0/core'
import type { CompilerFileImport } from './file.js'
import { CompilerFile } from './file.js'
import { ACTION_METHODS, CompilerPoint, END_POINT_TYPES } from './point.js'
import { FileResolver } from './resolver.js'

const traverse = ((traverseModule as any).default ?? traverseModule) as typeof traverseType extends { default: infer T }
  ? T
  : typeof traverseType

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
// ImportDeclaration:
//   - Definition: Represents an import statement from another module
//   - Example: import { root } from './file' or import root from './file'
//   - Because: We need to resolve imports to find where base identifiers are defined
//   - Properties:
//     * source: The module being imported from (e.g., './file')
//     * specifiers: Array of import specifiers (ImportSpecifier, ImportDefaultSpecifier, etc.)
//
// ImportSpecifier:
//   - Definition: Represents a named import (part of import { ... } from ...)
//   - Example: import { root, page } from './file' - "root" and "page" are ImportSpecifiers
//   - Properties:
//     * imported: The name being imported (can be Identifier or StringLiteral for aliases)
//     * local: The local name (Identifier) - same as imported unless aliased
//   - Note: import { root as myRoot } uses imported="root" and local="myRoot"
//
// ImportDefaultSpecifier:
//   - Definition: Represents a default import (part of import defaultName from ...)
//   - Example: import root from './file' - "root" is an ImportDefaultSpecifier
//   - Properties:
//     * local: The local name (Identifier) for the default import
//
// StringLiteral:
//   - Definition: Represents a string literal value
//   - Example: In import { root } from './file', the './file' is a StringLiteral
//   - Because: Import paths are string literals in the AST
//   - Properties:
//     * value: The string value (e.g., './file', '@point0/core')
//   - Note: Also used for string arguments like Point0.lets('root', 'myroot') where 'root' and 'myroot' are StringLiterals
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
//   - source: In ImportDeclaration, the module path (StringLiteral) being imported from
//   - specifiers: In ImportDeclaration, array of import specifiers (ImportSpecifier, ImportDefaultSpecifier, etc.)
//   - imported: In ImportSpecifier, the name being imported (Identifier or StringLiteral)
//   - local: In ImportSpecifier/ImportDefaultSpecifier, the local identifier name
//   - id: In VariableDeclarator, the identifier being declared
//   - init: In VariableDeclarator, the initializer expression (the value being assigned)
//   - declaration: In ExportNamedDeclaration/ExportDefaultDeclaration, the declaration being exported
//   - value: In StringLiteral, the string value
//   - type: The node type string (e.g., 'CallExpression', 'MemberExpression', 'Identifier')
//   - loc: Location information (line, column) for the node in source code
//

export class Walker {
  readonly files = new Map<string, CompilerFile<boolean>>()
  readonly ssr: boolean

  // <scope, Routes>
  readonly routes: Record<string, RoutesPretty>
  // <strpos, point>
  readonly points = new Map<string, CompilerPoint>()

  constructor({ routes, ssr }: { routes: Record<string, RoutesPretty> | undefined; ssr?: boolean }) {
    this.routes = routes ?? {}
    this.ssr = ssr === undefined ? false : ssr
  }

  getRoutesByScope(scope: string): RoutesPretty | undefined {
    return this.routes[scope]
  }
  getRouteByScope(scope: string, routeKey: string): AnyRoute | undefined {
    const routes = this.getRoutesByScope(scope)
    return routes?.[routeKey]
  }

  prunePoints(): void {
    this.points.clear()
  }

  pruneFiles(): void {
    this.files.clear()
  }

  // async readManyAsync({ files }: { files: string[]; fresh: boolean }): Promise<Array<CompilerFile<true>>> {
  //   return await Promise.all(
  //     files.map(async (file) => await CompilerFile.readAsync({ walker: this, file, fresh: false })),
  //   )
  // }

  collectPointsFromFile({ file: providedFile, content }: { file: string | CompilerFile<true>; content?: string }):
    | {
        points: CompilerPoint[]
        errors: unknown[]
        file: CompilerFile<true>
        ok: true
      }
    | {
        points: CompilerPoint[]
        errors: unknown[]
        file: CompilerFile<boolean> | undefined
        ok: false
      } {
    const points: CompilerPoint[] = []
    const errors: unknown[] = []
    const fileIdle = CompilerFile.create({
      walker: this,
      file: typeof providedFile === 'string' ? providedFile : providedFile.abs,
      content,
    })

    try {
      const file = fileIdle.readSync(!content) // we do not read fresh file if content was provided to not loose modifications

      if (file.allPointsWasCollected) {
        return { points: file.getCollectedPoints(), errors, file, ok: true }
      }

      if (!file.mayContainPoints()) {
        file.allPointsWasCollected = true
        return { points, errors, file, ok: true }
      }

      const letsRealNodePaths: Array<NodePath<Node>> = []
      const letsSugarNodePaths: Array<NodePath<Node>> = []
      const acceptedLetsNodePaths: Array<NodePath<Node>> = []
      traverse(file.ast, {
        CallExpression: (p) => {
          if (this.isLetsCallExpression({ node: p.node })) {
            letsRealNodePaths.push(p)
            return
          }
          if (this.isLetsTypeSugarCallExpression({ node: p.node })) {
            letsSugarNodePaths.push(p)
          }
        },
      })

      acceptedLetsNodePaths.push(...letsRealNodePaths)

      for (const letsSugarNodePath of letsSugarNodePaths) {
        const relation = this.isLetsNodePathPoint0Related({ letsNodePath: letsSugarNodePath, file })
        errors.push(...relation.errors)
        if (!relation.isRelated) {
          continue
        }
        const desugarResult = file.desugarLetsTypeCallAtNodePath({ letsSugarNodePath })
        errors.push(...desugarResult.errors)
        if (desugarResult.letsNodePath) {
          acceptedLetsNodePaths.push(desugarResult.letsNodePath)
        }
      }

      for (const letsNodePath of acceptedLetsNodePaths) {
        const result = this.collectPointByLetsNodePath({ letsNodePath, file })
        errors.push(...result.errors)
        if (result.point) {
          points.push(result.point)
        }
      }

      file.allPointsWasCollected = true
      return { points, errors, file, ok: true }
    } catch (e) {
      errors.push(e)
      return { points, errors, file: fileIdle, ok: false }
    }
  }

  private collectPointByLetsNodePath({
    letsNodePath,
    file,
  }: {
    letsNodePath: NodePath<Node>
    file: CompilerFile<true>
  }): {
    point: CompilerPoint | null | undefined
    errors: unknown[]
  } {
    const errors: unknown[] = []
    try {
      if (this.isLetsTypeSugarCallExpression({ node: letsNodePath.node })) {
        const desugarResult = file.desugarLetsTypeCallAtNodePath({ letsSugarNodePath: letsNodePath })
        errors.push(...desugarResult.errors)
        if (desugarResult.letsNodePath) {
          letsNodePath = desugarResult.letsNodePath
        }
      }
      const pointFromMemory = file.getPointFormMemoryByLetsNodePath(letsNodePath)
      if (pointFromMemory) {
        return { point: pointFromMemory, errors }
      }
      const letsNode = letsNodePath.node

      // CallExpression: A function call with parentheses and arguments
      // Example: Point0.lets('root', 'myroot') is a CallExpression
      // Because: It calls the lets() function with arguments ('root', 'myroot')
      if (letsNode.type !== 'CallExpression') return { point: undefined, errors }

      // MemberExpression: A property/method access using dot notation
      // Example: In Point0.lets('root', 'myroot'), the "Point0.lets" part is a MemberExpression
      // Because: It accesses the "lets" property/method on the "Point0" object using dot notation
      if (letsNode.callee.type !== 'MemberExpression') return { point: undefined, errors }

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
      // Extract the point type and name from the lets() call
      // Example: root.lets('page', 'mypage', '/') → pointType = 'page', pointName = 'mypage'
      // Special:
      //   root.lets('GET', '/my/:path') → pointType = 'action', pointName = 'pending...'
      //   later in point.ts we will fix name to append basepath ane it bacomes pointName = `GET ${basepath}/my/:path` if it is exists somewhere up in the chain
      //   first method name can be only ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD']
      const firstLetsArg =
        firstLetsArgNodePath?.node.type === 'StringLiteral' ? firstLetsArgNodePath.node.value : undefined
      const actionMethodShorthand = firstLetsArg && ACTION_METHODS.has(firstLetsArg) ? firstLetsArg : undefined
      const pointType: ReadyPointType | undefined = actionMethodShorthand
        ? 'action'
        : firstLetsArg
          ? (firstLetsArg as ReadyPointType)
          : undefined
      if (secondLetsArgNodePath?.node.type === 'TemplateLiteral') {
        errors.push(new Error('.lets() second argument must be a regular string literal, not a template string.'))
      }
      const pointName =
        secondLetsArgNodePath?.node.type === 'StringLiteral'
          ? actionMethodShorthand
            ? `pending...`
            : secondLetsArgNodePath.node.value
          : undefined

      if (!pointName) {
        return { point: null, errors }
      }
      if (!pointType || !END_POINT_TYPES.includes(pointType)) {
        return { point: null, errors }
      }

      // Check if the base object is Point0 (the root entry point)
      // Example: In Point0.lets('root', 'myroot'), this returns true
      // Example: In root.lets('page', 'mypage', '/'), this returns false (base is "root", not "Point0")
      // Identifier: The base must be a simple identifier name (not a computed property or expression)
      // Also verify that Point0 was imported from '@point0/core' to ensure it's the real Point0
      const isBasePoint0 = baseNodePath.node.type === 'Identifier' && baseNodePath.node.name === 'Point0'
      //  &&
      // this.isIdentifierImportedNamedFromPackage({
      //   identifierNodePath: baseNodePath,
      //   file,
      //   packageName: '@point0/core',
      //   importedName: 'Point0',
      // })

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

      const point = new CompilerPoint({
        walker: this,
        file,
        type: pointType,
        name: pointName,
        exportName,
        baseNodePath,
        letsNodePath,
        isBasePoint0,
        ssr: this.ssr,
      })
      const exPoint = this.points.get(point.strpos)
      if (exPoint) {
        return { point: exPoint, errors }
      }
      this.points.set(point.strpos, point)
      point.parse()

      return { point, errors }
    } catch (e) {
      errors.push(e)
      return { point: undefined, errors }
    }
  }

  collectParentPointByPoint({ point }: { point: CompilerPoint }): {
    parent: CompilerPoint | null | undefined
    errors: unknown[]
  } {
    const errors: unknown[] = []
    try {
      if (point.isBasePoint0) {
        return { parent: null, errors }
      }
      const findBaseLetsNodePathByBaseNodePathResult = this.findBaseLetsNodePathByBaseNodePath({
        baseNodePath: point.baseNodePath,
        file: point.file,
      })
      errors.push(...findBaseLetsNodePathByBaseNodePathResult.errors)
      if (!findBaseLetsNodePathByBaseNodePathResult.isFound) {
        return { parent: null, errors }
      }
      const result = this.collectPointByLetsNodePath({
        letsNodePath: findBaseLetsNodePathByBaseNodePathResult.baseLetsNodePath,
        file: findBaseLetsNodePathByBaseNodePathResult.baseFile,
      })
      errors.push(...result.errors)
      return { parent: result.point, errors }
    } catch (e) {
      errors.push(e)
      return { parent: undefined, errors }
    }
  }

  collectParentPointsByPoint({ point }: { point: CompilerPoint }): { parents: CompilerPoint[]; errors: unknown[] } {
    const errors: unknown[] = []
    const parents: CompilerPoint[] = []
    const visited = new Set<string>()
    let currentPoint = point as CompilerPoint | undefined
    while (currentPoint) {
      const key = currentPoint.strpos
      if (visited.has(key)) {
        errors.push(new Error(`Circular parent relation detected while resolving point chain at ${key}`))
        break
      }
      visited.add(key)
      const result = this.collectParentPointByPoint({ point: currentPoint })
      errors.push(...result.errors)
      if (!result.parent) {
        currentPoint = undefined
        break
      }
      parents.push(result.parent)
      currentPoint = result.parent
    }
    return { parents, errors }
  }

  private isLetsNodePathPoint0Related({
    letsNodePath,
    file,
    visited,
  }: {
    letsNodePath: NodePath<Node>
    file: CompilerFile<true>
    visited?: Set<string>
  }): { isRelated: boolean; errors: unknown[] } {
    const errors: unknown[] = []
    try {
      const baseNodePath = this.getBaseNodePathFromLetsCallPath({ letsNodePath })
      if (!baseNodePath || baseNodePath.node.type !== 'Identifier') {
        return { isRelated: false, errors }
      }
      if (baseNodePath.node.name === 'Point0') {
        return { isRelated: true, errors }
      }
      const key = `${file.abs}:${baseNodePath.node.name}:${letsNodePath.node.start ?? 0}:${letsNodePath.node.end ?? 0}`
      const localVisited = visited ?? new Set<string>()
      if (localVisited.has(key)) {
        return { isRelated: false, errors }
      }
      localVisited.add(key)
      const baseResult = this.findBaseLetsNodePathByBaseNodePath({ baseNodePath, file })
      errors.push(...baseResult.errors)
      if (!baseResult.isFound) {
        return { isRelated: false, errors }
      }
      return this.isLetsNodePathPoint0Related({
        letsNodePath: baseResult.baseLetsNodePath,
        file: baseResult.baseFile,
        visited: localVisited,
      })
    } catch (e) {
      errors.push(e)
      return { isRelated: false, errors }
    }
  }

  findBaseLetsNodePathByBaseNodePath({
    baseNodePath,
    file,
  }: {
    baseNodePath: NodePath<Node>
    file: CompilerFile<true>
  }):
    | {
        isFound: true
        baseLetsNodePath: NodePath<Node>
        baseFile: CompilerFile<true>
        errors: unknown[]
      }
    | {
        isFound: false
        baseLetsNodePath: undefined
        baseFile: undefined
        errors: unknown[]
      } {
    const errors: unknown[] = []

    try {
      // Step 1: Check if baseNodePath is an Identifier (e.g., "y" in "y.lets('page')")
      // If it's not an Identifier (e.g., it's Point0 or some other expression), we can't resolve it
      if (baseNodePath.node.type !== 'Identifier') {
        return { isFound: false, baseLetsNodePath: undefined, baseFile: undefined, errors }
      }

      const baseIdentifierName = baseNodePath.node.name

      // Step 2: Search in the current file for where this identifier is defined
      // It could be:
      //   - A variable declaration: const y = z.lets('XXX')
      //   - An export: export const y = z.lets('XXX')
      //   - An import: import { y } from './file' or import y from './file'
      let foundLetsNodePath: NodePath<Node> | undefined
      let foundBaseFile: CompilerFile<true> | undefined = file // Default to current file
      const importsToResolve: Array<{ importPath: string; importedName: string }> = []
      const identifierAssignmentsToResolve: Array<{ identifierName: string; file: CompilerFile<true> }> = []

      // First pass: Find declarations/exports in current file and collect imports
      traverse(file.ast, {
        // Case 1: Variable declaration in the same file
        // Example: const y = z.lets('page', 'mypage', '/').page()
        VariableDeclarator: (p) => {
          if (foundLetsNodePath) return // Already found
          if (p.node.id.type === 'Identifier' && p.node.id.name === baseIdentifierName) {
            const init = p.node.init
            if (init) {
              // Find the .lets() call in the chain (e.g., Point0.lets('root', 'myroot').root())
              const letsCall = this.findLetsCallInChain({ node: init })
              if (letsCall) {
                // Find the NodePath for the .lets() call by traversing down
                const initPath = p.get('init') as NodePath<Node>
                foundLetsNodePath = this.findLetsNodePathInChain({ nodePath: initPath, targetNode: letsCall })
              }
            }
          }
        },

        // Case 2: Named export in the same file
        // Example: export const y = z.lets('page', 'mypage', '/').page()
        // Or: export const root2 = root (where root is imported)
        ExportNamedDeclaration: (p) => {
          if (foundLetsNodePath) return
          const decl = p.node.declaration
          if (decl?.type === 'VariableDeclaration') {
            const declarations = p.get('declaration').get('declarations')
            for (const declarator of declarations) {
              if (declarator.node.id.type === 'Identifier' && declarator.node.id.name === baseIdentifierName) {
                const init = declarator.node.init
                if (init) {
                  // Find the .lets() call in the chain (e.g., Point0.lets('root', 'myroot').root())
                  const letsCall = this.findLetsCallInChain({ node: init })
                  if (letsCall) {
                    const initPath = declarator.get('init') as NodePath<Node>
                    foundLetsNodePath = this.findLetsNodePathInChain({ nodePath: initPath, targetNode: letsCall })
                    break
                  }
                  // If init is an Identifier (e.g., export const root2 = root), recursively resolve it
                  else if (init.type === 'Identifier') {
                    // This is a variable assignment like `export const root2 = root`
                    // We need to recursively resolve the identifier (root) in the same file
                    identifierAssignmentsToResolve.push({ identifierName: init.name, file })
                  }
                }
              }
            }
          }
        },

        // Case 3: Default export in the same file
        // Example: export default z.lets('page', 'mypage', '/').page()
        ExportDefaultDeclaration: (p) => {
          if (foundLetsNodePath) return
          if (baseIdentifierName === 'default') {
            const decl = p.node.declaration
            // Find the .lets() call in the chain (e.g., Point0.lets('root', 'myroot').root())
            const letsCall = this.findLetsCallInChain({ node: decl })
            if (letsCall) {
              const declPath = p.get('declaration') as NodePath<Node>
              foundLetsNodePath = this.findLetsNodePathInChain({ nodePath: declPath, targetNode: letsCall })
            }
          }
        },

        // Case 4: Import from another file - collect for later resolution
        // Example: import { y } from './file' or import y from './file'
        ImportDeclaration: (p) => {
          if (foundLetsNodePath) return
          const importPath = p.node.source.value
          if (typeof importPath !== 'string') return

          // Check if this import matches our identifier
          for (const spec of p.node.specifiers) {
            if (spec.type === 'ImportSpecifier' && spec.local.name === baseIdentifierName) {
              const importedName = spec.imported.type === 'Identifier' ? spec.imported.name : undefined
              if (importedName) {
                importsToResolve.push({ importPath, importedName })
              }
              break
            } else if (spec.type === 'ImportDefaultSpecifier' && spec.local.name === baseIdentifierName) {
              importsToResolve.push({ importPath, importedName: 'default' })
              break
            }
          }
        },
      })

      // Second pass: Resolve imports if we haven't found the declaration yet
      if (!foundLetsNodePath && importsToResolve.length > 0) {
        for (const { importPath, importedName } of importsToResolve) {
          // Resolve the import path to get the actual file path
          // This handles TypeScript path aliases and relative paths
          const resolvedPath = FileResolver.resolveFilePath({
            path: importPath,
            importer: file.abs,
          })
          if (resolvedPath) {
            try {
              // Read and parse the imported file
              const importedFile = CompilerFile.readSync({ walker: this, file: resolvedPath, fresh: true })
              // Recursively search in the imported file for the export
              const result = this.findLetsNodePathByExportName({
                exportName: importedName,
                file: importedFile,
              })
              errors.push(...result.errors)
              if (result.isFound) {
                foundLetsNodePath = result.letsNodePath
                foundBaseFile = result.foundFile // The base point is in the imported file
                break // Found it, stop searching
              }
            } catch (error) {
              errors.push(
                new Error(`Failed to parse imported file ${resolvedPath}: ${(error as Error).message}`, {
                  cause: error,
                }),
              )
            }
          } else {
            errors.push(new Error(`Could not resolve import path: ${importPath}`))
          }
        }
      }

      // Third pass: Resolve identifier assignments (e.g., export const root2 = root)
      // where root is imported or defined elsewhere in the file
      if (!foundLetsNodePath && identifierAssignmentsToResolve.length > 0) {
        for (const { identifierName, file: assignmentFile } of identifierAssignmentsToResolve) {
          // Find where this identifier is declared (as an import or variable)
          // We'll create a synthetic traversal looking for the identifier declaration
          let identifierNodePath: NodePath<Node> | undefined

          // Look for the identifier in imports and variable declarations
          traverse(assignmentFile.ast, {
            VariableDeclarator: (p) => {
              if (identifierNodePath) return
              if (p.node.id.type === 'Identifier' && p.node.id.name === identifierName) {
                identifierNodePath = p.get('id') as NodePath<Node>
              }
            },
            ImportSpecifier: (p) => {
              if (identifierNodePath) return
              if (p.node.local.name === identifierName) {
                identifierNodePath = p.get('local') as NodePath<Node>
              }
            },
            ImportDefaultSpecifier: (p) => {
              if (identifierNodePath) return
              if (p.node.local.name === identifierName) {
                identifierNodePath = p.get('local') as NodePath<Node>
              }
            },
          })

          if (identifierNodePath) {
            // Recursively resolve this identifier
            const result = this.findBaseLetsNodePathByBaseNodePath({
              baseNodePath: identifierNodePath,
              file: assignmentFile,
            })
            errors.push(...result.errors)
            if (result.isFound) {
              foundLetsNodePath = result.baseLetsNodePath
              foundBaseFile = result.baseFile
              break // Found it, stop searching
            }
          }
        }
      }

      if (!foundLetsNodePath) {
        return { isFound: false, baseLetsNodePath: undefined, baseFile: undefined, errors }
      }
      return { isFound: true, baseLetsNodePath: foundLetsNodePath, baseFile: foundBaseFile, errors }
    } catch (e) {
      errors.push(e)
      return { isFound: false, baseLetsNodePath: undefined, baseFile: undefined, errors }
    }
  }

  // Helper: Check if an identifier is imported as a named import from a specific package
  // Example: import { Point0 } from '@point0/core' → returns true for Point0 identifier
  // Example: import { anything } from 'any-package' → returns true for anything identifier
  // Example: const Point0 = something → returns false (not imported from package)
  // Because: We need to verify that an identifier is actually imported from a specific package and not just a variable with the same name
  // private isIdentifierImportedNamedFromPackage({
  //   identifierNodePath,
  //   file,
  //   packageName,
  //   importedName,
  // }: {
  //   identifierNodePath: NodePath<Node>
  //   file: CompilerFile<true>
  //   packageName: string
  //   importedName: string
  // }): boolean {
  //   // Must be an Identifier node
  //   if (identifierNodePath.node.type !== 'Identifier') {
  //     return false
  //   }

  //   const identifierName = identifierNodePath.node.name

  //   // Search for ImportDeclaration nodes in the file's AST
  //   let isImportedFromPackage = false
  //   traverse(file.ast, {
  //     ImportDeclaration: (p) => {
  //       // Check if this import is from the specified package
  //       const importSource = p.node.source.value
  //       if (typeof importSource !== 'string' || importSource !== packageName) {
  //         return
  //       }

  //       // Check all import specifiers for named imports only
  //       for (const spec of p.node.specifiers) {
  //         // Named import - import { importedName } from 'packageName'
  //         if (spec.type === 'ImportSpecifier') {
  //           const specImportedName = spec.imported.type === 'Identifier' ? spec.imported.name : spec.imported.value
  //           const localName = spec.local.name

  //           // Check if the local name matches our identifier and it's imported with the expected name
  //           if (localName === identifierName && specImportedName === importedName) {
  //             isImportedFromPackage = true
  //             p.stop() // Stop traversal once we found a match
  //             return
  //           }
  //         }
  //       }
  //     },
  //   })

  //   return isImportedFromPackage
  // }

  // Helper: Check if a node is a .lets() call expression
  // Example: isLetsCallExpression({ node: Point0.lets('root', 'myroot') }) → true
  // Example: isLetsCallExpression({ node: Point0.lets('root', 'myroot').root() }) → false (it's the .root() call, not .lets())
  // Because: We need to identify .lets() calls to parse them as points
  //   The node passed here is typically from p.node.init or declarator.node.init
  private isLetsCallExpression({ node }: { node: Node }): boolean {
    if (node.type !== 'CallExpression') return false
    if (node.callee.type !== 'MemberExpression') return false
    if (node.callee.property.type !== 'Identifier') return false
    return node.callee.property.name === 'lets'
  }

  private isLetsTypeSugarCallExpression({ node }: { node: Node }): boolean {
    return CompilerPoint.isLetsTypeSugarCall({ node })
  }

  private isAnyLetsCallExpression({ node }: { node: Node }): boolean {
    return this.isLetsCallExpression({ node }) || this.isLetsTypeSugarCallExpression({ node })
  }

  private getBaseNodePathFromLetsCallPath({
    letsNodePath,
  }: {
    letsNodePath: NodePath<Node>
  }): NodePath<Node> | undefined {
    if (letsNodePath.node.type !== 'CallExpression') {
      return undefined
    }
    if (
      !this.isLetsCallExpression({ node: letsNodePath.node }) &&
      !this.isLetsTypeSugarCallExpression({ node: letsNodePath.node })
    ) {
      return undefined
    }
    const calleePath = letsNodePath.get('callee')
    if (calleePath.node.type !== 'MemberExpression') {
      return undefined
    }
    if (this.isLetsCallExpression({ node: letsNodePath.node })) {
      return calleePath.get('object')
    }
    const objectPath = calleePath.get('object')
    if (objectPath.node.type !== 'MemberExpression') {
      return undefined
    }
    return objectPath.get('object')
  }

  // Helper: Find the .lets() call in a method chain by traversing down
  // Example: findLetsCallInChain({ node: Point0.lets('root', 'myroot').root() })
  //   - Input: The entire chain CallExpression (.root())
  //   - Output: The .lets() CallExpression node
  // Because: When we have a chain like Point0.lets('root', 'myroot').root(),
  //   the init expression is the entire chain ending with .root(), not just .lets()
  //   We need to traverse DOWN the chain (towards the leaves) to find the .lets() call
  //   Chain structure: CallExpression(.root()) -> MemberExpression(.root) -> CallExpression(.lets())
  //   The node passed here is typically from declarator.node.init or p.node.declaration
  private findLetsCallInChain({ node }: { node: Node }): Node | undefined {
    if (!this.isAnyLetsCallExpression({ node })) {
      // If this isn't a .lets() call, check if it's a CallExpression with a MemberExpression callee
      // If so, traverse down to the object to find .lets()
      if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression') {
        const object = node.callee.object
        // Recursively search in the object (which might be another CallExpression in the chain)
        return this.findLetsCallInChain({ node: object })
      }
      return undefined
    }
    // Found it! This node is the .lets() CallExpression
    return node
  }

  // Helper: Find the NodePath for a specific node by traversing down a chain
  // Example: findLetsNodePathInChain({
  //   nodePath: NodePath for Point0.lets('root', 'myroot').root(),
  //   targetNode: The .lets() CallExpression node (found by findLetsCallInChain)
  // })
  //   - Input nodePath: NodePath wrapping the entire chain (e.g., from declarator.get('init'))
  //   - Input targetNode: The specific .lets() Node we want to find (from findLetsCallInChain)
  //   - Output: NodePath wrapping the .lets() CallExpression
  // Because: We need the NodePath (not just the Node) to pass to parsePointByLetsNodePath
  //   We traverse DOWN the chain from the top-level NodePath to find the NodePath that wraps targetNode
  //   Chain structure: NodePath(.root()) -> NodePath(.root MemberExpression) -> NodePath(.lets() CallExpression)
  private findLetsNodePathInChain({
    nodePath,
    targetNode,
  }: {
    nodePath: NodePath<Node>
    targetNode: Node
  }): NodePath<Node> | undefined {
    // If this NodePath's node equals the given node, return it
    if (nodePath.node === targetNode) {
      return nodePath
    }

    // If this is a CallExpression with a MemberExpression callee, traverse down
    if (nodePath.node.type === 'CallExpression' && nodePath.node.callee.type === 'MemberExpression') {
      const calleePath = nodePath.get('callee')
      if (calleePath.node.type === 'MemberExpression') {
        const objectPath = calleePath.get('object')
        // Recursively search in the object path (which is deeper in the chain)
        const found = this.findLetsNodePathInChain({ nodePath: objectPath, targetNode })
        if (found) {
          return found
        }
      }
    }

    return undefined
  }

  // Helper: Find the .lets() NodePath by export name in a file
  // Purpose: When we have an import like "import { root } from './file'", we need to find where "root" is exported
  //   and get the NodePath for its .lets() call so we can parse it as a point
  // Example: findLetsNodePathByExportName({
  //   exportName: 'root',
  //   file: parsedFile // File containing: export const root = Point0.lets('root', 'myroot').root()
  // })
  //   - Searches for: export const root = ...
  //   - Finds: Point0.lets('root', 'myroot').root()
  //   - Returns: NodePath wrapping the .lets() CallExpression
  // Because: This is used when resolving imports - we need to find the base point definition
  //   in the imported file to understand the point hierarchy
  findLetsNodePathByExportName({
    exportName,
    file,
  }: {
    exportName: string // The export name to search for (e.g., 'root' or 'default')
    file: CompilerFile<true> // The parsed file to search in
  }):
    | { isFound: boolean; foundFile: CompilerFile<true>; letsNodePath: NodePath<Node>; errors: unknown[] }
    | {
        isFound: false
        foundFile: undefined
        letsNodePath: undefined
        errors: unknown[]
      } {
    const errors: unknown[] = []
    let foundLetsNodePath: NodePath<Node> | undefined
    let foundFile: CompilerFile<true> | undefined
    const reExportsToResolve: Array<{ sourcePath: string; nameToFind: string }> = []
    const identifierExportsToResolve: Array<{ identifierName: string }> = []

    try {
      // First pass: Traverse the AST to find exports matching the exportName
      traverse(file.ast, {
        // Case 1: Named export - export const root = Point0.lets(...) or export {root} from './file'
        ExportNamedDeclaration: (p) => {
          if (foundLetsNodePath) return // Already found, skip
          const decl = p.node.declaration

          // Case 1a: Re-export - export {root} from './file' or export {root as other} from './file'
          // Example: export {root} from './file'
          if (p.node.source) {
            const sourcePath = p.node.source.value
            if (typeof sourcePath === 'string') {
              // Check if this re-export matches our export name
              for (const spec of p.node.specifiers) {
                if (spec.type === 'ExportSpecifier') {
                  // In ExportSpecifier, exported can be Identifier or StringLiteral, local is Identifier
                  const exportedName = spec.exported.type === 'Identifier' ? spec.exported.name : spec.exported.value
                  // spec.local is always Identifier in ExportSpecifier
                  const localName = spec.local.name

                  // Check if the exported name matches (or if no alias, the local name matches)
                  if (exportedName === exportName || (!exportedName && localName === exportName)) {
                    // The actual name to look for in the source file is the local name
                    const nameToFind = localName || exportedName
                    if (nameToFind) {
                      reExportsToResolve.push({ sourcePath, nameToFind })
                    }
                  }
                }
              }
            }
            return // Handled re-export case, continue to next
          }

          // Case 1b: Direct export - export const root = Point0.lets(...)
          // Check if it's a variable declaration (export const ...)
          if (decl?.type === 'VariableDeclaration') {
            const declarations = p.get('declaration').get('declarations')
            // Iterate through all variable declarators in the export
            for (const declarator of declarations) {
              // Check if this declarator matches our export name
              if (declarator.node.id.type === 'Identifier' && declarator.node.id.name === exportName) {
                const init = declarator.node.init
                if (init) {
                  // Find the .lets() call in the chain (e.g., Point0.lets('root', 'myroot').root())
                  // The init might be a chain ending with .root(), .page(), etc., so we traverse down
                  const letsCall = this.findLetsCallInChain({ node: init })
                  if (letsCall) {
                    // Get the NodePath for the init expression
                    const initPath = declarator.get('init') as NodePath<Node>
                    // Find the NodePath that wraps the .lets() call by traversing down the chain
                    foundLetsNodePath = this.findLetsNodePathInChain({ nodePath: initPath, targetNode: letsCall })
                    if (foundLetsNodePath) foundFile = file
                    break // Found it, stop searching
                  }
                  // If init is an Identifier (e.g., export const root2 = root), collect it for resolution
                  else if (init.type === 'Identifier') {
                    identifierExportsToResolve.push({ identifierName: init.name })
                  }
                }
              }
            }
          }
        },

        // Case 2: Default export - export default Point0.lets(...)
        // Example: export default Point0.lets('root', 'myroot').root()
        ExportDefaultDeclaration: (p) => {
          if (foundLetsNodePath) return // Already found, skip
          // Only process if we're looking for the default export
          if (exportName === 'default') {
            const decl = p.node.declaration
            // Find the .lets() call in the chain (e.g., Point0.lets('root', 'myroot').root())
            // The declaration might be a chain ending with .root(), .page(), etc., so we traverse down
            const letsCall = this.findLetsCallInChain({ node: decl })
            if (letsCall) {
              // Get the NodePath for the declaration
              const declPath = p.get('declaration') as NodePath<Node>
              // Find the NodePath that wraps the .lets() call by traversing down the chain
              foundLetsNodePath = this.findLetsNodePathInChain({ nodePath: declPath, targetNode: letsCall })
              if (foundLetsNodePath) foundFile = file
            }
          }
        },
      })

      // Second pass: Resolve re-exports if we haven't found the declaration yet
      if (!foundLetsNodePath && reExportsToResolve.length > 0) {
        for (const { sourcePath, nameToFind } of reExportsToResolve) {
          // Resolve the source path to get the actual file path
          const resolvedPath = FileResolver.resolveFilePath({
            path: sourcePath,
            importer: file.abs,
          })
          if (resolvedPath) {
            try {
              // Read and parse the source file
              const sourceFile = CompilerFile.readSync({ walker: this, file: resolvedPath, fresh: true })
              // Recursively search in the source file for the export
              const result = this.findLetsNodePathByExportName({
                exportName: nameToFind,
                file: sourceFile,
              })
              errors.push(...result.errors)
              if (result.isFound) {
                foundLetsNodePath = result.letsNodePath
                foundFile = result.foundFile
                break // Found it, stop searching
              }
            } catch (error) {
              errors.push(
                new Error(`Failed to parse re-exported file ${resolvedPath}: ${(error as Error).message}`, {
                  cause: error,
                }),
              )
            }
          } else {
            errors.push(new Error(`Could not resolve re-export path: ${sourcePath}`))
          }
        }
      }

      // Third pass: Resolve identifier exports (e.g., export const root2 = root)
      // where root is imported or defined elsewhere in the file
      if (!foundLetsNodePath && identifierExportsToResolve.length > 0) {
        for (const { identifierName } of identifierExportsToResolve) {
          // First try to find it as an export in the same file
          const result = this.findLetsNodePathByExportName({
            exportName: identifierName,
            file,
          })
          errors.push(...result.errors)
          if (result.isFound) {
            foundLetsNodePath = result.letsNodePath
            foundFile = result.foundFile
            break // Found it, stop searching
          }

          // If not found as export, try to find it as an import or variable declaration
          // by creating a synthetic NodePath and using findBaseLetsNodePathByBaseNodePath
          let identifierNodePath: NodePath<Node> | undefined
          traverse(file.ast, {
            ImportSpecifier: (p) => {
              if (identifierNodePath) return
              if (p.node.local.name === identifierName) {
                identifierNodePath = p.get('local') as NodePath<Node>
              }
            },
            ImportDefaultSpecifier: (p) => {
              if (identifierNodePath) return
              if (p.node.local.name === identifierName) {
                identifierNodePath = p.get('local') as NodePath<Node>
              }
            },
            VariableDeclarator: (p) => {
              if (identifierNodePath) return
              if (p.node.id.type === 'Identifier' && p.node.id.name === identifierName) {
                identifierNodePath = p.get('id') as NodePath<Node>
              }
            },
          })

          if (identifierNodePath) {
            const baseResult = this.findBaseLetsNodePathByBaseNodePath({
              baseNodePath: identifierNodePath,
              file,
            })
            errors.push(...baseResult.errors)
            if (baseResult.isFound) {
              foundLetsNodePath = baseResult.baseLetsNodePath
              foundFile = baseResult.baseFile
              break // Found it, stop searching
            }
          }
        }
      }

      if (!foundLetsNodePath || !foundFile) {
        return { isFound: false, foundFile: undefined, letsNodePath: undefined, errors }
      }

      return { isFound: true, foundFile, letsNodePath: foundLetsNodePath, errors }
    } catch (e) {
      errors.push(e)
      return { isFound: false, foundFile: undefined, letsNodePath: undefined, errors }
    }
  }

  findFileByImport({
    pathOriginal,
    pathResolved,
  }: {
    pathOriginal?: string
    pathResolved?: string
  }): { file: CompilerFile<any>; importItem: CompilerFileImport } | undefined {
    for (const f of this.files.values()) {
      for (const importItem of f.imports) {
        if (
          (pathOriginal && importItem.pathOriginal === pathOriginal) ||
          (pathResolved && importItem.pathResolved === pathResolved)
        ) {
          return { file: f, importItem }
        }
      }
    }
    return undefined
  }
}
