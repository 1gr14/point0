import type { NodePath } from '@babel/traverse'
import type { Node } from '@babel/types'
import type { AnyRoute } from '@devp0nt/route0'
import { Route0 } from '@devp0nt/route0'
import type { EndPointType, PointName, PointsScope } from '@point0/core'
import { dedupeSlashes } from '@point0/core'
import * as nodeFsPath from 'node:path'
import type { CompilerFile } from './file.js'
import type { Walker } from './walker.js'

export class CompilerPoint {
  readonly walker: Walker
  readonly file: CompilerFile<true>
  readonly pointType: EndPointType
  readonly pointName: PointName
  readonly exportName: string | undefined
  readonly baseNodePath: NodePath<Node> // Point0.lets('page', 'name') ← "Point0" | root.lets('page', 'name') ← "root"
  readonly letsNodePath: NodePath<Node>
  readonly isBasePoint0: boolean // Point0.lets('page', 'name') ← true | root.lets('page', 'name') ← false

  constructor({
    walker,
    file,
    pointType,
    pointName,
    exportName,
    baseNodePath,
    letsNodePath,
    isBasePoint0,
  }: {
    walker: Walker
    file: CompilerFile<true>
    pointType: EndPointType
    pointName: PointName
    exportName: string | undefined
    baseNodePath: NodePath<Node>
    letsNodePath: NodePath<Node>
    isBasePoint0: boolean
  }) {
    this.walker = walker
    this.file = file
    this.pointType = pointType
    this.pointName = pointName
    this.exportName = exportName
    this.baseNodePath = baseNodePath
    this.letsNodePath = letsNodePath
    this.isBasePoint0 = isBasePoint0
  }

  get strpos(): string {
    return `${this.file.abs}:${this.letsNodePath.node.loc?.start.line || 0}:${this.letsNodePath.node.loc?.start.column || 0}`
  }

