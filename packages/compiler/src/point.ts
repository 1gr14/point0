import type { NodePath } from '@babel/traverse'
import type { Node } from '@babel/types'
import * as t from '@babel/types'
import { Route0 } from '@devp0nt/route0'
import type { AnyRoute } from '@devp0nt/route0'
import { type PointName, type PointsScope, type ReadyPointType, toPascalCase } from '@point0/core'
import * as nodeFsPath from 'node:path'
import type { CompilerFile } from './file.js'
import type { Walker } from './walker.js'

export class CompilerPoint<TValid extends boolean = boolean> {
  readonly walker: Walker
  file: CompilerFile<true>
  // readonly exportName: TValid extends true ? string : string | undefined
  // plugins can be not exported, and bases can be not exported
  readonly exportName: string | undefined
  readonly baseNodePath: NodePath<Node> // Point0.lets('page', 'name', '/') ← "Point0" | root.lets('page', 'name', '/') ← "root"
  readonly letsNodePath: NodePath<Node>
  readonly isBasePoint0: boolean // Point0.lets('page', 'name', '/') ← true | root.lets('page', 'name', '/') ← false

  parents: CompilerPoint[]
  selfMethods: Array<{ nodePath: NodePath<Node>; name: string; index: number }>
  chainMethods: CompilerPointChainMethod[]

  scope: TValid extends true ? PointsScope : PointsScope | undefined
  scopes: PointsScope[]
  type: ReadyPointType
  name: PointName
  route: AnyRoute | undefined
  ssr: boolean
  polh: TValid extends true ? boolean | number : boolean | number | undefined
  layouts: string[]
  errors: unknown[]
  valid: TValid extends true ? true : false
  parsed: boolean
  basepath: AnyRoute | undefined
  endpoint: undefined | { method: string; route: AnyRoute }
  tags: string[]
  description: string | undefined

