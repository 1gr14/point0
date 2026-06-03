import type { RoutesPretty } from '@devp0nt/route0'
import { CompilerPoint, END_POINT_TYPES, Walker, resolveTempDirPath } from '@point0/compiler'
import { generateId, log } from '@point0/core'
import type { LogFn } from '@point0/core'
import fg from 'fast-glob'
import { minimatch } from 'minimatch'
import * as nodeFs from 'node:fs/promises'
import * as nodePath from 'node:path'
import type { EngineOptionsRoutes } from './config.js'
import { parseGlobs } from './utils.js'
import { FilesWatcher } from './watcher.js'
import type { PointsScope } from '@point0/core'

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

export type FilesGeneratorTaskServerPoints = {
  scope: string
  what: 'serverPoints'
  banner?: string | null
  outfile: string
}

export type FilesGeneratorTaskClientPoints = {
  scope: string
  what: 'clientPoints'
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
  engine: {
    file: string
    server:
      | {
          scope: PointsScope
        }
      | undefined
    clients:
      | Array<{
          scope: PointsScope
        }>
      | undefined
  }
  banner?: string | null
  outfile: string
}

export type EmitNamedImportsResult = {
  importLines: string[]
  importedPoints: Array<{ point: CompilerPoint<true>; index: number; renamedExportName: string }>
  hasNotRootPoints: boolean
  rootSingleImportLine: string | null
}

export type FilesGeneratorTaskCustomFileHandler = (options: {
  points: CompilerPoint<true>[]
  cwd: string
  log: LogFn
  tempDir: string
  emitPointsImports: (options: { points: Array<CompilerPoint<true>> }) => EmitNamedImportsResult
}) => Promise<string> | string

export type FilesGeneratorTaskCustomControlledHandler = (options: {
  points: CompilerPoint<true>[]
  cwd: string
  log: LogFn
  tempDir: string
  emitPointsImports: (options: { points: Array<CompilerPoint<true>>; outfile: string }) => EmitNamedImportsResult
}) => Promise<void> | void

export type FilesGeneratorTaskCustomFile = {
  what: 'customFile'
  handler: FilesGeneratorTaskCustomFileHandler
  outfile: string
}

export type FilesGeneratorTaskCustomControlled = {
  what: 'customControlled'
  handler: FilesGeneratorTaskCustomControlledHandler
}

export type FilesGeneratorTaskCustomFileWithoutScope = Omit<FilesGeneratorTaskCustomFile, 'scopes'>
export type FilesGeneratorTaskCustomControlledWithoutScope = Omit<FilesGeneratorTaskCustomControlled, 'scopes'>

export type FilesGeneratorTaskCustom = FilesGeneratorTaskCustomFile | FilesGeneratorTaskCustomControlled
export type FilesGeneratorTaskCustomWithoutScope =
  | FilesGeneratorTaskCustomFileWithoutScope
  | FilesGeneratorTaskCustomControlledWithoutScope

export type FilesGeneratorSimpleServerConfig = {
  points?: string | { outfile: string; banner?: string | null }
  custom?: FilesGeneratorTaskCustomWithoutScope[]
}

export type FilesGeneratorSimpleClientConfig = {
  points?: string | { outfile: string; banner?: string | null; lazy?: boolean }
  routes?: string | { outfile: string; banner?: string | null; origin?: string | null }
  custom?: FilesGeneratorTaskCustomWithoutScope[]
}

export type FilesGeneratorSimpleGeneralConfig = {
  meta?: string | { outfile: string; banner?: string | null }
  custom?: FilesGeneratorTaskCustomWithoutScope[]
}

export type FilesGeneratorTask =
  | FilesGeneratorTaskClientPoints
  | FilesGeneratorTaskServerPoints
  | FilesGeneratorTaskRoutes
  | FilesGeneratorTaskMeta
  | FilesGeneratorTaskCustomFile
  | FilesGeneratorTaskCustomControlled

export type FilesGeneratorPointsFilesChangeWatcher = (
  fileEvent: 'update' | 'delete',
  fileAbs: string,
  pointsEvent: ChangeCollectedPointsEvent,
) => Promise<void> | void

export type FileGeneratorProcessResult = ChangeCollectedPointsEvent & { written: boolean }

