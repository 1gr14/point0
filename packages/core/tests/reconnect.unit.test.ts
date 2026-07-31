import { describe, expect, it } from 'bun:test'
import { reconnectAttemptAllowed, reconnectDelayMs, resolveReconnectPolicy } from '../src/reconnect.js'

describe('reconnect policy', () => {
  it('defaults: enabled, first retry immediate, then 300ms doubling capped at 5s', () => {
    const policy = resolveReconnectPolicy(undefined)
    expect(policy).toEqual({
      enabled: true,
      immediately: true,
      delay: 300,
      backoff: 2,
      maxDelay: 5000,
      retries: undefined,
    })
    expect([0, 1, 2, 3, 4, 5, 6].map((attempt) => reconnectDelayMs(policy, attempt))).toEqual([
      0, 300, 600, 1200, 2400, 4800, 5000,
    ])
  })

  it('booleans are shorthands for { enabled }', () => {
    expect(resolveReconnectPolicy(true).enabled).toBe(true)
    expect(resolveReconnectPolicy(false).enabled).toBe(false)
    // and the object form works both ways too
    expect(resolveReconnectPolicy({ enabled: false }).enabled).toBe(false)
  })

  it('immediately: false starts from the base delay', () => {
    const policy = resolveReconnectPolicy({ immediately: false })
    expect([0, 1, 2].map((attempt) => reconnectDelayMs(policy, attempt))).toEqual([300, 600, 1200])
  })

  it('backoff: 1 keeps the delay constant', () => {
    const policy = resolveReconnectPolicy({ backoff: 1, delay: 250 })
    expect([0, 1, 2, 3].map((attempt) => reconnectDelayMs(policy, attempt))).toEqual([0, 250, 250, 250])
  })

  it('retries caps the attempts; disabled allows none', () => {
    const capped = resolveReconnectPolicy({ retries: 2 })
    expect(reconnectAttemptAllowed(capped, 0)).toBe(true)
    expect(reconnectAttemptAllowed(capped, 1)).toBe(true)
    expect(reconnectAttemptAllowed(capped, 2)).toBe(false)
    expect(reconnectAttemptAllowed(resolveReconnectPolicy(false), 0)).toBe(false)
  })
})
