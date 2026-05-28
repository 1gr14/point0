import type { AnyRoute } from '@devp0nt/route0'
import { type AnyLocation, Route0 } from '@devp0nt/route0'
import type { CompilerOptions } from '@point0/compiler'
import { FileResolver, resolveTempDirPath } from '@point0/compiler'
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
import { _point0_env, ClientPoints } from '@point0/core'
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
} from './config.js'
import type { Executor } from './executor.js'
import { killPort } from './port.js'
import type { PublicdirDefinition } from './publicdir.js'
import { Publicdir } from './publicdir.js'
import { addEnvConstsToDocumentHtml, addEnvToDocumentHtml, renderAppAsReadableStream } from './render.js'
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
  getViteRoot,
  isAsyncFn,
  killSubprocessOnExit,
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
  ssr: boolean
  appProvided: EngineOptionsAppComponent | null
  App: TPrepared extends true ? AppComponent | null : undefined
  // appDistFile: string | null
  basepath: AnyRoute | undefined
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
    ssr: boolean
  }) {
    this.scope = input.scope
    this.cwd = input.cwd
    // this.pointsDistFile = input.pointsDistFile
    this.points = null as TPrepared extends true ? ClientPoints<TError> | null : undefined
    this.pointsProvided = input.pointsProvided
    this.appProvided = input.appProvided
    // this.appDistFile = input.appDistFile
    this.basepath = undefined
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
    this.ssr = input.ssr
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
    ssr: boolean
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
    POINT0_SSR: 'true' | 'false'
  } {
    const NODE_ENV = normalizeAndValidateNodeEnv(nodeEnvFallback)
    const POINT0_SCOPE = this.scope
    const POINT0_SIDE = 'client'
    const POINT0_SSR = this.ssr ? 'true' : 'false'
    this.envConsts.NODE_ENV = NODE_ENV
    this.envConsts.POINT0_SCOPE = POINT0_SCOPE
    this.envConsts.POINT0_SIDE = POINT0_SIDE
    this.envConsts.POINT0_SSR = POINT0_SSR
    if (!this.envVarsApplied) {
      this.envVarsApplied = true
      process.env.POINT0_STATIC_COMPILER_OPTIONS = JSON.stringify(
        this.getCompilerOptions({ built: _point0_env.build.was }),
      )
    }
    return { NODE_ENV, POINT0_SCOPE, POINT0_SIDE, POINT0_SSR }
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
    this.basepath = points?.basepath
    await this.readAppComponent()

    this.distIndexHtmlContent = _point0_env.build.was && this.indexHtml ? await Bun.file(this.indexHtml).text() : null
    this.prepared = true as never
    return this as EngineClient<true, TError>
  }

  isPrepared(): this is EngineClient<true, TError> {
    return !!this.prepared
  }

  async readPoints(): Promise<ClientPoints<TError> | null> {
    if (!this.pointsProvided) {
      return null
    }
    const points = await ClientPoints.createFromSource(this.pointsProvided, { log: this.log })
    this.points = points as TPrepared extends true ? ClientPoints<TError> | null : undefined
    return points
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
      basepath: this.basepath,
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
    const scriptPath = nodePath.join(tempDir, `serve.js`)
    const bunfigTomlPath = nodePath.join(tempDir, 'bunfig.toml')
    const combinedPluginsStrings = compilerOptions
      ? ['@point0/compiler/plugin/bun-static', ...pluginsStrings]
      : pluginsStrings
    const bunfigTomlContent = `[serve.static]
plugins = [${combinedPluginsStrings.map((p) => `"${p}"`).join(', ')}]
`

    // This broke everything, I do not know why, so hmr will be always enabled for now
    // please do not try this... Very hard to debug...
    // development: {
    //   hmr: ${this.hmrPort ? 'true' : 'false'},
    // },
    const scriptContent = `
import indexHtml from '${this.indexHtml}';
import { Engine } from '@point0/engine';
import { killPort } from '@point0/engine/port';
import { registerOnProcessExit } from '@point0/engine/utils';
import { env } from '@point0/core';
const { engine } = await Engine.findAndImportSelf({ engineFile: '${this.engineFile}' });
try {
  await engine.preload({ preventSetEnvVars: true });
  if (!env.mode.is.production) {
    await killPort([${this.port}, ${this.hmrPort}].filter(Boolean), { force: true, category: ['client'] })
  }
  const bunServer = Bun.serve({
    port: ${this.port},
    routes: {
      '/index.html': indexHtml,
    },
    fetch: async (request) => {
      if (request.headers.get('X-Point0-Middleware-Check-From-Server') === 'true') {
        return new Response('__NO_RESPONSE__', {
          headers: {
            'Content-Type': 'text/plain',
          },
          status: 404,
        })
      }
      const url = new URL(request.url)
      const forwardedHeaders = new Headers(request.headers)
      forwardedHeaders.set('X-Point0-Forwarded-From-Dev-Client', '${this.scope}')
      return await fetch(
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
    message: \`Client started http://localhost:${this.port} in \${Math.ceil(process.uptime() * 1000)}ms\`,
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
    killSubprocessOnExit(() => currentChild)

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
      const child = Bun.spawn(['bun', 'run', '--no-orphans', scriptPath], {
        cwd: tempDir,
        stdout: 'pipe',
        stderr: 'pipe',
        stdin: 'ignore',
        env: {
          ...process.env,
          FORCE_COLOR: process.env.FORCE_COLOR ?? '1',
          ...(compilerOptions ? { POINT0_STATIC_COMPILER_OPTIONS: JSON.stringify(compilerOptions) } : {}),
          NODE_ENV: process.env.NODE_ENV,
        },
      })
      pipeFilteredLogs({ stream: child.stdout, target: process.stdout })
      pipeFilteredLogs({ stream: child.stderr, target: process.stderr })
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
        message: `New file "${nodePath.relative(this.cwd, resolvedFile)}" detected — restarting client...`,
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
    const startingAt = new Date().getTime().toString()
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
    if (!_point0_env.mode.is.production) {
      await killPort([this.port, this.hmrPort].filter(Boolean) as number[], { force: true, category: ['client'] })
    }
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
              'Content-Type': 'text/html',
            },
          })
        }
        const middlewareResponse = await this.fetchViteDevServerMiddleware({
          request,
        })
        if (middlewareResponse) {
          return middlewareResponse
        }
        if (request.headers.get('X-Point0-Middleware-Check-From-Server') === 'true') {
          return new Response('__NO_RESPONSE__', {
            headers: {
              'Content-Type': 'text/plain',
            },
            status: 404,
          })
        }
        const forwardedHeaders = new Headers(request.headers)
        forwardedHeaders.set('X-Point0-Forwarded-From-Dev-Client', this.scope)
        const res = await fetch(`http://localhost:${this.server.port}${location.pathname}${location.searchString}`, {
          method: request.method,
          headers: forwardedHeaders,
          body: request.body,
          redirect: 'manual',
        })
        return res
      },
    })
    registerOnProcessExit(() => {
      void bunViteDevServer.stop()
    })
    const startingDurationMs = Math.round(new Date().getTime() - parseInt(startingAt))
    const startingDurationMsMessage = ` in ${startingDurationMs}ms`
    this.log({
      level: 'info',
      category: ['client'],
      message: `Client started http://localhost:${this.port}${startingDurationMsMessage}`,
    })
    return { bunViteDevServer, viteDevServer }
  }

  async dispose(): Promise<void> {
    if (!this.isPrepared()) {
      throw new Error('Client is not prepared')
    }
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
      middlewareRequestHeaders.set('X-Point0-Middleware-Check-From-Server', 'true')
      return await fetch(bunDevServerUrl, {
        method: request.method,
        headers: middlewareRequestHeaders,
        body: request.body,
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
      middlewareRequestHeaders.set('X-Point0-Middleware-Check-From-Server', 'true')
      const middlewareResponse = await fetch(`http://localhost:${this.port}${url.pathname}${url.search}`, {
        method: request.method,
        headers: middlewareRequestHeaders,
        // body: request.body, do not send body to middleware, becouse vite middle ware do not need, it and we ant it will be not read if we will pass it later out main middleware
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

  async getOriginalIndexHtmlWithEnvs(url: string): Promise<string> {
    const html = await this.getOriginalIndexHtml(url)
    const htmlWithEnvs = addEnvToDocumentHtml({ html, envVars: this.envVars, envConsts: this.envConsts })
    return htmlWithEnvs
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
          `globalThis.__POINT0_ENV_VARS__.${key}`,
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
        sourcemap: loadedViteConfig.build?.sourcemap ?? true,
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
      for (const rollupOutput of rollupOutputs) {
        if ('output' in rollupOutput) {
          const chunks = Array.isArray(rollupOutput.output) ? rollupOutput.output : []
          for (const chunk of chunks) {
            if ('fileName' in chunk && typeof chunk.fileName === 'string') {
              outputFiles.push(nodePath.resolve(buildPaths.outdir, chunk.fileName))
            }
          }
        }
      }
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
    const distIndexHtmlWithConsts = addEnvConstsToDocumentHtml({
      html: distIndexHtmlContent,
      envConsts,
    })
    if (distIndexHtmlWithConsts !== distIndexHtmlContent) {
      await Bun.write(indexHtmlDistPath, distIndexHtmlWithConsts)
    }
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
    waitForAllReady?: boolean
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
      redirectPolicy,
      waitForAllReady,
    })
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
    waitForAllReady?: boolean
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
  }: {
    executor: Executor<RequiredCtx, any>
    pagePoint: PagePoint | undefined
    pageLocation: AnyLocation
    redirectPolicy: 'continue' | 'throw'
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
    })
  }
}
