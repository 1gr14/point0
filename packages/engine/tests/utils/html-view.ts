export type HtmlTreeItem = {
  classNames: string[]
  id: string | undefined
  tag: string
  content: string | undefined
  children: HtmlTreeItem[]
}

export type HtmlTree = HtmlTreeItem[]

export class HtmlView<TParsed extends boolean = any> {
  html: string
  tree: TParsed extends true ? HtmlTree : undefined
  preview: TParsed extends true ? string : undefined
  timestamp: number
  parsed: TParsed extends true ? true : false

  private constructor({ html }: { html: string }) {
    this.html = html
    this.tree = undefined as TParsed extends true ? HtmlTree : undefined
    this.preview = undefined as TParsed extends true ? string : undefined
    this.timestamp = Date.now()
    this.parsed = false as TParsed extends true ? true : false
  }

  static create(html: string): HtmlView<false> {
    return new HtmlView({ html })
  }

  static async parse(html: string | HtmlView): Promise<HtmlView<true>> {
    if (html instanceof HtmlView) {
      return await html.parse()
    }
    const instance = new HtmlView({ html })
    await instance.parse()
    return instance
  }

  static async parseMany(htmls: string[] | HtmlView[]): Promise<Array<HtmlView<true>>> {
    return await Promise.all(htmls.map(async (h) => await HtmlView.parse(h)))
  }

  async parse(): Promise<HtmlView<true>> {
    if (this.parsed) {
      return this as HtmlView<true>
    }
    this.tree = (await HtmlView.htmlToTree(this.html)) as TParsed extends true ? HtmlTree : undefined
    this.preview = (await HtmlView.htmlToPreview(this.html)) as TParsed extends true ? string : undefined
    this.parsed = true as TParsed extends true ? true : false
    return this as HtmlView<true>
  }

  hasContent(search: string): boolean {
    if (!this.tree) {
      throw new Error('HtmlView not parsed')
    }
    return HtmlView.searchTree(this.tree, search)
  }

  hasNoContent(search: string): boolean {
    return !this.hasContent(search)
  }

  private static searchTree(tree: HtmlTree, search: string): boolean {
    for (const item of tree) {
      if (HtmlView.isTreeItemSuitableForContent(item, search)) return true
      if (HtmlView.searchTree(item.children, search)) return true
    }
    return false
  }

  private static isTreeItemSuitableForContent(item: HtmlTreeItem, search: string): boolean {
    // starts with # check id
    // starts with . check classNames
    // else check content
    if (search.startsWith('#')) {
      const id = search.slice(1)
      return item.id === id
    }
    if (search.startsWith('.')) {
      const classNames = search.slice(1).split('.')
      return classNames.every((className) => item.classNames.includes(className))
    }
    return !!item.content?.includes(search)
  }

  private static async htmlToTree(html: string): Promise<HtmlTree> {
    let root = null as HtmlTreeItem | null
    const stack: HtmlTreeItem[] = []
    let insideRoot = false

    const rewriter = new HTMLRewriter()
      .on('div#root', {
        element(el) {
          insideRoot = true
          root = HtmlView.buildTreeItem(el)
          stack.push(root)
          el.onEndTag(() => {
            insideRoot = false
            stack.pop()
          })
        },
      })
      .on('*', {
        element(el) {
          if (!insideRoot || !stack.length) return
          // Skip the root element itself
          if (el.getAttribute('id') === 'root' && el.tagName === 'div') return

          const node = HtmlView.buildTreeItem(el)

          const parent = stack[stack.length - 1]
          parent.children.push(node)

          // Only push to stack and set up end tag handler if element can have content
          // Self-closing/void elements don't have end tags
          if (el.canHaveContent) {
            stack.push(node)
            el.onEndTag(() => {
              if (!insideRoot || !stack.length) return
              // Pop the current element from stack (but keep root in stack)
              if (stack.length > 1) {
                stack.pop()
              }
            })
          }
        },
        text(t) {
          if (!insideRoot || !stack.length) return
          const text = t.text.trim()
          if (!text) return

          const current = stack[stack.length - 1]
          // Append text to content, or create content if it doesn't exist
          if (current.content) {
            current.content += text
          } else {
            current.content = text
          }
        },
      })

    const response = rewriter.transform(new Response(html))
    await response.text()
    if (!root) {
      return []
    }

    return root.children
  }

  private static formatTreeItemToString(item: HtmlTreeItem, indent = 0): string {
    const indentStr = '  '.repeat(indent)

    // Build the key: #id, .class1.class2, or tag
    let key: string
    if (item.id) {
      key = `#${item.id}`
    } else if (item.classNames.length > 0) {
      key = `.${item.classNames.join('.')}`
    } else {
      key = item.tag
    }

    // Format content
    const content = item.content || ''
    const contentStr = content ? `: ${content}` : ':'

    // If there are children, format with nested structure
    if (item.children.length > 0) {
      const lines: string[] = []
      lines.push(`${indentStr}${key}${contentStr}`)
      // Children are indented directly under parent (no "children:" key)
      // indent is in 2-space units, so +1 means 2 more spaces
      for (const child of item.children) {
        lines.push(HtmlView.formatTreeItemToString(child, indent + 1))
      }
      return lines.join('\n')
    }

    // Simple case: just key: content
    return `${indentStr}${key}${contentStr}`
  }

  private static async htmlToPreview(html: string): Promise<string> {
    const tree = await HtmlView.htmlToTree(html)
    const lines = tree.map((item) => HtmlView.formatTreeItemToString(item, 0))
    return lines.join('\n') + '\n'
  }

  private static buildTreeItem(el: HTMLRewriterTypes.Element): HtmlTreeItem {
    const tag = el.tagName.toLowerCase()
    const id = el.getAttribute('id') || undefined
    const cls = el.getAttribute('class')
    const classNames = cls ? cls.split(/\s+/).filter((c) => c) : []

    return {
      tag,
      id,
      classNames,
      children: [],
      content: undefined,
    }
  }
}
