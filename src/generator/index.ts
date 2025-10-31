import * as babel from '@babel/parser'
import _traverse from '@babel/traverse'
import { Glob } from 'bun'
import type { Jiti } from 'jiti'
import { createJiti } from 'jiti'
import * as nodeFs from 'node:fs'
import * as nodePath from 'node:path'
import type { EndPoint, EndPointType, PointName } from '../core/types.js'

// TODO: add Routes to output
// TODO: add PointsCollection.create in result output
// TODO: add watch mode
// TODO: notify on changes

const traverse = _traverse as never as typeof _traverse.default

export type FileGeneratorOptions = {
  glob: string | string[]
  output: string
  basepath: string
}

type StaticPointCandidate = {
  exportName: string
  pointType: EndPointType
  sourceFileAbs: string
}

type CollectedPoint = {
  type: EndPointType
  name: PointName
  exportName: string
  importPath: string
  route?: string
  layoutPagesRoutes?: string[]
  fileAbs: string
  point: EndPoint
}

type ChangeCollectedPointsEvent = {
  points: CollectedPoint[]
  deleted: CollectedPoint[]
  updated: CollectedPoint[]
  added: CollectedPoint[]
  changed: boolean
}

export class FileGenerator {
  readonly globInclude: string[]
  readonly globExclude: string[]
  readonly outputAbs: string
  readonly basepath: string
  readonly jiti: Jiti

  private readonly files = new Set<string>()
  private points: CollectedPoint[] = []

