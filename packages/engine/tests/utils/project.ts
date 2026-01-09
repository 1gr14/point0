import * as nodeFs from 'node:fs/promises'
import * as nodePath from 'node:path'

const testTemplateDir = nodePath.resolve(__dirname, '..', 'template')
const testsGeneralTempDir = nodePath.resolve(__dirname, '..', 'temp')

export type TestProjectOptions = {
  namespace: string
  ssr?: boolean
  superjson?: boolean
}

export class TestProject {
  namespace: string
  dir: string
  name: string
  id: string
  ssr: boolean
  superjson: boolean

  private constructor(options: {
    namespace: string
    dir: string
    name: string
    id: string
    ssr: boolean
    superjson: boolean
  }) {
    this.namespace = options.namespace
    this.dir = options.dir
    this.name = options.name
    this.id = options.id
    this.ssr = options.ssr
    this.superjson = options.superjson
  }

  static create(options: TestProjectOptions) {
    const id = crypto.randomUUID()
    const name = 'test-' + id
    const dir = nodePath.resolve(testsGeneralTempDir, options.namespace, name)
    return new TestProject({
      namespace: options.namespace,
      dir,
      name,
      id,
      ssr: options.ssr ?? true,
      superjson: options.superjson ?? true,
    })
  }

  resolve(...paths: string[]) {
    return nodePath.resolve(this.dir, ...paths)
  }

  get paths() {
    return {
      src: this.resolve('src'),
      dist: this.resolve('dist'),
      public: this.resolve('public'),
      root: this.resolve('src', 'lib', 'root.tsx'),
      routes: this.resolve('src', 'lib', 'routes.ts'),
      pointsClient: this.resolve('src', 'lib', 'points.client.ts'),
      pointsServer: this.resolve('src', 'lib', 'points.server.ts'),
      app: this.resolve('src', 'app.tsx'),
      engine: this.resolve('src', 'engine.ts'),
      indexClient: this.resolve('src', 'index.client.ts'),
      indexServer: this.resolve('src', 'index.server.ts'),
      indexHtml: this.resolve('index.html'),
    }
  }

  get files() {
    return {
      root: Bun.file(this.paths.root),
      routes: Bun.file(this.paths.routes),
      pointsClient: Bun.file(this.paths.pointsClient),
      pointsServer: Bun.file(this.paths.pointsServer),
      app: Bun.file(this.paths.app),
      engine: Bun.file(this.paths.engine),
      indexClient: Bun.file(this.paths.indexClient),
      indexServer: Bun.file(this.paths.indexServer),
      indexHtml: Bun.file(this.paths.indexHtml),
    }
  }
  async replace(file: Bun.BunFile | keyof typeof this.files, search: string, replace: string) {
    file = typeof file === 'string' ? this.files[file] : file
    const content = await file.text()
    await file.write(content.replaceAll(search, replace))
  }

  async init() {
    await this.createTempDir()
    await this.copyTemplateToTempDir()
    if (!this.ssr) {
      await this.replace(this.files.root, '.ssr(true)', '// .ssr(true)')
    }
    if (!this.superjson) {
      await this.replace(this.files.root, '.transformer(superjson)', '// .transformer(superjson)')
    }
    return this
  }

  async cleanup() {
    await nodeFs.rm(this.dir, { recursive: true, force: true })
  }

  private async createTempDir() {
    await nodeFs.mkdir(this.dir, { recursive: true })
  }

  private async copyTemplateToTempDir() {
    await nodeFs.cp(testTemplateDir, this.dir, { recursive: true, force: true })
  }
}
