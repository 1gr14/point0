import type { AnyLocation } from '@devp0nt/route0'
import type { Eversion } from '@point0/core/eversion'
import type { EversionRun, ExtractResult } from '@point0/core/eversion-run'
import type { AppComponent } from '@point0/core/mount'
import type { LazyPointsModule, ReadyPointsModule } from '@point0/core/points'
import { Points } from '@point0/core/points'
import type { AnyPoint, InputParsed, PointsScope } from '@point0/core/types'
import type { ParsedUrl } from '@point0/core/utils'
import { parseUrl } from '@point0/core/utils'
import * as nodeFs from 'node:fs/promises'
import * as nodePath from 'node:path'
import { Readable } from 'node:stream'
import { renderToReadableStream } from 'react-dom/server'
import type { ViteDevServer } from 'vite'
import type {
  EngineLogger,
  EngineOptionsEnvParsed,
  EngineOptionsPublicdirParsed,
  EngineOptionsViteConfig,
  ExtractedViteConfig,
} from './config.js'
import { Publicdir } from './publicdir.js'
import { addEnvToDocumentHtml, renderAppAsReadableStream } from './render.js'
import type { ServerBun } from './server.js'
import {
  extractClientBunBuildConfig,
  extractClientBunPlugins,
  loadBunPlugins,
  toJsExtension,
  validateEntrypoints,
  withError,
  type ClientBunBuildConfigDefinition,
  type ClientBunPluginsDefinition,
} from './utils.js'

export class ClientBun<TInitialized extends boolean = boolean> {
  cwd: string
  scope: PointsScope
  engineFile: string | null
  eversion: TInitialized extends true ? Eversion : Eversion | null
  providedPoints: Points | null
  pointsFile: string | null
  points: TInitialized extends true ? Points : Points | null
  ssr: boolean
  providedAppComponent: AppComponent | null
  appFile: string | null
  hostname: string | null
  basepath: string
  indexHtml: string | null
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
  serverOutdir: string | null
  publicdirOutdir: string | null
  distIndexHtmlContent: string | null
  server: ServerBun
  clientBunDevServer: Bun.Subprocess | null
  serverViteDevServer: ViteDevServer | null
  clientViteDevServer: ViteDevServer | null
  initialized: TInitialized
  prune: boolean
  pruneServer: boolean

  private constructor(input: {
    scope: PointsScope
    initialized: TInitialized
    cwd: string
    providedPoints: Points | null
    pointsFile: string | null
    points: Points | null
    ssr: boolean
    providedAppComponent: AppComponent | null
    appFile: string | null
    hostname: string | null
    basepath: string
    indexHtml: string | null
    engineFile: string | null
    outdir: string | null
    serverOutdir: string | null
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
    eversion: Eversion | null
    clientBunDevServer: Bun.Subprocess | null
    serverViteDevServer: ViteDevServer | null
    clientViteDevServer: ViteDevServer | null
    server: ServerBun
    prune: boolean
    pruneServer: boolean
  }) {
    this.scope = input.scope
    this.cwd = input.cwd
    this.eversion = input.eversion as TInitialized extends true ? Eversion : Eversion | null
    this.providedPoints = input.providedPoints
    this.pointsFile = input.pointsFile
    this.points = input.points as TInitialized extends true ? Points : Points | null
    this.ssr = input.ssr
    this.providedAppComponent = input.providedAppComponent
    this.appFile = input.appFile
    this.hostname = input.hostname
    this.basepath = input.basepath
    this.indexHtml = input.indexHtml
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
    this.serverOutdir = input.serverOutdir
    this.bunBuildConfig = input.bunBuildConfig
    this.bunPlugins = input.bunPlugins
    this.publicdirOutdir = input.publicdirOutdir
    this.clientViteDevServer = input.clientViteDevServer
    this.clientBunDevServer = input.clientBunDevServer
    this.serverViteDevServer = input.serverViteDevServer
    this.server = input.server
    this.initialized = input.initialized
    this.prune = input.prune
    this.pruneServer = input.pruneServer
    this.engineFile = input.engineFile
  }

