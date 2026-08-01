import { describe, expect, it } from 'bun:test'
import { QueryClient } from '@tanstack/react-query'
import { ErrorPoint0, POINT0_ERROR_CODES, POINT0_ERROR_CODES_MAP, stringifyOrThrow } from '../src/error.js'
import { Point0 } from '../src/point0.js'
import { SuperStore } from '../src/super-store.js'
import type { DataTransformerExtended } from '../src/types.js'
import { blankDataTransformerExtended } from '../src/utils.js'

describe('ErrorPoint0 meta & code', () => {
  it('stores code and meta passed to the constructor', () => {
    const error = new ErrorPoint0('boom', { code: 'POINT0_TEST', meta: { point: 'main:query:home', x: 1 } })
    expect(error.code).toBe('POINT0_TEST')
    expect(error.meta).toEqual({ point: 'main:query:home', x: 1 })
  })

  it('meta is optional — omitting it leaves it undefined', () => {
    const error = new ErrorPoint0('boom')
    expect(error.meta).toBeUndefined()
  })

  it('from() preserves a meta record carried on the source', () => {
    const source = { message: 'boom', code: 'POINT0_X', meta: { point: 'p' } }
    const error = ErrorPoint0.from(source)
    expect(error.code).toBe('POINT0_X')
    expect(error.meta).toEqual({ point: 'p' })
  })

  it('from() ignores a non-object meta', () => {
    const error = ErrorPoint0.from({ message: 'boom', meta: 'not-a-record' })
    expect(error.meta).toBeUndefined()
  })
})

describe('ErrorPoint0 serializePublic / serializePrivate', () => {
  it('serializePublic carries message and code, never the class name, stack, meta, or cause', () => {
    const error = new ErrorPoint0('boom', {
      code: 'POINT0_TEST',
      status: 500,
      meta: { secret: 1 },
      cause: new Error('inner'),
    })
    const json = ErrorPoint0.serializePublic(error)
    expect(json).toEqual({ message: 'boom', code: 'POINT0_TEST' })
    expect('name' in json).toBe(false)
  })

  it('serializePrivate carries message, code, status, json-safe meta, stack, and the cause chain', () => {
    const deep = new Error('deep')
    const inner = new Error('inner', { cause: deep })
    const error = new ErrorPoint0('boom', { code: 'POINT0_TEST', status: 502, meta: { a: { b: 2 } }, cause: inner })
    const json = ErrorPoint0.serializePrivate(error)
    expect(json).toMatchObject({
      message: 'boom',
      code: 'POINT0_TEST',
      status: 502,
      meta: { a: { b: 2 } },
    })
    expect('name' in json).toBe(false)
    expect(typeof json.stack).toBe('string')
    const cause = json.cause as Record<string, unknown>
    expect(cause).toMatchObject({ name: 'Error', message: 'inner' })
    expect(typeof cause.stack).toBe('string')
    expect((cause.cause as Record<string, unknown>).message).toBe('deep')
  })

  it('serializePrivate omits meta when absent', () => {
    const serialized = ErrorPoint0.serializePrivate(new ErrorPoint0('boom'))
    expect('meta' in serialized).toBe(false)
  })

  it('serializePrivate survives a cause cycle', () => {
    const a = new Error('a')
    const b = new Error('b')
    a.cause = b
    b.cause = a
    const json = ErrorPoint0.serializePrivate(new ErrorPoint0('boom', { cause: a }))
    const cause = json.cause as Record<string, unknown>
    expect(cause.message).toBe('a')
    const nested = cause.cause as Record<string, unknown>
    expect(nested.message).toBe('b')
    expect(nested.cause).toBeUndefined()
  })

  it('preventRetry travels both projections and survives from() round-trips', () => {
    const error = new ErrorPoint0('no entry', { preventRetry: true })
    expect(ErrorPoint0.serializePublic(error)).toEqual({ message: 'no entry', preventRetry: true })
    expect(ErrorPoint0.serializePrivate(error)).toMatchObject({ preventRetry: true })
    // the wire round-trip: a client rebuilds the error from the public record and keeps the flag
    const rebuilt = ErrorPoint0.from(ErrorPoint0.serializePublic(error))
    expect(rebuilt.preventRetry).toBe(true)
    // absent by default — a plain error never carries it
    expect('preventRetry' in ErrorPoint0.serializePublic(new ErrorPoint0('boom'))).toBe(false)
    expect(ErrorPoint0.from({ message: 'x' }).preventRetry).toBeUndefined()
  })

  it('JSON.stringify uses the public projection (toJSON safety net)', () => {
    const error = new ErrorPoint0('boom', { code: 'POINT0_TEST', meta: { secret: 1 } })
    const parsed = JSON.parse(JSON.stringify({ error })) as { error: Record<string, unknown> }
    expect(parsed.error).toEqual({ message: 'boom', code: 'POINT0_TEST' })
  })

  it('instance methods mirror the statics', () => {
    const error = new ErrorPoint0('boom', { code: 'POINT0_TEST' })
    expect(error.serializePublic()).toEqual(ErrorPoint0.serializePublic(error))
    expect(error.serializePrivate()).toEqual(ErrorPoint0.serializePrivate(error))
  })
})

