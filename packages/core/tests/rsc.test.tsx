import { describe, expect, it } from 'bun:test'
import * as React from 'react'
import {
  RSC_MARKER_KEY,
  RscComponentsRegistry,
  RscHoleRegistry,
  decodeRscData,
  defer,
  encodeRscData,
  normalizeRscOutput,
  rscDataHasElements,
  rscHolesRegistry,
  wrapTransformerWithRsc,
} from '../src/rsc.js'
import { Point0 } from '../src/point0.js'
import { ClientPoints } from '../src/client-points.js'
import { ClientOnly } from '../src/helpers.js'
import { applyPushedRscFill, readStreamedRscFetch } from '../src/query-client.js'
import { blankDataTransformerExtended } from '../src/utils.js'
import { superstore } from '../src/super-store.js'
import { ErrorPoint0, POINT0_ERROR_CODES_MAP } from '../src/error.js'

const roundtrip = (value: unknown): unknown => decodeRscData(JSON.parse(JSON.stringify(encodeRscData(value))))

describe('rsc codec', () => {
  it('roundtrips host elements nested in data, preserving keys and props', () => {
    const value = {
      n: 1,
      hero: (
        <div id="hero" className="big" key="h">
          <b>H!</b>
          {['a', 'b'].map((x) => (
            <i key={x}>{x}</i>
          ))}
        </div>
      ),
    }
    const out = roundtrip(value) as typeof value
    expect(out.n).toBe(1)
    expect(React.isValidElement(out.hero)).toBe(true)
    expect(out.hero.key).toBe('h')
    expect(out.hero.props.id).toBe('hero')
    expect(out.hero.props.className).toBe('big')
    const children = out.hero.props.children as React.ReactElement[]
    expect(children[0]!.type).toBe('b')
    expect((children[1] as unknown as React.ReactElement[])[0]!.key).toBe('a')
  })

  it('maps Fragment and Suspense to compact wire markers', () => {
    const value = (
      <React.Suspense fallback={<span>...</span>}>
        <>
          <b>x</b>
        </>
      </React.Suspense>
    )
    const encoded = encodeRscData(value) as Record<string, { t: unknown; p: { fallback: { __p0e: { t: unknown } } } }>
    expect(encoded[RSC_MARKER_KEY]!.t).toBe(1)
    expect(encoded[RSC_MARKER_KEY]!.p.fallback.__p0e.t).toBe('span')
    const out = roundtrip(value) as React.ReactElement
    expect(out.type).toBe(React.Suspense)
    expect((out.props as { children: React.ReactElement }).children.type).toBe(React.Fragment)
  })

  it('escapes user data keys colliding with the marker', () => {
    const value = { [RSC_MARKER_KEY]: 'not an element', [`${RSC_MARKER_KEY}$`]: 2, ok: true }
    const encoded = encodeRscData(value) as Record<string, unknown>
    expect(encoded[`${RSC_MARKER_KEY}$`]).toBe('not an element')
    expect(encoded[`${RSC_MARKER_KEY}$$`]).toBe(2)
    expect(roundtrip(value)).toEqual(value)
  })

  it('shares structure when no elements are present', () => {
    const value = { a: [1, 2, { b: 'c' }] }
    expect(encodeRscData(value)).toBe(value)
    expect(decodeRscData(value)).toBe(value)
  })

  it('rscDataHasElements detects elements at any data depth', () => {
    expect(rscDataHasElements({ a: [{ b: <i /> }] })).toBe(true)
    expect(rscDataHasElements({ a: [{ b: 'x' }] })).toBe(false)
    expect(rscDataHasElements(<i />)).toBe(true)
  })

  it('transform:false still round-trips an element: the client decodes what the server RSC-encoded', () => {
    // The server encodes its output through the RSC-wrapped transformer regardless of `transform` (fetcher.ts:653,880);
    // under transform:false the inner transformer is blank. The client must mirror that — before the fix it returned the
    // raw res.json() here, so an element came back as a `{ __p0e: … }` object React can't render. Now it decodes through
    // the point's blank-RSC transformer (`_getBlankTransformerWithRsc`), keeping both sides symmetric.
    const output = { hero: <b id="h">hi</b>, n: 1 }
    const serverBody = wrapTransformerWithRsc(blankDataTransformerExtended).stringify(output)
    const json = JSON.parse(serverBody!) as { hero: unknown; n: number }
    // the raw json (pre-fix path) still carries an encoded marker, not a React element
    expect(React.isValidElement(json.hero)).toBe(false)
    // the fix: decode through the point's blank-RSC transformer
    const point = Point0.lets('root', 'tf-false').root()
    const decoded = (point as unknown as { _getBlankTransformerWithRsc: () => typeof blankDataTransformerExtended })
      ._getBlankTransformerWithRsc()
      .deserialize(json) as { hero: unknown; n: number }
    expect(React.isValidElement(decoded.hero)).toBe(true)
    expect((decoded.hero as React.ReactElement).type).toBe('b')
    expect(decoded.n).toBe(1)
  })

  it('an own __proto__ key in user data survives the codec as an own key — never rewriting a prototype', () => {
    // JSON.parse is the realistic producer of an own `__proto__` key (an object literal can't make one)
    const value = JSON.parse('{"__proto__":{"polluted":true},"n":1}') as Record<string, unknown>
    value.hero = <b /> // force the codec's copy path
    const encoded = encodeRscData(value) as Record<string, unknown>
    expect(Object.getPrototypeOf(encoded)).toBe(Object.prototype)
    expect((encoded as { polluted?: boolean }).polluted).toBeUndefined()
    expect(Object.getOwnPropertyDescriptor(encoded, '__proto__')?.value).toEqual({ polluted: true })
    const decoded = decodeRscData(JSON.parse(JSON.stringify(encoded))) as Record<string, unknown>
    expect(Object.getPrototypeOf(decoded)).toBe(Object.prototype)
    expect(React.isValidElement(decoded.hero)).toBe(true)
    expect(Object.getOwnPropertyDescriptor(decoded, '__proto__')?.value).toEqual({ polluted: true })
  })

  it('drops props explicitly set to undefined at encode — JSON cannot carry them', () => {
    const encoded = encodeRscData(<div id="x" title={undefined} />) as Record<string, { p?: Record<string, unknown> }>
    expect(encoded[RSC_MARKER_KEY]!.p).toEqual({ id: 'x' })
  })
})

