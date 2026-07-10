import type { AnyRoute } from '@1gr14/route0'
import { type AnyLocation, Route0 } from '@1gr14/route0'
import type { CompilerOptions } from '@point0/compiler'
import type { StaticCompilerRef } from '@point0/compiler/plugin/bun-static'
import { FileResolver, resolveTempDirPath, toPosixPath } from '@point0/compiler'
import type {
  AppComponent,
  ErrorPoint0,
  LogFn,
  NormalizedNodeEnv,
  PointsDefinitionSource,
  PointsScope,
  RequiredCtx,
  PagePoint,
} from '@point0/core'
import {
  _point0_env,
  ClientPoints,
  POINT0_ASSETS_DIR_NAME,
  POINT0_ENV_VARS_GLOBAL,
  POINT0_INTERNAL_PATH_PREFIX,
  PointsSourceNotReadyError,
} from '@point0/core'
import type { SsrTarget } from '@point0/core'
import type { Request0 } from '@point0/core/request0'
import { toFetchResponse, toReqRes } from 'fetch-to-node'
import * as nodeFs from 'node:fs/promises'
import * as nodePath from 'node:path'
import { renderToReadableStream } from 'react-dom/server'
import type { ViteDevServer } from 'vite'
import { fixDistIndexHtmlBootstrapEntryByBunMetafile } from './client.bun-build-fix.js'
import type {
  EngineOptionsAppComponent,
  EngineOptionsCompilerSpecificParsed,
  EngineOptionsEnvParsed,
  EngineOptionsServing,
  EngineOptionsViteConfig,
  ExtractedViteConfig,
  SsrOptionsResolved,
} from './config.js'
import type { Executor } from './executor.js'
import { isDevShuttingDown, registerDevChild, requestDevShutdown } from './dev-shutdown.js'
import { POINT0_FORWARDED_FROM_DEV_CLIENT_HEADER, POINT0_MIDDLEWARE_CHECK_FROM_SERVER_HEADER } from './protocol.js'
import type { PublicdirDefinition } from './publicdir.js'
import { Publicdir } from './publicdir.js'
import {
  computeClientBuildVersion,
  getClientBuildVersionPathSegments,
  type ClientBuildVersionFile,
} from './client-build-version.js'
import {
  collectClientBuildHashedFiles,
  getClientBuildAssetsPathSegments,
  type ClientBuildAssetsFile,
} from './client-build-assets.js'
import {
  buildPreloadManifest,
  chunkGraphFromBunMetafile,
  chunkGraphFromRollup,
  getPreloadManifestPathSegments,
  isModulePreloadDisabledByEnv,
  resolvePreloadsForPoint,
  resolveRscComponentPreloads,
  shouldServeModulePreload,
  type ChunkGraph,
  type PagePreloadSources,
  type PreloadManifest,
  type RollupChunkLike,
} from './preload-manifest.js'
import {
  addClientBuildToDocumentHtml,
  buildEnvConstsScriptBody,
  ENV_CONSTS_SCRIPT_ID,
  renderAppAsReadableStream,
  renderDocumentShellHtml,
} from './render.js'
import { type ServerHotStore } from './server-hot-store.js'
import { chainBundledSourceMaps } from './sourcemap-chain.js'
import type { EngineServer } from './server.js'
import type {
  EngineClientBuildConfigDefinition,
  EngineClientPluginsDefinition,
  EngineSharedPluginsDefinition,
} from './utils.js'
import {
  createViteDevServer,
  extractEngineClientBuildConfig,
  extractEngineClientDevPluginsStrings,
  extractViteConfig,
  fetchRetryingConnectionRefused,
  getViteRoot,
  isAsyncFn,
  normalizeAndValidateNodeEnv,
  pipeStreamStripped,
  readableStreamToString,
  registerOnProcessExit,
  stripTerminalClearSequences,
} from './utils.js'

export class EngineClient<TPrepared extends boolean, TError extends ErrorPoint0> {
  cwd: string
  scope: PointsScope
  engineFile: string | null
  // pointsDistFile: string | null
  pointsProvided: PointsDefinitionSource<any, any> | null
  points: TPrepared extends true ? ClientPoints<TError> | null : undefined
  ssrDefaultOptions: SsrOptionsResolved
  appProvided: EngineOptionsAppComponent | null
  App: TPrepared extends true ? AppComponent | null : undefined
  // appDistFile: string | null
  basePath: AnyRoute | undefined
  serving: EngineOptionsServing
  indexHtml: string | null
  // indexHtmlDistFile: string | null
  domRootElementId: string
  port: number
  hmrPort: number | false
  compiler: EngineOptionsCompilerSpecificParsed | false
  viteConfig: EngineOptionsViteConfig | null
  index: number
  log: LogFn
  envVars: EngineOptionsEnvParsed
  envConsts: EngineOptionsEnvParsed
  publicdir: TPrepared extends true ? Publicdir<true, TError> | null : Publicdir<false, TError> | null
  outdir: string | null
  bunBuildConfig: EngineClientBuildConfigDefinition
  bunPlugins: EngineClientPluginsDefinition
  generalBunPlugins: EngineSharedPluginsDefinition
  distIndexHtmlContent: string | null
  server: EngineServer<any, TError>
  // clientBunDevBuilder: Bun.Subprocess<'inherit', 'inherit', 'inherit'> | null
  // serverBunDevBuilder: Bun.Subprocess<'inherit', 'inherit', 'inherit'> | null
  viteDevServer: ViteDevServer | true | null
  bunNativeDevServer: Bun.Subprocess | true | null // true in case if it was run in separate process
  bunViteDevServer: Bun.Server<unknown> | true | null // true in case if it was run in separate process
  prepared: TPrepared
  envVarsApplied = false
  /**
   * Server-dev hot-reload binding (CHILD side). Set by {@link bindHotStore} when the stable dev child runs in hot mode:
   * `readPoints` re-imports THIS client's points aggregator from the content-addressed store (per request, gated by the
   * manifest hash) so SSR renders the fresh page/layout modules. Both null in build/prod/normal dev; `hotAggregatorAbs`
   * is null when the `points` source isn't a resolvable dynamic import (then this client stays on `pointsProvided`).
   */
  hotStore: ServerHotStore | null = null
  hotAggregatorAbs: string | null = null

  private constructor(input: {
    scope: PointsScope
    prepared: TPrepared
    cwd: string
    // pointsDistFile: string | null
    pointsProvided: PointsDefinitionSource<any, TError> | null
    appProvided: EngineOptionsAppComponent | null
    // appDistFile: string | null
    serving: EngineOptionsServing
    indexHtml: string | null
    // indexHtmlDistFile: string | null
    engineFile: string | null
    outdir: string | null
    bunBuildConfig: EngineClientBuildConfigDefinition
    bunPlugins: EngineClientPluginsDefinition
    generalBunPlugins: EngineSharedPluginsDefinition
    distIndexHtmlContent: string | null
    domRootElementId: string
    port: number
    hmrPort: number | false
    compiler: EngineOptionsCompilerSpecificParsed | false
    viteConfig: EngineOptionsViteConfig | null
    index: number
    log: LogFn
    envVars: EngineOptionsEnvParsed
    envConsts: EngineOptionsEnvParsed
    publicdir: Publicdir<boolean, TError> | null
    bunNativeDevServer: Bun.Subprocess | true | null // true in case if it was run in separate process
    bunViteDevServer: Bun.Server<unknown> | true | null // true in case if it was run in separate process
    viteDevServer: ViteDevServer | true | null
    server: EngineServer<any, TError>
    ssrDefaultOptions: SsrOptionsResolved
  }) {
    this.scope = input.scope
    this.cwd = input.cwd
    // this.pointsDistFile = input.pointsDistFile
    this.points = null as TPrepared extends true ? ClientPoints<TError> | null : undefined
    this.pointsProvided = input.pointsProvided
    this.appProvided = input.appProvided
    // this.appDistFile = input.appDistFile
    this.basePath = undefined
    this.serving = input.serving
    this.indexHtml = input.indexHtml
    // this.indexHtmlDistFile = input.indexHtmlDistFile
    this.distIndexHtmlContent = input.distIndexHtmlContent
    this.domRootElementId = input.domRootElementId
    this.port = input.port
    this.hmrPort = input.hmrPort
    this.compiler = input.compiler
    this.viteConfig = input.viteConfig
    this.index = input.index
    this.log = input.log
    this.envVars = {
      ...input.envVars,
    }
    this.envConsts = {
      ...input.envConsts,
    }
    this.publicdir = input.publicdir as TPrepared extends true
      ? Publicdir<true, TError> | null
      : Publicdir<false, TError> | null
    this.outdir = input.outdir
    this.bunBuildConfig = input.bunBuildConfig
    this.bunPlugins = input.bunPlugins
    this.generalBunPlugins = input.generalBunPlugins
    // this.clientBunDevBuilder = input.clientBunDevBuilder
    // this.serverBunDevBuilder = input.serverBunDevBuilder
    this.viteDevServer = input.viteDevServer
    this.bunNativeDevServer = input.bunNativeDevServer
    this.bunViteDevServer = input.bunViteDevServer
    this.server = input.server
    this.prepared = input.prepared
    this.engineFile = input.engineFile
    this.ssrDefaultOptions = input.ssrDefaultOptions
    this.App = undefined as TPrepared extends true ? AppComponent | null : undefined
  }

