import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import superjson from 'superjson'
import { superstore } from '../src/super-store.js'

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
let ss: typeof superstore

describe('SuperStore', () => {
  describe('client', () => {
    beforeEach(() => {
      ;(globalThis as any).window = {}
      ;(globalThis as any).document = {}
      ss = superstore._reset()
    })

    afterEach(() => {
      ;(globalThis as any).window = originalWindow
      ;(globalThis as any).document = originalDocument
    })

    it('created', () => {
      expect(ss.items.size).toBe(0)
      expect(ss.prepared.size).toBe(0)
      expect(ss.touched.size).toBe(0)
      expect(ss.transformer).toBeUndefined()
      expect(ss.serverStorage).toBeUndefined()
      expect(ss.clientState).toEqual({})
    })

    describe('item', () => {
      it('define, get, set, get', () => {
        const item = ss.define('item', () => 'value')
        expect(item.get()).toBe('value')
        item.set('value2')
        expect(item.get()).toBe('value2')
      })

      it('define, set, get', () => {
        const item = ss.define('item', () => 'value')
        item.set('value2')
        expect(item.get()).toBe('value2')
      })

      it('define, prepare, get', () => {
        const item = ss.define('item', () => 'value')
        ss.prepare({ item: 'value3' })
        expect(item.get()).toBe('value3')
      })

      it('define, prepare, set, get', () => {
        const item = ss.define('item', () => 'value')
        ss.prepare({ item: 'value3' })
        item.set('value4')
        expect(item.get()).toBe('value4')
      })

      it('prepare, define, get', () => {
        ss.prepare({ item: 'value3' })
        const item = ss.define('item', () => 'value')
        expect(item.get()).toBe('value3')
      })

      it('prepare, define, set, get', () => {
        ss.prepare({ item: 'value3' })
        const item = ss.define('item', () => 'value')
        expect(item.get()).toBe('value3')
      })

      it('prepare from string, define, get', () => {
        ss.prepareFromString('{"item":"value3"}')
        const item = ss.define('item', () => 'value')
        expect(item.get()).toBe('value3')
      })
    })

    describe('store', () => {
      it('get undefined item value', () => {
        const value = ss.getValue('item')
        expect(value).toBeUndefined()
      })

      it('get defined item value', () => {
        ss.define('item', () => 'value')
        const value = ss.getValue('item')
        expect(value).toBe('value')
      })

      it('set undefined item value, get it', () => {
        ss.setValue('item', 'value')
        const value = ss.getValue('item')
        expect(value).toBe('value')
      })

      it('set defined item value, get it', () => {
        ss.define('item', () => 'value')
        ss.setValue('item', 'value2')
        const value = ss.getValue('item')
        expect(value).toBe('value2')
      })

      it('dehydrate, prepare with default', () => {
        ss.define('no-ssr', () => 'value')
        ss.define('string', () => 'value', true)
        ss.define('date', () => new Date('2017-01-01T00:00:00.000Z'), true)
        const dehydrated = ss.dehydrate()
        expect(dehydrated).toEqual({
          date: new Date('2017-01-01T00:00:00.000Z'),
          string: 'value',
        })
        ss.prepare(dehydrated)
        expect(Object.fromEntries(ss.prepared)).toEqual({
          date: new Date('2017-01-01T00:00:00.000Z'),
          string: 'value',
        })
      })

      it('dehydrate, prepare with custom', () => {
        ss.define('no-ssr', () => 'value')
        ss.define('string', () => 'value', {
          dehydrate: (value) => value + '_1',
          hydrate: (dehydratedValue) => dehydratedValue + '_2',
        })
        ss.define('date', () => new Date('2017-01-01T00:00:00.000Z'), true)
        const dehydrated = ss.dehydrate()
        expect(dehydrated).toEqual({
          date: new Date('2017-01-01T00:00:00.000Z'),
          string: 'value_1',
        })
        ss.prepare(dehydrated)
        expect(Object.fromEntries(ss.prepared)).toEqual({
          date: new Date('2017-01-01T00:00:00.000Z'),
          string: 'value_1',
        })
        ss.clearState()
        const value = ss.getValue('string')
        expect(value).toBe('value_1_2')
      })

      it('stringify with default transformer', () => {
        ss.define('no-ssr', () => 'value')
        ss.define('string', () => 'value', true)
        ss.define('date', () => new Date('2017-01-01T00:00:00.000Z'), true)
        const stringified = ss.stringify()
        expect(stringified).toEqual('{"date":"2017-01-01T00:00:00.000Z","string":"value"}')
      })

      it('stringify with custom transformer', () => {
        ss.define('no-ssr', () => 'value')
        ss.define('string', () => 'value', true)
        ss.define('date', () => new Date('2017-01-01T00:00:00.000Z'), true)
        ss.setTransformer(superjson)
        const stringified = ss.stringify()
        expect(stringified).toEqual(
          '{"json":{"date":"2017-01-01T00:00:00.000Z","string":"value"},"meta":{"v":1,"values":{"date":["Date"]}}}',
        )
      })
    })

    describe('proxy', () => {
      it('ok', () => {
        const first = ss.define('first', () => 'string')
        const second = ss.define('second', () => 123)
        const third = ss.define<number | string>('third', () => 123)
        const proxy = ss.proxy({ first, second, third })
        expect(proxy.first).toBe('string')
        expect(proxy.second).toBe(123)
        expect(proxy.third).toBe(123)
        proxy.third = 'x'
        expect(proxy.third).toBe('x')
      })
    })
  })

  describe('server', () => {
    beforeEach(() => {
      ss = superstore._reset()
    })

    it('created', () => {
      expect(ss.items.size).toBe(0)
      expect(ss.prepared.size).toBe(0)
      expect(ss.touched.size).toBe(0)
      expect(ss.transformer).toBeUndefined()
      expect(ss.serverStorage).toBeDefined()
      expect(ss.clientState).toEqual({})
    })

    describe('item', () => {
      it('define, empty-run, get, set, get', () => {
        const item = ss.define('item', () => 'value')
        ss.runWithServerStorageState({}, () => {
          expect(item.get()).toBe('value')
          item.set('value2')
          expect(item.get()).toBe('value2')
        })
        ss.runWithServerStorageState({}, () => {
          expect(item.get()).toBe('value')
        })
      })

      it('define, filled-run, get, set, get', () => {
        const item = ss.define('item', () => 'value')
        ss.runWithServerStorageState({ item: 'value2' }, () => {
          expect(item.get()).toBe('value2')
          item.set('value3')
          expect(item.get()).toBe('value3')
        })
        ss.runWithServerStorageState({}, () => {
          expect(item.get()).toBe('value')
        })
      })
    })

    describe('store', () => {
      it('get undefined item value', () => {
        ss.runWithServerStorageState({}, () => {
          expect(ss.getValue('item')).toBeUndefined()
        })
      })

      it('get defined item value', () => {
        ss.define('item', () => 'value')
        ss.runWithServerStorageState({ item: 'value2' }, () => {
          const x = ss.getValue('item')
          expect(x).toBe('value2')
        })
        ss.runWithServerStorageState({}, () => {
          const x = ss.getValue('item')
          expect(x).toBe('value')
        })
      })
    })

    describe('createTypedRunWithServerStorageState', () => {
      it('ok', () => {
        const first = ss.define('first', () => 'string')
        const second = ss.define('second', () => 123)
        const third = ss.define<number | string | undefined>('third', () => 123)
        const items = { first, second, third }
        const proxy = ss.proxy(items)
        const run = ss.createTypedRunWithServerStorageState<typeof items>()
        run({ first: 'string2', second: 456, third: undefined }, () => {
          expect(proxy.first).toBe('string2')
          expect(proxy.second).toBe(456)
          expect(proxy.third).toBeUndefined()
        })
      })
    })
  })
})
