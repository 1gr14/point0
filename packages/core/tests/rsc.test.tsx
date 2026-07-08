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
import { readStreamedRscFetch } from '../src/query-client.js'
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
    await expect(normalizeRscOutput({ hero: <b /> }, opts)).rejects.toThrow(/rscDepth/)
    expect(await normalizeRscOutput({ hero: <b /> }, { ...opts, depth: 1 })).toBeTruthy()
    expect(await normalizeRscOutput({ items: [<b key="b" />] }, { ...opts, depth: 1 })).toBeTruthy()
    await expect(normalizeRscOutput({ deep: { hero: <b /> } }, { ...opts, depth: 1 })).rejects.toThrow(/rscDepth\(2\)/)
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
        const { done } = await readStreamedRscFetch(transformer, body)
        await done
        // B was pending and NOT in the line-1 snapshot — only the live tracking fails it with the coded error.
        const SlotB = rscHolesRegistry.slotComponent(B) as (props: object) => React.ReactNode
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

  it('a deferred subtree deeper than rscDepth errors like an element', async () => {
    const holes = new RscHoleRegistry()
    await expect(normalizeRscOutput({ hero: defer(<b />) }, { depth: 0, label: 'p', holes })).rejects.toThrow(
      /rscDepth/,
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
})
