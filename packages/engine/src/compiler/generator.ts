import type { RoutesPretty } from '@devp0nt/route0'
import type { AsyncSubscription } from '@parcel/watcher'
import fg from 'fast-glob'
import { minimatch } from 'minimatch'
import * as nodeFs from 'node:fs/promises'
import * as nodePath from 'node:path'
import type { EngineLogger, EngineOptionsRoutes } from '../config.js'
import { getDirByPaths, resolveTempDirPath } from '../utils.js'
import { END_POINT_TYPES, Collector } from './collector.js'
import { CompilerPoint, type CompilerPointParsed, type CompilerPointParsedValid } from './point.js'

type ChangeCollectedPointsEvent = {
  deleted: CompilerPointParsed[]
  added: CompilerPointParsed[]
  points: CompilerPointParsed[]
  changed: boolean
  errors: unknown[]
}

export type FilesGeneratorOptions = {
  cwd: string
  glob: string | string[]
  targets: FilesGeneratorTargetOptions[]
  banner?: string
  logger?: EngineLogger
}

export type FilesGeneratorTargetOptions = {
  scope: string
  routesInstance?: RoutesPretty | null | EngineOptionsRoutes
  routesFile?: string | null
  pointsLazy?: string | null
  pointsReady?: string | null
  banner?: string | null
}

type FilesGeneratorTarget = {
  scope: string
  routesInstanceGetter: EngineOptionsRoutes | null
  routesInstance: RoutesPretty | null
  banner: string | null
  outputPointsLazyAbs: string | null
  outputPointsReadyAbs: string | null
  outputRoutesAbs: string | null
}

export type FilesGeneratorPointsFilesChangeWatcher = (
  fileEvent: 'update' | 'delete',
  fileAbs: string,
  pointsEvent: ChangeCollectedPointsEvent,
) => Promise<void> | void

export class FilesGenerator {
  readonly banner: string | undefined
  readonly globInclude: string[]
  readonly globExclude: string[]
  readonly cwd: string
  readonly tempDir: string
  readonly targets: FilesGeneratorTarget[]
  readonly routes: Record<string, RoutesPretty>
  private isRoutesInitialized = false
  readonly logger: EngineLogger

  readonly watchDir: string
  readonly watchIgnore: string[]
  readonly watchPatterns: string[]
  watchSubscription: AsyncSubscription | undefined
  pointsFilesChangeWatchersSubscription: AsyncSubscription | undefined

  readonly pointsFilesChangeWatchers: FilesGeneratorPointsFilesChangeWatcher[] = []

  private readonly files = new Set<string>()
  private readonly points: CompilerPointParsed[] = []
  private readonly pointsByPaths = new Map<string, CompilerPointParsed[]>()

  // Map<outputAbs, content>
  private readonly lastEmittedContentMap = new Map<string, string>()

  constructor(opts: FilesGeneratorOptions) {
    this.banner = opts.banner
    this.cwd = opts.cwd
    this.logger = opts.logger ?? {
      info: console.info.bind(console),
      error: console.error.bind(console),
      warn: console.warn.bind(console),
      debug: console.debug.bind(console),
    }
    const glob = Array.isArray(opts.glob) ? opts.glob : [opts.glob]
    this.globInclude = glob.filter((g) => !g.startsWith('!')).map((g) => nodePath.resolve(this.cwd, g))
    this.globExclude = glob.filter((g) => g.startsWith('!')).map((g) => nodePath.resolve(this.cwd, g.slice(1)))
    this.tempDir = resolveTempDirPath(['generator'])
    this.targets = opts.targets.map(
      (t) =>
        ({
          scope: t.scope,
          routesInstanceGetter: typeof t.routesInstance === 'function' ? t.routesInstance : null,
          routesInstance: typeof t.routesInstance === 'function' ? null : (t.routesInstance ?? null),
          banner: [this.banner, t.banner].filter(Boolean).join('\n') || null,
          outputPointsLazyAbs: t.pointsLazy ? nodePath.resolve(this.cwd, t.pointsLazy) : null,
          outputPointsReadyAbs: t.pointsReady ? nodePath.resolve(this.cwd, t.pointsReady) : null,
          outputRoutesAbs: t.routesFile ? nodePath.resolve(this.cwd, t.routesFile) : null,
        }) satisfies FilesGeneratorTarget,
    )
    this.routes = {}

    this.watchDir = this.globInclude.length > 0 ? getDirByPaths({ paths: this.globInclude }) : process.cwd()
    this.watchIgnore = [
      ...this.globExclude,
      ...this.targets.flatMap((t) => [t.outputPointsLazyAbs, t.outputPointsReadyAbs, t.outputRoutesAbs]),
    ].flatMap((p) => p || [])
    this.watchPatterns = [...this.globInclude]
  }

