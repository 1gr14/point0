import * as nodePath from 'node:path'
import type { ParsedUrl } from '../core/utils.js'
import { dedupeSlashes } from '../engine-shared/utils.js'

export class StaticDir {
  hostname: string | undefined
  dirAbsPath: string
  dirRoutePath: string
  // <fileRoutePath, fileAbsPath>
  files: Map<string, string>

  private constructor(input: { hostname: string | undefined; absPath: string; routePath: string }) {
    this.hostname = input.hostname
    this.dirAbsPath = input.absPath
    this.dirRoutePath = input.routePath
    this.files = new Map<string, string>()
  }

  static async create(input: { hostname: string | undefined; absPath: string; routePath: string }): Promise<StaticDir> {
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

  fetch(parsedUrl: ParsedUrl): Response | undefined {
    if (this.hostname && parsedUrl.urlObj.hostname !== this.hostname) {
      return undefined
    }
    const fileAbsPath = this.files.get(parsedUrl.urlObj.pathname)
    if (!fileAbsPath) {
      return undefined
    }
    return new Response(Bun.file(fileAbsPath))
  }
}
