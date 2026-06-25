import type { RoutesPretty } from '@1gr14/route0'
import { normalizeEnvConsts } from '@point0/compiler'
import type {
  AssetResolveMode,
  AssetsSvgrOptions,
  CompilerAssetsOptions,
  CompilerBabelOptions,
  CompilerBabelOptionsNormalized,
  CompilerEnvConsts,
  CompilerEnvConstsNormalized,
  CompilerMarkdownOptions,
  ImporterOptionsInput,
} from '@point0/compiler'
import { _defaultLogFn, prependAndDeappendSlash } from '@point0/core'
import type {
  AppComponent,
  AppComponentModule,
  EnvOsName,
  EnvRuntimeName,
  ErrorPoint0,
  LogFn,
  NormalizedNodeEnv,
  PointsDefinitionSource,
  PointsScope,
  RequiredCtx,
} from '@point0/core'
import type { Request0 } from '@point0/core/request0'
import type { Serve } from 'bun'
import { minimatch } from 'minimatch'
import nodePath from 'node:path'
import { fileURLToPath } from 'node:url'
import { FilesGenerator } from './generator.js'
import type {
  FilesGeneratorSimpleClientConfig,
  FilesGeneratorSimpleGeneralConfig,
  FilesGeneratorSimpleServerConfig,
  FilesGeneratorTask,
} from './generator.js'
import type { PublicdirDefinition } from './publicdir.js'
import { toAbsPath, toJsExtension } from './utils.js'
import type {
  BunBuildConfigDefinition,
  EngineClientBuildConfigDefinition,
  EngineClientPluginsDefinition,
  EngineServerBuildConfigDefinition,
  EngineServerPluginsDefinition,
  EngineSharedPluginsDefinition,
} from './utils.js'
import { Point0 } from '@point0/core'

export type EngineOptionsPublicdir =
  | string
  | Record<string, string | (() => string | Promise<string>)>
  | Array<
      | string
      | Record<string, string | (() => string | Promise<string>)>
      | [string, string | (() => string | Promise<string>)]
    >
export type EngineOptionsPublicdirParsed = Array<[string, string | (() => string | Promise<string>)]>

export type EngineOptionsEnvWide =
  | string
  | Record<string, string | undefined>
  | Array<string | Record<string, string | undefined>>
export type EngineOptionsEnvStrict = Record<string, string | undefined> | Array<Record<string, string | undefined>>
export type EngineOptionsEnvParsed = Record<string, string | undefined>

export type ExtractedViteConfig = import('vite').UserConfig
export type ExtractViteConfigOptions = {
  command: 'serve' | 'build'
  side: 'client' | 'server'
  mode: NormalizedNodeEnv
  scope: PointsScope
  plugins: import('vite').Plugin[]
}
export type ExtractViteConfigFn = (
  options: ExtractViteConfigOptions,
) => Promise<ExtractedViteConfig> | ExtractedViteConfig
export type EngineOptionsViteConfig =
  | ExtractViteConfigFn
  | ExtractedViteConfig
  // | ReturnType<typeof import('vite').defineConfig>
  | string

export type EngineOptionsAppComponent = (() => Promise<AppComponent | AppComponentModule>) | AppComponent
export type EngineOptionsRoutes = () =>
  | Promise<RoutesPretty | { routes: RoutesPretty } | { default: RoutesPretty }>
  | RoutesPretty

export type AnyBunServeConfig = Serve.Options<any, any>

export type EngineOptionsCompilerGeneral = {
  side?: boolean
  scope?: boolean
  mode?: boolean
  runtime?: boolean
  os?: boolean
  consts?: CompilerEnvConsts
  filter?: RegExp
  ssr?: boolean
  cache?: boolean
  markdown?: CompilerMarkdownOptions
  babel?: CompilerBabelOptions
  assets?: EngineOptionsCompilerAssets
}
// export type EngineOptionsCompilerGeneralParsed = {
//   side: boolean
//   scope: boolean
//   consts: CompilerEnvConstsNormalized | undefined
//   mode: boolean
//   runtime: boolean
//   os: boolean
//   filter: RegExp | undefined
//   ssr: boolean
// }
export type EngineOptionsCompilerSpecific = {
  side?: boolean
  scope?: boolean
  mode?: boolean
  runtime?: EnvRuntimeName | false
  os?: EnvOsName | false
  consts?: CompilerEnvConsts
  filter?: RegExp
  ssr?: boolean
  importer?: ImporterOptionsInput | undefined
  cache?: boolean
  markdown?: CompilerMarkdownOptions
  babel?: CompilerBabelOptions
  assets?: EngineOptionsCompilerAssets
}
export type EngineOptionsCompilerSpecificParsed = {
  side: boolean
  scope: boolean
  consts: CompilerEnvConstsNormalized | undefined
  mode: boolean
  runtime: EnvRuntimeName | false
  os: EnvOsName | false
  filter: RegExp | undefined
  ssr: boolean
  importer: ImporterOptionsInput
  cache: boolean
  markdown: CompilerMarkdownOptions | undefined
  babel: CompilerBabelOptionsNormalized | undefined
  assets: CompilerAssetsOptions | false
}

/**
 * `compiler.assets` — the static-asset pipeline config. It rides along with the compiler: a `compiler: false` side
 * keeps the bundler's native asset behavior (this is never read there). `false` disables it for an enabled compiler;
 * `true`/object enables it. `extensions`/`defaultMode`/`svgr` should be kept identical across sides — they must agree
 * for client and SSR to emit the same URL (a per-side override is allowed but is a footgun).
 */
export type EngineOptionsCompilerAssets =
  | boolean
  | {
      enabled?: boolean
      extensions?: string[]
      defaultMode?: AssetResolveMode | false
      svgr?: AssetsSvgrOptions | false
    }

export type EngineOptionsServing = boolean | string | ((options: { request: Request0 }) => boolean)

/** Logger settings. Currently just the log function, but kept as an object so more can be added later. */
export type LoggerConfig = {
  log?: LogFn
}

/**
 * SSR configuration. Pass `true`/`false` for the simple on/off, or an object to tune the SSR re-render loop.
 */
export type SsrOptions = {
  /** Toggle SSR. Defaults to `true` when an options object is provided. */
  enabled?: boolean
  /**
   * Soft re-render budget. Once this many SSR re-renders have happened, the loop stops quietly (no error). Default
   * `Infinity` (re-render until stable). Set to `0` or `1` to opt out of SSR-store stabilization re-renders for
   * performance.
   */
  allowedRerendersCount?: number
  /**
   * Hard re-render cap. Reaching it stops the loop AND logs a server error — the safety net for non-deterministic
   * values (e.g. `Date.now()`) that never stabilize. Default `25`.
   */
  forbiddenRerendersCount?: number
  /**
   * Before the first SSR render, declaratively prefetch the page and its layouts (their `onPrefetch` hooks and server
   * queries, with inputs derived from the route) so the render finds the data in cache and needs fewer — often zero —
   * re-render passes. The render-to-discover loop still runs as a fallback for ad-hoc queries whose params are only
   * known at render time. Default `false`.
   */
  prefetchBeforePageRender?: boolean
}
export type SsrOptionsResolved = {
  allowedRerendersCount: number
  forbiddenRerendersCount: number
  prefetchBeforePageRender: boolean
}
export const defaultSsrOptionsResolved: SsrOptionsResolved = {
  allowedRerendersCount: Infinity,
  forbiddenRerendersCount: 25,
  prefetchBeforePageRender: false,
}
const normalizeSsrEnabled = (ssr: boolean | SsrOptions | undefined): boolean | undefined => {
  if (ssr === undefined) return undefined
  if (typeof ssr === 'boolean') return ssr
  return ssr.enabled ?? true
}
const pickSsrOptionsPartial = (ssr: boolean | SsrOptions | undefined): Partial<SsrOptionsResolved> => {
  if (!ssr || typeof ssr === 'boolean') return {}
  const partial: Partial<SsrOptionsResolved> = {}
  if (ssr.allowedRerendersCount !== undefined) partial.allowedRerendersCount = ssr.allowedRerendersCount
  if (ssr.forbiddenRerendersCount !== undefined) partial.forbiddenRerendersCount = ssr.forbiddenRerendersCount
  if (ssr.prefetchBeforePageRender !== undefined) partial.prefetchBeforePageRender = ssr.prefetchBeforePageRender
  return partial
}
/**
 * Either a logger config directly, or a (sync/async) function that returns one. The function form is resolved during
 * preload, after bun plugins are loaded — so a custom logger imported inside it goes through the compiler transforms
 * (same as how points are read).
 */
