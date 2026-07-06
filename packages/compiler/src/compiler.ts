import type { PluginItem } from '@babel/core'
import type { GeneratorResult } from '@babel/generator'
import type { RoutesPretty } from '@1gr14/route0'
import type { CompileOptions as MdxCompileOptions } from '@mdx-js/mdx'
import { log, normalNodeEnvs, type EnvOsName, type EnvRuntimeName, type NormalizedNodeEnv } from '@point0/core'
import { CompilerFile } from './file.js'
import {
  createVirtualModuleCode,
  virtualModulePathRegex,
  type ImporterOptionsInput,
  type ImporterOptionsParsed,
} from './importer.js'
import { parseImporterOptions } from './importer.js'
import { CompilerPoint } from './point.js'
import { getHash, parseVirtualModulePath, resolveTempDirPath } from './index.js'
import { Walker } from './walker.js'
import nodePath from 'node:path'
import { createRequire } from 'node:module'
import { CriticalCompilerError } from './error.js'
import { stringify } from 'safe-stable-stringify'
import { normalizeEnvConsts } from './utils.js'
import type { CompilerAssetsOptions } from './assets.js'

const requireFromCompiler = createRequire(import.meta.url)

function resolvePluginRef(ref: unknown): unknown {
  if (typeof ref === 'string') {
    const mod = requireFromCompiler(ref) as { default?: unknown }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return mod?.default ?? mod
  }
  if (Array.isArray(ref) && typeof ref[0] === 'string') {
    const mod = requireFromCompiler(ref[0]) as { default?: unknown }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return [mod?.default ?? mod, ...ref.slice(1)]
  }
  return ref
}

function resolvePluginList<T>(list: T[] | undefined): T[] | undefined {
  if (!list) return list
  return list.map((item) => resolvePluginRef(item) as T)
}

// Detects entries that name the React Compiler babel plugin.
// Matches the canonical package name and the babel short-name form.
const REACT_COMPILER_PLUGIN_NAMES = new Set(['babel-plugin-react-compiler', 'react-compiler'])
function isReactCompilerPluginRef(ref: unknown): boolean {
  if (typeof ref === 'string') {
    return REACT_COMPILER_PLUGIN_NAMES.has(ref)
  }
  if (Array.isArray(ref) && typeof ref[0] === 'string') {
    return REACT_COMPILER_PLUGIN_NAMES.has(ref[0])
  }
  return false
}
function getReactCompilerOptionsFromRef(ref: unknown): Record<string, unknown> | undefined {
  if (Array.isArray(ref) && typeof ref[1] === 'object' && ref[1] !== null) {
    return ref[1] as Record<string, unknown>
  }
  return undefined
}

export type ChainCallbackUseMemoDecision = {
  inject: boolean
  // When true, the react-compiler plugin entry is dropped from the babel list
  // because the user runs it elsewhere (e.g. via Vite) and only wants point0
  // to mark chain callbacks with the directive.
  stripReactCompiler: boolean
}

