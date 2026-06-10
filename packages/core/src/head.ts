import type {
  DeepResolvableProperties,
  MetaFlat,
  ResolvableHead,
  ResolvableLink,
  ResolvableValue,
  UseSeoMetaInput,
} from 'unhead/types'

/**
 * The object form accepted by `.head()`. Everything unhead's `useHead` takes (`title`, `meta`, `link`, `script`,
 * `htmlAttrs`, …) plus, at the same level:
 *
 * - every flat SEO meta key from unhead's `useSeoMeta` schema (`description`, `ogTitle`, `ogImage`, `twitterCard`,
 *   `robots`, …) — rendered as the matching `<meta>` tags,
 * - `canonical` — rendered as `<link rel="canonical">`.
 *
 * When a flat key and an explicit `meta` array entry target the same meta tag in one `.head()` call, the flat key wins.
 */
export type HeadObject = ResolvableHead &
  DeepResolvableProperties<MetaFlat> & {
    /** Rendered as `<link rel="canonical" href="…">`. */
    canonical?: ResolvableValue<string>
  }

const headOwnKeys = new Set<string>([
  'title',
  'titleTemplate',
  'templateParams',
  'base',
  'link',
  'meta',
  'style',
  'script',
  'noscript',
  'htmlAttrs',
  'bodyAttrs',
])

/**
 * Splits a `.head()` result into the part unhead's `useHead` understands (the real head keys) and the flat SEO meta
 * part for `useSeoMeta`. `canonical` is folded into `head.link`.
 */
export const _splitHead = (
  input: HeadObject | string | undefined | null,
): { head: ResolvableHead; seoMeta: UseSeoMetaInput } => {
  if (input === undefined || input === null) {
    return { head: {}, seoMeta: {} }
  }
  if (typeof input === 'string') {
    return { head: { title: input }, seoMeta: {} }
  }
  const head: Record<string, unknown> = {}
  const seoMeta: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || key === 'canonical') {
      continue
    }
    if (headOwnKeys.has(key)) {
      head[key] = value
    } else {
      seoMeta[key] = value
    }
  }
  if (input.canonical !== undefined) {
    const canonicalLink: ResolvableLink = { rel: 'canonical', href: input.canonical }
    const link = head.link as ResolvableHead['link']
    head.link = !link
      ? [canonicalLink]
      : typeof link === 'function'
        ? () => [...(link() || []), canonicalLink]
        : [...link, canonicalLink]
  }
  return { head: head as ResolvableHead, seoMeta: seoMeta as UseSeoMetaInput }
}
