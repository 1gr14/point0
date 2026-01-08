export const toText = (fn: string | (() => any)): string => {
  if (typeof fn === 'string') return fn.trim()

  const src = fn.toString().trim()

  // async () => { ... } | () => { ... } | function () { ... }
  const blockMatch = /^[^{]*{([\s\S]*)}$/.exec(src)
  if (blockMatch) {
    return blockMatch[1].replace(/^\s+|\s+$/g, '')
  }

  // () => expr
  const arrowMatch = /^\s*(?:async\s*)?\([^)]*\)\s*=>\s*([\s\S]*)$/.exec(src)
  if (arrowMatch) {
    return `return ${arrowMatch[1].replace(/;$/, '')}`
  }

  throw new Error('Unsupported function format')
}
