import * as babel from '@babel/parser'
import type traverseType from '@babel/traverse'
import traverseModule from '@babel/traverse'
import { Glob } from 'bun'
import type { Jiti } from 'jiti'
import { createJiti } from 'jiti'
import * as nodeFs from 'node:fs'
import { existsSync, watch as fsWatch } from 'node:fs'
import * as nodePath from 'node:path'
import type { EndPoint, EndPointType, PointName } from '../core/types.js'
import type { Routes } from '@devp0nt/route0'

// TODO: if no routes needed for this point: like layout or page then do not runtime
// TODO: collect in static known route definition if it is string and it was not changed also do not runtime generation

const traverse = ((traverseModule as any).default ?? traverseModule) as typeof traverseType extends { default: infer T }
  ? T
  : typeof traverseType

export type FileGeneratorOptions = {
  banner?: string
  routes?: Routes
  glob: string | string[]
  output: string
  basepath: string
}

type StaticCollectedPoint = {
  type: EndPointType
  name: PointName
  exportName: string
  importPath: string
  fileAbs: string
  route: undefined
  layouts: undefined
}

type CollectedPoint = {
  type: EndPointType
  name: PointName
  exportName: string
  importPath: string
  route?: string
  layouts?: string[]
  fileAbs: string
}

type ChangeCollectedPointsEvent = {
  points: CollectedPoint[]
  deleted: CollectedPoint[]
  updated: CollectedPoint[]
  added: CollectedPoint[]
  changed: boolean
}

export class FileGenerator {
  readonly routes: Routes | undefined
  readonly banner: string | undefined
  readonly globInclude: string[]
  readonly globExclude: string[]
  readonly outputAbs: string
  readonly basepath: string
  readonly jiti: Jiti

  private readonly files = new Set<string>()
  private points: CollectedPoint[] = []

  private lastEmittedContent: string | undefined

  constructor(opts: FileGeneratorOptions) {
    this.routes = opts.routes ?? undefined
    this.banner = opts.banner
    this.basepath = opts.basepath
    const glob = Array.isArray(opts.glob) ? opts.glob : [opts.glob]
    this.globInclude = glob.filter((g) => !g.startsWith('!')).map((g) => nodePath.resolve(this.basepath, g))
    this.globExclude = glob.filter((g) => g.startsWith('!')).map((g) => nodePath.resolve(this.basepath, g.slice(1)))
    this.outputAbs = nodePath.resolve(this.basepath, opts.output)
    this.jiti = this.createFreshJiti()
  }

  static create(opts: FileGeneratorOptions) {
    return new FileGenerator(opts)
  }

