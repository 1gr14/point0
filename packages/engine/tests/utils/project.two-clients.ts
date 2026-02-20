import * as nodeFs from 'node:fs/promises'
import * as nodePath from 'node:path'
import type { PrefetchPagePolicy } from '@point0/core'
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

export class TestProjectTwoClient {
  dir: string
  name: string
  index: number
  id: string
  ssr1: boolean
  ssr2: boolean
  superjson1: boolean
  superjson2: boolean
  vite: boolean
  vite1: boolean
  vite2: boolean
  serverPort: number
  client1Port: number
  client2Port: number
  serverHmrPort: number | false
  client1HmrPort: number | false
  client2HmrPort: number | false
  processes: TestProcess[] = []
  ports: number[] = []
  prefetchPageOnNavigate1: false | PrefetchPagePolicy
  prefetchPageOnLinkHover1: false | PrefetchPagePolicy
  prefetchPageOnNavigate2: false | PrefetchPagePolicy
  prefetchPageOnLinkHover2: false | PrefetchPagePolicy
  tpf: TestProjectTwoClientFactory

  constructor(options: {
    index: number
    ssr1: boolean
    ssr2: boolean
    superjson1: boolean
    superjson2: boolean
    vite: boolean
    vite1: boolean
    vite2: boolean
    serverPort: number
    client1Port: number
    client2Port: number
    serverHmrPort: number | false
    client1HmrPort: number | false
    client2HmrPort: number | false
    prefetchPageOnNavigate1: false | PrefetchPagePolicy
    prefetchPageOnLinkHover1: false | PrefetchPagePolicy
    prefetchPageOnNavigate2: false | PrefetchPagePolicy
    prefetchPageOnLinkHover2: false | PrefetchPagePolicy
    tpf: TestProjectTwoClientFactory
    fixedId: boolean
  }) {
    this.index = options.index
    this.id = options.fixedId ? options.index.toString() : crypto.randomUUID()
    // this.name = 'test-' + options.index
    this.name = 'test-' + this.id
    this.dir = nodePath.resolve(testsGeneralTempDir, options.tpf.namespace, this.name)
    this.ssr1 = options.ssr1
    this.ssr2 = options.ssr2
    this.prefetchPageOnNavigate1 = options.prefetchPageOnNavigate1
    this.prefetchPageOnLinkHover1 = options.prefetchPageOnLinkHover1
    this.prefetchPageOnNavigate2 = options.prefetchPageOnNavigate2
    this.prefetchPageOnLinkHover2 = options.prefetchPageOnLinkHover2
    this.superjson1 = options.superjson1
    this.superjson2 = options.superjson2
    this.vite = options.vite
    this.vite1 = options.vite1
    this.vite2 = options.vite2
    this.serverPort = options.serverPort
    this.client1Port = options.client1Port
    this.client2Port = options.client2Port
    this.serverHmrPort = options.serverHmrPort
    this.client1HmrPort = options.client1HmrPort
    this.client2HmrPort = options.client2HmrPort
    this.ports = [
      options.serverPort,
      options.client1Port,
      options.client2Port,
      options.serverHmrPort,
      options.client1HmrPort,
      options.client2HmrPort,
    ].filter((p) => p !== false)
    this.tpf = options.tpf
  }

  static async init(options: TestProjectCreateOptions) {
    return await new TestProjectTwoClient(options).init()
  }

