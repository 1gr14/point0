import type { MetaMap, MetaMapValue } from '../shared/meta.js'
import type { Payload } from '../shared/types.js'

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
<script id="__PAGE0_PAYLOAD__" type="application/json">${serializedPayload}</script>
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

export function renderDocumentHtml({
  pageHtml,
  payload,
  clientBundlePath,
}: {
  pageHtml: string
  payload: Payload
  clientBundlePath?: string
}) {
  const prefix = renderDocumentHtmlPrefix({ payload })
  const suffix = renderDocumentHtmlSuffix({ clientBundlePath })
  return `${prefix}${pageHtml}${suffix}`
}
