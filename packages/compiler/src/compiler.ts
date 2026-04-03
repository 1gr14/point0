import type { GeneratorResult } from '@babel/generator'
import type { RoutesPretty } from '@devp0nt/route0'
import { normalNodeEnvs, type EnvOsName, type EnvRuntimeName, type NormalizedNodeEnv } from '@point0/core'
import type { CompilerFile } from './file.js'
import {
  createVirtualModuleCode,
  virtualModulePathRegex,
  type ImporterOptionsInput,
  type ImporterOptionsParsed,
} from './importer.js'
import { parseImporterOptions } from './importer.js'
import { CompilerPoint } from './point.js'
import { parseVirtualModulePath, resolveTempDirPath } from './index.js'
import { Walker } from './walker.js'
import nodePath from 'node:path'
import { CriticalCompilerError } from './error.js'

export class Compiler {
  filter: RegExp
  scope: string | false
  built: boolean
  mode: NormalizedNodeEnv | false
  runtime: EnvRuntimeName | false
  os: EnvOsName | false
  side: 'client' | 'server' | false
  consts: CompilerEnvConsts | undefined
  hmrFix: boolean
  walker: Walker
  routes: Record<string, RoutesPretty> | undefined
  ssr: boolean
  importer: ImporterOptionsParsed
  tempDir: string | undefined

  /*
   * Match JS/TS and markdown-ish source files while excluding virtual/shim
   * module IDs and node_modules (except point0 packages).
   *
   * ^                                     -> anchor at start
   * (?!.*(?:shim:|virtual:))              -> reject IDs containing "shim:" or "virtual:"
   * (?!.*node_modules\/(?!.*point0))      -> reject node_modules paths unless they include "point0"
   * .*\.                                  -> consume path up to final "."
   * (?:[cm]?[jt]sx?|md|mdx|mdc)           -> allow JS/TS variants and md/mdx/mdc
   * $                                     -> anchor at end
   */
  static defaultFilter = /^(?!.*(?:shim:|virtual:))(?!.*node_modules\/(?!.*point0)).*\.(?:[cm]?[jt]sx?|md|mdx|mdc)$/

  constructor({
    filter,
    side,
    scope,
    consts,
    hmrFix,
    walker,
    routes,
    built,
    mode,
    runtime,
    os,
    ssr,
    importer,
  }: {
    filter: RegExp
    side: 'client' | 'server' | false
    scope: string | false
    consts: CompilerEnvConsts | undefined
    hmrFix: boolean
    walker: Walker
    routes: Record<string, RoutesPretty> | undefined
    built: boolean
    mode: NormalizedNodeEnv | false
    runtime: EnvRuntimeName | false
    os: EnvOsName | false
    ssr: boolean
    importer: ImporterOptionsParsed
  }) {
    this.filter = filter
    this.side = side
    this.scope = scope
    this.consts = consts
    this.hmrFix = hmrFix
    this.walker = walker
    this.routes = routes
    this.built = built
    this.mode = mode
    this.runtime = runtime
    this.os = os
    this.ssr = ssr
    this.importer = importer
  }

  static create(options: CompilerOptions) {
    const {
      filter,
      side,
      scope,
      consts,
      hmrFix,
      routes,
      built,
      mode = process.env.NODE_ENV,
      runtime = false,
      os = false,
      ssr = false,
      importer: providedImporter,
    } = options
    if (mode !== false && (!mode || !normalNodeEnvs.includes(mode as NormalizedNodeEnv))) {
      throw new Error(`Invalid mode (NODE_ENV): "${mode}". Allowed values: production, development, test`)
    }
    return new Compiler({
      filter: filter ?? Compiler.defaultFilter,
      side,
      scope,
      consts,
      hmrFix: hmrFix ?? true,
      walker: new Walker({ routes, ssr }),
      routes,
      built: built ?? false,
      mode: mode as NormalizedNodeEnv | false,
      runtime,
      os,
      ssr,
      importer: parseImporterOptions(providedImporter ?? {}),
    })
  }

