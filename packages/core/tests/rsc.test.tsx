import { describe, expect, it } from 'bun:test'
import * as React from 'react'
import {
  RSC_MARKER_KEY,
  RscComponentsRegistry,
  decodeRscData,
  encodeRscData,
  normalizeRscOutput,
  rscDataHasElements,
} from '../src/rsc.js'
import { Point0 } from '../src/point0.js'

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

  it('keeps component points live as references and normalizes their props', async () => {
    const root = Point0.lets('root', 'root').root()
    const Cta = root.lets('component', 'cta').component(() => <div />)
    const Inner = () => <b>inner</b>
    const out = (await normalizeRscOutput(
      React.createElement(Cta.X as React.ComponentType<any>, { slot: <Inner /> }),
      opts,
    )) as React.ReactElement
    expect(out.type).toBe(Cta)
    const slot = (out.props as { slot: React.ReactElement }).slot
    expect(slot.type).toBe('b') // nested element in props unfolded like data
    const encoded = encodeRscData(out) as Record<string, { t: { c: string } }>
    expect(encoded[RSC_MARKER_KEY]!.t).toEqual({ c: 'cta' })
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
