/**
 * Subscription client runtime: the NDJSON line reader over a fetch body and the per-consumer stream state machine —
 * open → values → completed / failed / broken, with backoff restarts on breaks only. The point-level surface
 * (`useSubscription` / `fetchSubscription` in point0.ts) calls in here, the same way socket.ts backs the channel
 * methods. One stream per consumer: unlike channel connections there is no dedup/holds machinery — an HTTP stream is
 * per-reader by nature, and two hooks with the same input are two independent streams.
 */
import * as React from 'react'
import { POINT0_ERROR_CODES_MAP } from './error.js'
import type { ErrorPoint0 } from './error.js'
import { _point0_env } from './env.js'
import { getFetch } from './helpers.js'
import { getLogFnForPoint } from './logger.js'
import type { SubscriptionStreamEnvelope } from './protocol.js'
import { reconnectAttemptAllowed, reconnectDelayMs, resolveReconnectPolicy } from './reconnect.js'
import type { ResolvedReconnectPolicy } from './reconnect.js'
import { getByPath, setByPath } from './utils.js'
import type {
  AnyPoint,
  ReconnectOptions,
  ExtraUseSubscriptionOptions,
  FetchSubscriptionOptions,
  InputRawUnknown,
  SubscriptionStatus,
  UseSubscriptionResult,
} from './types.js'

const emitSubscription = (
  point: AnyPoint,
  name:
    | 'pointSubscriptionClientStart'
    | 'pointSubscriptionClientData'
    | 'pointSubscriptionClientSettled'
    | 'pointSubscriptionClientError',
  data: Record<string, unknown>,
): void => {
  // the payloads are heterogeneous per name — merged at this one boundary, typed at every call site's literal
  point._emit(name, { point, ...data } as never, { point: point.id })
}

/**
 * Emit the events one finished attempt produces — `Settled` always, `Error` when the consumer sees an error. A
 * deliberate cancel (`signal.aborted` — unmount, early break) emits nothing: the attempt was not answered OR broken,
 * the consumer just left.
 */
const emitAttemptOutcome = (
  point: AnyPoint,
  input: InputRawUnknown | undefined | void,
  outcome: SubscriptionAttemptOutcome,
  signal: AbortSignal,
): void => {
  if (signal.aborted) {
    return
  }
  const base = { input: input ?? {} }
  if (outcome.kind === 'completed') {
    emitSubscription(point, 'pointSubscriptionClientSettled', { ...base, outcome: 'completed', error: undefined })
    return
  }
  if (outcome.kind === 'failed') {
    emitSubscription(point, 'pointSubscriptionClientSettled', { ...base, outcome: 'failed', error: outcome.error })
    emitSubscription(point, 'pointSubscriptionClientError', { ...base, error: outcome.error })
    return
  }
  emitSubscription(point, 'pointSubscriptionClientSettled', { ...base, outcome: 'broken', error: undefined })
}

const subscriptionLostError = (point: AnyPoint): ErrorPoint0 => {
  return new point._Error('The subscription stream was interrupted', {
    code: POINT0_ERROR_CODES_MAP.SUBSCRIPTION_LOST,
  })
}

/** Yield the stream's non-empty lines (empty lines are heartbeats). Cancels the reader on early exit. */
const readLinesFromBody = async function* (body: ReadableStream<Uint8Array>): AsyncGenerator<string, void, undefined> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    for (;;) {
      const newlineAt = buffer.indexOf('\n')
      if (newlineAt >= 0) {
        const line = buffer.slice(0, newlineAt)
        buffer = buffer.slice(newlineAt + 1)
        if (line.length > 0) {
          yield line
        }
        continue
      }
      const { done, value } = await reader.read()
      if (value) {
        buffer += decoder.decode(value, { stream: true })
      }
      if (done) {
        if (buffer.length > 0) {
          yield buffer
        }
        return
      }
    }
  } finally {
    try {
      await reader.cancel()
    } catch {
      // the stream may already be errored or closed
    }
    reader.releaseLock()
  }
}

/**
 * How one attempt ended. The distinction is the whole reconnect policy: `completed` (a `d` line — the generator
 * returned) and `failed` (an `e` line or a non-2xx answer — a typed error) are ANSWERS and never restart; `broken` (the
 * bytes just stopped) is an accident and is what `reconnect` retries.
 */
