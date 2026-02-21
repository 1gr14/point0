import { prependAndDeappendSlash } from '@point0/core'
import type { PointsScope } from '@point0/core'
import type { Request0 } from '@point0/core/request0'
import * as nodeFs from 'node:fs/promises'
import * as nodePath from 'node:path'
import type { EngineClient } from './client.js'
import type { EngineServer } from './server.js'
import { withError } from './utils.js'

async function* getAllFiles(dirPath: string): AsyncGenerator<string> {
  try {
    const entries = await nodeFs.readdir(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = nodePath.join(dirPath, entry.name)
      if (entry.isDirectory()) {
        yield* getAllFiles(fullPath)
      } else if (entry.isFile()) {
        yield fullPath
      }
    }
  } catch {
    // Ignore errors (e.g., permission denied, not a directory)
  }
}

export type PublicdirDefinition = Array<[string, string | Response | (() => Response | Promise<Response>)]>
export type PublicdirFileDefinition = string | Response | (() => Response | Promise<Response>)
export type PublicdirFilesDefinition = Map<string, PublicdirFileDefinition>
export type PublicdirServing = boolean | string | ((options: { request: Request0 }) => boolean)

export class Publicdir<TPrepared extends boolean = boolean> {
  serving: PublicdirServing
  source: PublicdirDefinition
  // <fileRoutePath, fileAbsPath | fileResponseOrFn>
  files: PublicdirFilesDefinition
  outdir: string | null
  server: TPrepared extends true ? EngineServer<true> | null : EngineServer<false> | null
  client: TPrepared extends true ? EngineClient<true> | null : EngineClient<false> | null
  prepared: TPrepared

  scope: PointsScope

  private constructor(input: {
    prepared: TPrepared
    serving: PublicdirServing
    source: PublicdirDefinition
    scope: PointsScope
    outdir: string | null
    server: TPrepared extends true ? EngineServer<true> | null : EngineServer<false> | null
    client: TPrepared extends true ? EngineClient<true> | null : EngineClient<false> | null
  }) {
    this.serving = input.serving
    this.source = input.source
    this.files = new Map<string, PublicdirFileDefinition>()
    this.scope = input.scope
    this.outdir = input.outdir
    this.prepared = input.prepared
    this.server = input.server
    this.client = input.client
  }

  static create(input: {
    serving: PublicdirServing
    source: PublicdirDefinition
    scope: PointsScope
    outdir: string | null
    server: EngineServer<false> | null
    client: EngineClient<false> | null
  }): Publicdir<false> {
    return new Publicdir<false>({
      ...input,
      prepared: false,
      server: input.server,
      client: input.client,
    })
  }

  async prepare(): Promise<Publicdir<true>> {
    if (this.isPrepared()) {
      return this as Publicdir<true>
    }
    await this.loadFiles()
    this.prepared = true as never
    return this as Publicdir<true>
  }

  isPrepared(): this is Publicdir<true> {
    return !!this.prepared
  }

  async loadFiles(): Promise<void> {
    await Promise.all(
      this.source.map(async ([dirRoutePathOrFilePath, dirAbsPathOrResponseOrFn]) => {
        if (typeof dirAbsPathOrResponseOrFn === 'string') {
          const dirRoutePath = dirRoutePathOrFilePath
          const dirAbsPath = dirAbsPathOrResponseOrFn
          for await (const fileAbsPath of getAllFiles(dirAbsPath)) {
            const relPath = nodePath.relative(dirAbsPath, fileAbsPath)
            const fileRoutePath = prependAndDeappendSlash(nodePath.join(dirRoutePath, relPath))
            this.files.set(fileRoutePath, fileAbsPath)
          }
        } else {
          const fileRoutePath = dirRoutePathOrFilePath
          const fileResponseOrFn = dirAbsPathOrResponseOrFn
          this.files.set(fileRoutePath, fileResponseOrFn)
        }
      }),
    )
  }

  async add(definition: PublicdirDefinition): Promise<void> {
    this.source.push(...definition)
    await this.loadFiles()
  }

  async fetch({ request }: { request: Request0 }): Promise<Response | undefined> {
    if (!this.isPrepared()) {
      throw new Error('Publicdir is not prepared')
    }

    if (!this.isServingRequest({ request })) {
      return undefined
    }
    const fileAbsPathOrResponseOrFn = this.files.get(request.location.pathname)
    if (!fileAbsPathOrResponseOrFn) {
      return undefined
    }

    const response =
      typeof fileAbsPathOrResponseOrFn === 'string'
        ? new Response(Bun.file(fileAbsPathOrResponseOrFn))
        : typeof fileAbsPathOrResponseOrFn === 'function'
          ? await fileAbsPathOrResponseOrFn()
          : fileAbsPathOrResponseOrFn.clone()

    return response
  }

  isServingRequest({ request }: { request: Request0 }): boolean {
    if (this.serving === false) {
      return false
    }
    if (this.serving === true) {
      return true
    }
    if (typeof this.serving === 'string') {
      return request.location.host === this.serving
    }
    return this.serving({ request })
  }

  async clean(): Promise<boolean> {
    const outdir = this.outdir
    if (!outdir) {
      return false
    }
    await nodeFs.rm(outdir, { recursive: true }).catch(() => {
      /* ignore */
    })
    return true
  }

  async build(options?: { clean?: boolean }): Promise<string[] | null> {
    await this.prepare()

    const outdir = this.outdir
    if (!outdir) {
      return null
    }

    const { clean = false } = options ?? {}
    if (clean) {
      await this.clean()
    }

    await nodeFs.mkdir(outdir, { recursive: true })
    const fileOperations: Array<Promise<string>> = []

    await Promise.all(
      this.source.map(async ([dirRoutePathOrFilePath, dirAbsPathOrResponseOrFn]) => {
        if (typeof dirAbsPathOrResponseOrFn === 'string') {
          const dirRoutePath = dirRoutePathOrFilePath
          const dirAbsPath = dirAbsPathOrResponseOrFn
          for await (const fileAbsPath of getAllFiles(dirAbsPath)) {
            const relPath = nodePath.relative(dirAbsPath, fileAbsPath)
            const fileRoutePath = prependAndDeappendSlash(nodePath.join(dirRoutePath, relPath))
            const distAbsPath = nodePath.resolve(outdir, fileRoutePath.replace(/^\/+/, ''))
            fileOperations.push(
              (async () => {
                const content = await withError(
                  async () => await Bun.file(fileAbsPath).text(),
                  `Failed while building publicdir for ${this.scope}`,
                )
                // await nodeFs.mkdir(nodePath.dirname(distAbsPath), { recursive: true })
                await Bun.write(distAbsPath, content)
                return distAbsPath
              })(),
            )
          }
        } else {
          const fileRoutePath = dirRoutePathOrFilePath
          const fileResponseOrFn = dirAbsPathOrResponseOrFn
          fileOperations.push(
            (async () => {
              const response = typeof fileResponseOrFn === 'function' ? await fileResponseOrFn() : fileResponseOrFn
              const content = await response.text()
              const distAbsPath = nodePath.resolve(outdir, fileRoutePath.replace(/^\/+/, ''))
              // await nodeFs.mkdir(nodePath.dirname(distAbsPath), { recursive: true })
              await Bun.write(distAbsPath, content)
              return distAbsPath
            })(),
          )
        }
      }),
    )

    return await Promise.all(fileOperations)
  }

  // TODO: add static checkConflicts(publicdirs: Publicdir[]): throw error if same files paths are used in different public dirs with same serving
}
