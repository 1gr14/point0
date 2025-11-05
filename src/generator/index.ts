import type {
  CallExpression,
  ClassDeclaration,
  Declaration,
  Expression,
  FunctionDeclaration,
  Node,
  TSDeclareFunction,
} from '@babel/types'
import type traverseType from '@babel/traverse'
import type { NodePath } from '@babel/traverse'
import traverseModule from '@babel/traverse'
import babel from '@babel/parser'
import type { AnyRoute, Routes } from '@devp0nt/route0'
import { Route0 } from '@devp0nt/route0'
import type { AsyncSubscription } from '@parcel/watcher'
import { subscribe } from '@parcel/watcher'
import fg from 'fast-glob'
import type { Jiti } from 'jiti'
import { createJiti } from 'jiti'
import { minimatch } from 'minimatch'
import * as nodeFsSync from 'node:fs'
import * as nodeFs from 'node:fs/promises'
import * as nodeOs from 'node:os'
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
  root: boolean
  type: EndPointType
  name: PointName
  exportName: string
  route?: AnyRoute
  layouts?: string[]
  fileAbs: string
}

type ChangeCollectedPointsEvent = {
  deleted: CollectedPoint[]
  added: CollectedPoint[]
  points: CollectedPoint[]
  changed: boolean
  errors: unknown[]
}