export type LoggerOptionsInput = LoggerConfig | (() => LoggerConfig | Promise<LoggerConfig>)

/**
 * The flat, top-level options of `Engine.create({ ... })` — everything that isn't a `server` / `client` / `clients`
 * block. Only `file` is required; the rest tune codegen, SSR, the bundler, and shared defaults that both sides inherit.
 *
 * Full reference: https://1gr14.dev/point0/latest/engine-config
 */
export type EngineGeneralOptions = {
  /**
   * REQUIRED. Almost always `import.meta.url`. The engine uses it to locate itself on disk, which drives `cwd`,
   * build-output paths, and auto-discovery. Accepts a `file://` URL or a plain path. Throws if missing.
   */
  file: string
  /** Custom logger. A `{ log }` object, or a (sync/async) function returning one. Defaults to the built-in log. */
  logger?: LoggerOptionsInput
  /**
   * App-wide codegen: the files `point0 generate` writes (`meta`, `assetsTypes`, `custom`). A raw `FilesGeneratorTask[]`
   * gives full control. Per-side point/route manifests live under `server.generate` / `client.generate`. Default `[]`.
   */
  generate?: FilesGeneratorSimpleGeneralConfig | FilesGeneratorTask[]
  /** Internal: flags that the engine is running from a built `dist/`. Defaults from the `POINT0_ENGINE_WAS_BUILT` env. */
  itWasBuilt?: boolean
  /** Internal: the cwd after build (the `dist/` root). Auto-derived from `file` + `server.outdir`. */
  cwdAfterBuild?: string
  /** Internal: the cwd before build (the source root). Auto-derived from `file`. */
  cwdBeforeBuild?: string
  /** Rewrite relative config paths to their built location after a build. Default `true`. */
  autoFixBuiltPaths?: boolean
  /** Shared output dir for all clients. Default `null` (each client uses its own `outdir`). */
  clientsOutdir?: string
  /** Glob (or globs) the generator scans to discover point source files. Default `[]`. */
  pointsGlob?: string | string[]
  /** Extra `build --watch` patterns layered on top of the import-graph watch. Default `[]`. */
  buildWatchGlob?: string | string[]
  /** Text prepended to generated files. Default `null`. */
  banner?: string
  /**
   * General `Bun.build` overrides, applied when a side bundles with Bun. A plain Bun build config, or a
   * `({ mode, side, scope }) => config` function. Point0-managed lists (`plugins`, `external`, …) are merged, not
   * replaced. Default `null`.
   */
  bunBuildConfig?: BunBuildConfigDefinition
  /** Bun plugins shared by both sides (per-side `bunPlugins` are additive). Default `[]`. */
  bunPlugins?: EngineSharedPluginsDefinition
  /**
   * Vite config — its mere presence switches that side from Bun to Vite. A `({ plugins, side, … }) => UserConfig`
   * function, a literal `UserConfig`, or a path to your own config file. Set per side to switch only one.
   */
  viteConfig?: EngineOptionsViteConfig
  /**
   * Default source-transform config for the whole engine; per-side `compiler` wins. `false` turns the transform off,
   * `true`/object enables it. Takes `babel`, `markdown`, `consts`, `filter`, `cache`, and more.
   */
  compiler?: EngineOptionsCompilerGeneral | boolean
  /** Engine default for SSR; sides inherit unless they override. `true`/`false`, or an object to tune the re-render loop. Default `false`. */
  ssr?: boolean | SsrOptions
  /** Default static-asset config for the whole engine. Folds into `compiler.assets`; a nested/per-side one wins. */
  assets?: EngineOptionsCompilerAssets
}

/**
 * The single `server` block of `Engine.create({ ... })` — the side that runs your API and SSR. Omit it and it defaults
 * to `{ scope: 'root', ssr: false }`. Shares many options with a client (`scope`, `points`, `generate`, `env`,
 * `compiler`, `viteConfig`, …) but env `vars` here is strict and it owns the server-only `entry` / `bunServeConfig`.
 *
 * Full reference: https://1gr14.dev/point0/latest/engine-config
 */
export type EngineServerOptions<
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TError extends ErrorPoint0 = ErrorPoint0,
> = {
  /** REQUIRED. The points scope this side serves, e.g. `'root'` or `'site'`. */
  scope: PointsScope
  /** Runtime loader for the server points manifest, usually `async () => import('./generated/point0/points.server')`. Defaults to a bare root point. */
  points?: PointsDefinitionSource<TRequiredCtx, TError>
  // generate?: Array<Omit<FilesGeneratorTaskPoints, 'scope' | 'side'> | Omit<FilesGeneratorTaskRoutes, 'scope' | 'side'>>
  /** Per-side codegen: `{ points?, custom? }` — where to emit the server points manifest. Default `[]`. */
  generate?: FilesGeneratorSimpleServerConfig
  /**
   * Static files to mount. `source` is a dir string, a route→file record, an array of those, or function values
   * synthesized on the fly; `outdir` is where it's emitted (required for `publicdir` to activate); `cacheLimit`
   * caps caching (`false`/`0` off, `true`/omit caches all). Default `null`.
   */
  publicdir?: {
    source: EngineOptionsPublicdir
    outdir: string
    cacheLimit?: number | boolean
  }
  /** Controls which imports the build accepts, mocks, or treats specially: `{ mock?, deny?, cold?, cwd?, onDeny? }`. `cold` is server-only. Default `{ cwd }`. */
  importer?: ImporterOptionsInput
  /** Server env. `vars` are runtime, `consts` are compile-time-inlined. Server `vars` is strict — records/arrays only, no string/glob form. Default `{}`. */
  env?: { vars?: EngineOptionsEnvStrict; consts?: EngineOptionsEnvWide }
  /** Port the server listens on. Coerced via `Number()`. Default `3000`. */
  port?: number | string
  /** Build output dir. Auto-set to `'dist'`; drives the after-build cwd. */
  outdir?: string
  /** Server entry file(s). A string becomes `{ main: <string> }`. Default `null`. */
  entry?: string | Record<string, string>
  /** Default watch glob for `point0 dev` when `--watch` is passed with no value. Default `[]`. */
  devWatchGlob?: string | string[]
  /** Raw `Bun.serve` config, passed through when serving with Bun. Default `null`. */
  bunServeConfig?: Serve.Options<any, any>
  /** Per-side `Bun.build` overrides (merged with the general `bunBuildConfig`). Default `{}`. */
  bunBuildConfig?: EngineServerBuildConfigDefinition
  /** Bun plugins for this side, additive over the shared `bunPlugins`. Default `[]`. */
  bunPlugins?: EngineServerPluginsDefinition
  /** Vite config for this side; presence switches the server to Vite. Inherits the general `viteConfig`. */
  viteConfig?: EngineOptionsViteConfig
  /** Source-transform config for this side; overrides the general `compiler`. `false` turns it off. */
  compiler?: EngineOptionsCompilerSpecific | boolean
  /** Route table for this scope — `() => import('./lib/routes')` or a routes object. Default `null`. */
  routes?: EngineOptionsRoutes
  /** Text prepended to this side's generated files. Default `null`. */
  banner?: string
  /** HMR port. `false` disables, a number pins it, `true`/omit uses the default `port + 100`. */
  hmrPort?: number | string | boolean
  /** SSR for this side; an explicit value wins over the engine-level `ssr`, else falls back to `false`. */
  ssr?: boolean | SsrOptions
  /**
   * Static-asset config for this side. Folds into `compiler.assets`; `compiler.assets` wins. Keep it in sync with other
   * sides — `extensions`/`defaultMode`/`svgr` must agree across client and server for the same URL.
   */
  assets?: EngineOptionsCompilerAssets
}

