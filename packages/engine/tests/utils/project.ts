import * as nodeFs from 'node:fs/promises'
import * as nodePath from 'node:path'
import type { Engine } from '../../src/engine.js'
import { TestProcess } from './process.js'
import { kill } from './kill.js'

const testTemplateDir = nodePath.resolve(__dirname, '..', 'template')
const testsGeneralTempDir = nodePath.resolve(__dirname, '..', 'temp')

export class TestProject {
  dir: string
  name: string
  index: number
  ssr: boolean
  superjson: boolean
  serverPort: number
  clientPort: number
  serverHmrPort: number
  clientHmrPort: number
  processes: TestProcess[] = []
  ports: number[] = []
  tpf: TestProjectFactory

  constructor(options: {
    index: number
    ssr: boolean
    superjson: boolean
    serverPort: number
    clientPort: number
    serverHmrPort: number
    clientHmrPort: number
    tpf: TestProjectFactory
  }) {
    this.name = 'test-' + options.index
    this.dir = nodePath.resolve(testsGeneralTempDir, options.tpf.namespace, this.name)
    this.index = options.index
    this.ssr = options.ssr
    this.superjson = options.superjson
    this.serverPort = options.serverPort
    this.clientPort = options.clientPort
    this.serverHmrPort = options.serverHmrPort
    this.clientHmrPort = options.clientHmrPort
    this.ports = [options.serverPort, options.clientPort, options.serverHmrPort, options.clientHmrPort]
    this.tpf = options.tpf
  }

  static async init(options: TestProjectCreateOptions) {
    return await new TestProject(options).init()
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
    const isSearchExists = content.includes(search)
    if (!isSearchExists) {
      throw new Error(`Search string ${search} not found in file ${file.name}`)
    }
    const newContent = content.replaceAll(search, replace)
    await file.write(newContent)
  }

  async write(path: string | Bun.BunFile, content: string): Promise<Bun.BunFile> {
    const file = typeof path === 'string' ? Bun.file(this.resolve('src', path)) : path
    await file.write(content)
    return file
  }

  get output() {
    const firstProcess = this.processes.at(0)
    if (!firstProcess) {
      throw new Error('No processes found')
    }
    return firstProcess.output
  }

  logOutput() {
    const firstProcess = this.processes.at(0)
    if (!firstProcess) {
      throw new Error('No processes found')
    }
    firstProcess.logOutput()
  }

  async init() {
    await this.createTempDir()
    await this.copyTemplateToTempDir()
    await this.replace(this.files.packageJson, 'test-project-name', this.name)
    await this.replace(this.files.engine, '// port: server,', `port: ${this.serverPort},`)
    await this.replace(this.files.engine, '// hmrPort: server,', `hmrPort: ${this.serverHmrPort},`)
    await this.replace(this.files.engine, '// port: client,', `port: ${this.clientPort},`)
    await this.replace(this.files.engine, '// hmrPort: client,', `hmrPort: ${this.clientHmrPort},`)
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

export type TestProjectGeneralOptions = {
  ssr: boolean
  superjson: boolean
}

export type TestProjectCreateOptions = TestProjectGeneralOptions & {
  index: number
  tpf: TestProjectFactory
  serverPort: number
  clientPort: number
  serverHmrPort: number
  clientHmrPort: number
}

export type TestProjectFactoryCreateSelfOptions = Partial<TestProjectGeneralOptions> & {
  namespace: string
  portsRange: [number, number]
}

export type TestProjectFactoryCreateProjectOptions = Partial<TestProjectGeneralOptions>

export class TestProjectFactory {
  defaultOptions: TestProjectGeneralOptions
  namespace: string
  instances: TestProject[] = []
  portsRange: [number, number]

  private constructor({
    defaultOptions,
    namespace,
    portsRange,
  }: {
    defaultOptions: Partial<TestProjectGeneralOptions>
    namespace: string
    portsRange: [number, number]
  }) {
    this.defaultOptions = { ssr: true, superjson: true, ...defaultOptions }
    this.namespace = namespace
    this.portsRange = portsRange
  }

  static create({ namespace, portsRange, ...defaultOptions }: TestProjectFactoryCreateSelfOptions) {
    return new TestProjectFactory({ defaultOptions, namespace, portsRange })
  }

  create(options: TestProjectFactoryCreateProjectOptions = {}) {
    const tp = new TestProject({
      ...this.defaultOptions,
      ...options,
      serverPort: this.getNextFreePort(),
      clientPort: this.getNextFreePort(),
      serverHmrPort: this.getNextFreePort(),
      clientHmrPort: this.getNextFreePort(),
      index: this.instances.length,
      tpf: this,
    })
    this.instances.push(tp)
    return tp
  }

  async init(options: TestProjectFactoryCreateProjectOptions = {}) {
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
