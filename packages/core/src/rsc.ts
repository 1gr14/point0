import * as React from 'react'
import {
  ErrorPoint0,
  POINT0_ERROR_CODES_MAP,
  serializeStateError,
  type ClassLikeError0,
  type Point0ErrorCode,
} from './error.js'
import { ClientOnly, getClientPoints } from './helpers.js'
import { superstore } from './super-store.js'
import type { DataTransformerExtended } from './types.js'
import { generateId } from './utils.js'

/**
 * RSC ("React elements as data") — the machinery that lets a server `.loader()` (of any point: page, layout, query,
 * mutation, component, …) return React elements — plain (`.loader(async () => <Hello />)`) or nested in the output
 * object (`.loader(async () => ({ stats, hero: <Hero /> }))`, opted in via `.rsc({ depth: n })`).
 *
 * The model is "elements are just data": an element returned from a loader travels to the client through the exact same
 * pipe as every other loader/query/mutation value — the data transformer — and lands in `data` like everything else. No
 * Flight protocol, no react-server module graph, no directives. Three cooperating pieces:
 *
 * - `normalizeRscOutput` — runs on the server right after the loader resolves. Walks the output to the point's `.rsc({
 *   depth })`, validates element positions, and UNFOLDS plain function components by calling them (async supported)
 *   until only wire-representable elements remain: host elements (`'div'`), `Fragment`/`Suspense`, and component-point
 *   references. SSR then renders this normalized tree, and the wire carries an equivalent encoding of the same tree —
 *   which is what makes hydration match by construction.
 * - `encodeRscData` / `decodeRscData` — the codec. Encode turns live normalized elements into plain JSON marker objects
 *   (`{ __p0e: … }`) inside the data structure; decode rebuilds real elements with `React.createElement`, resolving
 *   component-point references through the client's `RscComponentsRegistry` (lazy per-component imports). The codec is
 *   wrapped around the app's data transformer (`wrapTransformerWithRsc`), so endpoint responses, the SSR-embedded
 *   dehydrated state, and streamed push scripts all get it for free — and custom transformer types (Date, Map, …) keep
 *   working inside element props, since the user transformer runs on the already-encoded structure.
 * - `RscComponentsRegistry` — the client-side name → component resolver, fed by the generated components aggregator.
 *   Deserialization kicks off the chunk import the moment a reference is decoded; `drainPending()` lets callers (query
 *   fetch, hydration mount, push receiver) await all in-flight component chunks before handing data to React, so
 *   interactive islands never flash a Suspense fallback.
 *
 * Security is one-way by design: encode runs wherever data is produced, but decode is applied only to server-produced
 * payloads parsed on the client. The server parses client input with the raw transformer, so element markers arriving
 * in an input are inert plain JSON — the server never turns untrusted bytes into elements or component references.
 */

/** The marker key carrying an encoded element on the wire. User data keys colliding with it are `$`-escaped. */
export const RSC_MARKER_KEY = '__p0e'
/**
 * Header that gates streamed (NDJSON) client fetches for deferred holes (see {@link defer}). Symmetric: the client sends
 * it on a data/query/mutation fetch to say "I can read a streamed body"; the server echoes it on the response to say
 * "this body IS NDJSON — line 1 is the payload, each following line fills a hole". Absent on both sides → a plain
 * single JSON body, so foreign clients, OpenAPI, and server-to-server SSR fetches are untouched (a hole degrades to
 * inline).
 */
export const POINT0_STREAM_HEADER = 'x-point0-stream'
const RSC_ESCAPED_KEY_REGEX = /^__p0e\$*$/
/**
 * Brand on the lazy-reference slot wrapper (see {@link RscComponentsRegistry.resolve}), carrying the component-point
 * name. It keeps the codec TOTAL: everything decode produces, encode can turn back into `{ c: name }`. The engine loads
 * the server's client points eagerly, so server-side decode normally resolves the real mounts and the wrapper only
 * exists in the browser — the brand is the safety net for any collection that still holds lazy records (a hand-built
 * ClientPoints without `eager`, test harnesses, future serialization of decoded trees).
 */
const RSC_REF_BRAND = '__POINT0_RSC_REF__'
/**
 * Brand on a deferred-hole slot component (the server pending slot and the client fill slot alike), carrying the hole
 * id. Like {@link RSC_REF_BRAND} it keeps the codec TOTAL: a hole slot encodes back to its `{ t: 2, id }` wire node, so
 * decoding then re-encoding a tree with holes is a no-op. See {@link defer} and {@link RscHoleRegistry}.
 */
const RSC_HOLE_BRAND = '__POINT0_RSC_HOLE__'

/**
 * Wire node type: a host tag, `0` = Fragment, `1` = Suspense, `2` = a deferred hole (its `id` names the fill pushed
 * over `__POINT0_PUSH_RSC__`), or a component-point reference `{ c: name }`.
 */
export type RscNodeType = string | 0 | 1 | 2 | { c: string }
export type RscNode = {
  t: RscNodeType
  /** The element key, when set. */
  k?: string
  /** Props (children included), values encoded recursively. Omitted when empty. */
  p?: Record<string, unknown>
  /** Hole id, set only for a hole node (`t: 2`); its fill arrives via `__POINT0_PUSH_RSC__`. */
  id?: string
}

const REACT_FRAGMENT = Symbol.for('react.fragment')
const REACT_SUSPENSE = Symbol.for('react.suspense')
const REACT_MEMO = Symbol.for('react.memo')
const REACT_FORWARD_REF = Symbol.for('react.forward_ref')

type PointLikeComponent = React.ComponentType<any> & {
  __POINT0_INSTANCE__?: boolean
  point?: { type?: string; name?: string }
}

const $$typeofOf = (value: unknown): symbol | undefined => {
  return (value as { $$typeof?: symbol } | null | undefined)?.$$typeof
}

const getComponentPointName = (type: unknown): string | undefined => {
  const fn = type as PointLikeComponent
  if (typeof fn !== 'function' || !fn.__POINT0_INSTANCE__ || fn.point?.type !== 'component') {
    return undefined
  }
  return fn.point.name
}

const isPointInstanceComponent = (type: unknown): boolean => {
  return typeof type === 'function' && !!(type as PointLikeComponent).__POINT0_INSTANCE__
}

const getRscRefName = (type: unknown): string | undefined => {
  if (typeof type !== 'function') {
    return undefined
  }
  const name = (type as unknown as Record<string, unknown>)[RSC_REF_BRAND]
  return typeof name === 'string' ? name : undefined
}

const getRscHoleName = (type: unknown): string | undefined => {
  if (typeof type !== 'function') {
    return undefined
  }
  const id = (type as unknown as Record<string, unknown>)[RSC_HOLE_BRAND]
  return typeof id === 'string' ? id : undefined
}

const getFunctionName = (fn: unknown): string => {
  return (fn as { displayName?: string; name?: string }).displayName || (fn as { name?: string }).name || 'anonymous'
}

