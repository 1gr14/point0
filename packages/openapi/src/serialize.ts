export const escapeForInlineScriptString = (value: string): string => {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
    .replace(/</g, '\\u003C')
}

export const serializeToJsLiteral = (value: unknown, seen = new WeakSet<object>()): string => {
  if (value === null) {
    return 'null'
  }
  if (value === undefined) {
    return 'undefined'
  }
  if (typeof value === 'string') {
    return `'${escapeForInlineScriptString(value)}'`
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : 'null'
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }
  if (typeof value === 'bigint') {
    return `BigInt('${value.toString()}')`
  }
  if (typeof value === 'function') {
    return value.toString()
  }
  if (typeof value !== 'object') {
    return 'undefined'
  }
  if (seen.has(value)) {
    throw new TypeError('Cannot serialize circular structure to inline JavaScript')
  }
  seen.add(value)

  if (Array.isArray(value)) {
    const serializedItems = value.map((item) => serializeToJsLiteral(item, seen)).join(', ')
    seen.delete(value)
    return `[${serializedItems}]`
  }

  if (value instanceof Date) {
    const iso = escapeForInlineScriptString(value.toISOString())
    seen.delete(value)
    return `new Date('${iso}')`
  }

  if (value instanceof RegExp) {
    const source = escapeForInlineScriptString(value.source)
    const flags = escapeForInlineScriptString(value.flags)
    seen.delete(value)
    return `new RegExp('${source}', '${flags}')`
  }

  const entries = Object.entries(value as Record<string, unknown>)
  const serializedEntries = entries
    .map(([key, entryValue]) => {
      const normalizedKey = /^[$A-Z_][0-9A-Z_$]*$/i.test(key) ? key : `'${escapeForInlineScriptString(key)}'`
      return `${normalizedKey}: ${serializeToJsLiteral(entryValue, seen)}`
    })
    .join(', ')

  seen.delete(value)
  return `{ ${serializedEntries} }`
}
