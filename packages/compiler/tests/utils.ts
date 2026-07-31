import prettier from 'prettier'

export const toText = async (fn: string | (() => void)): Promise<string> => {
  const code = typeof fn === 'string' ? fn.trim() : extractFunctionBody(fn)

  return await prettier.format(code, {
    // the fixtures are TypeScript sources — point type arguments (`.lets<{ chatId: string }>('space', 'chat')`) and
    // any other TS syntax must survive being written to disk, so the parser has to read TS
    parser: 'babel-ts',
    semi: false,
    singleQuote: true,
    trailingComma: 'all',
  })
}

const extractFunctionBody = (fn: () => void): string => {
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
