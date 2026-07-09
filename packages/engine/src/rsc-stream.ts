import {
  serializeStateError,
  type ClassLikeError0,
  type DataTransformerExtended,
  type ErrorPoint0,
  type EventerEmitFn,
  type RscHoleEntry,
  type RscHoleRegistry,
} from '@point0/core'

/**
 * How often a WAITING streamed response writes a no-op byte so the socket never looks idle: Bun's default `idleTimeout`
 * reaps a silent connection after 10s, and reverse proxies carry idle windows of their own (nginx/edge, typically
 * 30-60s) — without a heartbeat, a `defer()`/suspend subtree slower than the smallest of those killed the stream
 * mid-response. 5s stays safely under Bun's default; the beat runs only while something is still pending and stops with
 * the stream. NDJSON writes a blank line (the client reader skips empty lines); the SSR document pump writes an empty
 * `<script></script>` through the same injection point as the push scripts (proven hydration-safe).
 */
export const RSC_STREAM_HEARTBEAT_MS = 5000

/**
 * Race a promise against a timer: resolves `true` when the timer wins (time to write a heartbeat), `false` when the
 * promise settles first. The timer never holds the process (unref) and is cleared on either outcome.
 */
export const raceIsTimeout = async (promise: Promise<unknown>, ms: number): Promise<boolean> => {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise.then(() => false),
      new Promise<true>((resolve) => {
        timer = setTimeout(() => resolve(true), ms)
        ;(timer as unknown as { unref?: () => void }).unref?.()
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

/**
 * The push payload for one resolved deferred hole (see `defer`): either the decoded subtree, or a serialized error for
 * the client hole slot to re-throw to its nearest boundary (public projection in prod, exactly like a query error).
 * Shared by the two delivery channels — the SSR pump (`render.ts`) wraps it in a `__POINT0_PUSH_RSC__` inline script,
 * the client-fetch NDJSON framing (`fetcher.ts`) writes it as one line — so both serialize the identical shape.
 */
export const buildHolePushPayload = (
  entry: RscHoleEntry,
  ErrorClass: ClassLikeError0<ErrorPoint0>,
): { id: string; data?: unknown; error?: unknown; errorFallback?: unknown } => {
  const result = entry.result
  return result && 'error' in result
    ? // The per-hole error fallback (defer's 3rd arg, if any) rides the error fill so the client slot renders it in place.
      { id: entry.id, error: serializeStateError(ErrorClass, result.error), errorFallback: entry.errorFallback }
    : { id: entry.id, data: result?.node }
}

/**
 * Emit the `rscError` event for a FAILED deferred hole (see `defer`) — the one RSC failure that escapes the loader
 * error events, because the loader's shell already returned and the subtree failed asynchronously after it. Both
 * delivery channels funnel resolved holes through here (the SSR pump in `render.ts`, the NDJSON drain below), so a
 * failed subtree is observable server-side (`.on('rscError')` / `.on('error')`) exactly once, whichever path delivered
 * it. Fires even when a per-hole error fallback covered the failure — the subtree still threw. No-op on a successful
 * hole.
 */
export const emitHoleError = (
  emit: EventerEmitFn<ErrorPoint0> | undefined,
  entry: RscHoleEntry,
  ErrorClass: ClassLikeError0<ErrorPoint0>,
): void => {
  const result = entry.result
  if (!emit || !result || !('error' in result)) {
    return
  }
  emit(
    'rscError',
    { error: ErrorClass.from(result.error), label: entry.label, holeId: entry.id },
    { label: entry.label, holeId: entry.id, error: serializeStateError(ErrorClass, result.error) },
  )
}

/**
 * Frame a data-fetch response as NDJSON when its loader/mutation output carries deferred holes (see `defer`): line 1 is
 * the main payload (`firstLine`, holes as `{ t: 2, id }`), then one line per hole as it resolves
 * (`buildHolePushPayload` → the transformer's RSC codec), a `\n`-terminated stream that closes once every hole
 * (including any nested ones a resolving subtree registers) is delivered. The drain is the SAME `takeResolved()` the
 * SSR pump uses; here it loops until nothing is left undelivered, waiting on the never-rejecting settle promises
 * between batches so a slow subtree streams in the moment it lands rather than blocking the fast data. A client that
 * can't read the stream never gets one (the caller only builds this when the request advertised
 * `POINT0_STREAM_HEADER`).
 */
export const createHoleNdjsonStream = ({
  firstLine,
  holeRegistry,
  transformer,
  ErrorClass,
  emit,
  heartbeatMs = RSC_STREAM_HEARTBEAT_MS,
}: {
  // The transformer's `stringify` is typed `string | undefined`; the caller only builds this stream when the output
  // carries holes (so it is always a real object → a real string), but coalesce defensively rather than assert.
  firstLine: string | undefined
  holeRegistry: RscHoleRegistry
  transformer: DataTransformerExtended
  ErrorClass: ClassLikeError0<ErrorPoint0>
  /** Bound root/point `_emit` — a failed subtree emits `rscError` as it drains. Undefined skips eventing. */
  emit: EventerEmitFn<ErrorPoint0> | undefined
  /** Test hook — see {@link RSC_STREAM_HEARTBEAT_MS} (the production cadence). */
  heartbeatMs?: number
}): ReadableStream<Uint8Array> => {
  const encoder = new TextEncoder()
  // The client reader splits on `\n`, so every stringified payload MUST be single-line. The default JSON/superjson
  // stringify always is; a custom pretty-printing transformer would silently corrupt the framing — fail loud instead
  // (the stream errors, the client fails its pending holes to the nearest boundary).
  const assertSingleLine = (line: string): string => {
    if (line.includes('\n')) {
      throw new Error(
        'RSC: the data transformer produced multi-line stringify output, which breaks NDJSON hole framing — the app transformer must stringify without pretty-printing.',
      )
    }
    return line
  }
  let cancelled = false
  // Read through a closure so the loop below sees the live value (a bare `cancelled` narrows to its `false` initializer
  // — the only writer is the sibling `cancel()` callback, which the compiler's control flow can't see).
  const isCancelled = (): boolean => cancelled
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode(assertSingleLine(firstLine ?? '') + '\n'))
        for (;;) {
          if (isCancelled()) {
            return
          }
          for (const entry of holeRegistry.takeResolved()) {
            if (isCancelled()) {
              return
            }
            emitHoleError(emit, entry, ErrorClass)
            const line = transformer.stringify(buildHolePushPayload(entry, ErrorClass))
            controller.enqueue(encoder.encode(assertSingleLine(line ?? '') + '\n'))
          }
          const undelivered = [...holeRegistry.entries.values()].filter((entry) => !entry.delivered)
          if (undelivered.length === 0) {
            break
          }
          // Never-rejecting settle promises (a failed subtree settles to an error the payload carries), so this only
          // wakes on progress and never throws out of the loop. While nothing settles, write a blank-line heartbeat
          // (see RSC_STREAM_HEARTBEAT_MS) so idle reapers never kill a stream that is legitimately waiting; the client
          // reader skips empty lines.
          while (await raceIsTimeout(Promise.race(undelivered.map((entry) => entry.throwable)), heartbeatMs)) {
            if (isCancelled()) {
              return
            }
            controller.enqueue(encoder.encode('\n'))
          }
        }
        if (!isCancelled()) {
          controller.close()
        }
      } catch (error) {
        if (!isCancelled()) {
          controller.error(error)
        }
      }
    },
    cancel() {
      // The client disconnected (navigated away / unmounted) mid-stream. Stop draining; the abandoned subtrees'
      // background normalization just goes unread (as the SSR pump's does when it cancels its React stream).
      cancelled = true
    },
  })
}
