/**
 * The one retry policy behind everything that reconnects — the channel socket (socket.ts) and a subscription's broken
 * stream (subscription.ts). Both consumers resolve the user's `reconnect` option here and ask for the wait before each
 * retry, so the semantics can't drift apart.
 */
import type { ReconnectOptions } from './types.js'

/** The reconnect policy with every field resolved — what the retry loops read after `resolveReconnectPolicy`. */
export type ResolvedReconnectPolicy = {
  enabled: boolean
  immediately: boolean
  delay: number
  backoff: number
  maxDelay: number
  retries: number | undefined
}

/** Fold the `reconnect` option (`boolean | ReconnectOptions | undefined`) into a fully-defaulted policy. */
export const resolveReconnectPolicy = (option: boolean | ReconnectOptions | undefined): ResolvedReconnectPolicy => {
  const options: ReconnectOptions = typeof option === 'boolean' ? { enabled: option } : (option ?? {})
  return {
    enabled: options.enabled !== false,
    immediately: options.immediately !== false,
    delay: options.delay ?? 300,
    backoff: options.backoff ?? 2,
    maxDelay: options.maxDelay ?? 5000,
    retries: options.retries,
  }
}

/**
 * The wait before retry number `attempt` (0-based). `immediately` zeroes the first wait (a drop is usually accidental);
 * from there the waits run `delay`, `delay·backoff`, `delay·backoff²`, … capped at `maxDelay`.
 */
export const reconnectDelayMs = (policy: ResolvedReconnectPolicy, attempt: number): number => {
  if (policy.immediately) {
    if (attempt === 0) {
      return 0
    }
    attempt -= 1
  }
  return Math.min(policy.delay * Math.pow(policy.backoff, attempt), policy.maxDelay)
}

/** Whether retry number `attempt` (0-based) is still allowed under the policy's `retries` cap. */
export const reconnectAttemptAllowed = (policy: ResolvedReconnectPolicy, attempt: number): boolean =>
  policy.enabled && (policy.retries === undefined || attempt < policy.retries)