type SubscriptionAttemptOutcome = { kind: 'completed' } | { kind: 'failed'; error: ErrorPoint0 } | { kind: 'broken' }

const runSubscriptionAttempt = async ({
  point,
  input,
  attempt,
  signal,
  onOpen,
  onValue,
}: {
  point: AnyPoint
  input: InputRawUnknown | undefined | void
  /** 0 on the first attempt, +1 per reconnect — rides `pointSubscriptionClientStart` (no separate reconnect event) */
  attempt: number
  signal: AbortSignal
  onOpen: () => void
  onValue: (value: unknown) => void
}): Promise<SubscriptionAttemptOutcome> => {
  emitSubscription(point, 'pointSubscriptionClientStart', { input: input ?? {}, attempt })
  let res: Response
  try {
    const { request } = point._getFetchServerOptions({ input, fetchOptions: { signal } })
    const fetchFn = getFetch({ scope: point.scopes })
    res = await fetchFn(request)
  } catch {
    return { kind: 'broken' }
  }
  if (!res.ok) {
    let raw: unknown
    try {
      raw = await res.json()
    } catch {
      raw = { message: `Subscription request failed with status ${res.status}` }
    }
    const error = point._Error.from(raw)
    error.status = res.status
    return { kind: 'failed', error }
  }
  if (!res.body) {
    return { kind: 'broken' }
  }
  onOpen()
  const transformer = point._getTransformer()
  try {
    for await (const line of readLinesFromBody(res.body)) {
      const envelope = transformer.parse(line) as SubscriptionStreamEnvelope
      if ('v' in envelope) {
        emitSubscription(point, 'pointSubscriptionClientData', { input: input ?? {}, value: envelope.v })
        onValue(envelope.v)
        continue
      }
      if ('e' in envelope) {
        return { kind: 'failed', error: point._Error.from(envelope.e) }
      }
      if ('d' in envelope) {
        return { kind: 'completed' }
      }
    }
  } catch {
    return { kind: 'broken' }
  }
  // the bytes ended without a terminal line — a break, not a completion
  return { kind: 'broken' }
}

/**
 * The tracked-cursor pair of a resumable subscription — `.subscription({ cursorParamFromInput, cursorParamFromData })`.
 * Point-level only (the pair names schema fields — part of the point's contract, not a call-site choice); the closer
 * validated the pairing, so a half-configured point never reaches here. `undefined` = a plain subscription, every
 * reconnect sends the caller's input as-is.
 */
const getCursorParams = (point: AnyPoint): { fromInput: string; fromData: string } | undefined => {
  const options = point._subscriptionOptions as
    | { cursorParamFromInput?: string; cursorParamFromData?: string }
    | undefined
  if (typeof options?.cursorParamFromInput === 'string' && typeof options.cursorParamFromData === 'string') {
    return { fromInput: options.cursorParamFromInput, fromData: options.cursorParamFromData }
  }
  return undefined
}

const resolveReconnect = (
  point: AnyPoint,
  options: { reconnect?: boolean | ReconnectOptions } | undefined,
): ResolvedReconnectPolicy => {
  const fromCall = options?.reconnect
  if (fromCall !== undefined) {
    return resolveReconnectPolicy(fromCall)
  }
  return resolveReconnectPolicy(point._subscriptionOptions?.reconnect)
}

type SubscriptionStateUpdate = {
  status?: SubscriptionStatus
  data?: unknown
  error?: ErrorPoint0
}

type SubscriptionHandle = { stop: () => void }

/**
 * The long-lived HTTP consumer loop behind `useSubscription`: run NDJSON attempts, push state updates, restart broken
 * streams with backoff. `stop()` aborts the in-flight attempt (the server generator's `signal` fires) and silences
 * every callback. The socket world never comes here — a clientHandler's messages ride `iterateMessagesFromServer`.
 * `getOptions` is read at every use — the hook passes its ref, so the lifecycle callbacks and the reconnect policy stay
 * as fresh as `onMessageFromServer` already was. On a tracked subscription (the point's cursor pair) the redial resumes
 * instead of restarting: the attempt input carries the last delivered cursor in the named input field, so the
 * `pointSubscriptionClientStart`/`Data` events see the input the wire actually carried; the lifecycle props keep the
 * caller's own input — that is the stream's identity.
 */
