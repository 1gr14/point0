import type { Routes, RoutesPretty } from '@devp0nt/route0'
import type { AsyncSubscription } from '@parcel/watcher'
import type { PointsModuleType } from '@point0/core'
import fg from 'fast-glob'
import { minimatch } from 'minimatch'
import * as nodeFs from 'node:fs/promises'
import * as nodePath from 'node:path'
import { getDirByPaths, resolveTempDirPath } from './utils.js'
import { END_POINT_TYPES, Walker, type CollectedPoint } from './walker.js'

type ChangeCollectedPointsEvent = {
  deleted: CollectedPoint[]
  added: CollectedPoint[]
  points: CollectedPoint[]
  changed: boolean
  errors: unknown[]
}

export type FilesGeneratorOptions = {
  cwd: string
  glob: string | string[]
  targets: FilesGeneratorTargetOptions[]
  banner?: string
}

export type FilesGeneratorTargetOptions = {
  scope: string
  routes?: RoutesPretty | string | null
  points?: string | null
  pointsModuleType?: PointsModuleType
  banner?: string | null
}

type FilesGeneratorTarget = {
  scope: string
  routes: RoutesPretty | null
  banner: string | null
  pointsModuleType: PointsModuleType
  outputPointsAbs: string | null
  outputRoutesAbs: string | null
}

export class FilesGenerator {
  readonly banner: string | undefined
  readonly globInclude: string[]
  readonly globExclude: string[]
  readonly cwd: string
  readonly tempDir: string
  readonly targets: FilesGeneratorTarget[]
  readonly routes: Record<string, RoutesPretty>

  readonly watchDir: string
  readonly watchIgnore: string[]
  readonly watchPatterns: string[]
  watchSubscription: AsyncSubscription | undefined

  private readonly files = new Set<string>()
  private readonly points: CollectedPoint[] = []

  // Map<outputAbs, content>
  private readonly lastEmittedContentMap = new Map<string, string>()