const describeType = (type: unknown): string => {
  if (typeof type === 'string') {
    return `<${type}>`
  }
  if (typeof type === 'symbol') {
    return type.description ?? String(type)
  }
  if (typeof type === 'function') {
    return `<${getFunctionName(type)}>`
  }
  if (type && typeof type === 'object') {
    const brand = $$typeofOf(type)
    return brand ? String(brand.description) : 'exotic component'
  }
  return String(type)
}

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== 'object') {
    return false
  }
  const proto = Object.getPrototypeOf(value) as object | null
  return proto === Object.prototype || proto === null
}

// Bracket-assigning a key named `__proto__` rewrites the accumulator's prototype instead of creating an own property —
// and user data CAN carry it as an own enumerable key (JSON.parse, object spread of parsed input). Every codec copy
// loop writes through here; the odd key gets an explicit own-property define, every other key takes the fast path.
const setOwnKey = (target: Record<string, unknown>, key: string, value: unknown): void => {
  if (key === '__proto__') {
    Object.defineProperty(target, key, { value, writable: true, enumerable: true, configurable: true })
  } else {
    target[key] = value
  }
}

/**
 * Build an RSC validation error as an `ErrorPoint0` (the app's error class when threaded in via `options.ErrorClass`,
 * else the base) — never a native `Error`, so it carries a `code`, projects public/private like every other framework
 * error, and flows through the same boundary/serialization path. Defaults to `POINT0_RSC_INVALID_OUTPUT` — the "this
 * can't cross the wire" family. (A server component that THROWS is not built here — it is coerced with
 * `ErrorClass.from` and re-thrown as-is.)
 */
const rscError = (
  path: string[],
  message: string,
  options: NormalizeRscOutputOptions,
  extra?: { code?: Point0ErrorCode },
): ErrorPoint0 => {
  const at = path.length ? ` (at ${path.join('.')})` : ''
  const ErrorClass = options.ErrorClass ?? ErrorPoint0
  return new ErrorClass(`RSC${at}: ${message}`, {
    code: extra?.code ?? POINT0_ERROR_CODES_MAP.RSC_INVALID_OUTPUT,
  })
}

// defer — deferred holes (progressive in-tree streaming)

const RSC_DEFER_BRAND = '__POINT0_RSC_DEFER__'

/** A subtree wrapped by {@link defer}: its element streams as a hole instead of being awaited inline. */
type DeferredSubtree = {
  readonly [RSC_DEFER_BRAND]: true
  readonly element: React.ReactElement
  readonly fallback: React.ReactNode
  readonly errorFallback: React.ReactNode | ((error: ErrorPoint0) => React.ReactNode)
}

/**
 * Defer a slow server subtree so the loader payload never waits for it. Instead of awaiting the element inline,
 * `normalizeRscOutput` ships a HOLE in its place under a `Suspense` boundary (showing `fallback`), returns the shell
 * immediately, and delivers the resolved subtree on the same response as it settles — over the SSR push channel
 * (`__POINT0_PUSH_RSC__`) on a document render, or as an NDJSON fill line on a client fetch. The client fills the hole
 * in place and the boundary reveals: no refetch, no flicker.
 *
 * ```tsx
 * .loader(async () => ({
 *   stats: await getStats(),                                            // fast — ships in the shell
 *   analytics: defer(<Analytics />, <ChartSkeleton />, <ChartError />), // slow — streams in later
 * }))
 * ```
 *
 * The optional third argument is an ERROR fallback: if the deferred subtree throws, this renders in the hole's place
 * instead of the error propagating to the nearest `ErrorBoundary0` — a per-hole error boundary scoped to this one block
 * (the rest of the page stays untouched). It is either static server markup (like `fallback`), or a function of the
 * error — `(error) => <ChartError message={error.message} />`. The function runs ON THE SERVER when the subtree fails,
 * and receives the error already projected for the client: public fields in production, the full error in dev — the
 * SAME `ErrorPoint0` instance the nearest boundary would get, gated by the app's error class (`.errorClass()`). So
 * nothing private leaks even when the value is rendered or handed to an island prop, and a per-hole fallback and a
 * boundary always see the same error. Its markup streams into the hole like any other deferred subtree. Omit the
 * argument to let the failure bubble to the nearest boundary.
 *
 * Streams on any response the loader produces: the initial SSR render AND client fetches (navigation, mutations,
 * refetches). A consumer that can't read a stream (SSG, OpenAPI, a foreign client that never advertised streaming) gets
 * a single JSON body where the subtree was awaited inline and the fallback dropped — the same content, no progressive
 * delivery; a loader that set a non-2xx status degrades the same way (an error response never rides a framed stream). A
 * hole delivered on a CLIENT fetch renders fresh on the client, so an interactive island inside it is live; on the
 * initial SSR load such an island displays but is not hydrated (the browser completes the server-revealed boundary from
 * the stream), so keep first-paint interactivity at the top level or in a `suspend: 'server'` query.
 *
 * A waiting stream heartbeats every 5s (idle-connection reapers — Bun's 10s server default, proxy idle windows — never
 * kill a legitimately slow subtree), and every hole carries a deadline — the owner point's `.rsc({ holeTimeoutMs })`,
 * default 60s, `false` to disable. A subtree that misses it fails with `POINT0_RSC_HOLE_TIMEOUT`, rendered by the error
 * fallback or the nearest boundary; its late result is dropped unread.
 *
 * Typed as the element it stands for: after normalize the field IS a live element (a `Suspense` boundary), so it
 * renders like any other RSC loader output. The deferral marker is an internal detail — only ever unwrapped by
 * normalize.
 */
export const defer = (
  element: React.ReactElement,
  fallback?: React.ReactNode,
  errorFallback?: React.ReactNode | ((error: ErrorPoint0) => React.ReactNode),
): React.ReactElement =>
  ({ [RSC_DEFER_BRAND]: true, element, fallback, errorFallback }) as unknown as React.ReactElement

const isDeferred = (value: unknown): value is DeferredSubtree =>
  typeof value === 'object' && value !== null && (value as Record<string, unknown>)[RSC_DEFER_BRAND] === true

// normalize (server, right after the loader)

/**
 * The argument of the `.rsc(options)` chain method — the per-point RSC knobs. Inherited down the chain with a per-key
 * merge (`root.rsc({ holeTimeoutMs: 120_000 })` sets the app default, a point's `.rsc({ depth: 1 })` adds to it), so
 * the root chain is where an app-wide value lives.
 */
export type RscPointOptions = {
  /**
   * How deep in the loader output React elements are allowed. `0` (the default) allows an element only as the whole
   * output; `1` also allows elements in first-level fields; arrays don't consume a level. Elements deeper than the
   * declared depth fail the loader with an error naming the path — an explicitness gate, so elements never leak into
   * data by accident. Inside an element tree the depth no longer applies.
   */
  depth?: number
  /**
   * Per-hole deadline for {@link defer}, in ms from the hole's registration. A subtree that has not settled by then is
   * failed with a `POINT0_RSC_HOLE_TIMEOUT` error — delivered like any failed subtree (the per-hole error fallback or
   * the nearest boundary renders it), so a hung `defer()` never holds the streamed response open forever (the stream's
   * heartbeats keep idle reapers away, making this deadline the only bound). Each hole answers to the setting of the
   * POINT whose loader deferred it. `false` disables the deadline. Default {@link DEFAULT_RSC_HOLE_TIMEOUT_MS} (60s).
   */
  holeTimeoutMs?: number | false
}

