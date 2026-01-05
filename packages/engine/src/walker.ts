import babel from '@babel/parser'
import type traverseType from '@babel/traverse'
import type { NodePath } from '@babel/traverse'
import traverseModule from '@babel/traverse'
import type { File, Node } from '@babel/types'
import type { AnyRoute, RoutesPretty } from '@devp0nt/route0'
import { Route0 } from '@devp0nt/route0'
import type { EndPointType, PointName, PointsScope } from '@point0/core'
import { dedupeSlashes } from '@point0/core'
import * as nodeFs from 'node:fs/promises'
import * as nodeFsPath from 'node:path'

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

const traverse = ((traverseModule as any).default ?? traverseModule) as typeof traverseType extends { default: infer T }
  ? T
  : typeof traverseType

export class Walker {
  readonly cwd: string

  // <scope, Routes>
  readonly routes: Record<string, RoutesPretty<any>>

  constructor(options: { cwd?: string; routes?: Record<string, RoutesPretty<any>> } = {}) {
    this.cwd = options.cwd ?? process.cwd()
    this.routes = options.routes ?? {}
  }

  getRoutesByScope(scope: string): RoutesPretty | undefined {
    return this.routes[scope]
  }
  getRouteByScope(scope: string, routeKey: string): AnyRoute | undefined {
    const routes = this.getRoutesByScope(scope)
    return (routes as any)?.[routeKey]
  }

  async getAstPointsFromFile({ fileAbs }: { fileAbs: string }): Promise<{
    astPoints: AstPoint[]
    errors: unknown[]
  }> {
    const astPoints: AstPoint[] = []
    const errors: unknown[] = []

    try {
      const file = await WalkerFile.create(fileAbs).read()

      if (!file.mayContainPoints()) {
        return { astPoints, errors }
      }
      const fileParsed = file.parse()

      // We need to collect all lets() calls first, then process them async
      const letsNodePaths: Array<NodePath<Node>> = []
      traverse(fileParsed.ast, {
        CallExpression: (p) => {
          // Check if this is a .lets() call expression
          // Example: Point0.lets('root', 'myroot') - we're looking for calls to .lets()
          // Because: We only want to parse Point0.lets() calls, not other method calls
          // Reusing isLetsCallExpression helper which checks:
          //   - It's a CallExpression (already known since we're in CallExpression visitor)
          //   - The callee is a MemberExpression (e.g., Point0.lets)
          //   - The property is an Identifier named 'lets'
          if (this.isLetsCallExpression({ node: p.node })) {
            letsNodePaths.push(p)
          }
        },
      })

      // Process all lets() calls async
      for (const letsNodePath of letsNodePaths) {
        const result = await this.getAstPointByLetsNodePath({ letsNodePath, file: fileParsed })
        errors.push(...result.errors)
        if (result.astPoint) {
          astPoints.push(result.astPoint)
        }
      }

      return { astPoints, errors }
    } catch (e) {
      errors.push(e)
      return { astPoints, errors }
    }
  }

