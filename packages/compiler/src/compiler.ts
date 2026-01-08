import type { CompilerFile } from './file.js'
import type { CompilerPoint } from './point.js'
import type { CompilerEnvConsts } from './utils.js'
import { Walker } from './walker.js'

export type CompilerOptions = {
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

  static defaultFilter = /^(?!.*node_modules\/(?!.*point0)).*\.[cm]?[jt]sx?$/

  constructor({
    filter,
    target,
    scope,
    consts,
    isEngineHolderBuildPhase,
    hmrFix,
  }: {
    filter: RegExp
    target: 'client' | 'server'
    scope: string
    consts: CompilerEnvConsts | undefined
    isEngineHolderBuildPhase: boolean | undefined
    hmrFix: 'function' | 'arrowFunction' | 'externalFunction' | false | undefined
  }) {
    this.filter = filter
    this.target = target
    this.scope = scope
    this.consts = consts
    this.isEngineHolderBuildPhase = isEngineHolderBuildPhase
    this.hmrFix = hmrFix
  }

  static create(options: CompilerOptions) {
    const { filter, target, scope, consts, isEngineHolderBuildPhase, hmrFix } = options
    return new Compiler({
      filter: filter ?? Compiler.defaultFilter,
      target,
      scope,
      consts,
      isEngineHolderBuildPhase,
      hmrFix,
    })
  }

  async compile({
    content,
    scope = this.scope,
    target = this.target,
    consts = this.consts,
    file,
    isEngineHolderBuildPhase = this.isEngineHolderBuildPhase ??
      process.env.POINT0_IS_ENGINE_HOLDER_BUILD_PHASE === 'true',
    hmrFix = this.hmrFix ?? false,
  }: {
    content?: string
    scope?: string
    target?: 'client' | 'server'
    consts?: CompilerEnvConsts
    file: string
    isEngineHolderBuildPhase?: boolean
    hmrFix?: 'function' | 'arrowFunction' | 'externalFunction' | false
  }): Promise<{
    file: CompilerFile<true> | undefined
    code: string
    points: CompilerPoint[]
    errors: unknown[]
    modified: boolean
  }> {
    const errors: unknown[] = []
    const walker = new Walker()
    const collectResult = await walker.collectPointsFromFile({ file, content })
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
