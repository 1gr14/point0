import * as babel from '@babel/parser'
import type traverseType from '@babel/traverse'
import traverseModule from '@babel/traverse'
import type { AnyRoute, Routes } from '@devp0nt/route0'
import { Route0 } from '@devp0nt/route0'
import { Glob } from 'bun'
import type { Jiti } from 'jiti'
import { createJiti } from 'jiti'
import * as nodeFs from 'node:fs'
import { watch as fsWatch } from 'node:fs'
import * as nodePath from 'node:path'
import type { EndPointType, PointName } from '../core/types.js'

// TODO: if no routes needed for this point: like layout or page then do not runtime
// TODO: collect in static known route definition if it is string and it was not changed also do not runtime generation

const traverse = ((traverseModule as any).default ?? traverseModule) as typeof traverseType extends { default: infer T }
  ? T
  : typeof traverseType

export type FileGeneratorOptions = {
  banner?: string
  routes?: Routes | string
  glob: string | string[]
  ready: string
  lazy: string
  basepath: string
}

type CollectedPoint = {
  type: EndPointType
  name: PointName
  exportName: string
  importPath: string
  route?: AnyRoute
  layouts?: string[]
  fileAbs: string
}

type ChangeCollectedPointsEvent = {
  points: CollectedPoint[]
  deleted: CollectedPoint[]
  updated: CollectedPoint[]
  added: CollectedPoint[]
  changed: boolean
  errors: unknown[]
}

const POINT_TYPE_TO_METHOD_MAP: Record<EndPointType, string> = {
  page: 'page',
  layout: 'layout',
  component: 'component',
  mutation: 'mutation',
  query: 'query',
  response: 'response',
  'client-ctx': 'clientCtx',
  base: 'base',
}
const POINT_METHOD_TO_TYPE_MAP: Record<string, EndPointType> = Object.fromEntries(
  Object.entries(POINT_TYPE_TO_METHOD_MAP).map(([type, method]) => [method, type as EndPointType]),
)
const END_POINT_TYPES: EndPointType[] = Object.keys(POINT_TYPE_TO_METHOD_MAP) as EndPointType[]

export class FileGenerator {
  readonly routes: Routes | undefined
  readonly banner: string | undefined
  readonly globInclude: string[]
  readonly globExclude: string[]
  readonly outputReadyAbs: string | undefined
  readonly outputLazyAbs: string | undefined
  readonly outputRoutesAbs: string | undefined
  readonly basepath: string
  readonly jiti: Jiti

  private readonly files = new Set<string>()
  private points: CollectedPoint[] = []

  // Map<outputAbs, content>
  private readonly lastEmittedContentMap = new Map<string, string>()

  constructor(opts: FileGeneratorOptions) {
    this.routes = typeof opts.routes === 'string' ? undefined : opts.routes
    this.banner = opts.banner
    this.basepath = opts.basepath
    const glob = Array.isArray(opts.glob) ? opts.glob : [opts.glob]
    this.globInclude = glob.filter((g) => !g.startsWith('!')).map((g) => nodePath.resolve(this.basepath, g))
    this.globExclude = glob.filter((g) => g.startsWith('!')).map((g) => nodePath.resolve(this.basepath, g.slice(1)))
    this.outputReadyAbs = nodePath.resolve(this.basepath, opts.ready)
    this.outputLazyAbs = nodePath.resolve(this.basepath, opts.lazy)
    this.outputRoutesAbs = typeof opts.routes === 'string' ? nodePath.resolve(this.basepath, opts.routes) : undefined
    this.jiti = this.createFreshJiti()
  }

  static create(opts: FileGeneratorOptions) {
    return new FileGenerator(opts)
  }

  async sync() {
    await this.collectFiles()
    const { errors, points, changed } = await this.processFiles()
    if (changed) {
      await this.writeOutput()
      const [consoleMethod, emoji] = errors.length > 0 ? ['warn' as const, '🟡'] : ['info' as const, '✅']
      console[consoleMethod](`${emoji} ${points.length} points processed`)
    }
  }

  watch() {
    void FileWatcher.watch({
      generators: [this],
      glob: [...this.globInclude, ...this.globExclude],
      basepath: this.basepath,
    })
  }

  // files

  private async collectFiles() {
    for (const pattern of this.globInclude) {
      const matcher = new Glob(pattern)
      for await (const path of matcher.scan(this.basepath)) {
        const shouldExclude = this.globExclude.some((ex) => new Glob(ex).match(path))
        if (!shouldExclude) {
          this.files.add(nodePath.resolve(this.basepath, path))
        }
      }
    }
  }

