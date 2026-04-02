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
import { parseVirtualModulePath } from './index.js'
import { Walker } from './walker.js'

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
  importer: ImporterOptionsParsed | undefined

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
    importer: ImporterOptionsParsed | undefined
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
      importer: providedImporter ? parseImporterOptions(providedImporter) : undefined,
    })
  }

  compile({
    content,
    file,
    tryIndex = 0,
    map: sourceMaps = false,
    pruneWalkerPoints = true,
  }: {
    content?: string
    file: string
    tryIndex?: number
    map?: boolean
    pruneWalkerPoints?: boolean
  }): {
    file: CompilerFile<true> | undefined
    code: string
    map: GeneratorResult['map']
    points: CompilerPoint[]
    errors: unknown[]
    modified: boolean
    tryIndex: number
  } {
    if (virtualModulePathRegex.test(file)) {
      const virtualOptions = parseVirtualModulePath(file)
      const { code, error } = createVirtualModuleCode(virtualOptions)
      if (error) {
        if (this.importer?.exitOnDeny) {
          throw new Error(error)
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
    const side = this.side
    const scope = this.scope
    const consts = this.consts
    const hmrFix = this.hmrFix
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
    if (this.importer && side) {
      cf.replaceImportsWithVirtualModulesPaths({ importer: this.importer, scope: scope || undefined, side })
    }
    const isSomeStale = CompilerPoint.isSomeStale(collectResult.points)
    if (isSomeStale) {
      if (tryIndex >= 10) {
        throw new Error('Too many tries to compile file. Looks like it is endless loop of changes.')
      }
      return this.compile({ content, file, tryIndex: tryIndex + 1, map: sourceMaps, pruneWalkerPoints: false })
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
