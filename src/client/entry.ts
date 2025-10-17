import type { Route0 } from '@devp0nt/route0'
import React from 'react'
import type { Root } from 'react-dom/client'
import { createRoot, hydrateRoot } from 'react-dom/client'
import type { AnyClientPage0, ClientPages } from '../client/page.js'
import { ClientPage0 } from '../client/page.js'
import type { Payload } from '../shared/types.js'

declare global {
  interface Window {
    __PAGE0_PAYLOAD__?: Payload
  }
}

export type AfterHydrateFnProps = {
  payload: Payload
  clientPage0: AnyClientPage0
  location: Route0.Location
  rootEl: HTMLElement
  reactEl: React.ReactNode
}
export type AfterHydrateFn = (props: AfterHydrateFnProps) => any

let root: Root | null = null
let hasHydrated = false

export async function hydrate({ clientPages, after }: { clientPages: ClientPages; after?: AfterHydrateFn }) {
  const payloadEl = document.getElementById('__PAGE0_PAYLOAD__')
  const payloadContent = payloadEl?.textContent
  if (!payloadContent) throw new Error('Missing __PAGE0_PAYLOAD__')

  const payload: Payload = JSON.parse(payloadContent)

  const { clientPage0, location } = await ClientPage0._getSuitable({
    routePath: payload.location.href,
    clientPages,
  })
  if (!clientPage0) throw new Error(`Page not found`)

  const PageComponent = clientPage0.getComponent()
  const rootEl = document.getElementById('root')
  if (!rootEl) throw new Error('Element #root not found')

  const reactEl = React.createElement(PageComponent, { data: payload.data, location })

  // 🟢 Hydrate only once (initial load)
  if (!hasHydrated && rootEl.hasChildNodes()) {
    root = hydrateRoot(rootEl, reactEl)
    hasHydrated = true
  } else {
    // 🟢 For HMR (subsequent calls), just re-render client-side
    root ||= createRoot(rootEl)
    root.render(reactEl)
  }

  if (after) {
    await after({ payload, clientPage0, location, rootEl, reactEl })
  }
}
