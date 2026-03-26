import type { RoutesPretty } from '@devp0nt/route0'
import { CompilerPoint, END_POINT_TYPES, Walker } from '@point0/compiler'
import type { LogFn } from '@point0/core'
import { generateId, log } from '@point0/core'
import fg from 'fast-glob'
import { minimatch } from 'minimatch'
import * as nodeFs from 'node:fs/promises'
import * as nodePath from 'node:path'
import type { EngineOptionsRoutes } from './config.js'
import { getDirByPaths, resolveTempDirPath } from './utils.js'
import { FilesWatcher } from './watcher.js'

type ChangeCollectedPointsEvent = {
  deleted: CompilerPoint[]
  added: CompilerPoint[]
  points: CompilerPoint[]
  changed: boolean
  errors: unknown[]
}

export type FilesGeneratorOptions = {
  cwd: string
  glob: string | string[]
  tasks: FilesGeneratorTask[]
  routes: Record<string, RoutesPretty | null | EngineOptionsRoutes>
  banner?: string
  log?: LogFn
  ssr?: boolean
}

export type FilesGeneratorTaskPoints = {
  scope: string
  what: 'points'
  side: 'client' | 'server'
  banner?: string | null
  outfile: string
  lazy?: boolean
}

export type FilesGeneratorTaskRoutes = {
  scope: string
  what: 'routes'
  banner?: string | null
  outfile: string
  origin?: string | null
}

export type FilesGeneratorTaskMeta = {
  scopes: string[]
  what: 'meta'
  banner?: string | null
  outfile: string
}

export type FilesGeneratorTask = FilesGeneratorTaskPoints | FilesGeneratorTaskRoutes | FilesGeneratorTaskMeta

export type FilesGeneratorPointsFilesChangeWatcher = (
  fileEvent: 'update' | 'delete',
  fileAbs: string,
  pointsEvent: ChangeCollectedPointsEvent,
) => Promise<void> | void

export type FileGeneratorProcessResult = ChangeCollectedPointsEvent & { written: boolean }

export class FilesGenerator {
  readonly banner: string | undefined
  readonly globInclude: string[]
  readonly globExclude: string[]
  readonly cwd: string
  readonly tempDir: string
  readonly tasks: FilesGeneratorTask[]
  readonly routes: Record<string, RoutesPretty>
  readonly routesSrc: Record<string, { instance: RoutesPretty | null; getter: EngineOptionsRoutes | null }>
  private isRoutesInitialized = false
  readonly log: LogFn
  private readonly filesWatcher: FilesWatcher
  readonly ssr: boolean

  readonly pointsFilesChangeWatchers: FilesGeneratorPointsFilesChangeWatcher[] = []

  private readonly files = new Set<string>()
  private readonly points: CompilerPoint[] = []
  private readonly pointsByPaths = new Map<string, CompilerPoint[]>()
  private readonly stablePoints: CompilerPoint[] = []

  // Map<outputAbs, content>
  private readonly lastEmittedContentMap = new Map<string, string>()

  constructor(opts: FilesGeneratorOptions) {
    this.banner = opts.banner
    this.cwd = opts.cwd
    this.log = opts.log ?? log
    const glob = Array.isArray(opts.glob) ? opts.glob : [opts.glob]
    this.globInclude = glob.filter((g) => !g.startsWith('!')).map((g) => nodePath.resolve(this.cwd, g))
    this.globExclude = glob.filter((g) => g.startsWith('!')).map((g) => nodePath.resolve(this.cwd, g.slice(1)))
    this.tempDir = resolveTempDirPath(['generator'])
    this.ssr = opts.ssr === undefined ? false : opts.ssr

    this.tasks = opts.tasks.map((t) => {
      const task = {
        ...t,
        banner: [this.banner, t.banner].filter(Boolean).join('\n') || null,
        outfile: nodePath.resolve(this.cwd, t.outfile),
      } satisfies FilesGeneratorTask
      if (task.what === 'points' && typeof task.lazy === 'undefined') {
        task.lazy = task.side === 'client'
      }
      return task
    })
    this.routesSrc = Object.entries(opts.routes).reduce<
      Record<string, { instance: RoutesPretty | null; getter: EngineOptionsRoutes | null }>
    >((acc, [scope, routes]) => {
      acc[scope] = {
        instance: typeof routes === 'function' ? null : routes,
        getter: typeof routes === 'function' ? routes : null,
      }
      return acc
    }, {})
    this.routes = {}
    const watchDir = this.globInclude.length > 0 ? getDirByPaths({ paths: this.globInclude }) : process.cwd()
    const watchIgnore = [...this.globExclude, ...this.tasks.map((t) => t.outfile)].flatMap((p) => p || [])
    const watchPatterns = [...this.globInclude]
    this.filesWatcher = FilesWatcher.create({
      watchDir,
      ignore: watchIgnore,
      patterns: watchPatterns,
    })
  }