  isFileSuitableToGlob(fileAbs: string): boolean {
    return (
      this.globInclude.some((g) => new Glob(g).match(fileAbs)) &&
      !this.globExclude.some((g) => new Glob(g).match(fileAbs))
    )
  }

  // watch reactions

  async updateFromFile(fileAbs: string): Promise<ChangeCollectedPointsEvent> {
    this.files.add(fileAbs)
    const evt = await this.processFile(fileAbs)
    if (evt.changed) {
      await this.writeOutput()
    }
    return evt
  }

  async removeDirOrFile(fileOrDirAbs: string): Promise<ChangeCollectedPointsEvent> {
    const evt = this.removePointsByFileOrDirAbs(fileOrDirAbs)
    if (evt.changed) {
      await this.writeOutput()
    }
    for (const file of this.files) {
      if (file.startsWith(fileOrDirAbs)) {
        this.files.delete(file)
      }
    }
    return evt
  }

  // mutations

  private addPoint(collectedPoint: CollectedPoint): {
    status: 'replaced' | 'added'
    prevPoint: CollectedPoint | undefined
    newPoint: CollectedPoint
  } {
    const prevPointIndex = this.points.findIndex((p) => FileGenerator.isSameCollectedPoint(p, collectedPoint))
    if (prevPointIndex !== -1) {
      const prevPoint = this.points[prevPointIndex]
      this.points[prevPointIndex] = collectedPoint
      return { status: 'replaced', prevPoint, newPoint: collectedPoint }
    } else {
      this.points.push(collectedPoint)
      this.sortPoints()
      return { status: 'added', prevPoint: undefined, newPoint: collectedPoint }
    }
  }

  private addPoints(points: CollectedPoint[]): ChangeCollectedPointsEvent {
    const added: CollectedPoint[] = []
    const updated: CollectedPoint[] = []
    for (const point of points) {
      const { status, newPoint } = this.addPoint(point)
      if (status === 'added') {
        added.push(newPoint)
      }
      if (status === 'replaced') {
        updated.push(newPoint)
      }
    }
    const changed = added.length > 0
    return { points: this.points, deleted: [], added, updated, changed, errors: [] }
  }

  private deletePoints(points: CollectedPoint[]): ChangeCollectedPointsEvent {
    const deleted = points.filter((p) => this.points.some((cp) => FileGenerator.isSameCollectedPoint(p, cp)))
    this.points = this.points.filter((p) => !points.some((cp) => FileGenerator.isSameCollectedPoint(p, cp)))
    const changed = deleted.length > 0
    if (changed) {
      this.sortPoints()
    }
    return { points: this.points, deleted, added: [], updated: [], changed, errors: [] }
  }

  private replacePoints(points: CollectedPoint[]): ChangeCollectedPointsEvent {
    const added: CollectedPoint[] = []
    const deleted: CollectedPoint[] = []
    const updated: CollectedPoint[] = []
    for (const point of points) {
      const { status, newPoint } = this.addPoint(point)
      if (status === 'added') {
        added.push(newPoint)
      }
      if (status === 'replaced') {
        updated.push(newPoint)
      }
    }
    for (const point of this.points) {
      const shouldBeDeleted = !points.some((p) => FileGenerator.isSameCollectedPoint(p, point))
      if (shouldBeDeleted) {
        deleted.push(point)
      }
    }
    this.points = points
    this.sortPoints()
    const changed = added.length > 0 || deleted.length > 0
    return { points: this.points, deleted, added, updated, changed, errors: [] }
  }

  private sortPoints(): void {
    const order = END_POINT_TYPES
    const orderIndex = new Map(order.map((t, i) => [t, i]))

    this.points.sort((a, b) => {
      const aIndex = orderIndex.get(a.type) ?? Number.MAX_SAFE_INTEGER
      const bIndex = orderIndex.get(b.type) ?? Number.MAX_SAFE_INTEGER
      const byType = aIndex - bIndex
      if (byType !== 0) return byType

      const byRoute = !a.route ? 0 : !b.route ? 1 : a.route.isMoreSpecificThan(b.route) ? -1 : 1
      if (byRoute !== 0) return byRoute

      const byName = a.name.localeCompare(b.name)
      if (byName !== 0) return byName

      return a.fileAbs.localeCompare(b.fileAbs)
    })
  }

