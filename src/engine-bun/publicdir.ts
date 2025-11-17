import * as nodeFs from 'node:fs/promises'
import * as nodePath from 'node:path'
import type { Eversion } from '../core/eversion.js'
import type { RootPoint } from '../core/types.js'
import { parseUrl, type ParsedUrl } from '../core/utils.js'
import { prependAndDeappendSlash, withError } from '../engine-shared/utils.js'

export class Publicdir<TInitialized extends boolean = boolean> {
  hostname: string | null
  definition: Array<[string, string | Response | (() => Response | Promise<Response>)]>
  // <fileRoutePath, fileAbsPath | fileResponseOrFn>
  files: Map<string, string | Response | (() => Response | Promise<Response>)>
  eversion: TInitialized extends true ? Eversion : Eversion | null
  outdir: string | null
  initialized: TInitialized

  root: TInitialized extends true ? RootPoint : RootPoint | null

  private constructor(input: {
    initialized: TInitialized
    hostname: string | null
    definition: Array<[string, string | Response | (() => Response | Promise<Response>)]>
    root: RootPoint | null
    eversion: Eversion | null
    outdir: string | null
  }) {
    this.hostname = input.hostname
    this.definition = input.definition
    this.files = new Map<string, string | Response | (() => Response | Promise<Response>)>()
    this.root = input.root as TInitialized extends true ? RootPoint : null
    this.eversion = input.eversion as TInitialized extends true ? Eversion : null
    this.outdir = input.outdir
    this.initialized = input.initialized
  }

  static create(input: {
    hostname: string | null
    definition: Array<[string, string | Response | (() => Response | Promise<Response>)]>
    root: RootPoint | null
    eversion: Eversion | null
    outdir: string | null
  }): Publicdir<false> {
    return new Publicdir<false>({
      ...input,
      initialized: false,
    })
  }

  async init({ root }: { root: RootPoint }): Promise<Publicdir<true>> {
    this.root = root as TInitialized extends true ? RootPoint : null
    await this.loadFiles()
    this.initialized = true as never
    return this as Publicdir<true>
  }

  isInitialized(): this is Publicdir<true> {
    return !!this.initialized
  }

  async loadFiles(): Promise<void> {
    const glob = new Bun.Glob('**/*')
    await Promise.all(
      this.definition.map(async ([dirRoutePathOrFilePath, dirAbsPathOrResponseOrFn]) => {
        if (typeof dirAbsPathOrResponseOrFn === 'string') {
          const dirRoutePath = dirRoutePathOrFilePath
          const dirAbsPath = dirAbsPathOrResponseOrFn
          for await (const relPath of glob.scan({ cwd: dirAbsPath, onlyFiles: true })) {
            const fileAbsPath = nodePath.resolve(dirAbsPath, relPath)
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

    // TODO:ASAP use await this.sourceEversion.getWrapRequest(this.eversion.points.root)
    const responseFromSourceRootWrapRequest = await this.eversion.points.root._wrapRequest({
      request,
    })
    if (responseFromSourceRootWrapRequest) {
      return responseFromSourceRootWrapRequest
    }
    if (this.root !== this.eversion.points.root) {
      const responseFromRootWrapRequest = await this.root._wrapRequest({
        request,
      })
      if (responseFromRootWrapRequest) {
        return responseFromRootWrapRequest
      }
    }

    const response =
      typeof fileAbsPathOrResponseOrFn === 'string'
        ? new Response(Bun.file(fileAbsPathOrResponseOrFn))
        : typeof fileAbsPathOrResponseOrFn === 'function'
          ? await fileAbsPathOrResponseOrFn()
          : fileAbsPathOrResponseOrFn
    if (this.eversion.points.root !== this.root) {
      return await this.eversion.points.root._wrapResponse({
        request,
        response: await this.root._wrapResponse({
          request,
          response,
        }),
      })
    } else {
      return await this.root._wrapResponse({
        request,
        response,
      })
    }
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

  async build(): Promise<string[] | null> {
    if (!this.isInitialized()) {
      throw new Error('Publicdir is not initialized')
    }

    const outdir = this.outdir
    if (!outdir) {
      return null
    }

    await nodeFs.mkdir(outdir, { recursive: true })
    const glob = new Bun.Glob('**/*')
    const fileOperations: Array<Promise<string>> = []

    await Promise.all(
      this.definition.map(async ([dirRoutePathOrFilePath, dirAbsPathOrResponseOrFn]) => {
        if (typeof dirAbsPathOrResponseOrFn === 'string') {
          const dirRoutePath = dirRoutePathOrFilePath
          const dirAbsPath = dirAbsPathOrResponseOrFn
          for await (const relPath of glob.scan({ cwd: dirAbsPath, onlyFiles: true })) {
            const fileAbsPath = nodePath.resolve(dirAbsPath, relPath)
            const fileRoutePath = prependAndDeappendSlash(nodePath.join(dirRoutePath, relPath))
            const distAbsPath = nodePath.resolve(outdir, fileRoutePath.replace(/^\/+/, ''))
            fileOperations.push(
              (async () => {
                const content = await withError(
                  async () => await Bun.file(fileAbsPath).text(),
                  `Failed while building publicdir for ${this.root._scope}`,
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
