import { Route0, type AnyLocation } from '@devp0nt/route0'
import type { AppComponent, InputParsed, PagePoint, PointsScope, Request0 } from '@point0/core'
import { PointsManager, getHostnameOrNull } from '@point0/core'
import { toFetchResponse, toReqRes } from 'fetch-to-node'
import * as nodeFs from 'node:fs/promises'
import * as nodePath from 'node:path'
import { renderToReadableStream } from 'react-dom/server'
import type { ViteDevServer } from 'vite'
import type { AllPointsManagers } from './all-points-managers.js'
import type {
  EngineLogger,
  EngineOptionsAppComponent,
  EngineOptionsEnvParsed,
  EngineOptionsPoints,
  EngineOptionsPublicdirParsed,
  EngineOptionsViteConfig,
  ExtractedViteConfig,
} from './config.js'
import type { Executor } from './executor.js'
import { Publicdir } from './publicdir.js'
import { addEnvToDocumentHtml, renderAppAsReadableStream } from './render.js'
import type { ServerBun } from './server.js'
import type { ClientBunBuildConfigDefinition, ClientBunPluginsDefinition } from './utils.js'
import {
  createViteDevServer,
  extractClientBunBuildConfig,
  extractClientBunDevPluginsStrings,
  extractViteConfig,
  shakeItOnEngineHolderBuildPhase,
  resolveTempDirPath,
} from './utils.js'

export class ClientBun<TInitialized extends boolean = boolean> {
  cwd: string
  scope: PointsScope
  engineFile: string | null
  allPointsManagers: AllPointsManagers
  // pointsDistFile: string | null
  pointsProvided: EngineOptionsPoints
  pointsManager: TInitialized extends true ? PointsManager : PointsManager | null
  ssr: TInitialized extends true ? boolean : null
  appProvided: EngineOptionsAppComponent | null
  App: TInitialized extends true ? AppComponent | null : null
  // appDistFile: string | null
  // TODO: baseurl get from root point, and remove from config
  baseurl: string
  indexHtml: string | null
  // indexHtmlDistFile: string | null
  domRootElementId: string
  port: number
  hmrPort: number | null
  viteConfig: EngineOptionsViteConfig | null
  index: number
  logger: EngineLogger
  env: EngineOptionsEnvParsed
  publicdir: TInitialized extends true ? Publicdir<true> : Publicdir<false>
  outdir: string | null
  bunBuildConfig: ClientBunBuildConfigDefinition
  bunPlugins: ClientBunPluginsDefinition
  publicdirOutdir: string | null
  distIndexHtmlContent: string | null
  server: ServerBun
  // clientBunDevBuilder: Bun.Subprocess<'inherit', 'inherit', 'inherit'> | null
  // serverBunDevBuilder: Bun.Subprocess<'inherit', 'inherit', 'inherit'> | null
  viteDevServer: ViteDevServer | true | null
  bunNativeDevServer: Bun.Subprocess | true | null // true in case if it was run in separate process
  bunViteDevServer: Bun.Server<unknown> | true | null // true in case if it was run in separate process
  initialized: TInitialized

