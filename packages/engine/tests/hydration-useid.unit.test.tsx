import { describe, expect, it } from 'bun:test'
import { createElement, useId } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

// Regression guard for the SSR hydration mismatch that surfaced as diverging Radix ids, e.g.
//   aria-controls="radix-_R_bcb_"    (server)
//   aria-controls="radix-_R_5m5q_"   (client)
// (Radix issue https://github.com/radix-ui/primitives/issues/3700)
//
// React's `useId` encodes a component's position RELATIVE TO ITS RENDER ROOT. The client hydrates the app at `#root`
// (react-dom/src/mount.ts → hydrateRoot(#root, app)), so on the client the app subtree is the top of the tree. The
// server MUST render the app at the SAME tree position or every `useId` diverges — and React 19.2 turned that latent
// offset into a hard, "won't be patched up" hydration mismatch.
//
// The fix (engine/src/render.ts): the server renders the app as its OWN React root — the `#root` element itself,
// `<div id="root">{app}</div>` — and splices the document shell (`<html><head>…</head><body>…</body></html>`) around
// that stream, instead of nesting the app inside one whole-document React tree. `#root` is a single-child host wrapper,
// so the app subtree gets the same root-relative id it gets when the client hydrates `#root`.

let captured = ''
const IdProbe = () => {
  captured = useId()
  return null
}
const captureId = (element: React.ReactElement): string => {
  captured = ''
  renderToStaticMarkup(element)
  return captured
}

// Exactly what Point0 puts inside #root on the server and hands to hydrateRoot on the client — identical on both sides.
const App = () => (
  <div data-app>
    <IdProbe />
  </div>
)

// SERVER, AFTER THE FIX — mirrors engine/src/render.ts: the `#root` element is the React root, the app its direct child.
const serverUseId = (): string => captureId(createElement('div', { id: 'root' }, createElement(App)))

// CLIENT — mirrors react-dom/src/mount.ts: hydrateRoot(#root, app). `#root` is the container (NOT a React element), so
// the app subtree is the top of the client tree — the same context renderToStaticMarkup gives it as the root element.
const clientUseId = (): string => captureId(createElement(App))

// SERVER, THE OLD BUG — the app nested inside the full document shell (what render.ts did before the fix).
const buggyServerUseId = (): string =>
  captureId(
    <html lang="en">
      <head />
      <body>
        <div id="root">
          <App />
        </div>
        <script id="__POINT0_DEHYDRATED_SUPER_STORE_SCRIPT__" />
      </body>
    </html>,
  )

describe('SSR useId parity across the render/hydrate root boundary', () => {
  it('the app gets the same useId server-rendered as `#root` and hydrated at `#root`', () => {
    // The invariant the fix restores: rendering the app as the `#root` React root (server) yields the same id as
    // rendering it as the client hydration root.
    expect(serverUseId()).toBe(clientUseId())
  })

  it('the `#root` host wrapper is free — the app subtree is root-relative on both sides', () => {
    // `#root` (and the client's transparent wrappers like ErrorBoundary/providers) are single DIRECT children, which
    // React charges no tree-id bits for. So the app subtree is at the tree-id origin on both sides.
    expect(clientUseId()).toBe('_R_0_')
    expect(serverUseId()).toBe('_R_0_')
  })

  it('the old whole-document render shifted the id — the mismatch this fixes', () => {
    // Documents the bug: nesting the app under `<html><body>…` offsets it by the shell's fork structure, so the
    // server id no longer matches the client's root-relative id. Guards against a regression back to that shape.
    expect(buggyServerUseId()).not.toBe(clientUseId())
  })

  it('TRAP: a one-element ARRAY child is NOT free — it must never wrap the app root', () => {
    // The fix relies on passing the app as a DIRECT single child (`createElement(root, props, app)`). A one-element
    // array (`[app]`, or a `.map()` of one) goes through array reconciliation, which pushes a tree-id fork and shifts
    // every id in the subtree — silently re-breaking parity. Pin the distinction so a refactor can't reintroduce it.
    const directChildId = captureId(createElement('div', { id: 'root' }, createElement(App)))
    const arrayChildId = captureId(createElement('div', { id: 'root' }, [createElement(App, { key: 'a' })]))
    expect(directChildId).toBe('_R_0_')
    expect(arrayChildId).not.toBe(directChildId)
  })
})
