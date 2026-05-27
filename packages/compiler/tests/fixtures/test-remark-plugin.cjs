function testRemarkPlugin() {
  return function transformer(tree) {
    tree.children.unshift({
      type: 'paragraph',
      children: [{ type: 'text', value: 'REMARK_PLUGIN_RAN' }],
    })
  }
}

module.exports = testRemarkPlugin
