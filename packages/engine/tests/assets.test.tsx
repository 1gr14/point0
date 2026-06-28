import assert from 'node:assert'
import { afterAll, beforeAll, describe, expect, it, setDefaultTimeout } from 'bun:test'
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { generateAssetsDts, makeAssetsBunPlugin, viteAssetMode } from '@point0/compiler'
import type { CompilerAssetsOptions } from '@point0/compiler'
import nodeFs from 'node:fs'
import nodePath from 'node:path'
import type { Engine } from '../src/engine.js'
import { bundlers } from './utils/focus.js'
import type {
  TestProjectOneClient,
  TestProjectOneClientFactoryCreateProjectOptions,
} from './utils/project.one-client.js'
import { TestProjectOneClientFactory } from './utils/project.one-client.js'

setDefaultTimeout(20000)

/** Extract the `src` of `<img id="logo">` from an HTML string, tolerant of attribute order. */
function extractLogoSrc(html: string): string | undefined {
  const tag = html.match(/<img[^>]*\bid="logo"[^>]*>/i)?.[0]
  return tag?.match(/\bsrc="([^"]*)"/i)?.[1]
}

// ---------------------------------------------------------------------------
// Unit tests: drive `makeAssetsBunPlugin` through `Bun.build` directly (fast — no app spawn). These pin down how the
// plugin resolves each kind of import (bare / ?url / ?file / `with { type }`) and how config changes it, plus the Bun
// constraints we discovered (import attributes can't be honored for managed extensions; ?file needs the query kept).
// ---------------------------------------------------------------------------

let dirCounter = 0
// Build under the package's node_modules/.cache so SVGR's `?react` output (which imports react / the jsx runtime)
// resolves against the hoisted root node_modules — os.tmpdir() has none nearby. react is externalized in the build
// below so the built component shares this test's single React instance (renderToStaticMarkup needs that).
const tmpRoot = nodePath.join(import.meta.dir, '..', 'node_modules', '.cache', 'point0-assets-test')
const madeDirs: string[] = []
function makeTmpDir(): string {
  const dir = nodePath.join(tmpRoot, `${process.pid}-${dirCounter++}`)
  nodeFs.mkdirSync(dir, { recursive: true })
  madeDirs.push(dir)
  return dir
}
afterAll(() => {
  nodeFs.rmSync(tmpRoot, { recursive: true, force: true })
})

/**
 * Write `files` into a temp dir, bundle `entry` (target 'bun') with the assets plugin, run the built entry and return
 * its default-exported `result` object (the resolved import values), plus the build outDir.
 */
async function buildAndRun({
  files,
  pluginOptions,
}: {
  files: Record<string, string>
  pluginOptions?: CompilerAssetsOptions
}): Promise<{ result: Record<string, unknown>; outDir: string; build: Awaited<ReturnType<typeof Bun.build>> }> {
  const srcDir = makeTmpDir()
  const outDir = makeTmpDir()
  for (const [name, content] of Object.entries(files)) {
    const p = nodePath.join(srcDir, name)
    nodeFs.mkdirSync(nodePath.dirname(p), { recursive: true })
    nodeFs.writeFileSync(p, content)
  }
  const plugin = makeAssetsBunPlugin({ urlDir: nodePath.join(outDir, 'url'), fileDir: outDir, ...pluginOptions })
  const build = await Bun.build({
    entrypoints: [nodePath.join(srcDir, 'entry.ts')],
    target: 'bun',
    outdir: outDir,
    plugins: [plugin],
    external: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
  })
  if (!build.success) {
    throw new AggregateError(build.logs, 'build failed')
  }
  const entryOut = build.outputs.find((o) => o.kind === 'entry-point')
  if (!entryOut) throw new Error('no entry output')
  const mod = (await import(`${entryOut.path}?t=${dirCounter++}`)) as { result: Record<string, unknown> }
  return { result: mod.result, outDir, build }
}

