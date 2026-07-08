import { decodeHTML } from 'entities'
import { createElement } from 'react'
import type { ReactElement, ReactNode } from 'react'
import type { HeadTag, ResolvableHead } from 'unhead/types'

/**
 * The document pipeline: `index.html` stays the authoring format, but the engine renders the WHOLE document —
 * `<html>…</html>` — with React. The template string (whatever the mode produced: the source file, vite's
 * `transformIndexHtml` output in dev, the bundler's emitted `dist/client/index.html` in build) is parsed ONCE into a
 * {@link DocumentTemplate} with Bun's `HTMLRewriter` (no regexes, no extra parser dependency) and cached by the exact
 * string. {@link buildDocumentElement} then assembles the React tree per request: the app subtree sits inside the
 * template's root element, so a suspended Suspense boundary is never the root of React's markup and Fizz streams the
 * shell natively — no `display: contents` wrapper, no prefix/suffix string splicing.
 *
 * Parsing rules (all deliberate):
 *
 * - `<title>`, `<base>`, `<meta>`, `<link>`, `<style>` from the template's `<head>` become unhead INPUT
 *   ({@link DocumentTemplate.headInput}) — the caller pushes it as the lowest-priority entry, so page `.head()` values
 *   override template values with unhead's usual dedupe/merge semantics (same net behavior as unhead's
 *   `transformHtmlTemplate`).
 * - `<script>` and `<noscript>` in `<head>` are NEVER routed through unhead ({@link DocumentTemplate.headPassthrough}) —
 *   they render verbatim, preserving their relative order (unhead would reorder them).
 * - Everything inside `<body>` renders verbatim ({@link DocumentTemplate.bodyNodes}); the element with the client's
 *   `domRootElementId` hosts the app.
 * - HTML comments are dropped — React cannot render comment nodes. Whitespace-only text nodes inside `<body>` are KEPT
 *   and rendered verbatim, exactly like a browser (so a word-separating space between inline content authored in
 *   `<body>` is never lost); at the `<head>` level they are dropped (head text is only source formatting, and React
 *   warns about text children of `<html>`/`<head>`).
 * - Text and attribute values are entity-decoded (`&amp;` → `&`) — React re-escapes on render. `<script>`/`<style>`
 *   contents are raw-text in HTML and stay verbatim.
 */

export type DocumentTemplateElementNode = {
  type: 'element'
  tag: string
  attrs: Record<string, string>
  children: DocumentTemplateNode[]
}
export type DocumentTemplateTextNode = { type: 'text'; text: string }
export type DocumentTemplateNode = DocumentTemplateElementNode | DocumentTemplateTextNode

export type DocumentTemplate = {
  /**
   * The template head content unhead understands (`title`/`base`/`meta`/`link`/`style` + `htmlAttrs`/`bodyAttrs`). Push
   * it as the LOWEST-priority unhead entry (`{ _index: 0 }`) so page `.head()` values win over template values.
   */
  headInput: ResolvableHead
  /** Head `<script>`/`<noscript>` elements, authored order — rendered verbatim, never routed through unhead. */
  headPassthrough: DocumentTemplateElementNode[]
  /** Everything inside `<body>`, authored order (the root element, scripts, anything else). */
  bodyNodes: DocumentTemplateNode[]
}

/** HTML void elements — no end tag, `HTMLRewriter` never fires `onEndTag` for them. */
const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'track',
  'wbr',
])

/** Elements whose text content is raw in HTML — never entity-decode it (and for script/style, render it verbatim). */
const RAW_TEXT_TAGS = new Set(['script', 'style'])

/** Template head tags that become unhead input (everything else head-level is passthrough). */
const HEAD_UNHEAD_TAGS = new Set(['title', 'base', 'meta', 'link', 'style'])

const parseCache = new Map<string, DocumentTemplate>()
const PARSE_CACHE_MAX = 64

/**
 * Parses an `index.html` string into a {@link DocumentTemplate} with Bun's `HTMLRewriter`. Cached by the exact string
 * (dev HTML changes across edits/URLs produce new strings; the cache is capped and drops oldest entries). Throws when
 * the template has no `<head>` or no `<body>` — the engine owns the document structure and needs both hooks.
 */
