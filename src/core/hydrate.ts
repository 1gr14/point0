import type { AnyLocation } from '@devp0nt/route0'
import type { DehydratedState } from '@tanstack/react-query'
import { createElement } from 'react'
import type { Root } from 'react-dom/client'
import { createRoot, hydrateRoot } from 'react-dom/client'
import type { Payload } from './eversion.js'
import type { Points } from './points.js'

export type HydrateResult = {
  payload: Payload
  rootElement: HTMLElement
  appElement: React.ReactElement
}
export type HydratedAppProps = {
  ssrLocation: AnyLocation | undefined
  dehydratedState: DehydratedState | undefined
  points: Points
}
export type HydratedAppComponent = (props: HydratedAppProps) => React.ReactElement

let root: Root | null = null
let result: HydrateResult | null = null

export function hydrate(App: HydratedAppComponent, points: Points, rootElement?: HTMLElement | null): HydrateResult {
  // if (result) {
  //   return result
  // }
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

  const appElement = createElement(App, {
    dehydratedState: payload.dehydratedState,
    ssrLocation: payload.location,
    points,
  })

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

  result = { payload, rootElement, appElement }
  return result
}
