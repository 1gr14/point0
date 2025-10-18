import { renderToReadableStream, renderToStaticMarkup } from 'react-dom/server'
import type { MetaMap, MetaMapValue, Payload, ReadableStreamRenderer, StaticRenderer } from './index.js'

export function escapeForInlineJSON(json: string) {
  return json
    .replace(/</g, '\\u003C')
    .replace(/-->/g, '\\u002D\\u002D\\u003E')
    .replace(/<\/script/gi, '\\u003C/script')
}

export function serializePayload(payload: Payload) {
  return escapeForInlineJSON(JSON.stringify(payload))
}

export const metaMapToHtml = (metaMap: MetaMap | MetaMap[]) => {
  const metaMaps = Array.isArray(metaMap) ? metaMap : [metaMap]
  let headHtml = ''
  let bodyAttrs = ''
  let htmlAttrs = ''
  const toHtmlAttrs = (value: MetaMapValue) => {
    if (typeof value !== 'object' || value === null || typeof value === 'undefined') {
      return ''
    }
    return Object.entries(value)
      .map(([key, value]) =>
        value === true ? key : value === false ? '' : value === null || value === undefined ? '' : `${key}="${value}"`,
      )
      .filter(Boolean)
      .join(' ')
  }
  const withSpaceIfExists = (value: string) => {
    return value.length > 0 ? ` ${value}` : ''
  }
  for (const metaMap of metaMaps) {
    for (const [key, value] of Object.entries(metaMap)) {
      if (key === 'html') {
        htmlAttrs += toHtmlAttrs(value)
      } else if (key === 'body') {
        bodyAttrs += toHtmlAttrs(value)
      } else {
        if (value === null || value === undefined || value === false) {
          continue
        }
        if (typeof value === 'object') {
          headHtml += `<${key} ${toHtmlAttrs(value)} />`
          continue
        }
        headHtml += `<${key}>${value}</${key}>`
      }
    }
  }
  return {
    headHtml,
    bodyAttrs: withSpaceIfExists(bodyAttrs),
    htmlAttrs: withSpaceIfExists(htmlAttrs),
  }
}

export function renderDocumentHtmlPrefix({ payload }: { payload: Payload }) {
  const { meta } = payload
  const { headHtml, bodyAttrs, htmlAttrs } = metaMapToHtml(meta)
  const serializedPayload = serializePayload(payload)
  return `<!doctype html>
<html${htmlAttrs}>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
${headHtml}
</head>
<body${bodyAttrs}>
<script id="__POINT0_PAYLOAD__" type="application/json">${serializedPayload}</script>
<div id="root">`
}

export function renderDocumentHtmlSuffix(props?: { clientBundlePath?: string }) {
  const { clientBundlePath } = props ?? {}
  return `</div>${
    clientBundlePath
      ? `
<script src="${clientBundlePath}" defer></script>`
      : ''
  }
</body>
</html>`
}

export type DocumentHtmlResult<TContent extends string | undefined> = {
  prefix: string
  content: TContent
  suffix: string
  html: string
}

export function renderDocumentHtml<TContent extends string | undefined = undefined>({
  content,
  payload,
  clientBundlePath,
  originalHtml,
}: {
  content?: TContent
  payload: Payload
  clientBundlePath?: string
  originalHtml?: string
}): DocumentHtmlResult<TContent> {
  if (originalHtml) {
    return overrideDocumentHtml({ originalHtml, content, payload, clientBundlePath })
  }
  const prefix = renderDocumentHtmlPrefix({ payload })
  const suffix = renderDocumentHtmlSuffix({ clientBundlePath })
  return { prefix, content: content as TContent, suffix, html: `${prefix}${content}${suffix}` }
}