  constructor(opts: FileGeneratorOptions) {
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
      return { status: 'added', prevPoint: undefined, newPoint: collectedPoint }
    }
  }

  addPoints(points: CollectedPoint[]): ChangeCollectedPointsEvent {
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

  replacePoints(points: CollectedPoint[]): ChangeCollectedPointsEvent {
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
    const changed = added.length > 0 || deleted.length > 0
    return { points: this.points, deleted, added, updated, changed }
  }

  private removePointsByFileAbs(fileAbs: string): ChangeCollectedPointsEvent {
    const deleted = this.points.filter((p) => p.fileAbs === fileAbs)
    this.points = this.points.filter((p) => p.fileAbs !== fileAbs)
    const changed = deleted.length > 0
    return { points: this.points, deleted, added: [], updated: [], changed }
  }

  // processing

  private async processFile(fileAbs: string): Promise<ChangeCollectedPointsEvent> {
    const collectedPoints = await this.collectPointsFromFile(fileAbs)
    return this.addPoints(collectedPoints)
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
    const collectedPoints = collectedChunks.flat()
    return this.replacePoints(collectedPoints)
  }

  private async writeOutput() {
    const content = this.emitPointsFile(this.points)
    await nodeFs.promises.mkdir(nodePath.dirname(this.outputAbs), { recursive: true })
    await Bun.write(this.outputAbs, content)
    console.info(`✅ points file generated: ${this.outputAbs} (${this.points.length} points)`)
  }

  private async collectPointsFromFile(fileAbs: string): Promise<CollectedPoint[]> {
    let content: string
    try {
      content = await Bun.file(fileAbs).text()
    } catch (e) {
      console.warn(`⚠️ cannot read ${fileAbs}: ${(e as Error).message}`)
      return []
    }

    const staticCandidates = this.extractStaticPointsCandidatesFromContent({ content, fileAbs })
    if (!staticCandidates.length) return []

    const module = await this.jiti.import(fileAbs)
    const collectedPoints: CollectedPoint[] = []

    for (const staticCandidate of staticCandidates) {
      const collectedPoint = this.extractCollectedPointFromModule({ staticCandidate, module, fileAbs })
      if (!collectedPoint) {
        continue
      }
      collectedPoints.push(collectedPoint)
    }

    return collectedPoints
  }

  // parse

  private extractStaticPointsCandidatesFromContent({
    content,
    fileAbs,
  }: {
    content: string
    fileAbs: string
  }): StaticPointCandidate[] {
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
      return []
    }

    const out: StaticPointCandidate[] = []

    traverse(ast, {
      ExportNamedDeclaration: (p) => {
        const decl = p.node.declaration
        if (decl?.type === 'VariableDeclaration') {
          for (const d of decl.declarations) {
            const id = d.id
            if (id.type === 'Identifier') {
              const pointType = this.detectPointTypeFromInit(d.init)
              if (pointType) {
                out.push({
                  exportName: id.name,
                  pointType,
                  sourceFileAbs: fileAbs,
                })
              }
            }
          }
        }
      },
      ExportDefaultDeclaration: (p) => {
        const decl = p.node.declaration
        const pointType = this.detectPointTypeFromInit(decl)
        if (pointType) {
          out.push({
            exportName: 'default',
            pointType,
            sourceFileAbs: fileAbs,
          })
        }
      },
    })

    return out
  }

  private detectPointTypeFromInit(node: any): EndPointType | null {
    if (node?.type !== 'CallExpression') return null

    let callee = node.callee
    let lastMethod: unknown = null

    while (callee?.type === 'MemberExpression') {
      const id = callee.property
      if (id?.type === 'Identifier') {
        lastMethod = id.name
      }
      callee = callee.object
    }

    return FileGenerator.pointMethodToPointType(lastMethod)
  }

  private extractCollectedPointFromModule({
    staticCandidate,
    module,
    fileAbs,
  }: {
    staticCandidate: StaticPointCandidate
    module: any
    fileAbs: string
  }): CollectedPoint | null {
    const exported: unknown =
      staticCandidate.exportName === 'default' ? module?.default : module?.[staticCandidate.exportName]
    const point = FileGenerator.exportedToEndPoint(exported)

    if (!point) {
      return null
    }

    return {
      type: staticCandidate.pointType,
      name: point._name ?? '__UNNAMED_POINT__',
      route: point._route?.definition,
      importPath: this.toRelativeJsImportPath(this.outputAbs, staticCandidate.sourceFileAbs),
      exportName: staticCandidate.exportName,
      layoutPagesRoutes: point._layoutPagesRoutes.map((x: any) => x.definition as string),
      point,
      fileAbs,
    }
  }

  // emit

  private emitPointsFile(points: CollectedPoint[]): string {
    const lines: string[] = []
    lines.push(`import type { PointsCollection } from 'point0/core/points.js'`)
    lines.push(``)
    lines.push(`export const points = [`)
    for (const p of points) {
      lines.push(`  {`)
      lines.push(`    type: '${p.type}',`)
      lines.push(`    name: '${p.name}',`)
      if (p.route) {
        lines.push(`    route: '${p.route}',`)
      }
      if (p.layoutPagesRoutes?.length) {
        const arr = p.layoutPagesRoutes.map((r) => `'${r}'`).join(', ')
        lines.push(`    layoutPagesRoutes: [${arr}],`)
      }
      lines.push(
        `    point: async () => (await import('${p.importPath}')).${p.exportName === 'default' ? 'default' : p.exportName},`,
      )
      lines.push(`  },`)
    }
    lines.push(`] as PointsCollection`)
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
      (a.layoutPagesRoutes?.every((r) => b.layoutPagesRoutes?.includes(r)) ||
        (!a.layoutPagesRoutes && !b.layoutPagesRoutes))
    )
  }

  private toRelativeJsImportPath(fromAbs: string, toAbs: string): string {
    let rel = nodePath
      .relative(nodePath.dirname(fromAbs), toAbs)
      .replace(/\\/g, '/')
      .replace(/.tsx?$/, '.js')
    if (!rel.startsWith('.')) rel = './' + rel
    return rel
  }

  private static readonly END_POINT_TYPES: Record<EndPointType, true> = {
    page: true,
    component: true,
    layout: true,
    mutation: true,
    query: true,
    response: true,
    'client-ctx': true,
    base: true,
  }
  private static isEndPointType(type: string): type is EndPointType {
    return type in FileGenerator.END_POINT_TYPES
  }

  private static readonly POINT_TYPE_TO_METHOD_MAP: Record<EndPointType, string> = {
    page: 'page',
    component: 'component',
    layout: 'layout',
    mutation: 'mutation',
    query: 'query',
    response: 'response',
    'client-ctx': 'clientTtx',
    base: 'base',
  }
  private static readonly POINT_METHOD_TO_TYPE_MAP: Record<string, EndPointType> = Object.fromEntries(
    Object.entries(FileGenerator.POINT_TYPE_TO_METHOD_MAP).map(([type, method]) => [method, type as EndPointType]),
  )
  private static pointMethodToPointType(method: unknown): EndPointType | null {
    if (typeof method !== 'string') {
      return null
    }
    return FileGenerator.POINT_METHOD_TO_TYPE_MAP[method] ?? null
  }

  private static exportedToEndPoint(exported: unknown): EndPoint | null {
    return typeof exported === 'object' &&
      exported !== null &&
      'point' in exported &&
      exported.point?.constructor?.name === 'Point0'
      ? (exported.point as EndPoint)
      : null
  }
}
