import type React from 'react'
import { createElement } from 'react'
import type { Root } from 'react-dom/client'
import { createRoot, hydrateRoot } from 'react-dom/client'
import type { Payload } from '../eversion/runtime.js'

declare global {
  interface Window {
    __POINT0_PAYLOAD__?: Payload
  }
}

export type MountResult = {
  rootElement: HTMLElement
  appElement: React.ReactElement
}

// Keep the React root across calls so state can be preserved.
let root: Root | null = null
export async function mount(App: React.ComponentType, rootElement?: HTMLElement | null): Promise<MountResult> {
  if (rootElement !== undefined) {
    if (!rootElement) {
      throw new Error(`Provided rootElement is null, please provide correct rootElement`)
    }
  } else {
    rootElement = document.getElementById('root')
    if (!rootElement) {
      throw new Error(
        `Element #root not found, please provide rootElement in input or add #root element to the index.html`,
      )
    }
  }

  const appElement = createElement(App)

  // First invocation: create the root once.
  //    - If SSR markup exists, hydrate.
  //    - If not, do a client-side mount.
  if (!root) {
    if (rootElement.hasChildNodes()) {
      root = hydrateRoot(rootElement, appElement)
    } else {
      root = createRoot(rootElement)
      root.render(appElement)
    }
  } else {
    // Subsequent invocations (e.g., HMR updates):
    // Don’t recreate the root; just render the new element tree.
    // With React Fast Refresh, this preserves hook state when component boundaries match.
    root.render(appElement)
  }

  return { rootElement, appElement }
}
