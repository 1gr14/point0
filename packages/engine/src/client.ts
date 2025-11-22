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
  extractClientBunDevPluginsStrings,
  resolveTempDirPath,
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
  // pointsDistFile: string | null
  points: TInitialized extends true ? Points : Points | null
  ssr: boolean
  providedAppComponent: AppComponent | null
  appFile: string | null
  // appDistFile: string | null
  hostname: string | null
  basepath: string
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
  serverOutdir: string | null
  publicdirOutdir: string | null
  distIndexHtmlContent: string | null
  server: ServerBun
  // clientBunDevBuilder: Bun.Subprocess<'inherit', 'inherit', 'inherit'> | null
  // serverBunDevBuilder: Bun.Subprocess<'inherit', 'inherit', 'inherit'> | null
  serverViteDevServer: ViteDevServer | null
  clientViteDevServer: ViteDevServer | true | null
  clientBunNativeDevServer: Bun.Subprocess | true | null // true in case if it was run in separate process
  clientBunViteDevServer: Bun.Server<unknown> | true | null // true in case if it was run in separate process
  initialized: TInitialized
  prune: boolean
  pruneServer: boolean

  private constructor(input: {
    scope: PointsScope
    initialized: TInitialized
    cwd: string
    providedPoints: Points | null
    pointsFile: string | null
    // pointsDistFile: string | null
    points: Points | null
    ssr: boolean
    providedAppComponent: AppComponent | null
    appFile: string | null
    // appDistFile: string | null
    hostname: string | null
    basepath: string
    indexHtml: string | null
    // indexHtmlDistFile: string | null
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
    clientBunNativeDevServer: Bun.Subprocess | true | null // true in case if it was run in separate process
    clientBunViteDevServer: Bun.Server<unknown> | true | null // true in case if it was run in separate process
    serverViteDevServer: ViteDevServer | null
    clientViteDevServer: ViteDevServer | true | null
    server: ServerBun
    prune: boolean
    pruneServer: boolean
  }) {
    this.scope = input.scope
    this.cwd = input.cwd
    this.eversion = input.eversion as TInitialized extends true ? Eversion : Eversion | null
    this.providedPoints = input.providedPoints
    this.pointsFile = input.pointsFile
    // this.pointsDistFile = input.pointsDistFile
    this.points = input.points as TInitialized extends true ? Points : Points | null
    this.ssr = input.ssr
    this.providedAppComponent = input.providedAppComponent
    this.appFile = input.appFile
    // this.appDistFile = input.appDistFile
    this.hostname = input.hostname
    this.basepath = input.basepath
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
    this.serverOutdir = input.serverOutdir
    this.bunBuildConfig = input.bunBuildConfig
    this.bunPlugins = input.bunPlugins
    this.publicdirOutdir = input.publicdirOutdir
    // this.clientBunDevBuilder = input.clientBunDevBuilder
    // this.serverBunDevBuilder = input.serverBunDevBuilder
    this.clientViteDevServer = input.clientViteDevServer
    this.clientBunNativeDevServer = input.clientBunNativeDevServer
    this.clientBunViteDevServer = input.clientBunViteDevServer
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
    // pointsDistFile: string | null
    ssr: boolean
    app: AppComponent | string | null
    // appDistFile: string | null
    hostname: string | null
    basepath: string
    publicdir: EngineOptionsPublicdirParsed
    outdir: string | null
    serverOutdir: string | null
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
    const clientBunNativeDevServer = null
    const clientBunViteDevServer = null

    const publicdir = Publicdir.create({
      hostname: input.hostname,
      definition: input.publicdir,
      root: null,
      eversion: input.eversion,
      outdir: input.publicdirOutdir,
      scope: input.scope,
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
      clientBunNativeDevServer,
      clientBunViteDevServer,
      // clientBunDevBuilder,
      // serverBunDevBuilder,
      initialized: false,
    })

    return client
  }

  async init({
    eversion,
    preventClientDevServers = process.env.POINT0_PREVENT_CLIENT_DEV_SERVER === 'true',
  }: {
    eversion: Eversion
    // if we run server entries separately, then we we will run in another processes client dev server once
    preventClientDevServers?: boolean
  }): Promise<ClientBun<true>> {
    if (this.isInitialized()) {
      return this as ClientBun<true>
    }

    this.eversion = eversion

    const [{ clientBunViteDevServer, clientViteDevServer }, clientBunNativeDevServer] = await Promise.all([
      this.viteConfig && process.env.NODE_ENV !== 'production'
        ? preventClientDevServers
          ? { clientBunViteDevServer: true as const, clientViteDevServer: true as const }
          : this.createClientBunViteDevServer()
        : { clientBunViteDevServer: null, clientViteDevServer: null },
      this.indexHtml && !this.viteConfig && process.env.NODE_ENV !== 'production'
        ? preventClientDevServers
          ? (true as const)
          : this.createClientBunNativeDevServer()
        : null,
      this.viteConfig && process.env.NODE_ENV !== 'production' ? this.createServerViteDevServer() : null,
    ])
    this.clientBunViteDevServer = clientBunViteDevServer
    this.clientViteDevServer = clientViteDevServer
    this.clientBunNativeDevServer = clientBunNativeDevServer

    this.points = await this.createPoints()

    await eversion.connect({ points: this.points })
    await this.publicdir.init({ root: this.points.root, eversion })

    this.distIndexHtmlContent =
      process.env.NODE_ENV === 'production' && this.indexHtml ? await Bun.file(this.indexHtml).text() : null
    this.initialized = true as never
    return this as ClientBun<true>
  }

  isInitialized(): this is ClientBun<true> {
    return !!this.initialized
  }

  async serveClientDevServer(): Promise<void> {
    await Promise.all([
      this.viteConfig && process.env.NODE_ENV !== 'production' ? this.createClientBunViteDevServer() : null,
      this.indexHtml && !this.viteConfig && process.env.NODE_ENV !== 'production'
        ? this.createClientBunNativeDevServer()
        : null,
    ])
  }

  readonly createPoints = async (): Promise<Points> => {
    if (this.providedPoints) {
      return this.providedPoints
    }
    const serverViteDevServer = this.serverViteDevServer
    const pointsFile = this.pointsFile
    if (pointsFile) {
      if (serverViteDevServer) {
        return await Points.read(
          toJsExtension(pointsFile),
          async (absPath) =>
            (await serverViteDevServer.ssrLoadModule(toJsExtension(absPath))) as LazyPointsModule | ReadyPointsModule,
        )
      } else {
        return Points.create(
          await withError(
            async () => (await import(toJsExtension(pointsFile))) as LazyPointsModule | ReadyPointsModule,
            `Failed to import points from ${pointsFile} on client "${this.scope}"`,
          ),
        )
      }
    }
    throw new Error(`Points not provided for client "${this.scope}"`)
  }

  async createClientBunNativeDevServer(): Promise<Bun.Subprocess> {
    if (!this.indexHtml) {
      throw new Error(`Index HTML file path is not provided for client "${this.scope}"`)
    }
    if (!this.engineFile) {
      throw new Error(`Engine file path is not provided for client "${this.scope}"`)
    }
    const tempDir = resolveTempDirPath(['client-bun-dev-server', this.scope])
    const pluginsStrings = await extractClientBunDevPluginsStrings({
      cwd: this.cwd,
      nodeEnv: process.env.NODE_ENV,
      command: 'serve',
      bunPlugins: this.bunPlugins,
      errorOnNotString: `Bun dev server plugins for client "${this.scope}" shpuld be strings`,
    })
    const scriptPath = nodePath.join(tempDir, 'serve.js')
    const bunfigTomlPath = nodePath.join(tempDir, 'bunfig.toml')
    const bunfigTomlContent = `[serve.static]
plugins = ["@point0/engine/pruner-bun-static", ${pluginsStrings.map((p) => `"${p}"`).join(', ')}]
`
    const scriptContent = `
import indexHtml from '${this.indexHtml}';
Bun.serve({
  port: ${this.port},
  routes: {
    '/index.html': indexHtml,
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
        POINT0_PRUNER_OPTIONS: JSON.stringify({ customer: 'client', scope: this.scope }),
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
    this.clientBunNativeDevServer = childProcess
    return childProcess
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
      ? await import('./pruner-vite.js').then((module) => module.prunerVitePlugin({ customer, scope }))
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
      },
    })
  }

  async createServerViteDevServer(): Promise<ViteDevServer> {
    if (!this.viteConfig) {
      throw new Error(`Vite config not found for server "${this.scope}"`)
    }
    const serverViteDevServer = await ClientBun.createViteDevServer({
      viteConfig: this.viteConfig,
      scope: this.scope,
      customer: this.ssr ? 'serverSsr' : 'serverNoSsr',
      hmrPort: null,
      env: process.env,
      prune: this.pruneServer,
    })
    this.serverViteDevServer = serverViteDevServer
    return serverViteDevServer
  }

  async createClientBunViteDevServer(): Promise<{
    clientBunViteDevServer: Bun.Server<unknown>
    clientViteDevServer: ViteDevServer
  }> {
    if (!this.viteConfig) {
      throw new Error(`Vite config not found for client "${this.scope}"`)
    }
    const clientViteDevServer = await ClientBun.createViteDevServer({
      viteConfig: this.viteConfig,
      scope: this.scope,
      customer: 'client',
      hmrPort: this.hmrPort,
      env: this.env,
      prune: this.prune,
    })
    this.clientViteDevServer = clientViteDevServer
    if (!this.indexHtml) {
      throw new Error(`Index HTML file path is not provided for client "${this.scope}"`)
    }
    const srcIndexHtmlContent = await Bun.file(this.indexHtml).text()
    const clientBunViteDevServer = Bun.serve({
      port: this.port,
      development: {
        console: false,
        hmr: false,
      },
      fetch: async (request) => {
        const parsedUrl = parseUrl(request.url)
        if (parsedUrl.urlObj.pathname === '/index.html') {
          const originalIndexHtml = await clientViteDevServer.transformIndexHtml(request.url, srcIndexHtmlContent)
          return new Response(originalIndexHtml, {
            headers: {
              'Content-Type': 'text/html',
            },
          })
        }
        const middlewareResponse = await this.fetchClientViteDevServerMiddleware({ request, parsedUrl })
        if (middlewareResponse) {
          return middlewareResponse
        }
        return new Response('__NO_RESPONSE__', {
          headers: {
            'Content-Type': 'text/plain',
          },
          status: 404,
        })
      },
    })
    this.logger.info(`${this.scope} dev server started`)
    return { clientBunViteDevServer, clientViteDevServer }
  }

  async upgradeProxyBunDevServerWebSocket({
    request,
    server,
    parsedUrl,
  }: {
    request: Request
    server: Bun.Server<unknown>
    parsedUrl?: ParsedUrl
  }): Promise<{ result: Response | undefined } | undefined> {
    if (!this.clientBunNativeDevServer) {
      return undefined
    }
    if (request.headers.get('upgrade') !== 'websocket') {
      return undefined
    }
    parsedUrl ??= parseUrl(request.url)
    if (!parsedUrl.urlObj.pathname.startsWith('/_bun/')) {
      return undefined
    }
    const clientBunNativeDevServerWsUrl = `ws://localhost:${this.port}${parsedUrl.urlObj.pathname}${parsedUrl.urlObj.search}`

    // Upgrade the connection and store upstream URL in data
    const upgraded = server.upgrade(request, {
      data: { wsUrl: clientBunNativeDevServerWsUrl },
    })

    if (!upgraded) {
      return { result: new Response('WebSocket upgrade failed', { status: 400 }) }
    }

    // Return undefined to indicate WebSocket upgrade was successful
    return { result: undefined }
  }

  async fetchClientBunDevServerMiddleware({
    request,
    parsedUrl,
  }: {
    request: Request
    parsedUrl?: ParsedUrl
  }): Promise<Response | undefined> {
    const clientBunNativeDevServer = this.clientBunNativeDevServer
    if (!clientBunNativeDevServer) {
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

  async fetchClientViteDevServerMiddleware({
    request,
    parsedUrl,
  }: {
    request: Request
    parsedUrl?: ParsedUrl
  }): Promise<Response | undefined> {
    const clientViteDevServer = this.clientViteDevServer
    if (!clientViteDevServer) {
      return undefined
    }
    parsedUrl ??= parseUrl(request.url)
    if (clientViteDevServer === true) {
      const middlewareResponse = await fetch(
        `http://localhost:${this.port}${parsedUrl.urlObj.pathname}${parsedUrl.urlObj.search}`,
        {
          method: request.method,
          headers: request.headers,
          // body: request.body, do not send body to middleware, becouse vite middle ware do not need, it and we ant it will be not read if we will pass it later out main middleware
        },
      )
      if (middlewareResponse.status === 404) {
        return undefined
      }
      return middlewareResponse
    }
    return await new Promise<Response | undefined>((resolve, reject) => {
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
        return await fetch(`http://localhost:${this.port}/index.html`).then(async (response) => await response.text())
      } else if (this.clientBunNativeDevServer) {
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

  async buildByBunForClient(options?: {
    bunBuildConfig?: ClientBunBuildConfigDefinition
    clean?: boolean
  }): Promise<string[] | null> {
    // if (!this.isInitialized()) {
    //   throw new Error('Client is not initialized')
    // }

    const { bunBuildConfig = this.bunBuildConfig, clean = false } = options ?? {}

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
      ? await import('./pruner-bun.js').then((module) =>
          module.prunerBunPlugin({ customer: 'client', scope: this.scope }),
        )
      : null

    const buildOutput = await Bun.build({
      target: 'browser',
      format: 'esm',
      splitting: true,
      sourcemap: NODE_ENV === 'production' ? 'external' : 'inline',
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

  async buildByBunForServer(options?: {
    bunBuildConfig?: ClientBunBuildConfigDefinition
    clean?: boolean
  }): Promise<string[] | null> {
    // if (!this.isInitialized()) {
    //   throw new Error('Client is not initialized')
    // }

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

    const { bunBuildConfig = this.bunBuildConfig, clean = false } = options ?? {}

    if (clean) {
      await this.cleanServer()
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
          module.prunerBunPlugin({ customer: this.ssr ? 'serverSsr' : 'serverNoSsr', scope: this.scope }),
        )
      : null

    const buildOutput = await Bun.build({
      target: 'bun',
      packages: 'external',
      sourcemap: NODE_ENV === 'production' ? 'linked' : 'inline',
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

  async buildByViteForClient(options?: { clean?: boolean }): Promise<string[] | null> {
    // if (!this.isInitialized()) {
    //   throw new Error('Client is not initialized')
    // }

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
      ? await import('./pruner-vite.js').then((module) =>
          module.prunerVitePlugin({ customer: 'client', scope: this.scope }),
        )
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

  async buildByViteForServer(options?: { clean?: boolean }): Promise<string[] | null> {
    // if (!this.isInitialized()) {
    //   throw new Error('Client is not initialized')
    // }

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

    const { clean = false } = options ?? {}
    if (clean) {
      await this.cleanServer()
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
          module.prunerVitePlugin({ customer: this.ssr ? 'serverSsr' : 'serverNoSsr', scope: this.scope }),
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

  async clean(): Promise<{ client: boolean; publicdir: boolean; server: boolean }> {
    const [client, publicdir, server] = await Promise.all([
      this.cleanClient(),
      this.publicdir.clean(),
      this.cleanServer(),
    ])
    return { client, publicdir, server }
  }

  async buildClientAndServer(options?: {
    bunBuildConfig?: ClientBunBuildConfigDefinition
    clean?: boolean
    target?: 'client' | 'server'
  }): Promise<{ client: string[] | null; server: string[] | null }> {
    const { bunBuildConfig, clean, target } = options ?? {}
    const shouldBuilClient = !target || target === 'client'
    const shouldBuilServer = !target || target === 'server'
    if (this.viteConfig) {
      const [client, server] = await Promise.all([
        shouldBuilClient ? this.buildByViteForClient({ clean }) : null,
        shouldBuilServer ? this.buildByViteForServer({ clean }) : null,
      ])
      return { client, server }
    } else {
      const [client, server] = await Promise.all([
        shouldBuilClient ? this.buildByBunForClient({ bunBuildConfig, clean }) : null,
        shouldBuilServer ? this.buildByBunForServer({ bunBuildConfig, clean }) : null,
      ])
      return { client, server }
    }
  }

  async build(options?: {
    bunBuildConfig?: ClientBunBuildConfigDefinition
    clean?: boolean
    target?: 'client' | 'server'
    publicdir?: boolean
  }): Promise<{ client: string[] | null; server: string[] | null; publicdir: string[] | null }> {
    const { bunBuildConfig = this.bunBuildConfig, clean = false, target, publicdir = true } = options ?? {}
    if (clean) {
      await this.clean()
    }
    const publicdirBuildOutput = publicdir ? await this.publicdir.build() : null // we do not do it in Promise.all, becouse we want dist files override publicdir files, in case if they are the same directory
    const { client, server } = await this.buildClientAndServer({ bunBuildConfig, target })
    return { client, server, publicdir: publicdirBuildOutput }
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
