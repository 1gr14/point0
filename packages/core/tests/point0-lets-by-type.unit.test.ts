import { describe, expect, expectTypeOf, it } from 'bun:test'
import { Point0 } from '../src/point0.js'

describe('Point0 lets[type] runtime', () => {
  it('throws on static lets[type] usage without compiler', () => {
    expect(() => Point0.lets.root()).toThrow('lets[type] notation can not work without compiler, please use compiler')
    expect(() => Point0.lets.plugin()).toThrow('lets[type] notation can not work without compiler, please use compiler')
  })

  it('throws on instance lets[type] usage without compiler', () => {
    const root = Point0.lets('root', 'app').root()
    expect(() => root.lets.page('/idea/:id')).toThrow(
      'lets[type] notation can not work without compiler, please use compiler',
    )
    expect(() => root.lets.layout('/idea')).toThrow(
      'lets[type] notation can not work without compiler, please use compiler',
    )
    expect(() => root.lets.action('POST', '/idea')).toThrow(
      'lets[type] notation can not work without compiler, please use compiler',
    )
  })

  it('lets[type] exposes typed helpers', () => {
    const root = Point0.lets('root', 'app').root()
    expectTypeOf(Point0.lets.root).toBeFunction()
    expectTypeOf(root.lets.page).toBeFunction()
    expectTypeOf(root.lets.layout).toBeFunction()
    expectTypeOf(root.lets.action).toBeFunction()
  })
})
