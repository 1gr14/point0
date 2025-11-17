import type { AnyLocation } from '@devp0nt/route0'
import type { BuildConfig } from 'bun'
import * as nodeFs from 'node:fs/promises'
import * as nodePath from 'node:path'
import { Readable } from 'node:stream'
import { renderToReadableStream } from 'react-dom/server'
import type { ViteDevServer } from 'vite'
import type { Eversion, EversionRun, ExtractResult } from '../core/eversion.js'
import type { AppComponent } from '../core/mount.js'
import type { LazyPointsModule, ReadyPointsModule } from '../core/points.js'
import { Points } from '../core/points.js'
import type { AnyPoint, InputParsed } from '../core/types.js'
import type { ParsedUrl } from '../core/utils.js'
import { parseUrl } from '../core/utils.js'
import type {
  EngineLogger,
  EngineOptionsEnvParsed,
  EngineOptionsPublicdirParsed,
  EngineOptionsViteConfig,
  LoadedViteConfig,
} from '../engine-shared/config.js'
import { addEnvToDocumentHtml, renderAppAsReadableStream } from '../engine-shared/render.js'
import { Publicdir } from './publicdir.js'
import type { ServerBun } from './server.js'
import { validateEntrypoints, withError } from '../engine-shared/utils.js'

export class ClientBun {
  cwd: string
  eversion: Eversion
  providedPoints: Points | null
  pointsFile: string | null
  points: Points
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
  publicdir: Publicdir
  outdir: string | null
  serverOutdir: string | null
  publicdirOutdir: string | null
  distIndexHtmlContent: string | null
  server: ServerBun
  bunDevServer: Bun.Server<unknown> | null
  viteDevServer: ViteDevServer | null

  private constructor(input: {
    cwd: string
    providedPoints: Points | null
    pointsFile: string | null
    points: Points
    ssr: boolean
    providedAppComponent: AppComponent | null
    appFile: string | null
    hostname: string | null
    basepath: string
    indexHtml: string | null
    outdir: string | null
    serverOutdir: string | null
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
    eversion: Eversion
    viteDevServer: ViteDevServer | null
    bunDevServer: Bun.Server<unknown> | null
    server: ServerBun
  }) {
    this.cwd = input.cwd
    this.eversion = input.eversion
    this.providedPoints = input.providedPoints
    this.pointsFile = input.pointsFile
    this.points = input.points
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
    this.publicdir = input.publicdir
    this.outdir = input.outdir
    this.serverOutdir = input.serverOutdir
    this.publicdirOutdir = input.publicdirOutdir
    this.viteDevServer = input.viteDevServer
    this.bunDevServer = input.bunDevServer
    this.server = input.server
  }

  static async create(input: {
    cwd: string
    points: Points | string
    ssr: boolean
    app: AppComponent | string | null
    hostname: string | null
    basepath: string
    publicdir: EngineOptionsPublicdirParsed
    outdir: string | null
    serverOutdir: string | null
    publicdirOutdir: string | null
    indexHtml: string | null
    domRootElementId: string
    port: number
    hmrPort: number | null
    index: number
    logger: EngineLogger
    env: EngineOptionsEnvParsed
    eversion: Eversion
    viteConfig: EngineOptionsViteConfig | null
    server: ServerBun
  }): Promise<ClientBun> {
    const viteDevServer =
      input.viteConfig && process.env.NODE_ENV !== 'production'
        ? await ClientBun.createViteDevServer({
            viteConfig: input.viteConfig,
            clientIndex: input.index,
            hmrPort: input.hmrPort,
          })
        : null

    const providedPoints = typeof input.points === 'string' ? null : input.points
    const pointsFile = typeof input.points === 'string' ? input.points : null
    const points = await ClientBun.createPoints({
      providedPoints,
      pointsFile,
      viteDevServer,
      clientIndex: input.index,
    })

    const bunDevServer =
      input.indexHtml && !viteDevServer && process.env.NODE_ENV !== 'production'
        ? await ClientBun.createBunDevServer({ port: input.port, indexHtml: input.indexHtml })
        : null

    const publicdir = await Publicdir.create({
      hostname: input.hostname,
      definition: input.publicdir,
      root: points.root,
      eversion: input.eversion,
      outdir: input.publicdirOutdir,
    })

    const distIndexHtmlContent =
      process.env.NODE_ENV === 'production' && input.indexHtml ? await Bun.file(input.indexHtml).text() : null

    const client = new ClientBun({
      ...input,
      points,
      pointsFile,
      providedPoints,
      publicdir,
      providedAppComponent: !input.app || typeof input.app === 'string' ? null : input.app,
      appFile: typeof input.app === 'string' ? input.app : null,
      distIndexHtmlContent,
      viteDevServer,
      bunDevServer,
    })

    return client
  }

