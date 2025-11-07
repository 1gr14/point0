import { createElement } from 'react'
import type { Root } from 'react-dom/client'
import { createRoot, hydrateRoot } from 'react-dom/client'
import type { Points } from './points.js'

export type AppComponent = (props: { points: Points }) => React.ReactElement

let reactRoot: Root | null = null

export function mount(App: AppComponent, points: Points, domRootElement?: HTMLElement | null) {
  if (domRootElement !== undefined) {
    if (!domRootElement) {
      throw new Error(`Provided domRootElement is not found, please provide correct domRootElement`)
    }
  } else {
    domRootElement = document.getElementById('root')
    if (!domRootElement) {
      throw new Error(
        `Element #root not found, please provide domRootElement in input or add #root element to the index.html`,
      )
    }
  }

  const appElement = createElement(App, { points })

  // First invocation: create the root once.
  //    - If SSR markup exists, hydrate.
  //    - If not, do a client-side mount.
  if (!reactRoot) {
    if (domRootElement.hasChildNodes()) {
      reactRoot = hydrateRoot(domRootElement, appElement)
    } else {
      reactRoot = createRoot(domRootElement)
      reactRoot.render(appElement)
    }
  } else {
    // Subsequent invocations (e.g., HMR updates):
    // Don’t recreate the root; just render the new element tree.
    // With React Fast Refresh, this preserves hook state when component boundaries match.
    reactRoot.render(appElement)
  }
}