  compile({
    content,
    file,
    tryIndex = 0,
    map: sourceMaps = false,
    pruneWalker = !this.built,
    hmrFix = this.hmrFix,
    pruneWalkerPoints,
    pruneWalkerFiles,
    writeVirtual,
  }: {
    content?: string
    file: string
    tryIndex?: number
    map?: boolean
    hmrFix?: boolean
    pruneWalker?: boolean
    pruneWalkerPoints?: boolean
    pruneWalkerFiles?: boolean
    writeVirtual?: boolean
  }): {
    file: CompilerFile<true> | undefined
    code: string
    map: GeneratorResult['map']
    points: CompilerPoint[]
    errors: unknown[]
    modified: boolean
    tryIndex: number
  } {
    if (writeVirtual && !this.tempDir) {
      this.tempDir = resolveTempDirPath(['compiler-bun-plugin'])
    }
    pruneWalkerPoints = pruneWalkerPoints !== undefined ? pruneWalkerPoints : pruneWalker
    pruneWalkerFiles = pruneWalkerFiles !== undefined ? pruneWalkerFiles : pruneWalker
    if (virtualModulePathRegex.test(file)) {
      const virtualOptions = parseVirtualModulePath(file)
      const { code, error } = createVirtualModuleCode(virtualOptions)
      if (error) {
        if (this.importer.onDeny === 'throw') {
          throw new CriticalCompilerError(error)
        } else {
          console.error(error)
        }
      }
      return {
        file: undefined,
        code,
        map: null,
        points: [],
        errors: [],
        modified: true,
        tryIndex,
      }
    }

    file = file.split('?', 1)[0]
    if (pruneWalkerPoints) {
      this.walker.prunePoints()
    }
    if (pruneWalkerFiles) {
      this.walker.pruneFiles()
    }
    const side = this.side
    const scope = this.scope
    const consts = this.consts
    // const hmrFix = this.hmrFix // now provided in props
    const built = this.built
    const mode = this.mode
    const runtime = this.runtime
    const os = this.os
    const ssr = this.ssr
    const errors: unknown[] = []
    const collectResult = this.walker.collectPointsFromFile({ file, content })
    errors.push(...collectResult.errors)
    if (!collectResult.ok) {
      return {
        file: collectResult.file,
        code: content || '',
        map: null,
        points: collectResult.points,
        errors,
        modified: false,
        tryIndex,
      }
    }
    const cf = collectResult.file
    for (const point of collectResult.points) {
      if (side) {
        point.shakeMethods({ side })
      }
      if (hmrFix) {
        point.addHmrFix()
      }
    }
    cf.shakeForEnv({ side, scope, consts, built, mode, runtime, os, ssr })
    if (built) {
      cf.shakeForBuiltEngine()
    }
    const optimizeResult = cf.optimizeGuardedExpressions()
    errors.push(...optimizeResult.errors)
    if (side) {
      cf.applyImporter({
        importer: this.importer,
        scope: scope || undefined,
        side,
        writeVirtual: writeVirtual ? this.tempDir : false,
        compiler: this,
      })
    }
    const isSomeStale = CompilerPoint.isSomeStale(collectResult.points)
    if (isSomeStale) {
      if (tryIndex >= 10) {
        throw new CriticalCompilerError('Too many tries to compile file. Looks like it is endless loop of changes.')
      }
      return this.compile({
        content,
        file,
        tryIndex: tryIndex + 1,
        map: sourceMaps,
        // pruneWalkerPoints: false,
        // pruneWalkerFiles: false,
      })
    }
    const { code, map } = (() => {
      if (cf.modified) {
        return cf.toCode({ map: sourceMaps })
      }
      return { code: cf.content, map: null }
    })()
    return {
      file: cf,
      code: code,
      map: map,
      points: collectResult.points,
      errors,
      modified: cf.modified,
      tryIndex,
    }
  }