export async function parseDocumentTemplate(html: string): Promise<DocumentTemplate> {
  const cached = parseCache.get(html)
  if (cached) {
    return cached
  }

  const roots: DocumentTemplateNode[] = []
  const stack: DocumentTemplateElementNode[] = []
  const append = (node: DocumentTemplateNode) => {
    const siblings = stack.length > 0 ? stack[stack.length - 1].children : roots
    const last = siblings.length > 0 ? siblings[siblings.length - 1] : undefined
    // HTMLRewriter streams text in arbitrary chunks (e.g. a `<` inside a script splits it) — merge them back.
    if (node.type === 'text' && last !== undefined && last.type === 'text') {
      last.text += node.text
      return
    }
    siblings.push(node)
  }

  const rewriter = new HTMLRewriter()
    .on('*', {
      element(el) {
        const attrs: Record<string, string> = {}
        for (const [name, value] of el.attributes) {
          attrs[name] = decodeHTML(value)
        }
        const node: DocumentTemplateElementNode = { type: 'element', tag: el.tagName, attrs, children: [] }
        append(node)
        if (!VOID_TAGS.has(el.tagName)) {
          stack.push(node)
          el.onEndTag(() => {
            stack.pop()
          })
        }
      },
    })
    .onDocument({
      text(chunk) {
        if (!chunk.text) {
          return
        }
        // Append RAW text and let append() merge the chunks — decoding runs ONCE per finalized text node below.
        // HTMLRewriter splits text at arbitrary boundaries (a `<` inside a script, or the MIDDLE of an entity), so
        // decoding each chunk independently would mangle an entity that straddles a chunk break: `&am` + `p;` must
        // decode as `&`, not stay the literal `&amp;`.
        append({ type: 'text', text: chunk.text })
      },
      // comments are intentionally not collected — React cannot render comment nodes
    })

  await rewriter.transform(new Response(html)).text()

  // Now that every text node is whole, entity-decode it in one pass — skipping raw-text elements (script/style keep
  // their source verbatim). Attribute values are already whole at element() time (HTMLRewriter never splits them), so
  // they are decoded there.
  decodeParsedText(roots, false)

  const htmlNode = findElement(roots, 'html')
  const headNode = htmlNode ? findElement(htmlNode.children, 'head') : findElement(roots, 'head')
  const bodyNode = htmlNode ? findElement(htmlNode.children, 'body') : findElement(roots, 'body')
  if (!headNode || !bodyNode) {
    throw new Error(
      'The index.html template must contain explicit <head> and <body> elements — the engine renders the document from them',
    )
  }

  // Accumulated as plain attribute bags and cast once: unhead's runtime accepts them, its input types are stricter
  // than what parsed HTML can promise (e.g. `base.target` is typed required).
  let title: string | undefined
  let base: Record<string, string> | undefined
  const meta: Record<string, string>[] = []
  const link: Record<string, string>[] = []
  const style: Record<string, string>[] = []
  const headPassthrough: DocumentTemplateElementNode[] = []
  for (const node of headNode.children) {
    if (node.type !== 'element') {
      continue // head-level text is whitespace/noise; comments are already dropped
    }
    if (!HEAD_UNHEAD_TAGS.has(node.tag)) {
      headPassthrough.push(node)
      continue
    }
    const textContent = node.children.map((child) => (child.type === 'text' ? child.text : '')).join('')
    if (node.tag === 'title') {
      title = textContent
    } else if (node.tag === 'base') {
      base = node.attrs
    } else if (node.tag === 'meta') {
      meta.push(node.attrs)
    } else if (node.tag === 'link') {
      link.push(node.attrs)
    } else {
      style.push({ ...node.attrs, textContent })
    }
  }
  const headInput = {
    ...(title !== undefined ? { title } : {}),
    ...(base ? { base } : {}),
    ...(meta.length > 0 ? { meta } : {}),
    ...(link.length > 0 ? { link } : {}),
    ...(style.length > 0 ? { style } : {}),
    ...(htmlNode && Object.keys(htmlNode.attrs).length > 0 ? { htmlAttrs: htmlNode.attrs } : {}),
    ...(Object.keys(bodyNode.attrs).length > 0 ? { bodyAttrs: bodyNode.attrs } : {}),
  } as ResolvableHead

  const template: DocumentTemplate = {
    headInput,
    headPassthrough,
    // Body nodes are kept verbatim — including whitespace-only text — so the document renders exactly what the author
    // wrote (a browser keeps those text nodes too; the client only hydrates `#root`, so body siblings are static SSR).
    bodyNodes: bodyNode.children,
  }
  if (parseCache.size >= PARSE_CACHE_MAX) {
    const oldest = parseCache.keys().next().value
    if (oldest !== undefined) {
      parseCache.delete(oldest)
    }
  }
  parseCache.set(html, template)
  return template
}

function findElement(nodes: DocumentTemplateNode[], tag: string): DocumentTemplateElementNode | undefined {
  for (const node of nodes) {
    if (node.type === 'element' && node.tag === tag) {
      return node
    }
  }
  return undefined
}

