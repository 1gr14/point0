import type { PointsScope } from '@point0/core/types'
import { parseUrl, prependAndDeappendSlash, type ParsedUrl } from '@point0/core/utils'
import * as nodeFs from 'node:fs/promises'
import * as nodePath from 'node:path'
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
  } catch (error) {
    // Ignore errors (e.g., permission denied, not a directory)
  }
}

export class Publicdir<TInitialized extends boolean = boolean> {
  hostname: string | null
  definition: Array<[string, string | Response | (() => Response | Promise<Response>)]>
  // <fileRoutePath, fileAbsPath | fileResponseOrFn>
  files: Map<string, string | Response | (() => Response | Promise<Response>)>
  outdir: string | null
  initialized: TInitialized

  scope: PointsScope

  private constructor(input: {
    initialized: TInitialized
    hostname: string | null
    definition: Array<[string, string | Response | (() => Response | Promise<Response>)]>
    scope: PointsScope
    outdir: string | null
  }) {
    this.hostname = input.hostname
    this.definition = input.definition
    this.files = new Map<string, string | Response | (() => Response | Promise<Response>)>()
    this.scope = input.scope
    this.outdir = input.outdir
    this.initialized = input.initialized
  }

  static create(input: {
    hostname: string | null
    definition: Array<[string, string | Response | (() => Response | Promise<Response>)]>
    scope: PointsScope
    outdir: string | null
  }): Publicdir<false> {
    return new Publicdir<false>({
      ...input,
      initialized: false,
    })
  }

  async init(): Promise<Publicdir<true>> {
    if (this.isInitialized()) {
      return this as Publicdir<true>
    }
    await this.loadFiles()
    this.initialized = true as never
    return this as Publicdir<true>
  }

  isInitialized(): this is Publicdir<true> {
    return !!this.initialized
  }

  async loadFiles(): Promise<void> {
    await Promise.all(
      this.definition.map(async ([dirRoutePathOrFilePath, dirAbsPathOrResponseOrFn]) => {
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

  async add(definition: Array<[string, string | Response | (() => Response | Promise<Response>)]>): Promise<void> {
    this.definition.push(...definition)
    await this.loadFiles()
  }

  async fetch({ parsedUrl, request }: { parsedUrl?: ParsedUrl; request: Request }): Promise<Response | undefined> {
    if (!this.isInitialized()) {
      throw new Error('Publicdir is not initialized')
    }

    parsedUrl ??= parseUrl(request.url)
    if (this.hostname && parsedUrl.urlObj.hostname !== this.hostname) {
      return undefined
    }
    const fileAbsPathOrResponseOrFn = this.files.get(parsedUrl.urlObj.pathname)
    if (!fileAbsPathOrResponseOrFn) {
      return undefined
    }

    const response =
      typeof fileAbsPathOrResponseOrFn === 'string'
        ? new Response(Bun.file(fileAbsPathOrResponseOrFn))
        : typeof fileAbsPathOrResponseOrFn === 'function'
          ? await fileAbsPathOrResponseOrFn()
          : fileAbsPathOrResponseOrFn

    return response
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
    await this.init()

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
      this.definition.map(async ([dirRoutePathOrFilePath, dirAbsPathOrResponseOrFn]) => {
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

  // TODO: add static checkConflicts(publicdirs: Publicdir[]): throw error if same files paths are used in different public dirs with same hostname
}
