import { afterEach, beforeEach, describe, expect, expectTypeOf, it } from 'bun:test'
import type { Env } from '../src/index.js'

const init = async <TEnv extends Env = Env>(options: {
  vars?: Record<string, string>
  ssr?: 'prepass' | 'final' | boolean
  target: 'client' | 'server'
  scope?: string
}): Promise<TEnv> => {
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
    process.env.POINT0_SCOPE_NAME = scope
  } else {
    process.env.POINT0_SCOPE_NAME ||= 'test'
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
      // Note: env.vars is created at module load time, so we need to test with actual env
      expect(typeof env.vars).toBe('object')
      expect(env.vars.CUSTOM_VAR).toBe('custom-value')
    })

    it('should have access to NODE_ENV', async () => {
      const env = await init({ target: 'server' })
      expect(env.vars.NODE_ENV).toBeDefined()
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

      it('should have target.define.force', async () => {
        const env = await init({ target: 'server' })
        expect(typeof env.target.define.force).toBe('object')
        expect(typeof env.target.define.force.server).toBe('function')
        expect(typeof env.target.define.force.client).toBe('function')
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

    describe('env.target.define.force.server()', () => {
      it('on server return value', async () => {
        const env = await init({ target: 'server' })
        const result = env.target.define.force.server('test-value')
        expectTypeOf<typeof result>().toEqualTypeOf<'test-value'>()
        expect(result).toBe('test-value')
      })
      it('on client return undefined', async () => {
        const env = await init({ target: 'client' })
        const result = env.target.define.force.server('test-value')
        expectTypeOf<typeof result>().toEqualTypeOf<'test-value'>()
        expect(result).toBeUndefined()
      })
    })

    describe('env.target.define.force.client()', () => {
      it('on client return value', async () => {
        const env = await init({ target: 'client' })
        const result = env.target.define.force.client('test-value')
        expectTypeOf<typeof result>().toEqualTypeOf<'test-value'>()
        expect(result).toBe('test-value')
      })

      it('on server return undefined', async () => {
        const env = await init({ target: 'server' })
        const result = env.target.define.force.client('test-value')
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
      it('should return scope name from POINT0_SCOPE_NAME', async () => {
        const env = await init({ target: 'server', scope: 'test-scope' })
        expect(env.scope.name).toBe('test-scope')
      })

      it('should have scope.is object', async () => {
        const env = await init({ target: 'server', scope: 'test-scope' })
        expect(typeof env.scope.is).toBe('object')
      })

      it('should have scope.define function', async () => {
        const env = await init({ target: 'server', scope: 'test-scope' })
        expect(typeof env.scope.define).toBe('function')
      })

      it('should have scope.define.force', async () => {
        const env = await init({ target: 'server', scope: 'test-scope' })
        expect(typeof env.scope.define.force).toBe('object')
      })
    })

    describe('scope.is', () => {
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
        const env = await init<Env<'x' | 'y'>>({ target: 'server', scope: 'x' })
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
    })

    describe('scope.define', () => {
      it('should return value for current scope', async () => {
        const env = await init({ target: 'server', scope: 'test-scope' })
        const currentScope = env.scope.name
        const result = env.scope.define({
          [currentScope]: 'test-value',
          'other-scope': 'other-value',
        })
        expect(result).toBe('test-value')
      })

      it('should return undefined when current scope not in options', async () => {
        const env = await init({ target: 'server', scope: 'test-scope' })
        const currentScope = env.scope.name
        const otherScope = currentScope === 'scope1' ? 'scope2' : 'scope1'
        const result = env.scope.define({
          [otherScope]: 'other-value',
        })
        expect(result).toBeUndefined()
      })

      it('should work with partial options', async () => {
        const env = await init({ target: 'server', scope: 'test-scope' })
        const currentScope = env.scope.name
        const result = env.scope.define({
          [currentScope]: 'test-value',
        })
        expect(result).toBe('test-value')
      })

      it('should work with scope.define[scopeName]', async () => {
        const env = await init({ target: 'server', scope: 'test-scope' })
        const currentScope = env.scope.name
        const result = env.scope.define[currentScope]('test-value')
        expect(result).toBe('test-value')
      })

      it('should work with scope.define.force[scopeName]', async () => {
        const env = await init({ target: 'server', scope: 'test-scope' })
        const currentScope = env.scope.name
        const result = env.scope.define.force[currentScope]('test-value')
        expect(result).toBe('test-value')
      })
    })
  })

  describe('env.mode', () => {
    it('should have mode.name', async () => {
      const env = await init({ target: 'server', vars: { NODE_ENV: 'test' } })
      expect(typeof env.mode.name).toBe('string')
    })

    it('should have mode.is object', async () => {
      const env = await init({ target: 'server', vars: { NODE_ENV: 'test' } })
      expect(typeof env.mode.is).toBe('object')
      expect(typeof env.mode.is.production).toBe('boolean')
      expect(typeof env.mode.is.development).toBe('boolean')
      expect(typeof env.mode.is.test).toBe('boolean')
    })

    it('should detect production mode', async () => {
      const env = await init({ target: 'server', vars: { NODE_ENV: 'production' } })
      expect(env.mode.is.production).toBe(true)
      expect(env.mode.is.development).toBe(false)
      expect(env.mode.is.test).toBe(false)
    })

    it('should detect development mode', async () => {
      const env = await init({ target: 'server', vars: { NODE_ENV: 'development' } })
      expect(env.mode.is.development).toBe(true)
      expect(env.mode.is.production).toBe(false)
      expect(env.mode.is.test).toBe(false)
    })

    it('should detect test mode', async () => {
      const env = await init({ target: 'server', vars: { NODE_ENV: 'test' } })
      expect(env.mode.is.test).toBe(true)
      expect(env.mode.is.production).toBe(false)
      expect(env.mode.is.development).toBe(false)
    })

    it('should have mutually exclusive mode flags', async () => {
      const env = await init({ target: 'server', vars: { NODE_ENV: 'test' } })
      // In any valid state, at most one should be true
      const trueCount =
        (env.mode.is.production ? 1 : 0) + (env.mode.is.development ? 1 : 0) + (env.mode.is.test ? 1 : 0)
      expect(trueCount).toBeLessThanOrEqual(1)
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

    it('should match Env type', async () => {
      const env = await init({ target: 'server', scope: 'test-scope' })
      const testEnv: Env = env
      expect(testEnv).toBeDefined()
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