  private constructor(input: {
    scope: PointsScope
    initialized: TInitialized
    cwd: string
    // pointsDistFile: string | null
    pointsProvided: EngineOptionsPoints
    appProvided: EngineOptionsAppComponent | null
    // appDistFile: string | null
    baseurl: string
    indexHtml: string | null
    // indexHtmlDistFile: string | null
    engineFile: string | null
    outdir: string | null
    bunBuildConfig: ClientBunBuildConfigDefinition
    bunPlugins: ClientBunPluginsDefinition
    publicdirOutdir: string | null
    distIndexHtmlContent: string | null
    domRootElementId: string
    port: number
    hmrPort: number | null
    viteConfig: EngineOptionsViteConfig | null
    index: number
    logger: EngineLogger
    env: EngineOptionsEnvParsed
    publicdir: Publicdir
    allPointsManagers: AllPointsManagers
    bunNativeDevServer: Bun.Subprocess | true | null // true in case if it was run in separate process
    bunViteDevServer: Bun.Server<unknown> | true | null // true in case if it was run in separate process
    viteDevServer: ViteDevServer | true | null
    server: ServerBun
  }) {
    this.scope = input.scope
    this.cwd = input.cwd
    this.allPointsManagers = input.allPointsManagers
    // this.pointsDistFile = input.pointsDistFile
    this.pointsManager = null as TInitialized extends true ? PointsManager : null
    this.pointsProvided = input.pointsProvided
    this.appProvided = input.appProvided
    // this.appDistFile = input.appDistFile
    this.baseurl = input.baseurl
    this.indexHtml = input.indexHtml
    // this.indexHtmlDistFile = input.indexHtmlDistFile
    this.distIndexHtmlContent = input.distIndexHtmlContent
    this.domRootElementId = input.domRootElementId
    this.port = input.port
    this.hmrPort = input.hmrPort
    this.viteConfig = input.viteConfig
    this.index = input.index
    this.logger = input.logger
    this.env = { ...input.env, NODE_ENV: process.env.NODE_ENV }
    this.publicdir = input.publicdir as TInitialized extends true ? Publicdir<true> : Publicdir<false>
    this.outdir = input.outdir
    this.bunBuildConfig = input.bunBuildConfig
    this.bunPlugins = input.bunPlugins
    this.publicdirOutdir = input.publicdirOutdir
    // this.clientBunDevBuilder = input.clientBunDevBuilder
    // this.serverBunDevBuilder = input.serverBunDevBuilder
    this.viteDevServer = input.viteDevServer
    this.bunNativeDevServer = input.bunNativeDevServer
    this.bunViteDevServer = input.bunViteDevServer
    this.server = input.server
    this.initialized = input.initialized
    this.engineFile = input.engineFile
    this.ssr = null as TInitialized extends true ? boolean : null
    this.App = null as TInitialized extends true ? AppComponent : null
  }

  static create(input: {
    scope: PointsScope
    cwd: string
    pointsProvided: EngineOptionsPoints
    // pointsDistFile: string | null
    appProvided: EngineOptionsAppComponent | null
    // appDistFile: string | null
    baseurl: string
    publicdir: EngineOptionsPublicdirParsed
    outdir: string | null
    bunBuildConfig: ClientBunBuildConfigDefinition
    bunPlugins: ClientBunPluginsDefinition
    publicdirOutdir: string | null
    indexHtml: string | null
    // indexHtmlDistFile: string | null
    domRootElementId: string
    port: number
    hmrPort: number | null
    index: number
    logger: EngineLogger
    env: EngineOptionsEnvParsed
    engineFile: string | null
    allPointsManagers: AllPointsManagers
    viteConfig: EngineOptionsViteConfig | null
    server: ServerBun
  }): ClientBun<false> {
    const viteDevServer = null
    const bunNativeDevServer = null
    const bunViteDevServer = null

    const publicdir = Publicdir.create({
      hostname: getHostnameOrNull(input.baseurl),
      definition: input.publicdir,
      outdir: input.publicdirOutdir,
      scope: input.scope,
      server: null,
      client: null,
    })

    const distIndexHtmlContent = null

    const client = new ClientBun<false>({
      ...input,
      publicdir,
      distIndexHtmlContent,
      viteDevServer,
      bunNativeDevServer,
      bunViteDevServer,
      // clientBunDevBuilder,
      // serverBunDevBuilder,
      initialized: false,
    })
    publicdir.client = client

    return client
  }

  async init({
    preventDevServer = process.env.POINT0_PREVENT_CLIENT_DEV_SERVER === 'true',
  }: {
    // if we run server entries separately, then we we will run in another processes client dev server once
    preventDevServer?: boolean
  }): Promise<ClientBun<true>> {
    if (this.isInitialized()) {
      return this as ClientBun<true>
    }

    // const devServersStart = performance.now()
    const [{ bunViteDevServer, viteDevServer }, bunNativeDevServer] = await Promise.all([
      this.viteConfig && process.env.NODE_ENV !== 'production'
        ? preventDevServer
          ? { bunViteDevServer: true as const, viteDevServer: true as const }
          : this.startBunViteDevServer()
        : { bunViteDevServer: null, viteDevServer: null },
      this.indexHtml && !this.viteConfig && process.env.NODE_ENV !== 'production'
        ? preventDevServer
          ? (true as const)
          : this.startBunNativeDevServer()
        : null,
    ])
    this.bunViteDevServer = bunViteDevServer
    this.viteDevServer = viteDevServer
    this.bunNativeDevServer = bunNativeDevServer

    const pointsManager = await this.initPointsManager()
    await this.initAppComponent()

    this.ssr = pointsManager.ssr as TInitialized extends true ? boolean : null

    await this.publicdir.init()

    this.distIndexHtmlContent =
      process.env.NODE_ENV === 'production' && this.indexHtml ? await Bun.file(this.indexHtml).text() : null
    this.initialized = true as never
    return this as ClientBun<true>
  }