  private traceByMemory({
    target,
    includeTarget,
    cwd,
  }: {
    target: string | CompilerFile<any>
    includeTarget: boolean
    cwd?: string
  }): ImportsTraceResult {
    const normalizePath = (value: string): string => value.split('?', 1)[0] as string
    const targetInput = typeof target === 'string' ? target : target.abs
    const targetPath = normalizePath(targetInput)
    const files = [...this.walker.files.values()]

    const formatTrace = (startPath: string, items: ImportsTraceResult['items']): string[] => {
      if (items.length === 0) {
        return []
      }
      const trace: string[] = []
      const startIndex = includeTarget ? 0 : 1
      for (let i = startIndex; i <= items.length; i++) {
        const currentPath = i === 0 ? startPath : (items[i - 1] as ImportsTraceResult['items'][number]).importer
        const line = i === 0 ? 0 : (items[i - 1] as ImportsTraceResult['items'][number]).line
        const column = i === 0 ? 0 : (items[i - 1] as ImportsTraceResult['items'][number]).column
        const prettyCurrentPath = cwd ? nodePath.relative(cwd, currentPath) : currentPath
        trace.push(`${prettyCurrentPath}:${line}:${column}`)
      }
      return trace
    }

    const isImportMatch = ({
      importPathOriginal,
      importPathResolved,
      target,
    }: {
      importPathOriginal: string
      importPathResolved: string
      target: string
    }): boolean => {
      const targetNormalized = normalizePath(target)
      return (
        importPathOriginal === target ||
        importPathResolved === target ||
        normalizePath(importPathOriginal) === targetNormalized ||
        normalizePath(importPathResolved) === targetNormalized
      )
    }

    const collectImportersByResolvedPath = (path: string): ImportsTraceResult['items'] => {
      const importers: ImportsTraceResult['items'] = []
      for (const file of files) {
        for (const importItem of file.imports) {
          if (
            !isImportMatch({
              importPathOriginal: importItem.pathOriginal,
              importPathResolved: importItem.pathResolved,
              target: path,
            })
          ) {
            continue
          }
          importers.push({
            importer: file.abs,
            pathOriginal: importItem.pathOriginal,
            pathResolved: importItem.pathResolved,
            line: importItem.loc.line,
            column: importItem.loc.column,
          })
        }
      }
      return importers
    }

    const walkDeepest = ({
      currentPath,
      currentItems,
      visited,
    }: {
      currentPath: string
      currentItems: ImportsTraceResult['items']
      visited: Set<string>
    }): ImportsTraceResult['items'] => {
      const importers = collectImportersByResolvedPath(currentPath)
      let best = currentItems
      for (const importer of importers) {
        if (visited.has(importer.importer)) {
          continue
        }
        const nextVisited = new Set(visited)
        nextVisited.add(importer.importer)
        const candidate = walkDeepest({
          currentPath: importer.importer,
          currentItems: [...currentItems, importer],
          visited: nextVisited,
        })
        if (candidate.length > best.length) {
          best = candidate
        }
      }
      return best
    }

    const items = walkDeepest({
      currentPath: targetPath,
      currentItems: [],
      visited: new Set([targetPath]),
    })
    const found = items.length > 0
    const trace = formatTrace(targetPath, items)
    return { items, trace, files, found }
  }

