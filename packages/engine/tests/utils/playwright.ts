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

    // Handle navigation events
    this.original.on('framenavigated', async (frame) => {
      if (frame !== this.original.mainFrame()) return

      const url = this.original.url()
      this.history.push({ url, htmls: [] })

      // Re-inject the observer on the new document
      await this.startHtmlWatcher()
    })
  }

  static async create(options: PlaywrightPageConstructorOptions): Promise<PlaywrightPage> {
    const page = new PlaywrightPage(options)
    await page.setupBridge()
    return page
  }

  async goto(url: string): Promise<void> {
    await this.original.goto(url, { waitUntil: 'networkidle' })
  }

  get navcount(): number {
    return this.history.length
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
    return lastHistoryItem.htmls.map((html) => html.preview)
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
    return this.history.map((item) => ({
      url: item.url,
      previews: item.htmls.map((html) => html.preview),
    }))
  }

  get finished(): Promise<void> {
    return this.waitForFinishMutations()
  }

  private async waitForFinishMutations(): Promise<void> {
    const maxWaitTime = this.browser.timeout
    const notChangedDuringMsIsStable = 200

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
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
  }

  async close(): Promise<void> {
    await this.original.close()
    this.browser.pages.delete(this)
  }

  /**
   * Sets up the bridge from Browser -> Node.js
   * This only needs to be called once when the page is first created.
   */
  async setupBridge(): Promise<void> {
    await this.original.exposeFunction('onDomChanged', async (html: string) => {
      const currentItem = this.history.at(-1)
      if (!currentItem) return

      const lastRecord = currentItem.htmls.at(-1)
      // Only add if the HTML content has actually changed
      if (lastRecord?.html !== html) {
        currentItem.htmls.push(HtmlView.create(html))
      }
    })
  }

  private async startHtmlWatcher(): Promise<void> {
    // Capture the very first state of the new page
    try {
      const content = await this.original.content()
      const currentItem = this.history.at(-1)
      if (currentItem) {
        currentItem.htmls.push(HtmlView.create(content))
      }
    } catch (e) {
      /* Page might be closed */
    }

    // Inject the MutationObserver
    await this.original
      .evaluate(() => {
        // Cleanup old observer if it exists
        if ((window as any).__pwObserver) {
          ;(window as any).__pwObserver.disconnect()
        }

        let timeout: any
        const observer = new MutationObserver(() => {
          // Debounce: Wait for 50ms of "silence" before sending HTML
          // This prevents freezing the bridge during massive DOM injections
          clearTimeout(timeout)
          timeout = setTimeout(() => {
            if ((window as any).onDomChanged) {
              ;(window as any).onDomChanged(document.documentElement.outerHTML)
            }
          }, 50)
        })

        const observeOptions = {
          childList: true,
          subtree: true,
          attributes: true,
          characterData: true,
        }
        observer.observe(document.documentElement, observeOptions)
        ;(window as any).__pwObserver = observer
      })
      .catch(() => {
        // Ignore errors if page was closed
      })
  }
}
