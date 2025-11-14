import type { AnyLocation } from '@devp0nt/route0'
import connect from 'connect'
import type { Jiti } from 'jiti'
import { renderToReadableStream } from 'react-dom/server'
import type { ViteDevServer } from 'vite'
import type { Eversion, EversionRun, ExtractResult } from '../core/eversion.js'
import type { AppComponent } from '../core/mount.js'
import type { Points } from '../core/points.js'
import type { AnyPoint, InputParsed, RequiredCtx } from '../core/types.js'
import type {
  EngineLogger,
  EngineOptionsEnvParsed,
  EngineOptionsPublicDirParsed,
  EngineOptionsViteConfig,
} from '../engine-shared/config.js'
import { renderAppAsReadableStream } from '../engine-shared/render.js'
import { bunConnectAdapter, bunResponseToConnectResponse, connectRequestToBunRequest } from './bun-connect-adapter.js'
import { PublicDir } from './public-dir.js'
import type { ServerBun } from './server.js'
import { createFreshPoints, createJitiInstance, createViteDevServer } from '../engine-shared/utils.js'

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
  index: number
  logger: EngineLogger
  env: EngineOptionsEnvParsed
  publicDir: PublicDir
  distIndexHtmlContent: string | null
  server: ServerBun
  bunDevServer: Bun.Server<unknown> | null
  viteDevServer: ViteDevServer | null
  jiti: Jiti

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
    distIndexHtmlContent: string | null
    domRootElementId: string
    port: number
    hmrPort: number | null
    index: number
    logger: EngineLogger
    env: EngineOptionsEnvParsed
    publicDir: PublicDir
    eversion: Eversion
    viteDevServer: ViteDevServer | null
    server: ServerBun
    jiti: Jiti
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
    this.index = input.index
    this.logger = input.logger
    this.env = { ...input.env, NODE_ENV: process.env.NODE_ENV }
    this.publicDir = input.publicDir
    this.viteDevServer = input.viteDevServer
    this.server = input.server
    this.bunDevServer = null
    this.jiti = input.jiti
  }

  static async create(input: {
    cwd: string
    points: Points | string
    ssr: boolean
    app: AppComponent | string | null
    hostname: string | null
    basepath: string
    publicDir: EngineOptionsPublicDirParsed
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
    const jiti = createJitiInstance(import.meta.url)

    const viteDevServer = !input.viteConfig
      ? null
      : await createViteDevServer({
          viteConfig: input.viteConfig,
          jiti,
          clientIndex: input.index,
          port: input.port,
          hmrPort: input.hmrPort,
        })

    const providedPoints = typeof input.points === 'string' ? null : input.points
    const pointsPath = typeof input.points === 'string' ? input.points : null
    const points = await createFreshPoints({
      providedPoints,
      pointsPath,
      viteDevServer,
      jiti,
      clientIndex: input.index,
    })

    const publicDir = await PublicDir.create({
      hostname: input.hostname,
      definition: input.publicDir,
      root: points.root,
      eversion: input.eversion,
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
      server: input.server,
      jiti,
    })
    return client
  }

  private async serveViaNativeBunDevServer({ requiredCtx }: { requiredCtx: RequiredCtx }): Promise<void> {
    if (!this.port) {
      throw new Error(`Port is not set for client "${this.points.root._rootId}"`)
    }

    const devIndexHtmlRoute =
      this.indexHtml && process.env.NODE_ENV === 'development'
        ? ({
            '/development.index.html': await import(this.indexHtml).then((module) => module.default),
          } as never)
        : {}

    this.bunDevServer = Bun.serve({
      port: this.port,
      routes: {
        ...devIndexHtmlRoute,
        '/*': async (request) => {
          return await this.server.fetch({ request, requiredCtx, rootId: this.points.root._rootId })
        },
      },
    })
  }

  private async serveViaConnectedViteDevServer({ requiredCtx }: { requiredCtx: RequiredCtx }): Promise<void> {
    if (!this.port) {
      throw new Error(
        `Can not serve via connected Vite dev server because port is not set for client "${this.points.root._rootId}". Please provide port in engine options.`,
      )
    }
    if (!this.viteDevServer) {
      throw new Error(
        `Vite dev server is not connected for client "${this.points.root._rootId}". Please provide viteConfig in engine options.`,
      )
    }

    const connectApp = connect()
    connectApp.use(this.viteDevServer.middlewares)
    connectApp.use((connectRequest, connectResponse) => {
      void (async () => {
        try {
          const request = await connectRequestToBunRequest(connectRequest)
          const response = await this.server.fetch({ request, requiredCtx, rootId: this.points.root._rootId })
          await bunResponseToConnectResponse(response, connectResponse)
        } catch (error) {
          this.logger.error(error)
          connectResponse.statusCode = 500
          connectResponse.setHeader('content-type', 'text/plain')
          connectResponse.end(`Internal Server Error: ${error instanceof Error ? error.message : String(error)}`)
        }
      })()
    })
    this.bunDevServer = Bun.serve({
      port: this.port,
      fetch: bunConnectAdapter(connectApp),
    })
  }

  async serve({ requiredCtx }: { requiredCtx: RequiredCtx }): Promise<void> {
    if (this.viteDevServer) {
      await this.serveViaConnectedViteDevServer({ requiredCtx })
    } else {
      await this.serveViaNativeBunDevServer({ requiredCtx })
    }
  }

  async getOriginalIndexHtml(url: string): Promise<string> {
    if (!this.indexHtml) {
      throw new Error(`indexHtml not found for client "${this.points.root._rootId}"`)
    }
    if (process.env.NODE_ENV === 'development') {
      if (!this.viteDevServer) {
        return await fetch(`http://localhost:${this.port}/development.index.html`).then(
          async (response) => await response.text(),
        )
      } else {
        return await this.viteDevServer.transformIndexHtml(url, await Bun.file(this.indexHtml).text())
      }
    }
    if (process.env.NODE_ENV === 'production') {
      if (!this.distIndexHtmlContent) {
        throw new Error(`distIndexHtmlContent not preloaded for client "${this.points.root._rootId}"`)
      }
      return this.distIndexHtmlContent
    }
    throw new Error(`NODE_ENV is not development or production for client "${this.points.root._rootId}"`)
  }

  async getFreshAppComponent(): Promise<AppComponent> {
    if (this.providedAppComponent) {
      return this.providedAppComponent
    }
    if (this.appPath) {
      console.log(1111116, !!this.viteDevServer)
      if (this.viteDevServer) {
        const appComponent = (await this.viteDevServer.ssrLoadModule(this.appPath).then((module) => module.default)) as
          | AppComponent
          | undefined
        if (!appComponent) {
          throw new Error(`App default export not found in ${this.appPath} for client "${this.points.root._rootId}"`)
        }
        return appComponent
      } else {
        const appComponent = await this.jiti.import(this.appPath, { default: true })
        if (!appComponent) {
          throw new Error(`App default export not found in ${this.appPath} for client "${this.points.root._rootId}"`)
        }
        return appComponent as AppComponent
      }
    }
    throw new Error(`App not provided for client "${this.points.root._rootId}"`)
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
    const App = await this.getFreshAppComponent()
    return await renderAppAsReadableStream({
      App,
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
    const App = await this.getFreshAppComponent()
    await eversionRun.prefetchAppPagePointDeep({
      App,
      renderToReadableStream,
      pageLocation,
      pagePoint,
      input,
    })
  }
}
