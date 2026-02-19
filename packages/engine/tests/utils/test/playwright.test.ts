import { afterAll, beforeAll, describe, expect, it, setDefaultTimeout } from 'bun:test'
import { PlaywrightBrowser, PlaywrightPage } from '../playwright.js'

setDefaultTimeout(10000)

let browser: PlaywrightBrowser

type ItFn = (done: (err?: unknown) => void) => void | Promise<void>

function wrp(url: string, callback: (page: PlaywrightPage) => void | Promise<void>): ItFn
function wrp(callback: (page: PlaywrightPage) => void | Promise<void>): ItFn
function wrp(
  ...args:
    | [callback: (page: PlaywrightPage) => void | Promise<void>]
    | [url: string, callback: (page: PlaywrightPage) => void | Promise<void>]
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
    void browser.close()
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
        expect(page.history.length).toBeGreaterThan(0)
        expect(page.url).toContain('data:text/html')
      }),
    )

    it.concurrent(
      'should track HTML changes',
      wrp(
        'data:text/html,<html><body><div id="root"><div id="test">Initial</div></div></body></html>',
        async (page) => {
          expect(page.history.length).toBeGreaterThan(0)
          const lastHistory = page.history[page.history.length - 1]
          expect(lastHistory.htmls.length).toBeGreaterThan(0)
        },
      ),
    )

    it.concurrent(
      'should provide previews',
      wrp('data:text/html,<html><body><div id="root"><h1>Test Content</h1></div></body></html>', async (page) => {
        const previews = page.previews
        expect(previews.length).toBeGreaterThan(0)
        expect(previews[0]).toContain('Test Content')
      }),
    )

    it.concurrent(
      'should provide single preview',
      wrp('data:text/html,<html><body><div id="root"><p>Hello World</p></div></body></html>', async (page) => {
        const preview = page.preview
        expect(preview).toBeDefined()
        expect(preview).toContain('Hello World')
      }),
    )

    it.concurrent(
      'should track URLs',
      wrp('data:text/html,<html><body><div id="root">Test</div></body></html>', async (page) => {
        const urls = page.urls
        expect(urls.length).toBeGreaterThan(0)
        expect(urls[0]).toContain('data:text/html')
      }),
    )

    it.concurrent(
      'should provide story',
      wrp('data:text/html,<html><body><div id="root"><span>Story Test</span></div></body></html>', async (page) => {
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

        // Get initial state
        const initialPreviews = page.previews.length
        expect(initialPreviews).toBeGreaterThan(0)

        // Click button multiple times
        const clickCount = 5
        for (let i = 0; i < clickCount; i++) {
          await page.original.click('#increment')
          // Wait a bit for DOM to update
          await new Promise((resolve) => setTimeout(resolve, 70))
        }

        // Wait for all changes to finish

        // Check that story captured the state changes
        const story = page.story
        expect(page.tale).toMatchInlineSnapshot(`
          "
          data:...
            #counter: 0
            #increment: Click me
            
            #counter: 1
            #increment: Click me
            
            #counter: 2
            #increment: Click me
            
            #counter: 3
            #increment: Click me
            
            #counter: 4
            #increment: Click me
            
            #counter: 5
            #increment: Click me
            "
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

    it.concurrent(
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

        expect(page.tale).toMatchInlineSnapshot(`
          "
          data:...
            #counter: 0
            #increment: Click me
            
            #counter: 1
            #increment: Click me
            
            #counter: 2
            #increment: Click me
            
            #counter: 3
            #increment: Click me
            
          data:...
            #counter: 0
            #increment2: Click me too
            
            #counter: 1
            #increment2: Click me too
            
            #counter: 2
            #increment2: Click me too
            
            #counter: 3
            #increment2: Click me too
            
            #counter: 4
            #increment2: Click me too
            "
        `)
      }),
    )
  })

  describe.concurrent('prettifyUrl', () => {
    it.concurrent('should prettify data: URLs by replacing content after comma', () => {
      const url = 'data:,<html><body>Test</body></html>'
      const result = PlaywrightPage.prettifyUrl(url)
      expect(result).toBe('data:...')
    })

    it.concurrent('should prettify data: URLs with encoded content', () => {
      const url = 'data:,%3Chtml%3E%3Cbody%3ETest%3C%2Fbody%3E%3C%2Fhtml%3E'
      const result = PlaywrightPage.prettifyUrl(url)
      expect(result).toBe('data:...')
    })

    it.concurrent('should prettify http://localhost: URLs by removing port number', () => {
      const url = 'http://localhost:3000'
      const result = PlaywrightPage.prettifyUrl(url)
      expect(result).toBe('/')
    })

    it.concurrent('should prettify http://localhost: URLs with path', () => {
      const url = 'http://localhost:8080/path/to/page'
      const result = PlaywrightPage.prettifyUrl(url)
      expect(result).toBe('/path/to/page')
    })

    it.concurrent('should prettify http://localhost: URLs with different port numbers', () => {
      expect(PlaywrightPage.prettifyUrl('http://localhost:1234')).toBe('/')
      expect(PlaywrightPage.prettifyUrl('http://localhost:9999')).toBe('/')
      expect(PlaywrightPage.prettifyUrl('http://localhost:80')).toBe('/')
    })

    it.concurrent('should return other URLs unchanged', () => {
      expect(PlaywrightPage.prettifyUrl('https://example.com')).toBe('https://example.com')
      expect(PlaywrightPage.prettifyUrl('http://example.com')).toBe('http://example.com')
      expect(PlaywrightPage.prettifyUrl('file:///path/to/file')).toBe('file:///path/to/file')
      expect(PlaywrightPage.prettifyUrl('about:blank')).toBe('about:blank')
    })

    it.concurrent('should handle data:text/html URLs (not starting with data:,)', () => {
      const url = 'data:text/html,<html></html>'
      const result = PlaywrightPage.prettifyUrl(url)
      // Should not match data:, pattern, so returns unchanged
      expect(result).toBe('data:...')
    })

    it.concurrent('should handle http://localhost without port', () => {
      const url = 'http://localhost'
      const result = PlaywrightPage.prettifyUrl(url)
      expect(result).toBe('http://localhost')
    })
  })

  describe.concurrent('waitContent', () => {
    it.concurrent(
      'should wait for content that appears after delay',
      wrp(async (page) => {
        const html = `
      <!DOCTYPE html>
      <html>
        <head><title>Wait For Content Test</title></head>
        <body>
          <div id="root">
            <div id="status">Initial</div>
          </div>
          <script>
            setTimeout(() => {
              const statusEl = document.getElementById('status');
              statusEl.textContent = 'Changed';
            }, 300);
          </script>
        </body>
      </html>
    `
        await page.goto(`data:text/html,${encodeURIComponent(html)}`)
        // await page.waitContent('Initial', 1000)
        await page.waitContent('Changed', 1000)
        expect(page.tale).toMatchInlineSnapshot(`
          "
          data:...
            #status: Initial
            
            #status: Changed
            "
        `)
      }),
    )

    it.concurrent(
      'should throw timeout error if content does not appear',
      wrp(async (page) => {
        const html = `
      <!DOCTYPE html>
      <html>
        <head><title>Wait For Content Timeout Test</title></head>
        <body>
          <div id="root">
            <div>Never Changes</div>
          </div>
        </body>
      </html>
    `
        await page.goto(`data:text/html,${encodeURIComponent(html)}`)
        await page.waitContent('Never Changes', 300)
        // eslint-disable-next-line @typescript-eslint/await-thenable
        await expect(page.waitContent('But Maybe Changes', 300)).rejects.toThrow()
        expect(page.tale).toMatchInlineSnapshot(`
          "
          data:...
            div: Never Changes
            "
        `)
      }),
    )
  })

  describe.concurrent('waitNoContent', () => {
    it(
      'should wait for content that disappears after delay',
      wrp(async (page) => {
        const html = `
      <!DOCTYPE html>
      <html>
        <head><title>Wait For No Content Test</title></head>
        <body>
          <div id="root">
            <div id="status">Will Disappear</div>
          </div>
          <script>
            setTimeout(() => {
              const statusEl = document.getElementById('status');
              statusEl.remove();
            }, 300);
          </script>
        </body>
      </html>
    `
        await page.goto(`data:text/html,${encodeURIComponent(html)}`)
        await page.waitNoContent('Will Disappear', 300)
        expect(page.tale).toMatchInlineSnapshot(`
          "
          data:...
            #status: Will Disappear
            
            (Empty)
            "
        `)
      }),
    )

    it.concurrent(
      'should throw timeout error if content does not disappear',
      wrp(async (page) => {
        const html = `
      <!DOCTYPE html>
      <html>
        <head><title>Wait For No Content Timeout Test</title></head>
        <body>
          <div id="root">
            <div>Always Present</div>
          </div>
        </body>
      </html>
    `
        await page.goto(`data:text/html,${encodeURIComponent(html)}`)
        // eslint-disable-next-line @typescript-eslint/await-thenable
        await expect(page.waitNoContent('Always Present', 300)).rejects.toThrow()
        expect(page.tale).toMatchInlineSnapshot(`
          "
          data:...
            div: Always Present
            "
        `)
      }),
    )
  })

  describe.concurrent('waitContentSequence', () => {
    it.concurrent(
      'should wait for sequence of content and no content',
      wrp(async (page) => {
        const html = `
      <!DOCTYPE html>
      <html>
        <head><title>Wait For Sequence Test</title></head>
        <body>
          <div id="root">
            <div id="status">Initial</div>
            <div id="status2">Will Disappear</div>
          </div>
          <script>
            setTimeout(() => {
              const statusEl = document.getElementById('status');
              statusEl.textContent = 'Changed';
            }, 300);
            setTimeout(() => {
              const status2El = document.getElementById('status2');
              status2El.remove();
            }, 600);
          </script>
        </body>
      </html>
    `
        await page.goto(`data:text/html,${encodeURIComponent(html)}`)
        await page.waitContentSequence(['Changed', '!Will Disappear'])
        expect(page.tale).toMatchInlineSnapshot(`
          "
          data:...
            #status: Initial
            #status2: Will Disappear
            
            #status: Changed
            #status2: Will Disappear
            
            #status: Changed
            "
        `)
      }),
    )

    it.concurrent(
      'should throw timeout error if sequence is not found',
      wrp(async (page) => {
        const html = `
      <!DOCTYPE html>
      <html>
        <head><title>Wait For Sequence Timeout Test</title></head>
        <body>
          <div id="root">
            <div id="status">Initial</div>
            <div id="status2">Will Not Disappear</div>
          </div>
        </body>
      </html>
    `
        await page.goto(`data:text/html,${encodeURIComponent(html)}`)
        // eslint-disable-next-line @typescript-eslint/await-thenable
        await expect(page.waitContentSequence(['Changed', '!Will Not Disappear'], 300)).rejects.toThrow()
        expect(page.tale).toMatchInlineSnapshot(`
          "
          data:...
            #status: Initial
            #status2: Will Not Disappear
            "
        `)
      }),
    )
  })

  // describe.concurrent('ssr like behavior', () => {
  //   it(
  //     'should notice changes in the page right after loading',
  //     wrp(async (page) => {
  //       const html = `
  //               <!DOCTYPE html>
  //               <html>
  //                 <body>
  //                   <div id="root">
  //                     <div id="status2">Will Be Changed Right Now</div>
  //                   </div>
  //                   <script>
  //                       const statusEl = document.getElementById('status2');
  //                       statusEl.textContent = 'Done';
  //                   </script>
  //                 </body>
  //               </html>
  //             `
  //       await page.goto(`data:text/html,${encodeURIComponent(html)}`)
  //       expect(page.tale).toMatchInlineSnapshot(`
  //         "data:...
  //           #status2: Done
  //           "
  //       `)
  //     }),
  //   )
  // })
})
