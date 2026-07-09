import { log } from '@point0/core'
import type { Config } from '@svgr/core'
import type { BunPlugin, OnLoadResult } from 'bun'
import crypto from 'node:crypto'
import nodeFs from 'node:fs'
import nodePath from 'node:path'
import { resolveTempDirPath } from './utils.js'

/**
 * point0's asset pipeline for Bun (dev + build, client + server). `import logo from './logo.png'` resolves to a stable,
 * app-absolute URL (`/_point0/assets/<hash>.<ext>`) on BOTH the browser bundle and the SSR runtime, so SSR html and the
 * client agree (no hydration mismatch) and it resolves from any route. The same plugin runs everywhere, so the URL is
 * computed by ONE source of truth (our own content hash) rather than by two builds coincidentally agreeing.
 *
 * The URL is deliberately NOT namespaced per client: the served name is a content hash (`<sha256(bytes)>.<ext>`), so
 * when several clients' publicdirs merge into one static root, identical files collapse to the same path and different
 * files never collide — content addressing already makes `_point0/assets/` merge-safe. (The stable-named per-client
 * metadata — `_point0/<scope>/preload-manifest.json`, `_point0/<scope>/build-version.json` — IS scoped, because those
 * names would collide.)
 *
 * This module is the single home for all asset logic: the constants the engine shares (URL prefix, dev cache dir, the
 * served-name guard), the configurable plugin factory, the `?text`/`?raw`/`?react` modes, and the ambient-`.d.ts`
 * generation helper. Vite owns asset URLs natively, so `compilerVitePlugin` only borrows the shared bits from here
 * (`viteAssetMode`, `svgrToJsx`, `writeAssetOnce`) for the `?text`/`?file`/`?react` forms.
 *
 * The pipeline is **gated on the compiler being enabled** for a given side: a `compiler: false` client/server keeps the
 * bundler's native asset behavior (point0 does not touch its imports).
 *
 * Resolution is configurable per import:
 *
 * - bare `import x from './x.png'` (or `?url`) → **url mode**: bytes written to `urlDir`, value is the served URL. Set
 *   `compiler.assets.defaultMode: false` to opt the bare form out — it then goes native (incl. Bun `with { type }`),
 *   while the explicit `?url`/`?file`/`?text`/`?react` queries below stay managed.
 * - `import x from './x.png?file'` → **file mode**: bytes written to `fileDir`, value is a path the _server_ can read at
 *   runtime (resolved via the chunk's `import.meta.url`, so it's cwd-independent). In dev (no `fileDir`) it's the
 *   original source path. Intended for server-side file access.
 * - `import s from './x.svg?text'` (or `?raw`, Vite's spelling) → **text mode**: the file's utf-8 contents inlined as a
 *   string. This is what `with { type: 'text' }` would do for a managed extension if Bun exposed it to plugins.
 * - `import Icon from './x.svg?react'` → **react mode**: an SVGR-generated React component (svg only). SVGR options come
 *   from `compiler.assets.svgr`. `@svgr/core` is lazy-imported so it stays out of the module graph otherwise.
 *
 * Bun constraints we work within (verified empirically, see assets.e2e.test.tsx):
 *
 * - Import attributes (`import x from './x.png' with { type: 'text' }`) are NOT exposed to plugins and don't change a
 *   module's identity, so a path-filter plugin can't honor them — for a _managed_ extension this plugin wins. Hence the
 *   managed `extensions` set is configurable: drop an extension to hand it back to Bun (incl. `with { type }`).
 * - Returning `undefined`/`void` from `onLoad` segfaults Bun (1.3.x), so we always return a result.
 * - A query suffix (`?file`) only survives if `onResolve` keeps it in the returned `path` (else Bun dedupes `./x.png` and
 *   `./x.png?file` into one module).
 */

// ---------------------------------------------------------------------------
// Constants — the single source of truth shared by this plugin (which rewrites an import to this URL and, in dev,
// caches the bytes content-addressed) and the engine (which serves the URL back from the same cache in dev, or from
// the static `dist/client` publicdir in prod).
// ---------------------------------------------------------------------------

/** App-absolute URL prefix every managed asset resolves under (`/_point0/assets/<hash>.<ext>`). */
export const ASSET_URL_PREFIX = '/_point0/assets/'

/** Content-addressed dev cache the plugin writes to and the engine dev route serves from. Stable across processes. */
export const resolveAssetsCacheDir = (): string => resolveTempDirPath(['assets'])

