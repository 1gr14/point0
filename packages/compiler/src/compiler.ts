import type { RoutesPretty } from '@devp0nt/route0'
import { type EnvOsName, type EnvRuntimeName, type NormalizedNodeEnv, normalNodeEnvs } from '@point0/core'
import type { CompilerFile } from './file.js'
import { CompilerPoint } from './point.js'
import type { CompilerEnvConsts } from './utils.js'
import { Walker } from './walker.js'

export type CompilerOptions = {
  routes?: Record<string, RoutesPretty<any>> | undefined
  mode?: NormalizedNodeEnv | false
  runtime?: EnvRuntimeName | false
  os?: EnvOsName | false
  side: 'client' | 'server' | false
  scope: string | false
  built?: boolean
  consts?: CompilerEnvConsts
  filter?: RegExp
  hmrFix?: boolean
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
  routes: Record<string, RoutesPretty<any>> | undefined

  static defaultFilter = /^(?!.*node_modules\/(?!.*point0)).*\.[cm]?[jt]sx?$/

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
  }: {
    filter: RegExp
    side: 'client' | 'server' | false
    scope: string | false
    consts: CompilerEnvConsts | undefined
    hmrFix: boolean
    walker: Walker
    routes: Record<string, RoutesPretty<any>> | undefined
    built: boolean
    mode: NormalizedNodeEnv | false
    runtime: EnvRuntimeName | false
    os: EnvOsName | false
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
      walker: new Walker({ routes }),
      routes,
      built: built ?? false,
      mode: mode as NormalizedNodeEnv | false,
      runtime,
      os,
    })
  }

  compile({ content, file, tryIndex = 0 }: { content?: string; file: string; tryIndex?: number }): {
    file: CompilerFile<true> | undefined
    code: string
    points: CompilerPoint[]
    errors: unknown[]
    modified: boolean
    tryIndex: number
  } {
    const side = this.side
    const scope = this.scope
    const consts = this.consts
    const hmrFix = this.hmrFix
    const built = this.built
    const mode = this.mode
    const runtime = this.runtime
    const os = this.os
    const errors: unknown[] = []
    const collectResult = this.walker.collectPointsFromFile({ file, content })
    errors.push(...collectResult.errors)
    if (!collectResult.ok) {
      return {
        file: collectResult.file,
        code: content || '',
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
    cf.shakeForEnv({ side, scope, consts, built, mode, runtime, os })
    if (built) {
      cf.shakeForBuiltEngine()
    }
    const isSomeStale = CompilerPoint.isSomeStale(collectResult.points)
    if (isSomeStale) {
      if (tryIndex >= 10) {
        throw new Error('Too many tries to compile file. Looks like it is endless loop of changes.')
      }
      return this.compile({ content, file, tryIndex: tryIndex + 1 })
    }
    return {
      file: cf,
      code: cf.modified ? cf.toCode() : cf.content,
      points: collectResult.points,
      errors,
      modified: cf.modified,
      tryIndex,
    }
  }
}
