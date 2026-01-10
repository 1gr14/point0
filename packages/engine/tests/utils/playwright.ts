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
    const page = new PlaywrightPage({ original: pageOriginal, browser: this })
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
      Array.from(this.pages).map(async (page) => {
        await page.close()
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
  private htmlWatcherCleanup: (() => Promise<void>) | null = null

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
    return this.waitForStability()
  }

  private async waitForStability(): Promise<void> {
    const stabilityPeriod = 200 // Wait 200ms with no changes
    const checkInterval = 50 // Check every 50ms
    const maxWaitTime = this.browser.timeout

    const startTime = Date.now()

    // First, wait for network idle
    try {
      await this.original.waitForLoadState('networkidle', { timeout: maxWaitTime })
    } catch (error) {
      // Network idle might timeout, continue anyway
    }

    // Then wait for DOM changes to stop
    let lastChangeDetected = Date.now()
    let consecutiveStableChecks = 0
    const requiredStableChecks = Math.ceil(stabilityPeriod / checkInterval)

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const hasChanged = await this.original.evaluate(() => {
          const watcher = (window as any).__playwrightHtmlWatcher
          if (!watcher) return false
          return watcher.hasChanged
        })

        if (hasChanged) {
          lastChangeDetected = Date.now()
          consecutiveStableChecks = 0
          // Reset the change flag
          await this.original.evaluate(() => {
            const watcher = (window as any).__playwrightHtmlWatcher
            if (watcher) {
              watcher.reset()
            }
          })
        } else {
          consecutiveStableChecks++
          // If we've had enough consecutive stable checks, and enough time has passed since last change
          if (consecutiveStableChecks >= requiredStableChecks && Date.now() - lastChangeDetected >= stabilityPeriod) {
            return // Page is stable
          }
        }
      } catch (error) {
        // Page might be closed or navigated away
        return
      }

      await new Promise((resolve) => setTimeout(resolve, checkInterval))
    }

    // If we've waited the max time, resolve anyway (implicit return)
    // console.error('Page stability check timed out')
    await Promise.resolve()
  }

  async close(): Promise<void> {
    if (this.htmlWatcherCleanup) {
      await this.htmlWatcherCleanup()
      this.htmlWatcherCleanup = null
    }
    await this.original.close()
    this.browser.pages.delete(this)
  }

  constructor(options: PlaywrightPageConstructorOptions) {
    this.original = options.original
    this.browser = options.browser

    // Track initial URL
    const initialUrl = this.original.url()
    if (initialUrl) {
      this.history.push({ url: initialUrl, htmls: [] })
      void this.startHtmlWatcher()
    }

    // Watch for navigation events (both programmatic and user-initiated)
    this.original.on('framenavigated', async () => {
      const url = this.original.url()
      if (url) {
        // Clean up previous watcher
        if (this.htmlWatcherCleanup) {
          await this.htmlWatcherCleanup()
          this.htmlWatcherCleanup = null
        }

        // Add new history item
        this.history.push({ url, htmls: [] })

        // Start watching HTML changes for this navigation
        void this.startHtmlWatcher()
      }
    })
  }

  private async startHtmlWatcher(): Promise<void> {
    const currentHistoryIndex = this.history.length - 1
    if (currentHistoryIndex < 0) return

    // Capture initial HTML after navigation
    try {
      const initialHtml = await this.original.content()
      this.history[currentHistoryIndex].htmls.push(await HtmlView.create(initialHtml))
    } catch (error) {
      // console.error('Error capturing initial HTML', error)
      // Ignore errors if page is not ready
    }

    // Inject MutationObserver to watch for DOM changes

    const evaulating = this.original.evaluate(() => {
      // Remove any existing watcher
      if ((window as any).__playwrightHtmlWatcher) {
        ;(window as any).__playwrightHtmlWatcher.observer.disconnect()
      }

      let hasChanged = false
      let lastHtml = document.documentElement.outerHTML

      const observer = new MutationObserver(() => {
        const currentHtml = document.documentElement.outerHTML
        // Check if HTML actually changed (any symbol difference)
        if (currentHtml !== lastHtml) {
          hasChanged = true
          lastHtml = currentHtml
        }
      })

      // Start observing
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
        attributeOldValue: false,
        characterDataOldValue: false,
      })
      ;(window as any).__playwrightHtmlWatcher = {
        observer,
        get hasChanged() {
          return hasChanged
        },
        reset() {
          hasChanged = false
        },
        get currentHtml() {
          return document.documentElement.outerHTML
        },
      }
    })

    try {
      await evaulating
    } catch (error) {
      // Ignore errors if page was closed earlier
      // console.error('Error evaluating HTML watcher', error)
      return
    }

    // Poll for changes and capture HTML when it changes
    const checkInterval = setInterval(() => {
      void (async () => {
        try {
          const hasChanged = await this.original.evaluate(() => {
            const watcher = (window as any).__playwrightHtmlWatcher
            if (!watcher) return false
            const changed = watcher.hasChanged
            if (changed) {
              watcher.reset()
            }
            return changed
          })

          if (hasChanged) {
            const html = await this.original.content()
            // Only add if different from last recorded HTML
            const currentItem = this.history[currentHistoryIndex]
            const lastHtml = currentItem.htmls[currentItem.htmls.length - 1]
            if (html !== lastHtml.html) {
              currentItem.htmls.push(await HtmlView.create(html))
            }
          }
        } catch (error) {
          // Page might be closed or navigated away
          // console.error('Error checking for HTML changes', error)
          clearInterval(checkInterval)
        }
      })()
    }, 50) // Check every 50ms

    // Store cleanup function
    this.htmlWatcherCleanup = async () => {
      clearInterval(checkInterval)
      await this.original.evaluate(() => {
        if ((window as any).__playwrightHtmlWatcher) {
          ;(window as any).__playwrightHtmlWatcher.observer.disconnect()
          delete (window as any).__playwrightHtmlWatcher
        }
      })
    }
  }
}