const subscribeToSubscriptionPoint = (
  point: AnyPoint,
  input: InputRawUnknown | undefined | void,
  onUpdate: (update: SubscriptionStateUpdate) => void,
  getOptions: () => ExtraUseSubscriptionOptions<any, any, any> | undefined,
): SubscriptionHandle => {
  const controller = new AbortController()
  // read through a closure — `stop()` mutates it from outside the async loop (same pattern as rsc-stream's isCancelled)
  let stopped = false
  const isStopped = (): boolean => stopped
  let reconnectAttempt = 0
  let retryTimer: ReturnType<typeof setTimeout> | undefined
  // the tracked-cursor resume state: the cursor plucked from the last DELIVERED value (already parsed — a Date cursor
  // is a Date). A value whose cursor path reads `undefined` keeps the previous cursor — writing `undefined` into the
  // input would forget the resume point mid-stream.
  const cursorParams = getCursorParams(point)
  let lastCursor: unknown
  let hasCursor = false
  const update = (partial: SubscriptionStateUpdate): void => {
    if (!isStopped()) {
      onUpdate(partial)
    }
  }
  const loop = async (): Promise<void> => {
    let attempt = 0
    // successful opens so far — `connectionIndex` in the lifecycle props (0 = the first connect, > 0 = a reconnect)
    let opens = 0
    const fire = (name: 'onConnect' | 'onDisconnect' | 'onError', error?: ErrorPoint0): void => {
      if (isStopped()) {
        return
      }
      // clamped: an `onError` with zero opens (a failed request, an exhausted reconnect that never opened) reads 0
      fireSubscriptionLifecycle({
        point,
        input,
        callOptions: getOptions(),
        name,
        connectionIndex: Math.max(opens - 1, 0),
        error,
      })
    }
    for (;;) {
      if (isStopped()) {
        return
      }
      // read through a closure — `onOpen` mutates it from inside the attempt (the repo's isStopped pattern)
      let openedThisAttempt = false
      const didOpenThisAttempt = (): boolean => openedThisAttempt
      // the tracked-cursor resume: before a redial, rewrite the named input field with the last delivered cursor —
      // the same shallow-clone + `setByPath` fold `_toInputWithPageParam` uses for the infinite query's pageParam
      // (one path machinery for both options). The first attempt — and a redial before any value arrived — sends the
      // caller's input untouched, so an explicit "start from N" in the input survives.
      const attemptInput = (() => {
        if (!cursorParams || !hasCursor) {
          return input
        }
        const inputWithCursor = { ...(input ?? {}) } as Record<string, unknown>
        setByPath(inputWithCursor as never, cursorParams.fromInput as never, lastCursor)
        return inputWithCursor
      })()
      const outcome = await runSubscriptionAttempt({
        point,
        input: attemptInput,
        attempt: attempt++,
        signal: controller.signal,
        onOpen: () => {
          reconnectAttempt = 0
          update({ status: 'open' })
          openedThisAttempt = true
          opens++
          // every successful open fires `onConnect` — the props' connectionIndex tells the first (0) from a re-open
          fire('onConnect')
        },
        onValue: (value) => {
          if (cursorParams) {
            const cursor = getByPath(value as never, cursorParams.fromData as never)
            if (cursor !== undefined) {
              lastCursor = cursor
              hasCursor = true
            }
          }
          update({ data: value })
        },
      })
      emitAttemptOutcome(point, input, outcome, controller.signal)
      if (isStopped()) {
        return
      }
      if (outcome.kind === 'completed') {
        fire('onDisconnect')
        update({ status: 'closed' })
        return
      }
      if (outcome.kind === 'failed') {
        // a mid-stream typed error closed an OPEN stream; a failed request never opened one — nothing to disconnect
        if (didOpenThisAttempt()) {
          fire('onDisconnect')
        }
        fire('onError', outcome.error)
        update({ status: 'error', error: outcome.error })
        return
      }
      if (didOpenThisAttempt()) {
        fire('onDisconnect')
      }
      const policy = resolveReconnect(point, getOptions())
      if (!reconnectAttemptAllowed(policy, reconnectAttempt)) {
        const error = subscriptionLostError(point)
        // the break is final — this is where the consumer sees an error, so this is where the error event fires
        emitSubscription(point, 'pointSubscriptionClientError', { input: input ?? {}, error })
        fire('onError', error)
        update({ status: 'error', error })
        return
      }
      const waitMs = reconnectDelayMs(policy, reconnectAttempt)
      reconnectAttempt++
      update({ status: 'connecting' })
      await new Promise<void>((resolve) => {
        retryTimer = setTimeout(resolve, waitMs)
      })
    }
  }
  void loop()
  return {
    stop: () => {
      stopped = true
      if (retryTimer) {
        clearTimeout(retryTimer)
      }
      controller.abort()
    },
  }
}

