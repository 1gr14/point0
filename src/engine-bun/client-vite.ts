import type { ViteDevServer } from 'vite'
import { createServer as createViteServer } from 'vite'
import type { Eversion, EversionRun } from '../core/eversion.js'
import type { Points } from '../core/points.js'
import type { RequiredCtx } from '../core/types.js'
import { parseUrl, type ParsedUrl } from '../core/utils.js'
import type { EngineLogger } from '../engine-shared/config.js'
import type { ClientViteUtils } from './client-vite-utils.js'
import { engineFetch } from './fetch.js'
import { StaticDir } from './static-dir.js'

export class ClientVite {
  eversion: Eversion
  points: Points
  ssr: boolean
  appPath: string
  hostname: string | undefined
  basepath: string
  srcIndexHtml: string | undefined
  distIndexHtml: string | undefined
  domRootElementId: string
  port: number | undefined
  index: number
  logger: EngineLogger
  env: Record<string, any>
  viteConfig:
    | import('vite').UserConfig
    | (() => import('vite').UserConfig | Promise<import('vite').UserConfig>)
    | undefined

  distDir: StaticDir | undefined
  publicDir: StaticDir | undefined

  distIndexHtmlContent: string | undefined
  viteServer: ViteDevServer
  // viteEnvironment: ViteEnvironment
  bunServer: Bun.Server<unknown> | undefined

  prefetchAppPagePointDeepByUrl: (
    props: Parameters<typeof ClientViteUtils.prefetchAppPagePointDeepByUrl>[1],
  ) => Promise<EversionRun>
  renderAppAsReadableStreamByUrl: (
    props: Parameters<typeof ClientViteUtils.renderAppAsReadableStreamByUrl>[1],
  ) => Promise<ReadableStream>

  private constructor(input: {
    points: Points
    ssr: boolean
    appPath: string
    hostname: string | undefined
    basepath: string
    srcIndexHtml: string | undefined
    distIndexHtml: string | undefined
    domRootElementId: string
    port: number | undefined
    index: number
    logger: EngineLogger
    env: Record<string, any>
    viteServer: ViteDevServer
    // viteEnvironment: ViteEnvironment
    viteConfig:
      | import('vite').UserConfig
      | (() => import('vite').UserConfig | Promise<import('vite').UserConfig>)
      | undefined

    distDir: StaticDir | undefined
    publicDir: StaticDir | undefined
    eversion: Eversion
    prefetchAppPagePointDeepByUrl: (
      props: Parameters<typeof ClientViteUtils.prefetchAppPagePointDeepByUrl>[1],
    ) => Promise<EversionRun>
    renderAppAsReadableStreamByUrl: (
      props: Parameters<typeof ClientViteUtils.renderAppAsReadableStreamByUrl>[1],
    ) => Promise<ReadableStream>
  }) {
    this.eversion = input.eversion
    this.points = input.points
    this.ssr = input.ssr
    this.appPath = input.appPath
    this.hostname = input.hostname
    this.basepath = input.basepath
    this.srcIndexHtml = input.srcIndexHtml
    this.distIndexHtml = input.distIndexHtml
    this.domRootElementId = input.domRootElementId
    this.port = input.port
    this.index = input.index
    this.logger = input.logger
    this.env = { ...input.env, NODE_ENV: process.env.NODE_ENV }
    this.viteConfig = input.viteConfig
    this.distDir = input.distDir
    this.publicDir = input.publicDir
    this.viteServer = input.viteServer
    // this.viteEnvironment = input.viteEnvironment
    this.prefetchAppPagePointDeepByUrl = input.prefetchAppPagePointDeepByUrl
    this.renderAppAsReadableStreamByUrl = input.renderAppAsReadableStreamByUrl
  }

  static async create(input: {
    points: Points
    ssr: boolean
    appPath: string
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
    viteConfig:
      | import('vite').UserConfig
      | (() => import('vite').UserConfig | Promise<import('vite').UserConfig>)
      | undefined

    eversion: Eversion
  }): Promise<ClientVite> {
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
    const resolvedViteConfig =
      typeof input.viteConfig === 'function' ? await input.viteConfig() : (input.viteConfig ?? {})
    const viteServer = await createViteServer({
      ...resolvedViteConfig,
      server: {
        ...resolvedViteConfig.server,
        middlewareMode: true,
      },
      appType: 'custom',
    })
    // const viteEnvironment = await createViteEnvironment(viteServer, { ssr: true, sandbox: false })
    const { prefetchAppPagePointDeepByUrl, renderAppAsReadableStreamByUrl } =
      await viteServer.ssrLoadModule('/entry-server.js')
    const client = new ClientVite({
      ...input,
      distDir,
      publicDir,
      viteServer,
      // viteEnvironment,
      prefetchAppPagePointDeepByUrl,
      renderAppAsReadableStreamByUrl,
    })
    await client.preloadDistIndexHtmlContent()
    return client
  }

