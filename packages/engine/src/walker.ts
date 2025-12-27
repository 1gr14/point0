import babel from '@babel/parser'
import type traverseType from '@babel/traverse'
import type { NodePath } from '@babel/traverse'
import traverseModule from '@babel/traverse'
import type {
  CallExpression,
  ClassDeclaration,
  Declaration,
  Expression,
  FunctionDeclaration,
  Node,
  TSDeclareFunction,
} from '@babel/types'
import type { AnyRoute, RoutesPretty } from '@devp0nt/route0'
import { Route0 } from '@devp0nt/route0'
import type { EndPointType, PointName, PointsScope } from '@point0/core'
import { dedupeSlashes } from '@point0/core'
import * as nodeFs from 'node:fs/promises'
import * as nodePath from 'node:path'

const traverse = ((traverseModule as any).default ?? traverseModule) as typeof traverseType extends { default: infer T }
  ? T
  : typeof traverseType

// TODO: if no routes needed for this point: like layout or page then do not runtime
// TODO: collect in static known route definition if it is string and it was not changed also do not runtime generation

export class Walker {
  readonly cwd: string

  // <scope, Routes>
  readonly routes: Record<string, RoutesPretty>

  // Map<fileAbs, content>
  readonly filesContentCache = new Map<string, string>()

  // Map<fileAbs, ast>
  readonly astCache = new Map<string, babel.ParseResult<any>>()

  // Map<fileAbs:baseIdentifier, route>
  readonly routesCache = new Map<string, AnyRoute | undefined>()

  // Map<fileAbs:baseIdentifier, Map<string[]>>
  readonly layoutsCache = new Map<string, string[]>()

  // Map<fileAbs:baseIdentifier, boolean>
  readonly prefetchOnHoverCache = new Map<string, boolean | number>()

  // Cache for TypeScript compiler options per directory
  // Value can be: ParsedCommandLine, null (no tsconfig found), or undefined (not checked yet)
  private readonly tsConfigCache = new Map<string, any>()

  // Lazy-loaded TypeScript module (null if not available)
  private tsModule: typeof import('typescript') | null | undefined = undefined

  constructor(options: { cwd?: string; routes?: Record<string, RoutesPretty> } = {}) {
    this.cwd = options.cwd ?? process.cwd()
    this.routes = options.routes ?? {}
  }

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

  getRoutesByScope(scope: string): RoutesPretty | undefined {
    return this.routes[scope]
  }

  getRouteByScope(scope: string, routeKey: string): AnyRoute | undefined {
    const routes = this.getRoutesByScope(scope)
    return (routes as any)?.[routeKey]
  }

  async collectPointsFromFile({
    fileAbs,
  }: {
    fileAbs: string
  }): Promise<{ collectedPoints: CollectedPoint[]; errors: unknown[] }> {
    let content: string
    try {
      const cachedContent = this.filesContentCache.get(fileAbs)
      if (cachedContent) {
        content = cachedContent
      } else {
        try {
          content = await nodeFs.readFile(fileAbs, 'utf8')
          this.filesContentCache.set(fileAbs, content)
        } catch (e) {
          console.warn(`🔴 ${nodePath.relative(this.cwd, fileAbs)}: read failed: ${(e as Error).message}`)
          return { collectedPoints: [], errors: [e] }
        }
      }
      return await this.extractCollectedPointsFromContent({ content, fileAbs })
    } catch (e) {
      console.warn(`🔴 ${nodePath.relative(this.cwd, fileAbs)}: parse failed: ${(e as Error).message}`)
      return { collectedPoints: [], errors: [e] }
    }
  }