export type NormalizeRscOutputOptions = {
  /** The point's `.rsc({ depth })` — how deep in the output object elements are allowed. */
  depth: number
  /** Point description for error messages — `point.id`, e.g. `root:page:home`. */
  label: string
  /**
   * Per-request hole registry for {@link defer}. Present only in a streaming SSR pass; when absent (data-only, SSG, unit
   * tests) a deferred subtree is awaited inline and the hole machinery is skipped.
   */
  holes?: RscHoleRegistry
  /**
   * The app's error class (from `.errorClass()`), used to coerce a server component's throw and to project a failed
   * {@link defer}'d subtree's error before it reaches a function-form error fallback — public in production, full in
   * dev, exactly as it crosses to the client. Defaults to the base {@link ErrorPoint0} when absent (direct-normalize
   * unit tests / the inline degradation path).
   */
  ErrorClass?: ClassLikeError0<ErrorPoint0>
  /**
   * The point's `.rsc({ holeTimeoutMs })` — the deadline each hole this normalize pass registers is placed under.
   * `undefined` → {@link DEFAULT_RSC_HOLE_TIMEOUT_MS}; `false` disables. See {@link RscPointOptions.holeTimeoutMs}.
   */
  holeTimeoutMs?: number | false
}

type RscHoleResult = { node: unknown } | { error: unknown }

/** A single deferred hole minted this request. The render pump drains {@link RscHoleRegistry.takeResolved} of these. */
export type RscHoleEntry = {
  id: string
  settled: boolean
  delivered: boolean
  /**
   * The point that produced the deferred subtree, e.g. `root:page:home` — carried into the `rscError` event when it
   * fails.
   */
  label?: string
  /** The never-rejecting settle promise the SSR hole slot suspends on. */
  throwable: Promise<void>
  result?: RscHoleResult
  /**
   * Normalized markup rendered IN PLACE OF the subtree if it fails (see {@link defer}'s 3rd arg) — a per-hole error
   * fallback. Undefined → a failed subtree's error throws to the nearest boundary (the default). Travels with the error
   * fill so the client slot can render it too.
   */
  errorFallback?: React.ReactNode
}

/** Default per-hole deadline (see {@link RscPointOptions.holeTimeoutMs}). */
export const DEFAULT_RSC_HOLE_TIMEOUT_MS = 60_000

/**
 * The deadline a hole is registered under (see {@link RscHoleRegistry.register}) — resolved per POINT by `normalizeHole`
 * from the owner's `.rsc({ holeTimeoutMs })`, because one request's registry collects holes from many points (the page,
 * its layouts, island loaders) and each hole answers to its own point's setting.
 */
export type RscHoleDeadline = {
  /** Ms from registration; `false` disables. See {@link RscPointOptions.holeTimeoutMs}. */
  holeTimeoutMs: number | false
  /** The app's error class for the timeout error. */
  ErrorClass: ClassLikeError0<ErrorPoint0>
}

/**
 * Per-request server-side registry of deferred holes (see {@link defer}). `register` mints an id, kicks off the
 * subtree's normalization WITHOUT awaiting it, and returns an entry the SSR hole slot suspends on. The entry's
 * throwable never rejects — a failed subtree settles to an error the slot re-throws at render (a rejected Suspense
 * thenable hangs Fizz on Bun) — so the render pump can push resolved subtrees (or errors) into the streamed response as
 * they land. An entry settles exactly once: the subtree, its failure, or the {@link RscHoleDeadline} deadline, whichever
 * lands first (a late subtree result after the deadline is dropped unread).
 */
export class RscHoleRegistry {
  private counter = 0
  /**
   * Unique per request. Hole ids must not collide on the CLIENT, where the bundle-wide {@link RscHolesRegistry} is fed
   * by many streams at once — several concurrent client fetches (each with its own server registry counting from 0)
   * plus the SSR push channel. A per-registry random prefix keeps `id`s globally distinct even across load-balanced
   * servers. Generated lazily on the first `defer` so a registry minted for a fetch that never defers costs nothing.
   */
  private prefix?: string
  /** All holes minted this request, by id — the render pump drains resolved ones. */
  readonly entries = new Map<string, RscHoleEntry>()

  register(
    normalize: () => Promise<unknown>,
    resolveErrorFallback?: (error: unknown) => Promise<React.ReactNode>,
    deadline?: RscHoleDeadline,
  ): RscHoleEntry {
    this.prefix ??= generateId()
    const id = `${this.prefix}-h${this.counter++}`
    let wake!: () => void
    const settled = new Promise<void>((resolve) => {
      wake = resolve
    })
    const entry: RscHoleEntry = { id, settled: false, delivered: false, throwable: settled }
    // Settle exactly once — the subtree, its failure, or the deadline, whichever lands first. Error paths resolve the
    // per-hole error fallback (see {@link defer}'s 3rd arg) with the error in hand BEFORE marking settled, so every
    // consumer — the SSR slot, the SSR pump, the NDJSON drain — reads a fully-ready entry. If resolving the fallback
    // itself fails, it is left undefined so the ORIGINAL error bubbles to the nearest boundary.
    // Read through a closure — the competing settle paths (subtree vs deadline) mutate `entry.settled` concurrently,
    // which the compiler's control flow can't see across the await below (a bare re-check narrows to the guard above).
    const isSettled = (): boolean => entry.settled
    const settle = async (result: RscHoleResult): Promise<void> => {
      if (isSettled()) {
        return
      }
      if ('error' in result && resolveErrorFallback) {
        let errorFallback: React.ReactNode | undefined
        try {
          errorFallback = await resolveErrorFallback(result.error)
        } catch {
          errorFallback = undefined
        }
        if (isSettled()) {
          // another path (the subtree vs the deadline) settled while the fallback resolved — its result stands
          return
        }
        entry.errorFallback = errorFallback
      }
      entry.settled = true
      entry.result = result
      wake()
    }
    void normalize().then(
      (node) => settle({ node }),
      (error: unknown) => settle({ error }),
    )
    if (deadline && deadline.holeTimeoutMs !== false && Number.isFinite(deadline.holeTimeoutMs)) {
      const timeoutMs = deadline.holeTimeoutMs
      const TimeoutErrorClass = deadline.ErrorClass
      const timer = setTimeout(() => {
        void settle({
          error: new TimeoutErrorClass(
            `RSC: deferred subtree${entry.label ? ` of ${entry.label}` : ''} did not settle within ${timeoutMs}ms and was failed. Raise or disable the point's .rsc({ holeTimeoutMs }) for longer work.`,
            { code: POINT0_ERROR_CODES_MAP.RSC_HOLE_TIMEOUT },
          ),
        })
      }, timeoutMs)
      // don't let a pending deadline hold the process; clear it once the entry settles either way
      ;(timer as unknown as { unref?: () => void }).unref?.()
      void settled.then(() => clearTimeout(timer))
    }
    this.entries.set(id, entry)
    return entry
  }