/**
 * One `client` block of `Engine.create({ ... })` — a browser bundle the engine builds and (by default) serves. Use
 * `client` for a single client, `clients: [...]` for several; the two big client-only options you almost always set are
 * `indexHtml` (the HTML shell) and `app` (the client app component).
 *
 * Full reference: https://1gr14.dev/point0/latest/engine-config
 */
export type EngineClientOptions = {
  /** REQUIRED. The points scope this client builds, e.g. `'root'`. */
  scope: PointsScope
  /** Runtime loader for the client points manifest, usually `async () => import('./generated/point0/points.client')`. Default `null` (empty). */
  points?: PointsDefinitionSource<any, any>
  /** Whether the engine serves this client. `false` builds it but skips binding to the server and dev serve — for a native shell (Capacitor, Expo). Default `true`. */
  serving?: EngineOptionsServing
  // generate?: Array<Omit<FilesGeneratorTaskPoints, 'scope' | 'side'> | Omit<FilesGeneratorTaskRoutes, 'scope' | 'side'>>
  /** Per-side codegen: `{ points?, routes?, custom? }`. `points` takes a `lazy` flag (pages are lazy by default); `routes` takes an `origin`. Default `[]`. */
  generate?: FilesGeneratorSimpleClientConfig
  /** The client app component loader, e.g. `async () => import('./app.client')`. Default `null`. */
  app?: EngineOptionsAppComponent
  /**
   * Static files to mount for this client. `source` is a dir string, a route→file record, an array, or function
   * values; `outdir` is where it's emitted (required to activate); `cacheLimit` caps caching. Default `null`.
   */
  publicdir?: {
    source: EngineOptionsPublicdir
    outdir: string
    cacheLimit?: number | boolean
  }
  /** Controls which imports the build accepts, mocks, or treats specially: `{ mock?, deny?, cwd?, onDeny? }`. Default `{ cwd }`. */
  importer?: ImporterOptionsInput
  /** The HTML shell for this client, e.g. `'./index.html'`. Default `null`. */
  indexHtml?: string
  /** Id of the element the app mounts into. Default `'root'`. */
  domRootElementId?: string
  /**
   * Client env. `vars` are runtime (injected into the HTML), `consts` are compile-time-inlined. Both are wide (string,
   * glob, record, or array) but throw on `''` / a bare `'*'` to avoid leaking the whole `process.env`. Default `{}`.
   */
  env?: { vars?: EngineOptionsEnvWide; consts?: EngineOptionsEnvWide }
  /** Port this client is served on. Default `serverPort + clientIndex + 1`. */
  port?: number | string
  /** HMR port. `false` disables, a number pins it, `true`/omit uses the default `port + 100`. */
  hmrPort?: number | string | boolean
  /** Per-side `Bun.build` overrides (merged with the general `bunBuildConfig`). Default `{}`. */
  bunBuildConfig?: EngineClientBuildConfigDefinition
  /** Bun plugins for this client, additive over the shared `bunPlugins`. Default `[]`. */
  bunPlugins?: EngineClientPluginsDefinition
  /** Vite config for this client; presence switches it to Vite. Inherits the general `viteConfig`. */
  viteConfig?: EngineOptionsViteConfig
  /** Source-transform config for this client; overrides the general `compiler`. `false` turns it off. */
  compiler?: EngineOptionsCompilerSpecific | boolean
  /** Build output dir, e.g. `'../dist/client'`. Default `null`. */
  outdir?: string
  /** Route table for this client's scope. Default `null`. */
  routes?: EngineOptionsRoutes
  /** Text prepended to this client's generated files. Default `null`. */
  banner?: string
  /** SSR for this client; an explicit value wins over the engine-level `ssr`, else falls back to `false`. */
  ssr?: boolean | SsrOptions
  /**
   * Static-asset config for this client. Folds into `compiler.assets`; `compiler.assets` wins. Keep it in sync with
   * other sides — `extensions`/`defaultMode`/`svgr` must agree across client and server for the same URL.
   */
  assets?: EngineOptionsCompilerAssets
}
/**
 * The full options object you pass to `Engine.create({ ... })`: the flat general options (`file`, `ssr`, `generate`, …)
 * plus one `server` block and one or more clients. Use `client` for a single client and `clients: [...]` for several —
 * both are concatenated, so you can use both. Omit `server` and it defaults to `{ scope: 'root', ssr: false }`.
 *
 *     export const engine = Engine.create({
 *       file: import.meta.url,
 *       ssr: true,
 *       server: { scope: 'root' },
 *       client: { scope: 'root', indexHtml: './index.html', app: async () => import('./app.client') },
 *     })
 *
 * Full reference: https://1gr14.dev/point0/latest/engine-config
 */
export type EngineOptions<
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TError extends ErrorPoint0 = ErrorPoint0,
> = EngineGeneralOptions & {
  /** The server side — your API and SSR. Defaults to `{ scope: 'root', ssr: false }` when omitted. */
  server?: EngineServerOptions<TRequiredCtx, TError>
  /** Shorthand for a single client. Concatenated with `clients`. */
  client?: EngineClientOptions
  /** Several clients. A client with no explicit `port` gets `serverPort + index + 1`. */
  clients?: EngineClientOptions[]
}

export type EngineGeneralOptionsParsed = {
  /** Available synchronously: the object-form `logger.log`, or the default until a function form is resolved. */
  log: LogFn
  /** Raw `logger` option; the function form is resolved during preload (after bun plugins). */
  logger: LoggerOptionsInput | undefined
  itWasBuilt: boolean
  cwdAfterBuild: string
  cwdBeforeBuild: string
  engineFile: string
  cwd: string
  generate: Array<FilesGeneratorTask>
  autoFixBuiltPaths: boolean
  clientsOutdir: string | null
  pointsGlob: string[]
  buildWatchGlob: string[]
  banner: string | null
  compiler: EngineOptionsCompilerGeneral | boolean | null
  viteConfig: EngineOptionsViteConfig | null
  bunBuildConfig: BunBuildConfigDefinition | null
  bunPlugins: EngineSharedPluginsDefinition
  ssr: boolean | undefined
  ssrOptions: SsrOptionsResolved
  assets: EngineOptionsCompilerAssets | undefined
}
export type EngineClientOptionsParsed = {
  scope: PointsScope
  engineFile: string
  pointsProvided: PointsDefinitionSource<any, any> | null
  serving: EngineOptionsServing
  banner: string | null
  generate: Array<FilesGeneratorTask>
  routesProvided: EngineOptionsRoutes | null
  // pointsDistFile: string | null
  appProvided: EngineOptionsAppComponent | null
  // appDistFile: string | null
  indexHtml: string | null
  // indexHtmlDistFile: string | null
  envVars: EngineOptionsEnvParsed
  envConsts: EngineOptionsEnvParsed
  domRootElementId: string
  port: number
  hmrPort: number | false
  index: number
  outdir: string | null
  bunBuildConfig: EngineClientBuildConfigDefinition
  bunPlugins: EngineClientPluginsDefinition
  viteConfig: EngineOptionsViteConfig | null
  compiler: EngineOptionsCompilerSpecificParsed | false
  publicdir: {
    source: PublicdirDefinition
    outdir: string
    cacheLimit: number | boolean
  } | null
  ssr: boolean
  ssrOptions: SsrOptionsResolved
}
export type EngineServerOptionsParsed = {
  scope: PointsScope
  pointsProvided: PointsDefinitionSource<any, any>
  banner: string | null
  generate: Array<FilesGeneratorTask>
  routesProvided: EngineOptionsRoutes | null
  port: number
  entry: Record<string, string> | null
  outdir: string | null
  envVars: EngineOptionsEnvParsed
  envConsts: EngineOptionsEnvParsed
  publicdir: {
    source: PublicdirDefinition
    outdir: string
    cacheLimit: number | boolean
  } | null
  engineFile: string
  cwdBeforeBuild: string
  itWasBuilt: boolean
  bunBuildConfig: EngineServerBuildConfigDefinition
  bunServeConfig: Serve.Options<any, any> | null
  bunPlugins: EngineServerPluginsDefinition
  viteConfig: EngineOptionsViteConfig | null
  compiler: EngineOptionsCompilerSpecificParsed | false
  hmrPort: number | false
  ssr: boolean
  devWatchGlob: string[]
}
export type EngineOptionsParsed = {
  general: EngineGeneralOptionsParsed
  server: EngineServerOptionsParsed
  clients: EngineClientOptionsParsed[]
  routes: Record<string, RoutesPretty | EngineOptionsRoutes | null>
}

