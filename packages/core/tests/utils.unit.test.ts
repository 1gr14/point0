import { describe, expect, it } from 'bun:test'
import { isAbortCancellation } from '../src/utils.js'

describe('isAbortCancellation', () => {
  it('treats an aborted signal as a cancellation regardless of the thrown error', () => {
    const controller = new AbortController()
    controller.abort()
    expect(isAbortCancellation(new Error('whatever'), controller.signal)).toBe(true)
    expect(isAbortCancellation(undefined, controller.signal)).toBe(true)
  })

  it('recognizes a browser AbortError by name, with no signal', () => {
    expect(isAbortCancellation(new DOMException('signal is aborted without reason', 'AbortError'))).toBe(true)
  })

  it("recognizes TanStack's CancelledError by name", () => {
    expect(isAbortCancellation({ name: 'CancelledError' })).toBe(true)
  })

  it('walks the error cause chain', () => {
    const wrapped = new Error('wrapped', { cause: new DOMException('aborted', 'AbortError') })
    expect(isAbortCancellation(wrapped)).toBe(true)
  })

  it('is false for a real failure with a live (non-aborted) signal or no signal', () => {
    const controller = new AbortController()
    expect(isAbortCancellation(new Error('boom'), controller.signal)).toBe(false)
    expect(isAbortCancellation(new Error('boom'))).toBe(false)
    expect(isAbortCancellation(undefined)).toBe(false)
    expect(isAbortCancellation(null)).toBe(false)
  })
})