  static create<TError extends ErrorPoint0>(input: {
    scope: PointsScope
    cwd: string
    pointsProvided: PointsDefinitionSource<any, TError> | null
    // pointsDistFile: string | null
    appProvided: EngineOptionsAppComponent | null
    // appDistFile: string | null
    serving: EngineOptionsServing
    publicdir: {
      source: PublicdirDefinition
      outdir: string
      cacheLimit: number | boolean
    } | null
    outdir: string | null
    bunBuildConfig: EngineClientBuildConfigDefinition
    bunPlugins: EngineClientPluginsDefinition
    generalBunPlugins: EngineSharedPluginsDefinition
    indexHtml: string | null
    // indexHtmlDistFile: string | null
    domRootElementId: string
    port: number
    hmrPort: number | false
    index: number
    log: LogFn
    envVars: EngineOptionsEnvParsed
    envConsts: EngineOptionsEnvParsed
    engineFile: string | null
    viteConfig: EngineOptionsViteConfig | null
    compiler: EngineOptionsCompilerSpecificParsed | false
    server: EngineServer<any, TError>
    ssrDefaultOptions: SsrOptionsResolved
  }): EngineClient<false, TError> {
    const viteDevServer = null
    const bunNativeDevServer = null
    const bunViteDevServer = null

    const publicdir = input.publicdir
      ? Publicdir.create<TError>({
          serving: input.serving,
          source: input.publicdir.source,
          outdir: input.publicdir.outdir,
          cacheLimit: input.publicdir.cacheLimit,
          scope: input.scope,
          server: null,
          client: null,
        })
      : null

    const distIndexHtmlContent = null

    const client = new EngineClient<false, TError>({
      ...input,
      publicdir,
      distIndexHtmlContent,
      viteDevServer,
      bunNativeDevServer,
      bunViteDevServer,
      // clientBunDevBuilder,
      // serverBunDevBuilder,
      prepared: false,
    })

    if (publicdir) {
      publicdir.client = client
    }

    return client
  }

  /**
   * Resolve env constants (NODE_ENV, POINT0_*) from this client's config and refresh `this.envConsts`. The
   * `process.env.POINT0_STATIC_COMPILER_OPTIONS` write — which is consumed by spawned bun children to mirror our
   * compiler options — is guarded by `envVarsApplied` so it's done exactly once per client instance. Callers still get
   * the resolved values via the return.
   */
  private setEnvVars({ nodeEnvFallback }: { nodeEnvFallback: NormalizedNodeEnv | undefined }): {
    NODE_ENV: NormalizedNodeEnv
    POINT0_SCOPE: PointsScope
    POINT0_SIDE: 'client'
    POINT0_SSR_ENABLED_DEFAULT: 'true' | 'false'
  } {
    const NODE_ENV = normalizeAndValidateNodeEnv(nodeEnvFallback)
    const POINT0_SCOPE = this.scope
    const POINT0_SIDE = 'client'
    const POINT0_SSR_ENABLED_DEFAULT = this.ssrDefaultOptions.enabled ? 'true' : 'false'
    this.envConsts.NODE_ENV = NODE_ENV
    this.envConsts.POINT0_SCOPE = POINT0_SCOPE
    this.envConsts.POINT0_SIDE = POINT0_SIDE
    this.envConsts.POINT0_SSR_ENABLED_DEFAULT = POINT0_SSR_ENABLED_DEFAULT
    if (!this.envVarsApplied) {
      this.envVarsApplied = true
      process.env.POINT0_STATIC_COMPILER_OPTIONS = JSON.stringify(
        this.getCompilerOptions({ built: _point0_env.build.was }),
      )
      const compilerRef = this.getStaticCompilerRef()
      if (compilerRef) {
        process.env.POINT0_STATIC_COMPILER_REF = compilerRef
      }
    }
    return { NODE_ENV, POINT0_SCOPE, POINT0_SIDE, POINT0_SSR_ENABLED_DEFAULT }
  }

  /**
   * Companion to `POINT0_STATIC_COMPILER_OPTIONS` for the native dev server. JSON can't carry the _function_ refs in
   * `compiler.markdown` (remark/rehype/recma) or `compiler.babel` — `JSON.stringify` silently turns them into `null`,
   * which then breaks MDX compilation in the spawned bun child (empty `.mdx` modules, `page` export `undefined`). This
   * ref lets `@point0/compiler/plugin/bun-static` re-import the engine in-process and read those plugins back as live
   * functions. Only emitted when we know our engine file. See {@link resolveStaticCompilerOptions}.
   */
  private getStaticCompilerRef(): string | undefined {
    if (!this.engineFile) {
      return undefined
    }
    return JSON.stringify({
      engineFile: this.engineFile,
      clientIndex: this.index,
      built: _point0_env.build.was,
    } satisfies StaticCompilerRef)
  }

  /**
   * Full setup before the client can render or serve dev assets: env vars, dev-server placeholders (filled in later by
   * `startDevServer`), points definitions, app component, and the prebuilt `index.html` when running after a production
   * build. Idempotent.
   */
  async prepare(): Promise<EngineClient<true, TError>> {
    if (this.isPrepared()) {
      return this as EngineClient<true, TError>
    }
    this.setEnvVars({ nodeEnvFallback: undefined })

    if (this.viteConfig && !_point0_env.build.was) {
      this.bunViteDevServer = true
      this.viteDevServer = true
    }
    if (this.indexHtml && !this.viteConfig && !_point0_env.build.was) {
      this.bunNativeDevServer = true
    }

    const points = await this.readPoints()
    this.basePath = points?.basePath
    await this.readAppComponent()

    this.distIndexHtmlContent = _point0_env.build.was && this.indexHtml ? await Bun.file(this.indexHtml).text() : null
    this.prepared = true as never
    return this as EngineClient<true, TError>
  }

  isPrepared(): this is EngineClient<true, TError> {
    return !!this.prepared
  }

  /** Bind this client to the content-addressed hot store (child side). See {@link ServerHotStore}. */
  bindHotStore(hotStore: ServerHotStore, aggregatorAbs: string | null): void {
    this.hotStore = hotStore
    this.hotAggregatorAbs = aggregatorAbs
    hotStore.registerAggregator(aggregatorAbs)
  }

  async readPoints(): Promise<ClientPoints<TError> | null> {
    if (!this.pointsProvided) {
      return null
    }
    let source = this.pointsProvided
    // Hot mode: re-import THIS client's points aggregator from the content-addressed store. Its lazy page/layout imports
    // were rewritten to the store's hashed names, so SSR picks up edited pages with a fresh module identity (and
    // unchanged deps keep their hash -> cached singletons -> no React tear). See server-hot-store.ts.
    const hot = this.hotStore && this.hotAggregatorAbs ? { store: this.hotStore, abs: this.hotAggregatorAbs } : null
    let hotHash: string | undefined
    if (hot) {
      const mod = hot.store.currentModule(hot.abs)
      if (!mod.changed && this.points) {
        return this.points
      }
      hotHash = mod.hash
      source = () => import(mod.url)
    }
    try {
      // `eager` — on the server the client points are ALWAYS fully loaded (the mirror of
      // `ServerPoints.load()` in server.ts's readPoints): every page/layout module is imported up
      // front and the pagesTree holds plain components, so no SSR render ever suspends on a
      // React.lazy chunk. Discovery awaits only the shell — a suspended lazy would hide the page
      // subtree from the pass, and the render-less data flow (queryClientDehydratedState) has no
      // later render to recover: its first request would snapshot the page without its queries.
      // Cheap on re-reads: hot mode re-imports page modules from the content-addressed store
      // (unchanged content => same URL => module cache hit), vite serves them from its module
      // graph. The BROWSER bundle keeps the default lazy collection — code splitting is a client
      // concern.
      const points = await ClientPoints.createFromSource(source, { log: this.log, eager: true })
      this.points = points as TPrepared extends true ? ClientPoints<TError> | null : undefined
      if (hot && hotHash !== undefined) {
        hot.store.markLoaded(hot.abs, hotHash)
      }
      return points
    } catch (error) {
      // Same Vite HMR invalidation window as the server: the re-imported points module can be
      // transiently empty. Keep the last-good points rather than failing. Other errors surface.
      if (error instanceof PointsSourceNotReadyError && this.points) {
        this.log({
          level: 'debug',
          category: ['client', 'points'],
          message: 'Points source not ready (HMR transient) — keeping previously loaded points',
        })
        return this.points
      }
      throw error
    }
  }