/** Served names are flat and content-addressed (`<hash>.<ext>`) — no slashes, so no path traversal. */
export const assetNameRegex = /^[a-f0-9]{8,}\.[a-z0-9]+$/i

// Extensions Bun resolves to its `file` loader (a path/URL) rather than inlining — the ones affected by the
// runtime-vs-bundler / relative-url mismatches. Everything EXCEPT Bun's built-in inlining loaders (js/jsx/ts/tsx/json/
// jsonc/toml/txt/css/html/wasm/node). `svg`/`csv`/`xml` belong here (Bun's default `file` loader handles them; `txt`
// does not — it has a built-in `text` loader — so it's intentionally absent).
export const DEFAULT_ASSET_EXTENSIONS = [
  // images
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'avif',
  'ico',
  'bmp',
  'svg',
  // audio / video
  'mp3',
  'wav',
  'ogg',
  'mp4',
  'webm',
  'mov',
  // fonts
  'woff',
  'woff2',
  'ttf',
  'otf',
  'eot',
  // other binary / data files Bun serves as files (not txt — that has a built-in text loader)
  'pdf',
  'zip',
  'gz',
  'csv',
  'xml',
]

export type AssetResolveMode = 'url' | 'file' | 'text' | 'react'

/** SVGR options for `?react` imports — `@svgr/core`'s `Config` (e.g. `icon`, `typescript`, `svgoConfig`, `plugins`). */
export type AssetsSvgrOptions = Config

/**
 * Resolved options for point0's asset pipeline — the shape of `CompilerOptions.assets`, consumed by BOTH the Bun
 * (`applyAssetsBunPlugin`) and Vite (`compilerVitePlugin`) paths. `extensions`/`defaultMode`/`svgr` are user-facing
 * (from `compiler.assets`); `urlDir`/`fileDir`/`writeUrlBytes` are filled in per-build by the engine, not the user.
 */
export type CompilerAssetsOptions = {
  /** Extensions this plugin manages. Others are left entirely to Bun (incl. `with { type }`). */
  extensions?: string[]
  /**
   * How a bare import (no query) of a managed extension resolves. Default `'url'`. `false` opts bare imports OUT of the
   * pipeline entirely — they're left to the bundler's native asset handling (so Bun `import x from './x.png' with {
   * type }` works again, and Vite uses its own URL). The explicit `?url`/`?file`/`?text`/`?react` forms are still
   * handled.
   */
  defaultMode?: AssetResolveMode | false
  /** SVGR options for `?react`, or `false` to disable our `?react` (bring your own, e.g. `vite-plugin-svgr`). */
  svgr?: AssetsSvgrOptions | false
  /** Bun url-mode output dir (served at `/_point0/assets/`); defaults to the dev cache. (Vite owns url-mode.) */
  urlDir?: string
  /**
   * Directory file-mode bytes are written to (read by the server at runtime). When omitted (dev), file mode returns the
   * original source path instead of copying.
   */
  fileDir?: string
  /**
   * Whether url-mode writes the asset bytes to `urlDir`. Default `true`. Set `false` on the **server build**: the
   * client build already writes the bytes to the served `dist/client`, and both sides compute the SAME content hash
   * (our own), so the server only needs to emit the matching URL — not a duplicate copy. Bun url-mode only.
   */
  writeUrlBytes?: boolean
}

const ASSET_NAMESPACE = 'point0-asset'

const hashContent = (buffer: Buffer): string => crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 16)

// Names the derived component must never take: SVGR's classic runtime injects `import * as React from 'react'` next to
// `const <componentName> = …`, so `componentName === 'React'` (any `react.svg`) declares `React` twice and breaks the
// whole bundle's parse — plus JS reserved words can't be binding names. Any hit is prefixed with `Svg` (→ `SvgReact`,
// always a valid, non-reserved identifier distinct from the React import).
const SVG_NAME_RESERVED = new Set([
  'React',
  // reserved words / literals that can survive PascalCasing as a single token
  'Await',
  'Class',
  'Const',
  'Default',
  'Delete',
  'Enum',
  'Export',
  'Extends',
  'False',
  'Function',
  'Import',
  'Null',
  'Return',
  'Static',
  'Super',
  'Switch',
  'True',
  'Typeof',
  'Void',
  'Yield',
])

/**
 * Derive a valid PascalCase component name from a file path for SVGR (`logo.svg` → `Logo`; fallback `SvgComponent`).
 * The name is internal (cosmetic — SVGR default-exports it and the consumer names its own binding), so the only hard
 * requirement is that it's a valid identifier that can't collide with the classic-runtime `React` import or a reserved
 * word; collisions and non-letter starts are prefixed with `Svg` (`react.svg` → `SvgReact`).
 */
