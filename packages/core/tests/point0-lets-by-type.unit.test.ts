import { describe, expect, expectTypeOf, it } from 'bun:test'
import { Point0 } from '../src/point0.js'

describe('the declaration location — _fsLocation', () => {
  // the lock against wrapper drift: `lets` rides a Proxy (an apply-trap frame with NO source — Bun prints it as
  // `at unknown`), and a stale fixed stack depth once silently stripped the file location from every point error.
  // Declaring points HERE and asserting THIS file's path is what catches the next wrapper change.
  it('static and instance lets stamp the CALLER file, and toStringWithLocation carries it', () => {
    const root = Point0.lets('root', 'locRoot').root()
    const child = root.lets('query', 'locQuery')
    expect(root.point._fsLocation?.path).toEndWith('point0-lets-by-type.unit.test.ts')
    expect(child.point._fsLocation?.path).toEndWith('point0-lets-by-type.unit.test.ts')
    expect(child.point._fsLocation!.line).toBeGreaterThan(0)
    expect(child.point.toStringWithLocation()).toContain('point0-lets-by-type.unit.test.ts')
  })
})

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
