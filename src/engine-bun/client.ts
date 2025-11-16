import type { AnyLocation } from '@devp0nt/route0'
import type { BuildConfig } from 'bun'
import * as nodeFs from 'node:fs/promises'
import nodePath from 'node:path'
import { Readable } from 'node:stream'
import { renderToReadableStream } from 'react-dom/server'
import type { ViteDevServer } from 'vite'
import type { Eversion, EversionRun, ExtractResult } from '../core/eversion.js'
import type { AppComponent } from '../core/mount.js'
import type { Points } from '../core/points.js'
import type { AnyPoint, InputParsed } from '../core/types.js'
import type { ParsedUrl } from '../core/utils.js'
import { parseUrl } from '../core/utils.js'
import type {
  EngineLogger,
  EngineOptionsEnvParsed,
  EngineOptionsPublicDirParsed,
  EngineOptionsViteConfig,
  LoadedViteConfig,
} from '../engine-shared/config.js'
import { addEnvToDocumentHtml, renderAppAsReadableStream } from '../engine-shared/render.js'
import { createFreshPoints } from '../engine-shared/utils.js'
import { PublicDir } from './public-dir.js'
import type { ServerBun } from './server.js'

export class ClientBun {
  cwd: string
  eversion: Eversion
  providedPoints: Points | null
  pointsPath: string | null
  points: Points
  ssr: boolean
  providedAppComponent: AppComponent | null
  appPath: string | null
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
  publicDir: PublicDir
  distDir: string | null
  publicDistDir: string | null
  distIndexHtmlContent: string | null
  server: ServerBun
  bunDevServer: Bun.Server<unknown> | null
  viteDevServer: ViteDevServer | null

  private constructor(input: {
    cwd: string
    providedPoints: Points | null
    pointsPath: string | null
    points: Points
    ssr: boolean
    providedAppComponent: AppComponent | null
    appPath: string | null
    hostname: string | null
    basepath: string
    indexHtml: string | null
    distDir: string | null
    publicDistDir: string | null
    distIndexHtmlContent: string | null
    domRootElementId: string
    port: number
    hmrPort: number | null
    viteConfig: EngineOptionsViteConfig | null
    index: number
    logger: EngineLogger
    env: EngineOptionsEnvParsed
    publicDir: PublicDir
    eversion: Eversion
    viteDevServer: ViteDevServer | null
    bunDevServer: Bun.Server<unknown> | null
    server: ServerBun
  }) {
    this.cwd = input.cwd
    this.eversion = input.eversion
    this.providedPoints = input.providedPoints
    this.pointsPath = input.pointsPath
    this.points = input.points
    this.ssr = input.ssr
    this.providedAppComponent = input.providedAppComponent
    this.appPath = input.appPath
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
    this.publicDir = input.publicDir
    this.distDir = input.distDir
    this.publicDistDir = input.publicDistDir
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
    publicDir: EngineOptionsPublicDirParsed
    distDir: string | null
    publicDistDir: string | null
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
    const pointsPath = typeof input.points === 'string' ? input.points : null
    const points = await createFreshPoints({
      providedPoints,
      pointsPath,
      viteDevServer,
      clientIndex: input.index,
    })

    const bunDevServer =
      input.indexHtml && !viteDevServer && process.env.NODE_ENV !== 'production'
        ? await ClientBun.createBunDevServer({ port: input.port, indexHtml: input.indexHtml })
        : null

    const publicDir = await PublicDir.create({
      hostname: input.hostname,
      definition: input.publicDir,
      root: points.root,
      eversion: input.eversion,
      distDir: input.publicDistDir,
    })

    const distIndexHtmlContent =
      process.env.NODE_ENV === 'production' && input.indexHtml ? await Bun.file(input.indexHtml).text() : null

    const client = new ClientBun({
      ...input,
      points,
      pointsPath,
      providedPoints,
      publicDir,
      providedAppComponent: !input.app || typeof input.app === 'string' ? null : input.app,
      appPath: typeof input.app === 'string' ? input.app : null,
      distIndexHtmlContent,
      viteDevServer,
      bunDevServer,
    })

    return client
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
    if (this.appPath) {
      if (this.viteDevServer) {
        const appComponent = (await this.viteDevServer.ssrLoadModule(this.appPath).then((module) => module.default)) as
          | AppComponent
          | undefined
        if (!appComponent) {
          throw new Error(`App default export not found in ${this.appPath} for client "${this.points.root._rootId}"`)
        }
        return appComponent
      } else {
        const appComponent = await import(this.appPath).then((module) => module.default)
        if (!appComponent) {
          throw new Error(`App default export not found in ${this.appPath} for client "${this.points.root._rootId}"`)
        }
        return appComponent as AppComponent
      }
    }
    throw new Error(`App not provided for client "${this.points.root._rootId}"`)
  }