describe('rsc normalize', () => {
  const opts = { depth: 0, label: 'test point' }

  it('unfolds plain and async function components with children', async () => {
    const Price = async ({ cents }: { cents: number }) => <span>{cents}</span>
    const Card = ({ children }: { children?: React.ReactNode }) => <div id="card">{children}</div>
    const out = (await normalizeRscOutput(
      <Card>
        <Price cents={42} />
      </Card>,
      opts,
    )) as React.ReactElement
    expect(out.type).toBe('div')
    const child = (out.props as { children: React.ReactElement }).children
    expect(child.type).toBe('span')
    expect((child.props as { children: number }).children).toBe(42)
  })

  it('keeps the unfolded element key via a fragment wrapper', async () => {
    const Row = ({ x }: { x: string }) => <li>{x}</li>
    const out = (await normalizeRscOutput({ items: [<Row key="k1" x="a" />] }, { ...opts, depth: 1 })) as {
      items: React.ReactElement[]
    }
    expect(out.items[0]!.type).toBe(React.Fragment)
    expect(out.items[0]!.key).toBe('k1')
  })

  it('unfolding a whole-output component that renders null yields an empty fragment', async () => {
    const Nothing = () => null
    const out = (await normalizeRscOutput(<Nothing />, opts)) as React.ReactElement
    expect(React.isValidElement(out)).toBe(true)
    expect(out.type).toBe(React.Fragment)
  })

  it('enforces depth: objects consume a level, arrays do not', async () => {
    await expect(normalizeRscOutput({ hero: <b /> }, opts)).rejects.toThrow(/rsc depth/)
    expect(await normalizeRscOutput({ hero: <b /> }, { ...opts, depth: 1 })).toBeTruthy()
    expect(await normalizeRscOutput({ items: [<b key="b" />] }, { ...opts, depth: 1 })).toBeTruthy()
    await expect(normalizeRscOutput({ deep: { hero: <b /> } }, { ...opts, depth: 1 })).rejects.toThrow(
      /\.rsc\(\{ depth: 2 \}\)/,
    )
  })

  it('rejects functions in host element props with the path', async () => {
    await expect(normalizeRscOutput(<button onClick={() => {}} />, opts)).rejects.toThrow(/onClick/)
  })

  it('rejects class components', async () => {
    class Legacy extends React.Component {
      override render() {
        return null
      }
    }
    await expect(normalizeRscOutput(<Legacy />, opts)).rejects.toThrow(/class component/)
  })

  it('rejects non-component point types with a hint', async () => {
    const root = Point0.lets('root', 'root').root()
    const page = root.lets('page', 'home', '/').page(() => <div />)
    await expect(normalizeRscOutput(<page.X />, opts)).rejects.toThrow(/component points/)
  })

  it('rejects <ClientOnly> in loader data — the loader never runs in the browser', async () => {
    await expect(normalizeRscOutput(<ClientOnly />, opts)).rejects.toThrow(/ClientOnly/)
  })

  it('unwraps React.memo — the inner component unfolds on the server', async () => {
    const Memoized = React.memo(() => <b>memo</b>)
    const out = (await normalizeRscOutput(<Memoized />, opts)) as React.ReactElement
    expect(out.type).toBe('b')
    expect((out.props as { children: string }).children).toBe('memo')
  })

  it('unfolds a forwardRef component server-side (its ref arg is dropped)', async () => {
    const Fwd = React.forwardRef<HTMLElement>((_props, _ref) => <i>fwd</i>)
    const out = (await normalizeRscOutput(<Fwd />, opts)) as React.ReactElement
    expect(out.type).toBe('i')
    expect((out.props as { children: string }).children).toBe('fwd')
  })

  it('keeps component points live as references and normalizes their props', async () => {
    const root = Point0.lets('root', 'root').root()
    const Cta = root.lets<{ slot?: React.ReactNode }>('component', 'cta').component(() => <div />)
    const Inner = () => <b>inner</b>
    const out = (await normalizeRscOutput(<Cta slot={<Inner />} />, opts)) as React.ReactElement
    expect(out.type).toBe(Cta)
    const slot = (out.props as { slot: React.ReactElement }).slot
    expect(slot.type).toBe('b') // nested element in props unfolded like data
    const encoded = encodeRscData(out) as Record<string, { t: { c: string } }>
    expect(encoded[RSC_MARKER_KEY]!.t).toEqual({ c: 'cta' })
  })

  it('an island nested inside an unfolded server component survives as a live reference', async () => {
    // The nesting is irrelevant to the client: a server component unfolds to markup, the island
    // inside stays a `{ c: name }` reference — so it hydrates like any top-level island (the SSR
    // hydration limitation is about `defer` holes, not about nesting).
    const root = Point0.lets('root', 'root').root()
    const Cta = root.lets('component', 'cta').component(() => <button>go</button>)
    const ServerWrap = async () => (
      <div id="wrap">
        <b>server</b>
        <Cta />
      </div>
    )
    const out = (await normalizeRscOutput(<ServerWrap />, opts)) as React.ReactElement
    // the server component unfolded to its <div>; the island inside is still a live component point
    expect(out.type).toBe('div')
    const children = (out.props as { children: React.ReactElement[] }).children
    expect(children.some((child) => child.type === Cta)).toBe(true)
    // …and it encodes as a component-point reference, next to the plain host markup
    const encoded = encodeRscData(out) as { __p0e: { p: { children: Array<{ __p0e: { t: unknown } }> } } }
    expect(encoded.__p0e.p.children.map((child) => child.__p0e.t)).toContainEqual({ c: 'cta' })
  })

  it('rejects a ref on a host element — refs cannot travel over the wire', async () => {
    await expect(normalizeRscOutput(<div ref={React.createRef<HTMLDivElement>()} />, opts)).rejects.toThrow(
      /refs cannot travel/,
    )
  })

  it('rejects React.lazy and other exotic elements as unsupported', async () => {
    const Lazy = React.lazy(async () => ({ default: () => null }))
    await expect(normalizeRscOutput(<Lazy />, opts)).rejects.toThrow(/not supported/)
  })

  it('rejects a function NESTED in a kept element prop, naming the path — not just a direct prop', async () => {
    await expect(normalizeRscOutput(<div data-cfg={{ format: () => 'x' }} />, opts)).rejects.toThrow(
      /functions cannot travel/,
    )
    const root = Point0.lets('root', 'nested-fn').root()
    const Chart = root.lets<{ options?: unknown }>('component', 'chart').component(() => <div />)
    await expect(normalizeRscOutput(<Chart options={{ rows: [{ render: () => null }] }} />, opts)).rejects.toThrow(
      /rows/,
    )
  })

  it('a render prop handed to an UNFOLDED server component stays legal — it is consumed server-side', async () => {
    const List = ({ render }: { render: (x: string) => React.ReactNode }) => <ul>{render('a')}</ul>
    const out = (await normalizeRscOutput(<List render={(x) => <li>{x}</li>} />, opts)) as React.ReactElement
    expect(out.type).toBe('ul')
    expect(((out.props as { children: React.ReactElement }).children as React.ReactElement).type).toBe('li')
  })

  it('rejects elements hiding inside a Map or Set with a clear error; element-free ones pass through untouched', async () => {
    await expect(normalizeRscOutput({ m: new Map([['k', <b />]]) }, { ...opts, depth: 1 })).rejects.toThrow(/Map/)
    await expect(normalizeRscOutput({ s: new Set([<b />]) }, { ...opts, depth: 1 })).rejects.toThrow(/Set/)
    const plainMap = new Map([['k', 1]])
    const out = (await normalizeRscOutput({ hero: <b />, m: plainMap }, { ...opts, depth: 1 })) as { m: unknown }
    expect(out.m).toBe(plainMap)
  })

  it('.rsc() merges per key down the chain — root sets the app default, the point adds its own keys', () => {
    const root = Point0.lets('root', 'rsc-merge').rsc({ holeTimeoutMs: 120_000 }).root()
    const q = root
      .lets('query', 'q')
      .rsc({ depth: 1 })
      .loader(async () => ({}))
      .query()
    expect(q.point._rsc).toEqual({ holeTimeoutMs: 120_000, depth: 1 })
    // a later call overrides only the keys it names
    const deeper = root
      .lets('query', 'q2')
      .rsc({ depth: 1 })
      .rsc({ depth: 2 })
      .loader(async () => ({}))
      .query()
    expect(deeper.point._rsc).toEqual({ holeTimeoutMs: 120_000, depth: 2 })
  })

  it('a circular loader output scans without stack overflow — legal under cycle-supporting transformers', async () => {
    const circular: Record<string, unknown> = { n: 1 }
    circular.self = circular
    circular.list = [circular]
    expect(rscDataHasElements(circular)).toBe(false)
    expect(await normalizeRscOutput(circular, opts)).toBe(circular) // element-free → the fast path bails untouched
  })
})