  static create(opts: FilesGeneratorOptions) {
    return new FilesGenerator(opts)
  }

  async sync(options?: { logOnNotWritten?: boolean; silent?: boolean }): Promise<FileGeneratorProcessResult> {
    await this.collectFiles()
    const result = await this.process(undefined, { silent: options?.silent })
    if (options?.silent) {
      return result
    }
    if (!options?.logOnNotWritten && !result.written) {
      return result
    }
    const [loggerMethod, emoji] = result.errors.length > 0 ? ['warn' as const, '🟡'] : ['info' as const, '']
    this.log({
      level: loggerMethod,
      category: ['generator'],
      message: [emoji, `${result.points.length} points processed`].filter(Boolean).join(' '),
    })
    return result
  }

  // files

  private async collectFiles() {
    for (const pattern of this.globInclude) {
      // Convert absolute pattern to relative pattern for fast-glob
      const relativePattern = nodePath.relative(this.cwd, pattern)
      const entries = await fg([relativePattern], {
        cwd: this.cwd,
        absolute: true,
        onlyFiles: true,
        ignore: this.globExclude,
      })
      for (const absPath of entries) {
        this.files.add(absPath)
      }
    }
  }

  removeDirOrFile(fileOrDirAbs: string): void {
    for (const file of this.files) {
      if (file.startsWith(fileOrDirAbs)) {
        this.files.delete(file)
      }
    }
  }