const mergeMarkdownOptions = (
  general: CompilerMarkdownOptions | undefined,
  specific: CompilerMarkdownOptions | undefined,
): CompilerMarkdownOptions | undefined => {
  if (!general && !specific) return undefined
  const g = general ?? {}
  const s = specific ?? {}
  return {
    ...g,
    ...s,
    remarkPlugins: [...(g.remarkPlugins ?? []), ...(s.remarkPlugins ?? [])],
    rehypePlugins: [...(g.rehypePlugins ?? []), ...(s.rehypePlugins ?? [])],
    recmaPlugins: [...(g.recmaPlugins ?? []), ...(s.recmaPlugins ?? [])],
  }
}

const normalizeBabelOptions = (input: CompilerBabelOptions | undefined): CompilerBabelOptionsNormalized => {
  if (!input) return { plugins: [], presets: [] }
  if (Array.isArray(input)) return { plugins: input, presets: [] }
  return { plugins: input.plugins ?? [], presets: input.presets ?? [] }
}

const mergeBabelOptions = (
  general: CompilerBabelOptions | undefined,
  specific: CompilerBabelOptions | undefined,
): CompilerBabelOptionsNormalized | undefined => {
  if (!general && !specific) return undefined
  const g = normalizeBabelOptions(general)
  const s = normalizeBabelOptions(specific)
  return {
    plugins: [...(g.plugins ?? []), ...(s.plugins ?? [])],
    presets: [...(g.presets ?? []), ...(s.presets ?? [])],
  }
}

/** `false`/`true` shorthand → record; leaves `enabled` undefined for the object form so merge can tell "unset" apart. */
const normalizeAssetsOptions = (
  input: EngineOptionsCompilerAssets | undefined,
):
  | {
      enabled?: boolean
      extensions?: string[]
      defaultMode?: AssetResolveMode | false
      svgr?: AssetsSvgrOptions | false
    }
  | undefined => {
  if (input === undefined) return undefined
  if (input === false) return { enabled: false }
  if (input === true) return { enabled: true }
  return input
}

const mergeAssetsOptions = (
  general: EngineOptionsCompilerAssets | undefined,
  specific: EngineOptionsCompilerAssets | undefined,
): CompilerAssetsOptions | false => {
  const g = normalizeAssetsOptions(general)
  const s = normalizeAssetsOptions(specific)
  // Enabled defaults to on (a `compiler: true`/object side gets assets with defaults) unless a layer disables it.
  // Folding the gate in here means `compiler.assets` is already the final `CompilerAssetsOptions | false` the plugin
  // reads — no separate resolve step. Per-build dirs (`urlDir`/`fileDir`) are merged in later, at the build sites.
  if ((s?.enabled ?? g?.enabled ?? true) === false) return false
  // Specific overrides general field-by-field.
  return {
    extensions: s?.extensions ?? g?.extensions,
    defaultMode: s?.defaultMode ?? g?.defaultMode,
    // `svgr: false` (disable `?react`) can't be deep-merged — handle it explicitly. Specific disabling wins; a general
    // disable is overridden only by a specific object; otherwise merge the two option objects.
    svgr:
      s?.svgr === false
        ? false
        : g?.svgr === false
          ? (s?.svgr ?? false)
          : g?.svgr !== undefined || s?.svgr !== undefined
            ? { ...g?.svgr, ...s?.svgr }
            : undefined,
  }
}

const parsePublicdir = (input: EngineOptionsPublicdir, cwd: string): EngineOptionsPublicdirParsed => {
  if (typeof input === 'string') {
    return [['/', toAbsPath(cwd, input)]]
  }
  if (!Array.isArray(input)) {
    return Object.entries(input).map(([routePath, absPathOrResponseOrFn]) => [
      prependAndDeappendSlash(routePath),
      typeof absPathOrResponseOrFn === 'string' ? toAbsPath(cwd, absPathOrResponseOrFn) : absPathOrResponseOrFn,
    ])
  }
  const result: EngineOptionsPublicdirParsed = []
  for (const item of input) {
    if (typeof item === 'string') {
      result.push(...parsePublicdir(item, cwd))
      continue
    }
    if (!Array.isArray(item)) {
      result.push(...parsePublicdir(item, cwd))
      continue
    }
    result.push([prependAndDeappendSlash(item[0]), typeof item[1] === 'string' ? toAbsPath(cwd, item[1]) : item[1]])
  }
  return result
}

const parseEnv = (input: EngineOptionsEnvWide | EngineOptionsEnvStrict): EngineOptionsEnvParsed => {
  if (typeof input === 'string') {
    if (input.includes('*')) {
      // for (const key of Object.keys(process.env)) {
      //   if (minimatch(key, input)) {
      //     result[key] = process.env[key]
      //   }
      // }
      return Object.fromEntries(Object.entries(process.env).filter(([key]) => minimatch(key, input)))
    } else {
      return { [input]: process.env[input] }
    }
  }
  if (!Array.isArray(input)) {
    return input
  }
  const result: EngineOptionsEnvParsed = {}
  for (const item of input) {
    Object.assign(result, parseEnv(item))
  }
  return result
}

export const throwOnEmptyStringOrAsteriskEnv = (
  env: EngineOptionsEnvWide | EngineOptionsEnvStrict,
  errorSuffix: string,
): void => {
  if (typeof env === 'string') {
    if (env === '' || env === '*') {
      throw new Error(`Environment variable "${env}" is not allowed for ${errorSuffix}`)
    }
  }
  if (!Array.isArray(env)) {
    return
  }
  for (const item of env) {
    throwOnEmptyStringOrAsteriskEnv(item, errorSuffix)
  }
}

const isFileURL = (str: string): boolean => {
  try {
    // Check if it starts with a URL scheme (file://, http://, https://, etc.)
    if (/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(str)) {
      // Validate it's a proper URL
      const url = new URL(str)
      // fileURLToPath specifically works with file:// URLs
      return url.protocol === 'file:'
    }
    return false
  } catch {
    return false
  }
}