  private async getAstPointByLetsNodePath({
    letsNodePath,
    file,
  }: {
    letsNodePath: NodePath<Node>
    file: WalkerFile<'parsed'>
  }): Promise<{
    astPoint: AstPoint | undefined
    errors: unknown[]
  }> {
    const errors: unknown[] = []
    try {
      const letsNode = letsNodePath.node

      // CallExpression: A function call with parentheses and arguments
      // Example: Point0.lets('root', 'myroot') is a CallExpression
      // Because: It calls the lets() function with arguments ('root', 'myroot')
      if (letsNode.type !== 'CallExpression') return { astPoint: undefined, errors }

      // MemberExpression: A property/method access using dot notation
      // Example: In Point0.lets('root', 'myroot'), the "Point0.lets" part is a MemberExpression
      // Because: It accesses the "lets" property/method on the "Point0" object using dot notation
      if (letsNode.callee.type !== 'MemberExpression') return { astPoint: undefined, errors }

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
      // Example: root.lets('page', 'mypage') → pointType = 'page', pointName = 'mypage'
      const pointType: EndPointType | undefined =
        firstLetsArgNodePath?.node.type === 'StringLiteral'
          ? (firstLetsArgNodePath.node.value as EndPointType)
          : undefined
      const pointName =
        secondLetsArgNodePath?.node.type === 'StringLiteral' ? secondLetsArgNodePath.node.value : undefined
      if (!pointName) {
        return { astPoint: undefined, errors }
      }
      if (!pointType || !END_POINT_TYPES.includes(pointType)) {
        return { astPoint: undefined, errors }
      }

      // Check if the base object is Point0 (the root entry point)
      // Example: In Point0.lets('root', 'myroot'), this returns true
      // Example: In root.lets('page', 'mypage'), this returns false (base is "root", not "Point0")
      // Identifier: The base must be a simple identifier name (not a computed property or expression)
      // Also verify that Point0 was imported from '@point0/core' to ensure it's the real Point0
      const isBasePoint0 =
        baseNodePath.node.type === 'Identifier' &&
        baseNodePath.node.name === 'Point0' &&
        this.isIdentifierImportedNamedFromPackage({
          identifierNodePath: baseNodePath,
          file,
          packageName: '@point0/core',
          importedName: 'Point0',
        })

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

      const astBasePoint: AstPoint | undefined = await (async () => {
        if (isBasePoint0) {
          return undefined
        }
        const findBaseLetsNodePathByBaseNodePathResult = await this.findBaseLetsNodePathByBaseNodePath({
          baseNodePath,
          file,
        })
        errors.push(...findBaseLetsNodePathByBaseNodePathResult.errors)
        if (!findBaseLetsNodePathByBaseNodePathResult.isFound) {
          return undefined
        }
        const result = await this.getAstPointByLetsNodePath({
          letsNodePath: findBaseLetsNodePathByBaseNodePathResult.baseLetsNodePath,
          file: findBaseLetsNodePathByBaseNodePathResult.baseFile,
        })
        errors.push(...result.errors)
        return result.astPoint
      })()

      const astPoint = new AstPoint({
        walker: this,
        file,
        pointType,
        pointName,
        exportName,
        baseNodePath,
        letsNodePath,
        isBasePoint0,
        astBasePoint,
      })

      if (astPoint.isRelatedToPoint0()) {
        return { astPoint, errors }
      }

      return { astPoint: undefined, errors }
    } catch (e) {
      errors.push(e)
      return { astPoint: undefined, errors }
    }
  }

