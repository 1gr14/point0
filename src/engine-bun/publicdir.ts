import * as nodeFs from 'node:fs/promises'
import * as nodePath from 'node:path'
import type { Eversion } from '../core/eversion.js'
import type { RootPoint } from '../core/types.js'
import { parseUrl, type ParsedUrl } from '../core/utils.js'
import { prependAndDeappendSlash, withError } from '../engine-shared/utils.js'

export class Publicdir {
  hostname: string | null
  definition: Array<[string, string | Response | (() => Response | Promise<Response>)]>
  // <fileRoutePath, fileAbsPath | fileResponseOrFn>
  files: Map<string, string | Response | (() => Response | Promise<Response>)>
  eversion: Eversion
  outdir: string | null

  root: RootPoint

  private constructor(input: {
    hostname: string | null
    definition: Array<[string, string | Response | (() => Response | Promise<Response>)]>
    root: RootPoint
    eversion: Eversion
    outdir: string | null
  }) {
    this.hostname = input.hostname
    this.definition = input.definition
    this.files = new Map<string, string | Response | (() => Response | Promise<Response>)>()
    this.root = input.root
    this.eversion = input.eversion
    this.outdir = input.outdir
  }

  static async create(input: {
    hostname: string | null
    definition: Array<[string, string | Response | (() => Response | Promise<Response>)]>
    root: RootPoint
    eversion: Eversion
    outdir: string | null
  }): Promise<Publicdir> {
    const publicdir = new Publicdir(input)
    await publicdir.loadFiles()
    return publicdir
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
