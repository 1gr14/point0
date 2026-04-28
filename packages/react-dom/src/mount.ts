import { ClientPoints, superstore } from '@point0/core'
import type { PointsDefinition, PointsManager } from '@point0/core'
import type * as React from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'

let reactRoot: Root | null = null

export function mount(
  element: React.ReactElement,
  points: PointsDefinition<any, any> | PointsManager<any, any, any>,
  { domRootElement }: { domRootElement?: HTMLElement | null } = {},
) {
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

  const clientPoints = ClientPoints.createFromDefintion(points)
  clientPoints.mount()
  const __POINT0_DEHYDRATED_SUPER_STORE__ =
    typeof window !== 'undefined' &&
    (
      window as unknown as {
        __POINT0_DEHYDRATED_SUPER_STORE__: string | undefined
      }
    ).__POINT0_DEHYDRATED_SUPER_STORE__
  if (__POINT0_DEHYDRATED_SUPER_STORE__) {
    superstore.prepare(__POINT0_DEHYDRATED_SUPER_STORE__, clientPoints.transformer)
  }

  // First invocation: create the root once.
  //    - If SSR markup exists, hydrate.
  //    - If not, do a client-side mount.
  if (!reactRoot) {
    if (domRootElement.hasChildNodes()) {
      reactRoot = hydrateRoot(domRootElement, element)
    } else {
      reactRoot = createRoot(domRootElement)
      reactRoot.render(element)
    }
  } else {
    // Subsequent invocations (e.g., HMR updates):
    // Don’t recreate the root; just render the new element tree.
    // With React Fast Refresh, this preserves hook state when component boundaries match.
    reactRoot.render(element)
  }
}
