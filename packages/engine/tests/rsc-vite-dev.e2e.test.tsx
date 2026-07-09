// RSC browser e2e — a real dev/prod server + a real Chromium. The four rsc-*.e2e files split what used
// to be one file so each solo CI runner launches exactly ONE browser (a single file carried 4 launches =
// 4× the launch-flake exposure, and one bad describe cascaded into the rest). The fixture pages, project
// boot and every shared assertion body live in ./utils/rsc-e2e.tsx — the same assertions run against the
// bun and vite projects, proving the RSC contract is bundler-independent. In-process RSC coverage (no
// browser) is rsc.int.test.tsx; this lane covers what it cannot: real hydration, interactivity, chunks.

import { afterAll, beforeAll, describe, it, setDefaultTimeout } from 'bun:test'
import { PlaywrightBrowser } from './utils/playwright.js'
import type { TestProjectOneClient } from './utils/project.one-client.js'
import { TestProjectOneClientFactory } from './utils/project.one-client.js'
import {
  bootRscProject,
  expectDeferErrorFallbackSsrFlow,
  expectDeferErrorFnFlow,
  expectDeferIslandSsrDeadFlow,
  expectNestedIslandLoadersFlow,
  expectPromisePropClientNavFlow,
  expectPromisePropSsrFlow,
  expectRscClientNavigationFlow,
  expectRscDeferFlow,
  expectRscDeferIslandClientNavFlow,
  expectRscDirectLoadFlow,
  expectRscNestedIslandFlow,
  expectRscSsrHtml,
  expectRscWarmFlow,
  expectSelfSuspendIslandSsrFlow,
  expectSuspendIslandSsrFlow,
} from './utils/rsc-e2e.js'

setDefaultTimeout(60000)

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

  it('deferred holes: three server subtrees stream into the shell, display, and hydrate with no refetch', async () => {
    await expectRscDeferFlow(tp)
  })

  it('an island nested inside a server component hydrates and is interactive (nesting is not the limitation)', async () => {
    await expectRscNestedIslandFlow(tp)
  })

  it('client-fetch defer hole: an interactive island inside a streamed hole is live (clickable) on client navigation', async () => {
    await expectRscDeferIslandClientNavFlow(tp)
  })

  it('SSR: an island streamed via a suspend:server query IS interactive on first load (unlike a defer hole)', async () => {
    await expectSuspendIslandSsrFlow(tp)
  })

  it('SSR limitation: an island inside a defer hole is NOT interactive on first load', async () => {
    await expectDeferIslandSsrDeadFlow(tp)
  })

  it('SSR: an island with its OWN suspend:server loader IS interactive on first load', async () => {
    await expectSelfSuspendIslandSsrFlow(tp)
  })

  it("SSR: defer()'s 3rd arg renders a per-hole error fallback when the subtree throws (page survives)", async () => {
    await expectDeferErrorFallbackSsrFlow(tp)
  })

  it('islands within islands: an island with its own loader, nested in an island with its own loader, both hydrate and stay interactive', async () => {
    await expectNestedIslandLoadersFlow(tp)
  })

  it("SSR: defer()'s 3rd arg as a FUNCTION renders the typed error's code (error-class fix, browser)", async () => {
    await expectDeferErrorFnFlow(tp)
  })

  it('promise props: an island with a streaming promise prop is LIVE on the first SSR paint (both fill orders)', async () => {
    await expectPromisePropSsrFlow(tp)
  })

  it('promise props: on a client navigation the island mounts live, the value streams in, state survives the fill', async () => {
    await expectPromisePropClientNavFlow(tp)
  })
})