  private async findBaseLetsNodePathByBaseNodePath({
    baseNodePath,
    file,
  }: {
    baseNodePath: NodePath<Node>
    file: WalkerFile<'parsed'>
  }): Promise<
    | {
        isFound: true
        baseLetsNodePath: NodePath<Node>
        baseFile: WalkerFile<'parsed'>
        errors: unknown[]
      }
    | {
        isFound: false
        baseLetsNodePath: undefined
        baseFile: undefined
        errors: unknown[]
      }
  > {
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
      let foundBaseFile: WalkerFile<'parsed'> | undefined = file // Default to current file
      const importsToResolve: Array<{ importPath: string; importedName: string }> = []
      const identifierAssignmentsToResolve: Array<{ identifierName: string; file: WalkerFile<'parsed'> }> = []

      // First pass: Find declarations/exports in current file and collect imports
      traverse(file.ast, {
        // Case 1: Variable declaration in the same file
        // Example: const y = z.lets('page', 'mypage').page()
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
        // Example: export const y = z.lets('page', 'mypage').page()
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
        // Example: export default z.lets('page', 'mypage').page()
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

      const rnd = Math.random()

      // Second pass: Resolve imports if we haven't found the declaration yet
      if (!foundLetsNodePath && importsToResolve.length > 0) {
        for (const { importPath, importedName } of importsToResolve) {
          // Resolve the import path to get the actual file path
          // This handles TypeScript path aliases and relative paths
          const resolvedPath = await WalkerResolver.detectExistingFilePathByImportPath({
            importPath,
            containingFile: file.abs,
          })
          if (resolvedPath) {
            try {
              // Read and parse the imported file
              const importedFile = await WalkerFile.create(resolvedPath)
                .read()
                .then((f) => f.parse())
              // Recursively search in the imported file for the export
              const result = await this.findLetsNodePathByExportName({
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
            const result = await this.findBaseLetsNodePathByBaseNodePath({
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
  private isIdentifierImportedNamedFromPackage({
    identifierNodePath,
    file,
    packageName,
    importedName,
  }: {
    identifierNodePath: NodePath<Node>
    file: WalkerFile<'parsed'>
    packageName: string
    importedName: string
  }): boolean {
    // Must be an Identifier node
    if (identifierNodePath.node.type !== 'Identifier') {
      return false
    }

    const identifierName = identifierNodePath.node.name

    // Search for ImportDeclaration nodes in the file's AST
    let isImportedFromPackage = false
    traverse(file.ast, {
      ImportDeclaration: (p) => {
        // Check if this import is from the specified package
        const importSource = p.node.source.value
        if (typeof importSource !== 'string' || importSource !== packageName) {
          return
        }

        // Check all import specifiers for named imports only
        for (const spec of p.node.specifiers) {
          // Named import - import { importedName } from 'packageName'
          if (spec.type === 'ImportSpecifier') {
            const specImportedName = spec.imported.type === 'Identifier' ? spec.imported.name : spec.imported.value
            const localName = spec.local.name

            // Check if the local name matches our identifier and it's imported with the expected name
            if (localName === identifierName && specImportedName === importedName) {
              isImportedFromPackage = true
              p.stop() // Stop traversal once we found a match
              return
            }
          }
        }
      },
    })

    return isImportedFromPackage
  }

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
    if (!this.isLetsCallExpression({ node })) {
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
    // If this NodePath's node matches the target, return it
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
  private async findLetsNodePathByExportName({
    exportName,
    file,
  }: {
    exportName: string // The export name to search for (e.g., 'root' or 'default')
    file: WalkerFile<'parsed'> // The parsed file to search in
  }): Promise<
    | { isFound: boolean; foundFile: WalkerFile<'parsed'>; letsNodePath: NodePath<Node>; errors: unknown[] }
    | {
        isFound: false
        foundFile: undefined
        letsNodePath: undefined
        errors: unknown[]
      }
  > {
    const errors: unknown[] = []
    let foundLetsNodePath: NodePath<Node> | undefined
    let foundFile: WalkerFile<'parsed'> | undefined
    const reExportsToResolve: Array<{ sourcePath: string; nameToFind: string }> = []
    const identifierExportsToResolve: Array<{ identifierName: string }> = []

    const rnd = Math.random()

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
          const resolvedPath = await WalkerResolver.detectExistingFilePathByImportPath({
            importPath: sourcePath,
            containingFile: file.abs,
          })
          if (resolvedPath) {
            try {
              // Read and parse the source file
              const sourceFile = await WalkerFile.create(resolvedPath)
                .read()
                .then((f) => f.parse())
              // Recursively search in the source file for the export
              const result = await this.findLetsNodePathByExportName({
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
          const result = await this.findLetsNodePathByExportName({
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
            const baseResult = await this.findBaseLetsNodePathByBaseNodePath({
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
}

export class AstPoint {
  readonly walker: Walker
  readonly file: WalkerFile
  readonly pointType: EndPointType
  readonly pointName: PointName
  readonly exportName: string | undefined
  readonly baseNodePath: NodePath<Node> // Point0.lets('page', 'name') ← "Point0" | root.lets('page', 'name') ← "root"
  readonly letsNodePath: NodePath<Node>
  readonly isBasePoint0: boolean // Point0.lets('page', 'name') ← true | root.lets('page', 'name') ← false
  readonly astBasePoint: AstPoint | undefined
  readonly parents: AstPoint[]

  constructor({
    walker,
    file,
    pointType,
    pointName,
    exportName,
    baseNodePath,
    letsNodePath,
    isBasePoint0,
    astBasePoint,
  }: {
    walker: Walker
    file: WalkerFile
    pointType: EndPointType
    pointName: PointName
    exportName: string | undefined
    baseNodePath: NodePath<Node>
    letsNodePath: NodePath<Node>
    isBasePoint0: boolean
    astBasePoint: AstPoint | undefined
  }) {
    this.walker = walker
    this.file = file
    this.pointType = pointType
    this.pointName = pointName
    this.exportName = exportName
    this.baseNodePath = baseNodePath
    this.letsNodePath = letsNodePath
    this.isBasePoint0 = isBasePoint0
    this.astBasePoint = astBasePoint
    this.parents = []
    let parent: AstPoint | undefined = astBasePoint
    while (parent) {
      this.parents.push(parent)
      parent = parent.astBasePoint
    }
  }

  getLastParentOrSelf(): AstPoint {
    if (this.parents.length > 0) {
      return this.parents[this.parents.length - 1]
    }
    return this
  }

  getSelfAndParents(): AstPoint[] {
    return [this, ...this.parents]
  }

  isRelatedToPoint0(): boolean {
    const lastAstBasePoint = this.getLastParentOrSelf()
    // we just check if the last parsed base point is Point0, so it is desired point, else it is not related to Point0, just looks like it, but not
    return lastAstBasePoint.isBasePoint0
  }

  getLastCalledMethodName(): string | undefined {
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
    let current: NodePath<Node> | null = this.letsNodePath.parentPath
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
  }

  getLetsPosition(): { file: string; line: number; column: number } | undefined {
    // Extract the source code location (line and column) of the lets() call
    // Example: In Point0.lets('root', 'myroot'), this gets the position where "lets" appears
    // Because: We need to report errors and provide source locations for debugging
    // Note: loc may be undefined if:
    //   - The node was programmatically created (not parsed from source)
    //   - Error recovery created a placeholder node without location info
    //   - The AST was transformed and location info was lost
    //   - Edge cases where Babel couldn't determine the location
    const loc = this.letsNodePath.node.loc?.start
    const letsPosition = loc
      ? {
          file: this.file.abs,
          line: loc.line,
          column: loc.column,
        }
      : undefined
    return letsPosition
  }

  getScopes(): PointsScope[] {
    const scopes: PointsScope[] = []
    for (const astPoint of this.getSelfAndParents()) {
      if (astPoint.pointType === 'root') {
        scopes.push(astPoint.pointName)
      }
    }
    return scopes
  }

  getThirdLetsArgString(): string | undefined {
    const thirdLetsArgString = this.letsNodePath.get('arguments').at(2)
    if (thirdLetsArgString?.node.type === 'StringLiteral') {
      return thirdLetsArgString.node.value
    }
    return undefined
  }

  getRoute(scope: string): { errors: unknown[]; route: AnyRoute | undefined } {
    const errors: unknown[] = []
    if (!['page', 'layout'].includes(this.pointType)) {
      return { errors, route: undefined }
    }

    // Go through self and parents (from child to parent)
    // getSelfAndParents() returns [this, ...this.parents] (child first)
    const points = this.getSelfAndParents().reverse()
    const routeSegments: string[] = []

    // Process from child to parent (as returned by getSelfAndParents)
    for (const point of points) {
      if (!['page', 'layout'].includes(point.pointType)) {
        continue
      }

      const routeInfo = this.extractRouteFromLetsCall({
        letsNodePath: point.letsNodePath,
        pointType: point.pointType,
        pointName: point.pointName,
        scope,
      })
      errors.push(...routeInfo.errors)

      // If we found a full route (from routes.xxx or Route0.create), it's final
      // only in case if it is self point
      // else we collect segments
      const routeFull = routeInfo.routeFull
      if (routeFull) {
        if (point === this) {
          return { errors, route: routeFull }
        } else {
          routeSegments.splice(0, routeSegments.length, routeFull.definition)
        }
      }

      // Otherwise, collect the segment for later concatenation
      if (routeInfo.routeSegment !== undefined) {
        routeSegments.push(routeInfo.routeSegment) // Add to end (child segments first in array)
      }
    }

    // Build final route from segments
    // Segments are in child-to-parent order, but we need parent-to-child for building
    // Reverse to get parent-first order, then build route
    if (routeSegments.length > 0) {
      // Filter out empty segments and build route
      const nonEmptySegments = routeSegments.filter((s) => s !== '')

      if (nonEmptySegments.length === 0) {
        // All segments were empty, return root route
        return { errors, route: Route0.from('/') }
      }

      // Start with first segment as base route
      let finalRoute: AnyRoute = Route0.from(dedupeSlashes(`/${nonEmptySegments[0]}`))
      // Extend with remaining segments
      for (let i = 1; i < nonEmptySegments.length; i++) {
        finalRoute = finalRoute.extend(nonEmptySegments[i]) as AnyRoute
      }
      return { errors, route: finalRoute }
    }

    return { errors, route: undefined }
  }

  private extractRouteFromLetsCall({
    letsNodePath,
    pointType,
    pointName,
    scope,
  }: {
    letsNodePath: NodePath<Node>
    pointType: EndPointType
    pointName: PointName
    scope: string
  }): { routeSegment?: string; routeFull?: AnyRoute; errors: unknown[] } {
    const errors: unknown[] = []
    const letsNode = letsNodePath.node

    if (letsNode.type !== 'CallExpression') {
      return { errors, routeSegment: undefined, routeFull: undefined }
    }

    const routeArg = letsNode.arguments.at(2)

    // Case 1: Third argument is a StringLiteral (e.g., .lets('page', 'news', '/news'))
    if (routeArg?.type === 'StringLiteral') {
      const routeSegment = routeArg.value === '/' ? '' : routeArg.value
      return { routeSegment, routeFull: undefined, errors }
    }

    // Case 2: Third argument is a MemberExpression (e.g., .lets('page', 'news', routes.ideaNews))
    if (routeArg?.type === 'MemberExpression') {
      const prop = routeArg.property
      if (prop.type === 'Identifier') {
        const routeKey = prop.name
        const scopeRoute = this.walker.getRouteByScope(scope, routeKey)
        if (scopeRoute) {
          return { routeSegment: undefined, routeFull: scopeRoute, errors }
        } else {
          errors.push(new Error(`unknown route key '${routeKey}'`))
          return { routeSegment: undefined, routeFull: undefined, errors }
        }
      }
    }

    // Case 3: Third argument is a CallExpression (e.g., .lets('page', 'news', Route0.create('any/string/here')))
    if (routeArg?.type === 'CallExpression') {
      const callee = routeArg.callee
      if (
        callee.type === 'MemberExpression' &&
        callee.property.type === 'Identifier' &&
        callee.property.name === 'create' &&
        callee.object.type === 'Identifier' &&
        callee.object.name === 'Route0'
      ) {
        const createArg = routeArg.arguments.at(0)
        if (createArg?.type === 'StringLiteral') {
          const routeFull = Route0.from(createArg.value)
          return { routeSegment: undefined, routeFull, errors }
        } else {
          errors.push(new Error(`Route0.create() first argument must be a string literal`))
          return { routeSegment: undefined, routeFull: undefined, errors }
        }
      } else {
        errors.push(new Error(`invalid route argument CallExpression`))
        return { routeSegment: undefined, routeFull: undefined, errors }
      }
    }

    // Case 4: No third argument - use pointName for page, empty string for layout
    if (!routeArg) {
      const routeSegment = pointType === 'page' ? pointName : ''
      return { routeSegment, routeFull: undefined, errors }
    }

    // Case 5: Invalid route argument type
    errors.push(new Error(`invalid route argument ${routeArg.type}`))
    return { routeSegment: undefined, routeFull: undefined, errors }
  }

  getPrefetchOnLinkHover(): boolean | number {
    // Go through self and parents (from child to parent)
    // Return the first prefetchOnLinkHover value found, or undefined if none found
    const points = this.getSelfAndParents()

    for (const point of points) {
      const result = this.findPrefetchOnHoverInChain(point.letsNodePath)
      if (result !== undefined) {
        return result
      }
    }

    // Not found anywhere, return undefined (default)
    return false
  }

  /**
   * Finds .prefetchOnLinkHover(value) call in the chain starting from letsNodePath.
   * Traverses up the AST tree to find the call.
   * Returns the boolean or number value if found, undefined otherwise.
   */
  private findPrefetchOnHoverInChain(letsNodePath: NodePath<Node>): boolean | number | undefined {
    // Traverse UP the AST tree (towards the ast root) to find .prefetchOnLinkHover() calls
    // Similar to getLastCalledMethodName(), but looking for a specific method
    let current: NodePath<Node> | null = letsNodePath.parentPath

    while (current) {
      // Check if this is a CallExpression with .prefetchOnLinkHover()
      if (current.node.type === 'CallExpression' && current.node.callee.type === 'MemberExpression') {
        const callee = current.node.callee
        if (callee.property.type === 'Identifier' && callee.property.name === 'prefetchOnLinkHover') {
          // Found .prefetchOnLinkHover() call, extract the argument value
          const valueArg = current.node.arguments.at(0)
          if (valueArg?.type === 'BooleanLiteral') {
            return valueArg.value
          } else if (valueArg?.type === 'NumericLiteral') {
            return valueArg.value
          }
          // If argument is not boolean or number, continue searching
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

    return undefined
  }

  getLayouts(): string[] {
    const layouts: string[] = []
    for (const point of this.parents) {
      if (point.pointType === 'layout') {
        layouts.push(point.pointName)
      }
    }
    return [...layouts].reverse()
  }

  simplify(): AstPointSimplified {
    return {
      file: nodeFsPath.basename(this.file.abs, nodeFsPath.extname(this.file.abs)),
      pointType: this.pointType,
      pointName: this.pointName,
      exportName: this.exportName,
      baseNodePath: !!this.baseNodePath,
      letsNodePath: !!this.letsNodePath,
      isBasePoint0: this.isBasePoint0,
      parents: this.parents.map((parent) => parent.extraSimplify()),
    }
  }

  extraSimplify(): AstPointExtraSimplified {
    return {
      file: this.file.abs,
      exportName: this.exportName,
    }
  }

  private readonly parsed: ParsedAstPoint | undefined = undefined
  parse(): ParsedAstPoint {
    if (this.parsed) {
      return this.parsed
    }
    const errors: unknown[] = []
    const scopes = this.getScopes()
    const scope = scopes.at(0)
    if (!scope) {
      errors.push(new Error('Scope not found. Looks like point not attached to any scope.'))
    }
    const exportName = this.exportName
    if (!exportName) {
      errors.push(new Error('Point not exported. Please, add export to the point.'))
    }
    const pos = this.getLetsPosition()
    if (!pos) {
      errors.push(new Error('Point position not found. We do not know what to do...'))
    }
    const { route, errors: routeErrors } = scope ? this.getRoute(scope) : { route: undefined, errors: [] }
    errors.push(...routeErrors)
    const polh = this.getPrefetchOnLinkHover()
    const layouts = this.getLayouts()
    const lastCalledMethodName = this.getLastCalledMethodName()
    if (lastCalledMethodName !== this.pointType) {
      errors.push(
        new Error(
          `Last called method name '${lastCalledMethodName || typeof lastCalledMethodName}' does not match point type '${this.pointType}'. Please, use .${this.pointType}() in end of point chain`,
        ),
      )
    }
    const valid = !errors.length

    return {
      scope,
      scopes,
      type: this.pointType,
      name: this.pointName,
      exportName,
      route,
      polh,
      layouts,
      pos,
      errors,
      valid,
    } as ParsedAstPointValid | ParsedAstPointInvalid
  }
}

export type AstPointSimplified = {
  file: string
  pointType: EndPointType
  pointName: PointName
  exportName: string | undefined
  baseNodePath: boolean
  letsNodePath: boolean
  isBasePoint0: boolean
  parents: AstPointExtraSimplified[]
}

export type AstPointExtraSimplified = Pick<AstPointSimplified, 'file' | 'exportName'>

export type ParsedAstPointPos = { file: string; line: number; column: number }
export type ParsedAstPointValid = {
  scope: PointsScope
  scopes: PointsScope[]
  type: EndPointType
  name: PointName
  exportName: string
  route: AnyRoute | undefined
  polh: boolean | number
  layouts: string[]
  file: WalkerFile
  pos: ParsedAstPointPos
  errors: unknown[]
  valid: true
}
export type ParsedAstPointInvalid = {
  scope: PointsScope | undefined
  scopes: PointsScope[]
  type: EndPointType
  name: PointName
  exportName: string | undefined
  route: AnyRoute | undefined
  polh: boolean | number | undefined
  layouts: string[]
  file: WalkerFile
  pos: ParsedAstPointPos | undefined
  errors: unknown[]
  valid: false
}
export type ParsedAstPoint = ParsedAstPointValid | ParsedAstPointInvalid

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

export class WalkerResolver {
  // TS Helpers

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
    if (WalkerResolver.tsConfigCache.has(dir)) {
      return WalkerResolver.tsConfigCache.get(dir) ?? null
    }

    // Check if TypeScript is available
    const ts = await WalkerResolver.getTypeScriptModule()
    if (!ts) {
      // Cache null for all directories to avoid repeated checks
      WalkerResolver.tsConfigCache.set(dir, null)
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
            WalkerResolver.tsConfigCache.set(dir, null)
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
            WalkerResolver.tsConfigCache.set(cacheDir, parsedConfig)
            cacheDir = nodeFsPath.dirname(cacheDir)
          }
          WalkerResolver.tsConfigCache.set(currentDir, parsedConfig)
          WalkerResolver.tsConfigCache.set(dir, parsedConfig)

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
    const ts = await WalkerResolver.getTypeScriptModule()
    if (!ts) {
      return undefined
    }

    const containingDir = nodeFsPath.dirname(containingFile)
    const tsConfig = await WalkerResolver.getTsConfigForDirectory({ dir: containingDir })
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
      const tsResolved = await WalkerResolver.resolveTsImport({ importPath, containingFile })
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
