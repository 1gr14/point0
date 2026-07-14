import { afterEach, describe, expect, it } from 'bun:test'
import React from 'react'
import { ClientPoints } from '../src/client-points.js'
import { Point0 } from '../src/point0.js'
import { claimScrollRestoration, yieldScrollRestorationToBrowser } from '../src/scroll.js'
import {
  getWindowScrollPositionGetterByElementGetter,
  getWindowScrollPositionSetterByElementGetter,
  windowScrollPositionSetter,
} from '../src/utils.js'

// The scroll-restoration OWNERSHIP state machine (see scroll.tsx). The decisions live in two pure
// helpers, so they are testable without a DOM library, React, or the navigation context — we just
// stand up the two properties they touch.
//
// Why this matters: the browser restores a document load BEFORE the first paint; we cannot (our
// restore is a React effect). So we hold 'manual' only while the document is alive, and hand the mode
// back on the way out. Two things make that safe, and both are asserted here:
//   - the #hash gate — under 'auto' the browser prefers the FRAGMENT over the stored position
//     (measured), which is the very bug 'manual' exists to prevent, so a hashed URL is never yielded;
//   - the writes never throw — one of them runs during unload, in contexts that can be sandboxed.
//
// The event WIRING (pagehide/visibilitychange → yield, pageshow/visible → claim) is covered by the
// scroll-restoration e2e; bfcache itself is unreachable in headless chromium.

const originalWindow = (globalThis as any).window

type FakeWindow = { history: { scrollRestoration?: string }; location: { hash: string } }
const stubWindow = (options: { hash?: string; history?: object } = {}): FakeWindow => {
  const fake: FakeWindow = {
    history: (options.history ?? { scrollRestoration: 'auto' }) as FakeWindow['history'],
    location: { hash: options.hash ?? '' },
  }
  ;(globalThis as any).window = fake
  return fake
}

afterEach(() => {
  if (originalWindow === undefined) {
    delete (globalThis as any).window
  } else {
    ;(globalThis as any).window = originalWindow
  }
})

describe('scroll restoration mode', () => {
  it('claims manual — same-document navigation is ours', () => {
    const w = stubWindow()
    claimScrollRestoration()
    expect(w.history.scrollRestoration).toBe('manual')
  })

  it('yields auto on a hashless URL — the browser restores a document load pre-paint', () => {
    const w = stubWindow({ hash: '' })
    claimScrollRestoration()
    yieldScrollRestorationToBrowser()
    expect(w.history.scrollRestoration).toBe('auto')
  })

  it('GATE: never yields a #hash URL — the browser would jump to the fragment, not the position', () => {
    const w = stubWindow({ hash: '#target' })
    claimScrollRestoration()
    yieldScrollRestorationToBrowser()
    // Still ours: such entries are restored by our own (post-hydration) repair instead.
    expect(w.history.scrollRestoration).toBe('manual')
  })

  it('re-claiming after a yield is what a bfcache resume / tab re-show does', () => {
    const w = stubWindow()
    claimScrollRestoration()
    yieldScrollRestorationToBrowser()
    expect(w.history.scrollRestoration).toBe('auto')
    // A bfcache'd page comes back ALIVE — left under 'auto' the browser would start restoring
    // same-document pops again, resurrecting the #hash bug intermittently.
    claimScrollRestoration()
    expect(w.history.scrollRestoration).toBe('manual')
  })

  it('is a no-op where the History API has no scrollRestoration (React Native / Expo, embeddings)', () => {
    const w = stubWindow({ history: {} })
    expect(() => {
      claimScrollRestoration()
      yieldScrollRestorationToBrowser()
    }).not.toThrow()
    expect(w.history.scrollRestoration).toBeUndefined()
  })

  it('never throws when the mode is not writable — the yield runs during unload', () => {
    const w = stubWindow({
      history: Object.defineProperty({}, 'scrollRestoration', {
        get: () => 'auto',
        set: () => {
          throw new Error('sandboxed')
        },
        configurable: true,
      }),
    })
    expect(() => {
      claimScrollRestoration()
      yieldScrollRestorationToBrowser()
    }).not.toThrow()
    expect(w.history.scrollRestoration).toBe('auto')
  })

  it('is a no-op with no window at all (SSR)', () => {
    delete (globalThis as any).window
    expect(() => {
      claimScrollRestoration()
      yieldScrollRestorationToBrowser()
    }).not.toThrow()
  })
})

