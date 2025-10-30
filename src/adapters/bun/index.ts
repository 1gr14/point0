import type {} from 'bun'
import { serve } from 'bun'
import * as nodePath from 'node:path'
import qs from 'qs'
import type { PointsCollection } from '../../core/eversion.js'
import { Eversion } from '../../core/eversion.js'
import type { IsEmptyObject, Method, RequiredCtx, RootId, RootPoint } from '../../core/types.js'
import type {
  ServerAdapterClientInputParsed,
  ServerAdapterLogger,
  ServerAdapterServerInput,
  ServerAdapterServerInputParsed,
} from '../../server/adapter.js'
import { parseServerAdapterInput } from '../../server/adapter.js'
import { toJsonErrorResponse, toSuitableErrorResponse } from '../../server/error.js'
import { renderAppAsReadableStream } from '../../server/render.js'
import { isPathnameUnderBasepath } from '../../server/utils.js'
import { Route0 } from '@devp0nt/route0'

// TODO: allow public dir per each client also
// TODO: allow special origin per each client also

type ParsedRequest = {
  request: Request
  url: URL
  pathname: string
  pathnameAsRelPath: string
  isJsonAcceptable: boolean
}

type ClientWithEversion<TRequiredCtx extends RequiredCtx = RequiredCtx> = ServerAdapterClientInputParsed & {
  eversion: Eversion<TRequiredCtx>
}

// TODO: rename it
export class BunAdapter<TRequiredCtx extends RequiredCtx = RequiredCtx> {
  mainServer: Bun.Server<unknown> | undefined
  mainServerPort: number
  devServeTarget: 'client' | 'server' | 'universal' | undefined
  clientsDevServer: Bun.Server<unknown> | undefined
  clientsDevServerPort: number
  root: RootPoint<TRequiredCtx>
  points?: PointsCollection
  logger: ServerAdapterLogger
  dirname?: string
  publicDir?: string
  fallbackRootId: RootId
  eversion: Eversion<TRequiredCtx>
  clients: Array<ClientWithEversion<TRequiredCtx>>

  publicFilePaths: Map<string, string> = new Map<string, string>()
  clientsDevRoutes: Record<string, any> = {}
  indexHtmlContents: Record<string, string | undefined> = {}

  private constructor(
    input: Omit<ServerAdapterServerInputParsed<TRequiredCtx>, 'clients'> & {
      eversion: Eversion<TRequiredCtx>
      clients: Array<ClientWithEversion<TRequiredCtx>>
    },
  ) {
    this.root = input.root
    this.points = input.points
    this.mainServerPort = input.port ? Number(input.port) : 3000
    this.clientsDevServerPort = input.clientsDevServerPort
      ? Number(input.clientsDevServerPort)
      : this.mainServerPort + 1
    this.logger = input.logger
    this.dirname = input.dirname
    this.publicDir = input.publicDir
    this.fallbackRootId = input.fallbackRootId || input.clients.at(0)?.root._rootId || input.root._rootId
    this.eversion = input.eversion
    this.clients = input.clients
  }

  static async create<TRequiredCtx extends RequiredCtx = RequiredCtx>(
    input: ServerAdapterServerInput<TRequiredCtx>,
  ): Promise<BunAdapter<TRequiredCtx>> {
    const parsedInput = parseServerAdapterInput(input)
    const eversion = await Eversion.create({ root: parsedInput.root, points: parsedInput.points })
    // for (const client of parsedInput.clients) {
    //   await eversion.connect({ root: client.root, points: client.points })
    // }
    const clients = await Promise.all(
      parsedInput.clients.map(async (client) => {
        return {
          ...client,
          eversion: await eversion.connect({ root: client.root, points: client.points }),
        }
      }),
    )

    const bunServer = new BunAdapter<TRequiredCtx>({ ...parsedInput, clients, eversion })

    await bunServer._setPublicFilePaths()
    await bunServer._setClientsDevRoutes()
    await bunServer._preloadDistIndexHtmlContents()

    return bunServer
  }

