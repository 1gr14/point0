import type { RoutesPretty } from '@devp0nt/route0'
import type { CompilerFile } from './file.js'
import type { CompilerPoint } from './point.js'
import type { CompilerEnvConsts } from './utils.js'
import { Walker } from './walker.js'

export type CompilerOptions = {
  routes?: Record<string, RoutesPretty<any>> | undefined
  target: 'client' | 'server'
  scope: string
  consts?: CompilerEnvConsts
  filter?: RegExp
  isEngineHolderBuildPhase?: boolean
  hmrFix?: 'function' | 'arrowFunction' | 'externalFunction' | false
}

export class Compiler {
  filter: RegExp
  scope: string
  target: 'client' | 'server'
  consts: CompilerEnvConsts | undefined
  isEngineHolderBuildPhase: boolean | undefined
  hmrFix: 'function' | 'arrowFunction' | 'externalFunction' | false | undefined
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
  }: {
    filter: RegExp
    target: 'client' | 'server'
    scope: string
    consts: CompilerEnvConsts | undefined
    isEngineHolderBuildPhase: boolean | undefined
    hmrFix: 'function' | 'arrowFunction' | 'externalFunction' | false | undefined
    walker: Walker
    routes: Record<string, RoutesPretty<any>> | undefined
  }) {
    this.filter = filter
    this.target = target
    this.scope = scope
    this.consts = consts
    this.isEngineHolderBuildPhase = isEngineHolderBuildPhase
    this.hmrFix = hmrFix
    this.walker = walker
    this.routes = routes
  }

  static create(options: CompilerOptions) {
    const { filter, target, scope, consts, isEngineHolderBuildPhase, hmrFix, routes } = options
    return new Compiler({
      filter: filter ?? Compiler.defaultFilter,
      target,
      scope,
      consts,
      isEngineHolderBuildPhase,
      hmrFix,
      walker: new Walker({ routes }),
      routes,
    })
  }

  compile({ content, file }: { content?: string; file: string }): {
    file: CompilerFile<true> | undefined
    code: string
    points: CompilerPoint[]
    errors: unknown[]
    modified: boolean
  } {
    const target = this.target
    const scope = this.scope
    const consts = this.consts
    const isEngineHolderBuildPhase =
      this.isEngineHolderBuildPhase ?? process.env.POINT0_IS_ENGINE_HOLDER_BUILD_PHASE === 'true'
    const hmrFix = this.hmrFix ?? false
    const errors: unknown[] = []
    const collectResult = this.walker.collectPointsFromFile({ file, content })
    errors.push(...collectResult.errors)
    if (!collectResult.ok) {
      return { file: collectResult.file, code: content || '', points: collectResult.points, errors, modified: false }
    }
    const cf = collectResult.file
    for (const point of collectResult.points) {
      point.shakeMethods({ target })
      if (hmrFix) {
        point.addHmrFix({ policy: hmrFix })
      }
    }
    cf.shakeForEngineHolderBuildPhase({ isEngineHolderBuildPhase })
    cf.shakeForEnv({ target, scope, consts })
    return {
      file: cf,
      code: cf.modified ? cf.toCode() : cf.content,
      points: collectResult.points,
      errors,
      modified: cf.modified,
    }
  }
}