  isInitialized(): this is ClientBun<true> {
    return !!this.initialized
  }

  async initPointsManager(): Promise<PointsManager> {
    const pointsManager = PointsManager.create(await this.pointsProvided())
    this.pointsManager = pointsManager as TInitialized extends true ? PointsManager : PointsManager | null
    return pointsManager
  }

  async initAppComponent(): Promise<AppComponent | null> {
    if (!this.appProvided) {
      this.App = null
      return null
    }
    const result = await this.appProvided()
    if ('default' in result && typeof result.default === 'function') {
      this.App = result.default as TInitialized extends true ? AppComponent : null
      return result.default
    }
    this.App = result as TInitialized extends true ? AppComponent : null
    return result as TInitialized extends true ? AppComponent : null
  }

  async startDevServer(): Promise<void> {
    await Promise.all([
      this.viteConfig && process.env.NODE_ENV !== 'production' ? this.startBunViteDevServer() : null,
      this.indexHtml && !this.viteConfig && process.env.NODE_ENV !== 'production'
        ? this.startBunNativeDevServer()
        : null,
    ])
  }

  async startBunNativeDevServer(): Promise<Bun.Subprocess> {
    if (!this.indexHtml) {
      throw new Error(`Index HTML file path is not provided for client "${this.scope}"`)
    }
    if (!this.engineFile) {
      throw new Error(`Engine file path is not provided for client "${this.scope}"`)
    }
    const tempDir = resolveTempDirPath(['client-bun-dev-server', this.scope])
    const pluginsStrings = await extractClientBunDevPluginsStrings({
      cwd: this.cwd,
      environment: process.env.NODE_ENV ?? 'development',
      command: 'serve',
      bunPlugins: this.bunPlugins,
      errorOnNotString: `Bun dev server plugins for client "${this.scope}" shpuld be strings`,
    })
    const scriptPath = nodePath.join(tempDir, 'serve.js')
    const bunfigTomlPath = nodePath.join(tempDir, 'bunfig.toml')
    const bunfigTomlContent = `[serve.static]
plugins = ["@point0/compiler/plugin/bun-static", ${pluginsStrings.map((p) => `"${p}"`).join(', ')}]
`
    const scriptContent = `
import indexHtml from '${this.indexHtml}';
Bun.serve({
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
    forwardedHeaders.set('X-Point0-Forwarded-From-Dev-Client-Server', 'true')
    return await fetch(
      \`http://localhost:${this.server.port}\${url.pathname}\${url.search}\`,
      {
        method: request.method,
        headers: forwardedHeaders,
        body: request.body,
      },
    )
  },
});
`
    await Bun.write(bunfigTomlPath, bunfigTomlContent)
    await Bun.write(scriptPath, scriptContent)
    const childProcess = Bun.spawn(['bun', scriptPath], {
      cwd: tempDir,
      stdout: 'inherit',
      stderr: 'inherit',
      stdin: 'inherit',
      env: {
        ...process.env,
        // FORCE_COLOR: '1',
        POINT0_COMPILER_OPTIONS: JSON.stringify({ target: 'client' }),
        NODE_ENV: process.env.NODE_ENV,
      },
    })
    this.logger.info(`${this.scope} dev server started`)
    // ... I was trying to prevent console clearing on bun fullstack server hmr ...
    // const buffer = ''
    // function filterClearSequences(chunk: string) {
    //   buffer += chunk

    //   // ONLY remove real clear-screen sequences
    //   buffer = buffer
    //     .replace(/\x1bc/g, '') // RIS
    //     .replace(/\x1b\[2J/g, '') // clear screen
    //     .replace(/\x1b\[3J/g, '') // clear scrollback
    //     .replace(/\x1b\[H\x1b\[2J/g, '') // home + clear
    //     .replace(/\x1b\[1;1H\x1b\[2J/g, '') // alternate form

    //   const out = buffer
    //   buffer = ''
    //   return out
    // }
    // void childProcess.stdout.pipeTo(
    //   new WritableStream({
    //     write(chunk) {
    //       const text = typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk)
    //       process.stdout.write(text)
    //       // const cleaned = filterClearSequences(text)
    //       // process.stdout.write(chunk)
    //       // process.stdout.write(cleaned)
    //     },
    //   }),
    // )
    // void childProcess.stderr.pipeTo(
    //   new WritableStream({
    //     write(chunk) {
    //       const text = typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk)
    //       process.stdout.write(text)
    //       // const cleaned = filterClearSequences(text)
    //       // process.stdout.write(chunk)
    //       // process.stdout.write(cleaned)
    //     },
    //   }),
    // )
    this.bunNativeDevServer = childProcess
    return childProcess
  }