// The lookup that IS the bug. `.scrollPosition()` never restored anything for the whole life of the
// feature, and the reason was never the discriminator (a record's `point` is an instance or a loader —
// the callable wrapper never reaches it): it was that a code-split page's record stays a LOADER forever
// unless something loads it, and on the client `loadPage` runs only from `prefetchPage` — which a
// server-rendered first page never goes through. So the config resolved to nothing, and every caller
// silently fell back to the window.
//
// Hence the three-way answer, pinned here: a config, `'pending'` (wait — do not guess), `undefined` (a
// 404 — the window really is the answer). Collapsing `'pending'` into either of the other two brings the
// bug straight back.
describe('the page scroll-config lookup', () => {
  const getFC = () => () => React.createElement('div', null, 'x')
  const setup = () => {
    const base = Point0.lets('root', 'base').root()
    const paneWrapper = base.lets('page', 'pane', '/pane').scrollPosition('#pane').page(getFC())
    return ClientPoints.createFromDefintion([
      base,
      base.lets('page', 'eager', '/eager').page(getFC()),
      // How the compiler emits every page: a record whose `point` is an async chunk loader.
      { type: 'page', name: 'pane', route: '/pane', polh: true, layouts: [], point: async () => paneWrapper },
    ] as never)
  }
  const configOf = (points: ReturnType<typeof setup>, href: string) => points._getPageScrollConfigByHref(href)

  it('resolves an eager page synchronously', () => {
    expect(configOf(setup(), '/eager')).toMatchObject({ getter: expect.any(Function), setter: expect.any(Function) })
  })

  it("answers 'pending' for a code-split page nobody has loaded — never a window fallback", () => {
    expect(configOf(setup(), '/pane')).toBe('pending')
  })

  it('resolves that same page once its chunk is loaded — this is what the scroll manager waits for', async () => {
    const points = setup()
    await points.loadPage({ location: points.routes._.getLocation('/pane') })
    const config = configOf(points, '/pane')
    expect(config).not.toBe('pending')
    expect(config).toMatchObject({ getter: expect.any(Function), setter: expect.any(Function) })
  })

  it('answers undefined for an href no page matches — a 404 DOES scroll the window', () => {
    expect(configOf(setup(), '/nothing-here')).toBeUndefined()
  })
})

// The scroll accessors the restore actually goes through. All three of these are correctness fixes
// whose failure mode is INVISIBLE in review, which is exactly why they are pinned here:
//
//   - an `{ x: 0, y: 0 }` for a missing element is a LIE that overwrites a real saved position with
//     the top of the page (the callers all guard for `undefined`, and only `undefined` tells them the
//     truth);
//   - `scrollTo(x, y)` and `element.scrollTop = …` both scroll with behavior `'auto'`, which resolves
//     to the computed CSS `scroll-behavior` — so under `scroll-behavior: smooth` a restore ANIMATES,
//     the retry sees a position that isn't the one it applied, reads it as the user scrolling, and
//     backs off for good. A restore that silently stops working.
describe('scroll accessors', () => {
  it('the element getter returns undefined for a missing element — never a lying {0,0}', () => {
    const getter = getWindowScrollPositionGetterByElementGetter(() => null)
    expect(getter()).toBeUndefined()
  })

  it('the element getter reads the element scroll', () => {
    const element = { scrollLeft: 12, scrollTop: 340 } as unknown as HTMLElement
    const getter = getWindowScrollPositionGetterByElementGetter(() => element)
    expect(getter()).toEqual({ x: 12, y: 340 })
  })

  it('the element setter scrolls INSTANTLY and never assigns scrollTop/scrollLeft', () => {
    const calls: unknown[] = []
    const element = {
      scrollTo: (options: unknown) => calls.push(options),
      set scrollTop(_v: number) {
        throw new Error('must not assign scrollTop — it honours CSS scroll-behavior and animates')
      },
      set scrollLeft(_v: number) {
        throw new Error('must not assign scrollLeft — it honours CSS scroll-behavior and animates')
      },
    } as unknown as HTMLElement
    const setter = getWindowScrollPositionSetterByElementGetter(() => element)
    expect(() => setter({ x: 5, y: 250 })).not.toThrow()
    expect(calls).toEqual([{ left: 5, top: 250, behavior: 'instant' }])
  })

  it('the element setter is a no-op for a missing element', () => {
    const setter = getWindowScrollPositionSetterByElementGetter(() => null)
    expect(() => setter({ x: 1, y: 2 })).not.toThrow()
  })

  it('the window setter scrolls INSTANTLY (the options form, not scrollTo(x, y))', () => {
    const calls: unknown[][] = []
    const previousWindow = (globalThis as any).window
    const previousDocument = (globalThis as any).document
    ;(globalThis as any).window = {
      scrollTo: (...args: unknown[]) => calls.push(args),
    }
    ;(globalThis as any).document = { documentElement: {}, body: {} }
    try {
      windowScrollPositionSetter({ x: 0, y: 900 })
    } finally {
      ;(globalThis as any).window = previousWindow
      ;(globalThis as any).document = previousDocument
    }
    expect(calls).toEqual([[{ left: 0, top: 900, behavior: 'instant' }]])
  })
})
