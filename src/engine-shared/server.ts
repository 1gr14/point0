import * as nodeFs from 'node:fs/promises'
import * as nodePath from 'node:path'
import { Eversion } from '../core/eversion.js'
import type { LazyPointsModule, ReadyPointsModule } from '../core/points.js'
import { Points } from '../core/points.js'
import type { PointsScope, RequiredCtx } from '../core/types.js'
import type { ParsedUrl } from '../core/utils.js'
import type { EngineLogger, EngineOptionsPublicdirParsed } from '../engine-shared/config.js'
import {
  getDirByPaths,
  prependAndDeappendSlash,
  toJsExtension,
  validateEntrypoints,
  withError,
} from '../engine-shared/utils.js'
import type { RuntimeAdapter } from './adapters.js'
import type { ClientBun } from './client.js'
import { engineFetch } from './fetch.js'
import { Publicdir } from './publicdir.js'
import { extractBunBuildConfig, type BunBuildConfigDefinition, type BunPluginsDefinition } from '../engine-bun/utils.js'

export class ServerBun<TInitialized extends boolean = boolean> {
  scope: PointsScope
  cwd: string
  eversion: TInitialized extends true ? Eversion : Eversion | null
  providedPoints: Points | null
  pointsFile: string | null
  points: TInitialized extends true ? Points : Points | null
  itWasBuilt: boolean
  engineFile: string | null
  cwdBeforeBuild: string
  port: number
  hmrPort: number | null
  clients: TInitialized extends true ? Array<ClientBun<true>> : ClientBun[]
  logger: EngineLogger
  entry: Record<string, string> | null
  publicdir: TInitialized extends true ? Publicdir<true> : Publicdir<false>
  outdir: string | null
  bunBuildConfig: BunBuildConfigDefinition
  bunPlugins: BunPluginsDefinition
  publicdirOutdir: string | null
  fallbackScope: PointsScope
  initialized: TInitialized
  serverHandle: any // Bun.Server<unknown> | http.Server | undefined
  adapter: RuntimeAdapter

  private constructor(input: {
    initialized: TInitialized
    cwd: string
    scope: PointsScope
    providedPoints: Points | null
    pointsFile: string | null
    points: Points | null
    itWasBuilt: boolean
    engineFile: string | null
    cwdBeforeBuild: string
    port: number
    hmrPort: number | null
    fallbackScope: PointsScope
    logger: EngineLogger
    clients: ClientBun[]
    entry: Record<string, string> | null
    publicdir: Publicdir | null
    outdir: string | null
    bunBuildConfig: BunBuildConfigDefinition
    bunPlugins: BunPluginsDefinition
    publicdirOutdir: string | null
    eversion: Eversion | null
    adapter: RuntimeAdapter
  }) {
    this.cwd = input.cwd
    this.eversion = input.eversion as TInitialized extends true ? Eversion : null
    this.scope = input.scope
    this.providedPoints = input.providedPoints
    this.pointsFile = input.pointsFile
    this.points = input.points as TInitialized extends true ? Points : null
    this.itWasBuilt = process.env.ENGINE_WAS_BUILT ? process.env.ENGINE_WAS_BUILT === 'true' : input.itWasBuilt
    this.engineFile = input.itWasBuilt ? (process.env.ENGINE_FILE_AFTER_BUILD ?? input.engineFile) : input.engineFile
    this.cwdBeforeBuild = process.env.ENGINE_CWD_BEFORE_BUILD ?? input.cwdBeforeBuild
    this.port = input.port
    this.hmrPort = input.hmrPort
    this.clients = input.clients as TInitialized extends true ? Array<ClientBun<true>> : ClientBun[]
    this.logger = input.logger
    this.entry = input.entry
    this.publicdir = input.publicdir as TInitialized extends true ? Publicdir<true> : Publicdir<false>
    this.outdir = input.outdir
    this.bunBuildConfig = input.bunBuildConfig
    this.bunPlugins = input.bunPlugins
    this.publicdirOutdir = input.publicdirOutdir
    this.fallbackScope = input.fallbackScope
    this.initialized = input.initialized
    this.adapter = input.adapter
  }

