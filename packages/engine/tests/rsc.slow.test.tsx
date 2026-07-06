import { afterAll, beforeAll, describe, expect, it, setDefaultTimeout } from 'bun:test'
import { PlaywrightBrowser } from './utils/playwright.js'
import type { TestProjectOneClient } from './utils/project.one-client.js'
import { TestProjectOneClientFactory } from './utils/project.one-client.js'

setDefaultTimeout(60000)

// RSC e2e — a real dev server + a real Chromium, then a real production build, ON BOTH BUNDLERS
// (ports 4100-4199, one sub-range per describe). Covers what the in-process harness
// (rsc.fast.test.tsx) cannot: hydration of SSR-shipped element payloads (zero refetch, zero
// hydration errors), interactive islands, `.clientOnly()` islands, a component point living in
// its OWN FILE (aggregator lazy record → its own chunk, loaded on demand), and the compiler strip
// guarantees (server code out of the client bundle, client-only render out of the server bundle).
// The vite describes run the SAME shared assertions — RSC is bundler-independent by design
// (mini-Flight in the data transformer, no react-server module graph), and these prove it: the
// only bundler-specific seams are the aggregator's dynamic imports (chunk splitting), the chunk
// graph feeding the preload manifest, and the compiler strip in each bundler's plugin.
//
// The tests are SERIAL on purpose (`it`, not `it.concurrent`) — they share one dev project and
// one browser, same as suspend.test.tsx.

// The fixture pages. Markers:
// - SERVER_ONLY_MARKER lives in a server component's output — it must exist in the server bundle
//   and NEVER in the client bundle (the loader and its imports are stripped).
// - LONELY_CLIENT_MARKER lives in a `.clientOnly()` component's render — it must exist in the
//   client bundle and NEVER in the server bundle (clientOnly cuts the render from the server).
const writeRscPages = async (project: TestProjectOneClient) => {
  await project.write(
    'src/rsc/home.tsx',
    `import { root } from '../lib/root.js'
import { Link } from '../lib/navigate.js'
export const homePage = root.lets('page', 'home', '/').page(() => (
  <div id="home">
    home
    <Link to="/rsc">go-rsc</Link>
    <Link to="/warm">go-warm</Link>
  </div>
))
`,
  )
  // the interactive island — its own file, imported ONLY inside loaders below
  await project.write(
    'src/rsc/cta.tsx',
    `import { useState } from 'react'
import { root } from '../lib/root.js'
export const RscCta = root.lets('component', 'rscCta').component(() => {
  const [count, setCount] = useState(0)
  return (
    <button id="cta" onClick={() => setCount((c) => c + 1)}>
      clicks={count}
    </button>
  )
})
`,
  )
  // the client-only island — never server-rendered, its render body never in the server bundle
  await project.write(
    'src/rsc/lonely.tsx',
    `import { root } from '../lib/root.js'
export const LonelyBadge = root.lets('component', 'lonelyBadge').clientOnly().component(() => (
  <div id="lonely">LONELY_CLIENT_MARKER</div>
))
`,
  )
  await project.write(
    'src/rsc/page.tsx',
    `import { root } from '../lib/root.js'
import { RscCta } from './cta.js'
import { LonelyBadge } from './lonely.js'

const ServerInfo = async ({ n }: { n: number }) => {
  return <b id="hero">hero-{n}-SERVER_ONLY_MARKER</b>
}

export const rscPage = root.lets('page', 'rscPage', '/rsc')
  .rscDepth(1)
  .loader(async () => ({
    n: 1,
    hero: <ServerInfo n={7} />,
    cta: <RscCta />,
    lonely: <LonelyBadge />,
  }))
  .page(({ data }) => (
    <main id="rsc-page">
      {data.hero}
      {data.cta}
      {data.lonely}
    </main>
  ))
`,
  )
  await project.write(
    'src/rsc/warm.tsx',
    `import { root } from '../lib/root.js'
import { RscCta } from './cta.js'
export const promoQuery = root.lets('query', 'promo')
  .rscDepth(1)
  .loader(async () => ({ hero: <b id="hero-w">W!</b>, cta: <RscCta /> }))
  .query()
export const warmPage = root.lets('page', 'warmPage', '/warm')
  .onPrefetchPage(async () => {
    await promoQuery.prefetchQuery()
  })
  .page(() => {
    const query = promoQuery.useQuery()
    return (
      <main id="warm-page">
        {query.data ? (
          <>
            {query.data.hero}
            {query.data.cta}
          </>
        ) : (
          <span id="warm-pending">pending</span>
        )}
      </main>
    )
  })
`,
  )
}