  async readAppComponent(): Promise<AppComponent | null> {
    if (!this.appProvided) {
      this.App = null as TPrepared extends true ? AppComponent | null : undefined
      return null
    }
    const defaultOrApp = isAsyncFn(this.appProvided) ? await this.appProvided() : this.appProvided
    if ('default' in defaultOrApp && typeof defaultOrApp.default === 'function') {
      this.App = defaultOrApp.default as TPrepared extends true ? AppComponent | null : undefined
      return defaultOrApp.default
    }
    this.App = defaultOrApp as TPrepared extends true ? AppComponent | null : undefined
    return defaultOrApp as AppComponent | null
  }

  isPageLocationSuitable = ({ pageLocation }: { pageLocation: AnyLocation }): boolean => {
    return ClientPoints.isPageLocationSuitable({
      basePath: this.basePath,
      pageLocation,
    })
  }

  isServingRequest = ({ request }: { request: Request0 }): boolean => {
    if (this.serving === false) {
      return false
    }
    if (this.serving === true) {
      return true
    }
    if (typeof this.serving === 'string') {
      return request.location.host === this.serving
    }
    return this.serving({ request })
  }

  async startDevServer(): Promise<void> {
    await Promise.all([
      this.viteConfig && !_point0_env.build.was ? this.startBunViteDevServer() : null,
      this.indexHtml && !this.viteConfig && !_point0_env.build.was ? this.startBunNativeDevServer() : null,
    ])
  }

  getCompilerOptions({ built, onDeny }: { built?: boolean; onDeny?: 'throw' | 'log' } = {}): CompilerOptions | false {
    if (!this.compiler) {
      return false
    }
    return {
      scope: this.compiler.scope ? this.scope : false,
      side: this.compiler.side ? 'client' : false,
      mode: this.compiler.mode ? normalizeAndValidateNodeEnv() : false,
      runtime: this.compiler.runtime,
      os: this.compiler.os,
      consts: [...(this.compiler.consts ?? []), this.envConsts],
      filter: this.compiler.filter,
      ssr: this.compiler.ssr,
      importer: { ...this.compiler.importer, onDeny: onDeny !== undefined ? onDeny : this.compiler.importer.onDeny },
      cache: this.compiler.cache,
      markdown: this.compiler.markdown,
      babel: this.compiler.babel,
      // Asset pipeline rides on the compiler (like `markdown`/`babel`); `false` → native asset behavior. Per-build
      // dirs (`urlDir`/`fileDir`/`writeUrlBytes`) are merged into `assets` at the build sites below.
      assets: this.compiler.assets,
      built,
    }
  }

  async startBunNativeDevServer(): Promise<Bun.Subprocess> {
    if (!this.indexHtml) {
      throw new Error(`Index HTML file path is not provided for client "${this.scope}"`)
    }
    if (!this.engineFile) {
      throw new Error(`Engine file path is not provided for client "${this.scope}"`)
    }
    this.log({
      level: 'info',
      category: ['client'],
      message: `Client starting...`,
    })
    const tempDir = resolveTempDirPath(['client-bun-dev-server', `${this.scope}-${this.port}`])
    const ownPluginsStrings = await extractEngineClientDevPluginsStrings({
      cwd: this.cwd,
      mode: normalizeAndValidateNodeEnv(),
      command: 'serve',
      scope: this.scope,
      bunPlugins: this.bunPlugins,
      errorOnNotString: `Bun dev plugins for client "${this.scope}" should be strings`,
    })
    const generalPluginsStrings = await extractEngineClientDevPluginsStrings({
      cwd: this.cwd,
      mode: normalizeAndValidateNodeEnv(),
      command: 'serve',
      scope: this.scope,
      bunPlugins: this.generalBunPlugins,
      errorOnNotString: `Bun dev plugins for client "${this.scope}" should be strings`,
    })
    const pluginsStrings = [...generalPluginsStrings, ...ownPluginsStrings]
    const compilerOptions = this.getCompilerOptions({ built: _point0_env.build.was })
    const compilerRef = this.getStaticCompilerRef()
    const scriptPath = nodePath.join(tempDir, `serve.js`)
    const bunfigTomlPath = nodePath.join(tempDir, 'bunfig.toml')
    const combinedPluginsStrings = [
      // The compiler plugin carries the asset pipeline (assets ride in `compilerOptions.assets`, threaded to this
      // spawned child via `POINT0_STATIC_COMPILER_OPTIONS` below) — no separate asset plugin/env needed.
      ...(compilerOptions ? ['@point0/compiler/plugin/bun-static'] : []),
      ...pluginsStrings,
    ]
    const bunfigTomlContent = `[serve.static]
plugins = [${combinedPluginsStrings.map((p) => `"${p}"`).join(', ')}]
`

    // No explicit `development: { hmr }` block — Bun enables dev mode + HMR by default when NODE_ENV !== 'production'.
    // Embedded paths must be posix: this string is written out as a real JS module, so a native `\` would be read as a
    // string escape (`\t`, `\U`, …). Import specifiers and path args accept `/` on every OS.
    const indexHtmlPosix = toPosixPath(this.indexHtml)
    const engineFilePosix = toPosixPath(this.engineFile)
    const scriptContent = `
import indexHtml from '${indexHtmlPosix}';
import { Engine } from '@point0/engine';
import { fetchRetryingConnectionRefused, registerOnProcessExit } from '@point0/engine/utils';
import { env } from '@point0/core';
const { engine } = await Engine.findAndImportSelf({ engineFile: '${engineFilePosix}' });
try {
  // No engine.preload() here: this child's html/static pipeline gets its plugins from the generated
  // bunfig's [serve.static] (resolved by @point0/compiler/plugin/bun-static), and nothing in this
  // script imports app sources at runtime. Only the app logger config is applied.
  await engine.applyLogger();
  // No port takeover here: the orchestrator serializes client respawns (the old child is awaited before a new one
  // spawns), so a conflict means a genuinely foreign holder — let Bun.serve fail and the orchestrator surface it.
  const bunServer = Bun.serve({
    port: ${this.port},
    routes: {
      '/index.html': indexHtml,
    },
    fetch: async (request) => {
      if (request.headers.get('${POINT0_MIDDLEWARE_CHECK_FROM_SERVER_HEADER}') === 'true') {
        return new Response('__NO_RESPONSE__', {
          headers: {
            'Content-Type': 'text/plain',
          },
          status: 404,
        })
      }
      const url = new URL(request.url)
      const forwardedHeaders = new Headers(request.headers)
      forwardedHeaders.set('${POINT0_FORWARDED_FROM_DEV_CLIENT_HEADER}', '${this.scope}')
      // Server may be mid-restart — retry connection-refused quietly instead of logging a noisy stack.
      return await fetchRetryingConnectionRefused(
        \`http://localhost:${this.server.port}\${url.pathname}\${url.search}\`,
        {
          method: request.method,
          headers: forwardedHeaders,
          body: request.body,
          redirect: 'manual',
        },
      )
    },
  })
  registerOnProcessExit(() => {
    bunServer.stop()
  })
  engine.log({
    level: 'info',
    category: ['client'],
    message: \`Client started http://localhost:${this.port} in \${Math.ceil(performance.now())}ms\`,
  })
} catch (error) {
  engine.log({
    level: 'error',
    category: ['client'],
    message: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
}
`
    await Bun.write(bunfigTomlPath, bunfigTomlContent)
    await Bun.write(scriptPath, scriptContent)

    if (
      this.bunNativeDevServer &&
      typeof this.bunNativeDevServer !== 'boolean' &&
      this.bunNativeDevServer.exitCode === null
    ) {
      throw new Error('Client dev server is already running')
    }

    const stripAnsiColors = (text: string): string => text.replace(/\x1b\[[0-9;]*m/g, '')

    let restarting = false
    // Bun's HTMLBundle bundler does not re-scan for newly created files via HMR —
    // an import that failed to resolve at the previous build stays failed even
    // after the missing file appears on disk. When we see `Could not resolve` in
    // the child's piped output and FileResolver confirms the import now resolves,
    // we kill and respawn the child so its bundler does a fresh scan.
    const handleBundlerError = (rawText: string): void => {
      if (restarting) {
        return
      }
      if (!rawText.includes('Could not resolve')) {
        return
      }
      const text = stripAnsiColors(stripTerminalClearSequences(rawText))
      const lines = text.split('\n')
      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(/error:\s*Could not resolve:\s*"([^"]+)"/)
        if (!match) {
          continue
        }
        const importPath = match[1]
        let importerAbs: string | undefined

        // `    at /abs/path/to/file.tsx:line:col` line AFTER the error
        for (let j = i + 1; j <= Math.min(lines.length - 1, i + 6); j++) {
          const atMatch = lines[j].match(/^\s*at\s+(.+?):\d+:\d+\s*$/)
          if (atMatch) {
            importerAbs = atMatch[1]
            break
          }
        }

        // Fallback: relative path line BEFORE the error (Bun "X Build Error" format)
        if (!importerAbs) {
          for (let j = i - 1; j >= Math.max(0, i - 6); j--) {
            const candidate = lines[j].trim()
            if (!candidate || /^\d+\s+Build Error/.test(candidate)) {
              continue
            }
            if (/\.(?:tsx?|jsx?|mdx?|cjs|mjs|css)$/.test(candidate) && !candidate.startsWith('import ')) {
              importerAbs = nodePath.isAbsolute(candidate) ? candidate : nodePath.resolve(this.cwd, candidate)
              break
            }
          }
        }

        if (!importerAbs) {
          continue
        }

        const resolved = FileResolver.resolveFilePath({
          importer: importerAbs,
          path: importPath,
        })
        if (!resolved) {
          continue
        }
        void restartChildOnNewFile(resolved)
        return
      }
    }

