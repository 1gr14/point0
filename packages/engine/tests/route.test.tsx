import { Point0 } from '@point0/core'
// import '@testing-library/jest-dom'
import { Route0 } from '@devp0nt/route0'
import { describe, expect, expectTypeOf, it } from 'bun:test'

describe('route', () => {
  const root = Point0.lets('root', 'root').root()

  it('page route default to page name with /', async () => {
    const page = root.lets('page', 'test').page()
    expect(page.route()).toBe('/test')
    expectTypeOf<(typeof page)['Infer']['RouteDefinition']>().toEqualTypeOf<'/test'>()
  })

  it('page route can be defined in third arg of lets without / (and we add it)', async () => {
    const page = root.lets('page', 'test', 'shmest').page()
    expect(page.route()).toBe('/shmest')
    expectTypeOf<(typeof page)['Infer']['RouteDefinition']>().toEqualTypeOf<'/shmest'>()
  })

  it('page route can be defined in third arg of lets with /', async () => {
    const page = root.lets('page', 'test', '/shmest').page()
    expect(page.route()).toBe('/shmest')
    expectTypeOf<(typeof page)['Infer']['RouteDefinition']>().toEqualTypeOf<'/shmest'>()
  })

  it('page route can be defined in third arg of lets as route without / (and we will keep it as is)', async () => {
    const page = root.lets('page', 'test', Route0.create('shmest')).page()
    expect(page.route()).toBe('/shmest')
    expectTypeOf<(typeof page)['Infer']['RouteDefinition']>().toEqualTypeOf<'/shmest'>()
  })

  it('page route can be defined in third arg of lets as route with /', async () => {
    const page = root.lets('page', 'test', Route0.create('/shmest')).page()
    expect(page.route()).toBe('/shmest')
    expectTypeOf<(typeof page)['Infer']['RouteDefinition']>().toEqualTypeOf<'/shmest'>()
  })

  it('layout route default to /', async () => {
    const layout = root.lets('layout', 'test').layout()
    expect(layout.route()).toBe('/')
    expectTypeOf<(typeof layout)['Infer']['RouteDefinition']>().toEqualTypeOf<'/'>()
  })

  it('layout route can be defined in third arg of lets without /', async () => {
    const layout = root.lets('layout', 'test', 'shmest').layout()
    expect(layout.route()).toBe('/shmest')
    expectTypeOf<(typeof layout)['Infer']['RouteDefinition']>().toEqualTypeOf<'/shmest'>()
  })

  it('layout route can be defined in third arg of lets with /', async () => {
    const layout = root.lets('layout', 'test', '/shmest').layout()
    expect(layout.route()).toBe('/shmest')
    expectTypeOf<(typeof layout)['Infer']['RouteDefinition']>().toEqualTypeOf<'/shmest'>()
  })

  it('layout route can be defined in third arg of lets as route without / (and we will keep it as is)', async () => {
    const layout = root.lets('layout', 'test', Route0.create('shmest')).layout()
    expect(layout.route()).toBe('/shmest')
    expectTypeOf<(typeof layout)['Infer']['RouteDefinition']>().toEqualTypeOf<'/shmest'>()
  })

  it('layout route can be defined in third arg of lets as route with /', async () => {
    const layout = root.lets('layout', 'test', Route0.create('/shmest')).layout()
    expect(layout.route()).toBe('/shmest')
    expectTypeOf<(typeof layout)['Infer']['RouteDefinition']>().toEqualTypeOf<'/shmest'>()
  })

  it('page route can be extended from / layout route', async () => {
    const layout = root.lets('layout', 'test').layout()
    const page = layout.lets('page', 'test').page()
    expect(page.route()).toBe('/test')
    expectTypeOf<(typeof page)['Infer']['RouteDefinition']>().toEqualTypeOf<'/test'>()
  })

  it('page route can be extended from /some layout route', async () => {
    const layout = root.lets('layout', 'test', '/some').layout()
    const page = layout.lets('page', 'test').page()
    expect(page.route()).toBe('/some/test')
    expectTypeOf<(typeof page)['Infer']['RouteDefinition']>().toEqualTypeOf<'/some/test'>()
  })

  it('page route can be extended from /some/:id layout route', async () => {
    const layout = root.lets('layout', 'test', '/some/:id').layout()
    const page = layout.lets('page', 'test').page()
    expect(page.route({ id: 123 })).toBe('/some/123/test')
    expectTypeOf<(typeof page)['Infer']['RouteDefinition']>().toEqualTypeOf<'/some/:id/test'>()
  })

  it('page route can be extended /:sn from /some/:id layout route', async () => {
    const layout = root.lets('layout', 'test', '/some/:id').layout()
    const page = layout.lets('page', 'test', '/:sn/test').page()
    expect(page.route({ id: 123, sn: 456 })).toBe('/some/123/456/test')
    expectTypeOf<(typeof page)['Infer']['RouteDefinition']>().toEqualTypeOf<'/some/:id/:sn/test'>()
  })

  it('layout route can be extended from / layout route', async () => {
    const layout = root.lets('layout', 'test').layout()
    const layout2 = layout.lets('layout', 'test2').layout()
    expect(layout2.route()).toBe('/')
    expectTypeOf<(typeof layout2)['Infer']['RouteDefinition']>().toEqualTypeOf<'/'>()
  })

  it('layout route can be extended from /some layout route', async () => {
    const layout = root.lets('layout', 'test', '/some').layout()
    const layout2 = layout.lets('layout', 'test2').layout()
    expect(layout2.route()).toBe('/some')
    expectTypeOf<(typeof layout2)['Infer']['RouteDefinition']>().toEqualTypeOf<'/some'>()
  })

  it('layout route can be extended from /some/:id layout route', async () => {
    const layout = root.lets('layout', 'test', '/some/:id').layout()
    const layout2 = layout.lets('layout', 'test2').layout()
    expect(layout2.route({ id: 123 })).toBe('/some/123')
    expectTypeOf<(typeof layout2)['Infer']['RouteDefinition']>().toEqualTypeOf<'/some/:id'>()
  })

  it('layout route can be extended /:sn from /some/:id layout route', async () => {
    const layout = root.lets('layout', 'test', '/some/:id').layout()
    const layout2 = layout.lets('layout', 'test2', '/:sn/test2').layout()
    expect(layout2.route({ id: 123, sn: 456 })).toBe('/some/123/456/test2')
    expectTypeOf<(typeof layout2)['Infer']['RouteDefinition']>().toEqualTypeOf<'/some/:id/:sn/test2'>()
  })

  it('do not allow conflicted route by route', async () => {
    const root = Point0.lets('root', 'root').root()
    const layout = root.lets('layout', 'layout', '/:x').layout(({ children }) => {
      return <div>{children}</div>
    })
    // @ts-expect-error - it is bad
    layout.lets('page', 'test', Route0.create('/:y')).page()
  })

  it('baseurl path / is used to extend route', async () => {
    const root = Point0.lets('root', 'root').baseurl('/').root()
    const layout = root.lets('layout', 'layout', '/:x').layout(({ children }) => {
      return <div>{children}</div>
    })
    const page = layout.lets('page', 'test', '/:y').page()
    expect(page.route({ y: '123', x: '456' })).toBe('/456/123')
    expectTypeOf<(typeof page)['Infer']['RouteDefinition']>().toEqualTypeOf<'/:x/:y'>()
  })

  it('baseurl path /my/path is used to extend route', async () => {
    const root = Point0.lets('root', 'root').baseurl('/my/path').root()
    const layout = root.lets('layout', 'layout', '/:x').layout(({ children }) => {
      return <div>{children}</div>
    })
    const page = layout.lets('page', 'test', '/:y').page()
    expect(page.route({ y: '123', x: '456' })).toBe('/456/123')
    expectTypeOf<(typeof page)['Infer']['RouteDefinition']>().toEqualTypeOf<'/my/path/:x/:y'>()
  })

  it('baseurl path https://example.com is used to extend route', async () => {
    const root = Point0.lets('root', 'root').baseurl('https://example.com').root()
    const layout = root.lets('layout', 'layout', '/:x').layout(({ children }) => {
      return <div>{children}</div>
    })
    const page = layout.lets('page', 'test', '/:y').page()
    expect(page.route({ y: '123', x: '456' })).toBe('/456/123')
    expectTypeOf<(typeof page)['Infer']['RouteDefinition']>().toEqualTypeOf<'/:x/:y'>()
  })

  it('baseurl path https://example.com/my/path is used to extend route', async () => {
    const root = Point0.lets('root', 'root').baseurl('https://example.com/my/path').root()
    expectTypeOf<typeof root.Infer.RouteDefinition>().toEqualTypeOf<'/my/path'>()
    const layout = root.lets('layout', 'layout', '/:x').layout(({ children }) => {
      return <div>{children}</div>
    })
    const page = layout.lets('page', 'test', '/:y').page()
    expect(page.route({ y: '123', x: '456' })).toBe('/456/123')
    expectTypeOf<(typeof page)['Infer']['RouteDefinition']>().toEqualTypeOf<'/my/path/:x/:y'>()
  })

  it('baseurl path https://example.com with basepath my/path is used to extend route', async () => {
    const root = Point0.lets('root', 'root').baseurl('https://example.com', 'my/path').root()
    expectTypeOf<typeof root.Infer.RouteDefinition>().toEqualTypeOf<'/my/path'>()
    const layout = root.lets('layout', 'layout', '/:x').layout(({ children }) => {
      return <div>{children}</div>
    })
    const page = layout.lets('page', 'test', '/:y').page()
    expect(page.route({ y: '123', x: '456' })).toBe('/456/123')
    expectTypeOf<(typeof page)['Infer']['RouteDefinition']>().toEqualTypeOf<'/my/path/:x/:y'>()
  })
})
