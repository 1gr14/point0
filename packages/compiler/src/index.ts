import type { CompilerPoint } from './point.js'
import { Walker } from './walker.js'

export const compilerFilepathFilter = /^(?!.*node_modules\/(?!.*point0)).*\.[cm]?[jt]sx?$/

export const compile = async ({
  content,
  file,
  target,
  isEngineHolderBuildPhase = process.env.POINT0_IS_ENGINE_HOLDER_BUILD_PHASE === 'true',
  hmrFixPolicy = 'none',
}: {
  content?: string
  file: string
  target: 'client' | 'server'
  isEngineHolderBuildPhase?: boolean
  hmrFixPolicy?: 'functionDeclaration' | 'arrowFunctionExpression' | 'none'
}): Promise<{ code: string; points: CompilerPoint[]; errors: unknown[]; modified: boolean }> => {
  const errors: unknown[] = []
  const walker = new Walker()
  const collectResult = await walker.collectPointsFromFile({ file })
  errors.push(...collectResult.errors)
  if (!collectResult.ok) {
    return { code: content || '', points: collectResult.points, errors, modified: false }
  }
  const cf = collectResult.file
  for (const point of collectResult.points) {
    point.shake({ target })
    if (hmrFixPolicy !== 'none') {
      point.addHmrFix({ policy: hmrFixPolicy })
    }
  }
  cf.shakeForEngineHolderBuildPhase({ isEngineHolderBuildPhase })
  cf.shakeForRuntimeTarget({ target })
  return {
    code: cf.modified ? cf.toCode() : cf.content,
    points: collectResult.points,
    errors,
    modified: true,
  }
}

export * from './file.js'
export * from './point.js'
export * from './resolver.js'
export * from './walker.js'
