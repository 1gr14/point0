import * as nodeFs from 'node:fs/promises'
import * as nodePath from 'node:path'
import type { Engine } from '../../src/engine.js'
import { TestProcess } from './process.js'
import { kill } from './kill.js'

const testTemplateDir = nodePath.resolve(__dirname, '..', 'template')
const testsGeneralTempDir = nodePath.resolve(__dirname, '..', 'temp')

export type TestProjectOptions = {
  ssr: boolean
  superjson: boolean
  tpf: TestProjectFactory
  clientPort: 'auto' | number
  serverPort: 'auto' | number
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

  static create({ tpf, clientPort, serverPort, ssr, superjson }: TestProjectOptions) {
    const id = crypto.randomUUID()
    const name = 'test-' + id
    const dir = nodePath.resolve(testsGeneralTempDir, tpf.namespace, name)
    const ports = [serverPort, clientPort].filter((port): port is number => port !== 'auto')
    return new TestProject({
      namespace: tpf.namespace,
      dir,
      name,
      id,
      ssr,
      superjson,
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

  async cleanup({ files, processes, ports }: { files: boolean; processes: boolean; ports: boolean }) {
    if (processes) {
      for (const process of this.processes) {
        process.kill()
      }
    }
    if (ports) {
      await kill(this.ports)
    }
    if (files) {
      await nodeFs.rm(this.dir, { recursive: true, force: true })
    }
  }

  private async createTempDir() {
    await nodeFs.mkdir(this.dir, { recursive: true })
  }

  private async copyTemplateToTempDir() {
    await nodeFs.cp(testTemplateDir, this.dir, { recursive: true, force: true })
  }

  spawn(cmds: string[], options?: Parameters<typeof Bun.spawn>[1]): TestProcess {
    const testProcess = TestProcess.spawn(cmds, {
      cwd: this.dir,
      ...options,
    })
    this.processes.push(testProcess)
    return testProcess
  }
}

export type TestProjectFactoryOptions = Partial<Omit<TestProjectOptions, 'tpf'>> & {
  namespace: string
  portsRange: [number, number]
}
export type TestProjectFactoryCreateOptions = Partial<Omit<TestProjectOptions, 'tpf'>>

export class TestProjectFactory {
  defaultOptions: TestProjectFactoryOptions
  namespace: string
  instances: TestProject[] = []
  portsRange: [number, number]

  private constructor(defaultOptions: TestProjectFactoryOptions) {
    this.defaultOptions = defaultOptions
    this.namespace = defaultOptions.namespace
    this.portsRange = defaultOptions.portsRange
  }

  static create(defaultOptions: TestProjectFactoryOptions) {
    return new TestProjectFactory(defaultOptions)
  }

  create(options: Partial<TestProjectFactoryCreateOptions> = {}) {
    const tp = TestProject.create({
      ...this.defaultOptions,
      ssr: options.ssr ?? true,
      superjson: options.superjson ?? true,
      serverPort: options.serverPort === undefined ? this.getNextFreePort() : options.serverPort,
      clientPort: options.clientPort === undefined ? this.getNextFreePort() : options.clientPort,
      tpf: this,
    })
    this.instances.push(tp)
    return tp
  }

  async init(options: Partial<TestProjectFactoryCreateOptions> = {}) {
    return await this.create(options).init()
  }

  async cleanup({ files, processes, ports }: { files: boolean; processes: boolean; ports: boolean }) {
    await Promise.all(
      this.instances.map(async (tp) => {
        await tp.cleanup({ files, processes, ports })
      }),
    )
    if (files) {
      await nodeFs.rm(nodePath.resolve(testsGeneralTempDir, this.namespace), { recursive: true, force: true })
    }
  }

  private readonly reservedPorts = new Set<number>()
  getNextFreePort(): number {
    let port = this.portsRange[0]
    while (this.reservedPorts.has(port)) {
      port++
    }
    if (port > this.portsRange[1]) {
      throw new Error(`No free ports in range ${this.portsRange[0]} - ${this.portsRange[1]}`)
    }
    this.reservedPorts.add(port)
    return port
  }
  // releasePort(port: number): void {
  //   this.reservedPorts.delete(port)
  // }
}
