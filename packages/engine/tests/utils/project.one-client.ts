import * as nodeFs from 'node:fs/promises'
import * as nodePath from 'node:path'
import { mergeHeaders, type PrefetchPagePolicy } from '@point0/core'
import type { Engine } from '../../src/engine.js'
import type { FileGeneratorProcessResult } from '../../src/generator.js'
import { killPort } from '../../src/port.js'
import { getDirFilesContent, throwOnHelperLogFnCalling, waitPortFree } from './other.js'
import type { PlaywrightPage } from './playwright.js'
import { PlaywrightBrowser } from './playwright.js'
import { TestProcess } from './process.js'

const testTemplateDir = nodePath.resolve(__dirname, '..', 'templates', 'one-client')
const testsGeneralTempDir = nodePath.resolve(__dirname, '..', 'temp')
const localhost = `http://localhost`
// const localhost = `http://127.0.0.1`

export class TestProjectOneClient {
  dir: string
  name: string
  index: number
  id: string
  ssr: boolean
  superjson: boolean
  vite: boolean
  serverPort: number
  clientPort: number
  serverHmrPort: number | false
  clientHmrPort: number | false
  processes: TestProcess[] = []
  ports: number[] = []
  prefetchPageOnNavigate: false | PrefetchPagePolicy
  prefetchPageOnLinkHover: false | PrefetchPagePolicy
  tpf: TestProjectOneClientFactory

  constructor(options: {
    index: number
    ssr: boolean
    superjson: boolean
    vite: boolean
    serverPort: number
    clientPort: number
    serverHmrPort: number | false
    clientHmrPort: number | false
    prefetchPageOnNavigate: false | PrefetchPagePolicy
    prefetchPageOnLinkHover: false | PrefetchPagePolicy
    tpf: TestProjectOneClientFactory
    fixedId: boolean
  }) {
    this.index = options.index
    this.id = options.fixedId ? options.index.toString() : crypto.randomUUID()
    // this.name = 'test-' + options.index
    this.name = 'test-' + this.id
    this.dir = nodePath.resolve(testsGeneralTempDir, options.tpf.namespace, this.name)
    this.ssr = options.ssr
    this.prefetchPageOnNavigate = options.prefetchPageOnNavigate
    this.prefetchPageOnLinkHover = options.prefetchPageOnLinkHover
    this.superjson = options.superjson
    this.vite = options.vite
    this.serverPort = options.serverPort
    this.clientPort = options.clientPort
    this.serverHmrPort = options.serverHmrPort
    this.clientHmrPort = options.clientHmrPort
    this.ports = [options.serverPort, options.clientPort, options.serverHmrPort, options.clientHmrPort].filter(
      (p) => p !== false,
    )
    this.tpf = options.tpf
  }

  static async init(options: TestProjectOneClientCreateOptions) {
    return await new TestProjectOneClient(options).init()
  }