const bootRscProject = async (
  tpf: TestProjectOneClientFactory,
  options: { spawn?: 'dev' | 'none' } = {},
): Promise<TestProjectOneClient> => {
  let tp: TestProjectOneClient | undefined
  const tries = 3
  for (let tryIndex = 0; tryIndex < tries; tryIndex++) {
    tp = tpf.create()
    try {
      await tp.cleanup('ports')
      await tp.init()
      await writeRscPages(tp)
      if (options.spawn !== 'none') {
        tp.spawn(['bun', 'run', 'dev'])
        await tp.waitStarted()
      }
      break
    } catch (error) {
      await tp.cleanup({ files: true, processes: true, ports: true })
      if (tryIndex === tries - 1) {
        throw error
      }
    }
  }
  return tp!
}

// ——— The shared assertion bodies. Each runs identically against the bun and vite projects: the
// observable RSC contract (SSR html, hydration, islands, strip, chunks, manifest, preloads) must
// not depend on the bundler. ———

// SSR html: server component and island rendered, clientOnly island absent, payload encoded.
const expectRscSsrHtml = async (tp: TestProjectOneClient) => {
  const html = await tp.fetchServerHtml('/rsc')
  // the server component rendered on the server
  expect(html).toContain('SERVER_ONLY_MARKER')
  // the island server-rendered with its initial state
  expect(html).toContain('clicks=')
  // the `.clientOnly()` island did NOT server-render
  expect(html).not.toContain('LONELY_CLIENT_MARKER')
  // the dehydrated payload carries encoded elements and component references by name
  expect(html).toContain('__p0e')
  expect(html).toContain('rscCta')
  expect(html).toContain('lonelyBadge')
}

// Direct load: hydration is clean, no refetch, islands interactive, clientOnly appears after
// hydration.
const expectRscDirectLoadFlow = async (tp: TestProjectOneClient) => {
  const page = await tp.gotoServer('/rsc')
  await page.waitContent('#hero', 15000)
  await page.waitContent('clicks=0', 15000)
  // the clientOnly island renders only in the browser — after hydration
  await page.waitContent('LONELY_CLIENT_MARKER', 15000)
  await page.stable
  // the page loader data shipped in the dehydrated store — the client must not refetch it
  expect(page.requestsTale).not.toContain('page.rsc-page (data)')
  // boundaries can mask hydration mismatches — the client logs them explicitly, catch that
  const logsText = page.strlogs.join('\n')
  expect(logsText).not.toContain('recoverable hydration/render error')
  expect(logsText).not.toContain('Hydration')
  expect(logsText).not.toContain('RSC:')
  // the island is ALIVE: its handler works after hydration
  await page.original.click('#cta')
  await page.waitContent('clicks=1', 10000)
  await page.close()
}

// onPrefetchPage warm-up: the RSC query ships warm — zero client refetch. Also the sharpest probe
// of the server-side client-points collection (eager on the server): the warmed payload survives
// a server-cache decode → encode roundtrip into the SSR embed without suspending.
const expectRscWarmFlow = async (tp: TestProjectOneClient) => {
  // the warmed query renders into the SSR html — no pending fallback anywhere
  const warmHtml = await tp.fetchServerHtml('/warm')
  expect(warmHtml).toContain('hero-w')
  expect(warmHtml).not.toContain('warm-pending')
  const page = await tp.gotoServer('/warm')
  await page.waitContent('#hero-w', 15000)
  await page.waitContent('clicks=0', 15000)
  await page.stable
  // the whole point of the warm-up: the query was prefetched on the server, travelled in the
  // dehydrated state, and the client never asked for it
  expect(page.requestsTale).not.toContain('query.promo')
  const logsText = page.strlogs.join('\n')
  expect(logsText).not.toContain('recoverable hydration/render error')
  expect(logsText).not.toContain('Hydration')
  // the island inside the warmed payload is interactive
  await page.original.click('#cta')
  await page.waitContent('clicks=1', 10000)
  await page.close()
}