export class FilesGenerator {
  readonly banner: string | undefined
  readonly globIncludes: string[]
  readonly globExcludes: string[]
  readonly globPatterns: string[]
  readonly cwd: string
  readonly tempDir: string
  readonly tasks: FilesGeneratorTask[]
  readonly routes: Record<string, RoutesPretty>
  readonly routesSrc: Record<string, { instance: RoutesPretty | null; getter: EngineOptionsRoutes | null }>
  private isRoutesInitialized = false
  log: LogFn
  private readonly filesWatcher: FilesWatcher
  readonly ssr: boolean

  readonly pointsFilesChangeWatchers: FilesGeneratorPointsFilesChangeWatcher[] = []

  private readonly files = new Set<string>()
  private readonly pointsByPaths = new Map<string, CompilerPoint[]>()
  private readonly points: CompilerPoint[] = []
  private readonly safePoints: CompilerPoint[] = []

  // Map<outputAbs, content>
  private readonly lastEmittedContentMap = new Map<string, string>()

  constructor(opts: FilesGeneratorOptions) {
    this.banner = opts.banner
    this.cwd = opts.cwd
    this.log = opts.log ?? log
    const glob = Array.isArray(opts.glob) ? opts.glob : [opts.glob]
    this.tempDir = resolveTempDirPath(['generator'])
    this.ssr = opts.ssr === undefined ? false : opts.ssr

    this.tasks = opts.tasks.map((t) => {
      const task = {
        ...t,
      } as Record<string, unknown>
      if (t.what !== 'customControlled' && t.what !== 'customFile') {
        task.banner = [this.banner, t.banner].filter(Boolean).join('\n') || null
      }
      if (t.what !== 'customControlled') {
        task.outfile = nodePath.resolve(this.cwd, t.outfile)
      }
      if (task.what === 'clientPoints' && task.lazy === undefined) {
        task.lazy = true
      }
      return task as FilesGeneratorTask
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
    // const watchDir = this.globInclude.length > 0 ? getDirByPaths({ paths: this.globInclude }) : process.cwd()
    // const watchIgnore = [...this.globExclude, ...this.tasks.map((t) => ('outfile' in t ? t.outfile : null))].flatMap(
    //   (p) => p || [],
    // )
    // const watchPatterns = [...this.globInclude]
    const parsedGlobs = parseGlobs({ cwd: this.cwd, globs: glob })
    this.globIncludes = parsedGlobs.includes
    this.globExcludes = parsedGlobs.excludes
    this.globPatterns = parsedGlobs.patterns
    this.filesWatcher = FilesWatcher.create(parsedGlobs)
  }

  static create(opts: FilesGeneratorOptions) {
    return new FilesGenerator(opts)
  }

  async sync(options?: { logOnNotWritten?: boolean; silent?: boolean }): Promise<FileGeneratorProcessResult> {
    const startedAt = performance.now()
    await this.collectFiles()
    const result = await this.process(undefined, { silent: options?.silent })
    if (options?.silent) {
      return result
    }
    if (!options?.logOnNotWritten && !result.written) {
      return result
    }
    const [loggerMethod, emoji] = result.errors.length > 0 ? ['warn' as const, '🟡'] : ['info' as const, '']
    const durationMs = Math.round(performance.now() - startedAt)
    this.log({
      level: loggerMethod,
      category: ['generator'],
      message: [emoji, `${result.points.length} points processed in ${durationMs}ms`].filter(Boolean).join(' '),
    })
    return result
  }

  // files

  private async collectFiles() {
    for (const pattern of this.globIncludes) {
      // Convert absolute pattern to relative pattern for fast-glob
      const relativePattern = nodePath.relative(this.cwd, pattern)
      const entries = await fg([relativePattern], {
        cwd: this.cwd,
        absolute: true,
        onlyFiles: true,
        ignore: this.globExcludes,
      })
      for (const absPath of entries.sort((a, b) => a.localeCompare(b))) {
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
      this.globIncludes.some((g) => {
        return minimatch(fileAbs, g, { dot: true })
      }) &&
      !this.globExcludes.some((g) => {
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

  private static sortPoints(points: CompilerPoint[]): CompilerPoint[] {
    const order = END_POINT_TYPES
    const orderIndex = new Map(order.map((t, i) => [t, i]))
    return points.sort((a, b) => {
      if (a.type === 'root' || b.type === 'root') {
        if (a.type !== b.type) {
          return a.type === 'root' ? -1 : 1
        }
      }
      const aIndex = orderIndex.get(a.type) ?? Number.MAX_SAFE_INTEGER
      const bIndex = orderIndex.get(b.type) ?? Number.MAX_SAFE_INTEGER
      const byType = aIndex - bIndex
      if (byType !== 0) return byType

      if (!a.route && b.route) return -1
      if (a.route && !b.route) return 1
      if (a.route && b.route) {
        const aMoreSpecific = a.route.isMoreSpecificThan(b.route)
        const bMoreSpecific = b.route.isMoreSpecificThan(a.route)
        if (aMoreSpecific !== bMoreSpecific) {
          return aMoreSpecific ? -1 : 1
        }
        const byRouteDefinition = a.route.definition.localeCompare(b.route.definition)
        if (byRouteDefinition !== 0) return byRouteDefinition
      }

      const byName = a.name.localeCompare(b.name)
      if (byName !== 0) return byName

      const byFile = a.file.abs.localeCompare(b.file.abs)
      if (byFile !== 0) return byFile

      const byPos = a.strpos.localeCompare(b.strpos)
      if (byPos !== 0) return byPos

      const byExportName = (a.exportName ?? '').localeCompare(b.exportName ?? '')
      if (byExportName !== 0) return byExportName

      // Absolute final tie-breaker to keep ordering deterministic.
      return a.id.localeCompare(b.id)
    })
  }

  private updatePoints({
    newSafePoints,
    allNewPoints,
  }: {
    newSafePoints: CompilerPoint[]
    allNewPoints: CompilerPoint[]
  }): void {
    const newAllStablePoints = FilesGenerator.sortPoints([...allNewPoints])
    const newSafeStablePoints = FilesGenerator.sortPoints([...newSafePoints])

    this.points.splice(0, this.points.length, ...newAllStablePoints)
    this.safePoints.splice(0, this.safePoints.length, ...newSafeStablePoints)
    this.actualizePointsByPaths(newAllStablePoints)
  }

  // processing

  // TODO: not chunk size, but max in same time processing files
  async process(chunkSize = 30, options?: { silent?: boolean }): Promise<FileGeneratorProcessResult> {
    await this.initRoutesInstances()
    const files = [...this.files].sort((a, b) => a.localeCompare(b))
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
    const prevPoints = [...this.safePoints]
    const validPoints = collectedPoints.filter((p) => p.valid)
    const hasPointParseErrors = invalidPoints.length > 0
    const hasCollectionErrors = errors.length > 0
    const shouldPreservePrevPoints = hasPointParseErrors || hasCollectionErrors
    const newSafePoints = shouldPreservePrevPoints
      ? FilesGenerator.mergeCollectedPointsWithoutDeletion(prevPoints, validPoints)
      : validPoints
    const diff = FilesGenerator.getCollectedPointsDiff(prevPoints, newSafePoints)
    this.updatePoints({ newSafePoints, allNewPoints: collectedPoints })
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
      points: newSafePoints,
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
    const tasks: Array<
      { content: string; outputAbs: string; tempOutputAbs: string; type: 'file' } | { type: 'controlled' }
    > = []
    if (task.what === 'clientPoints' && task.lazy) {
      tasks.push({
        content: this.emitLazyPointsFile(task),
        outputAbs: task.outfile,
        tempOutputAbs: nodePath.join(this.tempDir, `${task.what}.${generateId()}.lazy.ts`),
        type: 'file',
      })
    }
    if ((task.what === 'clientPoints' && !task.lazy) || task.what === 'serverPoints') {
      tasks.push({
        content: this.emitReadyPointsFile(task),
        outputAbs: task.outfile,
        tempOutputAbs: nodePath.join(this.tempDir, `${task.what}.${generateId()}.ready.ts`),
        type: 'file',
      })
    }
    if (task.what === 'routes') {
      tasks.push({
        content: this.emitRoutesPointsFile(task),
        outputAbs: task.outfile,
        tempOutputAbs: nodePath.join(this.tempDir, `${task.scope}.${generateId()}.routes.ts`),
        type: 'file',
      })
    }
    if (task.what === 'meta') {
      tasks.push({
        content: this.emitMetaFile(task),
        outputAbs: task.outfile,
        tempOutputAbs: nodePath.join(this.tempDir, `${task.scopes.join('.')}.${generateId()}.meta.ts`),
        type: 'file',
      })
    }
    if (task.what === 'customFile') {
      tasks.push({
        content: await task.handler({
          points: this.points.filter((p) => p.valid),
          cwd: this.cwd,
          log: this.log,
          tempDir: this.tempDir,
          emitPointsImports: ({ points }) => this.emitPointsImports({ points, outfile: task.outfile }),
        }),
        outputAbs: task.outfile,
        tempOutputAbs: nodePath.join(this.tempDir, `${task.what}.${generateId()}.ts`),
        type: 'file',
      })
    }
    if (task.what === 'customControlled') {
      tasks.push({
        type: 'controlled',
      })
      await task.handler({
        points: this.points.filter((p) => p.valid),
        cwd: this.cwd,
        log: this.log,
        tempDir: this.tempDir,
        emitPointsImports: ({ points, outfile }) => this.emitPointsImports({ points, outfile }),
      })
    }
    if (!tasks.length) {
      return { written: false }
    }
    const hasChanges = await Promise.all(
      tasks.map(async (task) => {
        if (task.type === 'controlled') {
          return true
        }
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
    const tasksToWrite = tasks.filter((task, index) => hasChanges[index] && task.type !== 'controlled') as Exclude<
      (typeof tasks)[number],
      { type: 'controlled' }
    >[]
    const contolledTasks = tasks.filter((task) => task.type === 'controlled') as { type: 'controlled' }[]
    if (!tasksToWrite.length && !contolledTasks.length) {
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

  emitPointsImports({ points, outfile }: { points: Array<CompilerPoint<true>>; outfile: string }): {
    importLines: string[]
    importedPoints: Array<{ point: CompilerPoint<true>; index: number; renamedExportName: string }>
    hasNotRootPoints: boolean
    rootSingleImportLine: string | null
  } {
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
      const importPath = FilesGenerator.toRelativeJsImportPath(outfile, point.file.abs)
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
            `Root import path and export name not found for ${importPathAndExportNames.importPath} while generating ${outfile}`,
          )
        }
        rootSingleImportLine = `import { ${rootImportPathAndExportName.originalExportName} as ${rootImportPathAndExportName.renamedExportName} } from '${importPathAndExportNames.importPath}'`
      }
    }
    const hasNotRootPoints = importedPoints.some((p) => p.point.type !== 'root')
    return { importLines, importedPoints, rootSingleImportLine, hasNotRootPoints }
  }

  private static shouldExistsInServerPointsFile({ point, scope }: { point: CompilerPoint; scope: string }): boolean {
    // if (point.type !== 'plugin' && point.type !== 'base' && point.exportName !== undefined && point.valid) {
    if (point.type === 'plugin' || point.type === 'base' || point.exportName === undefined || !point.valid) {
      return false
    }
    return (
      point.scopes.includes(scope) && ((point.type === 'root' && point.scope === scope) || point.endpoint !== undefined)
    )
  }

  private static shouldExistsInClientPointsFile({ point, scope }: { point: CompilerPoint; scope: string }): boolean {
    // if (point.type !== 'plugin' && point.type !== 'base' && point.exportName !== undefined && point.valid) {
    if (point.type === 'plugin' || point.type === 'base' || point.exportName === undefined || !point.valid) {
      return false
    }
    return point.scope === scope && (point.type === 'page' || point.type === 'layout' || point.type === 'root')
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

  emitLazyPointsFile(task: FilesGeneratorTaskClientPoints): string {
    const points = this.safePoints.filter((p) =>
      FilesGenerator.shouldExistsInClientPointsFile({ point: p, scope: task.scope }),
    ) as Array<CompilerPoint<true>>
    const lines: string[] = []
    if (task.banner) {
      lines.push(task.banner)
    }
    lines.push(`import type { PointsDefinition } from '@point0/core'`)

    // TODO: lets add .lazy() and calculate by it also
    const { importedPoints, rootSingleImportLine } = this.emitPointsImports({
      points,
      outfile: task.outfile,
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

  emitReadyPointsFile(task: FilesGeneratorTaskClientPoints | FilesGeneratorTaskServerPoints): string {
    const side = task.what === 'clientPoints' ? 'client' : 'server'
    const points = this.safePoints.filter((p) =>
      side === 'client'
        ? FilesGenerator.shouldExistsInClientPointsFile({ point: p, scope: task.scope })
        : FilesGenerator.shouldExistsInServerPointsFile({ point: p, scope: task.scope }),
    ) as Array<CompilerPoint<true>>

    const lines: string[] = []
    if (task.banner) {
      lines.push(task.banner)
    }

    const { importLines, importedPoints } = this.emitPointsImports({
      points,
      outfile: task.outfile,
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

  // maybe later will use it to generate expo router

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

  //   const { importedPoints } = this.emitPointsImports({
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
  //     // use when we will have preloaded pages and layouts
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

  emitRoutesPointsFile(task: FilesGeneratorTaskRoutes): string {
    const points = this.safePoints.filter((p) => p.scope === task.scope)
    const lines: string[] = []
    if (task.banner) {
      lines.push(task.banner)
    }

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

    // A page becomes a typed route — `Route0.create(path).search<...>()` instead of a bare path
    // string — when a search schema applies to it (declared on the page or inherited from a layout)
    // and it is exported, so we can reference its inferred search type. We use `SearchRaw` (the input
    // accepted when building a URL) and point at it via a `typeof import('...')` expression rather
    // than a runtime import, so the page module (and its server-only code) is never pulled into the
    // routes bundle.
    const pagePoints = points.flatMap((p) =>
      p.type === 'page' && p.route
        ? [{ point: p, name: p.name, route: p.route.definition, typed: p.hasSearch() && p.exportName !== undefined }]
        : [],
    )
    const hasTypedPages = pagePoints.some((p) => p.typed)

    lines.push(
      hasTypedPages ? `import { Route0, Routes } from '@devp0nt/route0'` : `import { Routes } from '@devp0nt/route0'`,
    )
    lines.push(``)

    if (pagePoints.length > 0) {
      lines.push(`export const routes = Routes.create({`)
      for (const p of pagePoints) {
        if (p.typed) {
          const importPath = FilesGenerator.toRelativeJsImportPath(task.outfile, p.point.file.abs)
          const exportName = p.point.exportName === 'default' ? 'default' : p.point.exportName
          lines.push(
            `  '${p.name}': Route0.create('${p.route}').search<typeof import('${importPath}')['${exportName}']['Infer']['SearchRaw']>(),`,
          )
        } else {
          lines.push(`  '${p.name}': '${p.route}',`)
        }
      }
      lines.push(`}${originSuffix})`)
    } else {
      lines.push(`export const routes = Routes.create({}${originSuffix})`)
    }
    lines.push(``)

    return lines.join('\n')
  }

  emitMetaFile(task: FilesGeneratorTaskMeta): string {
    const points = this.points.filter(
      (p) => (p.scope && task.scopes.includes(p.scope)) || p.scope === 'plugin',
    ) as CompilerPoint<true>[]
    const { importedPoints } = this.emitPointsImports({
      points,
      outfile: task.outfile,
    })
    const importedPointByPoint = new Map(importedPoints.map((imported) => [imported.point, imported] as const))
    const layoutPointByScopeAndName = new Map(
      points
        .filter((point) => point.type === 'layout')
        .map((point) => [`${point.scope}::${point.name}`, point] as const),
    )
    const literal = (value: unknown): string =>
      value === undefined
        ? 'undefined'
        : typeof value === 'string'
          ? `'${value}'`
          : Array.isArray(value) && value.every((v) => typeof v === 'string')
            ? `[${value.map((v) => `'${v}'`).join(', ')}]`
            : JSON.stringify(value)
    const pushLinkedPointBlock = ({
      lines,
      indent,
      point,
    }: {
      lines: string[]
      indent: string
      point: {
        scope: string | undefined
        type: string
        name: string
        id: string
        pos: CompilerPoint['pos'] | undefined
      }
    }) => {
      lines.push(`${indent}{`)
      lines.push(`${indent}  scope: ${literal(point.scope)},`)
      lines.push(`${indent}  type: ${literal(point.type)},`)
      lines.push(`${indent}  name: ${literal(point.name)},`)
      lines.push(`${indent}  id: ${literal(point.id)},`)
      pushPosBlock({
        lines,
        indent: `${indent}  `,
        key: `pos`,
        pos: point.pos,
      })
      lines.push(`${indent}},`)
    }
    const pushPosBlock = ({
      lines,
      indent,
      key,
      pos,
    }: {
      lines: string[]
      indent: string
      key: string
      pos: CompilerPoint['pos'] | undefined
    }) => {
      if (!pos) {
        lines.push(`${indent}${key}: undefined,`)
        return
      }
      lines.push(`${indent}${key}: {`)
      lines.push(`${indent}  file: ${literal(pos.file)},`)
      lines.push(`${indent}  line: ${literal(pos.line)},`)
      lines.push(`${indent}  column: ${literal(pos.column)},`)
      lines.push(`${indent}},`)
    }
    const lines: string[] = []
    if (task.banner) {
      lines.push(task.banner)
    }
    const hasRoutes = points.some((p) => ((p.type === 'page' || p.type === 'layout') && p.route) || p.endpoint?.route)
    if (hasRoutes) {
      lines.push(`import { Route0 } from '@devp0nt/route0'`)
      lines.push(`import { Engine } from '@point0/engine'`)
    }
    lines.push(`export default {`)
    lines.push(`  engine: {`)
    lines.push(`    file: ${literal(task.engine.file)},`)
    lines.push(
      `    import: async () => (await Engine.findAndImportSelf({ engineFile: ${literal(task.engine.file)} })).engine,`,
    )
    if (task.engine.server) {
      lines.push(`    server: {`)
      lines.push(`      scope: ${literal(task.engine.server.scope)},`)
      lines.push(`    },`)
    } else {
      lines.push(`    server: undefined,`)
    }
    if (task.engine.clients) {
      lines.push(`    clients: [`)
      for (const client of task.engine.clients) {
        lines.push(`      {`)
        lines.push(`        scope: ${literal(client.scope)},`)
        lines.push(`      },`)
      }
      lines.push(`    ],`)
    } else {
      lines.push(`    clients: undefined,`)
    }
    lines.push(`  },`)
    lines.push(`  points: [`)
    for (const point of points) {
      const importedPoint = importedPointByPoint.get(point)
      lines.push(`    {`)
      lines.push(`      scope: ${literal(point.scope)},`)
      lines.push(`      type: ${literal(point.type)},`)
      lines.push(`      name: ${literal(point.name)},`)
      lines.push(`      id: ${literal(point.id)},`)
      lines.push(`      tags: ${literal(point.tags)},`)
      lines.push(`      description: ${point.description === undefined ? 'undefined' : `\`${point.description}\``},`)
      if ((point.type === 'page' || point.type === 'layout') && point.route) {
        lines.push(`      route: Route0.create(${literal(point.route.definition)}),`)
      } else {
        lines.push(`      route: undefined,`)
      }
      if (point.endpoint) {
        lines.push(`      endpoint: {`)
        lines.push(`        method: ${literal(point.endpoint.method)},`)
        lines.push(`        route: Route0.create(${literal(point.endpoint.route.definition)}),`)
        lines.push(`      },`)
      } else {
        lines.push(`      endpoint: undefined,`)
      }
      pushPosBlock({
        lines,
        indent: `      `,
        key: `pos`,
        pos: point.pos,
      })
      if (importedPoint) {
        lines.push(
          `      import: async () => (await import('${FilesGenerator.toRelativeJsImportPath(task.outfile, point.file.abs)}')).${point.exportName === 'default' ? 'default' : point.exportName},`,
        )
      } else {
        lines.push(`      import: undefined,`)
      }
      lines.push(`      valid: ${literal(point.valid)},`)
      if (point.errors.length > 0) {
        lines.push(`      errors: [`)
        for (const error of point.errors) {
          lines.push(`        \`${error instanceof Error ? error.message : String(error)}\`,`)
        }
        lines.push(`      ],`)
      } else {
        lines.push(`      errors: [],`)
      }
      lines.push(`      ssr: ${literal(point.ssr)},`)
      if (point.parents.length > 0) {
        lines.push(`      parents: [`)
        for (const parent of point.parents) {
          pushLinkedPointBlock({
            lines,
            indent: `        `,
            point: {
              scope: parent.scope,
              type: parent.type,
              name: parent.name,
              id: parent.id,
              pos: parent.pos,
            },
          })
        }
        lines.push(`      ],`)
      } else {
        lines.push(`      parents: [],`)
      }
      if (point.layouts.length > 0) {
        lines.push(`      layouts: [`)
        for (const layoutName of point.layouts) {
          const layoutPoint = layoutPointByScopeAndName.get(`${point.scope}::${layoutName}`)
          pushLinkedPointBlock({
            lines,
            indent: `        `,
            point: {
              scope: point.scope,
              type: 'layout',
              name: layoutName,
              id:
                layoutPoint?.id ??
                CompilerPoint.toId({
                  scope: point.scope,
                  type: 'layout',
                  name: layoutName,
                }),
              pos: layoutPoint?.pos,
            },
          })
        }
        lines.push(`      ],`)
      } else {
        lines.push(`      layouts: [],`)
      }
      lines.push(`    },`)
    }
    lines.push(`  ],`)
    lines.push(`}`)
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

  static simpleCustomConfigToTasks({
    config,
  }: {
    config: FilesGeneratorSimpleClientConfig | FilesGeneratorSimpleServerConfig | FilesGeneratorSimpleGeneralConfig
  }): Array<FilesGeneratorTask> {
    const tasks: Array<FilesGeneratorTask> = []
    if (config.custom) {
      for (const customTask of config.custom) {
        if (customTask.what === 'customFile') {
          tasks.push({
            what: 'customFile',
            outfile: customTask.outfile,
            handler: customTask.handler,
          })
        }
        if (customTask.what === 'customControlled') {
          tasks.push({
            what: 'customControlled',
            handler: customTask.handler,
          })
        }
      }
    }
    return tasks
  }

  static simpleGeneralConfigToTasks({
    config,
    scopes,
    engine,
  }: {
    config: FilesGeneratorSimpleGeneralConfig
    scopes: string[]
    engine: {
      file: string
      server:
        | {
            scope: PointsScope
          }
        | undefined
      clients:
        | Array<{
            scope: PointsScope
          }>
        | undefined
    }
  }): Array<FilesGeneratorTask> {
    const tasks: Array<FilesGeneratorTask> = []
    if (config.meta) {
      const outfile = typeof config.meta === 'string' ? config.meta : config.meta.outfile
      const banner = typeof config.meta === 'string' ? undefined : config.meta.banner
      tasks.push({
        what: 'meta',
        outfile,
        banner,
        scopes,
        engine,
      })
    }
    tasks.push(...this.simpleCustomConfigToTasks({ config }))
    return tasks
  }

  static simpleServerConfigToTasks({
    config,
    scope,
  }: {
    config: FilesGeneratorSimpleServerConfig
    scope: string
  }): Array<FilesGeneratorTask> {
    const tasks: Array<FilesGeneratorTask> = []
    if (config.points) {
      const outfile = typeof config.points === 'string' ? config.points : config.points.outfile
      const banner = typeof config.points === 'string' ? undefined : config.points.banner
      tasks.push({
        what: 'serverPoints',
        outfile,
        banner,
        scope,
      })
    }
    tasks.push(...this.simpleCustomConfigToTasks({ config }))
    return tasks
  }

  static simpleClientConfigToTasks({
    config,
    scope,
  }: {
    config: FilesGeneratorSimpleClientConfig
    scope: string
  }): Array<FilesGeneratorTask> {
    const tasks: Array<FilesGeneratorTask> = []
    if (config.points) {
      const outfile = typeof config.points === 'string' ? config.points : config.points.outfile
      const banner = typeof config.points === 'string' ? undefined : config.points.banner
      const lazy = typeof config.points === 'string' ? undefined : config.points.lazy
      tasks.push({
        what: 'clientPoints',
        outfile,
        banner,
        scope,
        lazy,
      })
    }
    if (config.routes) {
      const outfile = typeof config.routes === 'string' ? config.routes : config.routes.outfile
      const banner = typeof config.routes === 'string' ? undefined : config.routes.banner
      const origin = typeof config.routes === 'string' ? undefined : config.routes.origin
      tasks.push({
        what: 'routes',
        outfile,
        banner,
        scope,
        origin,
      })
    }
    tasks.push(...this.simpleCustomConfigToTasks({ config }))
    return tasks
  }
}
