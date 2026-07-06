import { describe, expect, it } from 'bun:test'
import { createHead } from '@unhead/react/server'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { renderToReadableStream } from 'react-dom/server'
import { capoTagWeight } from 'unhead/server'
import { resolveTags } from 'unhead/utils'
import { buildDocumentElement, parseDocumentTemplate } from '../src/document.js'
import { renderDocumentShellHtml } from '../src/render.js'

const TEMPLATE = `<!doctype html>
<html lang="en" data-x="1">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!-- a template comment -->
    <title>Template Title</title>
    <link rel="icon" href="/favicon.ico" />
    <style>body { color: red; }</style>
    <script>console.log("inline head script", 1 < 2)</script>
  </head>
  <body class="dark">
    <div id="root"></div>
    <script type="module" src="./index.client.tsx"></script>
  </body>
</html>`

async function renderDocument({
  html = TEMPLATE,
  app,
  headInputExtra,
  ...rest
}: {
  html?: string
  app?: ReactNode
  headInputExtra?: Parameters<ReturnType<typeof createHead>['push']>[0]
  headStart?: ReactNode[]
  headEnd?: ReactNode[]
  modulePreloads?: string[]
  domRootElementId?: string
  omitHeadScriptIds?: readonly string[]
}): Promise<string> {
  const template = await parseDocumentTemplate(html)
  const head = createHead()
  head.push(template.headInput, { _index: 0 })
  if (headInputExtra) {
    head.push(headInputExtra)
  }
  const documentElement = buildDocumentElement({
    template,
    resolvedHeadTags: resolveTags(head, { tagWeight: capoTagWeight }),
    app,
    domRootElementId: rest.domRootElementId ?? 'root',
    headStart: rest.headStart,
    headEnd: rest.headEnd,
    modulePreloads: rest.modulePreloads,
    omitHeadScriptIds: rest.omitHeadScriptIds,
  })
  const stream = await renderToReadableStream(documentElement)
  await stream.allReady
  return await new Response(stream).text()
}

describe('parseDocumentTemplate', () => {
  it('splits the template: unhead input, head passthrough scripts, body nodes', async () => {
    const template = await parseDocumentTemplate(TEMPLATE)
    expect(template.headInput).toEqual({
      title: 'Template Title',
      meta: [{ charset: 'UTF-8' }, { name: 'viewport', content: 'width=device-width, initial-scale=1.0' }],
      link: [{ rel: 'icon', href: '/favicon.ico' }],
      style: [{ textContent: 'body { color: red; }' }],
      htmlAttrs: { lang: 'en', 'data-x': '1' },
      bodyAttrs: { class: 'dark' },
    })
    expect(template.headPassthrough).toEqual([
      {
        type: 'element',
        tag: 'script',
        attrs: {},
        children: [{ type: 'text', text: 'console.log("inline head script", 1 < 2)' }],
      },
    ])
    expect(template.bodyNodes).toEqual([
      { type: 'element', tag: 'div', attrs: { id: 'root' }, children: [] },
      { type: 'element', tag: 'script', attrs: { type: 'module', src: './index.client.tsx' }, children: [] },
    ])
  })

  it('decodes entities in text and attributes, keeps script text verbatim', async () => {
    const template = await parseDocumentTemplate(
      `<html><head><title>A &amp; B</title><script>1 &amp;&amp; 2</script></head><body data-note="x &amp; y"><div id="root">hi &amp; bye</div></body></html>`,
    )
    expect(template.headInput.title).toBe('A & B')
    expect(template.headInput.bodyAttrs).toEqual({ 'data-note': 'x & y' })
    expect(template.headPassthrough[0].children).toEqual([{ type: 'text', text: '1 &amp;&amp; 2' }])
    const root = template.bodyNodes[0]
    expect(root.type === 'element' && root.children).toEqual([{ type: 'text', text: 'hi & bye' }])
  })

  it('returns the cached object for the same string', async () => {
    const a = await parseDocumentTemplate(TEMPLATE)
    const b = await parseDocumentTemplate(TEMPLATE)
    expect(a).toBe(b)
  })

  it('throws without <head> or <body>', async () => {
    expect(parseDocumentTemplate('<div id="root"></div>')).rejects.toThrow('must contain explicit <head> and <body>')
  })
})

