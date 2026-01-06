import { Collector } from './collector.js'
import { CompilerFile } from './file.js'
import type { CompilerPoint } from './point.js'

export const compilerFilepathFilter = /^(?!.*node_modules\/(?!.*point0)).*\.[cm]?[jt]sx?$/

export const compile = async ({
  content,
  file: fileAbs,
  target,
  isEngineHolderBuildPhase = process.env.POINT0_IS_ENGINE_HOLDER_BUILD_PHASE === 'true',
}: {
  content?: string
  file: string
  target: 'client' | 'server'
  isEngineHolderBuildPhase?: boolean
}): Promise<{ code: string; points: CompilerPoint[]; errors: unknown[]; modified: boolean }> => {
  const errors: unknown[] = []
  const cf = await CompilerFile.create(fileAbs).read({ content })
  const collector = new Collector()
  const collectResult = await collector.collectPointsFromFile({ fileAbs })
  errors.push(...collectResult.errors)
  for (const point of collectResult.points) {
    point.prune({ target, isEngineHolderBuildPhase })
  }
  cf.pruneForEngineHolderBuildPhase({ target, isEngineHolderBuildPhase })
  cf.pruneForRuntimeTarget({ target, isEngineHolderBuildPhase })
  return {
    code: cf.isTargetAstModified({ target, isEngineHolderBuildPhase })
      ? cf.toCode({ target, isEngineHolderBuildPhase })
      : cf.content,
    points: collectResult.points,
    errors,
    modified: true,
  }
}

export * from './collector.js'
export * from './file.js'
export * from './generator.js'
export * from './point.js'
export * from './resolver.js'
