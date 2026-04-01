import type { CompilerEnvConsts, CompilerEnvConstsNormalized } from './compiler.js'

export const normalizeEnvConsts = (consts: CompilerEnvConsts): CompilerEnvConstsNormalized => {
  if (!consts) {
    return []
  }
  if (typeof consts === 'string') {
    return [consts]
  }
  if (typeof consts === 'object' && !Array.isArray(consts)) {
    return [consts]
  }
  return consts
}
