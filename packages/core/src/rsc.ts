import * as React from 'react'
import { ClientOnly, getClientPoints } from './helpers.js'
import { superstore } from './super-store.js'
import type { DataTransformerExtended } from './types.js'

/**
 * RSC ("React elements as data") — the machinery that lets a server `.loader()` (of any point: page, layout, query,
 * mutation, component, …) return React elements — plain (`.loader(async () => <Hello />)`) or nested in the output
 * object (`.loader(async () => ({ stats, hero: <Hero /> }))`, opted in via `.rscDepth(n)`).
 *
 * The model is "elements are just data": an element returned from a loader travels to the client through the exact same
 * pipe as every other loader/query/mutation value — the data transformer — and lands in `data` like everything else. No
 * Flight protocol, no react-server module graph, no directives. Three cooperating pieces:
 *
 * - `normalizeRscOutput` — runs on the server right after the loader resolves. Walks the output to the point's
 *   `.rscDepth()`, validates element positions, and UNFOLDS plain function components by calling them (async supported)
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

const rscError = (path: string[], message: string): Error => {
  const at = path.length ? ` (at ${path.join('.')})` : ''
  return new Error(`RSC${at}: ${message}`)
}

// defer — deferred holes (progressive in-tree streaming)

const RSC_DEFER_BRAND = '__POINT0_RSC_DEFER__'

/** A subtree wrapped by {@link defer}: its element streams as a hole instead of being awaited inline. */
type DeferredSubtree = {
  readonly [RSC_DEFER_BRAND]: true
  readonly element: React.ReactElement
  readonly fallback: React.ReactNode
}

/**
 * Defer a slow server subtree so the loader payload never waits for it. Instead of awaiting the element inline,
 * `normalizeRscOutput` ships a HOLE in its place under a `Suspense` boundary (showing `fallback`), streams the shell
 * immediately, and pushes the resolved subtree into the same response as it settles — `__POINT0_PUSH_RSC__`, the RSC
 * analog of the streamed-query push. The client fills the hole in place and the boundary reveals: no refetch, no
 * flicker, hydration matching by construction.
 *
 * ```tsx
 * .loader(async () => ({
 *   stats: await getStats(),                             // fast — ships in the shell
 *   analytics: defer(<Analytics />, <ChartSkeleton />),  // slow — streams in later
 * }))
 * ```
 *
 * Only meaningful inside a server loader whose response can stream (a page/document SSR render). Outside a streaming
 * context (data-only fetches, SSG) it degrades gracefully — the subtree is awaited inline like a plain server component
 * and the fallback is dropped: the same content, just without progressive delivery.
 *
 * Typed as the element it stands for: after normalize the field IS a live element (a `Suspense` boundary), so it
 * renders like any other RSC loader output. The deferral marker is an internal detail — only ever unwrapped by
 * normalize.
 */
export const defer = (element: React.ReactElement, fallback?: React.ReactNode): React.ReactElement =>
  ({ [RSC_DEFER_BRAND]: true, element, fallback }) as unknown as React.ReactElement

const isDeferred = (value: unknown): value is DeferredSubtree =>
  typeof value === 'object' && value !== null && (value as Record<string, unknown>)[RSC_DEFER_BRAND] === true

// normalize (server, right after the loader)

export type NormalizeRscOutputOptions = {
  /** The point's `.rscDepth()` — how deep in the output object elements are allowed. */
  depth: number
  /** Point description for error messages, e.g. `page "home"`. */
  label: string
  /**
   * Per-request hole registry for {@link defer}. Present only in a streaming SSR pass; when absent (data-only, SSG, unit
   * tests) a deferred subtree is awaited inline and the hole machinery is skipped.
   */
  holes?: RscHoleRegistry
}

type RscHoleResult = { node: unknown } | { error: unknown }