  getEarliestParentOrSelf({ parents }: { parents: CompilerPoint[] }): CompilerPoint {
    if (parents.length > 0) {
      return parents[parents.length - 1]
    }
    return this
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

  getScopes({ parents }: { parents: CompilerPoint[] }): PointsScope[] {
    const scopes: PointsScope[] = []
    for (const point of [this, ...parents]) {
      if (point.pointType === 'root') {
        scopes.push(point.pointName)
      }
    }
    return scopes.reverse()
  }

  getRoute({ scope, parents }: { scope: string; parents: CompilerPoint[] }): {
    errors: unknown[]
    route: AnyRoute | undefined
  } {
    const errors: unknown[] = []
    if (!['page', 'layout'].includes(this.pointType)) {
      return { errors, route: undefined }
    }

    // Go through self and parents (from child to parent)
    // getSelfAndParents() returns [this, ...this.parents] (child first)
    const points = [this, ...parents].reverse()
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

  getPrefetchOnLinkHover({ parents }: { parents: CompilerPoint[] }): boolean | number {
    // Go through self and parents (from child to parent)
    // Return the first prefetchOnLinkHover value found, or undefined if none found
    const points = [this, ...parents]

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

  getLayouts({ parents }: { parents: CompilerPoint[] }): string[] {
    const layouts: string[] = []
    for (const point of [...parents]) {
      if (point.pointType === 'layout') {
        layouts.push(point.pointName)
      }
    }
    return [...layouts].reverse()
  }

  simplify(): CompilerPointSimplified {
    return {
      file: nodeFsPath.basename(this.file.abs, nodeFsPath.extname(this.file.abs)),
      pointType: this.pointType,
      pointName: this.pointName,
      exportName: this.exportName,
      baseNodePath: !!this.baseNodePath,
      letsNodePath: !!this.letsNodePath,
      isBasePoint0: this.isBasePoint0,
    }
  }

  extraSimplify(): CompilerPointExtraSimplified {
    return {
      file: this.file.abs,
      pointName: this.pointName,
    }
  }

  private readonly _parse: CompilerPointParsed | undefined = undefined
  async parse(): Promise<CompilerPointParsed> {
    if (this._parse) {
      return this._parse
    }
    const errors: unknown[] = []
    const parentsResult = await this.walker.collectParentPointsByPoint({ point: this })
    errors.push(...parentsResult.errors)
    const parents = parentsResult.parents
    const scopes = this.getScopes({ parents })
    const scope = scopes.at(-1)
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
    const { route, errors: routeErrors } = scope ? this.getRoute({ scope, parents }) : { route: undefined, errors: [] }
    errors.push(...routeErrors)
    const polh = this.getPrefetchOnLinkHover({ parents })
    const layouts = this.getLayouts({ parents })
    const methods = this.getMethods()
    const lastCalledMethodName = methods.at(-1)?.name
    if (lastCalledMethodName !== this.pointType) {
      errors.push(
        new Error(
          `Last called method name '${lastCalledMethodName || typeof lastCalledMethodName}' does not match point type '${this.pointType}'. Please, use .${this.pointType}() in end of point chain`,
        ),
      )
    }
    const earliestPoint = this.getEarliestParentOrSelf({ parents })
    // we just check if the last parsed base point is Point0, so it is desired point, else it is not related to Point0, just looks like it, but not
    if (!earliestPoint.isBasePoint0) {
      errors.push(
        new Error(`Earliest point is not related to Point0. It is strange. Check it please: ${earliestPoint.strpos}`),
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
      strpos: this.strpos,
      errors,
      valid,
      file: this.file,
      original: this,
    } as CompilerPointParsedValid | CompilerPointParsedInvalid
  }

  static isSameParsedPoints(a: CompilerPointParsed, b: CompilerPointParsed): boolean {
    return (
      a.scope === b.scope &&
      a.scopes.every((s) => b.scopes.includes(s)) &&
      b.scopes.every((s) => a.scopes.includes(s)) &&
      a.type === b.type &&
      a.name === b.name &&
      a.exportName === b.exportName &&
      a.route?.definition === b.route?.definition &&
      a.polh === b.polh &&
      a.layouts.every((l) => b.layouts.includes(l)) &&
      b.layouts.every((l) => a.layouts.includes(l)) &&
      a.valid === b.valid &&
      a.file.abs === b.file.abs
    )
  }

  // shaker

  _getMethods: Array<{ nodePath: NodePath<Node>; name: string }> | undefined = undefined
  getMethods(): Array<{ nodePath: NodePath<Node>; name: string }> {
    if (this._getMethods) {
      return this._getMethods
    }
    // Find all methods nodesPaths and this methods names inside this point
    // Traverse UP the AST tree (towards the ast root) to find all CallExpressions
    // Similar to getLastCalledMethodName(), but collect all methods in the chain
    const methods: Array<{ nodePath: NodePath<Node>; name: string }> = []
    let current: NodePath<Node> | null = this.letsNodePath.parentPath

    while (current) {
      // If we find a CallExpression, check if its callee is a MemberExpression
      // This means we found a method call in the chain (e.g., .ctx(), .loader(), .page())
      if (current.node.type === 'CallExpression' && current.node.callee.type === 'MemberExpression') {
        const callee = current.node.callee
        if (callee.property.type === 'Identifier') {
          // Collect each method we find
          methods.push({
            nodePath: current,
            name: callee.property.name,
          })
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

    this._getMethods = methods
    return methods
  }

  private removeMethodArgs({ name }: { name: string }): void {
    // Find all method calls with the given name and remove their arguments
    const methods = this.getMethods()
    for (const method of methods) {
      if (method.name === name && method.nodePath.node.type === 'CallExpression') {
        // Clear all arguments
        method.nodePath.node.arguments = []
        this.file.modified = true
      }
    }
  }

  // private isMethodArgBooleanLiteral(name: string): boolean {
  //   // Check if the method has a single boolean literal argument
  //   const methods = this.methods
  //   for (const method of methods) {
  //     if (method.name === name && method.nodePath.node.type === 'CallExpression') {
  //       const args = method.nodePath.node.arguments
  //       if (args.length === 1 && args[0]?.type === 'BooleanLiteral') {
  //         return true
  //       }
  //     }
  //   }
  //   return false
  // }

  private removeMethodArgsIfNotBooleanLiteral({ name }: { name: string }): void {
    // Remove arguments from method calls if they're not boolean literals
    const methods = this.getMethods()
    for (const method of methods) {
      if (method.name === name && method.nodePath.node.type === 'CallExpression') {
        const args = method.nodePath.node.arguments
        // If there's exactly one argument and it's a boolean literal, keep it
        // Otherwise, remove all arguments
        if (!(args.length === 1 && args[0]?.type === 'BooleanLiteral')) {
          method.nodePath.node.arguments = []
          this.file.modified = true
        }
      }
    }
  }

  // private replaceLastMethodArgWithArrowFnReturnNull(name: string): void {
  //   // Replace the last argument of the method with an arrow function that returns null
  //   const methods = this.methods
  //   for (const method of methods) {
  //     if (method.name === name && method.nodePath.node.type === 'CallExpression') {
  //       const args = method.nodePath.node.arguments
  //       if (args.length > 0) {
  //         // Replace the last argument with an arrow function that returns null
  //         args[args.length - 1] = {
  //           type: 'ArrowFunctionExpression',
  //           id: null,
  //           generator: false,
  //           async: false,
  //           expression: true,
  //           params: [],
  //           body: {
  //             type: 'NullLiteral',
  //           },
  //         } as any
  //       }
  //     }
  //   }
  // }

  private shakeMethodsForClient(): void {
    this.removeMethodArgs({ name: 'ctx' })
    this.removeMethodArgsIfNotBooleanLiteral({ name: 'loader' })
  }

  private shakeMethodsForServer(): void {
    // Nothing here. For now we do not shake server side.
  }

  private _shake = false
  shakeMethods({ target }: { target: 'client' | 'server' }): void {
    if (this._shake) {
      return
    }
    if (target === 'client') {
      this.shakeMethodsForClient()
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    } else if (target === 'server') {
      this.shakeMethodsForServer()
    } else {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw new Error(`Invalid target: ${target}`)
    }
    this._shake = true
  }

  // prettifier

  private _addHmrFix = false
  addHmrFix({ policy }: { policy: 'function' | 'arrowFunction' | 'externalFunction' }): void {
    if (this._addHmrFix) {
      return
    }

    // Get the last method call in the chain (the topmost/final CallExpression)
    const methods = this.getMethods()
    if (methods.length === 0) {
      this._addHmrFix = true
      return
    }

    // The last method in the array is the final method call (e.g., .mutation(), .query())
    const lastMethod = methods[methods.length - 1]
    if (lastMethod.nodePath.node.type !== 'CallExpression') {
      this._addHmrFix = true
      return
    }

    // Check if point type is component, layout, or page and has functional component
    if (this.pointType === 'component' || this.pointType === 'layout' || this.pointType === 'page') {
      const hasValidEnding = lastMethod.name === this.pointType
      const lastMethodCall = lastMethod.nodePath.node
      const firstArg = lastMethodCall.arguments.at(0)
      const alreadyHasFunctionalComponent = hasValidEnding && !!firstArg
      if (alreadyHasFunctionalComponent) {
        // Check if the existing function type matches the policy
        const isArrowFunction = firstArg.type === 'ArrowFunctionExpression'
        const isFunctionExpression = firstArg.type === 'FunctionExpression'
        const needsConversion =
          (policy === 'function' && isArrowFunction) ||
          (policy === 'arrowFunction' && isFunctionExpression) ||
          (policy === 'externalFunction' && isArrowFunction)

        if (needsConversion) {
          // Handle externalFunction policy: extract arrow function to external named function
          if (policy === 'externalFunction' && isArrowFunction) {
            // Extract arrow function to external named function
            const arrowFn = firstArg as any
            // Generate function name: capitalize pointType + capitalize pointName
            // Example: page + home → PageHome, component + myComponent → ComponentMyComponent
            const functionName =
              this.pointType.charAt(0).toUpperCase() +
              this.pointType.slice(1) +
              (this.pointName.charAt(0).toUpperCase() + this.pointName.slice(1))

            // Convert arrow function body to function body
            let body = arrowFn.body
            if (body.type !== 'BlockStatement') {
              body = {
                type: 'BlockStatement' as const,
                body: [
                  {
                    type: 'ReturnStatement' as const,
                    argument: body,
                  },
                ],
              }
            }

            // Create FunctionDeclaration
            const functionDeclaration = {
              type: 'FunctionDeclaration' as const,
              id: {
                type: 'Identifier' as const,
                name: functionName,
              },
              generator: false,
              async: arrowFn.async || false,
              params: arrowFn.params || [],
              body,
            }

            // Find parent VariableDeclaration, ExportNamedDeclaration, or ExportDefaultDeclaration
            // We need to find the statement-level parent (not VariableDeclarator)
            const parentDecl = lastMethod.nodePath.findParent((p) => {
              const n = p.node
              return (
                n.type === 'VariableDeclaration' ||
                n.type === 'ExportNamedDeclaration' ||
                n.type === 'ExportDefaultDeclaration'
              )
            })

            if (parentDecl) {
              // Parse the file if not already parsed
              const parseResult = this.file.parse()
              if (parseResult.ok) {
                const program = parseResult.ast.program
                // Find the index of the parent declaration in the program body
                // parentDecl.node should be the ExportNamedDeclaration, ExportDefaultDeclaration, or VariableDeclaration
                const parentNode = parentDecl.node
                let parentIndex = -1

                // Try direct reference match first
                parentIndex = program.body.findIndex((stmt) => stmt === parentNode)

                // If not found, try structural matching
                if (parentIndex === -1) {
                  parentIndex = program.body.findIndex((stmt) => {
                    // If parentNode is VariableDeclaration but stmt is ExportNamedDeclaration wrapping it
                    if (stmt.type === 'ExportNamedDeclaration' && parentNode.type === 'VariableDeclaration') {
                      return stmt.declaration === parentNode
                    }
                    // If both are ExportDefaultDeclaration, compare by their declaration expressions
                    if (stmt.type === 'ExportDefaultDeclaration' && parentNode.type === 'ExportDefaultDeclaration') {
                      // Both are ExportDefaultDeclaration, check if they contain the same expression
                      // by comparing their declaration expressions
                      return stmt.declaration === parentNode.declaration
                    }
                    // If both are ExportNamedDeclaration, compare declarations
                    if (stmt.type === 'ExportNamedDeclaration' && parentNode.type === 'ExportNamedDeclaration') {
                      return stmt.declaration === parentNode.declaration
                    }
                    return false
                  })
                }

                if (parentIndex !== -1) {
                  program.body.splice(parentIndex, 0, functionDeclaration as any)
                  this.file.modified = true
                }
              }
            }

            // Replace arrow function with identifier reference
            lastMethodCall.arguments[0] = {
              type: 'Identifier' as const,
              name: functionName,
            } as any
            this.file.modified = true
          }
          // Convert the function to match the policy
          else if (policy === 'function' && isArrowFunction) {
            // Convert arrow function to function expression
            const arrowFn = firstArg as any
            // If arrow function has expression body (not BlockStatement), wrap it in return statement
            let body = arrowFn.body
            if (body.type !== 'BlockStatement') {
              body = {
                type: 'BlockStatement' as const,
                body: [
                  {
                    type: 'ReturnStatement' as const,
                    argument: body,
                  },
                ],
              }
            }
            const functionExpr = {
              type: 'FunctionExpression' as const,
              id: {
                type: 'Identifier' as const,
                name: 'X',
              },
              generator: false,
              async: arrowFn.async || false,
              params: arrowFn.params || [],
              body,
            }
            lastMethodCall.arguments[0] = functionExpr as any
            this.file.modified = true
          } else if (policy === 'arrowFunction' && isFunctionExpression) {
            // Convert function expression to arrow function
            const functionExpr = firstArg as any
            // Keep the body as is (BlockStatement stays as BlockStatement)
            const arrowFn = {
              type: 'ArrowFunctionExpression' as const,
              async: functionExpr.async || false,
              params: functionExpr.params || [],
              body: functionExpr.body || {
                type: 'BlockStatement' as const,
                body: [],
              },
            }
            lastMethodCall.arguments[0] = arrowFn as any
            this.file.modified = true
          }
        }
        // For page/layout/component points with existing functions, don't add HMR fix
        // Just convert if needed, then return
        this._addHmrFix = true
        return
      }
      // Otherwise, continue to add HMR fix (last method matches pointType and has no args)
    }

    // Create the function: function X() { return null }
    const makeFunctionDeclarationReturnNull = () => ({
      type: 'FunctionExpression' as const,
      id: {
        type: 'Identifier' as const,
        name: 'X',
      },
      generator: false,
      async: false,
      params: [],
      body: {
        type: 'BlockStatement' as const,
        body: [
          {
            type: 'ReturnStatement' as const,
            argument: { type: 'NullLiteral' as const },
          },
        ],
      },
    })

    // Create the function: () => { return null }
    const makeArrowFunctionExpressionReturnNull = () => ({
      type: 'ArrowFunctionExpression' as const,
      params: [],
      body: {
        type: 'BlockStatement' as const,
        body: [{ type: 'ReturnStatement' as const, argument: { type: 'NullLiteral' as const } }],
      },
    })

    const makeFunctionReturnNull =
      policy === 'function' // || policy === 'externalFunction' → it is not needed, becouse bun will break in this case (bun should never see named functions as components for some unknown reasons)
        ? makeFunctionDeclarationReturnNull
        : makeArrowFunctionExpressionReturnNull

    // Create MemberExpression: lastMethodCallNode._hmr
    const hmrMemberExpression = {
      type: 'MemberExpression' as const,
      object: lastMethod.nodePath.node,
      property: {
        type: 'Identifier' as const,
        name: '_hmr',
      },
      computed: false,
      optional: false,
    }

    // Create CallExpression: lastMethodCallNode._hmr(function X() { return null })
    const hmrCallExpression = {
      type: 'CallExpression' as const,
      callee: hmrMemberExpression,
      arguments: [makeFunctionReturnNull()],
      optional: false,
    }

    // Replace the original last method call node with the new one that has ._hmr() chained
    lastMethod.nodePath.replaceWith(hmrCallExpression as any)
    this.file.modified = true
    this._addHmrFix = true
  }
}

export type CompilerPointSimplified = {
  file: string
  pointType: EndPointType
  pointName: PointName
  exportName: string | undefined
  baseNodePath: boolean
  letsNodePath: boolean
  isBasePoint0: boolean
}

export type CompilerPointExtraSimplified = Pick<CompilerPointSimplified, 'file' | 'pointName'>

export type CompilerPointParsedPos = { file: string; line: number; column: number }
export type CompilerPointParsedValid = {
  scope: PointsScope
  scopes: PointsScope[]
  type: EndPointType
  name: PointName
  exportName: string
  route: AnyRoute | undefined
  polh: boolean | number
  layouts: string[]
  pos: CompilerPointParsedPos
  errors: unknown[]
  strpos: string
  valid: true
  file: CompilerFile<true>
  original: CompilerPoint
}
export type CompilerPointParsedInvalid = {
  scope: PointsScope | undefined
  scopes: PointsScope[]
  type: EndPointType
  name: PointName
  exportName: string | undefined
  route: AnyRoute | undefined
  polh: boolean | number | undefined
  layouts: string[]
  pos: CompilerPointParsedPos
  strpos: string | undefined
  errors: unknown[]
  valid: false
  file: CompilerFile<true>
  original: CompilerPoint
}
export type CompilerPointParsed = CompilerPointParsedValid | CompilerPointParsedInvalid