  static readonly createPoints = async ({
    providedPoints,
    pointsFile,
    viteDevServer,
    clientIndex,
  }: {
    providedPoints: Points | null
    pointsFile: string | null
    viteDevServer: ViteDevServer | null
    clientIndex: number
  }): Promise<Points> => {
    if (providedPoints) {
      return providedPoints
    }
    if (pointsFile) {
      if (viteDevServer) {
        return await Points.read(
          pointsFile,
          async (absPath) => (await viteDevServer.ssrLoadModule(absPath)) as LazyPointsModule | ReadyPointsModule,
        )
      } else {
        return Points.create(
          await withError(
            async () => (await import(pointsFile)) as LazyPointsModule | ReadyPointsModule,
            `Failed to import points from ${pointsFile} on client at position "${clientIndex}"`,
          ),
        )
      }
    }
    throw new Error(`Points not provided for client at position "${clientIndex}"`)
  }

  private static async createBunDevServer({
    port,
    indexHtml,
  }: {
    port: number
    indexHtml: string
  }): Promise<Bun.Server<unknown>> {
    return Bun.serve({
      port,
      routes: {
        '/index.html': await import(indexHtml).then((module) => module.default),
      },
    })
  }

  static async loadViteConfig({
    viteConfig,
    command,
  }: {
    viteConfig: EngineOptionsViteConfig
    command: 'serve' | 'build'
  }): Promise<LoadedViteConfig> {
    return typeof viteConfig === 'function'
      ? await viteConfig({ command, mode: process.env.NODE_ENV || 'development' })
      : typeof viteConfig === 'string'
        ? await import(viteConfig)
        : await viteConfig
  }

