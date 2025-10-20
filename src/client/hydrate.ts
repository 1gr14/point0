import type { Route0 } from '@devp0nt/route0'
import type React from 'react'
import type { Root } from 'react-dom/client'
import { createRoot, hydrateRoot } from 'react-dom/client'
import type { AnyClient, AnyPoint, Payload, PointsCollection } from '../core/index.js'
import { Point0 } from '../core/index.js'

declare global {
  interface Window {
    __POINT0_PAYLOAD__?: Payload
  }
}

export type HydrateBeforeCallbackInput = {
  points: PointsCollection
  client: AnyClient
}
export type HydrateBeforeCallback = (props: HydrateBeforeCallbackInput) => any

export type HydrateResult = {
  payload: Payload
  point: AnyPoint | undefined
  location: Route0.Location
  rootElement: HTMLElement
  element: React.ReactElement
}
export type HydrateAfterCallback = (props: HydrateResult) => any

export type HydrateInput = {
  rootId?: string
  points: PointsCollection
  client: AnyClient
  before?: HydrateBeforeCallback
  after?: HydrateAfterCallback
}

// Keep the React root across calls so state can be preserved.
let root: Root | null = null
export async function hydrate({
  rootId = 'root',
  points,
  client,
  before,
  after,
}: HydrateInput): Promise<HydrateResult> {
  if (before) {
    await before({ points, client })
  }

  // Read payload from the DOM (SSR embeds this as a script tag with this id).
  const payloadEl = document.getElementById('__POINT0_PAYLOAD__')
  const payloadContent = payloadEl?.textContent
  if (!payloadContent) {
    // TODO: throw only if ssr elnabled, else not throw
    throw new Error('Missing __POINT0_PAYLOAD__')
  }

  const payload: Payload = (() => {
    try {
      return JSON.parse(payloadContent)
    } catch (error) {
      throw new Error('Invalid __POINT0_PAYLOAD__', { cause: error })
    }
  })()

  // Find the SSR container.
  const rootElement = document.getElementById(rootId)
  if (!rootElement) {
    throw new Error(`Element #${rootId} not found`)
  }

  // Ask point0 to build the correct page element for the current route.
  const { point, location } = await Point0.getSuitable({ routePath: payload.location.href, points })
  const { element, error } = await Point0.fillPage({
    client,
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

  const result = { payload, point, location, rootElement, element }

  // Post-hook (optional per-call logic your app wants to run).
  if (after) {
    await after(result)
  }

  return result
}
