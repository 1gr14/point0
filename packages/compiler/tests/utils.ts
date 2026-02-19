import prettier from 'prettier'

type Awaitable<T> = T | Promise<T>
type StringifiableFn = () => Awaitable<void>

export const toText = async (fn: string | StringifiableFn): Promise<string> => {
  const code = typeof fn === 'string' ? fn.trim() : extractFunctionBody(fn)

  return await prettier.format(code, {
    parser: 'babel',
    semi: false,
    singleQuote: true,
    trailingComma: 'all',
  })
}

const extractFunctionBody = (fn: StringifiableFn): string => {
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
