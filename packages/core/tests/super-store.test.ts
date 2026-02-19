import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import superjson from 'superjson'
import { ss } from '../src/super-store.js'

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
const originalPoint0Side = process.env.POINT0_SIDE

describe('SuperStore', () => {
  describe('client', () => {
    beforeEach(() => {
      process.env.POINT0_SIDE = 'client'
      ;(globalThis as any).window = {}
      ;(globalThis as any).document = {}
      ss.reset()
    })

    afterEach(() => {
      process.env.POINT0_SIDE = originalPoint0Side
      ;(globalThis as any).window = originalWindow
      ;(globalThis as any).document = originalDocument
    })

    it('created', () => {
      expect(ss.items.size).toBe(0)
      expect(ss.prepared.size).toBe(0)
      // expect(ss.touched.size).toBe(0)
      expect(ss.transformer).toBeUndefined()
      // expect(ss.serverStorage).toBeUndefined()
      expect(ss.clientGlobalState).toEqual({})
    })

    describe('item', () => {
      it('define, get, set, get (ssr)', () => {
        const item = ss.define('item', () => 'value', 'clientServerTransferredSsr')
        expect(item.get()).toBe('value')
        item.set('value2')
        expect(item.get()).toBe('value2')
        expect(ss.getStates()).toMatchInlineSnapshot(`
          {
            "clientState": {
              "item": "value2",
            },
            "fakeClientState": undefined,
            "serverGlobalState": undefined,
            "serverStorageState": undefined,
            "variant": "client",
          }
        `)
      })
      it('define, get, set, get (serverOnlyStorage)', () => {
        const item = ss.define('item', () => 'value', 'serverOnlyStorage')
        expect(item.get).toThrow()
        expect(() => item.set('value2')).toThrow()
        expect(ss.getStates()).toMatchInlineSnapshot(`
          {
            "clientState": {},
            "fakeClientState": undefined,
            "serverGlobalState": undefined,
            "serverStorageState": undefined,
            "variant": "client",
          }
        `)
      })
      it('define, get, set, get (serverOnlyStorage)', () => {
        const item = ss.define('item', () => 'value', 'serverOnlyStorage')
        expect(item.get).toThrow()
        expect(() => item.set('value2')).toThrow()
        expect(ss.getStates()).toMatchInlineSnapshot(`
          {
            "clientState": {},
            "fakeClientState": undefined,
            "serverGlobalState": undefined,
            "serverStorageState": undefined,
            "variant": "client",
          }
        `)
      })
      it('define, get, set, get (clientOnly)', () => {
        const item = ss.define('item', () => 'value', 'clientOnly')
        expect(item.get()).toBe('value')
        item.set('value2')
        expect(item.get()).toBe('value2')
        expect(ss.getStates()).toMatchInlineSnapshot(`
          {
            "clientState": {
              "item": "value2",
            },
            "fakeClientState": undefined,
            "serverGlobalState": undefined,
            "serverStorageState": undefined,
            "variant": "client",
          }
        `)
      })

      it('define, set, get (clientOnly)', () => {
        const item = ss.define('item', () => 'value', 'clientOnly')
        item.set('value2')
        expect(item.get()).toBe('value2')
      })

      it('define, prepare, get', () => {
        const item = ss.define('item', () => 'value', 'clientOnly')
        ss.prepare({ item: 'value3' })
        expect(item.get()).toBe('value3')
      })

      it('define, prepare, set, get', () => {
        const item = ss.define('item', () => 'value', 'clientOnly')
        ss.prepare({ item: 'value3' })
        item.set('value4')
        expect(item.get()).toBe('value4')
      })

      it('prepare, define, get', () => {
        ss.prepare({ item: 'value3' })
        const item = ss.define('item', () => 'value', 'clientOnly')
        expect(item.get()).toBe('value3')
      })

      it('prepare, define, set, get', () => {
        ss.prepare({ item: 'value3' })
        const item = ss.define('item', () => 'value', 'clientOnly')
        expect(item.get()).toBe('value3')
      })

      it('prepare from string, define, get', () => {
        ss.prepare('{"item":"value3"}')
        const item = ss.define('item', () => 'value', 'clientOnly')
        expect(item.get()).toBe('value3')
      })
    })

    describe('store', () => {
      it('get undefined item value', () => {
        const value = ss.getValue('item', 'clientOnly')
        expect(value).toBeUndefined()
      })

      it('get defined item value', () => {
        ss.define('item', () => 'value', 'clientOnly')
        const value = ss.getValue('item', 'clientOnly')
        expect(value).toBe('value')
      })

      it('set undefined item value, get it', () => {
        ss.setValue('item', 'value', 'clientOnly')
        const value = ss.getValue('item', 'clientOnly')
        expect(value).toBe('value')
      })

      it('set defined item value, get it', () => {
        ss.define('item', () => 'value', 'clientOnly')
        ss.setValue('item', 'value2', 'clientOnly')
        const value = ss.getValue('item', 'clientOnly')
        expect(value).toBe('value2')
      })

      it('dehydrate, prepare with default', () => {
        ss.define('no-ssr', () => 'value', 'clientOnly')
        ss.define('string', () => 'value', 'clientServerTransferredSsr')
        ss.define('date', () => new Date('2017-01-01T00:00:00.000Z'), 'clientServerTransferredSsr')
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
        ss.define('no-ssr', () => 'value', 'clientOnly')
        ss.define('string', () => 'value', {
          dehydrate: (value) => value + '_1',
          hydrate: (dehydratedValue) => dehydratedValue + '_2',
        })
        ss.define('date', () => new Date('2017-01-01T00:00:00.000Z'), 'clientServerTransferredSsr')
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
        ss.reset.clientGlobalState()
        const value = ss.getValue('string', 'clientServerTransferredSsr')
        expect(value).toBe('value_1_2')
        expect(ss.getStates()).toMatchInlineSnapshot(`
          {
            "clientState": {
              "string": "value_1_2",
            },
            "fakeClientState": undefined,
            "serverGlobalState": undefined,
            "serverStorageState": undefined,
            "variant": "client",
          }
        `)
      })

      it('stringify with default transformer', () => {
        ss.define('no-ssr', () => 'value', 'clientOnly')
        ss.define('string', () => 'value', 'clientServerTransferredSsr')
        ss.define('date', () => new Date('2017-01-01T00:00:00.000Z'), 'clientServerTransferredSsr')
        const stringified = ss.stringify()
        expect(stringified).toEqual('{"date":"2017-01-01T00:00:00.000Z","string":"value"}')
      })

      it('stringify with custom transformer', () => {
        ss.define('no-ssr', () => 'value', 'clientOnly')
        ss.define('string', () => 'value', 'clientServerTransferredSsr')
        ss.define('date', () => new Date('2017-01-01T00:00:00.000Z'), 'clientServerTransferredSsr')
        ss.setTransformer(superjson)
        const stringified = ss.stringify()
        expect(stringified).toEqual(
          '{"json":{"date":"2017-01-01T00:00:00.000Z","string":"value"},"meta":{"v":1,"values":{"date":["Date"]}}}',
        )
      })
    })

    describe('proxy', () => {
      it('ok', () => {
        const first = ss.define('first', () => 'string', 'clientOnly')
        const second = ss.define('second', () => 123, 'clientOnly')
        const third = ss.define<number | string>('third', () => 123, 'clientOnly')
        const proxy = ss.proxy({ first, second, third })
        expect(proxy.first).toBe('string')
        expect(proxy.second).toBe(123)
        expect(proxy.third).toBe(123)
        proxy.third = 'x'
        expect(proxy.third).toBe('x')
      })
    })
  })

  describe('fakeClient', () => {
    beforeEach(() => {
      ;(globalThis as any).window = {}
      ;(globalThis as any).document = {}
      ss.reset()
    })

    afterEach(() => {
      ;(globalThis as any).window = originalWindow
      ;(globalThis as any).document = originalDocument
    })

    const withFakeClient = (fn: () => void) => {
      return () => {
        ss.runWithServerStorageState({ __POINT0_FAKE_CLIENT__: { id: '123', scope: 'root', runtime: 'browser' } }, fn)
      }
    }

    it(
      'created',
      withFakeClient(() => {
        expect(ss.items.size).toBe(0)
        expect(ss.prepared.size).toBe(0)
        // expect(ss.touched.size).toBe(0)
        expect(ss.transformer).toBeUndefined()
        // expect(ss.serverStorage).toBeUndefined()
        expect(ss.clientGlobalState).toEqual({})
      }),
    )

    describe('item', () => {
      it(
        'define, get, set, get (ssr)',
        withFakeClient(() => {
          const item = ss.define('item', () => 'value', 'clientServerTransferredSsr')
          expect(item.get()).toBe('value')
          item.set('value2')
          expect(item.get()).toBe('value2')
          expect(ss.getStates()).toMatchInlineSnapshot(`
          {
            "clientState": undefined,
            "fakeClientState": {
              "item": "value2",
            },
            "serverGlobalState": undefined,
            "serverStorageState": undefined,
            "variant": "fakeClient",
          }
        `)
        }),
      )
      it(
        'define, get, set, get (serverOnlyStorage)',
        withFakeClient(() => {
          const item = ss.define('item', () => 'value', 'serverOnlyStorage')
          expect(item.get).toThrow()
          expect(() => item.set('value2')).toThrow()
          expect(ss.getStates()).toMatchInlineSnapshot(`
          {
            "clientState": undefined,
            "fakeClientState": {},
            "serverGlobalState": undefined,
            "serverStorageState": undefined,
            "variant": "fakeClient",
          }
        `)
        }),
      )
      it(
        'define, get, set, get (serverOnlyStorage)',
        withFakeClient(() => {
          const item = ss.define('item', () => 'value', 'serverOnlyStorage')
          expect(item.get).toThrow()
          expect(() => item.set('value2')).toThrow()
          expect(ss.getStates()).toMatchInlineSnapshot(`
          {
            "clientState": undefined,
            "fakeClientState": {},
            "serverGlobalState": undefined,
            "serverStorageState": undefined,
            "variant": "fakeClient",
          }
        `)
        }),
      )
      it(
        'define, get, set, get (clientOnly)',
        withFakeClient(() => {
          const item = ss.define('item', () => 'value', 'clientOnly')
          expect(item.get()).toBe('value')
          item.set('value2')
          expect(item.get()).toBe('value2')
          expect(ss.getStates()).toMatchInlineSnapshot(`
          {
            "clientState": undefined,
            "fakeClientState": {
              "item": "value2",
            },
            "serverGlobalState": undefined,
            "serverStorageState": undefined,
            "variant": "fakeClient",
          }
        `)
        }),
      )

      it(
        'define, set, get (clientOnly)',
        withFakeClient(() => {
          const item = ss.define('item', () => 'value', 'clientOnly')
          item.set('value2')
          expect(item.get()).toBe('value2')
        }),
      )

      it(
        'define, prepare, get',
        withFakeClient(() => {
          const item = ss.define('item', () => 'value', 'clientOnly')
          ss.prepare({ item: 'value3' })
          expect(item.get()).toBe('value3')
        }),
      )

      it(
        'define, prepare, set, get',
        withFakeClient(() => {
          const item = ss.define('item', () => 'value', 'clientOnly')
          ss.prepare({ item: 'value3' })
          item.set('value4')
          expect(item.get()).toBe('value4')
        }),
      )

      it(
        'prepare, define, get',
        withFakeClient(() => {
          ss.prepare({ item: 'value3' })
          const item = ss.define('item', () => 'value', 'clientOnly')
          expect(item.get()).toBe('value3')
        }),
      )

      it(
        'prepare, define, set, get',
        withFakeClient(() => {
          ss.prepare({ item: 'value3' })
          const item = ss.define('item', () => 'value', 'clientOnly')
          expect(item.get()).toBe('value3')
        }),
      )

      it(
        'prepare from string, define, get',
        withFakeClient(() => {
          ss.prepare('{"item":"value3"}')
          const item = ss.define('item', () => 'value', 'clientOnly')
          expect(item.get()).toBe('value3')
        }),
      )
    })

    describe('store', () => {
      it(
        'get undefined item value',
        withFakeClient(() => {
          const value = ss.getValue('item', 'clientOnly')
          expect(value).toBeUndefined()
        }),
      )

      it(
        'get defined item value',
        withFakeClient(() => {
          ss.define('item', () => 'value', 'clientOnly')
          const value = ss.getValue('item', 'clientOnly')
          expect(value).toBe('value')
        }),
      )

      it(
        'set undefined item value, get it',
        withFakeClient(() => {
          ss.setValue('item', 'value', 'clientOnly')
          const value = ss.getValue('item', 'clientOnly')
          expect(value).toBe('value')
        }),
      )

      it(
        'set defined item value, get it',
        withFakeClient(() => {
          ss.define('item', () => 'value', 'clientOnly')
          ss.setValue('item', 'value2', 'clientOnly')
          const value = ss.getValue('item', 'clientOnly')
          expect(value).toBe('value2')
        }),
      )

      it(
        'dehydrate, prepare with default',
        withFakeClient(() => {
          ss.define('no-ssr', () => 'value', 'clientOnly')
          ss.define('string', () => 'value', 'clientServerTransferredSsr')
          ss.define('date', () => new Date('2017-01-01T00:00:00.000Z'), 'clientServerTransferredSsr')
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
        }),
      )

      it(
        'dehydrate, prepare with custom',
        withFakeClient(() => {
          ss.define('no-ssr', () => 'value', 'clientOnly')
          ss.define('string', () => 'value', {
            dehydrate: (value) => value + '_1',
            hydrate: (dehydratedValue) => dehydratedValue + '_2',
          })
          ss.define('date', () => new Date('2017-01-01T00:00:00.000Z'), 'clientServerTransferredSsr')
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
          ss.reset.clientGlobalState()
          const value = ss.getValue('string', 'clientServerTransferredSsr')
          expect(value).toBe('value_1_2')
          expect(ss.getStates()).toMatchInlineSnapshot(`
          {
            "clientState": undefined,
            "fakeClientState": {
              "date": 2017-01-01T00:00:00.000Z,
              "string": "value_1_2",
            },
            "serverGlobalState": undefined,
            "serverStorageState": undefined,
            "variant": "fakeClient",
          }
        `)
        }),
      )

      it(
        'stringify with default transformer',
        withFakeClient(() => {
          ss.define('no-ssr', () => 'value', 'clientOnly')
          ss.define('string', () => 'value', 'clientServerTransferredSsr')
          ss.define('date', () => new Date('2017-01-01T00:00:00.000Z'), 'clientServerTransferredSsr')
          const stringified = ss.stringify()
          expect(stringified).toEqual('{"date":"2017-01-01T00:00:00.000Z","string":"value"}')
        }),
      )

      it(
        'stringify with custom transformer',
        withFakeClient(() => {
          ss.define('no-ssr', () => 'value', 'clientOnly')
          ss.define('string', () => 'value', 'clientServerTransferredSsr')
          ss.define('date', () => new Date('2017-01-01T00:00:00.000Z'), 'clientServerTransferredSsr')
          ss.setTransformer(superjson)
          const stringified = ss.stringify()
          expect(stringified).toEqual(
            '{"json":{"date":"2017-01-01T00:00:00.000Z","string":"value"},"meta":{"v":1,"values":{"date":["Date"]}}}',
          )
        }),
      )
    })

    describe('proxy', () => {
      it(
        'ok',
        withFakeClient(() => {
          const first = ss.define('first', () => 'string', 'clientOnly')
          const second = ss.define('second', () => 123, 'clientOnly')
          const third = ss.define<number | string>('third', () => 123, 'clientOnly')
          const proxy = ss.proxy({ first, second, third })
          expect(proxy.first).toBe('string')
          expect(proxy.second).toBe(123)
          expect(proxy.third).toBe(123)
          proxy.third = 'x'
          expect(proxy.third).toBe('x')
        }),
      )
    })
  })

  describe('server', () => {
    beforeEach(() => {
      ss.reset()
    })

    it('created', () => {
      expect(ss.items.size).toBe(0)
      expect(ss.prepared.size).toBe(0)
      // expect(ss.touched.size).toBe(0)
      expect(ss.transformer).toBeUndefined()
      expect(ss.serverStorage).toBeDefined()
      expect(ss.clientGlobalState).toEqual({})
    })

    describe('item', () => {
      it('define, empty-run, get, set, get', () => {
        const item = ss.define('item', () => 'value', 'serverOnlyStorage')
        const item2 = ss.define('item2', () => 'x', 'serverOnlyGlobal')
        ss.runWithServerStorageState({}, () => {
          expect(item.get()).toBe('value')
          expect(item2.get()).toBe('x')
          item.set('value2')
          item2.set('x2')
          expect(item.get()).toBe('value2')
          expect(item2.get()).toBe('x2')
        })
        ss.runWithServerStorageState({}, () => {
          expect(item.get()).toBe('value')
          expect(item2.get()).toBe('x2')
        })
      })

      it('define, filled-run, get, set, get', () => {
        const item = ss.define('item', () => 'value', 'serverOnlyStorage')
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
          expect(ss.getValue('item', 'serverOnlyStorage')).toBeUndefined()
        })
      })

      it('get defined item value', () => {
        ss.define('item', () => 'value', 'serverOnlyStorage')
        ss.runWithServerStorageState({ item: 'value2' }, () => {
          const x = ss.getValue('item', 'serverOnlyStorage')
          expect(x).toBe('value2')
        })
        ss.runWithServerStorageState({}, () => {
          const x = ss.getValue('item', 'serverOnlyStorage')
          expect(x).toBe('value')
        })
      })
    })

    describe('createTypedRunWithServerStorageState', () => {
      it('ok', () => {
        const first = ss.define('first', () => 'string', 'serverOnlyStorage')
        const second = ss.define('second', () => 123, 'serverOnlyStorage')
        const third = ss.define<number | string | undefined>('third', () => 123, 'serverOnlyStorage')
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