  static create(opts: FilesGeneratorOptions) {
    return new FilesGenerator(opts)
  }

  async sync(options?: { logOnNotWritten?: boolean }) {
    await this.collectFiles()
    const { errors, points, written } = await this.process()
    if (!options?.logOnNotWritten && !written) {
      return
    }
    const [loggerMethod, emoji] = errors.length > 0 ? ['warn' as const, '🟡'] : ['info' as const, '']
    this.logger[loggerMethod]([emoji, `${points.length} points processed`].filter(Boolean).join(' '))
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

  actualizePointsByPaths(): void {
    this.pointsByPaths.clear()
    for (const point of this.points) {
      const current = this.pointsByPaths.get(point.file.abs)
      if (current) {
        current.push(point)
      } else {
        this.pointsByPaths.set(point.file.abs, [point])
      }
    }
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

      return a.file.abs.localeCompare(b.file.abs)
    })
  }

  // processing

  // TODO: not chunk size, but max in same time processing files
  async process(chunkSize = 30): Promise<ChangeCollectedPointsEvent & { written: boolean }> {
    await this.initRoutesInstances()
    const files = [...this.files]
    const chunks = FilesGenerator.chunk(files, chunkSize)
    const collector = new Collector({ cwd: this.cwd, routes: this.routes })
    const collectedChunks = await Promise.all(
      chunks.map(async (chunk) => {
        const pointsArrays = await Promise.all(
          chunk.map(async (fileAbs) => await collector.collectPointsFromFile({ fileAbs })),
        )
        return pointsArrays.flat()
      }),
    )
    const errors = collectedChunks.flatMap((chunk) => chunk.flatMap((p) => p.errors))
    const collectedPoints = collectedChunks.flatMap((chunk) =>
      chunk.flatMap((p) => p.points.map((point) => point.parsed)),
    )
    const invalidPoints = collectedPoints.filter((p) => !p.valid)
    for (const point of invalidPoints) {
      const posStr = point.pos ? `${point.pos.file}:${point.pos.line}:${point.pos.column}` : 'unknown'
      const errorsMessages = point.errors.map((e) => (e instanceof Error ? e.message : String(e))).join('\n')
      const message = `${point.type}.${point.name} in ${posStr}\n${errorsMessages}`
      this.logger.error(message)
    }
    const prevPoints = [...this.points]
    const newPoints = collectedPoints.filter((p) => p.valid)
    const diff = FilesGenerator.getCollectedPointsDiff(prevPoints, newPoints)
    this.points.splice(0, this.points.length, ...newPoints)
    this.sortPoints()
    const { written } = diff.changed ? await this.writeOutputs() : { written: false }
    for (const error of errors) {
      this.logger.error(error instanceof Error ? error.message : String(error))
    }
    this.actualizePointsByPaths()
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
    // TODO: add helper to route0 to recognize object
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
    for (const target of this.targets) {
      if (target.routesInstanceGetter) {
        const result = await target.routesInstanceGetter()
        if (isRoutesObject(result)) {
          target.routesInstance = result
        } else if ('default' in result && isRoutesObject(result.default)) {
          target.routesInstance = result.default
        } else if ('routes' in result && isRoutesObject(result.routes)) {
          target.routesInstance = result.routes
        } else {
          throw new Error(`Invalid routes instance for target ${target.scope}`)
        }
        this.routes[target.scope] = target.routesInstance
      }
    }
    this.isRoutesInitialized = true
  }

  private async writeOutputs(): Promise<{ written: boolean }> {
    const written = await Promise.all(this.targets.map(async (target) => await this.writeTargetOutput(target))).then(
      (results) => results.some((r) => r.written),
    )
    return { written }
  }

  private async writeTargetOutput(target: FilesGeneratorTarget): Promise<{ written: boolean }> {
    const tasks = []
    if (target.outputPointsLazyAbs) {
      tasks.push({
        content: this.emitLazyPointsFile(target),
        outputAbs: target.outputPointsLazyAbs,
        tempOutputAbs: nodePath.join(this.tempDir, `${target.scope}.${crypto.randomUUID()}.lazy.ts`),
      })
    }
    if (target.outputPointsReadyAbs) {
      tasks.push({
        content: this.emitReadyPointsFile(target),
        outputAbs: target.outputPointsReadyAbs,
        tempOutputAbs: nodePath.join(this.tempDir, `${target.scope}.${crypto.randomUUID()}.ready.ts`),
      })
    }
    if (target.outputRoutesAbs) {
      tasks.push({
        content: this.emitRoutesPointsFile(target),
        outputAbs: target.outputRoutesAbs,
        tempOutputAbs: nodePath.join(this.tempDir, `${target.scope}.${crypto.randomUUID()}.routes.ts`),
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
  //   const results = await Promise.all(this.targets.map(async (target) => await this.isTargetOutputFilesExists(target)))
  //   return results.every((r) => r)
  // }

  // async isTargetOutputFilesExists(target: FilesGeneratorTarget): Promise<boolean> {
  //   if (!target.outputPointsLazyAbs && !target.outputPointsReadyAbs && !target.outputRoutesAbs) {
  //     return true
  //   }
  //   const promises: Array<Promise<boolean>> = []
  //   if (target.outputPointsLazyAbs) {
  //     promises.push(
  //       nodeFs
  //         .access(target.outputPointsLazyAbs)
  //         .then(() => true)
  //         .catch(() => false),
  //     )
  //   }
  //   if (target.outputPointsReadyAbs) {
  //     promises.push(
  //       nodeFs
  //         .access(target.outputPointsReadyAbs)
  //         .then(() => true)
  //         .catch(() => false),
  //     )
  //   }
  //   if (target.outputRoutesAbs) {
  //     promises.push(
  //       nodeFs
  //         .access(target.outputRoutesAbs)
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

  private emitNamedImports({
    points,
    outputAbs,
    target,
  }: {
    points: CompilerPointParsedValid[]
    outputAbs: string
    target: FilesGeneratorTarget
  }): {
    importLines: string[]
    importedPoints: Array<CompilerPointParsedValid & { index: number; renamedExportName: string }>
    // rootSingleReexportLine: string // for lazy points file
    rootSingleImportLine: string | null // for lazy points file
    hasNotRootPoints: boolean
  } {
    points = points.filter((p) => p.scope === target.scope)
    const importLines: string[] = []
    // let rootSingleReexportLine: string | undefined
    let rootSingleImportLine: string | null = null

    const importPathsAndExportNames: Array<{
      hasRoot: boolean
      importPath: string
      exports: Array<{ originalExportName: string; renamedExportName: string; root: boolean }>
    }> = []

    const importedPoints = points.map((point, index) => {
      const importPath = FilesGenerator.toRelativeJsImportPath(outputAbs, point.file.abs)
      const importPathAndExportNames = importPathsAndExportNames.find((p) => p.importPath === importPath)
      const renamedExportName =
        point.type === 'root'
          ? 'root'
          : point.exportName === 'default'
            ? `unnamed_${index}`
            : `${point.exportName}_${index}`
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
        ...point,
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
            `Root import path and export name not found for ${importPathAndExportNames.importPath} for target ${target.scope}`,
          )
        }
        rootSingleImportLine = `import { ${rootImportPathAndExportName.originalExportName} as ${rootImportPathAndExportName.renamedExportName} } from '${importPathAndExportNames.importPath}'`
      }
    }
    const hasNotRootPoints = importedPoints.some((p) => p.type !== 'root')
    return { importLines, importedPoints, rootSingleImportLine, hasNotRootPoints }
  }

  private emitLazyPointsFile(target: FilesGeneratorTarget): string {
    if (!target.outputPointsLazyAbs) {
      throw new Error('outputPointsLazyAbs is not set')
    }
    const points = this.points.filter((p) => p.scope === target.scope && p.valid) as CompilerPointParsedValid[]
    const lines: string[] = []
    if (target.banner) {
      lines.push(target.banner)
    }
    // lines.push(...this.emitSuperStoreInitialization())
    lines.push(`import type { LazyPointsCollectionRecord } from '@point0/core'`)
    // lines.push(`import { Point0 } from '@point0/core'`)

    if (!points.find((p) => p.type === 'root' && p.scope === target.scope)) {
      throw new Error(`Root point not found for target ${target.scope}`)
    }

    const { importedPoints, rootSingleImportLine } = this.emitNamedImports({
      points,
      outputAbs: target.outputPointsLazyAbs,
      target,
    })

    if (rootSingleImportLine) {
      lines.push(rootSingleImportLine)
    }
    lines.push(``)

    if (points.length === 0) {
      lines.push(`export {}`)
    } else {
      for (const point of importedPoints) {
        if (point.type === 'root') {
          lines.push(`export const _${point.renamedExportName} = root`)
          continue
        }
        lines.push(`export const _${point.renamedExportName} = {`)
        lines.push(`  type: '${point.type}',`)
        lines.push(`  name: '${point.name}',`)
        if (point.route) {
          lines.push(`  route: '${point.route.definition}',`)
        }
        if (point.type === 'page') {
          lines.push(`  polh: ${point.polh === true ? 'true' : point.polh === false ? 'false' : point.polh},`)
        }
        if (point.type === 'page' && point.layouts.length) {
          const arr = point.layouts
            .map((r) => `'${r}'`)
            .reverse()
            .join(', ')
          lines.push(`  layouts: [${arr}],`)
        }

        if (point.scope === target.scope) {
          lines.push(
            `  point: async () => (await import('${FilesGenerator.toRelativeJsImportPath(target.outputPointsLazyAbs, point.file.abs)}')).${point.exportName === 'default' ? 'default' : point.exportName},`,
          )
        } else {
          // it is attached
          lines.push(
            `  point: async () => root.point.attach((await import('${FilesGenerator.toRelativeJsImportPath(target.outputPointsLazyAbs, point.file.abs)}')).${point.exportName === 'default' ? 'default' : point.exportName}),`,
          )
        }
        lines.push(`} as LazyPointsCollectionRecord`)
        lines.push(``)
      }
    }

    lines.push(``)
    return lines.join('\n')
  }

  private emitReadyPointsFile(target: FilesGeneratorTarget): string {
    if (!target.outputPointsReadyAbs) {
      throw new Error('outputReadyAbs is not set')
    }

    const points = this.points.filter((p) => p.scope === target.scope && p.valid) as CompilerPointParsedValid[]

    if (!points.find((p) => p.type === 'root' && p.scope === target.scope)) {
      throw new Error(`Root point not found for target ${target.scope}`)
    }

    const lines: string[] = []
    if (target.banner) {
      lines.push(target.banner)
    }

    const { importLines, importedPoints, hasNotRootPoints } = this.emitNamedImports({
      points,
      outputAbs: target.outputPointsReadyAbs,
      target,
    })
    if (hasNotRootPoints) {
      lines.push(`import type { RawPointsCollectionRecord } from '@point0/core'`)
    }
    lines.push(...importLines)

    if (points.length === 0) {
      lines.push(`export {}`)
    } else {
      lines.push(``)
      for (const point of importedPoints) {
        if (point.type === 'root') {
          lines.push(`export const _${point.renamedExportName} = ${point.renamedExportName}`)
        } else {
          if (point.scope === target.scope) {
            lines.push(
              `export const _${point.renamedExportName} = ${point.renamedExportName} as RawPointsCollectionRecord`,
            )
          } else {
            // it is attached
            lines.push(
              `export const _${point.renamedExportName} = root.point.attach(${point.renamedExportName}) as RawPointsCollectionRecord`,
            )
          }
        }
        lines.push(``)
      }
    }

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

  private emitRoutesPointsFile(target: FilesGeneratorTarget): string {
    if (!target.outputRoutesAbs) {
      throw new Error('outputRoutesAbs is not set')
    }
    const points = this.points.filter((p) => p.scope === target.scope)
    const lines: string[] = []
    if (target.banner) {
      lines.push(target.banner)
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
    prevPoints: CompilerPointParsed[],
    newPoints: CompilerPointParsed[],
  ): {
    deleted: CompilerPointParsed[]
    added: CompilerPointParsed[]
    changed: boolean
  } {
    const deleted = prevPoints.filter((p) => !newPoints.some((cp) => CompilerPoint.isSameParsedPoints(p, cp)))
    const added = newPoints.filter((p) => !prevPoints.some((cp) => CompilerPoint.isSameParsedPoints(p, cp)))
    const changed = added.length > 0 || deleted.length > 0
    return { deleted, added, changed }
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

  getCollectedPointsRelatedToPath(path: string): CompilerPointParsed[] {
    const exactPoints = this.pointsByPaths.get(path)
    if (exactPoints) {
      return exactPoints
    }
    const pointsPaths = Array.from(this.pointsByPaths.keys())
    const result: CompilerPointParsed[] = []
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

  async watch() {
    const { subscribe } = await import('@parcel/watcher')
    const subscription = await subscribe(
      this.watchDir,
      async (err, events) => {
        if (err) {
          this.logger.error(`🔴 generator error: ${err.message}`)
          return
        }
        for (const event of events) {
          try {
            const targetAbs = nodePath.resolve(event.path)

            // glob match - check if the file matches any of our patterns
            const matched = this.watchPatterns.some((g) => {
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

            const suitable = isDelete
              ? this.isFileOrDirSuitableToFiles(targetAbs)
              : isCreateOrUpdate
                ? this.isFileSuitableToGlob(targetAbs)
                : false
            if (!suitable) {
              return
            }
            if (isDelete) {
              this.removeDirOrFile(targetAbs)
            } else {
              this.addOrUpdateFile(targetAbs)
            }
            const evt = await this.process()
            this.notifyCustomWatchers(isDelete ? 'delete' : 'update', targetAbs, evt)
            if (evt.changed) {
              if (evt.deleted.length > 0) {
                const deletedTypesAndNames = evt.deleted.map((p) => `${p.type}.${p.name}`).join(' ')
                this.logger.info(`➖ ${deletedTypesAndNames}`)
              }
              if (evt.added.length > 0) {
                const addedTypesAndNames = evt.added.map((p) => `${p.type}.${p.name}`).join(' ')
                this.logger.info(`➕ ${addedTypesAndNames}`)
              }
            }
          } catch (e) {
            this.logger.error(`🔴 ${(e as Error).message}`)
          }
        }
      },
      {
        ignore: this.watchIgnore,
      },
    )

    this.logger.info('generator watcher started')

    // Store subscription for potential cleanup
    this.watchSubscription = subscription
  }

  async stopWatch() {
    if (this.watchSubscription) {
      await this.watchSubscription.unsubscribe()
      this.watchSubscription = undefined
    }
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
