import type { NodePath } from '@babel/traverse'
import type { Node } from '@babel/types'
import type { AnyRoute } from '@devp0nt/route0'
import { Route0 } from '@devp0nt/route0'
import type { EndPointType, PointName, PointsScope } from '@point0/core'
import { dedupeSlashes, toPascalCase } from '@point0/core'
import * as nodeFsPath from 'node:path'
import type { CompilerFile } from './file.js'
import type { Walker } from './walker.js'

// export type CompilerPointParsedValid = {
//   scope: PointsScope
//   scopes: PointsScope[]
//   type: EndPointType
//   name: PointName
//   exportName: string
//   route: AnyRoute | undefined
//   polh: boolean | number
//   layouts: string[]
//   pos: CompilerPointParsedPos
//   errors: unknown[]
//   strpos: string
//   valid: true
//   file: CompilerFile<true>
//   original: CompilerPoint
// }
// export type CompilerPointParsedInvalid = {
//   scope: PointsScope | undefined
//   scopes: PointsScope[]
//   type: EndPointType
//   name: PointName
//   exportName: string | undefined
//   route: AnyRoute | undefined
//   polh: boolean | number | undefined
//   layouts: string[]
//   pos: CompilerPointParsedPos
//   strpos: string | undefined
//   errors: unknown[]
//   valid: false
//   file: CompilerFile<true>
//   original: CompilerPoint
// }

export class CompilerPoint<TValid extends boolean = any> {
  readonly walker: Walker
  file: CompilerFile<true>
  readonly exportName: TValid extends true ? string : string | undefined
  readonly baseNodePath: NodePath<Node> // Point0.lets('page', 'name') ← "Point0" | root.lets('page', 'name') ← "root"
  readonly letsNodePath: NodePath<Node>
  readonly isBasePoint0: boolean // Point0.lets('page', 'name') ← true | root.lets('page', 'name') ← false

  parents: CompilerPoint[]
  selfMethods: Array<{ nodePath: NodePath<Node>; name: string; index: number }>
  chainMethods: CompilerPointChainMethod[]

  scope: TValid extends true ? PointsScope : PointsScope | undefined
  scopes: PointsScope[]
  type: EndPointType
  name: PointName
  route: AnyRoute | undefined
  polh: TValid extends true ? boolean | number : boolean | number | undefined
  layouts: string[]
  errors: unknown[]
  valid: TValid extends true ? true : false
  parsed: boolean

  constructor({
    walker,
    file,
    type,
    name,
    exportName,
    baseNodePath,
    letsNodePath,
    isBasePoint0,
  }: {
    walker: Walker
    file: CompilerFile<true>
    type: EndPointType
    name: PointName
    exportName: string | undefined
    baseNodePath: NodePath<Node>
    letsNodePath: NodePath<Node>
    isBasePoint0: boolean
  }) {
    this.walker = walker
    this.file = file
    this.exportName = exportName as TValid extends true ? string : string | undefined
    this.baseNodePath = baseNodePath
    this.letsNodePath = letsNodePath
    this.isBasePoint0 = isBasePoint0
    this.parents = []

    this.scope = undefined as TValid extends true ? PointsScope : PointsScope | undefined
    this.scopes = []
    this.type = type
    this.name = name
    this.route = undefined as AnyRoute | undefined
    this.polh = undefined as TValid extends true ? boolean | number : boolean | number | undefined
    this.layouts = []
    this.errors = []
    this.valid = false as TValid extends true ? true : false
    this.parsed = false
    this.selfMethods = []
    this.chainMethods = []

    file.addPointToMemory(this)
  }

  get stale(): boolean {
    return this.file.stale
  }

  get pos(): TValid extends true ? CompilerPointParsedPos : CompilerPointParsedPos | undefined {
    return this.letsNodePath.node.loc?.start
      ? {
          file: this.file.abs,
          line: this.letsNodePath.node.loc.start.line,
          column: this.letsNodePath.node.loc.start.column,
        }
      : (undefined as TValid extends true ? CompilerPointParsedPos : CompilerPointParsedPos | undefined)
  }

  get strpos(): string {
    return `${this.file.abs}:${this.letsNodePath.node.loc?.start.line || 0}:${this.letsNodePath.node.loc?.start.column || 0}`
  }

  static isSomeStale(points: CompilerPoint[]): boolean {
    return points.some((point) => point.stale)
  }

  getEarliestParentOrSelf(): CompilerPoint {
    if (this.parents.length > 0) {
      return this.parents[this.parents.length - 1]
    }
    return this
  }

