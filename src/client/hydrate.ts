import { Route0 } from '@devp0nt/route0'
import { createElement } from 'react'
import type { Root } from 'react-dom/client'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { Eversion0, type Payload, type PointsCollection } from '../eversion/runtime.js'
import type { AppComponent, MountResult } from './mount.js'

export type HydrateResult = MountResult & {
  payload: Payload
}

let root: Root | null = null
export function hydrate({
  App,
  points,
  rootElement,
}: {
  App: AppComponent
  points: PointsCollection
  rootElement?: HTMLElement | null
}): HydrateResult {
  const payloadEl = document.getElementById('__POINT0_PAYLOAD__')
  const payloadContent = payloadEl?.textContent
  if (!payloadContent) {
    throw new Error('Missing __POINT0_PAYLOAD__')
  }
  const payload: Payload = (() => {
    try {
      return JSON.parse(payloadContent)
    } catch (error) {
      throw new Error('Invalid __POINT0_PAYLOAD__', { cause: error })
    }
  })()

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

  const ssrLocation = Eversion0.getSuitablePageLocation({
    points,
    location: Route0.getLocation(window.location.pathname),
  })
  const pages = Eversion0.toClientPagesCollection({
    points,
  })
  const appElement = createElement(App, { dehydratedState: payload.dehydratedState, pages, ssrLocation })

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

  return { payload, rootElement, appElement }
}
