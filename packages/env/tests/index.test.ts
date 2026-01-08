import { afterEach, beforeEach, describe, expect, expectTypeOf, it } from 'bun:test'
import type { Env } from '../src/index.js'

const init = async <TVars = any, TScope extends string = string>(options: {
  vars?: Record<string, string | boolean | number>
  ssr?: 'prepass' | 'final' | boolean
  target: 'client' | 'server'
  scope?: string
}): Promise<Env<TVars, TScope>> => {
  const { vars, ssr, target, scope } = options
  if (target === 'client') {
    ;(globalThis as any).window = {}
    ;(globalThis as any).document = {}
    ;(globalThis as any).navigator = {}
  }
  if (target === 'server') {
    ;(globalThis as any).__GET_SSR_PHASE__ = () => ssr
  }
  Object.assign(process.env, vars)
  if (scope) {
    process.env.POINT0_SCOPE = scope
  } else {
    process.env.POINT0_SCOPE ||= 'test'
  }
  process.env.NODE_ENV ||= 'test'
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
    // Clear global objects that might affect target detection
    delete (globalThis as any).window
    delete (globalThis as any).document
    delete (globalThis as any).navigator
  })

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv
    ;(globalThis as any).window = originalWindow
    ;(globalThis as any).document = originalDocument
    ;(globalThis as any).navigator = originalNavigator
    ;(globalThis as any).process = originalProcess
  })

  describe('env.vars', () => {
    it('should expose environment variables', async () => {
      const env = await init({ vars: { CUSTOM_VAR: 'custom-value' }, target: 'server' })
      expect(typeof env.vars).toBe('object')
      expect(env.vars.CUSTOM_VAR).toBe('custom-value')
    })

    it('should have access to NODE_ENV', async () => {
      const env = await init({ target: 'server' })
      expect(env.vars.NODE_ENV).toBeDefined()
    })

    it('should have wide type if generic not provided', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const env = await init({ target: 'server' })
      expectTypeOf<typeof env.vars>().toEqualTypeOf<
        Readonly<Record<string, string | boolean | number | null | undefined>>
      >()
    })

    it('should have correct types when generic type provided', async () => {
      const env = await init<{ CUSTOM_VAR: string; STRONG_VAR: 'strong'; X: number }, 'x' | 'y'>({
        target: 'server',
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

  describe('env.target', () => {
    describe('detection', () => {
      it('should detect server target in server environment', async () => {
        const env = await init({ target: 'server' })
        expect(env.target.name).toBe('server')
        expect(env.target.is.server).toBe(true)
        expect(env.target.is.client).toBe(false)
      })

      it('should detect client target in client environment', async () => {
        const env = await init({ target: 'client' })
        expect(env.target.name).toBe('client')
        expect(env.target.is.server).toBe(false)
        expect(env.target.is.client).toBe(true)
      })

      it('should have target.define function', async () => {
        const env = await init({ target: 'server' })
        expect(typeof env.target.define).toBe('function')
      })

      it('should have target.define.server and target.define.client', async () => {
        const env = await init({ target: 'server' })
        expect(typeof env.target.define.server).toBe('function')
        expect(typeof env.target.define.client).toBe('function')
      })

      it('should have target.define.unsafe', async () => {
        const env = await init({ target: 'server' })
        expect(typeof env.target.define.unsafe).toBe('object')
        expect(typeof env.target.define.unsafe.server).toBe('function')
        expect(typeof env.target.define.unsafe.client).toBe('function')
      })
    })

    describe('env.target.name', () => {
      it('on server return "server"', async () => {
        const env = await init({ target: 'server' })
        expect(env.target.name).toBe('server')
        expectTypeOf<typeof env.target.name>().toEqualTypeOf<'server' | 'client'>()
        if (env.target.name === 'server') {
          expectTypeOf<typeof env.target.name>().toEqualTypeOf<'server'>()
        } else {
          expectTypeOf<typeof env.target.name>().toEqualTypeOf<'client'>()
        }
      })

      it('on client return "client"', async () => {
        const env = await init({ target: 'client' })
        expect(env.target.name).toBe('client')
      })
    })

    describe('env.target.is', () => {
      it('on server is server', async () => {
        const env = await init({ target: 'server' })
        expect(env.target.is.server).toBe(true)
        expect(env.target.is.client).toBe(false)
      })

      it('on client is client', async () => {
        const env = await init({ target: 'client' })
        expect(env.target.is.client).toBe(true)
        expect(env.target.is.server).toBe(false)
      })

      it('correlates in types with name', async () => {
        const env = await init({ target: 'server' })
        expectTypeOf<typeof env.target.name>().toEqualTypeOf<'server' | 'client'>()
        expectTypeOf<typeof env.target.is.server>().toEqualTypeOf<boolean>()
        expectTypeOf<typeof env.target.is.client>().toEqualTypeOf<boolean>()
        if (env.target.name === 'server') {
          expectTypeOf<typeof env.target.is.server>().toEqualTypeOf<true>()
          expectTypeOf<typeof env.target.is.client>().toEqualTypeOf<false>()
          expectTypeOf<typeof env.target.name>().toEqualTypeOf<'server'>()
        } else {
          expectTypeOf<typeof env.target.is.server>().toEqualTypeOf<false>()
          expectTypeOf<typeof env.target.is.client>().toEqualTypeOf<true>()
          expectTypeOf<typeof env.target.name>().toEqualTypeOf<'client'>()
        }
        // It will not wrok, becouse TypeScript doesn't narrow discriminated unions based on nested property checks like env.target.is.client. Narrowing works when the discriminant is checked directly (e.g., env.target.name === 'server'), but not for nested properties.
        // if (env.target.is.client) {
        //   expectTypeOf<typeof env.target.name>().toEqualTypeOf<'client'>()
        // } else {
        //   expectTypeOf<typeof env.target.name>().toEqualTypeOf<'server'>()
        // }
      })
    })

    describe('env.target.define()', () => {
      it('should return server value when on server', async () => {
        const env = await init({ target: 'server' })
        const result = env.target.define({
          server: 'server-value' as const,
          client: 'client-value' as const,
        })
        expectTypeOf<typeof result>().toEqualTypeOf<'server-value' | 'client-value'>()
        expect(result).toBe('server-value')
      })

      it('should return client value when on client', async () => {
        const env = await init({ target: 'client' })
        const result = env.target.define({
          server: 'server-value',
          client: 'client-value',
        })
        expect(result).toBe('client-value')
      })

      it('should return undefined when only client option provided on server', async () => {
        const env = await init({ target: 'server' })
        const result = env.target.define({
          client: 'client-value' as const,
        })
        expectTypeOf<typeof result>().toEqualTypeOf<'client-value' | undefined>()
        expect(result).toBeUndefined()
      })

      it('should return undefined when only server option provided on client', async () => {
        const env = await init({ target: 'client' })
        const result = env.target.define({
          server: 'server-value' as const,
        })
        expectTypeOf<typeof result>().toEqualTypeOf<'server-value' | undefined>()
        expect(result).toBeUndefined()
      })
    })

    describe('env.target.define.server()', () => {
      it('on server return value', async () => {
        const env = await init({ target: 'server' })
        const result = env.target.define.server('test-value')
        expectTypeOf<typeof result>().toEqualTypeOf<'test-value' | undefined>()
        expect(result).toBe('test-value')
      })
      it('on client return undefined', async () => {
        const env = await init({ target: 'client' })
        const result = env.target.define.server('test-value')
        expectTypeOf<typeof result>().toEqualTypeOf<'test-value' | undefined>()
        expect(result).toBeUndefined()
      })
    })

    describe('env.target.define.client()', () => {
      it('on client return value', async () => {
        const env = await init({ target: 'client' })
        const result = env.target.define.client('test-value')
        expectTypeOf<typeof result>().toEqualTypeOf<'test-value' | undefined>()
        expect(result).toBe('test-value')
      })

      it('on server return undefined', async () => {
        const env = await init({ target: 'server' })
        const result = env.target.define.client('test-value')
        expectTypeOf<typeof result>().toEqualTypeOf<'test-value' | undefined>()
        expect(result).toBeUndefined()
      })
    })

    describe('env.target.define.unsafe.server()', () => {
      it('on server return value', async () => {
        const env = await init({ target: 'server' })
        const result = env.target.define.unsafe.server('test-value')
        expectTypeOf<typeof result>().toEqualTypeOf<'test-value'>()
        expect(result).toBe('test-value')
      })
      it('on client return undefined', async () => {
        const env = await init({ target: 'client' })
        const result = env.target.define.unsafe.server('test-value')
        expectTypeOf<typeof result>().toEqualTypeOf<'test-value'>()
        expect(result).toBeUndefined()
      })
    })

    describe('env.target.define.unsafe.client()', () => {
      it('on client return value', async () => {
        const env = await init({ target: 'client' })
        const result = env.target.define.unsafe.client('test-value')
        expectTypeOf<typeof result>().toEqualTypeOf<'test-value'>()
        expect(result).toBe('test-value')
      })

      it('on server return undefined', async () => {
        const env = await init({ target: 'server' })
        const result = env.target.define.unsafe.client('test-value')
        expectTypeOf<typeof result>().toEqualTypeOf<'test-value'>()
        expect(result).toBeUndefined()
      })
    })

    describe('target.is.ssr', () => {
      it('should return false on client', async () => {
        const env = await init({ target: 'client' })
        expect(env.target.is.ssr).toBe(false)
      })

      it('should return false on server when SSR is not defined', async () => {
        const env = await init({ target: 'server' })
        expect(env.target.is.ssr).toBe(false)
      })

      it('should return false on server when SSR is not enabled', async () => {
        const env = await init({ target: 'server', ssr: false })
        expect(env.target.is.ssr).toBe(false)
      })

      it('should return true on server when SSR is enabled', async () => {
        const env = await init({ target: 'server', ssr: true })
        expect(env.target.is.ssr).toBe(true)
      })

      it('should return prepass on server when SSR phase is prepass', async () => {
        const env = await init({ target: 'server', ssr: 'prepass' })
        expect(env.target.is.ssr).toBe('prepass')
      })

      it('should return final on server when SSR phase is final', async () => {
        const env = await init({ target: 'server', ssr: 'final' })
        expect(env.target.is.ssr).toBe('final')
      })
    })
  })

  describe('env.scope', () => {
    describe('detection', () => {
      it('should have scope.is object', async () => {
        const env = await init({ target: 'server', scope: 'test-scope' })
        expect(typeof env.scope.is).toBe('object')
      })

      it('should have scope.define function', async () => {
        const env = await init({ target: 'server', scope: 'test-scope' })
        expect(typeof env.scope.define).toBe('function')
      })

      it('should have scope.define.unsafe', async () => {
        const env = await init({ target: 'server', scope: 'test-scope' })
        expect(typeof env.scope.define.unsafe).toBe('object')
      })
    })

    describe('env.scope.name', () => {
      it('should return scope name from POINT0_SCOPE', async () => {
        const env = await init({ target: 'server', scope: 'test-scope' })
        expect(env.scope.name).toBe('test-scope')
      })

      it('should return be descriminated with scope types provided', async () => {
        const env = await init<any, 'x' | 'y'>({ target: 'server', scope: 'x' })
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
        const env = await init({ target: 'server', scope: 'x' })
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
        const env = await init({ target: 'server', scope: 'y' })
        expect(env.scope.is.x).toBe(false)
        expectTypeOf<typeof env.scope.is.x>().toEqualTypeOf<boolean>()
      })

      it('should have correct types if generic type provided', async () => {
        const env = await init<any, 'x' | 'y'>({ target: 'server', scope: 'x' })
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
        const env = await init<any, 'x' | 'y'>({ target: 'server', scope: 'x' })
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
        const env = await init({ target: 'server', scope: 'x' })
        const result = env.scope.define({
          x: 'x-value' as const,
          y: 'y-value' as const,
        })
        expectTypeOf<typeof result>().toEqualTypeOf<'x-value' | 'y-value' | undefined>()
        expect(result).toBe('x-value')
      })

      it('should return undefined when current scope not in options', async () => {
        const env = await init({ target: 'server', scope: 'x' })
        const result = env.scope.define({
          y: 'y-value' as const,
        })
        expectTypeOf<typeof result>().toEqualTypeOf<'y-value' | undefined>()
        expect(result).toBeUndefined()
      })

      it('should return value for current scope, with correct type if generic type provided', async () => {
        const env = await init<any, 'x' | 'y'>({ target: 'server', scope: 'x' })
        const result = env.scope.define({
          x: 'x-value' as const,
          y: 'y-value' as const,
        })
        expectTypeOf<typeof result>().toEqualTypeOf<'x-value' | 'y-value'>()
        expect(result).toBe('x-value')
      })

      it('should return undefined when current scope not in options, with correct type if generic type provided', async () => {
        const env = await init<any, 'x' | 'y'>({ target: 'server', scope: 'x' })
        const result = env.scope.define({
          y: 'y-value' as const,
        })
        expectTypeOf<typeof result>().toEqualTypeOf<'y-value' | undefined>()
        expect(result).toBeUndefined()
      })

      it('should throw type when incorrect scope name provided', async () => {
        const env = await init<any, 'x' | 'y'>({ target: 'server', scope: 'x' })
        const result = env.scope.define({
          // @ts-expect-error - incorrect scope name
          zzz: 'y-value' as const,
        })
        expect(result).toBeUndefined()
      })
    })

    describe('env.scope.define.x()', () => {
      it('on x return value, if x is current scope', async () => {
        const env = await init({ target: 'server', scope: 'x' })
        const result = env.scope.define.x('test-value')
        expectTypeOf<typeof result>().toEqualTypeOf<'test-value' | undefined>()
        expect(result).toBe('test-value')
      })
      it('on y return undefined, if x is current scope', async () => {
        const env = await init({ target: 'server', scope: 'x' })
        const result = env.scope.define.y('test-value')
        expectTypeOf<typeof result>().toEqualTypeOf<'test-value' | undefined>()
        expect(result).toBeUndefined()
      })

      it('should throw type when incorrect scope name provided', async () => {
        const env = await init<any, 'x' | 'y'>({ target: 'server', scope: 'x' })
        // @ts-expect-error - incorrect scope name
        const result2 = env.scope.define.zzz('test-value')
        expect(result2).toBeUndefined()
      })
    })

    describe('env.scope.define.unsafe.x()', () => {
      it('on x return value, if x is current scope', async () => {
        const env = await init({ target: 'server', scope: 'x' })
        const result = env.scope.define.unsafe.x('test-value')
        expectTypeOf<typeof result>().toEqualTypeOf<'test-value'>()
        expect(result).toBe('test-value')
      })

      it('on y return undefined, if x is current scope', async () => {
        const env = await init({ target: 'server', scope: 'x' })
        const result = env.scope.define.unsafe.y('test-value')
        expectTypeOf<typeof result>().toEqualTypeOf<'test-value'>()
        expect(result).toBeUndefined()
      })

      it('should throw type when incorrect scope name provided', async () => {
        const env = await init<any, 'x' | 'y'>({ target: 'server', scope: 'x' })
        // @ts-expect-error - incorrect scope name
        const result2 = env.scope.define.unsafe.zzz('test-value')
        expect(result2).toBeUndefined()
      })
    })
  })

  describe('env.mode', () => {
    it('should have mode.name equal to NODE_ENV', async () => {
      const env = await init({ target: 'server', vars: { NODE_ENV: 'test' } })
      expect(env.mode.name).toBe('test')
    })

    it('should detect production mode', async () => {
      const env = await init({ target: 'server', vars: { NODE_ENV: 'production' } })
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
      const env = await init({ target: 'server', vars: { NODE_ENV: 'development' } })
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
      const env = await init({ target: 'server', vars: { NODE_ENV: 'test' } })
      expect(env.mode.is.test).toBe(true)
      expect(env.mode.is.production).toBe(false)
      expect(env.mode.is.development).toBe(false)
    })
  })

  describe('env object structure', () => {
    it('should export env object with all required properties', async () => {
      const env = await init({ target: 'server', scope: 'test-scope' })
      expect(env).toBeDefined()
      expect(env.mode).toBeDefined()
      expect(env.vars).toBeDefined()
      expect(env.target).toBeDefined()
      expect(env.scope).toBeDefined()
    })
  })

  describe('edge cases', () => {
    it('should handle undefined values in target.define', async () => {
      const env = await init({ target: 'server' })
      const result = env.target.define({
        server: undefined,
        client: 'client-value',
      })
      expect(result).toBeUndefined()
    })

    it('should handle null values in target.define', async () => {
      const env = await init({ target: 'server' })
      const result = env.target.define({
        server: null,
        client: 'client-value',
      })
      expect(result).toBeNull()
    })

    it('should handle complex types in target.define', async () => {
      const env = await init({ target: 'server' })
      const complexValue = { nested: { value: 'test' } }
      const result = env.target.define({
        server: complexValue,
        client: {},
      })
      expect(result).toEqual(complexValue)
    })

    it('should handle multiple scopes in scope.define', async () => {
      const env = await init({ target: 'server', scope: 'scope-a' })
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