export function overrideDocumentHtml<TContent extends string | undefined = undefined>({
  originalHtml,
  content,
  payload,
  clientBundlePath,
}: {
  originalHtml: string
  content?: TContent
  payload: Payload
  clientBundlePath?: string
}): DocumentHtmlResult<TContent> {
  const { meta } = payload
  const { headHtml, bodyAttrs, htmlAttrs } = metaMapToHtml(meta)
  const serializedPayload = serializePayload(payload)

  const rewriter = new HTMLRewriter()
    .on('html', {
      element(element) {
        // Inject html attributes
        if (htmlAttrs.trim()) {
          for (const attr of htmlAttrs.trim().split(/\s+/)) {
            const [name, value] = attr.split('=')
            if (value) {
              element.setAttribute(name, value.replace(/(^"|"$)/g, ''))
            } else {
              element.setAttribute(name, '')
            }
          }
        }
      },
    })
    .on('head', {
      element(element) {
        // Inject meta tags at the end of head
        if (headHtml) {
          element.append(headHtml, { html: true })
        }
      },
    })
    .on('body', {
      element(element) {
        // Inject body attributes
        if (bodyAttrs.trim()) {
          for (const attr of bodyAttrs.trim().split(/\s+/)) {
            const [name, value] = attr.split('=')
            if (value) {
              element.setAttribute(name, value.replace(/(^"|"$)/g, ''))
            } else {
              element.setAttribute(name, '')
            }
          }
        }

        // Inject payload script at the beginning of body
        element.prepend(`<script id="__POINT0_PAYLOAD__" type="application/json">${serializedPayload}</script>`, {
          html: true,
        })

        // Inject client bundle if present
        if (clientBundlePath) {
          element.append(`<script src="${clientBundlePath}" defer></script>`, { html: true })
        }
      },
    })
    .on('#root', {
      element(element) {
        if (content) {
          // Inject rendered page HTML into root div
          element.setInnerContent(`'<!-- __POINT0_TARGET_START__ -->'${content}<!-- __POINT0_TARGET_END__ -->'`, {
            html: true,
          })
        } else {
          element.setInnerContent('<!-- __POINT0_TARGET__ -->', { html: true })
        }
      },
    })

  const htmlWithTarget = rewriter.transform(originalHtml)
  if (htmlWithTarget.includes('<!-- __POINT0_TARGET__ -->')) {
    const [prefix, suffix] = htmlWithTarget.split('<!-- __POINT0_TARGET__ -->')
    return { prefix, content: undefined as TContent, suffix, html: `${prefix}${suffix}` }
  } else if (
    htmlWithTarget.includes('<!-- __POINT0_TARGET_START__ -->') &&
    htmlWithTarget.includes('<!-- __POINT0_TARGET_END__ -->')
  ) {
    const prefix = htmlWithTarget.split('<!-- __POINT0_TARGET_START__ -->')[0]
    const suffix = htmlWithTarget.split('<!-- __POINT0_TARGET_END__ -->')[1]
    const content = htmlWithTarget
      .replace(prefix, '')
      .replace(suffix, '')
      .replace('<!-- __POINT0_TARGET_START__ -->', '')
      .replace('<!-- __POINT0_TARGET_END__ -->', '')
    return { prefix, content: content as TContent, suffix, html: `${prefix}${content}${suffix}` }
  } else {
    throw new Error('<!-- __POINT0_TARGET__ --> not found')
  }
}

export function renderStatic({
  element,
  payload,
  renderer = renderToStaticMarkup,
  clientBundlePath,
  originalHtml,
}: {
  element: React.ReactElement
  payload: Payload
  renderer?: StaticRenderer
  clientBundlePath: string
  originalHtml?: string
}): string {
  return renderDocumentHtml({ content: renderer(element), payload, clientBundlePath, originalHtml }).html
}

export async function getReadableStreamWithWrapper({
  element,
  prefix,
  suffix,
  renderer = renderToReadableStream,
  clientBundlePath,
}: {
  element: React.ReactElement
  suffix?: string
  prefix?: string
  clientBundlePath?: string
  renderer?: ReadableStreamRenderer
}) {
  const encoder = new TextEncoder()
  const transform = new TransformStream({
    start(controller) {
      controller.enqueue(encoder.encode(prefix))
    },
    transform(chunk, controller) {
      controller.enqueue(chunk)
    },
    flush(controller) {
      controller.enqueue(encoder.encode(suffix))
    },
  })
  const reactStream = await renderer(element, {
    ...(clientBundlePath ? { bootstrapModules: [clientBundlePath] } : {}),
  })
  return reactStream.pipeThrough(transform)
}

export async function renderReadableStream({
  element,
  payload,
  clientBundlePath,
  renderer = renderToReadableStream,
  originalHtml,
}: {
  element: React.ReactElement
  payload: Payload
  renderer?: ReadableStreamRenderer
  clientBundlePath?: string
  originalHtml?: string
}): Promise<ReadableStream> {
  const { prefix, suffix } = renderDocumentHtml({ originalHtml, payload })
  return await getReadableStreamWithWrapper({ element, prefix, suffix, renderer, clientBundlePath })
}