  private async extractCollectedPointsFromContent({ content, fileAbs }: { content: string; fileAbs: string }): Promise<{
    collectedPoints: CollectedPoint[]
    errors: unknown[]
  }> {
    let ast
    try {
      const cachedAst = this.astCache.get(fileAbs)
      if (cachedAst) {
        ast = cachedAst
      } else {
        ast = babel.parse(content, {
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
        this.astCache.set(fileAbs, ast)
      }
    } catch (e) {
      console.warn(`🔴 ${nodePath.relative(this.cwd, fileAbs)}: parse failed: ${(e as Error).message}`)
      this.astCache.set(fileAbs, undefined)
      return { collectedPoints: [], errors: [e] }
    }

    const promises: Array<Promise<CollectedPoint | null>> = []
    const errors: unknown[] = []

    traverse(ast, {
      ExportNamedDeclaration: (p) => {
        promises.push(
          (async () => {
            const decl = p.node.declaration
            if (decl?.type === 'VariableDeclaration') {
              // Handle: export const client = ...
              for (const d of decl.declarations) {
                const id = d.id
                if (id.type === 'Identifier') {
                  const {
                    pointType,
                    pointName,
                    errors: detectPointTypeAndNameFromInitErrors,
                  } = this.detectPointTypeAndNameFromInit({ fileAbs, node: d.init })
                  errors.push(...detectPointTypeAndNameFromInitErrors)
                  if (pointType && pointName) {
                    const {
                      scope,
                      attachedTo,
                      errors: scopeErrors,
                    } = await this.resolveScope({
                      fileAbs,
                      baseIdentifier: id.name,
                    })
                    errors.push(...scopeErrors)
                    if (!scope) {
                      return null
                    }

                    const shouldHaveRoute = pointType === 'page' || pointType === 'layout'
                    const { route, errors: routeErrors } = shouldHaveRoute
                      ? await this.resolveFullRoute({
                          loggableFileAbs: fileAbs,
                          fileAbs,
                          baseIdentifier: id.name,
                          scope,
                          pointType,
                          pointName,
                        })
                      : { route: undefined, errors: [] }
                    errors.push(...routeErrors)

                    if (shouldHaveRoute && !route) {
                      const message = `route not detected for ${pointType}.${pointName}`
                      console.warn(`🔴 ${nodePath.relative(this.cwd, fileAbs)}: ${message}`)
                      throw new Error(message)
                    }

                    const { layouts, errors: layoutsErrors } =
                      pointType === 'page'
                        ? await this.resolveLayoutsChain({ fileAbs, baseIdentifier: id.name })
                        : { layouts: [], errors: [] }
                    errors.push(...layoutsErrors)

                    const shouldBePrefetchedOnLinkHover =
                      pointType !== 'page'
                        ? false
                        : await this.resolveShouldBePrefetchedOnLinkHover({ fileAbs, baseIdentifier: id.name })

                    return {
                      type: pointType,
                      name: pointName,
                      exportName: id.name,
                      fileAbs,
                      route,
                      shouldBePrefetchedOnLinkHover,
                      layouts,
                      scope,
                      attachedTo,
                    }
                  }
                }
              }
            }
            return null
          })(),
        )
      },
      ExportDefaultDeclaration: (p) => {
        promises.push(
          (async () => {
            const decl = p.node.declaration
            const {
              pointType,
              pointName,
              errors: detectPointTypeAndNameFromInitErrors,
            } = this.detectPointTypeAndNameFromInit({ fileAbs, node: decl })
            errors.push(...detectPointTypeAndNameFromInitErrors)
            if (pointType && pointName) {
              const {
                scope,
                attachedTo,
                errors: scopeErrors,
              } = await this.resolveScope({ fileAbs, baseIdentifier: 'default' })
              errors.push(...scopeErrors)
              if (!scope) {
                return null
              }

              const shouldHaveRoute = pointType === 'page' || pointType === 'layout'

              const { route, errors: routeErrors } = shouldHaveRoute
                ? await this.resolveFullRoute({
                    loggableFileAbs: fileAbs,
                    fileAbs,
                    baseIdentifier: 'default',
                    scope,
                    pointType,
                    pointName,
                  })
                : { route: undefined, errors: [] }
              errors.push(...routeErrors)

              if (shouldHaveRoute && !route) {
                const message = `route not detected for ${pointType}.${pointName}`
                console.warn(`🔴 ${nodePath.relative(this.cwd, fileAbs)}: ${message}`)
                throw new Error(message)
              }

              const { layouts, errors: layoutsErrors } =
                pointType === 'page'
                  ? await this.resolveLayoutsChain({ fileAbs, baseIdentifier: 'default' })
                  : { layouts: [], errors: [] }
              errors.push(...layoutsErrors)

              const shouldBePrefetchedOnLinkHover =
                pointType !== 'page'
                  ? false
                  : await this.resolveShouldBePrefetchedOnLinkHover({ fileAbs, baseIdentifier: 'default' })

              return {
                exportName: 'default',
                type: pointType,
                name: pointName,
                fileAbs,
                route,
                shouldBePrefetchedOnLinkHover,
                layouts,
                scope,
                attachedTo,
              }
            }
            return null
          })(),
        )
      },
    })

    const results = await Promise.allSettled(promises)
    const collectedPoints = results.filter((r) => r.status === 'fulfilled').flatMap((r) => r.value || [])
    // TODO:ASAP
    const promiseRejectedErrors = results.filter((r) => r.status === 'rejected').map((r) => r.reason)
    return {
      collectedPoints: Walker.toUniqueCollectedPoints(collectedPoints),
      errors: [...errors, ...promiseRejectedErrors],
    }
  }

  async prunePoint0Methods({
    content,
    fileAbs,
    methods: methodsProvided,
    customer,
  }: {
    content?: string
    fileAbs: string
    methods?: string[]
    customer?: PruneCustomer
  }): Promise<string> {
    if (!methodsProvided && !customer) {
      throw new Error('methods or customer is required in point0-compiler plugin')
    }

    const customerToMethods = (customer: PruneCustomerFlat): string[] => {
      const methods = {
        none: [],
        client: ['loader', 'ctx'],
        // serverSsr: ['scrollPosition', 'clientLoader'],
        // serverNoSsr: [
        //   'scrollPosition',
        //   'clientLoader',
        //   'page',
        //   'component',
        //   'layout',
        //   'wrapper',
        //   'error',
        //   'loading',
        //   'layoutError',
        //   'pageError',
        //   'componentError',
        //   'layoutLoading',
        //   'pageLoading',
        //   'provider',
        //   'componentLoading',
        //   'query',
        //   'infiniteQuery',
        //   'mutation',
        // ],
        server: [],
      }[customer]
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!methods) {
        throw new Error(`Invalid customer: ${customer}`)
      }
      return methods
    }

    const customerByScopeToMethods = (customer: PruneCustomerByScope): Record<PointsScope, string[]> => {
      return Object.fromEntries(
        Object.entries(customer).map(([scope, customer]) => [scope, customerToMethods(customer)]),
      )
    }

    const methodsByScope = customer && typeof customer === 'object' ? customerByScopeToMethods(customer) : null
    const methods =
      typeof customer === 'string'
        ? customerToMethods(customer)
        : methodsProvided || [
            'scrollPosition',
            'loader',
            'ctx',
            'clientLoader',
            'page',
            'component',
            'layout',
            'wrapper',
            'error',
            'loading',
            'layoutError',
            'pageError',
            'componentError',
            'layoutLoading',
            'pageLoading',
            'componentLoading',
            'query',
            'infiniteQuery',
            'mutation',
          ]

    const code =
      content ??
      (await nodeFs.readFile(fileAbs, 'utf8').catch((e: unknown) => {
        console.warn(`🔴 stripPoint0Methods: cannot read file ${fileAbs}: ${(e as Error).message}`)
        throw e
      }))

    let ast: babel.ParseResult<any>
    try {
      const cachedAst = this.astCache.get(fileAbs)
      if (cachedAst) {
        ast = cachedAst
      } else {
        ast = babel.parse(code, {
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
        this.astCache.set(fileAbs, ast)
      }
    } catch (e) {
      console.warn(`🔴 stripPoint0Methods: parse failed for ${fileAbs}: ${(e as Error).message}`)
      return code
    }

    const candidates: Array<{
      node: CallExpression
      baseIdentifier: string
      method: string
    }> = []

    traverse(ast, {
      CallExpression: (p) => {
        const node = p.node
        if (node.callee.type !== 'MemberExpression') return
        const prop = node.callee.property
        if (prop.type !== 'Identifier') return
        if (!methods.includes(prop.name)) return

        // Determine which top-level identifier this chain belongs to
        const baseIdentifier = this.findTopLevelAssignedIdentifier(p as unknown as NodePath<Node>)
        if (!baseIdentifier) {
          // local chain inside a function or something like that - we don't care about it
          return
        }

        candidates.push({ node, baseIdentifier, method: prop.name })
      },
    })

    if (candidates.length === 0) {
      return code
    }

    // For each candidate, we check if there is a scope through resolveScope
    const itemsToStrip: Array<{ node: CallExpression; method: string }> = []

    // We can slightly deduplicate by (baseIdentifier) to not call resolveScope unnecessarily
    const scopeCache = new Map<string, string | undefined>()

    for (const { node, baseIdentifier, method } of candidates) {
      let scope = scopeCache.get(baseIdentifier)
      if (scope === undefined && !scopeCache.has(baseIdentifier)) {
        try {
          const { scope: resolvedScope } = await this.resolveScope({
            fileAbs,
            baseIdentifier,
          })
          scope = resolvedScope
        } catch (e) {
          // console.warn(
          //   `🔴 stripPoint0Methods: resolveScope failed for ${baseIdentifier} in ${fileAbs}: ${(e as Error).message}`,
          // )
          scope = undefined
        }
        scopeCache.set(baseIdentifier, scope)
      }

      // scope found → this is a Point0 chain ⇒ this call needs to be cleaned
      if (scope) {
        if (!methodsByScope) {
          itemsToStrip.push({ node, method })
        } else {
          if (scope in methodsByScope && methodsByScope[scope].includes(method)) {
            itemsToStrip.push({ node, method })
          }
        }
      }
    }

    if (itemsToStrip.length === 0) {
      return code
    }

    const makeArrowFnReturnNull = () => ({
      type: 'ArrowFunctionExpression' as const,
      id: null,
      generator: false,
      async: false,
      expression: true,
      params: [],
      body: { type: 'NullLiteral' as const },
    })

    // Mutate AST: clean arguments
    for (const { node, method } of itemsToStrip) {
      if (node.arguments.length) {
        if (['page', 'pageError', 'pageLoading', 'loading'].includes(method)) {
          if (node.arguments.length === 2) {
            node.arguments[1] = makeArrowFnReturnNull()
          } else {
            node.arguments[0] = makeArrowFnReturnNull()
          }
        } else if (method === 'clientLoader') {
          if (node.arguments[0]?.type === 'BooleanLiteral') {
            // Keep as is - argument[0] is false/true (disables/enables clientLoader)
          } else {
            node.arguments = []
          }
        } else if (method === 'loader') {
          if (node.arguments[0]?.type === 'BooleanLiteral') {
            // Keep as is - argument[0] is false/true (disables/enables loader)
          } else {
            node.arguments = []
          }
        } else {
          node.arguments = []
        }
      }
    }

    // Generate code back
    const generatorModule = await import('@babel/generator')
    const generate = (generatorModule as any).default ?? generatorModule
    const { code: out } = generate(ast, { retainLines: true })

    // Update the content cache so that your Walker works in a consistent state
    this.filesContentCache.set(fileAbs, out)

    return out
  }

  async prunePoint0ClientServer({
    content,
    fileAbs,
    customer,
  }: {
    content?: string
    fileAbs: string
    customer: PruneCustomer
  }): Promise<string> {
    // Determine environment
    const env = customer === 'client' ? 'client' : 'server'

    const code =
      content ??
      (await nodeFs.readFile(fileAbs, 'utf8').catch((e: unknown) => {
        console.warn(`🔴 prunePoint0ClientServer: cannot read file ${fileAbs}: ${(e as Error).message}`)
        throw e
      }))

    let ast: babel.ParseResult<any>
    try {
      ast = babel.parse(code, {
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
      this.astCache.set(fileAbs, ast)
    } catch (e) {
      console.warn(`🔴 prunePoint0ClientServer: parse failed for ${fileAbs}: ${(e as Error).message}`)
      return code
    }

    let changed = false

    const makeThrow = (msg: string) => ({
      type: 'ArrowFunctionExpression',
      id: null,
      generator: false,
      async: false,
      expression: false,
      params: [],
      body: {
        type: 'BlockStatement',
        body: [
          {
            type: 'ThrowStatement',
            argument: {
              type: 'NewExpression',
              callee: { type: 'Identifier', name: 'Error' },
              arguments: [{ type: 'StringLiteral', value: msg }],
            },
          },
        ],
      },
    })

    const makeUndefined = () => ({
      type: 'Identifier',
      name: 'undefined',
    })

    traverse(ast, {
      MemberExpression: (p) => {
        const node = p.node

        // Only handle Point0.xxx
        if (
          node.object.type !== 'Identifier' ||
          (node.object.name !== 'Point0' && node.object.name !== 'ClientServerHelpers')
        )
          return
        if (node.property.type !== 'Identifier') return

        const name = node.property.name

        //
        // BOOLEAN CONSTANTS
        //
        if (name === 'isClient') {
          changed = true
          p.replaceWith({
            type: 'BooleanLiteral',
            value: env === 'client',
          })
        }

        if (name === 'isServer') {
          changed = true
          p.replaceWith({
            type: 'BooleanLiteral',
            value: env === 'server',
          })
        }
      },

      CallExpression: (p) => {
        const node = p.node
        const callee = node.callee

        if (callee.type !== 'MemberExpression') return
        if (
          callee.object.type !== 'Identifier' ||
          (callee.object.name !== 'Point0' && callee.object.name !== 'ClientServerHelpers')
        )
          return
        if (callee.property.type !== 'Identifier') return

        const name = callee.property.name
        const args = node.arguments as any[]

        switch (name) {
          //
          // CALL HELPERS
          //
          case 'callServer':
            if (env === 'client' && args[0]) {
              args[0] = makeThrow('Call server function from client')
              changed = true
            }
            break

          case 'callClient':
            if (env === 'server' && args[0]) {
              args[0] = makeThrow('Call client function from server')
              changed = true
            }
            break

          case 'callClientElseServer':
            if (env === 'client' && args[1]) {
              args[1] = makeThrow('Call server function from client')
              changed = true
            }
            if (env === 'server' && args[0]) {
              args[0] = makeThrow('Call client function from server')
              changed = true
            }
            break

          //
          // CONST HELPERS
          //
          case 'constServer':
          case 'constServerUnsafe':
            if (env === 'client' && args[0]) {
              args[0] = makeUndefined()
              changed = true
            }
            break

          case 'constClient':
          case 'constClientUnsafe':
            if (env === 'server' && args[0]) {
              args[0] = makeUndefined()
              changed = true
            }
            break

          case 'constClientElseServer':
            if (env === 'client' && args[1]) {
              args[1] = makeUndefined()
              changed = true
            }
            if (env === 'server' && args[0]) {
              args[0] = makeUndefined()
              changed = true
            }
            break
        }
      },
    })

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!changed) return code

    const generatorModule = await import('@babel/generator')
    const generate = (generatorModule as any).default ?? generatorModule
    const { code: out } = generate(ast, { retainLines: true })
    this.filesContentCache.set(fileAbs, out)

    return out
  }

  async pruneForBuildInProgress({
    content,
    fileAbs,
    customer,
  }: {
    content: string
    fileAbs: string
    customer: PruneCustomer
  }): Promise<string> {
    if (process.env.POINT0_SERVER_BUILD_IN_PROGRESS !== 'true') {
      return content
    }

    const code = content

    let ast: babel.ParseResult<any>
    try {
      ast = babel.parse(code, {
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
      this.astCache.set(fileAbs, ast)
    } catch (e) {
      console.warn(`🔴 pruneForBuildInProgress: parse failed for ${fileAbs}: ${(e as Error).message}`)
      return code
    }

    let changed = false

    const makeThrow = () => ({
      type: 'ArrowFunctionExpression',
      id: null,
      generator: false,
      async: false,
      expression: false,
      params: [],
      body: {
        type: 'BlockStatement',
        body: [
          {
            type: 'ThrowStatement',
            argument: {
              type: 'NewExpression',
              callee: { type: 'Identifier', name: 'Error' },
              arguments: [{ type: 'StringLiteral', value: 'Not available after build' }],
            },
          },
        ],
      },
    })

    traverse(ast, {
      CallExpression: (p) => {
        const node = p.node
        const callee = node.callee

        // Check if callee is an Identifier named 'pruneItWhenPoint0ServerBuildInProgress'
        if (callee.type === 'Identifier' && callee.name === 'pruneItWhenPoint0ServerBuildInProgress') {
          const args = node.arguments as any[]
          // Replace the first argument (callback) with the throw function
          if (args.length > 0) {
            args[0] = makeThrow()
            changed = true
          }
        }
      },
    })

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!changed) return code

    const generatorModule = await import('@babel/generator')
    const generate = (generatorModule as any).default ?? generatorModule
    const { code: out } = generate(ast, { retainLines: true })
    this.filesContentCache.set(fileAbs, out)

    return out
  }

  async addHmrToNonComponentPoints({
    content,
    fileAbs,
    customer,
  }: {
    content: string
    fileAbs: string
    customer: PruneCustomer
  }): Promise<string> {
    // example
    // ...lets('mutation', 'getNews').page() → ...lets('page', 'news').page()._hmr(Function X {return null})
    // ...lets('query', 'getNews').query() → ...lets('query', 'news').query()._hmr(Function X {return null})
    // but if .lets('component' | 'layout' | 'page') then do not add _hmr

    let ast: babel.ParseResult<any>
    try {
      const cachedAst = this.astCache.get(fileAbs)
      if (cachedAst) {
        ast = cachedAst
      } else {
        ast = babel.parse(content, {
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
        this.astCache.set(fileAbs, ast)
      }
    } catch (e) {
      console.warn(`🔴 addHmrToNonComponentPoints: parse failed for ${fileAbs}: ${(e as Error).message}`)
      return content
    }

    const nodesToModify: Array<{ path: NodePath<CallExpression> }> = []

    traverse(ast, {
      CallExpression: (p) => {
        const node = p.node
        // Must be a member expression call (e.g., .query(), .mutation(), etc.)
        if (node.callee.type !== 'MemberExpression') return

        const prop = node.callee.property
        if (prop.type !== 'Identifier') return

        const lastMethod = prop.name
        const pointType = Walker.pointMethodToPointType(lastMethod)
        if (!pointType) return

        // Check if this chain starts with .lets()
        const lets = this.findLetsArgsInChain(node)
        if (!lets) return

        // Skip if .lets() type is component, layout, or page
        if (lets.typeArg === 'component' || lets.typeArg === 'layout' || lets.typeArg === 'page') return

        // TODO: check if it is really Point0 thing
        // Check if the root is Point0.create()
        // const scopeResult = this.extractScopeFromChain({ fileAbs, node })
        // if (!scopeResult) return

        // Must be a top-level assignment (not inside a function)
        const baseIdentifier = this.findTopLevelAssignedIdentifier(p as unknown as NodePath<Node>)
        if (!baseIdentifier) return

        // This is a valid non-component point that needs HMR
        nodesToModify.push({ path: p })
      },
    })

    if (nodesToModify.length === 0) {
      return content
    }

    // Create the function: function X() { return null }
    const makeFunctionReturnNull = () => ({
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

    // Mutate AST: add ._hmr(() => null) to each node
    for (const { path } of nodesToModify) {
      const node = path.node

      // Create MemberExpression: node._hmr
      const hmrMemberExpression = {
        type: 'MemberExpression' as const,
        object: node,
        property: {
          type: 'Identifier' as const,
          name: '_hmr',
        },
        computed: false,
        optional: false,
      }

      // Create CallExpression: node._hmr(function X() { return null })
      const hmrCallExpression = {
        type: 'CallExpression' as const,
        callee: hmrMemberExpression,
        arguments: [makeFunctionReturnNull()],
        optional: false,
      }

      // Replace the original node with the new one
      path.replaceWith(hmrCallExpression as any)
    }

    // Generate code back
    const generatorModule = await import('@babel/generator')
    const generate = (generatorModule as any).default ?? generatorModule
    const { code: out } = generate(ast, { retainLines: true })

    // Update the content cache so that your Walker works in a consistent state
    this.filesContentCache.set(fileAbs, out)

    return out
  }

  private detectPointTypeAndNameFromInit({
    fileAbs,
    node,
  }: {
    fileAbs: string
    node: Expression | Declaration | null | undefined
  }): {
    pointType: EndPointType | null
    pointName: string | null
    errors: unknown[]
  } {
    // normal point0-style chain with .lets('page','name') and ending in .page()/.layout()/...
    const errors: unknown[] = []
    if (node?.type !== 'CallExpression' || node.callee.type !== 'MemberExpression') {
      return { pointType: null, pointName: null, errors }
    }

    // The last method in the chain determines the point type (e.g. ".page()", ".layout()", etc.)
    const lastProp = node.callee.property
    const lastMethod = lastProp.type === 'Identifier' ? lastProp.name : null
    const pointType = Walker.pointMethodToPointType(lastMethod)
    if (!pointType) return { pointType: null, pointName: null, errors }

    // Find .lets('type','name') anywhere earlier in the chain
    const lets = this.findLetsArgsInChain(node)
    if (!lets) {
      const point0RootResult = this.detectPoint0RootFromChain({ fileAbs, node })
      errors.push(...point0RootResult.errors)
      if (point0RootResult.pointType && point0RootResult.pointName) {
        return {
          pointType: point0RootResult.pointType,
          pointName: point0RootResult.pointName,
          errors,
        }
      }

      return { pointType: null, pointName: null, errors }
    }

    const { typeArg, nameArg } = lets
    if (typeArg !== pointType) return { pointType: null, pointName: null, errors }

    return { pointType, pointName: nameArg, errors }
  }

  /**
   * Detects chains like:
   *
   *   Point0.create<typeof source>('client')
   *     .serverurl(...)
   *     .head(...)
   *     .base()
   *
   * or
   *
   *   Point0.create('admin').base()
   *
   * If we see `.base()` at the end and the root is Point0.create(<name>),
   * then it's a "base" point and its name is the first string arg of the root call.
   */
  private detectPoint0RootFromChain({ fileAbs, node }: { fileAbs: string; node: CallExpression }): {
    pointType: EndPointType | null
    pointName: string | null
    errors: unknown[]
  } {
    // must end with .base()
    // if (node?.type !== 'CallExpression') return { pointType: null, pointName: null, errors: [] }
    if (node.callee.type !== 'MemberExpression') {
      return { pointType: null, pointName: null, errors: [] }
    }
    const lastProp = node.callee.property
    if (lastProp.type !== 'Identifier' || lastProp.name !== 'root') {
      return { pointType: null, pointName: null, errors: [] }
    }

    // walk LEFT through the chain to find the root call:
    // ... .head(...) .serverurl(...) Point0.create('client')
    let current: Expression | null | undefined = node.callee.object
    let rootCall: CallExpression | null = null

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (current) {
      if (current.type === 'CallExpression') {
        rootCall = current
        // if its callee is also a member (something.something) → go further left
        if (current.callee.type === 'MemberExpression') {
          current = current.callee.object
          continue
        }
        break
      } else {
        break
      }
    }

    if (!rootCall) return { pointType: null, pointName: null, errors: [] }
    if (rootCall.callee.type !== 'MemberExpression') return { pointType: null, pointName: null, errors: [] }

    const obj = rootCall.callee.object
    const prop = rootCall.callee.property

    // must be Point0.create
    if (obj.type !== 'Identifier' || obj.name !== 'Point0') return { pointType: null, pointName: null, errors: [] }
    if (prop.type !== 'Identifier') return { pointType: null, pointName: null, errors: [] }
    const method = prop.name
    if (!['create'].includes(method)) return { pointType: null, pointName: null, errors: [] }

    // name should be the first string arg
    const firstArg = rootCall.arguments.at(0)
    if (firstArg?.type === 'StringLiteral') {
      return {
        pointType: 'root',
        pointName: firstArg.value,
        errors: [],
      }
    }

    // fallback – it's still a root base, just no explicit name
    console.warn(`🔴 ${nodePath.relative(this.cwd, fileAbs)} root name not found`)
    return {
      pointType: null,
      pointName: null,
      errors: [new Error('root name not found')],
    }
  }

  private findLetsArgsInChain(call: CallExpression): { typeArg: EndPointType; nameArg: string } | null {
    let curr: any = call
    while (curr?.type === 'CallExpression' && curr.callee?.type === 'MemberExpression') {
      const prop = curr.callee.property
      const method = prop?.type === 'Identifier' ? prop.name : null

      if (method === 'lets') {
        const [typeNode, nameNode] = curr.arguments ?? []
        if (typeNode?.type === 'StringLiteral' && nameNode?.type === 'StringLiteral') {
          return { typeArg: typeNode.value as EndPointType, nameArg: nameNode.value }
        }
      }

      // Walk "left" through the chain: the callee's object is either another CallExpression
      // (previous link in the chain) or an Identifier/MemberExpression (root); keep going.
      curr = curr.callee.object
    }
    return null
  }

  /**
   * Look through the AST and try to find:
   * - `.lets('page', 'news', '/news')` → routeSegment = '/news'
   * - `.lets('page', 'news')` → routeSegment = 'news'
   * - `.lets('layout', 'news', '/news')` → routeSegment = '/news'
   * - `.lets('layout', 'news')` → routeSegment = ''
   * - `.lets('page|layout', 'news', routes.ideaNews)` → we try to resolve from this.routes
   * - `.lets('page|layout', 'news', Route0.create('any/string/here'))` → routeFull = Route0.from('any/string/here')
   */
  private findRouteOnIdentifier({
    loggableFileAbs,
    ast,
    baseIdentifier,
    scope,
    pointType,
    pointName,
  }: {
    loggableFileAbs: string
    ast: babel.ParseResult<any>
    baseIdentifier: string
    scope: string
    pointType: EndPointType
    pointName: string
  }): { routeSegment?: string; routeFull?: AnyRoute; errors: unknown[] } {
    let routeSegment: string | undefined
    let routeFull: AnyRoute | undefined
    let foundPointType: string | undefined
    const errors: unknown[] = []

    try {
      traverse(ast, {
        CallExpression: (p) => {
          const callee = p.node.callee
          if (
            callee.type === 'MemberExpression' &&
            callee.property.type === 'Identifier' &&
            callee.property.name === 'lets'
          ) {
            const topLevelAssignedIdentifier = this.findTopLevelAssignedIdentifier(p.get('callee').get('object'))
            if (topLevelAssignedIdentifier !== baseIdentifier) return

            // proceed if the chain belongs to our identifier

            const pointTypeArg = p.node.arguments.at(0)
            const pointNameArg = p.node.arguments.at(1)
            const routeArg = p.node.arguments.at(2)
            foundPointType = (() => {
              if (pointTypeArg?.type === 'StringLiteral') {
                return pointTypeArg.value as EndPointType
              }
              return undefined
            })()
            if (!foundPointType) {
              errors.push(new Error('point type not found'))
              console.warn(
                `🔴 ${nodePath.relative(this.cwd, loggableFileAbs)} point type not found for ${baseIdentifier}`,
              )
            } else if (foundPointType !== 'page' && foundPointType !== 'layout') {
              // eslint-disable-next-line no-useless-return -- .lets is only way to provide route, and only page and layout have them
              return
            } else if (routeArg?.type === 'StringLiteral') {
              routeSegment = routeArg.value
            } else if (routeArg?.type === 'MemberExpression') {
              // e.g. .lets('page', 'news', routes.ideaNews)
              const prop = routeArg.property
              if (prop.type === 'Identifier') {
                const routeKey = prop.name
                const scopeRoute = this.getRouteByScope(scope, routeKey)
                if (scopeRoute) {
                  routeFull = scopeRoute
                } else {
                  errors.push(new Error(`unknown route key '${routeKey}'`))
                  console.warn(
                    `🔴 ${nodePath.relative(this.cwd, loggableFileAbs)} unknown route key '${routeKey}' for ${baseIdentifier}`,
                  )
                }
              }
            } else if (routeArg?.type === 'CallExpression') {
              // e.g. .lets('page', 'news', Route0.create('any/string/here'))
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
                  routeFull = Route0.from(createArg.value)
                } else {
                  errors.push(new Error(`Route0.create() first argument must be a string literal`))
                  console.warn(
                    `🔴 ${nodePath.relative(this.cwd, loggableFileAbs)} Route0.create() first argument must be a string literal for ${baseIdentifier}`,
                  )
                }
              } else {
                errors.push(new Error(`invalid route argument CallExpression`))
                console.warn(
                  `🔴 ${nodePath.relative(this.cwd, loggableFileAbs)} invalid route argument: CallExpression (not Route0.create) for ${baseIdentifier}`,
                )
              }
            } else if (routeArg) {
              errors.push(new Error(`invalid route argument ${routeArg.type}`))
              console.warn(
                `🔴 ${nodePath.relative(this.cwd, loggableFileAbs)} invalid route argument: ${routeArg.type} for ${baseIdentifier}`,
              )
            } else if (!pointNameArg) {
              errors.push(new Error('point name not found'))
              console.warn(
                `🔴 ${nodePath.relative(this.cwd, loggableFileAbs)} point name not found for ${baseIdentifier}`,
              )
            } else if (pointNameArg.type === 'StringLiteral') {
              routeSegment = foundPointType === 'page' ? pointNameArg.value : ''
            } else if (pointNameArg.type === 'MemberExpression') {
              // e.g. .lets('page', 'news', routes.ideaNews)
              const prop = pointNameArg.property
              if (prop.type === 'Identifier') {
                const routeKey = prop.name
                const scopeRoute = this.getRouteByScope(scope, routeKey)
                if (scopeRoute) {
                  routeFull = scopeRoute
                } else {
                  errors.push(new Error(`unknown route key '${routeKey}'`))
                  console.warn(
                    `🔴 ${nodePath.relative(this.cwd, loggableFileAbs)} unknown route key '${routeKey}' for ${baseIdentifier}`,
                  )
                }
              }
            } else {
              errors.push(new Error(`invalid point name argument ${pointNameArg.type}`))
              console.warn(
                `🔴 ${nodePath.relative(this.cwd, loggableFileAbs)} invalid point name argument: ${pointNameArg.type} for ${baseIdentifier}`,
              )
            }
          }
        },
      })

      if (foundPointType !== 'page' && foundPointType !== 'layout') {
        return {
          routeSegment,
          routeFull,
          errors: [...errors],
        }
      }

      if (routeSegment === undefined && routeFull === undefined) {
        // looks like impossible error
        console.warn(
          `🔴 ${nodePath.relative(this.cwd, loggableFileAbs)} can not find route on identifier ${pointType}.${pointName}`,
        )
        return {
          routeSegment: undefined,
          routeFull: undefined,
          errors: [...errors, new Error('no route found')],
        }
      }

      return {
        routeSegment: routeSegment === '/' ? '' : routeSegment,
        routeFull,
        errors,
      }
    } catch (e) {
      console.warn(
        `🔴 ${nodePath.relative(this.cwd, loggableFileAbs)} find route on identifier for ${baseIdentifier} failed: ${(e as Error).message}`,
      )
      return { routeSegment: undefined, routeFull: undefined, errors: [...errors, e] }
    }
  }

  /**
   * Finds .prefetchOnHover(value) call in the chain for a given identifier.
   * Returns the boolean value if found, undefined otherwise.
   */
  private findPrefetchOnHoverOnIdentifier({
    loggableFileAbs,
    ast,
    baseIdentifier,
  }: {
    loggableFileAbs: string
    ast: babel.ParseResult<any>
    baseIdentifier: string
  }): boolean | number | undefined {
    let foundValue: boolean | number | undefined = undefined

    try {
      traverse(ast, {
        CallExpression: (p) => {
          const callee = p.node.callee
          if (
            callee.type === 'MemberExpression' &&
            callee.property.type === 'Identifier' &&
            callee.property.name === 'prefetchOnHover'
          ) {
            const topLevelAssignedIdentifier = this.findTopLevelAssignedIdentifier(p.get('callee').get('object'))
            if (topLevelAssignedIdentifier !== baseIdentifier) return

            // proceed if the chain belongs to our identifier
            const valueArg = p.node.arguments.at(0)
            if (valueArg?.type === 'BooleanLiteral') {
              foundValue = valueArg.value
            } else if (valueArg?.type === 'NumericLiteral') {
              foundValue = valueArg.value
            }
          }
        },
      })
    } catch (e) {
      console.warn(
        `🔴 ${nodePath.relative(this.cwd, loggableFileAbs)} find prefetchOnHover on identifier for ${baseIdentifier} failed: ${(e as Error).message}`,
      )
    }

    return foundValue
  }

  /**
   * For a given export name (baseIdentifier), figure out WHAT it is based on.
   *
   * Handles:
   *  - export const ideasNewsPage = ideaLayout ...
   *  - export default ideasNewsPage
   *  - import { ideaLayout as x } from ...
   *  - import ideaLayout from ...
   */
  private findParentRef({
    fileAbs,
    ast,
    baseIdentifier,
  }: {
    fileAbs: string
    ast: babel.ParseResult<any>
    baseIdentifier: string
  }): { parentIdentifier: string | undefined; parentImportPath?: string | undefined; errors: unknown[] } {
    try {
      let declaredFrom: string | undefined
      let importedFrom: string | undefined
      let importedName: string | undefined

      // 1) find export that defines baseIdentifier and see what it's assigned to
      traverse(ast, {
        ExportNamedDeclaration: (p) => {
          const decl = p.node.declaration
          if (decl?.type === 'VariableDeclaration') {
            for (const d of decl.declarations) {
              if (d.id.type === 'Identifier' && d.id.name === baseIdentifier) {
                const baseId = this.findBaseIdentifier(d.init)
                if (baseId) {
                  declaredFrom = baseId
                }
              }
            }
          }
        },
        ExportDefaultDeclaration: (p) => {
          // export default ideasNewsPage
          if (baseIdentifier !== 'default') return
          const baseId = this.findBaseIdentifier(p.node.declaration)
          if (baseId) {
            declaredFrom = baseId
          }
        },
      })

      // if we found "ideasNewsPage = ideaLayout" in same file – great
      if (declaredFrom) {
        // need to know if declaredFrom is imported or also local
        // we’ll check imports now
        traverse(ast, {
          ImportDeclaration: (p) => {
            for (const spec of p.node.specifiers) {
              if (
                spec.type === 'ImportSpecifier' &&
                spec.imported.type === 'Identifier' &&
                spec.local.name === declaredFrom
              ) {
                importedFrom = p.node.source.value
                importedName = spec.imported.name // original name
              } else if (spec.type === 'ImportDefaultSpecifier' && spec.local.name === declaredFrom) {
                importedFrom = p.node.source.value
                importedName = 'default'
              }
            }
          },
        })

        if (importedFrom) {
          if (!importedName) {
            console.warn(
              `🔴 ${nodePath.relative(this.cwd, fileAbs)} imported name not found for ${declaredFrom}, when trying to find parent ref for ${baseIdentifier}`,
            )
            return {
              parentIdentifier: undefined,
              parentImportPath: undefined,
              errors: [
                new Error(
                  `imported name not found for ${declaredFrom}, when trying to find parent ref for ${baseIdentifier}`,
                ),
              ],
            }
          }
          return {
            parentIdentifier: importedName,
            parentImportPath: importedFrom,
            errors: [],
          }
        }

        // declared in same file, not imported
        return {
          parentIdentifier: declaredFrom,
          parentImportPath: undefined,
          errors: [],
        }
      }

      // no declaration, maybe the export itself is imported and re-exported
      traverse(ast, {
        ImportDeclaration: (p) => {
          for (const spec of p.node.specifiers) {
            if (
              spec.type === 'ImportSpecifier' &&
              spec.imported.type === 'Identifier' &&
              spec.local.name === baseIdentifier
            ) {
              importedFrom = p.node.source.value
              importedName = spec.imported.name
            } else if (spec.type === 'ImportDefaultSpecifier' && spec.local.name === baseIdentifier) {
              importedFrom = p.node.source.value
              importedName = 'default'
            }
          }
        },
      })

      if (importedFrom) {
        if (!importedName) {
          console.warn(
            `🔴 ${nodePath.relative(this.cwd, fileAbs)} imported name not found for ${importedFrom}, when trying to find parent ref for ${baseIdentifier}`,
          )
          return {
            parentIdentifier: undefined,
            parentImportPath: undefined,
            errors: [
              new Error(
                `imported name not found for ${importedFrom}, when trying to find parent ref for ${baseIdentifier}`,
              ),
            ],
          }
        }
        return {
          parentIdentifier: importedName,
          parentImportPath: importedFrom,
          errors: [],
        }
      }

      return {
        parentIdentifier: undefined,
        parentImportPath: undefined,
        errors: [],
      }
    } catch (e) {
      console.warn(`🔴 ${nodePath.relative(this.cwd, fileAbs)} find parent ref failed: ${(e as Error).message}`)
      return {
        parentIdentifier: undefined,
        parentImportPath: undefined,
        errors: [e],
      }
    }
  }

  /**
   * Given an init node like:
   *   const x = ideaLayout.lets(...).route(...)
   *   generalLayout
   *   someCall(...)
   * return JUST the base identifier ("ideaLayout", "generalLayout", "client", ...)
   */
  private findBaseIdentifier(
    node: Expression | ClassDeclaration | FunctionDeclaration | TSDeclareFunction | null | undefined,
  ): string | undefined {
    let current = node
    while (current?.type === 'CallExpression') {
      const callee = current.callee
      if (callee.type === 'MemberExpression') {
        current = callee.object
      } else {
        break
      }
    }
    // when we exit the loop, current is the base identifier or literal
    if (current?.type === 'Identifier') {
      return current.name
    }
    return undefined
  }

  /**
   * Given an init node like:
   *   const x = ideaLayout.lets(...).route(...)
   *   generalLayout
   *   someCall(...)
   * return JUST the "x"
   */
  // 1) works with NodePath, not raw node
  private findTopLevelAssignedIdentifier(path: NodePath<Node>): string | undefined {
    // climb up until we hit a place that "names" this expression
    const decl = path.findParent((p) => {
      const n = p.node

      // const foo = ...
      if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier') return true

      // export const foo = ...
      if (
        n.type === 'ExportNamedDeclaration' &&
        n.declaration?.type === 'VariableDeclaration' &&
        n.declaration.declarations.length > 0 &&
        n.declaration.declarations[0].id.type === 'Identifier'
      ) {
        return true
      }

      // export default foo
      if (n.type === 'ExportDefaultDeclaration') return true

      return false
    })

    if (!decl) return undefined

    const n = decl.node

    // const foo = ...
    if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier') {
      return n.id.name
    }

    // export const foo = ...
    if (
      n.type === 'ExportNamedDeclaration' &&
      n.declaration?.type === 'VariableDeclaration' &&
      n.declaration.declarations.length > 0 &&
      n.declaration.declarations[0].id.type === 'Identifier'
    ) {
      return n.declaration.declarations[0].id.name
    }

    // export default foo
    if (n.type === 'ExportDefaultDeclaration') {
      if (n.declaration.type === 'Identifier') {
        return n.declaration.name
      }
      // export default <chain>
      return 'default'
    }

    return undefined
  }

  private async resolveFullRoute(
    {
      loggableFileAbs,
      fileAbs,
      baseIdentifier,
      scope,
      pointType,
      pointName,
    }: {
      loggableFileAbs: string
      fileAbs: string
      baseIdentifier: string
      scope: string
      pointType: EndPointType
      pointName: string
    },
    _seen = new Set<string>(),
  ): Promise<{ route: AnyRoute | undefined; errors: unknown[] }> {
    const errors: unknown[] = []

    const cacheKey = `${fileAbs}::${baseIdentifier}`
    const cacheMap = this.routesCache
    const cacheValue = cacheMap.get(cacheKey)

    if (cacheValue) {
      return { route: cacheValue, errors: [] }
    }

    // guard against cycles: fileAbs#id
    const seenKey = `${fileAbs}::${baseIdentifier}`
    if (_seen.has(seenKey)) {
      cacheMap.set(cacheKey, undefined)
      return {
        route: undefined,
        errors: [...errors, new Error(`circular route resolution for ${seenKey}`)],
      }
    }
    _seen.add(seenKey)

    let ast: babel.ParseResult<any>
    try {
      const cachedAst = this.astCache.get(fileAbs)
      if (cachedAst) {
        ast = cachedAst
      } else {
        const content = this.filesContentCache.get(fileAbs) ?? (await nodeFs.readFile(fileAbs, 'utf8'))
        this.filesContentCache.set(fileAbs, content)
        ast = babel.parse(content, {
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
        this.astCache.set(fileAbs, ast)
      }
    } catch (e) {
      console.warn(`🔴 ${nodePath.relative(this.cwd, loggableFileAbs)}: parse failed: ${(e as Error).message}`)
      cacheMap.set(cacheKey, undefined)
      return { route: undefined, errors: [...errors, e] }
    }

    //
    // 1) find route on THIS identifier
    //
    const { routeSegment, routeFull } = this.findRouteOnIdentifier({
      loggableFileAbs,
      ast,
      baseIdentifier,
      scope,
      pointType,
      pointName,
    })

    // if it was a full route (like .route(routes.ideaNews)) – we're done
    if (routeFull) {
      cacheMap.set(cacheKey, routeFull)
      return { route: routeFull, errors }
    }

    //
    // 2) find parent identifier for THIS export (ideaLayout, generalLayout, ...)
    //
    const {
      parentIdentifier,
      parentImportPath,
      errors: findParentRefErrors,
    } = this.findParentRef({ fileAbs, ast, baseIdentifier })
    errors.push(...findParentRefErrors)

    // no parent – we can only return what we have here
    if (!parentIdentifier) {
      const finalRoute = routeSegment !== undefined ? Route0.from(dedupeSlashes(`/${routeSegment}`)) : undefined
      if (!finalRoute) {
        console.warn(
          `🔴 ${nodePath.relative(this.cwd, loggableFileAbs)} parent identifier not found for ${baseIdentifier}`,
        )
        cacheMap.set(cacheKey, undefined)
        return { route: undefined, errors: [...errors, new Error(`parent identifier not found for ${baseIdentifier}`)] }
      } else {
        cacheMap.set(cacheKey, finalRoute)
        return { route: finalRoute, errors }
      }
    }
    if (parentIdentifier === 'Point0') {
      const finalRoute = routeSegment !== undefined ? Route0.from(dedupeSlashes(`/${routeSegment}`)) : undefined
      cacheMap.set(cacheKey, finalRoute)
      return { route: finalRoute, errors }
    }

    //
    // 3) resolve parent fileAbs
    //

    // parent is in SAME file (export const child = parent....)
    const parentAbs = parentImportPath
      ? await this.detectExistingFilePathByImportPath(parentImportPath, fileAbs)
      : fileAbs
    if (!parentAbs) {
      console.warn(
        `🔴 ${nodePath.relative(this.cwd, loggableFileAbs)} parent ${parentIdentifier} path not found: ${parentImportPath}`,
      )
      cacheMap.set(cacheKey, undefined)
      return {
        route: undefined,
        errors: [...errors, new Error(`parent ${parentIdentifier} path not found: ${parentImportPath}`)],
      }
    }

    //
    // 4) recurse to parent
    //
    const { route: parentRoute, errors: resolveFullRouteErrors } = await this.resolveFullRoute(
      {
        loggableFileAbs,
        fileAbs: parentAbs,
        baseIdentifier: parentIdentifier,
        scope,
        pointType,
        pointName,
      },
      _seen,
    )
    errors.push(...resolveFullRouteErrors)

    //
    // 5) stitch parent + current segment
    //
    const finalRoute =
      parentRoute !== undefined && routeSegment !== undefined
        ? routeSegment === ''
          ? parentRoute.clone()
          : parentRoute.extend(routeSegment)
        : routeSegment !== undefined
          ? Route0.from(dedupeSlashes(`/${routeSegment}`))
          : undefined
    cacheMap.set(cacheKey, finalRoute)
    return { route: finalRoute, errors }
  }

  private async resolveLayoutsChain(
    {
      fileAbs,
      baseIdentifier,
    }: {
      fileAbs: string
      baseIdentifier: string
    },
    _seen = new Set<string>(),
  ): Promise<{ layouts: string[]; errors: unknown[] }> {
    const errors: unknown[] = []

    // per-file cache
    const cacheKey = `${fileAbs}::${baseIdentifier}`
    const cacheMap = this.layoutsCache
    const cacheValue = cacheMap.get(cacheKey)

    if (cacheValue) {
      return { layouts: cacheValue, errors: [] }
    }

    // cycle guard
    const seenKey = `${fileAbs}::${baseIdentifier}`
    if (_seen.has(seenKey)) {
      cacheMap.set(cacheKey, [])
      return {
        layouts: [],
        errors: [new Error(`circular layouts resolution for ${seenKey}`)],
      }
    }
    _seen.add(seenKey)

    // parse file
    let ast: babel.ParseResult<any>
    try {
      const content = this.filesContentCache.get(fileAbs) ?? (await nodeFs.readFile(fileAbs, 'utf8'))
      this.filesContentCache.set(fileAbs, content)
      const cachedAst = this.astCache.get(fileAbs)
      if (cachedAst) {
        ast = cachedAst
      } else {
        ast = babel.parse(content, {
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
        this.astCache.set(fileAbs, ast)
      }
    } catch (e) {
      console.warn(`🔴 ${nodePath.relative(this.cwd, fileAbs)}: parse failed: ${(e as Error).message}`)
      cacheMap.set(cacheKey, [])
      return { layouts: [], errors: [e] }
    }

    //
    // 1) is THIS identifier itself a layout?
    //
    let thisLayoutName: string | undefined
    traverse(ast, {
      ExportNamedDeclaration: (p) => {
        const decl = p.node.declaration
        if (decl?.type === 'VariableDeclaration') {
          for (const d of decl.declarations) {
            if (d.id.type === 'Identifier' && d.id.name === baseIdentifier) {
              const {
                pointType,
                pointName,
                errors: detectPointTypeAndNameFromInitErrors,
              } = this.detectPointTypeAndNameFromInit({ fileAbs, node: d.init })
              errors.push(...detectPointTypeAndNameFromInitErrors)
              if (pointType === 'layout' && pointName) {
                thisLayoutName = pointName
              }
            }
          }
        }
      },
      ExportDefaultDeclaration: (p) => {
        if (baseIdentifier !== 'default') return
        const {
          pointType,
          pointName,
          errors: detectPointTypeAndNameFromInitErrors,
        } = this.detectPointTypeAndNameFromInit({ fileAbs, node: p.node.declaration })
        errors.push(...detectPointTypeAndNameFromInitErrors)
        if (pointType === 'layout' && pointName) {
          thisLayoutName = pointName
        }
      },
    })

    //
    // 2) find parent (same as for routes)
    //
    const {
      parentIdentifier,
      parentImportPath,
      errors: parentRefErrors,
    } = this.findParentRef({ fileAbs, ast, baseIdentifier })
    errors.push(...parentRefErrors)

    // collect here
    const layouts: string[] = []
    if (thisLayoutName) {
      layouts.push(thisLayoutName)
    }

    // no parent → done
    if (!parentIdentifier || parentIdentifier === 'Point0') {
      cacheMap.set(cacheKey, layouts)
      return { layouts, errors }
    }

    //
    // 3) resolve parent file
    //
    const parentAbs = parentImportPath
      ? await this.detectExistingFilePathByImportPath(parentImportPath, fileAbs)
      : fileAbs

    if (!parentAbs) {
      console.warn(`🔴 ${nodePath.relative(this.cwd, fileAbs)} parent layout path not found: ${parentImportPath}`)
      cacheMap.set(cacheKey, layouts)
      return {
        layouts,
        errors: [...errors, new Error(`parent layout path not found: ${parentImportPath}`)],
      }
    }

    //
    // 4) recurse ↑
    //
    const { layouts: parentLayouts, errors: parentLayoutsErrors } = await this.resolveLayoutsChain(
      {
        fileAbs: parentAbs,
        baseIdentifier: parentIdentifier,
      },
      _seen,
    )
    errors.push(...parentLayoutsErrors)

    for (const l of parentLayouts) {
      if (!layouts.includes(l)) {
        layouts.push(l)
      }
    }

    cacheMap.set(cacheKey, layouts)
    return { layouts, errors }
  }

  /**
   * Resolves shouldBePrefetchedOnLinkHover by finding .prefetchOnHover(value) in the chain.
   * If not found on current identifier, goes up the parent chain.
   * Returns false if not found anywhere.
   */
  private async resolveShouldBePrefetchedOnLinkHover(
    {
      fileAbs,
      baseIdentifier,
    }: {
      fileAbs: string
      baseIdentifier: string
    },
    _seen = new Set<string>(),
  ): Promise<boolean | number> {
    const cacheKey = `${fileAbs}::${baseIdentifier}`
    const cacheMap = this.prefetchOnHoverCache
    const cacheValue = cacheMap.get(cacheKey)

    if (cacheValue !== undefined) {
      return cacheValue
    }

    // guard against cycles: fileAbs#id
    const seenKey = `${fileAbs}::${baseIdentifier}`
    if (_seen.has(seenKey)) {
      cacheMap.set(cacheKey, false)
      return false
    }
    _seen.add(seenKey)

    let ast: babel.ParseResult<any>
    try {
      const cachedAst = this.astCache.get(fileAbs)
      if (cachedAst) {
        ast = cachedAst
      } else {
        const content = this.filesContentCache.get(fileAbs) ?? (await nodeFs.readFile(fileAbs, 'utf8'))
        this.filesContentCache.set(fileAbs, content)
        ast = babel.parse(content, {
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
        this.astCache.set(fileAbs, ast)
      }
    } catch (e) {
      console.warn(`🔴 ${nodePath.relative(this.cwd, fileAbs)}: parse failed: ${(e as Error).message}`)
      cacheMap.set(cacheKey, false)
      return false
    }

    //
    // 1) find .prefetchOnHover on THIS identifier
    //
    const thisValue = this.findPrefetchOnHoverOnIdentifier({
      loggableFileAbs: fileAbs,
      ast,
      baseIdentifier,
    })

    // if found – we're done
    if (thisValue !== undefined) {
      cacheMap.set(cacheKey, thisValue)
      return thisValue
    }

    //
    // 2) find parent identifier for THIS export
    //
    const { parentIdentifier, parentImportPath } = this.findParentRef({ fileAbs, ast, baseIdentifier })

    // no parent – return false (default)
    if (!parentIdentifier || parentIdentifier === 'Point0') {
      cacheMap.set(cacheKey, false)
      return false
    }

    //
    // 3) resolve parent fileAbs
    //
    const parentAbs = parentImportPath
      ? await this.detectExistingFilePathByImportPath(parentImportPath, fileAbs)
      : fileAbs

    if (!parentAbs) {
      console.warn(
        `🔴 ${nodePath.relative(this.cwd, fileAbs)} parent ${parentIdentifier} path not found: ${parentImportPath}`,
      )
      cacheMap.set(cacheKey, false)
      return false
    }

    //
    // 4) recurse to parent
    //
    const parentValue = await this.resolveShouldBePrefetchedOnLinkHover(
      {
        fileAbs: parentAbs,
        baseIdentifier: parentIdentifier,
      },
      _seen,
    )

    cacheMap.set(cacheKey, parentValue)
    return parentValue
  }

  private async resolveScope(
    {
      fileAbs,
      baseIdentifier,
    }: {
      fileAbs: string
      baseIdentifier: string
    },
    _seen = new Set<string>(),
  ): Promise<{ scope: string | undefined; attachedTo: PointsScope[]; errors: unknown[] }> {
    const errors: unknown[] = []

    // cycle guard
    const seenKey = `${fileAbs}::${baseIdentifier}`
    if (_seen.has(seenKey)) {
      return {
        scope: undefined,
        attachedTo: [],
        errors: [new Error(`circular scope resolution for ${seenKey}`)],
      }
    }
    _seen.add(seenKey)

    // parse file
    let ast: babel.ParseResult<any>
    try {
      const cachedAst = this.astCache.get(fileAbs)
      if (cachedAst) {
        ast = cachedAst
      } else {
        const content = this.filesContentCache.get(fileAbs) ?? (await nodeFs.readFile(fileAbs, 'utf8'))
        this.filesContentCache.set(fileAbs, content)
        ast = babel.parse(content, {
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
        this.astCache.set(fileAbs, ast)
      }
    } catch (e) {
      console.warn(`🔴 ${nodePath.relative(this.cwd, fileAbs)}: parse failed: ${(e as Error).message}`)
      return { scope: undefined, attachedTo: [], errors: [...errors, e] }
    }

    //
    // 1) find the export for baseIdentifier and extract its init expression
    //
    let initNode: Expression | Declaration | null | undefined = undefined

    traverse(ast, {
      ExportNamedDeclaration: (p) => {
        const decl = p.node.declaration
        if (decl?.type === 'VariableDeclaration') {
          for (const d of decl.declarations) {
            if (d.id.type === 'Identifier' && d.id.name === baseIdentifier) {
              initNode = d.init
            }
          }
        }
      },
      ExportDefaultDeclaration: (p) => {
        if (baseIdentifier === 'default') {
          initNode = p.node.declaration
        }
      },
    })

    if ((initNode as any) === null || (initNode as any) === undefined) {
      // Try to find parent and recurse
      const {
        parentIdentifier,
        parentImportPath,
        errors: findParentRefErrors,
      } = this.findParentRef({ fileAbs, ast, baseIdentifier })
      errors.push(...findParentRefErrors)

      if (!parentIdentifier || parentIdentifier === 'Point0') {
        return {
          scope: undefined,
          attachedTo: [],
          errors: [...errors, new Error(`scope not found for ${baseIdentifier} in ${fileAbs}`)],
        }
      }

      // Resolve parent file
      const parentAbs = parentImportPath
        ? await this.detectExistingFilePathByImportPath(parentImportPath, fileAbs)
        : fileAbs

      if (!parentAbs) {
        return {
          scope: undefined,
          attachedTo: [],
          errors: [...errors, new Error(`parent ${parentIdentifier} path not found: ${parentImportPath}`)],
        }
      }

      // Recurse to parent
      return await this.resolveScope(
        {
          fileAbs: parentAbs,
          baseIdentifier: parentIdentifier,
        },
        _seen,
      )
    }

    //
    // 2) walk through the chain to find Point0.create
    //
    const scopeFormChain = this.extractScopeFromChain({ fileAbs, node: initNode })
    if (scopeFormChain) {
      return { scope: scopeFormChain.scope, attachedTo: scopeFormChain.attachedTo, errors }
    }

    //
    // 3) if not found, try to find parent and recurse
    //
    const {
      parentIdentifier,
      parentImportPath,
      errors: findParentRefErrors,
    } = this.findParentRef({ fileAbs, ast, baseIdentifier })
    errors.push(...findParentRefErrors)

    if (!parentIdentifier || parentIdentifier === 'Point0') {
      return {
        scope: undefined,
        attachedTo: [],
        errors: [...errors, new Error(`scope not found for ${baseIdentifier} in ${fileAbs}`)],
      }
    }

    // Resolve parent file
    const parentAbs = parentImportPath
      ? await this.detectExistingFilePathByImportPath(parentImportPath, fileAbs)
      : fileAbs

    if (!parentAbs) {
      return {
        scope: undefined,
        attachedTo: [],
        errors: [...errors, new Error(`parent ${parentIdentifier} path not found: ${parentImportPath}`)],
      }
    }

    // Recurse to parent
    return await this.resolveScope(
      {
        fileAbs: parentAbs,
        baseIdentifier: parentIdentifier,
      },
      _seen,
    )
  }

  /**
   * Executes scope from a chain by walking left to find Point0.create('scope')
   */
  private extractScopeFromChain({
    fileAbs,
    node,
  }: {
    fileAbs: string
    node: Expression | Declaration | null | undefined
  }): { scope: PointsScope; attachedTo: PointsScope[] } | undefined {
    if (node?.type !== 'CallExpression') {
      return undefined
    }

    // Walk LEFT through the chain to find the root call:
    // ... .head(...) .serverurl(...) Point0.create('client')
    let current: Expression | null | undefined = node
    let rootCall: CallExpression | null = null

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (current) {
      if (current.type === 'CallExpression') {
        rootCall = current
        // if its callee is also a member (something.something) → go further left
        if (current.callee.type === 'MemberExpression') {
          current = current.callee.object
          continue
        }
        break
      } else {
        break
      }
    }

    if (!rootCall) return undefined
    if (rootCall.callee.type !== 'MemberExpression') return undefined

    const obj = rootCall.callee.object
    const prop = rootCall.callee.property

    // must be Point0.create
    if (obj.type !== 'Identifier' || obj.name !== 'Point0') return undefined
    if (prop.type !== 'Identifier') return undefined
    const method = prop.name
    if (!['create'].includes(method)) return undefined

    // scope should be the first string arg i case of Point0.create<typeof source>('client')
    // and it can have as second arg array of scopes like Point0.create<typeof source>('client', ['site', 'expo'])
    const firstArg = rootCall.arguments.at(0)
    const secondArg = rootCall.arguments.at(1)
    if (firstArg?.type === 'StringLiteral') {
      const scope = firstArg.value
      if (secondArg?.type === 'ArrayExpression') {
        const scopes = secondArg.elements
          .map((e) => (e?.type === 'StringLiteral' ? e.value : undefined))
          .filter((e) => e !== undefined)
        return { scope, attachedTo: scopes }
      }
      return { scope, attachedTo: [] }
    }

    // fallback – try to extract from template literal or other string types
    console.warn(`🔴 ${nodePath.relative(this.cwd, fileAbs)} scope not found as string literal in ${method} call`)
    return undefined
  }

  // helpers

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

  private static pointMethodToPointType(method: unknown): EndPointType | null {
    if (typeof method !== 'string') {
      return null
    }
    return POINT_METHOD_TO_TYPE_MAP[method] ?? null
  }

  static isSameCollectedPoint(a: CollectedPoint, b: CollectedPoint): boolean {
    return (
      a.scope === b.scope &&
      a.fileAbs === b.fileAbs &&
      a.name === b.name &&
      a.type === b.type &&
      a.exportName === b.exportName &&
      a.shouldBePrefetchedOnLinkHover === b.shouldBePrefetchedOnLinkHover &&
      a.route?.definition === b.route?.definition &&
      (a.layouts?.every((r) => b.layouts?.includes(r)) || (!a.layouts && !b.layouts))
    )
  }

  static isSameNameAndTypeAndScopeCollectedPoint(a: CollectedPoint, b: CollectedPoint): boolean {
    return a.scope === b.scope && a.name === b.name && a.type === b.type
  }

  static toUniqueCollectedPoints(points: CollectedPoint[]): CollectedPoint[] {
    return points.filter((p, index, self) => index === self.findIndex((t) => Walker.isSameCollectedPoint(t, p)))
  }
}

export type CollectedPoint = {
  scope: PointsScope
  attachedTo: PointsScope[]
  type: EndPointType
  name: PointName
  exportName: string
  route: AnyRoute | undefined
  shouldBePrefetchedOnLinkHover: boolean | number
  layouts?: string[]
  fileAbs: string
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