const parseEngineGeneralOptions = ({
  generalOptions,
  serverOptions,
  clientsOptions,
}: {
  generalOptions: EngineGeneralOptions
  serverOptions: EngineServerOptions<any, any>
  clientsOptions: EngineClientOptions[] | undefined
}): EngineGeneralOptionsParsed => {
  if (!generalOptions.file) {
    throw new Error('You should provide engine file path via file: import.meta.url, it is critical for engine to work')
  }
  // Convert file URL to path if needed, since we'll use it with nodePath functions
  const engineFile = isFileURL(generalOptions.file) ? fileURLToPath(generalOptions.file) : generalOptions.file
  const itWasBuilt = generalOptions.itWasBuilt ?? process.env.POINT0_ENGINE_WAS_BUILT === 'true'
  const { cwdAfterBuild, cwdBeforeBuild, cwd } = (() => {
    generalOptions.itWasBuilt ??= process.env.POINT0_ENGINE_WAS_BUILT === 'true'

    if (!itWasBuilt) {
      generalOptions.cwdBeforeBuild ??= nodePath.dirname(engineFile)
      serverOptions.outdir ||= 'dist'

      if (!generalOptions.cwdAfterBuild && generalOptions.cwdBeforeBuild && serverOptions.outdir) {
        if (!nodePath.isAbsolute(generalOptions.cwdBeforeBuild)) {
          throw new Error(
            `cwdBeforeBuild "${generalOptions.cwdBeforeBuild}" is not absolute, but should be, while tryin auto detect cwdAfterBuild`,
          )
        }
        generalOptions.cwdAfterBuild = nodePath.resolve(generalOptions.cwdBeforeBuild, serverOptions.outdir)
      }
    } else {
      if (!generalOptions.cwdBeforeBuild || !generalOptions.cwdAfterBuild) {
        const POINT0_ENGINE_CWD_BEFORE_BUILD_CUTTED = process.env.POINT0_ENGINE_CWD_BEFORE_BUILD ?? null
        const POINT0_ENGINE_CWD_AFTER_BUILD_CUTTED = process.env.POINT0_ENGINE_CWD_AFTER_BUILD ?? null
        if (!POINT0_ENGINE_CWD_BEFORE_BUILD_CUTTED || !POINT0_ENGINE_CWD_AFTER_BUILD_CUTTED || !engineFile) {
          throw new Error(
            `You should provide POINT0_ENGINE_CWD_BEFORE_BUILD and POINT0_ENGINE_CWD_AFTER_BUILD and engineFile if itWasBuilt is true and cwdBeforeBuild and cwdAfterBuild are not provided`,
          )
        }
        const CWD_AFTER_BUILD_CURRENT = nodePath.dirname(engineFile)
        if (!CWD_AFTER_BUILD_CURRENT.endsWith(POINT0_ENGINE_CWD_AFTER_BUILD_CUTTED)) {
          throw new Error(
            `POINT0_ENGINE_CWD_AFTER_BUILD_CUTTED "${POINT0_ENGINE_CWD_AFTER_BUILD_CUTTED}" is not a subdirectory of CWD_AFTER_BUILD_CURRENT "${CWD_AFTER_BUILD_CURRENT}"`,
          )
        }
        const localDir = CWD_AFTER_BUILD_CURRENT.replace(new RegExp(`${POINT0_ENGINE_CWD_AFTER_BUILD_CUTTED}$`), '')
        generalOptions.cwdBeforeBuild = nodePath.join(localDir, POINT0_ENGINE_CWD_BEFORE_BUILD_CUTTED)
        generalOptions.cwdAfterBuild = nodePath.join(localDir, POINT0_ENGINE_CWD_AFTER_BUILD_CUTTED)
      }
    }

    if (!generalOptions.cwdBeforeBuild && !generalOptions.cwdAfterBuild) {
      return { cwdAfterBuild: process.cwd(), cwdBeforeBuild: process.cwd(), cwd: process.cwd() }
    }
    if (!generalOptions.cwdAfterBuild || !generalOptions.cwdBeforeBuild) {
      throw new Error(`You should provide both cwdAfterBuild and cwdBeforeBuild, or non of them`)
    }
    if (itWasBuilt) {
      if (!nodePath.isAbsolute(generalOptions.cwdAfterBuild)) {
        throw new Error(
          `cwdAfterBuild "${generalOptions.cwdAfterBuild}" is not absolute, but should be, when itWasBuilt is true`,
        )
      }
      const cwdBeforeBuild = toAbsPath(generalOptions.cwdAfterBuild, generalOptions.cwdBeforeBuild)
      const cwdAfterBuild = generalOptions.cwdAfterBuild
      const cwd = cwdAfterBuild
      return { cwdAfterBuild, cwdBeforeBuild, cwd }
    }
    if (!nodePath.isAbsolute(generalOptions.cwdBeforeBuild)) {
      throw new Error(
        `cwdBeforeBuild "${generalOptions.cwdBeforeBuild}" is not absolute, but should be, when itWasBuilt is false`,
      )
    }
    const cwdBeforeBuild = generalOptions.cwdBeforeBuild
    const cwdAfterBuild = toAbsPath(generalOptions.cwdBeforeBuild, generalOptions.cwdAfterBuild)
    const cwd = cwdBeforeBuild
    return { cwdAfterBuild, cwdBeforeBuild, cwd }
  })()
  const ssr = normalizeSsrEnabled(generalOptions.ssr)
  const ssrOptions: SsrOptionsResolved = {
    ...defaultSsrOptionsResolved,
    ...pickSsrOptionsPartial(generalOptions.ssr),
  }
  const compiler =
    generalOptions.compiler === undefined
      ? null
      : generalOptions.compiler === false
        ? false
        : generalOptions.compiler === true
          ? true
          : {
              ...(generalOptions.compiler.cache !== undefined ? { cache: generalOptions.compiler.cache } : {}),
              ...(generalOptions.compiler.consts ? { consts: generalOptions.compiler.consts } : {}),
              ...(generalOptions.compiler.filter ? { filter: generalOptions.compiler.filter } : {}),
              ...(generalOptions.compiler.mode !== undefined ? { mode: generalOptions.compiler.mode } : {}),
              ...(generalOptions.compiler.runtime !== undefined ? { runtime: generalOptions.compiler.runtime } : {}),
              ...(generalOptions.compiler.os !== undefined ? { os: generalOptions.compiler.os } : {}),
              ...(generalOptions.compiler.scope !== undefined ? { scope: generalOptions.compiler.scope } : {}),
              ...(generalOptions.compiler.side !== undefined ? { side: generalOptions.compiler.side } : {}),
              ...(generalOptions.compiler.markdown !== undefined ? { markdown: generalOptions.compiler.markdown } : {}),
              ...(generalOptions.compiler.babel !== undefined ? { babel: generalOptions.compiler.babel } : {}),
              ...(generalOptions.compiler.assets !== undefined ? { assets: generalOptions.compiler.assets } : {}),
              ...(generalOptions.compiler.ssr !== undefined
                ? { ssr: generalOptions.compiler.ssr }
                : ssr !== undefined
                  ? { ssr }
                  : {}),
            }
  const providedGenerate = generalOptions.generate
  const scopes = [
    ...new Set([serverOptions.scope, clientsOptions?.map((client) => client.scope)].filter(Boolean)),
  ] as string[]
  const generate = !providedGenerate
    ? []
    : Array.isArray(providedGenerate)
      ? providedGenerate
      : FilesGenerator.simpleGeneralConfigToTasks({
          config: providedGenerate,
          scopes,
          // Single source of truth for the d.ts: the general `compiler.assets` (extensions + defaultMode). The bare
          // import's declared type follows defaultMode, so both must flow into the generator.
          assetsDefaults: (() => {
            // Effective general assets: nested `compiler.assets` wins over the top-level `assets`, mirroring the merge.
            const a =
              compiler && typeof compiler === 'object' && compiler.assets !== undefined
                ? compiler.assets
                : generalOptions.assets
            return a && typeof a === 'object' ? { extensions: a.extensions, defaultMode: a.defaultMode } : undefined
          })(),
          engine: {
            file: engineFile,
            server: { scope: serverOptions.scope },
            clients: clientsOptions?.map((client) => ({ scope: client.scope })),
          },
        })
  // The object form gives `log` synchronously; the function form is resolved later, during preload
  // (after bun plugins), so a custom logger imported inside it goes through the compiler transforms.
  const logger = generalOptions.logger
  const log: LogFn = typeof logger === 'function' ? _defaultLogFn : (logger?.log ?? _defaultLogFn)
  const result = {
    log,
    logger,
    itWasBuilt,
    cwdAfterBuild,
    cwdBeforeBuild,
    engineFile,
    cwd,
    autoFixBuiltPaths: generalOptions.autoFixBuiltPaths ?? true,
    banner: generalOptions.banner ?? null,
    compiler,
    generate,
  }
  return {
    ...result,
    bunBuildConfig: generalOptions.bunBuildConfig ?? null,
    bunPlugins: generalOptions.bunPlugins ?? [],
    viteConfig:
      typeof generalOptions.viteConfig === 'string'
        ? toFinalPath({
            ...result,
            relPathAfterBuild: null,
            cwdIfWasBuilt: null,
            path: generalOptions.viteConfig,
          })
        : (generalOptions.viteConfig ?? null),
    clientsOutdir: toFinalPath({
      ...result,
      cwdIfWasBuilt: null,
      path: generalOptions.clientsOutdir,
    }),
    pointsGlob: (!generalOptions.pointsGlob
      ? []
      : Array.isArray(generalOptions.pointsGlob)
        ? generalOptions.pointsGlob
        : [generalOptions.pointsGlob]
    ).map((g) => toAbsPath(cwd, g, true)),
    buildWatchGlob: (!generalOptions.buildWatchGlob
      ? []
      : Array.isArray(generalOptions.buildWatchGlob)
        ? generalOptions.buildWatchGlob
        : [generalOptions.buildWatchGlob]
    ).map((g) => toAbsPath(cwd, g, true)),
    ssr,
    ssrOptions,
    assets: generalOptions.assets,
  }
}

