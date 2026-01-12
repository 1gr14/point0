import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { SuperStore } from '../src/super-store.js'
import superjson from 'superjson'

// type ItFn = (done: (err?: unknown) => any) => any
// const withFakeClient = (fn: () => any): ItFn => {
//   return async () => {
//     const originalWindow = globalThis.window
//     const originalDocument = globalThis.document
//     try {
//       ;(globalThis as any).window = {}
//       ;(globalThis as any).document = {}
//       await fn()
//     } finally {
//       globalThis.window = originalWindow
//       globalThis.document = originalDocument
//     }
//   }
// }

const originalWindow = globalThis.window
const originalDocument = globalThis.document

describe('SuperStore', () => {
  describe('client', () => {
    let superstore: SuperStore

    beforeEach(() => {
      ;(globalThis as any).window = {}
      ;(globalThis as any).document = {}
      superstore = new SuperStore({ name: 'test' })
    })

    afterEach(() => {
      ;(globalThis as any).window = originalWindow
      ;(globalThis as any).document = originalDocument
    })

    it('created', () => {
      expect(superstore.name).toBe('test')
      expect(superstore.items.size).toBe(0)
      expect(superstore.prepared.size).toBe(0)
      expect(superstore.touched.size).toBe(0)
      expect(superstore.transformer).toBeDefined()
      expect(superstore.serverStorage).toBeUndefined()
      expect(superstore.clientState).toEqual({})
    })

    describe('item', () => {
      it('define, get, set, get', () => {
        const item = superstore.define('item', () => 'value')
        expect(item.get()).toBe('value')
        item.set('value2')
        expect(item.get()).toBe('value2')
      })

      it('define, set, get', () => {
        const item = superstore.define('item', () => 'value')
        item.set('value2')
        expect(item.get()).toBe('value2')
      })

      it('define, prepare, get', () => {
        const item = superstore.define('item', () => 'value')
        superstore.prepare({ item: 'value3' })
        expect(item.get()).toBe('value3')
      })

      it('define, prepare, set, get', () => {
        const item = superstore.define('item', () => 'value')
        superstore.prepare({ item: 'value3' })
        item.set('value4')
        expect(item.get()).toBe('value4')
      })

      it('prepare, define, get', () => {
        superstore.prepare({ item: 'value3' })
        const item = superstore.define('item', () => 'value')
        expect(item.get()).toBe('value3')
      })

      it('prepare, define, set, get', () => {
        superstore.prepare({ item: 'value3' })
        const item = superstore.define('item', () => 'value')
        expect(item.get()).toBe('value3')
      })

      it('prepare from string, define, get', () => {
        superstore.prepareFromString('{"item":"value3"}')
        const item = superstore.define('item', () => 'value')
        expect(item.get()).toBe('value3')
      })
    })

    describe('store', () => {
      it('get undefined item value', () => {
        const value = superstore.getValue('item')
        expect(value).toBeUndefined()
      })

      it('get defined item value', () => {
        superstore.define('item', () => 'value')
        const value = superstore.getValue('item')
        expect(value).toBe('value')
      })

      it('set undefined item value, get it', () => {
        superstore.setValue('item', 'value')
        const value = superstore.getValue('item')
        expect(value).toBe('value')
      })

      it('set defined item value, get it', () => {
        superstore.define('item', () => 'value')
        superstore.setValue('item', 'value2')
        const value = superstore.getValue('item')
        expect(value).toBe('value2')
      })

      it('dehydrate, prepare with default', () => {
        superstore.define('no-ssr', () => 'value')
        superstore.define('string', () => 'value', true)
        superstore.define('date', () => new Date('2017-01-01T00:00:00.000Z'), true)
        const dehydrated = superstore.dehydrate()
        expect(dehydrated).toEqual({
          date: new Date('2017-01-01T00:00:00.000Z'),
          string: 'value',
        })
        superstore.prepare(dehydrated)
        expect(Object.fromEntries(superstore.prepared)).toEqual({
          date: new Date('2017-01-01T00:00:00.000Z'),
          string: 'value',
        })
      })

      it('dehydrate, prepare with custom', () => {
        superstore.define('no-ssr', () => 'value')
        superstore.define('string', () => 'value', {
          dehydrate: (value) => value + '_1',
          hydrate: (dehydratedValue) => dehydratedValue + '_2',
        })
        superstore.define('date', () => new Date('2017-01-01T00:00:00.000Z'), true)
        const dehydrated = superstore.dehydrate()
        expect(dehydrated).toEqual({
          date: new Date('2017-01-01T00:00:00.000Z'),
          string: 'value_1',
        })
        superstore.prepare(dehydrated)
        expect(Object.fromEntries(superstore.prepared)).toEqual({
          date: new Date('2017-01-01T00:00:00.000Z'),
          string: 'value_1',
        })
        superstore.clearState()
        const value = superstore.getValue('string')
        expect(value).toBe('value_1_2')
      })

      it('stringify with default transformer', () => {
        superstore.define('no-ssr', () => 'value')
        superstore.define('string', () => 'value', true)
        superstore.define('date', () => new Date('2017-01-01T00:00:00.000Z'), true)
        const stringified = superstore.stringify()
        expect(stringified).toEqual('{"date":"2017-01-01T00:00:00.000Z","string":"value"}')
      })

      it('stringify with custom transformer', () => {
        const ss = new SuperStore({
          name: 'test',
          transformer: superjson,
        })
        ss.define('no-ssr', () => 'value')
        ss.define('string', () => 'value', true)
        ss.define('date', () => new Date('2017-01-01T00:00:00.000Z'), true)
        const stringified = ss.stringify()
        expect(stringified).toEqual(
          '{"json":{"date":"2017-01-01T00:00:00.000Z","string":"value"},"meta":{"v":1,"values":{"date":["Date"]}}}',
        )
      })
    })
  })

  describe('server', () => {
    let superstore: SuperStore

    beforeEach(() => {
      superstore = new SuperStore({ name: 'test' })
    })

    it('created', () => {
      expect(superstore.name).toBe('test')
      expect(superstore.items.size).toBe(0)
      expect(superstore.prepared.size).toBe(0)
      expect(superstore.touched.size).toBe(0)
      expect(superstore.transformer).toBeDefined()
      expect(superstore.serverStorage).toBeDefined()
      expect(superstore.clientState).toEqual({})
    })

    describe('item', () => {
      it('define, empty-run, get, set, get', () => {
        const item = superstore.define('item', () => 'value')
        superstore.runWithServerStorageState({}, () => {
          expect(item.get()).toBe('value')
          item.set('value2')
          expect(item.get()).toBe('value2')
        })
        superstore.runWithServerStorageState({}, () => {
          expect(item.get()).toBe('value')
        })
      })

      it('define, filled-run, get, set, get', () => {
        const item = superstore.define('item', () => 'value')
        superstore.runWithServerStorageState({ item: 'value2' }, () => {
          expect(item.get()).toBe('value2')
          item.set('value3')
          expect(item.get()).toBe('value3')
        })
        superstore.runWithServerStorageState({}, () => {
          expect(item.get()).toBe('value')
        })
      })
    })

    describe('store', () => {
      it('get undefined item value', () => {
        superstore.runWithServerStorageState({}, () => {
          expect(superstore.getValue('item')).toBeUndefined()
        })
      })

      it('get defined item value', () => {
        superstore.define('item', () => 'value')
        superstore.runWithServerStorageState({ item: 'value2' }, () => {
          const x = superstore.getValue('item')
          expect(x).toBe('value2')
        })
        superstore.runWithServerStorageState({}, () => {
          const x = superstore.getValue('item')
          expect(x).toBe('value')
        })
      })
    })
  })
})
