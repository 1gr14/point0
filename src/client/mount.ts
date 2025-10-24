import type { DehydratedState } from '@tanstack/react-query'
import type React from 'react'
import { createElement } from 'react'
import type { Root } from 'react-dom/client'
import { createRoot, hydrateRoot } from 'react-dom/client'
import type { Payload } from '../eversion/runtime.js'
import type { Route0 } from '@devp0nt/route0'

declare global {
  interface Window {
    __POINT0_PAYLOAD__?: Payload
  }
}

export type MountResult = {
  rootElement: HTMLElement
  appElement: React.ReactElement
}

export type AppProps = {
  location?: Route0.Location | undefined
  dehydratedState?: DehydratedState | undefined
}
export type AppComponent = React.ComponentType<AppProps>

// Keep the React root across calls so state can be preserved.
let root: Root | null = null
export async function mount(
  App: AppComponent,
  rootElement?: HTMLElement | null,
  location?: Route0.Location,
  dehydratedState?: DehydratedState,
): Promise<MountResult> {
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

  const appElement = createElement(App, { dehydratedState, location })

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