  /** Resolved holes not yet delivered — the pump serializes and pushes these, then they are marked delivered. */
  takeResolved(): RscHoleEntry[] {
    const out: RscHoleEntry[] = []
    for (const entry of this.entries.values()) {
      if (entry.settled && !entry.delivered) {
        entry.delivered = true
        out.push(entry)
      }
    }
    return out
  }
}

/**
 * Detect whether a value contains React elements anywhere a plain data walk can reach (objects/arrays — plus Map/Set,
 * walked only so normalize can reject elements hiding inside them with a clear error instead of corrupting silently).
 * Used to skip the whole normalize pass for element-free outputs — the overwhelmingly common case. Cycle-safe: circular
 * data is legal under transformers that support it (superjson), so the scan must terminate, not stack-overflow.
 */
export const rscDataHasElements = (value: unknown, seen?: WeakSet<object>): boolean => {
  if (isDeferred(value)) {
    return true
  }
  if (React.isValidElement(value)) {
    return true
  }
  if (Array.isArray(value)) {
    seen ??= new WeakSet()
    if (seen.has(value)) {
      return false
    }
    seen.add(value)
    return value.some((item) => rscDataHasElements(item, seen))
  }
  if (value instanceof Map) {
    seen ??= new WeakSet()
    if (seen.has(value)) {
      return false
    }
    seen.add(value)
    for (const [mapKey, mapValue] of value) {
      if (rscDataHasElements(mapKey, seen) || rscDataHasElements(mapValue, seen)) {
        return true
      }
    }
    return false
  }
  if (value instanceof Set) {
    seen ??= new WeakSet()
    if (seen.has(value)) {
      return false
    }
    seen.add(value)
    for (const item of value) {
      if (rscDataHasElements(item, seen)) {
        return true
      }
    }
    return false
  }
  if (isPlainObject(value)) {
    seen ??= new WeakSet()
    if (seen.has(value)) {
      return false
    }
    seen.add(value)
    for (const key in value) {
      if (rscDataHasElements(value[key], seen)) {
        return true
      }
    }
  }
  return false
}

/**
 * Normalize a loader output so that SSR and the wire share one tree. Walks the data structure to `depth` (objects
 * consume a level, arrays are transparent), and normalizes every element found there:
 *
 * - host elements, `Fragment`, `Suspense` — kept, props walked recursively (element depth inside an element tree is
 *   unlimited; only the data structure around element roots is depth-gated);
 * - component points — kept live as references (SSR renders the real component; the wire carries `{ c: name }`); their
 *   props are walked like data, so nested elements in props (slot-style children) work;
 * - plain function components — UNFOLDED: called with their props (awaited when async), and the result normalized in
 *   turn. This is what makes them server components — they execute here and never ship to the client. Hooks and context
 *   are not available inside (same rule as React's own server components); interactivity belongs to component points;
 * - functions in host/reference props, `ref`, class components, `React.lazy`/context elements — rejected with an error
 *   naming the path.
 *
 * Elements found deeper than `depth` raise an error pointing at `.rsc({ depth: n })`.
 */
export const normalizeRscOutput = async (value: unknown, options: NormalizeRscOutputOptions): Promise<unknown> => {
  if (!rscDataHasElements(value)) {
    return value
  }
  const normalized = await normalizeData(value, options.depth, [], options)
  if (React.isValidElement(value) && (normalized === null || normalized === undefined)) {
    // a whole-output element may unfold to nothing (the server component rendered null) — the wire and the engine's
    // "no output" check still need a value, so an empty fragment stands in
    return React.createElement(React.Fragment)
  }
  return normalized
}

const normalizeData = async (
  value: unknown,
  budget: number,
  path: string[],
  options: NormalizeRscOutputOptions,
  /**
   * True once the walk crossed into a kept element's subtree (host/reference props, a defer'd subtree/fallback, an
   * unfolded server component's output). Functions there would silently vanish in the transformer — reject them at ANY
   * depth, not just as direct props. Outside elements, plain data keeps its pre-RSC behavior (JSON drops functions).
   */
  insideElement = false,
): Promise<unknown> => {
  if (isDeferred(value)) {
    if (budget < 0) {
      const requiredDepth = path.filter((part) => !part.startsWith('[') && !part.startsWith('<')).length
      throw rscError(
        path,
        `${options.label} returned a deferred subtree deeper than its rsc depth allows. Raise it with .rsc({ depth: ${requiredDepth} }) on the point (0 allows it as the whole output, 1 allows it in first-level fields, …).`,
        options,
        { code: POINT0_ERROR_CODES_MAP.RSC_DEPTH_EXCEEDED },
      )
    }
    return await normalizeHole(value, path, options)
  }
  if (React.isValidElement(value)) {
    if (budget < 0) {
      const requiredDepth = path.filter((part) => !part.startsWith('[') && !part.startsWith('<')).length
      throw rscError(
        path,
        `${options.label} returned a React element deeper than its rsc depth allows. Raise it with .rsc({ depth: ${requiredDepth} }) on the point (0 allows an element as the whole output, 1 allows elements in first-level fields, …).`,
        options,
        { code: POINT0_ERROR_CODES_MAP.RSC_DEPTH_EXCEEDED },
      )
    }
    return await normalizeElement(value, path, options)
  }
  if (insideElement && typeof value === 'function') {
    throw rscError(
      path,
      `functions cannot travel over the wire. Event handlers and render props belong inside a component point.`,
      options,
    )
  }
  if (value instanceof Map || value instanceof Set) {
    // The codec only walks plain objects and arrays, so an element inside a Map/Set would neither unfold nor encode —
    // it would serialize as garbage. Fail loud; an element-free Map/Set passes through to the transformer untouched.
    if (rscDataHasElements(value)) {
      const container = value instanceof Map ? 'Map' : 'Set'
      throw rscError(
        path,
        `React elements inside a ${container} cannot cross the wire — the RSC codec only walks plain objects and arrays. Restructure the ${container} into a plain object or array.`,
        options,
      )
    }
    return value
  }
  if (Array.isArray(value)) {
    let out: unknown[] | undefined
    for (let i = 0; i < value.length; i++) {
      const normalized = await normalizeData(value[i], budget, [...path, `[${i}]`], options, insideElement)
      if (normalized !== value[i]) {
        out ??= [...value]
        out[i] = normalized
      }
    }
    return out ?? value
  }
  if (isPlainObject(value)) {
    let out: Record<string, unknown> | undefined
    for (const key in value) {
      const normalized = await normalizeData(value[key], budget - 1, [...path, key], options, insideElement)
      if (normalized !== value[key]) {
        out ??= { ...value }
        setOwnKey(out, key, normalized)
      }
    }
    return out ?? value
  }
  return value
}

