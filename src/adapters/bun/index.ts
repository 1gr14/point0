import type {} from 'bun'
import { serve } from 'bun'
import * as nodePath from 'node:path'
import qs from 'qs'
import { createElement } from 'react'
import type { BaseId, BasePoint, Method, RequiredCtx } from '../../core/index.js'
import type { PointsCollection } from '../../eversion/runtime.js'
import { Eversion0 } from '../../eversion/runtime.js'
import type {
  AdapterClientInputParsed,
  AdapterLogger,
  AdapterServerInput,
  AdapterServerInputParsed,
} from '../../server/adapter.js'
import { parseAdapterInput } from '../../server/adapter.js'
import { toJsonErrorResponse, toSuitableErrorResponse } from '../../server/error.js'
import { renderReadableStream } from '../../server/render.js'
import { isPathnameUnderBasepath } from '../../server/utils.js'

// TODO: allow public dir per each client also
// TODO: allow special origin per each client also

type ParsedRequest = {
  request: Request
  pathname: string
  pathnameAsRelPath: string
  isJsonAcceptable: boolean
}

export class BunAdapter<TRequiredCtx extends RequiredCtx = RequiredCtx> {
  base: BasePoint<TRequiredCtx>
  points?: PointsCollection
  port?: number | string | undefined
  logger: AdapterLogger
  dirname?: string
  publicDir?: string
  fallbackBaseId: BaseId
  eversion: Eversion0<TRequiredCtx>
  clients: AdapterClientInputParsed[]

  publicFilePaths: Map<string, string> = new Map<string, string>()
  clientsDevRoutes: Record<string, any> = {}
  indexHtmlContents: Record<string, string | undefined> = {}

  private constructor(input: AdapterServerInputParsed<TRequiredCtx> & { eversion: Eversion0<TRequiredCtx> }) {
    this.base = input.base
    this.points = input.points
    this.port = input.port
    this.logger = input.logger
    this.dirname = input.dirname
    this.publicDir = input.publicDir
    this.fallbackBaseId = input.fallbackBaseId || input.clients.at(0)?.base._baseId || input.base._baseId
    this.eversion = input.eversion
    this.clients = input.clients
  }

  static async create<TRequiredCtx extends RequiredCtx = RequiredCtx>(
    input: AdapterServerInput<TRequiredCtx>,
  ): Promise<BunAdapter<TRequiredCtx>> {
    const parsedInput = parseAdapterInput(input)
    const eversion = await Eversion0.create({ base: parsedInput.base, points: parsedInput.points })
    for (const client of parsedInput.clients) {
      await eversion.connect({ base: client.base, points: client.points })
    }

    const bunServer = new BunAdapter<TRequiredCtx>({ ...parsedInput, eversion })

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
                `srcIndexHtml file "${clientWithSrcIndexHtml.srcIndexHtml}" not found in development mode for client "${clientWithSrcIndexHtml.client.base._baseId}"`,
              )
            }
            return [
              `/development-${clientWithSrcIndexHtml.client.base._baseId}.index.html`,
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
            return [client.base._baseId, undefined]
          }
          if (!(await Bun.file(client.distIndexHtml).exists())) {
            throw new Error(
              `"${client.distIndexHtml}" not found in production mode for client "${client.base._baseId}"`,
            )
          }
          return [client.base._baseId, await Bun.file(client.distIndexHtml).text()]
        }),
      ),
    )
    this.indexHtmlContents = indexHtmlContents
  }

  async _preloadSrcIndexHtmlContents(bunServer: Bun.Server<unknown>): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      // on production mode we already preloaded distIndexHtml contents
      return
    }
    // else we will fetch srcIndexHtml contents from clientsDevRoutes
    const indexHtmlContents = Object.fromEntries(
      await Promise.all(
        this.clients.map(async (client) => {
          if (!client.srcIndexHtml) {
            return [client.base._baseId, undefined]
          }
          const content = await (
            await fetch(
              `http://localhost:${bunServer.port}${client.basepath}development-${client.base._baseId}.index.html`,
            )
          ).text()
          return [client.base._baseId, content]
        }),
      ),
    )
    this.indexHtmlContents = indexHtmlContents
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
    const parsedRequest: ParsedRequest = { request, pathname, pathnameAsRelPath, isJsonAcceptable }

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
        pathname,
        fallbackBaseId: this.fallbackBaseId,
      })
      // TODO: get correct input by suitable using helper
      const body = await (async () => {
        try {
          return await request.json()
        } catch (error) {
          return undefined
        }
      })()
      const searchParams = { ...qs.parse(url.search) } as Record<string, any>
      const input = suitable.point?._pointType !== 'page' ? { ...body, ...searchParams } : {}
      const extractResult = await suitable.eversion.extract({
        point: suitable.point,
        requiredCtx,
        location: suitable.location,
        input,
      })
      const relatedClient = this.clients.find((client) => client.base === extractResult.base)
      if (extractResult.error) {
        this.logger.error(extractResult.error)
      }

      if (relatedClient) {
        const originalIndexHtml = this.indexHtmlContents[relatedClient.base._baseId]
        const App = relatedClient.App

        if (relatedClient.ssr && !isJsonAcceptable) {
          if (!originalIndexHtml) {
            if (process.env.NODE_ENV !== 'production') {
              throw new Error(
                `index.html not found for client "${relatedClient.base._baseId}", please provide srcIndexHtml for client in development mode`,
              )
            } else {
              throw new Error(
                `index.html not found for client "${relatedClient.base._baseId}", please provide distIndexHtml for client in production mode`,
              )
            }
          }
          // so we render page wrapped with layouts
          try {
            if (!App) {
              throw new Error(`App not found for client "${relatedClient.base._baseId}", please provide it`)
            }
            const pages = await Eversion0.toServerPagesCollection({
              points: relatedClient.points,
              ssrLocation: extractResult.location,
            })
            const appElement = createElement(App, {
              ssrLocation: extractResult.location,
              pages,
              dehydratedState: extractResult.dehydratedState,
            })
            const readableStream = await renderReadableStream({
              element: appElement,
              dehydratedState: extractResult.dehydratedState,
              head: extractResult.head,
              location: extractResult.location,
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

  serve({ port, hmr = true }: { port?: number | string | undefined; hmr?: boolean } = {}): Bun.Server<unknown> {
    const bunServer = serve({
      port: port ?? this.port,
      development: process.env.NODE_ENV === 'production' ? false : { hmr },
      routes: {
        ...this.clientsDevRoutes,
        '/*': async (request) => {
          return await this.fetch(request, { request } as never as TRequiredCtx)
        },
      },
    })
    this.port = bunServer.port
    this._preloadSrcIndexHtmlContents(bunServer).catch((error: unknown) => {
      this.logger.error(error)
    })
    this.logger.info(`Bun server running at http://localhost:${this.port}`)
    return bunServer
  }
}

export default BunAdapter