  async init() {
    await this.createTempDir()
    await this.copyTemplateToTempDir()
    await this.replace(this.files.packageJson, 'test-one-client', this.name)
    await this.replace(this.files.engine, '// port: server,', `port: ${this.serverPort},`)
    await this.replace(
      this.files.engine,
      '// hmrPort: server,',
      `hmrPort: ${typeof this.serverHmrPort === 'number' ? this.serverHmrPort : 'false'},`,
    )
    await this.replace(this.files.engine, '// port: client,', `port: ${this.clientPort},`)
    await this.replace(
      this.files.engine,
      '// hmrPort: client,',
      `hmrPort: ${typeof this.clientHmrPort === 'number' ? this.clientHmrPort : 'false'},`,
    )
    // await this.replace(this.files.engine, '// serving: client,', `serving: 'localhost:${this.clientPort}',`)
    if (!this.ssr) {
      await this.replace(this.files.engine, 'ssr: true,', `ssr: false,`)
    }
    if (this.prefetchPageOnNavigate !== false) {
      await this.replace(
        this.files.root,
        '.prefetchPageOnNavigate(false)',
        `.prefetchPageOnNavigate('${this.prefetchPageOnNavigate}')`,
      )
    }
    if (this.prefetchPageOnLinkHover !== false) {
      await this.replace(
        this.files.root,
        '.prefetchPageOnLinkHover(false)',
        `.prefetchPageOnLinkHover('${this.prefetchPageOnLinkHover}')`,
      )
    }
    if (!this.superjson) {
      await this.replace(this.files.root, '.transformer(superjson)', '// .transformer(superjson)')
    }
    await this.write(this.files.dotenv, await Bun.file(this.paths.dotenvSource).text())
    if (this.vite) {
      await this.replace(this.files.engine, `// viteConfig: '../vite.config.ts',`, `viteConfig: '../vite.config.ts',`)
      await this.replace(this.files.packageJson, './dist/server/index.server.js', './dist/server/main.js')
      await this.replace(this.files.indexHtml, '"./index.client.tsx"', '"/index.client.tsx"')
    }
    return this
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
      indexClient: this.resolve('src', 'index.client.tsx'),
      indexServer: this.resolve('src', 'index.server.ts'),
      indexHtml: this.resolve('src', 'index.html'),
      packageJson: this.resolve('package.json'),
      tsconfigJson: this.resolve('tsconfig.json'),
      dotenv: this.resolve('.env'),
      dotenvSource: this.resolve('env'),
      viteConfig: this.resolve('vite.config.ts'),
      distServer: this.resolve('dist', 'server'),
      distClient: this.resolve('dist', 'client'),
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
      dotenvSource: Bun.file(this.paths.dotenvSource),
      viteConfig: Bun.file(this.paths.viteConfig),
    }
  }

  async replace(file: string | Bun.BunFile, search: string, replace: string) {
    file = typeof file === 'string' ? Bun.file(this.resolve(file)) : file
    const content = await file.text()
    const isSearchExists = content.includes(search)
    if (!isSearchExists) {
      throw new Error(`Search string ${search} not found in file ${file.name}`)
    }
    const newContent = content.replaceAll(search, replace)
    await file.write(newContent)
  }

  async write(path: string | Bun.BunFile, content: string): Promise<Bun.BunFile> {
    const file = typeof path === 'string' ? Bun.file(this.resolve(path)) : path
    await file.write(content)
    return file
  }

  async prepend(path: string | Bun.BunFile, content: string): Promise<Bun.BunFile> {
    const file = typeof path === 'string' ? Bun.file(this.resolve(path)) : path
    const existingContent = await file.text()
    await file.write(content + existingContent)
    return file
  }

  async generate(): Promise<FileGeneratorProcessResult> {
    const engine = await this.importEngine()
    return await engine.generate({ silent: true })
  }

  async fetchServer(path: string, options?: Parameters<typeof fetch>[1]): Promise<Response> {
    const providedHeaders = mergeHeaders(options?.headers)
    const providedAccept = providedHeaders.get('Accept')
    const fixedHeaders = mergeHeaders(options?.headers, { accept: providedAccept ?? 'text/html' })
    const fixedOptions: Parameters<typeof fetch>[1] = { ...options, headers: fixedHeaders }
    return await fetch(`${localhost}:${this.serverPort}${path}`, fixedOptions)
  }

  async fetchServerHtml(path: string, options?: Parameters<typeof fetch>[1]): Promise<string> {
    const response = await this.fetchServer(path, options)
    return await response.text()
  }

  async fetchClient(path: string, options?: Parameters<typeof fetch>[1]): Promise<Response> {
    const providedHeaders = mergeHeaders(options?.headers)
    const providedAccept = providedHeaders.get('Accept')
    const fixedHeaders = mergeHeaders(options?.headers, { accept: providedAccept ?? 'text/html' })
    const fixedOptions: Parameters<typeof fetch>[1] = { ...options, headers: fixedHeaders }
    return await fetch(`${localhost}:${this.clientPort}${path}`, fixedOptions)
  }

  async fetchClientHtml(path: string, options?: Parameters<typeof fetch>[1]): Promise<string> {
    const response = await this.fetchClient(path, options)
    return await response.text()
  }

  async waitPortsFree() {
    await waitPortFree(this.ports)
  }

  async getDistServerFilesContent(): Promise<string> {
    return await getDirFilesContent(this.paths.distServer)
  }

  async getDistClientFilesContent(): Promise<string> {
    return await getDirFilesContent(this.paths.distClient)
  }

  async gotoServer(page: PlaywrightPage, path: string): Promise<PlaywrightPage>
  async gotoServer(path: string): Promise<PlaywrightPage>
  async gotoServer(...args: [path: string] | [page: PlaywrightPage, path: string]): Promise<PlaywrightPage> {
    const [page, path] = args.length === 1 ? [undefined, args[0]] : args
    if (page) {
      return await page.goto(`${localhost}:${this.serverPort}${path}`)
    }
    if (!this.tpf.browser) {
      throw new Error('Browser not defined')
    }
    return await this.tpf.browser.goto(`${localhost}:${this.serverPort}${path}`)
  }

  async gotoClient(page: PlaywrightPage, path: string): Promise<PlaywrightPage>
  async gotoClient(path: string): Promise<PlaywrightPage>
  async gotoClient(...args: [path: string] | [page: PlaywrightPage, path: string]): Promise<PlaywrightPage> {
    const [page, path] = args.length === 1 ? [undefined, args[0]] : args
    if (page) {
      return await page.goto(`${localhost}:${this.clientPort}${path}`)
    }
    if (!this.tpf.browser) {
      throw new Error('Browser not defined')
    }
    return await this.tpf.browser.goto(`${localhost}:${this.clientPort}${path}`)
  }

  get output() {
    const lastProcess = this.processes.at(-1)
    if (!lastProcess) {
      throw new Error('No processes found')
    }
    return lastProcess.output
  }

  logOutput() {
    throwOnHelperLogFnCalling()
    console.info(this.output)
  }

  async waitOutput(text: string | string[], timeout?: number): Promise<string> {
    const lastProcess = this.processes.at(-1)
    if (!lastProcess) {
      throw new Error('No processes found')
    }
    return await lastProcess.waitOutput(text, timeout)
  }

  async waitMomentAndLogOutput(timeout = 2000) {
    await new Promise((resolve) => setTimeout(resolve, timeout))
    console.info(this.output)
  }

  async waitStarted() {
    await this.waitOutput([`started http://localhost:${this.serverPort}`, '!Failed to start server'], 10000)
    // await this.waitOutput([`started http://localhost:${this.clientPort}`, '!Failed to start client'], 10000)
  }

  // async waitWSReady(timeout = 2000) {
  //   const url = `ws://localhost:${this.clientPort}/_bun/hmr`
  //   const start = Date.now()
  //   while (Date.now() - start < timeout) {
  //     try {
  //       const ws = new WebSocket(url)
  //       return await new Promise((resolve, reject) => {
  //         ws.onopen = () => {
  //           ws.close()
  //           resolve(true)
  //         }
  //         ws.onerror = reject
  //       })
  //     } catch (e) {
  //       await new Promise((resolve) => setTimeout(resolve, 50)) // Non-blocking wait
  //     }
  //   }
  //   throw new Error('WebSocket failed to become ready')
  // }

  private _engine: Engine | undefined
  async importEngine(fresh = false): Promise<Engine> {
    if (this._engine && !fresh) {
      return this._engine
    }
    const { engine } = await import(this.paths.engine + '?random=' + Math.random())
    this._engine = engine
    return engine
  }

  async cleanup(
    options: { files: boolean; processes: boolean; ports: boolean } | 'processes' | 'ports' | 'files',
  ): Promise<void> {
    if (typeof options === 'string') {
      await this.cleanup({
        files: options === 'files',
        processes: options === 'processes',
        ports: options === 'ports',
      })
      return
    }
    const { files, processes, ports } = options
    if (processes) {
      for (const process of this.processes) {
        await process.killTree()
      }
    }
    if (ports) {
      await killPort(this.ports)
      await this.waitPortsFree()
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

export type TestProjectOneClientGeneralOptions = {
  ssr: boolean
  superjson: boolean
  vite: boolean
  serverHmr: boolean
  clientHmr: boolean
  fixedId: boolean
  prefetchPageOnNavigate: false | PrefetchPagePolicy
  prefetchPageOnLinkHover: false | PrefetchPagePolicy
}

export type TestProjectOneClientCreateOptions = Omit<TestProjectOneClientGeneralOptions, 'serverHmr' | 'clientHmr'> & {
  index: number
  tpf: TestProjectOneClientFactory
  serverPort: number
  clientPort: number
  serverHmrPort: number | false
  clientHmrPort: number | false
  browser: PlaywrightBrowser | undefined
}

export type TestProjectOneClientFactoryCreateSelfOptions = Partial<TestProjectOneClientGeneralOptions> & {
  namespace: string
  portsRange: [number, number]
  browser?: PlaywrightBrowser
}

export type TestProjectOneClientFactoryCreateProjectOptions = Partial<TestProjectOneClientGeneralOptions>

export class TestProjectOneClientFactory {
  defaultOptions: TestProjectOneClientGeneralOptions
  namespace: string
  instances: TestProjectOneClient[] = []
  portsRange: [number, number]
  browser: PlaywrightBrowser | undefined

  private constructor({
    defaultOptions,
    namespace,
    portsRange,
    browser,
  }: {
    defaultOptions: Partial<TestProjectOneClientGeneralOptions>
    namespace: string
    portsRange: [number, number]
    browser: PlaywrightBrowser | undefined
  }) {
    this.defaultOptions = {
      ssr: true,
      superjson: true,
      vite: false,
      serverHmr: false,
      clientHmr: false,
      fixedId: false,
      prefetchPageOnNavigate: false,
      prefetchPageOnLinkHover: false,
      ...defaultOptions,
    }
    this.namespace = namespace
    this.portsRange = portsRange
    this.browser = browser
  }

  static create({ namespace, portsRange, browser, ...defaultOptions }: TestProjectOneClientFactoryCreateSelfOptions) {
    return new TestProjectOneClientFactory({ defaultOptions, namespace, portsRange, browser })
  }

  create(options: TestProjectOneClientFactoryCreateProjectOptions = {}) {
    const serverPort = this.getNextFreePort()
    const serverHmrPort =
      options.serverHmr === false
        ? false
        : options.serverHmr === true
          ? this.getNextFreePort()
          : this.defaultOptions.serverHmr
            ? this.getNextFreePort()
            : false
    const clientPort = this.getNextFreePort()
    const clientHmrPort =
      options.clientHmr === false
        ? false
        : options.clientHmr === true
          ? this.getNextFreePort()
          : this.defaultOptions.clientHmr
            ? this.getNextFreePort()
            : false
    const tp = new TestProjectOneClient({
      ...this.defaultOptions,
      ...options,
      serverPort,
      clientPort,
      serverHmrPort,
      clientHmrPort,
      index: this.instances.length,
      tpf: this,
    })
    this.instances.push(tp)
    return tp
  }

  setBrowser(browser: PlaywrightBrowser) {
    this.browser = browser
  }

  async initBrowser() {
    this.browser = await PlaywrightBrowser.init()
  }

  async init(options: TestProjectOneClientFactoryCreateProjectOptions = {}) {
    return await this.create(options).init()
  }

  async cleanup({
    files,
    processes,
    ports,
    browser,
  }: {
    files: boolean
    processes: boolean
    ports: boolean
    browser: boolean
  }) {
    await Promise.all(
      this.instances.map(async (tp) => {
        await tp.cleanup({ files, processes, ports })
      }),
    )
    if (browser) {
      await this.browser?.close()
    }
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
