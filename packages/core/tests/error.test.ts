import { describe, expect, it } from 'bun:test'
import { ErrorPoint0 } from '../src/error.js'

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
  it('serializePublic carries identity and code, never stack, meta, or cause', () => {
    const error = new ErrorPoint0('boom', {
      code: 'POINT0_TEST',
      status: 500,
      meta: { secret: 1 },
      cause: new Error('inner'),
    })
    const json = ErrorPoint0.serializePublic(error)
    expect(json).toEqual({ name: 'ErrorPoint0', message: 'boom', code: 'POINT0_TEST' })
  })

  it('serializePrivate carries name, code, status, json-safe meta, stack, and the cause chain', () => {
    const deep = new Error('deep')
    const inner = new Error('inner', { cause: deep })
    const error = new ErrorPoint0('boom', { code: 'POINT0_TEST', status: 502, meta: { a: { b: 2 } }, cause: inner })
    const json = ErrorPoint0.serializePrivate(error)
    expect(json).toMatchObject({
      name: 'ErrorPoint0',
      message: 'boom',
      code: 'POINT0_TEST',
      status: 502,
      meta: { a: { b: 2 } },
    })
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

  it('JSON.stringify uses the public projection (toJSON safety net)', () => {
    const error = new ErrorPoint0('boom', { code: 'POINT0_TEST', meta: { secret: 1 } })
    const parsed = JSON.parse(JSON.stringify({ error })) as { error: Record<string, unknown> }
    expect(parsed.error).toEqual({ name: 'ErrorPoint0', message: 'boom', code: 'POINT0_TEST' })
  })

  it('instance methods mirror the statics', () => {
    const error = new ErrorPoint0('boom', { code: 'POINT0_TEST' })
    expect(error.serializePublic()).toEqual(ErrorPoint0.serializePublic(error))
    expect(error.serializePrivate()).toEqual(ErrorPoint0.serializePrivate(error))
  })
})