  addOrUpdateFile(fileAbs: string): void {
    this.files.add(fileAbs)
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

  actualizePointsByPaths(points: CompilerPoint[]): void {
    this.pointsByPaths.clear()
    for (const point of points) {
      const current = this.pointsByPaths.get(point.file.abs)
      if (current) {
        current.push(point)
      } else {
        this.pointsByPaths.set(point.file.abs, [point])
      }
    }
  }

  // mutations

  private updatePoints(newPoints: CompilerPoint[]): void {
    const order = END_POINT_TYPES
    const orderIndex = new Map(order.map((t, i) => [t, i]))

    const stablePoints = [...newPoints]

    stablePoints.sort((a, b) => {
      if (a.type === 'root') {
        return -1
      }
      if (b.type === 'root') {
        return 1
      }
      const aIndex = orderIndex.get(a.type) ?? Number.MAX_SAFE_INTEGER
      const bIndex = orderIndex.get(b.type) ?? Number.MAX_SAFE_INTEGER
      const byType = aIndex - bIndex
      if (byType !== 0) return byType

      const byRoute = !a.route ? 0 : !b.route ? 1 : a.route.isMoreSpecificThan(b.route) ? -1 : 1
      if (byRoute !== 0) return byRoute

      const byName = a.name.localeCompare(b.name)
      if (byName !== 0) return byName

      return a.file.abs.localeCompare(b.file.abs)
    })

    this.points.splice(0, this.points.length, ...stablePoints)
    this.stablePoints.splice(0, this.stablePoints.length, ...stablePoints)
    this.actualizePointsByPaths(stablePoints)
  }

  // processing

  // TODO: not chunk size, but max in same time processing files
  async process(chunkSize = 30, options?: { silent?: boolean }): Promise<FileGeneratorProcessResult> {
    await this.initRoutesInstances()
    const files = [...this.files]
    const chunks = FilesGenerator.chunk(files, chunkSize)
    const walker = new Walker({ routes: this.routes, ssr: this.ssr })
    const collectedChunks = await Promise.all(
      chunks.map(async (chunk) => {
        const pointsArrays = await Promise.all(chunk.map(async (file) => walker.collectPointsFromFile({ file })))
        return pointsArrays.flat()
      }),
    )
    const errors = collectedChunks.flatMap((chunk) =>
      chunk.flatMap((p) => p.errors.map((e) => ({ error: e, file: p.file?.abs }))),
    )
    const collectedPoints = await Promise.all(
      collectedChunks.flatMap((chunk) =>
        chunk.flatMap((p) =>
          p.points.map(async (point) => {
            return point.parse()
          }),
        ),
      ),
    )

    const invalidPoints = collectedPoints.filter((p) => !p.valid)
    for (const point of invalidPoints) {
      const errorsMessages = point.errors.map((e) => (e instanceof Error ? e.message : String(e))).join(', ')
      const message = `${point.type}.${point.name}: ${errorsMessages} in ${point.strpos}`
      if (!options?.silent) {
        this.log({ level: 'error', category: ['generator'], message })
      }
    }
    const prevPoints = [...this.points]
    const validPoints = collectedPoints.filter((p) => p.valid)
    const hasPointParseErrors = invalidPoints.length > 0
    const hasCollectionErrors = errors.length > 0
    const shouldPreservePrevPoints = hasPointParseErrors || hasCollectionErrors
    const newPoints = shouldPreservePrevPoints
      ? FilesGenerator.mergeCollectedPointsWithoutDeletion(prevPoints, validPoints)
      : validPoints
    const diff = FilesGenerator.getCollectedPointsDiff(prevPoints, newPoints)
    this.updatePoints(newPoints)
    const { written } = diff.changed ? await this.writeOutputs() : { written: false }
    if (!options?.silent) {
      for (const { error, file } of errors) {
        const originalMessage = error instanceof Error ? error.message || String(error) : String(error)
        const originalErrorLoc =
          typeof error === 'object' &&
          error !== null &&
          'loc' in error &&
          typeof error.loc === 'object' &&
          error.loc !== null
            ? error.loc
            : undefined
        const originalErrorLine =
          originalErrorLoc && 'line' in originalErrorLoc && typeof originalErrorLoc.line === 'number'
            ? originalErrorLoc.line
            : undefined
        const originalErrorColumn =
          originalErrorLoc && 'column' in originalErrorLoc && typeof originalErrorLoc.column === 'number'
            ? originalErrorLoc.column
            : undefined
        const originalErrorPosition =
          originalErrorLine && originalErrorColumn ? `(${originalErrorLine}:${originalErrorColumn})` : ''
        const fileSuffix = file ? ` in ${file}${originalErrorPosition}` : ''
        this.log({
          level: 'error',
          category: ['generator'],
          // message: (error instanceof Error ? error.message : String(error)) + error.file ? ` in ${error.file}` : '',
          message: originalMessage + fileSuffix,
        })
      }
    }
    return {
      points: newPoints,
      deleted: diff.deleted,
      added: diff.added,
      changed: diff.changed,
      errors,
      written,
    }
  }

  private async initRoutesInstances(): Promise<void> {
    if (this.isRoutesInitialized) {
      return
    }
    const isRoutesObject = (result: unknown): result is RoutesPretty => {
      return (
        typeof result === 'object' &&
        result !== null &&
        '_' in result &&
        typeof result._ === 'object' &&
        result._ !== null &&
        'routes' in result._ &&
        typeof result._.routes === 'object' &&
        result._.routes !== null
      )
    }
    for (const [scope, { getter, instance }] of Object.entries(this.routesSrc)) {
      if (getter) {
        const result = await getter()
        if (isRoutesObject(result)) {
          this.routes[scope] = result
        } else if ('default' in result && isRoutesObject(result.default)) {
          this.routes[scope] = result.default
        } else if ('routes' in result && isRoutesObject(result.routes)) {
          this.routes[scope] = result.routes
        } else {
          throw new Error(`Invalid routes instance for scope ${scope}`)
        }
      }
      if (instance) {
        this.routes[scope] = instance
      }
    }
    this.isRoutesInitialized = true
  }

  private async writeOutputs(): Promise<{ written: boolean }> {
    const written = await Promise.all(this.tasks.map(async (task) => await this.writeTaskOutput(task))).then(
      (results) => results.some((r) => r.written),
    )
    return { written }
  }

  private async writeTaskOutput(task: FilesGeneratorTask): Promise<{ written: boolean }> {
    const tasks = []
    if (task.what === 'points' && task.lazy) {
      tasks.push({
        content: this.emitLazyPointsFile(task),
        outputAbs: task.outfile,
        tempOutputAbs: nodePath.join(this.tempDir, `${task.what}.${generateId()}.lazy.ts`),
      })
    }
    if (task.what === 'points' && !task.lazy) {
      tasks.push({
        content: this.emitReadyPointsFile(task),
        outputAbs: task.outfile,
        tempOutputAbs: nodePath.join(this.tempDir, `${task.what}.${generateId()}.ready.ts`),
      })
    }
    if (task.what === 'routes') {
      tasks.push({
        content: this.emitRoutesPointsFile(task),
        outputAbs: task.outfile,
        tempOutputAbs: nodePath.join(this.tempDir, `${task.scope}.${generateId()}.routes.ts`),
      })
    }
    // if (this.outputWouterRoutesAbs) {
    //   tasks.push({
    //     content: this.emitWouterRoutesFile(this.points),
    //     outputAbs: this.outputWouterRoutesAbs,
    //     tempOutputAbs: nodePath.join(this.tempDir, 'wouter-routes.ts'),
    //   })
    // }
    if (!tasks.length) {
      return { written: false }
    }
    const hasChanges = await Promise.all(
      tasks.map(async (task) => {
        if (!this.lastEmittedContentMap.has(task.outputAbs)) {
          const currentContent = await (async () => {
            try {
              return await nodeFs.readFile(task.outputAbs, 'utf8')
            } catch {
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
      return { written: false }
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
    return { written: true }
  }

  // emit

  // async isOutputFilesExists(): Promise<boolean> {
  //   const results = await Promise.all(this.tasks.map(async (task) => await this.isTaskOutputFilesExists(task)))
  //   return results.every((r) => r)
  // }

  // async isTaskOutputFilesExists(task: FilesGeneratorTask): Promise<boolean> {
  //   if (!task.outputPointsLazyAbs && !task.outputPointsReadyAbs && !task.outputRoutesAbs) {
  //     return true
  //   }
  //   const promises: Array<Promise<boolean>> = []
  //   if (task.outputPointsLazyAbs) {
  //     promises.push(
  //       nodeFs
  //         .access(task.outputPointsLazyAbs)
  //         .then(() => true)
  //         .catch(() => false),
  //     )
  //   }
  //   if (task.outputPointsReadyAbs) {
  //     promises.push(
  //       nodeFs
  //         .access(task.outputPointsReadyAbs)
  //         .then(() => true)
  //         .catch(() => false),
  //     )
  //   }
  //   if (task.outputRoutesAbs) {
  //     promises.push(
  //       nodeFs
  //         .access(task.outputRoutesAbs)
  //         .then(() => true)
  //         .catch(() => false),
  //     )
  //   }
  //   const results = await Promise.all(promises)
  //   return results.every((r) => r)
  // }

  // private emitSuperStoreInitialization(): string[] {
  //   const lines: string[] = []
  //   lines.push(`await import('point0/core/super-store.js').then(async ({ SuperStore }) => await SuperStore.init({}))`)
  //   return lines
  // }

  private emitNamedImports({ points, task }: { points: Array<CompilerPoint<true>>; task: FilesGeneratorTaskPoints }): {
    importLines: string[]
    importedPoints: Array<{ point: CompilerPoint; index: number; renamedExportName: string }>
    hasNotRootPoints: boolean
    rootSingleImportLine: string | null
  } {
    points = points.filter((p) => p.scope === task.scope)
    let rootSingleImportLine: string | null = null
    const importLines: string[] = []
    // let rootSingleReexportLine: string | undefined

    const importPathsAndExportNames: Array<{
      hasRoot: boolean
      importPath: string
      exports: Array<{ originalExportName: string; renamedExportName: string; root: boolean }>
    }> = []

    const importedPoints = points.flatMap((point, index) => {
      if (point.exportName === undefined) {
        return []
      }
      const importPath = FilesGenerator.toRelativeJsImportPath(task.outfile, point.file.abs)
      const importPathAndExportNames = importPathsAndExportNames.find((p) => p.importPath === importPath)
      const renamedExportName =
        point.type === 'root'
          ? `root_${index}`
          : point.exportName === 'default'
            ? `unnamed_${index}`
            : `${point.exportName}_${index}`
      // const renamedExportName = point.exportName === 'default' ? `unnamed_${index}` : `${point.exportName}_${index}`
      const originalExportName = point.exportName === 'default' ? 'default' : point.exportName
      const newItem = { originalExportName, renamedExportName, root: point.type === 'root' }
      if (importPathAndExportNames) {
        importPathAndExportNames.exports.push(newItem)
        if (point.type === 'root') {
          importPathAndExportNames.hasRoot = true
        }
      } else {
        importPathsAndExportNames.push({ importPath, exports: [newItem], hasRoot: point.type === 'root' })
      }
      return {
        point,
        index,
        renamedExportName,
      }
    })

    for (const importPathAndExportNames of importPathsAndExportNames) {
      if (!importPathAndExportNames.exports.length) {
        continue
      }
      const namedPart = `{ ${importPathAndExportNames.exports.map((e) => `${e.originalExportName} as ${e.renamedExportName}`).join(', ')} }`
      importLines.push(`import ${namedPart} from '${importPathAndExportNames.importPath}'`)
      if (importPathAndExportNames.hasRoot) {
        const rootImportPathAndExportName = importPathAndExportNames.exports.find((e) => e.root)
        if (!rootImportPathAndExportName) {
          throw new Error(
            `Root import path and export name not found for ${importPathAndExportNames.importPath} for scope ${task.scope}`,
          )
        }
        rootSingleImportLine = `import { ${rootImportPathAndExportName.originalExportName} as ${rootImportPathAndExportName.renamedExportName} } from '${importPathAndExportNames.importPath}'`
      }
    }
    const hasNotRootPoints = importedPoints.some((p) => p.point.type !== 'root')
    return { importLines, importedPoints, rootSingleImportLine, hasNotRootPoints }
  }

  // private emitLazyPointsFile(task: FilesGeneratorTask): string {
  //   if (!task.outputPointsLazyAbs) {
  //     throw new Error('outputPointsLazyAbs is not set')
  //   }
  //   const points = this.points.filter((p) => p.scope === task.scope && p.valid) as Array<CompilerPoint<true>>
  //   const lines: string[] = []
  //   if (task.banner) {
  //     lines.push(task.banner)
  //   }
  //   // lines.push(...this.emitSuperStoreInitialization())
  //   lines.push(`import type { LazyPointsCollectionRecord } from '@point0/core'`)
  //   // lines.push(`import { Point0 } from '@point0/core'`)

  //   if (!points.find((p) => p.type === 'root' && p.scope === task.scope)) {
  //     throw new Error(`Root point not found for task ${task.scope}`)
  //   }

  //   const { importedPoints, rootSingleImportLine } = this.emitNamedImports({
  //     points,
  //     outputAbs: task.outputPointsLazyAbs,
  //     task,
  //   })

  //   if (rootSingleImportLine) {
  //     lines.push(rootSingleImportLine)
  //   }
  //   lines.push(``)

  //   if (points.length === 0) {
  //     lines.push(`export {}`)
  //   } else {
  //     for (const { point, renamedExportName } of importedPoints) {
  //       if (point.type === 'root') {
  //         lines.push(`export const _${renamedExportName} = root`)
  //         continue
  //       }
  //       lines.push(`export const _${renamedExportName} = {`)
  //       lines.push(`  type: '${point.type}',`)
  //       lines.push(`  name: '${point.name}',`)
  //       if (point.route) {
  //         lines.push(`  route: '${point.route.definition}',`)
  //       }
  //       if (point.type === 'page') {
  //         lines.push(`  polh: ${point.polh === true ? 'true' : point.polh === false ? 'false' : point.polh},`)
  //       }
  //       if (point.type === 'page' && point.layouts.length) {
  //         const arr = point.layouts.map((r) => `'${r}'`).join(', ')
  //         lines.push(`  layouts: [${arr}],`)
  //       }

  //       lines.push(
  //         `  point: async () => (await import('${FilesGenerator.toRelativeJsImportPath(task.outputPointsLazyAbs, point.file.abs)}')).${point.exportName === 'default' ? 'default' : point.exportName},`,
  //       )
  //       lines.push(`} as LazyPointsCollectionRecord`)
  //       lines.push(``)
  //     }
  //   }

  //   lines.push(``)
  //   return lines.join('\n')
  // }

  // private emitReadyPointsFile(task: FilesGeneratorTask): string {
  //   if (!task.outputPointsReadyAbs) {
  //     throw new Error('outputReadyAbs is not set')
  //   }

  //   const points = this.points.filter((p) => p.scope === task.scope && p.valid) as Array<CompilerPoint<true>>

  //   if (!points.find((p) => p.type === 'root' && p.scope === task.scope)) {
  //     throw new Error(`Root point not found for task ${task.scope}`)
  //   }

  //   const lines: string[] = []
  //   if (task.banner) {
  //     lines.push(task.banner)
  //   }

  //   const { importLines, importedPoints, hasNotRootPoints } = this.emitNamedImports({
  //     points,
  //     outputAbs: task.outputPointsReadyAbs,
  //     task,
  //   })
  //   if (hasNotRootPoints) {
  //     lines.push(`import type { RawPointsCollectionRecord } from '@point0/core'`)
  //   }
  //   lines.push(...importLines)

  //   if (points.length === 0) {
  //     lines.push(`export {}`)
  //   } else {
  //     lines.push(``)
  //     for (const { point, renamedExportName } of importedPoints) {
  //       if (point.type === 'root') {
  //         lines.push(`export const _${renamedExportName} = ${renamedExportName}`)
  //       } else {
  //         lines.push(`export const _${renamedExportName} = ${renamedExportName} as RawPointsCollectionRecord`)
  //       }
  //       lines.push(``)
  //     }
  //   }

  //   return lines.join('\n')
  // }

  private static shouldExistsInPointsFile({
    point,
    side,
  }: {
    point: CompilerPoint
    side: 'client' | 'server'
  }): boolean {
    // if (point.type !== 'plugin' && point.type !== 'base' && point.exportName !== undefined && point.valid) {
    if (point.type === 'plugin' || point.type === 'base' || point.exportName === undefined || !point.valid) {
      return false
    }
    if (side === 'client') {
      return point.type === 'page' || point.type === 'layout' || point.type === 'root'
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (side === 'server') {
      return point.type === 'root' || point.endpoint !== undefined
    }
    return true
  }

  private emitLazyPointCollectionRecord({
    imported,
    file,
  }: {
    file: string
    imported: {
      point: CompilerPoint
      index: number
      renamedExportName: string
    }
  }): string[] {
    const { point } = imported
    const lines: string[] = []
    lines.push(`  {`)
    lines.push(`    type: '${point.type}',`)
    lines.push(`    name: '${point.name}',`)
    if (point.route) {
      lines.push(`    route: '${point.route.definition}',`)
    }
    if (point.type === 'page') {
      lines.push(`    polh: ${point.polh === true ? 'true' : point.polh === false ? 'false' : point.polh},`)
    }
    if (point.type === 'page' && point.layouts.length) {
      const arr = point.layouts.map((r) => `'${r}'`).join(', ')
      lines.push(`    layouts: [${arr}],`)
    }

    lines.push(
      `    point: async () => (await import('${FilesGenerator.toRelativeJsImportPath(file, point.file.abs)}')).${point.exportName === 'default' ? 'default' : point.exportName},`,
    )
    lines.push(`  },`)
    return lines
  }

  private emitLazyPointsFile(task: FilesGeneratorTaskPoints): string {
    const points = this.stablePoints.filter(
      (p) => p.scope === task.scope && FilesGenerator.shouldExistsInPointsFile({ point: p, side: task.side }),
    ) as Array<CompilerPoint<true>>
    const lines: string[] = []
    if (task.banner) {
      lines.push(task.banner)
    }
    // lines.push(...this.emitSuperStoreInitialization())
    lines.push(`import type { PointsDefinition } from '@point0/core'`)
    // lines.push(`import { Point0 } from '@point0/core'`)

    // TODO: lets add .lazy() and calculate by it
    const { importedPoints, rootSingleImportLine } = this.emitNamedImports({
      points,
      task,
    })
    const rootImported = importedPoints.find((p) => p.point.type === 'root')
    if (!rootImported) {
      throw new Error(`Root point not found for scope ${task.scope}`)
    }
    if (rootSingleImportLine) {
      lines.push(rootSingleImportLine)
    }

    lines.push(`export default [`)
    lines.push(`  ${rootImported.renamedExportName},`)

    for (const imported of importedPoints) {
      if (imported.point.type === 'root') {
        continue
      }
      lines.push(
        ...this.emitLazyPointCollectionRecord({
          imported,
          file: task.outfile,
        }),
      )
    }
    lines.push(
      `] as PointsDefinition<typeof ${rootImported.renamedExportName}['Infer']['RequiredCtx'], typeof ${rootImported.renamedExportName}['Infer']['Error']>`,
    )

    lines.push(``)
    return lines.join('\n')
  }

  private emitReadyPointsFile(task: FilesGeneratorTaskPoints): string {
    const points = this.stablePoints.filter(
      (p) => p.scope === task.scope && FilesGenerator.shouldExistsInPointsFile({ point: p, side: task.side }),
    ) as Array<CompilerPoint<true>>

    const lines: string[] = []
    if (task.banner) {
      lines.push(task.banner)
    }

    const { importLines, importedPoints } = this.emitNamedImports({
      points,
      task,
    })
    lines.push(`import type { PointsDefinition } from '@point0/core'`)
    lines.push(...importLines)
    const rootImported = importedPoints.find((p) => p.point.type === 'root')
    if (!rootImported) {
      throw new Error(`Root point not found for scope ${task.scope}`)
    }
    lines.push(`export default [`)
    lines.push(`  ${rootImported.renamedExportName},`)

    for (const { point, renamedExportName } of importedPoints) {
      if (point.type === 'root') {
        continue
      }
      lines.push(`  ${renamedExportName},`)
    }
    lines.push(
      `] as PointsDefinition<typeof ${rootImported.renamedExportName}['Infer']['RequiredCtx'], typeof ${rootImported.renamedExportName}['Infer']['Error']>`,
    )
    lines.push(``)

    return lines.join('\n')
  }

  // private emitWouterRoutesFile(points: CollectedPoint[]): string {
  //   if (!this.outputWouterRoutesAbs) {
  //     throw new Error('outputWouterRoutesAbs is not set')
  //   }

  //   const pagesTreeSource = Points.toPagesTreeSource({ points })

  //   const lines: string[] = []
  //   if (this.banner) lines.push(this.banner)

  //   // lines.push(...this.emitSuperStoreInitialization())
  //   lines.push(`import React from 'react'`)
  //   lines.push(`import { Route, Switch } from 'wouter'`)
  //   lines.push(``)

  //   const { importedPoints } = this.emitNamedImports({
  //     points,
  //     what: 'import',
  //     outputAbs: this.outputWouterRoutesAbs,
  //   })

  //   const pageByName = new Map<string, (typeof importedPoints)[number] & { route: AnyRoute }>()
  //   const layoutByName = new Map<string, (typeof importedPoints)[number]>()
  //   for (const p of importedPoints) {
  //     if (p.type === 'page' && p.route) {
  //       pageByName.set(p.name, p as any)
  //     } else if (p.type === 'layout') {
  //       layoutByName.set(p.name, p)
  //     }
  //   }

  //   const toComponentVar = (point: (typeof importedPoints)[number]) => `Component_${point.renamedExportName}`

  //   for (const p of importedPoints) {
  //     if (p.type !== 'page' && p.type !== 'layout') continue
  //     const relImportPath = FileGenerator.toRelativeJsImportPath(this.outputWouterRoutesAbs, p.fileAbs)
  //     const componentVar = toComponentVar(p)
  //     const suffix = p.type === 'page' ? '.point.Page' : '.point.Layout'
  //     // TODO: use when we will have preloaded pages and layouts
  //     // lines.push(
  //     //   `const ${componentVar} = (await import('${relImportPath}')).${
  //     //     p.exportName === 'default' ? 'default' : p.exportName
  //     //   }${suffix}`,
  //     // )

  //     // lines.push(
  //     //   `const ${componentVar} = process.env.NODE_ENV === 'production' ? React.lazy(async () => ({ default: (await import('${relImportPath}')).${p.exportName}${suffix} })) : (await import('${relImportPath}')).${p.exportName}${suffix}`,
  //     // )

  //     lines.push(
  //       `const ${componentVar} = React.lazy(async () => ({ default: (await import('${relImportPath}')).${p.exportName === 'default' ? 'default' : p.exportName}${suffix} }))`,
  //     )
  //   }
  //   lines.push(``)

  //   const combinePagesRoutesToRegexForLayout = (routes: AnyRoute[]) => {
  //     const compiled = routes.map((r) => r.getRegexBaseString())
  //     const pattern = `^(${compiled.join('|')})(?:/|$)`
  //     return `new RegExp('${pattern}')`
  //   }

  //   const emitPagesTree = (tree: PagesTreeSource, indent: string): void => {
  //     for (const node of tree) {
  //       if (node.layout) {
  //         const layout = layoutByName.get(node.layout)
  //         if (!layout) throw new Error(`Layout ${node.layout} not found`)
  //         const pages = node.pages.flatMap((p) => pageByName.get(p) || [])
  //         const layoutPagesRoutesRegexString = combinePagesRoutesToRegexForLayout(pages.map((p) => p.route))
  //         const layoutComponentVar = toComponentVar(layout)
  //         lines.push(`${indent}<Route path={${layoutPagesRoutesRegexString}}>`)
  //         lines.push(`${indent}  <${layoutComponentVar}>`)
  //         lines.push(`${indent}    <Switch>`)
  //         for (const page of pages) {
  //           const pageComponentVar = toComponentVar(page)
  //           lines.push(`${indent}      <Route path="${page.route.getDefinition()}"><${pageComponentVar} /></Route>`)
  //         }
  //         if (node.nested) {
  //           emitPagesTree(node.nested, `${indent}    `)
  //         }
  //         lines.push(`${indent}    </Switch>`)
  //         lines.push(`${indent}  </${layoutComponentVar}>`)
  //         lines.push(`${indent}</Route>`)
  //       } else {
  //         for (const pageName of node.pages) {
  //           const page = pageByName.get(pageName)
  //           if (!page) throw new Error(`Page ${pageName} not found`)
  //           const pageComponentVar = toComponentVar(page)
  //           lines.push(`${indent}<Route path="${page.route.getDefinition()}"><${pageComponentVar} /></Route>`)
  //         }
  //         if (node.nested) {
  //           emitPagesTree(node.nested, `${indent}    `)
  //         }
  //       }
  //     }
  //   }

  //   lines.push(`export const WouterRoutes = ({ Page404 = () => <div>Page Not Found</div> }) => {`)
  //   lines.push(`  return (`)
  //   lines.push(`    <Switch>`)

  //   emitPagesTree(pagesTreeSource, `      `)

  //   lines.push(`      <Route path="*">`)
  //   lines.push(`        <Page404 />`)
  //   lines.push(`      </Route>`)

  //   lines.push(`    </Switch>`)
  //   lines.push(`  )`)
  //   lines.push(`}`)
  //   lines.push(``)

  //   return lines.join('\n')
  // }

  private emitRoutesPointsFile(task: FilesGeneratorTaskRoutes): string {
    const points = this.stablePoints.filter((p) => p.scope === task.scope)
    const lines: string[] = []
    if (task.banner) {
      lines.push(task.banner)
    }
    lines.push(`import { Routes } from '@devp0nt/route0'`)
    lines.push(``)

    const hasRootPoint = points.some((p) => p.type === 'root' && p.scope === task.scope)
    if (!hasRootPoint) {
      throw new Error(`Root point not found for scope ${task.scope}`)
    }

    const originString = !task.origin
      ? undefined
      : task.origin.startsWith('process.env.') ||
          task.origin.startsWith('import.meta.env.') ||
          task.origin.startsWith('`')
        ? task.origin
        : `'${task.origin}'`
    const originSuffix = originString ? `, { origin: ${originString} }` : ''

    const pagePoints = points.flatMap((p) =>
      p.type === 'page' && p.route ? [{ name: p.name, route: p.route.definition }] : [],
    )
    if (pagePoints.length > 0) {
      lines.push(`export const routes = Routes.create({`)
      for (const p of pagePoints) {
        lines.push(`  '${p.name}': '${p.route}',`)
      }
      lines.push(`}${originSuffix})`)
    } else {
      lines.push(`export const routes = Routes.create({}${originSuffix})`)
    }
    lines.push(``)

    return lines.join('\n')
  }

  // utils

  private static getCollectedPointsDiff(
    prevPoints: CompilerPoint[],
    newPoints: CompilerPoint[],
  ): {
    deleted: CompilerPoint[]
    added: CompilerPoint[]
    changed: boolean
  } {
    const deleted = prevPoints.filter((p) => !newPoints.some((cp) => CompilerPoint.isGenerallySamePoint(p, cp)))
    const added = newPoints.filter((p) => !prevPoints.some((cp) => CompilerPoint.isGenerallySamePoint(p, cp)))
    const changed = added.length > 0 || deleted.length > 0
    return { deleted, added, changed }
  }

  private static mergeCollectedPointsWithoutDeletion(
    prevPoints: CompilerPoint[],
    newPoints: CompilerPoint[],
  ): CompilerPoint[] {
    const result = [...prevPoints]
    for (const newPoint of newPoints) {
      const prevIdx = result.findIndex((prevPoint) => CompilerPoint.isGenerallySamePoint(prevPoint, newPoint))
      if (prevIdx >= 0) {
        result[prevIdx] = newPoint
      } else {
        result.push(newPoint)
      }
    }
    return result
  }

  private static chunk<T>(array: readonly T[], size: number): T[][] {
    if (size <= 0) throw new Error('chunk size must be > 0')
    const result: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      result.push(array.slice(i, i + size))
    }
    return result
  }

  private static toRelativeJsImportPath(fromAbs: string, toAbs: string): string {
    let rel = nodePath
      .relative(nodePath.dirname(fromAbs), toAbs)
      .replace(/\\/g, '/')
      .replace(/.tsx?$/, '.js')
    if (!rel.startsWith('.')) rel = './' + rel
    return rel
  }

  // wathcer

  getCollectedPointsRelatedToPath(path: string): CompilerPoint[] {
    const exactPoints = this.pointsByPaths.get(path)
    if (exactPoints) {
      return exactPoints
    }
    const pointsPaths = Array.from(this.pointsByPaths.keys())
    const result: CompilerPoint[] = []
    for (const pointPath of pointsPaths) {
      if (pointPath.startsWith(path)) {
        const points = this.pointsByPaths.get(pointPath)
        if (points) {
          result.push(...points)
        }
      }
    }
    return result
  }

  async watch(options?: { silent?: boolean }) {
    await this.filesWatcher.start({
      isSuitable: (event) => {
        return event.type === 'delete'
          ? this.isFileOrDirSuitableToFiles(event.path)
          : this.isFileSuitableToGlob(event.path)
      },
      onEvent: async (event) => {
        if (event.type === 'delete') {
          this.removeDirOrFile(event.path)
        } else {
          this.addOrUpdateFile(event.path)
        }
        const pointsEvent = await this.process()
        this.notifyCustomWatchers(event.type, event.path, pointsEvent)
        if (!pointsEvent.changed) {
          return
        }
        if (pointsEvent.deleted.length > 0) {
          const deletedTypesAndNames = pointsEvent.deleted.map((p) => `${p.type}.${p.name}`).join(', ')
          if (!options?.silent) {
            this.log({
              level: 'info',
              category: ['generator'],
              message: `remove: ${deletedTypesAndNames}`,
            })
          }
        }
        if (pointsEvent.added.length > 0) {
          const addedTypesAndNames = pointsEvent.added.map((p) => `${p.type}.${p.name}`).join(', ')
          if (!options?.silent) {
            this.log({
              level: 'info',
              category: ['generator'],
              message: `add: ${addedTypesAndNames}`,
            })
          }
        }
      },
      onError: async (error) => {
        if (!options?.silent) {
          this.log({ level: 'error', category: ['generator'], message: `Watcher error`, error })
        }
      },
    })
    if (!options?.silent) {
      this.log({ level: 'info', category: ['generator'], message: 'Watcher started' })
    }
  }

  async stopWatch() {
    await this.filesWatcher.stop()
  }

  onPointFileChange(callback: FilesGeneratorPointsFilesChangeWatcher) {
    this.pointsFilesChangeWatchers.push(callback)
  }

  private notifyCustomWatchers(
    fileEvent: 'update' | 'delete',
    fileAbs: string,
    pointsEvent: ChangeCollectedPointsEvent,
  ): void {
    for (const watcher of this.pointsFilesChangeWatchers) {
      void watcher(fileEvent, fileAbs, pointsEvent)
    }
  }
}