    let currentChild: Bun.Subprocess<'ignore', 'pipe', 'pipe'>

    const pipeFilteredLogs = ({
      stream,
      target,
    }: {
      stream: ReadableStream<Uint8Array> | null
      target: NodeJS.WriteStream
    }): void => {
      pipeStreamStripped({ stream, target, onChunk: handleBundlerError })
    }

    const spawnChild = (): Bun.Subprocess<'ignore', 'pipe', 'pipe'> => {
      // Two Windows-driven spawn choices (both no-ops on posix):
      // 1. `process.execPath` (the running bun), not bare `bun` — a spawned child may not inherit the shell-profile bun
      //    dir on PATH (see server.ts spawnEntry).
      // 2. cwd = the app root, NOT `tempDir`. Bun's HTMLBundle dev server only watches files under its cwd for HMR
      //    (oven-sh/bun#19479); our generated serve.js/bunfig.toml live in `tempDir`, so running there left every app
      //    source unwatched and no edit ever hot-updated. serve.js uses absolute paths, so cwd is free to move; we pin
      //    `--config=<tempDir/bunfig.toml>` so the `[serve.static]` plugins still load. The `=` is required — with a
      //    space, bun's `run` parser swallows the script path and exits 0 without starting the server.
      const child = Bun.spawn([process.execPath, `--config=${bunfigTomlPath}`, 'run', '--no-orphans', scriptPath], {
        cwd: this.cwd,
        stdout: 'pipe',
        stderr: 'pipe',
        stdin: 'ignore',
        env: {
          ...process.env,
          FORCE_COLOR: process.env.FORCE_COLOR ?? '1',
          ...(compilerOptions ? { POINT0_STATIC_COMPILER_OPTIONS: JSON.stringify(compilerOptions) } : {}),
          ...(compilerOptions && compilerRef ? { POINT0_STATIC_COMPILER_REF: compilerRef } : {}),
          NODE_ENV: process.env.NODE_ENV,
        },
      })
      pipeFilteredLogs({ stream: child.stdout, target: process.stdout })
      pipeFilteredLogs({ stream: child.stderr, target: process.stderr })
      registerDevChild(child)
      void child.exited.then((code) => {
        // `restarting` covers our own restart-on-new-file kill; isDevShuttingDown covers Ctrl-C / SIGTERM teardown.
        if (restarting || isDevShuttingDown()) {
          return
        }
        // The dev tree lives and dies as one unit: a client dying on its own (crash, or an agent freeing its port)
        // tears the rest down rather than leaving a half-alive tree behind.
        requestDevShutdown({
          reason: `Client "${this.scope}" dev process exited unexpectedly (code ${String(code)}). Tearing down dev.`,
          log: this.log,
        })
      })
      return child
    }

    const restartChildOnNewFile = async (resolvedFile: string): Promise<void> => {
      if (restarting) {
        return
      }
      restarting = true
      const oldChild = currentChild
      this.log({
        level: 'info',
        category: ['client'],
        message: `New file "${nodePath.relative(this.cwd, resolvedFile)}" detected, restarting client...`,
      })
      try {
        oldChild.kill()
        await oldChild.exited
      } catch {
        // ignore
      }
      try {
        currentChild = spawnChild()
        this.bunNativeDevServer = currentChild
      } finally {
        restarting = false
      }
    }