const toFinalPath = <T extends string | null | undefined>({
  autoFixBuiltPaths,
  itWasBuilt,
  cwdAfterBuild,
  cwdBeforeBuild,
  cwdIfWasBuilt,
  path,
  relPathAfterBuild,
  omitDirAfterBuild,
}: {
  autoFixBuiltPaths: boolean
  itWasBuilt: boolean
  cwdAfterBuild: string
  cwdBeforeBuild: string
  cwdIfWasBuilt: string | null | undefined
  path: T
  relPathAfterBuild?: string | null
  omitDirAfterBuild?: boolean
}): T extends null | undefined ? null : T => {
  if (!path) {
    return (path ?? null) as T extends null | undefined ? null : T
  }

  if (!path.startsWith('.')) {
    return path as T extends null | undefined ? null : T
  }

  const pathBeforeBuildAbs = nodePath.resolve(cwdBeforeBuild, path)

  if (!itWasBuilt) {
    return pathBeforeBuildAbs as T extends null | undefined ? null : T
  }
  if (!autoFixBuiltPaths) {
    return toAbsPath(cwdAfterBuild, path) as T extends null | undefined ? null : T
  }

  if (relPathAfterBuild === null) {
    return null as T extends null | undefined ? null : T
  }

  const cwdAfterBuildFinal = cwdIfWasBuilt ? nodePath.resolve(cwdBeforeBuild, cwdIfWasBuilt) : cwdBeforeBuild

  if (relPathAfterBuild) {
    const fixedPath = nodePath.resolve(cwdAfterBuildFinal, toJsExtension(relPathAfterBuild))
    return nodePath.resolve(cwdAfterBuildFinal, fixedPath) as T extends null | undefined ? null : T
  }

  if (omitDirAfterBuild && !nodePath.isAbsolute(path)) {
    const fixedPath = toJsExtension(nodePath.basename(path))
    return nodePath.resolve(cwdAfterBuildFinal, fixedPath) as T extends null | undefined ? null : T
  }

  const fixedPath = toJsExtension(path)
  return nodePath.resolve(cwdAfterBuildFinal, fixedPath) as T extends null | undefined ? null : T
}

// const toFinalDistPath = <T extends string | null | undefined>({
//   autoFixBuiltPaths,
//   cwdAfterBuild,
//   cwdBeforeBuild,
//   cwdIfWasBuilt,
//   path,
//   relPathAfterBuild,
//   omitDirAfterBuild,
// }: {
//   autoFixBuiltPaths: boolean
//   cwdAfterBuild: string
//   cwdBeforeBuild: string
//   cwdIfWasBuilt: string | null | undefined
//   path: T
//   relPathAfterBuild?: string | null
//   omitDirAfterBuild?: boolean
// }): T extends null | undefined ? null : T => {
//   if (!path) {
//     return (path ?? null) as T extends null | undefined ? null : T
//   }

//   if (!autoFixBuiltPaths) {
//     return toAbsPath(cwdAfterBuild, path) as T extends null | undefined ? null : T
//   }

//   if (relPathAfterBuild === null) {
//     return null as T extends null | undefined ? null : T
//   }

//   const cwdAfterBuildFinal = cwdIfWasBuilt ? nodePath.resolve(cwdBeforeBuild, cwdIfWasBuilt) : cwdBeforeBuild

//   if (relPathAfterBuild) {
//     const fixedPath = nodePath.resolve(cwdAfterBuildFinal, toJsExtension(relPathAfterBuild))
//     return nodePath.resolve(cwdAfterBuildFinal, fixedPath) as T extends null | undefined ? null : T
//   }

//   if (omitDirAfterBuild && !nodePath.isAbsolute(path)) {
//     const fixedPath = toJsExtension(nodePath.basename(path))
//     return nodePath.resolve(cwdAfterBuildFinal, fixedPath) as T extends null | undefined ? null : T
//   }

//   const fixedPath = toJsExtension(path)
//   return nodePath.resolve(cwdAfterBuildFinal, fixedPath) as T extends null | undefined ? null : T
// }