// Decide whether to inject `"use memo"` directives into point0 chain callbacks
// (page/layout/component/provider/wrapper), based on what's in user babel config.
//
// Trigger: presence of `babel-plugin-react-compiler` in the babel list.
// Behavior driven by its `compilationMode`:
//   'infer' | 'syntax' | unset  → keep plugin, inject directive
//   'all'                       → keep plugin, no directive (plugin compiles everything anyway)
//   'point0' | 'Point0' (sentinel) → strip plugin, inject directive
function decideChainCallbackUseMemo(plugins: PluginItem[]): {
  decision: ChainCallbackUseMemoDecision
  filteredPlugins: PluginItem[]
} {
  let inject = false
  let stripReactCompiler = false
  const filteredPlugins: PluginItem[] = []
  for (const plugin of plugins) {
    if (!isReactCompilerPluginRef(plugin)) {
      filteredPlugins.push(plugin)
      continue
    }
    const opts = getReactCompilerOptionsFromRef(plugin)
    const compilationMode = opts?.compilationMode
    const normalizedMode = typeof compilationMode === 'string' ? compilationMode.toLowerCase() : undefined
    if (normalizedMode === 'point0') {
      inject = true
      stripReactCompiler = true
      // Drop the plugin entry — user runs the real react-compiler elsewhere.
      continue
    }
    if (normalizedMode === 'all') {
      // Plugin will compile everything; the directive is redundant.
      filteredPlugins.push(plugin)
      continue
    }
    // infer / syntax / undefined: keep the plugin AND inject the directive so
    // chain callbacks (which don't look like top-level components) get compiled.
    inject = true
    filteredPlugins.push(plugin)
  }
  return { decision: { inject, stripReactCompiler }, filteredPlugins }
}

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
  cache: boolean
  importer: ImporterOptionsParsed
  virtualDir: string | undefined
  processEnvAliases: string[]
  markdown: MdxCompileOptions
  babel: { plugins: PluginItem[]; presets: PluginItem[] }
  assets: CompilerAssetsOptions | false
  chainCallbackUseMemo: boolean
  /*
   * Match JS/TS and markdown-ish source files while excluding virtual/shim
   * module IDs and node_modules (except point0 packages).
   *
   * ^                                     -> anchor at start
   * (?!.*(?:shim:|virtual:))              -> reject IDs containing "shim:" or "virtual:"
   * (?!.*node_modules[\\/](?!.*point0))   -> reject node_modules paths unless they include "point0" (either separator,
   *                                          since Bun/Vite hand the plugin native `\` paths on Windows)
   * .*\.                                  -> consume path up to final "."
   * (?:[cm]?[jt]sx?|md|mdx|mdc)           -> allow JS/TS variants and md/mdx/mdc
   * $                                     -> anchor at end
   */
  static defaultFilter = /^(?!.*(?:shim:|virtual:))(?!.*node_modules[\\/](?!.*point0)).*\.(?:[cm]?[jt]sx?|md|mdx|mdc)$/

  static buildMarkdownOptions({
    built,
    markdown,
  }: {
    built: boolean
    markdown: CompilerMarkdownOptions | undefined
  }): MdxCompileOptions {
    const defaults = CompilerFile.getDefaultMarkdownOptions()
    const user = markdown ?? {}
    return {
      ...defaults,
      ...user,
      development: !built,
      remarkPlugins: resolvePluginList([...(defaults.remarkPlugins ?? []), ...(user.remarkPlugins ?? [])]),
      rehypePlugins: resolvePluginList([...(defaults.rehypePlugins ?? []), ...(user.rehypePlugins ?? [])]),
      recmaPlugins: resolvePluginList([...(defaults.recmaPlugins ?? []), ...(user.recmaPlugins ?? [])]),
    } as MdxCompileOptions
  }

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
    processEnvAliases,
    cache,
    markdown,
    babel,
    assets,
    chainCallbackUseMemo,
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
    processEnvAliases: string[]
    cache: boolean
    markdown: MdxCompileOptions
    babel: { plugins: PluginItem[]; presets: PluginItem[] }
    assets: CompilerAssetsOptions | false
    chainCallbackUseMemo: boolean
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
    this.processEnvAliases = processEnvAliases
    this.cache = cache
    this.markdown = markdown
    this.babel = babel
    this.assets = assets
    this.chainCallbackUseMemo = chainCallbackUseMemo
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
      processEnvAliases: providedProcessEnvAliases,
      cache = true,
      markdown: providedMarkdown,
      babel: providedBabel,
      // Assets default ON (enabled with defaults) when the compiler runs; pass `false` to opt out. Matches the engine,
      // where `mergeAssetsOptions` also defaults enabled. `{}` is the compiler-level "on" (the type has no boolean).
      assets = {},
    } = options
    if (mode !== false && (!mode || !normalNodeEnvs.includes(mode as NormalizedNodeEnv))) {
      throw new Error(`Invalid mode (NODE_ENV): "${mode}". Allowed values: production, development, test`)
    }
    const processEnvAliases = [
      ...new Set(
        !providedProcessEnvAliases
          ? []
          : Array.isArray(providedProcessEnvAliases)
            ? providedProcessEnvAliases
            : [providedProcessEnvAliases],
      ),
    ].filter((alias) => !!alias)
    const babelRaw: { plugins: PluginItem[]; presets: PluginItem[] } = (() => {
      if (!providedBabel) {
        return { plugins: [], presets: [] }
      }
      if (Array.isArray(providedBabel)) {
        return { plugins: providedBabel, presets: [] }
      }
      return {
        plugins: providedBabel.plugins ?? [],
        presets: providedBabel.presets ?? [],
      }
    })()
    const { decision: chainCallbackDecision, filteredPlugins } = decideChainCallbackUseMemo(babelRaw.plugins)
    const babel: { plugins: PluginItem[]; presets: PluginItem[] } = {
      plugins: filteredPlugins,
      presets: babelRaw.presets,
    }
    const normalizedMode = mode as NormalizedNodeEnv | false
    const normalizedBuilt = built ?? false
    const markdown = Compiler.buildMarkdownOptions({ built: normalizedBuilt, markdown: providedMarkdown })
    return new Compiler({
      filter: filter ?? Compiler.defaultFilter,
      side,
      scope,
      consts,
      hmrFix: hmrFix ?? (side === 'server' ? false : true),
      walker: new Walker({ routes, ssr, markdown }),
      routes,
      built: normalizedBuilt,
      mode: normalizedMode,
      runtime,
      os,
      ssr,
      importer: parseImporterOptions(providedImporter ?? {}),
      processEnvAliases,
      cache,
      markdown,
      babel,
      assets,
      chainCallbackUseMemo: chainCallbackDecision.inject,
    })
  }

  compile({
    content,
    file: providedFile,
    tryIndex = 0,
    map: sourceMaps = false,
    pruneWalker = !this.built,
    hmrFix = this.hmrFix,
    pruneWalkerPoints,
    pruneWalkerFiles,
    writeVirtual,
    cache: cacheOpt,
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
    cache?: boolean
  }): {
    file: CompilerFile<true> | undefined
    code: string
    map: GeneratorResult['map']
    points: CompilerPoint[] | undefined // in case of cached result
    errors: unknown[]
    modified: boolean
    tryIndex: number
    imports: ImportsTraceResult['items']
  } {
    if (writeVirtual && !this.virtualDir) {
      this.virtualDir = resolveTempDirPath(['compiler-virtual'])
    }
    pruneWalkerPoints = pruneWalkerPoints !== undefined ? pruneWalkerPoints : pruneWalker
    pruneWalkerFiles = pruneWalkerFiles !== undefined ? pruneWalkerFiles : pruneWalker
    if (virtualModulePathRegex.test(providedFile)) {
      const virtualOptions = parseVirtualModulePath(providedFile)
      const { code, error } = createVirtualModuleCode(virtualOptions)
      if (error) {
        if (this.importer.onDeny === 'throw') {
          throw new CriticalCompilerError(error)
        } else {
          log({
            level: 'error',
            category: ['compiler'],
            message: 'Virtual module generation failed (onDeny is not "throw" — continuing with the generated stub)',
            error,
          })
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
        imports: [],
      }
    }

    const providedFilePath = providedFile.split('?', 1)[0]
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
    const processEnvAliases = this.processEnvAliases
    const initialCf = CompilerFile.create({
      walker: this.walker,
      file: providedFilePath,
      content,
    })
    const useCache = cacheOpt !== false && this.cache
    const initialCfCache = useCache ? initialCf.getCache({ map: sourceMaps, hmrFix, compiler: this }) : undefined
    if (initialCfCache?.result) {
      return {
        file: undefined,
        code: initialCfCache.result.code,
        map: initialCfCache.result.map,
        points: undefined,
        errors: [],
        modified: initialCfCache.result.modified,
        tryIndex,
        imports: initialCfCache.result.imports,
      }
    }
    const errors: unknown[] = []
    const collectResult = this.walker.collectPointsFromFile({ file: initialCf, content, stats: initialCfCache?.stats })
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
        imports: [],
      }
    }
    const cf = collectResult.file
    for (const point of collectResult.points) {
      if (side) {
        point.shakeMethods({ side, scope })
      }
      if (hmrFix) {
        point.addHmrFix()
      }
    }
    cf.shakeForEnv({
      side,
      scope,
      consts,
      built,
      mode,
      runtime,
      os,
      ssr,
      processEnvAliases,
    })
    if (built) {
      cf.shakeForBuiltEngine()
    }
    const optimizeResult = cf.optimizeGuardedExpressions()
    errors.push(...optimizeResult.errors)
    if (this.chainCallbackUseMemo) {
      const useMemoResult = cf.injectUseMemoOnChainCallbacks()
      errors.push(...useMemoResult.errors)
    }
    const userBabelResult = cf.applyUserBabelPlugins(this.babel)
    errors.push(...userBabelResult.errors)
    if (side) {
      cf.applyImporter({
        importer: this.importer,
        scope: scope || undefined,
        side,
        writeVirtual: writeVirtual ? this.virtualDir : false,
        compiler: this,
      })
    } else {
      cf.collectImports({ includeExportNames: false })
    }
    const isSomeStale = CompilerPoint.isSomeStale(collectResult.points)
    if (isSomeStale) {
      if (tryIndex >= 10) {
        throw new CriticalCompilerError('Too many tries to compile file. Looks like it is endless loop of changes.')
      }
      return this.compile({
        content,
        file: providedFile,
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
    const result = {
      file: cf,
      code: code,
      map: map,
      points: collectResult.points,
      errors,
      modified: cf.modified,
      tryIndex,
      imports: cf.imports.map((importItem) => ({
        importer: cf.abs,
        pathOriginal: importItem.pathOriginal,
        pathResolved: importItem.pathResolved,
        line: importItem.loc.line,
        column: importItem.loc.column,
      })),
    }
    if (useCache) {
      cf.writeCache({ map: sourceMaps, hmrFix, compiler: this, mtime: cf.mtime, result })
    }
    return result
  }

  collectImportsDeep({
    target,
    skip,
  }: {
    target: CompilerFile<any> | string
    skip?: (resolved: ImportsTraceResult['items'][number]) => boolean
  }): Array<ImportsTraceResult['items'][number]> {
    const normalizePath = (value: string): string => value.split('?', 1)[0] as string
    const targetPath = normalizePath(typeof target === 'string' ? target : target.abs)
    const collected = new Map<string, ImportsTraceResult['items'][number]>()
    const visited = new Set<string>()

    const walk = (currentPath: string): void => {
      const normalized = normalizePath(currentPath)
      if (visited.has(normalized)) {
        return
      }
      visited.add(normalized)

      if (!this.filter.test(normalized)) {
        return
      }

      let imports = [] as ImportsTraceResult['items']
      try {
        const result = this.compile({ file: normalized, pruneWalker: false })
        imports = result.imports
      } catch {
        return
      }
      if (!imports.length) {
        return
      }

      for (const importItem of imports) {
        const resolved = {
          importer: importItem.importer,
          pathOriginal: importItem.pathOriginal,
          pathResolved: importItem.pathResolved,
          line: importItem.line,
          column: importItem.column,
        }
        if (skip?.(resolved)) {
          continue
        }
        const key = `${resolved.importer}\n${resolved.pathOriginal}\n${resolved.pathResolved ?? ''}`
        if (!collected.has(key)) {
          collected.set(key, resolved)
        }
        if (importItem.pathResolved) {
          walk(importItem.pathResolved)
        }
      }
    }

    walk(targetPath)
    return [...collected.values()]
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
      importPathResolved: string | undefined
      target: string
    }): boolean => {
      const targetNormalized = normalizePath(target)
      return (
        importPathOriginal === target ||
        importPathResolved === target ||
        normalizePath(importPathOriginal) === targetNormalized ||
        (importPathResolved !== undefined && normalizePath(importPathResolved) === targetNormalized)
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
      importPathResolved: string | undefined
      target: string
    }): boolean => {
      const targetNormalized = normalizePath(target)
      return (
        importPathOriginal === target ||
        importPathResolved === target ||
        normalizePath(importPathOriginal) === targetNormalized ||
        (importPathResolved !== undefined && normalizePath(importPathResolved) === targetNormalized)
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
          const nextPath = importItem.pathResolved === undefined ? undefined : normalizePath(importItem.pathResolved)
          const isTarget = isImportMatch({
            importPathOriginal: importItem.pathOriginal,
            importPathResolved: importItem.pathResolved,
            target: targetInput,
          })
          const shouldFollow = isTarget || (nextPath !== undefined && this.filter.test(nextPath))
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
          if (nextPath === undefined) {
            continue
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

  private _settingHash: Record<string, string> = {}
  getSettingsHash({ map, hmrFix }: { map: boolean | null; hmrFix: boolean | null }): string {
    const key = JSON.stringify({ map, hmrFix })
    const result = this._settingHash[key]
    if (result) {
      return result
    }
    const fnReplacer = (_key: string, value: unknown) => {
      if (typeof value === 'function') {
        return { __fn: Function.prototype.toString.call(value) }
      }
      return value
    }
    const stringified = stringify(
      {
        // `map` and `hmrFix` are per-call (they change the emitted output: source maps / HMR shims), so they MUST be
        // part of the cache key — otherwise a result compiled with one value is served for a request with the other
        // (e.g. a map:false result returned for a map:true request → no source map). Use the passed args, not
        // `this.hmrFix`, since compile() lets the call override hmrFix.
        map,
        hmrFix,
        filter: this.filter,
        scope: this.scope,
        built: this.built,
        mode: this.mode,
        runtime: this.runtime,
        os: this.os,
        side: this.side,
        consts: this.consts,
        walker: this.walker,
        routes: this.routes,
        ssr: this.ssr,
        importer: this.importer,
        processEnvAliases: this.processEnvAliases,
        fixedConsts: this.fixedConsts,
        markdown: this.markdown,
        babel: this.babel,
        chainCallbackUseMemo: this.chainCallbackUseMemo,
        // `assets` is intentionally absent: it doesn't change `compile()` output (asset resolution is separate plugin
        // hooks), and it carries per-build dirs (`urlDir`/`fileDir`) that would needlessly fragment the transform cache.
      },
      fnReplacer,
    )
    if (!stringified) {
      throw new Error('Failed to generate settings hash')
    }
    const hash = getHash(stringified)
    this._settingHash[key] = hash
    return hash
  }

  private _cacheDir: Record<string, string> = {}
  getCacheDir({ map, hmrFix }: { map: boolean | null; hmrFix: boolean | null }): string {
    const key = JSON.stringify({ map, hmrFix })
    const result = this._cacheDir[key]
    if (result) {
      return result
    }
    const dir = resolveTempDirPath(['compiler-cache', this.getSettingsHash({ map, hmrFix })])
    this._cacheDir[key] = dir
    return dir
  }

  _fixedConsts: CompilerEnvConstsObject | undefined
  get fixedConsts(): CompilerEnvConstsObject {
    if (this._fixedConsts) {
      return this._fixedConsts
    }

    const normalizedConsts = [...normalizeEnvConsts(this.consts)].reverse()
    const fixedConsts: CompilerEnvConstsObject = {}
    for (const constPattern of normalizedConsts) {
      if (typeof constPattern === 'string') {
        if (constPattern.endsWith('*')) {
          const prefix = constPattern.slice(0, -1)
          for (const [envName, envValue] of Object.entries(process.env)) {
            if (envName.startsWith(prefix) && !(envName in fixedConsts)) {
              fixedConsts[envName] = envValue
            }
          }
        } else if (!(constPattern in fixedConsts)) {
          fixedConsts[constPattern] = process.env[constPattern]
        }
        continue
      }
      for (const [envName, desiredValue] of Object.entries(constPattern)) {
        if (!(envName in fixedConsts)) {
          fixedConsts[envName] = desiredValue
        }
      }
    }
    this._fixedConsts = fixedConsts
    return this._fixedConsts
  }
}

export type ImportsTraceResult = {
  items: Array<{
    importer: string
    pathOriginal: string
    pathResolved: string | undefined
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
  processEnvAliases?: string[] | string
  cache?: boolean
  markdown?: CompilerMarkdownOptions
  babel?: CompilerBabelOptions
  /**
   * Static-asset pipeline. Rides _inside_ the compiler plugin (Bun + Vite): when set, the plugin handles managed asset
   * imports — bare/`?url`/`?file`/`?text`/`?react`. `false`/omitted leaves the bundler's native asset behavior.
   * `extensions`/`defaultMode`/`svgr` come from config; the per-build dirs (`urlDir`/`fileDir`/`writeUrlBytes`) are
   * injected per side (Bun url-mode only — Vite uses its native URLs).
   */
  assets?: CompilerAssetsOptions | false
}
export type CompilerMarkdownPluginRef =
  | NonNullable<MdxCompileOptions['remarkPlugins']>[number]
  | string
  | [string, ...unknown[]]
export type CompilerMarkdownOptions = Omit<MdxCompileOptions, 'remarkPlugins' | 'rehypePlugins' | 'recmaPlugins'> & {
  remarkPlugins?: CompilerMarkdownPluginRef[]
  rehypePlugins?: CompilerMarkdownPluginRef[]
  recmaPlugins?: CompilerMarkdownPluginRef[]
}
export type CompilerBabelOptions = PluginItem[] | CompilerBabelOptionsNormalized
export type CompilerBabelOptionsNormalized = { plugins?: PluginItem[]; presets?: PluginItem[] }
export type CompilerEnvConstsObject = { [key: string]: string | number | boolean | null | undefined }
export type CompilerEnvConstsString = string
export type CompilerEnvConstsItem = CompilerEnvConstsString | CompilerEnvConstsObject
export type CompilerEnvConsts = CompilerEnvConstsItem[] | CompilerEnvConstsString | CompilerEnvConstsObject | undefined
export type CompilerEnvConstsNormalized = Array<CompilerEnvConstsString | CompilerEnvConstsObject>