  async _setPublicFilePaths(): Promise<void> {
    if (!this.publicDir) {
      return
    }
    try {
      const glob = new Bun.Glob('**/*')
      for await (const relPath of glob.scan({ cwd: this.publicDir, onlyFiles: true })) {
        const absPath = nodePath.resolve(this.publicDir, relPath)
        this.publicFilePaths.set(relPath, absPath)
      }
    } catch (error) {
      // publicDir doesn't exist or is not accessible
      this.logger.info(`🔴 Please, fix path of publicDir provided to getBunServer: ${this.publicDir}`)
      throw error
    }
  }

  async _setClientsDevRoutes(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      return
    }
    const clientsDevRoutes = Object.fromEntries(
      await Promise.all(
        this.clients
          .flatMap((client) => (client.srcIndexHtml ? [{ client, srcIndexHtml: client.srcIndexHtml }] : []))
          .map(async (clientWithSrcIndexHtml) => {
            if (!(await Bun.file(clientWithSrcIndexHtml.srcIndexHtml).exists())) {
              throw new Error(
                `srcIndexHtml file "${clientWithSrcIndexHtml.srcIndexHtml}" not found in development mode for client "${clientWithSrcIndexHtml.client.root._rootId}"`,
              )
            }
            return [
              `/development-${clientWithSrcIndexHtml.client.root._rootId}.index.html`,
              (await import(clientWithSrcIndexHtml.srcIndexHtml)).default,
            ]
          }),
      ),
    )
    this.clientsDevRoutes = clientsDevRoutes
  }

  async _preloadDistIndexHtmlContents(): Promise<void> {
    if (process.env.NODE_ENV !== 'production') {
      // on dev mode we will load index.html from served srcIndexHtml becouse it has injected hmr script
      return
    }
    // else we will get provided distIndexHtml
    const indexHtmlContents = Object.fromEntries(
      await Promise.all(
        this.clients.map(async (client) => {
          if (!client.distIndexHtml) {
            return [client.root._rootId, undefined]
          }
          if (!(await Bun.file(client.distIndexHtml).exists())) {
            throw new Error(
              `"${client.distIndexHtml}" not found in production mode for client "${client.root._rootId}"`,
            )
          }
          return [client.root._rootId, await Bun.file(client.distIndexHtml).text()]
        }),
      ),
    )
    this.indexHtmlContents = indexHtmlContents
  }

  // Do not use it. Becouse we need fresh index.html, becous js bundle path may change
  // async _preloadSrcIndexHtmlContents(bunServer: Bun.Server<unknown>): Promise<void> {
  //   if (process.env.NODE_ENV === 'production') {
  //     // on production mode we already preloaded distIndexHtml contents
  //     return
  //   }
  //   // else we will fetch srcIndexHtml contents from clientsDevRoutes
  //   const indexHtmlContents = Object.fromEntries(
  //     await Promise.all(
  //       this.clients.map(async (client) => {
  //         if (!client.srcIndexHtml) {
  //           return [client.base._rootId, undefined]
  //         }
  //         const content = await (
  //           await fetch(
  //             `http://localhost:${bunServer.port}${client.basepath}development-${client.base._rootId}.index.html`,
  //           )
  //         ).text()
  //         return [client.base._rootId, content]
  //       }),
  //     ),
  //   )
  //   this.indexHtmlContents = indexHtmlContents
  // }

  async _loadSrcIndexHtmlContents(client: ServerAdapterClientInputParsed): Promise<string> {
    if (this.devServeTarget === 'server') {
      return await (
        await fetch(
          `http://localhost:${this.clientsDevServerPort}${client.basepath}development-${client.root._rootId}.index.html`,
        )
      ).text()
    } else {
      return await (
        await fetch(
          `http://localhost:${this.mainServerPort}${client.basepath}development-${client.root._rootId}.index.html`,
        )
      ).text()
    }
  }

  async _fetchClientDistDir({ pathname }: ParsedRequest): Promise<Response | undefined> {
    if (process.env.NODE_ENV !== 'production') {
      return undefined
    }
    const relatedClient = this.clients.find((client) => isPathnameUnderBasepath(pathname, client.distRoute))
    if (relatedClient?.distDir && relatedClient.distRoute && pathname.startsWith(relatedClient.distRoute)) {
      const clientFilePathAbs = nodePath.resolve(
        relatedClient.distDir,
        pathname.replace(new RegExp(`^${relatedClient.distRoute}`), ''),
      )
      if (clientFilePathAbs.startsWith(relatedClient.distDir)) {
        const clientFile = Bun.file(clientFilePathAbs)
        if (await clientFile.exists()) {
          return new Response(Bun.file(clientFilePathAbs))
        }
      }
    }
    return undefined
  }

  async _fetchPublicDir({ pathnameAsRelPath, request }: ParsedRequest): Promise<Response | undefined> {
    if (!this.publicDir) {
      return undefined
    }
    const absPath = this.publicFilePaths.get(pathnameAsRelPath)
    if (absPath) {
      try {
        return new Response(Bun.file(absPath))
      } catch (error) {
        return toSuitableErrorResponse(error, 404, request.headers.get('Accept'))
      }
    }
    return undefined
  }

  async _fetchRobotsTxt({ pathname }: ParsedRequest): Promise<Response | undefined> {
    if (pathname !== '/robots.txt') {
      return undefined
    }
    return new Response('', { headers: { 'Content-Type': 'text/plain' } })
  }

  async _fetchChromeDevtoolsJson({ pathname }: ParsedRequest): Promise<Response | undefined> {
    if (pathname !== '/.well-known/appspecific/com.chrome.devtools.json') {
      return undefined
    }
    return new Response('{}', { headers: { 'Content-Type': 'application/json' } })
  }

  async fetch(request: Request, requiredCtx: TRequiredCtx): Promise<Response> {
    const url = new URL(request.url)
    const pathname = url.pathname
    const pathnameAsRelPath = pathname.replace(/^\//, '')
    const isJsonAcceptable = !!request.headers.get('Accept')?.includes('application/json')
    const parsedRequest: ParsedRequest = { request, url, pathname, pathnameAsRelPath, isJsonAcceptable }

    try {
      let response: Response | undefined = await this._fetchClientDistDir(parsedRequest)
      if (response) {
        return response
      }

      response = await this._fetchPublicDir(parsedRequest)
      if (response) {
        return response
      }

      response = await this._fetchRobotsTxt(parsedRequest)
      if (response) {
        return response
      }

      response = await this._fetchChromeDevtoolsJson(parsedRequest)
      if (response) {
        return response
      }

      const suitable = this.eversion.getSuitable({
        method: request.method as Method,
        location: Route0.getLocation(request.url),
        fallbackRootId: this.fallbackRootId,
      })
      const run = await suitable.eversion.createRun({
        location: suitable.location,
        requiredCtx,
      })

      // TODO: get correct input by suitable using helper
      const body = await (async () => {
        try {
          return await request.json()
        } catch (error) {
          return {}
        }
      })()
      const searchParams = { ...qs.parse(url.search.slice(1)) } as Record<string, any>
      const routeParams = suitable.location.params
      const input = searchParams._point0_input
        ? JSON.parse(searchParams._point0_input)
        : { ...searchParams, ...routeParams, ...body }
      const extractResult = await run.extract({
        point: suitable.point,
        input,
      })
      const relatedClient = this.clients.find((client) => client.root === suitable.eversion.root)
      if (extractResult.error) {
        this.logger.error(extractResult.error)
      }

      if (relatedClient) {
        const originalIndexHtml =
          process.env.NODE_ENV === 'production'
            ? this.indexHtmlContents[relatedClient.root._rootId]
            : await this._loadSrcIndexHtmlContents(relatedClient)
        const App = relatedClient.App

        if (relatedClient.ssr && !isJsonAcceptable) {
          if (!originalIndexHtml) {
            if (process.env.NODE_ENV !== 'production') {
              throw new Error(
                `index.html not found for client "${relatedClient.root._rootId}", please provide srcIndexHtml for client in development mode`,
              )
            } else {
              throw new Error(
                `index.html not found for client "${relatedClient.root._rootId}", please provide distIndexHtml for client in production mode`,
              )
            }
          }
          // so we render page wrapped with layouts
          try {
            if (!App) {
              throw new Error(`App not found for client "${relatedClient.root._rootId}", please provide it`)
            }
            const readableStream = await renderAppAsReadableStream({
              App,
              run,
              head: extractResult.head,
              location: suitable.location,
              originalIndexHtml,
              rootElementId: relatedClient.rootElementId,
            })
            return new Response(readableStream, {
              headers: { 'Content-Type': 'text/html' },
              status: extractResult.status,
            })
          } catch (error) {
            // in case if entry provided in index.html is not correct, we fallback to original index.html with provided bun error
            if (error instanceof Error && error.message.includes('<!-- __POINT0_TARGET__ --> not found')) {
              this.logger.error(error)
              return new Response(originalIndexHtml, {
                headers: { 'Content-Type': 'text/html' },
                status: 500,
              })
            }
            throw error
          }
        } else if (!relatedClient.ssr && !isJsonAcceptable && relatedClient.distIndexHtml) {
          return new Response(originalIndexHtml, {
            headers: { 'Content-Type': 'text/html' },
            status: 200,
          })
        }
      }

      if (extractResult.error) {
        return toJsonErrorResponse(extractResult.error, extractResult.status)
      }

      if (extractResult.response) {
        return extractResult.response
      }

      // else we try to get endpoint json
      return new Response(JSON.stringify(extractResult.data), {
        headers: { 'Content-Type': 'application/json' },
        status: extractResult.status,
      })
    } catch (error) {
      this.logger.error(error)
      return toSuitableErrorResponse(error, 500, request.headers.get('Accept'))
    }
  }

  serve(
    ...args: IsEmptyObject<Omit<TRequiredCtx, 'request'>> extends true
      ? [
          options?: {
            devServeTarget?: 'client' | 'server' | 'universal' | undefined
            port?: number | string
            clientsDevServerPort?: number | string
            hmr?: boolean
            requiredCtx?: Omit<TRequiredCtx, 'request'>
          },
        ]
      : [
          options: {
            devServeTarget?: 'client' | 'server' | 'universal' | undefined
            port?: number | string
            clientsDevServerPort?: number | string
            hmr?: boolean
            requiredCtx: Omit<TRequiredCtx, 'request'>
          },
        ]
  ): typeof this {
    const options = args[0]
    const devServeTarget = options?.devServeTarget ?? process.env.DEV_SERVE_TARGET
    if (devServeTarget === 'client') {
      this.devServeTarget = 'client'
      this.serveClientsDevServer(...args)
      return this
    } else if (devServeTarget === 'server') {
      this.devServeTarget = 'server'
      this.serveMainDevServer(...args)
      return this
    } else if (devServeTarget === 'universal') {
      this.devServeTarget = 'universal'
      this.serveUniversal(...args)
      return this
    } else {
      this.devServeTarget = undefined
      this.serveMainServer(...args)
      return this
    }
  }

  serveUniversal(
    ...args: IsEmptyObject<Omit<TRequiredCtx, 'request'>> extends true
      ? [
          options?: {
            port?: number | string
            requiredCtx?: Omit<TRequiredCtx, 'request'>
          },
        ]
      : [
          options: {
            port?: number | string
            requiredCtx: Omit<TRequiredCtx, 'request'>
          },
        ]
  ): typeof this {
    const options = args[0]
    const port = options?.port ?? this.mainServerPort
    const requiredCtx = options && 'requiredCtx' in options ? options.requiredCtx : {}
    if (this.mainServer) {
      throw new Error('Main server already started')
    }
    this.mainServer = serve({
      port,
      routes: {
        ...this.clientsDevRoutes,
        '/*': async (request) => {
          return await this.fetch(request, { request, ...requiredCtx } as never as TRequiredCtx)
        },
      },
    })

    this.mainServerPort = this.mainServer.port ?? this.mainServerPort
    this.logger.info(`Universal server running at http://localhost:${this.mainServerPort}`)
    return this
  }

  serveMainServer(
    ...args: IsEmptyObject<Omit<TRequiredCtx, 'request'>> extends true
      ? [
          options?: {
            port?: number | string
            requiredCtx?: Omit<TRequiredCtx, 'request'>
          },
        ]
      : [
          options: {
            port?: number | string
            requiredCtx: Omit<TRequiredCtx, 'request'>
          },
        ]
  ): typeof this {
    const options = args[0]
    const port = options?.port ?? this.mainServerPort
    const requiredCtx = options && 'requiredCtx' in options ? options.requiredCtx : {}
    if (this.mainServer) {
      throw new Error('Main server already started')
    }
    this.mainServer = serve({
      port,
      fetch: async (request) => {
        return await this.fetch(request, { request, ...requiredCtx } as never as TRequiredCtx)
      },
    })

    this.mainServerPort = this.mainServer.port ?? this.mainServerPort
    this.logger.info(`Main server running at http://localhost:${this.mainServerPort}`)
    return this
  }

  serveMainDevServer(
    ...args: IsEmptyObject<Omit<TRequiredCtx, 'request'>> extends true
      ? [
          options?: {
            port?: number | string
            requiredCtx?: Omit<TRequiredCtx, 'request'>
          },
        ]
      : [
          options: {
            port?: number | string
            requiredCtx: Omit<TRequiredCtx, 'request'>
          },
        ]
  ): typeof this {
    const options = args[0]
    const port = options?.port ?? this.mainServerPort
    const requiredCtx = options && 'requiredCtx' in options ? options.requiredCtx : {}
    if (this.mainServer) {
      throw new Error('Main dev server already started')
    }
    this.mainServer = serve({
      port,
      fetch: async (request, server) => {
        const url = new URL(request.url)
        const path = url.pathname

        // WebSocket proxy for HMR
        if (process.env.NODE_ENV === 'development' && path.startsWith('/_bun/hmr')) {
          const wsUrl = `ws://localhost:${this.clientsDevServerPort}${path}${url.search}`

          // Upgrade the connection and store upstream URL in data
          const upgraded = server.upgrade(request, {
            data: { wsUrl },
          })

          if (!upgraded) {
            return new Response('WebSocket upgrade failed', { status: 400 })
          }

          // Return undefined to indicate WebSocket upgrade was successful
          return
        }

        // HTTP proxy for client dev server assets
        const shouldProxyToClient =
          process.env.NODE_ENV === 'development' &&
          (path.startsWith('/_bun') || path.startsWith('/development-') || path.endsWith('.hot-update.js'))

        if (shouldProxyToClient) {
          const fixedUrl = new URL(`http://localhost:${this.clientsDevServerPort}${path}${url.search}`)
          return await fetch(fixedUrl, request)
        }

        return await this.fetch(request, { request, ...requiredCtx } as never as TRequiredCtx)
      },

      websocket: {
        open(ws) {
          // Connect to upstream WebSocket when client connects
          const data = ws.data as { wsUrl: string; upstream?: WebSocket }
          const upstream = new WebSocket(data.wsUrl)

          upstream.onopen = () => {
            // Store upstream reference in ws data
            data.upstream = upstream
          }

          upstream.onmessage = (event) => {
            // Forward messages from upstream to client
            ws.send(event.data)
          }

          upstream.onclose = () => {
            ws.close()
          }

          upstream.onerror = () => {
            ws.close()
          }

          // Store upstream for later use
          data.upstream = upstream
        },

        message(ws, message) {
          // Forward messages from client to upstream
          const data = ws.data as { upstream?: WebSocket }
          if (data.upstream && data.upstream.readyState === WebSocket.OPEN) {
            data.upstream.send(message)
          }
        },

        close(ws) {
          // Clean up upstream connection when client disconnects
          const data = ws.data as { upstream?: WebSocket }
          if (data.upstream) {
            data.upstream.close()
          }
        },
      },
    })

    this.mainServerPort = this.mainServer.port ?? this.mainServerPort
    this.logger.info(`Main dev server running at http://localhost:${this.mainServerPort}`)
    return this
  }

  // in case if we serve via elysia or another server, we need to start clients dev server separately
  serveClientsDevServer({
    port = this.clientsDevServerPort,
    hmr = true,
  }: { port?: number | string | undefined; hmr?: boolean } = {}): typeof this {
    if (this.clientsDevServer) {
      throw new Error('Clients dev server already started')
    }
    if (process.env.NODE_ENV === 'production') {
      // throw new Error('startClientsDevServer is only available in development mode, please wrap your code in if (process.env.NODE_ENV !== "production") { ... }')
      return this
    }
    this.clientsDevServer = serve({
      port,
      // TODO: console as option for clients dev server
      development: { hmr, console: false },
      routes: {
        ...this.clientsDevRoutes,
      },
    })
    this.clientsDevServerPort = this.clientsDevServer.port ?? this.clientsDevServerPort
    this.logger.info(`Clients dev server running at http://localhost:${this.clientsDevServerPort}`)
    return this
  }
}

export default BunAdapter