/** A single deferred hole minted this request. The render pump drains {@link RscHoleRegistry.takeResolved} of these. */
export type RscHoleEntry = {
  id: string
  settled: boolean
  delivered: boolean
  /** The never-rejecting settle promise the SSR hole slot suspends on. */
  throwable: Promise<void>
  result?: RscHoleResult
}

/**
 * Per-request server-side registry of deferred holes (see {@link defer}). `register` mints an id, kicks off the
 * subtree's normalization WITHOUT awaiting it, and returns an entry the SSR hole slot suspends on. The entry's
 * throwable never rejects — a failed subtree settles to an error the slot re-throws at render (a rejected Suspense
 * thenable hangs Fizz on Bun) — so the render pump can push resolved subtrees (or errors) into the streamed response as
 * they land.
 */
export class RscHoleRegistry {
  private counter = 0
  /** All holes minted this request, by id — the render pump drains resolved ones. */
  readonly entries = new Map<string, RscHoleEntry>()

  register(normalize: () => Promise<unknown>): RscHoleEntry {
    const id = `h${this.counter++}`
    const entry: RscHoleEntry = { id, settled: false, delivered: false, throwable: Promise.resolve() }
    entry.throwable = normalize().then(
      (node) => {
        entry.settled = true
        entry.result = { node }
      },
      (error: unknown) => {
        entry.settled = true
        entry.result = { error }
      },
    )
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
 * Detect whether a value contains React elements anywhere a plain data walk can reach (objects/arrays). Used to skip
 * the whole normalize pass for element-free outputs — the overwhelmingly common case.
 */
export const rscDataHasElements = (value: unknown): boolean => {
  if (isDeferred(value)) {
    return true
  }
  if (React.isValidElement(value)) {
    return true
  }
  if (Array.isArray(value)) {
    return value.some(rscDataHasElements)
  }
  if (isPlainObject(value)) {
    for (const key in value) {
      if (rscDataHasElements(value[key])) {
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
 * Elements found deeper than `depth` raise an error pointing at `.rscDepth(n)`.
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
): Promise<unknown> => {
  if (isDeferred(value)) {
    if (budget < 0) {
      const requiredDepth = path.filter((part) => !part.startsWith('[') && !part.startsWith('<')).length
      throw rscError(
        path,
        `${options.label} returned a deferred subtree deeper than its rscDepth allows. Raise it with .rscDepth(${requiredDepth}) on the point (0 allows it as the whole output, 1 allows it in first-level fields, …).`,
      )
    }
    return await normalizeHole(value, path, options)
  }
  if (React.isValidElement(value)) {
    if (budget < 0) {
      const requiredDepth = path.filter((part) => !part.startsWith('[') && !part.startsWith('<')).length
      throw rscError(
        path,
        `${options.label} returned a React element deeper than its rscDepth allows. Raise it with .rscDepth(${requiredDepth}) on the point (0 allows an element as the whole output, 1 allows elements in first-level fields, …).`,
      )
    }
    return await normalizeElement(value, path, options)
  }
  if (Array.isArray(value)) {
    let out: unknown[] | undefined
    for (let i = 0; i < value.length; i++) {
      const normalized = await normalizeData(value[i], budget, [...path, `[${i}]`], options)
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
      const normalized = await normalizeData(value[key], budget - 1, [...path, key], options)
      if (normalized !== value[key]) {
        out ??= { ...value }
        out[key] = normalized
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
    throw rscError(path, `refs cannot travel over the wire — remove the ref from ${describeType(type)}.`)
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
    )
  }

  // everything else must unfold on the server
  if (type === ClientOnly) {
    throw rscError(
      path,
      `<ClientOnly> has no meaning inside loader data — the loader never runs in the browser. Make the child a component point and set .clientOnly() on it instead.`,
    )
  }
  let render: (props_: Record<string, unknown>) => unknown
  if (typeof type === 'function') {
    if (type.prototype && (type.prototype as { isReactComponent?: unknown }).isReactComponent) {
      throw rscError(path, `class component ${describeType(type)} cannot run as a server component — use a function.`)
    }
    render = type as (props_: Record<string, unknown>) => unknown
  } else if (typeof type === 'object' && type && $$typeofOf(type) === REACT_FORWARD_REF) {
    const forwarded = type as unknown as { render: (props_: unknown, ref: unknown) => unknown }
    render = (props_) => forwarded.render(props_, undefined)
  } else {
    throw rscError(path, `${describeType(type)} elements are not supported in loader data.`)
  }
  let output: unknown
  try {
    output = render(props)
    if (output && typeof (output as PromiseLike<unknown>).then === 'function') {
      output = await output
    }
  } catch (error) {
    throw rscError(
      path,
      `server component ${describeType(type)} threw while rendering on the server: ${String(
        (error as Error | undefined)?.message ?? error,
      )}. Server components run as plain function calls — hooks and context are not available; if it needs them, make it a component point so it renders on the client.`,
    )
  }
  const normalized = await normalizeData(output, Infinity, [...path, describeType(type)], options)
  // preserve the unfolded element's key for reconciliation
  if (element.key != null) {
    return React.createElement(React.Fragment, { key: element.key }, normalized as React.ReactNode)
  }
  return normalized
}

/**
 * Turn a {@link defer}'d subtree into a hole: register the subtree's (un-awaited) normalization in the per-request hole
 * registry, and stand a `Suspense` boundary in its place with a hole slot as the child. SSR renders the fallback and
 * streams the boundary out of order when the subtree lands; the wire encodes the slot as a `{ t: 2, id }` hole node.
 * Without a registry (no streaming context) the subtree is awaited inline — the same content, no progressive delivery.
 */
const normalizeHole = async (
  deferred: DeferredSubtree,
  path: string[],
  options: NormalizeRscOutputOptions,
): Promise<unknown> => {
  const holes = options.holes
  if (!holes) {
    return await normalizeData(deferred.element, Infinity, [...path, 'defer'], options)
  }
  const fallback =
    deferred.fallback === undefined
      ? undefined
      : ((await normalizeData(deferred.fallback, Infinity, [...path, 'defer.fallback'], options)) as React.ReactNode)
  const entry = holes.register(() => normalizeData(deferred.element, Infinity, [...path, 'defer'], options))
  const holeSlot = makeServerHoleSlot(entry)
  return React.createElement(React.Suspense, fallback === undefined ? null : { fallback }, holeSlot)
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
      )
    }
    const normalized = await normalizeData(value, Infinity, [...path, key], options)
    if (normalized !== value) {
      nextProps ??= { ...props }
      nextProps[key] = normalized
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
          out[keys[j]!] = value[keys[j]!]
        }
      }
      if (out) {
        out[escapedKey] = encoded
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
    encodedProps[key] = encodeRscData(props[key])
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
    void promise.then((Component) => {
      slot.Component = Component
    })
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
  hasError: boolean
  node?: unknown
  error?: unknown
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
      slot = { filled: false, hasError: false, promise, wake }
      this.slots.set(id, slot)
    }
    return slot
  }

  /** Decode side: a component that throws until the hole is filled, then renders its subtree (or re-throws its error). */
  slotComponent(id: string): React.ComponentType<any> {
    const slot = this.ensure(id)
    const Hole = (): React.ReactNode => {
      if (slot.filled) {
        if (slot.hasError) {
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

  /** Push side: fill a hole with its decoded subtree (or error) and wake the suspended boundary. */
  fill(id: string, result: { node: unknown } | { error: unknown }): void {
    const slot = this.ensure(id)
    if ('error' in result) {
      slot.error = result.error
      slot.hasError = true
    } else {
      slot.node = result.node
    }
    slot.filled = true
    slot.wake()
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
          out[keys[j]!] = value[keys[j]!]
        }
      }
      if (out) {
        out[unescapedKey] = decoded
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
      props[key] = decodeRscData(node.p[key])
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