describe('buildDocumentElement', () => {
  it('renders the full document: charset first, merged head, template scripts and body preserved', async () => {
    const html = await renderDocument({
      app: createElement('main', { id: 'app' }, 'hello'),
      headInputExtra: { title: 'Page', titleTemplate: '%s | Site', htmlAttrs: { lang: 'ru' } },
      headStart: [
        createElement('script', { id: 'env', key: 'env', dangerouslySetInnerHTML: { __html: 'window.env = 1' } }),
      ],
      headEnd: [
        createElement('script', { id: 'store', key: 'store', dangerouslySetInnerHTML: { __html: 'window.store = 1' } }),
      ],
      modulePreloads: ['/chunk-a.js'],
    })
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true)
    // the first head bytes are the charset meta — inside the WHATWG 1024-byte prescan window
    expect(html.indexOf('<meta charSet="utf-8"/>')).toBe(html.indexOf('<head>') + '<head>'.length)
    // unhead merge: page title through the template, page htmlAttrs win, template data attr stays
    expect(html).toContain('<title>Page | Site</title>')
    expect(html).toContain('<html lang="ru" data-x="1">')
    expect(html).toContain('<body class="dark">')
    // template head content routed through unhead
    expect(html).toContain('<link rel="icon" href="/favicon.ico"/>')
    expect(html).toContain('<style>body { color: red; }</style>')
    // template scripts stay verbatim (never entity-escaped), engine scripts keep authored order around them
    expect(html).toContain('<script>console.log("inline head script", 1 < 2)</script>')
    expect(html.indexOf('<script id="env">')).toBeLessThan(html.indexOf('<script id="store">'))
    expect(html.indexOf('<script id="store">')).toBeLessThan(html.indexOf('</head>'))
    expect(html).toContain('<link rel="modulepreload" crossorigin="" href="/chunk-a.js"/>')
    // the app renders inside the template's root element; the body script follows it
    expect(html).toContain('<div id="root"><main id="app">hello</main></div>')
    expect(html.indexOf('<div id="root">')).toBeLessThan(
      html.indexOf('<script type="module" src="./index.client.tsx">'),
    )
  })

  it('renders the SPA shell with an empty root when app is undefined', async () => {
    const html = await renderDocument({})
    expect(html).toContain('<div id="root"></div>')
  })

  it('finds a nested root element', async () => {
    const html = await renderDocument({
      html: `<html><head><title>t</title></head><body><div class="wrap"><div id="root"></div></div></body></html>`,
      app: createElement('span', null, 'x'),
    })
    expect(html).toContain('<div class="wrap"><div id="root"><span>x</span></div></div>')
  })

  it('throws when the root element is missing', async () => {
    expect(renderDocument({ html: `<html><head></head><body><div id="other"></div></body></html>` })).rejects.toThrow(
      'Root element #root not found',
    )
  })

  it('replaces engine-owned template scripts instead of duplicating (omitHeadScriptIds upsert)', async () => {
    // a built dist/client/index.html carries the baked env-consts script — the serve-time render must replace it
    const html = await renderDocument({
      html: `<html><head><script id="__POINT0_ENV_CONSTS__">window.baked = true</script><script id="app-own">window.keep = true</script></head><body><div id="root"></div></body></html>`,
      headStart: [
        createElement('script', {
          id: '__POINT0_ENV_CONSTS__',
          key: 'env',
          dangerouslySetInnerHTML: { __html: 'window.fresh = true' },
        }),
      ],
      omitHeadScriptIds: ['__POINT0_ENV_CONSTS__'],
    })
    expect(html.match(/__POINT0_ENV_CONSTS__/g)?.length).toBe(1)
    expect(html).toContain('window.fresh = true')
    expect(html).not.toContain('window.baked')
    expect(html).toContain('<script id="app-own">window.keep = true</script>')
  })

  it('converts template attributes to React form: boolean attrs, class, style string', async () => {
    const html = await renderDocument({
      html: `<html><head></head><body><div id="root"></div><script src="/x.js" defer></script><p class="a b" style="color: red; --x: 1">t</p></body></html>`,
    })
    expect(html).toContain('<script src="/x.js" defer=""></script>')
    expect(html).toContain('<p class="a b" style="color:red;--x:1">t</p>')
  })

  it('keeps bare non-boolean attributes that route through unhead (crossorigin on a built stylesheet link)', async () => {
    const html = await renderDocument({
      html: `<html><head><link rel="stylesheet" crossorigin href="/a.css"></head><body><div id="root"></div></body></html>`,
    })
    expect(html).toContain('<link rel="stylesheet" crossorigin="" href="/a.css"/>')
  })
})

describe('renderDocumentShellHtml', () => {
  it('serves the template with env scripts and an empty root', async () => {
    const html = await renderDocumentShellHtml({
      originalIndexHtml: TEMPLATE,
      envVars: { RUNTIME: 'yes' },
      envConsts: { BUILT: 1 },
    })
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true)
    expect(html).toContain('window.__POINT0_ENV_CONSTS__')
    expect(html).toContain('window.__POINT0_ENV_VARS__')
    expect(html.indexOf('__POINT0_ENV_CONSTS__')).toBeLessThan(html.indexOf('__POINT0_ENV_VARS__'))
    expect(html).toContain('<div id="root"></div>')
    expect(html).toContain('<title>Template Title</title>')
    expect(html).toContain('<script type="module" src="./index.client.tsx"></script>')
    // no dehydrated store on the shell — there is no SSR data
    expect(html).not.toContain('__POINT0_DEHYDRATED_SUPER_STORE__')
  })
})
