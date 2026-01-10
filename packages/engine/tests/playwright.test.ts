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
        expect(urls[0]).toContain('data:text/html')
      }),
    )

    it.concurrent(
      'should provide story',
      wrp('data:text/html,<html><body><div id="root"><span>Story Test</span></div></body></html>', async (page) => {
        await page.finished

        const story = page.story
        expect(story.length).toBeGreaterThan(0)
        expect(story[0].url).toContain('data:text/html')
        expect(story[0].previews.length).toBeGreaterThan(0)
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

    it.concurrent(
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

    it.only(
      'should track state changes after button clicks across multiple pages',
      wrp(async (page) => {
        const html1 = `
      <!DOCTYPE html>
      <html>
        <head><title>Counter Test Page 1</title></head>
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
        await page.goto(`data:text/html,${encodeURIComponent(html1)}`)
        await page.finished

        // Get initial state
        const initialPreviews = page.previews.length
        expect(initialPreviews).toBeGreaterThan(0)

        // Click button 3 times on first page
        const clickCount1 = 3
        for (let i = 0; i < clickCount1; i++) {
          await page.original.click('#increment')
          // Wait a bit for DOM to update
          await new Promise((resolve) => setTimeout(resolve, 30))
        }

        // Wait for all changes to finish
        await page.finished

        // Verify first page state
        const story1 = page.story
        expect(story1.length).toBeGreaterThan(0)
        const lastStoryItem1 = story1[story1.length - 1]
        const lastPreview1 = lastStoryItem1.previews[lastStoryItem1.previews.length - 1]
        expect(lastPreview1).toContain(clickCount1.toString())

        // Navigate to second page with different button name
        const html2 = `
      <!DOCTYPE html>
      <html>
        <head><title>Counter Test Page 2</title></head>
        <body>
          <div id="root">
            <div id="counter">0</div>
            <button id="increment2">Click me too</button>
          </div>
          <script>
            let count = 0;
            const counterEl = document.getElementById('counter');
            const buttonEl = document.getElementById('increment2');
            buttonEl.addEventListener('click', () => {
              count++;
              counterEl.textContent = count;
            });
          </script>
        </body>
      </html>
    `
        await page.goto(`data:text/html,${encodeURIComponent(html2)}`)
        await page.finished

        // Get initial state of second page
        const initialPreviews2 = page.previews.length
        expect(initialPreviews2).toBeGreaterThan(0)

        // Click button 4 times on second page
        const clickCount2 = 4
        for (let i = 0; i < clickCount2; i++) {
          await page.original.click('#increment2')
          // Wait a bit for DOM to update
          await new Promise((resolve) => setTimeout(resolve, 30))
        }

        // Wait for all changes to finish
        await page.finished

        // Verify that story captured state changes from both pages
        const story = page.story
        expect(story.length).toBeGreaterThan(1) // Should have at least 2 pages

        // Verify first page story
        const firstPageStory = story[0]
        expect(firstPageStory.previews.length).toBeGreaterThan(initialPreviews)
        const firstPageLastPreview = firstPageStory.previews[firstPageStory.previews.length - 1]
        expect(firstPageLastPreview).toContain(clickCount1.toString())
        expect(firstPageLastPreview).toContain('#increment: Click me')

        // Verify second page story
        const secondPageStory = story[story.length - 1]
        expect(secondPageStory.previews.length).toBeGreaterThan(initialPreviews2)
        const secondPageLastPreview = secondPageStory.previews[secondPageStory.previews.length - 1]
        expect(secondPageLastPreview).toContain(clickCount2.toString())
        expect(secondPageLastPreview).toContain('#increment2: Click me too')

        // Verify history also captured changes for both pages
        expect(page.history.length).toBeGreaterThan(1)
        const lastHistory = page.history[page.history.length - 1]
        expect(lastHistory.htmls.length).toBeGreaterThan(initialPreviews2)

        // Check that we can see the counter value in the HTML of second page
        const lastHtml = lastHistory.htmls[lastHistory.htmls.length - 1]
        expect(lastHtml.html).toContain(clickCount2.toString())

        expect(story).toMatchInlineSnapshot(`
          [
            {
              "previews": [
                
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
              ],
              "url": "data:text/html,%0A%20%20%20%20%20%20%3C!DOCTYPE%20html%3E%0A%20%20%20%20%20%20%3Chtml%3E%0A%20%20%20%20%20%20%20%20%3Chead%3E%3Ctitle%3ECounter%20Test%20Page%201%3C%2Ftitle%3E%3C%2Fhead%3E%0A%20%20%20%20%20%20%20%20%3Cbody%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cdiv%20id%3D%22root%22%3E%0A%20%20%20%20%20%20%20%20%20%20%20%20%3Cdiv%20id%3D%22counter%22%3E0%3C%2Fdiv%3E%0A%20%20%20%20%20%20%20%20%20%20%20%20%3Cbutton%20id%3D%22increment%22%3EClick%20me%3C%2Fbutton%3E%0A%20%20%20%20%20%20%20%20%20%20%3C%2Fdiv%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cscript%3E%0A%20%20%20%20%20%20%20%20%20%20%20%20let%20count%20%3D%200%3B%0A%20%20%20%20%20%20%20%20%20%20%20%20const%20counterEl%20%3D%20document.getElementById('counter')%3B%0A%20%20%20%20%20%20%20%20%20%20%20%20const%20buttonEl%20%3D%20document.getElementById('increment')%3B%0A%20%20%20%20%20%20%20%20%20%20%20%20buttonEl.addEventListener('click'%2C%20()%20%3D%3E%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20count%2B%2B%3B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20counterEl.textContent%20%3D%20count%3B%0A%20%20%20%20%20%20%20%20%20%20%20%20%7D)%3B%0A%20%20%20%20%20%20%20%20%20%20%3C%2Fscript%3E%0A%20%20%20%20%20%20%20%20%3C%2Fbody%3E%0A%20%20%20%20%20%20%3C%2Fhtml%3E%0A%20%20%20%20",
            },
            {
              "previews": [
                
          "#counter: 0
          #increment2: Click me too
          "
          ,
                
          "#counter: 1
          #increment2: Click me too
          "
          ,
                
          "#counter: 2
          #increment2: Click me too
          "
          ,
                
          "#counter: 3
          #increment2: Click me too
          "
          ,
                
          "#counter: 4
          #increment2: Click me too
          "
          ,
              ],
              "url": "data:text/html,%0A%20%20%20%20%20%20%3C!DOCTYPE%20html%3E%0A%20%20%20%20%20%20%3Chtml%3E%0A%20%20%20%20%20%20%20%20%3Chead%3E%3Ctitle%3ECounter%20Test%20Page%202%3C%2Ftitle%3E%3C%2Fhead%3E%0A%20%20%20%20%20%20%20%20%3Cbody%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cdiv%20id%3D%22root%22%3E%0A%20%20%20%20%20%20%20%20%20%20%20%20%3Cdiv%20id%3D%22counter%22%3E0%3C%2Fdiv%3E%0A%20%20%20%20%20%20%20%20%20%20%20%20%3Cbutton%20id%3D%22increment2%22%3EClick%20me%20too%3C%2Fbutton%3E%0A%20%20%20%20%20%20%20%20%20%20%3C%2Fdiv%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cscript%3E%0A%20%20%20%20%20%20%20%20%20%20%20%20let%20count%20%3D%200%3B%0A%20%20%20%20%20%20%20%20%20%20%20%20const%20counterEl%20%3D%20document.getElementById('counter')%3B%0A%20%20%20%20%20%20%20%20%20%20%20%20const%20buttonEl%20%3D%20document.getElementById('increment2')%3B%0A%20%20%20%20%20%20%20%20%20%20%20%20buttonEl.addEventListener('click'%2C%20()%20%3D%3E%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20count%2B%2B%3B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20counterEl.textContent%20%3D%20count%3B%0A%20%20%20%20%20%20%20%20%20%20%20%20%7D)%3B%0A%20%20%20%20%20%20%20%20%20%20%3C%2Fscript%3E%0A%20%20%20%20%20%20%20%20%3C%2Fbody%3E%0A%20%20%20%20%20%20%3C%2Fhtml%3E%0A%20%20%20%20",
            },
          ]
        `)
      }),
    )
  })
})