const normalizeElement = async (
  element: React.ReactElement,
  path: string[],
  options: NormalizeRscOutputOptions,
): Promise<unknown> => {
  let type: unknown = element.type
  // unwrap memo — memoization is meaningless for a serialized tree
  while (typeof type === 'object' && type && $$typeofOf(type) === REACT_MEMO) {
    type = (type as { type: unknown }).type
  }
  const props = element.props as Record<string, unknown>
  if (props.ref != null) {
    throw rscError(path, `refs cannot travel over the wire — remove the ref from ${describeType(type)}.`, options)
  }

  // wire-representable types: keep the element, walk its props
  if (typeof type === 'string' || type === REACT_FRAGMENT || type === REACT_SUSPENSE) {
    return await keepElement(element, type, props, path, options)
  }
  const componentPointName = getComponentPointName(type) ?? getRscRefName(type)
  if (componentPointName !== undefined) {
    // a component point — or an already-decoded reference wrapper (server code composing fetched elements)
    return await keepElement(element, type, props, [...path, `<${componentPointName}>`], options)
  }
  if (isPointInstanceComponent(type)) {
    const pointType = (type as PointLikeComponent).point?.type
    throw rscError(
      path,
      `only component points can be referenced from loader data — ${describeType(type)} is a ${String(
        pointType,
      )} point. Declare it with .lets.component() to send it to the client.`,
      options,
    )
  }

  // everything else must unfold on the server
  if (type === ClientOnly) {
    throw rscError(
      path,
      `<ClientOnly> has no meaning inside loader data — the loader never runs in the browser. Make the child a component point and set .clientOnly() on it instead.`,
      options,
    )
  }
  let render: (props_: Record<string, unknown>) => unknown
  if (typeof type === 'function') {
    if (type.prototype && (type.prototype as { isReactComponent?: unknown }).isReactComponent) {
      throw rscError(
        path,
        `class component ${describeType(type)} cannot run as a server component — use a function.`,
        options,
      )
    }
    render = type as (props_: Record<string, unknown>) => unknown
  } else if (typeof type === 'object' && type && $$typeofOf(type) === REACT_FORWARD_REF) {
    const forwarded = type as unknown as { render: (props_: unknown, ref: unknown) => unknown }
    render = (props_) => forwarded.render(props_, undefined)
  } else {
    throw rscError(path, `${describeType(type)} elements are not supported in loader data.`, options)
  }
  let output: unknown
  try {
    output = render(props)
    if (output && typeof (output as PromiseLike<unknown>).then === 'function') {
      output = await output
    }
  } catch (error) {
    // A server component threw while unfolding on the server. Coerce it to the app's error class (else the base
    // `ErrorPoint0`) and re-throw — same as everywhere else in the framework. `from` keeps an intentional typed error's
    // fields (code/status/message) and coerces a plain throw; nothing is editorialized, so a user's own
    // `throw new Error(...)` reaches the boundary / `defer` fallback exactly as they wrote it.
    const ErrorClass = options.ErrorClass ?? ErrorPoint0
    throw ErrorClass.from(error)
  }
  const normalized = await normalizeData(output, Infinity, [...path, describeType(type)], options, true)
  // preserve the unfolded element's key for reconciliation
  if (element.key != null) {
    return React.createElement(React.Fragment, { key: element.key }, normalized as React.ReactNode)
  }
  return normalized
}

/**
 * Project a failed deferred subtree's error into what a function-form error fallback (see {@link defer}) receives:
 * coerce it to the app's error class, reduce it to its client projection (public in production, full in dev), and
 * revive it — so the fallback gets the SAME {@link ErrorPoint0} instance the nearest boundary would, and nothing private
 * leaks even if it renders the value or hands it to an island prop. Falls back to the base class when no error class
 * was threaded in (direct-normalize unit tests / the inline path).
 */
const projectHoleError = (error: unknown, ErrorClass: ClassLikeError0<ErrorPoint0> | undefined): ErrorPoint0 => {
  const ResolvedErrorClass = ErrorClass ?? ErrorPoint0
  return ResolvedErrorClass.from(serializeStateError(ResolvedErrorClass, error))
}

/**
 * Turn a {@link defer}'d subtree into a hole: register the subtree's (un-awaited) normalization in the per-request hole
 * registry, and stand a `Suspense` boundary in its place with a hole slot as the child. SSR renders the fallback and
 * streams the boundary out of order when the subtree lands; the wire encodes the slot as a `{ t: 2, id }` hole node.
 * Without a registry (no streaming context) the subtree is awaited inline — the same content, no progressive delivery,
 * but the error fallback still applies if the subtree fails.
 */
const normalizeHole = async (
  deferred: DeferredSubtree,
  path: string[],
  options: NormalizeRscOutputOptions,
): Promise<unknown> => {
  const holes = options.holes
  // Resolve the error fallback lazily, once the subtree's error is known: project the error for the client, run the
  // function form with it (or take the static node), and normalize the result to wire markup. Shared by both paths.
  const rawErrorFallback = deferred.errorFallback
  const resolveErrorFallback =
    rawErrorFallback === undefined
      ? undefined
      : async (error: unknown): Promise<React.ReactNode> => {
          const element =
            typeof rawErrorFallback === 'function'
              ? rawErrorFallback(projectHoleError(error, options.ErrorClass))
              : rawErrorFallback
          return (await normalizeData(
            element,
            Infinity,
            [...path, 'defer.errorFallback'],
            options,
            true,
          )) as React.ReactNode
        }
  if (!holes) {
    if (!resolveErrorFallback) {
      return await normalizeData(deferred.element, Infinity, [...path, 'defer'], options, true)
    }
    try {
      return await normalizeData(deferred.element, Infinity, [...path, 'defer'], options, true)
    } catch (error) {
      return await resolveErrorFallback(error)
    }
  }
  const fallback =
    deferred.fallback === undefined
      ? undefined
      : ((await normalizeData(
          deferred.fallback,
          Infinity,
          [...path, 'defer.fallback'],
          options,
          true,
        )) as React.ReactNode)
  const entry = holes.register(
    () => normalizeData(deferred.element, Infinity, [...path, 'defer'], options, true),
    resolveErrorFallback,
    // the deadline is the OWNER point's setting — one request's registry carries holes from many points
    {
      holeTimeoutMs: options.holeTimeoutMs ?? DEFAULT_RSC_HOLE_TIMEOUT_MS,
      ErrorClass: options.ErrorClass ?? ErrorPoint0,
    },
  )
  entry.label = options.label
  const holeSlot = makeServerHoleSlot(entry)
  // The deferred element's key climbs onto the Suspense wrapper — a defer() in a keyed list reconciles by it (the
  // wrapper is what sits in the array position; without this every deferred list item would be unkeyed).
  const suspenseProps: Record<string, unknown> = {}
  if (fallback !== undefined) {
    suspenseProps.fallback = fallback
  }
  if (deferred.element.key != null) {
    suspenseProps.key = deferred.element.key
  }
  return React.createElement(React.Suspense, suspenseProps, holeSlot)
}

