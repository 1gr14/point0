import { describe, expect, it } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { serverPoint0 } from './point0.js'
import { pages } from '../pages/index.js'

describe('Server SSR', () => {
  it('should render home page HTML', async () => {
    const html = await serverPoint0.renderStatic({
      path: '/',
      pages,
      renderer: renderToStaticMarkup,
      clientBundlePath: '/assets/main.js',
    })

    expect(html).toContain('<!doctype html>')
    expect(html).toContain('Welcome to IdeaNick')
    expect(html).toContain('Discover and share innovative ideas')
    expect(html).toContain('__PAGE0_PAYLOAD__')
    expect(html).toContain('/assets/main.js')
  })

  it('should render ideas list page HTML', async () => {
    const html = await serverPoint0.renderStatic({
      path: '/ideas',
      pages,
      renderer: renderToStaticMarkup,
      clientBundlePath: '/assets/main.js',
    })

    expect(html).toContain('<!doctype html>')
    expect(html).toContain('Ideas')
    expect(html).toContain('amazing ideas shared by our community')
    expect(html).toContain('__PAGE0_PAYLOAD__')
    expect(html).toContain('/assets/main.js')
  })

  it('should render individual idea page HTML', async () => {
    const html = await serverPoint0.renderStatic({
      path: '/ideas/1',
      pages,
      renderer: renderToStaticMarkup,
      clientBundlePath: '/assets/main.js',
    })

    expect(html).toContain('<!doctype html>')
    expect(html).toContain('AI-Powered Code Review Assistant')
    expect(html).toContain('An intelligent tool that automatically reviews code')
    expect(html).toContain('__PAGE0_PAYLOAD__')
    expect(html).toContain('/assets/main.js')
  })

  it('should handle 404 for non-existent idea', async () => {
    const html = await serverPoint0.renderStatic({
      path: '/ideas/999',
      pages,
      renderer: renderToStaticMarkup,
      clientBundlePath: '/assets/main.js',
    })

    expect(html).toContain('<!doctype html>')
    expect(html).toContain('__PAGE0_PAYLOAD__')
    expect(html).toContain('/assets/main.js')
  })

  it('should embed payload with correct data structure', async () => {
    const html = await serverPoint0.renderStatic({
      path: '/ideas/1',
      pages,
      renderer: renderToStaticMarkup,
      clientBundlePath: '/assets/main.js',
    })

    // Extract payload from HTML
    const payloadMatch = /<script id="__PAGE0_PAYLOAD__" type="application\/json">(.*?)<\/script>/.exec(html)
    expect(payloadMatch).toBeTruthy()

    if (payloadMatch) {
      const payload = JSON.parse(payloadMatch[1])
      expect(payload).toHaveProperty('location')
      expect(payload).toHaveProperty('data')
      expect(payload.location).toHaveProperty('href', '/ideas/1')
      expect(payload.data).toHaveProperty('idea')
      expect(payload.data.idea).toHaveProperty('id', 1)
      expect(payload.data.idea).toHaveProperty('title', 'AI-Powered Code Review Assistant')
    }
  })
})