// Client navigation: the loader is fetched over the wire, elements decode, the island lives.
const expectRscClientNavigationFlow = async (tp: TestProjectOneClient) => {
  const page = await tp.gotoServer('/')
  await page.waitContent('#home')
  await page.original.getByRole('link', { name: 'go-rsc', exact: true }).click()
  await page.waitContent('#hero', 15000)
  await page.waitContent('LONELY_CLIENT_MARKER', 15000)
  // this time the loader went over the wire as a client fetch (decode path, not hydration)
  expect(page.requestsTale).toContain('page.rsc-page (data)')
  await page.original.click('#cta')
  await page.waitContent('clicks=1', 10000)
  const logsText = page.strlogs.join('\n')
  expect(logsText).not.toContain('RSC:')
  await page.close()
}

// Strip guarantees: server code never in the client bundle, clientOnly render never in the server
// bundle.
const expectRscStripGuarantees = async (tp: TestProjectOneClient) => {
  const distServer = await tp.getDistServerFilesContent()
  const distClient = await tp.getDistClientFilesContent()
  // the server component (and the whole loader) exists on the server…
  expect(distServer).toContain('SERVER_ONLY_MARKER')
  // …and never ships to the browser
  expect(distClient).not.toContain('SERVER_ONLY_MARKER')
  // the `.clientOnly()` island's render exists in the client bundle…
  expect(distClient).toContain('LONELY_CLIENT_MARKER')
  // …and is cut from the server bundle
  expect(distServer).not.toContain('LONELY_CLIENT_MARKER')
  // the interactive island's code is in the client bundle (it renders in the browser)
  expect(distClient).toContain('clicks=')
}

// A component point in its own file becomes its own chunk, listed in the preload manifest.
const expectRscComponentChunkManifest = async (tp: TestProjectOneClient) => {
  const manifest = (await Bun.file(tp.resolve('dist/client/_point0/root/preload-manifest.json')).json()) as {
    entry: string | null
    byComponent?: Record<string, string[]>
  }
  // both islands got per-component manifest entries pointing at real chunk files
  expect(Object.keys(manifest.byComponent ?? {}).sort()).toEqual(['lonelyBadge', 'rscCta'])
  for (const files of Object.values(manifest.byComponent ?? {})) {
    expect(files.length).toBeGreaterThan(0)
    for (const file of files) {
      expect(file).not.toBe(manifest.entry)
      expect(await Bun.file(tp.resolve(`dist/client${file}`)).exists()).toBe(true)
    }
  }
  // the island code lives in ITS chunk, not in the entry
  const entryContent = await Bun.file(tp.resolve(`dist/client${manifest.entry}`)).text()
  expect(entryContent).not.toContain('clicks=')
  const ctaChunkFiles = manifest.byComponent!.rscCta!
  const ctaChunksContent = (
    await Promise.all(ctaChunkFiles.map(async (file) => await Bun.file(tp.resolve(`dist/client${file}`)).text()))
  ).join('\n')
  expect(ctaChunksContent).toContain('clicks=')
}

// Production flow: modulepreload for referenced islands, hydration clean, islands interactive.
const expectRscProductionFlow = async (tp: TestProjectOneClient) => {
  const engine = await tp.importEngine()
  tp.spawn(['bun', 'run', 'start'])
  await tp.waitStarted(engine.server.port)
  const html = await tp.fetchServerHtml('/rsc')
  // per-payload modulepreload links for the referenced islands (prod-build-only feature)
  expect(html).toContain('rel="modulepreload"')
  expect(html).toContain('SERVER_ONLY_MARKER')
  expect(html).not.toContain('LONELY_CLIENT_MARKER')

  const page = await tp.gotoServer('/rsc')
  await page.waitContent('clicks=0', 15000)
  await page.waitContent('LONELY_CLIENT_MARKER', 15000)
  await page.stable
  const logsText = page.strlogs.join('\n')
  expect(logsText).not.toContain('recoverable hydration/render error')
  expect(logsText).not.toContain('Hydration')
  expect(logsText).not.toContain('RSC:')
  await page.original.click('#cta')
  await page.waitContent('clicks=1', 10000)
  await page.close()
}

