import type { AnyLocation } from '@1gr14/route0'
import { describe, expect, it } from 'bun:test'
import { resolveNavigationTarget, resolveScrollToHashBehavior, resolveScrollToHashPolicy } from '../src/navigation.js'
import type { ScrollToHashPolicy, SetSearchHelper } from '../src/navigation.js'

describe('resolveNavigationTarget', () => {
  // The function only reads `href` (the absolute base) and `pathname` (the no-base fallback).
  const current = { href: 'https://app.test/ideas/list?page=2#top', pathname: '/ideas/list' } as AnyLocation

  it('resolves relative targets against the current page, like a browser resolves <a href>', () => {
    expect(resolveNavigationTarget('edit', current)).toBe('/ideas/edit')
    expect(resolveNavigationTarget('../x', current)).toBe('/x')
  })

  it('a bare #hash / ?query resolves in place (the hash keeps the current search)', () => {
    expect(resolveNavigationTarget('#faq', current)).toBe('/ideas/list?page=2#faq')
    expect(resolveNavigationTarget('?q=1', current)).toBe('/ideas/list?q=1')
  })

  it('root-relative and same-origin absolute targets become root-relative hrefs', () => {
    expect(resolveNavigationTarget('/about?x=1#y', current)).toBe('/about?x=1#y')
    expect(resolveNavigationTarget('https://app.test/about', current)).toBe('/about')
  })

  it('cross-origin targets keep the full href, so the external-navigation branch can hand off', () => {
    expect(resolveNavigationTarget('https://other.test/docs', current)).toBe('https://other.test/docs')
    expect(resolveNavigationTarget('mailto:a@b.c', current)).toBe('mailto:a@b.c')
  })

  it('an unparsable target passes through instead of crashing the navigation', () => {
    expect(resolveNavigationTarget('http://', current)).toBe('http://')
    expect(resolveNavigationTarget('https://exa mple.com/x', current)).toBe('https://exa mple.com/x')
  })

  it('without an absolute base (SSR, no origin) keeps the historical #hash handling, passes the rest through', () => {
    const bare = { pathname: '/a' } as AnyLocation
    expect(resolveNavigationTarget('#x', bare)).toBe('/a#x')
    expect(resolveNavigationTarget('edit', bare)).toBe('edit')
  })
})

describe('resolveScrollToHashPolicy', () => {
  it('maps each preset to its per-trigger behavior', () => {
    expect(resolveScrollToHashPolicy('none')).toEqual({})
    expect(resolveScrollToHashPolicy('pushHard')).toEqual({ push: 'hard' })
    expect(resolveScrollToHashPolicy('pushHardCurrentSmooth')).toEqual({ push: 'hard', current: 'smooth' })
    expect(resolveScrollToHashPolicy('pushHardCurrentHard')).toEqual({ push: 'hard', current: 'hard' })
  })

  it('normalizes the boolean / undefined shortcuts', () => {
    expect(resolveScrollToHashPolicy(true)).toEqual({ push: 'hard', current: 'smooth' }) // true === default
    expect(resolveScrollToHashPolicy(false)).toEqual({})
    expect(resolveScrollToHashPolicy(undefined)).toEqual({})
  })
})

describe('resolveScrollToHashBehavior', () => {
  it('default global (true) → hard on push, smooth on current', () => {
    expect(resolveScrollToHashBehavior(undefined, true, 'push')).toBe('hard')
    expect(resolveScrollToHashBehavior(undefined, true, 'current')).toBe('smooth')
  })

  it('per-call overrides the global default (both directions)', () => {
    // per-call forces a behavior even when global is off
    expect(resolveScrollToHashBehavior('pushHardCurrentHard', 'none', 'current')).toBe('hard')
    // per-call false suppresses even when global would jump
    expect(resolveScrollToHashBehavior(false, true, 'push')).toBeUndefined()
  })

  it('falls back to the global when per-call is undefined', () => {
    expect(resolveScrollToHashBehavior(undefined, 'pushHard', 'push')).toBe('hard')
    // pushHard has no `current` → no jump on a same-page navigation
    expect(resolveScrollToHashBehavior(undefined, 'pushHard', 'current')).toBeUndefined()
  })
})

// Type-level checks (validated by `bun run types`, harmless no-ops at runtime).
describe('ScrollToHashPolicy / SetSearchHelper (types)', () => {
  it('ScrollToHashPolicy accepts the presets + booleans, rejects kebab', () => {
    ;['none', 'pushHard', 'pushHardCurrentSmooth', 'pushHardCurrentHard', true, false] satisfies ScrollToHashPolicy[]
    // @ts-expect-error kebab-case is not a valid preset (we standardized on camelCase)
    const bad: ScrollToHashPolicy = 'push-hard-current-smooth'
    void bad
    expect(true).toBe(true)
  })

  it('setSearch: object replaces, updater patches, undefined drops a key', () => {
    const setSearch = (() => {}) as SetSearchHelper<{ page?: number; q?: string }>
    setSearch({ page: 2 }) // replace
    setSearch({}) // clear
    setSearch((prev) => ({ ...prev, page: (prev.page ?? 0) + 1 })) // patch via spread
    setSearch((prev) => ({ ...prev, q: undefined })) // drop a key
    setSearch({ page: 1 }, { replace: false }) // push instead of replace
    // @ts-expect-error a key's value must match the search input type
    setSearch({ page: 'not-a-number' })
    expect(typeof setSearch).toBe('function')
  })
})