  private traceByCompiling({
    target,
    source,
    cwd,
    includeTarget,
  }: {
    target: string | CompilerFile<any>
    source: string | CompilerFile<any>
    cwd?: string
    includeTarget: boolean
  }): ImportsTraceResult {
    const normalizePath = (value: string): string => value.split('?', 1)[0] as string
    const targetInput = typeof target === 'string' ? target : target.abs
    const sourceInput = typeof source === 'string' ? source : source.abs
    const targetPath = normalizePath(targetInput)
    const sourcePath = normalizePath(sourceInput)

    const isImportMatch = ({
      importPathOriginal,
      importPathResolved,
      target,
    }: {
      importPathOriginal: string
      importPathResolved: string
      target: string
    }): boolean => {
      const targetNormalized = normalizePath(target)
      return (
        importPathOriginal === target ||
        importPathResolved === target ||
        normalizePath(importPathOriginal) === targetNormalized ||
        normalizePath(importPathResolved) === targetNormalized
      )
    }

    const formatTrace = (startPath: string, items: ImportsTraceResult['items']): string[] => {
      if (items.length === 0) {
        return []
      }
      const trace: string[] = []
      const startIndex = includeTarget ? 0 : 1
      for (let i = startIndex; i <= items.length; i++) {
        const currentPath = i === 0 ? startPath : (items[i - 1] as ImportsTraceResult['items'][number]).importer
        const line = i === 0 ? 0 : (items[i - 1] as ImportsTraceResult['items'][number]).line
        const column = i === 0 ? 0 : (items[i - 1] as ImportsTraceResult['items'][number]).column
        const prettyCurrentPath = cwd ? nodePath.relative(cwd, currentPath) : currentPath
        trace.push(`${prettyCurrentPath}:${line}:${column}`)
      }
      return trace
    }

    const visited = new Set<string>()
    const walk = ({
      currentPath,
      currentItems,
    }: {
      currentPath: string
      currentItems: ImportsTraceResult['items']
    }): ImportsTraceResult['items'] | undefined => {
      if (normalizePath(currentPath) === targetPath) {
        return currentItems
      }
      if (visited.has(currentPath)) {
        return undefined
      }
      visited.add(currentPath)

      try {
        const result = this.compile({
          file: currentPath,
          pruneWalker: false,
        })
        const file = result.file
        if (!file) {
          return undefined
        }

        for (const importItem of file.imports) {
          const nextPath = normalizePath(importItem.pathResolved)
          const isTarget = isImportMatch({
            importPathOriginal: importItem.pathOriginal,
            importPathResolved: importItem.pathResolved,
            target: targetInput,
          })
          const shouldFollow = isTarget || this.filter.test(nextPath)
          if (!shouldFollow) {
            continue
          }
          const nextItems = [
            ...currentItems,
            {
              importer: currentPath,
              pathOriginal: importItem.pathOriginal,
              pathResolved: importItem.pathResolved,
              line: importItem.loc.line,
              column: importItem.loc.column,
            },
          ]
          if (isTarget) {
            return nextItems
          }
          const foundItems = walk({ currentPath: nextPath, currentItems: nextItems })
          if (foundItems) {
            return foundItems
          }
        }
      } catch {}

      return undefined
    }

    const forwardItems = walk({ currentPath: sourcePath, currentItems: [] }) ?? []
    const found = normalizePath(sourcePath) === targetPath || forwardItems.length > 0
    const items = [...forwardItems].reverse()
    const trace = found ? formatTrace(targetPath, items) : []
    const files = [...this.walker.files.values()]
    return { items, trace, files, found }
  }

  trace({
    target,
    policy,
    source,
    cwd,
    includeTarget = false,
    pruneWalker = false,
  }: {
    target: string | CompilerFile<any>
    policy: 'memory' | 'compiling'
    source?: string | CompilerFile<any> | false
    cwd?: string
    includeTarget?: boolean
    pruneWalker?: boolean
  }): ImportsTraceResult {
    if (pruneWalker) {
      this.walker.prunePoints()
      this.walker.pruneFiles()
    }

    if (policy === 'compiling') {
      if (!source) {
        throw new Error('To create trace by compiling policy, "source" is required')
      }
      if (typeof source === 'string' && !nodePath.isAbsolute(source)) {
        throw new Error('To create trace by compiling policy, "source" must be an absolute path')
      }
      return this.traceByCompiling({ target, source, includeTarget, cwd })
    }

    return this.traceByMemory({ target, includeTarget, cwd })
  }
}

export type ImportsTraceResult = {
  items: Array<{
    importer: string
    pathOriginal: string
    pathResolved: string
    line: number
    column: number
  }>
  // array of stings lile ["/path/to/file.ts:10:20" (to file), "/path/to/file.ts:10:20", "/path/to/file.ts:10:20" (from file)]
  trace: string[]
  files: CompilerFile<any>[]
  found: boolean
}

export type CompilerOptions = {
  routes?: Record<string, RoutesPretty> | undefined
  mode?: NormalizedNodeEnv | false
  runtime?: EnvRuntimeName | false
  os?: EnvOsName | false
  side: 'client' | 'server' | false
  scope: string | false
  built?: boolean
  consts?: CompilerEnvConsts
  filter?: RegExp
  hmrFix?: boolean
  ssr?: boolean
  importer?: ImporterOptionsInput | undefined
}
export type CompilerEnvConstsObject = { [key: string]: string | number | boolean | null | undefined }
export type CompilerEnvConstsString = string
export type CompilerEnvConstsItem = CompilerEnvConstsString | CompilerEnvConstsObject
export type CompilerEnvConsts = CompilerEnvConstsItem[] | CompilerEnvConstsString | CompilerEnvConstsObject | undefined
export type CompilerEnvConstsNormalized = Array<CompilerEnvConstsString | CompilerEnvConstsObject>