  getFirstArgBooleanLiteral<TFallback>({
    nodePath,
    name,
    fallback,
  }: {
    nodePath: NodePath<Node>
    name: string
    fallback: TFallback
  }): TFallback | boolean {
    if (nodePath.node.type !== 'CallExpression') {
      return fallback
    }
    if (nodePath.node.callee.type !== 'MemberExpression') {
      return fallback
    }
    if (nodePath.node.callee.property.type !== 'Identifier') {
      return fallback
    }
    if (nodePath.node.callee.property.name !== name) {
      return fallback
    }
    const args = nodePath.node.arguments
    if (args.length === 0) {
      return fallback
    }
    const firstArg = args[0]
    if (firstArg.type !== 'BooleanLiteral') {
      return fallback
    }
    return firstArg.value
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
    for (const point of [this, ...this.parents]) {
      if (point.type === 'root') {
        scopes.push(point.name)
      }
    }
    return scopes.reverse()
  }

  getRoute({ scope }: { scope: string }): {
    errors: unknown[]
    route: AnyRoute | undefined
  } {
    const errors: unknown[] = []
    if (!['page', 'layout'].includes(this.type)) {
      return { errors, route: undefined }
    }

    // Go through self and parents (from child to parent)
    // getSelfAndParents() returns [this, ...this.parents] (child first)
    const points = [this, ...this.parents].reverse()
    const routeSegments: string[] = []

    // Process from child to parent (as returned by getSelfAndParents)
    for (const point of points) {
      if (!['page', 'layout'].includes(point.type)) {
        continue
      }

      const routeInfo = this.extractRouteFromLetsCall({
        letsNodePath: point.letsNodePath,
        pointType: point.type,
        pointName: point.name,
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
          errors.push(
            new Error(
              `unknown route key '${routeKey}' for scope '${scope}', you not provide routes, or provide routes for wrong scope`,
            ),
          )
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
    const points = [this, ...this.parents]

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
    for (const point of [...this.parents]) {
      if (point.type === 'layout') {
        layouts.push(point.name)
      }
    }
    return [...layouts].reverse()
  }

  simplify(): CompilerPointSimplified {
    return {
      file: nodeFsPath.basename(this.file.abs, nodeFsPath.extname(this.file.abs)),
      route: this.route ? this.route.definition : undefined,
      valid: this.valid,
      type: this.type,
      name: this.name,
      scopes: this.scopes,
      scope: this.scope,
      pos: this.pos,
      polh: this.polh,
      layouts: this.layouts,
      errors: this.errors.map((e: unknown) => (e instanceof Error ? e.message : String(e))),
      exportName: this.exportName,
      isBasePoint0: this.isBasePoint0,
      parents: this.parents.map((p) => p.extraSimplify()),
      selfMethods: this.selfMethods.map((m) => ({ name: m.name, index: m.index })),
      chainMethods: this.chainMethods.map((m) => ({
        name: m.name,
        index: m.index,
        chainIndex: m.chainIndex,
        point: m.point.name,
      })),
    }
  }

  extraSimplify(): CompilerPointExtraSimplified {
    return {
      file: this.file.abs,
      name: this.name,
    }
  }

  parse(): CompilerPoint {
    if (this.parsed) {
      return this
    }
    try {
      const parentsResult = this.walker.collectParentPointsByPoint({ point: this })
      this.errors.push(...parentsResult.errors)
      this.parents = parentsResult.parents

      this.scopes = this.getScopes()
      this.scope = this.scopes.at(-1) as TValid extends true ? PointsScope : PointsScope | undefined
      if (!this.scope) {
        this.errors.push(new Error('Scope not found. Looks like point not attached to any scope.'))
      }
      if (!this.exportName) {
        this.errors.push(new Error('Point not exported. Please, add export to the point.'))
      }

      if (!this.pos) {
        this.errors.push(new Error('Point position not found. We do not know what to do...'))
      }

      const { route, errors: routeErrors } = this.scope
        ? this.getRoute({ scope: this.scope })
        : { route: undefined, errors: [] }
      this.route = route
      this.errors.push(...routeErrors)
      this.polh = this.getPrefetchOnLinkHover()
      this.layouts = this.getLayouts()
      this.selfMethods = this.getSelfMethods()

      const lastCalledMethodName = this.selfMethods.at(-1)?.name
      if (lastCalledMethodName !== this.type) {
        this.errors.push(
          new Error(
            `Last called method name '${lastCalledMethodName || typeof lastCalledMethodName}' does not match point type '${this.type}'. Please, use .${this.type}() in end of point chain`,
          ),
        )
      }

      const earliestPoint = this.getEarliestParentOrSelf()
      // we just check if the last parsed base point is Point0, so it is desired point, else it is not related to Point0, just looks like it, but not
      if (!earliestPoint.isBasePoint0) {
        this.errors.push(
          new Error(`Earliest point is not related to Point0. It is strange. Check it please: ${earliestPoint.strpos}`),
        )
      }
      this.chainMethods = this.getChainMethods()

      this.valid = !this.errors.length as TValid extends true ? true : false
      this.parsed = true
    } catch (e) {
      this.errors.push(e)
      this.valid = false as TValid extends true ? true : false
      this.parsed = true
    }
    return this
  }

  static isGenerallySamePoint(a: CompilerPoint, b: CompilerPoint): boolean {
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

  private _getSelfMethods: Array<{ nodePath: NodePath<Node>; name: string; index: number }> | undefined = undefined
  getSelfMethods(): Array<{ nodePath: NodePath<Node>; name: string; index: number }> {
    if (this._getSelfMethods) {
      return this._getSelfMethods
    }
    // Find all methods nodesPaths and this methods names inside this point
    // Traverse UP the AST tree (towards the ast root) to find all CallExpressions
    // Similar to getLastCalledMethodName(), but collect all methods in the chain
    const methods: Array<{ nodePath: NodePath<Node>; name: string; index: number }> = []
    let current: NodePath<Node> | null = this.letsNodePath.parentPath
    let index = 0

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
            index,
          })
          index++
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

    this._getSelfMethods = methods
    this.selfMethods = methods
    return methods
  }

  private _getChainMethods: CompilerPointChainMethod[] | undefined = undefined
  getChainMethods(): CompilerPointChainMethod[] {
    if (this._getChainMethods) {
      return this._getChainMethods
    }
    const chainMethods: CompilerPointChainMethod[] = []
    let chainIndex = 0
    let underSsr = false
    let underClientLoader = false
    for (const point of [this, ...this.parents].reverse()) {
      const methods = point.getSelfMethods()
      for (const method of methods) {
        if (method.name === 'ssr') {
          underSsr = this.getFirstArgBooleanLiteral({ nodePath: method.nodePath, name: 'ssr', fallback: underSsr })
        }
        if (method.name === 'clientLoader') {
          const firstArgBoolean = this.getFirstArgBooleanLiteral({
            nodePath: method.nodePath,
            name: 'clientLoader',
            fallback: undefined,
          })
          if (firstArgBoolean !== undefined) {
            // .clientLoader() | .clientLoader(() => ...)
            underClientLoader = true
          }
          if (firstArgBoolean === false) {
            // .clientLoader(false) we disables clientLoaders
            underClientLoader = false
          } else {
            // .clientLoader(true) we enable clientLoaders
            underClientLoader = true
          }
        }
        chainMethods.push({
          nodePath: method.nodePath,
          name: method.name,
          index: method.index,
          chainIndex,
          underSsr,
          underClientLoader,
          point,
        })
        chainIndex++
      }
    }
    this._getChainMethods = chainMethods
    this.chainMethods = chainMethods
    return chainMethods
  }

  getSelfRichMethods(): CompilerPointChainMethod[] {
    return this.chainMethods.filter((m) => m.point === this)
  }

  private removeMethodArgs({ nodePath }: { nodePath: NodePath<Node> }): void {
    if (nodePath.node.type !== 'CallExpression') {
      return
    }
    if (nodePath.node.callee.type !== 'MemberExpression') {
      return
    }
    if (nodePath.node.callee.property.type !== 'Identifier') {
      return
    }
    nodePath.node.arguments = []
    this.file.modified = true
  }

  private removeArgsIfNotBooleanLiteral({ nodePath }: { nodePath: NodePath<Node> }): void {
    if (nodePath.node.type !== 'CallExpression') {
      return
    }
    if (nodePath.node.callee.type !== 'MemberExpression') {
      return
    }
    if (nodePath.node.callee.property.type !== 'Identifier') {
      return
    }
    // Remove arguments from method calls if they're not boolean literals
    const args = nodePath.node.arguments
    // If there's exactly one argument and it's a boolean literal, keep it
    // Otherwise, remove all arguments
    if (!(args.length === 1 && args[0]?.type === 'BooleanLiteral')) {
      nodePath.node.arguments = []
      this.file.modified = true
    }
  }

  private replaceLastArgWithArrowFnReturnNull({ nodePath }: { nodePath: NodePath<Node> }): void {
    if (nodePath.node.type !== 'CallExpression') {
      return
    }
    if (nodePath.node.callee.type !== 'MemberExpression') {
      return
    }
    if (nodePath.node.callee.property.type !== 'Identifier') {
      return
    }
    if (nodePath.node.arguments.length === 0) {
      return
    }
    nodePath.node.arguments[nodePath.node.arguments.length - 1] = {
      type: 'ArrowFunctionExpression' as const,
      id: null,
      generator: false,
      async: false,
      expression: true,
      params: [],
      body: {
        type: 'NullLiteral' as const,
      },
    } as any
    this.file.modified = true
  }

  private shakeMethodsForClient(): void {
    for (const method of this.getSelfRichMethods()) {
      if (method.name === 'ctx') {
        this.removeMethodArgs({ nodePath: method.nodePath })
      }
      if (method.name === 'loader') {
        this.removeArgsIfNotBooleanLiteral({ nodePath: method.nodePath })
      }
    }
  }

  private shakeMethodsForServer(): void {
    // TODO: add all pruners for server side
    // when method underSsr, then we prune on nossr-server
    // when method underClientLoader, then we prune it on nossr-server
    for (const method of this.getSelfRichMethods()) {
      if (method.name === 'clientLoader') {
        this.removeArgsIfNotBooleanLiteral({ nodePath: method.nodePath })
      }
      if (['scrollPosition', 'scrollRestore', 'onPrefetch', 'prefetchOnLinkHover', 'mutation'].includes(method.name)) {
        this.removeMethodArgs({ nodePath: method.nodePath })
      } else if (!method.underSsr) {
        if (method.name === 'page') {
          this.replaceLastArgWithArrowFnReturnNull({ nodePath: method.nodePath })
        } else if (
          [
            'error',
            'layoutError',
            'pageError',
            'componentError',
            'layoutLoading',
            'pageLoading',
            'componentLoading',
            'loading',
            'wrapper',
            'outer',
            'component',
            'layout',
            // 'query',
            // 'infiniteQuery',
            // 'mutationOptions',
            // 'queryOptions',
            // 'infiniteQueryOptions',
            // 'pageQueryOptions',
            // 'componentQueryOptions',
            // 'providerQueryOptions',
            // 'layoutQueryOptions',
            // 'fetchOptions',
          ].includes(method.name)
        ) {
          this.removeMethodArgs({ nodePath: method.nodePath })
        }
      } else if (method.underClientLoader) {
        if (method.name === 'page') {
          this.replaceLastArgWithArrowFnReturnNull({ nodePath: method.nodePath })
        } else if (['component', 'layout'].includes(method.name)) {
          this.removeMethodArgs({ nodePath: method.nodePath })
        }
      }
    }
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

  private generateUniqueIdentifier(baseName: string): string {
    let candidateName = baseName
    let counter = 0

    while (this.file.isIdentifierExists(candidateName)) {
      candidateName = `${baseName}${counter}`
      counter++
    }

    return candidateName
  }

  private _addHmrFix = false
  addHmrFix({ policy }: { policy: 'function' | 'arrowFunction' | 'externalFunction' }): void {
    if (this._addHmrFix) {
      return
    }

    // Get the last method call in the chain (the topmost/final CallExpression)
    const methods = this.getSelfMethods()
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
    if (this.type === 'component' || this.type === 'layout' || this.type === 'page') {
      const hasValidEnding = lastMethod.name === this.type
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

            // Check if name exists and generate unique name if needed
            const functionName = this.generateUniqueIdentifier(toPascalCase(this.type + '_' + this.name))

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
  route: string | undefined
  valid: boolean
  type: EndPointType
  name: PointName
  scopes: PointsScope[]
  scope: PointsScope | undefined
  pos: { column: number; line: number } | undefined
  polh: boolean | number | undefined
  layouts: string[]
  errors: string[]
  exportName: string | undefined
  isBasePoint0: boolean
  parents: CompilerPointExtraSimplified[]
  selfMethods: Array<{ name: string; index: number }>
  chainMethods: Array<{ name: string; index: number; chainIndex: number; point: CompilerPointExtraSimplified['name'] }>
}

export type CompilerPointExtraSimplified = Pick<CompilerPointSimplified, 'file' | 'name'>

export type CompilerPointParsedPos = { file: string; line: number; column: number }

export type CompilerPointChainMethod = {
  nodePath: NodePath<Node>
  name: string
  index: number
  chainIndex: number
  underSsr: boolean
  underClientLoader: boolean
  point: CompilerPoint
}