  private removePointsByFileOrDirAbs(fileOrDirAbs: string): ChangeCollectedPointsEvent {
    const deleted = this.points.filter((p) => p.fileAbs === fileOrDirAbs || p.fileAbs.startsWith(fileOrDirAbs))
    this.points = this.points.filter(
      (p) => p.fileAbs !== fileOrDirAbs && !p.fileAbs.startsWith(fileOrDirAbs + nodePath.sep),
    )
    const changed = deleted.length > 0
    return { points: this.points, deleted, added: [], updated: [], changed, errors: [] }
  }

  // processing

  private async processFile(fileAbs: string): Promise<ChangeCollectedPointsEvent> {
    const collector = new PointsCollector({ basepath: this.basepath, routes: this.routes })
    const { collectedPoints, errors } = await collector.collectPointsFromFile({ fileAbs })
    const prevPointsWithThisFile = this.points.filter((p) => p.fileAbs === fileAbs)
    const deleted =
      errors.length > 0
        ? []
        : prevPointsWithThisFile.filter((p) => !collectedPoints.some((cp) => FileGenerator.isSameCollectedPoint(p, cp)))
    const addResult = this.addPoints(collectedPoints)
    const deleteResult = this.deletePoints(deleted)
    return {
      points: this.points,
      added: addResult.added,
      deleted: deleteResult.deleted,
      updated: addResult.updated,
      changed: addResult.changed || deleteResult.changed,
      errors,
    }
  }

  private async processFiles(chunkSize = 30): Promise<ChangeCollectedPointsEvent> {
    const files = [...this.files]
    const chunks = FileGenerator.chunk(files, chunkSize)
    const collector = new PointsCollector({ basepath: this.basepath, routes: this.routes })
    const collectedChunks = await Promise.all(
      chunks.map(async (chunk) => {
        const pointsArrays = await Promise.all(
          chunk.map(async (fileAbs) => await collector.collectPointsFromFile({ fileAbs })),
        )
        return pointsArrays.flat()
      }),
    )
    const errors = collectedChunks.flatMap((chunk) => chunk.flatMap((p) => p.errors))
    const collectedPoints = collectedChunks.flatMap((chunk) => chunk.flatMap((p) => p.collectedPoints))
    if (errors.length === 0) {
      return this.replacePoints(collectedPoints)
    } else {
      const result = this.addPoints(collectedPoints)
      return { ...result, errors: [...result.errors, ...errors] }
    }
  }

  private async writeOutput() {
    if (this.outputLazyAbs) {
      await this.writeOneOutput({ content: this.emitLazyPointsFile(this.points), outputAbs: this.outputLazyAbs })
    }
    if (this.outputReadyAbs) {
      await this.writeOneOutput({ content: this.emitReadyPointsFile(this.points), outputAbs: this.outputReadyAbs })
    }
    if (this.outputRoutesAbs) {
      await this.writeOneOutput({ content: this.emitRoutesPointsFile(this.points), outputAbs: this.outputRoutesAbs })
    }
  }

  private async writeOneOutput({ content, outputAbs }: { content: string; outputAbs: string }) {
    if (content === this.lastEmittedContentMap.get(outputAbs)) {
      return
    }
    await nodeFs.promises.mkdir(nodePath.dirname(outputAbs), { recursive: true })
    const tmp = outputAbs + '.tmp'
    await nodeFs.promises.writeFile(tmp, content, 'utf8')
    await nodeFs.promises.rename(tmp, outputAbs)
    // await Bun.write(this.outputAbs, content)
    // nodeFs.writeFileSync(this.outputAbs, content)
    this.lastEmittedContentMap.set(outputAbs, content)
  }

  // emit