describe('rsc registry', () => {
  it('resolves through a loader and drains pending imports', async () => {
    const registry = new RscComponentsRegistry()
    const Real = () => <div id="real" />
    const Resolved = registry.resolve('thing', async () => Real)
    await registry.drainPending()
    // after the drain the wrapper renders the real component synchronously
    expect((Resolved as (props: object) => React.ReactElement)({}).type).toBe(Real)
    // resolving the same name again reuses the cached wrapper — the loader does not run twice
    expect(
      registry.resolve('thing', async () => {
        throw new Error('must not load again')
      }),
    ).toBe(Resolved)
  })

  it('a decoded reference re-encodes to the same reference (server cache → SSR embed roundtrip)', async () => {
    // the server decodes payloads it fetched from itself during SSR prefetch and then encodes its
    // query cache into the SSR embed — a decoded reference wrapper must serialize back to { c: name }
    const registry = new RscComponentsRegistry()
    const Ref = registry.resolve('againCta', async () => () => null)
    const element = React.createElement(Ref, { label: 'x' })
    const encoded = encodeRscData(element) as Record<string, { t: unknown }>
    expect(encoded[RSC_MARKER_KEY]!.t).toEqual({ c: 'againCta' })
    // normalize keeps it as a reference too (server code composing fetched elements into its own output)
    const normalized = (await normalizeRscOutput(element, { depth: 0, label: 'test point' })) as React.ReactElement
    expect(normalized.type).toBe(Ref)
  })

  it('suspends React-style while the chunk is loading', async () => {
    const registry = new RscComponentsRegistry()
    let release!: (component: React.ComponentType) => void
    const Resolved = registry.resolve('slow', () => new Promise((resolve) => (release = resolve)))
    // before the chunk lands the wrapper throws its thenable (React suspense contract)
    expect(() => (Resolved as (props: object) => React.ReactNode)({})).toThrow()
    release(() => null)
    await registry.drainPending()
    expect(() => (Resolved as (props: object) => React.ReactNode)({})).not.toThrow()
  })

  it('a failed chunk import is observed (no unhandled rejection) and evicted — the next resolve retries', async () => {
    const registry = new RscComponentsRegistry()
    let rejectLoad!: (error: Error) => void
    const failing = registry.resolve('flaky', () => new Promise((_resolve, reject) => (rejectLoad = reject)))
    rejectLoad(new Error('chunk 404'))
    await registry.drainPending() // settles despite the failure — the drain never rejects
    // the wrapper was evicted on failure, so resolving again starts a FRESH import instead of replaying the failure
    const Real = () => <div id="real" />
    const recovered = registry.resolve('flaky', async () => Real)
    expect(recovered).not.toBe(failing)
    await registry.drainPending()
    expect((recovered as (props: object) => React.ReactElement)({}).type).toBe(Real)
  })
})

