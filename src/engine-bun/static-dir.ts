import * as nodePath from 'node:path'
import { parseUrl, type ParsedUrl } from '../core/utils.js'
import { dedupeSlashes } from '../engine-shared/utils.js'
import type { RootPoint } from '../core/types.js'
import type { Eversion } from '../core/eversion.js'

export class StaticDir {
  hostname: string | undefined
  dirAbsPath: string
  dirRoutePath: string
  // <fileRoutePath, fileAbsPath>
  files: Map<string, string>
  eversion: Eversion

  root: RootPoint

  private constructor(input: {
    hostname: string | undefined
    absPath: string
    routePath: string
    root: RootPoint
    eversion: Eversion
  }) {
    this.hostname = input.hostname
    this.dirAbsPath = input.absPath
    this.dirRoutePath = input.routePath
    this.files = new Map<string, string>()
    this.root = input.root
    this.eversion = input.eversion
  }

  static async create(input: {
    hostname: string | undefined
    absPath: string
    routePath: string
    root: RootPoint
    eversion: Eversion
  }): Promise<StaticDir> {
    const staticDir = new StaticDir(input)
    await staticDir.loadFiles()
    return staticDir
  }

  async loadFiles(): Promise<void> {
    const glob = new Bun.Glob('**/*')
    for await (const relPath of glob.scan({ cwd: this.dirAbsPath, onlyFiles: true })) {
      const fileAbsPath = nodePath.resolve(this.dirAbsPath, relPath)
      const fileRoutePath = dedupeSlashes(this.dirRoutePath + relPath)
      this.files.set(fileRoutePath, fileAbsPath)
    }
  }

  async fetch({ parsedUrl, request }: { parsedUrl?: ParsedUrl; request: Request }): Promise<Response | undefined> {
    parsedUrl ??= parseUrl(request.url)
    if (this.hostname && parsedUrl.urlObj.hostname !== this.hostname) {
      return undefined
    }
    const fileAbsPath = this.files.get(parsedUrl.urlObj.pathname)
    if (!fileAbsPath) {
      return undefined
    }

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

    const response = new Response(Bun.file(fileAbsPath))
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
}
