import { describe, expect, it } from 'bun:test'
import { HtmlView } from './utils/html-view.js'

describe('html-viewer', () => {
  describe('tree', () => {
    it('should parse simple HTML structure', async () => {
      const html = '<div id="root"><p>Hello</p></div>'
      const { tree } = await HtmlView.parse(html)
      expect(tree).toMatchInlineSnapshot(`
      [
        {
          "children": [],
          "classNames": [],
          "content": "Hello",
          "id": undefined,
          "tag": "p",
        },
      ]
    `)
    })

    it('should parse nested HTML structure', async () => {
      const html = '<div id="root"><div><span>Nested</span></div></div>'
      const { tree } = await HtmlView.parse(html)
      expect(tree).toMatchInlineSnapshot(`
      [
        {
          "children": [
            {
              "children": [],
              "classNames": [],
              "content": "Nested",
              "id": undefined,
              "tag": "span",
            },
          ],
          "classNames": [],
          "content": undefined,
          "id": undefined,
          "tag": "div",
        },
      ]
    `)
    })

    it('should handle elements with IDs', async () => {
      const html = '<div id="root"><div id="container">Content</div></div>'
      const { tree } = await HtmlView.parse(html)
      expect(tree).toMatchInlineSnapshot(`
      [
        {
          "children": [],
          "classNames": [],
          "content": "Content",
          "id": "container",
          "tag": "div",
        },
      ]
    `)
    })

    it('should handle elements with classes', async () => {
      const html = '<div id="root"><div class="foo bar">Content</div></div>'
      const { tree } = await HtmlView.parse(html)
      expect(tree).toMatchInlineSnapshot(`
      [
        {
          "children": [],
          "classNames": [
            "foo",
            "bar",
          ],
          "content": "Content",
          "id": undefined,
          "tag": "div",
        },
      ]
    `)
    })

    it('should handle elements with both ID and classes', async () => {
      const html = '<div id="root"><div id="main" class="container wrapper">Content</div></div>'
      const { tree } = await HtmlView.parse(html)
      expect(tree).toMatchInlineSnapshot(`
      [
        {
          "children": [],
          "classNames": [
            "container",
            "wrapper",
          ],
          "content": "Content",
          "id": "main",
          "tag": "div",
        },
      ]
    `)
    })

    it('should handle multiple siblings', async () => {
      const html = '<div id="root"><p>First</p><p>Second</p><p>Third</p></div>'
      const { tree } = await HtmlView.parse(html)
      expect(tree).toMatchInlineSnapshot(`
      [
        {
          "children": [],
          "classNames": [],
          "content": "First",
          "id": undefined,
          "tag": "p",
        },
        {
          "children": [],
          "classNames": [],
          "content": "Second",
          "id": undefined,
          "tag": "p",
        },
        {
          "children": [],
          "classNames": [],
          "content": "Third",
          "id": undefined,
          "tag": "p",
        },
      ]
    `)
    })

    it('should trim whitespace from text content', async () => {
      const html = '<div id="root"><p>   Trimmed   </p></div>'
      const { tree } = await HtmlView.parse(html)
      expect(tree).toMatchInlineSnapshot(`
      [
        {
          "children": [],
          "classNames": [],
          "content": "Trimmed",
          "id": undefined,
          "tag": "p",
        },
      ]
    `)
    })

    it('should ignore empty text nodes', async () => {
      const html = '<div id="root"><p></p></div>'
      const { tree } = await HtmlView.parse(html)
      expect(tree).toMatchInlineSnapshot(`
      [
        {
          "children": [],
          "classNames": [],
          "content": undefined,
          "id": undefined,
          "tag": "p",
        },
      ]
    `)
    })

    it('should handle complex nested structure', async () => {
      const html = `
      <div id="root">
        <header id="header" class="site-header">
          <nav class="nav">
            <a href="/">Home</a>
          </nav>
        </header>
        <main id="content" class="main">
          <article class="post">
            <h1>Title</h1>
            <p>Body text</p>
          </article>
        </main>
      </div>
    `
      const { tree } = await HtmlView.parse(html)
      expect(tree).toMatchInlineSnapshot(`
      [
        {
          "children": [
            {
              "children": [
                {
                  "children": [],
                  "classNames": [],
                  "content": "Home",
                  "id": undefined,
                  "tag": "a",
                },
              ],
              "classNames": [
                "nav",
              ],
              "content": undefined,
              "id": undefined,
              "tag": "nav",
            },
          ],
          "classNames": [
            "site-header",
          ],
          "content": undefined,
          "id": "header",
          "tag": "header",
        },
        {
          "children": [
            {
              "children": [
                {
                  "children": [],
                  "classNames": [],
                  "content": "Title",
                  "id": undefined,
                  "tag": "h1",
                },
                {
                  "children": [],
                  "classNames": [],
                  "content": "Body text",
                  "id": undefined,
                  "tag": "p",
                },
              ],
              "classNames": [
                "post",
              ],
              "content": undefined,
              "id": undefined,
              "tag": "article",
            },
          ],
          "classNames": [
            "main",
          ],
          "content": undefined,
          "id": "content",
          "tag": "main",
        },
      ]
    `)
    })

    it('should handle elements without ID or classes', async () => {
      const html = '<div id="root"><section>Plain element</section></div>'
      const { tree } = await HtmlView.parse(html)
      expect(tree).toMatchInlineSnapshot(`
      [
        {
          "children": [],
          "classNames": [],
          "content": "Plain element",
          "id": undefined,
          "tag": "section",
        },
      ]
    `)
    })

    it('should handle multiple classes with extra spaces', async () => {
      const html = '<div id="root"><div class="foo   bar   baz">Content</div></div>'
      const { tree } = await HtmlView.parse(html)
      expect(tree).toMatchInlineSnapshot(`
      [
        {
          "children": [],
          "classNames": [
            "foo",
            "bar",
            "baz",
          ],
          "content": "Content",
          "id": undefined,
          "tag": "div",
        },
      ]
    `)
    })

    it('should return empty array if div#root is not found', async () => {
      const html = '<div><p>No root</p></div>'
      const { tree } = await HtmlView.parse(html)
      expect(tree).toEqual([])
    })

    it('should ignore elements outside of root', async () => {
      const html = '<div>Outside</div><div id="root"><p>Inside</p></div><div>Also outside</div>'
      const { tree } = await HtmlView.parse(html)
      expect(tree).toMatchInlineSnapshot(`
      [
        {
          "children": [],
          "classNames": [],
          "content": "Inside",
          "id": undefined,
          "tag": "p",
        },
      ]
    `)
    })

    it('should handle text nodes with multiple spaces', async () => {
      const html = '<div id="root"><p>Text   with   spaces</p></div>'
      const { tree } = await HtmlView.parse(html)
      expect(tree).toMatchInlineSnapshot(`
      [
        {
          "children": [],
          "classNames": [],
          "content": "Text   with   spaces",
          "id": undefined,
          "tag": "p",
        },
      ]
    `)
    })

    it('should handle empty root', async () => {
      const html = '<div id="root"></div>'
      const { tree } = await HtmlView.parse(html)
      expect(tree).toMatchInlineSnapshot(`[]`)
    })

    it('should handle self-closing tags', async () => {
      const html = '<div id="root"><br/><hr/><img src="test.jpg"/></div>'
      const { tree } = await HtmlView.parse(html)
      expect(tree).toMatchInlineSnapshot(`
      [
        {
          "children": [],
          "classNames": [],
          "content": undefined,
          "id": undefined,
          "tag": "br",
        },
        {
          "children": [],
          "classNames": [],
          "content": undefined,
          "id": undefined,
          "tag": "hr",
        },
        {
          "children": [],
          "classNames": [],
          "content": undefined,
          "id": undefined,
          "tag": "img",
        },
      ]
    `)
    })

    it('should handle mixed content with text and elements', async () => {
      const html = '<div id="root"><p>Start<span>Middle</span>End</p></div>'
      const { tree } = await HtmlView.parse(html)
      expect(tree).toMatchInlineSnapshot(`
      [
        {
          "children": [
            {
              "children": [],
              "classNames": [],
              "content": "Middle",
              "id": undefined,
              "tag": "span",
            },
          ],
          "classNames": [],
          "content": "StartEnd",
          "id": undefined,
          "tag": "p",
        },
      ]
    `)
    })
  })

  describe('preview', () => {
    it('should convert simple HTML to YAML', async () => {
      const html = '<div id="root"><p>Hello</p></div>'
      const { preview } = await HtmlView.parse(html)
      expect(preview).toMatchInlineSnapshot(`
      "p: Hello
      "
    `)
    })

    it('should convert HTML with IDs and classes to YAML', async () => {
      const html = '<div id="root"><div id="container" class="foo bar">Content</div></div>'
      const { preview } = await HtmlView.parse(html)
      expect(preview).toMatchInlineSnapshot(
        `
        "#container: Content
        "
      `,
      )
    })

    it('should convert nested HTML structure to YAML', async () => {
      const html = '<div id="root"><div><span>Nested</span></div></div>'
      const { preview } = await HtmlView.parse(html)
      expect(preview).toMatchInlineSnapshot(
        `
        "div:
          span: Nested
        "
      `,
      )
    })

    it('should convert multiple siblings to YAML', async () => {
      const html = '<div id="root"><p>First</p><p>Second</p><p>Third</p></div>'
      const { preview } = await HtmlView.parse(html)
      expect(preview).toMatchInlineSnapshot(
        `
        "p: First
        p: Second
        p: Third
        "
      `,
      )
    })

    it('should convert complex nested structure to YAML', async () => {
      const html = `
      <div id="root">
        <header id="header" class="site-header">
          <nav class="nav">
            <a href="/">Home</a>
          </nav>
        </header>
        <main id="content" class="main">
          <article class="post">
            <h1>Title</h1>
            <p>Body text</p>
          </article>
        </main>
      </div>
    `
      const { preview } = await HtmlView.parse(html)
      expect(preview).toMatchInlineSnapshot(
        `
        "#header:
          .nav:
            a: Home
        #content:
          .post:
            h1: Title
            p: Body text
        "
      `,
      )
    })

    it('should convert empty root to YAML', async () => {
      const html = '<div id="root"></div>'
      const { preview } = await HtmlView.parse(html)
      expect(preview).toMatchInlineSnapshot(`
      "
      "
    `)
    })

    it('should produce preview format with correct structure', async () => {
      const html = '<div id="root"><p id="test" class="foo bar">Hello World</p></div>'
      const { preview } = await HtmlView.parse(html)

      // Verify the format structure (this is a preview format, not standard YAML)
      expect(preview).toContain('#test: Hello World')
      expect(preview).toContain('\n')
      expect(preview.trim().length).toBeGreaterThan(0)
    })
  })

  describe('parseMany', () => {
    it('should parse multiple HTML strings', async () => {
      const htmls = ['<div id="root"><p>Hello</p></div>', '<div id="root"><p>World</p></div>']
      const views = await HtmlView.parseMany(htmls)
      expect(views).toHaveLength(2)
      expect(views[0].parsed).toBe(true)
      expect(views[0].html).toBeString()
      expect(views[0].tree).toBeDefined()
      expect(views[0].preview).toBeString()
    })

    it('should parse multiple HTML views', async () => {
      const views = await HtmlView.parseMany([
        HtmlView.create('<div id="root"><p>Hello</p></div>'),
        HtmlView.create('<div id="root"><p>World</p></div>'),
      ])
      expect(views).toHaveLength(2)
      expect(views[0].parsed).toBe(true)
      expect(views[0].html).toBeString()
      expect(views[0].tree).toBeDefined()
      expect(views[0].preview).toBeString()
    })
  })

  describe('hasContent', () => {
    it('should throw error if view is not parsed', () => {
      const view = HtmlView.create('<div id="root"><p>Hello</p></div>')
      expect(() => view.hasContent('Hello')).toThrow('HtmlView not parsed')
    })

    it('should find content by plain text search', async () => {
      const view = await HtmlView.parse('<div id="root"><p>Hello World</p></div>')
      expect(view.hasContent('Hello')).toBe(true)
      expect(view.hasContent('World')).toBe(true)
      expect(view.hasContent('Hello World')).toBe(true)
    })

    it('should not find content that does not exist', async () => {
      const view = await HtmlView.parse('<div id="root"><p>Hello World</p></div>')
      expect(view.hasContent('Goodbye')).toBe(false)
      expect(view.hasContent('Not here')).toBe(false)
    })

    it('should find content by ID selector', async () => {
      const view = await HtmlView.parse('<div id="root"><div id="container">Content</div></div>')
      expect(view.hasContent('#container')).toBe(true)
      expect(view.hasContent('#nonexistent')).toBe(false)
    })

    it('should find content by single class selector', async () => {
      const view = await HtmlView.parse('<div id="root"><div class="foo bar">Content</div></div>')
      expect(view.hasContent('.foo')).toBe(true)
      expect(view.hasContent('.bar')).toBe(true)
      expect(view.hasContent('.baz')).toBe(false)
    })

    it('should find content by multiple class selector', async () => {
      const view = await HtmlView.parse('<div id="root"><div class="foo bar baz">Content</div></div>')
      expect(view.hasContent('.foo.bar')).toBe(true)
      expect(view.hasContent('.bar.baz')).toBe(true)
      expect(view.hasContent('.foo.baz')).toBe(true)
      expect(view.hasContent('.foo.bar.baz')).toBe(true)
      expect(view.hasContent('.foo.qux')).toBe(false)
    })

    it('should find content in nested elements', async () => {
      const view = await HtmlView.parse('<div id="root"><div><span>Nested content</span></div></div>')
      expect(view.hasContent('Nested content')).toBe(true)
      expect(view.hasContent('Nested')).toBe(true)
      expect(view.hasContent('content')).toBe(true)
    })

    it('should find content by ID in nested elements', async () => {
      const html = `
        <div id="root">
          <div id="outer">
            <div id="inner">Content</div>
          </div>
        </div>
      `
      const view = await HtmlView.parse(html)
      expect(view.hasContent('#outer')).toBe(true)
      expect(view.hasContent('#inner')).toBe(true)
      expect(view.hasContent('#nonexistent')).toBe(false)
    })

    it('should find content by class in nested elements', async () => {
      const html = `
        <div id="root">
          <div class="outer">
            <div class="inner">Content</div>
          </div>
        </div>
      `
      const view = await HtmlView.parse(html)
      expect(view.hasContent('.outer')).toBe(true)
      expect(view.hasContent('.inner')).toBe(true)
      expect(view.hasContent('.outer.inner')).toBe(false) // This checks if an element has both classes
    })

    it('should find content in multiple siblings', async () => {
      const view = await HtmlView.parse('<div id="root"><p>First</p><p>Second</p><p>Third</p></div>')
      expect(view.hasContent('First')).toBe(true)
      expect(view.hasContent('Second')).toBe(true)
      expect(view.hasContent('Third')).toBe(true)
      expect(view.hasContent('Fourth')).toBe(false)
    })

    it('should handle case-sensitive content search', async () => {
      const view = await HtmlView.parse('<div id="root"><p>Hello World</p></div>')
      expect(view.hasContent('Hello')).toBe(true)
      expect(view.hasContent('hello')).toBe(false) // Case sensitive
      expect(view.hasContent('World')).toBe(true)
      expect(view.hasContent('world')).toBe(false) // Case sensitive
    })

    it('should handle partial content matches', async () => {
      const view = await HtmlView.parse('<div id="root"><p>Hello World</p></div>')
      expect(view.hasContent('ello')).toBe(true) // Partial match
      expect(view.hasContent('lo Wo')).toBe(true) // Partial match
    })

    it('should handle empty content search', async () => {
      const view = await HtmlView.parse('<div id="root"><p>Hello</p></div>')
      // Empty string matches any element with content (since every string includes empty string)
      expect(view.hasContent('')).toBe(true)
      const emptyView = await HtmlView.parse('<div id="root"><div></div></div>')
      expect(emptyView.hasContent('')).toBe(false) // No content, so empty string doesn't match
    })

    it('should handle elements without content', async () => {
      const view = await HtmlView.parse('<div id="root"><div id="empty"></div></div>')
      expect(view.hasContent('#empty')).toBe(true) // ID exists
      expect(view.hasContent('some text')).toBe(false) // No content
    })

    it('should handle complex nested structure with multiple search types', async () => {
      const html = `
        <div id="root">
          <header id="header" class="site-header">
            <nav class="nav">
              <a href="/">Home</a>
            </nav>
          </header>
          <main id="content" class="main">
            <article class="post">
              <h1>Title</h1>
              <p>Body text</p>
            </article>
          </main>
        </div>
      `
      const view = await HtmlView.parse(html)
      // Test ID search
      expect(view.hasContent('#header')).toBe(true)
      expect(view.hasContent('#content')).toBe(true)
      // Test class search
      expect(view.hasContent('.site-header')).toBe(true)
      expect(view.hasContent('.nav')).toBe(true)
      expect(view.hasContent('.main')).toBe(true)
      expect(view.hasContent('.post')).toBe(true)
      // Test content search
      expect(view.hasContent('Home')).toBe(true)
      expect(view.hasContent('Title')).toBe(true)
      expect(view.hasContent('Body text')).toBe(true)
      // Test non-existent
      expect(view.hasContent('#footer')).toBe(false)
      expect(view.hasContent('.sidebar')).toBe(false)
      expect(view.hasContent('Not found')).toBe(false)
    })

    it('should handle ID selector without hash', async () => {
      const view = await HtmlView.parse('<div id="root"><div id="container">Content</div></div>')
      expect(view.hasContent('container')).toBe(false) // Without #, it searches content
      expect(view.hasContent('Content')).toBe(true) // This matches content
    })

    it('should handle class selector with multiple dots', async () => {
      const view = await HtmlView.parse('<div id="root"><div class="foo bar baz">Content</div></div>')
      expect(view.hasContent('.foo.bar.baz')).toBe(true)
      expect(view.hasContent('...foo')).toBe(false) // Invalid format
    })
  })

  describe('hasNoContent', () => {
    it('should throw error if view is not parsed', () => {
      const view = HtmlView.create('<div id="root"><p>Hello</p></div>')
      expect(() => view.hasNoContent('Hello')).toThrow('HtmlView not parsed')
    })

    it('should return true when content does not exist', async () => {
      const view = await HtmlView.parse('<div id="root"><p>Hello World</p></div>')
      expect(view.hasNoContent('Goodbye')).toBe(true)
      expect(view.hasNoContent('Not here')).toBe(true)
    })

    it('should return false when content exists', async () => {
      const view = await HtmlView.parse('<div id="root"><p>Hello World</p></div>')
      expect(view.hasNoContent('Hello')).toBe(false)
      expect(view.hasNoContent('World')).toBe(false)
    })

    it('should work with ID selector', async () => {
      const view = await HtmlView.parse('<div id="root"><div id="container">Content</div></div>')
      expect(view.hasNoContent('#container')).toBe(false)
      expect(view.hasNoContent('#nonexistent')).toBe(true)
    })

    it('should work with class selector', async () => {
      const view = await HtmlView.parse('<div id="root"><div class="foo bar">Content</div></div>')
      expect(view.hasNoContent('.foo')).toBe(false)
      expect(view.hasNoContent('.baz')).toBe(true)
    })

    it('should be the inverse of hasContent', async () => {
      const view = await HtmlView.parse('<div id="root"><p id="test" class="foo">Hello</p></div>')
      expect(view.hasNoContent('Hello')).toBe(!view.hasContent('Hello'))
      expect(view.hasNoContent('#test')).toBe(!view.hasContent('#test'))
      expect(view.hasNoContent('.foo')).toBe(!view.hasContent('.foo'))
      expect(view.hasNoContent('Goodbye')).toBe(!view.hasContent('Goodbye'))
    })
  })
})
