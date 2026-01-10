import type { RoutesPretty } from '@devp0nt/route0'
import type { CompilerFile } from './file.js'
import { CompilerPoint } from './point.js'
import type { CompilerEnvConsts } from './utils.js'
import { Walker } from './walker.js'

export type CompilerOptions = {
  routes?: Record<string, RoutesPretty<any>> | undefined
  target: 'client' | 'server'
  scope: string
  built?: boolean
  consts?: CompilerEnvConsts
  filter?: RegExp
  isEngineHolderBuildPhase?: boolean
  hmrFix?: 'function' | 'arrowFunction' | 'externalFunction' | false
}

export class Compiler {
  filter: RegExp
  scope: string
  built: boolean
  target: 'client' | 'server'
  consts: CompilerEnvConsts | undefined
  isEngineHolderBuildPhase: boolean | undefined
  hmrFix: 'function' | 'arrowFunction' | 'externalFunction' | false
  walker: Walker
  routes: Record<string, RoutesPretty<any>> | undefined

  static defaultFilter = /^(?!.*node_modules\/(?!.*point0)).*\.[cm]?[jt]sx?$/

  constructor({
    filter,
    target,
    scope,
    consts,
    isEngineHolderBuildPhase,
    hmrFix,
    walker,
    routes,
    built,
  }: {
    filter: RegExp
    target: 'client' | 'server'
    scope: string
    consts: CompilerEnvConsts | undefined
    isEngineHolderBuildPhase: boolean | undefined
    hmrFix: 'function' | 'arrowFunction' | 'externalFunction' | false
    walker: Walker
    routes: Record<string, RoutesPretty<any>> | undefined
    built: boolean
  }) {
    this.filter = filter
    this.target = target
    this.scope = scope
    this.consts = consts
    this.isEngineHolderBuildPhase = isEngineHolderBuildPhase
    this.hmrFix = hmrFix
    this.walker = walker
    this.routes = routes
    this.built = built
  }

  static create(options: CompilerOptions) {
    const { filter, target, scope, consts, isEngineHolderBuildPhase, hmrFix, routes, built } = options
    return new Compiler({
      filter: filter ?? Compiler.defaultFilter,
      target,
      scope,
      consts,
      isEngineHolderBuildPhase,
      hmrFix: hmrFix ?? false,
      walker: new Walker({ routes }),
      routes,
      built: built ?? false,
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
    const target = this.target
    const scope = this.scope
    const consts = this.consts
    const isEngineHolderBuildPhase =
      this.isEngineHolderBuildPhase ?? process.env.POINT0_IS_ENGINE_HOLDER_BUILD_PHASE === 'true'
    const hmrFix = this.hmrFix
    const built = this.built
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
    cf.shakeForEnv({ target, scope, consts, built })
    for (const point of collectResult.points) {
      point.shakeMethods({ target })
      if (hmrFix) {
        point.addHmrFix({ policy: hmrFix })
      }
    }
    cf.shakeForEngineHolderBuildPhase({ isEngineHolderBuildPhase })
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
