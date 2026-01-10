import { chromium, type Browser, type Page } from 'playwright'

export interface PlaywrightHelperOptions {
  headless?: boolean
  timeout?: number
}

export class PlaywrightHelper {
  private browser: Browser | null = null
  private page: Page | null = null
  private readonly options: Required<PlaywrightHelperOptions>
  private navigationCount = 0
  private initialLoadTimestamp: number | null = null

  constructor(options: PlaywrightHelperOptions = {}) {
    this.options = {
      headless: options.headless ?? true,
      timeout: options.timeout ?? 30000,
    }
  }

  async start(): Promise<void> {
    this.browser = await chromium.launch({
      headless: this.options.headless,
    })
    this.page = await this.browser.newPage()
    this.page.setDefaultTimeout(this.options.timeout)

    // Track navigation events to detect page reloads
    this.navigationCount = 0
    this.page.on('framenavigated', () => {
      this.navigationCount++
    })
  }

  async loadUrl(url: string): Promise<void> {
    if (!this.page) {
      throw new Error('PlaywrightHelper not started. Call start() first.')
    }
    this.navigationCount = 0
    this.initialLoadTimestamp = Date.now()
    await this.page.goto(url, { waitUntil: 'networkidle' })
    // After initial load, navigationCount should be 1
    this.navigationCount = 1
  }

  getNavigationCount(): number {
    return this.navigationCount
  }

  getInitialLoadTimestamp(): number | null {
    return this.initialLoadTimestamp
  }

  /**
   * Verifies that no page reload occurred since the initial load.
   * Returns true if no reload happened, false otherwise.
   */
  verifyNoReload(): boolean {
    // After initial load, navigationCount should remain at 1
    // If it increased, a reload occurred
    return this.navigationCount === 1
  }

  async checkContent(text: string): Promise<boolean> {
    if (!this.page) {
      throw new Error('PlaywrightHelper not started. Call start() first.')
    }
    const content = await this.page.content()
    return content.includes(text)
  }

  async waitForContentChange(initialText: string, newText: string, timeout = 10000): Promise<void> {
    if (!this.page) {
      throw new Error('PlaywrightHelper not started. Call start() first.')
    }

    // Store navigation count before the change
    const navigationCountBefore = this.navigationCount

    // First, verify initial content is present
    const initialContent = await this.page.textContent('body')
    if (!initialContent?.includes(initialText)) {
      throw new Error(
        `Initial text "${initialText}" not found in page. Current content: ${initialContent?.substring(0, 200)}...`,
      )
    }

    // Wait for the new text to appear in the rendered content (HMR update)
    // We check both HTML content and text content to catch HMR updates
    try {
      await this.page.waitForFunction(
        (searchText) => {
          const bodyText = document.body.textContent || ''
          const bodyHTML = document.body.innerHTML || ''
          return bodyText.includes(searchText) || bodyHTML.includes(searchText)
        },
        newText,
        { timeout },
      )
    } catch (error) {
      const currentContent = await this.page.textContent('body')
      const currentHTML = await this.page.content()
      throw new Error(
        `Content did not change to "${newText}" within ${timeout}ms. Current text: ${currentContent?.substring(0, 200)}... Current HTML: ${currentHTML.substring(0, 200)}...`,
        { cause: error },
      )
    }

    // Verify no page reload occurred (HMR should update without reload)
    const navigationCountAfter = this.navigationCount
    if (navigationCountAfter > navigationCountBefore) {
      throw new Error(
        `Page reload detected! Navigation count increased from ${navigationCountBefore} to ${navigationCountAfter}. This indicates a full page reload occurred instead of HMR.`,
      )
    }
  }

  async waitForContent(text: string, timeout = 10000): Promise<void> {
    if (!this.page) {
      throw new Error('PlaywrightHelper not started. Call start() first.')
    }

    try {
      await this.page.waitForFunction((searchText) => (document.body.textContent || '').includes(searchText), text, {
        timeout,
      })
    } catch (error) {
      const content = await this.page.content()
      throw new Error(
        `Content "${text}" not found within ${timeout}ms. Current content: ${content.substring(0, 200)}...`,
        { cause: error },
      )
    }
  }

  async getContent(): Promise<string> {
    if (!this.page) {
      throw new Error('PlaywrightHelper not started. Call start() first.')
    }
    return await this.page.content()
  }

  async close(): Promise<void> {
    if (this.page) {
      await this.page.close()
      this.page = null
    }
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }
}
