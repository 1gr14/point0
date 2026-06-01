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

  it('serialize() includes code and (json-safe) meta when present', () => {
    const error = new ErrorPoint0('boom', { code: 'POINT0_TEST', meta: { a: { b: 2 } } })
    const serialized = ErrorPoint0.serialize(error)
    expect(serialized).toMatchObject({ message: 'boom', code: 'POINT0_TEST', meta: { a: { b: 2 } } })
  })

  it('serialize() omits meta when absent', () => {
    const serialized = ErrorPoint0.serialize(new ErrorPoint0('boom'))
    expect('meta' in serialized).toBe(false)
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