  getAppPathOrNullOrThrow(): string | null {
    if (this.providedAppComponent && !this.appPath) {
      throw new Error(`If you want build client, you should provide app path, not app component itself in "app" option`)
    }
    return this.appPath
  }

  getPointsPathOrNullOrThrow(): string | null {
    if (this.providedPoints && !this.pointsPath) {
      throw new Error(`If you want build client, you should provide points path, not points itself in "points" option`)
    }
    return this.pointsPath
  }

  getBuildPaths(): {
    appPath: string | null
    pointsPath: string | null
    indexHtml: string | null
    distDir: string | null
    entrypointsExists: boolean
  } {
    const appPath = this.getAppPathOrNullOrThrow()
    const pointsPath = this.getPointsPathOrNullOrThrow()
    const indexHtml = this.indexHtml
    const entrypointsExists = !!(appPath || pointsPath || indexHtml)
    return {
      appPath,
      pointsPath,
      indexHtml,
      distDir: this.distDir,
      entrypointsExists,
    }
  }

  // TODO option to clear dist dir
  async buildByBunForClient(buildConfig?: BuildConfig): Promise<string[] | null> {
    const buildPaths = this.getBuildPaths()
    if (!buildPaths.indexHtml) {
      return null
    }
    if (!buildPaths.distDir) {
      throw new Error(`distDir not provided for client "${this.points.root._rootId}"`)
    }
    const NODE_ENV = process.env.NODE_ENV || 'production'
    const buildOutput = await Bun.build({
      target: 'browser',
      format: 'esm',
      splitting: true,
      sourcemap: true,
      minify: NODE_ENV === 'production',
      ...buildConfig,
      entrypoints: [buildPaths.indexHtml],
      outdir: buildPaths.distDir,
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
    if (!buildPaths.appPath && this.providedAppComponent) {
      throw new Error(
        `To build client "${this.points.root._rootId}" for server, you should provide app path, not app component itself in "app" option`,
      )
    }
    if (!buildPaths.pointsPath && this.providedPoints) {
      throw new Error(
        `To build client "${this.points.root._rootId}" for server, you should provide points path, not points itself in "points" option`,
      )
    }
    if (!buildPaths.appPath && !buildPaths.pointsPath) {
      return null
    }
    if (!this.server.clientsDistDir) {
      throw new Error(`clientsDistDir not provided for server`)
    }
    const NODE_ENV = process.env.NODE_ENV || 'production'
    const buildOutput = await Bun.build({
      target: 'bun',
      packages: 'external',
      sourcemap: true,
      minify: false,
      ...buildConfig,
      entrypoints: [buildPaths.appPath, buildPaths.pointsPath].flatMap((p) => p || []),
      outdir: nodePath.join(this.server.clientsDistDir, this.points.root._rootId),
      define: {
        ...buildConfig?.define,
        'process.env.NODE_ENV': JSON.stringify(NODE_ENV),
        'process.env.BUILD_TARGET': 'server',
      },
    })
    return buildOutput.outputs.map((output) => output.path)
  }

  async buildByViteForClient(): Promise<string[] | null> {
    throw new Error('buildByViteForClient is not implemented yet')
  }

  async buildByViteForServer(): Promise<string[] | null> {
    throw new Error('buildByViteForServer is not implemented yet')
  }

  async cleanSelf(): Promise<boolean> {
    const distDir = this.distDir
    if (!distDir) {
      return false
    }
    await nodeFs.rm(distDir, { recursive: true }).catch(() => {
      /* ignore */
    })
    return true
  }

  async clean(): Promise<{ self: boolean; publicDir: boolean }> {
    const [self, publicDir] = await Promise.all([this.cleanSelf(), this.publicDir.clean()])
    return { self, publicDir }
  }

  async buildSelf(): Promise<{ self: string[] | null; serverClient: string[] | null }> {
    if (this.viteConfig) {
      const [self, serverClient] = await Promise.all([this.buildByViteForClient(), this.buildByViteForServer()])
      return { self, serverClient }
    } else {
      const [self, serverClient] = await Promise.all([this.buildByBunForClient(), this.buildByBunForServer()])
      return { self, serverClient }
    }
  }

  async build(): Promise<{ self: string[] | null; serverClient: string[] | null; publicDir: string[] | null }> {
    await this.clean()
    const [{ self, serverClient }, publicDir] = await Promise.all([this.buildSelf(), this.publicDir.build()])
    return { self, serverClient, publicDir }
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
