/**
 * The streamed body of a subscription point: drain the loader's async generator into one envelope per yield, closed by
 * a terminal envelope — `{d:true}` when the generator completed, `{e:<public error>}` when it threw. The terminal
 * envelope is what lets the client tell a finished stream from a BROKEN one (bytes that just stopped — the only case
 * its `reconnect` restarts). While the generator sits between yields a heartbeat goes out (same trick as the RSC hole
 * stream) so idle proxies don't reap a quiet stream. Envelope contract: `SubscriptionStreamEnvelope` in core's
 * protocol.ts.
 *
 * TWO framings of the SAME envelopes, negotiated by `Accept` (the fetcher decides): our native NDJSON — one envelope
 * per line, blank-line heartbeats — and SSE for foreign clients (`EventSource`): `data: <envelope>\n\n` per envelope, a
 * comment line `:\n\n` as the heartbeat. The semantics (completion vs break) are identical in both.
 */
import { stringifyOrThrow } from '@point0/core'
import type { AnyPoint, SubscriptionStreamEnvelope } from '@point0/core'

const SUBSCRIPTION_STREAM_HEARTBEAT_MS = 5000

const raceIsTimeout = async <T>(promise: Promise<T>, ms: number): Promise<{ timeout: boolean; value?: T }> => {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeoutMarker = Symbol('timeout')
  const raced = await Promise.race([
    promise,
    new Promise<typeof timeoutMarker>((resolve) => {
      timer = setTimeout(() => resolve(timeoutMarker), ms)
    }),
  ])
  if (timer) {
    clearTimeout(timer)
  }
  return raced === timeoutMarker ? { timeout: true } : { timeout: false, value: raced as T }
}

/** A stringified envelope must stay one line — a pretty-printing transformer would corrupt the newline framing. */
const assertSingleLine = (line: string, pointId: string): string => {
  if (line.includes('\n')) {
    throw new Error(
      `Subscription stream payload for ${pointId} serialized to multiple lines — the transformer must not pretty-print`,
    )
  }
  return line
}

export type SubscriptionStreamFraming = 'ndjson' | 'sse'

export const createSubscriptionStream = ({
  point,
  input,
  generator,
  framing,
  abortController,
  log,
}: {
  point: AnyPoint
  /** the parsed subscription input — rides the `pointSubscription*` events */
  input: Record<string, unknown>
  generator: AsyncGenerator<unknown, unknown, undefined> | AsyncIterable<unknown>
  /** the negotiated wire framing — same envelopes either way */
  framing: SubscriptionStreamFraming
  /** aborted when the client goes away — the generator's `signal` argument */
  abortController: AbortController
  log: (entry: { level: 'error'; category: string[]; message: string; error?: unknown }) => void
}): ReadableStream<Uint8Array> => {
  const encoder = new TextEncoder()
  const transformer = point._getTransformer()
  const ErrorClass = point._Error
  const emit = (
    name: 'pointSubscriptionServerData' | 'pointSubscriptionServerSettled' | 'pointSubscriptionServerError',
    data: Record<string, unknown>,
  ): void => {
    // the payloads are heterogeneous per name — merged at this one boundary, typed at every call site's literal
    point._emit(name, { point, input, ...data } as never, { point: point.id })
  }
  const iterator = (generator as AsyncIterable<unknown>)[Symbol.asyncIterator]()
  // read through a closure — `cancel()` mutates it from outside the drain loop (same pattern as rsc-stream)
  let cancelled = false
  const isCancelled = (): boolean => cancelled
  const line = (envelope: SubscriptionStreamEnvelope): Uint8Array => {
    const serialized = assertSingleLine(stringifyOrThrow(transformer, envelope, point.id), point.id)
    return encoder.encode(framing === 'sse' ? 'data: ' + serialized + '\n\n' : serialized + '\n')
  }
  const heartbeat = (): Uint8Array => encoder.encode(framing === 'sse' ? ':\n\n' : '\n')
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        let pendingNext: Promise<IteratorResult<unknown>> | undefined
        for (;;) {
          if (isCancelled()) {
            return
          }
          pendingNext ??= iterator.next()
          const raced = await raceIsTimeout(pendingNext, SUBSCRIPTION_STREAM_HEARTBEAT_MS)
          if (raced.timeout) {
            // the generator is quiet — keep the pending next() and let a blank heartbeat keep the pipe warm
            if (!isCancelled()) {
              controller.enqueue(heartbeat())
            }
            continue
          }
          pendingNext = undefined
          const result = raced.value as IteratorResult<unknown>
          if (result.done) {
            if (!isCancelled()) {
              controller.enqueue(line({ d: true }))
              controller.close()
              emit('pointSubscriptionServerSettled', { outcome: 'completed', error: undefined })
            }
            return
          }
          if (!isCancelled()) {
            controller.enqueue(line({ v: result.value }))
            emit('pointSubscriptionServerData', { value: result.value })
          }
        }
      } catch (error) {
        // the generator threw — a typed answer, not a break: the client sees the error and never auto-restarts
        if (!isCancelled()) {
          try {
            controller.enqueue(line({ e: ErrorClass.serializePublic(ErrorClass.from(error)) }))
            controller.close()
          } catch {
            // the controller may already be closed by a racing cancel
          }
          const error0 = ErrorClass.from(error)
          emit('pointSubscriptionServerSettled', { outcome: 'failed', error: error0 })
          emit('pointSubscriptionServerError', { error: error0 })
        }
        log({
          level: 'error',
          category: ['point0', 'subscription'],
          message: `Subscription loader of ${point.id} threw`,
          error,
        })
      }
    },
    cancel() {
      // the consumer went away: stop enqueueing, fire the loader's `signal`, and let the generator wind down. From
      // this stream's viewpoint the bytes just stop — the settle outcome is `broken`, same as the client reads it
      cancelled = true
      emit('pointSubscriptionServerSettled', { outcome: 'broken', error: undefined })
      abortController.abort()
      void (async () => {
        try {
          await iterator.return?.(undefined)
        } catch {
          // a generator mid-await may reject on return — nothing left to deliver it to
        }
      })()
    },
  })
}
