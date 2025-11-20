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
import type { AnyRoute, Routes } from '@devp0nt/route0'
import { Route0 } from '@devp0nt/route0'
import * as nodeFs from 'node:fs/promises'
import * as nodePath from 'node:path'
import type { EndPointType, PointName } from '@point0/core/types'

const traverse = ((traverseModule as any).default ?? traverseModule) as typeof traverseType extends { default: infer T }
  ? T
  : typeof traverseType

// TODO: if no routes needed for this point: like layout or page then do not runtime
// TODO: collect in static known route definition if it is string and it was not changed also do not runtime generation

export class Walker {
  readonly cwd: string

  // <scope, Routes>
  readonly routes: Record<string, Routes>

  // Map<fileAbs, content>
  readonly filesContentCache = new Map<string, string>()

  // Map<fileAbs, ast>
  readonly astCache = new Map<string, babel.ParseResult<any>>()

  // Map<fileAbs:baseIdentifier, route>
  readonly routesCache = new Map<string, AnyRoute | undefined>()

  // Map<fileAbs:baseIdentifier, Map<string[]>>
  readonly layoutsCache = new Map<string, string[]>()

  // Cache for TypeScript compiler options per directory
  // Value can be: ParsedCommandLine, null (no tsconfig found), or undefined (not checked yet)
  private readonly tsConfigCache = new Map<string, any>()

  // Lazy-loaded TypeScript module (null if not available)
  private tsModule: typeof import('typescript') | null | undefined = undefined