  async serve({ requiredCtx }: { requiredCtx: RequiredCtx }): Promise<void> {
    if (process.env.NODE_ENV === 'development') {
      // Start Bun server that uses Vite middleware
      this.bunServer = Bun.serve({
        port: this.port,
        hostname: this.hostname,
        fetch: async (request) => {
          const url = new URL(request.url)
          const pathname = url.pathname

          // Handle Vite-specific requests (HMR, client, etc.)
          if (pathname.startsWith('/@') || pathname.startsWith('/node_modules/') || pathname.includes('.')) {
            try {
              // Try to use Vite's transformRequest for static assets
              const result = await this.viteServer.transformRequest(pathname, { ssr: false })
              if (result?.code) {
                // Vite handled it - return the transformed content
                return new Response(result.code, {
                  headers: {
                    'Content-Type': pathname.endsWith('.js')
                      ? 'application/javascript'
                      : pathname.endsWith('.css')
                        ? 'text/css'
                        : 'text/plain',
                  },
                })
              }
            } catch (error) {
              // If Vite can't handle it, fall through to normal handler
            }
          }

          // For SSR and routing, use the normal fetch handler
          const parsedUrl = parseUrl(request.url)
          return await this.fetch({ parsedUrl, request, requiredCtx })
        },
      })

      this.logger.info(
        `Vite dev server for client${this.index > 0 ? ` "${this.points.root._rootId}"` : ''} is ready on http://localhost:${this.port}`,
      )
    } else {
      // In production, we don't need to start a separate server
      // The server will handle requests through fetch()
      this.logger.info(`Client${this.index > 0 ? ` "${this.points.root._rootId}"` : ''} is ready (production mode)`)
    }
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
    // Process through engineFetch for SSR and routing
    // Vite server is used for transforming HTML and modules, not for handling requests
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

  async getOriginalIndexHtml(url = '/'): Promise<string> {
    if (process.env.NODE_ENV === 'development') {
      if (!this.srcIndexHtml) {
        throw new Error('srcIndexHtml not found')
      }
      // Use Vite to transform the index.html
      const transformedHtml = await this.viteServer.transformIndexHtml(url, await Bun.file(this.srcIndexHtml).text())
      return transformedHtml
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

  // async loadAppComponent({ eversionRun }: { eversionRun: EversionRun }): Promise<AppComponent> {
  //   // return await eversionRun.withServerGlobalState(async () => {
  //   //   const { default: App } = await this.viteServer.ssrLoadModule(this.appPath)
  //   //   if (!App) {
  //   //     throw new Error(`App not found: ${this.appPath}`)
  //   //   }
  //   //   return App
  //   // })

  //   // const { default: App } = await viteImport(this.viteServer, this.appPath)
  //   // if (!App) {
  //   //   throw new Error(`App not found: ${this.appPath}`)
  //   // }
  //   // return App

  //   // const {} = await this.viteServer.ssrLoadModule('/entry-server.js')
  //   // return await getAppElement({ eversionRun })
  //   // const { default: App } = await this.viteEnvironment.importModule(this.appPath)
  // }

  // async renderAsReadableStream({
  //   eversionRun,
  //   extractResult,
  //   pagePoint,
  //   pageLocation,
  //   input,
  // }: {
  //   eversionRun: EversionRun
  //   extractResult: ExtractResult
  //   pagePoint: AnyPoint | undefined
  //   pageLocation: AnyLocation
  //   input: InputParsed
  // }): Promise<ReadableStream> {
  //   eversionRun.setSsrLocation(pageLocation)
  //   eversionRun.setCurrentLocation(pageLocation)
  //   const App = await this.loadAppComponent({ eversionRun })
  //   return await renderAppAsReadableStream({
  //     App,
  //     // getApp: async () => await this.loadAppComponent({ eversionRun }),
  //     eversionRun,
  //     head: extractResult.head,
  //     pagePoint,
  //     input,
  //     env: this.env,
  //     originalIndexHtml: await this.getOriginalIndexHtml(),
  //     domRootElementId: this.domRootElementId,
  //   })
  // }

  // async prefetchAppPagePointDeep({
  //   eversionRun,
  //   pagePoint,
  //   pageLocation,
  //   input,
  // }: {
  //   eversionRun: EversionRun
  //   pagePoint: AnyPoint | undefined
  //   pageLocation: AnyLocation
  //   input: InputParsed
  // }): Promise<EversionRun> {
  //   eversionRun.setCurrentLocation(pageLocation)
  //   eversionRun.setSsrLocation(pageLocation)
  //   const App = await this.loadAppComponent({ eversionRun })
  //   await eversionRun.prefetchAppPagePointDeep({
  //     App,
  //     // getApp: async () => await this.loadAppComponent({ eversionRun }),
  //     renderToReadableStream,
  //     pagePoint,
  //     input,
  //   })
  //   return eversionRun
  // }
}
