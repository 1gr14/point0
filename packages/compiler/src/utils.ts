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

export const pascalCase = (str: string): string => {
  return str
    .normalize('NFKD') // normalize unicode
    .replace(/[^a-zA-Z0-9 ]+/g, ' ') // keep letters, numbers, spaces
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('')
}
