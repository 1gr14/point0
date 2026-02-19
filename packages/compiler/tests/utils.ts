import prettier from 'prettier'

// biome-ignore lint/suspicious/noExplicitAny: ok
export const toText = async (fn: string | (() => any)): Promise<string> => {
  const code = typeof fn === 'string' ? fn.trim() : extractFunctionBody(fn)

  return await prettier.format(code, {
    parser: 'babel',
    semi: false,
    singleQuote: true,
    trailingComma: 'all',
  })
}

// biome-ignore lint/suspicious/noExplicitAny: ok
const extractFunctionBody = (fn: () => any): string => {
  const src = fn.toString().trim()

  // async () => { ... } | () => { ... } | function () { ... }
  const blockMatch = /^[^{]*{([\s\S]*)}$/.exec(src)
  if (blockMatch) {
    return blockMatch[1].trim()
  }

  // () => expr
  const arrowMatch = /^\s*(?:async\s*)?\([^)]*\)\s*=>\s*([\s\S]*)$/.exec(src)
  if (arrowMatch) {
    return `return ${arrowMatch[1].replace(/;$/, '')}`
  }

  throw new Error('Unsupported function format')
}
