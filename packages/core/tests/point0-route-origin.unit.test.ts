import { describe, expect, it } from 'bun:test'
import { Route0 } from '@1gr14/route0'
import React from 'react'
import { Point0 } from '../src/point0.js'

const getFC = () => () => React.createElement('div', { children: 'X' })

// On the server there is no globalThis.location, so route0's origin fallback yields undefined and
// route.abs() throws. The root's serverUrl must flow into every point's public route as its origin.
describe('point route absorbs serverUrl as origin', () => {
  const serverUrl = 'https://example.com'

  it('action route built from a string takes serverUrl as origin', () => {
    const root = Point0.lets('root', 'app').serverUrl(serverUrl).root()
    const action = root.lets('action', 'archive', 'GET', '/api/github/archive').action(() => new Response('ok'))
    expect(action.route.origin).toBe(serverUrl)
    expect(action.route.abs({ '?': { repo: 'start0', format: 'zip' } })).toBe(
      'https://example.com/api/github/archive?repo=start0&format=zip',
    )
  })

  it('page route built from a string takes serverUrl as origin', () => {
    const root = Point0.lets('root', 'app').serverUrl(serverUrl).root()
    const page = root.lets('page', 'idea', '/idea/:id').page(getFC())
    expect(page.route.abs({ id: '1' })).toBe('https://example.com/idea/1')
  })

  it('page route extended from a layout route keeps the origin', () => {
    const root = Point0.lets('root', 'app').serverUrl(serverUrl).root()
    const layout = root.lets('layout', 'docs', '/docs').layout(getFC()).point
    const page = layout.lets('page', 'doc', '/:slug').page(getFC())
    expect(page.route.abs({ slug: 'intro' })).toBe('https://example.com/docs/intro')
  })

  it('route passed as an object keeps its own explicit origin', () => {
    const root = Point0.lets('root', 'app').serverUrl(serverUrl).root()
    const ownRoute = Route0.create('/custom', { origin: 'https://other.com' })
    const page = root.lets('page', 'custom', ownRoute).page(getFC())
    expect(page.route.abs()).toBe('https://other.com/custom')
  })

  it('route passed as an object without origin gets serverUrl filled in, original stays untouched', () => {
    const root = Point0.lets('root', 'app').serverUrl(serverUrl).root()
    const ownRoute = Route0.create('/custom')
    const page = root.lets('page', 'custom', ownRoute).page(getFC())
    expect(page.route.abs()).toBe('https://example.com/custom')
    expect(() => ownRoute.origin).toThrow()
  })

  it('without serverUrl the route still has no origin on the server', () => {
    const root = Point0.lets('root', 'app').root()
    const action = root.lets('action', 'x', 'GET', '/api/x').action(() => new Response('ok'))
    expect(() => action.route.abs()).toThrow('origin for route /api/x is not set')
  })
})

// when the web pages live on a different origin than the api (dev split ports, native shells, a CDN front),
// clientUrl picks the page origin — by route kind, not by runtime side, so ssr and client render the same hrefs
describe('clientUrl splits page origin from action origin', () => {
  const serverUrl = 'https://api.example.com'
  const clientUrl = 'https://example.com'

  it('pages and layouts resolve against clientUrl, actions stay on serverUrl', () => {
    const root = Point0.lets('root', 'app').serverUrl(serverUrl).clientUrl(clientUrl).root()
    const page = root.lets('page', 'idea', '/idea/:id').page(getFC())
    const action = root.lets('action', 'archive', 'GET', '/api/github/archive').action(() => new Response('ok'))
    expect(page.route.abs({ id: '1' })).toBe('https://example.com/idea/1')
    expect(action.route.abs()).toBe('https://api.example.com/api/github/archive')
  })

  it('page extended from a layout keeps the clientUrl origin', () => {
    const root = Point0.lets('root', 'app').serverUrl(serverUrl).clientUrl(clientUrl).root()
    const layout = root.lets('layout', 'docs', '/docs').layout(getFC()).point
    const page = layout.lets('page', 'doc', '/:slug').page(getFC())
    expect(page.route.abs({ slug: 'intro' })).toBe('https://example.com/docs/intro')
  })

  it('without clientUrl pages fall back to serverUrl', () => {
    const root = Point0.lets('root', 'app').serverUrl(serverUrl).root()
    const page = root.lets('page', 'idea', '/idea').page(getFC())
    expect(page.route.abs()).toBe('https://api.example.com/idea')
  })

  it('endpoint routes always point at serverUrl, even when the public page route uses clientUrl', () => {
    const root = Point0.lets('root', 'app').serverUrl(serverUrl).clientUrl(clientUrl).root()
    const page = root
      .lets('page', 'idea', '/idea/:id')
      .loader(async () => ({ ok: true }))
      .page(getFC())
    const query = root
      .lets('query', 'list')
      .loader(async () => ({ ok: true }))
      .query()
    const queryPoint = query as unknown as { _endpoint?: { route: { origin: string } } }
    expect(page.route.origin).toBe(clientUrl)
    expect(page.point._endpoint?.route.origin).toBe(serverUrl)
    expect(queryPoint._endpoint?.route.origin).toBe(serverUrl)
  })

  it('a root derived from a root can set its own clientUrl', () => {
    const root = Point0.lets('root', 'app').serverUrl(serverUrl).clientUrl(clientUrl).root()
    const mobileRoot = root.lets('root', 'mobile').clientUrl('https://m.example.com').root()
    const page = mobileRoot.lets('page', 'idea', '/idea').page(getFC())
    const action = mobileRoot.lets('action', 'x', 'GET', '/api/x').action(() => new Response('ok'))
    expect(page.route.abs()).toBe('https://m.example.com/idea')
    expect(action.route.abs()).toBe('https://api.example.com/api/x')
  })
})
