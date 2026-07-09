import { describe, expect, it } from 'bun:test'
import { ClientOnly, defer, Point0, POINT0_STREAM_HEADER } from '@point0/core'
import * as React from 'react'
import superjson from 'superjson'
import { createTestThings } from './utils/internal-testing.js'

describe('rsc', () => {
  const createRoot = () =>
    Point0.lets('root', 'root')
      .loading(() => <div id="loading">...</div>)
      .error(({ error }) => <div id="error">{error.message}</div>)
      .queryOptions({
        retry: false,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchInterval: false,
        refetchIntervalInBackground: false,
      })
      .root()

  it('element as the whole loader output', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/')
      .loader(async () => <div id="page-inner">x=1</div>)
      .page(({ data }) => <div id="page-outer">{data}</div>)

    const { render, fetchPreview, fetchesTale } = await createTestThings({ ssr: true, points: [root, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page-outer')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /
          #loading: ...

          #page-outer:
            #page-inner: x=1
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      page.home (client) < {}
      "
    `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #page-outer:
        #page-inner: x=1
      "
    `)
  })

  it('elements in first-level fields with .rsc({ depth: 1 }), arrays transparent', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/')
      .rsc({ depth: 1 })
      .loader(async () => ({
        n: 1,
        hero: <b id="hero">H!</b>,
        items: [
          <i id="i0" key="i0">
            a
          </i>,
          <i id="i1" key="i1">
            b
          </i>,
        ],
      }))
      .page(({ data }) => (
        <div id="page">
          <span id="n">n={data.n}</span>
          {data.hero}
          {data.items}
        </div>
      ))

    const { render, fetchPreview } = await createTestThings({ ssr: true, points: [root, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /
          #loading: ...

          #page:
            #n: n=1
            #hero: H!
            #i0: a
            #i1: b
        "
      `)
    })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #page:
        #n: n=1
        #hero: H!
        #i0: a
        #i1: b
      "
    `)
  })

  it('inherits .rsc({ depth: 1 }) from the root — a page that declares none still ships first-level elements', async () => {
    // docs/core/rsc.md: "one .rsc({ depth: 1 }) on the root — every point inherits it, no loader declares it again". The page
    // below sets no rsc depth of its own; were the inherited value to regress to depth 0, its first-level `hero` element
    // would fail the loader instead of rendering. (This is the documented default setup and every other example assumes
    // it — the direct-on-page cases above never exercise the inheritance.)
    const root = Point0.lets('root', 'root')
      .loading(() => <div id="loading">...</div>)
      .error(({ error }) => <div id="error">{error.message}</div>)
      .queryOptions({ retry: false, refetchOnMount: false, refetchOnWindowFocus: false, refetchOnReconnect: false })
      .rsc({ depth: 1 })
      .root()
    const page = root
      .lets('page', 'home', '/')
      .loader(async () => ({ hero: <b id="hero">H!</b> }))
      .page(({ data }) => <div id="page">{data.hero}</div>)

    const { fetchPreview } = await createTestThings({ ssr: true, points: [root, page] })
    const preview = await fetchPreview(page)
    expect(preview).toContain('#hero: H!')
    expect(preview).not.toContain('#error')
  })

  it('element deeper than the rsc depth fails the loader with a hint', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/')
      .loader(async () => ({ hero: <b id="hero">H!</b> }))
      .page(({ data }) => <div id="page">{data.hero}</div>)

    const { render } = await createTestThings({ ssr: true, points: [root, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#error')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /
          #loading: ...

          #error: RSC (at hero): root:page:home returned a React element deeper than its rsc depth allows. Raise it with .rsc({ depth: 1 }) on the point (0 allows an element as the whole output, 1 allows elements in first-level fields, …).
        "
      `)
    })
  })

  it('plain function components unfold on the server (server components)', async () => {
    const Price = async ({ cents }: { cents: number }) => {
      await new Promise((resolve) => setTimeout(resolve, 1))
      return <span id="price">{(cents / 100).toFixed(2)}</span>
    }
    const Card = ({ title, children }: { title: string; children?: React.ReactNode }) => (
      <div id="card">
        <h3 id="title">{title}</h3>
        {children}
      </div>
    )
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/')
      .loader(async () => (
        <Card title="Pro">
          <Price cents={4200} />
        </Card>
      ))
      .page(({ data }) => <div id="page">{data}</div>)

    const { render, fetchPreview } = await createTestThings({ ssr: true, points: [root, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#card')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /
          #loading: ...

          #page:
            #card:
              #title: Pro
              #price: 42.00
        "
      `)
    })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #page:
        #card:
          #title: Pro
          #price: 42.00
      "
    `)
  })

  it('functions in element props are rejected', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/')
      .loader(async () => <button id="btn" onClick={() => {}} />)
      .page(({ data }) => <div id="page">{data}</div>)

    const { render } = await createTestThings({ ssr: true, points: [root, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#error')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /
          #loading: ...

          #error: RSC (at onClick): functions cannot travel over the wire (prop "onClick" of &lt;button&gt;). Event handlers and render props belong inside a component point.
        "
      `)
    })
  })

  it('ClientOnly inside loader data is rejected with a hint', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/')
      .loader(async () => (
        <ClientOnly>
          <div id="never" />
        </ClientOnly>
      ))
      .page(({ data }) => <div id="page">{data}</div>)

    const { render } = await createTestThings({ ssr: true, points: [root, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#error')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /
          #loading: ...

          #error: RSC: &lt;ClientOnly&gt; has no meaning inside loader data — the loader never runs in the browser. Make the child a component point and set .clientOnly() on it instead.
        "
      `)
    })
  })

  it('component point reference resolves from the points collection', async () => {
    const root = createRoot()
    const Cta = root.lets('component', 'rscCtaStatic').component(() => <div id="cta">go!</div>)
    const page = root
      .lets('page', 'home', '/')
      .rsc({ depth: 1 })
      .loader(async () => ({ n: 1, cta: <Cta /> }))
      .page(({ data }) => (
        <div id="page">
          <span id="n">n={data.n}</span>
          {data.cta}
        </div>
      ))

    const { render, fetchPreview } = await createTestThings({ ssr: true, points: [root, Cta, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#cta')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /
          #loading: ...

          #page:
            #n: n=1
            #cta: go!
        "
      `)
    })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #page:
        #n: n=1
        #cta: go!
      "
    `)
  })

  it('component point as a LAZY aggregator record resolves via its dynamic import', async () => {
    const root = createRoot()
    const Cta = root.lets('component', 'rscCtaLazy').component(() => <div id="cta-lazy">go!</div>)
    // the generated client aggregator lists components exactly like this — a lazy record whose
    // dynamic import resolves to the exported mount; the reference resolves through the collection
    const lazyRecord = { type: 'component', name: 'rscCtaLazy', point: async () => Cta }
    const page = root
      .lets('page', 'home', '/')
      .rsc({ depth: 1 })
      .loader(async () => ({ cta: <Cta /> }))
      .page(({ data }) => <div id="page">{data.cta}</div>)

    const { render } = await createTestThings({ ssr: true, points: [root, lazyRecord as never, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#cta-lazy')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /
          #loading: ...

          #page:
            #cta-lazy: go!
        "
      `)
    })
  })

  it('mutation returns elements — a server component and a component-point reference', async () => {
    const root = createRoot()
    const Badge = ({ text }: { text: string }) => <b id="badge">{text}</b>
    const Cta = root.lets('component', 'rscCtaFromMutation').component(() => <div id="cta-m">go!</div>)
    const publish = root
      .lets('mutation', 'publish')
      .rsc({ depth: 1 })
      .loader(async () => ({ n: 1, badge: <Badge text="published!" />, cta: <Cta /> }))
      .mutation()
    const page = root.lets('page', 'home', '/').page(() => {
      const mutation = publish.useMutation()
      return (
        <div id="page">
          <button id="mutate" onClick={() => mutation.mutate()}>
            Publish
          </button>
          {mutation.data?.badge ?? <span id="no-badge">nothing yet</span>}
          {mutation.data?.cta}
        </div>
      )
    })

    const { render, fetchesTale } = await createTestThings({ ssr: true, points: [root, Cta, publish, page] })
    await render(page.route(), async ({ waitContent, tale, click }) => {
      await waitContent('#no-badge')
      await click('#mutate')
      await waitContent('#cta-m')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /
          #page:
            #mutate: Publish
            #no-badge: nothing yet

          #page:
            #mutate: Publish
            #badge: published!
            #cta-m: go!
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      mutation.publish (client) < {}
      "
    `)
  })

  it('transform:false + an element still decodes on the client — no raw __p0e reaches React', async () => {
    // A client fetch (a mutation, always client-triggered) whose point opts out of the app transformer with
    // `transform: false` and returns an element. The server RSC-encodes its output regardless of `transform`; the client
    // must decode it symmetrically. Before the fix the client returned the raw res.json() under transform:false, so
    // `mutation.data.badge` was a `{ __p0e: … }` object and rendering it threw "Objects are not valid as a React child"
    // — `#badge-raw` never appeared.
    const root = createRoot()
    const publish = root
      .lets('mutation', 'publishRaw')
      .rsc({ depth: 1 })
      .fetchOptions(() => ({ transform: false }))
      .loader(async () => ({ badge: <b id="badge-raw">ok!</b> }))
      .mutation()
    const page = root.lets('page', 'home', '/').page(() => {
      const mutation = publish.useMutation()
      return (
        <div id="page">
          <button id="mutate" onClick={() => mutation.mutate()}>
            go
          </button>
          {mutation.data?.badge ?? <span id="pending">…</span>}
        </div>
      )
    })

    const { render } = await createTestThings({ ssr: true, points: [root, publish, page] })
    await render(page.route(), async ({ waitContent, click }) => {
      await waitContent('#pending')
      await click('#mutate')
      await waitContent('#badge-raw') // renders only if the client decoded the transform:false element
    })
  })

  it('referenced component point runs its own input + loader on the client', async () => {
    const root = createRoot()
    const Stats = root
      .lets('component', 'rscStatsWithLoader')
      .sharedInput<{ id: string }>()
      .loader(({ input }) => ({ x: input.id }))
      .component(({ data }) => <div id="stats">x={data.x}</div>)
    const page = root
      .lets('page', 'home', '/')
      .rsc({ depth: 1 })
      .loader(async () => ({ stats: <Stats input={{ id: 'zxc' }} /> }))
      .page(({ data }) => <div id="page">{data.stats}</div>)

    const { render, fetchesTale } = await createTestThings({ ssr: true, points: [root, Stats, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#stats')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /
          #loading: ...

          #page:
            #stats: x=zxc
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      page.home (client) < {}
      component.rscStatsWithLoader (client) < {"id":"zxc"}
      "
    `)
  })

  it('referenced component point with a loader over SSR: its query resolves server-side and ships dehydrated', async () => {
    const root = createRoot()
    const Stats = root
      .lets('component', 'rscStatsSsr')
      .sharedInput<{ id: string }>()
      .loader(({ input }) => ({ x: input.id }))
      .component(({ data }) => <div id="stats">x={data.x}</div>)
    const page = root
      .lets('page', 'home', '/')
      .rsc({ depth: 1 })
      .loader(async () => ({ stats: <Stats input={{ id: 'zxc' }} /> }))
      .page(({ data }) => <div id="page">{data.stats}</div>)

    const { fetchSsr } = await createTestThings({ ssr: true, points: [root, Stats, page] })
    const ssr = await (
      fetchSsr as unknown as (point: unknown) => Promise<{
        preview: string
        queryClientQueriesPreview: string
      }>
    )(page)
    expect(ssr.preview).toMatchInlineSnapshot(`
      "
      #page:
        #stats: x=zxc
      "
    `)
    expect(ssr.queryClientQueriesPreview).toMatchInlineSnapshot(`
      "point0|root|page|home|server|finite||data|{}
      {"stats":{"__p0e":{"p":{"input":{"id":"zxc"}},"t":{"c":"rscStatsSsr"}}}}
      point0|root|component|rscStatsSsr|server|finite||data|{"id":"zxc"}
      {"x":"zxc"}
      "
    `)
  })

  it('children travel into a component point — slot-style, including another island', async () => {
    const root = createRoot()
    const Inner = root.lets('component', 'rscSlotInner').component(() => <i id="inner-island">i!</i>)
    const Card = root
      .lets<{ title?: React.ReactNode; children?: React.ReactNode }>('component', 'rscSlotCard')
      .component(({ props }) => (
        <div id="card">
          <div id="card-title">{props.title}</div>
          <div id="card-body">{props.children}</div>
        </div>
      ))
    const page = root
      .lets('page', 'home', '/')
      .rsc({ depth: 1 })
      .loader(async () => ({
        card: (
          <Card title={<b id="title-el">T!</b>}>
            <span id="kid">kid</span>
            <Inner />
          </Card>
        ),
      }))
      .page(({ data }) => <div id="page">{data.card}</div>)

    const { render, fetchPreview } = await createTestThings({ ssr: true, points: [root, Inner, Card, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#inner-island')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /
          #loading: ...

          #page:
            #card:
              #card-title:
                #title-el: T!
              #card-body:
                #kid: kid
                #inner-island: i!
        "
      `)
    })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #page:
        #card:
          #card-title:
            #title-el: T!
          #card-body:
            #kid: kid
            #inner-island: i!
      "
    `)
  })

  it('server component using hooks fails — the React error reaches the boundary as-is (no framework editorializing)', async () => {
    const Counter = () => {
      const [count] = React.useState(0)
      return <div id="counter">{count}</div>
    }
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/')
      .loader(async () => <Counter />)
      .page(({ data }) => <div id="page">{data}</div>)

    const { render } = await createTestThings({ ssr: true, points: [root, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#error')
      const text = await tale()
      // The server component's throw is coerced with `ErrorClass.from` and re-thrown as-is — React's own error surfaces
      expect(text).toContain('Invalid hook call')
      // …with NO framework-added hint: it used to wrap every throw, mislabeling a user's plain `throw new Error(...)`
      expect(text).not.toContain('make it a component point')
    })
  })

  it('query with elements prefetched in onPrefetchPage lands in the SSR html and the dehydrated state', async () => {
    const root = createRoot()
    const Cta = root.lets('component', 'rscCtaPrefetched').component(() => <div id="cta-p">go!</div>)
    const promo = root
      .lets('query', 'promo')
      .rsc({ depth: 1 })
      .loader(async () => ({ hero: <b id="hero-p">H!</b>, cta: <Cta /> }))
      .query()
    const page = root
      .lets('page', 'home', '/')
      .onPrefetchPage(async () => {
        await promo.prefetchQuery()
      })
      .page(() => {
        const query = promo.useQuery()
        return (
          <div id="page">
            {query.data ? (
              <>
                {query.data.hero}
                {query.data.cta}
              </>
            ) : (
              <span id="pending">pending</span>
            )}
          </div>
        )
      })

    // the warm-up runs on the real SSR request (the harness render() is a pure client mount — no SSR, no
    // hydration — so the SSR boundary is asserted here directly)
    const { fetchSsr } = await createTestThings({ ssr: true, points: [root, Cta, promo, page] })
    const ssr = await (
      fetchSsr as unknown as (point: unknown) => Promise<{
        preview: string
        queryClientQueriesPreview: string
      }>
    )(page)
    // the SSR html ships the warmed content — no pending fallback, the island rendered server-side
    expect(ssr.preview).toMatchInlineSnapshot(`
      "
      #page:
        #hero-p: H!
        #cta-p: go!
      "
    `)
    // …and the dehydrated state carries the promo query with the ENCODED elements (the client hydrates this —
    // fresh timestamps + refetchOnMount:false — instead of refetching; that path is prefetch-page-rehydrate's)
    expect(ssr.queryClientQueriesPreview).toMatchInlineSnapshot(`
      "point0|root|query|promo|server|finite||data|{}
      {"cta":{"__p0e":{"t":{"c":"rscCtaPrefetched"}}},"hero":{"__p0e":{"p":{"children":"H!","id":"hero-p"},"t":"b"}}}
      "
    `)
  })

  it('elements arrive through a .with()-injected query', async () => {
    const root = createRoot()
    const promo = root
      .lets('query', 'promo')
      .rsc({ depth: 1 })
      .loader(async () => ({ hero: <b id="hero-w">H!</b> }))
      .query()
    const page = root
      .lets('page', 'home', '/')
      .with(promo)
      .page(({ data }) => <div id="page">{data.hero}</div>)

    const { render, fetchPreview } = await createTestThings({ ssr: true, points: [root, promo, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#hero-w')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /
          #loading: ...

          #page:
            #hero-w: H!
        "
      `)
    })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #page:
        #hero-w: H!
      "
    `)
  })

  it('invalidateQuery refetches fresh elements (structural sharing stays out of the way)', async () => {
    const root = createRoot()
    let version = 0
    const stamp = root
      .lets('query', 'stamp')
      .rsc({ depth: 1 })
      .loader(async () => {
        version++
        return { badge: <b id={`v${version}`}>v={version}</b> }
      })
      .query()
    const page = root.lets('page', 'home', '/').page(() => {
      const query = stamp.useQuery()
      return (
        <div id="page">
          {query.data?.badge ?? <span id="pending">pending</span>}
          <button id="refresh" onClick={() => void stamp.invalidateQuery()}>
            Refresh
          </button>
        </div>
      )
    })

    const { render } = await createTestThings({ ssr: true, points: [root, stamp, page] })
    await render(page.route(), async ({ waitContent, tale, click }) => {
      await waitContent('#v1')
      await click('#refresh')
      await waitContent('#v2')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /
          #page:
            #pending: pending
            #refresh: Refresh

          #page:
            #v1: v=1
            #refresh: Refresh

          #page:
            #v2: v=2
            #refresh: Refresh
        "
      `)
    })
  })

  it('suspend "server": the streamed push script carries encoded elements', async () => {
    const root = createRoot()
    const gate = createGate()
    const Cta = root.lets('component', 'rscCtaStreamed').component(() => <div id="cta-s">go!</div>)
    const slow = root
      .lets('query', 'slow')
      .rsc({ depth: 1 })
      .loader(async () => {
        await gate.promise
        return { hero: <b id="hero-s">H!</b>, cta: <Cta /> }
      })
      .query()
    const page = root
      .lets('page', 'home', '/')
      .loading(() => <div id="page-loading">deferred-loading</div>)
      .page(() => {
        const query = slow.useQuery(undefined, { suspend: 'server' })
        return (
          <div id="page">
            {query.data ? (
              <>
                {query.data.hero}
                {query.data.cta}
              </>
            ) : (
              'pending'
            )}
          </div>
        )
      })

    const { client } = await createTestThings({ ssr: true, points: [root, Cta, slow, page] })
    await (client as { run: <T>(fn: () => Promise<T>) => Promise<T> }).run(async () => {
      const response = await (client as unknown as { fetch: (url: string) => Promise<Response> }).fetch(
        'http://localhost/',
      )
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      // the shell ships with the fallback while the loader hangs — no element content yet
      let html = await readUntil(reader, decoder, '', 'deferred-loading')
      expect(html).not.toContain('id="cta-s"')
      gate.release()
      html = await readToEnd(reader, decoder, html)
      // the streamed boundary renders the real components server-side…
      expect(html).toContain('id="hero-s"')
      expect(html).toContain('id="cta-s"')
      // …and the push script seeds the client cache with the ENCODED elements (wire markers)
      expect(html).toContain('__POINT0_PUSH_QUERY__("')
      expect(html).toContain('__p0e')
      expect(html).toContain('rscCtaStreamed')
    })
  }, 15000)

  it('defer: a slow server subtree streams as a hole — shell ships the fallback, the fill pushes over __POINT0_PUSH_RSC__', async () => {
    const root = createRoot()
    const gate = createGate()
    const Cta = root.lets('component', 'rscCtaHole').component(() => <div id="cta-h">go!</div>)
    const SlowHero = async () => {
      await gate.promise
      return (
        <div id="hero-h">
          <b>H!</b>
          <Cta />
        </div>
      )
    }
    const page = root
      .lets('page', 'home', '/')
      .rsc({ depth: 1 })
      .loader(async () => ({
        hero: defer(<SlowHero />, <div id="hero-fallback">hero-loading</div>),
      }))
      .page(({ data }) => (
        <div id="page">
          <div id="static">static-content</div>
          {data.hero}
        </div>
      ))

    const { client } = await createTestThings({ ssr: true, points: [root, Cta, page] })
    await (client as { run: <T>(fn: () => Promise<T>) => Promise<T> }).run(async () => {
      const response = await (client as unknown as { fetch: (url: string) => Promise<Response> }).fetch(
        'http://localhost/',
      )
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      // the shell ships at once: static content + the hole's fallback, no deferred content, response still open
      let html = await readUntil(reader, decoder, '', 'hero-loading')
      expect(html).toContain('static-content')
      expect(html).toContain('hero-loading')
      expect(html).not.toContain('id="hero-h"')
      expect(html).not.toContain('id="cta-h"')
      expect(html).not.toContain('</html>')
      // release the deferred server component → its markup (and its island) stream into the same response
      gate.release()
      html = await readToEnd(reader, decoder, html)
      expect(html).toContain('id="hero-h"')
      expect(html).toContain('id="cta-h"')
      // the fill lands on the RSC push channel, carrying the ENCODED island reference (wire marker)
      expect(html).toContain('__POINT0_PUSH_RSC__(')
      expect(html).toContain('__p0e')
      expect(html).toContain('rscCtaHole')
      expect(html).toContain('</html>')
    })
  }, 15000)

  it('THREE deferred server subtrees at different speeds all stream into one response, out of order', async () => {
    const root = createRoot()
    const g1 = createGate()
    const g2 = createGate()
    const g3 = createGate()
    const A = async () => {
      await g1.promise
      return <b id="A">A_CONTENT</b>
    }
    const B = async () => {
      await g2.promise
      return <b id="B">B_CONTENT</b>
    }
    const C = async () => {
      await g3.promise
      return <b id="C">C_CONTENT</b>
    }
    const page = root
      .lets('page', 'home', '/')
      .rsc({ depth: 1 })
      .loader(async () => ({
        a: defer(<A />, <span id="fa">a-loading</span>),
        b: defer(<B />, <span id="fb">b-loading</span>),
        c: defer(<C />, <span id="fc">c-loading</span>),
      }))
      .page(({ data }) => (
        <div id="page">
          {data.a}
          {data.b}
          {data.c}
        </div>
      ))
    const { client } = await createTestThings({ ssr: true, points: [root, page] })
    const c = client as unknown as {
      run: <T>(fn: () => Promise<T>) => Promise<T>
      fetch: (url: string) => Promise<Response>
    }
    await c.run(async () => {
      const response = await c.fetch('http://localhost/')
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      // shell: all three fallbacks, no content yet, response still open
      let html = await readUntil(reader, decoder, '', 'c-loading')
      expect(html).toContain('a-loading')
      expect(html).toContain('b-loading')
      expect(html).toContain('c-loading')
      expect(html).not.toContain('A_CONTENT')
      expect(html).not.toContain('B_CONTENT')
      expect(html).not.toContain('C_CONTENT')
      expect(html).not.toContain('</html>')
      // resolve OUT OF ORDER — b, then c, then a — each streams in on its own, none waits for the others
      g2.release()
      html = await readUntil(reader, decoder, html, 'B_CONTENT')
      expect(html).toContain('B_CONTENT')
      expect(html).not.toContain('A_CONTENT')
      expect(html).not.toContain('C_CONTENT')
      g3.release()
      html = await readUntil(reader, decoder, html, 'C_CONTENT')
      expect(html).toContain('C_CONTENT')
      expect(html).not.toContain('A_CONTENT')
      g1.release()
      html = await readToEnd(reader, decoder, html)
      // all three rendered, each pushed EXACTLY once, one response, stream closed — zero extra requests
      expect(html).toContain('A_CONTENT')
      expect(html).toContain('B_CONTENT')
      expect(html).toContain('C_CONTENT')
      expect((html.match(/__POINT0_PUSH_RSC__\(/g) ?? []).length).toBe(3)
      expect(html).toContain('</html>')
    })
  }, 20000)

  it('a deferred server subtree that THROWS never hangs the stream — it closes and the error is pushed', async () => {
    const root = createRoot()
    const gate = createGate()
    const Boom = async () => {
      await gate.promise
      throw new Error('boom-in-defer')
    }
    const page = root
      .lets('page', 'home', '/')
      .rsc({ depth: 1 })
      .loader(async () => ({ x: defer(<Boom />, <span id="boom-fb">boom-loading</span>) }))
      .page(({ data }) => <div id="page">{data.x}</div>)
    const { client } = await createTestThings({ ssr: true, points: [root, page] })
    const c = client as unknown as {
      run: <T>(fn: () => Promise<T>) => Promise<T>
      fetch: (url: string) => Promise<Response>
    }
    await c.run(async () => {
      const response = await c.fetch('http://localhost/')
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let html = await readUntil(reader, decoder, '', 'boom-loading')
      expect(html).toContain('boom-loading')
      expect(html).not.toContain('</html>')
      gate.release()
      html = await readToEnd(reader, decoder, html)
      // the thrown subtree's promise never rejects (a rejected Suspense thenable hangs Fizz on Bun) —
      // the stream still closes, and the failure is delivered so the client hole slot throws to its boundary
      expect(html).toContain('</html>')
      expect(html).toContain('__POINT0_PUSH_RSC__(')
    })
  }, 15000)

  it('defer without a fallback streams a blank hole, then the content (the fallback is optional)', async () => {
    const root = createRoot()
    const gate = createGate()
    const Slow = async () => {
      await gate.promise
      return <b id="nofb">no-fallback-content</b>
    }
    const page = root
      .lets('page', 'home', '/')
      .rsc({ depth: 1 })
      .loader(async () => ({ x: defer(<Slow />) }))
      .page(({ data }) => (
        <div id="page">
          <span id="anchor">anchor</span>
          {data.x}
        </div>
      ))
    const { client } = await createTestThings({ ssr: true, points: [root, page] })
    const c = client as unknown as {
      run: <T>(fn: () => Promise<T>) => Promise<T>
      fetch: (url: string) => Promise<Response>
    }
    await c.run(async () => {
      const response = await c.fetch('http://localhost/')
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      // the shell ships (anchor present) with nothing where the hole is — no fallback declared
      let html = await readUntil(reader, decoder, '', 'anchor')
      expect(html).toContain('anchor')
      expect(html).not.toContain('no-fallback-content')
      gate.release()
      html = await readToEnd(reader, decoder, html)
      expect(html).toContain('no-fallback-content')
      expect(html).toContain('__POINT0_PUSH_RSC__(')
    })
  }, 15000)

  it('a mutation loader returns a defer()-ed server component — it streams in and lands as data.receipt', async () => {
    // A mutation `defer()` streams like any client fetch (Phase 2): the client advertises streaming, the server frames
    // the receipt as a hole and fills it over NDJSON, and it renders in place — the "elements as data" contract holds
    // through mutations, defer and all. (Without the stream header the same `defer()` would degrade to inline.)
    const root = createRoot()
    const Receipt = async ({ id }: { id: number }) => <b id="receipt">receipt-{id}</b>
    const publish = root
      .lets('mutation', 'publish')
      .rsc({ depth: 1 })
      .loader(async () => ({ ok: true, receipt: defer(<Receipt id={42} />, <span>pending</span>) }))
      .mutation()
    const page = root.lets('page', 'home', '/').page(() => {
      const mutation = publish.useMutation()
      return (
        <div id="page">
          <button id="mutate" onClick={() => mutation.mutate()}>
            go
          </button>
          {mutation.data?.receipt ?? <span id="no-receipt">nothing yet</span>}
        </div>
      )
    })
    const { render } = await createTestThings({ ssr: true, points: [root, publish, page] })
    await render(page.route(), async ({ waitContent, click, tale }) => {
      await waitContent('#no-receipt')
      await click('#mutate')
      await waitContent('#receipt')
      expect(await tale()).toContain('receipt-42')
    })
  })

  it('Phase 2: a stream-capable client fetch frames a loader defer() as NDJSON — line 1 holds a {t:2} hole, the slow subtree lands as a later fill line', async () => {
    // Phase 2, steps 1–2 — the data-fetch path mints a hole registry when the client advertises it can read a streamed
    // body (POINT0_STREAM_HEADER), so `defer()` produces a `{ t: 2 }` hole; when the output carries holes the response is
    // framed as NDJSON: line 1 is the payload (holes as `{ t: 2 }`), each following line fills one as it resolves. The
    // slow subtree is NOT in line 1 — it streams separately. Without the header the same `defer()` degrades to a single
    // inline JSON body (Phase 1 behavior), so foreign clients and OpenAPI are untouched.
    const root = createRoot()
    const Slow = async () => <b id="slow">SLOW-DEFERRED-CONTENT</b>
    const thing = root
      .lets('action', 'thing', 'GET', '/api/thing')
      .rsc({ depth: 1 })
      .loader(async () => ({ x: defer(<Slow />, <span id="fb">fb</span>) }))
      .action()
    const { engine } = await createTestThings({ ssr: true, points: [root, thing] })
    // The PLAIN (non-RSC) transformer keeps hole nodes visible as data instead of decoding them to client slots.
    const transformer = thing.point._getTransformer()

    // WITH the capability header → NDJSON. The response advertises the stream; line 1 carries the hole with no inlined
    // content; a later line carries the resolved slow subtree.
    const streamed = await engine.fetch(
      new Request('http://localhost:3000/api/thing', { headers: { [POINT0_STREAM_HEADER]: 'true' } }),
    )
    expect(streamed.headers.get(POINT0_STREAM_HEADER)).toBe('true')
    expect(streamed.headers.get('Content-Type')).toBe('application/x-ndjson')
    // The framed body is per-request state gated on a request header: no cache may store or replay it (a cached NDJSON
    // body served to a non-streaming client would fail its JSON.parse), and buffering proxies must not collapse it.
    expect(streamed.headers.get('Cache-Control')).toBe('private, no-store')
    expect(streamed.headers.get('Vary')).toBe(POINT0_STREAM_HEADER)
    expect(streamed.headers.get('X-Accel-Buffering')).toBe('no')
    const lines = (await streamed.text()).split('\n').filter((line) => line.length > 0)
    expect(lines.length).toBeGreaterThanOrEqual(2)
    expect(JSON.stringify(transformer.parse(lines[0]!))).toContain('"t":2')
    expect(lines[0]!).not.toContain('SLOW-DEFERRED-CONTENT')
    const fillLine = lines.slice(1).find((line) => line.includes('SLOW-DEFERRED-CONTENT'))
    expect(fillLine).toBeDefined()

    // WITHOUT the header → single JSON, the hole degrades to inline: the slow content IS in the body, no `{ t: 2 }`, no
    // stream header.
    const plain = await engine.fetch(new Request('http://localhost:3000/api/thing'))
    expect(plain.headers.get(POINT0_STREAM_HEADER)).toBeNull()
    const plainBody = await plain.text()
    expect(plainBody).toContain('SLOW-DEFERRED-CONTENT')
    expect(JSON.stringify(transformer.parse(plainBody))).not.toContain('"t":2')
  })

  it("a defer() that outlives the point's .rsc({ holeTimeoutMs }) streams an RSC_HOLE_TIMEOUT error fill instead of hanging", async () => {
    // The deadline is the stream's only bound: heartbeats keep idle reapers (Bun's default 10s idleTimeout, proxies)
    // away from a legitimately-waiting stream, so a subtree that never settles must be failed by point0 itself. The
    // error fill rides the normal error path — the client hole re-throws it to its boundary (or renders the per-hole
    // error fallback) and the stream closes cleanly. The deadline is the OWNER point's `.rsc({ holeTimeoutMs })`,
    // resolved through the executor — this drives the whole chain-to-registry plumbing.
    const root = createRoot()
    const Hung = async (): Promise<React.ReactNode> => new Promise<React.ReactNode>(() => {})
    const hung = root
      .lets('action', 'hung', 'GET', '/api/hung')
      .rsc({ depth: 1, holeTimeoutMs: 60 })
      .loader(async () => ({ x: defer(<Hung />, <span>fb</span>) }))
      .action()
    const { engine } = await createTestThings({ ssr: true, points: [root, hung] })
    const streamed = await engine.fetch(
      new Request('http://localhost:3000/api/hung', { headers: { [POINT0_STREAM_HEADER]: 'true' } }),
    )
    expect(streamed.headers.get(POINT0_STREAM_HEADER)).toBe('true')
    // .text() resolving at all proves the deadline closed the stream — without it this fetch would hang forever
    const lines = (await streamed.text()).split('\n').filter((line) => line.length > 0)
    expect(lines).toHaveLength(2)
    expect(lines[1]).toContain('POINT0_RSC_HOLE_TIMEOUT')
  })

  it('a loader that sets a non-2xx status inlines its defer() — an error response never rides the NDJSON framing', async () => {
    // The client reader only takes the stream path on `res.ok`, so a framed 4xx body would fall to res.json() and fail
    // to parse. The executor withholds the hole registry when the status is already non-2xx at normalize time, so the
    // defer degrades to the same inline single-JSON body a foreign client gets.
    const root = createRoot()
    const Slow = async () => <b>INLINE-ON-ERROR</b>
    const missing = root
      .lets('action', 'missing', 'GET', '/api/missing')
      .rsc({ depth: 1 })
      .loader(async ({ set }) => {
        set.status(404)
        return { x: defer(<Slow />, <span>fb</span>) }
      })
      .action()
    const { engine } = await createTestThings({ ssr: true, points: [root, missing] })
    const transformer = missing.point._getTransformer()
    const res = await engine.fetch(
      new Request('http://localhost:3000/api/missing', { headers: { [POINT0_STREAM_HEADER]: 'true' } }),
    )
    expect(res.status).toBe(404)
    expect(res.headers.get(POINT0_STREAM_HEADER)).toBeNull()
    const body = await res.text()
    expect(body).toContain('INLINE-ON-ERROR')
    expect(JSON.stringify(transformer.parse(body))).not.toContain('"t":2')
  })

  it('a mutation defer() without the stream header degrades to a single inline JSON body', async () => {
    // The no-header inline degrade is pinned for the action GET path above — this is the mutation (POST endpoint)
    // symmetry: a foreign client posting to the mutation endpoint gets the subtree awaited inline, no framing.
    const root = createRoot()
    const Receipt = async () => <b>receipt-inline-77</b>
    const publishInline = root
      .lets('mutation', 'publishInline')
      .rsc({ depth: 1 })
      .loader(async () => ({ ok: true, receipt: defer(<Receipt />, <span>pending</span>) }))
      .mutation()
    const { engine } = await createTestThings({ ssr: true, points: [root, publishInline] })
    const transformer = publishInline.point._getTransformer()
    const res = await engine.fetch(
      new Request('http://localhost:3000/_point0/root/mutation/publish-inline', { method: 'POST' }),
    )
    expect(res.status).toBe(200)
    expect(res.headers.get(POINT0_STREAM_HEADER)).toBeNull()
    const body = await res.text()
    expect(body).toContain('receipt-inline-77')
    expect(JSON.stringify(transformer.parse(body))).not.toContain('"t":2')
  })

  it('Phase 2: a client-fetch query streams a defer() hole in and an interactive island INSIDE the hole is live (clickable)', async () => {
    // The Phase 2 payoff — and the fix for Phase 1's honest limitation. On a CLIENT fetch a hole renders FRESH on the
    // client (no Fizz `$RC`), so an interactive island inside the deferred subtree hydrates and works. An SSR hole can't
    // do this (React abandons the server-revealed boundary); a client-fetch hole has no such conflict.
    const root = createRoot()
    const Counter = root.lets('component', 'counterIsland').component(() => {
      const [n, setN] = React.useState(0)
      return (
        <button id="counter" onClick={() => setN((value) => value + 1)}>
          count={n}
        </button>
      )
    })
    // Plain server markup (not a point) that wraps the island; deferred so it streams in after the fast data.
    const Slow = async () => (
      <div id="slow-wrap">
        <span id="slow-text">slow-arrived</span>
        <Counter />
      </div>
    )
    const q = root
      .lets('query', 'stuff')
      .rsc({ depth: 1 })
      .loader(async () => ({ fast: 'fast-data', slow: defer(<Slow />, <span id="slow-fb">slow-loading</span>) }))
      .query()
    const page = root.lets('page', 'home', '/').page(() => {
      const query = q.useQuery()
      return (
        <div id="page">
          <span id="fast">{query.data?.fast ?? 'no-data'}</span>
          {query.data?.slow}
        </div>
      )
    })
    const { render } = await createTestThings({ ssr: true, points: [root, Counter, q, page] })
    await render(page.route(), async ({ waitContent, click, tale }) => {
      // The fast field resolves the query at once; the deferred subtree then streams in — its markup AND its island.
      await waitContent('#fast')
      await waitContent('#slow-text')
      await waitContent('#counter')
      // The island inside the client-fetch hole is LIVE — clicking updates its own local state.
      await click('#counter')
      expect(await tale()).toContain('count=1')
      expect(await tale()).toContain('fast-data')
    })
  })

  it('Phase 2: client navigation (queryClientDehydratedState) frames a page-loader defer() as NDJSON', async () => {
    // The client-navigation prefetch path streams too: `prefetchAppPagePointDeep` mints the registry, so a page loader's
    // `defer()` lands as a `{ t: 2 }` hole in the dehydrated query state (line 1) and its subtree streams as a later
    // fill line — the same reader fills it, so a navigated-to page gets shell-first + progressive slow parts.
    const root = createRoot()
    const Slow = async () => <b id="nav-slow">NAV-SLOW-CONTENT</b>
    const page = root
      .lets('page', 'home', '/')
      .rsc({ depth: 1 })
      .loader(async () => ({ fast: 'fast', slow: defer(<Slow />, <span id="nav-fb">nav-loading</span>) }))
      .page(({ data }) => (
        <div id="page">
          <span id="fast">{data.fast}</span>
          {data.slow}
        </div>
      ))
    const { engine } = await createTestThings({ ssr: true, points: [root, page] })
    const endpoint = (page.point as { _endpoint?: { route: { get: (i: unknown, o: unknown) => string } } })._endpoint!
    const url = endpoint.route.get({}, { origin: 'http://localhost' })
    const res = await engine.fetch(
      new Request(url, {
        headers: {
          'x-point0-output-type': 'queryClientDehydratedState',
          'x-point0-transform': 'true',
          [POINT0_STREAM_HEADER]: 'true',
          Accept: 'application/json',
        },
      }),
    )
    expect(res.headers.get(POINT0_STREAM_HEADER)).toBe('true')
    const lines = (await res.text()).split('\n').filter((line) => line.length > 0)
    expect(lines.length).toBeGreaterThanOrEqual(2)
    // Line 1 — the dehydrated query state carries a `{ t: 2 }` hole, no inlined slow content.
    expect(JSON.stringify(page.point._getTransformer().parse(lines[0]!))).toContain('"t":2')
    expect(lines[0]!).not.toContain('NAV-SLOW-CONTENT')
    // A later line — the fill with the resolved slow subtree.
    expect(lines.slice(1).some((line) => line.includes('NAV-SLOW-CONTENT'))).toBe(true)
  })

  it('Phase 2: a client-fetch defer() whose subtree throws delivers the error to the nearest boundary', async () => {
    // The error fill line carries the subtree's failure (public projection, like a query error); the client hole slot
    // re-throws it, so it reaches the nearest `ErrorBoundary0` (here root's `.error`) instead of spinning on the fallback.
    const root = createRoot()
    const Boom = async () => {
      throw new Error('client-defer-boom')
    }
    const q = root
      .lets('query', 'stuff')
      .rsc({ depth: 1 })
      .loader(async () => ({ ok: true, slow: defer(<Boom />, <span id="boom-fb">boom-loading</span>) }))
      .query()
    const page = root.lets('page', 'home', '/').page(() => {
      const query = q.useQuery()
      return <div id="page">{query.data ? query.data.slow : <span id="pending">pending</span>}</div>
    })
    const { render } = await createTestThings({ ssr: true, points: [root, q, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#error')
      expect(await tale()).toContain('client-defer-boom')
    })
  })

  it("Phase 2: defer()'s 3rd arg renders a per-hole error fallback in place — the failure never reaches the boundary", async () => {
    // With an error fallback the failed subtree renders it IN PLACE, scoped to the hole: the rest of the page survives
    // and the root `.error` boundary is never hit (contrast the previous test, which has no 3rd arg).
    const root = createRoot()
    const Boom = async () => {
      throw new Error('BOOM-SECRET')
    }
    const q = root
      .lets('query', 'stuff')
      .rsc({ depth: 1 })
      .loader(async () => ({
        slow: defer(<Boom />, <span id="fb">loading</span>, <span id="err-fb">could-not-load</span>),
      }))
      .query()
    const page = root.lets('page', 'home', '/').page(() => {
      const query = q.useQuery()
      return (
        <div id="page">
          <span id="ok">PAGE-OK</span>
          {query.data?.slow}
        </div>
      )
    })
    const { render } = await createTestThings({ ssr: true, points: [root, q, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#err-fb') // the per-hole error fallback rendered where the subtree was
      const text = await tale()
      expect(text).toContain('could-not-load')
      expect(text).toContain('PAGE-OK') // the rest of the page survived — the error was scoped to the hole
      expect(text).not.toContain('BOOM-SECRET') // the root boundary (root's `.error`) was never hit
    })
  })

  it("defer()'s 3rd arg as a FUNCTION receives the real error and renders it in place", async () => {
    // The function form runs on the SERVER when the subtree fails, gets the error (coerced to the app's error class and
    // projected for the client), and its markup streams into the hole — so what it renders IS the real failure, unlike
    // the static form which can only show fixed markup. Still scoped to the hole: the rest of the page survives.
    const root = createRoot()
    const Boom = async () => {
      throw new Error('BOOM-DETAIL')
    }
    const q = root
      .lets('query', 'stuff')
      .rsc({ depth: 1 })
      .loader(async () => ({
        slow: defer(<Boom />, <span id="fb">loading</span>, (error) => (
          <span id="err-fb">{`handled: ${error.message}`}</span>
        )),
      }))
      .query()
    const page = root.lets('page', 'home', '/').page(() => {
      const query = q.useQuery()
      return (
        <div id="page">
          <span id="ok">PAGE-OK</span>
          {query.data?.slow}
        </div>
      )
    })
    const { render } = await createTestThings({ ssr: true, points: [root, q, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#err-fb')
      const text = await tale()
      expect(text).toContain('handled:') // the function form ran and rendered
      expect(text).toContain('BOOM-DETAIL') // …with the real error's message (unlike the static form)
      expect(text).toContain('PAGE-OK') // scoped to the hole — the rest of the page survived
    })
  })

  it('a deferred subtree that ITSELF defers — the inner hole is minted late and streams in after the outer', async () => {
    // A resolving subtree can register MORE holes (an inner `defer`); the pump drains until every hole is delivered,
    // including ones minted only after the first batch. Proves nested holes stream, inner after outer, in one response.
    const root = createRoot()
    const gOuter = createGate()
    const gInner = createGate()
    const Inner = async () => {
      await gInner.promise
      return <b id="inner">INNER_CONTENT</b>
    }
    const Outer = async () => {
      await gOuter.promise
      return (
        <div id="outer">
          OUTER_CONTENT
          {defer(<Inner />, <span id="inner-fb">inner-loading</span>)}
        </div>
      )
    }
    const page = root
      .lets('page', 'home', '/')
      .rsc({ depth: 1 })
      .loader(async () => ({ block: defer(<Outer />, <span id="outer-fb">outer-loading</span>) }))
      .page(({ data }) => <div id="page">{data.block}</div>)
    const { client } = await createTestThings({ ssr: true, points: [root, page] })
    const c = client as unknown as {
      run: <T>(fn: () => Promise<T>) => Promise<T>
      fetch: (url: string) => Promise<Response>
    }
    await c.run(async () => {
      const response = await c.fetch('http://localhost/')
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      // shell: only the OUTER fallback — the inner defer isn't reached until Outer resolves, so it doesn't exist yet
      let html = await readUntil(reader, decoder, '', 'outer-loading')
      expect(html).toContain('outer-loading')
      expect(html).not.toContain('OUTER_CONTENT')
      expect(html).not.toContain('inner-loading')
      expect(html).not.toContain('</html>')
      // outer resolves → its markup streams in AND it mints the inner hole (now showing the inner fallback)
      gOuter.release()
      html = await readUntil(reader, decoder, html, 'OUTER_CONTENT')
      expect(html).toContain('OUTER_CONTENT')
      expect(html).toContain('inner-loading') // the inner hole's fallback, registered only now
      expect(html).not.toContain('INNER_CONTENT')
      expect(html).not.toContain('</html>') // response still open — the pump waits on the late inner hole
      // inner resolves → streams in, THEN the response closes (the drain loop caught the late hole)
      gInner.release()
      html = await readToEnd(reader, decoder, html)
      expect(html).toContain('INNER_CONTENT')
      expect(html).toContain('</html>')
      expect((html.match(/__POINT0_PUSH_RSC__\(/g) ?? []).length).toBe(2) // outer + inner, one push each
    })
  }, 20000)

  it("an island's own loader can defer — the deferred subtree streams into the page's SSR response", async () => {
    // The page loader returns an island (a component point with its OWN loader); that loader defers a slow subtree. The
    // registry is forwarded into the nested island run, so the island's `defer` mints a hole in the SAME response — the
    // page shell ships the island's hole fallback, and the island-loader's subtree streams in later. Proves `defer`
    // works from an island's loader, not only page/query/mutation loaders.
    const root = createRoot()
    const gate = createGate()
    const Slow = async () => {
      await gate.promise
      return <b id="island-slow">ISLAND_SLOW_CONTENT</b>
    }
    const Stats = root
      .lets('component', 'rscStatsDefer')
      .rsc({ depth: 1 })
      .loader(async () => ({ inner: defer(<Slow />, <span id="island-fb">island-loading</span>) }))
      .component(({ data }) => <div id="island">{data.inner}</div>)
    const page = root
      .lets('page', 'home', '/')
      .rsc({ depth: 1 })
      .loader(async () => ({ island: <Stats /> }))
      .page(({ data }) => <div id="page">{data.island}</div>)
    const { client } = await createTestThings({ ssr: true, points: [root, Stats, page] })
    const c = client as unknown as {
      run: <T>(fn: () => Promise<T>) => Promise<T>
      fetch: (url: string) => Promise<Response>
    }
    await c.run(async () => {
      const response = await c.fetch('http://localhost/')
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      // shell: the island rendered, its hole showing the island-loader's fallback, no slow content yet
      let html = await readUntil(reader, decoder, '', 'island-loading')
      expect(html).toContain('island-loading')
      expect(html).not.toContain('ISLAND_SLOW_CONTENT')
      expect(html).not.toContain('</html>')
      // the island-loader's deferred subtree resolves → streams into the same response
      gate.release()
      html = await readToEnd(reader, decoder, html)
      expect(html).toContain('ISLAND_SLOW_CONTENT')
      expect(html).toContain('</html>')
    })
  }, 20000)

  it('a failed deferred subtree emits `rscError` — server-side observability for a failure that escapes loader errors', async () => {
    // A `defer` subtree fails AFTER the loader already returned its shell, so it never becomes a loader error event
    // (`pointQueryError` / `engineFetchError`). The pump emits `rscError` as it drains the failed hole, so `.on('rscError')`
    // — and `.on('error')`, which now aggregates it — can observe it. The event carries the hole id, the point label,
    // and the coerced error.
    const rscErrors: Array<{ side: string; holeId: unknown; label: unknown; message: string; code: unknown }> = []
    const errorSugar: string[] = []
    const root = Point0.lets('root', 'root')
      .loading(() => <div id="loading">...</div>)
      .error(({ error }) => <div id="error">{error.message}</div>)
      .on('rscError', (e) => {
        rscErrors.push({
          side: e.side,
          holeId: e.data.holeId,
          label: e.data.label,
          message: e.error.message,
          code: e.error.code,
        })
      })
      .on('error', (e) => {
        errorSugar.push(e.name)
      })
      .root()
    const Boom = async () => {
      throw new Error('EVENT-BOOM')
    }
    const page = root
      .lets('page', 'home', '/')
      .rsc({ depth: 1 })
      .loader(async () => ({ x: defer(<Boom />, <span id="fb">loading</span>) }))
      .page(({ data }) => <div id="page">{data.x}</div>)
    const { render } = await createTestThings({ ssr: true, points: [root, page] })
    await render(page.route(), async ({ waitContent }) => {
      await waitContent('#error') // the failed hole re-threw to the boundary — the hole drained, so the emit ran
      const event = rscErrors.find((e) => e.message.includes('EVENT-BOOM'))
      expect(event).toBeDefined()
      expect(event!.side).toBe('server') // deferred subtrees resolve and stream from the server
      expect(typeof event!.holeId).toBe('string')
      expect(String(event!.label)).toContain('home') // the point that produced the deferred subtree
      expect(event!.code).toBeUndefined() // a plain `throw new Error(...)` is coerced as-is — no invented code
      expect(errorSugar).toContain('rscError') // `.on('error')` aggregates it alongside the loader error events
    })
  })

  it('custom transformer types survive inside reference props (superjson Date)', async () => {
    const root = Point0.lets('root', 'root')
      .transformer(superjson)
      .loading(() => <div id="loading">...</div>)
      .error(({ error }) => <div id="error">{error.message}</div>)
      .queryOptions({ retry: false, refetchOnMount: false, refetchOnWindowFocus: false, refetchOnReconnect: false })
      .root()
    const Cta = root
      .lets<{ at: Date }>('component', 'rscCtaDated')
      .component(({ props }) => <div id="cta-d">year={props.at.getFullYear()}</div>)
    const page = root
      .lets('page', 'home', '/')
      .rsc({ depth: 1 })
      .loader(async () => ({ cta: <Cta at={new Date('2026-07-06T00:00:00Z')} /> }))
      .page(({ data }) => <div id="page">{data.cta}</div>)

    const { render } = await createTestThings({ ssr: true, points: [root, Cta, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      // the hydrated client re-renders from the DECODED wire payload — a lost Date would crash on .getFullYear()
      await waitContent('#cta-d')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /
          #loading: ...

          #page:
            #cta-d: year=2026
        "
      `)
    })
  })

  it('reference nested deep inside a host tree', async () => {
    const root = createRoot()
    const Cta = root.lets('component', 'rscCtaNested').component(() => <div id="cta-n">go!</div>)
    const page = root
      .lets('page', 'home', '/')
      .loader(async () => (
        <section id="wrap">
          <h2 id="title">t</h2>
          <Cta />
        </section>
      ))
      .page(({ data }) => <div id="page">{data}</div>)

    const { render, fetchPreview } = await createTestThings({ ssr: true, points: [root, Cta, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#cta-n')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /
          #loading: ...

          #page:
            #wrap:
              #title: t
              #cta-n: go!
        "
      `)
    })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #page:
        #wrap:
          #title: t
          #cta-n: go!
      "
    `)
  })
})

const createGate = () => {
  let release!: () => void
  const promise = new Promise<void>((resolve) => {
    release = resolve
  })
  return { promise, release }
}

const readUntil = async (
  reader: ReadableStreamDefaultReader<Uint8Array>,
  decoder: TextDecoder,
  initial: string,
  search: string,
): Promise<string> => {
  let html = initial
  while (!html.includes(search)) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }
    html += decoder.decode(value, { stream: true })
  }
  return html
}

const readToEnd = async (
  reader: ReadableStreamDefaultReader<Uint8Array>,
  decoder: TextDecoder,
  initial: string,
): Promise<string> => {
  let html = initial
  let result = await reader.read()
  while (!result.done) {
    html += decoder.decode(result.value, { stream: true })
    result = await reader.read()
  }
  return html
}