/**
 * The transformer's `stringify` answers `undefined` when the app's `serialize` refused the value. Nothing may carry
 * that onward — an `undefined` cache key merges distinct entries, an `undefined` wire frame ships the literal string
 * "undefined" or an empty body. Every must-serialize site fails loud with POINT0_SERIALIZE_FAILED instead.
 */
describe('POINT0_SERIALIZE_FAILED — a refused serialization fails loud', () => {
  // the exact failure the docs describe: a custom transformer whose `serialize` answers undefined
  const refusing: DataTransformerExtended = { ...blankDataTransformerExtended, stringify: () => undefined }
  const refusingRoot = Point0.lets('root', 'serFail')
    .transformer({ serialize: () => undefined, deserialize: (data: unknown) => data })
    .root()

  it('the code is registered in the single source of truth', () => {
    expect(POINT0_ERROR_CODES).toContain('POINT0_SERIALIZE_FAILED')
    expect(POINT0_ERROR_CODES_MAP.SERIALIZE_FAILED).toBe('POINT0_SERIALIZE_FAILED')
  })

  it('stringifyOrThrow passes the transformer bytes through untouched on the happy path', () => {
    // byte-identical to a bare `transformer.stringify` — hardening must never reshape a cache key
    expect(stringifyOrThrow(blankDataTransformerExtended, { b: 2, a: 1 }, 'root:query:x')).toBe(
      blankDataTransformerExtended.stringify({ b: 2, a: 1 }) as string,
    )
    expect(stringifyOrThrow(blankDataTransformerExtended, {}, 'root:query:x')).toBe('{}')
  })

  it('stringifyOrThrow throws a coded ErrorPoint0 carrying the point id', () => {
    let thrown: unknown
    try {
      stringifyOrThrow(refusing, { a: 1 }, 'root:query:home')
    } catch (error) {
      thrown = error
    }
    expect(thrown).toBeInstanceOf(ErrorPoint0)
    expect((thrown as ErrorPoint0).code).toBe(POINT0_ERROR_CODES_MAP.SERIALIZE_FAILED)
    expect((thrown as ErrorPoint0).meta).toEqual({ subject: 'root:query:home' })
    expect((thrown as ErrorPoint0).message).toContain('root:query:home')
  })

  it('stringifyOrThrow names a non-point subject in the message and the meta', () => {
    let thrown: unknown
    try {
      stringifyOrThrow(refusing, { a: 1 }, 'cookie "theme"')
    } catch (error) {
      thrown = error
    }
    expect((thrown as ErrorPoint0).code).toBe(POINT0_ERROR_CODES_MAP.SERIALIZE_FAILED)
    expect((thrown as ErrorPoint0).meta).toEqual({ subject: 'cookie "theme"' })
    expect((thrown as ErrorPoint0).message).toContain('cookie "theme"')
  })

  it('the default (blank) transformer refuses a bare `undefined` — which is why inputs are coerced to {}', () => {
    expect(blankDataTransformerExtended.stringify(undefined)).toBeUndefined()
    expect(() => stringifyOrThrow(blankDataTransformerExtended, undefined, 'root:query:home')).toThrow(ErrorPoint0)
  })

  // fetch input path — the query key is the input's serialized identity
  it('a query key refuses to be built from a value the transformer cannot serialize', () => {
    const point = refusingRoot
      .lets('query', 'home')
      .loader(() => ({ ok: true }))
      .query()
    let thrown: unknown
    try {
      point.getQueryKey({ a: 1 } as never)
    } catch (error) {
      thrown = error
    }
    expect((thrown as ErrorPoint0).code).toBe(POINT0_ERROR_CODES_MAP.SERIALIZE_FAILED)
    expect((thrown as ErrorPoint0).meta).toEqual({ subject: 'serFail:query:home' })
  })

  // cache-inspection path — the mutation-cache lookup compares serialized inputs
  it('a mutation-cache lookup refuses to compare against an unserializable input', () => {
    const point = refusingRoot
      .lets('mutation', 'save')
      .loader(() => ({ ok: true }))
      .mutation()
    const queryClient = new QueryClient()
    let thrown: unknown
    try {
      point.getMutationCache({ a: 1 } as never, { queryClient })
    } catch (error) {
      thrown = error
    }
    expect((thrown as ErrorPoint0).code).toBe(POINT0_ERROR_CODES_MAP.SERIALIZE_FAILED)
    expect((thrown as ErrorPoint0).meta).toEqual({ subject: 'serFail:mutation:save' })
  })

  // the SSR store sits under error.ts in the import graph, so it throws a plain Error carrying the code —
  // `ErrorPoint0.from` promotes it to the same coded error everywhere downstream
  it('the SSR store refuses to dehydrate through a transformer that returns undefined', () => {
    const store = new SuperStore()
    expect(store.stringify()).toBe('{}')
    let thrown: unknown
    try {
      store.stringify(refusing)
    } catch (error) {
      thrown = error
    }
    expect(ErrorPoint0.from(thrown).code).toBe(POINT0_ERROR_CODES_MAP.SERIALIZE_FAILED)
  })
})