const svgComponentName = (filePath: string): string => {
  const base = nodePath.basename(filePath, nodePath.extname(filePath))
  const pascal = base
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('')
  const safe = /^[A-Za-z]/.test(pascal) && !SVG_NAME_RESERVED.has(pascal) ? pascal : `Svg${pascal}`
  return safe || 'SvgComponent'
}

/**
 * Write `buffer` to `dir/<name>` once — content-addressed, so idempotent and race-safe across parallel builds/processes
 * (tmp file + atomic rename). Shared by the Bun (`applyAssetsBunPlugin`) and Vite (`compilerVitePlugin`) write paths.
 */
export const writeAssetOnce = async (dir: string, name: string, buffer: Buffer): Promise<string> => {
  await nodeFs.promises.mkdir(dir, { recursive: true })
  const dest = nodePath.join(dir, name)
  try {
    await nodeFs.promises.access(dest)
  } catch {
    const tmp = `${dest}.${process.pid}.${hashContent(buffer)}.tmp`
    try {
      await nodeFs.promises.writeFile(tmp, buffer)
      await nodeFs.promises.rename(tmp, dest)
    } catch {
      await nodeFs.promises.rm(tmp, { force: true }).catch(() => {})
      const ok = await nodeFs.promises.access(dest).then(
        () => true,
        () => false,
      )
      if (!ok) {
        log({
          level: 'warn',
          category: ['compiler'],
          message: `Assets: failed to write asset "${name}" to "${dir}"`,
        })
      }
    }
  }
  return dest
}

export const makeAssetsBunPlugin = (options: CompilerAssetsOptions = {}): BunPlugin => {
  const extensions = options.extensions ?? DEFAULT_ASSET_EXTENSIONS
  const defaultMode = options.defaultMode ?? 'url'
  const urlDir = options.urlDir ?? resolveAssetsCacheDir()
  const fileDir = options.fileDir
  const writeUrlBytes = options.writeUrlBytes ?? true
  const svgr = options.svgr

  const extAlt = extensions.join('|')
  // Bare/native-resolved managed imports (Bun resolved the path already) — no query.
  const bareFilter = new RegExp(`\\.(${extAlt})$`, 'i')
  // Managed imports carrying a `?url` / `?file` query — must go through onResolve (Bun can't resolve a query path).
  const queryFilter = new RegExp(`\\.(${extAlt})\\?`, 'i')

  // Query flag → mode. One flag per import in practice; if several are present, this is the precedence. Falls back to
  // `defaultMode`, which may be `false` (an unrecognized query under `defaultMode: false` → not ours, hand it to Bun).
  const resolveMode = (query: string): AssetResolveMode | false => {
    if (/(^|&|\?)file(&|=|$)/i.test(query)) return 'file'
    if (/(^|&|\?)react(&|=|$)/i.test(query)) return 'react'
    if (/(^|&|\?)(text|raw)(&|=|$)/i.test(query)) return 'text'
    if (/(^|&|\?)url(&|=|$)/i.test(query)) return 'url'
    return defaultMode
  }

  const load = async (realPath: string, mode: AssetResolveMode): Promise<OnLoadResult> => {
    if (mode === 'text') {
      // Inline the file's contents as a string — restores `with { type: 'text' }` for managed extensions.
      const text = await nodeFs.promises.readFile(realPath, 'utf8')
      return { contents: `export default ${JSON.stringify(text)}`, loader: 'js' }
    }

    if (mode === 'react') {
      if (svgr === false) {
        throw new Error(
          `[point0] assets: \`?react\` is disabled (compiler.assets.svgr === false) — enable it or bring your own SVGR plugin (got "${realPath}")`,
        )
      }
      const ext = nodePath.extname(realPath).toLowerCase()
      if (ext !== '.svg') {
        throw new Error(`[point0] assets: \`?react\` is only supported for .svg files (got "${realPath}")`)
      }
      const svg = await nodeFs.promises.readFile(realPath, 'utf8')
      const contents = await svgrToJsx(svg, svgr, realPath)
      return { contents, loader: 'jsx' }
    }

    const buffer = await nodeFs.promises.readFile(realPath)
    const ext = nodePath.extname(realPath).toLowerCase()
    const name = `${hashContent(buffer)}${ext}`

    if (mode === 'file') {
      if (!fileDir) {
        // Dev: the source file is on disk — hand back its real path.
        return { contents: `export default ${JSON.stringify(realPath)}`, loader: 'js' }
      }
      await writeAssetOnce(fileDir, name, buffer)
      // Resolve next to the emitted chunk at runtime, so it works regardless of the server's cwd. `fileURLToPath` (not
      // `URL.pathname`) is required for a usable filesystem path on Windows, where `pathname` is the URL form `/C:/…`.
      return {
        contents: `import { fileURLToPath as __p0FileURLToPath } from 'node:url'\nexport default __p0FileURLToPath(new URL(${JSON.stringify('./' + name)}, import.meta.url))`,
        loader: 'js',
      }
    }

    if (writeUrlBytes) {
      await writeAssetOnce(urlDir, name, buffer)
    }
    return { contents: `export default ${JSON.stringify(`${ASSET_URL_PREFIX}${name}`)}`, loader: 'js' }
  }

  return {
    name: 'point0-assets',
    setup(build) {
      // `?url` / `?file`: strip the query (so Bun can find the file), keep a mode marker in the path so url-mode and
      // file-mode of the same file stay distinct modules, and route to our namespace.
      build.onResolve({ filter: queryFilter }, (args) => {
        const queryIndex = args.path.indexOf('?')
        const clean = args.path.slice(0, queryIndex)
        const query = args.path.slice(queryIndex + 1)
        const mode = resolveMode(query)
        // `defaultMode: false` + a query with no recognized point0 flag → not ours; let Bun resolve it natively.
        if (mode === false) return
        // `args.resolveDir` is populated in a `Bun.build` but can be empty in the dev SSR runtime — fall back to the
        // importer's directory (the source file is on disk there) so a relative asset path still resolves.
        const resolveDir = args.resolveDir || (args.importer ? nodePath.dirname(args.importer) : process.cwd())
        let abs: string
        try {
          abs = Bun.resolveSync(clean, resolveDir)
        } catch {
          abs = nodePath.isAbsolute(clean) ? clean : nodePath.resolve(resolveDir, clean)
        }
        return { path: `${abs}?${mode}`, namespace: ASSET_NAMESPACE }
      })

      build.onLoad({ filter: /.*/, namespace: ASSET_NAMESPACE }, async (args) => {
        const queryIndex = args.path.indexOf('?')
        const realPath = queryIndex === -1 ? args.path : args.path.slice(0, queryIndex)
        const mode: AssetResolveMode = args.path.endsWith('?file')
          ? 'file'
          : args.path.endsWith('?text')
            ? 'text'
            : args.path.endsWith('?react')
              ? 'react'
              : 'url'
        return await load(realPath, mode)
      })

      // Bare imports of managed extensions (Bun already resolved the path) → default mode. Skipped entirely when
      // `defaultMode: false`, so a bare import falls through to Bun's native asset handling (incl. `with { type }`).
      if (defaultMode !== false) {
        build.onLoad({ filter: bareFilter }, async (args) => {
          return await load(args.path, defaultMode)
        })
      }
    },
  }
}

