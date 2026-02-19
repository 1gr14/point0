import type { FetchServerOutputType, PointName, PointsScope, ReadyPointType } from '@point0/core'
import { type Browser, chromium, type Page } from 'playwright'
import { HtmlView } from './html-view.js'
import { throwOnHelperLogFnCalling } from './other.js'

export interface PlaywrightBrowserInitOptions {
  headless?: boolean
  timeout?: number
}

export interface PlaywrightBrowserConstructoeOptions {
  headless: boolean
  timeout: number
  original: Browser
}

export class PlaywrightBrowser {
  original: Browser
  headless: boolean
  timeout: number
  pages = new Set<PlaywrightPage>()

  constructor(options: Required<PlaywrightBrowserConstructoeOptions>) {
    this.original = options.original
    this.headless = options.headless
    this.timeout = options.timeout
  }

  static async init(options: PlaywrightBrowserInitOptions = {}): Promise<PlaywrightBrowser> {
    const original = await chromium.launch({
      headless: options.headless,
    })
    return new PlaywrightBrowser({ headless: options.headless ?? true, timeout: options.timeout ?? 7000, original })
  }

  async createPage(): Promise<PlaywrightPage> {
    const pageOriginal = await this.original.newPage()
    const page = await PlaywrightPage.create({ original: pageOriginal, browser: this })
    this.pages.add(page)
    return page
  }

  async goto(url: string): Promise<PlaywrightPage> {
    const page = await this.createPage()
    await page.goto(url)
    return page
  }

  async close(): Promise<void> {
    await Promise.all(
      Array.from(this.pages).map(async (p) => {
        await p.close()
      }),
    )
    this.pages.clear()
    await this.original.close()
  }
}

export interface PlaywrightPageConstructorOptions {
  original: Page
  browser: PlaywrightBrowser
}

export type PageHistoryItem = {
  url: string
  htmls: Array<HtmlView<true>>
  logs: PlaywrightPageLogEntry[]
  requests: PlaywrightPageRequestEntry[]
}

export type PageStoryItem = {
  url: string
  previews: string[]
  logs: string[]
}

export type PlaywrightPageLogEntry = {
  timestamp: number
  type: string
  text: string
}

export type PlaywrightPageRequestEntry = {
  timestamp: number
  method: string
  url: string
  resourceType: string
  result: 'finished' | 'failed'
  status: number | null
  ok: boolean | null
  failureText: string | null
}

export type PagePointRequestStoryItem = {
  scope: PointsScope
  name: PointName
  type: ReadyPointType
  result: 'finished' | 'failed'
  output: FetchServerOutputType
}
export type PageNonPointRequestStoryItem = {
  path: string
  method: string
  result: 'finished' | 'failed'
}
export type PageRequestStoryItem = PagePointRequestStoryItem | PageNonPointRequestStoryItem

export class PlaywrightPage {
  original: Page
  browser: PlaywrightBrowser
  history: PageHistoryItem[] = []
  private domChangeQueue: Promise<void> = Promise.resolve()

  private constructor(options: PlaywrightPageConstructorOptions) {
    this.original = options.original
    this.browser = options.browser

    // INTERCEPT SSR HTML
    // Everything already ok
    // this.original.on('response', async (response) => {
    //   const isMainFrame = response.request().frame() === this.original.mainFrame()
    //   const isNavigation = response.request().resourceType() === 'document'

    //   if (isMainFrame && isNavigation) {
    //     try {
    //       const ssrHtml = await response.text()
    //       const currentItem = this.history.at(-1)
    //       if (currentItem) {
    //         // Push SSR HTML as the very first item
    //         currentItem.htmls.push(HtmlView.create(ssrHtml))
    //       }
    //     } catch (e) {
    //       // Response body might be unavailable for some reason
    //     }
    //   }
    // })

    // Listen for navigation to start a new history bucket
    this.original.on('framenavigated', (frame) => {
      if (frame !== this.original.mainFrame()) return
      this.history.push({ url: this.original.url(), htmls: [], logs: [], requests: [] })
    })
  }

