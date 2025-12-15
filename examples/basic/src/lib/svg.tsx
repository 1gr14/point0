const toCamel = (name: string) => name.replace(/-([a-z])/g, (_, c) => c.toUpperCase())

export const Svg = ({ src, ...props }: { src: string } & React.SVGProps<SVGSVGElement>) => {
  const trimmed = src.trim()

  if (!trimmed.startsWith('<svg')) {
    console.error('Svg component: src must start with <svg…>')
    return null
  }

  // --- 1. Execute <svg ...> opening tag ---
  const openTagMatch = /^<svg([^>]*)>/i.exec(trimmed)
  if (!openTagMatch) return null

  const attrsString = openTagMatch[1]

  // --- 2. Parse attributes ---
  const attrs: Record<string, string> = {}
  const attrRegex = /(\S+)=["']([^"']*)["']/g

  let match: RegExpExecArray | null
  while ((match = attrRegex.exec(attrsString))) {
    const rawName = match[1]
    const rawValue = match[2]

    // Convert SVG attribute to React-friendly camelCase
    const camel = toCamel(rawName)

    attrs[camel] = rawValue
  }

  // --- 3. Execute inner content ---
  const inner = trimmed.replace(/^<svg[^>]*>/i, '').replace(/<\/svg>$/i, '')

  return <svg {...attrs} {...props} dangerouslySetInnerHTML={{ __html: inner }} />
}
