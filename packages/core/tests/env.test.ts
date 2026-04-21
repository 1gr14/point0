import { afterEach, beforeEach, describe, expect, expectTypeOf, it } from 'bun:test'
import {
  _getSsItemsWithRestErrors,
  _ssRunWithServerStorageState,
  type Env,
  type EnvOsName,
  type EnvRuntimeName,
} from '../src/index.js'

const serverStorageState = _getSsItemsWithRestErrors(
  {
    __POINT0_IS_SSR_IN_PROGRESS__: false,
    __POINT0_FAKE_CLIENT__: undefined,
  },
  'Value "%s" not exists in middleware call, this value accessible only in loader, ctx, components etc',
)

const withServerStorage = async <T>(callback: () => Promise<T>): Promise<T> => {
  return await _ssRunWithServerStorageState(serverStorageState, callback)
}

const init = async <
  TVars = any,
  TScope extends string = string,
  TRuntime extends EnvRuntimeName | undefined = EnvRuntimeName | undefined,
  TOs extends EnvOsName | undefined = EnvOsName | undefined,
>(options: {
  vars?: Record<string, string | boolean | number>
  ssr?: boolean
  side: 'client' | 'server'
  scope?: string
}): Promise<Env<TVars, TScope, TRuntime, TOs>> => {
  const { vars, ssr, side, scope } = options
  if (side === 'client') {
    ;(globalThis as any).window = {}
    ;(globalThis as any).document = {}
    ;(globalThis as any).navigator = {}
  }
  if (ssr !== undefined) {
    serverStorageState.__POINT0_IS_SSR_IN_PROGRESS__ = ssr
  }
  Object.assign(process.env, vars)
  if (scope) {
    process.env.POINT0_SCOPE = scope
  } else {
    process.env.POINT0_SCOPE ??= 'test'
  }
  process.env.NODE_ENV ??= 'test'
  return (await import('../src/index.js' + '?rand=' + Math.random())).env
}

