import { describe, expect, it } from 'bun:test'
import { ClientOnly, defer, Point0 } from '@point0/core'
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

  it('elements in first-level fields with .rscDepth(1), arrays transparent', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/')
      .rscDepth(1)
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

  it('element deeper than rscDepth fails the loader with a hint', async () => {
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

          #error: RSC (at hero): root:page:home returned a React element deeper than its rscDepth allows. Raise it with .rscDepth(1) on the point (0 allows an element as the whole output, 1 allows elements in first-level fields, …).
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
      .rscDepth(1)
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
      .rscDepth(1)
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
      .rscDepth(1)
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

  it('referenced component point runs its own input + loader on the client', async () => {
    const root = createRoot()
    const Stats = root
      .lets('component', 'rscStatsWithLoader')
      .sharedInput<{ id: string }>()
      .loader(({ input }) => ({ x: input.id }))
      .component(({ data }) => <div id="stats">x={data.x}</div>)
    const page = root
      .lets('page', 'home', '/')
      .rscDepth(1)
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
      .rscDepth(1)
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
      .rscDepth(1)
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

  it('server component using hooks fails with the friendly error', async () => {
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
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /
          #loading: ...

          #error: RSC: server component &lt;Counter&gt; threw while rendering on the server: Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:
          1. You might have mismatching versions of React and the renderer (such as React DOM)
          2. You might be breaking the Rules of Hooks
          3. You might have more than one copy of React in the same app
          See https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem.. Server components run as plain function calls — hooks and context are not available; if it needs them, make it a component point so it renders on the client.
        "
      `)
    })
  })

  it('query with elements prefetched in onPrefetchPage lands in the SSR html and the dehydrated state', async () => {
    const root = createRoot()
    const Cta = root.lets('component', 'rscCtaPrefetched').component(() => <div id="cta-p">go!</div>)
    const promo = root
      .lets('query', 'promo')
      .rscDepth(1)
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
      .rscDepth(1)
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
      .rscDepth(1)
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
      .rscDepth(1)
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
      .rscDepth(1)
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
      .rscDepth(1)
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
      .rscDepth(1)
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
      .rscDepth(1)
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

  it('a mutation loader returns a defer()-ed server component — it renders server-side and lands as data.element', async () => {
    // A mutation response is a single body, not an SSR stream — there is no hole registry, so `defer`
    // degrades gracefully: the server component is awaited inline and travels as `data.receipt` like
    // any RSC element. Proves the "elements as data" contract holds through mutations, defer and all.
    const root = createRoot()
    const Receipt = async ({ id }: { id: number }) => <b id="receipt">receipt-{id}</b>
    const publish = root
      .lets('mutation', 'publish')
      .rscDepth(1)
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
      .rscDepth(1)
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