export const parseEngineServerOptions = ({
  serverOptions,
  generalOptionsParsed,
}: {
  serverOptions: EngineServerOptions
  clientsOptions: EngineClientOptions[]
  generalOptionsParsed: EngineGeneralOptionsParsed
}): EngineServerOptionsParsed => {
  const port = typeof serverOptions.port !== 'undefined' ? Number(serverOptions.port) : 3000
  const hmrPort =
    serverOptions.hmrPort === false
      ? false
      : typeof serverOptions.hmrPort !== 'undefined' && serverOptions.hmrPort !== true
        ? Number(serverOptions.hmrPort)
        : port + 100
  const entriesRecordInput =
    typeof serverOptions.entry === 'string' ? { main: serverOptions.entry } : serverOptions.entry
  const outdir = toFinalPath({
    ...generalOptionsParsed,
    cwdIfWasBuilt: null,
    path: serverOptions.outdir,
  })
  const publicdirOutdir = toFinalPath({
    ...generalOptionsParsed,
    cwdIfWasBuilt: null,
    path: serverOptions.publicdir?.outdir,
  })
  const publicdirSource: PublicdirDefinition =
    !generalOptionsParsed.autoFixBuiltPaths || !generalOptionsParsed.itWasBuilt
      ? parsePublicdir(serverOptions.publicdir?.source ?? [], generalOptionsParsed.cwd)
      : publicdirOutdir && serverOptions.publicdir?.source
        ? [['/', publicdirOutdir]]
        : []
  const publicdir = publicdirOutdir ? { source: publicdirSource, outdir: publicdirOutdir } : null
  const publicdirCacheLimitInput = serverOptions.publicdir?.cacheLimit
  const publicdirCacheLimit =
    publicdirCacheLimitInput === false || publicdirCacheLimitInput === 0
      ? 0
      : publicdirCacheLimitInput === true || typeof publicdirCacheLimitInput === 'undefined'
        ? true
        : Math.max(0, Math.floor(publicdirCacheLimitInput))
  const entriesRecord = entriesRecordInput
    ? Object.fromEntries(
        Object.entries(entriesRecordInput).map(([key, value]) => [
          key,
          toFinalPath({ ...generalOptionsParsed, cwdIfWasBuilt: outdir, path: value, omitDirAfterBuild: true }),
        ]),
      )
    : null
  const generalOptionsParsedCompilerRecord =
    typeof generalOptionsParsed.compiler === 'object' && generalOptionsParsed.compiler !== null
      ? generalOptionsParsed.compiler
      : {}
  const serverOptionsCompilerRecord = typeof serverOptions.compiler === 'object' ? serverOptions.compiler : {}
  const ssr =
    typeof serverOptions.ssr !== 'undefined'
      ? (normalizeSsrEnabled(serverOptions.ssr) ?? false)
      : generalOptionsParsed.ssr !== undefined
        ? generalOptionsParsed.ssr
        : false
  const mergedCompilerRecord = {
    side: true,
    scope: true,
    mode: true,
    filter: undefined,
    ...generalOptionsParsedCompilerRecord,
    ...serverOptionsCompilerRecord,
    runtime:
      generalOptionsParsedCompilerRecord.runtime === false ? false : (serverOptionsCompilerRecord.runtime ?? false),
    cache: serverOptionsCompilerRecord.cache ?? generalOptionsParsedCompilerRecord.cache ?? true,
    os: generalOptionsParsedCompilerRecord.os === false ? false : (serverOptionsCompilerRecord.os ?? false),
    consts: [
      ...(generalOptionsParsedCompilerRecord.consts
        ? Array.isArray(generalOptionsParsedCompilerRecord.consts)
          ? generalOptionsParsedCompilerRecord.consts
          : [generalOptionsParsedCompilerRecord.consts]
        : []),
      ...(serverOptionsCompilerRecord.consts
        ? Array.isArray(serverOptionsCompilerRecord.consts)
          ? serverOptionsCompilerRecord.consts
          : [serverOptionsCompilerRecord.consts]
        : []),
    ],
    markdown: mergeMarkdownOptions(generalOptionsParsedCompilerRecord.markdown, serverOptionsCompilerRecord.markdown),
    babel: mergeBabelOptions(generalOptionsParsedCompilerRecord.babel, serverOptionsCompilerRecord.babel),
    assets: mergeAssetsOptions(
      generalOptionsParsedCompilerRecord.assets ?? generalOptionsParsed.assets,
      serverOptionsCompilerRecord.assets ?? serverOptions.assets,
    ),
    ssr:
      serverOptionsCompilerRecord.ssr !== undefined
        ? serverOptionsCompilerRecord.ssr
        : generalOptionsParsedCompilerRecord.ssr !== undefined
          ? generalOptionsParsedCompilerRecord.ssr
          : ssr,
    importer:
      serverOptionsCompilerRecord.importer !== undefined
        ? {
            ...serverOptionsCompilerRecord.importer,
            cwd: serverOptionsCompilerRecord.importer.cwd ?? generalOptionsParsed.cwd,
          }
        : serverOptions.importer !== undefined
          ? {
              ...serverOptions.importer,
              cwd: serverOptions.importer.cwd ?? generalOptionsParsed.cwd,
            }
          : {
              cwd: generalOptionsParsed.cwd,
            },
  } satisfies EngineOptionsCompilerSpecificParsed
  const compiler =
    serverOptions.compiler === false
      ? (false as const)
      : serverOptions.compiler === true
        ? {
            side: true,
            scope: true,
            mode: true,
            runtime: false as const,
            os: false as const,
            consts: mergedCompilerRecord.consts,
            filter: mergedCompilerRecord.filter,
            ssr: mergedCompilerRecord.ssr,
            importer: mergedCompilerRecord.importer,
            cache: mergedCompilerRecord.cache,
            markdown: mergedCompilerRecord.markdown,
            babel: mergedCompilerRecord.babel,
            assets: mergedCompilerRecord.assets,
          }
        : serverOptions.compiler !== undefined
          ? mergedCompilerRecord
          : generalOptionsParsed.compiler === false
            ? false
            : mergedCompilerRecord
  if (compiler) {
    compiler.consts = [...normalizeEnvConsts(compiler.consts), ...normalizeEnvConsts(serverOptions.env?.consts ?? {})]
  }
  const providedGenerate = serverOptions.generate
  const generate = !providedGenerate
    ? []
    : Array.isArray(providedGenerate)
      ? providedGenerate
      : FilesGenerator.simpleServerConfigToTasks({ config: providedGenerate, scope: serverOptions.scope })
  const devWatchGlob = (
    !serverOptions.devWatchGlob
      ? []
      : Array.isArray(serverOptions.devWatchGlob)
        ? serverOptions.devWatchGlob
        : [serverOptions.devWatchGlob]
  ).map((g) => toAbsPath(generalOptionsParsed.cwd, g, true))
  return {
    scope: serverOptions.scope,
    pointsProvided: serverOptions.points ?? [Point0.lets('root', serverOptions.scope).root()],
    port,
    hmrPort,
    outdir,
    entry: entriesRecord,
    publicdir: publicdir ? { ...publicdir, cacheLimit: publicdirCacheLimit } : null,
    engineFile: generalOptionsParsed.engineFile,
    cwdBeforeBuild: generalOptionsParsed.cwdBeforeBuild,
    itWasBuilt: generalOptionsParsed.itWasBuilt,
    bunBuildConfig: serverOptions.bunBuildConfig ?? {},
    bunPlugins: serverOptions.bunPlugins ?? [],
    bunServeConfig: serverOptions.bunServeConfig ?? null,
    compiler,
    envVars: parseEnv(serverOptions.env?.vars ?? {}),
    envConsts: parseEnv(serverOptions.env?.consts ?? {}),
    routesProvided: serverOptions.routes ?? null,
    generate,
    banner: serverOptions.banner ?? null,
    viteConfig:
      typeof serverOptions.viteConfig === 'string'
        ? toFinalPath({
            ...generalOptionsParsed,
            relPathAfterBuild: null,
            cwdIfWasBuilt: null,
            path: serverOptions.viteConfig,
          })
        : (serverOptions.viteConfig ?? generalOptionsParsed.viteConfig ?? null),
    ssr,
    devWatchGlob,
  }
}
const parseEngineClientOptions = ({
  index,
  clientOptions,
  serverOptionsParsed,
  generalOptionsParsed,
}: {
  index: number
  clientOptions: EngineClientOptions
  serverOptionsParsed: EngineServerOptionsParsed
  generalOptionsParsed: EngineGeneralOptionsParsed
}): EngineClientOptionsParsed => {
  const port =
    typeof clientOptions.port !== 'undefined' ? Number(clientOptions.port) : serverOptionsParsed.port + index + 1
  const hmrPort =
    clientOptions.hmrPort === false
      ? false
      : typeof clientOptions.hmrPort !== 'undefined' && clientOptions.hmrPort !== true
        ? Number(clientOptions.hmrPort)
        : port + 100
  const outdir = toFinalPath({
    ...generalOptionsParsed,
    cwdIfWasBuilt: null,
    path: clientOptions.outdir ?? null,
  })
  const publicdirOutdir = toFinalPath({
    ...generalOptionsParsed,
    cwdIfWasBuilt: null,
    path: clientOptions.publicdir?.outdir,
  })
  const publicdirSource: PublicdirDefinition =
    !generalOptionsParsed.autoFixBuiltPaths || !generalOptionsParsed.itWasBuilt
      ? parsePublicdir(clientOptions.publicdir?.source ?? [], generalOptionsParsed.cwd)
      : publicdirOutdir && clientOptions.publicdir?.source
        ? [['/', publicdirOutdir]]
        : []
  const publicdirCacheLimitInput = clientOptions.publicdir?.cacheLimit
  const publicdirCacheLimit =
    publicdirCacheLimitInput === false || publicdirCacheLimitInput === 0
      ? 0
      : publicdirCacheLimitInput === true || typeof publicdirCacheLimitInput === 'undefined'
        ? true
        : Math.max(0, Math.floor(publicdirCacheLimitInput))
  const publicdir = publicdirOutdir
    ? { source: publicdirSource, outdir: publicdirOutdir, cacheLimit: publicdirCacheLimit }
    : null
  const generalOptionsParsedCompilerRecord =
    typeof generalOptionsParsed.compiler === 'object' && generalOptionsParsed.compiler !== null
      ? generalOptionsParsed.compiler
      : {}
  const clientOptionsCompilerRecord = typeof clientOptions.compiler === 'object' ? clientOptions.compiler : {}
  const ssr =
    typeof clientOptions.ssr !== 'undefined'
      ? (normalizeSsrEnabled(clientOptions.ssr) ?? false)
      : generalOptionsParsed.ssr !== undefined
        ? generalOptionsParsed.ssr
        : false
  const ssrOptions: SsrOptionsResolved = {
    ...generalOptionsParsed.ssrOptions,
    ...pickSsrOptionsPartial(clientOptions.ssr),
  }
  const mergedCompilerRecord = {
    side: true,
    scope: true,
    mode: true,
    filter: undefined,
    ...generalOptionsParsedCompilerRecord,
    ...clientOptionsCompilerRecord,
    runtime:
      generalOptionsParsedCompilerRecord.runtime === false ? false : (clientOptionsCompilerRecord.runtime ?? false),
    os: generalOptionsParsedCompilerRecord.os === false ? false : (clientOptionsCompilerRecord.os ?? false),
    cache: clientOptionsCompilerRecord.cache ?? generalOptionsParsedCompilerRecord.cache ?? true,
    consts: [
      ...(generalOptionsParsedCompilerRecord.consts
        ? Array.isArray(generalOptionsParsedCompilerRecord.consts)
          ? generalOptionsParsedCompilerRecord.consts
          : [generalOptionsParsedCompilerRecord.consts]
        : []),
      ...(clientOptionsCompilerRecord.consts
        ? Array.isArray(clientOptionsCompilerRecord.consts)
          ? clientOptionsCompilerRecord.consts
          : [clientOptionsCompilerRecord.consts]
        : []),
    ],
    markdown: mergeMarkdownOptions(generalOptionsParsedCompilerRecord.markdown, clientOptionsCompilerRecord.markdown),
    babel: mergeBabelOptions(generalOptionsParsedCompilerRecord.babel, clientOptionsCompilerRecord.babel),
    assets: mergeAssetsOptions(
      generalOptionsParsedCompilerRecord.assets ?? generalOptionsParsed.assets,
      clientOptionsCompilerRecord.assets ?? clientOptions.assets,
    ),
    ssr:
      clientOptionsCompilerRecord.ssr !== undefined
        ? clientOptionsCompilerRecord.ssr
        : generalOptionsParsedCompilerRecord.ssr !== undefined
          ? generalOptionsParsedCompilerRecord.ssr
          : ssr,
    importer:
      clientOptionsCompilerRecord.importer !== undefined
        ? {
            ...clientOptionsCompilerRecord.importer,
            cwd: clientOptionsCompilerRecord.importer.cwd ?? generalOptionsParsed.cwd,
          }
        : clientOptions.importer !== undefined
          ? {
              ...clientOptions.importer,
              cwd: clientOptions.importer.cwd ?? generalOptionsParsed.cwd,
            }
          : {
              cwd: generalOptionsParsed.cwd,
            },
  } satisfies EngineOptionsCompilerSpecificParsed
  const compiler =
    clientOptions.compiler === false
      ? false
      : clientOptions.compiler === true
        ? {
            side: true,
            scope: true,
            mode: true,
            runtime: false as const,
            os: false as const,
            consts: mergedCompilerRecord.consts,
            filter: mergedCompilerRecord.filter,
            ssr: mergedCompilerRecord.ssr,
            importer: mergedCompilerRecord.importer,
            cache: mergedCompilerRecord.cache,
            markdown: mergedCompilerRecord.markdown,
            babel: mergedCompilerRecord.babel,
            assets: mergedCompilerRecord.assets,
          }
        : clientOptions.compiler !== undefined
          ? mergedCompilerRecord
          : generalOptionsParsed.compiler === false
            ? false
            : mergedCompilerRecord
  if (compiler) {
    compiler.consts = [...normalizeEnvConsts(compiler.consts), ...normalizeEnvConsts(clientOptions.env?.consts ?? {})]
  }
  const providedGenerate = clientOptions.generate
  const generate = !providedGenerate
    ? []
    : Array.isArray(providedGenerate)
      ? providedGenerate
      : FilesGenerator.simpleClientConfigToTasks({ config: providedGenerate, scope: clientOptions.scope })
  throwOnEmptyStringOrAsteriskEnv(clientOptions.env?.vars ?? {}, 'client env vars config')
  throwOnEmptyStringOrAsteriskEnv(clientOptions.env?.consts ?? {}, 'client env consts config')
  return {
    scope: clientOptions.scope,
    compiler,
    pointsProvided: clientOptions.points ?? null,
    serving: clientOptions.serving ?? true,
    routesProvided: clientOptions.routes ?? null,
    generate,
    banner: clientOptions.banner ?? null,
    // pointsDistFile:
    //   typeof clientOptions.points === 'string'
    //     ? toFinalDistPath({
    //         ...generalOptionsParsed,
    //         cwdIfWasBuilt: serverOutdir,
    //         relPathAfterBuild: clientOptions.viteConfig ? './points.js' : undefined,
    //         path: clientOptions.points,
    //         omitDirAfterBuild: true,
    //       })
    //     : null,
    appProvided: clientOptions.app ?? null,
    // appDistFile:
    //   typeof clientOptions.app === 'string'
    //     ? toFinalDistPath({
    //         ...generalOptionsParsed,
    //         cwdIfWasBuilt: serverOutdir,
    //         relPathAfterBuild: clientOptions.viteConfig ? './app.js' : undefined,
    //         path: clientOptions.app,
    //         omitDirAfterBuild: true,
    //       })
    //     : null,
    domRootElementId: clientOptions.domRootElementId || 'root',
    port,
    hmrPort,
    index,
    envVars: parseEnv(clientOptions.env?.vars ?? {}),
    envConsts: parseEnv(clientOptions.env?.consts ?? {}),
    viteConfig:
      typeof clientOptions.viteConfig === 'string'
        ? toFinalPath({
            ...generalOptionsParsed,
            relPathAfterBuild: null,
            cwdIfWasBuilt: null,
            path: clientOptions.viteConfig,
          })
        : (clientOptions.viteConfig ?? generalOptionsParsed.viteConfig ?? null),
    outdir,
    indexHtml: toFinalPath({
      ...generalOptionsParsed,
      cwdIfWasBuilt: outdir,
      relPathAfterBuild: clientOptions.indexHtml ? nodePath.basename(clientOptions.indexHtml) : undefined,
      path: clientOptions.indexHtml,
    }),
    // indexHtmlDistFile: toFinalDistPath({
    //   ...generalOptionsParsed,
    //   cwdIfWasBuilt: outdir,
    //   relPathAfterBuild: './index.html',
    //   path: clientOptions.indexHtml,
    // }),
    publicdir,
    bunBuildConfig: clientOptions.bunBuildConfig ?? {},
    bunPlugins: clientOptions.bunPlugins ?? [],
    engineFile: generalOptionsParsed.engineFile,
    ssr,
    ssrOptions,
  }
}