/**
 * Entity-decode every text node in the tree after parsing, once each node is whole (HTMLRewriter streams text in
 * arbitrary chunks — decoding per chunk would mangle an entity split across a chunk boundary). Raw-text elements
 * (`script`/`style`) are never decoded — their content is verbatim HTML raw-text.
 */
function decodeParsedText(nodes: DocumentTemplateNode[], insideRaw: boolean): void {
  for (const node of nodes) {
    if (node.type === 'text') {
      if (!insideRaw) {
        node.text = decodeHTML(node.text)
      }
      continue
    }
    decodeParsedText(node.children, RAW_TEXT_TAGS.has(node.tag))
  }
}

/**
 * HTML attribute → React prop names for the attributes that realistically appear in an `index.html` (and in unhead
 * resolved tags). Attributes with dashes (`data-*`, `aria-*`, `http-equiv` is the exception below) and unknown
 * lowercase attributes pass through unchanged — React renders unknown attributes verbatim.
 */
const ATTR_TO_PROP: Record<string, string> = {
  class: 'className',
  for: 'htmlFor',
  charset: 'charSet',
  'http-equiv': 'httpEquiv',
  crossorigin: 'crossOrigin',
  tabindex: 'tabIndex',
  srcset: 'srcSet',
  imagesrcset: 'imageSrcSet',
  imagesizes: 'imageSizes',
  hreflang: 'hrefLang',
  referrerpolicy: 'referrerPolicy',
  fetchpriority: 'fetchPriority',
  autocomplete: 'autoComplete',
  autofocus: 'autoFocus',
  autoplay: 'autoPlay',
  enctype: 'encType',
  novalidate: 'noValidate',
  formnovalidate: 'formNoValidate',
  readonly: 'readOnly',
  maxlength: 'maxLength',
  minlength: 'minLength',
  contenteditable: 'contentEditable',
  spellcheck: 'spellCheck',
  accesskey: 'accessKey',
  inputmode: 'inputMode',
  datetime: 'dateTime',
  usemap: 'useMap',
  allowfullscreen: 'allowFullScreen',
  playsinline: 'playsInline',
  itemprop: 'itemProp',
  itemscope: 'itemScope',
  itemtype: 'itemType',
  itemid: 'itemID',
  itemref: 'itemRef',
  nomodule: 'noModule',
  colspan: 'colSpan',
  rowspan: 'rowSpan',
}

/**
 * HTML boolean attributes: authored as bare names (`defer`, `async`), parsed as `''` — React drops known boolean
 * attributes with a falsy value, so `''` must become `true`.
 */
const BOOLEAN_ATTRS = new Set([
  'allowfullscreen',
  'async',
  'autofocus',
  'autoplay',
  'checked',
  'controls',
  'default',
  'defer',
  'disabled',
  'formnovalidate',
  'hidden',
  'inert',
  'ismap',
  'itemscope',
  'loop',
  'multiple',
  'muted',
  'nomodule',
  'novalidate',
  'open',
  'playsinline',
  'readonly',
  'required',
  'reversed',
  'selected',
])

/** `style="color: red; --x: 1"` → `{ color: 'red', '--x': '1' }` (React needs the object form). */
function inlineStyleToObject(style: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const declaration of style.split(';')) {
    const colonIndex = declaration.indexOf(':')
    if (colonIndex === -1) {
      continue
    }
    const property = declaration.slice(0, colonIndex).trim()
    const value = declaration.slice(colonIndex + 1).trim()
    if (!property || !value) {
      continue
    }
    if (property.startsWith('--')) {
      result[property] = value
      continue
    }
    // -webkit-line-clamp → WebkitLineClamp, font-size → fontSize
    const camel = property.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())
    result[property.startsWith('-') ? camel.charAt(0).toUpperCase() + camel.slice(1) : camel] = value
  }
  return result
}

/** Converts parsed HTML attributes to React props ({@link ATTR_TO_PROP}, boolean attrs, `style` string → object). */
export function htmlAttrsToReactProps(attrs: Record<string, unknown>): Record<string, unknown> {
  const props: Record<string, unknown> = {}
  for (const [name, rawValue] of Object.entries(attrs)) {
    if (rawValue === undefined || rawValue === null || rawValue === false) {
      continue
    }
    const value = normalizeAttrValue(name, rawValue)
    if (name === 'style' && typeof value === 'string') {
      props.style = inlineStyleToObject(value)
      continue
    }
    const propName = ATTR_TO_PROP[name] ?? name
    if (BOOLEAN_ATTRS.has(name) && (value === '' || value === true || value === name)) {
      props[propName] = true
      continue
    }
    if (value === true) {
      // A bare NON-boolean attribute (`crossorigin`, unhead normalizes it to `true`): React drops `true` on
      // enumerated attributes, so render the HTML-equivalent empty string (`crossorigin=""`).
      props[propName] = ''
      continue
    }
    props[propName] = value
  }
  return props
}