  async sync() {
    await this.collectFiles()
    await this.processFiles()
    await this.writeOutput()
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
    // Common built-in exclusions
    // excludePatterns.push('**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**')

    for (const pattern of this.globInclude) {
      const matcher = new Glob(pattern)
      for await (const path of matcher.scan(this.basepath)) {
        // Check excludes *before* adding
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
    return { points: this.points, deleted: [], added, updated, changed }
  }

  private deletePoints(points: CollectedPoint[]): ChangeCollectedPointsEvent {
    const deleted = points.filter((p) => this.points.some((cp) => FileGenerator.isSameCollectedPoint(p, cp)))
    this.points = this.points.filter((p) => !points.some((cp) => FileGenerator.isSameCollectedPoint(p, cp)))
    const changed = deleted.length > 0
    if (changed) {
      this.sortPoints()
    }
    return { points: this.points, deleted, added: [], updated: [], changed }
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
    return { points: this.points, deleted, added, updated, changed }
  }

  private sortPoints(): void {
    const order = FileGenerator.END_POINT_TYPES
    const orderIndex = new Map(order.map((t, i) => [t, i]))

    this.points.sort((a, b) => {
      const aIndex = orderIndex.get(a.type) ?? Number.MAX_SAFE_INTEGER
      const bIndex = orderIndex.get(b.type) ?? Number.MAX_SAFE_INTEGER
      const byType = aIndex - bIndex
      if (byType !== 0) return byType

      const byRoute = (a.route?.replace(/:\w+/g, 'Z') ?? '').localeCompare(b.route?.replace(/:\w+/g, 'Z') ?? '')
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
    return { points: this.points, deleted, added: [], updated: [], changed }
  }

  // processing

  private async processFile(fileAbs: string): Promise<ChangeCollectedPointsEvent> {
    const { collectedPoints, error } = await this.collectPointsFromFile(fileAbs)
    const prevPointsWithThisFile = this.points.filter((p) => p.fileAbs === fileAbs)
    const deleted = error
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
    }
  }

  private async processFiles(chunkSize = 30): Promise<ChangeCollectedPointsEvent> {
    const files = [...this.files]
    const chunks = FileGenerator.chunk(files, chunkSize)
    const collectedChunks = await Promise.all(
      chunks.map(async (chunk) => {
        const pointsArrays = await Promise.all(chunk.map(async (fileAbs) => await this.collectPointsFromFile(fileAbs)))
        return pointsArrays.flat()
      }),
    )
    const errors = collectedChunks.flatMap((chunk) => chunk.flatMap((p) => (p.error ? [p.error] : [])))
    const collectedPoints = collectedChunks.flatMap((chunk) => chunk.flatMap((p) => p.collectedPoints))
    if (errors.length === 0) {
      return this.replacePoints(collectedPoints)
    } else {
      return this.addPoints(collectedPoints)
    }
  }

  private async writeOutput() {
    const content = this.emitPointsFile(this.points)
    if (content === this.lastEmittedContent) {
      return
    }
    await nodeFs.promises.mkdir(nodePath.dirname(this.outputAbs), { recursive: true })
    const tmp = this.outputAbs + '.tmp'
    await nodeFs.promises.writeFile(tmp, content, 'utf8')
    await nodeFs.promises.rename(tmp, this.outputAbs)
    // await Bun.write(this.outputAbs, content)
    // nodeFs.writeFileSync(this.outputAbs, content)
    this.lastEmittedContent = content
    console.info(`✅ points file generated: ${this.outputAbs} (${this.points.length} points)`)
  }

  private async collectPointsFromFile(fileAbs: string): Promise<{ collectedPoints: CollectedPoint[]; error: unknown }> {
    let content: string
    let staticCollectedPoints: StaticCollectedPoint[] = []
    let collectedPoints: CollectedPoint[] = []
    try {
      try {
        content = await Bun.file(fileAbs).text()
      } catch (e) {
        console.warn(`❌ ${nodePath.relative(this.basepath, fileAbs)}: read failed: ${(e as Error).message}`)
        return { collectedPoints, error: e }
      }

      const staticResult = this.extractStaticCollectedPointsFromContent({ content, fileAbs })
      collectedPoints = staticResult.collectedPoints
      staticCollectedPoints = staticResult.staticCollectedPoints
      if (!staticCollectedPoints.length) return { collectedPoints: [], error: staticResult.error }

      const module = await this.jiti.import(fileAbs)

      for (const staticCollectedPoint of staticCollectedPoints) {
        const collectedPoint = this.extractCollectedPointFromModule({ staticCollectedPoint, module, fileAbs })
        if (!collectedPoint) {
          continue
        }
        if (collectedPoints.every((p) => !FileGenerator.isSameCollectedPoint(p, collectedPoint))) {
          collectedPoints.push(collectedPoint)
        }
      }

      return { collectedPoints, error: staticResult.error }
    } catch (e) {
      console.warn(`❌ ${nodePath.relative(this.basepath, fileAbs)}: parse failed: ${(e as Error).message}`)
      return { collectedPoints, error: e }
    }
  }

  // parse

  private extractStaticCollectedPointsFromContent({ content, fileAbs }: { content: string; fileAbs: string }): {
    collectedPoints: CollectedPoint[]
    staticCollectedPoints: StaticCollectedPoint[]
    error: unknown
  } {
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
      console.warn(`⚠️ parse failed for ${fileAbs}: ${(e as Error).message}`)
      return { collectedPoints: [], staticCollectedPoints: [], error: e }
    }

    const staticCollectedPoints: StaticCollectedPoint[] = []

    traverse(ast, {
      ExportNamedDeclaration: (p) => {
        const decl = p.node.declaration
        if (decl?.type === 'VariableDeclaration') {
          for (const d of decl.declarations) {
            const id = d.id
            if (id.type === 'Identifier') {
              const { pointType, pointName } = this.detectPointTypeAndNameFromInit(d.init)
              if (pointType && pointName) {
                staticCollectedPoints.push({
                  type: pointType,
                  name: pointName,
                  exportName: id.name,
                  importPath: FileGenerator.toRelativeJsImportPath(this.outputAbs, fileAbs),
                  fileAbs,
                  route: undefined,
                  layouts: undefined,
                })
              }
            }
          }
        }
      },
      ExportDefaultDeclaration: (p) => {
        const decl = p.node.declaration
        const { pointType, pointName } = this.detectPointTypeAndNameFromInit(decl)
        if (pointType && pointName) {
          staticCollectedPoints.push({
            exportName: 'default',
            type: pointType,
            name: pointName,
            importPath: FileGenerator.toRelativeJsImportPath(this.outputAbs, fileAbs),
            fileAbs,
            route: undefined,
            layouts: undefined,
          })
        }
      },
    })

    const collectedPoints = staticCollectedPoints.filter((p) =>
      FileGenerator.isStaticCollectedPointAlreadyCollected(p),
    ) as CollectedPoint[]
    return { collectedPoints, staticCollectedPoints, error: undefined }
  }

  private static isStaticCollectedPointAlreadyCollected(staticCollectedPoint: StaticCollectedPoint): boolean {
    if (staticCollectedPoint.type === 'page' || staticCollectedPoint.type === 'layout') {
      // page may have layout and route, layout may have route
      return false
    } else {
      // other no
      return true
    }
  }

  private detectPointTypeAndNameFromInit(node: any): { pointType: EndPointType | null; pointName: string | null } {
    if (node?.type !== 'CallExpression' || node.callee?.type !== 'MemberExpression') {
      return { pointType: null, pointName: null }
    }

    // The last method in the chain determines the point type (e.g. ".page()", ".layout()", etc.)
    const lastProp = node.callee.property
    const lastMethod = lastProp?.type === 'Identifier' ? lastProp.name : null
    const pointType = FileGenerator.pointMethodToPointType(lastMethod)
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

  private extractCollectedPointFromModule({
    staticCollectedPoint,
    module,
    fileAbs,
  }: {
    staticCollectedPoint: StaticCollectedPoint
    module: any
    fileAbs: string
  }): CollectedPoint | null {
    const exported: unknown =
      staticCollectedPoint.exportName === 'default' ? module?.default : module?.[staticCollectedPoint.exportName]
    const point = FileGenerator.exportedToEndPoint(exported)

    if (!point) {
      return null
    }

    return {
      type: point._pointType,
      name: point._name ?? staticCollectedPoint.name,
      route: point._pointType === 'page' || point._pointType === 'layout' ? point._route?.definition : undefined,
      importPath: staticCollectedPoint.importPath,
      exportName: staticCollectedPoint.exportName,
      layouts: point._pointType === 'page' ? point._layouts.flatMap((x) => (x._name ? [x._name] : [])) : undefined,
      fileAbs,
    }
  }

  // emit

  private emitPointsFile(points: CollectedPoint[]): string {
    const lines: string[] = []
    if (this.banner) {
      lines.push(this.banner)
    }
    lines.push(`import { Points } from 'point0/core/points.js'`)
    lines.push(`import { Routes } from '@devp0nt/route0'`)
    lines.push(``)

    const pagePoints = points.filter((p) => p.type === 'page' && p.route)
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

    lines.push(`export const points = Points.create([`)
    for (const point of points) {
      lines.push(`  {`)
      lines.push(`    type: '${point.type}',`)
      lines.push(`    name: '${point.name}',`)
      if (point.route) {
        lines.push(`    route: '${point.route}',`)
      }
      if (point.type === 'page' && point.layouts?.length) {
        const arr = point.layouts.map((r) => `'${r}'`).join(', ')
        lines.push(`    layouts: [${arr}],`)
      }
      // const exportNameSuffix = point.type === 'component' ? '.point' : ''
      const exportNameSuffix = '.point'
      lines.push(
        `    point: async () => (await import('${point.importPath}')).${point.exportName === 'default' ? 'default' : point.exportName}${exportNameSuffix},`,
      )
      lines.push(`  },`)
    }
    lines.push(`])`)
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

  private static readonly POINT_TYPE_TO_METHOD_MAP: Record<EndPointType, string> = {
    page: 'page',
    layout: 'layout',
    component: 'component',
    mutation: 'mutation',
    query: 'query',
    response: 'response',
    'client-ctx': 'clientCtx',
    base: 'base',
  }
  private static readonly POINT_METHOD_TO_TYPE_MAP: Record<string, EndPointType> = Object.fromEntries(
    Object.entries(FileGenerator.POINT_TYPE_TO_METHOD_MAP).map(([type, method]) => [method, type as EndPointType]),
  )
  private static readonly END_POINT_TYPES: EndPointType[] = Object.keys(
    FileGenerator.POINT_TYPE_TO_METHOD_MAP,
  ) as EndPointType[]

  private static pointMethodToPointType(method: unknown): EndPointType | null {
    if (typeof method !== 'string') {
      return null
    }
    return FileGenerator.POINT_METHOD_TO_TYPE_MAP[method] ?? null
  }

  private static exportedToEndPoint(exported: unknown): EndPoint | null {
    return ((typeof exported === 'object' && exported !== null) || typeof exported === 'function') &&
      'point' in exported &&
      exported.point?.constructor?.name === 'Point0'
      ? (exported.point as EndPoint)
      : null
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

          const exists = existsSync(targetAbs)
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
