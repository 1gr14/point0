import { chromium, type Browser, type Page } from 'playwright'
import { HtmlView } from './html-view.js'

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

export class PlaywrightPage {
  original: Page
  browser: PlaywrightBrowser
  history: PageHistoryItem[] = []

  private constructor(options: PlaywrightPageConstructorOptions) {
    this.original = options.original
    this.browser = options.browser

    // INTERCEPT SSR HTML
    // Everything already ok
    // this.original.on('response', async (response) => {
    //   const isMainFrame = response.request().frame() === this.original.mainFrame()
    //   const isNavigation = response.request().resourceType() === 'document'
    //   console.log('response', response.url(), isMainFrame, isNavigation)

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
      this.history.push({ url: this.original.url(), htmls: [], logs: [] })
    })
  }

  static async create(options: PlaywrightPageConstructorOptions): Promise<PlaywrightPage> {
    const page = new PlaywrightPage(options)

    await page.setupBridge()

    await page.original.addInitScript(() => {
      let timeout: NodeJS.Timeout
      let lastHtml = undefined as string | undefined

      const notify = () => {
        // Check if documentElement is available yet
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!document.documentElement) return

        const currentHtml = document.documentElement.outerHTML
        if (currentHtml !== lastHtml) {
          lastHtml = currentHtml
          // @ts-expect-error - exposed via Playwright
          window.onDomChanged(currentHtml)
        }
      }

      const observer = new MutationObserver(() => {
        clearTimeout(timeout)
        timeout = setTimeout(notify, 20)
      })

      const start = () => {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
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
      return url.replace(/:(\d+)/, '')
    }
    if (url.startsWith('http://127.0.0.1:')) {
      return url.replace(/:(\d+)/, '').replace('127.0.0.1', 'localhost')
    }
    return url
  }

  get tale(): string {
    const pairs: Array<[string, string[]]> = []
    for (const item of this.story) {
      const pair: [string, string[]] = [PlaywrightPage.prettifyUrl(item.url), []]
      for (const preview of item.previews) {
        if (preview === '' || preview === '\n') {
          pair[1].push('  (Empty)\n')
        } else {
          pair[1].push(
            preview
              .split('\n')
              .map((line) => `  ${line}`)
              .join('\n'),
          )
        }
      }
      pairs.push(pair)
    }
    return pairs.map(([url, previews]) => `${url}\n${previews.join('\n')}`).join('\n')
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
    while (true) {
      if (Date.now() - startTime > timeout) {
        throw new Error(`Timeout waiting for content: ${search} within ${timeout}ms`)
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
    console.dir(this.story, { depth: null })
  }

  async waitNoContent(search: string, timeout = 2000): Promise<void> {
    const startTime = Date.now()
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
    const notChangedDuringMsIsStable = 90

    // Wait for network idle first
    try {
      await this.original.waitForLoadState('networkidle', { timeout: maxWaitTime })
    } catch (e) {}

    const startTimestamp = Date.now()
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
        // We do not await here to keep the bridge loop fast
        // currentItem.htmls.push(HtmlView.create(html))
        void HtmlView.parse(html).then((htmlView) => currentItem.htmls.push(htmlView))
      }
    })
    await this.original.exposeFunction('log', (...args: any[]) => {
      console.info('log', ...args)
    })

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
  }
}
