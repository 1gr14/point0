import type { NodePath } from '@babel/traverse'
import type { Node } from '@babel/types'
import type { AnyRoute } from '@devp0nt/route0'
import { Route0 } from '@devp0nt/route0'
import type { EndPointType, PointName, PointsScope } from '@point0/core'
import { dedupeSlashes } from '@point0/core'
import * as nodeFsPath from 'node:path'
import type { Collector } from './collector.js'
import type { CompilerFile } from './file.js'

export class CompilerPoint {
  readonly collector: Collector
  readonly file: CompilerFile
  readonly pointType: EndPointType
  readonly pointName: PointName
  readonly exportName: string | undefined
  readonly baseNodePath: NodePath<Node> // Point0.lets('page', 'name') ← "Point0" | root.lets('page', 'name') ← "root"
  readonly letsNodePath: NodePath<Node>
  readonly isBasePoint0: boolean // Point0.lets('page', 'name') ← true | root.lets('page', 'name') ← false
  readonly baseCompilerPoint: CompilerPoint | undefined
  readonly parents: CompilerPoint[]

  constructor({
    collector,
    file,
    pointType,
    pointName,
    exportName,
    baseNodePath,
    letsNodePath,
    isBasePoint0,
    baseCompilerPoint,
  }: {
    collector: Collector
    file: CompilerFile
    pointType: EndPointType
    pointName: PointName
    exportName: string | undefined
    baseNodePath: NodePath<Node>
    letsNodePath: NodePath<Node>
    isBasePoint0: boolean
    baseCompilerPoint: CompilerPoint | undefined
  }) {
    this.collector = collector
    this.file = file
    this.pointType = pointType
    this.pointName = pointName
    this.exportName = exportName
    this.baseNodePath = baseNodePath
    this.letsNodePath = letsNodePath
    this.isBasePoint0 = isBasePoint0
    this.baseCompilerPoint = baseCompilerPoint
    this.parents = []
    let parent: CompilerPoint | undefined = baseCompilerPoint
    while (parent) {
      this.parents.push(parent)
      parent = parent.baseCompilerPoint
    }
  }

  getLastParentOrSelf(): CompilerPoint {
    if (this.parents.length > 0) {
      return this.parents[this.parents.length - 1]
    }
    return this
  }

  getSelfAndParents(): CompilerPoint[] {
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
        const scopeRoute = this.collector.getRouteByScope(scope, routeKey)
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

  simplify(): CompilerPointSimplified {
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

  extraSimplify(): CompilerPointExtraSimplified {
    return {
      file: this.file.abs,
      exportName: this.exportName,
    }
  }

  private readonly _parsed: CompilerPointParsed | undefined = undefined
  get parsed(): CompilerPointParsed {
    if (this._parsed) {
      return this._parsed
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

  // pruner

  _methods: Array<{ nodePath: NodePath<Node>; name: string }> | undefined = undefined
  get methods(): Array<{ nodePath: NodePath<Node>; name: string }> {
    if (this._methods) {
      return this._methods
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

    // Reverse to get methods in order from .lets() to final method (e.g., .ctx(), .loader(), .page())
    this._methods = methods.reverse()
    return this._methods
  }

  private removeMethodArgs({
    name,
    target,
    isEngineHolderBuildPhase,
  }: {
    name: string
    target: 'client' | 'server'
    isEngineHolderBuildPhase?: boolean
  }): void {
    // Find all method calls with the given name and remove their arguments
    const methods = this.methods
    for (const method of methods) {
      if (method.name === name && method.nodePath.node.type === 'CallExpression') {
        // Clear all arguments
        method.nodePath.node.arguments = []
        this.file.setTargetAstModified({ target, isEngineHolderBuildPhase })
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

  private removeMethodArgsIfNotBooleanLiteral({
    name,
    target,
    isEngineHolderBuildPhase,
  }: {
    name: string
    target: 'client' | 'server'
    isEngineHolderBuildPhase?: boolean
  }): void {
    // Remove arguments from method calls if they're not boolean literals
    const methods = this.methods
    for (const method of methods) {
      if (method.name === name && method.nodePath.node.type === 'CallExpression') {
        const args = method.nodePath.node.arguments
        // If there's exactly one argument and it's a boolean literal, keep it
        // Otherwise, remove all arguments
        if (!(args.length === 1 && args[0]?.type === 'BooleanLiteral')) {
          method.nodePath.node.arguments = []
          this.file.setTargetAstModified({ target, isEngineHolderBuildPhase })
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

  private pruneForClient({ isEngineHolderBuildPhase }: { isEngineHolderBuildPhase?: boolean }): void {
    this.removeMethodArgs({ name: 'ctx', target: 'client', isEngineHolderBuildPhase })
    this.removeMethodArgsIfNotBooleanLiteral({ name: 'loader', target: 'client', isEngineHolderBuildPhase })
  }

  private pruneForServer({ isEngineHolderBuildPhase }: { isEngineHolderBuildPhase?: boolean }): void {
    // Nothing here. For now we do not prune server side.
  }

  private readonly _prune: string[] = []
  prune({
    target,
    isEngineHolderBuildPhase,
  }: {
    target: 'client' | 'server'
    isEngineHolderBuildPhase?: boolean
  }): void {
    const key = this.file.getTargetKey({ target, isEngineHolderBuildPhase })
    if (this._prune.includes(key)) {
      return
    }
    if (!this.file.isRead()) {
      throw new Error(`File ${this.file.abs} is not read yet`)
    }
    if (!this.file.isParsed()) {
      this.file.parse()
    }
    if (target === 'client') {
      this.pruneForClient({ isEngineHolderBuildPhase })
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    } else if (target === 'server') {
      this.pruneForServer({ isEngineHolderBuildPhase })
    } else {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw new Error(`Invalid target: ${target}`)
    }
    this._prune.push(key)
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
  parents: CompilerPointExtraSimplified[]
}

export type CompilerPointExtraSimplified = Pick<CompilerPointSimplified, 'file' | 'exportName'>

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
  valid: true
  file: CompilerFile
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
  pos: CompilerPointParsedPos | undefined
  errors: unknown[]
  valid: false
  file: CompilerFile
  original: CompilerPoint
}
export type CompilerPointParsed = CompilerPointParsedValid | CompilerPointParsedInvalid
