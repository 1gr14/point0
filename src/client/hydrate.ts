import type { Route0 } from '@devp0nt/route0'
import type React from 'react'
import type { Root } from 'react-dom/client'
import { createRoot, hydrateRoot } from 'react-dom/client'
import type { ExtendedPoint, AnyPoint, PagePayload, PointsCollection } from '../core/index.js'
import { Point0 } from '../core/index.js'

declare global {
  interface Window {
    __POINT0_PAYLOAD__?: PagePayload
  }
}

export type HydrateInput = {
  rootElement?: HTMLElement
  points: PointsCollection
  base: ExtendedPoint
}
export type HydrateResult = {
  payload: PagePayload
  point: AnyPoint | undefined
  location: Route0.Location
  rootElement: HTMLElement
  element: React.ReactElement
}

// Keep the React root across calls so state can be preserved.
let root: Root | null = null
export async function hydrate({ points, base, ...input }: HydrateInput): Promise<HydrateResult> {
  // Read payload from the DOM (SSR embeds this as a script tag with this id).
  const payloadEl = document.getElementById('__POINT0_PAYLOAD__')
  const payloadContent = payloadEl?.textContent
  if (!payloadContent) {
    // TODO: throw only if ssr elnabled, else not throw
    throw new Error('Missing __POINT0_PAYLOAD__')
  }

  const payload: PagePayload = (() => {
    try {
      return JSON.parse(payloadContent)
    } catch (error) {
      throw new Error('Invalid __POINT0_PAYLOAD__', { cause: error })
    }
  })()

  // Find the SSR container.
  const rootElement = input.rootElement || document.getElementById('root')
  if (!rootElement) {
    throw new Error(
      `Element #root not found, please provide rootElement in input or add #root element to the index.html`,
    )
  }

  // Ask point0 to build the correct page element for the current route.
  const { point, location } = await Point0.getSuitable({ method: 'get', path: payload.location.href, points })
  const { element, error } = await Point0.fillPage({
    base,
    point,
    payload,
    location,
  })
  if (error) {
    // Log but don’t crash the app on route resolution issues.
    console.error(error)
  }

  // First invocation: create the root once.
  //    - If SSR markup exists, hydrate.
  //    - If not, do a client-side mount.
  if (!root) {
    if (rootElement.hasChildNodes()) {
      root = hydrateRoot(rootElement, element)
    } else {
      root = createRoot(rootElement)
      root.render(element)
    }
  } else {
    // Subsequent invocations (e.g., HMR updates):
    // Don’t recreate the root; just render the new element tree.
    // With React Fast Refresh, this preserves hook state when component boundaries match.
    root.render(element)
  }

  return { payload, point, location, rootElement, element }
}
