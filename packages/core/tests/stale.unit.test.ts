import { afterEach, describe, expect, it } from 'bun:test'
import {
  _resetStaleClientBuildState,
  buildClientBuildHeaderValue,
  compareClientBuildHeaderValue,
  documentNavigate,
  getClientBuildVersion,
  getClientBuildVersionRoutePath,
  getStaleClientBuildState,
  markClientBuildStale,
  resolveStaleReaction,
  shouldAttemptStaleReload,
} from '../src/stale.js'
import type { StaleContext } from '../src/stale.js'

const originalWindow = (globalThis as { window?: unknown }).window

const withFakeWindow = (window: Record<string, unknown>): void => {
  ;(globalThis as { window?: unknown }).window = window
}

afterEach(() => {
  ;(globalThis as { window?: unknown }).window = originalWindow
  _resetStaleClientBuildState()
})

describe('stale — deploy invalidation primitives', () => {
  it('version file route path lives under the scoped _point0 namespace', () => {
    expect(getClientBuildVersionRoutePath('root')).toBe('/_point0/root/build-version.json')
    expect(getClientBuildVersionRoutePath('site')).toBe('/_point0/site/build-version.json')
  })

  it('header value builds and parses back symmetrically', () => {
    const headerValue = buildClientBuildHeaderValue({ scope: 'root', buildVersion: 'abc123' })
    expect(headerValue).toBe('root:abc123')
    expect(compareClientBuildHeaderValue({ headerValue, scope: 'root', clientBuildVersion: 'abc123' })).toEqual({
      result: 'match',
    })
    expect(compareClientBuildHeaderValue({ headerValue, scope: 'root', clientBuildVersion: 'old111' })).toEqual({
      result: 'mismatch',
      latestBuildVersion: 'abc123',
    })
  })

  it('header comparison never treats the incomparable as a mismatch', () => {
    // no header (dev, a foreign server)
    expect(compareClientBuildHeaderValue({ headerValue: null, scope: 'root', clientBuildVersion: 'v1' }).result).toBe(
      'unknown',
    )
    // a FOREIGN scope's version must not mark THIS client stale
    expect(
      compareClientBuildHeaderValue({ headerValue: 'site:v2', scope: 'root', clientBuildVersion: 'v1' }).result,
    ).toBe('unknown')
    // this tab has no version (dev HTML) — nothing to compare against
    expect(
      compareClientBuildHeaderValue({ headerValue: 'root:v2', scope: 'root', clientBuildVersion: undefined }).result,
    ).toBe('unknown')
    // malformed values
    expect(
      compareClientBuildHeaderValue({ headerValue: 'no-separator', scope: 'root', clientBuildVersion: 'v1' }).result,
    ).toBe('unknown')
    expect(
      compareClientBuildHeaderValue({ headerValue: 'root:', scope: 'root', clientBuildVersion: 'v1' }).result,
    ).toBe('unknown')
  })

  it('reads the tab version from the window global injected into the HTML', () => {
    withFakeWindow({ __POINT0_CLIENT_BUILD_VERSION__: 'v42' })
    expect(getClientBuildVersion()).toBe('v42')
    withFakeWindow({})
    expect(getClientBuildVersion()).toBeUndefined()
    withFakeWindow({ __POINT0_CLIENT_BUILD_VERSION__: '' })
    expect(getClientBuildVersion()).toBeUndefined()
  })

  it('marks the tab stale once per version and exposes the latest version', () => {
    withFakeWindow({})
    expect(getStaleClientBuildState()).toBeUndefined()
    markClientBuildStale({ latestBuildVersion: 'v2' })
    expect(getStaleClientBuildState()).toEqual({ latestBuildVersion: 'v2' })
    markClientBuildStale({ latestBuildVersion: 'v2' }) // idempotent
    expect(getStaleClientBuildState()).toEqual({ latestBuildVersion: 'v2' })
    markClientBuildStale({ latestBuildVersion: 'v3' }) // a further deploy updates the mark
    expect(getStaleClientBuildState()).toEqual({ latestBuildVersion: 'v3' })
  })

  it('reload-once guard allows exactly one attempt per build version', () => {
    const storage = new Map<string, string>()
    withFakeWindow({
      sessionStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    })
    expect(shouldAttemptStaleReload({ latestBuildVersion: 'v2' })).toBe(true)
    expect(shouldAttemptStaleReload({ latestBuildVersion: 'v2' })).toBe(false) // second attempt for the SAME version blocked
    expect(shouldAttemptStaleReload({ latestBuildVersion: 'v3' })).toBe(true) // a NEWER deploy gets its own fresh attempt
  })

  it('reload-once guard allows the attempt when storage is unavailable (the version check still gates it)', () => {
    withFakeWindow({
      sessionStorage: {
        getItem: () => {
          throw new Error('denied')
        },
        setItem: () => {
          throw new Error('denied')
        },
      },
    })
    expect(shouldAttemptStaleReload({ latestBuildVersion: 'v2' })).toBe(true)
  })

  describe('documentNavigate', () => {
    // A minimal window.location + history double: documentNavigate must ASSIGN for a different document URL, and
    // REPLACE-then-RELOAD when only the hash differs (a hash-only assign never fetches a new document).
    const makeWindow = (currentHref: string) => {
      const calls: string[] = []
      const current = new URL(currentHref)
      withFakeWindow({
        location: {
          href: current.href,
          pathname: current.pathname,
          search: current.search,
          hash: current.hash,
          assign: (href: string) => calls.push(`assign:${href}`),
          reload: () => calls.push('reload'),
        },
        history: {
          replaceState: (_state: unknown, _title: string, href: string) => calls.push(`replaceState:${href}`),
        },
      })
      return calls
    }

    it('assigns for a different document URL (the normal recovery)', () => {
      const calls = makeWindow('https://app.test/home?a=1')
      documentNavigate('/other')
      expect(calls).toEqual(['assign:https://app.test/other'])
    })

    it('hash-only target: writes the URL and force-reloads (assign alone would just scroll)', () => {
      const calls = makeWindow('https://app.test/home')
      documentNavigate('/home#section')
      expect(calls).toEqual(['replaceState:https://app.test/home#section', 'reload'])
    })

    it('same-URL target: reloads', () => {
      const calls = makeWindow('https://app.test/home?a=1')
      documentNavigate('/home?a=1')
      expect(calls).toEqual(['reload'])
    })
  })

  it('resolves literal policies as-is and treats a void-returning custom handler as handled', async () => {
    const ctx: StaleContext = { to: '/x', error: undefined, clientBuildVersion: 'v1', latestBuildVersion: 'v2' }
    expect(await resolveStaleReaction({ policy: 'navigate', ctx })).toBe('navigate')
    expect(await resolveStaleReaction({ policy: 'error', ctx })).toBe('error')
    expect(await resolveStaleReaction({ policy: () => 'navigate' as const, ctx })).toBe('navigate')
    expect(await resolveStaleReaction({ policy: async () => 'error' as const, ctx })).toBe('error')
    expect(await resolveStaleReaction({ policy: () => undefined, ctx })).toBe('handled')
    const seen: StaleContext[] = []
    expect(
      await resolveStaleReaction({
        policy: (receivedCtx) => {
          seen.push(receivedCtx)
        },
        ctx,
      }),
    ).toBe('handled')
    expect(seen).toEqual([ctx])
  })
})