/**
 * The server-side hole slot component: suspends on the entry's never-rejecting settle promise (Fizz streams the
 * boundary out of order), renders the resolved subtree once it lands, and re-throws a rejected subtree's error at
 * render (reaching the nearest error boundary — the pushed error state lets the client match). Branded so
 * `encodeElement` emits `{ t: 2 }`. Used both when normalize builds the tree AND when SSR decode re-resolves a hole
 * (the loader data round-trips the transformer, so the top render decodes the hole back — see {@link resolveHoleSlot}).
 */
const serverHoleComponent = (entry: RscHoleEntry): React.ComponentType => {
  const Hole = (): React.ReactNode => {
    if (entry.settled) {
      const result = entry.result
      if (result && 'error' in result) {
        // A per-hole error fallback (defer's 3rd arg) renders in place, scoping the failure to this block; without one
        // the error re-throws to the nearest boundary.
        if (entry.errorFallback !== undefined) {
          return entry.errorFallback
        }
        throw result.error
      }
      return (result?.node ?? null) as React.ReactNode
    }
    throw entry.throwable
  }
  Hole.displayName = `RscHole(${entry.id})`
  ;(Hole as unknown as Record<string, unknown>)[RSC_HOLE_BRAND] = entry.id
  return Hole
}

const makeServerHoleSlot = (entry: RscHoleEntry): React.ReactElement => React.createElement(serverHoleComponent(entry))

const keepElement = async (
  element: React.ReactElement,
  type: unknown,
  props: Record<string, unknown>,
  path: string[],
  options: NormalizeRscOutputOptions,
): Promise<React.ReactElement> => {
  let nextProps: Record<string, unknown> | undefined
  for (const key in props) {
    const value = props[key]
    if (typeof value === 'function') {
      throw rscError(
        [...path, key],
        `functions cannot travel over the wire (prop "${key}" of ${describeType(
          type,
        )}). Event handlers and render props belong inside a component point.`,
        options,
      )
    }
    const normalized = await normalizeData(value, Infinity, [...path, key], options, true)
    if (normalized !== value) {
      nextProps ??= { ...props }
      setOwnKey(nextProps, key, normalized)
    }
  }
  if (!nextProps && type === element.type) {
    return element
  }
  const finalProps: Record<string, unknown> = { ...(nextProps ?? props) }
  if (element.key != null) {
    finalProps.key = element.key
  }
  return createElementSpreadingChildren(type as React.ElementType, finalProps)
}

/**
 * `React.createElement` with array children spread as varargs. An array passed via `props.children` reads as a dynamic
 * list to React (keys demanded), while the same children written inline in JSX are static — rebuilding an element from
 * data would otherwise turn every static children list into key warnings.
 */
const createElementSpreadingChildren = (
  type: React.ElementType,
  props: Record<string, unknown>,
): React.ReactElement => {
  const { children, ...rest } = props
  if (Array.isArray(children)) {
    return React.createElement(type, rest, ...(children as React.ReactNode[]))
  }
  if (children !== undefined) {
    return React.createElement(type, rest, children as React.ReactNode)
  }
  return React.createElement(type, rest)
}

/**
 * Collect the component-point names referenced by live elements inside a data structure — the server-side dehydrated
 * store right before embedding. Feeds the per-payload `<link rel=modulepreload>` links, so the browser fetches
 * component chunks in parallel with the entry bundle.
 */
export const collectRscComponentNames = (value: unknown): string[] => {
  const names = new Set<string>()
  const walk = (current: unknown): void => {
    if (React.isValidElement(current)) {
      let type: unknown = current.type
      while (typeof type === 'object' && type && $$typeofOf(type) === REACT_MEMO) {
        type = (type as { type: unknown }).type
      }
      const name = getComponentPointName(type) ?? getRscRefName(type)
      if (name !== undefined) {
        names.add(name)
      }
      const props = current.props as Record<string, unknown>
      for (const key in props) {
        walk(props[key])
      }
      return
    }
    if (Array.isArray(current)) {
      current.forEach(walk)
      return
    }
    if (isPlainObject(current)) {
      for (const key in current) {
        walk(current[key])
      }
    }
  }
  walk(value)
  return [...names]
}

// encode (server → wire)

/**
 * Turn live normalized elements inside a data structure into plain wire markers (`{ __p0e: node }`). Runs inside the
 * data transformer's serialize, before the user transformer — so element props pass through the user transformer like
 * any other data. Structure is shared where nothing changed. User data keys colliding with the marker are `$`-escaped.
 */
export const encodeRscData = (value: unknown): unknown => {
  if (React.isValidElement(value)) {
    return { [RSC_MARKER_KEY]: encodeElement(value) }
  }
  if (Array.isArray(value)) {
    let out: unknown[] | undefined
    for (let i = 0; i < value.length; i++) {
      const encoded = encodeRscData(value[i])
      if (encoded !== value[i]) {
        out ??= [...value]
        out[i] = encoded
      }
    }
    return out ?? value
  }
  if (isPlainObject(value)) {
    let out: Record<string, unknown> | undefined
    const keys = Object.keys(value)
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]!
      const encoded = encodeRscData(value[key])
      const escapedKey = RSC_ESCAPED_KEY_REGEX.test(key) ? `${key}$` : key
      if (!out && (encoded !== value[key] || escapedKey !== key)) {
        out = {}
        for (let j = 0; j < i; j++) {
          // earlier keys are unchanged and unescaped, otherwise `out` would already exist
          setOwnKey(out, keys[j]!, value[keys[j]!])
        }
      }
      if (out) {
        setOwnKey(out, escapedKey, encoded)
      }
    }
    return out ?? value
  }
  return value
}

const encodeElement = (element: React.ReactElement): RscNode => {
  let type: unknown = element.type
  while (typeof type === 'object' && type && $$typeofOf(type) === REACT_MEMO) {
    type = (type as { type: unknown }).type
  }
  const holeId = getRscHoleName(type)
  if (holeId !== undefined) {
    // a deferred hole slot — carries no props/children on the wire; its fill arrives over `__POINT0_PUSH_RSC__`
    const holeNode: RscNode = { t: 2, id: holeId }
    if (element.key != null) {
      holeNode.k = element.key
    }
    return holeNode
  }
  const node: RscNode = { t: '' }
  if (typeof type === 'string') {
    node.t = type
  } else if (type === REACT_FRAGMENT) {
    node.t = 0
  } else if (type === REACT_SUSPENSE) {
    node.t = 1
  } else {
    const componentPointName = getComponentPointName(type) ?? getRscRefName(type)
    if (componentPointName === undefined) {
      throw new Error(
        `RSC: cannot serialize element ${describeType(
          type,
        )} — it is not a host element, Fragment, Suspense, or component point. Elements must go through a server loader (which normalizes them) before serialization.`,
      )
    }
    node.t = { c: componentPointName }
  }
  if (element.key != null) {
    node.k = element.key
  }
  const props = element.props as Record<string, unknown>
  let encodedProps: Record<string, unknown> | undefined
  for (const key in props) {
    if (props[key] === undefined) {
      continue
    }
    encodedProps ??= {}
    setOwnKey(encodedProps, key, encodeRscData(props[key]))
  }
  if (encodedProps) {
    node.p = encodedProps
  }
  return node
}