  constructor(opts: FilesGeneratorOptions) {
    this.banner = opts.banner
    this.cwd = opts.cwd
    const glob = Array.isArray(opts.glob) ? opts.glob : [opts.glob]
    this.globInclude = glob.filter((g) => !g.startsWith('!')).map((g) => nodePath.resolve(this.cwd, g))
    this.globExclude = glob.filter((g) => g.startsWith('!')).map((g) => nodePath.resolve(this.cwd, g.slice(1)))
    this.tempDir = resolveTempDirPath(['generator'])
    this.targets = opts.targets.map(
      (t) =>
        ({
          scope: t.scope,
          routes: typeof t.routes === 'string' ? null : (t.routes ?? null),
          banner: [this.banner, t.banner].filter(Boolean).join('\n') || null,
          pointsModuleType: t.pointsModuleType ?? 'ready',
          outputPointsAbs: t.points ? nodePath.resolve(this.cwd, t.points) : null,
          outputRoutesAbs: typeof t.routes === 'string' ? nodePath.resolve(this.cwd, t.routes) : null,
        }) satisfies FilesGeneratorTarget,
    )
    this.routes = {}
    for (const target of this.targets) {
      if (typeof target.routes === 'object' && target.routes !== null) {
        this.routes[target.scope] = target.routes
      }
    }

    this.watchDir = this.globInclude.length > 0 ? getDirByPaths({ paths: this.globInclude }) : process.cwd()
    this.watchIgnore = [
      ...this.globExclude,
      ...this.targets.flatMap((t) => [t.outputPointsAbs, t.outputRoutesAbs]),
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
    const [consoleMethod, emoji] = errors.length > 0 ? ['warn' as const, '🟡'] : ['info' as const, '']
    console[consoleMethod]([emoji, `${points.length} points processed`].filter(Boolean).join(' '))
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
  async process(chunkSize = 30): Promise<ChangeCollectedPointsEvent & { written: boolean }> {
    const files = [...this.files]
    const chunks = FilesGenerator.chunk(files, chunkSize)
    const walker = new Walker({ cwd: this.cwd, routes: this.routes })
    const collectedChunks = await Promise.all(
      chunks.map(async (chunk) => {
        const pointsArrays = await Promise.all(
          chunk.map(async (fileAbs) => await walker.collectPointsFromFile({ fileAbs })),
        )
        return pointsArrays.flat()
      }),
    )
    const errors = collectedChunks.flatMap((chunk) => chunk.flatMap((p) => p.errors))
    const collectedPoints = collectedChunks.flatMap((chunk) => chunk.flatMap((p) => p.collectedPoints))
    const prevPoints = [...this.points]
    const newPoints =
      errors.length === 0 ? collectedPoints : FilesGenerator.mergePointsSafely(this.points, collectedPoints)
    const diff = FilesGenerator.getCollectedPointsDiff(prevPoints, newPoints)
    this.points.splice(0, this.points.length, ...newPoints)
    this.sortPoints()
    const { written } = diff.changed ? await this.writeOutputs() : { written: false }
    for (const error of errors) {
      console.error(error instanceof Error ? error.message : String(error))
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

  private async writeOutputs(): Promise<{ written: boolean }> {
    const written = await Promise.all(this.targets.map(async (target) => await this.writeTargetOutput(target))).then(
      (results) => results.some((r) => r.written),
    )
    return { written }
  }

  private async writeTargetOutput(target: FilesGeneratorTarget): Promise<{ written: boolean }> {
    const tasks = []
    if (target.outputPointsAbs && target.pointsModuleType === 'lazy') {
      tasks.push({
        content: this.emitLazyPointsFile(target),
        outputAbs: target.outputPointsAbs,
        tempOutputAbs: nodePath.join(this.tempDir, `${target.scope}.lazy.ts`),
      })
    }
    if (target.outputPointsAbs && target.pointsModuleType === 'ready') {
      tasks.push({
        content: this.emitReadyPointsFile(target),
        outputAbs: target.outputPointsAbs,
        tempOutputAbs: nodePath.join(this.tempDir, `${target.scope}.ready.ts`),
      })
    }
    if (target.outputRoutesAbs) {
      tasks.push({
        content: this.emitRoutesPointsFile(target),
        outputAbs: target.outputRoutesAbs,
        tempOutputAbs: nodePath.join(this.tempDir, `${target.scope}.routes.ts`),
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

  async isOutputFilesExists(): Promise<boolean> {
    const results = await Promise.all(this.targets.map(async (target) => await this.isTargetOutputFilesExists(target)))
    return results.every((r) => r)
  }

  async isTargetOutputFilesExists(target: FilesGeneratorTarget): Promise<boolean> {
    if (!target.outputPointsAbs && !target.outputRoutesAbs) {
      return true
    }
    const promises: Array<Promise<boolean>> = []
    if (target.outputPointsAbs) {
      promises.push(
        nodeFs
          .access(target.outputPointsAbs)
          .then(() => true)
          .catch(() => false),
      )
    }
    if (target.outputRoutesAbs) {
      promises.push(
        nodeFs
          .access(target.outputRoutesAbs)
          .then(() => true)
          .catch(() => false),
      )
    }
    const results = await Promise.all(promises)
    return results.every((r) => r)
  }

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
    points: CollectedPoint[]
    outputAbs: string
    target: FilesGeneratorTarget
  }): {
    importLines: string[]
    importedPoints: Array<CollectedPoint & { hash: string; renamedExportName: string }>
    // rootSingleReexportLine: string // for lazy points file
    rootSingleImportLine: string | null // for lazy points file
  } {
    points = points.filter(
      (p) => p.scope === target.scope || (p.attachedTo.includes(target.scope) && p.type !== 'root'),
    )
    const importLines: string[] = []
    // let rootSingleReexportLine: string | undefined
    let rootSingleImportLine: string | null = null

    const importPathsAndExportNames: Array<{
      hasRoot: boolean
      importPath: string
      exports: Array<{ originalExportName: string; renamedExportName: string; root: boolean }>
    }> = []

    const importedPoints = points.map((point) => {
      const importPath = FilesGenerator.toRelativeJsImportPath(outputAbs, point.fileAbs)
      const importPathAndExportNames = importPathsAndExportNames.find((p) => p.importPath === importPath)
      const hash = FilesGenerator.hash(point)
      const renamedExportName =
        point.type === 'root'
          ? 'root'
          : point.exportName === 'default'
            ? `unnamed_${hash}`
            : `${point.exportName}_${hash}`
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
        hash,
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
    return { importLines, importedPoints, rootSingleImportLine }
  }

  private emitLazyPointsFile(target: FilesGeneratorTarget): string {
    if (!target.outputPointsAbs) {
      throw new Error('outputPointsAbs is not set')
    }
    if (target.pointsModuleType !== 'lazy') {
      throw new Error('pointsModuleType is not lazy')
    }
    const points = this.points.filter(
      (p) => p.scope === target.scope || (p.attachedTo.includes(target.scope) && p.type !== 'root'),
    )
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
      outputAbs: target.outputPointsAbs,
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
        lines.push(`export const ${point.renamedExportName}_lazy = {`)
        lines.push(`  type: '${point.type}'${point.type === 'root' ? ' as const' : ''},`)
        lines.push(`  name: '${point.name}',`)
        if (point.route) {
          lines.push(`  route: '${point.route.definition}',`)
        }
        if (point.type === 'page') {
          lines.push(`  shouldBePrefetchedOnLinkHover: ${point.shouldBePrefetchedOnLinkHover ? 'true' : 'false'},`)
        }
        if (point.type === 'page' && point.layouts?.length) {
          const arr = point.layouts
            .map((r) => `'${r}'`)
            .reverse()
            .join(', ')
          lines.push(`  layouts: [${arr}],`)
        }
        // const exportNameSuffix = point.type === 'component' ? '.point' : ''
        const exportNameSuffix = '.point'
        if (point.type === 'root') {
          lines.push(`  point: root.point,`)

          lines.push(`}`)
        } else {
          // idk how made hmr work nice inside page and component
          // if (point.type === 'page' || point.type === 'component') {
          //   if (point.scope === target.scope) {
          //     lines.push(
          //       `  point: async () => (await import('${FilesGenerator.toRelativeJsImportPath(target.outputPointsAbs, point.fileAbs)}?' + Math.random()).then((m) => Point0.getGlobalPoint('${point.scope}', '${point.type}', '${point.name}'))),`,
          //     )
          //   } else {
          //     // it is attached
          //     lines.push(
          //       `  point: async () => root.point.attach((await import('${FilesGenerator.toRelativeJsImportPath(target.outputPointsAbs, point.fileAbs)}?' + Math.random()).then((m) => Point0.getGlobalPoint('${point.scope}', '${point.type}', '${point.name}')))),`,
          //     )
          //   }
          // } else {
          //   if (point.scope === target.scope) {
          //     lines.push(
          //       `  point: async () => (await import('${FilesGenerator.toRelativeJsImportPath(target.outputPointsAbs, point.fileAbs)}?' + Math.random()).then((m) => m.${point.exportName === 'default' ? 'default' : point.exportName}${exportNameSuffix})),`,
          //     )
          //   } else {
          //     // it is attached
          //     lines.push(
          //       `  point: async () => root.point.attach((await import('${FilesGenerator.toRelativeJsImportPath(target.outputPointsAbs, point.fileAbs)}?' + Math.random()).then((m) => m.${point.exportName === 'default' ? 'default' : point.exportName}${exportNameSuffix}))),`,
          //     )
          //   }
          // }
          if (point.scope === target.scope) {
            lines.push(
              `  point: async () => (await import('${FilesGenerator.toRelativeJsImportPath(target.outputPointsAbs, point.fileAbs)}')).${point.exportName === 'default' ? 'default' : point.exportName}${exportNameSuffix},`,
            )
          } else {
            // it is attached
            lines.push(
              `  point: async () => root.point.attach((await import('${FilesGenerator.toRelativeJsImportPath(target.outputPointsAbs, point.fileAbs)}')).${point.exportName === 'default' ? 'default' : point.exportName}${exportNameSuffix}),`,
            )
          }
          lines.push(`} as LazyPointsCollectionRecord`)
        }
        lines.push(``)
      }
    }

    lines.push(``)
    return lines.join('\n')
  }

  private emitReadyPointsFile(target: FilesGeneratorTarget): string {
    if (!target.outputPointsAbs) {
      throw new Error('outputReadyAbs is not set')
    }
    if (target.pointsModuleType !== 'ready') {
      throw new Error('pointsModuleType is not ready')
    }

    const points = this.points.filter(
      (p) => p.scope === target.scope || (p.attachedTo.includes(target.scope) && p.type !== 'root'),
    )

    if (!points.find((p) => p.type === 'root' && p.scope === target.scope)) {
      throw new Error(`Root point not found for target ${target.scope}`)
    }

    const lines: string[] = []
    if (target.banner) {
      lines.push(target.banner)
    }
    lines.push(`import type { EndPoint } from '@point0/core'`)

    // lines.push(...this.emitSuperStoreInitialization())

    const { importLines, importedPoints } = this.emitNamedImports({
      points,
      outputAbs: target.outputPointsAbs,
      target,
    })
    lines.push(...importLines)

    if (points.length === 0) {
      lines.push(`export {}`)
    } else {
      lines.push(``)
      for (const point of importedPoints) {
        const exportNameSuffix = '.point'
        if (point.type === 'root') {
          lines.push(`export const ${point.renamedExportName}_ready = ${point.renamedExportName}${exportNameSuffix}`)
        } else {
          if (point.scope === target.scope) {
            lines.push(
              `export const ${point.renamedExportName}_ready = ${point.renamedExportName}${exportNameSuffix} as EndPoint`,
            )
          } else {
            // it is attached
            lines.push(
              `export const ${point.renamedExportName}_ready = root.point.attach(${point.renamedExportName}${exportNameSuffix}) as EndPoint`,
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
  //     const suffix = p.type === 'page' ? '.point._Page' : '.point._Layout'
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
    prevPoints: CollectedPoint[],
    newPoints: CollectedPoint[],
  ): {
    deleted: CollectedPoint[]
    added: CollectedPoint[]
    changed: boolean
  } {
    const deleted = prevPoints.filter((p) => !newPoints.some((cp) => FilesGenerator.isSameCollectedPoint(p, cp)))
    const added = newPoints.filter((p) => !prevPoints.some((cp) => FilesGenerator.isSameCollectedPoint(p, cp)))
    const changed = added.length > 0 || deleted.length > 0
    return { deleted, added, changed }
  }

  // if was error, we only want to replace conflicted and add new, and do not remove old points
  private static mergePointsSafely(prevPoints: CollectedPoint[], newPoints: CollectedPoint[]): CollectedPoint[] {
    const result = [...prevPoints]
    for (const newPoint of newPoints) {
      const prevConflictedPointIndex = result.findIndex((p) =>
        FilesGenerator.isSameNameAndTypeAndScopeCollectedPoint(p, newPoint),
      )
      if (prevConflictedPointIndex !== -1) {
        result[prevConflictedPointIndex] = newPoint
        continue
      }
      const prevPointIndex = result.findIndex((p) => FilesGenerator.isSameCollectedPoint(p, newPoint))
      if (prevPointIndex === -1) {
        result.push(newPoint)
        continue
      }
    }
    return result
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
    return FilesGenerator.cyrb53(s, seed).toString(36) // short, URL/file-safe
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

  private static isSameNameAndTypeAndScopeCollectedPoint(a: CollectedPoint, b: CollectedPoint): boolean {
    return a.scope === b.scope && a.name === b.name && a.type === b.type
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

  async watch() {
    const { subscribe } = await import('@parcel/watcher')
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
          } catch (e) {
            console.error(`🔴 ${(e as Error).message}`)
          }
        }
      },
      {
        ignore: this.watchIgnore,
      },
    )

    console.info('generator watcher started')

    // Store subscription for potential cleanup
    this.watchSubscription = subscription
  }
}