  static async create(options: PlaywrightPageConstructorOptions): Promise<PlaywrightPage> {
    const page = new PlaywrightPage(options)

    await page.setupBridge()

    await page.original.addInitScript(() => {
      // let timeout: NodeJS.Timeout
      let lastHtml = undefined as string | undefined

      const notify = () => {
        // Check if documentElement is available yet
        // oxlint-disable-next-line typescript/no-unnecessary-condition
        if (!document.documentElement) return

        const currentHtml = document.documentElement.outerHTML
        if (currentHtml !== lastHtml) {
          lastHtml = currentHtml
          // @ts-expect-error - exposed via Playwright
          window.onDomChanged(currentHtml)
        }
      }

      const observer = new MutationObserver(() => {
        // clearTimeout(timeout)
        // timeout = setTimeout(notify, 20)
        notify()
      })

      const start = () => {
        // oxlint-disable-next-line typescript/no-unnecessary-condition
        if (document.documentElement) {
          // 1. Start observing immediately
          observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            characterData: true,
          })
          // 2. Send the initial "empty" or "early" state
          notify()
        } else {
          // If not ready, check again on the next animation frame
          requestAnimationFrame(start)
        }
      }

      // Handle both initial load and potential race conditions
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start)
        // Also try RAF in case DOMContentLoaded has already passed or takes too long
        requestAnimationFrame(start)
      } else {
        start()
      }
    })

    return page
  }

  async goto(url: string): Promise<this> {
    await this.original.goto(url, { waitUntil: 'networkidle' })
    return this
  }

  get preview(): string {
    const lastPreview = this.previews.at(-1)
    if (lastPreview === undefined) {
      throw new Error('No preview found')
    }
    return lastPreview
  }

  get previews(): string[] {
    const lastHistoryItem = this.history.at(-1)
    if (lastHistoryItem === undefined) {
      throw new Error('No history item found')
    }
    const previews = lastHistoryItem.htmls.map((html) => html.preview)
    // if (previews.some((p) => p === undefined)) {
    //   throw new Error('Previews not yet parsed, call await page.finished first')
    // }
    return previews
  }

  get url(): string {
    const lastHistoryItem = this.history.at(-1)
    if (lastHistoryItem === undefined) {
      throw new Error('No history item found')
    }
    return lastHistoryItem.url
  }

  get urls(): string[] {
    return this.history.map((item) => item.url)
  }

  get strlogs(): string[] {
    return this.history.flatMap((item) => item.logs.map((l) => PlaywrightPage.prettifyLogEntry(l)))
  }

  get logs(): PlaywrightPageLogEntry[] {
    return this.history.flatMap((item) => item.logs)
  }

  get requests(): PlaywrightPageRequestEntry[] {
    return this.history.flatMap((item) => item.requests)
  }

  get requestsStory(): PageRequestStoryItem[] {
    return this.requests.map((request) => {
      try {
        const parsed = new URL(request.url)
        if (parsed.pathname === '/_point0') {
          const scope = parsed.searchParams.get('scope')
          const name = parsed.searchParams.get('name')
          const type = parsed.searchParams.get('type')
          const output = parsed.searchParams.get('output')
          if (scope && name && type && output) {
            return {
              scope,
              name,
              type: type as ReadyPointType,
              result: request.result,
              output: output as FetchServerOutputType,
            }
          }
        }
      } catch {}
      return {
        method: request.method,
        path: PlaywrightPage.prettifyUrl(request.url),
        result: request.result,
      }
    })
  }

  get requestsTale(): string {
    return (
      '\n' +
      this.requestsStory
        .filter((requestStoryItem) => {
          if (
            'path' in requestStoryItem &&
            (requestStoryItem.path.startsWith('/_bun') ||
              requestStoryItem.path.startsWith('/chunk-') ||
              requestStoryItem.path.startsWith('/@fs/') ||
              requestStoryItem.path.startsWith('/assets/') ||
              requestStoryItem.path.startsWith('/@vite/') ||
              requestStoryItem.path.startsWith('/index.client.js') ||
              requestStoryItem.path.endsWith('.tsx') ||
              requestStoryItem.path.endsWith('.ts'))
          ) {
            return false
          }
          return true
        })
        .map((requestStoryItem) => {
          const errorPrefix = requestStoryItem.result === 'failed' ? `failed ` : ''
          if ('scope' in requestStoryItem) {
            const outputTypeSuffix = ` (${requestStoryItem.output})`
            return `${errorPrefix}${requestStoryItem.scope}.${requestStoryItem.type}.${requestStoryItem.name}${outputTypeSuffix}`
          }
          return `${errorPrefix}${requestStoryItem.method} ${requestStoryItem.path}`
        })
        .join('\n')
    )
  }

  get story(): PageStoryItem[] {
    const story = this.history.map((item) => ({
      url: item.url,
      previews: item.htmls.map((html) => html.preview),
      logs: item.logs.map((l) => PlaywrightPage.prettifyLogEntry(l)),
    }))
    // if (story.some((s) => s.previews.some((p) => p === undefined))) {
    //   throw new Error('Previews not yet parsed, call await page.finished first')
    // }
    return story as PageStoryItem[]
  }

  static prettifyUrl(url: string): string {
    if (url.startsWith('data:')) {
      return 'data:...'
    }
    if (url.startsWith('http://localhost:')) {
      return url.replace(/http:\/\/localhost:(\d+)/, '') || '/'
    }
    if (url.startsWith('http://127.0.0.1:')) {
      return url.replace(/http:\/\/127.0.0.1:(\d+)/, '') || '/'
    }
    return url
  }

  get tale(): string {
    const pairs: Array<[string, string[]]> = []
    for (const item of this.story) {
      const pair: [string, string[]] = [PlaywrightPage.prettifyUrl(item.url), []]
      for (const preview of item.previews) {
        const normalizedPreview = preview.replace(/^\n/, '')
        pair[1].push(
          normalizedPreview
            .split('\n')
            .map((line) => `  ${line}`)
            .join('\n'),
        )
      }
      pairs.push(pair)
    }
    return '\n' + pairs.map(([url, previews]) => `${url}\n${previews.join('\n')}`).join('\n')
  }

  get stable(): Promise<PageStoryItem[]> {
    return (async () => {
      await this.waitFinishMutations()
      // await this.parseAllHtmlViews()
      return this.story
    })()
  }

  // private async parseAllHtmlViews(): Promise<Array<HtmlView<true>>> {
  //   return await HtmlView.parseMany(this.history.flatMap((item) => item.htmls))
  // }

  private getLastHtmlView(): HtmlView<true> | undefined {
    const lastHistoryItem = this.history.at(-1)
    if (lastHistoryItem === undefined) {
      return undefined
    }
    const lastHtml = lastHistoryItem.htmls.at(-1)
    if (lastHtml === undefined) {
      return undefined
    }
    return lastHtml
  }

  // async waitForHmrReady(timeout = 5000): Promise<void> {
  //   const startTime = Date.now()
  //   while (Date.now() - startTime < timeout) {
  //     // Check your logs array for the "connected" message
  //     // but ensure it's the LAST message (not followed by a disconnect)
  //     const logs = [...this.logs].reverse()
  //     const lastHmrIndex = logs.findIndex((l) => l.text.includes('Hot-module-reloading socket connected'))
  //     const lastErrorIndex = logs.findIndex((l) => l.text.includes('socket disconnected') || l.text.includes('failed'))

  //     if (lastHmrIndex !== -1 && lastHmrIndex > lastErrorIndex) {
  //       return // HMR is connected and stable
  //     }

  //     await new Promise((resolve) => setTimeout(resolve, 100))
  //   }
  //   throw new Error('HMR failed to stabilize in time')
  // }

  async waitContent(search: string, timeout = 2000): Promise<void> {
    if (search.startsWith('!')) {
      await this.waitNoContent(search.slice(1), timeout)
      return
    }
    const startTime = Date.now()
    // oxlint-disable-next-line typescript/no-unnecessary-condition
    while (true) {
      if (Date.now() - startTime > timeout) {
        throw new Error(`Timeout waiting for content: ${search} within ${timeout}ms. Current tale: ${this.tale}`)
      }
      const htmlView = this.getLastHtmlView()
      if (htmlView?.hasContent(search)) {
        // await this.parseAllHtmlViews()
        return
      }
      await new Promise((resolve) => setTimeout(resolve, 30))
    }
  }

  logStory(): void {
    throwOnHelperLogFnCalling()
    console.dir(this.story, { depth: null })
  }

  logLogs(): void {
    throwOnHelperLogFnCalling()
    console.dir(this.logs, { depth: null })
  }

  async waitNoContent(search: string, timeout = 2000): Promise<void> {
    const startTime = Date.now()
    // oxlint-disable-next-line typescript/no-unnecessary-condition
    while (true) {
      if (Date.now() - startTime > timeout) {
        throw new Error(`Timeout waiting for no content: ${search} within ${timeout}ms`)
      }
      const htmlView = this.getLastHtmlView()
      if (!htmlView || htmlView.hasNoContent(search)) {
        // await this.parseAllHtmlViews()
        return
      }
      await new Promise((resolve) => setTimeout(resolve, 30))
    }
  }

  async waitLog(search: string, timeout = 2000, fromNow = false): Promise<void> {
    const startTime = Date.now()
    // oxlint-disable-next-line typescript/no-unnecessary-condition
    while (true) {
      if (Date.now() - startTime > timeout) {
        throw new Error(`Timeout waiting for log: ${search} within ${timeout}ms`)
      }
      const logs = this.logs.filter((l) => {
        if (fromNow) {
          return l.timestamp > startTime && l.text.includes(search)
        }
        return l.text.includes(search)
      })
      if (logs.length > 0) {
        return
      }
      await new Promise((resolve) => setTimeout(resolve, 30))
    }
  }

  // async waitForNoLog(search: string, duration = 2000, timeout = 4000): Promise<void> {
  //   const startTime = Date.now()
  //   while (true) {
  //     if (Date.now() - startTime > timeout) {
  //       throw new Error(`Timeout waiting for log disappear: ${search} within ${timeout}ms`)
  //     }
  //     const logs = this.logs.filter((l) => l.text.includes(search) )
  //     if (logs.length > 0) {
  //       return
  //     }
  //     await new Promise((resolve) => setTimeout(resolve, 30))
  //   }
  // }

  async waitContentSequence(searches: string[], timeout = 2000): Promise<void> {
    for (const search of searches) {
      await this.waitContent(search, timeout)
    }
  }

  private async waitFinishMutations(): Promise<void> {
    const maxWaitTime = this.browser.timeout
    const notChangedDuringMsIsStable = 150

    // Wait for network idle first
    try {
      await this.original.waitForLoadState('networkidle', { timeout: maxWaitTime })
    } catch {}

    const startTimestamp = Date.now()
    // oxlint-disable-next-line typescript/no-unnecessary-condition
    while (true) {
      const elapsed = Date.now() - startTimestamp
      if (elapsed > maxWaitTime) {
        throw new Error('Timeout waiting for stability')
      }
      const lastChangeTimestamp = this.history.at(-1)?.htmls.at(-1)?.timestamp ?? startTimestamp
      if (lastChangeTimestamp <= Date.now() - notChangedDuringMsIsStable) {
        break
      }
      await new Promise((resolve) => setTimeout(resolve, 30))
    }
  }

  async close(): Promise<void> {
    await this.original.close()
    this.browser.pages.delete(this)
  }

  private addLogToLastHistoryItem(logEntry: PlaywrightPageLogEntry): void {
    const lastHistoryItem = this.history.at(-1)
    if (lastHistoryItem) {
      lastHistoryItem.logs.push(logEntry)
    }
  }

  private addRequestToLastHistoryItem(request: PlaywrightPageRequestEntry): void {
    const lastHistoryItem = this.history.at(-1)
    if (lastHistoryItem) {
      lastHistoryItem.requests.push(request)
    }
  }

  private static prettifyLogEntry(logEntry: PlaywrightPageLogEntry): string {
    return `[${logEntry.timestamp}] [${logEntry.type.toUpperCase()}] ${logEntry.text}`
  }

  /**
   * Sets up the bridge from Browser -> Node.js
   * This only needs to be called once when the page is first created.
   * exposeFunction is persistent across navigations.
   */
  async setupBridge(): Promise<void> {
    await this.original.exposeFunction('onDomChanged', (html: string) => {
      const currentItem = this.history.at(-1)
      if (currentItem) {
        // Keep processing ordered and dedupe by preview, because tale is preview-based.
        this.domChangeQueue = this.domChangeQueue
          .then(async () => {
            const htmlView = await HtmlView.parse(html)
            const lastPreview = currentItem.htmls.at(-1)?.preview
            if (lastPreview === htmlView.preview) {
              return
            }
            currentItem.htmls.push(htmlView)
          })
          .catch(() => {
            // Keep queue alive even if one parse fails.
          })
      }
    })
    // await this.original.exposeFunction('log', (...args: any[]) => {
    //   console.info('log', ...args)
    // })

    // Capture all browser console logs persistently across navigations
    this.original.on('console', (msg) => {
      const timestamp = Date.now()
      const type = msg.type()
      const text = msg.text()
      this.addLogToLastHistoryItem({ timestamp, type, text })
    })

    // Capture uncaught exceptions (often missed by 'console')
    this.original.on('pageerror', (exception) => {
      const timestamp = Date.now()
      this.addLogToLastHistoryItem({ timestamp, type: 'error', text: exception.message })
    })

    // Track requests that finished successfully with a response.
    this.original.on('requestfinished', async (request) => {
      const response = await request.response()
      this.addRequestToLastHistoryItem({
        timestamp: Date.now(),
        method: request.method(),
        url: request.url(),
        resourceType: request.resourceType(),
        result: 'finished',
        status: response?.status() ?? null,
        ok: response?.ok() ?? null,
        failureText: null,
      })
    })

    // Track requests that failed to complete.
    this.original.on('requestfailed', (request) => {
      this.addRequestToLastHistoryItem({
        timestamp: Date.now(),
        method: request.method(),
        url: request.url(),
        resourceType: request.resourceType(),
        result: 'failed',
        status: null,
        ok: null,
        failureText: request.failure()?.errorText ?? null,
      })
    })
  }
}
