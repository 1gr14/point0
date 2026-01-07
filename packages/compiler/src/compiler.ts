import type { CompilerFile } from './file.js'
import type { CompilerPoint } from './point.js'
import { Walker } from './walker.js'

export type CompilerOptions = {
  target: 'client' | 'server'
  compilerFilepathFilter?: RegExp
  isEngineHolderBuildPhase?: boolean
  hmrFixPolicy?: 'function' | 'arrowFunction' | 'externalFunction' | 'none'
}

export class Compiler {
  compilerFilepathFilter: RegExp
  target: 'client' | 'server'
  isEngineHolderBuildPhase: boolean | undefined
  hmrFixPolicy: 'function' | 'arrowFunction' | 'externalFunction' | 'none' | undefined

  static defaultCompilerFilepathFilter = /^(?!.*node_modules\/(?!.*point0)).*\.[cm]?[jt]sx?$/

  constructor({
    compilerFilepathFilter,
    target,
    isEngineHolderBuildPhase,
    hmrFixPolicy,
  }: {
    compilerFilepathFilter: RegExp
    target: 'client' | 'server'
    isEngineHolderBuildPhase: boolean | undefined
    hmrFixPolicy: 'function' | 'arrowFunction' | 'externalFunction' | 'none' | undefined
  }) {
    this.compilerFilepathFilter = compilerFilepathFilter
    this.target = target
    this.isEngineHolderBuildPhase = isEngineHolderBuildPhase
    this.hmrFixPolicy = hmrFixPolicy
  }

  static create(options: CompilerOptions) {
    const { target, compilerFilepathFilter, isEngineHolderBuildPhase, hmrFixPolicy } = options
    return new Compiler({
      compilerFilepathFilter: compilerFilepathFilter ?? Compiler.defaultCompilerFilepathFilter,
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
