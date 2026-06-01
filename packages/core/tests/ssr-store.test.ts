import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import superjson from 'superjson'
import { SsrStore } from '../src/ssr-store.js'
import { superstore } from '../src/super-store.js'

const originalWindow = globalThis.window
const originalDocument = globalThis.document
const originalPoint0Side = process.env.POINT0_SIDE

describe('SsrStore', () => {
  describe('client', () => {
    beforeEach(() => {
      process.env.POINT0_SIDE = 'client'
      ;(globalThis as any).window = {}
      ;(globalThis as any).document = {}
      superstore.reset()
    })

    afterEach(() => {
      process.env.POINT0_SIDE = originalPoint0Side
      ;(globalThis as any).window = originalWindow
      ;(globalThis as any).document = originalDocument
    })

    it('define exposes name and default', () => {
      const desc = SsrStore.define('desc', () => 'default')
      expect(desc.name).toBe('desc')
      expect(desc.get()).toBe('default')
    })

    it('set, get', () => {
      const desc = SsrStore.define('desc', () => 'default')
      desc.set('overridden')
      expect(desc.get()).toBe('overridden')
    })

    it('only SsrStore values are transferred (others stay client-local)', () => {
      superstore.define('local', () => 'x', 'clientOnly')
      SsrStore.define('desc', () => 'default')
      expect(superstore.dehydrate()).toEqual({ desc: 'default' })
    })

    it('round-trips through dehydrate → prepare', () => {
      const desc = SsrStore.define('desc', () => 'default')
      desc.set('overridden')
      const dehydrated = superstore.dehydrate()
      expect(dehydrated).toEqual({ desc: 'overridden' })
      superstore.prepare(dehydrated)
      expect(Object.fromEntries(superstore.prepared)).toEqual({ desc: 'overridden' })
    })

    it('stringify with default transformer', () => {
      SsrStore.define('desc', () => 'default')
      SsrStore.define('count', () => 0)
      expect(superstore.stringify()).toBe('{"count":0,"desc":"default"}')
    })

    it('stringify with custom transformer', () => {
      SsrStore.define('when', () => new Date('2017-01-01T00:00:00.000Z'))
      superstore.setTransformer(superjson)
      expect(superstore.stringify()).toBe(
        '{"json":{"when":"2017-01-01T00:00:00.000Z"},"meta":{"v":1,"values":{"when":["Date"]}}}',
      )
    })
  })

  describe('fakeClient', () => {
    beforeEach(() => {
      ;(globalThis as any).window = {}
      ;(globalThis as any).document = {}
      superstore.reset()
    })

    afterEach(() => {
      ;(globalThis as any).window = originalWindow
      ;(globalThis as any).document = originalDocument
    })

    const withFakeClient = (fn: () => void) => {
      return () => {
        superstore.runWithServerStorageState(
          { __POINT0_FAKE_CLIENT__: { id: '123', scope: 'root', runtime: 'browser' } },
          fn,
        )
      }
    }

    it(
      'set, get',
      withFakeClient(() => {
        const desc = SsrStore.define('desc', () => 'default')
        expect(desc.get()).toBe('default')
        desc.set('overridden')
        expect(desc.get()).toBe('overridden')
      }),
    )

    it(
      'value dehydrates for transfer',
      withFakeClient(() => {
        const desc = SsrStore.define('desc', () => 'default')
        desc.set('overridden')
        expect(superstore.dehydrate()).toEqual({ desc: 'overridden' })
      }),
    )
  })

  describe('server', () => {
    beforeEach(() => {
      superstore.reset()
    })

    it('set() stages on the server; the value is applied only on commitPending()', () => {
      const desc = SsrStore.define('desc', () => 'default')
      superstore.runWithServerStorageState(
        {
          __POINT0_SSR_STORE_PENDING__: new Map(),
        },
        () => {
          expect(desc.get()).toBe('default')
          desc.set('overridden')
          // Staged, not committed yet — the current render keeps reading the old value.
          expect(desc.get()).toBe('default')
          expect(SsrStore.hasPendingChanges()).toBe(true)
          SsrStore.commitPending()
          expect(desc.get()).toBe('overridden')
          expect(SsrStore.hasPendingChanges()).toBe(false)
        },
      )
    })

    it('use() reads the committed value synchronously on the server', () => {
      const desc = SsrStore.define('desc', () => 'default')
      superstore.runWithServerStorageState(
        {
          __POINT0_SSR_STORE_PENDING__: new Map(),
        },
        () => {
          expect(desc.use()).toBe('default')
          desc.set('overridden')
          expect(desc.use()).toBe('default')
          SsrStore.commitPending()
          expect(desc.use()).toBe('overridden')
        },
      )
    })

    it('committed server value dehydrates for transfer to the client', () => {
      const desc = SsrStore.define('desc', () => 'default')
      superstore.runWithServerStorageState(
        {
          __POINT0_SSR_STORE_PENDING__: new Map(),
        },
        () => {
          desc.set('from server')
          SsrStore.commitPending()
          expect(superstore.dehydrate()).toEqual({ desc: 'from server' })
        },
      )
    })

    it('hasPendingChanges ignores a set() that matches the committed value', () => {
      const desc = SsrStore.define('desc', () => 'default')
      superstore.runWithServerStorageState(
        {
          __POINT0_SSR_STORE_PENDING__: new Map(),
        },
        () => {
          desc.set('default')
          expect(SsrStore.hasPendingChanges()).toBe(false)
        },
      )
    })
  })
})