  async startBunViteDevServer(): Promise<{
    bunViteDevServer: Bun.Server<unknown>
    viteDevServer: ViteDevServer
  }> {
    if (!this.viteConfig) {
      throw new Error(`Vite config not found for client "${this.scope}"`)
    }
    const viteDevServer = await createViteDevServer({
      viteConfig: this.viteConfig,
      scope: this.scope,
      target: 'client',
      hmrPort: this.hmrPort,
      env: this.env,
    })
    this.viteDevServer = viteDevServer
    if (!this.indexHtml) {
      throw new Error(`Index HTML file path is not provided for client "${this.scope}"`)
    }
    const srcIndexHtmlContent = await Bun.file(this.indexHtml).text()
    const bunViteDevServer = Bun.serve({
      port: this.port,
      development: {
        console: false,
        hmr: false,
      },
      fetch: async (originalRequest) => {
        const location = Route0.getLocation(originalRequest.url)
        if (location.pathname === '/index.html') {
          const originalIndexHtml = await viteDevServer.transformIndexHtml(originalRequest.url, srcIndexHtmlContent)
          return new Response(originalIndexHtml, {
            headers: {
              'Content-Type': 'text/html',
            },
          })
        }
        const middlewareResponse = await this.fetchViteDevServerMiddleware({
          request: { original: originalRequest, location },
        })
        if (middlewareResponse) {
          return middlewareResponse
        }
        if (originalRequest.headers.get('X-Point0-Middleware-Check-From-Server') === 'true') {
          return new Response('__NO_RESPONSE__', {
            headers: {
              'Content-Type': 'text/plain',
            },
            status: 404,
          })
        }
        const forwardedHeaders = new Headers(originalRequest.headers)
        forwardedHeaders.set('X-Point0-Forwarded-From-Dev-Client-Server', 'true')
        const res = await fetch(`http://localhost:${this.server.port}${location.pathname}${location.search}`, {
          method: originalRequest.method,
          headers: forwardedHeaders,
          body: originalRequest.body,
        })
        return res
      },
    })
    this.logger.info(`${this.scope} dev server started`)
    return { bunViteDevServer, viteDevServer }
  }

  async dispose(): Promise<void> {
    if (!this.isInitialized()) {
      throw new Error('Client is not initialized')
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
    request: Request0
    bunServer: Bun.Server<unknown>
  }): Promise<{ result: Response | undefined } | undefined> {
    if (!this.bunNativeDevServer) {
      return undefined
    }
    if (request.original.headers.get('upgrade') !== 'websocket') {
      return undefined
    }
    if (!request.location.pathname.startsWith('/_bun/')) {
      return undefined
    }
    const bunNativeDevServerWsUrl = `ws://localhost:${this.port}${request.location.pathname}${request.location.search}`

    // Upgrade the connection and store upstream URL in data
    const upgraded = bunServer.upgrade(request.original, {
      data: { wsUrl: bunNativeDevServerWsUrl },
    })

    if (!upgraded) {
      return { result: new Response('WebSocket upgrade failed', { status: 400 }) }
    }

    // Return undefined to indicate WebSocket upgrade was successful
    return { result: undefined }
  }

  async fetchBunDevServerMiddleware({ request }: { request: Request0 }): Promise<Response | undefined> {
    const bunNativeDevServer = this.bunNativeDevServer
    if (!bunNativeDevServer) {
      return undefined
    }
    const pathname = request.location.pathname
    if (pathname.startsWith('/_bun/')) {
      const bunDevServerUrl = `http://localhost:${this.port}${pathname}${request.location.search}`
      const middlewareRequestHeaders = new Headers(request.original.headers)
      middlewareRequestHeaders.set('X-Point0-Middleware-Check-From-Server', 'true')
      return await fetch(bunDevServerUrl, {
        method: request.original.method,
        headers: middlewareRequestHeaders,
        body: request.original.body,
      })
    }
    return undefined
  }