  static create(input: {
    cwd: string
    scope: PointsScope
    points: Points | string
    engineFile: string | null
    cwdBeforeBuild: string
    itWasBuilt: boolean
    port: number
    hmrPort: number | null
    entry: Record<string, string> | null
    publicdir: EngineOptionsPublicdirParsed
    outdir: string | null
    bunBuildConfig: BunBuildConfigDefinition
    bunPlugins: BunPluginsDefinition
    publicdirOutdir: string | null
    fallbackScope: PointsScope
    logger: EngineLogger
    clients: ClientBun[]
    adapter: RuntimeAdapter
  }): ServerBun<false> {
    const providedPoints = typeof input.points === 'string' ? null : input.points
    const pointsFile = typeof input.points === 'string' ? input.points : null
    const points = null

    const eversion = null

    const publicdir = Publicdir.create({
      hostname: null,
      definition: input.publicdir,
      root: null,
      eversion,
      outdir: input.publicdirOutdir,
      adapter: input.adapter,
    })

    const server = new ServerBun<false>({
      ...input,
      publicdir,
      eversion,
      points,
      pointsFile,
      providedPoints,
      initialized: false,
      adapter: input.adapter,
    })
    return server
  }

  isInitialized(): this is ServerBun<true> {
    return !!this.initialized
  }

  async init(): Promise<ServerBun<true>> {
    if (this.isInitialized()) {
      return this as ServerBun<true>
    }

    const points = await ServerBun.createPoints({
      providedPoints: this.providedPoints,
      pointsFile: this.pointsFile,
    })
    this.eversion = await Eversion.create({ points })
    await this.publicdir.init({ root: points.root, eversion: this.eversion })
    this.initialized = true as never
    return this as ServerBun<true>
  }

  static readonly createPoints = async ({
    providedPoints,
    pointsFile,
  }: {
    providedPoints: Points | null
    pointsFile: string | null
  }): Promise<Points> => {
    if (providedPoints) {
      return providedPoints
    }
    if (pointsFile) {
      return Points.create(
        await withError(
          async () => (await import(toJsExtension(pointsFile))) as LazyPointsModule | ReadyPointsModule,
          `Failed to import points from ${pointsFile} on server`,
        ),
      )
    }
    throw new Error(`Points not provided for server`)
  }

  async serve({ requiredCtx }: { requiredCtx: RequiredCtx }): Promise<void> {
    if (!this.isInitialized()) {
      throw new Error('Server is not initialized')
    }

    // Detect runtime and dynamically import the appropriate serve implementation
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const isBun = typeof Bun !== 'undefined' || (typeof process !== 'undefined' && process.versions?.bun !== undefined)

    if (isBun) {
      const { serveServerViaBun } = await import('../engine-bun/serve.js')
      this.serverHandle = await serveServerViaBun({ server: this, requiredCtx })
    } else {
      const { serveServerViaNode } = await import('../engine-node/serve.js')
      this.serverHandle = await serveServerViaNode({ server: this, requiredCtx })
    }
  }

  getBuildPaths(): {
    outdir: string | null
    entryFiles: string[]
    pointsFile: string | null
    engineFile: string | null
    entrypointsExists: boolean
  } {
    const entryFiles = this.entry ? Object.values(this.entry) : []
    const entrypointsExists = entryFiles.length > 0 || !!this.engineFile || !!this.pointsFile
    return {
      outdir: this.outdir,
      entryFiles,
      pointsFile: this.pointsFile,
      engineFile: this.engineFile,
      entrypointsExists,
    }
  }

  async cleanSelf(): Promise<boolean> {
    const outdir = this.outdir
    if (!outdir) {
      return false
    }
    // TODO: add if exists check on all clean methods
    await nodeFs.rm(outdir, { recursive: true }).catch(() => {
      /* ignore */
    })
    return true
  }

  async clean(): Promise<{ self: boolean; publicdir: boolean }> {
    const [self, publicdir] = await Promise.all([this.cleanSelf(), this.publicdir.clean()])
    return { self, publicdir }
  }

