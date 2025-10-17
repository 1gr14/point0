import type { Route0 } from '@devp0nt/route0'
import type React from 'react'
import type { Root } from 'react-dom/client'
import { createRoot, hydrateRoot } from 'react-dom/client'
import type { AnyClientPage0, PagesCollection } from '../client/page.js'
import { ClientPage0 } from '../client/page.js'
import type { Payload } from '../shared/types.js'

declare global {
  interface Window {
    __PAGE0_PAYLOAD__?: Payload
  }
}

export type AfterHydrateFnProps = {
  payload: Payload
  page: AnyClientPage0 | undefined
  location: Route0.Location
  rootElement: HTMLElement
  element: React.ReactElement
}
export type AfterHydrateFn = (props: AfterHydrateFnProps) => any

let root: Root | null = null
let hasHydrated = false

export async function hydrate({
  page0,
  pages,
  after,
}: {
  page0?: AnyClientPage0 | undefined // should be required
  pages: PagesCollection
  after?: AfterHydrateFn
}) {
  const payloadEl = document.getElementById('__PAGE0_PAYLOAD__')
  const payloadContent = payloadEl?.textContent
  if (!payloadContent) throw new Error('Missing __PAGE0_PAYLOAD__')
  const payload: Payload = (() => {
    try {
      return JSON.parse(payloadContent)
    } catch (error) {
      throw new Error('Invalid __PAGE0_PAYLOAD__', { cause: error })
    }
  })()

  const rootElement = document.getElementById('root')
  if (!rootElement) throw new Error('Element #root not found')

  const { element, error, page, location } = await ClientPage0.fillSuitableElement({
    routePath: payload.location.href,
    page0,
    pages,
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
    await after({ payload, page, location, rootElement, element })
  }
}
