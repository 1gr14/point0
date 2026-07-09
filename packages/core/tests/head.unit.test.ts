import { describe, expect, it } from 'bun:test'
import { _splitHead, type HeadObject } from '../src/head.js'
import { Point0 } from '../src/point0.js'

describe('head', () => {
  describe('_splitHead', () => {
    it('handles string as title', () => {
      expect(_splitHead('Home')).toEqual({ head: { title: 'Home' }, seoMeta: {} })
    })

    it('handles empty and nullish input', () => {
      expect(_splitHead(undefined)).toEqual({ head: {}, seoMeta: {} })
      expect(_splitHead({})).toEqual({ head: {}, seoMeta: {} })
    })

    it('splits flat seo meta keys from head keys', () => {
      const { head, seoMeta } = _splitHead({
        title: 'Home',
        titleTemplate: '%s — App',
        description: 'My description',
        ogImage: { url: 'https://example.com/og.png', width: 1200 },
        robots: { index: true, follow: true },
        meta: [{ name: 'theme-color', content: '#fff' }],
        link: [{ rel: 'icon', href: '/favicon.ico' }],
        htmlAttrs: { lang: 'en' },
      })
      expect(head).toEqual({
        title: 'Home',
        titleTemplate: '%s — App',
        meta: [{ name: 'theme-color', content: '#fff' }],
        link: [{ rel: 'icon', href: '/favicon.ico' }],
        htmlAttrs: { lang: 'en' },
      })
      expect(seoMeta).toEqual({
        description: 'My description',
        ogImage: { url: 'https://example.com/og.png', width: 1200 },
        robots: { index: true, follow: true },
      })
    })

    it('drops undefined values', () => {
      expect(_splitHead({ title: 'Home', description: undefined })).toEqual({
        head: { title: 'Home' },
        seoMeta: {},
      })
    })

    it('turns canonical into a link tag', () => {
      expect(_splitHead({ canonical: 'https://example.com/home' })).toEqual({
        head: { link: [{ rel: 'canonical', href: 'https://example.com/home' }] },
        seoMeta: {},
      })
    })

    it('appends canonical to an existing link array', () => {
      const { head } = _splitHead({
        canonical: 'https://example.com/home',
        link: [{ rel: 'icon', href: '/favicon.ico' }],
      })
      expect(head.link).toEqual([
        { rel: 'icon', href: '/favicon.ico' },
        { rel: 'canonical', href: 'https://example.com/home' },
      ])
    })

    it('appends canonical to a resolvable link array', () => {
      const { head } = _splitHead({
        canonical: 'https://example.com/home',
        link: () => [{ rel: 'icon' as const, href: '/favicon.ico' }],
      })
      expect(typeof head.link).toBe('function')
      expect((head.link as () => unknown)()).toEqual([
        { rel: 'icon', href: '/favicon.ico' },
        { rel: 'canonical', href: 'https://example.com/home' },
      ])
    })
  })

  it('HeadObject type is accepted by .head()', () => {
    // Type-level only — the function is never called, tsc checks the body.
    const _headTypeChecks = () => {
      const root = Point0.lets('root', 'app').root()
      root.lets('page', 'home', '/').head({
        title: 'Home',
        description: 'My description',
        ogTitle: 'OG Home',
        twitterCard: 'summary_large_image',
        canonical: 'https://example.com/home',
        meta: [{ name: 'theme-color', content: '#fff' }],
      })
      root.lets('page', 'home', '/').head(() => ({ description: 'My description' }))
      root.lets('page', 'home', '/').head('global', () => ({ description: 'My description' }))
      // @ts-expect-error — unknown head key
      root.lets('page', 'home', '/').head({ descriptio: 'typo' })
      const headObject: HeadObject = { title: 'Home', description: 'My description' }
      void headObject
    }
    void _headTypeChecks
    expect(true).toBe(true)
  })
})
