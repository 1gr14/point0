import { describe, expect, expectTypeOf, it } from 'bun:test'
import type { AnyEventerEvent, UniqEventerErrorEventName } from '../src/eventer.js'
import type { ErrorPoint0 } from '../src/error.js'
import { sanitizeForLog } from '../src/utils.js'

describe('eventer event envelope types', () => {
  it('hoists `error` to the envelope with exact per-event narrowing', () => {
    type AnyEvent = AnyEventerEvent<ErrorPoint0>
    // every event carries the envelope `error`
    expectTypeOf<AnyEvent['error']>().toEqualTypeOf<ErrorPoint0 | undefined>()
    // error events: the envelope error is the error instance, no undefined
    type ErrorEvent = Extract<AnyEvent, { name: UniqEventerErrorEventName }>
    expectTypeOf<ErrorEvent['error']>().toEqualTypeOf<ErrorPoint0>()
    // start events: the envelope error is undefined
    type StartEvent = Extract<AnyEvent, { name: 'pointQueryStart' }>
    expectTypeOf<StartEvent['error']>().toEqualTypeOf<undefined>()
    // settled events: the envelope error mirrors the payload's error branch
    type SettledEvent = Extract<AnyEvent, { name: 'pointQuerySettled' }>
    expectTypeOf<SettledEvent['error']>().toEqualTypeOf<ErrorPoint0 | undefined>()
  })
})

describe('sanitizeForLog (event meta input projection)', () => {
  it('keeps plain, log-friendly values untouched and multi-level', () => {
    const input = { name: 'a', nested: { id: 1, tags: ['x', 'y'] } }
    expect(sanitizeForLog(input)).toEqual(input)
  })

  it('replaces a File with a placeholder string', () => {
    const file = new File(['hello'], 'photo.png', { type: 'image/png' })
    expect(sanitizeForLog({ avatar: file })).toEqual({ avatar: '[File: photo.png (5 bytes)]' })
  })

  it('replaces a Blob with a placeholder string', () => {
    const blob = new Blob(['12345'])
    expect(sanitizeForLog({ blob })).toEqual({ blob: '[Blob: 5 bytes]' })
  })

  it('replaces a FormData with a placeholder string', () => {
    const formData = new FormData()
    formData.append('a', '1')
    expect(sanitizeForLog({ body: formData })).toEqual({ body: '[FormData]' })
  })

  it('finds binaries nested inside objects and arrays', () => {
    const file = new File(['x'], 'doc.txt')
    const input = {
      title: 'report',
      files: [file, { thumb: file }],
      meta: { cover: file },
    }
    expect(sanitizeForLog(input)).toEqual({
      title: 'report',
      files: ['[File: doc.txt (1 bytes)]', { thumb: '[File: doc.txt (1 bytes)]' }],
      meta: { cover: '[File: doc.txt (1 bytes)]' },
    })
  })

  it('passes primitives through as-is', () => {
    expect(sanitizeForLog('hello')).toBe('hello')
    expect(sanitizeForLog(42)).toBe(42)
    expect(sanitizeForLog(null)).toBe(null)
    expect(sanitizeForLog(undefined)).toBe(undefined)
  })
})