  static create(input: {
    scope: PointsScope
    cwd: string
    points: Points | string
    ssr: boolean
    app: AppComponent | string | null
    hostname: string | null
    basepath: string
    publicdir: EngineOptionsPublicdirParsed
    outdir: string | null
    serverOutdir: string | null
    bunBuildConfig: ClientBunBuildConfigDefinition
    bunPlugins: ClientBunPluginsDefinition
    publicdirOutdir: string | null
    indexHtml: string | null
    domRootElementId: string
    port: number
    hmrPort: number | null
    index: number
    logger: EngineLogger
    env: EngineOptionsEnvParsed
    engineFile: string | null
    eversion: Eversion | null
    viteConfig: EngineOptionsViteConfig | null
    server: ServerBun
    prune: boolean
    pruneServer: boolean
  }): ClientBun<false> {
    const providedPoints = typeof input.points === 'string' ? null : input.points
    const pointsFile = typeof input.points === 'string' ? input.points : null
    const points = null

    const serverViteDevServer = null
    const clientViteDevServer = null
    const clientBunDevServer = null

    const publicdir = Publicdir.create({
      hostname: input.hostname,
      definition: input.publicdir,
      root: null,
      eversion: input.eversion,
      outdir: input.publicdirOutdir,
    })

    const distIndexHtmlContent = null

    const client = new ClientBun<false>({
      ...input,
      points,
      pointsFile,
      providedPoints,
      publicdir,
      providedAppComponent: !input.app || typeof input.app === 'string' ? null : input.app,
      appFile: typeof input.app === 'string' ? input.app : null,
      distIndexHtmlContent,
      clientViteDevServer,
      serverViteDevServer,
      clientBunDevServer,
      initialized: false,
    })

    return client
  }

  async init({ eversion }: { eversion: Eversion }): Promise<ClientBun<true>> {
    if (this.isInitialized()) {
      return this as ClientBun<true>
    }

    this.eversion = eversion

    this.clientViteDevServer =
      this.viteConfig && process.env.NODE_ENV !== 'production'
        ? await ClientBun.createViteDevServer({
            viteConfig: this.viteConfig,
            scope: this.scope,
            customer: 'client',
            hmrPort: this.hmrPort,
            env: this.env,
            prune: this.prune,
          })
        : null

    this.serverViteDevServer =
      this.viteConfig && process.env.NODE_ENV !== 'production'
        ? await ClientBun.createViteDevServer({
            viteConfig: this.viteConfig,
            scope: this.scope,
            customer: this.ssr ? 'serverSsr' : 'serverNoSsr',
            hmrPort: null,
            env: process.env,
            prune: this.pruneServer,
          })
        : null

    this.points = await ClientBun.createPoints({
      providedPoints: this.providedPoints,
      pointsFile: this.pointsFile,
      serverViteDevServer: this.serverViteDevServer,
      scope: this.scope,
    })

    await eversion.connect({ points: this.points })

    this.clientBunDevServer =
      this.indexHtml && !this.clientViteDevServer && process.env.NODE_ENV !== 'production'
        ? this.createClientBunDevServerInSeparateProcess()
        : null
    await this.publicdir.init({ root: this.points.root, eversion })

    this.distIndexHtmlContent =
      process.env.NODE_ENV === 'production' && this.indexHtml ? await Bun.file(this.indexHtml).text() : null
    this.initialized = true as never
    return this as ClientBun<true>
  }

  isInitialized(): this is ClientBun<true> {
    return !!this.initialized
  }

  static readonly createPoints = async ({
    providedPoints,
    pointsFile,
    serverViteDevServer,
    scope,
  }: {
    providedPoints: Points | null
    pointsFile: string | null
    serverViteDevServer: ViteDevServer | null
    scope: PointsScope
  }): Promise<Points> => {
    if (providedPoints) {
      return providedPoints
    }
    if (pointsFile) {
      if (serverViteDevServer) {
        return await Points.read(
          toJsExtension(pointsFile),
          async (absPath) =>
            (await serverViteDevServer.ssrLoadModule(toJsExtension(absPath))) as LazyPointsModule | ReadyPointsModule,
        )
      } else {
        // TODO: add option serverBunDevBuilder: true, thn we will build client and read points from dist dir
        return Points.create(
          await withError(
            async () => (await import(toJsExtension(pointsFile))) as LazyPointsModule | ReadyPointsModule,
            `Failed to import points from ${pointsFile} on client "${scope}"`,
          ),
        )
      }
    }
    throw new Error(`Points not provided for client "${scope}"`)
  }

