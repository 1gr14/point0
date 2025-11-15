import type { AnyLocation } from '@devp0nt/route0'
import type connect from 'connect'
import type { Express } from 'express'
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
import { addEnvToDocumentHtml, renderAppAsReadableStream } from '../engine-shared/render.js'
import { createFreshPoints, createViteDevServerExternal, createViteDevServerInternal } from '../engine-shared/utils.js'
import { callConnectMiddlewareWithBunRequest } from './bun-connect-middleware.js'
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
  viteInternalHmrPort: number | null
  viteExternalHmrPort: number | null
  viteConfig: EngineOptionsViteConfig | null
  index: number
  logger: EngineLogger
  env: EngineOptionsEnvParsed
  publicDir: PublicDir
  distIndexHtmlContent: string | null
  server: ServerBun
  bunDevServer: Bun.Server<unknown> | null
  connectDevServer: connect.Server | null
  expressDevServer: Express | null
  viteDevServerExternal: ViteDevServer | null
  viteDevServerInternal: ViteDevServer | null

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
    viteInternalHmrPort: number | null
    viteExternalHmrPort: number | null
    viteConfig: EngineOptionsViteConfig | null
    index: number
    logger: EngineLogger
    env: EngineOptionsEnvParsed
    publicDir: PublicDir
    eversion: Eversion
    viteDevServerInternal: ViteDevServer | null
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
    this.viteInternalHmrPort = input.viteInternalHmrPort
    this.viteExternalHmrPort = input.viteExternalHmrPort
    this.viteConfig = input.viteConfig
    this.index = input.index
    this.logger = input.logger
    this.env = { ...input.env, NODE_ENV: process.env.NODE_ENV }
    this.publicDir = input.publicDir
    this.viteDevServerInternal = input.viteDevServerInternal
    this.server = input.server
    this.viteDevServerExternal = null
    this.bunDevServer = null
    this.connectDevServer = null
    this.expressDevServer = null
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
    viteInternalHmrPort: number | null
    viteExternalHmrPort: number | null
    index: number
    logger: EngineLogger
    env: EngineOptionsEnvParsed
    eversion: Eversion
    viteConfig: EngineOptionsViteConfig | null
    server: ServerBun
  }): Promise<ClientBun> {
    const viteDevServerInternal = !input.viteConfig
      ? null
      : await createViteDevServerInternal({
          viteConfig: input.viteConfig,
          clientIndex: input.index,
          viteInternalHmrPort: input.viteInternalHmrPort,
        })

    const providedPoints = typeof input.points === 'string' ? null : input.points
    const pointsPath = typeof input.points === 'string' ? input.points : null
    const points = await createFreshPoints({
      providedPoints,
      pointsPath,
      viteDevServerInternal,
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
      viteDevServerInternal,
      server: input.server,
    })
    return client
  }

  private async serveViaBunNativeDevServer({ requiredCtx }: { requiredCtx: RequiredCtx }): Promise<void> {
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

  private async serveViaConnectViteDevServerExternal({ requiredCtx }: { requiredCtx: RequiredCtx }): Promise<void> {
    if (!this.port) {
      throw new Error(
        `Can not serve via connected Vite dev server because port is not set for client "${this.points.root._rootId}". Please provide port in engine options.`,
      )
    }

    const viteDevServerExternal = await createViteDevServerExternal({
      viteConfig: this.viteConfig,
      clientIndex: this.index,
      viteExternalHmrPort: this.viteExternalHmrPort,
    })

    this.viteDevServerExternal = viteDevServerExternal

    this.bunDevServer = Bun.serve({
      port: this.port,
      fetch: async (request) => {
        const response = await callConnectMiddlewareWithBunRequest(viteDevServerExternal.middlewares, request)
        if (response) {
          return response
        }
        return await this.server.fetch({ request, requiredCtx, rootId: this.points.root._rootId })
      },
    })
  }

  async serve({ requiredCtx }: { requiredCtx: RequiredCtx }): Promise<void> {
    if (this.viteConfig) {
      await this.serveViaConnectViteDevServerExternal({ requiredCtx })
    } else {
      await this.serveViaBunNativeDevServer({ requiredCtx })
    }
  }

  async getOriginalIndexHtml(url: string): Promise<string> {
    if (!this.indexHtml) {
      throw new Error(`indexHtml not found for client "${this.points.root._rootId}"`)
    }
    if (process.env.NODE_ENV === 'development') {
      if (!this.viteDevServerExternal) {
        return await fetch(`http://localhost:${this.port}/development.index.html`).then(
          async (response) => await response.text(),
        )
      } else {
        return await this.viteDevServerExternal.transformIndexHtml(url, await Bun.file(this.indexHtml).text())
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

  async getOriginalIndexHtmlWithEnvs(url: string): Promise<string> {
    const html = await this.getOriginalIndexHtml(url)
    return addEnvToDocumentHtml({ html, env: this.env })
  }

  async getFreshAppComponent(): Promise<AppComponent> {
    if (this.providedAppComponent) {
      return this.providedAppComponent
    }
    if (this.appPath) {
      if (this.viteDevServerInternal) {
        const appComponent = (await this.viteDevServerInternal
          .ssrLoadModule(this.appPath)
          .then((module) => module.default)) as AppComponent | undefined
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