/**
 * Unhead resolved-tag props can carry non-string values: `true` for boolean attrs, and object/Set forms for `class` and
 * `style` (unhead's mergeable representations). Flatten them to what React expects.
 */
function normalizeAttrValue(name: string, value: unknown): string | boolean {
  if (typeof value === 'string' || typeof value === 'boolean') {
    return value
  }
  if (value instanceof Set) {
    return [...value].join(name === 'style' ? '; ' : ' ')
  }
  if (typeof value === 'object' && value !== null) {
    // unhead object form: { key: truthyCondition } for class, { prop: value } for style
    if (name === 'style') {
      return Object.entries(value as Record<string, unknown>)
        .map(([property, propertyValue]) => `${property}: ${String(propertyValue)}`)
        .join('; ')
    }
    return Object.entries(value as Record<string, unknown>)
      .filter(([, condition]) => Boolean(condition))
      .map(([key]) => key)
      .join(' ')
  }
  return String(value)
}

/** Renders a parsed template node as a React element/string. Scripts and styles keep their source text verbatim. */
export function templateNodeToReact(node: DocumentTemplateNode, key: string): ReactNode {
  if (node.type === 'text') {
    return node.text
  }
  const props = htmlAttrsToReactProps(node.attrs)
  props.key = key
  if (RAW_TEXT_TAGS.has(node.tag)) {
    const text = node.children.map((child) => (child.type === 'text' ? child.text : '')).join('')
    if (text) {
      props.dangerouslySetInnerHTML = { __html: text }
    }
    return createElement(node.tag, props)
  }
  if (node.children.length === 0) {
    return createElement(node.tag, props)
  }
  return createElement(
    node.tag,
    props,
    ...node.children.map((child, index) => templateNodeToReact(child, `${key}-${index}`)),
  )
}

/** Renders an unhead resolved tag ({@link HeadTag}) as a React element. */
export function headTagToReact(tag: HeadTag, key: string): ReactNode {
  const props = htmlAttrsToReactProps(tag.props)
  props.key = key
  if (tag.innerHTML) {
    props.dangerouslySetInnerHTML = { __html: tag.innerHTML }
    return createElement(tag.tag, props)
  }
  if (tag.textContent) {
    return createElement(tag.tag, props, tag.textContent)
  }
  return createElement(tag.tag, props)
}

/** A resolved unhead tag list split by where it renders. */
export type SplitHeadTags = {
  htmlAttrs: Record<string, unknown>
  bodyAttrs: Record<string, unknown>
  /** `<head>` tags in unhead's (capo) order, charset excluded — the engine owns the charset meta. */
  headTags: HeadTag[]
  bodyOpenTags: HeadTag[]
  bodyCloseTags: HeadTag[]
}

/**
 * Splits unhead's resolved tags into head/bodyOpen/bodyClose groups and the `<html>`/`<body>` attribute bags. Charset
 * metas are dropped — {@link buildDocumentElement} renders the engine-owned `<meta charSet="utf-8">` as the FIRST head
 * child (the WHATWG prescan only reads the first 1024 bytes, and the transport header may be stripped by a proxy;
 * dedupe here mirrors the old `ensureHeadCharsetFirst`).
 */
export function splitResolvedHeadTags(tags: HeadTag[]): SplitHeadTags {
  const result: SplitHeadTags = { htmlAttrs: {}, bodyAttrs: {}, headTags: [], bodyOpenTags: [], bodyCloseTags: [] }
  for (const tag of tags) {
    if (tag.tag === 'htmlAttrs') {
      Object.assign(result.htmlAttrs, tag.props)
      continue
    }
    if (tag.tag === 'bodyAttrs') {
      Object.assign(result.bodyAttrs, tag.props)
      continue
    }
    if (tag.tag === 'meta' && (tag.props.charset || String(tag.props['http-equiv']).toLowerCase() === 'content-type')) {
      continue
    }
    if (tag.tagPosition === 'bodyOpen') {
      result.bodyOpenTags.push(tag)
    } else if (tag.tagPosition === 'bodyClose') {
      result.bodyCloseTags.push(tag)
    } else {
      result.headTags.push(tag)
    }
  }
  return result
}