const POINT_TYPE_TO_METHOD_MAP: Record<EndPointType, EndPointType> = {
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
  readonly tempDir: string

  private readonly files = new Set<string>()
  private readonly points: CollectedPoint[] = []

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
    this.tempDir = FileGenerator.resolveTempDirPath()
  }

  static resolveTempDirPath(): string {
    let dir = process.cwd()
    let lastDir = ''

    // Walk up until we find a node_modules folder
    while (dir !== lastDir) {
      const candidate = nodePath.join(dir, 'node_modules')
      if (nodeFsSync.existsSync(candidate)) {
        const tempDir = nodePath.join(candidate, '.cache', '@point0')
        nodeFsSync.mkdirSync(tempDir, { recursive: true })
        return tempDir
      }

      // Move one level up
      lastDir = dir
      dir = nodePath.dirname(dir)
    }

    // Fallback: if no node_modules found, use system tmp
    const fallback = nodePath.join(nodeFsSync.realpathSync(nodeOs.tmpdir()), '@point0')
    nodeFsSync.mkdirSync(fallback, { recursive: true })
    return fallback
  }

  static create(opts: FileGeneratorOptions) {
    return new FileGenerator(opts)
  }

  async sync() {
    await this.collectFiles()
    const { errors, points } = await this.process()
    const [consoleMethod, emoji] = errors.length > 0 ? ['warn' as const, '🟡'] : ['info' as const, '']
    console[consoleMethod]([emoji, `${points.length} points processed`].filter(Boolean).join(' '))
  }

  watch() {
    void FileWatcher.watch({
      generators: [this],
    })
  }

  // files

  private async collectFiles() {
    for (const pattern of this.globInclude) {
      // Convert absolute pattern to relative pattern for fast-glob
      const relativePattern = nodePath.relative(this.basepath, pattern)
      const entries = await fg([relativePattern], {
        cwd: this.basepath,
        absolute: true,
        onlyFiles: true,
        ignore: this.globExclude,
      })
      for (const absPath of entries) {
        this.files.add(absPath)
      }
    }
  }

  isFileSuitableToGlob(fileAbs: string): boolean {
    return (
      this.globInclude.some((g) => {
        return minimatch(fileAbs, g, { dot: true })
      }) &&
      !this.globExclude.some((g) => {
        return minimatch(fileAbs, g, { dot: true })
      })
    )
  }

  isFileOrDirSuitableToFiles(fileOrDirAbs: string): boolean {
    return [...this.files].some((f) => f.startsWith(fileOrDirAbs))
  }

  // mutations

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

  // processing

  // TODO: not chunk size, but max in same time processing files
  async process(chunkSize = 30): Promise<ChangeCollectedPointsEvent> {
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
    const prevPoints = [...this.points]
    const newPoints =
      errors.length === 0 ? collectedPoints : FileGenerator.mergePointsSafely(this.points, collectedPoints)
    const diff = FileGenerator.getCollectedPointsDiff(prevPoints, newPoints)
    this.points.splice(0, this.points.length, ...newPoints)
    this.sortPoints()
    if (diff.changed) {
      await this.writeOutput()
    }
    return {
      points: newPoints,
      deleted: diff.deleted,
      added: diff.added,
      changed: diff.changed,
      errors,
    }
  }

  private async writeOutput() {
    const tasks = []
    if (this.outputLazyAbs) {
      tasks.push({
        content: this.emitLazyPointsFile(this.points),
        outputAbs: this.outputLazyAbs,
        tempOutputAbs: nodePath.join(this.tempDir, 'lazy.ts'),
      })
    }
    if (this.outputReadyAbs) {
      tasks.push({
        content: this.emitReadyPointsFile(this.points),
        outputAbs: this.outputReadyAbs,
        tempOutputAbs: nodePath.join(this.tempDir, 'ready.ts'),
      })
    }
    if (this.outputRoutesAbs) {
      tasks.push({
        content: this.emitRoutesPointsFile(this.points),
        outputAbs: this.outputRoutesAbs,
        tempOutputAbs: nodePath.join(this.tempDir, 'routes.ts'),
      })
    }
    if (!tasks.length) {
      return
    }
    const hasChanges = await Promise.all(
      tasks.map(async (task) => {
        if (!this.lastEmittedContentMap.has(task.outputAbs)) {
          const currentContent = await (async () => {
            try {
              return await nodeFs.readFile(task.outputAbs, 'utf8')
            } catch (e) {
              return undefined
            }
          })()
          if (currentContent) {
            this.lastEmittedContentMap.set(task.outputAbs, currentContent)
          }
        }
        const currentContent = this.lastEmittedContentMap.get(task.outputAbs)
        this.lastEmittedContentMap.set(task.outputAbs, task.content)
        if (task.content === currentContent) {
          return false
        }
        return true
      }),
    )
    const tasksToWrite = tasks.filter((task, index) => hasChanges[index])
    if (!tasksToWrite.length) {
      return
    }
    await Promise.all(
      tasksToWrite.map(async (task) => {
        await nodeFs.mkdir(nodePath.dirname(task.tempOutputAbs), { recursive: true })
      }),
    )
    await Promise.all(
      tasksToWrite.map(async (task) => {
        await nodeFs.writeFile(task.tempOutputAbs, task.content, 'utf8')
      }),
    )
    await Promise.all(
      tasksToWrite.map(async (task) => {
        await nodeFs.mkdir(nodePath.dirname(task.outputAbs), { recursive: true })
      }),
    )
    await Promise.all(
      tasksToWrite.map(async (task) => {
        await nodeFs.rename(task.tempOutputAbs, task.outputAbs)
      }),
    )
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
        if (point.root) {
          lines.push(`    root: true,`)
        }
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
          `    point: async () => (await import('${FileGenerator.toRelativeJsImportPath(this.outputLazyAbs, point.fileAbs)}')).${point.exportName === 'default' ? 'default' : point.exportName}${exportNameSuffix},`,
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

    const hashedPoints = points.map((p) => ({
      ...p,
      hash: FileGenerator.hash(p),
    }))

    const importPathsAndExportNames: Array<{
      importPath: string
      exports: Array<{ originalExportName: string; renamedExportName: string }>
    }> = []
    for (const point of hashedPoints) {
      const importPath = FileGenerator.toRelativeJsImportPath(this.outputReadyAbs, point.fileAbs)
      const importPathAndExportNames = importPathsAndExportNames.find((p) => p.importPath === importPath)
      const newItem =
        point.exportName === 'default'
          ? { originalExportName: 'default', renamedExportName: `unnamed_${point.hash}` }
          : { originalExportName: point.exportName, renamedExportName: `${point.exportName}_${point.hash}` }
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
      for (const point of hashedPoints) {
        if (point.exportName === 'default') {
          lines.push(`    unnamed_${point.hash}.point,`)
        } else {
          lines.push(`    ${point.exportName}_${point.hash}.point,`)
        }
      }
      lines.push(`])`)
    }

    lines.push(``)
    return lines.join('\n')
  }

  // private emitReadyPointsFile(points: CollectedPoint[]): string {
  //   if (!this.outputReadyAbs) {
  //     throw new Error('outputReadyAbs is not set')
  //   }
  //   const lines: string[] = []
  //   if (this.banner) {
  //     lines.push(this.banner)
  //   }
  //   lines.push(`import { Points } from 'point0/core/points.js'`)

  //   const hashedPoints = points.map((p) => ({
  //     ...p,
  //     hash: FileGenerator.hash(p),
  //   }))

  //   const importPathsAndExportNames: Array<{
  //     importPath: string
  //     exports: Array<{ originalExportName: string; renamedExportName: string }>
  //   }> = []
  //   for (const point of hashedPoints) {
  //     const importPath = FileGenerator.toRelativeJsImportPath(this.outputReadyAbs, point.fileAbs)
  //     const importPathAndExportNames = importPathsAndExportNames.find((p) => p.importPath === importPath)
  //     const newItem =
  //       point.exportName === 'default'
  //         ? { originalExportName: 'default', renamedExportName: `unnamed_${point.hash}` }
  //         : { originalExportName: point.exportName, renamedExportName: `${point.exportName}_${point.hash}` }
  //     if (importPathAndExportNames) {
  //       importPathAndExportNames.exports.push(newItem)
  //     } else {
  //       importPathsAndExportNames.push({ importPath, exports: [newItem] })
  //     }
  //   }

  //   for (const importPathAndExportNames of importPathsAndExportNames) {
  //     const defaultItem = importPathAndExportNames.exports.find((e) => e.originalExportName === 'default')
  //     const defaultPart = defaultItem ? defaultItem.renamedExportName : undefined
  //     const namedItems = importPathAndExportNames.exports.filter((e) => e.originalExportName !== 'default')
  //     const namedPart =
  //       namedItems.length > 0
  //         ? `{ ${namedItems.map((e) => `${e.originalExportName} as ${e.renamedExportName}`).join(', ')} }`
  //         : undefined
  //     const combinedPart = defaultPart ? `${defaultPart}, ${namedPart}` : namedPart
  //     if (!combinedPart) {
  //       continue
  //     }
  //     lines.push(`import ${combinedPart} from '${importPathAndExportNames.importPath}'`)
  //   }

  //   if (this.points.length === 0) {
  //     lines.push(``)
  //     lines.push(`export const points = Points.ready([])`)
  //   } else {
  //     lines.push(``)
  //     lines.push(`export const points = Points.ready([`)
  //     for (const point of hashedPoints) {
  //       lines.push(`  {`)
  //       if (point.root) {
  //         lines.push(`    root: true,`)
  //       }
  //       lines.push(`    type: '${point.type}',`)
  //       lines.push(`    name: '${point.name}',`)
  //       if (point.route) {
  //         lines.push(`    route: '${point.route.definition}',`)
  //       }
  //       if (point.type === 'page' && point.layouts?.length) {
  //         const arr = point.layouts
  //           .map((r) => `'${r}'`)
  //           .reverse()
  //           .join(', ')
  //         lines.push(`    layouts: [${arr}],`)
  //       }
  //       if (point.exportName === 'default') {
  //         lines.push(`    point: unnamed_${point.hash}.point,`)
  //       } else {
  //         lines.push(`    point: ${point.exportName}_${point.hash}.point,`)
  //       }
  //       lines.push(`  },`)
  //     }
  //     lines.push(`])`)
  //   }

  //   lines.push(``)
  //   return lines.join('\n')
  // }

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

  private static getCollectedPointsDiff(
    prevPoints: CollectedPoint[],
    newPoints: CollectedPoint[],
  ): {
    deleted: CollectedPoint[]
    added: CollectedPoint[]
    changed: boolean
  } {
    const deleted = prevPoints.filter((p) => !newPoints.some((cp) => FileGenerator.isSameCollectedPoint(p, cp)))
    const added = newPoints.filter((p) => !prevPoints.some((cp) => FileGenerator.isSameCollectedPoint(p, cp)))
    const changed = added.length > 0 || deleted.length > 0
    return { deleted, added, changed }
  }

  // if was error, we only want to replace conflicted and add new, and do not remove old points
  private static mergePointsSafely(prevPoints: CollectedPoint[], newPoints: CollectedPoint[]): CollectedPoint[] {
    const result = [...prevPoints]
    for (const newPoint of newPoints) {
      const prevConflictedPointIndex = result.findIndex((p) =>
        FileGenerator.isSameNameAndTypeCollectedPoint(p, newPoint),
      )
      if (prevConflictedPointIndex !== -1) {
        result[prevConflictedPointIndex] = newPoint
        continue
      }
      const prevPointIndex = result.findIndex((p) => FileGenerator.isSameCollectedPoint(p, newPoint))
      if (prevPointIndex === -1) {
        result.push(newPoint)
        continue
      }
    }
    return result
  }

  private createFreshJiti() {
    return createJiti(this.basepath, {
      cache: false,
      interopDefault: true,
      moduleCache: false,
      fsCache: false,
      extensions: ['.ts', '.tsx', '.js', '.mjs', '.cjs'],
    })
  }

  // 53-bit non-crypto hash (by bryc). Crazy fast in JS.
  private static cyrb53(str: string, seed = 0): number {
    let h1 = 0xdeadbeef ^ seed
    let h2 = 0x41c6ce57 ^ seed
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i)
      h1 = Math.imul(h1 ^ ch, 2654435761)
      h2 = Math.imul(h2 ^ ch, 1597334677)
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
    // returns 0..2^53-1
    return 4294967296 * (2097151 & h2) + (h1 >>> 0)
  }

  // Convenience for short suffixes
  private static hash(input: unknown, seed = 0): string {
    const s = typeof input === 'string' ? input : JSON.stringify(input)
    return FileGenerator.cyrb53(s, seed).toString(36) // short, URL/file-safe
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
      a.exportName === b.exportName &&
      a.route?.definition === b.route?.definition &&
      (a.layouts?.every((r) => b.layouts?.includes(r)) || (!a.layouts && !b.layouts))
    )
  }

  private static isSameNameAndTypeCollectedPoint(a: CollectedPoint, b: CollectedPoint): boolean {
    return a.name === b.name && a.type === b.type
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

  // Map<fileAbs, ast>
  readonly astCache = new Map<string, babel.ParseResult<any>>()

  // Map<fileAbs:baseIdentifier, route>
  readonly routesCache = new Map<string, AnyRoute | undefined>()

  // Map<fileAbs:baseIdentifier, Map<string[]>>
  readonly layoutsCache = new Map<string, string[]>()

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
          content = await nodeFs.readFile(fileAbs, 'utf8')
          this.filesContentCache.set(fileAbs, content)
        } catch (e) {
          console.warn(`🔴 ${nodePath.relative(this.basepath, fileAbs)}: read failed: ${(e as Error).message}`)
          return { collectedPoints: [], errors: [e] }
        }
      }
      return await this.extractCollectedPointsFromContent({ content, fileAbs })
    } catch (e) {
      console.warn(`🔴 ${nodePath.relative(this.basepath, fileAbs)}: parse failed: ${(e as Error).message}`)
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
      console.warn(`🔴 ${nodePath.relative(this.basepath, fileAbs)}: parse failed: ${(e as Error).message}`)
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
                    const shouldHaveRoute = pointType === 'page' || pointType === 'layout'
                    const { route, errors: routeErrors } = shouldHaveRoute
                      ? await this.resolveFullRoute({ fileAbs, baseIdentifier: id.name })
                      : { route: undefined, errors: [] }
                    errors.push(...routeErrors)

                    const { layouts, errors: layoutsErrors } =
                      pointType === 'page'
                        ? await this.resolveLayoutsChain({ fileAbs, baseIdentifier: id.name })
                        : { layouts: [], errors: [] }
                    errors.push(...layoutsErrors)

                    if (shouldHaveRoute && !route) {
                      const message = `route not detected for ${pointType}.${pointName}`
                      console.warn(`🔴 ${nodePath.relative(this.basepath, fileAbs)}: ${message}`)
                      throw new Error(message)
                    }

                    return {
                      root,
                      type: pointType,
                      name: pointName,
                      exportName: id.name,
                      fileAbs,
                      route,
                      layouts,
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
              const shouldHaveRoute = pointType === 'page' || pointType === 'layout'
              const { route, errors: routeErrors } = shouldHaveRoute
                ? await this.resolveFullRoute({ fileAbs, baseIdentifier: 'default' })
                : { route: undefined, errors: [] }
              errors.push(...routeErrors)

              const { layouts, errors: layoutsErrors } =
                pointType === 'page'
                  ? await this.resolveLayoutsChain({ fileAbs, baseIdentifier: 'default' })
                  : { layouts: [], errors: [] }
              errors.push(...layoutsErrors)

              if (shouldHaveRoute && !route) {
                const message = `route not detected for ${pointType}.${pointName}`
                console.warn(`🔴 ${nodePath.relative(this.basepath, fileAbs)}: ${message}`)
                throw new Error(message)
              }
              return {
                exportName: 'default',
                root,
                type: pointType,
                name: pointName,
                fileAbs,
                route,
                layouts,
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
    const pointType = PointsCollector.pointMethodToPointType(lastMethod)
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
    console.warn(`🔴 ${nodePath.relative(this.basepath, fileAbs)} root base name not found`)
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
  }: {
    fileAbs: string
    ast: babel.ParseResult<any>
    baseIdentifier: string
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
                  if (this.routes && (this.routes as any)[routeKey]) {
                    routeFull = (this.routes as any)[routeKey]
                  } else {
                    errors.push(new Error(`unknown route key '${routeKey}'`))
                    console.warn(
                      `🔴 ${nodePath.relative(this.basepath, fileAbs)} unknown route key '${routeKey}' for ${baseIdentifier}`,
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
        `🔴 ${nodePath.relative(this.basepath, fileAbs)} find route on identifier for ${baseIdentifier} failed: ${(e as Error).message}`,
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
              `🔴 ${nodePath.relative(this.basepath, fileAbs)} imported name not found for ${declaredFrom}, when trying to find parent ref for ${baseIdentifier}`,
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
            `🔴 ${nodePath.relative(this.basepath, fileAbs)} imported name not found for ${importedFrom}, when trying to find parent ref for ${baseIdentifier}`,
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
      console.warn(`🔴 ${nodePath.relative(this.basepath, fileAbs)} find parent ref failed: ${(e as Error).message}`)
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
    }: {
      fileAbs: string
      baseIdentifier: string
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
      console.warn(`🔴 ${nodePath.relative(this.basepath, fileAbs)}: parse failed: ${(e as Error).message}`)
      cacheMap.set(cacheKey, undefined)
      return { route: undefined, errors: [...errors, e] }
    }

    //
    // 1) find route on THIS identifier
    //
    const { routeSegment, routeFull } = this.findRouteOnIdentifier({ fileAbs, ast, baseIdentifier })

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
        console.warn(
          `🔴 ${nodePath.relative(this.basepath, fileAbs)} parent identifier not found for ${baseIdentifier}`,
        )
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
      ? await PointsCollector.detectExistingFilePathByImportPath(
          nodePath.resolve(nodePath.dirname(fileAbs), parentImportPath),
        )
      : fileAbs
    if (!parentAbs) {
      console.warn(
        `🔴 ${nodePath.relative(this.basepath, fileAbs)} parent ${parentIdentifier} path not found: ${parentImportPath}`,
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
      console.warn(`🔴 ${nodePath.relative(this.basepath, fileAbs)}: parse failed: ${(e as Error).message}`)
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
      ? await PointsCollector.detectExistingFilePathByImportPath(
          nodePath.resolve(nodePath.dirname(fileAbs), parentImportPath),
        )
      : fileAbs

    if (!parentAbs) {
      console.warn(`🔴 ${nodePath.relative(this.basepath, fileAbs)} parent layout path not found: ${parentImportPath}`)
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

  // helpers

  private static async detectExistingFilePathByImportPath(importPath: string): Promise<string | undefined> {
    const exts = ['.ts', '.tsx', '.js', '.mjs', '.cjs']
    const currentExt = nodePath.extname(importPath)
    const importPathWithoutExt = importPath.replace(currentExt, '')
    for (const ext of exts) {
      const abs = importPathWithoutExt + ext
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

export type FileWatcherOptions = {
  generators: FileGenerator[]
  ignore?: string[]
}

export class FileWatcher {
  readonly generators: FileGenerator[]
  readonly ignore: string[]
  readonly watchDir: string
  readonly patterns: string[]
  subscription: AsyncSubscription | undefined

  private constructor(opts: FileWatcherOptions) {
    this.generators = opts.generators
    this.watchDir = FileWatcher.getDirByPaths(opts.generators.flatMap((g) => g.globInclude))
    this.ignore = opts.ignore ?? opts.generators.flatMap((g) => g.globExclude)
    for (const g of opts.generators) {
      if (g.outputLazyAbs) {
        this.ignore.push(g.outputLazyAbs)
      }
      if (g.outputReadyAbs) {
        this.ignore.push(g.outputReadyAbs)
      }
      if (g.outputRoutesAbs) {
        this.ignore.push(g.outputRoutesAbs)
      }
    }
    this.patterns = opts.generators.flatMap((g) => g.globInclude)
  }

  static create(opts: FileWatcherOptions) {
    return new FileWatcher(opts)
  }

  static async watch(opts: FileWatcherOptions) {
    const watcher = FileWatcher.create(opts)
    await watcher.watch()
  }

  static getDirByPaths(paths: string[]): string {
    if (paths.length === 0) {
      return process.cwd()
    }

    function stripGlobParts(p: string): string {
      const parts = p.split(nodePath.sep)
      const globIndex = parts.findIndex((part) => /[*?[\]]/.test(part)) // detect glob chars
      if (globIndex >= 0) {
        return parts.slice(0, globIndex).join(nodePath.sep) || nodePath.sep
      }
      return p
    }

    const exts = ['.ts', '.tsx', '.js', '.mjs', '.cjs']
    function isFile(path: string): boolean {
      return exts.some((ext) => path.endsWith(ext))
    }

    // Strip glob parts first
    const stripped = paths.map(stripGlobParts)

    // Map each path to its directory (if path is a file) or keep as-is (if directory)
    const dirs = stripped.map((p) => (isFile(p) ? nodePath.dirname(p) : p))

    // Reduce to deepest common ancestor directory
    let commonDir = dirs[0]
    for (let i = 1; i < dirs.length; i++) {
      let dir = dirs[i]

      while (
        commonDir !== dir &&
        !dir.startsWith(commonDir.endsWith(nodePath.sep) ? commonDir : commonDir + nodePath.sep)
      ) {
        const next = nodePath.dirname(commonDir)
        if (next === commonDir) break
        commonDir = next
      }
      while (commonDir !== dir && !commonDir.startsWith(dir.endsWith(nodePath.sep) ? dir : dir + nodePath.sep)) {
        const next = nodePath.dirname(dir)
        if (next === dir) break
        dir = next
      }
      commonDir = commonDir.length <= dir.length ? commonDir : dir
    }
    return commonDir
  }

  private async watch() {
    const subscription = await subscribe(
      this.watchDir,
      async (err, events) => {
        if (err) {
          console.error(`🔴 watcher error: ${err.message}`)
          return
        }
        for (const event of events) {
          try {
            const targetAbs = nodePath.resolve(event.path)

            // glob match - check if the file matches any of our patterns
            const matched = this.patterns.some((g) => {
              const resolvedPattern = nodePath.resolve(this.watchDir, g)
              const relativePath = nodePath.relative(this.watchDir, targetAbs)
              const relativePattern = nodePath.relative(this.watchDir, resolvedPattern)
              return (
                minimatch(relativePath, relativePattern, { dot: true }) ||
                minimatch(targetAbs, resolvedPattern, { dot: true })
              )
            })
            if (!matched) continue

            // Check if file exists
            let exists = false
            try {
              await nodeFs.access(targetAbs)
              exists = true
            } catch {
              exists = false
            }

            const isDelete = event.type === 'delete' || (!exists && event.type === 'update')
            const isCreateOrUpdate = (event.type === 'create' || event.type === 'update') && exists

            await Promise.all(
              this.generators.map(async (gen) => {
                const suitable = isDelete
                  ? gen.isFileOrDirSuitableToFiles(targetAbs)
                  : isCreateOrUpdate
                    ? gen.isFileSuitableToGlob(targetAbs)
                    : false
                if (!suitable) {
                  return
                }
                const evt = await gen.process()
                if (evt.changed) {
                  if (evt.deleted.length > 0) {
                    const deletedTypesAndNames = evt.deleted.map((p) => `${p.type}.${p.name}`).join(' ')
                    console.info(`➖ ${deletedTypesAndNames}`)
                  }
                  if (evt.added.length > 0) {
                    const addedTypesAndNames = evt.added.map((p) => `${p.type}.${p.name}`).join(' ')
                    console.info(`➕ ${addedTypesAndNames}`)
                  }
                }
              }),
            )
          } catch (e) {
            console.error(`🔴 ${(e as Error).message}`)
          }
        }
      },
      {
        ignore: this.ignore,
      },
    )

    console.info('watcher started')

    // Store subscription for potential cleanup
    this.subscription = subscription
  }
}