// decode (wire → client)

/** A lazy component-point loader from the points aggregator: () → dynamic import resolving to the mount component. */
export type RscComponentLoader = () => Promise<React.ComponentType<any>>

/**
 * The per-bundle cache for LAZY component-point references. Component points live in the points collection like every
 * other point; on the client the generated aggregator lists them as lazy records, so resolving a reference means
 * starting the record's dynamic import. `resolve` hands out a cached wrapper per name and kicks the import off
 * immediately; `drainPending` awaits every import in flight — callers use it to hand data to React only with chunks
 * warm (no Suspense-fallback flash, no hydration mismatch).
 */
export class RscComponentsRegistry {
  private resolved = new Map<string, React.ComponentType<any>>()
  private pending = new Set<Promise<unknown>>()

  resolve(name: string, load: RscComponentLoader): React.ComponentType<any> {
    const cached = this.resolved.get(name)
    if (cached) {
      return cached
    }
    const promise = load()
    this.track(promise)
    // NOT React.lazy: lazy suspends on its first render even when its promise is already settled (the payload status
    // only updates in a microtask), which would flash a fallback / disturb hydration despite the drain. This wrapper
    // fills a slot the moment the chunk lands (attached before any drain await, so a drained caller renders the real
    // component synchronously) and suspends React-style (throws the thenable) only when genuinely not loaded yet.
    const slot: { Component?: React.ComponentType<any> } = {}
    void promise.then(
      (Component) => {
        slot.Component = Component
      },
      () => {
        // A failed chunk import (network drop, a stale deploy's 404) must not become an unhandled rejection — the
        // thrown thenable already carries the failure to the nearest boundary at render. Evict the cached wrapper so
        // the NEXT decode (a later navigation, a retry) starts a fresh import instead of replaying the failure forever.
        this.resolved.delete(name)
      },
    )
    const Ref = (props: Record<string, unknown>): React.ReactNode => {
      if (slot.Component) {
        return React.createElement(slot.Component, props)
      }
      throw promise
    }
    Ref.displayName = `RscRef(${name})`
    ;(Ref as unknown as Record<string, unknown>)[RSC_REF_BRAND] = name
    this.resolved.set(name, Ref)
    return Ref
  }

  /**
   * Await all in-flight component chunk imports. Safe to call concurrently — each promise removes itself on settlement,
   * so parallel drains never steal each other's batches.
   */
  async drainPending(): Promise<void> {
    while (this.pending.size) {
      await Promise.all(
        [...this.pending].map((promise) =>
          promise.catch(() => {
            // the drain must not reject on a failed chunk — React.lazy surfaces the error at render
          }),
        ),
      )
    }
  }

  private track(promise: Promise<unknown>): void {
    this.pending.add(promise)
    const remove = (): void => {
      this.pending.delete(promise)
    }
    void promise.then(remove, remove)
  }
}

/**
 * The bundle-wide lazy-reference cache. One per module graph; loaders come from the points collection at decode time,
 * so nothing feeds it explicitly — `mount()` registers component points with all the other points.
 */
export const rscComponentsRegistry = new RscComponentsRegistry()

type RscClientHole = {
  filled: boolean
  /** The decode side has built this hole's slot component (which closes over this object directly). */
  decoded: boolean
  hasError: boolean
  node?: unknown
  error?: unknown
  /** A per-hole error fallback (see {@link defer}) — rendered in place of the subtree when it failed. */
  errorFallback?: unknown
  promise: Promise<void>
  wake: () => void
}

/**
 * Per-bundle client registry for deferred holes (see {@link defer}). A decoded hole node (`t: 2`) resolves to a slot
 * component that suspends until its fill arrives over `__POINT0_PUSH_RSC__` (the receiver `mount()` installs), then
 * renders the decoded subtree. A fill can arrive before OR after its slot is decoded (both orders happen with streamed
 * inline scripts), so fill and slot get-or-create the same entry.
 *
 * The server already streamed the subtree's markup into the boundary (Fizz), so it DISPLAYS regardless of the fill; the
 * fill drives hydration and later client re-renders. A hole whose fill lands before hydration (buffered — `mount()`
 * awaits those) hydrates its content; one revealed only after hydration displays but is not re-hydrated (React keeps
 * the server-completed boundary), so INTERACTIVE islands inside a deferred subtree are a documented limitation — put
 * interactive parts at the top level or stream them with `suspend: 'server'`. See docs/core/rsc.md.
 *
 * Entry lifecycle: an entry is EVICTED the moment both sides have met — the slot component was built (decode) AND the
 * fill was applied (push), in either order. The slot component closes over the slot object directly, so later
 * re-renders never need the map; ids are unique per fetch, so an id is never looked up again after the handshake. This
 * keeps the bundle-wide map from pinning every delivered subtree for the life of the session.
 */
export class RscHolesRegistry {
  private slots = new Map<string, RscClientHole>()

  private ensure(id: string): RscClientHole {
    let slot = this.slots.get(id)
    if (!slot) {
      let wake!: () => void
      const promise = new Promise<void>((resolve) => {
        wake = resolve
      })
      slot = { filled: false, decoded: false, hasError: false, promise, wake }
      this.slots.set(id, slot)
    }
    return slot
  }

  /**
   * Decode side: a component that throws until the hole is filled, then renders its subtree. A failed subtree renders
   * its per-hole error fallback in place (defer's 3rd arg) if one arrived, otherwise re-throws to the nearest
   * boundary.
   */
  slotComponent(id: string): React.ComponentType<any> {
    const slot = this.ensure(id)
    slot.decoded = true
    if (slot.filled) {
      // handshake complete (fill arrived first) — the component below closes over `slot`, the map entry is done
      this.slots.delete(id)
    }
    const Hole = (): React.ReactNode => {
      if (slot.filled) {
        if (slot.hasError) {
          if (slot.errorFallback !== undefined) {
            return slot.errorFallback as React.ReactNode
          }
          throw slot.error
        }
        return slot.node as React.ReactNode
      }
      throw slot.promise
    }
    Hole.displayName = `RscHole(${id})`
    ;(Hole as unknown as Record<string, unknown>)[RSC_HOLE_BRAND] = id
    return Hole
  }

  /** Push side: fill a hole with its decoded subtree (or error + optional per-hole error fallback) and wake it. */
  fill(id: string, result: { node: unknown } | { error: unknown; errorFallback?: unknown }): void {
    const slot = this.ensure(id)
    if ('error' in result) {
      slot.error = result.error
      slot.hasError = true
      slot.errorFallback = result.errorFallback
    } else {
      slot.node = result.node
    }
    slot.filled = true
    slot.wake()
    if (slot.decoded) {
      // handshake complete (slot was decoded first) — its component holds the slot object, the map entry is done
      this.slots.delete(id)
    }
  }

