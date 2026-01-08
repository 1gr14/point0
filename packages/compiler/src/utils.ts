export type CompilerEnvConstsObject = { [key: string]: string | number | boolean | null | undefined }
export type CompilerEnvConstsString = string
export type CompilerEnvConstsItem = CompilerEnvConstsString | CompilerEnvConstsObject
export type CompilerEnvConsts = CompilerEnvConstsItem[] | CompilerEnvConstsString | CompilerEnvConstsObject | undefined
export type CompilerEnvConstsNormalized = Array<CompilerEnvConstsString | CompilerEnvConstsObject>

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