/** The point-level `.subscription({ onMessageFromServer })` listener — fires for every consumer's every message. */
const firePointLevelMessage = (point: AnyPoint, value: unknown): void => {
  const pointLevel = point._subscriptionOptions?.onMessageFromServer
  if (pointLevel) {
    void pointLevel(value)
  }
}

/**
 * Fire a subscription lifecycle callback (`onConnect` / `onDisconnect` / `onError`) — the point-level options and the
 * call site both run, in that order, exactly the channel lifecycle composition. A throwing callback is logged and never
 * breaks the stream machinery.
 */
const fireSubscriptionLifecycle = ({
  point,
  input,
  callOptions,
  name,
  connectionIndex,
  error,
}: {
  point: AnyPoint
  input: InputRawUnknown | undefined | void
  /** the consumer's own options — `undefined` for consumers without a lifecycle surface (`fetchSubscription`) */
  callOptions: ExtraUseSubscriptionOptions<any, any, any> | undefined
  name: 'onConnect' | 'onDisconnect' | 'onError'
  connectionIndex: number
  error?: ErrorPoint0
}): void => {
  const pointLevel = point._subscriptionOptions
  const props = {
    point,
    input: input ?? {},
    connectionIndex,
    ...(name === 'onError' ? { error } : {}),
  }
  for (const callback of [pointLevel?.[name], callOptions?.[name]]) {
    if (!callback) {
      continue
    }
    void (async () => {
      try {
        await callback(props as never)
      } catch (thrown) {
        getLogFnForPoint(point)({
          level: 'error',
          category: ['point0', 'subscription'],
          message: `A subscription ${name} callback threw (point ${point.id})`,
          error: thrown,
        })
      }
    })()
  }
}

/**
 * The React state machine behind `point.useSubscription(input, options)`. The render state is a pure function of the
 * options — identical on the server and at hydration (enabled renders `connecting`, disabled renders `closed`); the
 * transport lives in the effect, which never runs during SSR — that alone keeps the server from opening a stream.
 */
export const useSubscriptionValue = (
  point: AnyPoint,
  input: InputRawUnknown | undefined | void,
  options: ExtraUseSubscriptionOptions<any> | undefined,
): UseSubscriptionResult<any, any> => {
  const enabled = options?.enabled !== false
  const inputKey = point._getTransformer().stringify(input ?? {})
  const optionsRef = React.useRef(options)
  optionsRef.current = options
  const [state, setState] = React.useState<{
    data: unknown
    error: ErrorPoint0 | null
    status: SubscriptionStatus
  }>({ data: undefined, error: null, status: enabled ? 'connecting' : 'closed' })
  React.useEffect(() => {
    if (!enabled) {
      setState({ data: undefined, error: null, status: 'closed' })
      return
    }
    setState({ data: undefined, error: null, status: 'connecting' })
    const handle = subscribeToSubscriptionPoint(
      point,
      input,
      (update) => {
        if ('data' in update) {
          firePointLevelMessage(point, update.data)
          void optionsRef.current?.onMessageFromServer?.(update.data)
          // messages re-render only when the caller asked for `data` — the reactive path stays render-free
          if (!optionsRef.current?.lastMessageFromServerAsData) {
            return
          }
        }
        setState((prev) => ({
          data: 'data' in update ? update.data : prev.data,
          error: update.error ?? (update.status === 'connecting' ? null : prev.error),
          status: update.status ?? prev.status,
        }))
      },
      () => optionsRef.current,
    )
    return () => {
      handle.stop()
    }
    // resubscribe only when the target changes — the input identity is its serialized form
  }, [point.id, inputKey, enabled])
  return { ...state, isLoading: state.status === 'connecting' }
}

/**
 * The async iterable behind `point.fetchSubscription(input, options)` — one attempt, no reconnect (an imperative
 * consumer loops on its own terms): values are the yields, a typed error or a break THROWS, a completed stream ends the
 * iteration. Breaking out of the loop (or aborting `options.signal`) cancels the stream — the server generator's
 * `signal` fires.
 */