// Padded past Vite's default 4 KB `build.assetsInlineLimit` so Vite emits a *served* URL instead of an inline `data:`
// URI — the served path (resolving on a nested route) is what the contract actually tests. Bun never inlines, so it's
// unaffected. The padding is an SVG comment, so the file stays a valid, renderable 2×2 svg.
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><!--${'pad '.repeat(1500)}--><rect width="2" height="2"/></svg>`

describe('assets plugin (unit)', () => {
  it('bare import → app-absolute url (default mode)', async () => {
    const { result } = await buildAndRun({
      files: { 'logo.svg': SVG, 'entry.ts': `import logo from './logo.svg'\nexport const result = { logo }` },
    })
    expect(typeof result.logo).toBe('string')
    expect(result.logo as string).toMatch(/^\/_point0\/assets\/[a-f0-9]{16}\.svg$/)
  })

  it('url-mode writes the bytes to urlDir under the hashed name', async () => {
    const { result, outDir } = await buildAndRun({
      files: { 'logo.svg': SVG, 'entry.ts': `import logo from './logo.svg'\nexport const result = { logo }` },
    })
    const name = (result.logo as string).split('/').pop()!
    const written = nodePath.join(outDir, 'url', name)
    expect(nodeFs.existsSync(written)).toBe(true)
    expect(nodeFs.readFileSync(written, 'utf8')).toBe(SVG)
  })

  it('?file → a path the runtime can read; bytes copied into fileDir', async () => {
    const { result } = await buildAndRun({
      files: {
        'logo.svg': SVG,
        'entry.ts': `import p from './logo.svg?file'\nimport fs from 'node:fs'\nexport const result = { p, content: fs.readFileSync(p, 'utf8') }`,
      },
    })
    expect(typeof result.p).toBe('string')
    expect(result.content).toBe(SVG)
  })

  it('bare and ?url resolve to the SAME url (one module); ?file is distinct', async () => {
    const { result } = await buildAndRun({
      files: {
        'logo.svg': SVG,
        'entry.ts': `import a from './logo.svg'\nimport b from './logo.svg?url'\nimport c from './logo.svg?file'\nexport const result = { a, b, c }`,
      },
    })
    expect(result.a).toBe(result.b)
    expect(result.a).not.toBe(result.c)
    expect(result.c).not.toMatch(/^\/_point0\//) // ?file is a real path, not a url
  })

  it('defaultMode "file" makes a bare import resolve to a file path', async () => {
    const { result } = await buildAndRun({
      files: { 'logo.svg': SVG, 'entry.ts': `import logo from './logo.svg'\nexport const result = { logo }` },
      pluginOptions: { defaultMode: 'file' },
    })
    expect(result.logo as string).not.toMatch(/^\/_point0\//)
  })

  it('an UNmanaged extension is left to Bun (incl. `with { type: "text" }`)', async () => {
    const { result } = await buildAndRun({
      files: {
        'data.svg': SVG,
        'entry.ts': `import txt from './data.svg' with { type: 'text' }\nexport const result = { txt }`,
      },
      pluginOptions: { extensions: ['png'] }, // svg NOT managed here
    })
    expect(result.txt).toBe(SVG) // native Bun text loader
  })

  it('Bun built-in text import (.txt) is untouched by the plugin', async () => {
    const { result } = await buildAndRun({
      files: { 'note.txt': 'hello text', 'entry.ts': `import t from './note.txt'\nexport const result = { t }` },
    })
    expect(result.t).toBe('hello text')
  })

  it('DOCUMENTS Bun limitation: `with { type }` on a MANAGED ext cannot be honored (plugin wins)', async () => {
    // Bun does not expose import attributes to plugins and dedupes by path, so a managed-extension import is taken over
    // by the plugin regardless of `with { type }`. Escape hatch: drop the extension from `extensions` (test above).
    const { result } = await buildAndRun({
      files: {
        'logo.svg': SVG,
        'entry.ts': `import asText from './logo.svg' with { type: 'text' }\nexport const result = { asText }`,
      },
    })
    expect(result.asText as string).toMatch(/^\/_point0\/assets\//) // hijacked to url, NOT the svg text
  })

  it('defaultMode:false → a bare import is left to Bun, NOT hijacked to a point0 url', async () => {
    const { result } = await buildAndRun({
      files: { 'logo.svg': SVG, 'entry.ts': `import logo from './logo.svg'\nexport const result = { logo }` },
      pluginOptions: { defaultMode: false },
    })
    expect(typeof result.logo).toBe('string')
    expect(result.logo as string).not.toMatch(/^\/_point0\//) // native Bun asset handling, not our url mode
  })

  it('defaultMode:false → standard Bun `with { type }` works on a MANAGED ext (lifts the limitation above)', async () => {
    // The exact counterpart of the limitation test: with the bare hook dropped, Bun's native loader sees the import and
    // honors `with { type: 'text' }`, so we get the svg text — not a hijacked url. This is the whole point of the flag.
    const { result } = await buildAndRun({
      files: {
        'logo.svg': SVG,
        'entry.ts': `import asText from './logo.svg' with { type: 'text' }\nexport const result = { asText }`,
      },
      pluginOptions: { defaultMode: false },
    })
    expect(result.asText).toBe(SVG)
  })

  it('defaultMode:false still handles the EXPLICIT query forms (?url / ?text / ?file)', async () => {
    const { result } = await buildAndRun({
      files: {
        'logo.svg': SVG,
        'entry.ts': `import u from './logo.svg?url'\nimport t from './logo.svg?text'\nimport p from './logo.svg?file'\nimport fs from 'node:fs'\nexport const result = { u, t, fileContent: fs.readFileSync(p, 'utf8') }`,
      },
      pluginOptions: { defaultMode: false },
    })
    expect(result.u as string).toMatch(/^\/_point0\/assets\//) // ?url still ours
    expect(result.t).toBe(SVG) // ?text still inlines
    expect(result.fileContent).toBe(SVG) // ?file still emits a path the runtime can read
  })

  it('viteAssetMode: defaultMode:false → bare/unrecognized native (null); explicit forms unchanged', () => {
    expect(viteAssetMode('', false)).toBe(null) // bare → native Vite
    expect(viteAssetMode('v=1', false)).toBe(null) // unrecognized query → native
    expect(viteAssetMode('url', false)).toBe(null) // ?url is always Vite-native
    expect(viteAssetMode('file', false)).toBe('file') // explicit forms stay ours
    expect(viteAssetMode('text', false)).toBe('text')
    expect(viteAssetMode('react', false)).toBe('react')
  })

  it('?text → inlines the file contents as a string (managed ext)', async () => {
    const { result } = await buildAndRun({
      files: { 'logo.svg': SVG, 'entry.ts': `import s from './logo.svg?text'\nexport const result = { s }` },
    })
    expect(result.s).toBe(SVG)
  })

  it('?raw is an alias for ?text (Vite spelling); both inline, distinct from bare url', async () => {
    const { result } = await buildAndRun({
      files: {
        'logo.svg': SVG,
        'entry.ts': `import raw from './logo.svg?raw'\nimport text from './logo.svg?text'\nimport url from './logo.svg'\nexport const result = { raw, text, url }`,
      },
    })
    expect(result.raw).toBe(SVG)
    expect(result.text).toBe(SVG)
    expect(result.url as string).toMatch(/^\/_point0\/assets\//) // bare stays url, not inlined
  })

  it('?react → an SVGR React component (svg only) that renders to <svg>', async () => {
    const { result } = await buildAndRun({
      files: { 'logo.svg': SVG, 'entry.ts': `import Logo from './logo.svg?react'\nexport const result = { Logo }` },
    })
    expect(typeof result.Logo).toBe('function')
    const html = renderToStaticMarkup(React.createElement(result.Logo as React.FC))
    expect(html).toContain('<svg')
  })

  it('?react and bare url of the same svg coexist (distinct: component vs url string)', async () => {
    const { result } = await buildAndRun({
      files: {
        'logo.svg': SVG,
        'entry.ts': `import Logo from './logo.svg?react'\nimport url from './logo.svg'\nexport const result = { isFn: typeof Logo === 'function', url }`,
      },
    })
    expect(result.isFn).toBe(true)
    expect(result.url as string).toMatch(/^\/_point0\/assets\/[a-f0-9]{16}\.svg$/)
  })

  it('react.svg?react → still a renderable component (derived name does not collide with the React import)', async () => {
    // The classic runtime injects `import * as React from 'react'`; a naive PascalCase of `react.svg` is also `React`,
    // so the generated `const React = …` would redeclare it and fail the whole bundle's parse. The name is guarded.
    const { result } = await buildAndRun({
      files: {
        'react.svg': SVG,
        'entry.ts': `import ReactIcon from './react.svg?react'\nexport const result = { ReactIcon }`,
      },
    })
    expect(typeof result.ReactIcon).toBe('function')
    const html = renderToStaticMarkup(React.createElement(result.ReactIcon as React.FC))
    expect(html).toContain('<svg')
  })

  it('?react on a non-svg throws (svg only)', async () => {
    await expect(
      buildAndRun({
        files: {
          'pic.png': 'not-real-png',
          'entry.ts': `import C from './pic.png?react'\nexport const result = { C }`,
        },
      }),
    ).rejects.toThrow()
  })

  it('svgr:false disables ?react (throws — bring your own SVGR)', async () => {
    await expect(
      buildAndRun({
        files: { 'logo.svg': SVG, 'entry.ts': `import C from './logo.svg?react'\nexport const result = { C }` },
        pluginOptions: { svgr: false },
      }),
    ).rejects.toThrow()
  })

  it('generateAssetsDts declares a string module per ext + each query form, and svg?react when svg is managed', () => {
    const dts = generateAssetsDts({ extensions: ['png', 'svg'] })
    for (const spec of ['*.png', '*.png?url', '*.png?file', '*.png?text', '*.png?raw', '*.svg', '*.svg?react']) {
      expect(dts).toContain(`declare module '${spec}'`)
    }
    expect(dts).toContain('FC<SVGProps<SVGSVGElement>>')
  })

  it('generateAssetsDts omits svg?react when svg is unmanaged; with no arg uses the built-in extension list', () => {
    const noSvg = generateAssetsDts({ extensions: ['png'] })
    expect(noSvg).not.toContain("'*.svg?react'")
    const dflt = generateAssetsDts()
    expect(dflt).toContain("declare module '*.png'")
    expect(dflt).toContain("declare module '*.woff2'")
    expect(dflt).toContain("'*.svg?react'") // svg is in DEFAULT_ASSET_EXTENSIONS
  })

  it('generateAssetsDts: the BARE import type follows defaultMode (react → component for svg, else string)', () => {
    const asUrl = generateAssetsDts({ extensions: ['svg'], defaultMode: 'url' })
    const asReact = generateAssetsDts({ extensions: ['svg'], defaultMode: 'react' })
    // url-mode: bare *.svg is a string; the component type appears only for *.svg?react (once)
    expect(asUrl).toContain("declare module '*.svg' {\n  const src: string")
    expect((asUrl.match(/FC<SVGProps<SVGSVGElement>>/g) ?? []).length).toBe(1)
    // react-mode: bare *.svg is ALSO the component → the component type appears twice (bare + ?react)
    expect((asReact.match(/FC<SVGProps<SVGSVGElement>>/g) ?? []).length).toBe(2)
  })

  it('generateAssetsDts: defaultMode:false OMITS the bare module decl (native), keeps the query forms', () => {
    const dts = generateAssetsDts({ extensions: ['png', 'svg'], defaultMode: false })
    // bare modules are NOT declared — the bundler's own ambient types own a bare `import x from './x.png'`
    expect(dts).not.toContain("declare module '*.png' {")
    expect(dts).not.toContain("declare module '*.svg' {")
    // the explicit query forms remain point0's, so they're still declared
    for (const spec of ['*.png?url', '*.png?file', '*.png?text', '*.png?raw', '*.svg?react']) {
      expect(dts).toContain(`declare module '${spec}'`)
    }
  })
})

// ---------------------------------------------------------------------------
// Integration tests: a full point0 app (dev + build) on BOTH bundlers. Verify the end-to-end contract — SSR and the
// client bundle agree (no hydration mismatch), assets resolve from a NESTED route, are served, and render. Covers the
// query API too: ?text (inlined string), ?react (SVGR component, rendered on both sides), and ?file (server reads the
// bytes at runtime, via a server action). url mode differs by bundler: Bun → /_point0/assets/<hash>; Vite → its own
// native asset URL — both app-absolute and identical client==server, which is all the contract requires.
// ---------------------------------------------------------------------------

const tpf = TestProjectOneClientFactory.create({
  namespace: 'assets',
  portsRange: [3300, 3399],
})

type ItFn = (done: (err?: unknown) => void) => void | Promise<void>

let preventFinalFilesCleanup = false
function wrp(
  options: TestProjectOneClientFactoryCreateProjectOptions & { preserve?: boolean },
  callback: ({ tp, engine }: { tp: TestProjectOneClient; engine: Engine }) => void | Promise<void>,
): ItFn {
  const { preserve = false, ...tpOptions } = options
  if (preserve) preventFinalFilesCleanup = true
  const tp = tpf.create({ ...tpOptions, fixedId: preserve })
  return async () => {
    try {
      await tp.cleanup('ports')
      await tp.init()
      const engine = await tp.importEngine()
      await callback({ tp, engine })
      await tp.cleanup({ files: !preserve, ports: true, processes: true })
    } catch (error) {
      await tp.cleanup({ files: !preserve, ports: true, processes: true })
      throw error
    }
  }
}

const ASSET_PAGE = `import { root } from './lib/root.js'
  import logo from './logo.svg'
  import logoText from './logo.svg?text'
  import Logo from './logo.svg?react'
  const View = () => (
    <div>
      <img id="logo" src={logo} />
      <span id="text">{logoText.startsWith('<svg') ? 'TEXT_OK' : 'TEXT_BAD'}</span>
      <span id="react"><Logo /></span>
    </div>
  )
  export const home = root.lets('page', 'home', '/').page(() => <View />)
  export const nested = root.lets('page', 'nested', '/deep/nested').page(() => <View />)`

// ?file is server-only (the bytes are read at runtime), so it lives in a server action, not the hydrated page — a page
// would mismatch by design (the server's file path != the client's). The action reads the file our plugin emitted and
// returns its byte length, which must equal the source SVG's length.
const ASSET_API = `import { root } from './lib/root.js'
  import logoFile from './logo.svg?file'
  import nodeFs from 'node:fs'
  export const filecheck = root
    .lets('action', 'filecheck', 'GET', '/api/filecheck')
    .loader(() => ({ fileLen: nodeFs.readFileSync(logoFile, 'utf8').length }))
    .action()`

/** The contract both dev and build must satisfy: one app-absolute url, shared by SSR + client, served, rendering. */
async function assertAssetContract(tp: TestProjectOneClient): Promise<void> {
  const nestedHtml = await tp.fetchServerHtml('/deep/nested')
  const assetUrl = extractLogoSrc(nestedHtml)
  assert(assetUrl, `no <img id="logo"> src in SSR html: ${nestedHtml.slice(0, 500)}`)
  expect(assetUrl.startsWith('/')).toBe(true)
  expect(assetUrl.startsWith('//')).toBe(false)
  expect(assetUrl.startsWith('./')).toBe(false)
  expect(assetUrl).not.toContain(tp.paths.src)

  const assetResponse = await tp.fetchServer(assetUrl)
  expect(assetResponse.status).toBe(200)
  expect(assetResponse.headers.get('content-type')).toContain('svg')

  const page = await tp.gotoServer('/deep/nested')
  const clientSrc = await page.original.$eval('#logo', (el) => el.getAttribute('src'))
  expect(clientSrc).toBe(assetUrl)
  const loaded = await page.original.$eval(
    '#logo',
    (el) => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0,
  )
  expect(loaded).toBe(true)

  // --- query API (same app, no extra spawn) ---
  // ?text: the svg inlined as a string (rendered as a marker — the raw svg is huge and would need escaping). Identical
  // on SSR + client, so it also proves no hydration mismatch.
  expect(nestedHtml).toContain('TEXT_OK')
  expect(nestedHtml).not.toContain('TEXT_BAD')
  // ?react: the SVGR component renders an inline <svg> (the #logo above is an <img>, so this <svg> is the component).
  expect(nestedHtml).toMatch(/<svg[\s>]/)
  expect(await page.original.$eval('#react', (el) => !!el.querySelector('svg'))).toBe(true)
  expect(await page.original.$eval('#text', (el) => el.textContent)).toBe('TEXT_OK')
  // ?file: a server action reads the bytes at runtime from the path our plugin emitted; its length must match the svg.
  const fileResponse = await tp.fetchServer('/api/filecheck', { headers: { accept: 'application/json' } })
  expect(fileResponse.status).toBe(200)
  expect(await fileResponse.text()).toContain(String(SVG.length))
}

describe('assets (integration)', () => {
  beforeAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
    await tpf.initBrowser()
  })
  afterAll(async () => {
    void tpf.cleanup({ files: !preventFinalFilesCleanup, processes: true, ports: true, browser: true })
  })

  describe.each(bundlers)('%s', (bundler) => {
    it(
      'dev: imported asset → one app-absolute url, shared by SSR + client, resolving on nested routes',
      wrp({ ssr: true, vite: bundler === 'vite' }, async ({ tp }) => {
        await tp.write('src/logo.svg', SVG)
        await tp.write('src/page.tsx', ASSET_PAGE)
        await tp.write('src/api.tsx', ASSET_API)
        tp.spawn(['bun', 'run', 'dev'])
        await tp.waitStarted()
        try {
          await assertAssetContract(tp)
        } catch (e) {
          // DIAGNOSTIC (temporary): surface the spawned dev server's own output — the ECONNRESET on
          // Windows means it crashed/exited, and its stderr (not the test's) holds the reason.
          process.stderr.write(`\n===== DEV SERVER OUTPUT (diagnostic) =====\n${tp.output}\n===== END DEV OUTPUT =====\n`)
          throw e
        }
      }),
      { retry: 3 },
    )

    it(
      'build: imported asset → one app-absolute url, shared by SSR + client, resolving on nested routes',
      wrp({ ssr: true, vite: bundler === 'vite' }, async ({ tp, engine }) => {
        await tp.write('src/logo.svg', SVG)
        await tp.write('src/page.tsx', ASSET_PAGE)
        await tp.write('src/api.tsx', ASSET_API)
        await tp.generate()
        const bp = tp.spawn(['bun', 'run', 'build'])
        await bp.exited
        tp.spawn(['bun', 'run', 'start'])
        await tp.waitStarted(engine.server.port)
        await assertAssetContract(tp)
      }),
      { retry: 3 },
    )
  })
})
