import { describe, expect, it } from 'bun:test'
import { Point0 } from '../src/point0.js'

// Runtime backstop for the type-level `AssertNoForbiddenMethodsIfNotSuitableStage` guard: setup methods
// (the single loader, ctx, and every input schema) may only run while the point is still being composed
// (`coreStage`). The public `Nice*` projections already forbid this at the type level, so the casts below
// (`as any`) deliberately reproduce a raw `.point` / `as any` bypass — that is exactly what the runtime
// guard exists to catch. Points are declared at the top level, so a violation throws right at startup.
describe('Point0 setup-stage runtime guard', () => {
  it('moves to loadedStage after the loader', () => {
    const loaded = (Point0.lets('root', 'app') as any).loader(() => ({ a: 1 }))
    expect(loaded.type).toBe('loadedStage')
  })

  it('throws on a second loader', () => {
    const loaded = (Point0.lets('root', 'app') as any).loader(() => ({ a: 1 }))
    expect(() => loaded.loader(() => ({ b: 2 }))).toThrow('its setup stage is "loadedStage"')
  })

  it('throws on every setup method called after the loader', () => {
    const loaded = (Point0.lets('root', 'app') as any).loader(() => ({ a: 1 }))
    expect(() => loaded.ctx(() => ({}))).toThrow('can not call .ctx()')
    expect(() => loaded.clientLoader(() => ({}))).toThrow('can not call .clientLoader()')
    expect(() => loaded.input({})).toThrow('can not call .input()')
    expect(() => loaded.clientInput({})).toThrow('can not call .clientInput()')
    expect(() => loaded.sharedInput({})).toThrow('can not call .sharedInput()')
    expect(() => loaded.params({})).toThrow('can not call .params()')
    expect(() => loaded.search({})).toThrow('can not call .search()')
    expect(() => loaded.body({})).toThrow('can not call .body()')
    expect(() => loaded.headers({})).toThrow('can not call .headers()')
    expect(() => loaded.cookies({})).toThrow('can not call .cookies()')
  })

  it('throws on setup after the point is finalized (raw .point escape hatch)', () => {
    const root = Point0.lets('root', 'app').root()
    expect(() => (root.point as any).loader(() => ({}))).toThrow('its setup stage is "root"')
    expect(() => (root.point as any).ctx(() => ({}))).toThrow('its setup stage is "root"')
  })

  it('allows setup while still composing (coreStage)', () => {
    expect(() => (Point0.lets('root', 'app') as any).ctx(() => ({ x: 1 })).loader((c: any) => c.data)).not.toThrow()
  })
})
