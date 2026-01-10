import { describe, expect, it, beforeAll, afterAll, beforeEach, afterEach, setDefaultTimeout } from 'bun:test'
import type { PlaywrightPage } from './utils/playwright.js'
import { PlaywrightBrowser } from './utils/playwright.js'

setDefaultTimeout(10000)

let browser: PlaywrightBrowser

type ItFn = (done: (err?: unknown) => any) => any

function wrp(url: string, callback: (page: PlaywrightPage) => any): ItFn
function wrp(callback: (page: PlaywrightPage) => any): ItFn
function wrp(
  ...args: [callback: (page: PlaywrightPage) => any] | [url: string, callback: (page: PlaywrightPage) => any]
): ItFn {
  const [url, callback] = args.length === 1 ? [undefined, args[0]] : args
  return async () => {
    let page: PlaywrightPage | undefined
    try {
      page = url ? await browser.goto(url) : await browser.createPage()
      await callback(page)
      await page.close()
    } catch (error) {
      if (page) {
        await page.close()
      }
      throw error
    }
  }
}

describe('playwright', () => {
  beforeAll(async () => {
    browser = await PlaywrightBrowser.init({ headless: true, timeout: 5000 })
  })

  afterAll(async () => {
    await browser.close()
  })

  describe.concurrent('browser', () => {
    it.concurrent('should initialize browser', () => {
      expect(browser).toBeDefined()
      expect(browser.headless).toBe(true)
      expect(browser.timeout).toBe(5000)
      expect(browser.pages.size).toBe(0)
    })

    it.concurrent(
      'should create a page',
      wrp(async (page) => {
        expect(page).toBeDefined()
        expect(browser.pages.size).toBeGreaterThan(0)
        expect(browser.pages.has(page)).toBe(true)
      }),
    )

    it.concurrent(
      'should navigate to URL and create page',
      wrp('data:text/html,<html><body><h1>Test</h1></body></html>', async (page) => {
        expect(page).toBeDefined()
        expect(page.url).toContain('data:text/html')
      }),
    )
  })

  describe.concurrent('page', () => {
    it.concurrent(
      'should track navigation history',
      wrp('data:text/html,<html><body><h1>Page 1</h1></body></html>', async (page) => {
        await page.finished
        expect(page.navcount).toBeGreaterThan(0)
        expect(page.url).toContain('data:text/html')
      }),
    )

    it.concurrent(
      'should track HTML changes',
      wrp(
        'data:text/html,<html><body><div id="root"><div id="test">Initial</div></div></body></html>',
        async (page) => {
          await page.finished
          expect(page.history.length).toBeGreaterThan(0)
          const lastHistory = page.history[page.history.length - 1]
          expect(lastHistory.htmls.length).toBeGreaterThan(0)
        },
      ),
    )

    it.concurrent(
      'should provide previews',
      wrp('data:text/html,<html><body><div id="root"><h1>Test Content</h1></div></body></html>', async (page) => {
        await page.finished
        const previews = page.previews
        expect(previews.length).toBeGreaterThan(0)
        expect(previews[0]).toContain('Test Content')
      }),
    )

    it.concurrent(
      'should provide single preview',
      wrp('data:text/html,<html><body><div id="root"><p>Hello World</p></div></body></html>', async (page) => {
        await page.finished

        const preview = page.preview
        expect(preview).toBeDefined()
        expect(preview).toContain('Hello World')
      }),
    )

    it.concurrent(
      'should track URLs',
      wrp('data:text/html,<html><body><div id="root">Test</div></body></html>', async (page) => {
        await page.finished

        const urls = page.urls
        expect(urls.length).toBeGreaterThan(0)
        expect(urls[0]).toContain('about:blank')
        expect(urls[1]).toContain('data:text/html')
      }),
    )

    it.concurrent(
      'should provide story',
      wrp('data:text/html,<html><body><div id="root"><span>Story Test</span></div></body></html>', async (page) => {
        await page.finished

        const story = page.story
        expect(story.length).toBeGreaterThan(0)
        expect(story[0].url).toContain('about:blank')
        expect(story[1].url).toContain('data:text/html')
        expect(story[1].previews.length).toBeGreaterThan(0)
      }),
    )

    it.concurrent(
      'should wait for page to finish loading',
      wrp('data:text/html,<html><body><div id="root"><div>Loading Test</div></div></body></html>', async (page) => {
        const startTime = Date.now()
        await page.finished
        const endTime = Date.now()

        // Should complete within reasonable time (not hang)
        expect(endTime - startTime).toBeLessThan(3000)
        expect(page.history.length).toBeGreaterThan(0)
      }),
    )

    it.only(
      'should track state changes after button clicks',
      wrp(async (page) => {
        const html = `
      <!DOCTYPE html>
      <html>
        <head><title>Counter Test</title></head>
        <body>
          <div id="root">
            <div id="counter">0</div>
            <button id="increment">Click me</button>
          </div>
          <script>
            let count = 0;
            const counterEl = document.getElementById('counter');
            const buttonEl = document.getElementById('increment');
            buttonEl.addEventListener('click', () => {
              count++;
              counterEl.textContent = count;
            });
          </script>
        </body>
      </html>
    `
        await page.goto(`data:text/html,${encodeURIComponent(html)}`)
        await page.finished

        // Get initial state
        const initialPreviews = page.previews.length
        expect(initialPreviews).toBeGreaterThan(0)

        // Click button multiple times
        const clickCount = 5
        for (let i = 0; i < clickCount; i++) {
          await page.original.click('#increment')
          // Wait a bit for DOM to update
          await new Promise((resolve) => setTimeout(resolve, 30))
        }

        // Wait for all changes to finish
        await page.finished

        // Check that story captured the state changes
        const story = page.story
        expect(story.map((s) => s.previews)).toMatchInlineSnapshot(`
          [
            [
              
          "#counter: 0
          #increment: Click me
          "
          ,
              
          "#counter: 1
          #increment: Click me
          "
          ,
              
          "#counter: 2
          #increment: Click me
          "
          ,
              
          "#counter: 3
          #increment: Click me
          "
          ,
              
          "#counter: 4
          #increment: Click me
          "
          ,
              
          "#counter: 5
          #increment: Click me
          "
          ,
            ],
          ]
        `)
        expect(story.length).toBeGreaterThan(0)

        const lastStoryItem = story[story.length - 1]
        expect(lastStoryItem.previews.length).toBeGreaterThan(initialPreviews)

        // Verify that the counter value is in the last preview
        const lastPreview = lastStoryItem.previews[lastStoryItem.previews.length - 1]
        expect(lastPreview).toContain(clickCount.toString())

        // Verify history also captured changes
        const lastHistory = page.history[page.history.length - 1]
        expect(lastHistory.htmls.length).toBeGreaterThan(initialPreviews)

        // Check that we can see the counter value in the HTML
        const lastHtml = lastHistory.htmls[lastHistory.htmls.length - 1]
        expect(lastHtml.html).toContain(clickCount.toString())
      }),
    )
  })
})
