import { afterAll, beforeAll, describe, expect, it, setDefaultTimeout } from 'bun:test'
import type { PlaywrightPage } from './utils/playwright.js'
import { PlaywrightBrowser } from './utils/playwright.js'
import type { TestProjectOneClient } from './utils/project.one-client.js'
import { TestProjectOneClientFactory } from './utils/project.one-client.js'

setDefaultTimeout(45000)

const tpf = TestProjectOneClientFactory.create({
  namespace: 'scroll-restoration',
  portsRange: [3800, 3899],
})

// Fixture geometry. Tall pages scroll far beyond the viewport; the short page doesn't scroll at
// all (that's what makes the clamp scenario meaningful); the anchor sits deep enough that a jump
// to it is unambiguous.
const tallHeight = 5000
const anchorOffset = 2000
const slowLoaderDuration = 300

const layoutTsx = `import { root } from '../lib/root.js'
import { Link } from '../lib/navigate.js'
export const layout = root.lets('layout', 'scrollLayout', '/scroll')
  .layout(({ children }) => (
    <>
      <nav>
        <Link id="nav-home" to="/scroll">home</Link>
        <Link id="nav-other" to="/scroll/other">other</Link>
        <Link id="nav-short" to="/scroll/short">short</Link>
        <Link id="nav-anchors" to="/scroll/anchors">anchors</Link>
        <Link id="nav-anchors-hash" to="/scroll/anchors#target">anchors#target</Link>
        <Link id="nav-slow" to="/scroll/slow">slow</Link>
      </nav>
      {children}
    </>
  ))
`

const pageHomeTsx = `import { layout } from './layout.js'
import { setSearch } from '@point0/core/navigation'
export const scrollHomePage = layout.lets('page', 'scrollHome', '/').page(() => (
  <div id="scroll-home">
    <button id="set-search" onClick={() => setSearch({ q: 'x' })}>set search</button>
    <div style={{ height: ${tallHeight} }}>home</div>
  </div>
))
`

const pageOtherTsx = `import { layout } from './layout.js'
export const scrollOtherPage = layout.lets('page', 'scrollOther', 'other').page(() => (
  <div id="scroll-other"><div style={{ height: ${tallHeight} }}>other</div></div>
))
`

const pageShortTsx = `import { layout } from './layout.js'
export const scrollShortPage = layout.lets('page', 'scrollShort', 'short').page(() => (
  <div id="scroll-short">short</div>
))
`

const pageAnchorsTsx = `import { layout } from './layout.js'
import { Link } from '../lib/navigate.js'
export const scrollAnchorsPage = layout.lets('page', 'scrollAnchors', 'anchors').page(() => (
  <div id="scroll-anchors">
    <Link id="in-page-anchor" to="#target">to target</Link>
    <div style={{ height: ${anchorOffset} }}>spacer</div>
    <div id="target">target</div>
    <div style={{ height: ${tallHeight} }}>tail</div>
  </div>
))
`

// clientLoader delays the tall content, so right after a reload the document is short and a deep
// restore clamps — the retry has to land it once the content arrives.
const pageSlowTsx = `import { layout } from './layout.js'
export const scrollSlowPage = layout.lets('page', 'scrollSlow', 'slow')
  .clientLoader(async () => {
    await new Promise((r) => setTimeout(r, ${slowLoaderDuration}))
    return { x: 1 }
  })
  .page(({ data }) => (
    <div id="scroll-slow"><div style={{ height: ${tallHeight} }}>slow {data.x}</div></div>
  ))
`

const getScrollY = async (page: PlaywrightPage): Promise<number> => {
  return await page.original.evaluate(() => window.scrollY)
}

// Click through the DOM, not through Playwright's mouse: `page.click` first scrolls the target
// into view, and with the nav at the top of the page that resets the very scroll position whose
// capture these tests assert.
const clickLink = async (page: PlaywrightPage, selector: string): Promise<void> => {
  await page.original.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!(el instanceof HTMLElement)) {
      throw new Error(`No element for selector: ${sel}`)
    }
    el.click()
  }, selector)
}

const scrollTo = async (page: PlaywrightPage, y: number): Promise<void> => {
  await page.original.evaluate((toY) => window.scrollTo(0, toY), y)
}

// Scroll events dispatch asynchronously (in the rendering steps), so the continuous capture sees
// a programmatic scroll only on the next frame. Before a history traversal, let that frame pass —
// like a real user, who can't scroll and hit Back inside a single frame. (Programmatic pushes and
// reloads don't need this: they capture synchronously at the commit / on pagehide.)
const settleCapture = async (page: PlaywrightPage): Promise<void> => {
  await page.original.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null)))),
  )
}

// Restores can retry for up to ~1s while content renders, and smooth anchor jumps animate — poll
// instead of asserting a single read.
const waitScrollY = async (
  page: PlaywrightPage,
  isExpected: (y: number) => boolean,
  expectation: string,
  timeout = 5000,
): Promise<number> => {
  const start = Date.now()
  let last = -1
  while (Date.now() - start < timeout) {
    last = await getScrollY(page)
    if (isExpected(last)) {
      return last
    }
    await new Promise((r) => setTimeout(r, 50))
  }
  throw new Error(`Timeout waiting for scrollY ${expectation}, last seen ${last}`)
}
const waitScrollYNear = async (page: PlaywrightPage, expected: number, timeout?: number): Promise<number> =>
  await waitScrollY(page, (y) => Math.abs(y - expected) <= 2, `≈ ${expected}`, timeout)