/**
 * Apply the asset pipeline's Bun hooks to an existing build, so assets ride _inside_ the single `point0-compiler`
 * plugin (they're gated on the compiler being enabled — see `compiler.assets`). A thin wrapper over the standalone
 * {@link makeAssetsBunPlugin} factory (`makeAssetsBunPlugin(options).setup(build)`), which is kept for unit tests and
 * bring-your-own-bundler use.
 */
export const applyAssetsBunPlugin = (
  build: Parameters<NonNullable<BunPlugin['setup']>>[0],
  options: CompilerAssetsOptions = {},
): void | Promise<void> => makeAssetsBunPlugin(options).setup(build)

/** Content hash of an asset's bytes — the basis of the stable `<hash>.<ext>` served/file name (sha256, first 16 hex). */
export const assetHash = (buffer: Buffer): string => hashContent(buffer)

/**
 * Run SVGR on an svg string → JSX component source (svg only). `@svgr/core` is lazy-imported so it stays out of the
 * module graph for every other consumer (notably the engine importing the constants at runtime). Shared by the Bun
 * (`loader: 'jsx'`) and Vite (`transformWithEsbuild`) `?react` paths so both emit the SAME component. `svgr` must not
 * be `false` — guard that (disabled) before calling.
 */
export const svgrToJsx = async (
  svg: string,
  svgr: AssetsSvgrOptions | undefined,
  filePath: string,
): Promise<string> => {
  const { transform } = await import('@svgr/core')
  return await transform(
    svg,
    // Force the classic runtime (after the user spread, so it can't be overridden): our transpile is classic — Bun's
    // `loader: 'jsx'` and Vite's `transformWithEsbuild({ loader: 'jsx' })` — so SVGR must keep emitting `import * as
    // React`; `jsxRuntime: 'automatic'` would drop it and crash with "React is not defined" at render.
    { plugins: ['@svgr/plugin-jsx'], ...svgr, jsxRuntime: 'classic' },
    { componentName: svgComponentName(filePath), filePath },
  )
}