describe('rsc defer / holes', () => {
  it('registers a hole and stands a Suspense boundary in its place — the subtree is NOT awaited', async () => {
    const holes = new RscHoleRegistry()
    let release!: () => void
    const gate = new Promise<void>((resolve) => (release = resolve))
    const Slow = async () => {
      await gate
      return <b>slow</b>
    }
    const out = (await normalizeRscOutput(
      { hero: defer(<Slow />, <span>loading</span>) },
      { depth: 1, label: 'p', holes },
    )) as { hero: React.ReactElement }
    // resolves immediately: the slow subtree is deferred, not awaited
    expect(out.hero.type).toBe(React.Suspense)
    expect((out.hero.props as { fallback: React.ReactElement }).fallback.type).toBe('span')
    const [entry] = [...holes.entries.values()]
    expect(entry!.settled).toBe(false)
    expect(holes.takeResolved()).toHaveLength(0)
    // the Suspense child encodes to a hole node { t: 2, id }
    const encoded = encodeRscData(out) as {
      hero: { __p0e: { t: number; p: { children: { __p0e: { t: number; id: string } } } } }
    }
    expect(encoded.hero.__p0e.t).toBe(1)
    expect(encoded.hero.__p0e.p.children.__p0e.t).toBe(2)
    expect(encoded.hero.__p0e.p.children.__p0e.id).toBe(entry!.id)
    // once the subtree resolves it drains as a resolved hole carrying the normalized node
    release()
    await entry!.throwable
    expect(entry!.settled).toBe(true)
    const resolved = holes.takeResolved()
    expect(resolved).toHaveLength(1)
    expect((resolved[0]!.result as { node: React.ReactElement }).node.type).toBe('b')
    // takeResolved marks delivered — a second drain is empty
    expect(holes.takeResolved()).toHaveLength(0)
  })

  it('a hole node decodes to a slot that suspends until filled, then renders the fill (either order)', () => {
    // fill AFTER decode
    const afterDecode = decodeRscData({ x: { [RSC_MARKER_KEY]: { t: 2, id: 'hAfter' } } }) as { x: React.ReactElement }
    const SlotAfter = afterDecode.x.type as (props: object) => React.ReactNode
    expect(() => SlotAfter({})).toThrow() // pending → throws its thenable
    rscHolesRegistry.fill('hAfter', { node: <b>filled</b> })
    expect((SlotAfter({}) as React.ReactElement).type).toBe('b')

    // fill BEFORE decode (the buffered-push order)
    rscHolesRegistry.fill('hBefore', { node: <i>early</i> })
    const beforeDecode = decodeRscData({ x: { [RSC_MARKER_KEY]: { t: 2, id: 'hBefore' } } }) as {
      x: React.ReactElement
    }
    const SlotBefore = beforeDecode.x.type as (props: object) => React.ReactNode
    expect((SlotBefore({}) as React.ReactElement).type).toBe('i')
  })

  it('a hole filled with an error re-throws it at render (nearest boundary)', () => {
    const decoded = decodeRscData({ y: { [RSC_MARKER_KEY]: { t: 2, id: 'hErr' } } }) as { y: React.ReactElement }
    const Slot = decoded.y.type as (props: object) => React.ReactNode
    rscHolesRegistry.fill('hErr', { error: new Error('boom') })
    expect(() => Slot({})).toThrow('boom')
  })

  it('a function error fallback (defer 3rd arg) runs with the failed subtree error and lands on the entry', async () => {
    const holes = new RscHoleRegistry()
    const Boom = async () => {
      throw new Error('unit-boom')
    }
    await normalizeRscOutput(
      { hero: defer(<Boom />, <span>loading</span>, (error) => <b>{`msg: ${error.message}`}</b>) },
      { depth: 1, label: 'p', holes },
    )
    const [entry] = [...holes.entries.values()]
    await entry!.throwable
    expect(entry!.settled).toBe(true)
    expect(entry!.result && 'error' in entry!.result).toBe(true)
    // the function ran with the real (coerced) error; its normalized markup is stored for the slot AND the push payload
    const fb = entry!.errorFallback as React.ReactElement
    expect(fb.type).toBe('b')
    expect((fb.props as { children: string }).children).toContain('unit-boom') // the failure text reached the fallback
  })

  it('a server component throwing a TYPED point0 error preserves it whole (code kept), not the RSC hint wrapper', async () => {
    const holes = new RscHoleRegistry()
    const Boom = async (): Promise<React.ReactNode> => {
      throw new ErrorPoint0('not found', { code: 'POINT0_NOT_FOUND', status: 404 })
    }
    let seen: ErrorPoint0 | undefined
    await normalizeRscOutput(
      {
        hero: defer(<Boom />, undefined, (error) => {
          seen = error
          return <b>{error.code}</b>
        }),
      },
      { depth: 1, label: 'p', holes },
    )
    const [entry] = [...holes.entries.values()]
    await entry!.throwable
    // the typed throw reached the registry untouched — no "server component threw" wrapper flattening its fields
    const failed = entry!.result as { error: ErrorPoint0 }
    expect(failed.error.code).toBe('POINT0_NOT_FOUND')
    expect(failed.error.message).toBe('not found')
    // …and the fallback got it projected, code intact — so `(error) => …` can branch on the REAL failure
    expect(seen?.code).toBe('POINT0_NOT_FOUND')
  })

  it('an error fallback that itself throws is dropped, leaving the original error to bubble', async () => {
    const holes = new RscHoleRegistry()
    const Boom = async () => {
      throw new Error('orig-boom')
    }
    const badFallback = (): React.ReactNode => {
      throw new Error('fallback-boom')
    }
    await normalizeRscOutput({ hero: defer(<Boom />, undefined, badFallback) }, { depth: 1, label: 'p', holes })
    const [entry] = [...holes.entries.values()]
    await entry!.throwable
    expect(entry!.errorFallback).toBeUndefined() // the broken fallback is dropped
    expect((entry!.result as { error: Error }).error.message).toContain('orig-boom') // the subtree error is kept to bubble
  })

  it('failIfPending fails only an unfilled hole; a filled one keeps its content', () => {
    const Pending = rscHolesRegistry.slotComponent('hPend') as (props: object) => React.ReactNode
    expect(() => Pending({})).toThrow() // pending → throws its thenable
    rscHolesRegistry.failIfPending('hPend', new Error('stream-ended'))
    expect(() => Pending({})).toThrow('stream-ended') // now throws the error to the nearest boundary
    // a hole that already arrived is untouched by a later failIfPending — a dropped stream never clobbers content
    rscHolesRegistry.fill('hFilled', { node: <b>kept</b> })
    rscHolesRegistry.failIfPending('hFilled', new Error('too-late'))
    const Filled = rscHolesRegistry.slotComponent('hFilled') as (props: object) => React.ReactNode
    expect((Filled({}) as React.ReactElement).type).toBe('b')
  })

  it('a NESTED hole orphaned by a mid-stream client-fetch drop is failed (coded), not left spinning forever', async () => {
    // readStreamedRscFetch must track the holes to fail-on-drop LIVE, not as a one-shot line-1 snapshot: a nested
    // defer() is decoded into a client slot only when its PARENT fill line lands, so a one-shot snapshot misses it and,
    // if the stream drops before its own fill arrives, it would suspend forever. This reproduces exactly that: line 1
    // introduces top-level hole A, A's fill (line 2) carries a NESTED hole B, then the stream closes before B's fill.
    const root = Point0.lets('root', 'nested-drop').root()
    const clientPoints = ClientPoints.createFromDefintion([root])
    const A = 'nd-parent'
    const B = 'nd-child'
    // The wire shape the client parses: a hole node is `{ __p0e: { t: 2, id } }`.
    const line1 = JSON.stringify({ hero: { [RSC_MARKER_KEY]: { t: 2, id: A } } })
    const line2 = JSON.stringify({ id: A, data: { [RSC_MARKER_KEY]: { t: 2, id: B } } })
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        const enc = new TextEncoder()
        controller.enqueue(enc.encode(line1 + '\n'))
        controller.enqueue(enc.encode(line2 + '\n'))
        controller.close() // DROP — B's own fill never arrives
      },
    })
    const transformer = {
      parse: (s: string) => decodeRscData(JSON.parse(s)),
      stringify: (v: unknown) => JSON.stringify(v),
      serialize: (v: unknown) => v,
      deserialize: (v: unknown) => v,
    } as unknown as Parameters<typeof readStreamedRscFetch>[0]

    await superstore.runWithServerStorageState(
      {
        __POINT0_FAKE_CLIENT__: {
          id: 't',
          scope: 'root',
          runtime: 'browser',
          fetch: (async () => new Response()) as never,
          points: clientPoints as never,
        },
      },
      async () => {
        const { data, done } = await readStreamedRscFetch(transformer, body)
        await done
        // Walk the REAL decoded tree (consumed slots are evicted from the registry, so a by-id lookup would mint a
        // fresh empty slot): line 1 decoded A's slot into `data.hero`; A's fill delivered the nested B slot as its
        // node. B was pending and NOT in the line-1 snapshot — only the live tracking fails it with the coded error.
        const HoleA = (data as { hero: React.ReactElement }).hero.type as (props: object) => React.ReactNode
        const filledA = HoleA({}) as React.ReactElement
        const SlotB = filledA.type as (props: object) => React.ReactNode
        let thrown: unknown
        try {
          void SlotB({})
        } catch (error) {
          thrown = error
        }
        expect(thrown).toBeInstanceOf(ErrorPoint0)
        expect((thrown as ErrorPoint0).code).toBe(POINT0_ERROR_CODES_MAP.RSC_STREAM_INCOMPLETE)
        // the parent A was delivered (its fill applied) — a delivered hole is never clobbered by the drop failsafe
        expect(rscHolesRegistry.pendingIds().has(A)).toBe(false)
      },
    )
  })

  it('applyPushedRscFill swallows a malformed line and drains island chunks BEFORE filling', async () => {
    const root = Point0.lets('root', 'fill-robust').root()
    const clientPoints = ClientPoints.createFromDefintion([root])
    let releaseChunk!: (component: React.ComponentType) => void
    const chunkImport = new Promise<React.ComponentType>((resolve) => (releaseChunk = resolve))
    // a lazy aggregator record, like the generated client aggregator lists component points
    ;(clientPoints as unknown as { manager: { collection: unknown[] } }).manager.collection.push({
      type: 'component',
      name: 'fillRobustIsland',
      point: () => chunkImport,
    })
    const transformer = {
      parse: (s: string) => decodeRscData(JSON.parse(s)),
      stringify: (v: unknown) => JSON.stringify(v),
      serialize: (v: unknown) => v,
      deserialize: (v: unknown) => v,
    } as unknown as Parameters<typeof applyPushedRscFill>[0]
    await superstore.runWithServerStorageState(
      {
        __POINT0_FAKE_CLIENT__: {
          id: 't',
          scope: 'root',
          runtime: 'browser',
          fetch: (async () => new Response()) as never,
          points: clientPoints as never,
        },
      },
      async () => {
        // a malformed line resolves without throwing — a broken push must never take the app down
        await applyPushedRscFill(transformer, '{definitely not json')
        // the fill carries a lazy island reference: the slot must stay unfilled until the chunk import resolves, so a
        // pushed island never renders through a cold reference (no Suspense-fallback flash)
        const Slot = rscHolesRegistry.slotComponent('hFillDrain') as (props: object) => React.ReactNode
        const fillLine = JSON.stringify({
          id: 'hFillDrain',
          data: { [RSC_MARKER_KEY]: { t: { c: 'fillRobustIsland' } } },
        })
        const applied = applyPushedRscFill(transformer, fillLine)
        await new Promise((resolve) => setTimeout(resolve, 10))
        expect(() => Slot({})).toThrow() // still pending — the chunk is not warm yet
        releaseChunk(() => <div id="island" />)
        await applied
        const rendered = Slot({}) as React.ReactElement
        expect(React.isValidElement(rendered)).toBe(true) // filled, chunk warm
      },
    )
  })

  it('two concurrent streams: one dropping mid-stream fails only ITS holes', async () => {
    const root = Point0.lets('root', 'concurrent-streams').root()
    const clientPoints = ClientPoints.createFromDefintion([root])
    const A1 = 'cs-a1'
    const B1 = 'cs-b1'
    const enc = new TextEncoder()
    // stream A: introduces its hole, then DROPS — the fill never arrives
    const bodyA = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(enc.encode(JSON.stringify({ hero: { [RSC_MARKER_KEY]: { t: 2, id: A1 } } }) + '\n'))
        controller.close()
      },
    })
    // stream B: introduces its hole and delivers it cleanly
    const bodyB = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(enc.encode(JSON.stringify({ hero: { [RSC_MARKER_KEY]: { t: 2, id: B1 } } }) + '\n'))
        controller.enqueue(
          enc.encode(
            JSON.stringify({ id: B1, data: { [RSC_MARKER_KEY]: { t: 'b', p: { children: 'b-ok' } } } }) + '\n',
          ),
        )
        controller.close()
      },
    })
    const transformer = {
      parse: (s: string) => decodeRscData(JSON.parse(s)),
      stringify: (v: unknown) => JSON.stringify(v),
      serialize: (v: unknown) => v,
      deserialize: (v: unknown) => v,
    } as unknown as Parameters<typeof readStreamedRscFetch>[0]
    await superstore.runWithServerStorageState(
      {
        __POINT0_FAKE_CLIENT__: {
          id: 't',
          scope: 'root',
          runtime: 'browser',
          fetch: (async () => new Response()) as never,
          points: clientPoints as never,
        },
      },
      async () => {
        // line-1 reads run sequentially so each reader's pending-diff captures exactly its own hole
        const streamedA = await readStreamedRscFetch(transformer, bodyA)
        const streamedB = await readStreamedRscFetch(transformer, bodyB)
        await Promise.all([streamedA.done, streamedB.done])
        // A's hole failed with the coded drop error…
        const HoleA = (streamedA.data as { hero: React.ReactElement }).hero.type as (props: object) => React.ReactNode
        let thrownA: unknown
        try {
          void HoleA({})
        } catch (error) {
          thrownA = error
        }
        expect((thrownA as ErrorPoint0).code).toBe(POINT0_ERROR_CODES_MAP.RSC_STREAM_INCOMPLETE)
        // …while B's — fed through the SAME bundle-wide registry at the same time — delivered untouched
        const HoleB = (streamedB.data as { hero: React.ReactElement }).hero.type as (props: object) => React.ReactNode
        const renderedB = HoleB({}) as React.ReactElement
        expect(renderedB.type).toBe('b')
        expect((renderedB.props as { children: string }).children).toBe('b-ok')
      },
    )
  })

  it('a deferred subtree deeper than the rsc depth errors like an element', async () => {
    const holes = new RscHoleRegistry()
    await expect(normalizeRscOutput({ hero: defer(<b />) }, { depth: 0, label: 'p', holes })).rejects.toThrow(
      /rsc depth/,
    )
  })

  it('without a holes registry, defer degrades to awaiting the subtree inline', async () => {
    const Slow = async () => <b>inline</b>
    const out = (await normalizeRscOutput({ hero: defer(<Slow />, <span>l</span>) }, { depth: 1, label: 'p' })) as {
      hero: React.ReactElement
    }
    // no Suspense boundary — the subtree is inlined, the fallback dropped
    expect(out.hero.type).toBe('b')
  })

  it('a keyed defer() in a list carries the key onto the Suspense wrapper and over the wire', async () => {
    const holes = new RscHoleRegistry()
    const Slow = async () => <b>s</b>
    const out = (await normalizeRscOutput(
      { items: [defer(<Slow key="k1" />, <i>l</i>)] },
      { depth: 1, label: 'p', holes },
    )) as { items: React.ReactElement[] }
    expect(out.items[0]!.type).toBe(React.Suspense)
    expect(out.items[0]!.key).toBe('k1')
    const encoded = encodeRscData(out) as { items: Array<{ __p0e: { t: number; k?: string } }> }
    expect(encoded.items[0]!.__p0e.t).toBe(1)
    expect(encoded.items[0]!.__p0e.k).toBe('k1')
  })

  it('defer() as the whole output works at rsc depth 0', async () => {
    const holes = new RscHoleRegistry()
    const Slow = async () => <b>s</b>
    const out = (await normalizeRscOutput(defer(<Slow />, <i>l</i>), {
      depth: 0,
      label: 'p',
      holes,
    })) as React.ReactElement
    expect(out.type).toBe(React.Suspense)
    expect(holes.entries.size).toBe(1)
  })

  it('a hole that misses its deadline fails with RSC_HOLE_TIMEOUT; the late real result is dropped', async () => {
    const holes = new RscHoleRegistry()
    let release!: () => void
    const gate = new Promise<void>((resolve) => (release = resolve))
    const Hung = async () => {
      await gate
      return <b>late</b>
    }
    let seen: ErrorPoint0 | undefined
    await normalizeRscOutput(
      {
        hero: defer(<Hung />, <i>l</i>, (error) => {
          seen = error
          return <b>{error.code}</b>
        }),
      },
      // the deadline is the owner point's `.rsc({ holeTimeoutMs })`, threaded through the normalize options
      { depth: 1, label: 'p', holes, holeTimeoutMs: 20 },
    )
    const [entry] = [...holes.entries.values()]
    await entry!.throwable
    expect(entry!.settled).toBe(true)
    expect((entry!.result as { error: ErrorPoint0 }).error.code).toBe('POINT0_RSC_HOLE_TIMEOUT')
    // the per-hole error fallback covers the deadline like any other failure — it ran with the timeout error
    expect(seen?.code).toBe('POINT0_RSC_HOLE_TIMEOUT')
    expect(entry!.errorFallback).toBeDefined()
    // the real subtree settling AFTER the deadline is dropped unread — the timeout result stands
    release()
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect('error' in (entry!.result as object)).toBe(true)
  })

  it('holeTimeoutMs: false disables the deadline while a configured one fires', async () => {
    const never = (): Promise<unknown> => new Promise(() => {})
    const registry = new RscHoleRegistry()
    const unbounded = registry.register(never, undefined, { holeTimeoutMs: false, ErrorClass: ErrorPoint0 })
    const bounded = registry.register(never, undefined, { holeTimeoutMs: 15, ErrorClass: ErrorPoint0 })
    await new Promise((resolve) => setTimeout(resolve, 40))
    expect(bounded.settled).toBe(true)
    expect(unbounded.settled).toBe(false)
  })

  it('a consumed client hole (slot decoded + fill applied, either order) is evicted from the registry', () => {
    const slots = (rscHolesRegistry as unknown as { slots: Map<string, unknown> }).slots
    // decode → fill
    const DecodedFirst = rscHolesRegistry.slotComponent('hClean1') as (props: object) => React.ReactNode
    expect(slots.has('hClean1')).toBe(true)
    rscHolesRegistry.fill('hClean1', { node: <b>x</b> })
    expect(slots.has('hClean1')).toBe(false)
    // the component closes over the slot object — eviction never affects rendering
    expect((DecodedFirst({}) as React.ReactElement).type).toBe('b')
    // fill → decode (the buffered-push order)
    rscHolesRegistry.fill('hClean2', { node: <i>y</i> })
    expect(slots.has('hClean2')).toBe(true)
    const FilledFirst = rscHolesRegistry.slotComponent('hClean2') as (props: object) => React.ReactNode
    expect(slots.has('hClean2')).toBe(false)
    expect((FilledFirst({}) as React.ReactElement).type).toBe('i')
    // a late failIfPending on a consumed id is a no-op — nothing resurrects
    rscHolesRegistry.failIfPending('hClean1', new Error('late'))
    expect(slots.has('hClean1')).toBe(false)
    expect((DecodedFirst({}) as React.ReactElement).type).toBe('b')
  })

  it('blank NDJSON lines (server heartbeats) are skipped by the stream reader', async () => {
    const root = Point0.lets('root', 'heartbeat-skip').root()
    const clientPoints = ClientPoints.createFromDefintion([root])
    const H = 'hb-hole'
    const line1 = JSON.stringify({ hero: { [RSC_MARKER_KEY]: { t: 2, id: H } } })
    const fill = JSON.stringify({ id: H, data: { [RSC_MARKER_KEY]: { t: 'b', p: { children: 'beat' } } } })
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        const enc = new TextEncoder()
        controller.enqueue(enc.encode(line1 + '\n'))
        controller.enqueue(enc.encode('\n\n')) // heartbeats while the subtree was slow
        controller.enqueue(enc.encode(fill + '\n'))
        controller.enqueue(enc.encode('\n'))
        controller.close()
      },
    })
    const transformer = {
      parse: (s: string) => decodeRscData(JSON.parse(s)),
      stringify: (v: unknown) => JSON.stringify(v),
      serialize: (v: unknown) => v,
      deserialize: (v: unknown) => v,
    } as unknown as Parameters<typeof readStreamedRscFetch>[0]
    await superstore.runWithServerStorageState(
      {
        __POINT0_FAKE_CLIENT__: {
          id: 't',
          scope: 'root',
          runtime: 'browser',
          fetch: (async () => new Response()) as never,
          points: clientPoints as never,
        },
      },
      async () => {
        const { data, done } = await readStreamedRscFetch(transformer, body)
        await done
        const Hole = (data as { hero: React.ReactElement }).hero.type as (props: object) => React.ReactNode
        const rendered = Hole({}) as React.ReactElement
        expect(rendered.type).toBe('b') // the fill landed despite the blank lines around it
        expect((rendered.props as { children: string }).children).toBe('beat')
      },
    )
  })

  it('in production a failed subtree reaches the error fallback projected PUBLIC — meta stays server-side', async () => {
    const holes = new RscHoleRegistry()
    const Boom = async (): Promise<React.ReactNode> => {
      throw new ErrorPoint0('kaput', { code: 'POINT0_NOT_FOUND', meta: { secretDsn: 'postgres://u:p@host/db' } })
    }
    let seen: ErrorPoint0 | undefined
    const prevNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    try {
      await normalizeRscOutput(
        {
          hero: defer(<Boom />, undefined, (error) => {
            seen = error
            return <b>{error.code}</b>
          }),
        },
        { depth: 1, label: 'p', holes },
      )
      const [entry] = [...holes.entries.values()]
      await entry!.throwable // the fallback resolves inside the rejection handler, within the production window
    } finally {
      process.env.NODE_ENV = prevNodeEnv
    }
    expect(seen?.message).toBe('kaput')
    expect(seen?.code).toBe('POINT0_NOT_FOUND')
    expect(seen?.meta).toBeUndefined() // the private (dev) projection carries meta — the public one strips it
  })
})