  private emitLazyPointsFile(points: CollectedPoint[]): string {
    if (!this.outputLazyAbs) {
      throw new Error('outputLazyAbs is not set')
    }
    const lines: string[] = []
    if (this.banner) {
      lines.push(this.banner)
    }
    lines.push(`import { Points } from 'point0/core/points.js'`)
    lines.push(``)

    if (this.points.length === 0) {
      lines.push(`export const points = Points.lazy([])`)
    } else {
      lines.push(`export const points = Points.lazy([`)
      for (const point of points) {
        lines.push(`  {`)
        lines.push(`    type: '${point.type}',`)
        lines.push(`    name: '${point.name}',`)
        if (point.route) {
          lines.push(`    route: '${point.route.definition}',`)
        }
        if (point.type === 'page' && point.layouts?.length) {
          const arr = point.layouts
            .map((r) => `'${r}'`)
            .reverse()
            .join(', ')
          lines.push(`    layouts: [${arr}],`)
        }
        // const exportNameSuffix = point.type === 'component' ? '.point' : ''
        const exportNameSuffix = '.point'
        lines.push(
          `    point: async () => (await import('${FileGenerator.toRelativeJsImportPath(this.outputLazyAbs, point.importPath)}')).${point.exportName === 'default' ? 'default' : point.exportName}${exportNameSuffix},`,
        )
        lines.push(`  },`)
      }
      lines.push(`])`)
    }

    lines.push(``)
    return lines.join('\n')
  }

  private emitReadyPointsFile(points: CollectedPoint[]): string {
    if (!this.outputReadyAbs) {
      throw new Error('outputReadyAbs is not set')
    }
    const lines: string[] = []
    if (this.banner) {
      lines.push(this.banner)
    }
    lines.push(`import { Points } from 'point0/core/points.js'`)

    const importPathsAndExportNames: Array<{
      importPath: string
      exports: Array<{ originalExportName: string; renamedExportName: string }>
    }> = []
    for (const [pointIndex, point] of points.entries()) {
      const importPath = FileGenerator.toRelativeJsImportPath(this.outputReadyAbs, point.importPath)
      const importPathAndExportNames = importPathsAndExportNames.find((p) => p.importPath === importPath)
      const newItem =
        point.exportName === 'default'
          ? { originalExportName: 'default', renamedExportName: `unnamed${pointIndex}` }
          : { originalExportName: point.exportName, renamedExportName: `${point.exportName}${pointIndex}` }
      if (importPathAndExportNames) {
        importPathAndExportNames.exports.push(newItem)
      } else {
        importPathsAndExportNames.push({ importPath, exports: [newItem] })
      }
    }

    for (const importPathAndExportNames of importPathsAndExportNames) {
      const defaultItem = importPathAndExportNames.exports.find((e) => e.originalExportName === 'default')
      const defaultPart = defaultItem ? defaultItem.renamedExportName : undefined
      const namedItems = importPathAndExportNames.exports.filter((e) => e.originalExportName !== 'default')
      const namedPart =
        namedItems.length > 0
          ? `{ ${namedItems.map((e) => `${e.originalExportName} as ${e.renamedExportName}`).join(', ')} }`
          : undefined
      const combinedPart = defaultPart ? `${defaultPart}, ${namedPart}` : namedPart
      if (!combinedPart) {
        continue
      }
      lines.push(`import ${combinedPart} from '${importPathAndExportNames.importPath}'`)
    }

    if (this.points.length === 0) {
      lines.push(``)
      lines.push(`export const points = Points.ready([])`)
    } else {
      lines.push(``)
      lines.push(`export const points = Points.ready([`)
      for (const [pointIndex, point] of points.entries()) {
        lines.push(`  {`)
        lines.push(`    type: '${point.type}',`)
        lines.push(`    name: '${point.name}',`)
        if (point.route) {
          lines.push(`    route: '${point.route.definition}',`)
        }
        if (point.type === 'page' && point.layouts?.length) {
          const arr = point.layouts
            .map((r) => `'${r}'`)
            .reverse()
            .join(', ')
          lines.push(`    layouts: [${arr}],`)
        }
        if (point.exportName === 'default') {
          lines.push(`    point: unnamed${pointIndex}.point,`)
        } else {
          lines.push(`    point: ${point.exportName}${pointIndex}.point,`)
        }
        lines.push(`  },`)
      }
      lines.push(`])`)
    }

    lines.push(``)
    return lines.join('\n')
  }

  private emitRoutesPointsFile(points: CollectedPoint[]): string {
    if (!this.outputRoutesAbs) {
      throw new Error('outputRoutesAbs is not set')
    }
    const lines: string[] = []
    if (this.banner) {
      lines.push(this.banner)
    }
    lines.push(`import { Routes } from '@devp0nt/route0'`)
    lines.push(``)

    const pagePoints = points.flatMap((p) =>
      p.type === 'page' && p.route ? [{ name: p.name, route: p.route.definition }] : [],
    )
    if (pagePoints.length > 0) {
      lines.push(`export const routes = Routes.create({`)
      for (const p of pagePoints) {
        lines.push(`  ${p.name}: '${p.route}',`)
      }
      lines.push(`})`)
    } else {
      lines.push(`export const routes = Routes.create({})`)
    }
    lines.push(``)

    return lines.join('\n')
  }

