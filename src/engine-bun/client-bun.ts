import type { AnyLocation } from '@devp0nt/route0'
import { renderToReadableStream } from 'react-dom/server'
import type { Eversion, EversionRun, ExtractResult } from '../core/eversion.js'
import type { AppComponent } from '../core/mount.js'
import type { Points } from '../core/points.js'
import type { AnyPoint, InputParsed, RequiredCtx } from '../core/types.js'
import { parseUrl, type ParsedUrl } from '../core/utils.js'
import type { EngineLogger } from '../engine-shared/config.js'
import { renderAppAsReadableStream } from '../engine-shared/render.js'
import { engineFetch } from './fetch.js'
import { StaticDir } from './static-dir.js'

export class ClientBun {
  eversion: Eversion
  points: Points
  ssr: boolean
  App: AppComponent | undefined
  hostname: string | undefined
  basepath: string
  srcIndexHtml: string | undefined
  distIndexHtml: string | undefined
  domRootElementId: string
  port: number | undefined
  index: number
  logger: EngineLogger
  env: Record<string, any>

  distDir: StaticDir | undefined
  publicDir: StaticDir | undefined

  distIndexHtmlContent: string | undefined
  bunServer: Bun.Server<unknown> | undefined

  private constructor(input: {
    points: Points
    ssr: boolean
    App: AppComponent | undefined
    hostname: string | undefined
    basepath: string
    srcIndexHtml: string | undefined
    distIndexHtml: string | undefined
    domRootElementId: string
    port: number | undefined
    index: number
    logger: EngineLogger
    env: Record<string, any>

    distDir: StaticDir | undefined
    publicDir: StaticDir | undefined
    eversion: Eversion
  }) {
    this.eversion = input.eversion
    this.points = input.points
    this.ssr = input.ssr
    this.App = input.App
    this.hostname = input.hostname
    this.basepath = input.basepath
    this.srcIndexHtml = input.srcIndexHtml
    this.distIndexHtml = input.distIndexHtml
    this.domRootElementId = input.domRootElementId
    this.port = input.port
    this.index = input.index
    this.logger = input.logger
    this.env = { ...input.env, NODE_ENV: process.env.NODE_ENV }
    this.distDir = input.distDir
    this.publicDir = input.publicDir
  }

  static async create(input: {
    points: Points
    ssr: boolean
    App: AppComponent | undefined
    hostname: string | undefined
    basepath: string
    distDir: string | undefined
    distRoute: string | undefined
    publicDir: string | undefined
    srcIndexHtml: string | undefined
    distIndexHtml: string | undefined
    domRootElementId: string
    port: number | undefined
    index: number
    logger: EngineLogger
    env: Record<string, any>

    eversion: Eversion
  }): Promise<ClientBun> {
    const distDir =
      input.distDir && input.distRoute
        ? await StaticDir.create({
            hostname: input.hostname,
            absPath: input.distDir,
            routePath: input.distRoute,
            root: input.points.root,
            eversion: input.eversion,
          })
        : undefined
    const publicDir = input.publicDir
      ? await StaticDir.create({
          hostname: input.hostname,
          absPath: input.publicDir,
          routePath: '/',
          root: input.points.root,
          eversion: input.eversion,
        })
      : undefined
    const client = new ClientBun({
      ...input,
      distDir,
      publicDir,
    })
    await client.preloadDistIndexHtmlContent()
    return client
  }

  async serve({ requiredCtx }: { requiredCtx: RequiredCtx }): Promise<void> {
    const devIndexHtmlRoute =
      this.srcIndexHtml && process.env.NODE_ENV === 'development'
        ? ({
            '/development.index.html': await import(this.srcIndexHtml).then((module) => module.default),
          } as never)
        : {}

    this.bunServer = Bun.serve({
      port: this.port,
      routes: {
        ...devIndexHtmlRoute,
        '/*': async (request) => {
          const parsedUrl = parseUrl(request.url)
          return await this.fetch({ parsedUrl, request, requiredCtx })
        },
      },
    })
  }

  async fetch({
    parsedUrl,
    request,
    requiredCtx,
  }: {
    parsedUrl?: ParsedUrl
    request: Request
    requiredCtx: RequiredCtx
  }): Promise<Response> {
    return await engineFetch({
      clients: [this],
      eversion: this.eversion,
      request,
      parsedUrl,
      fallbackRootId: this.points.root._rootId,
      rootId: this.points.root._rootId,
      requiredCtx,
      staticDirs: [this.distDir, this.publicDir].flatMap((dir) => (dir !== undefined ? [dir] : [])),
      logger: this.logger,
    })
  }

  async preloadDistIndexHtmlContent(): Promise<void> {
    if (process.env.NODE_ENV === 'production' && this.distIndexHtml) {
      if (!(await Bun.file(this.distIndexHtml).exists())) {
        throw new Error(`"${this.distIndexHtml}" not found`)
      }
      this.distIndexHtmlContent = await Bun.file(this.distIndexHtml).text()
    }
  }

  async getOriginalIndexHtml(): Promise<string> {
    if (process.env.NODE_ENV === 'development') {
      if (!this.srcIndexHtml) {
        throw new Error('srcIndexHtml not found')
      }
      return await fetch(`http://localhost:${this.port}/development.index.html`).then(
        async (response) => await response.text(),
      )
    }
    if (process.env.NODE_ENV === 'production') {
      if (!this.distIndexHtml) {
        throw new Error('distIndexHtml not provided')
      }
      if (!this.distIndexHtmlContent) {
        throw new Error('distIndexHtmlContent not preloaded')
      }
      return this.distIndexHtmlContent
    }
    throw new Error('NODE_ENV is not development or production')
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
    if (!this.App) {
      throw new Error('App not found')
    }
    return await renderAppAsReadableStream({
      App: this.App,
      eversionRun,
      head: extractResult.head,
      pagePoint,
      pageLocation,
      input,
      env: this.env,
      originalIndexHtml: await this.getOriginalIndexHtml(),
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
    if (!this.App) {
      throw new Error(`App not provided for client "${this.points.root._rootId}"`)
    }
    await eversionRun.prefetchAppPagePointDeep({
      App: this.App,
      renderToReadableStream,
      pageLocation,
      pagePoint,
      input,
    })
  }
}