describe('env', () => {
  const originalEnv = process.env
  const originalWindow = globalThis.window
  const originalDocument = globalThis.document
  const originalNavigator = globalThis.navigator
  const originalProcess = globalThis.process

  beforeEach(async () => {
    // Reset environment
    process.env = { ...originalEnv }
    // Clear global objects that might affect side detection
    try {
      process.env.POINT0_SIDE = undefined
      delete (globalThis as any).window
      delete (globalThis as any).document
      delete (globalThis as any).navigator

      serverStorageState.__POINT0_IS_SSR_IN_PROGRESS__ = false
    } catch {
      // console.error(error)
    }
  })

  afterEach(async () => {
    // Restore original environment
    process.env = originalEnv
    ;(globalThis as any).window = originalWindow
    ;(globalThis as any).document = originalDocument
    ;(globalThis as any).navigator = originalNavigator
    serverStorageState.__POINT0_IS_SSR_IN_PROGRESS__ = false
    ;(globalThis as any).process = originalProcess
  })

  describe('env.vars', () => {
    it('should expose environment variables', async () => {
      const env = await init({ vars: { CUSTOM_VAR: 'custom-value' }, side: 'server' })
      expect(typeof env.vars).toBe('object')
      expect(env.vars.CUSTOM_VAR).toBe('custom-value')
    })

    it('should have access to NODE_ENV', async () => {
      const env = await init({ side: 'server' })
      expect(env.vars.NODE_ENV).toBeDefined()
    })

    it('should have wide type if generic not provided', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const env = await init({ side: 'server' })
      expectTypeOf<typeof env.vars>().toEqualTypeOf<Readonly<Record<string, string | undefined>>>()
    })

    it('should have correct types when generic type provided', async () => {
      const env = await init<{ CUSTOM_VAR: string; STRONG_VAR: 'strong'; X: number }, 'x' | 'y'>({
        side: 'server',
        vars: { CUSTOM_VAR: 'custom-value', STRONG_VAR: 'strong', X: 1 },
      })
      expectTypeOf<typeof env.vars>().toEqualTypeOf<Readonly<{ CUSTOM_VAR: string; STRONG_VAR: 'strong'; X: number }>>()
      expect(env.vars.CUSTOM_VAR).toBe('custom-value')
      expectTypeOf<typeof env.vars.CUSTOM_VAR>().toEqualTypeOf<string>()
      expect(env.vars.STRONG_VAR).toBe('strong')
      expectTypeOf<typeof env.vars.STRONG_VAR>().toEqualTypeOf<'strong'>()
      expect(env.vars.X).toBe(1)
      expectTypeOf<typeof env.vars.X>().toEqualTypeOf<number>()
    })
  })

  describe('env.side', () => {
    describe('detection', () => {
      it('should detect server side in server environment', async () => {
        const env = await init({ side: 'server' })
        expect(env.side.name).toBe('server')
        expect(env.side.is.server).toBe(true)
        expect(env.side.is.client).toBe(false)
      })

      it('should detect client side in client environment', async () => {
        const env = await init({ side: 'client' })
        expect(env.side.name).toBe('client')
        expect(env.side.is.server).toBe(false)
        expect(env.side.is.client).toBe(true)
      })

      it('should have side.define function', async () => {
        const env = await init({ side: 'server' })
        expect(typeof env.side.define).toBe('function')
      })

      it('should have side.define.server and side.define.client', async () => {
        const env = await init({ side: 'server' })
        expect(typeof env.side.define.server).toBe('function')
        expect(typeof env.side.define.client).toBe('function')
      })

      it('should have side.define.unsafe', async () => {
        const env = await init({ side: 'server' })
        expect(typeof env.side.define.unsafe).toBe('object')
        expect(typeof env.side.define.unsafe.server).toBe('function')
        expect(typeof env.side.define.unsafe.client).toBe('function')
      })
    })

    describe('env.side.name', () => {
      it('on server return "server"', async () => {
        const env = await init({ side: 'server' })
        expect(env.side.name).toBe('server')
        expectTypeOf<typeof env.side.name>().toEqualTypeOf<'server' | 'client'>()
        if (env.side.name === 'server') {
          expectTypeOf<typeof env.side.name>().toEqualTypeOf<'server'>()
        } else {
          expectTypeOf<typeof env.side.name>().toEqualTypeOf<'client'>()
        }
      })

      it('on client return "client"', async () => {
        const env = await init({ side: 'client' })
        expect(env.side.name).toBe('client')
      })
    })

    describe('env.side.is', () => {
      it('on server is server', async () => {
        const env = await init({ side: 'server' })
        expect(env.side.is.server).toBe(true)
        expect(env.side.is.client).toBe(false)
      })

      it('on client is client', async () => {
        const env = await init({ side: 'client' })
        expect(env.side.is.client).toBe(true)
        expect(env.side.is.server).toBe(false)
      })

      it('correlates in types with name', async () => {
        const env = await init({ side: 'server' })
        expectTypeOf<typeof env.side.name>().toEqualTypeOf<'server' | 'client'>()
        expectTypeOf<typeof env.side.is.server>().toEqualTypeOf<boolean>()
        expectTypeOf<typeof env.side.is.client>().toEqualTypeOf<boolean>()
        if (env.side.name === 'server') {
          expectTypeOf<typeof env.side.is.server>().toEqualTypeOf<true>()
          expectTypeOf<typeof env.side.is.client>().toEqualTypeOf<false>()
          expectTypeOf<typeof env.side.name>().toEqualTypeOf<'server'>()
        } else {
          expectTypeOf<typeof env.side.is.server>().toEqualTypeOf<false>()
          expectTypeOf<typeof env.side.is.client>().toEqualTypeOf<true>()
          expectTypeOf<typeof env.side.name>().toEqualTypeOf<'client'>()
        }
        // It will not work, because TypeScript doesn't narrow discriminated unions based on nested property checks like env.side.is.client. Narrowing works when the discriminant is checked directly (e.g., env.side.name === 'server'), but not for nested properties.
        // if (env.side.is.client) {
        //   expectTypeOf<typeof env.side.name>().toEqualTypeOf<'client'>()
        // } else {
        //   expectTypeOf<typeof env.side.name>().toEqualTypeOf<'server'>()
        // }
      })
    })

    describe('env.side.define()', () => {
      it('should return server value when on server', async () => {
        const env = await init({ side: 'server' })
        const result = env.side.define({
          server: 'server-value' as const,
          client: 'client-value' as const,
        })
        expectTypeOf<typeof result>().toEqualTypeOf<'server-value' | 'client-value'>()
        expect(result).toBe('server-value')
      })

      it('should return client value when on client', async () => {
        const env = await init({ side: 'client' })
        const result = env.side.define({
          server: 'server-value',
          client: 'client-value',
        })
        expect(result).toBe('client-value')
      })

      it('should return undefined when only client option provided on server', async () => {
        const env = await init({ side: 'server' })
        const result = env.side.define({
          client: 'client-value' as const,
        })
        expectTypeOf<typeof result>().toEqualTypeOf<'client-value' | undefined>()
        expect(result).toBeUndefined()
      })

      it('should return undefined when only server option provided on client', async () => {
        const env = await init({ side: 'client' })
        const result = env.side.define({
          server: 'server-value' as const,
        })
        expectTypeOf<typeof result>().toEqualTypeOf<'server-value' | undefined>()
        expect(result).toBeUndefined()
      })
    })

    describe('env.side.define.server()', () => {
      it('on server return value', async () => {
        const env = await init({ side: 'server' })
        const result = env.side.define.server('test-value')
        expectTypeOf<typeof result>().toEqualTypeOf<'test-value' | undefined>()
        expect(result).toBe('test-value')
      })
      it('on client return undefined', async () => {
        const env = await init({ side: 'client' })
        const result = env.side.define.server('test-value')
        expectTypeOf<typeof result>().toEqualTypeOf<'test-value' | undefined>()
        expect(result).toBeUndefined()
      })
    })

    describe('env.side.define.client()', () => {
      it('on client return value', async () => {
        const env = await init({ side: 'client' })
        const result = env.side.define.client('test-value')
        expectTypeOf<typeof result>().toEqualTypeOf<'test-value' | undefined>()
        expect(result).toBe('test-value')
      })

      it('on server return undefined', async () => {
        const env = await init({ side: 'server' })
        const result = env.side.define.client('test-value')
        expectTypeOf<typeof result>().toEqualTypeOf<'test-value' | undefined>()
        expect(result).toBeUndefined()
      })
    })

    describe('env.side.define.unsafe.server()', () => {
      it('on server return value', async () => {
        const env = await init({ side: 'server' })
        const result = env.side.define.unsafe.server('test-value')
        expectTypeOf<typeof result>().toEqualTypeOf<'test-value'>()
        expect(result).toBe('test-value')
      })
      it('on client return undefined', async () => {
        const env = await init({ side: 'client' })
        const result = env.side.define.unsafe.server('test-value')
        expectTypeOf<typeof result>().toEqualTypeOf<'test-value'>()
        expect(result).toBeUndefined()
      })
    })

    describe('env.side.define.unsafe.client()', () => {
      it('on client return value', async () => {
        const env = await init({ side: 'client' })
        const result = env.side.define.unsafe.client('test-value')
        expectTypeOf<typeof result>().toEqualTypeOf<'test-value'>()
        expect(result).toBe('test-value')
      })

      it('on server return undefined', async () => {
        const env = await init({ side: 'server' })
        const result = env.side.define.unsafe.client('test-value')
        expectTypeOf<typeof result>().toEqualTypeOf<'test-value'>()
        expect(result).toBeUndefined()
      })
    })

    describe('side.is.ssr', () => {
      it('should return false on client', async () => {
        const env = await init({ side: 'client' })
        expect(env.side.is.ssr).toBe(false)
      })

      it('should return false on server when SSR is not defined', async () => {
        await withServerStorage(async () => {
          const env = await init({ side: 'server' })
          expect(env.side.is.ssr).toBe(false)
        })
      })

      it('should return false on server when SSR is not enabled', async () => {
        await withServerStorage(async () => {
          const env = await init({ side: 'server', ssr: false })
          expect(env.side.is.ssr).toBe(false)
        })
      })

      it('should return true on server when SSR is enabled', async () => {
        await withServerStorage(async () => {
          const env = await init({ side: 'server', ssr: true })
          expect(env.side.is.ssr).toBe(true)
        })
      })

      it('should return false on server when SSR is undefined', async () => {
        await withServerStorage(async () => {
          const env = await init({ side: 'server', ssr: undefined })
          expect(env.side.is.ssr).toBe(false)
        })
      })
    })
  })

  describe('env.scope', () => {
    describe('detection', () => {
      it('should have scope.is object', async () => {
        const env = await init({ side: 'server', scope: 'root' })
        expect(typeof env.scope.is).toBe('object')
      })

      it('should have scope.define function', async () => {
        const env = await init({ side: 'server', scope: 'root' })
        expect(typeof env.scope.define).toBe('function')
      })

      it('should have scope.define.unsafe', async () => {
        const env = await init({ side: 'server', scope: 'root' })
        expect(typeof env.scope.define.unsafe).toBe('object')
      })
    })

    describe('env.scope.name', () => {
      it('should return scope name from POINT0_SCOPE', async () => {
        const env = await init({ side: 'server', scope: 'test-scope' })
        expect(env.scope.name).toBe('test-scope')
      })

      it('should return be descriminated with scope types provided', async () => {
        const env = await init<any, 'x' | 'y'>({ side: 'server', scope: 'x' })
        expect(env.scope.name).toBe('x')
        expectTypeOf<typeof env.scope.name>().toEqualTypeOf<'x' | 'y'>()
        if (env.scope.name === 'x') {
          expectTypeOf<typeof env.scope.name>().toEqualTypeOf<'x'>()
        } else {
          expectTypeOf<typeof env.scope.name>().toEqualTypeOf<'y'>()
        }
      })
    })

    describe('env.scope.is', () => {
      it('should return true for current scope', async () => {
        const env = await init({ side: 'server', scope: 'x' })
        expect(env.scope.is.x).toBe(true)
        expectTypeOf<typeof env.scope.is.x>().toEqualTypeOf<boolean>()
        if (env.scope.is.x) {
          expectTypeOf<typeof env.scope.is.x>().toEqualTypeOf<true>()
          expectTypeOf<typeof env.scope.is.y>().toEqualTypeOf<boolean>()
        } else {
          expectTypeOf<typeof env.scope.is.x>().toEqualTypeOf<false>()
          expectTypeOf<typeof env.scope.is.y>().toEqualTypeOf<boolean>()
        }
      })

      it('should return false for different scope', async () => {
        const env = await init({ side: 'server', scope: 'y' })
        expect(env.scope.is.x).toBe(false)
        expectTypeOf<typeof env.scope.is.x>().toEqualTypeOf<boolean>()
      })

      it('should have correct types if generic type provided', async () => {
        const env = await init<any, 'x' | 'y'>({ side: 'server', scope: 'x' })
        expect(env.scope.is.x).toBe(true)
        expect(env.scope.is.y).toBe(false)
        expectTypeOf<typeof env.scope.is.x>().toEqualTypeOf<boolean>()
        expectTypeOf<typeof env.scope.is.y>().toEqualTypeOf<boolean>()
        if (env.scope.is.y) {
          expectTypeOf<typeof env.scope.is.y>().toEqualTypeOf<true>()
          expectTypeOf<typeof env.scope.is.x>().toEqualTypeOf<false>()
        } else {
          expectTypeOf<typeof env.scope.is.y>().toEqualTypeOf<false>()
          expectTypeOf<typeof env.scope.is.x>().toEqualTypeOf<true>()
        }
      })

      it('correlates in types with name if generic type provided', async () => {
        const env = await init<any, 'x' | 'y'>({ side: 'server', scope: 'x' })
        expectTypeOf<typeof env.scope.name>().toEqualTypeOf<'x' | 'y'>()
        expectTypeOf<typeof env.scope.is.x>().toEqualTypeOf<boolean>()
        expectTypeOf<typeof env.scope.is.y>().toEqualTypeOf<boolean>()
        if (env.scope.name === 'y') {
          expectTypeOf<typeof env.scope.is.y>().toEqualTypeOf<true>()
          expectTypeOf<typeof env.scope.is.x>().toEqualTypeOf<false>()
          expectTypeOf<typeof env.scope.name>().toEqualTypeOf<'y'>()
        } else {
          expectTypeOf<typeof env.scope.is.y>().toEqualTypeOf<false>()
          expectTypeOf<typeof env.scope.is.x>().toEqualTypeOf<true>()
          expectTypeOf<typeof env.scope.name>().toEqualTypeOf<'x'>()
        }
      })
    })

    describe('env.scope.define()', () => {
      it('should return value for current scope', async () => {
        const env = await init({ side: 'server', scope: 'x' })
        const result = env.scope.define({
          x: 'x-value' as const,
          y: 'y-value' as const,
        })
        expectTypeOf<typeof result>().toEqualTypeOf<'x-value' | 'y-value' | undefined>()
        expect(result).toBe('x-value')
      })

      it('should return undefined when current scope not in options', async () => {
        const env = await init({ side: 'server', scope: 'x' })
        const result = env.scope.define({
          y: 'y-value' as const,
        })
        expectTypeOf<typeof result>().toEqualTypeOf<'y-value' | undefined>()
        expect(result).toBeUndefined()
      })

      it('should return value for current scope, with correct type if generic type provided', async () => {
        const env = await init<any, 'x' | 'y'>({ side: 'server', scope: 'x' })
        const result = env.scope.define({
          x: 'x-value' as const,
          y: 'y-value' as const,
        })
        expectTypeOf<typeof result>().toEqualTypeOf<'x-value' | 'y-value'>()
        expect(result).toBe('x-value')
      })

      it('should return undefined when current scope not in options, with correct type if generic type provided', async () => {
        const env = await init<any, 'x' | 'y'>({ side: 'server', scope: 'x' })
        const result = env.scope.define({
          y: 'y-value' as const,
        })
        expectTypeOf<typeof result>().toEqualTypeOf<'y-value' | undefined>()
        expect(result).toBeUndefined()
      })

      it('should throw type when incorrect scope name provided', async () => {
        const env = await init<any, 'x' | 'y'>({ side: 'server', scope: 'x' })
        const result = env.scope.define({
          // @ts-expect-error - incorrect scope name
          zzz: 'y-value' as const,
        })
        expect(result).toBeUndefined()
      })
    })

    describe('env.scope.define.x()', () => {
      it('on x return value, if x is current scope', async () => {
        const env = await init({ side: 'server', scope: 'x' })
        const result = env.scope.define.x('test-value')
        expectTypeOf<typeof result>().toEqualTypeOf<'test-value' | undefined>()
        expect(result).toBe('test-value')
      })
      it('on y return undefined, if x is current scope', async () => {
        const env = await init({ side: 'server', scope: 'x' })
        const result = env.scope.define.y('test-value')
        expectTypeOf<typeof result>().toEqualTypeOf<'test-value' | undefined>()
        expect(result).toBeUndefined()
      })

      it('should throw type when incorrect scope name provided', async () => {
        const env = await init<any, 'x' | 'y'>({ side: 'server', scope: 'x' })
        // @ts-expect-error - incorrect scope name
        const result2 = env.scope.define.zzz('test-value')
        expect(result2).toBeUndefined()
      })
    })

    describe('env.scope.define.unsafe.x()', () => {
      it('on x return value, if x is current scope', async () => {
        const env = await init({ side: 'server', scope: 'x' })
        const result = env.scope.define.unsafe.x('test-value')
        expectTypeOf<typeof result>().toEqualTypeOf<'test-value'>()
        expect(result).toBe('test-value')
      })

      it('on y return undefined, if x is current scope', async () => {
        const env = await init({ side: 'server', scope: 'x' })
        const result = env.scope.define.unsafe.y('test-value')
        expectTypeOf<typeof result>().toEqualTypeOf<'test-value'>()
        expect(result).toBeUndefined()
      })

      it('should throw type when incorrect scope name provided', async () => {
        const env = await init<any, 'x' | 'y'>({ side: 'server', scope: 'x' })
        // @ts-expect-error - incorrect scope name
        const result2 = env.scope.define.unsafe.zzz('test-value')
        expect(result2).toBeUndefined()
      })
    })
  })

  describe('env.mode', () => {
    it('should have mode.name equal to NODE_ENV', async () => {
      const env = await init({ side: 'server', vars: { NODE_ENV: 'test' } })
      expect(env.mode.name).toBe('test')
    })

    it('should detect production mode', async () => {
      const env = await init({ side: 'server', vars: { NODE_ENV: 'production' } })
      expect(env.mode.is.production).toBe(true)
      expect(env.mode.is.development).toBe(false)
      expect(env.mode.is.test).toBe(false)
      expectTypeOf<typeof env.mode.is.production>().toEqualTypeOf<boolean>()
      if (env.mode.is.production) {
        expectTypeOf<typeof env.mode.is.production>().toEqualTypeOf<true>()
        expectTypeOf<typeof env.mode.is.development>().toEqualTypeOf<false>()
        expectTypeOf<typeof env.mode.is.test>().toEqualTypeOf<false>()
      } else {
        expectTypeOf<typeof env.mode.is.production>().toEqualTypeOf<false>()
        expectTypeOf<typeof env.mode.is.development>().toEqualTypeOf<boolean>()
        expectTypeOf<typeof env.mode.is.test>().toEqualTypeOf<boolean>()
      }
    })

    it('should detect development mode', async () => {
      const env = await init({ side: 'server', vars: { NODE_ENV: 'development' } })
      expect(env.mode.is.development).toBe(true)
      expect(env.mode.is.production).toBe(false)
      expect(env.mode.is.test).toBe(false)

      // It is hard to achive, becouse mode can be any string in fact, so it is ok
      // if (env.mode.name === 'development') {
      //   expectTypeOf<typeof env.mode.is.production>().toEqualTypeOf<false>()
      //   expectTypeOf<typeof env.mode.is.development>().toEqualTypeOf<true>()
      //   expectTypeOf<typeof env.mode.is.test>().toEqualTypeOf<false>()
      // } else {
      //   expectTypeOf<typeof env.mode.is.production>().toEqualTypeOf<boolean>()
      //   expectTypeOf<typeof env.mode.is.development>().toEqualTypeOf<boolean>()
      //   expectTypeOf<typeof env.mode.is.test>().toEqualTypeOf<boolean>()
      // }
    })

    it('should detect test mode', async () => {
      const env = await init({ side: 'server', vars: { NODE_ENV: 'test' } })
      expect(env.mode.is.test).toBe(true)
      expect(env.mode.is.production).toBe(false)
      expect(env.mode.is.development).toBe(false)
    })
  })

  describe('env.runtime', () => {
    it('should have runtime.name and runtime.is object', async () => {
      const env = await init({ side: 'server' })
      expect(['string', 'undefined']).toContain(typeof env.runtime.name)
      expect(typeof env.runtime.is).toBe('object')
      expect(typeof env.runtime.is.browser).toBe('boolean')
      expect(typeof env.runtime.is.reactNative).toBe('boolean')
      expect(typeof env.runtime.is.nodejs).toBe('boolean')
      expect(typeof env.runtime.is.bun).toBe('boolean')
      expect(typeof env.runtime.is.deno).toBe('boolean')
      expect(typeof env.runtime.is.worker).toBe('boolean')
      expect(typeof env.runtime.is.unknown).toBe('boolean')
      expect(typeof env.runtime.define).toBe('function')
      expect(typeof env.runtime.define.unsafe).toBe('object')
      expect(typeof env.runtime.define.browser).toBe('function')
      expect(typeof env.runtime.define.unknown).toBe('function')
    })

    it('should detect browser runtime on client', async () => {
      const env = await init({ side: 'client' })
      expect(env.runtime.name).toBe('browser')
      expect(env.runtime.is.browser).toBe(true)
    })

    describe('env.runtime.name', () => {
      it('should be discriminated with strict runtime types when provided', async () => {
        const env = await init<any, string, 'browser' | 'bun'>({ side: 'server', vars: { POINT0_RUNTIME: 'browser' } })
        expect(env.runtime.name).toBe('browser')
        expectTypeOf<typeof env.runtime.name>().toEqualTypeOf<'browser' | 'bun'>()
        if (env.runtime.name === 'browser') {
          expectTypeOf<typeof env.runtime.name>().toEqualTypeOf<'browser'>()
        } else {
          expectTypeOf<typeof env.runtime.name>().toEqualTypeOf<'bun'>()
        }
      })
    })

    describe('env.runtime.is', () => {
      it('should return true for current runtime from env override', async () => {
        const env = await init({ side: 'server', vars: { POINT0_RUNTIME: 'nodejs' } })
        expect(env.runtime.is.nodejs).toBe(true)
        expect(env.runtime.is.browser).toBe(false)
        expect(env.runtime.is.unknown).toBe(false)
      })

      it('should have scope-like discrimination for strict runtime generic', async () => {
        const env = await init<any, string, 'browser' | 'bun'>({ side: 'server', vars: { POINT0_RUNTIME: 'browser' } })
        expect(env.runtime.is.browser).toBe(true)
        expect(env.runtime.is.bun).toBe(false)
        expectTypeOf<typeof env.runtime.is.browser>().toEqualTypeOf<boolean>()
        expectTypeOf<typeof env.runtime.is.bun>().toEqualTypeOf<boolean>()
        if (env.runtime.is.bun) {
          expectTypeOf<typeof env.runtime.is.bun>().toEqualTypeOf<true>()
          expectTypeOf<typeof env.runtime.is.browser>().toEqualTypeOf<false>()
        } else {
          expectTypeOf<typeof env.runtime.is.bun>().toEqualTypeOf<false>()
          expectTypeOf<typeof env.runtime.is.browser>().toEqualTypeOf<true>()
        }
      })

      it('correlates in types with name when strict runtime generic includes undefined', async () => {
        const env = await init<any, string, 'browser' | 'bun' | undefined>({
          side: 'server',
          vars: { POINT0_RUNTIME: 'browser' },
        })
        expectTypeOf<typeof env.runtime.name>().toEqualTypeOf<'browser' | 'bun' | undefined>()
        expectTypeOf<typeof env.runtime.is.browser>().toEqualTypeOf<boolean>()
        expectTypeOf<typeof env.runtime.is.bun>().toEqualTypeOf<boolean>()
        expectTypeOf<typeof env.runtime.is.unknown>().toEqualTypeOf<boolean>()
        if (env.runtime.name === 'browser') {
          expectTypeOf<typeof env.runtime.is.browser>().toEqualTypeOf<true>()
          expectTypeOf<typeof env.runtime.is.bun>().toEqualTypeOf<false>()
          expectTypeOf<typeof env.runtime.is.unknown>().toEqualTypeOf<false>()
        } else if (env.runtime.name === 'bun') {
          expectTypeOf<typeof env.runtime.is.browser>().toEqualTypeOf<false>()
          expectTypeOf<typeof env.runtime.is.bun>().toEqualTypeOf<true>()
          expectTypeOf<typeof env.runtime.is.unknown>().toEqualTypeOf<false>()
        } else {
          expectTypeOf<typeof env.runtime.is.browser>().toEqualTypeOf<false>()
          expectTypeOf<typeof env.runtime.is.bun>().toEqualTypeOf<false>()
          expectTypeOf<typeof env.runtime.is.unknown>().toEqualTypeOf<true>()
        }
      })
    })

    describe('env.runtime.define()', () => {
      it('should return value for current runtime', async () => {
        const env = await init({ side: 'server', vars: { POINT0_RUNTIME: 'nodejs' } })
        const result = env.runtime.define({
          nodejs: 'node-value' as const,
          browser: 'browser-value' as const,
          unknown: 'unknown-value' as const,
        })
        expectTypeOf<typeof result>().toEqualTypeOf<'node-value' | 'browser-value' | 'unknown-value' | undefined>()
        expect(result).toBe('node-value')
      })

      it('should return value with strict types when strict runtime generic is provided', async () => {
        const env = await init<any, string, 'browser' | 'bun'>({ side: 'server', vars: { POINT0_RUNTIME: 'browser' } })
        const result = env.runtime.define({
          browser: 'browser-value' as const,
          bun: 'bun-value' as const,
        })
        expectTypeOf<typeof result>().toEqualTypeOf<'browser-value' | 'bun-value'>()
        expect(result).toBe('browser-value')
      })

      it('should throw type when incorrect runtime name provided for strict runtime generic', async () => {
        const env = await init<any, string, 'browser' | 'bun'>({ side: 'server', vars: { POINT0_RUNTIME: 'browser' } })
        const result = env.runtime.define({
          browser: 'browser-value' as const,
          bun: 'bun-value' as const,
          // @ts-expect-error - incorrect runtime key
          nodejs: 'node-value' as const,
        })
        expect(result).toBe('browser-value')
        const result2 = env.runtime.define({
          browser: 'browser-value' as const,
          bun: 'bun-value' as const,
          // @ts-expect-error - unknown is not allowed without undefined in runtime generic
          unknown: 'unknown-value' as const,
        })
        expect(result2).toBe('browser-value')
      })
    })

    describe('env.runtime.define.browser()', () => {
      it('should return value on browser and undefined on other runtime', async () => {
        const envBrowser = await init({ side: 'server', vars: { POINT0_RUNTIME: 'browser' } })
        const resultBrowser = envBrowser.runtime.define.browser('browser-value')
        expectTypeOf<typeof resultBrowser>().toEqualTypeOf<'browser-value' | undefined>()
        expect(resultBrowser).toBe('browser-value')

        const envBun = await init({ side: 'server', vars: { POINT0_RUNTIME: 'bun' } })
        const resultBun = envBun.runtime.define.browser('browser-value')
        expectTypeOf<typeof resultBun>().toEqualTypeOf<'browser-value' | undefined>()
        expect(resultBun).toBeUndefined()
      })
    })

    describe('env.runtime.define.unsafe.browser()', () => {
      it('should return value type without undefined, but runtime may be undefined', async () => {
        const env = await init({ side: 'server', vars: { POINT0_RUNTIME: 'bun' } })
        const result = env.runtime.define.unsafe.browser('browser-value')
        expectTypeOf<typeof result>().toEqualTypeOf<'browser-value'>()
        expect(result).toBeUndefined()
      })
    })
  })

  describe('env.os', () => {
    it('should have os.name and os.is object', async () => {
      const env = await init({ side: 'server' })
      expect(['string', 'undefined']).toContain(typeof env.os.name)
      expect(typeof env.os.is).toBe('object')
      expect(typeof env.os.is.ios).toBe('boolean')
      expect(typeof env.os.is.android).toBe('boolean')
      expect(typeof env.os.is.linux).toBe('boolean')
      expect(typeof env.os.is.mac).toBe('boolean')
      expect(typeof env.os.is.windows).toBe('boolean')
      expect(typeof env.os.is.unknown).toBe('boolean')
      expect(typeof env.os.define).toBe('function')
      expect(typeof env.os.define.unsafe).toBe('object')
      expect(typeof env.os.define.ios).toBe('function')
      expect(typeof env.os.define.unknown).toBe('function')
    })

    describe('env.os.name', () => {
      it('should be discriminated with strict os types when provided', async () => {
        const env = await init<any, string, EnvRuntimeName | undefined, 'ios' | 'android'>({
          side: 'server',
          vars: { POINT0_OS: 'ios' },
        })
        expect(env.os.name).toBe('ios')
        expectTypeOf<typeof env.os.name>().toEqualTypeOf<'ios' | 'android'>()
        if (env.os.name === 'ios') {
          expectTypeOf<typeof env.os.name>().toEqualTypeOf<'ios'>()
        } else {
          expectTypeOf<typeof env.os.name>().toEqualTypeOf<'android'>()
        }
      })
    })

    describe('env.os.is', () => {
      it('should return true for current os from env override', async () => {
        const env = await init({ side: 'server', vars: { POINT0_OS: 'linux' } })
        expect(env.os.is.linux).toBe(true)
        expect(env.os.is.mac).toBe(false)
        expect(env.os.is.unknown).toBe(false)
      })

      it('should have scope-like discrimination for strict os generic', async () => {
        const env = await init<any, string, EnvRuntimeName | undefined, 'ios' | 'android'>({
          side: 'server',
          vars: { POINT0_OS: 'ios' },
        })
        expect(env.os.is.ios).toBe(true)
        expect(env.os.is.android).toBe(false)
        expectTypeOf<typeof env.os.name>().toEqualTypeOf<'ios' | 'android'>()
        expectTypeOf<typeof env.os.is.ios>().toEqualTypeOf<boolean>()
        expectTypeOf<typeof env.os.is.android>().toEqualTypeOf<boolean>()
        if (env.os.is.android) {
          expectTypeOf<typeof env.os.is.android>().toEqualTypeOf<true>()
          expectTypeOf<typeof env.os.is.ios>().toEqualTypeOf<false>()
        } else {
          expectTypeOf<typeof env.os.is.android>().toEqualTypeOf<false>()
          expectTypeOf<typeof env.os.is.ios>().toEqualTypeOf<true>()
        }
      })

      it('correlates in types with name when strict os generic is provided', async () => {
        const env = await init<any, string, EnvRuntimeName | undefined, 'ios' | 'android' | undefined>({
          side: 'server',
          vars: { POINT0_OS: 'ios' },
        })
        expectTypeOf<typeof env.os.name>().toEqualTypeOf<'ios' | 'android' | undefined>()
        expectTypeOf<typeof env.os.is.ios>().toEqualTypeOf<boolean>()
        expectTypeOf<typeof env.os.is.android>().toEqualTypeOf<boolean>()
        expectTypeOf<typeof env.os.is.unknown>().toEqualTypeOf<boolean>()
        if (env.os.name === 'ios') {
          expectTypeOf<typeof env.os.is.ios>().toEqualTypeOf<true>()
          expectTypeOf<typeof env.os.is.android>().toEqualTypeOf<false>()
          expectTypeOf<typeof env.os.is.unknown>().toEqualTypeOf<false>()
        } else if (env.os.name === 'android') {
          expectTypeOf<typeof env.os.is.ios>().toEqualTypeOf<false>()
          expectTypeOf<typeof env.os.is.android>().toEqualTypeOf<true>()
          expectTypeOf<typeof env.os.is.unknown>().toEqualTypeOf<false>()
        } else {
          expectTypeOf<typeof env.os.is.ios>().toEqualTypeOf<false>()
          expectTypeOf<typeof env.os.is.android>().toEqualTypeOf<false>()
          expectTypeOf<typeof env.os.is.unknown>().toEqualTypeOf<true>()
        }
      })
    })

    describe('env.os.define()', () => {
      it('should return value for current os', async () => {
        const env = await init({ side: 'server', vars: { POINT0_OS: 'windows' } })
        const result = env.os.define({
          windows: 'win-value' as const,
          linux: 'linux-value' as const,
          unknown: 'unknown-value' as const,
        })
        expectTypeOf<typeof result>().toEqualTypeOf<'win-value' | 'linux-value' | 'unknown-value' | undefined>()
        expect(result).toBe('win-value')
      })

      it('should return value with strict types when strict os generic is provided', async () => {
        const env = await init<any, string, EnvRuntimeName | undefined, 'ios' | 'android'>({
          side: 'server',
          vars: { POINT0_OS: 'ios' },
        })
        const result = env.os.define({
          ios: 'ios-value' as const,
          android: 'android-value' as const,
        })
        expectTypeOf<typeof result>().toEqualTypeOf<'ios-value' | 'android-value'>()
        expect(result).toBe('ios-value')
      })

      it('should throw type when incorrect os name provided for strict os generic', async () => {
        const env = await init<any, string, EnvRuntimeName | undefined, 'ios' | 'android'>({
          side: 'server',
          vars: { POINT0_OS: 'ios' },
        })
        const result = env.os.define({
          ios: 'ios-value' as const,
          android: 'android-value' as const,
          // @ts-expect-error - incorrect os key
          linux: 'linux-value' as const,
        })
        expect(result).toBe('ios-value')
        const result2 = env.os.define({
          ios: 'ios-value' as const,
          android: 'android-value' as const,
          // @ts-expect-error - unknown is not allowed without undefined in os generic
          unknown: 'unknown-value' as const,
        })
        expect(result2).toBe('ios-value')
      })
    })

    describe('env.os.define.ios()', () => {
      it('should return value on ios and undefined on other os', async () => {
        const envIos = await init({ side: 'server', vars: { POINT0_OS: 'ios' } })
        const resultIos = envIos.os.define.ios('ios-value')
        expectTypeOf<typeof resultIos>().toEqualTypeOf<'ios-value' | undefined>()
        expect(resultIos).toBe('ios-value')

        const envLinux = await init({ side: 'server', vars: { POINT0_OS: 'linux' } })
        const resultLinux = envLinux.os.define.ios('ios-value')
        expectTypeOf<typeof resultLinux>().toEqualTypeOf<'ios-value' | undefined>()
        expect(resultLinux).toBeUndefined()
      })
    })

    describe('env.os.define.unsafe.ios()', () => {
      it('should return value type without undefined, but runtime may be undefined', async () => {
        const env = await init({ side: 'server', vars: { POINT0_OS: 'linux' } })
        const result = env.os.define.unsafe.ios('ios-value')
        expectTypeOf<typeof result>().toEqualTypeOf<'ios-value'>()
        expect(result).toBeUndefined()
      })
    })
  })

  describe('env.build', () => {
    it('should have build.was false by default', async () => {
      const env = await init({ side: 'server' })
      expect(env.build.was).toBe(false)
    })

    it('should define before value when not built', async () => {
      const env = await init({ side: 'server' })
      const result = env.build.define({
        before: 'before-value' as const,
        after: 'after-value' as const,
      })
      expectTypeOf<typeof result>().toEqualTypeOf<'before-value' | 'after-value'>()
      expect(result).toBe('before-value')
    })
  })

  describe('env object structure', () => {
    it('should export env object with all required properties', async () => {
      const env = await init({ side: 'server', scope: 'root' })
      expect(env).toBeDefined()
      expect(env.mode).toBeDefined()
      expect(env.vars).toBeDefined()
      expect(env.side).toBeDefined()
      expect(env.scope).toBeDefined()
      expect(env.runtime).toBeDefined()
      expect(env.os).toBeDefined()
      expect(env.build).toBeDefined()
    })
  })

  describe('edge cases', () => {
    it('should handle undefined values in side.define', async () => {
      const env = await init({ side: 'server' })
      const result = env.side.define({
        server: undefined,
        client: 'client-value',
      })
      expect(result).toBeUndefined()
    })

    it('should handle null values in side.define', async () => {
      const env = await init({ side: 'server' })
      const result = env.side.define({
        server: null,
        client: 'client-value',
      })
      expect(result).toBeNull()
    })

    it('should handle complex types in side.define', async () => {
      const env = await init({ side: 'server' })
      const complexValue = { nested: { value: 'test' } }
      const result = env.side.define({
        server: complexValue,
        client: {},
      })
      expect(result).toEqual(complexValue)
    })

    it('should handle multiple scopes in scope.define', async () => {
      const env = await init({ side: 'server', scope: 'scope-a' })
      const currentScope = env.scope.name
      const result = env.scope.define({
        [currentScope]: 'value-a',
        'scope-b': 'value-b',
        'scope-c': 'value-c',
      })
      expect(result).toBe('value-a')
    })
  })
})