describe('scroll-restoration', () => {
  let tp: TestProjectOneClient

  beforeAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
    tpf.setBrowser(await PlaywrightBrowser.init())
    tp = tpf.create({ ssr: true })
    const tries = 3
    for (let tryIndex = 0; tryIndex < tries; tryIndex++) {
      try {
        await tp.cleanup('ports')
        await tp.init()
        await tp.write('src/scroll/layout.tsx', layoutTsx)
        await tp.write('src/scroll/home.tsx', pageHomeTsx)
        await tp.write('src/scroll/other.tsx', pageOtherTsx)
        await tp.write('src/scroll/short.tsx', pageShortTsx)
        await tp.write('src/scroll/anchors.tsx', pageAnchorsTsx)
        await tp.write('src/scroll/slow.tsx', pageSlowTsx)
        tp.spawn(['bun', 'run', 'dev'])
        await tp.waitStarted()
        break
      } catch (error) {
        if (tryIndex === tries - 1) {
          throw error
        }
      }
    }
  })

  afterAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
  })

  it('push scrolls to top; back/forward restore the positions', async () => {
    const page = await tp.gotoServer('/scroll')
    await page.waitContent('#scroll-home')
    await scrollTo(page, 800)

    await clickLink(page, '#nav-other')
    await page.waitContent('#scroll-other')
    await waitScrollYNear(page, 0)

    await scrollTo(page, 300)
    await settleCapture(page)
    await page.original.goBack()
    await page.waitContent('#scroll-home')
    await waitScrollYNear(page, 800)

    await page.original.goForward()
    await page.waitContent('#scroll-other')
    await waitScrollYNear(page, 300)
  })

  it('back to a page taller than the current one restores the deep position (no clamp)', async () => {
    const page = await tp.gotoServer('/scroll')
    await page.waitContent('#scroll-home')
    await scrollTo(page, 3500)

    // The short page can't scroll at all: a position captured after its render would clamp to ~0.
    await clickLink(page, '#nav-short')
    await page.waitContent('#scroll-short')
    await waitScrollYNear(page, 0)

    await page.original.goBack()
    await page.waitContent('#scroll-home')
    await waitScrollYNear(page, 3500)
  })

  it('reload restores the position (persisted through sessionStorage)', async () => {
    const page = await tp.gotoServer('/scroll')
    await page.waitContent('#scroll-home')
    await scrollTo(page, 800)

    await page.original.reload()
    await page.waitContent('#scroll-home')
    await waitScrollYNear(page, 800)
  })

  it('reload restores a deep position even while the content is still loading (retry)', async () => {
    const page = await tp.gotoServer('/scroll/slow')
    await page.waitContent('#scroll-slow', 5000)
    await scrollTo(page, 2500)

    // Right after the reload the clientLoader hasn't resolved: the document is short and the
    // restore clamps. The retry must re-apply it once the tall content renders.
    await page.original.reload()
    await page.waitContent('#scroll-slow', 5000)
    await waitScrollYNear(page, 2500)
  })

  it('a fresh load with a #hash is a deep link — jumps to the anchor', async () => {
    const page = await tp.gotoServer('/scroll/anchors#target')
    await page.waitContent('#scroll-anchors')
    await waitScrollY(page, (y) => y > anchorOffset - 500, `> ${anchorOffset - 500} (at the anchor)`)
  })

  it('push to a URL with a #hash jumps to the anchor; back to it restores the position instead', async () => {
    const page = await tp.gotoServer('/scroll')
    await page.waitContent('#scroll-home')

    await clickLink(page, '#nav-anchors-hash')
    await page.waitContent('#scroll-anchors')
    await waitScrollY(page, (y) => y > anchorOffset - 500, `> ${anchorOffset - 500} (at the anchor)`)

    // Leave the anchor, go elsewhere, come back: the remembered position must win over the #hash
    // (the browser's own restoration would jump to the fragment).
    await scrollTo(page, 100)
    await clickLink(page, '#nav-other')
    await page.waitContent('#scroll-other')
    await waitScrollYNear(page, 0)

    await page.original.goBack()
    await page.waitContent('#scroll-anchors')
    await waitScrollYNear(page, 100)
  })

  it('a same-page #hash link scrolls to the anchor without resetting to top first', async () => {
    const page = await tp.gotoServer('/scroll/anchors')
    await page.waitContent('#scroll-anchors')
    await waitScrollYNear(page, 0)

    // Default policy scrolls a current-page anchor smoothly — poll until the animation lands.
    await clickLink(page, '#in-page-anchor')
    await waitScrollY(page, (y) => y > anchorOffset - 500, `> ${anchorOffset - 500} (at the anchor)`)
  })

  it('a search-only change keeps the scroll untouched', async () => {
    const page = await tp.gotoServer('/scroll')
    await page.waitContent('#scroll-home')
    await scrollTo(page, 600)

    await clickLink(page, '#set-search')
    await page.original.waitForURL(/q=x/)
    // Give a would-be scroll reset time to happen before asserting it didn't.
    await new Promise((r) => setTimeout(r, 300))
    expect(await getScrollY(page)).toBe(600)
  })
})
