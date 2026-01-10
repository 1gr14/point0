import { chromium, type Browser, type Page } from 'playwright'
import { HtmlTree, HtmlView } from './html-view.js'

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
  htmls: HtmlView[]
}

export type PageStoryItem = {
  url: string
  previews: string[]
}

export class PlaywrightPage {
  original: Page
  browser: PlaywrightBrowser
  history: PageHistoryItem[] = []

  private constructor(options: PlaywrightPageConstructorOptions) {
    this.original = options.original
    this.browser = options.browser

    // Listen for navigation to start a new history bucket
    this.original.on('framenavigated', (frame) => {
      if (frame !== this.original.mainFrame()) return
      this.history.push({ url: this.original.url(), htmls: [] })
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
    if (previews.some((p) => p === undefined)) {
      throw new Error('Previews not yet parsed, call await page.finished first')
    }
    return previews as string[]
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

  get story(): PageStoryItem[] {
    const story = this.history.map((item) => ({
      url: item.url,
      previews: item.htmls.map((html) => html.preview),
    }))
    if (story.some((s) => s.previews.some((p) => p === undefined))) {
      throw new Error('Previews not yet parsed, call await page.finished first')
    }
    return story as PageStoryItem[]
  }

  static prettifyUrl(url: string): string {
    if (url.startsWith('data:')) {
      return 'data:...'
    }
    if (url.startsWith('http://localhost:')) {
      return url.replace(/:(\d+)/, '')
    }
    return url
  }

  get tale(): string {
    const pairs: Array<[string, string[]]> = []
    for (const item of this.story) {
      const pair: [string, string[]] = [PlaywrightPage.prettifyUrl(item.url), []]
      for (const preview of item.previews) {
        pair[1].push(
          preview
            .split('\n')
            .map((line) => `  ${line}`)
            .join('\n'),
        )
      }
      pairs.push(pair)
    }
    return pairs.map(([url, previews]) => `${url}\n${previews.join('\n')}`).join('\n')
  }

  get stable(): Promise<PageStoryItem[]> {
    return (async () => {
      await this.waitForFinishMutations()
      await this.parseAllHtmlViews()
      return this.story
    })()
  }

  private async parseAllHtmlViews(): Promise<HtmlView[]> {
    return await HtmlView.parseMany(this.history.flatMap((item) => item.htmls))
  }

  private async getLastHtmlView(): Promise<HtmlView<true> | undefined> {
    const lastHistoryItem = this.history.at(-1)
    if (lastHistoryItem === undefined) {
      return undefined
    }
    const lastHtml = lastHistoryItem.htmls.at(-1)
    if (lastHtml === undefined) {
      return undefined
    }
    const parsedHtml = await HtmlView.parse(lastHtml)
    return parsedHtml
  }

  async waitForContent(search: string, timeout = 2000): Promise<void> {
    if (search.startsWith('!')) {
      await this.waitForNoContent(search.slice(1), timeout)
      return
    }
    const startTime = Date.now()
    while (true) {
      if (Date.now() - startTime > timeout) {
        throw new Error(`Timeout waiting for content: ${search} within ${timeout}ms`)
      }
      const htmlView = await this.getLastHtmlView()
      if (htmlView?.hasContent(search)) {
        await this.parseAllHtmlViews()
        return
      }
      await new Promise((resolve) => setTimeout(resolve, 30))
    }
  }

  async waitForNoContent(search: string, timeout = 2000): Promise<void> {
    const startTime = Date.now()
    while (true) {
      if (Date.now() - startTime > timeout) {
        throw new Error(`Timeout waiting for no content: ${search} within ${timeout}ms`)
      }
      const htmlView = await this.getLastHtmlView()
      if (!htmlView || htmlView.hasNoContent(search)) {
        await this.parseAllHtmlViews()
        return
      }
      await new Promise((resolve) => setTimeout(resolve, 30))
    }
  }

  async waitForSequence(searches: string[], timeout = 2000): Promise<void> {
    for (const search of searches) {
      await this.waitForContent(search, timeout)
    }
  }

  private async waitForFinishMutations(): Promise<void> {
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
        currentItem.htmls.push(HtmlView.create(html))
      }
    })
    await this.original.exposeFunction('log', (...args: any[]) => {
      console.info('log', ...args)
    })
  }
}
