import { chromium, type Browser, type Page } from 'playwright'

export interface PlaywrightHelperOptions {
  headless?: boolean
  timeout?: number
}

export class PlaywrightHelper {
  private browser: Browser | null = null
  private page: Page | null = null
  private readonly options: Required<PlaywrightHelperOptions>

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
  }

  async loadUrl(url: string): Promise<void> {
    if (!this.page) {
      throw new Error('PlaywrightHelper not started. Call start() first.')
    }
    await this.page.goto(url, { waitUntil: 'networkidle' })
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
  }

  async waitForContent(text: string, timeout = 10000): Promise<void> {
    if (!this.page) {
      throw new Error('PlaywrightHelper not started. Call start() first.')
    }

    try {
      await this.page.waitForFunction((searchText) => document.body.textContent?.includes(searchText) ?? false, text, {
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
