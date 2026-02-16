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
    // also, if : is present, check content after L
    const { selector, content, negative } = (() => {
      let negative = false as boolean
      let selector = undefined as string | undefined
      let content = undefined as string | undefined
      let srch = search
      if (srch.startsWith('!')) {
        negative = true
        srch = srch.slice(1)
      }
      if (!srch.includes(':')) {
        if (srch.startsWith('#') || srch.startsWith('.')) {
          selector = srch
        } else {
          content = srch
        }
      } else {
        const pair = srch.split(':')
        selector = pair[0]
        content = pair[1]
      }
      return { negative, selector, content }
    })()
    const foundBySelector = (() => {
      if (selector === undefined) {
        return true
      }
      if (selector.startsWith('#')) {
        const id = selector.slice(1)
        return item.id === id
      }
      if (selector.startsWith('.')) {
        const classNames = selector.slice(1).split('.')
        return classNames.every((className) => item.classNames.includes(className))
      }
      throw new Error(`Invalid selector: ${selector}`)
    })()
    if (content === undefined) {
      const result = foundBySelector
      return negative ? !result : result
    }
    if (content === '') {
      // Empty content means element has no content and no children
      const hasEmptyContent = item.content === '' || (item.content === undefined && item.children.length === 0)
      const result = foundBySelector && hasEmptyContent
      return negative ? !result : result
    }
    // Both selector and content must match
    const foundByContent = !!item.content?.includes(content)
    const result = foundBySelector && foundByContent
    return negative ? !result : result
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

          // If parent has content but no element children yet, convert content to TEXT child
          // Only if content is not whitespace-only
          if (parent.content?.trim() && parent.children.length === 0) {
            parent.children.push({
              tag: 'text',
              id: undefined,
              classNames: [],
              content: parent.content,
              children: [],
            })
            parent.content = undefined
          }

          parent.children.push(node)

          // Only push to stack and set up end tag handler if element can have content
          // Self-closing/void elements don't have end tags
          if (el.canHaveContent) {
            stack.push(node)
            el.onEndTag(() => {
              if (!insideRoot || !stack.length) return
              // Trim the final content to remove leading/trailing whitespace
              // but preserve spaces between text nodes
              const current = stack[stack.length - 1]
              if (current.content !== undefined) {
                const trimmed = current.content.trim()
                // If element has element children, convert remaining content to TEXT child
                if (current.children.length > 0 && trimmed) {
                  current.children.push({
                    tag: 'text',
                    id: undefined,
                    classNames: [],
                    content: trimmed,
                    children: [],
                  })
                  current.content = undefined
                } else {
                  current.content = trimmed || undefined
                }
              }
              // Pop the current element from stack (but keep root in stack)
              if (stack.length > 1) {
                stack.pop()
              }
            })
          }
        },
        text(t) {
          if (!insideRoot || !stack.length) return
          // Don't trim individual chunks - preserve spaces between text nodes
          // We'll trim the final result when the element closes
          const text = t.text
          // Skip empty text chunks (but keep spaces)
          if (!text) return

          const current = stack[stack.length - 1]

          // If the element already has element children, create a TEXT child node
          // Otherwise, add to content
          const hasElementChildren = current.children.length > 0

          if (hasElementChildren) {
            // Skip whitespace-only text nodes when there are element children
            const trimmedText = text.trim()
            if (!trimmedText) return

            // Find or create the last TEXT child node
            const lastChild = current.children[current.children.length - 1]
            if (lastChild.tag === 'text') {
              // Append to existing TEXT node
              if (lastChild.content) {
                lastChild.content += text
              } else {
                lastChild.content = text
              }
            } else {
              // Create a new TEXT child node
              current.children.push({
                tag: 'text',
                id: undefined,
                classNames: [],
                content: text,
                children: [],
              })
            }
          } else {
            // No element children yet, add to content
            if (current.content) {
              current.content += text
            } else {
              current.content = text
            }
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
    // Special handling for TEXT nodes
    let key: string
    if (item.tag === 'text') {
      key = 'text'
    } else if (item.id) {
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
    const result = lines.join('\n') || '(Empty)'
    return '\n' + result + '\n'
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
