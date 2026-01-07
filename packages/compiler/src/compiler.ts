import type { CompilerPoint } from './point.js'
import { Walker } from './walker.js'

export type CompilerOptions = {
  target: 'client' | 'server'
  compilerFilepathFilter?: RegExp
  isEngineHolderBuildPhase?: boolean
  hmrFixPolicy?: 'functionDeclaration' | 'arrowFunctionExpression' | 'none'
}

export class Compiler {
  compilerFilepathFilter: RegExp
  walker: Walker
  target: 'client' | 'server'
  isEngineHolderBuildPhase: boolean | undefined
  hmrFixPolicy: 'functionDeclaration' | 'arrowFunctionExpression' | 'none' | undefined

  static defaultCompilerFilepathFilter = /^(?!.*node_modules\/(?!.*point0)).*\.[cm]?[jt]sx?$/

  constructor({
    compilerFilepathFilter,
    walker,
    target,
    isEngineHolderBuildPhase,
    hmrFixPolicy,
  }: {
    compilerFilepathFilter: RegExp
    walker: Walker
    target: 'client' | 'server'
    isEngineHolderBuildPhase: boolean | undefined
    hmrFixPolicy: 'functionDeclaration' | 'arrowFunctionExpression' | 'none' | undefined
  }) {
    this.compilerFilepathFilter = compilerFilepathFilter
    this.walker = walker
    this.target = target
    this.isEngineHolderBuildPhase = isEngineHolderBuildPhase
    this.hmrFixPolicy = hmrFixPolicy
  }

  static create(options: CompilerOptions) {
    const { target, compilerFilepathFilter, isEngineHolderBuildPhase, hmrFixPolicy } = options
    const walker = new Walker()
    return new Compiler({
      compilerFilepathFilter: compilerFilepathFilter ?? Compiler.defaultCompilerFilepathFilter,
      walker,
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
    hmrFixPolicy?: 'functionDeclaration' | 'arrowFunctionExpression' | 'none'
  }): Promise<{ code: string; points: CompilerPoint[]; errors: unknown[]; modified: boolean }> {
    const errors: unknown[] = []
    const walker = new Walker()
    const collectResult = await walker.collectPointsFromFile({ file })
    errors.push(...collectResult.errors)
    if (!collectResult.ok) {
      return { code: content || '', points: collectResult.points, errors, modified: false }
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
      code: cf.modified ? cf.toCode() : cf.content,
      points: collectResult.points,
      errors,
      modified: true,
    }
  }
}