/**
 * By the point0 standard an absent input IS the `{}` input. The mutation-cache lookups serialize BOTH sides of the
 * compare through `|| {}`, so a mutation that ran with no variables is found by `undefined`, by `{}`, and by nothing.
 * Without the coercion the provided side serialized to `"{}"` and the cached side to `undefined` — never equal.
 */
describe('mutation-cache lookup — an absent input is the {} input', () => {
  const point = Point0.lets('root', 'mutLookup')
    .root()
    .lets('mutation', 'save')
    .loader(() => ({ ok: true }))
    .mutation()

  it('finds a mutation whose variables are undefined, by undefined and by {} alike', () => {
    const queryClient = new QueryClient()
    const cache = queryClient.getMutationCache()
    const built = cache.build(queryClient, { mutationKey: point.getMutationKey() })
    // an executed-with-no-input mutation: TanStack leaves `variables` undefined
    expect(built.state.variables).toBeUndefined()
    expect(point.getMutationCache(undefined as never, { queryClient })).toBe(built as never)
    expect(point.getMutationCache({} as never, { queryClient })).toBe(built as never)
    expect(point.getMutationsCache({} as never, { queryClient })).toEqual([built] as never)
    // a different input still misses — the coercion must not widen the match
    expect(point.getMutationCache({ a: 1 } as never, { queryClient })).toBeUndefined()
  })
})