    currentChild = spawnChild()
    this.bunNativeDevServer = currentChild
    return currentChild
  }

  async startBunViteDevServer(): Promise<{
    bunViteDevServer: Bun.Server<unknown>
    viteDevServer: ViteDevServer
  }> {
    if (!this.viteConfig) {
      throw new Error(`Vite config not found for client "${this.scope}"`)
    }
    // Per-call anchor (NOT process-relative): the vite client shares this long-lived process with the vite server, which
    // already reports the full process boot in its own "Server started in …ms". Measuring from here reports just the
    // client's own incremental start (createViteDevServer + bind) instead of double-counting the shared boot.
    const startingAt = performance.now()
    this.log({
      level: 'info',
      category: ['client'],
      message: `Client starting...`,
    })
    const viteDevServer = await createViteDevServer({
      viteConfig: this.viteConfig,
      scope: this.scope,
      side: 'client',
      hmrPort: this.hmrPort,
      mode: normalizeAndValidateNodeEnv(),
      envConsts: this.envConsts,
      engineFile: this.engineFile,
      compilerOptions: this.getCompilerOptions({ built: _point0_env.build.was }),
    })
    this.viteDevServer = viteDevServer
    if (!this.indexHtml) {
      throw new Error(`Index HTML file path is not provided for client "${this.scope}"`)
    }
    const srcIndexHtmlContent = await Bun.file(this.indexHtml).text()
    // No port takeover: a conflict means a live foreign holder (point0 trees cannot leave orphans — `--no-orphans`),
    // so Bun.serve's own EADDRINUSE is the honest outcome.
    const bunViteDevServer = Bun.serve({
      port: this.port,
      development: {
        console: false,
        hmr: false, // vite provides it own hmr
      },
      fetch: async (request) => {
        const location = Route0.getLocation(request.url)
        if (location.pathname === '/index.html') {
          const originalIndexHtml = await viteDevServer.transformIndexHtml(request.url, srcIndexHtmlContent)
          return new Response(originalIndexHtml, {
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
            },
          })
        }
        const middlewareResponse = await this.fetchViteDevServerMiddleware({
          request,
        })
        if (middlewareResponse) {
          return middlewareResponse
        }
        if (request.headers.get(POINT0_MIDDLEWARE_CHECK_FROM_SERVER_HEADER) === 'true') {
          return new Response('__NO_RESPONSE__', {
            headers: {
              'Content-Type': 'text/plain',
            },
            status: 404,
          })
        }
        const forwardedHeaders = new Headers(request.headers)
        forwardedHeaders.set(POINT0_FORWARDED_FROM_DEV_CLIENT_HEADER, this.scope)
        // Server may be mid-restart — retry connection-refused quietly instead of logging a noisy stack.
        const res = await fetchRetryingConnectionRefused(
          `http://localhost:${this.server.port}${location.pathname}${location.searchString}`,
          {
            method: request.method,
            headers: forwardedHeaders,
            body: request.body,
            redirect: 'manual',
          },
        )
        return res
      },
    })
    registerOnProcessExit(() => {
      void bunViteDevServer.stop()
    })
    const startingDurationMs = Math.ceil(performance.now() - startingAt)
    this.log({
      level: 'info',
      category: ['client'],
      message: `Client started http://localhost:${this.port} in ${startingDurationMs}ms`,
    })
    return { bunViteDevServer, viteDevServer }
  }

  async dispose(): Promise<void> {
    if (this.bunNativeDevServer && typeof this.bunNativeDevServer !== 'boolean') {
      this.bunNativeDevServer.kill()
    }
    if (this.bunViteDevServer && typeof this.bunViteDevServer !== 'boolean') {
      await this.bunViteDevServer.stop()
    }
    if (this.viteDevServer && typeof this.viteDevServer !== 'boolean') {
      await this.viteDevServer.close()
    }
  }

  async upgradeProxyBunDevServerWebSocket({
    request,
    bunServer,
  }: {
    request: Request
    bunServer: Bun.Server<unknown>
  }): Promise<{ result: Response | undefined } | undefined> {
    if (!this.bunNativeDevServer) {
      return undefined
    }
    if (request.headers.get('upgrade') !== 'websocket') {
      return undefined
    }
    const url = new URL(request.url)
    if (!url.pathname.startsWith('/_bun/')) {
      return undefined
    }
    const bunNativeDevServerWsUrl = `ws://localhost:${this.port}${url.pathname}${url.search}`

    // Upgrade the connection and store upstream URL in data
    const upgraded = bunServer.upgrade(request, {
      data: { wsUrl: bunNativeDevServerWsUrl },
    })

    if (!upgraded) {
      return { result: new Response('WebSocket upgrade failed', { status: 400 }) }
    }

    // Return undefined to indicate WebSocket upgrade was successful
    return { result: undefined }
  }

  async fetchBunDevServerMiddleware({ request }: { request: Request }): Promise<Response | undefined> {
    const bunNativeDevServer = this.bunNativeDevServer
    if (!bunNativeDevServer) {
      return undefined
    }
    const url = new URL(request.url)
    const pathname = url.pathname
    if (pathname.startsWith('/_bun/')) {
      const bunDevServerUrl = `http://localhost:${this.port}${pathname}${url.search}`
      const middlewareRequestHeaders = new Headers(request.headers)
      middlewareRequestHeaders.set(POINT0_MIDDLEWARE_CHECK_FROM_SERVER_HEADER, 'true')
      return await fetch(bunDevServerUrl, {
        method: request.method,
        headers: middlewareRequestHeaders,
        body: request.body,
        // Byte-transparent proxy: keep a compressed body coherent with its Content-Encoding header (see
        // fetchRetryingConnectionRefused) — a decoding fetch() would strand the header over decoded bytes.
        decompress: false,
      })
    }
    return undefined
  }

  async fetchViteDevServerMiddleware({ request }: { request: Request }): Promise<Response | undefined> {
    const viteDevServer = this.viteDevServer
    if (!viteDevServer) {
      return undefined
    }
    if (viteDevServer === true) {
      const middlewareRequestHeaders = new Headers(request.headers)
      const url = new URL(request.url)
      middlewareRequestHeaders.set(POINT0_MIDDLEWARE_CHECK_FROM_SERVER_HEADER, 'true')
      const middlewareResponse = await fetch(`http://localhost:${this.port}${url.pathname}${url.search}`, {
        method: request.method,
        headers: middlewareRequestHeaders,
        // body: request.body, do not send body to middleware, becouse vite middle ware do not need, it and we ant it will be not read if we will pass it later out main middleware
        // Byte-transparent proxy: keep a compressed body coherent with its Content-Encoding header (see
        // fetchRetryingConnectionRefused) — a decoding fetch() would strand the header over decoded bytes.
        decompress: false,
      })
      if (middlewareResponse.status === 404) {
        return undefined
      }
      return middlewareResponse
    }
    const { req, res } = toReqRes(request)
    let nextCalled = false
    let nextError: any
    let nextResolve: (() => void) | undefined

    const nextPromise = new Promise<undefined>((resolve, reject) => {
      nextResolve = () => {
        if (nextError) {
          reject(nextError)
        } else {
          resolve(undefined)
        }
      }
    })

    const next = (err?: any) => {
      if (err) {
        nextError = err
      }
      // Vite didn't handle this request
      if (!nextCalled) {
        nextCalled = true
        // If res hasn't been finished, resolve immediately
        if (!res.writableEnded && nextResolve) {
          nextResolve()
        }
      }
    }

    viteDevServer.middlewares(req, res, next)

    // Race between next being called (middleware didn't handle) and res finishing (middleware handled)
    return await Promise.race([
      nextPromise,
      toFetchResponse(res).then((response) => {
        // If next was called but res was also finished, check if it's a valid response
        if (nextCalled && response.status === 200 && response.body === null) {
          return undefined
        }
        return response
      }),
    ])
  }

  private getTestIndexHtml(): string {
    return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`
  }

  async getOriginalIndexHtml(_url: string): Promise<string> {
    if (!this.isPrepared()) {
      throw new Error('Client is not prepared')
    }
    if (this.indexHtml === '__POINT0_TEST_INDEX_HTML__') {
      return this.getTestIndexHtml()
    }
    if (!this.indexHtml) {
      throw new Error(`indexHtml not found for client "${this.scope}"`)
    }
    if (!_point0_env.build.was) {
      if (this.viteDevServer) {
        return await fetch(`http://localhost:${this.port}/index.html`).then(async (response) => await response.text())
      } else if (this.bunNativeDevServer) {
        return await fetch(`http://localhost:${this.port}/index.html`).then(async (response) => await response.text())
      } else {
        throw new Error(
          `Vite dev server or bun dev server not connected for client "${this.scope}". Please provide vite config or port for client "${this.scope}".`,
        )
      }
    }
    if (!this.distIndexHtmlContent) {
      throw new Error(`distIndexHtmlContent not preloaded for client "${this.scope}"`)
    }
    return this.distIndexHtmlContent
  }

  /**
   * The SPA shell: the document rendered WITHOUT the app — the template plus env scripts, empty root element. Serves
   * `ssr: false` clients and the fallback when an SSR render throws; same React document pipeline as SSR.
   */
  async getDocumentShellHtml(url: string): Promise<string> {
    const originalIndexHtml = await this.getOriginalIndexHtml(url)
    return await renderDocumentShellHtml({
      originalIndexHtml,
      envVars: this.envVars,
      envConsts: this.envConsts,
      domRootElementId: this.domRootElementId,
    })
  }

  async getAppComponentForce(): Promise<AppComponent> {
    if (!this.isPrepared()) {
      throw new Error('Client is not prepared')
    }
    if (!this.App) {
      throw new Error(`App not provided for client "${this.scope}"`)
    }
    return this.App
  }

  getBuildPaths(): {
    indexHtml: string | null
    outdir: string | null
    entrypointsExists: boolean
  } {
    const indexHtml = this.indexHtml
    const entrypointsExists = !!indexHtml
    return {
      indexHtml,
      outdir: this.outdir,
      entrypointsExists,
    }
  }

  /**
   * This client's import-graph entry file(s), resolved from its `indexHtml`'s `<script src="...">` tags. A client is
   * bundled from its HTML (no explicit `entry` like the server), so this is how {@link Engine.buildWatch} finds the
   * client's import tree to watch. Returns [] when there is no indexHtml (or it is the in-memory test sentinel) or it
   * cannot be read. External (`http(s)://`, `//`, `data:`) scripts are skipped.
   */
  async resolveEntryFiles(): Promise<string[]> {
    const indexHtml = this.indexHtml
    if (!indexHtml || indexHtml === '__POINT0_TEST_INDEX_HTML__') {
      return []
    }
    let html: string
    try {
      html = await Bun.file(indexHtml).text()
    } catch {
      return []
    }
    const dir = nodePath.dirname(indexHtml)
    const entries: string[] = []
    await new HTMLRewriter()
      .on('script[src]', {
        element(el) {
          const src = el.getAttribute('src')
          if (!src || /^(https?:)?\/\//.test(src) || src.startsWith('data:')) {
            return
          }
          // src is "./index.client.tsx" or "/index.client.tsx"; both resolve next to the html in the canonical layout.
          entries.push(nodePath.resolve(dir, src.replace(/^\//, '')))
        },
      })
      .transform(new Response(html))
      .text()
    return entries
  }

  async buildByBun(options?: {
    bunBuildConfig?: EngineClientBuildConfigDefinition
    clean?: boolean
  }): Promise<string[] | null> {
    if (_point0_env.build.was) {
      throw new Error('You can not build by built engine')
    } else {
      const { NODE_ENV } = this.setEnvVars({ nodeEnvFallback: 'production' })
      const { bunBuildConfig, clean = false } = options ?? {}

      const buildPaths = this.getBuildPaths()
      if (!buildPaths.indexHtml) {
        return null
      }
      if (!buildPaths.outdir) {
        throw new Error(`outdir not provided for client "${this.scope}"`)
      }

      if (clean) {
        await this.cleanClient()
      }

      const thisBunBuildConfig = await extractEngineClientBuildConfig({
        mode: NODE_ENV,
        bunBuildConfig: this.bunBuildConfig,
        bunPlugins: this.bunPlugins,
        scope: this.scope,
      })
      const providedBunBuildConfig = bunBuildConfig
        ? await extractEngineClientBuildConfig({
            mode: NODE_ENV,
            bunBuildConfig,
            bunPlugins: [],
            scope: this.scope,
          })
        : {}

      const compilerOptions = this.getCompilerOptions({ built: true, onDeny: 'throw' })
      if (compilerOptions && compilerOptions.assets) {
        // Bun client build's asset output dirs: url-mode bytes → the served `dist/client/_point0/assets/<hash>`,
        // `?file` bytes → next to the bundle. (The Vite client build below leans on Vite's native asset URLs, so it
        // sets neither.)
        compilerOptions.assets = {
          ...compilerOptions.assets,
          urlDir: nodePath.join(buildPaths.outdir, POINT0_INTERNAL_PATH_PREFIX, POINT0_ASSETS_DIR_NAME),
          fileDir: buildPaths.outdir,
        }
      }
      const compilerPlugin = compilerOptions
        ? [await import('@point0/compiler/plugin/bun').then((module) => module.compilerBunPlugin(compilerOptions))]
        : []

      const envConstsWithBuilt = {
        ...this.envConsts,
        POINT0_BUILT: 'true',
      }
      const buildOutput = await Bun.build({
        target: 'browser',
        format: 'esm',
        splitting: true,
        metafile: true,
        sourcemap: NODE_ENV === 'production' ? 'external' : 'inline',
        publicPath: '/',
        minify: NODE_ENV === 'production',
        ...thisBunBuildConfig,
        ...providedBunBuildConfig,
        plugins: [...compilerPlugin, ...(thisBunBuildConfig.plugins ?? [])],
        entrypoints: [
          buildPaths.indexHtml,
          ...(thisBunBuildConfig.entrypoints ?? []),
          ...(providedBunBuildConfig.entrypoints ?? []),
        ],
        outdir: buildPaths.outdir,
        define: {
          ...thisBunBuildConfig.define,
          ...providedBunBuildConfig.define,
          ...Object.fromEntries(
            Object.entries(envConstsWithBuilt).map(([key, value]) => [`process.env.${key}`, JSON.stringify(value)]),
          ),
          ...Object.fromEntries(
            Object.entries(envConstsWithBuilt).map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)]),
          ),
        },
      })
      await this.injectBuildEnvConstsToDistIndexHtml({
        indexHtml: buildPaths.indexHtml,
        outdir: buildPaths.outdir,
        envConsts: envConstsWithBuilt,
      })
      await fixDistIndexHtmlBootstrapEntryByBunMetafile({
        sourceIndexHtmlPath: buildPaths.indexHtml,
        distOutdir: buildPaths.outdir,
        buildOutput,
      })
      const graph = chunkGraphFromBunMetafile({
        metafile: buildOutput.metafile,
        outdir: buildPaths.outdir,
        indexHtmlKey: nodePath.relative(process.cwd(), buildPaths.indexHtml).replaceAll('\\', '/'),
      })
      await this.writePreloadManifest({ outdir: buildPaths.outdir, graph })
      await this.writeClientBuildVersionAndInjectIntoDistIndexHtml({
        indexHtml: buildPaths.indexHtml,
        outdir: buildPaths.outdir,
        outputFiles: buildOutput.outputs.map((output) => output.path),
        graph,
      })
      // Bun's bundler does not chain the inline maps our compiler plugin emits (Bun #6173), so the emitted maps point at
      // our transformed intermediate, not the original source. Re-chain them (any NODE_ENV — if we built with our
      // compiler, the maps need fixing regardless of environment) so browser stacks / error monitoring resolve to the
      // real file. `chainBundledSourceMaps` handles whichever shape was emitted (external `.js.map` or inline-in-`.js`)
      // and is a no-op when there are no maps to chain.
      if (compilerPlugin.length > 0) {
        const { rewritten, total } = await chainBundledSourceMaps(buildPaths.outdir)
        if (rewritten > 0) {
          this.log({
            level: 'info',
            category: ['client'],
            message: `Source maps: re-chained ${rewritten}/${total} client chunk maps to original source`,
          })
        }
      }
      return buildOutput.outputs.map((output) => output.path)
    }
  }

  /**
   * Returns the full vite UserConfig that {@link buildByVite} would pass to `vite.build` for this client. Single source
   * of truth — used both internally by `buildByVite` and from {@link Engine.getViteConfig} when the user's
   * `vite.config.ts` asks for it.
   */
  async getViteConfigForBuild(): Promise<ExtractedViteConfig> {
    if (_point0_env.build.was) {
      throw new Error('You can not build by built engine')
    }
    if (!this.viteConfig) {
      throw new Error(`viteConfig not provided for client "${this.scope}"`)
    }
    const { NODE_ENV } = this.setEnvVars({ nodeEnvFallback: 'production' })
    const buildPaths = this.getBuildPaths()
    if (!buildPaths.indexHtml || !buildPaths.outdir) {
      throw new Error(`indexHtml / outdir not provided for client "${this.scope}"`)
    }

    const compilerOptions = this.getCompilerOptions({ built: true, onDeny: 'throw' })
    if (compilerOptions && compilerOptions.assets) {
      // `?file` build: copy bytes next to the emitted bundle so they're readable at runtime (Vite owns `?url`/`?raw`).
      compilerOptions.assets = { ...compilerOptions.assets, fileDir: buildPaths.outdir }
    }
    const compilerPlugin = compilerOptions
      ? [await import('@point0/compiler/plugin/vite').then((module) => module.compilerVitePlugin(compilerOptions))]
      : []

    const loadedViteConfig = await extractViteConfig({
      viteConfig: this.viteConfig,
      command: 'build',
      side: 'client',
      mode: NODE_ENV,
      scope: this.scope,
      plugins: compilerPlugin,
    })

    const existingRolldownOptionsOutput = loadedViteConfig.build?.rolldownOptions?.output
    const normalizedExistingRolldownOptionsOutput =
      (Array.isArray(existingRolldownOptionsOutput)
        ? existingRolldownOptionsOutput[0]
        : existingRolldownOptionsOutput) || {}
    const rolldownOptionsOutput: Extract<
      NonNullable<NonNullable<ExtractedViteConfig['build']>['rolldownOptions']>['output'],
      object
    > = {
      ...normalizedExistingRolldownOptionsOutput,
    }
    const fixedExistingRolldownOptionsOutput = Array.isArray(existingRolldownOptionsOutput)
      ? [rolldownOptionsOutput, ...existingRolldownOptionsOutput.slice(1)]
      : rolldownOptionsOutput

    const envConstsWithBuilt = { ...this.envConsts, POINT0_BUILT: 'true' }
    const envVarsWithBuild = { ...this.envVars, POINT0_BUILT: 'true' }
    const define = {
      'process.env': `window.process.env`,
      ...loadedViteConfig.define,
      ...Object.fromEntries(
        Object.entries(envVarsWithBuild).map(([key]) => [
          `process.env.${key}`,
          `globalThis.${POINT0_ENV_VARS_GLOBAL}.${key}`,
        ]),
      ),
      ...Object.fromEntries(
        Object.entries(envConstsWithBuilt).map(([key, value]) => [`process.env.${key}`, JSON.stringify(value)]),
      ),
    }

    return {
      ...loadedViteConfig,
      root: getViteRoot({ viteConfig: this.viteConfig, loadedViteConfig, engineFile: this.engineFile }),
      build: {
        ...loadedViteConfig.build,
        outDir: buildPaths.outdir,
        minify: NODE_ENV === 'production' ? (loadedViteConfig.build?.minify ?? 'esbuild') : false,
        // Mirror the Bun client build: in prod emit *hidden* external `.map` files (separate file,
        // no `//# sourceMappingURL=` comment in the bundle) — uploadable to Sentry, never auto-fetched
        // by browsers, no source leak. Dev keeps inline-style maps for in-place debugging.
        sourcemap: loadedViteConfig.build?.sourcemap ?? (NODE_ENV === 'production' ? 'hidden' : true),
        rolldownOptions: {
          ...loadedViteConfig.build?.rolldownOptions,
          input: buildPaths.indexHtml,
          output: fixedExistingRolldownOptionsOutput,
        },
        copyPublicDir: false,
        emptyOutDir: false,
      },
      define,
    }
  }

  async buildByVite(options?: { clean?: boolean }): Promise<string[] | null> {
    if (_point0_env.build.was) {
      throw new Error('You can not build by built engine')
    } else {
      if (!this.viteConfig) {
        throw new Error(`viteConfig not provided for client "${this.scope}"`)
      }

      const { build: viteBuild } = await import('vite')
      const buildPaths = this.getBuildPaths()
      if (!buildPaths.indexHtml) {
        return null
      }
      if (!buildPaths.outdir) {
        throw new Error(`outdir not provided for client "${this.scope}"`)
      }

      const { clean = false } = options ?? {}
      if (clean) {
        await this.cleanClient()
      }

      if (!(await Bun.file(buildPaths.indexHtml).exists())) {
        throw new Error(`Input file does not exist: ${buildPaths.indexHtml} for client "${this.scope}"`)
      }

      const config = await this.getViteConfigForBuild()
      const buildResult = await viteBuild(config)
      const envConstsWithBuilt = { ...this.envConsts, POINT0_BUILT: 'true' }
      await this.injectBuildEnvConstsToDistIndexHtml({
        indexHtml: buildPaths.indexHtml,
        outdir: buildPaths.outdir,
        envConsts: envConstsWithBuilt,
      })

      const rollupOutputs = Array.isArray(buildResult) ? buildResult : [buildResult]
      const outputFiles: string[] = []
      const allChunks: RollupChunkLike[] = []
      for (const rollupOutput of rollupOutputs) {
        if ('output' in rollupOutput) {
          const chunks = Array.isArray(rollupOutput.output) ? rollupOutput.output : []
          for (const chunk of chunks) {
            if ('fileName' in chunk && typeof chunk.fileName === 'string') {
              outputFiles.push(nodePath.resolve(buildPaths.outdir, chunk.fileName))
              allChunks.push(chunk as RollupChunkLike)
            }
          }
        }
      }
      const graph = chunkGraphFromRollup({ chunks: allChunks })
      await this.writePreloadManifest({ outdir: buildPaths.outdir, graph })
      await this.writeClientBuildVersionAndInjectIntoDistIndexHtml({
        indexHtml: buildPaths.indexHtml,
        outdir: buildPaths.outdir,
        outputFiles,
        graph,
      })
      return outputFiles
    }
  }

  private async injectBuildEnvConstsToDistIndexHtml({
    indexHtml,
    outdir,
    envConsts,
  }: {
    indexHtml: string
    outdir: string
    envConsts: EngineOptionsEnvParsed
  }): Promise<void> {
    const indexHtmlDistPath = nodePath.join(outdir, nodePath.basename(indexHtml))
    if (!(await Bun.file(indexHtmlDistPath).exists())) {
      return
    }
    const distIndexHtmlContent = await Bun.file(indexHtmlDistPath).text()
    // Upsert via HTMLRewriter: drop any existing consts script, prepend a fresh one to <head>. This is a FILE edit
    // (the emitted dist/client/index.html is the artifact for static hosting/Capacitor, served without the engine),
    // so it stays an HTML rewrite rather than a React render — the bundler's output must survive byte-for-byte.
    const scriptTag = `<script id="${ENV_CONSTS_SCRIPT_ID}">${buildEnvConstsScriptBody(envConsts)}</script>`
    const distIndexHtmlWithConsts = await new HTMLRewriter()
      .on(`script[id="${ENV_CONSTS_SCRIPT_ID}"]`, {
        element(el) {
          el.remove()
        },
      })
      .on('head', {
        element(el) {
          el.prepend(scriptTag, { html: true })
        },
      })
      .transform(new Response(distIndexHtmlContent))
      .text()
    if (distIndexHtmlWithConsts !== distIndexHtmlContent) {
      await Bun.write(indexHtmlDistPath, distIndexHtmlWithConsts)
    }
  }

  /**
   * Deploy-invalidation build step, shared by the Bun and Vite builds: derive this build's version from the emitted
   * files, write it to `<outdir>/_point0/<scope>/build-version.json` (it ships with the chunks — see `@point0/core`'s
   * stale module for the client half), and stamp the dist index.html with the version + entry-reload guard scripts. The
   * dist html is the single carrier: the static SPA serves it directly and the SSR document is assembled from it, so
   * one build-time injection covers every serving mode. Like the preload manifest, this is a resilience feature — never
   * fail an otherwise-good build over it.
   */
  private async writeClientBuildVersionAndInjectIntoDistIndexHtml({
    indexHtml,
    outdir,
    outputFiles,
    graph,
  }: {
    indexHtml: string
    outdir: string
    outputFiles: string[]
    graph: ChunkGraph
  }): Promise<void> {
    try {
      const files = collectClientBuildHashedFiles({ outputFiles, outdir })
      const buildVersion = computeClientBuildVersion(files)
      // Two files from one collection: the browser-polled version file stays a single tiny field, while the
      // content-hashed file list (used server-side to classify the `asset` variant) lives separately, server-only.
      await Bun.write(
        nodePath.join(outdir, ...getClientBuildVersionPathSegments(this.scope)),
        JSON.stringify({ buildVersion } satisfies ClientBuildVersionFile, null, 2),
      )
      await Bun.write(
        nodePath.join(outdir, ...getClientBuildAssetsPathSegments(this.scope)),
        JSON.stringify({ files } satisfies ClientBuildAssetsFile, null, 2),
      )
      const indexHtmlDistPath = nodePath.join(outdir, nodePath.basename(indexHtml))
      if (await Bun.file(indexHtmlDistPath).exists()) {
        const distIndexHtmlContent = await Bun.file(indexHtmlDistPath).text()
        const distIndexHtmlWithBuild = await addClientBuildToDocumentHtml({
          html: distIndexHtmlContent,
          buildVersion,
          entryPublicPath: graph.entryFile,
        })
        if (distIndexHtmlWithBuild !== distIndexHtmlContent) {
          await Bun.write(indexHtmlDistPath, distIndexHtmlWithBuild)
        }
      }
    } catch (error) {
      this.log({
        level: 'warn',
        category: ['client', 'build'],
        message: `Failed to write the client build version for client "${this.scope}" (serving continues without deploy invalidation)`,
        error,
      })
    }
  }

  /**
   * Cached read of the build-time build-version file. `undefined` = not yet read, `null` = absent (dev / pre-feature
   * build / unparsable).
   */
  private _clientBuildVersionFile: ClientBuildVersionFile | null | undefined = undefined

  /**
   * Lazily read the build-version file emitted at build time. PRODUCTION-BUILD-ONLY (same gate as the preload
   * manifest): in dev nothing is bundled and a stale `dist` version from an earlier `point0 build` must never leak into
   * dev serving. Cached; `null` when missing.
   */
  private async readClientBuildVersionFile(): Promise<ClientBuildVersionFile | null> {
    if (!_point0_env.build.was) {
      return null
    }
    if (this._clientBuildVersionFile !== undefined) {
      return this._clientBuildVersionFile
    }
    this._clientBuildVersionFile = null
    try {
      const outdir = this.getBuildPaths().outdir
      if (outdir) {
        const file = Bun.file(nodePath.join(outdir, ...getClientBuildVersionPathSegments(this.scope)))
        if (await file.exists()) {
          const parsed = JSON.parse(await file.text()) as ClientBuildVersionFile
          if (typeof parsed.buildVersion === 'string' && parsed.buildVersion.length > 0) {
            this._clientBuildVersionFile = parsed
          }
        }
      }
    } catch {
      this._clientBuildVersionFile = null
    }
    return this._clientBuildVersionFile
  }

  /** The build-time client build version (see {@link readClientBuildVersionFile}); `null` when missing. */
  async getClientBuildVersion(): Promise<string | null> {
    const file = await this.readClientBuildVersionFile()
    return file?.buildVersion ?? null
  }

  /** Cached Set of the build-assets file's `files`. `undefined` = not yet read, `null` = file absent/unparsable. */
  private _clientBuildAssetPaths: Set<string> | null | undefined = undefined

  /**
   * Whether a public pathname is one of this client build's content-hashed emitted files (a bundler chunk including the
   * entry, or an `_point0/assets/*` byte) — the exact `files` set persisted into `build-assets.json` at build time. The
   * fetcher uses it to classify a publicdir-served file into the `asset` request variant (immutable URL) vs plain
   * `publicdir` (stable name). Read once and cached. PRODUCTION-BUILD-ONLY (same gate as the version file): always
   * `false` in dev (nothing is bundled), and for a dist built before the assets file existed.
   */
  async isClientBuildAssetPath(pathname: string): Promise<boolean> {
    if (this._clientBuildAssetPaths === undefined) {
      this._clientBuildAssetPaths = await this.readClientBuildAssetPaths()
    }
    return this._clientBuildAssetPaths?.has(pathname) ?? false
  }

  /** Lazily read the build-assets file into a Set. Same prod-only gate and resilience as the version file. */
  private async readClientBuildAssetPaths(): Promise<Set<string> | null> {
    if (!_point0_env.build.was) {
      return null
    }
    try {
      const outdir = this.getBuildPaths().outdir
      if (outdir) {
        const file = Bun.file(nodePath.join(outdir, ...getClientBuildAssetsPathSegments(this.scope)))
        if (await file.exists()) {
          const parsed = JSON.parse(await file.text()) as ClientBuildAssetsFile
          if (Array.isArray(parsed.files)) {
            return new Set(parsed.files)
          }
        }
      }
    } catch {
      return null
    }
    return null
  }

  async cleanClient(): Promise<boolean> {
    const outdir = this.outdir
    if (!outdir) {
      return false
    }
    await nodeFs.rm(outdir, { recursive: true }).catch(() => {
      /* ignore */
    })
    return true
  }

  async clean(): Promise<{ client: boolean; publicdir: boolean }> {
    const [client, publicdir] = await Promise.all([
      this.cleanClient(),
      this.publicdir ? this.publicdir.clean() : Promise.resolve(false),
    ])
    return { client, publicdir }
  }

  async buildClient(options?: {
    bunBuildConfig?: EngineClientBuildConfigDefinition
    clean?: boolean
  }): Promise<string[] | null> {
    const { bunBuildConfig, clean } = options ?? {}
    if (this.viteConfig) {
      return await this.buildByVite({ clean })
    } else {
      return await this.buildByBun({ bunBuildConfig, clean })
    }
  }

  async build(options?: {
    bunBuildConfig?: EngineClientBuildConfigDefinition
    clean?: boolean
    publicdir?: boolean
  }): Promise<{ client: string[] | null; publicdir: string[] | null }> {
    const { bunBuildConfig, clean = false, publicdir = true } = options ?? {}
    if (clean) {
      await this.clean()
    }
    const publicdirBuildOutput = !publicdir || !this.publicdir ? null : await this.publicdir.build() // we do not do it in Promise.all, becouse we want dist files override publicdir files, in case if they are the same directory
    const client = await this.buildClient({ bunBuildConfig, clean: false }) // we clean already before
    return { client, publicdir: publicdirBuildOutput }
  }

  /**
   * Cached read of the build-time preload manifest. `undefined` = not yet read, `null` = absent (dev / pre-feature
   * build).
   */
  private _preloadManifest: PreloadManifest | null | undefined = undefined

  /**
   * Per page point: the source file(s) whose chunks should be preloaded for that page. Build-time input, set by the
   * engine right before the build from the in-memory compiler points ({@link import('./engine.js').Engine} →
   * `FilesGenerator.getPagePoints`), so it carries the page module's `pos.file` straight from the typed point — no
   * aggregator-text regex, no `import('…')` reverse-engineering. Defaults to `[]` (any build path that doesn't go
   * through `engine.build` → entry-closure preload only). Layouts are deliberately NOT listed here: a page statically
   * imports its layouts (`generalLayout.lets('page', …)`), so a layout's chunk is already in the page chunk's static
   * closure that {@link buildPreloadManifest} walks.
   */
  preloadPageSources: PagePreloadSources[] = []

  /**
   * Per component point: the source file(s) whose chunks should be preloaded when a loader payload references that
   * component (RSC). Same feeding path and best-effort semantics as {@link preloadPageSources}.
   */
  preloadComponentSources: PagePreloadSources[] = []

  /**
   * Build + write the per-client preload manifest (`<outdir>/_point0/<scope>/preload-manifest.json`) from the emitted
   * chunk graph.
   */
  private async writePreloadManifest({
    outdir,
    graph,
  }: {
    outdir: string
    graph: Parameters<typeof buildPreloadManifest>[0]['graph']
  }): Promise<void> {
    try {
      if (isModulePreloadDisabledByEnv(process.env.POINT0_MODULE_PRELOAD) || !graph.entryFile) {
        return
      }
      const manifest = buildPreloadManifest({
        graph,
        pages: this.preloadPageSources,
        components: this.preloadComponentSources,
      })
      await Bun.write(nodePath.join(outdir, ...getPreloadManifestPathSegments(this.scope)), JSON.stringify(manifest))
    } catch (error) {
      // Preload is a pure perf hint — never let manifest emission fail an otherwise-good build. Warn, then carry on.
      this.log({
        level: 'warn',
        category: ['client', 'preload'],
        message: `Failed to write the preload manifest for client "${this.scope}" (serving continues without per-page modulepreload)`,
        error,
      })
    }
  }

  /** Lazily read the preload manifest emitted at build time. Cached; null when missing. */
  private async getPreloadManifest(): Promise<PreloadManifest | null> {
    if (this._preloadManifest !== undefined) {
      return this._preloadManifest
    }
    this._preloadManifest = null
    try {
      const outdir = this.getBuildPaths().outdir
      if (outdir) {
        const file = Bun.file(nodePath.join(outdir, ...getPreloadManifestPathSegments(this.scope)))
        if (await file.exists()) {
          this._preloadManifest = JSON.parse(await file.text()) as PreloadManifest
        }
      }
    } catch {
      this._preloadManifest = null
    }
    return this._preloadManifest
  }

  /** Public-path chunks to `<link rel=modulepreload>` for a page point (entry shared closure + that page's extras). */
  private async resolvePagePreloads(pointName: string | undefined): Promise<string[]> {
    // PRODUCTION-BUILD-ONLY, and fully inert until then: in dev nothing is bundled and a stale `dist` manifest from an
    // earlier `point0 build` must never leak into the dev-served HTML (see {@link shouldServeModulePreload}). Gate first,
    // before touching the manifest, so in dev (and in the builder process) we read nothing and inject nothing.
    if (!shouldServeModulePreload({ buildWas: _point0_env.build.was, envFlag: process.env.POINT0_MODULE_PRELOAD })) {
      return []
    }
    const manifest = await this.getPreloadManifest()
    if (!manifest) {
      return []
    }
    return resolvePreloadsForPoint(manifest, pointName)
  }

  /**
   * Public-path chunks to `<link rel=modulepreload>` for component points referenced from a loader payload (RSC). Same
   * production-build-only gating as {@link resolvePagePreloads}; empty everywhere else, so the render path can call it
   * unconditionally.
   */
  private async resolveRscPreloads(componentNames: string[]): Promise<string[]> {
    if (!componentNames.length) {
      return []
    }
    if (!shouldServeModulePreload({ buildWas: _point0_env.build.was, envFlag: process.env.POINT0_MODULE_PRELOAD })) {
      return []
    }
    const manifest = await this.getPreloadManifest()
    if (!manifest) {
      return []
    }
    return resolveRscComponentPreloads(manifest, componentNames)
  }

  async renderAsReadableStream({
    executor,
    pagePoint,
    pageLocation,
    redirectPolicy,
    waitForAllReady,
  }: {
    executor: Executor<RequiredCtx, any>
    pagePoint: PagePoint | undefined
    pageLocation: AnyLocation
    redirectPolicy: 'continue' | 'throw'
    waitForAllReady?: boolean | 'auto'
  }): Promise<ReadableStream> {
    if (!this.points) {
      throw new Error('Client points not provided, so we can not render app as readable stream')
    }
    return await renderAppAsReadableStream({
      App: await this.getAppComponentForce(),
      executor,
      pagePoint,
      pageLocation,
      envVars: this.envVars,
      envConsts: this.envConsts,
      clientPoints: this.points,
      originalIndexHtml: await this.getOriginalIndexHtml(pageLocation.href ?? pageLocation.hrefRel),
      domRootElementId: this.domRootElementId,
      // Preload the entry's shared closure (every page) + THIS page's own lazy chunk/layouts (keyed by point name).
      modulePreloads: await this.resolvePagePreloads(pagePoint?.name),
      // RSC: component points referenced by the payload get preload links next to the embedded data.
      resolveRscComponentPreloads: (componentNames) => this.resolveRscPreloads(componentNames),
      redirectPolicy,
      waitForAllReady,
      ssrOptions: this._effectiveSsrOptions(pagePoint),
    })
  }

  // Per-page SSR render-loop options: `.ssr({...})` on the page overrides this client's defaults (not `enabled` — the
  // fetcher gate already decided whether to SSR this page).
  private _effectiveSsrOptions(pagePoint: PagePoint | undefined): SsrOptionsResolved {
    const pointSsr = pagePoint?._ssr
    if (!pointSsr) {
      return this.ssrDefaultOptions
    }
    // Override only the render-loop knobs the page set; `enabled` stays the client default (the fetcher gate handled it).
    const merged: SsrOptionsResolved = { ...this.ssrDefaultOptions }
    if (pointSsr.allowedDiscoveryRenders !== undefined)
      merged.allowedDiscoveryRenders = pointSsr.allowedDiscoveryRenders
    if (pointSsr.forbiddenDiscoveryRenders !== undefined)
      merged.forbiddenDiscoveryRenders = pointSsr.forbiddenDiscoveryRenders
    if (pointSsr.prefetchLoadersBeforePageRender !== undefined)
      merged.prefetchLoadersBeforePageRender = pointSsr.prefetchLoadersBeforePageRender
    return merged
  }

  async renderAsString({
    executor,
    pagePoint,
    pageLocation,
    redirectPolicy,
    waitForAllReady,
  }: {
    executor: Executor<RequiredCtx, any>
    pagePoint: PagePoint | undefined
    pageLocation: AnyLocation
    redirectPolicy: 'continue' | 'throw'
    waitForAllReady?: boolean | 'auto'
  }): Promise<string> {
    const readableStream = await this.renderAsReadableStream({
      executor,
      pagePoint,
      pageLocation,
      redirectPolicy,
      waitForAllReady,
    })
    return await readableStreamToString(readableStream)
  }

  async prefetchAppPagePointDeep({
    executor,
    pagePoint,
    pageLocation,
    redirectPolicy,
    target,
    suspenseQueryPolicy,
  }: {
    executor: Executor<RequiredCtx, any>
    pagePoint: PagePoint | undefined
    pageLocation: AnyLocation
    redirectPolicy: 'continue' | 'throw'
    target: Exclude<SsrTarget, 'none'>
    suspenseQueryPolicy?: 'background' | 'skip'
  }): Promise<void> {
    if (!this.points) {
      throw new Error('Client points not provided, so we can not prefetch app page point deep')
    }
    await executor.prefetchAppPagePointDeep({
      App: await this.getAppComponentForce(),
      renderToReadableStream,
      pageLocation,
      pagePoint,
      clientPoints: this.points,
      redirectPolicy,
      ssrOptions: this._effectiveSsrOptions(pagePoint),
      target,
      suspenseQueryPolicy,
    })
  }
}