/**
 * Map a Vite import query to one of point0's managed modes, or `null` to leave it to Vite's natives. `?url`/`?raw` (and
 * a bare/unrecognized import under the default `url` mode) return `null` so Vite owns the URL; point0 takes over
 * `?text`/`?file`/`?react`. A bare import — or a query with no recognized point0 flag — otherwise follows
 * `defaultMode`, mirroring the Bun `resolveMode` so both bundlers resolve the same import to the same mode.
 * `defaultMode: false` makes a bare/unrecognized import `null` too (native Vite) — the parity of the Bun side dropping
 * its bare hook. Used by `compilerVitePlugin`.
 */
export const viteAssetMode = (
  query: string,
  defaultMode: AssetResolveMode | false = 'url',
): AssetResolveMode | null => {
  const has = (flag: string): boolean => new RegExp(`(^|&)${flag}(&|=|$)`, 'i').test(query)
  if (has('file')) return 'file'
  if (has('react')) return 'react'
  if (has('text')) return 'text'
  if (has('url') || has('raw')) return null // Vite handles these natively
  // Bare import, or a query with no recognized point0 flag → follow `defaultMode` (parity with Bun's `resolveMode`); a
  // `url` default — or `false` (opt bare out) — stays native (Vite owns the URL).
  return !defaultMode || defaultMode === 'url' ? null : defaultMode
}

/**
 * Generate an ambient `.d.ts` declaring the type of every managed-asset import, so `import x from './x.png'` and the
 * query forms are typed in user code (like `vite/client`). The explicit query forms are fixed: `?url`/`?file`/`?text`/
 * `?raw` → `string`, and `*.svg?react` → a React component (emitted only when `svg` is managed). The **bare** import's
 * type follows `defaultMode`: `string` for `url`/`file`/`text`, and the React component for `react` (svg only — bare
 * `?react` of a non-svg is a build error anyway). `defaultMode: false` OMITS the bare-module declaration entirely (the
 * bundler's own ambient types — `bun-types`, `vite/client` — own a bare import then). Pass the same
 * `extensions`/`defaultMode` the plugin uses so the declared types match what is actually rewritten. The engine's
 * generator writes this to `generate.assetsTypes` and defaults both from `compiler.assets`; reference it from tsconfig
 * `types`/`include` or a `/// <reference path=... />`.
 */
export const generateAssetsDts = (
  options: { extensions?: string[]; defaultMode?: AssetResolveMode | false } = {},
): string => {
  const extensions = (options.extensions ?? DEFAULT_ASSET_EXTENSIONS).map((ext) => ext.replace(/^\./, ''))
  const defaultMode = options.defaultMode ?? 'url'
  const stringModule = (specifier: string): string =>
    `declare module '${specifier}' {\n  const src: string\n  export default src\n}`
  const reactModule = (specifier: string): string =>
    `declare module '${specifier}' {\n` +
    `  import type { FC, SVGProps } from 'react'\n` +
    `  const ReactComponent: FC<SVGProps<SVGSVGElement>>\n` +
    `  export default ReactComponent\n` +
    `}`
  const blocks: string[] = [
    '// AUTO-GENERATED by point0 — do not edit. Types for imported static assets (see @point0/compiler `compiler.assets`).',
    '',
  ]
  for (const ext of extensions) {
    // The bare import follows defaultMode: a string for url/file/text, the SVGR component for react (svg only). Under
    // `defaultMode: false` the bare import is native, so we declare NO bare module — the bundler's own ambient types
    // own it (declaring it here would shadow them and mistype `with { type }` results).
    if (defaultMode !== false) {
      blocks.push(defaultMode === 'react' && ext === 'svg' ? reactModule(`*.${ext}`) : stringModule(`*.${ext}`))
    }
    // Explicit query forms are fixed regardless of defaultMode.
    for (const query of ['url', 'file', 'text', 'raw']) {
      blocks.push(stringModule(`*.${ext}?${query}`))
    }
  }
  // `?react` is svg-only (SVGR). Only declare it when svg is actually managed.
  if (extensions.includes('svg')) {
    blocks.push(reactModule('*.svg?react'))
  }
  return blocks.join('\n') + '\n'
}