  static async createViteDevServer({
    viteConfig,
    clientIndex,
    hmrPort,
    env,
  }: {
    viteConfig: EngineOptionsViteConfig | null
    clientIndex: number | null
    hmrPort: number | null
    env?: EngineOptionsEnvParsed
  }): Promise<ViteDevServer> {
    if (!viteConfig) {
      throw new Error(
        `Vite config not found for ${clientIndex !== null ? `client at position "${clientIndex}"` : 'server'}`,
      )
    }
    const createServer = await import('vite').then((module) => module.createServer)
    const loadedViteConfig: LoadedViteConfig = await ClientBun.loadViteConfig({
      viteConfig,
      command: 'serve',
    })
    return await createServer({
      ...loadedViteConfig,
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
      },
    })
  }

  async upgradeBunDevServerWebSocket(
    request: Request,
    server: Bun.Server<unknown>,
    parsedUrl?: ParsedUrl,
  ): Promise<{ result: Response | undefined } | undefined> {
    if (!this.bunDevServer) {
      return undefined
    }
    if (request.headers.get('upgrade') !== 'websocket') {
      return undefined
    }
    parsedUrl ??= parseUrl(request.url)
    if (!parsedUrl.urlObj.pathname.startsWith('/_bun/')) {
      return undefined
    }
    const bunDevServerWsUrl = `ws://localhost:${this.port}${parsedUrl.urlObj.pathname}${parsedUrl.urlObj.search}`

    // Upgrade the connection and store upstream URL in data
    const upgraded = server.upgrade(request, {
      data: { wsUrl: bunDevServerWsUrl },
    })

    if (!upgraded) {
      return { result: new Response('WebSocket upgrade failed', { status: 400 }) }
    }

    // Return undefined to indicate WebSocket upgrade was successful
    return { result: undefined }
  }

  async fetchBunDevServerMiddleware(request: Request, parsedUrl?: ParsedUrl): Promise<Response | undefined> {
    const bunDevServer = this.bunDevServer
    if (!bunDevServer) {
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

  async fetchViteDevServerMiddleware(request: Request, parsedUrl?: ParsedUrl): Promise<Response | undefined> {
    const viteDevServer = this.viteDevServer
    if (!viteDevServer) {
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

      viteDevServer.middlewares(nodeReq, nodeRes, next)
    })
  }

  async getOriginalIndexHtml(url: string): Promise<string> {
    if (!this.indexHtml) {
      throw new Error(`indexHtml not found for client "${this.points.root._rootId}"`)
    }
    if (process.env.NODE_ENV !== 'production') {
      if (this.viteDevServer) {
        return await this.viteDevServer.transformIndexHtml(url, await Bun.file(this.indexHtml).text())
      } else if (this.bunDevServer) {
        return await fetch(`http://localhost:${this.port}/index.html`).then(async (response) => await response.text())
      } else {
        throw new Error(
          `Vite dev server or bun dev server not connected for client "${this.points.root._rootId}". Please provide vite config or port for client "${this.points.root._rootId}".`,
        )
      }
    }
    if (!this.distIndexHtmlContent) {
      throw new Error(`distIndexHtmlContent not preloaded for client "${this.points.root._rootId}"`)
    }
    return this.distIndexHtmlContent
  }

  async getOriginalIndexHtmlWithEnvs(url: string): Promise<string> {
    const html = await this.getOriginalIndexHtml(url)
    return addEnvToDocumentHtml({ html, env: this.env })
  }

  async getFreshAppComponent(): Promise<AppComponent> {
    if (this.providedAppComponent) {
      return this.providedAppComponent
    }
    if (this.appFile) {
      if (this.viteDevServer) {
        const appComponent = (await this.viteDevServer.ssrLoadModule(this.appFile).then((module) => module.default)) as
          | AppComponent
          | undefined
        if (!appComponent) {
          throw new Error(`App default export not found in ${this.appFile} for client "${this.points.root._rootId}"`)
        }
        return appComponent
      } else {
        const appComponent = await import(this.appFile).then((module) => module.default)
        if (!appComponent) {
          throw new Error(`App default export not found in ${this.appFile} for client "${this.points.root._rootId}"`)
        }
        return appComponent as AppComponent
      }
    }
    throw new Error(`App not provided for client "${this.points.root._rootId}"`)
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
  async buildByBunForClient(buildConfig?: BuildConfig): Promise<string[] | null> {
    const buildPaths = this.getBuildPaths()
    if (!buildPaths.indexHtml) {
      return null
    }
    if (!buildPaths.outdir) {
      throw new Error(`outdir not provided for client "${this.points.root._rootId}"`)
    }
    const NODE_ENV = process.env.NODE_ENV || 'production'
    const buildOutput = await Bun.build({
      target: 'browser',
      format: 'esm',
      splitting: true,
      sourcemap: true,
      publicPath: '/',
      minify: NODE_ENV === 'production',
      ...buildConfig,
      entrypoints: [buildPaths.indexHtml],
      outdir: buildPaths.outdir,
      define: {
        ...buildConfig?.define,
        'process.env.NODE_ENV': JSON.stringify(NODE_ENV),
        'process.env.BUILD_TARGET': 'client',
      },
    })
    return buildOutput.outputs.map((output) => output.path)
  }

  async buildByBunForServer(buildConfig?: BuildConfig): Promise<string[] | null> {
    const buildPaths = this.getBuildPaths()
    if (!buildPaths.appFile && this.providedAppComponent) {
      throw new Error(
        `To build client "${this.points.root._rootId}" for server, you should provide app path, not app component itself in "app" option`,
      )
    }
    if (!buildPaths.pointsFile && this.providedPoints) {
      throw new Error(
        `To build client "${this.points.root._rootId}" for server, you should provide points path, not points itself in "points" option`,
      )
    }
    if (!buildPaths.appFile && !buildPaths.pointsFile) {
      return null
    }
    if (!buildPaths.serverOutdir) {
      throw new Error(`serverOutdir not provided for client "${this.points.root._rootId}"`)
    }
    const NODE_ENV = process.env.NODE_ENV || 'production'
    const buildOutput = await Bun.build({
      target: 'bun',
      packages: 'external',
      sourcemap: true,
      minify: true,
      splitting: true,
      format: 'esm',
      ...buildConfig,
      naming: {
        ...(typeof buildConfig?.naming === 'object' ? buildConfig.naming : {}),
        entry: '[name].js',
      },
      entrypoints: validateEntrypoints([buildPaths.appFile, buildPaths.pointsFile]),
      outdir: buildPaths.serverOutdir,
      define: {
        ...buildConfig?.define,
        'process.env.NODE_ENV': JSON.stringify(NODE_ENV),
        'process.env.BUILD_TARGET': 'server',
      },
    })
    return buildOutput.outputs.map((output) => output.path)
  }

  async buildByViteForClient(): Promise<string[] | null> {
    if (!this.viteConfig) {
      throw new Error(`viteConfig not provided for client "${this.points.root._rootId}"`)
    }
    const { build: viteBuild } = await import('vite')
    const buildPaths = this.getBuildPaths()
    if (!buildPaths.indexHtml) {
      return null
    }
    if (!buildPaths.outdir) {
      throw new Error(`outdir not provided for client "${this.points.root._rootId}"`)
    }
    const NODE_ENV = process.env.NODE_ENV || 'production'
    const loadedViteConfig = await ClientBun.loadViteConfig({
      viteConfig: this.viteConfig,
      command: 'build',
    })

    if (!(await Bun.file(buildPaths.indexHtml).exists())) {
      throw new Error(`Input file does not exist: ${buildPaths.indexHtml} for client "${this.points.root._rootId}"`)
    }

    const existingRollupOptionsOutput = loadedViteConfig.build?.rollupOptions?.output
    const normalizedExistsingRollupOptionsOutput =
      (Array.isArray(existingRollupOptionsOutput) ? existingRollupOptionsOutput[0] : existingRollupOptionsOutput) || {}
    const rollupOptionsOutput: Extract<
      NonNullable<NonNullable<LoadedViteConfig['build']>['rollupOptions']>['output'],
      object
    > = {
      ...normalizedExistsingRollupOptionsOutput,
      // may be we will later add something here
    }
    const fixedExistingRollupOptionsOutput = Array.isArray(existingRollupOptionsOutput)
      ? [rollupOptionsOutput, ...existingRollupOptionsOutput.slice(1)]
      : rollupOptionsOutput

    const viteRoot = loadedViteConfig.root || nodePath.dirname(buildPaths.indexHtml) || this.cwd

    const config: LoadedViteConfig = {
      ...loadedViteConfig,
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
    if (!this.viteConfig) {
      throw new Error(`viteConfig not provided for client "${this.points.root._rootId}"`)
    }
    const { build: viteBuild } = await import('vite')
    const buildPaths = this.getBuildPaths()
    if (!buildPaths.appFile && this.providedAppComponent) {
      throw new Error(
        `To build client "${this.points.root._rootId}" for server, you should provide app path, not app component itself in "app" option`,
      )
    }
    if (!buildPaths.pointsFile && this.providedPoints) {
      throw new Error(
        `To build client "${this.points.root._rootId}" for server, you should provide points path, not points itself in "points" option`,
      )
    }
    if (!buildPaths.appFile && !buildPaths.pointsFile) {
      return null
    }
    if (!buildPaths.serverOutdir) {
      throw new Error(`serverOutdir not provided for client "${this.points.root._rootId}"`)
    }
    const NODE_ENV = process.env.NODE_ENV || 'production'
    const loadedViteConfig = await ClientBun.loadViteConfig({
      viteConfig: this.viteConfig,
      command: 'build',
    })

    const existingRollupOptionsOutput = loadedViteConfig.build?.rollupOptions?.output
    const normalizedExistsingRollupOptionsOutput =
      (Array.isArray(existingRollupOptionsOutput) ? existingRollupOptionsOutput[0] : existingRollupOptionsOutput) || {}

    const rollupOptionsOutput: Extract<
      NonNullable<NonNullable<LoadedViteConfig['build']>['rollupOptions']>['output'],
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

    const config: LoadedViteConfig = {
      ...loadedViteConfig,
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

  async buildSelf(): Promise<{ self: string[] | null; server: string[] | null }> {
    if (this.viteConfig) {
      const [self, server] = await Promise.all([this.buildByViteForClient(), this.buildByViteForServer()])
      return { self, server }
    } else {
      const [self, server] = await Promise.all([this.buildByBunForClient(), this.buildByBunForServer()])
      return { self, server }
    }
  }

  async build(): Promise<{ self: string[] | null; server: string[] | null; publicdir: string[] | null }> {
    await this.clean()
    const publicdir = await this.publicdir.build() // we do not do it in Promise.all, becouse we want dist files override publicdir files, in case if they are the same directory
    const { self, server } = await this.buildSelf()
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
