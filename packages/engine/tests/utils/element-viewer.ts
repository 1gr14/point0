import { HtmlView } from './html-view.js'

export type ElementViewerHistoryItem =
  | {
      url: string
      timestamp: number
    }
  | {
      view: HtmlView
      timestamp: number
    }
export type ElementViewerHistoryParsedItem =
  | {
      url: string
      timestamp: number
    }
  | {
      view: HtmlView<true>
      timestamp: number
    }

export class ElementViewer {
  element: HTMLElement
  // observer: MutationObserver
  private readonly _history: ElementViewerHistoryItem[]
  private looping: boolean
  private rafId: number | null = null

  private lastHtml: string | undefined

  private constructor({ element, url }: { element: HTMLElement; url: string }) {
    this.element = element
    this._history = [{ url, timestamp: Date.now() }]
    // this.observer = new MutationObserver(() => {
    //   // Read innerHTML immediately - DOM should be updated when callback fires
    //   console.info('FIRE', this.element.innerHTML)
    //   this.notify()
    // })
    this.looping = false
    this.start()
  }

  static create(element: HTMLElement, url?: string): ElementViewer {
    url ??= typeof window !== 'undefined' ? ElementViewer.normalizeUrl(window.location.href) : '/'
    return new ElementViewer({ element, url })
  }

  // private notify(): void {
  //   // const currentHtml = this.element.innerHTML
  //   // // if (currentHtml !== this.lastHtml) {
  //   // //   this.lastHtml = currentHtml
  //   // const hasRoot = /<div[^>]*id=["']root["'][^>]*>/i.test(currentHtml.trim())
  //   // const wrappedHtml = hasRoot ? currentHtml : `<div id="root">${currentHtml}</div>`
  //   // const newView = HtmlView.create(wrappedHtml)
  //   // this._history.push({ view: newView, timestamp: Date.now() })
  //   // // }
  // }

  private notify(html: string): void {
    const hasRoot = /<div[^>]*id=["']root["'][^>]*>/i.test(html.trim())
    const wrappedHtml = hasRoot ? html : `<div id="root">${html}</div>`
    const newView = HtmlView.create(wrappedHtml)
    this._history.push({ view: newView, timestamp: Date.now() })
  }

  private start() {
    if (this.looping) return
    this.looping = true

    const loop = () => {
      if (!this.looping) return

      const html = this.element.innerHTML
      if (html !== this.lastHtml) {
        this.lastHtml = html
        this.notify(html)
      }

      this.rafId = requestAnimationFrame(loop)
    }

    loop()
  }

  destroy() {
    this.looping = false
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  // private start(): void {
  //   // Start observing
  //   this.observer.observe(this.element, {
  //     childList: true,
  //     subtree: true,
  //     attributes: true,
  //     characterData: true,
  //   })
  //   // Send the initial state
  //   this.notify()
  // }

  // destroy(): void {
  //   this.observer.disconnect()
  // }

  private static normalizeUrl(url: string | URL): string {
    if (typeof url === 'string') {
      try {
        url = new URL(url)
      } catch {
        url = new URL(`http://localhost${url}`)
      }
    }
    return [url.pathname, url.search].filter(Boolean).join('')
  }

  setUrl(url: string | URL): void {
    const lastUrl = [...this._history].reverse().find((item) => 'url' in item)?.url
    const normalizedUrl = ElementViewer.normalizeUrl(url)
    if (lastUrl === normalizedUrl) {
      return
    }
    this._history.push({ url: ElementViewer.normalizeUrl(url), timestamp: Date.now() })
  }

  async history(): Promise<ElementViewerHistoryParsedItem[]> {
    return await Promise.all(
      this._history.map(async (item) => {
        if ('view' in item) {
          return { view: await item.view.parse(), timestamp: item.timestamp }
        }
        return item
      }),
    )
  }

  private async getLastHtmlView(): Promise<HtmlView<true> | undefined> {
    const history = await this.stable()
    return [...history].reverse().find((item) => 'view' in item)?.view
  }

  async preview(): Promise<string | undefined> {
    const lastHtmlView = await this.getLastHtmlView()
    return lastHtmlView?.preview
  }

  async waitNoContent(search: string, timeout = 2000): Promise<void> {
    const startTime = Date.now()
     
    while (true) {
      if (Date.now() - startTime > timeout) {
        throw new Error(`Timeout waiting for no content: ${search} within ${timeout}ms`)
      }
      const htmlView = await this.getLastHtmlView()
      if (!htmlView || htmlView.hasNoContent(search)) {
        // await this.parseAllHtmlViews()
        return
      }
      await new Promise((resolve) => setTimeout(resolve, 30))
    }
  }

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
      const htmlView = await this.getLastHtmlView()
      if (htmlView?.hasContent(search)) {
        // await this.parseAllHtmlViews()
        return
      }
      await new Promise((resolve) => setTimeout(resolve, 30))
    }
  }

  async tale(): Promise<string> {
    await this.stable()
    const lines: string[] = []
    for (const item of await this.history()) {
      if ('url' in item) {
        lines.push(item.url)
        continue
      }
      // Indent each line of the preview with 2 spaces, starting right after URL
      const previewLines = item.view.preview.split('\n').filter((line) => line.trim() !== '')
      for (const line of previewLines) {
        lines.push(`  ${line}`)
      }
      lines.push('')
    }
    return '\n' + lines.join('\n')
  }

  async stable(): Promise<ElementViewerHistoryParsedItem[]> {
    const maxWaitTime = 2000
    const notChangedDuringMsIsStable = 150

    const startTimestamp = Date.now()
     
    while (true) {
      const elapsed = Date.now() - startTimestamp
      if (elapsed > maxWaitTime) {
        throw new Error('Timeout waiting for stability')
      }
      const lastChangeTimestamp = Math.max(this._history.at(-1)?.timestamp ?? startTimestamp, startTimestamp)
      if (lastChangeTimestamp <= Date.now() - notChangedDuringMsIsStable) {
        break
      }
      await new Promise((resolve) => setTimeout(resolve, 5))
    }
    return await this.history()
  }
}