export const parseEngineOptions = (options: EngineOptions<any, any>): EngineOptionsParsed => {
  const {
    server: serverOptions = { scope: 'root', ssr: false },
    client: clientOptionShorthand,
    clients: clientsOptionsRaw,
    ...generalOptions
  } = options
  const clientsOptions = [...(clientOptionShorthand ? [clientOptionShorthand] : []), ...(clientsOptionsRaw ?? [])]
  const generalOptionsParsed = parseEngineGeneralOptions({
    generalOptions,
    serverOptions,
    clientsOptions,
  })
  const serverOptionsParsed = parseEngineServerOptions({
    serverOptions,
    clientsOptions,
    generalOptionsParsed,
  })
  const clientsOptionsParsed = clientsOptions.map((clientOptions, index) =>
    parseEngineClientOptions({
      index,
      clientOptions,
      serverOptionsParsed,
      generalOptionsParsed,
    }),
  )
  const routes = {
    [serverOptionsParsed.scope]: serverOptionsParsed.routesProvided,
    ...Object.fromEntries(
      clientsOptionsParsed.map((clientOptions) => [clientOptions.scope, clientOptions.routesProvided]),
    ),
  } satisfies Record<string, EngineOptionsRoutes | null>
  return {
    general: generalOptionsParsed,
    server: serverOptionsParsed,
    clients: clientsOptionsParsed,
    routes,
  }
}