/**
 * Assembles the full document React element. `<head>` order is deterministic and engine-owned:
 *
 * 1. `<meta charSet="utf-8">` — always first (1024-byte prescan window, see {@link splitResolvedHeadTags}),
 * 2. `headStart` — the engine's env scripts (tiny, must run before any module the page loads),
 * 3. `<link rel="modulepreload">` hints — before the entry script so the browser parallelizes the import graph,
 * 4. Unhead resolved tags (template + page `.head()` values merged, capo-ordered),
 * 5. The template's own head `<script>`/`<noscript>` elements, authored order,
 * 6. `headEnd` — the dehydrated super-store script (~200 KB on a real page) goes LAST so it never pushes the
 *    early-parse-relevant tags (charset/title/preloads) out of the prescan window; it only needs to execute before the
 *    entry bundle runs.
 *
 * The app renders inside the template's `#<domRootElementId>` element; everything else in `<body>` renders verbatim.
 */
export function buildDocumentElement({
  template,
  resolvedHeadTags,
  app,
  domRootElementId,
  headStart = [],
  headEnd = [],
  modulePreloads = [],
  omitHeadScriptIds = [],
}: {
  template: DocumentTemplate
  resolvedHeadTags: HeadTag[]
  /** The app subtree; `undefined` renders the SPA shell — the same document with an empty root element. */
  app: ReactNode | undefined
  domRootElementId: string
  headStart?: ReactNode[]
  headEnd?: ReactNode[]
  modulePreloads?: string[]
  /**
   * Template head scripts with these ids are NOT rendered — the caller re-renders a fresh version itself. This is the
   * upsert semantics for engine-owned scripts: a built `dist/client/index.html` carries the baked env-consts script for
   * static hosting, and when the engine serves the document it replaces it with serve-time values.
   */
  omitHeadScriptIds?: readonly string[]
}): ReactElement {
  const split = splitResolvedHeadTags(resolvedHeadTags)

  const headChildren: ReactNode[] = [
    createElement('meta', { charSet: 'utf-8', key: 'p0-charset' }),
    ...headStart,
    ...modulePreloads.map((href) =>
      createElement('link', { rel: 'modulepreload', crossOrigin: '', href, key: `p0-preload-${href}` }),
    ),
    ...split.headTags.map((tag, index) => headTagToReact(tag, `p0-head-${index}`)),
    ...template.headPassthrough
      .filter((node) => !(node.attrs.id && omitHeadScriptIds.includes(node.attrs.id)))
      .map((node, index) => templateNodeToReact(node, `p0-head-script-${index}`)),
    ...headEnd,
  ]

  // The root element usually sits directly in <body>, but nothing forbids a template from nesting it — walk deep.
  const rootMatches = { count: 0 }
  const renderBodyNode = (node: DocumentTemplateNode, key: string): ReactNode => {
    if (node.type === 'element' && node.attrs.id === domRootElementId) {
      rootMatches.count++
      const props = htmlAttrsToReactProps(node.attrs)
      props.key = key
      return app === undefined ? createElement(node.tag, props) : createElement(node.tag, props, app)
    }
    if (node.type === 'element' && node.children.length > 0 && !RAW_TEXT_TAGS.has(node.tag)) {
      const props = htmlAttrsToReactProps(node.attrs)
      props.key = key
      return createElement(
        node.tag,
        props,
        ...node.children.map((child, index) => renderBodyNode(child, `${key}-${index}`)),
      )
    }
    return templateNodeToReact(node, key)
  }
  const bodyChildren: ReactNode[] = [
    ...split.bodyOpenTags.map((tag, index) => headTagToReact(tag, `p0-body-open-${index}`)),
    ...template.bodyNodes.map((node, index) => renderBodyNode(node, `p0-body-${index}`)),
    ...split.bodyCloseTags.map((tag, index) => headTagToReact(tag, `p0-body-close-${index}`)),
  ]
  if (rootMatches.count === 0) {
    throw new Error(`Root element #${domRootElementId} not found in the <body> of the index.html template`)
  }
  if (rootMatches.count > 1) {
    // Fail loud instead of rendering the app into every match: the client hydrates a single #root container, so a
    // duplicated app subtree would mismatch. Duplicate ids are invalid HTML — surface it, don't silently double-render.
    throw new Error(
      `Root element #${domRootElementId} appears more than once in the <body> of the index.html template — give the app root a unique id`,
    )
  }

  return createElement(
    'html',
    htmlAttrsToReactProps(split.htmlAttrs),
    createElement('head', null, ...headChildren),
    createElement('body', htmlAttrsToReactProps(split.bodyAttrs), ...bodyChildren),
  )
}