describe('rsc e2e (browser, dev)', () => {
  const tpf = TestProjectOneClientFactory.create({
    namespace: 'rsc',
    portsRange: [4100, 4124],
  })
  let tp: TestProjectOneClient

  beforeAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
    tpf.setBrowser(await PlaywrightBrowser.init())
    tp = await bootRscProject(tpf)
    // warm the dev bundler so hydration timings never race a cold compile
    await tp.fetchServerHtml('/rsc')
  }, 180000)

  afterAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
  })

  it('SSR html: server component and island rendered, clientOnly island absent, payload encoded', async () => {
    await expectRscSsrHtml(tp)
  })

  it('direct load: hydration is clean, no refetch, islands interactive, clientOnly appears after hydration', async () => {
    await expectRscDirectLoadFlow(tp)
  })

  it('onPrefetchPage warm-up: the RSC query ships warm — zero client refetch', async () => {
    await expectRscWarmFlow(tp)
  })

  it('client navigation: the loader is fetched over the wire, elements decode, the island lives', async () => {
    await expectRscClientNavigationFlow(tp)
  })
})

describe('rsc e2e (build)', () => {
  const tpf = TestProjectOneClientFactory.create({
    namespace: 'rsc-build',
    portsRange: [4125, 4149],
  })
  let tp: TestProjectOneClient

  beforeAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
    tpf.setBrowser(await PlaywrightBrowser.init())
    tp = await bootRscProject(tpf, { spawn: 'none' })
    const bp = tp.spawn(['bun', 'run', 'build'])
    await bp.exited
  }, 240000)

  afterAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
  })

  it('strip guarantees: server code never in the client bundle, clientOnly render never in the server bundle', async () => {
    await expectRscStripGuarantees(tp)
  })

  it('a component point in its own file becomes its own chunk, listed in the preload manifest', async () => {
    await expectRscComponentChunkManifest(tp)
  })

  it('production flow: modulepreload for referenced islands, hydration clean, islands interactive', async () => {
    await expectRscProductionFlow(tp)
  })
})

// The vite bundler runs the same contract: the client (and, in vite mode, the server too) is
// bundled by vite, SSR in dev runs through the vite module runner, chunk splitting comes from the
// aggregator's dynamic imports, and the preload manifest is fed by the rollup chunk graph.
describe('rsc e2e (browser, vite dev)', () => {
  const tpf = TestProjectOneClientFactory.create({
    namespace: 'rsc-vite',
    portsRange: [4150, 4174],
    vite: true,
  })
  let tp: TestProjectOneClient

  beforeAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
    tpf.setBrowser(await PlaywrightBrowser.init())
    tp = await bootRscProject(tpf)
    // warm the dev bundler so hydration timings never race a cold compile
    await tp.fetchServerHtml('/rsc')
  }, 180000)

  afterAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
  })

  it('SSR html: server component and island rendered, clientOnly island absent, payload encoded', async () => {
    await expectRscSsrHtml(tp)
  })

  it('direct load: hydration is clean, no refetch, islands interactive, clientOnly appears after hydration', async () => {
    await expectRscDirectLoadFlow(tp)
  })

  it('onPrefetchPage warm-up: the RSC query ships warm — zero client refetch', async () => {
    await expectRscWarmFlow(tp)
  })

  it('client navigation: the loader is fetched over the wire, elements decode, the island lives', async () => {
    await expectRscClientNavigationFlow(tp)
  })
})

describe('rsc e2e (vite build)', () => {
  const tpf = TestProjectOneClientFactory.create({
    namespace: 'rsc-vite-build',
    portsRange: [4175, 4199],
    vite: true,
  })
  let tp: TestProjectOneClient

  beforeAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
    tpf.setBrowser(await PlaywrightBrowser.init())
    tp = await bootRscProject(tpf, { spawn: 'none' })
    const bp = tp.spawn(['bun', 'run', 'build'])
    await bp.exited
  }, 240000)

  afterAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
  })

  it('strip guarantees: server code never in the client bundle, clientOnly render never in the server bundle', async () => {
    await expectRscStripGuarantees(tp)
  })

  it('a component point in its own file becomes its own chunk, listed in the preload manifest', async () => {
    await expectRscComponentChunkManifest(tp)
  })

  it('production flow: modulepreload for referenced islands, hydration clean, islands interactive', async () => {
    await expectRscProductionFlow(tp)
  })
})