  // utils

  private createFreshJiti() {
    return createJiti(this.basepath, {
      cache: false,
      interopDefault: true,
      moduleCache: false,
      fsCache: false,
      extensions: ['.ts', '.tsx', '.js', '.mjs', '.cjs'],
    })
  }

  private static chunk<T>(array: readonly T[], size: number): T[][] {
    if (size <= 0) throw new Error('chunk size must be > 0')
    const result: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      result.push(array.slice(i, i + size))
    }
    return result
  }

  private static isSameCollectedPoint(a: CollectedPoint, b: CollectedPoint): boolean {
    return (
      a.fileAbs === b.fileAbs &&
      a.name === b.name &&
      a.type === b.type &&
      a.route === b.route &&
      (a.layouts?.every((r) => b.layouts?.includes(r)) || (!a.layouts && !b.layouts))
    )
  }

  private static toRelativeJsImportPath(fromAbs: string, toAbs: string): string {
    let rel = nodePath
      .relative(nodePath.dirname(fromAbs), toAbs)
      .replace(/\\/g, '/')
      .replace(/.tsx?$/, '.js')
    if (!rel.startsWith('.')) rel = './' + rel
    return rel
  }
}

export class PointsCollector {
  readonly basepath: string
  readonly routes: Routes | undefined

  // Map<fileAbs, content>
  readonly filesContentCache = new Map<string, string>()

  // Map<fileBase, Map<baseIdentifier, route>>
  readonly filesBaseRoutesCache = new Map<string, Map<string, AnyRoute>>()

  // Map<fileAbs, Map<baseIdentifier, string[]>>  // ← NEW
  readonly filesBaseLayoutsCache = new Map<string, Map<string, string[]>>()