  constructor({
    walker,
    file,
    type,
    name,
    exportName,
    baseNodePath,
    letsNodePath,
    isBasePoint0,
    ssr,
  }: {
    walker: Walker
    file: CompilerFile<true>
    type: ReadyPointType
    name: PointName
    exportName: string | undefined
    baseNodePath: NodePath<Node>
    letsNodePath: NodePath<Node>
    isBasePoint0: boolean
    ssr: boolean
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
    this.basepath = undefined
    this.ssr = ssr
    this.tags = []
    this.description = undefined

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

  static toId({
    scope,
    type,
    name,
  }: {
    scope: PointsScope | undefined
    type: ReadyPointType
    name: PointName
  }): string {
    return `${scope ?? 'undefined'}.${type}.${name}`
  }

  static isLetsTypeSugarCall({ node }: { node: Node }): boolean {
    if (!t.isCallExpression(node)) return false
    const callee = node.callee
    if (!t.isMemberExpression(callee)) return false
    if (!t.isIdentifier(callee.property) || callee.computed) return false
    if (!t.isMemberExpression(callee.object)) return false
    if (!t.isIdentifier(callee.object.property) || callee.object.computed) return false
    if (callee.object.property.name !== 'lets') return false
    return callee.property.name in POINT_METHOD_TO_TYPE_MAP
  }

  static inferPointNameFromSugarContext({
    type,
    callPath,
    absPath,
  }: {
    type: ReadyPointType
    callPath: NodePath<Node>
    absPath: string
  }): string {
    const varDecl = callPath.findParent((p) => p.node.type === 'VariableDeclarator')
    if (varDecl?.node.type === 'VariableDeclarator' && varDecl.node.id.type === 'Identifier') {
      const nameFromVariable = this.removeTypeSuffixFromVariableName({
        variableName: varDecl.node.id.name,
        pointType: type,
      })
      if (nameFromVariable.length > 0) {
        return nameFromVariable
      }
      if (type === 'root') {
        return 'root'
      }
      return this.inferNameFromFilePath({ absPath })
    }

    const defaultDecl = callPath.findParent((p) => p.node.type === 'ExportDefaultDeclaration')
    if (defaultDecl) {
      return this.inferNameFromFilePath({ absPath })
    }

    return this.inferNameFromFilePath({ absPath })
  }

  private static inferNameFromFilePath({ absPath }: { absPath: string }): string {
    const parsed = nodeFsPath.parse(absPath)
    if (parsed.name === 'index') {
      return nodeFsPath.basename(parsed.dir)
    }
    return parsed.name
  }

  private static removeTypeSuffixFromVariableName({
    variableName,
    pointType,
  }: {
    variableName: string
    pointType: ReadyPointType
  }): string {
    const capitalizedType = pointType.slice(0, 1).toUpperCase() + pointType.slice(1)
    const snakeType = pointType.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`)
    const candidates = [`_${snakeType}`, `_${pointType}`, capitalizedType, pointType]
    if (pointType === 'infiniteQuery') {
      candidates.push('Query', '_query')
    }
    const sortedCandidates = candidates.sort((a, b) => b.length - a.length)
    for (const candidate of sortedCandidates) {
      if (!variableName.endsWith(candidate)) {
        continue
      }
      const candidateFree = variableName.slice(0, variableName.length - candidate.length)
      return candidateFree
    }
    return variableName
  }

  get id(): string {
    return CompilerPoint.toId({
      scope: this.scope,
      type: this.type,
      name: this.name,
    })
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

  getPageOrLayoutRoute({ scope }: { scope: string }): {
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
      if (['page', 'layout'].includes(point.type)) {
        const routeInfo = this.extractRouteFromPageOrLayoutLetsCall({
          letsNodePath: point.letsNodePath,
          pointType: point.type,
          scope,
        })
        errors.push(...routeInfo.errors)

        // If we found a full route (from routes.xxx or Route0.create), it's final
        // only in case if it is self point
        // else we collect segments
        const routeFull = routeInfo.routeFull
        if (routeFull) {
          if (point === this) {
            return { errors, route: this.respectBasepath(routeFull) }
          } else {
            routeSegments.splice(0, routeSegments.length, routeFull.definition)
          }
        }

        // Otherwise, collect the segment for later concatenation
        if (routeInfo.routeSegment !== undefined) {
          routeSegments.push(routeInfo.routeSegment) // Add to end (child segments first in array)
        }
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
        return { errors, route: this.respectBasepath(Route0.from('/')) }
      }

      // Start with first segment as base route
      let finalRoute: AnyRoute = Route0.from(nonEmptySegments[0])
      // Extend with remaining segments
      for (let i = 1; i < nonEmptySegments.length; i++) {
        finalRoute = finalRoute.extend(nonEmptySegments[i]) as AnyRoute
      }
      return { errors, route: this.respectBasepath(finalRoute) }
    }

    return { errors, route: undefined }
  }

  private respectBasepath(route: AnyRoute): AnyRoute {
    return this.basepath ? this.basepath.extend(route.definition) : route
  }

  private extractRouteFromPageOrLayoutLetsCall({
    letsNodePath,
    pointType,
    scope,
  }: {
    letsNodePath: NodePath<Node>
    pointType: ReadyPointType
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
        errors.push(new Error(`Invalid route argument CallExpression`))
        return { routeSegment: undefined, routeFull: undefined, errors }
      }
    }

    // deprecated
    // // Case 4: No third argument - use pointName for page, empty string for layout
    // if (!routeArg) {
    //   const routeSegment = pointType === 'page' ? pointName : ''
    //   return { routeSegment, routeFull: undefined, errors }
    // }

    // Case 4 if it is layout, then it is '/' if not provided
    if (pointType === 'layout' && !routeArg) {
      return { routeSegment: '/', routeFull: undefined, errors }
    }

    // Case 5: Invalid route argument type
    errors.push(new Error(`Invalid route argument ${routeArg?.type ?? 'undefined'}`))
    return { routeSegment: undefined, routeFull: undefined, errors }
  }

  private getMethodRoutePolicyFromActionLetsCall({ scope }: { scope: string }): {
    method?: string
    route?: AnyRoute
    policy: 'full' | 'short'
    errors: unknown[]
  } {
    // full: lets('action', 'actionName', 'POST', '/api/users')
    // short: lets('POST', '/api/users')
    // in route we still can have Route0.create('api/users') then it is route, then we do not respect basepath as usual in page
    const errors: unknown[] = []
    const letsNode = this.letsNodePath.node

    if (this.type !== 'action') {
      return { method: undefined, route: undefined, policy: 'full', errors }
    }

    if (letsNode.type !== 'CallExpression') {
      errors.push(new Error('Action lets() node is not a CallExpression.'))
      return { method: undefined, route: undefined, policy: 'full', errors }
    }

    const firstArg = letsNode.arguments.at(0)
    const isShorthand = firstArg?.type === 'StringLiteral' && ACTION_METHODS.has(firstArg.value)
    const policy: 'full' | 'short' = isShorthand ? 'short' : 'full'

    const methodArg = letsNode.arguments.at(isShorthand ? 0 : 2)
    const routeArg = letsNode.arguments.at(isShorthand ? 1 : 3)

    const method = methodArg?.type === 'StringLiteral' ? methodArg.value.toUpperCase() : undefined
    if (!method) {
      errors.push(new Error('Action method not found or invalid.'))
    }

    if (!routeArg) {
      errors.push(new Error('Action route not found.'))
      return { method, route: undefined, policy, errors }
    }

    if (routeArg.type === 'StringLiteral') {
      return { method, route: this.respectBasepath(Route0.from(routeArg.value)), policy, errors }
    }

    if (routeArg.type === 'MemberExpression') {
      const prop = routeArg.property
      if (prop.type === 'Identifier') {
        const routeKey = prop.name
        const scopeRoute = this.walker.getRouteByScope(scope, routeKey)
        if (scopeRoute) {
          return { method, route: this.respectBasepath(scopeRoute), policy, errors }
        }
        errors.push(
          new Error(
            `Unknown route key '${routeKey}' for scope '${scope}', you not provide routes, or provide routes for wrong scope`,
          ),
        )
        return { method, route: undefined, policy, errors }
      }
    }

    if (routeArg.type === 'CallExpression') {
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
          return { method, route: this.respectBasepath(Route0.from(createArg.value)), policy, errors }
        }
        errors.push(new Error(`Route0.create() first argument must be a string literal`))
        return { method, route: undefined, policy, errors }
      }
      errors.push(new Error(`Invalid route argument CallExpression`))
      return { method, route: undefined, policy, errors }
    }

    errors.push(new Error(`Invalid route argument ${routeArg.type}`))
    return { method, route: undefined, policy, errors }
  }

  getPrefetchOnLinkHover(): boolean | number {
    // Go through chain methods (from child to parent), return first prefetchPageOnLinkHover value found.
    for (const method of [...this.chainMethods].reverse()) {
      if (method.name === 'prefetchPageOnLinkHover') {
        if (method.nodePath.node.type !== 'CallExpression') {
          continue
        }
        const firstArg = method.nodePath.node.arguments.at(0)
        if (!firstArg) {
          continue
        }
        const secondArg = method.nodePath.node.arguments.at(1)
        const duration = secondArg?.type === 'NumericLiteral' ? secondArg.value : undefined
        if (firstArg.type === 'BooleanLiteral') {
          if (!firstArg.value) {
            return false
          }
          return duration ?? true
        }
        if (firstArg.type === 'StringLiteral') {
          if (firstArg.value === 'none') {
            return false
          }
          return duration ?? true
        }
      }
    }
    return false
  }

  getBasepath(): AnyRoute | undefined {
    let basepath = undefined as AnyRoute | undefined
    for (const method of this.chainMethods) {
      if (method.name === 'basepath') {
        const nodePath = method.nodePath
        if (nodePath.node.type !== 'CallExpression' || nodePath.node.arguments.length === 0) {
          continue
        }
        const firstArg = nodePath.node.arguments[0]
        if (firstArg.type === 'StringLiteral') {
          basepath = basepath ? basepath.extend(firstArg.value) : Route0.create(firstArg.value)
        }
      }
    }
    return basepath
  }

  getSsr(): boolean {
    const lastChainMethod = this.chainMethods.at(-1)
    if (!lastChainMethod) {
      return false
    }
    return lastChainMethod.underSsr
  }

  private getAllowedLastMethodNames(): string[] {
    if (this.type !== 'action') {
      return [this.type]
    }
    return ['action', 'query', 'mutation', 'infiniteQuery']
  }

  hasLoaders(): boolean {
    return this.selfMethods.some((method) => method.name === 'loader')
  }

  getLayouts(): string[] {
    const layouts: string[] = []
    for (const point of [this, ...this.parents]) {
      for (const method of point.selfMethods) {
        if (method.name === 'layout' && point.type !== 'layout') {
          const layoutNames = this.resolveLayoutsFromLayoutMethod({
            methodNodePath: method.nodePath,
            point,
          })
          layouts.push(...layoutNames)
        }
      }
      if (point.type === 'layout' && point !== this) {
        layouts.push(point.name)
      }
    }
    return [...new Set(layouts)].reverse()
  }

  getTags(): string[] {
    const tags: string[] = []
    for (const method of this.chainMethods) {
      if (method.name !== 'tag') {
        continue
      }
      if (method.nodePath.node.type !== 'CallExpression') {
        continue
      }
      for (const arg of method.nodePath.node.arguments) {
        if (arg.type === 'StringLiteral') {
          tags.push(arg.value)
        }
      }
    }
    return [...new Set(tags)]
  }

  getDescription(): string | undefined {
    const descriptions: string[] = []
    for (const method of this.chainMethods) {
      if (method.name !== 'description') {
        continue
      }
      if (method.nodePath.node.type !== 'CallExpression') {
        continue
      }
      const firstArg = method.nodePath.node.arguments.at(0)
      if (firstArg?.type === 'StringLiteral' && firstArg.value) {
        descriptions.push(firstArg.value)
      }
    }
    return descriptions.length > 0 ? descriptions.join('\n\n') : undefined
  }

  private resolveLayoutsFromLayoutMethod({
    methodNodePath,
    point,
  }: {
    methodNodePath: NodePath<Node>
    point: CompilerPoint
  }): string[] {
    if (methodNodePath.node.type !== 'CallExpression') {
      return []
    }
    const firstArgNodePath = methodNodePath.get('arguments').at(0)
    if (firstArgNodePath?.node.type !== 'Identifier') {
      return []
    }

    const resolvedBase = this.walker.findBaseLetsNodePathByBaseNodePath({
      baseNodePath: firstArgNodePath,
      file: point.file,
    })
    if (!resolvedBase.isFound || resolvedBase.baseLetsNodePath.node.type !== 'CallExpression') {
      return []
    }

    const firstArg = resolvedBase.baseLetsNodePath.node.arguments.at(0)
    const secondArg = resolvedBase.baseLetsNodePath.node.arguments.at(1)
    if (firstArg?.type !== 'StringLiteral' || firstArg.value !== 'layout' || secondArg?.type !== 'StringLiteral') {
      return []
    }
    const layoutName = secondArg.value

    let layoutPoint = resolvedBase.baseFile.getPointFormMemoryByLetsNodePath(resolvedBase.baseLetsNodePath)

    // Avoid re-entering collection for the same file while it is being parsed.
    if (!layoutPoint && resolvedBase.baseFile.abs !== point.file.abs) {
      const filePointsResult = this.walker.collectPointsFromFile({ file: resolvedBase.baseFile })
      if (filePointsResult.ok) {
        layoutPoint = filePointsResult.points.find((p) => p.letsNodePath === resolvedBase.baseLetsNodePath)
      }
    }

    if (layoutPoint?.type !== 'layout' || layoutPoint.name !== layoutName) {
      return [layoutName]
    }

    // Keep child->parent order here because getLayouts() reverses the final list.
    return [layoutPoint.name, ...[...layoutPoint.parse().layouts].reverse()]
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
      tags: this.tags,
      description: this.description,
      errors: this.errors.map((e: unknown) => (e instanceof Error ? e.message : String(e))),
      exportName: this.exportName,
      isBasePoint0: this.isBasePoint0,
      parents: this.parents.map((p) => p.extraSimplify()),
      selfMethods: this.selfMethods.map((m) => ({ name: m.name, index: m.index })),
      endpoint: this.endpoint ? { method: this.endpoint.method, route: this.endpoint.route.definition } : undefined,
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
      this.scope =
        this.type === 'plugin'
          ? 'plugin'
          : (this.scopes.at(-1) as TValid extends true ? PointsScope : PointsScope | undefined)
      if (!this.scope) {
        this.errors.push(new Error('Scope not found. Looks like point not attached to any scope.'))
      }
      if (!this.exportName && this.type !== 'plugin' && this.type !== 'base') {
        this.errors.push(new Error('Point not exported. Please, add export to the point.'))
      }

      if (!this.pos) {
        this.errors.push(new Error('Point position not found. We do not know what to do...'))
      }

      this.selfMethods = this.getSelfMethods()
      this.chainMethods = this.getChainMethods()
      this.tags = this.getTags()
      this.description = this.getDescription()

      this.polh = this.getPrefetchOnLinkHover()
      this.basepath = this.getBasepath()
      this.ssr = this.getSsr()

      if (this.type === 'action') {
        const {
          route,
          method,
          policy,
          errors: routeErrors,
        } = this.scope
          ? this.getMethodRoutePolicyFromActionLetsCall({ scope: this.scope })
          : { route: undefined, errors: [new Error('Scope not found. Looks like point not attached to any scope.')] }
        this.route = route
        if (method && route) {
          this.endpoint = { method, route }
          if (policy === 'short') {
            this.name = `${method.toUpperCase()} ${route.definition}`
          }
        } else {
          this.errors.push(new Error('Method and route not found. Please, check your lets() call.'))
        }
        this.errors.push(...routeErrors)
      } else if (this.type === 'page' || this.type === 'layout') {
        const { route, errors: routeErrors } = this.scope
          ? this.getPageOrLayoutRoute({ scope: this.scope })
          : { route: undefined, errors: [new Error('Scope not found. Looks like point not attached to any scope.')] }
        this.route = route
        this.errors.push(...routeErrors)
      }

      // for action we set endpoint in previouse step, because we need to know method and route first
      if (this.type !== 'action') {
        // pages always has endpoint, becouse they can be called to get queryClientDehydratedState
        if ((this.type === 'page' && this.ssr) || this.hasLoaders()) {
          const endpointRouteBase = Route0.create(`/_point0/${this.scope}/${this.type}/${this.name}`)
          const endpointRoute =
            !this.route?.definition || this.route.definition === '/'
              ? endpointRouteBase
              : endpointRouteBase.extend(this.route.definition)
          const endpointMethod = this.type === 'page' || this.type === 'layout' ? 'GET' : 'POST'
          this.endpoint = { method: endpointMethod, route: endpointRoute }
        }
      }

      this.layouts = this.getLayouts()

      const lastCalledMethodName = this.selfMethods.at(-1)?.name
      const allowedLastMethodNames = this.getAllowedLastMethodNames()
      if (!lastCalledMethodName || !allowedLastMethodNames.includes(lastCalledMethodName)) {
        const expectedTailMethods = allowedLastMethodNames.map((methodName) => `.${methodName}()`).join(' or ')
        this.errors.push(
          new Error(
            `Last called method name '${lastCalledMethodName || typeof lastCalledMethodName}' does not match point type '${this.type}'. Please, use ${expectedTailMethods} in end of point chain`,
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
      a.tags.every((tag) => b.tags.includes(tag)) &&
      b.tags.every((tag) => a.tags.includes(tag)) &&
      a.description === b.description &&
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
    let underSsr = this.walker.ssr
    let underAction = false
    for (const point of [this, ...this.parents].reverse()) {
      const methods = point.getSelfMethods()
      for (const method of methods) {
        if (method.name === 'clientOnly') {
          underSsr = false
        }
        underAction = underAction || point.type === 'action'
        chainMethods.push({
          nodePath: method.nodePath,
          name: method.name,
          index: method.index,
          chainIndex,
          underSsr,
          underAction,
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

  private removeLastMethodArg({ nodePath }: { nodePath: NodePath<Node> }): void {
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
    nodePath.node.arguments.pop()
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

  private replaceAllArgsWithArrowFnReturnEmptyObject({ nodePath }: { nodePath: NodePath<Node> }): void {
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
    const replacementArg = {
      type: 'ArrowFunctionExpression' as const,
      id: null,
      generator: false,
      async: false,
      expression: true,
      params: [],
      // () => ({})
      body: {
        type: 'ObjectExpression' as const,
        properties: [],
      },
    }
    nodePath.node.arguments.push(replacementArg)
    this.file.modified = true
  }

  private shakeMethodsForClient(): void {
    for (const method of this.getSelfRichMethods()) {
      switch (method.name) {
        case 'input':
        case 'loader':
        case 'action':
        case 'headers':
        case 'cookies':
        case 'body':
        case 'ctx':
        case 'serverOn':
        case 'middleware':
        case 'response':
        case 'description':
        case 'openapi': {
          this.removeMethodArgs({ nodePath: method.nodePath })
          break
        }
        case 'params':
        case 'search': {
          if (method.underAction) {
            this.removeMethodArgs({ nodePath: method.nodePath })
          }
          break
        }
      }
    }
  }

  private shakeMethodsForServer(): void {
    // when method underSsr, then we prune on nossr-server
    for (const method of this.getSelfRichMethods()) {
      if (method.name === 'clientLoader') {
        this.removeArgsIfNotBooleanLiteral({ nodePath: method.nodePath })
      }
      if (method.name === 'clientInput') {
        this.replaceAllArgsWithArrowFnReturnEmptyObject({ nodePath: method.nodePath })
      }
      if (method.name === 'clientOn') {
        this.removeLastMethodArg({ nodePath: method.nodePath })
      }
      if (
        [
          'scrollPosition',
          'scrollRestore',
          'onPrefetchPage',
          'prefetchPageOnNavigate',
          'prefetchPageOnLinkHover',
        ].includes(method.name)
      ) {
        this.removeMethodArgs({ nodePath: method.nodePath })
      } else if (!method.underSsr) {
        if (
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
            'with',
            'mapper',
            'component',
            'provider',
            'layout',
            'page',
            'head',
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
      }
    }
  }

  private _shake = false
  shakeMethods({ side }: { side: 'client' | 'server' }): void {
    if (this._shake) {
      return
    }
    if (side === 'client') {
      this.shakeMethodsForClient()
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    } else if (side === 'server') {
      this.shakeMethodsForServer()
    } else {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw new Error(`Invalid side: ${side}`)
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

  private externalizeFirstArrowFunctionArg({
    nodePath,
    functionNameBase,
  }: {
    nodePath: NodePath<Node>
    functionNameBase: string
  }): void {
    if (nodePath.node.type !== 'CallExpression') {
      return
    }

    const firstArg = nodePath.node.arguments.at(0)
    if (firstArg?.type !== 'ArrowFunctionExpression') {
      return
    }

    const arrowFn = firstArg
    const functionName = this.generateUniqueIdentifier(toPascalCase(functionNameBase))

    let body = arrowFn.body
    if (body.type !== 'BlockStatement') {
      body = {
        type: 'BlockStatement' as const,
        directives: [],
        body: [
          {
            type: 'ReturnStatement' as const,
            argument: body,
          },
        ],
      }
    }

    const functionDeclaration = {
      type: 'FunctionDeclaration' as const,
      id: {
        type: 'Identifier' as const,
        name: functionName,
      },
      generator: false,
      async: arrowFn.async || false,
      params: arrowFn.params,
      body,
    }

    const parseResult = this.file.parse()
    if (parseResult.ok) {
      const program = parseResult.ast.program
      program.body.push(functionDeclaration)
      this.file.modified = true
    }

    nodePath.node.arguments[0] = {
      type: 'Identifier' as const,
      name: functionName,
    }
    this.file.modified = true
  }

  private _addHmrFix = false
  addHmrFix(): void {
    if (this._addHmrFix) {
      return
    }

    // Get the last method call in the chain (the topmost/final CallExpression)
    const methods = this.getSelfMethods()
    if (methods.length === 0) {
      this._addHmrFix = true
      return
    }

    // first lets externalize helper method copinents to have hmr for it

    const extraComponentLikeMethods = new Set([
      'wrapper',
      'loading',
      'pageLoading',
      'layoutLoading',
      'componentLoading',
      'error',
      'pageError',
      'layoutError',
      'componentError',
    ])

    for (const method of methods) {
      if (!extraComponentLikeMethods.has(method.name)) {
        continue
      }
      this.externalizeFirstArrowFunctionArg({
        nodePath: method.nodePath,
        functionNameBase: `${this.type}_${this.name}_${method.name}`,
      })
    }

    // second lets add hmr fix for the point last method itself, and make any point react like component

    // The last method in the array is the final method call (e.g., .mutation(), .query())
    const lastMethod = methods[methods.length - 1]
    if (lastMethod.nodePath.node.type !== 'CallExpression') {
      this._addHmrFix = true
      return
    }

    // Check if point type is component, layout, or page and has functional component
    if (this.type === 'component' || this.type === 'layout' || this.type === 'page') {
      const hasValidEnding = lastMethod.name === this.type
      const firstArg = lastMethod.nodePath.node.arguments.at(0)
      const alreadyHasFunctionalComponent = hasValidEnding && !!firstArg
      if (alreadyHasFunctionalComponent) {
        this.externalizeFirstArrowFunctionArg({
          nodePath: lastMethod.nodePath,
          functionNameBase: `${this.type}_${this.name}`,
        })
        // For page/layout/component points with existing functions, don't add HMR fix
        // Just convert if needed, then return
        this._addHmrFix = true
        return
      }
      // Otherwise, continue to add HMR fix (last method matches pointType and has no args)
    }

    // Create the function: function X() { return null }
    const makeFunctionExpressionReturnNull = () => ({
      type: 'FunctionExpression' as const,
      id: { type: 'Identifier' as const, name: 'X' },
      params: [],
      body: {
        type: 'BlockStatement' as const,
        body: [{ type: 'ReturnStatement' as const, argument: { type: 'NullLiteral' as const } }],
      },
    })

    // Create MemberExpression: lastMethodCallNode._tail
    const hmrMemberExpression = {
      type: 'MemberExpression' as const,
      object: lastMethod.nodePath.node,
      property: {
        type: 'Identifier' as const,
        name: '_tail',
      },
      computed: false,
      optional: false,
    }

    // Create CallExpression: lastMethodCallNode._tail(function X() { return null })
    const hmrCallExpression = {
      type: 'CallExpression' as const,
      callee: hmrMemberExpression,
      arguments: [makeFunctionExpressionReturnNull()],
      optional: false,
    }

    // Replace the original last method call node with the new one that has ._tail() chained
    lastMethod.nodePath.replaceWith(hmrCallExpression as unknown as Node)
    this.file.modified = true
    this._addHmrFix = true
  }
}

export type CompilerPointSimplified = {
  file: string
  route: string | undefined
  endpoint: { method: string; route: string } | undefined
  valid: boolean
  type: ReadyPointType
  name: PointName
  scopes: PointsScope[]
  scope: PointsScope | undefined
  pos: { column: number; line: number } | undefined
  polh: boolean | number | undefined
  layouts: string[]
  tags: string[]
  description: string | undefined
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
  underAction: boolean
  point: CompilerPoint
}

export const POINT_TYPE_TO_METHOD_MAP: Record<ReadyPointType, ReadyPointType> = {
  plugin: 'plugin',
  page: 'page',
  layout: 'layout',
  component: 'component',
  provider: 'provider',
  mutation: 'mutation',
  query: 'query',
  infiniteQuery: 'infiniteQuery',
  action: 'action',
  base: 'base',
  root: 'root',
}
export const POINT_METHOD_TO_TYPE_MAP: Partial<Record<string, ReadyPointType>> = Object.fromEntries(
  Object.entries(POINT_TYPE_TO_METHOD_MAP).map(([type, method]) => [method, type as ReadyPointType]),
)
export const END_POINT_TYPES: ReadyPointType[] = Object.keys(POINT_TYPE_TO_METHOD_MAP) as ReadyPointType[]

export const ACTION_METHODS = new Set(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'])
