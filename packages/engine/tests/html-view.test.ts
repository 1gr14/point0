import { describe, expect, it } from 'bun:test'
import { HtmlView } from './utils/html-view.js'

describe('html-viewer', () => {
  describe('tree', () => {
    it('should parse simple HTML structure', async () => {
      const html = '<div id="root"><p>Hello</p></div>'
      const { tree } = await HtmlView.create(html)
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
      const { tree } = await HtmlView.create(html)
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
      const { tree } = await HtmlView.create(html)
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
      const { tree } = await HtmlView.create(html)
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
      const { tree } = await HtmlView.create(html)
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
      const { tree } = await HtmlView.create(html)
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
      const { tree } = await HtmlView.create(html)
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
      const { tree } = await HtmlView.create(html)
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
      const { tree } = await HtmlView.create(html)
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
      const { tree } = await HtmlView.create(html)
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
      const { tree } = await HtmlView.create(html)
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
      const { tree } = await HtmlView.create(html)
      expect(tree).toEqual([])
    })

    it('should ignore elements outside of root', async () => {
      const html = '<div>Outside</div><div id="root"><p>Inside</p></div><div>Also outside</div>'
      const { tree } = await HtmlView.create(html)
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
      const { tree } = await HtmlView.create(html)
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
      const { tree } = await HtmlView.create(html)
      expect(tree).toMatchInlineSnapshot(`[]`)
    })

    it('should handle self-closing tags', async () => {
      const html = '<div id="root"><br/><hr/><img src="test.jpg"/></div>'
      const { tree } = await HtmlView.create(html)
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
      const { tree } = await HtmlView.create(html)
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
      const { preview } = await HtmlView.create(html)
      expect(preview).toMatchInlineSnapshot(`
      "p: Hello
      "
    `)
    })

    it('should convert HTML with IDs and classes to YAML', async () => {
      const html = '<div id="root"><div id="container" class="foo bar">Content</div></div>'
      const { preview } = await HtmlView.create(html)
      expect(preview).toMatchInlineSnapshot(
        `
        "#container: Content
        "
      `,
      )
    })

    it('should convert nested HTML structure to YAML', async () => {
      const html = '<div id="root"><div><span>Nested</span></div></div>'
      const { preview } = await HtmlView.create(html)
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
      const { preview } = await HtmlView.create(html)
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
      const { preview } = await HtmlView.create(html)
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
      const { preview } = await HtmlView.create(html)
      expect(preview).toMatchInlineSnapshot(`
      "
      "
    `)
    })

    it('should produce preview format with correct structure', async () => {
      const html = '<div id="root"><p id="test" class="foo bar">Hello World</p></div>'
      const { preview } = await HtmlView.create(html)

      // Verify the format structure (this is a preview format, not standard YAML)
      expect(preview).toContain('#test: Hello World')
      expect(preview).toContain('\n')
      expect(preview.trim().length).toBeGreaterThan(0)
    })
  })
})