  constructor({ basepath, routes }: { basepath: string; routes: Routes | undefined }) {
    this.basepath = basepath
    this.routes = routes
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
          content = await Bun.file(fileAbs).text()
        } catch (e) {
          console.warn(`❌ ${nodePath.relative(this.basepath, fileAbs)}: read failed: ${(e as Error).message}`)
          return { collectedPoints: [], errors: [e] }
        }
      }
      return await this.extractCollectedPointsFromContent({ content, fileAbs })
    } catch (e) {
      console.warn(`❌ ${nodePath.relative(this.basepath, fileAbs)}: parse failed: ${(e as Error).message}`)
      return { collectedPoints: [], errors: [e] }
    }
  }

  private async extractCollectedPointsFromContent({ content, fileAbs }: { content: string; fileAbs: string }): Promise<{
    collectedPoints: CollectedPoint[]
    errors: unknown[]
  }> {
    let ast
    try {
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
    } catch (e) {
      console.warn(`❌ ${nodePath.relative(this.basepath, fileAbs)}: parse failed: ${(e as Error).message}`)
      return { collectedPoints: [], errors: [e] }
    }

    const promises: Array<Promise<CollectedPoint | null>> = []

    traverse(ast, {
      ExportNamedDeclaration: (p) => {
        promises.push(
          (async () => {
            const decl = p.node.declaration
            if (decl?.type === 'VariableDeclaration') {
              for (const d of decl.declarations) {
                const id = d.id
                if (id.type === 'Identifier') {
                  const { pointType, pointName } = this.detectPointTypeAndNameFromInit(d.init)
                  if (pointType && pointName) {
                    const baseIdentifier = this.findBaseIdentifier(d.init)
                    const shouldHaveRoute = pointType === 'page' || pointType === 'layout'
                    const route =
                      shouldHaveRoute && baseIdentifier
                        ? await this.resolveFullRoute({ fileAbs, baseIdentifier })
                        : undefined

                    // ← NEW: collect layouts for pages
                    const layouts =
                      pointType === 'page' && baseIdentifier
                        ? await this.resolveLayoutsChain({ fileAbs, baseIdentifier })
                        : undefined

                    if (shouldHaveRoute && !route) {
                      const message = `route not detected for ${pointType}.${pointName}`
                      console.warn(`❌ ${nodePath.relative(this.basepath, fileAbs)}: ${message}`)
                      throw new Error(message)
                    }

                    return {
                      type: pointType,
                      name: pointName,
                      exportName: id.name,
                      importPath: fileAbs,
                      fileAbs,
                      route,
                      layouts, // ← NEW
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
            const { pointType, pointName } = this.detectPointTypeAndNameFromInit(decl)
            if (pointType && pointName) {
              const shouldHaveRoute = pointType === 'page' || pointType === 'layout'
              const route = shouldHaveRoute
                ? await this.resolveFullRoute({ fileAbs, baseIdentifier: 'default' })
                : undefined

              // ← NEW: collect layouts for default-exported pages
              const layouts =
                pointType === 'page'
                  ? await this.resolveLayoutsChain({ fileAbs, baseIdentifier: 'default' })
                  : undefined

              if (shouldHaveRoute && !route) {
                const message = `route not detected for ${pointType}.${pointName}`
                console.warn(`❌ ${nodePath.relative(this.basepath, fileAbs)}: ${message}`)
                throw new Error(message)
              }
              return {
                exportName: 'default',
                type: pointType,
                name: pointName,
                importPath: fileAbs,
                fileAbs,
                route,
                layouts, // ← NEW
              }
            }
            return null
          })(),
        )
      },
    })

    const results = await Promise.allSettled(promises)
    const collectedPoints = results.filter((r) => r.status === 'fulfilled').flatMap((r) => r.value || [])
    const errors = results.filter((r) => r.status === 'rejected').map((r) => r.reason)
    return { collectedPoints, errors }
  }

  private detectPointTypeAndNameFromInit(node: any): { pointType: EndPointType | null; pointName: string | null } {
    if (node?.type !== 'CallExpression' || node.callee?.type !== 'MemberExpression') {
      return { pointType: null, pointName: null }
    }

    // The last method in the chain determines the point type (e.g. ".page()", ".layout()", etc.)
    const lastProp = node.callee.property
    const lastMethod = lastProp?.type === 'Identifier' ? lastProp.name : null
    const pointType = PointsCollector.pointMethodToPointType(lastMethod)
    if (!pointType) return { pointType: null, pointName: null }

    // Find .lets('type','name') anywhere earlier in the chain
    const lets = this.findLetsArgsInChain(node)
    if (!lets) return { pointType: null, pointName: null }

    const { typeArg, nameArg } = lets
    if (typeArg !== pointType) return { pointType: null, pointName: null }

    return { pointType, pointName: nameArg }
  }

  private findLetsArgsInChain(call: any): { typeArg: EndPointType; nameArg: string } | null {
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

  private findBaseIdentifier(node: any): string | undefined {
    let current = node
    while (current?.type === 'CallExpression') {
      const callee = current.callee
      if (callee?.type === 'MemberExpression') {
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

  private async resolveFullRoute({
    fileAbs,
    baseIdentifier,
  }: {
    fileAbs: string
    baseIdentifier: string
  }): Promise<AnyRoute | undefined> {
    const filesBaseMap = this.filesBaseRoutesCache.get(fileAbs) || new Map()
    if (filesBaseMap.has(baseIdentifier)) {
      return filesBaseMap.get(baseIdentifier)
    }

    try {
      const content = this.filesContentCache.get(fileAbs) ?? (await Bun.file(fileAbs).text())
      const ast = babel.parse(content, {
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

      let routeFull: AnyRoute | undefined
      let routeSegment: string | undefined
      let parentImportPath: string | undefined
      let parentIdentifier: string | undefined

      traverse(ast, {
        CallExpression: (p) => {
          const callee = p.node.callee
          if (
            callee.type === 'MemberExpression' &&
            callee.property.type === 'Identifier' &&
            callee.property.name === 'route'
          ) {
            const arg = p.node.arguments.at(0)
            if (arg?.type === 'StringLiteral') {
              routeSegment = arg.value
            } else if (arg?.type === 'MemberExpression') {
              // e.g. .route(something.anything)
              const prop = arg.property
              if (prop.type === 'Identifier') {
                const routeKey = prop.name
                // TODO: get routes from routes._.getRoute(routeKey)
                if (this.routes && (this.routes as any)[routeKey]) {
                  routeFull = (this.routes as any)[routeKey]
                } else {
                  console.warn(
                    `❌ ${nodePath.relative(this.basepath, fileAbs)}: unknown route key '${routeKey}' (no match in provided routes)`,
                  )
                }
              }
            }
          }
        },
        ImportDeclaration(p) {
          for (const spec of p.node.specifiers) {
            if (
              spec.type === 'ImportSpecifier' &&
              spec.imported.type === 'Identifier' &&
              spec.local.name === baseIdentifier
            ) {
              parentImportPath = p.node.source.value
              parentIdentifier = spec.imported.name
            } else if (spec.type === 'ImportDefaultSpecifier' && spec.local.name === baseIdentifier) {
              parentImportPath = p.node.source.value
              parentIdentifier = 'default'
            }
          }
        },
      })

      if (routeFull) {
        filesBaseMap.set(baseIdentifier, routeFull)
        return routeFull
      }

      // Recursively follow import chain if there is a parent layout or base
      if (parentImportPath && parentIdentifier) {
        const parentAbs = await PointsCollector.detectExistingFilePathByImportPath(
          nodePath.resolve(nodePath.dirname(fileAbs), parentImportPath),
        )
        if (!parentAbs) {
          console.warn(
            `❌ ${nodePath.relative(this.basepath, fileAbs)} parent import path not found: ${parentImportPath}`,
          )
          filesBaseMap.set(baseIdentifier, undefined)
          return undefined
        }
        const parentRoute = await this.resolveFullRoute({
          fileAbs: parentAbs,
          baseIdentifier: parentIdentifier,
        })
        const route =
          parentRoute && routeSegment
            ? Route0.create(parentRoute).extend(routeSegment)
            : parentRoute
              ? Route0.create(parentRoute)
              : routeSegment
                ? Route0.create(routeSegment)
                : undefined
        filesBaseMap.set(baseIdentifier, route)
        return route
      }

      const route = routeSegment ? Route0.create(routeSegment) : undefined
      filesBaseMap.set(baseIdentifier, route)
      return route
    } catch (e) {
      console.warn(`❌ ${nodePath.relative(this.basepath, fileAbs)} route resolve failed: ${(e as Error).message}`)
      filesBaseMap.set(baseIdentifier, undefined)
      return undefined
    }
  }

  private async resolveLayoutsChain({
    fileAbs,
    baseIdentifier,
  }: {
    fileAbs: string
    baseIdentifier: string
  }): Promise<string[]> {
    // per-file cache
    const fileCache = this.filesBaseLayoutsCache.get(fileAbs) ?? new Map<string, string[]>()

    if (fileCache.has(baseIdentifier)) {
      return fileCache.get(baseIdentifier) ?? []
    }

    // optimistic set to avoid cycles
    // fileCache.set(baseIdentifier, [])
    // this.filesBaseLayoutsCache.set(fileAbs, fileCache)

    let content: string
    try {
      content = this.filesContentCache.get(fileAbs) ?? (await Bun.file(fileAbs).text())
    } catch {
      return []
    }

    const ast = babel.parse(content, {
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

    let thisLayoutName: string | undefined
    let parentImportPath: string | undefined
    let parentIdentifier: string | undefined
    let baseIdFromDefinition: string | undefined

    // we need `this` inside callbacks

    traverse(ast, {
      // 1. check if this file DEFINES the baseIdentifier as a layout
      ExportNamedDeclaration: (path) => {
        const decl = path.node.declaration
        if (decl?.type === 'VariableDeclaration') {
          for (const d of decl.declarations) {
            if (d.id.type === 'Identifier' && d.id.name === baseIdentifier) {
              const { pointType, pointName } = this.detectPointTypeAndNameFromInit(d.init)
              if (pointType === 'layout' && pointName) {
                thisLayoutName = pointName
              }
              // also remember its own base (for parent walk)
              const baseId = this.findBaseIdentifier(d.init)
              if (baseId) {
                baseIdFromDefinition = baseId
              }
            }
          }
        }
      },
      // 2. check if this file DEFAULT-exports a layout and we are asked for 'default'
      ExportDefaultDeclaration: (path) => {
        if (baseIdentifier !== 'default') return
        const decl = path.node.declaration
        const { pointType, pointName } = this.detectPointTypeAndNameFromInit(decl)
        if (pointType === 'layout' && pointName) {
          thisLayoutName = pointName
        }
        const baseId = this.findBaseIdentifier(decl)
        if (baseId) {
          baseIdFromDefinition = baseId
        }
      },
      // 3. find where the baseIdentifier is imported from
      ImportDeclaration: (path) => {
        for (const spec of path.node.specifiers) {
          if (spec.local.name === baseIdentifier) {
            parentImportPath = path.node.source.value
            if (spec.type === 'ImportSpecifier' && spec.imported.type === 'Identifier') {
              parentIdentifier = spec.imported.name
            } else if (spec.type === 'ImportDefaultSpecifier') {
              parentIdentifier = 'default'
            } else {
              parentIdentifier = spec.local.name
            }
            if (parentIdentifier === 'Point0') {
              parentIdentifier = undefined
            }
          }
        }
      },
    })

    const layouts: string[] = []
    if (thisLayoutName) {
      layouts.push(thisLayoutName)
    }

    // walk to parent layout (imported one)
    if (parentImportPath && parentIdentifier) {
      const parentAbs = await PointsCollector.detectExistingFilePathByImportPath(
        nodePath.resolve(nodePath.dirname(fileAbs), parentImportPath),
      )
      if (parentAbs) {
        const parentLayouts = await this.resolveLayoutsChain({
          fileAbs: parentAbs,
          baseIdentifier: parentIdentifier,
        })
        for (const l of parentLayouts) {
          if (!layouts.includes(l)) {
            layouts.push(l)
          }
        }
      } else {
        console.warn(
          `❌ ${nodePath.relative(this.basepath, fileAbs)} parent layout import path not found: ${parentImportPath}`,
        )
      }
    } else if (baseIdFromDefinition) {
      const parentLayouts = await this.resolveLayoutsChain({
        fileAbs,
        baseIdentifier: baseIdFromDefinition,
      })
      for (const l of parentLayouts) {
        if (!layouts.includes(l)) {
          layouts.push(l)
        }
      }
    }

    // save to cache and return
    fileCache.set(baseIdentifier, layouts)
    return layouts
  }

  // helpers

  private static async detectExistingFilePathByImportPath(importPath: string): Promise<string | undefined> {
    const exts = ['.ts', '.tsx', '.js', '.mjs', '.cjs']
    const currentExt = nodePath.extname(importPath)
    const importPathWithoutExt = importPath.replace(currentExt, '')
    for (const ext of exts) {
      const abs = importPathWithoutExt + ext
      if (await Bun.file(abs).exists()) {
        return abs
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

export type FileWatcherOptions = {
  generators: FileGenerator[]
  glob: string | string[]
  basepath: string
}

export class FileWatcher {
  readonly generators: FileGenerator[]
  readonly glob: string | string[]
  readonly basepath: string

  private constructor(opts: FileWatcherOptions) {
    this.generators = opts.generators
    this.glob = opts.glob
    this.basepath = opts.basepath
  }

  static create(opts: FileWatcherOptions) {
    return new FileWatcher(opts)
  }

  static async watch(opts: FileWatcherOptions) {
    const watcher = FileWatcher.create(opts)
    await watcher.watch()
  }

  private async watch() {
    const patterns = Array.isArray(this.glob) ? this.glob : [this.glob]

    fsWatch(this.basepath, { recursive: true }, (eventType, filename) => {
      void (async () => {
        try {
          if (!filename) return
          const targetAbs = nodePath.resolve(this.basepath, filename)

          // glob match
          const matched = patterns.some((g) => new Glob(nodePath.resolve(this.basepath, g)).match(targetAbs))
          if (!matched) return

          const exists = await Bun.file(targetAbs).exists()
          const isDelete = eventType === 'rename' && !exists
          const isCreateOrUpdate = (eventType === 'rename' && exists) || eventType === 'change'

          for (const gen of this.generators) {
            if (isDelete) {
              const evt = await gen.removeDirOrFile(targetAbs)
              if (evt.changed) {
                const typesAndNames = evt.added.map((p) => `${p.type}:${p.name}`).join(', ')
                console.info(`deleted:  ${typesAndNames}`)
              }
              continue
            }

            if (isCreateOrUpdate) {
              const suitable = gen.isFileSuitableToGlob(targetAbs)
              if (!suitable) continue
              const evt = await gen.updateFromFile(targetAbs)
              if (evt.changed) {
                if (evt.deleted.length > 0) {
                  const typesAndNames = evt.deleted.map((p) => `${p.type}.${p.name}`).join(', ')
                  console.info(`deleted: ${typesAndNames}`)
                }
                if (evt.added.length > 0) {
                  const typesAndNames = evt.added.map((p) => `${p.type}.${p.name}`).join(', ')
                  console.info(`added: ${typesAndNames}`)
                }
              }
            }
          }
        } catch (e) {
          console.error(`❌ ${(e as Error).message}`)
        }
      })()
    })

    console.info('👀 FileWatcher started')
  }
}