  async fetchViteDevServerMiddleware({
    request,
  }: {
    request: Pick<Request0, 'original' | 'location'>
  }): Promise<Response | undefined> {
    const viteDevServer = this.viteDevServer
    if (!viteDevServer) {
      return undefined
    }
    if (viteDevServer === true) {
      const middlewareRequestHeaders = new Headers(request.original.headers)
      middlewareRequestHeaders.set('X-Point0-Middleware-Check-From-Server', 'true')
      const middlewareResponse = await fetch(
        `http://localhost:${this.port}${request.location.pathname}${request.location.search}`,
        {
          method: request.original.method,
          headers: middlewareRequestHeaders,
          // body: request.body, do not send body to middleware, becouse vite middle ware do not need, it and we ant it will be not read if we will pass it later out main middleware
        },
      )
      if (middlewareResponse.status === 404) {
        return undefined
      }
      return middlewareResponse
    }
    const { req, res } = toReqRes(request.original)
    let nextCalled = false
    let nextError: any = undefined
    let nextResolve: (() => void) | undefined = undefined

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

  async getOriginalIndexHtml(url: string): Promise<string> {
    if (!this.isInitialized()) {
      throw new Error('Client is not initialized')
    }

    if (!this.indexHtml) {
      throw new Error(`indexHtml not found for client "${this.scope}"`)
    }
    if (process.env.NODE_ENV !== 'production') {
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
    const htmlWithEnvs = addEnvToDocumentHtml({ html, env: this.env })
    return htmlWithEnvs
  }

  async getAppComponentForce(): Promise<AppComponent> {
    if (!this.isInitialized()) {
      throw new Error('Client is not initialized')
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
    bunBuildConfig?: ClientBunBuildConfigDefinition
    clean?: boolean
  }): Promise<string[] | null> {
    return await shakeItOnEngineHolderBuildPhase(async () => {
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

      const NODE_ENV = process.env.NODE_ENV ?? 'production'
      process.env.NODE_ENV = NODE_ENV

      const thisBunBuildConfig = await extractClientBunBuildConfig({
        environment: NODE_ENV,
        bunBuildConfig: this.bunBuildConfig,
        bunPlugins: this.bunPlugins,
      })
      const providedBunBuildConfig = bunBuildConfig
        ? await extractClientBunBuildConfig({
            environment: NODE_ENV,
            bunBuildConfig,
            bunPlugins: [],
          })
        : {}

      const compilerPlugin = await import('@point0/compiler/plugin/bun').then((module) =>
        module.compilerBunPlugin({ target: 'client', scope: this.scope }),
      )

      const buildOutput = await Bun.build({
        target: 'browser',
        format: 'esm',
        splitting: true,
        sourcemap: NODE_ENV === 'production' ? 'external' : 'inline',
        publicPath: '/',
        minify: NODE_ENV === 'production',
        ...thisBunBuildConfig,
        ...providedBunBuildConfig,
        plugins: [...(thisBunBuildConfig.plugins ?? []), compilerPlugin],
        entrypoints: [
          buildPaths.indexHtml,
          ...(thisBunBuildConfig.entrypoints ?? []),
          ...(providedBunBuildConfig.entrypoints ?? []),
        ],
        outdir: buildPaths.outdir,
        define: {
          ...thisBunBuildConfig.define,
          ...providedBunBuildConfig.define,
          ...(NODE_ENV ? { 'process.env.NODE_ENV': JSON.stringify(NODE_ENV) } : {}),
          'process.env.POINT0_TARGET': JSON.stringify('client'),
          'process.env.POINT0_SCOPE': JSON.stringify(this.scope),
        },
      })
      return buildOutput.outputs.map((output) => output.path)
    })
  }

  async buildByVite(options?: { clean?: boolean }): Promise<string[] | null> {
    return await shakeItOnEngineHolderBuildPhase(async () => {
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

      const NODE_ENV = process.env.NODE_ENV || 'production'
      const loadedViteConfig = await extractViteConfig({
        viteConfig: this.viteConfig,
        command: 'build',
        target: 'client',
      })

      if (!(await Bun.file(buildPaths.indexHtml).exists())) {
        throw new Error(`Input file does not exist: ${buildPaths.indexHtml} for client "${this.scope}"`)
      }

      const existingRollupOptionsOutput = loadedViteConfig.build?.rollupOptions?.output
      const normalizedExistsingRollupOptionsOutput =
        (Array.isArray(existingRollupOptionsOutput) ? existingRollupOptionsOutput[0] : existingRollupOptionsOutput) ||
        {}
      const rollupOptionsOutput: Extract<
        NonNullable<NonNullable<ExtractedViteConfig['build']>['rollupOptions']>['output'],
        object
      > = {
        ...normalizedExistsingRollupOptionsOutput,
        // may be we will later add something here
      }
      const fixedExistingRollupOptionsOutput = Array.isArray(existingRollupOptionsOutput)
        ? [rollupOptionsOutput, ...existingRollupOptionsOutput.slice(1)]
        : rollupOptionsOutput

      const viteRoot = loadedViteConfig.root || nodePath.dirname(buildPaths.indexHtml) || this.cwd

      const compilerPlugin = await import('@point0/compiler/plugin/vite').then((module) =>
        module.compilerVitePlugin({ target: 'client', scope: this.scope }),
      )

      const config: ExtractedViteConfig = {
        ...loadedViteConfig,
        plugins: [...(loadedViteConfig.plugins ?? []), compilerPlugin],
        root: viteRoot,
        build: {
          ...loadedViteConfig.build,
          outDir: buildPaths.outdir,
          minify: NODE_ENV === 'production' ? (loadedViteConfig.build?.minify ?? 'esbuild') : false,
          sourcemap: loadedViteConfig.build?.sourcemap ?? true,
          rollupOptions: {
            ...loadedViteConfig.build?.rollupOptions,
            input: buildPaths.indexHtml,
            output: fixedExistingRollupOptionsOutput,
          },
          copyPublicDir: false,
          emptyOutDir: false,
        },
        define: {
          ...loadedViteConfig.define,
          ...Object.fromEntries(
            Object.entries(this.env).map(([key, value]) => [`process.env.${key}`, JSON.stringify(value)]),
          ),
          ...Object.fromEntries(
            Object.entries(this.env).map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)]),
          ),
          'process.env.NODE_ENV': JSON.stringify(NODE_ENV),
          'process.env.POINT0_TARGET': JSON.stringify('client'),
          'process.env.POINT0_SCOPE': JSON.stringify(this.scope),
        },
      }

      const buildResult = await viteBuild(config)

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
    })
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
    const [client, publicdir] = await Promise.all([this.cleanClient(), this.publicdir.clean()])
    return { client, publicdir }
  }

  async buildClient(options?: {
    bunBuildConfig?: ClientBunBuildConfigDefinition
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
    bunBuildConfig?: ClientBunBuildConfigDefinition
    clean?: boolean
    publicdir?: boolean
  }): Promise<{ client: string[] | null; publicdir: string[] | null }> {
    const { bunBuildConfig, clean = false, publicdir = true } = options ?? {}
    if (clean) {
      await this.clean()
    }
    const publicdirBuildOutput = !publicdir ? null : await this.publicdir.build() // we do not do it in Promise.all, becouse we want dist files override publicdir files, in case if they are the same directory
    const client = await this.buildClient({ bunBuildConfig, clean: false }) // we clean already before
    return { client, publicdir: publicdirBuildOutput }
  }

  async renderAsReadableStream({
    executor,
    pagePoint,
    pageLocation,
    input,
  }: {
    executor: Executor
    pagePoint: PagePoint | undefined
    pageLocation: AnyLocation
    input: InputParsed
  }): Promise<ReadableStream> {
    return await renderAppAsReadableStream({
      App: await this.getAppComponentForce(),
      executor,
      pagePoint,
      pageLocation,
      input,
      env: this.env,
      originalIndexHtml: await this.getOriginalIndexHtml(pageLocation.href ?? pageLocation.hrefRel),
      domRootElementId: this.domRootElementId,
    })
  }

  async prefetchAppPagePointDeep({
    executor,
    pagePoint,
    pageLocation,
    input,
  }: {
    executor: Executor
    pagePoint: PagePoint | undefined
    pageLocation: AnyLocation
    input: InputParsed
  }): Promise<void> {
    await executor.prefetchAppPagePointDeep({
      App: await this.getAppComponentForce(),
      renderToReadableStream,
      pageLocation,
      pagePoint,
      input,
    })
  }
}
