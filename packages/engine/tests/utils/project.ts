import * as nodeFs from 'node:fs/promises'
import * as nodePath from 'node:path'
import type { Engine } from '../../src/engine.js'
import { TestProcess } from './process.js'

const testTemplateDir = nodePath.resolve(__dirname, '..', 'template')
const testsGeneralTempDir = nodePath.resolve(__dirname, '..', 'temp')

export type TestProjectOptions = {
  namespace: string
  ssr?: boolean
  superjson?: boolean
  serverPort?: 'auto' | undefined
  clientPort?: 'auto' | undefined
}

export class TestProject {
  namespace: string
  dir: string
  name: string
  id: string
  ssr: boolean
  superjson: boolean
  serverPort: number | 'auto'
  clientPort: number | 'auto'
  processes: TestProcess[] = []
  ports: number[] = []

  static reservedPorts = new Set<number>()
  static getNextFreePort(): number {
    let port = 3000
    while (this.reservedPorts.has(port)) {
      port++
    }
    this.reservedPorts.add(port)
    return port
  }
  static releasePort(port: number): void {
    this.reservedPorts.delete(port)
  }

  private constructor(options: {
    namespace: string
    dir: string
    name: string
    id: string
    ssr: boolean
    superjson: boolean
    serverPort: 'auto' | number
    clientPort: 'auto' | number
    ports: number[]
  }) {
    this.namespace = options.namespace
    this.dir = options.dir
    this.name = options.name
    this.id = options.id
    this.ssr = options.ssr
    this.superjson = options.superjson
    this.serverPort = options.serverPort
    this.clientPort = options.clientPort
    this.ports = options.ports
  }

  static create(options: TestProjectOptions) {
    const id = crypto.randomUUID()
    const name = 'test-' + id
    const dir = nodePath.resolve(testsGeneralTempDir, options.namespace, name)
    const serverPort = options.serverPort === 'auto' ? 'auto' : TestProject.getNextFreePort()
    const clientPort = options.clientPort === 'auto' ? 'auto' : TestProject.getNextFreePort()
    const ports = [serverPort, clientPort].filter((port): port is number => port !== 'auto')
    return new TestProject({
      namespace: options.namespace,
      dir,
      name,
      id,
      ssr: options.ssr ?? true,
      superjson: options.superjson ?? true,
      serverPort,
      clientPort,
      ports,
    })
  }

  static async init(options: TestProjectOptions) {
    return await TestProject.create(options).init()
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
      packageJson: this.resolve('package.json'),
      tsconfigJson: this.resolve('tsconfig.json'),
      dotenv: this.resolve('.env'),
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
      packageJson: Bun.file(this.paths.packageJson),
      tsconfigJson: Bun.file(this.paths.tsconfigJson),
      dotenv: Bun.file(this.paths.dotenv),
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
    await this.replace(this.files.packageJson, 'test-project-name', this.name)
    await this.replace(this.files.engine, '// port: 3000,', `port: ${this.serverPort},`)
    await this.replace(this.files.engine, '// port: 3001,', `port: ${this.clientPort},`)
    if (!this.ssr) {
      await this.replace(this.files.root, '.ssr(true)', '// .ssr(true)')
    }
    if (!this.superjson) {
      await this.replace(this.files.root, '.transformer(superjson)', '// .transformer(superjson)')
    }
    return this
  }

  async importEngine(): Promise<Engine> {
    const { engine } = await import(this.paths.engine)
    return engine
  }

  async cleanup(deleteFiles = true) {
    await Promise.all(
      this.processes.map(async (p) => {
        await p.kill()
      }),
    )
    if (this.serverPort !== 'auto') {
      TestProject.releasePort(this.serverPort)
    }
    if (this.clientPort !== 'auto') {
      TestProject.releasePort(this.clientPort)
    }
    if (deleteFiles) {
      await nodeFs.rm(this.dir, { recursive: true, force: true })
    }
  }

  private async createTempDir() {
    await nodeFs.mkdir(this.dir, { recursive: true })
  }

  private async copyTemplateToTempDir() {
    await nodeFs.cp(testTemplateDir, this.dir, { recursive: true, force: true })
  }

  async spawn(cmds: string[], options?: Parameters<typeof Bun.spawn>[1]): Promise<TestProcess> {
    const testProcess = await TestProcess.spawn(cmds, this.ports, {
      cwd: this.dir,
      ...options,
    })
    this.processes.push(testProcess)
    return testProcess
  }
}

export type TestProjectFactoryOptions = TestProjectOptions
export type TestProjectFactoryCreateOptions = Omit<TestProjectOptions, 'namespace'>

export class TestProjectFactory {
  defaultOptions: TestProjectFactoryOptions
  namespace: string
  instances: TestProject[] = []

  private constructor(defaultOptions: TestProjectFactoryOptions) {
    this.defaultOptions = defaultOptions
    this.namespace = defaultOptions.namespace
  }

  static create(defaultOptions: TestProjectFactoryOptions) {
    return new TestProjectFactory(defaultOptions)
  }

  create(options: TestProjectFactoryCreateOptions = {}) {
    const tp = TestProject.create({ ...this.defaultOptions, ...options })
    this.instances.push(tp)
    return tp
  }

  async init(options: TestProjectFactoryCreateOptions = {}) {
    const tp = await TestProject.init({ ...this.defaultOptions, ...options })
    this.instances.push(tp)
    return tp
  }

  async cleanup() {
    await Promise.all(
      this.instances.map(async (tp) => {
        await tp.cleanup()
      }),
    )
    await nodeFs.rm(nodePath.resolve(testsGeneralTempDir, this.namespace), { recursive: true, force: true })
  }
}