  /**
   * Ids of holes whose slot exists but hasn't been filled yet — the client stream reader diffs this to learn which
   * holes a given fetch introduced, and to fail exactly those if its stream drops before they arrive.
   */
  pendingIds(): Set<string> {
    const ids = new Set<string>()
    for (const [id, slot] of this.slots) {
      if (!slot.filled) {
        ids.add(id)
      }
    }
    return ids
  }

  /**
   * Fail a hole with an error ONLY if it's still unfilled (a hole that already arrived keeps its content). Used when a
   * streamed fetch ends before a hole's subtree landed, so its slot throws to the nearest boundary instead of
   * spinning.
   */
  failIfPending(id: string, error: unknown): void {
    const slot = this.slots.get(id)
    if (slot && !slot.filled) {
      this.fill(id, { error })
    }
  }
}

/** The bundle-wide hole registry — `mount()` feeds it via the `__POINT0_PUSH_RSC__` receiver. */
export const rscHolesRegistry = new RscHolesRegistry()

/**
 * Rebuild live React elements from wire markers. Component-point references resolve from the live points collection
 * (the server has every component statically; the client's lazy records start their chunk imports immediately);
 * everything else becomes `React.createElement` of the host tag / Fragment / Suspense. Only ever applied to
 * server-produced payloads — never to client input.
 */
export const decodeRscData = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    let out: unknown[] | undefined
    for (let i = 0; i < value.length; i++) {
      const decoded = decodeRscData(value[i])
      if (decoded !== value[i]) {
        out ??= [...value]
        out[i] = decoded
      }
    }
    return out ?? value
  }
  if (isPlainObject(value)) {
    const keys = Object.keys(value)
    if (keys.length === 1 && keys[0] === RSC_MARKER_KEY) {
      return decodeElement(value[RSC_MARKER_KEY] as RscNode)
    }
    let out: Record<string, unknown> | undefined
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]!
      const decoded = decodeRscData(value[key])
      const unescapedKey = RSC_ESCAPED_KEY_REGEX.test(key) && key.endsWith('$') ? key.slice(0, -1) : key
      if (!out && (decoded !== value[key] || unescapedKey !== key)) {
        out = {}
        for (let j = 0; j < i; j++) {
          setOwnKey(out, keys[j]!, value[keys[j]!])
        }
      }
      if (out) {
        setOwnKey(out, unescapedKey, decoded)
      }
    }
    return out ?? value
  }
  return value
}

const decodeElement = (node: RscNode): React.ReactElement => {
  const props: Record<string, unknown> = {}
  if (node.p) {
    for (const key in node.p) {
      setOwnKey(props, key, decodeRscData(node.p[key]))
    }
  }
  if (node.k != null) {
    props.key = node.k
  }
  const type: React.ElementType =
    typeof node.t === 'string'
      ? (node.t as React.ElementType)
      : node.t === 0
        ? React.Fragment
        : node.t === 1
          ? React.Suspense
          : node.t === 2
            ? resolveHoleSlot(node.id as string)
            : resolveRef(node.t.c)
  return createElementSpreadingChildren(type, props)
}

/**
 * Resolve a component-point reference from the live points collection — component points are points, so the collection
 * IS the registry. The server aggregator imports every component statically, so SSR resolves the real mount and
 * re-encoding the decoded tree yields the same reference; the client aggregator lists components as lazy records, so a
 * reference starts the record's dynamic import through the {@link rscComponentsRegistry} slot cache.
 */
const resolveRef = (name: string): React.ComponentType<any> => {
  const record = findComponentPointRecord(name)
  const candidate = record?.point
  // a statically imported point: the decorated mount component itself, or the Point0 instance (whose `.X` is the mount)
  if (typeof candidate === 'function' && (candidate as PointLikeComponent).__POINT0_INSTANCE__) {
    return candidate as React.ComponentType<any>
  }
  const mount = (candidate as { X?: unknown } | undefined)?.X
  if (typeof mount === 'function') {
    return mount as React.ComponentType<any>
  }
  // a lazy aggregator record: `point` is an async loader resolving to the exported mount component
  if (typeof candidate === 'function') {
    return rscComponentsRegistry.resolve(name, async () => {
      const loaded: unknown = await (candidate as () => Promise<unknown>)()
      if (typeof loaded === 'function') {
        return loaded as React.ComponentType<any>
      }
      const loadedMount = (loaded as { X?: unknown } | null | undefined)?.X
      if (typeof loadedMount === 'function') {
        return loadedMount as React.ComponentType<any>
      }
      throw new Error(`RSC: lazy component point "${name}" resolved to a non-component value.`)
    })
  }
  throw new Error(
    `RSC: cannot resolve component point "${name}" from a server payload — it is not in the points collection. Re-run point0 generate, and make sure the component point is exported from a source file.`,
  )
}

/**
 * Resolve a decoded hole (`t: 2`) to a slot. The loader data round-trips the transformer even server-side (a page/layer
 * loader is fetched in a nested run and its response is deserialized by the outer render), so the outer SSR render
 * decodes the hole back — and must resolve it against the still-live per-request server registry so the boundary
 * STREAMS from the resolving subtree (Fizz reveals it), not waits for a client push that only happens in the browser.
 * On the client there is no server registry, so the slot waits for its `__POINT0_PUSH_RSC__` fill.
 */
const resolveHoleSlot = (id: string): React.ComponentType<any> => {
  const serverEntry = getServerHoleRegistryOrUndefined()?.entries.get(id)
  if (serverEntry) {
    return serverHoleComponent(serverEntry)
  }
  return rscHolesRegistry.slotComponent(id)
}

const getServerHoleRegistryOrUndefined = (): RscHoleRegistry | undefined => {
  try {
    return superstore.getItem<RscHoleRegistry | undefined>('__POINT0_RSC_HOLES__')?.getOrUndefined()
  } catch {
    return undefined
  }
}

const findComponentPointRecord = (name: string): { point?: unknown } | undefined => {
  let clientPoints: { manager: { collection: unknown[] } }
  try {
    clientPoints = getClientPoints() as unknown as { manager: { collection: unknown[] } }
  } catch {
    return undefined
  }
  return clientPoints.manager.collection.find(
    (item) => (item as { type?: string }).type === 'component' && (item as { name?: string }).name === name,
  ) as { point?: unknown } | undefined
}

// transformer wrapping

/**
 * Wrap the app's data transformer with the RSC codec: serialize encodes live elements into markers first (so the user
 * transformer sees plain data, and custom types inside element props keep working), deserialize decodes markers back
 * into elements last. Used for DATA payloads only (loader/query/mutation outputs, dehydrated state, push scripts) —
 * input parsing stays on the raw transformer, so the server never decodes elements from untrusted bytes.
 */
export const wrapTransformerWithRsc = (transformer: DataTransformerExtended): DataTransformerExtended => {
  return {
    serialize: (data) => transformer.serialize(encodeRscData(data)),
    deserialize: <TData>(data: unknown): TData => decodeRscData(transformer.deserialize(data)) as TData,
    stringify: (data) => transformer.stringify(encodeRscData(data)),
    parse: <TData>(stringified: string): TData => decodeRscData(transformer.parse(stringified)) as TData,
  }
}