  constructor(options: { cwd?: string; routes?: Record<string, Routes> } = {}) {
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

  getRoutesByScope(scope: string): Routes | undefined {
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
                    root,
                    errors: detectPointTypeAndNameFromInitErrors,
                  } = this.detectPointTypeAndNameFromInit({ fileAbs, node: d.init })
                  errors.push(...detectPointTypeAndNameFromInitErrors)
                  if (pointType && pointName) {
                    const { scope, errors: scopeErrors } = await this.resolveScope({
                      fileAbs,
                      baseIdentifier: id.name,
                    })
                    errors.push(...scopeErrors)
                    if (!scope) {
                      return null
                    }

                    const shouldHaveRoute = pointType === 'page' || pointType === 'layout'
                    const { route, errors: routeErrors } = shouldHaveRoute
                      ? await this.resolveFullRoute({ fileAbs, baseIdentifier: id.name, scope })
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

                    return {
                      root,
                      type: pointType,
                      name: pointName,
                      exportName: id.name,
                      fileAbs,
                      route,
                      layouts,
                      scope,
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
              root,
              errors: detectPointTypeAndNameFromInitErrors,
            } = this.detectPointTypeAndNameFromInit({ fileAbs, node: decl })
            errors.push(...detectPointTypeAndNameFromInitErrors)
            if (pointType && pointName) {
              const { scope, errors: scopeErrors } = await this.resolveScope({ fileAbs, baseIdentifier: 'default' })
              errors.push(...scopeErrors)
              if (!scope) {
                return null
              }

              const shouldHaveRoute = pointType === 'page' || pointType === 'layout'

              const { route, errors: routeErrors } = shouldHaveRoute
                ? await this.resolveFullRoute({ fileAbs, baseIdentifier: 'default', scope })
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

              return {
                exportName: 'default',
                root,
                type: pointType,
                name: pointName,
                fileAbs,
                route,
                layouts,
                scope,
              }
            }
            return null
          })(),
        )
      },
    })

    const results = await Promise.allSettled(promises)
    const collectedPoints = results.filter((r) => r.status === 'fulfilled').flatMap((r) => r.value || [])
    const promiseRejectedErrors = results.filter((r) => r.status === 'rejected').map((r) => r.reason)
    return { collectedPoints, errors: [...errors, ...promiseRejectedErrors] }
  }

  async prune({
    content,
    fileAbs,
    methods: methodsProvided,
    customer,
  }: {
    content?: string
    fileAbs: string
    methods?: string[]
    customer?: 'client' | 'serverSsr' | 'serverNoSsr'
  }): Promise<string> {
    const methods = (() => {
      if (methodsProvided) {
        return methodsProvided
      }
      if (!customer) {
        throw new Error('customer or methods is required')
      }
      if (customer === 'client') {
        return ['loader', 'ctx', 'mutation', 'response', 'onRequest', 'onResponse']
      }
      const result = ['clientLoader']
      if (customer === 'serverSsr') {
        return result
      }
      if (customer === 'serverNoSsr') {
        result.push(
          'page',
          'component',
          'layout',
          'wrapper',
          'error',
          'loading',
          'pageError',
          'componentError',
          'pageLoading',
          'componentLoading',
        )
        return result
      }
      throw new Error(`Invalid customer: ${customer}`)
    })()

    // 1️⃣ Берём код
    const code =
      content ??
      (await nodeFs.readFile(fileAbs!, 'utf8').catch((e) => {
        console.warn(`🔴 stripPoint0Methods: cannot read file ${fileAbs}: ${(e as Error).message}`)
        throw e
      }))

    // 2️⃣ Парсим или берём AST из кеша
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

    if (!methods.length) return code

    // 3️⃣ Собираем кандидатов: вызовы .loader/.ctx/... + их baseIdentifier
    const candidates: Array<{
      node: CallExpression
      baseIdentifier: string
    }> = []

    traverse(ast, {
      CallExpression: (p) => {
        const node = p.node
        if (node.callee.type !== 'MemberExpression') return
        const prop = node.callee.property
        if (prop.type !== 'Identifier') return
        if (!methods.includes(prop.name)) return

        // Определяем, к какому top-level идентификатору относится эта цепочка
        const baseIdentifier = this.findTopLevelAssignedIdentifier(p as unknown as NodePath<Node>)
        if (!baseIdentifier) {
          // Это какая-то локальная цепочка внутри функции и т.п. — нас не интересует
          return
        }

        candidates.push({ node, baseIdentifier })
      },
    })

    if (candidates.length === 0) {
      return code
    }

    // 4️⃣ Для каждого кандидата проверяем, есть ли scope через resolveScope
    const nodesToStrip: CallExpression[] = []

    // Можно слегка задедупить по (baseIdentifier), чтобы не вызывать resolveScope лишний раз
    const scopeCache = new Map<string, string | undefined>()

    for (const { node, baseIdentifier } of candidates) {
      let scope = scopeCache.get(baseIdentifier)
      if (scope === undefined && !scopeCache.has(baseIdentifier)) {
        try {
          const { scope: resolvedScope } = await this.resolveScope({
            fileAbs,
            baseIdentifier,
          })
          scope = resolvedScope
        } catch (e) {
          console.warn(
            `🔴 stripPoint0Methods: resolveScope failed for ${baseIdentifier} in ${fileAbs}: ${(e as Error).message}`,
          )
          scope = undefined
        }
        scopeCache.set(baseIdentifier, scope)
      }

      // scope найден → это Point0-цепочка ⇒ этот вызов надо очищать
      if (scope) {
        nodesToStrip.push(node)
      }
    }

    if (nodesToStrip.length === 0) {
      return code
    }

    // 5️⃣ Мутируем AST: вычищаем аргументы
    for (const node of nodesToStrip) {
      if (node.arguments.length) {
        node.arguments = []
      }
    }

    // 6️⃣ Генерим код обратно
    const generatorModule = await import('@babel/generator')
    const generate = (generatorModule as any).default ?? generatorModule
    const { code: out } = generate(ast, { retainLines: true })

    // Обновим кеш содержимого, чтобы дальше твой Walker работал в консистентном состоянии
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
    root: boolean
    errors: unknown[]
  } {
    // normal point0-style chain with .lets('page','name') and ending in .page()/.layout()/...
    const errors: unknown[] = []
    if (node?.type !== 'CallExpression' || node.callee.type !== 'MemberExpression') {
      return { pointType: null, pointName: null, root: false, errors }
    }

    // The last method in the chain determines the point type (e.g. ".page()", ".layout()", etc.)
    const lastProp = node.callee.property
    const lastMethod = lastProp.type === 'Identifier' ? lastProp.name : null
    const pointType = Walker.pointMethodToPointType(lastMethod)
    if (!pointType) return { pointType: null, pointName: null, root: false, errors }

    // Find .lets('type','name') anywhere earlier in the chain
    const lets = this.findLetsArgsInChain(node)
    if (!lets) {
      const point0RootBaseResult = this.detectPoint0RootBaseFromChain({ fileAbs, node })
      errors.push(...point0RootBaseResult.errors)
      if (point0RootBaseResult.pointType && point0RootBaseResult.pointName) {
        return {
          pointType: point0RootBaseResult.pointType,
          pointName: point0RootBaseResult.pointName,
          root: point0RootBaseResult.root,
          errors,
        }
      }

      return { pointType: null, pointName: null, root: false, errors }
    }

    const { typeArg, nameArg } = lets
    if (typeArg !== pointType) return { pointType: null, pointName: null, root: false, errors }

    return { pointType, pointName: nameArg, root: false, errors }
  }

  /**
   * Detects chains like:
   *
   *   Point0.connect<typeof source>('client')
   *     .sourceBaseUrl(...)
   *     .head(...)
   *     .base()
   *
   * or
   *
   *   Point0.source('admin').base()
   *
   * If we see `.base()` at the end and the root is Point0.(connect|create|source)(<name>),
   * then it's a "base" point and its name is the first string arg of the root call.
   */
  private detectPoint0RootBaseFromChain({ fileAbs, node }: { fileAbs: string; node: CallExpression }): {
    pointType: EndPointType | null
    pointName: string | null
    root: boolean
    errors: unknown[]
  } {
    // must end with .base()
    // if (node?.type !== 'CallExpression') return { pointType: null, pointName: null, root: false, errors: [] }
    if (node.callee.type !== 'MemberExpression') {
      return { pointType: null, pointName: null, root: false, errors: [] }
    }
    const lastProp = node.callee.property
    if (lastProp.type !== 'Identifier' || lastProp.name !== 'base') {
      return { pointType: null, pointName: null, root: false, errors: [] }
    }

    // walk LEFT through the chain to find the root call:
    // ... .head(...) .sourceBaseUrl(...) Point0.connect('client')
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

    if (!rootCall) return { pointType: null, pointName: null, root: false, errors: [] }
    if (rootCall.callee.type !== 'MemberExpression')
      return { pointType: null, pointName: null, root: false, errors: [] }

    const obj = rootCall.callee.object
    const prop = rootCall.callee.property

    // must be Point0.connect / Point0.create / Point0.source
    if (obj.type !== 'Identifier' || obj.name !== 'Point0')
      return { pointType: null, pointName: null, root: false, errors: [] }
    if (prop.type !== 'Identifier') return { pointType: null, pointName: null, root: false, errors: [] }
    const method = prop.name
    if (!['connect', 'source'].includes(method)) return { pointType: null, pointName: null, root: false, errors: [] }

    // name should be the first string arg
    const firstArg = rootCall.arguments.at(0)
    if (firstArg?.type === 'StringLiteral') {
      return {
        pointType: 'base',
        pointName: firstArg.value,
        root: true,
        errors: [],
      }
    }

    // fallback – it's still a root base, just no explicit name
    console.warn(`🔴 ${nodePath.relative(this.cwd, fileAbs)} root base name not found`)
    return {
      pointType: null,
      pointName: null,
      root: true,
      errors: [new Error('root base name not found')],
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
   * - `.route('/news')` → routeSegment = '/news'
   * - `.route(routes.ideaNews)` → we try to resolve from this.routes
   */
  private findRouteOnIdentifier({
    fileAbs,
    ast,
    baseIdentifier,
    scope,
  }: {
    fileAbs: string
    ast: babel.ParseResult<any>
    baseIdentifier: string
    scope: string
  }): { routeSegment?: string; routeFull?: AnyRoute; errors: unknown[] } {
    let routeSegment: string | undefined
    let routeFull: AnyRoute | undefined
    const errors: unknown[] = []

    try {
      traverse(ast, {
        CallExpression: (p) => {
          const callee = p.node.callee
          if (
            callee.type === 'MemberExpression' &&
            callee.property.type === 'Identifier' &&
            callee.property.name === 'route'
          ) {
            const topLevelAssignedIdentifier = this.findTopLevelAssignedIdentifier(p.get('callee').get('object'))
            if (topLevelAssignedIdentifier !== baseIdentifier) return

            // proceed if the chain belongs to our identifier
            if (p.node.arguments.length === 0) {
              routeSegment = ''
            } else {
              const arg = p.node.arguments.at(0)
              if (arg?.type === 'StringLiteral') {
                routeSegment = arg.value
              } else if (arg?.type === 'MemberExpression') {
                // e.g. .route(routes.ideaNews)
                const prop = arg.property
                if (prop.type === 'Identifier') {
                  const routeKey = prop.name
                  const scopeRoute = this.getRouteByScope(scope, routeKey)
                  if (scopeRoute) {
                    routeFull = scopeRoute
                  } else {
                    errors.push(new Error(`unknown route key '${routeKey}'`))
                    console.warn(
                      `🔴 ${nodePath.relative(this.cwd, fileAbs)} unknown route key '${routeKey}' for ${baseIdentifier}`,
                    )
                  }
                }
              }
            }
          }
        },
      })

      return { routeSegment, routeFull, errors }
    } catch (e) {
      console.warn(
        `🔴 ${nodePath.relative(this.cwd, fileAbs)} find route on identifier for ${baseIdentifier} failed: ${(e as Error).message}`,
      )
      return { routeSegment: undefined, routeFull: undefined, errors: [...errors, e] }
    }
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
      fileAbs,
      baseIdentifier,
      scope,
    }: {
      fileAbs: string
      baseIdentifier: string
      scope: string
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
      console.warn(`🔴 ${nodePath.relative(this.cwd, fileAbs)}: parse failed: ${(e as Error).message}`)
      cacheMap.set(cacheKey, undefined)
      return { route: undefined, errors: [...errors, e] }
    }

    //
    // 1) find route on THIS identifier
    //
    const { routeSegment, routeFull } = this.findRouteOnIdentifier({ fileAbs, ast, baseIdentifier, scope })

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
      const finalRoute = routeSegment !== undefined ? Route0.from(routeSegment) : undefined
      if (!finalRoute) {
        console.warn(`🔴 ${nodePath.relative(this.cwd, fileAbs)} parent identifier not found for ${baseIdentifier}`)
        cacheMap.set(cacheKey, undefined)
        return { route: undefined, errors: [...errors, new Error(`parent identifier not found for ${baseIdentifier}`)] }
      } else {
        cacheMap.set(cacheKey, finalRoute)
        return { route: finalRoute, errors }
      }
    }
    if (parentIdentifier === 'Point0') {
      const finalRoute = routeSegment !== undefined ? Route0.from(routeSegment) : undefined
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
        `🔴 ${nodePath.relative(this.cwd, fileAbs)} parent ${parentIdentifier} path not found: ${parentImportPath}`,
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
        fileAbs: parentAbs,
        baseIdentifier: parentIdentifier,
        scope,
      },
      _seen,
    )
    errors.push(...resolveFullRouteErrors)

    //
    // 5) stitch parent + current segment
    //
    const finalRoute =
      parentRoute !== undefined && routeSegment !== undefined
        ? routeSegment.startsWith('/')
          ? Route0.from(routeSegment)
          : routeSegment === ''
            ? parentRoute.clone()
            : parentRoute.extend(routeSegment)
        : routeSegment !== undefined
          ? Route0.from(routeSegment)
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

  private async resolveScope(
    {
      fileAbs,
      baseIdentifier,
    }: {
      fileAbs: string
      baseIdentifier: string
    },
    _seen = new Set<string>(),
  ): Promise<{ scope: string | undefined; errors: unknown[] }> {
    const errors: unknown[] = []

    // cycle guard
    const seenKey = `${fileAbs}::${baseIdentifier}`
    if (_seen.has(seenKey)) {
      return {
        scope: undefined,
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
      return { scope: undefined, errors: [...errors, e] }
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
    // 2) walk through the chain to find Point0.connect or Point0.source
    //
    const scope = this.extractScopeFromChain({ fileAbs, node: initNode })
    if (scope) {
      return { scope, errors }
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
   * Extracts scope from a chain by walking left to find Point0.connect('scope') or Point0.source('scope')
   */
  private extractScopeFromChain({
    fileAbs,
    node,
  }: {
    fileAbs: string
    node: Expression | Declaration | null | undefined
  }): string | undefined {
    if (node?.type !== 'CallExpression') {
      return undefined
    }

    // Walk LEFT through the chain to find the root call:
    // ... .head(...) .sourceBaseUrl(...) Point0.connect('client')
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

    // must be Point0.connect / Point0.source
    if (obj.type !== 'Identifier' || obj.name !== 'Point0') return undefined
    if (prop.type !== 'Identifier') return undefined
    const method = prop.name
    if (!['connect', 'source'].includes(method)) return undefined

    // scope should be the first string arg
    const firstArg = rootCall.arguments.at(0)
    if (firstArg?.type === 'StringLiteral') {
      return firstArg.value
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
  private async getTsConfigForDirectory(dir: string): Promise<any | null> {
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
          const configFile = ts.readConfigFile(tsConfigPath, ts.sys.readFile)
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
}

export type CollectedPoint = {
  scope: string
  root: boolean
  type: EndPointType
  name: PointName
  exportName: string
  route?: AnyRoute
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
  response: 'response',
  provider: 'provider',
  base: 'base',
}
export const POINT_METHOD_TO_TYPE_MAP: Record<string, EndPointType> = Object.fromEntries(
  Object.entries(POINT_TYPE_TO_METHOD_MAP).map(([type, method]) => [method, type as EndPointType]),
)
export const END_POINT_TYPES: EndPointType[] = Object.keys(POINT_TYPE_TO_METHOD_MAP) as EndPointType[]