export const iterateSubscription = (
  point: AnyPoint,
  input: InputRawUnknown | undefined | void,
  options: FetchSubscriptionOptions | undefined,
): AsyncGenerator<unknown, void, undefined> => {
  if (_point0_env.side.is.server) {
    throw new Error(`fetchSubscription is for the client only (point ${point.id})`)
  }
  const outerSignal = options?.signal
  const inner = async function* (): AsyncGenerator<unknown, void, undefined> {
    const controller = new AbortController()
    const onOuterAbort = (): void => {
      controller.abort()
    }
    outerSignal?.addEventListener('abort', onOuterAbort, { once: true })
    if (outerSignal?.aborted) {
      controller.abort()
    }
    // the imperative iterable emits the same per-attempt events as the hook — one attempt, `attempt: 0`
    const settle = (outcome: SubscriptionAttemptOutcome): void => {
      emitAttemptOutcome(point, input, outcome, controller.signal)
    }
    // the point-level lifecycle callbacks fire here too (one attempt — `connectionIndex` is always `0`); there is no
    // call-site surface, the imperative consumer IS the loop. A deliberate abort fires nothing, like the events.
    const fire = (name: 'onConnect' | 'onDisconnect' | 'onError', error?: ErrorPoint0): void => {
      if (controller.signal.aborted) {
        return
      }
      fireSubscriptionLifecycle({ point, input, callOptions: undefined, name, connectionIndex: 0, error })
    }
    try {
      emitSubscription(point, 'pointSubscriptionClientStart', { input: input ?? {}, attempt: 0 })
      const { request } = point._getFetchServerOptions({ input, fetchOptions: { signal: controller.signal } })
      const fetchFn = getFetch({ scope: point.scopes })
      const res = await fetchFn(request)
      if (!res.ok) {
        let raw: unknown
        try {
          raw = await res.json()
        } catch {
          raw = { message: `Subscription request failed with status ${res.status}` }
        }
        const error = point._Error.from(raw)
        error.status = res.status
        settle({ kind: 'failed', error })
        fire('onError', error)
        throw error
      }
      if (!res.body) {
        settle({ kind: 'broken' })
        const error = subscriptionLostError(point)
        emitSubscription(point, 'pointSubscriptionClientError', { input: input ?? {}, error })
        fire('onError', error)
        throw error
      }
      const body = res.body
      fire('onConnect')
      const transformer = point._getTransformer()
      // a transport reject mid-read (the connection died) AND a line the transformer cannot parse (a corrupted frame,
      // a proxy that injected something) are both a BREAK, exactly like the bytes just ending — the hook path gets
      // both from runSubscriptionAttempt's catch; here the guard folds them into the one broken tail below instead of
      // leaking a raw fetch/parse error to the consumer, who is promised the point's own typed error (a consumer's own
      // break never throws into this generator — `for await` exits abruptly through `return()`, which runs finallys,
      // not catches)
      const guardedEnvelopes = async function* (): AsyncGenerator<SubscriptionStreamEnvelope, void, undefined> {
        try {
          for await (const line of readLinesFromBody(body)) {
            yield transformer.parse(line) as SubscriptionStreamEnvelope
          }
        } catch {
          // the broken tail below speaks for this
        }
      }
      for await (const envelope of guardedEnvelopes()) {
        if ('v' in envelope) {
          emitSubscription(point, 'pointSubscriptionClientData', { input: input ?? {}, value: envelope.v })
          firePointLevelMessage(point, envelope.v)
          yield envelope.v
          continue
        }
        if ('e' in envelope) {
          const error = point._Error.from(envelope.e)
          settle({ kind: 'failed', error })
          fire('onDisconnect')
          fire('onError', error)
          throw error
        }
        if ('d' in envelope) {
          settle({ kind: 'completed' })
          fire('onDisconnect')
          return
        }
      }
      if (controller.signal.aborted) {
        // a deliberate cancel mid-read — the iterator just ends (the documented contract), nothing fires
        return
      }
      settle({ kind: 'broken' })
      fire('onDisconnect')
      const error = subscriptionLostError(point)
      emitSubscription(point, 'pointSubscriptionClientError', { input: input ?? {}, error })
      fire('onError', error)
      throw error
    } finally {
      outerSignal?.removeEventListener('abort', onOuterAbort)
      controller.abort()
    }
  }
  return inner()
}