  async createClientBunDevServer(): Promise<Bun.Server<unknown>> {
    if (!this.indexHtml) {
      throw new Error(`Index HTML file path is not provided for client "${this.scope}"`)
    }
    const extractedPlugins = await extractClientBunPlugins({
      nodeEnv: process.env.NODE_ENV,
      target: 'client',
      command: 'serve',
      bunPlugins: this.bunPlugins,
    })
    const prunePlugin = this.prune
      ? await import('./pruner-bun.js').then((module) => module.prunerBunPlugin({ customer: 'client' }))
      : null
    const extractedBunPlugins = [...extractedPlugins, ...(prunePlugin ? [prunePlugin] : [])]
    await loadBunPlugins({ extractedBunPlugins })
    return Bun.serve({
      port: this.port,
      routes: {
        '/index.html': await import(this.indexHtml).then((module) => module.default),
      },
    })
  }

  createClientBunDevServerInSeparateProcess(): Bun.Subprocess {
    if (!this.engineFile) {
      throw new Error(`Engine file path is not provided for client "${this.scope}"`)
    }
    const scriptPath = require.resolve('./client-bun-dev-server.js')
    const child = Bun.spawn(['bun', scriptPath, this.engineFile, this.scope], {
      stdio: ['inherit', 'inherit', 'inherit'],
    })
    return child
  }

  static async extractViteConfig({
    viteConfig,
    command,
    customer,
  }: {
    viteConfig: EngineOptionsViteConfig
    command: 'serve' | 'build'
    customer: 'client' | 'serverSsr' | 'serverNoSsr'
  }): Promise<ExtractedViteConfig> {
    return typeof viteConfig === 'function'
      ? await viteConfig({ command, mode: `${process.env.NODE_ENV || 'development'}-${customer}` })
      : typeof viteConfig === 'string'
        ? await (async () => {
            const importedViteConfig = await import(viteConfig).then((module) => module.default || module)
            if (typeof importedViteConfig === 'function') {
              return await importedViteConfig({ command, mode: `${process.env.NODE_ENV || 'development'}-${customer}` })
            }
            return importedViteConfig
          })()
        : await viteConfig
  }

