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
const originalPoint0Side = process.env.POINT0_SIDE

describe('SuperStore', () => {
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

    it('created', () => {
      expect(superstore.items.size).toBe(0)
      expect(superstore.prepared.size).toBe(0)
      // expect(ss.touched.size).toBe(0)
      expect(superstore.transformer).toBeUndefined()
      // expect(ss.serverStorage).toBeUndefined()
      expect(superstore.clientGlobalState).toEqual({})
    })

    describe('item', () => {
      it('define, get, set, get (ssr)', () => {
        const item = superstore.define('item', () => 'value', 'clientServerTransferredSsr')
        expect(item.get()).toBe('value')
        item.set('value2')
        expect(item.get()).toBe('value2')
        expect(superstore.getStates()).toMatchInlineSnapshot(`
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
        const item = superstore.define('item', () => 'value', 'serverOnlyStorage')
        expect(item.get).toThrow()
        expect(() => item.set('value2')).toThrow()
        expect(superstore.getStates()).toMatchInlineSnapshot(`
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
        const item = superstore.define('item', () => 'value', 'serverOnlyStorage')
        expect(item.get).toThrow()
        expect(() => item.set('value2')).toThrow()
        expect(superstore.getStates()).toMatchInlineSnapshot(`
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
        const item = superstore.define('item', () => 'value', 'clientOnly')
        expect(item.get()).toBe('value')
        item.set('value2')
        expect(item.get()).toBe('value2')
        expect(superstore.getStates()).toMatchInlineSnapshot(`
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
        const item = superstore.define('item', () => 'value', 'clientOnly')
        item.set('value2')
        expect(item.get()).toBe('value2')
      })

      it('define, prepare, get', () => {
        const item = superstore.define('item', () => 'value', 'clientOnly')
        superstore.prepare({ item: 'value3' })
        expect(item.get()).toBe('value3')
      })

      it('define, prepare, set, get', () => {
        const item = superstore.define('item', () => 'value', 'clientOnly')
        superstore.prepare({ item: 'value3' })
        item.set('value4')
        expect(item.get()).toBe('value4')
      })

      it('prepare, define, get', () => {
        superstore.prepare({ item: 'value3' })
        const item = superstore.define('item', () => 'value', 'clientOnly')
        expect(item.get()).toBe('value3')
      })

      it('prepare, define, set, get', () => {
        superstore.prepare({ item: 'value3' })
        const item = superstore.define('item', () => 'value', 'clientOnly')
        expect(item.get()).toBe('value3')
      })

      it('prepare from string, define, get', () => {
        superstore.prepare('{"item":"value3"}')
        const item = superstore.define('item', () => 'value', 'clientOnly')
        expect(item.get()).toBe('value3')
      })

      it('createProxy delegates object property read/write and exposes superstore', () => {
        const item = superstore.define('item', () => ({ count: 1 }), 'clientOnly')
        const proxy = item.proxy

        expect(proxy.count).toBe(1)
        proxy.count = 2
        expect(proxy.count).toBe(2)
        expect(item.get()).toEqual({ count: 2 })
        expect(proxy.superstore).toBe(item as any)
        expect('superstore' in proxy).toBe(true)
      })

      it('createProxy supports primitive values', () => {
        const item = superstore.define('item', () => 'hello', 'clientOnly')
        const proxy = item.proxy

        expect(proxy.length).toBe(5)
        expect(() => {
          // @ts-expect-error -- bad case, but still not throw
          proxy.x = 1
        }).not.toThrow()
        expect(item.get()).toBe('hello')
      })

      it('createProxy keeps class private fields working', () => {
        class PrivateClass {
          #value = 'ok'
          get value() {
            return this.#value
          }
          read() {
            return this.#value
          }
        }

        const item = superstore.define('item', () => new PrivateClass(), 'clientOnly')
        const proxy = item.proxy

        expect(proxy.value).toBe('ok')
        expect(proxy.read()).toBe('ok')
      })
    })

    describe('store', () => {
      it('get undefined item value', () => {
        const value = superstore.getValue('item', 'clientOnly')
        expect(value).toBeUndefined()
      })

      it('get defined item value', () => {
        superstore.define('item', () => 'value', 'clientOnly')
        const value = superstore.getValue('item', 'clientOnly')
        expect(value).toBe('value')
      })

      it('set undefined item value, get it', () => {
        superstore.setValue('item', 'value', 'clientOnly')
        const value = superstore.getValue('item', 'clientOnly')
        expect(value).toBe('value')
      })

      it('set defined item value, get it', () => {
        superstore.define('item', () => 'value', 'clientOnly')
        superstore.setValue('item', 'value2', 'clientOnly')
        const value = superstore.getValue('item', 'clientOnly')
        expect(value).toBe('value2')
      })

      it('dehydrate, prepare with default', () => {
        superstore.define('no-ssr', () => 'value', 'clientOnly')
        superstore.define('string', () => 'value', 'clientServerTransferredSsr')
        superstore.define('date', () => new Date('2017-01-01T00:00:00.000Z'), 'clientServerTransferredSsr')
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
        superstore.define('no-ssr', () => 'value', 'clientOnly')
        superstore.define('string', () => 'value', {
          dehydrate: (value) => value + '_1',
          hydrate: (dehydratedValue) => dehydratedValue + '_2',
        })
        superstore.define('date', () => new Date('2017-01-01T00:00:00.000Z'), 'clientServerTransferredSsr')
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
        superstore.reset.clientGlobalState()
        const value = superstore.getValue('string', 'clientServerTransferredSsr')
        expect(value).toBe('value_1_2')
        expect(superstore.getStates()).toMatchInlineSnapshot(`
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
        superstore.define('no-ssr', () => 'value', 'clientOnly')
        superstore.define('string', () => 'value', 'clientServerTransferredSsr')
        superstore.define('date', () => new Date('2017-01-01T00:00:00.000Z'), 'clientServerTransferredSsr')
        const stringified = superstore.stringify()
        expect(stringified).toEqual('{"date":"2017-01-01T00:00:00.000Z","string":"value"}')
      })

      it('stringify with custom transformer', () => {
        superstore.define('no-ssr', () => 'value', 'clientOnly')
        superstore.define('string', () => 'value', 'clientServerTransferredSsr')
        superstore.define('date', () => new Date('2017-01-01T00:00:00.000Z'), 'clientServerTransferredSsr')
        superstore.setTransformer(superjson)
        const stringified = superstore.stringify()
        expect(stringified).toEqual(
          '{"json":{"date":"2017-01-01T00:00:00.000Z","string":"value"},"meta":{"v":1,"values":{"date":["Date"]}}}',
        )
      })
    })

    // describe('proxy', () => {
    //   it('ok', () => {
    //     const first = superstore.define('first', () => 'string', 'clientOnly')
    //     const second = superstore.define('second', () => 123, 'clientOnly')
    //     const third = superstore.define<number | string>('third', () => 123, 'clientOnly')
    //     const proxy = superstore.proxy({ first, second, third })
    //     expect(proxy.first).toBe('string')
    //     expect(proxy.second).toBe(123)
    //     expect(proxy.third).toBe(123)
    //     proxy.third = 'x'
    //     expect(proxy.third).toBe('x')
    //   })
    // })
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
      'created',
      withFakeClient(() => {
        expect(superstore.items.size).toBe(0)
        expect(superstore.prepared.size).toBe(0)
        // expect(ss.touched.size).toBe(0)
        expect(superstore.transformer).toBeUndefined()
        // expect(ss.serverStorage).toBeUndefined()
        expect(superstore.clientGlobalState).toEqual({})
      }),
    )

    describe('item', () => {
      it(
        'define, get, set, get (ssr)',
        withFakeClient(() => {
          const item = superstore.define('item', () => 'value', 'clientServerTransferredSsr')
          expect(item.get()).toBe('value')
          item.set('value2')
          expect(item.get()).toBe('value2')
          expect(superstore.getStates()).toMatchInlineSnapshot(`
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
          const item = superstore.define('item', () => 'value', 'serverOnlyStorage')
          expect(item.get).toThrow()
          expect(() => item.set('value2')).toThrow()
          expect(superstore.getStates()).toMatchInlineSnapshot(`
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
          const item = superstore.define('item', () => 'value', 'serverOnlyStorage')
          expect(item.get).toThrow()
          expect(() => item.set('value2')).toThrow()
          expect(superstore.getStates()).toMatchInlineSnapshot(`
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
          const item = superstore.define('item', () => 'value', 'clientOnly')
          expect(item.get()).toBe('value')
          item.set('value2')
          expect(item.get()).toBe('value2')
          expect(superstore.getStates()).toMatchInlineSnapshot(`
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
          const item = superstore.define('item', () => 'value', 'clientOnly')
          item.set('value2')
          expect(item.get()).toBe('value2')
        }),
      )

      it(
        'define, prepare, get',
        withFakeClient(() => {
          const item = superstore.define('item', () => 'value', 'clientOnly')
          superstore.prepare({ item: 'value3' })
          expect(item.get()).toBe('value3')
        }),
      )

      it(
        'define, prepare, set, get',
        withFakeClient(() => {
          const item = superstore.define('item', () => 'value', 'clientOnly')
          superstore.prepare({ item: 'value3' })
          item.set('value4')
          expect(item.get()).toBe('value4')
        }),
      )

      it(
        'prepare, define, get',
        withFakeClient(() => {
          superstore.prepare({ item: 'value3' })
          const item = superstore.define('item', () => 'value', 'clientOnly')
          expect(item.get()).toBe('value3')
        }),
      )

      it(
        'prepare, define, set, get',
        withFakeClient(() => {
          superstore.prepare({ item: 'value3' })
          const item = superstore.define('item', () => 'value', 'clientOnly')
          expect(item.get()).toBe('value3')
        }),
      )

      it(
        'prepare from string, define, get',
        withFakeClient(() => {
          superstore.prepare('{"item":"value3"}')
          const item = superstore.define('item', () => 'value', 'clientOnly')
          expect(item.get()).toBe('value3')
        }),
      )
    })

    describe('store', () => {
      it(
        'get undefined item value',
        withFakeClient(() => {
          const value = superstore.getValue('item', 'clientOnly')
          expect(value).toBeUndefined()
        }),
      )

      it(
        'get defined item value',
        withFakeClient(() => {
          superstore.define('item', () => 'value', 'clientOnly')
          const value = superstore.getValue('item', 'clientOnly')
          expect(value).toBe('value')
        }),
      )

      it(
        'set undefined item value, get it',
        withFakeClient(() => {
          superstore.setValue('item', 'value', 'clientOnly')
          const value = superstore.getValue('item', 'clientOnly')
          expect(value).toBe('value')
        }),
      )

      it(
        'set defined item value, get it',
        withFakeClient(() => {
          superstore.define('item', () => 'value', 'clientOnly')
          superstore.setValue('item', 'value2', 'clientOnly')
          const value = superstore.getValue('item', 'clientOnly')
          expect(value).toBe('value2')
        }),
      )

      it(
        'dehydrate, prepare with default',
        withFakeClient(() => {
          superstore.define('no-ssr', () => 'value', 'clientOnly')
          superstore.define('string', () => 'value', 'clientServerTransferredSsr')
          superstore.define('date', () => new Date('2017-01-01T00:00:00.000Z'), 'clientServerTransferredSsr')
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
        }),
      )

      it(
        'dehydrate, prepare with custom',
        withFakeClient(() => {
          superstore.define('no-ssr', () => 'value', 'clientOnly')
          superstore.define('string', () => 'value', {
            dehydrate: (value) => value + '_1',
            hydrate: (dehydratedValue) => dehydratedValue + '_2',
          })
          superstore.define('date', () => new Date('2017-01-01T00:00:00.000Z'), 'clientServerTransferredSsr')
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
          superstore.reset.clientGlobalState()
          const value = superstore.getValue('string', 'clientServerTransferredSsr')
          expect(value).toBe('value_1_2')
          expect(superstore.getStates()).toMatchInlineSnapshot(`
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
          superstore.define('no-ssr', () => 'value', 'clientOnly')
          superstore.define('string', () => 'value', 'clientServerTransferredSsr')
          superstore.define('date', () => new Date('2017-01-01T00:00:00.000Z'), 'clientServerTransferredSsr')
          const stringified = superstore.stringify()
          expect(stringified).toEqual('{"date":"2017-01-01T00:00:00.000Z","string":"value"}')
        }),
      )

      it(
        'stringify with custom transformer',
        withFakeClient(() => {
          superstore.define('no-ssr', () => 'value', 'clientOnly')
          superstore.define('string', () => 'value', 'clientServerTransferredSsr')
          superstore.define('date', () => new Date('2017-01-01T00:00:00.000Z'), 'clientServerTransferredSsr')
          superstore.setTransformer(superjson)
          const stringified = superstore.stringify()
          expect(stringified).toEqual(
            '{"json":{"date":"2017-01-01T00:00:00.000Z","string":"value"},"meta":{"v":1,"values":{"date":["Date"]}}}',
          )
        }),
      )
    })

    // describe('proxy', () => {
    //   it(
    //     'ok',
    //     withFakeClient(() => {
    //       const first = superstore.define('first', () => 'string', 'clientOnly')
    //       const second = superstore.define('second', () => 123, 'clientOnly')
    //       const third = superstore.define<number | string>('third', () => 123, 'clientOnly')
    //       const proxy = superstore.proxy({ first, second, third })
    //       expect(proxy.first).toBe('string')
    //       expect(proxy.second).toBe(123)
    //       expect(proxy.third).toBe(123)
    //       proxy.third = 'x'
    //       expect(proxy.third).toBe('x')
    //     }),
    //   )
    // })
  })

  describe('server', () => {
    beforeEach(() => {
      superstore.reset()
    })

    it('created', () => {
      expect(superstore.items.size).toBe(0)
      expect(superstore.prepared.size).toBe(0)
      // expect(ss.touched.size).toBe(0)
      expect(superstore.transformer).toBeUndefined()
      expect(superstore.serverStorage).toBeDefined()
      expect(superstore.clientGlobalState).toEqual({})
    })

    describe('item', () => {
      it('define, empty-run, get, set, get', () => {
        const item = superstore.define('item', () => 'value', 'serverOnlyStorage')
        const item2 = superstore.define('item2', () => 'x', 'serverOnlyGlobal')
        superstore.runWithServerStorageState({}, () => {
          expect(item.get()).toBe('value')
          expect(item2.get()).toBe('x')
          item.set('value2')
          item2.set('x2')
          expect(item.get()).toBe('value2')
          expect(item2.get()).toBe('x2')
        })
        superstore.runWithServerStorageState({}, () => {
          expect(item.get()).toBe('value')
          expect(item2.get()).toBe('x2')
        })
      })

      it('define, filled-run, get, set, get', () => {
        const item = superstore.define('item', () => 'value', 'serverOnlyStorage')
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
          expect(superstore.getValue('item', 'serverOnlyStorage')).toBeUndefined()
        })
      })

      it('get defined item value', () => {
        superstore.define('item', () => 'value', 'serverOnlyStorage')
        superstore.runWithServerStorageState({ item: 'value2' }, () => {
          const x = superstore.getValue('item', 'serverOnlyStorage')
          expect(x).toBe('value2')
        })
        superstore.runWithServerStorageState({}, () => {
          const x = superstore.getValue('item', 'serverOnlyStorage')
          expect(x).toBe('value')
        })
      })
    })

    describe('createTypedRunWithServerStorageState', () => {
      it('ok', () => {
        const first = superstore.define('first', () => 'string', 'serverOnlyStorage')
        const second = superstore.define('second', () => 123, 'serverOnlyStorage')
        const third = superstore.define<number | string | undefined>('third', () => 123, 'serverOnlyStorage')
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const items = { first, second, third }
        // const proxy = superstore.proxy(items)
        const run = superstore.createTypedRunWithServerStorageState<typeof items>()
        run({ first: 'string2', second: 456, third: undefined }, () => {
          expect(first.get()).toBe('string2')
          expect(second.get()).toBe(456)
          expect(third.get()).toBeUndefined()
        })
      })
    })
  })
})
