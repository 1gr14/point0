import { describe, expect, it } from 'bun:test'
import { Point0 } from '@point0/core'
import { createTestThings } from './utils/internal-testing.js'

// The fast (in-process) half of the SSR coverage — the browser e2e is in ssr.slow.test.tsx next door. Two describes:
// the render-to-HTML loop over `createTestThings`, and the per-point `.ssr()` / `.clientOnly()` switch semantics.

describe('ssr', () => {
  it.concurrent('page without loader', async () => {
    const root = Point0.lets('root', 'root').root()
    const page = root.lets('page', 'home', '/').page(() => <div id="page">x</div>)
    const { fetchSsr } = await createTestThings({ ssr: true, points: [root, page] })
    const result = await fetchSsr(page)
    expect(result.preview).toMatchInlineSnapshot(`
      "
      #page: x
      "
    `)
  })

  it.concurrent('page with loader', async () => {
    const root = Point0.lets('root', 'root').root()
    const page = root
      .lets('page', 'home', '/')
      .loader(() => ({ x: 1 }))
      .page(({ data }) => <div id="page">x={data.x}</div>)
    const { fetchSsr } = await createTestThings({ ssr: true, points: [root, page] })
    const result = await fetchSsr(page)
    expect(result.queryClientQueriesPreview).toMatchInlineSnapshot(`
      "point0|root|page|home|server|finite||data|{}
      {"x":1}
      "
    `)
    expect(result.preview).toMatchInlineSnapshot(`
      "
      #page: x=1
      "
    `)
  })

  it.concurrent('page with loader and component with loader', async () => {
    const root = Point0.lets('root', 'root').root()
    const component = root
      .lets('component', 'component')
      .loader(() => ({ y: 2 }))
      .component(({ data }) => <div id="component">y={data.y}</div>)
    const page = root
      .lets('page', 'home', '/')
      .loader(() => ({ x: 1 }))
      .page(({ data }) => (
        <div id="page">
          <div id="page-content">x={data.x}</div>
          <component.X />
        </div>
      ))
    const { fetchSsr, fetchesTale } = await createTestThings({ ssr: true, points: [root, page, component] })
    const result = await fetchSsr(page)
    expect(result.queryClientQueriesPreview).toMatchInlineSnapshot(`
      "point0|root|page|home|server|finite||data|{}
      {"x":1}
      point0|root|component|component|server|finite||data|{}
      {"y":2}
      "
    `)
    expect(result.preview).toMatchInlineSnapshot(`
      "
      #page:
        #page-content: x=1
        #component: y=2
      "
    `)
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      page.home (client) (page) < {}
      page.home (server) < {}
      component.component (server) < {}
      "
    `)
  })

  it.concurrent('page with loader and component with client loader', async () => {
    const root = Point0.lets('root', 'root').root()
    const component = root
      .lets('component', 'component')
      .clientLoader(() => ({ y: 2 }))
      .component(({ data }) => <div id="component">y={data.y}</div>)
    const page = root
      .lets('page', 'home', '/')
      .loader(() => ({ x: 1 }))
      .page(({ data }) => (
        <div id="page">
          <div id="page-content">x={data.x}</div>
          <component.X />
        </div>
      ))
    const { fetchSsr, fetchesTale } = await createTestThings({ ssr: true, points: [root, page, component] })
    const result = await fetchSsr(page)
    expect(result.queryClientQueriesPreview).toMatchInlineSnapshot(`
      "point0|root|page|home|server|finite||data|{}
      {"x":1}
      "
    `)
    expect(result.preview).toMatchInlineSnapshot(`
      "
      #page:
        #page-content: x=1
        text: Loading...
      "
    `)
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      page.home (client) (page) < {}
      page.home (server) < {}
      "
    `)
  })

  it.concurrent('page with loader and nested component with loader', async () => {
    const root = Point0.lets('root', 'root').root()
    const component = root
      .lets('component', 'component')
      .loader(() => ({ z: 3 }))
      .component(({ data }) => <div id="component">z={data.z}</div>)
    const page = root
      .lets('page', 'home', '/')
      .loader(() => ({ x: 1 }))
      .page(({ data }) => (
        <div id="page">
          <div id="page-content">x={data.x}</div>
          <component.X />
        </div>
      ))
    const { fetchSsr, fetchesTale } = await createTestThings({ ssr: true, points: [root, page, component] })
    const result = await fetchSsr(page)
    expect(result.queryClientQueriesPreview).toMatchInlineSnapshot(`
      "point0|root|page|home|server|finite||data|{}
      {"x":1}
      point0|root|component|component|server|finite||data|{}
      {"z":3}
      "
    `)
    expect(result.preview).toMatchInlineSnapshot(`
      "
      #page:
        #page-content: x=1
        #component: z=3
      "
    `)
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      page.home (client) (page) < {}
      page.home (server) < {}
      component.component (server) < {}
      "
    `)
  })
})

// Two orthogonal axes, split apart:
//   • `_ssr` (`.ssr(false | options)`) — SSR can only be turned OFF per point (never on) and the render loop tuned.
//     Merged, and inherited down the chain from the root (the scope default). `_getSsrEnabled()` reports the effective
//     enabled (`_ssr.enabled` if set, else the ambient side default).
//   • `_clientOnly` (`.clientOnly()`) — the render tail is wrapped in `<ClientOnly>` (browser-only render). It is about
//     WHERE the render runs, not whether the point does SSR, so it never touches `_ssr` / `_getSsrEnabled()`.
describe('per-point .ssr() (off-only) and the .clientOnly() split', () => {
  const root = () => Point0.lets('root', 'root').root()
  // The ambient side default, read fresh where it's needed (NOT captured here): the sibling `ssr` describe boots
  // `createTestThings({ ssr: true })`, which sets the process-global SSR default, so a snapshot taken at describe-eval
  // time would go stale before a concurrent test reads it.
  const readAmbient = () =>
    root()
      .lets('page', 'ambient', '/ambient')
      .page(() => null)
      .point._getSsrEnabled()

  it('.ssr(false) turns SSR off for the point', () => {
    const off = root()
      .lets('page', 'off', '/off')
      .ssr(false)
      .page(() => null).point
    expect(off._getSsrEnabled()).toBe(false)
    expect(off._ssr?.enabled).toBe(false)
    expect(off._clientOnly).toBe(false)
  })

  it('.clientOnly() is orthogonal — its own flag, never touches SSR', () => {
    const co = root()
      .lets('page', 'co', '/co')
      .clientOnly()
      .page(() => null).point
    expect(co._clientOnly).toBe(true)
    expect(co._ssr).toBeUndefined()
    expect(co._getSsrEnabled()).toBe(readAmbient()) // unchanged from a plain page, under the same current default
  })

  it('.ssr(options) carries the render-loop knobs and merges with a later .ssr(false)', () => {
    const p = root()
      .lets('page', 'opts', '/opts')
      .ssr({ allowedDiscoveryRenders: 2 })
      .ssr(false)
      .page(() => null).point
    expect(p._ssr?.allowedDiscoveryRenders).toBe(2)
    expect(p._ssr?.enabled).toBe(false)
    expect(p._getSsrEnabled()).toBe(false)
  })

  it('a page inherits its root .ssr(false) as the scope default', () => {
    const rootOff = Point0.lets('root', 'root').ssr(false).root()
    const inherited = rootOff.lets('page', 'p', '/p').page(() => null).point
    expect(inherited._getSsrEnabled()).toBe(false)
  })

  it('a page inherits a .ssr(false) from an intermediate base (root → base → page)', () => {
    // The opt-out sits on the base, not the root and not the page — the page still resolves to off.
    const base = root().lets('base', 'offbase').ssr(false).base()
    const page = base.lets('page', 'deep', '/deep').page(() => null).point
    expect(page._getSsrEnabled()).toBe(false)
    expect(page._ssr?.enabled).toBe(false)
  })

  it('refuses a client-only plugin on a non-client-only consumer', () => {
    // A plugin cannot be traced statically by the compiler, so a client-only plugin must land on an already
    // client-only consumer — otherwise the runtime and the server build would disagree.
    const clientOnlyPlugin = (Point0.lets('plugin', 'coplugin') as any).clientOnly().plugin()
    const consumer = root().lets('page', 'u', '/u')
    expect(() => (consumer as any).use(clientOnlyPlugin)).toThrow(/client-only/)
  })

  it('throws when a dehydrated-state prefetch policy is set after SSR was turned off', () => {
    // Declaring `pageDehydratedState` on a point whose SSR is already off is a contradiction — there is no dehydrated
    // state to prefetch. (The reverse order — policy first, then `.ssr(false)` — silently downgrades instead.)
    expect(() => root().lets('page', 'bad', '/bad').ssr(false).prefetchPagePolicy('pageDehydratedState')).toThrow(
      /needs SSR/,
    )
  })

  it('silently downgrades a dehydrated-state prefetch policy when SSR is turned off AFTER it', () => {
    // The reverse order of the throw above: policy first (valid while SSR is on), then `.ssr(false)`. There is no
    // dehydrated state without SSR, so the policy is quietly downgraded to its SSR-free equivalent instead of throwing —
    // pageDehydratedState -> serverQuery, pageDehydratedStateAndClientQuery -> serverAndClientQuery — on both the
    // link-hover and navigate policy slots (prefetchPagePolicy sets both). Force the SSR default on so the policy is
    // accepted at set time (this file's ambient default is off).
    const prev = process.env.POINT0_SSR_ENABLED_DEFAULT
    process.env.POINT0_SSR_ENABLED_DEFAULT = 'true'
    try {
      const one = root().lets('page', 'dg1', '/dg1').prefetchPagePolicy('pageDehydratedState').ssr(false)
      expect((one as any)._polhPolicy).toBe('serverQuery')
      expect((one as any)._ponPolicy).toBe('serverQuery')

      const two = root().lets('page', 'dg2', '/dg2').prefetchPagePolicy('pageDehydratedStateAndClientQuery').ssr(false)
      expect((two as any)._polhPolicy).toBe('serverAndClientQuery')
      expect((two as any)._ponPolicy).toBe('serverAndClientQuery')
    } finally {
      if (prev === undefined) {
        delete process.env.POINT0_SSR_ENABLED_DEFAULT
      } else {
        process.env.POINT0_SSR_ENABLED_DEFAULT = prev
      }
    }
  })
})
