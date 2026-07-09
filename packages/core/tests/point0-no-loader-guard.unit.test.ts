import { describe, expect, it } from 'bun:test'
import { Point0 } from '../src/point0.js'

// Runtime backstop for the type-level "Point has no loaders" guard: every query surface on a
// point with neither `.loader()` nor `.clientLoader()` throws the same error. Types already
// forbid these calls (`.query()` / `.with()` / the hooks are ShowError'd away), so the casts
// below reproduce a plain-JS bypass — the hooks throw BEFORE any React hook runs, so calling
// them outside a component is safe here.
describe('Point0 no-loader runtime guard', () => {
  const loaderless = Point0.lets('root', 'app') as any

  it('useQuery throws', () => {
    expect(() => loaderless.useQuery(undefined)).toThrow('No loader found on point')
  })

  it('useInfiniteQuery throws', () => {
    expect(() => loaderless.useInfiniteQuery(undefined)).toThrow('No loader found on point')
  })

  it('useSuspenseQuery throws', () => {
    expect(() => loaderless.useSuspenseQuery(undefined)).toThrow('No loader found on point')
  })

  it('useSuspenseInfiniteQuery throws', () => {
    expect(() => loaderless.useSuspenseInfiniteQuery(undefined)).toThrow('No loader found on point')
  })

  it('getQueryKey throws', () => {
    expect(() => loaderless.getQueryKey(undefined)).toThrow('No loader found on point')
  })
})
