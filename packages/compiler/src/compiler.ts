import type { CompilerFile } from './file.js'
import type { CompilerPoint } from './point.js'
import { Walker } from './walker.js'

export type CompilerOptions = {
  target: 'client' | 'server'
  filter?: RegExp
  isEngineHolderBuildPhase?: boolean
  hmrFixPolicy?: 'function' | 'arrowFunction' | 'externalFunction' | 'none'
}

export class Compiler {
  filter: RegExp
  target: 'client' | 'server'
  isEngineHolderBuildPhase: boolean | undefined
  hmrFixPolicy: 'function' | 'arrowFunction' | 'externalFunction' | 'none' | undefined

  static defaultFilter = /^(?!.*node_modules\/(?!.*point0)).*\.[cm]?[jt]sx?$/

  constructor({
    filter,
    target,
    isEngineHolderBuildPhase,
    hmrFixPolicy,
  }: {
    filter: RegExp
    target: 'client' | 'server'
    isEngineHolderBuildPhase: boolean | undefined
    hmrFixPolicy: 'function' | 'arrowFunction' | 'externalFunction' | 'none' | undefined
  }) {
    this.filter = filter
    this.target = target
    this.isEngineHolderBuildPhase = isEngineHolderBuildPhase
    this.hmrFixPolicy = hmrFixPolicy
  }

  static create(options: CompilerOptions) {
    const { target, filter, isEngineHolderBuildPhase, hmrFixPolicy } = options
    return new Compiler({
      filter: filter ?? Compiler.defaultFilter,
      target,
      isEngineHolderBuildPhase,
      hmrFixPolicy,
    })
  }

  async compile({
    content,
    file,
    isEngineHolderBuildPhase = this.isEngineHolderBuildPhase ??
      process.env.POINT0_IS_ENGINE_HOLDER_BUILD_PHASE === 'true',
    hmrFixPolicy = this.hmrFixPolicy ?? 'none',
  }: {
    content?: string
    file: string
    isEngineHolderBuildPhase?: boolean
    hmrFixPolicy?: 'function' | 'arrowFunction' | 'externalFunction' | 'none'
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
      point.shake({ target: this.target })
      if (hmrFixPolicy !== 'none') {
        point.addHmrFix({ policy: hmrFixPolicy })
      }
    }
    cf.shakeForEngineHolderBuildPhase({ isEngineHolderBuildPhase })
    cf.shakeForRuntimeTarget({ target: this.target })
    return {
      file: cf,
      code: cf.modified ? cf.toCode() : cf.content,
      points: collectResult.points,
      errors,
      modified: cf.modified,
    }
  }
}