  async init() {
    await this.createTempDir()
    await this.copyTemplateToTempDir()
    await this.replace(this.files.packageJson, 'test-project-name', this.name)
    await this.replace(this.files.engine, '// port: server,', `port: ${this.serverPort},`)
    await this.replace(
      this.files.engine,
      '// hmrPort: server,',
      `hmrPort: ${typeof this.serverHmrPort === 'number' ? this.serverHmrPort : 'false'},`,
    )
    await this.replace(this.files.engine, '// port: client1,', `port: ${this.client1Port},`)
    await this.replace(this.files.engine, '// port: client2,', `port: ${this.client2Port},`)
    await this.replace(
      this.files.engine,
      '// hmrPort: client1,',
      `hmrPort: ${typeof this.client1HmrPort === 'number' ? this.client1HmrPort : 'false'},`,
    )
    await this.replace(
      this.files.engine,
      '// hmrPort: client2,',
      `hmrPort: ${typeof this.client2HmrPort === 'number' ? this.client2HmrPort : 'false'},`,
    )
    if (!this.ssr1) {
      await this.replace(this.files.root1, '.ssr(true)', '// .ssr(true)')
    }
    if (!this.ssr2) {
      await this.replace(this.files.root, '.ssr(true)', '// .ssr(true)')
    }
    if (this.prefetchPageOnNavigate1 !== false) {
      await this.replace(
        this.files.root1,
        '.prefetchPageOnNavigate(false)',
        `.prefetchPageOnNavigate('${this.prefetchPageOnNavigate1}')`,
      )
    }
    if (this.prefetchPageOnLinkHover1 !== false) {
      await this.replace(
        this.files.root1,
        '.prefetchPageOnLinkHover(false)',
        `.prefetchPageOnLinkHover('${this.prefetchPageOnLinkHover1}')`,
      )
    }
    if (this.prefetchPageOnNavigate2 !== false) {
      await this.replace(
        this.files.root2,
        '.prefetchPageOnNavigate(false)',
        `.prefetchPageOnNavigate('${this.prefetchPageOnNavigate2}')`,
      )
    }
    if (this.prefetchPageOnLinkHover2 !== false) {
      await this.replace(
        this.files.root2,
        '.prefetchPageOnLinkHover(false)',
        `.prefetchPageOnLinkHover('${this.prefetchPageOnLinkHover2}')`,
      )
    }
    if (!this.superjson1) {
      await this.replace(this.files.root1, '.transformer(superjson)', '// .transformer(superjson)')
    }
    if (!this.superjson2) {
      await this.replace(this.files.root2, '.transformer(superjson)', '// .transformer(superjson)')
    }
    await this.write(this.files.dotenv, await Bun.file(this.paths.dotenvSource).text())
    if (this.vite) {
      await this.replace(this.files.engine, `// viteConfig: '../vite.config.ts',`, `viteConfig: '../vite.config.ts',`)
      await this.replace(this.files.packageJson, './dist/server/index.server.js', './dist/server/main.js')
    }
    if (this.vite1) {
      await this.replace(this.files.engine, `// viteConfig1: '../vite.config.ts',`, `viteConfig: '../vite.config.ts',`)
      await this.replace(this.files.indexHtml1, '"./index.first.client.ts"', '"/index.first.client.ts"')
    }
    if (this.vite2) {
      await this.replace(this.files.engine, `// viteConfig2: '../vite.config.ts',`, `viteConfig: '../vite.config.ts',`)
      await this.replace(this.files.indexHtml2, '"./index.second.client.ts"', '"/index.second.client.ts"')
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
      root1: this.resolve('src', 'lib', 'root.first.tsx'),
      root2: this.resolve('src', 'lib', 'root.second.tsx'),
      routes1: this.resolve('src', 'lib', 'routes.first.ts'),
      routes2: this.resolve('src', 'lib', 'routes.second.ts'),
      pointsClient1: this.resolve('src', 'lib', 'points.first.client.ts'),
      pointsClient2: this.resolve('src', 'lib', 'points.second.client.ts'),
      pointsServer: this.resolve('src', 'lib', 'points.server.ts'),
      app: this.resolve('src', 'app.tsx'),
      engine: this.resolve('src', 'engine.ts'),
      indexClient1: this.resolve('src', 'index.first.client.ts'),
      indexClient2: this.resolve('src', 'index.second.client.ts'),
      indexServer: this.resolve('src', 'index.server.ts'),
      indexHtml1: this.resolve('src', 'index.first.html'),
      indexHtml2: this.resolve('src', 'index.second.html'),
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
      root1: Bun.file(this.paths.root1),
      root2: Bun.file(this.paths.root2),
      routes1: Bun.file(this.paths.routes1),
      routes2: Bun.file(this.paths.routes2),
      pointsClient1: Bun.file(this.paths.pointsClient1),
      pointsClient2: Bun.file(this.paths.pointsClient2),
      pointsServer: Bun.file(this.paths.pointsServer),
      app: Bun.file(this.paths.app),
      engine: Bun.file(this.paths.engine),
      indexClient1: Bun.file(this.paths.indexClient1),
      indexClient2: Bun.file(this.paths.indexClient2),
      indexServer: Bun.file(this.paths.indexServer),
      indexHtml1: Bun.file(this.paths.indexHtml1),
      indexHtml2: Bun.file(this.paths.indexHtml2),
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
    return await fetch(`${localhost}:${this.serverPort}${path}`, options)
  }

  async fetchServerHtml(path: string, options?: Parameters<typeof fetch>[1]): Promise<string> {
    const response = await this.fetchServer(path, options)
    return await response.text()
  }

  async fetchClient1(path: string, options?: Parameters<typeof fetch>[1]): Promise<Response> {
    return await fetch(`${localhost}:${this.client1Port}${path}`, options)
  }

  async fetchClient1Html(path: string, options?: Parameters<typeof fetch>[1]): Promise<string> {
    const response = await this.fetchClient1(path, options)
    return await response.text()
  }

  async fetchClient2(path: string, options?: Parameters<typeof fetch>[1]): Promise<Response> {
    return await fetch(`${localhost}:${this.client2Port}${path}`, options)
  }

  async fetchClient2Html(path: string, options?: Parameters<typeof fetch>[1]): Promise<string> {
    const response = await this.fetchClient2(path, options)
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

  async gotoClient1(page: PlaywrightPage, path: string): Promise<PlaywrightPage>
  async gotoClient1(path: string): Promise<PlaywrightPage>
  async gotoClient1(...args: [path: string] | [page: PlaywrightPage, path: string]): Promise<PlaywrightPage> {
    const [page, path] = args.length === 1 ? [undefined, args[0]] : args
    if (page) {
      return await page.goto(`${localhost}:${this.client1Port}${path}`)
    }
    if (!this.tpf.browser) {
      throw new Error('Browser not defined')
    }
    return await this.tpf.browser.goto(`${localhost}:${this.client1Port}${path}`)
  }

  async gotoClient2(page: PlaywrightPage, path: string): Promise<PlaywrightPage>
  async gotoClient2(path: string): Promise<PlaywrightPage>
  async gotoClient2(...args: [path: string] | [page: PlaywrightPage, path: string]): Promise<PlaywrightPage> {
    const [page, path] = args.length === 1 ? [undefined, args[0]] : args
    if (page) {
      return await page.goto(`${localhost}:${this.client2Port}${path}`)
    }
    if (!this.tpf.browser) {
      throw new Error('Browser not defined')
    }
    return await this.tpf.browser.goto(`${localhost}:${this.client2Port}${path}`)
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
    await this.waitOutput([`server started http://localhost:${this.serverPort}`, '!Failed to start server'])
    await this.waitOutput([`client1 started http://localhost:${this.client1Port}`, '!Failed to start server'])
    await this.waitOutput([`client2 started http://localhost:${this.client2Port}`, '!Failed to start server'])
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
        process.kill()
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

export type TestProjectGeneralOptions = {
  ssr1: boolean
  ssr2: boolean
  superjson1: boolean
  superjson2: boolean
  vite: boolean
  vite1: boolean
  vite2: boolean
  serverHmr: boolean
  client1Hmr: boolean
  client2Hmr: boolean
  fixedId: boolean
  prefetchPageOnNavigate1: false | PrefetchPagePolicy
  prefetchPageOnNavigate2: false | PrefetchPagePolicy
  prefetchPageOnLinkHover1: false | PrefetchPagePolicy
  prefetchPageOnLinkHover2: false | PrefetchPagePolicy
}

export type TestProjectCreateOptions = Omit<TestProjectGeneralOptions, 'serverHmr' | 'client1Hmr' | 'client2Hmr'> & {
  index: number
  tpf: TestProjectTwoClientFactory
  serverPort: number
  client1Port: number
  client2Port: number
  serverHmrPort: number | false
  client1HmrPort: number | false
  client2HmrPort: number | false
  browser: PlaywrightBrowser | undefined
}

export type TestProjectFactoryCreateSelfOptions = Partial<TestProjectGeneralOptions> & {
  namespace: string
  portsRange: [number, number]
  browser?: PlaywrightBrowser
}

export type TestProjectFactoryCreateProjectOptions = Partial<TestProjectGeneralOptions>

export class TestProjectTwoClientFactory {
  defaultOptions: TestProjectGeneralOptions
  namespace: string
  instances: TestProjectTwoClient[] = []
  portsRange: [number, number]
  browser: PlaywrightBrowser | undefined

  private constructor({
    defaultOptions,
    namespace,
    portsRange,
    browser,
  }: {
    defaultOptions: Partial<TestProjectGeneralOptions>
    namespace: string
    portsRange: [number, number]
    browser: PlaywrightBrowser | undefined
  }) {
    this.defaultOptions = {
      ssr1: true,
      ssr2: true,
      superjson1: true,
      superjson2: true,
      vite: false,
      vite1: false,
      vite2: false,
      serverHmr: false,
      client1Hmr: false,
      client2Hmr: false,
      fixedId: false,
      prefetchPageOnNavigate1: false,
      prefetchPageOnLinkHover1: false,
      prefetchPageOnNavigate2: false,
      prefetchPageOnLinkHover2: false,
      ...defaultOptions,
    }
    this.namespace = namespace
    this.portsRange = portsRange
    this.browser = browser
  }

  static create({ namespace, portsRange, browser, ...defaultOptions }: TestProjectFactoryCreateSelfOptions) {
    return new TestProjectTwoClientFactory({ defaultOptions, namespace, portsRange, browser })
  }

  create(options: TestProjectFactoryCreateProjectOptions = {}) {
    const serverPort = this.getNextFreePort()
    const serverHmrPort =
      options.serverHmr === false
        ? false
        : options.serverHmr === true
          ? this.getNextFreePort()
          : this.defaultOptions.serverHmr
            ? this.getNextFreePort()
            : false
    const client1Port = this.getNextFreePort()
    const client2Port = this.getNextFreePort()
    const client1HmrPort =
      options.client1Hmr === false
        ? false
        : options.client1Hmr === true
          ? this.getNextFreePort()
          : this.defaultOptions.client1Hmr
            ? this.getNextFreePort()
            : false
    const client2HmrPort =
      options.client2Hmr === false
        ? false
        : options.client2Hmr === true
          ? this.getNextFreePort()
          : this.defaultOptions.client2Hmr
            ? this.getNextFreePort()
            : false
    const tp = new TestProjectTwoClient({
      ...this.defaultOptions,
      ...options,
      serverPort,
      client1Port,
      client2Port,
      serverHmrPort,
      client1HmrPort,
      client2HmrPort,
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

  async init(options: TestProjectFactoryCreateProjectOptions = {}) {
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
