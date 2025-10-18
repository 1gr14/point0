import type { Route0 } from '@devp0nt/route0'
import type React from 'react'
import type { Root } from 'react-dom/client'
import { createRoot, hydrateRoot } from 'react-dom/client'
import type { AnyPoint, Payload, PointsCollection } from './index.js'
import { Point0 } from './index.js'

declare global {
  interface Window {
    __POINT0_PAYLOAD__?: Payload
  }
}

export type AfterHydrateFnProps = {
  payload: Payload
  point: AnyPoint | undefined
  location: Route0.Location
  rootElement: HTMLElement
  element: React.ReactElement
}
export type AfterHydrateFn = (props: AfterHydrateFnProps) => any

let root: Root | null = null
let hasHydrated = false

export async function hydrate({ points, after }: { points: PointsCollection; after?: AfterHydrateFn }) {
  const payloadEl = document.getElementById('__POINT0_PAYLOAD__')
  const payloadContent = payloadEl?.textContent
  if (!payloadContent) throw new Error('Missing __POINT0_PAYLOAD__')
  const payload: Payload = (() => {
    try {
      return JSON.parse(payloadContent)
    } catch (error) {
      throw new Error('Invalid __POINT0_PAYLOAD__', { cause: error })
    }
  })()

  const rootElement = document.getElementById('root')
  if (!rootElement) throw new Error('Element #root not found')

  const { element, error, point, location } = await Point0.fillSuitablePageElement({
    routePath: payload.location.href,
    points,
    payload,
  })
  if (error) {
    console.error(error)
  }

  // 🟢 Hydrate only once (initial load)
  if (!hasHydrated && rootElement.hasChildNodes()) {
    root = hydrateRoot(rootElement, element)
    hasHydrated = true
  } else {
    // 🟢 For HMR (subsequent calls), just re-render client-side
    root ||= createRoot(rootElement)
    root.render(element)
  }

  if (after) {
    await after({ payload, point, location, rootElement, element })
  }
}