  async buildSelf(bunBuildConfig: BunBuildConfigDefinition = {}): Promise<string[] | null> {
    const buildPaths = this.getBuildPaths()
    if (!buildPaths.entrypointsExists) {
      return null
    }
    if (!buildPaths.outdir) {
      throw new Error(`outdir not provided for server`)
    }

    const NODE_ENV = process.env.NODE_ENV || 'production'

    const thisBunBuildConfig = await extractBunBuildConfig({
      mode: NODE_ENV,
      command: 'build',
      target: 'server',
      bunBuildConfig: this.bunBuildConfig,
      bunPlugins: this.bunPlugins,
    })
    const providedBunBuildConfig = await extractBunBuildConfig({
      mode: NODE_ENV,
      command: 'build',
      target: 'server',
      bunBuildConfig,
      bunPlugins: [],
    })

    const ENGINE_CWD_BEFORE_BUILD_LOCAL = (() => {
      if (this.cwdBeforeBuild) {
        return this.cwdBeforeBuild
      }
      if (this.engineFile) {
        return nodePath.dirname(this.engineFile)
      }
      return null
    })()
    const ENGINE_CWD_AFTER_BUILD_LOCAL = (() => {
      if (!ENGINE_CWD_BEFORE_BUILD_LOCAL) {
        return null
      }
      if (this.outdir) {
        return nodePath.resolve(this.cwdBeforeBuild, this.outdir)
      }
      return null
    })()
    const { ENGINE_CWD_BEFORE_BUILD_CUTTED, ENGINE_CWD_AFTER_BUILD_CUTTED } = (() => {
      if (!ENGINE_CWD_BEFORE_BUILD_LOCAL || !ENGINE_CWD_AFTER_BUILD_LOCAL) {
        return {
          ENGINE_CWD_BEFORE_BUILD_CUTTED: null,
          ENGINE_CWD_AFTER_BUILD_CUTTED: null,
        }
      }
      const localDir = getDirByPaths({
        paths: [ENGINE_CWD_BEFORE_BUILD_LOCAL, ENGINE_CWD_AFTER_BUILD_LOCAL],
      })
      return {
        ENGINE_CWD_BEFORE_BUILD_CUTTED: prependAndDeappendSlash(ENGINE_CWD_BEFORE_BUILD_LOCAL.replace(localDir, '')),
        ENGINE_CWD_AFTER_BUILD_CUTTED: prependAndDeappendSlash(ENGINE_CWD_AFTER_BUILD_LOCAL.replace(localDir, '')),
      }
    })()

    const injectedEnvs = {
      'process.env.ENGINE_WAS_BUILT': JSON.stringify('true'),
      ...(ENGINE_CWD_BEFORE_BUILD_CUTTED
        ? { 'process.env.ENGINE_CWD_BEFORE_BUILD': JSON.stringify(ENGINE_CWD_BEFORE_BUILD_CUTTED) }
        : {}),
      ...(ENGINE_CWD_AFTER_BUILD_CUTTED
        ? { 'process.env.ENGINE_CWD_AFTER_BUILD': JSON.stringify(ENGINE_CWD_AFTER_BUILD_CUTTED) }
        : {}),
    }
    const injectEnvsScript =
      Object.entries(injectedEnvs)
        .map(([key, value]) => `${key}=${value};`)
        .join('\n') + '\n'
    const buildOutput = await Bun.build({
      target: 'bun',
      packages: 'external',
      sourcemap: 'linked',
      minify: true,
      splitting: true,
      ...thisBunBuildConfig,
      ...providedBunBuildConfig,
      banner: [injectEnvsScript, thisBunBuildConfig.banner, providedBunBuildConfig.banner].filter(Boolean).join('\n'),
      entrypoints: validateEntrypoints([
        ...buildPaths.entryFiles,
        buildPaths.engineFile,
        buildPaths.pointsFile,
        ...(thisBunBuildConfig.entrypoints ?? []),
        ...(providedBunBuildConfig.entrypoints ?? []),
      ]),
      naming: {
        ...(typeof thisBunBuildConfig.naming === 'object' ? thisBunBuildConfig.naming : {}),
        ...(typeof providedBunBuildConfig.naming === 'object' ? providedBunBuildConfig.naming : {}),
        entry: '[name].js',
      },
      outdir: buildPaths.outdir,
      define: {
        ...thisBunBuildConfig.define,
        ...providedBunBuildConfig.define,
        'process.env.NODE_ENV': JSON.stringify(NODE_ENV),
        ...injectedEnvs,
      },
    })
    return buildOutput.outputs.map((output) => output.path)
  }

  async build(
    bunBuildConfig: BunBuildConfigDefinition = {},
  ): Promise<{ self: string[] | null; publicdir: string[] | null }> {
    await this.clean()
    const [self, publicdir] = await Promise.all([this.buildSelf(bunBuildConfig), this.publicdir.build()])
    return { self, publicdir }
  }

  async fetch({
    parsedUrl,
    request,
    requiredCtx,
    scope,
  }: {
    parsedUrl?: ParsedUrl
    request: Request
    requiredCtx: RequiredCtx
    scope?: PointsScope
  }): Promise<Response> {
    if (!this.isInitialized()) {
      throw new Error('Server is not initialized')
    }

    return await engineFetch({
      server: this,
      clients: this.clients,
      eversion: this.eversion,
      request,
      parsedUrl,
      fallbackScope: scope ?? this.fallbackScope,
      scope,
      requiredCtx,
      logger: this.logger,
      adapter: this.adapter,
    })
  }
}