  static async createViteDevServer({
    viteConfig,
    scope,
    customer,
    hmrPort,
    env,
    prune,
  }: {
    viteConfig: EngineOptionsViteConfig | null
    scope: PointsScope
    customer: 'client' | 'serverSsr' | 'serverNoSsr'
    hmrPort: number | null
    env?: EngineOptionsEnvParsed
    prune: boolean
  }): Promise<ViteDevServer> {
    if (!viteConfig) {
      throw new Error(`Vite config not found for client "${scope}"`)
    }
    const createServer = await import('vite').then((module) => module.createServer)
    const loadedViteConfig: ExtractedViteConfig = await ClientBun.extractViteConfig({
      viteConfig,
      command: 'serve',
      customer,
    })

    const prunePlugin = prune
      ? await import('./pruner-vite.js').then((module) => module.prunerVitePlugin({ customer }))
      : null

    return await createServer({
      ...loadedViteConfig,
      plugins: [...(loadedViteConfig.plugins ?? []), ...(prunePlugin ? [prunePlugin] : [])],
      configFile: false,
      clearScreen: loadedViteConfig.clearScreen ?? false,
      appType: 'custom',
      server: {
        ...loadedViteConfig.server,
        middlewareMode: true,
        hmr:
          loadedViteConfig.server?.hmr === false
            ? false
            : hmrPort === null
              ? false
              : {
                  ...(typeof loadedViteConfig.server?.hmr === 'object' ? loadedViteConfig.server.hmr : {}),
                  port: hmrPort,
                },
      },
      define: {
        ...loadedViteConfig.define,
        ...Object.fromEntries(
          Object.entries(env ?? {}).map(([key, value]) => [`process.env.${key}`, JSON.stringify(value)]),
        ),
        ...Object.fromEntries(
          Object.entries(env ?? {}).map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)]),
        ),
        // 'process.env.CUSTOMER': JSON.stringify(customer),
        // 'import.meta.env.CUSTOMER': JSON.stringify(customer),
        // ...(customer === 'serverSsr'
        //   ? {
        //       'process.env.SSR': JSON.stringify(true),
        //       'import.meta.env.SSR': JSON.stringify(true),
        //     }
        //   : {}),
        // ...(customer === 'serverSsr' || customer === 'serverNoSsr'
        //   ? {
        //       'process.env.IS_SERVER_CUSTOMER': JSON.stringify(true),
        //       'import.meta.env.IS_SERVER_CUSTOMER': JSON.stringify(true),
        //     }
        //   : {}),
        // ...(customer === 'client'
        //   ? {
        //       'process.env.IS_CLIENT_CUSTOMER': JSON.stringify(true),
        //       'import.meta.env.IS_CLIENT_CUSTOMER': JSON.stringify(true),
        //     }
        //   : {}),
      },
    })
  }

  async upgradeProxyBunDevServerWebSocket(
    request: Request,
    server: Bun.Server<unknown>,
    parsedUrl?: ParsedUrl,
  ): Promise<{ result: Response | undefined } | undefined> {
    if (!this.clientBunDevServer) {
      return undefined
    }
    if (request.headers.get('upgrade') !== 'websocket') {
      return undefined
    }
    parsedUrl ??= parseUrl(request.url)
    if (!parsedUrl.urlObj.pathname.startsWith('/_bun/')) {
      return undefined
    }
    const clientBunDevServerWsUrl = `ws://localhost:${this.port}${parsedUrl.urlObj.pathname}${parsedUrl.urlObj.search}`

    // Upgrade the connection and store upstream URL in data
    const upgraded = server.upgrade(request, {
      data: { wsUrl: clientBunDevServerWsUrl },
    })

    if (!upgraded) {
      return { result: new Response('WebSocket upgrade failed', { status: 400 }) }
    }

    // Return undefined to indicate WebSocket upgrade was successful
    return { result: undefined }
  }

  async fetchClientBunDevServerMiddleware(request: Request, parsedUrl?: ParsedUrl): Promise<Response | undefined> {
    const clientBunDevServer = this.clientBunDevServer
    if (!clientBunDevServer) {
      return undefined
    }
    parsedUrl ??= parseUrl(request.url)
    const pathname = parsedUrl.urlObj.pathname
    if (pathname.startsWith('/_bun/')) {
      const bunDevServerUrl = `http://localhost:${this.port}${pathname}${parsedUrl.urlObj.search}`
      return await fetch(bunDevServerUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      })
    }
    return undefined
  }

  async fetchClientViteDevServerMiddleware(request: Request, parsedUrl?: ParsedUrl): Promise<Response | undefined> {
    const clientViteDevServer = this.clientViteDevServer
    if (!clientViteDevServer) {
      return undefined
    }
    return await new Promise<Response | undefined>((resolve, reject) => {
      parsedUrl ??= parseUrl(request.url)
      const url = parsedUrl.urlObj
      const nodeReq = new Readable({
        read() {
          this.push(null)
        },
      }) as any

      nodeReq.method = request.method
      nodeReq.url = url.pathname + url.search
      nodeReq.originalUrl = nodeReq.url

      const headers: Record<string, string> = {}
      request.headers.forEach((value: string, key: string) => {
        headers[key.toLowerCase()] = value
      })
      nodeReq.headers = headers

      nodeReq.protocol = url.protocol.replace(':', '')
      nodeReq.hostname = url.hostname
      nodeReq.secure = nodeReq.protocol === 'https'

      nodeReq.socket = {
        encrypted: nodeReq.secure,
        remoteAddress: '127.0.0.1',
      }

      const middlewareHeaders = new Headers()
      let statusCode = 200
      let statusMessage = 'OK'
      let ended = false
      const chunks: Uint8Array[] = []

      const nodeRes: any = {
        statusCode,
        statusMessage,

        setHeader(name: string, value: any) {
          const v = Array.isArray(value) ? value.join(', ') : String(value)
          middlewareHeaders.set(name, v)
        },

        appendHeader(name: string, value: any) {
          const v = Array.isArray(value) ? value.join(', ') : String(value)
          const existing = middlewareHeaders.get(name)
          middlewareHeaders.set(name, existing ? `${existing}, ${v}` : v)
        },

        getHeader(name: string) {
          return middlewareHeaders.get(name) ?? undefined
        },

        removeHeader(name: string) {
          middlewareHeaders.delete(name)
        },

        writeHead(code: number, statusMessageOrHeaders?: any, maybeHeaders?: any) {
          statusCode = code
          nodeRes.statusCode = code

          let headers = undefined
          if (typeof statusMessageOrHeaders === 'string') {
            statusMessage = statusMessageOrHeaders
            nodeRes.statusMessage = statusMessageOrHeaders
            headers = maybeHeaders
          } else {
            headers = statusMessageOrHeaders
          }

          if (headers) {
            for (const [k, v] of Object.entries(headers)) {
              if (v != null) {
                nodeRes.setHeader(k, v)
              }
            }
          }
        },

        write(chunk: any) {
          if (!chunk) return
          if (typeof chunk === 'string') {
            chunks.push(new TextEncoder().encode(chunk))
          } else if (chunk instanceof Uint8Array) {
            chunks.push(chunk)
          } else {
            chunks.push(Buffer.from(chunk))
          }
        },

        end(chunk?: any) {
          if (ended) return
          ended = true
          if (chunk) nodeRes.write(chunk)

          const body = chunks.length === 0 ? null : new Blob(chunks as any)

          const response = new Response(body, {
            status: statusCode,
            headers: middlewareHeaders,
          })

          resolve(response)
        },
      }

      const next = (err?: any) => {
        if (err) {
          reject(err)
        } else {
          // Vite didn't handle this request
          if (!ended) {
            resolve(undefined)
          }
        }
      }

      clientViteDevServer.middlewares(nodeReq, nodeRes, next)
    })
  }

  async getOriginalIndexHtml(url: string): Promise<string> {
    if (!this.isInitialized()) {
      throw new Error('Client is not initialized')
    }

    if (!this.indexHtml) {
      throw new Error(`indexHtml not found for client "${this.scope}"`)
    }
    if (process.env.NODE_ENV !== 'production') {
      if (this.clientViteDevServer) {
        const originalIndexHtml = await this.clientViteDevServer.transformIndexHtml(
          url,
          await Bun.file(this.indexHtml).text(),
        )
        return originalIndexHtml
      } else if (this.clientBunDevServer) {
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

  async getFreshAppComponent(): Promise<AppComponent> {
    if (!this.isInitialized()) {
      throw new Error('Client is not initialized')
    }

    if (this.providedAppComponent) {
      return this.providedAppComponent
    }
    if (this.appFile) {
      if (this.serverViteDevServer) {
        const appComponent = (await this.serverViteDevServer
          .ssrLoadModule(toJsExtension(this.appFile))
          .then((module) => module.default || module)) as AppComponent | undefined
        if (!appComponent) {
          throw new Error(`App default export not found in ${this.appFile} for client "${this.scope}"`)
        }
        return appComponent
      } else {
        // TODO: add option serverBunDevBuilder: true, thn we will build client and read app from dist dir
        const appComponent = await import(toJsExtension(this.appFile)).then((module) => module.default || module)
        if (!appComponent) {
          throw new Error(`App default export not found in ${this.appFile} for client "${this.scope}"`)
        }
        return appComponent as AppComponent
      }
    }
    throw new Error(`App not provided for client "${this.scope}"`)
  }

  getAppPathOrNullOrThrow(): string | null {
    if (this.providedAppComponent && !this.appFile) {
      throw new Error(`If you want build client, you should provide app path, not app component itself in "app" option`)
    }
    return this.appFile
  }

  getPointsPathOrNullOrThrow(): string | null {
    if (this.providedPoints && !this.pointsFile) {
      throw new Error(`If you want build client, you should provide points path, not points itself in "points" option`)
    }
    return this.pointsFile
  }

  getBuildPaths(): {
    appFile: string | null
    pointsFile: string | null
    indexHtml: string | null
    outdir: string | null
    serverOutdir: string | null
    entrypointsExists: boolean
  } {
    const appFile = this.getAppPathOrNullOrThrow()
    const pointsFile = this.getPointsPathOrNullOrThrow()
    const indexHtml = this.indexHtml
    const entrypointsExists = !!(appFile || pointsFile || indexHtml)
    return {
      appFile,
      pointsFile,
      indexHtml,
      outdir: this.outdir,
      serverOutdir: this.serverOutdir,
      entrypointsExists,
    }
  }

  // TODO option to clear dist dir
  async buildByBunForClient(bunBuildConfig: ClientBunBuildConfigDefinition = {}): Promise<string[] | null> {
    if (!this.isInitialized()) {
      throw new Error('Client is not initialized')
    }

    const buildPaths = this.getBuildPaths()
    if (!buildPaths.indexHtml) {
      return null
    }
    if (!buildPaths.outdir) {
      throw new Error(`outdir not provided for client "${this.scope}"`)
    }

    const thisBunBuildConfig = await extractClientBunBuildConfig({
      nodeEnv: process.env.NODE_ENV,
      target: 'client',
      bunBuildConfig: this.bunBuildConfig,
      bunPlugins: this.bunPlugins,
    })
    const providedBunBuildConfig = await extractClientBunBuildConfig({
      nodeEnv: process.env.NODE_ENV,
      target: 'client',
      bunBuildConfig,
      bunPlugins: [],
    })

    const NODE_ENV = process.env.NODE_ENV

    const prunePlugin = this.prune
      ? await import('./pruner-bun.js').then((module) => module.prunerBunPlugin({ customer: 'client' }))
      : null

    const buildOutput = await Bun.build({
      target: 'browser',
      format: 'esm',
      splitting: true,
      sourcemap: 'external',
      publicPath: '/',
      minify: NODE_ENV === 'production',
      ...thisBunBuildConfig,
      ...providedBunBuildConfig,
      plugins: [...(thisBunBuildConfig.plugins ?? []), ...(prunePlugin ? [prunePlugin] : [])],
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
        'process.env.BUILD_TARGET': 'client',
      },
    })
    return buildOutput.outputs.map((output) => output.path)
  }

  async buildByBunForServer(bunBuildConfig: ClientBunBuildConfigDefinition = {}): Promise<string[] | null> {
    if (!this.isInitialized()) {
      throw new Error('Client is not initialized')
    }

    const buildPaths = this.getBuildPaths()
    if (!buildPaths.appFile && this.providedAppComponent) {
      throw new Error(
        `To build client "${this.scope}" for server, you should provide app path, not app component itself in "app" option`,
      )
    }
    if (!buildPaths.pointsFile && this.providedPoints) {
      throw new Error(
        `To build client "${this.scope}" for server, you should provide points path, not points itself in "points" option`,
      )
    }
    if (!buildPaths.appFile && !buildPaths.pointsFile) {
      return null
    }
    if (!buildPaths.serverOutdir) {
      throw new Error(`serverOutdir not provided for client "${this.scope}"`)
    }

    const NODE_ENV = process.env.NODE_ENV

    const thisBunBuildConfig = await extractClientBunBuildConfig({
      nodeEnv: NODE_ENV,
      target: this.ssr ? 'serverSsr' : 'serverNoSsr',
      bunBuildConfig: this.bunBuildConfig,
      bunPlugins: this.bunPlugins,
    })
    const providedBunBuildConfig = await extractClientBunBuildConfig({
      nodeEnv: NODE_ENV,
      target: this.ssr ? 'serverSsr' : 'serverNoSsr',
      bunBuildConfig,
      bunPlugins: [],
    })

    const prunePlugin = this.pruneServer
      ? await import('./pruner-bun.js').then((module) =>
          module.prunerBunPlugin({ customer: this.ssr ? 'serverSsr' : 'serverNoSsr' }),
        )
      : null

    const buildOutput = await Bun.build({
      target: 'bun',
      packages: 'external',
      sourcemap: 'linked',
      minify: true,
      splitting: true,
      format: 'esm',
      ...thisBunBuildConfig,
      ...providedBunBuildConfig,
      plugins: [...(thisBunBuildConfig.plugins ?? []), ...(prunePlugin ? [prunePlugin] : [])],
      naming: {
        ...(typeof thisBunBuildConfig.naming === 'object' ? thisBunBuildConfig.naming : {}),
        ...(typeof providedBunBuildConfig.naming === 'object' ? providedBunBuildConfig.naming : {}),
        entry: '[name].js',
      },
      entrypoints: validateEntrypoints([
        buildPaths.appFile,
        buildPaths.pointsFile,
        ...(thisBunBuildConfig.entrypoints ?? []),
        ...(providedBunBuildConfig.entrypoints ?? []),
      ]),
      outdir: buildPaths.serverOutdir,
      define: {
        ...thisBunBuildConfig.define,
        ...providedBunBuildConfig.define,
        'process.env.NODE_ENV': JSON.stringify(NODE_ENV),
        'process.env.BUILD_TARGET': 'server',
      },
    })
    return buildOutput.outputs.map((output) => output.path)
  }

  async buildByViteForClient(): Promise<string[] | null> {
    if (!this.isInitialized()) {
      throw new Error('Client is not initialized')
    }

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
    const NODE_ENV = process.env.NODE_ENV || 'production'
    const loadedViteConfig = await ClientBun.extractViteConfig({
      viteConfig: this.viteConfig,
      command: 'build',
      customer: 'client',
    })

    if (!(await Bun.file(buildPaths.indexHtml).exists())) {
      throw new Error(`Input file does not exist: ${buildPaths.indexHtml} for client "${this.scope}"`)
    }

    const existingRollupOptionsOutput = loadedViteConfig.build?.rollupOptions?.output
    const normalizedExistsingRollupOptionsOutput =
      (Array.isArray(existingRollupOptionsOutput) ? existingRollupOptionsOutput[0] : existingRollupOptionsOutput) || {}
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

    const prunePlugin = this.prune
      ? await import('./pruner-vite.js').then((module) => module.prunerVitePlugin({ customer: 'client' }))
      : null

    const config: ExtractedViteConfig = {
      ...loadedViteConfig,
      plugins: [...(loadedViteConfig.plugins ?? []), ...(prunePlugin ? [prunePlugin] : [])],
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
      },
      define: {
        ...loadedViteConfig.define,
        'process.env.NODE_ENV': JSON.stringify(NODE_ENV),
        'process.env.BUILD_TARGET': JSON.stringify('client'),
        ...Object.fromEntries(
          Object.entries(this.env).map(([key, value]) => [`process.env.${key}`, JSON.stringify(value)]),
        ),
        ...Object.fromEntries(
          Object.entries(this.env).map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)]),
        ),
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
  }

  async buildByViteForServer(): Promise<string[] | null> {
    if (!this.isInitialized()) {
      throw new Error('Client is not initialized')
    }

    if (!this.viteConfig) {
      throw new Error(`viteConfig not provided for client "${this.scope}"`)
    }
    const { build: viteBuild } = await import('vite')
    const buildPaths = this.getBuildPaths()
    if (!buildPaths.appFile && this.providedAppComponent) {
      throw new Error(
        `To build client "${this.scope}" for server, you should provide app path, not app component itself in "app" option`,
      )
    }
    if (!buildPaths.pointsFile && this.providedPoints) {
      throw new Error(
        `To build client "${this.scope}" for server, you should provide points path, not points itself in "points" option`,
      )
    }
    if (!buildPaths.appFile && !buildPaths.pointsFile) {
      return null
    }
    if (!buildPaths.serverOutdir) {
      throw new Error(`serverOutdir not provided for client "${this.scope}"`)
    }
    const NODE_ENV = process.env.NODE_ENV || 'production'
    const loadedViteConfig = await ClientBun.extractViteConfig({
      viteConfig: this.viteConfig,
      command: 'build',
      customer: this.ssr ? 'serverSsr' : 'serverNoSsr',
    })

    const existingRollupOptionsOutput = loadedViteConfig.build?.rollupOptions?.output
    const normalizedExistsingRollupOptionsOutput =
      (Array.isArray(existingRollupOptionsOutput) ? existingRollupOptionsOutput[0] : existingRollupOptionsOutput) || {}

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

    const viteRoot =
      loadedViteConfig.root ||
      (this.indexHtml && nodePath.dirname(this.indexHtml)) ||
      (typeof this.viteConfig === 'string' && nodePath.dirname(this.viteConfig)) ||
      this.cwd

    const prunePlugin = this.pruneServer
      ? await import('./pruner-vite.js').then((module) =>
          module.prunerVitePlugin({ customer: this.ssr ? 'serverSsr' : 'serverNoSsr' }),
        )
      : null

    const config: ExtractedViteConfig = {
      ...loadedViteConfig,
      plugins: [...(loadedViteConfig.plugins ?? []), ...(prunePlugin ? [prunePlugin] : [])],
      root: viteRoot,
      build: {
        ...loadedViteConfig.build,
        outDir: buildPaths.serverOutdir,
        minify: loadedViteConfig.build?.minify ?? true,
        sourcemap: loadedViteConfig.build?.sourcemap ?? true,
        ssr: true,
        rollupOptions: {
          ...loadedViteConfig.build?.rollupOptions,
          input: {
            ...(buildPaths.appFile ? { app: buildPaths.appFile } : {}),
            ...(buildPaths.pointsFile ? { points: buildPaths.pointsFile } : {}),
          },
          // external: createRollupOptionsExternalFunction(),
          output: fixedExistingRollupOptionsOutput,
        },
      },
      define: {
        ...loadedViteConfig.define,
        'process.env.NODE_ENV': JSON.stringify(NODE_ENV),
        'process.env.BUILD_TARGET': JSON.stringify('server'),
        ...Object.fromEntries(
          Object.entries(this.env).map(([key, value]) => [`process.env.${key}`, JSON.stringify(value)]),
        ),
        ...Object.fromEntries(
          Object.entries(this.env).map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)]),
        ),
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
            outputFiles.push(nodePath.resolve(buildPaths.serverOutdir, chunk.fileName))
          }
        }
      }
    }
    return outputFiles
  }

  async cleanSelf(): Promise<boolean> {
    const outdir = this.outdir
    if (!outdir) {
      return false
    }
    await nodeFs.rm(outdir, { recursive: true }).catch(() => {
      /* ignore */
    })
    return true
  }

  async cleanServer(): Promise<boolean> {
    const serverOutdir = this.serverOutdir
    if (!serverOutdir) {
      return false
    }
    await nodeFs.rm(serverOutdir, { recursive: true }).catch(() => {
      /* ignore */
    })
    return true
  }

  async clean(): Promise<{ self: boolean; publicdir: boolean; server: boolean }> {
    const [self, publicdir, server] = await Promise.all([this.cleanSelf(), this.publicdir.clean(), this.cleanServer()])
    return { self, publicdir, server }
  }

  async buildSelf(
    bunBuildConfig?: ClientBunBuildConfigDefinition,
  ): Promise<{ self: string[] | null; server: string[] | null }> {
    if (this.viteConfig) {
      const [self, server] = await Promise.all([this.buildByViteForClient(), this.buildByViteForServer()])
      return { self, server }
    } else {
      const [self, server] = await Promise.all([
        this.buildByBunForClient(bunBuildConfig),
        this.buildByBunForServer(bunBuildConfig),
      ])
      return { self, server }
    }
  }

  async build(
    bunBuildConfig?: ClientBunBuildConfigDefinition,
  ): Promise<{ self: string[] | null; server: string[] | null; publicdir: string[] | null }> {
    await this.clean()
    const publicdir = await this.publicdir.build() // we do not do it in Promise.all, becouse we want dist files override publicdir files, in case if they are the same directory
    const { self, server } = await this.buildSelf(bunBuildConfig)
    return { self, server, publicdir }
  }

  async renderAsReadableStream({
    eversionRun,
    extractResult,
    pagePoint,
    pageLocation,
    input,
  }: {
    eversionRun: EversionRun
    extractResult: ExtractResult
    pagePoint: AnyPoint | undefined
    pageLocation: AnyLocation
    input: InputParsed
  }): Promise<ReadableStream> {
    return await renderAppAsReadableStream({
      App: await this.getFreshAppComponent(),
      eversionRun,
      head: extractResult.head,
      pagePoint,
      pageLocation,
      input,
      env: this.env,
      originalIndexHtml: await this.getOriginalIndexHtml(pageLocation.href ?? pageLocation.hrefRel),
      domRootElementId: this.domRootElementId,
    })
  }

  async prefetchAppPagePointDeep({
    eversionRun,
    pagePoint,
    pageLocation,
    input,
  }: {
    eversionRun: EversionRun
    pagePoint: AnyPoint | undefined
    pageLocation: AnyLocation
    input: InputParsed
  }): Promise<void> {
    await eversionRun.prefetchAppPagePointDeep({
      App: await this.getFreshAppComponent(),
      renderToReadableStream,
      pageLocation,
      pagePoint,
      input,
    })
  }
}
