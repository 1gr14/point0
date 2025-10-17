import type { Route0 } from '@devp0nt/route0'
import React from 'react'
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

export async function hydrate({ pages, after }: { pages: ClientPages; after?: AfterHydrateFn }) {
  const payload = (() => {
    const payloadEl = document.getElementById('__PAGE0_PAYLOAD__')
    const payloadContent = payloadEl?.textContent
    if (!payloadContent) {
      return null
    }
    return JSON.parse(payloadEl.textContent)
  })()
  if (!payload) {
    throw new Error('Missing __PAGE0_PAYLOAD__')
  }

  const { clientPage0, location } = await ClientPage0._getSuitable({
    routePath: payload.location.href,
    clientPages: pages,
  })
  if (!clientPage0) {
    throw new Error(`Page not found`)
  }
  const PageComponent = clientPage0.getComponent()
  const rootEl = document.getElementById('root')
  if (!rootEl) {
    throw new Error('Element #root not found')
  }
  const reactEl = React.createElement(PageComponent, { data: payload.data, location })

  if (rootEl.hasChildNodes()) {
    hydrateRoot(rootEl, reactEl)
  } else {
    createRoot(rootEl).render(reactEl)
  }

  if (after) {
    await after({ payload, clientPage0, location, rootEl, reactEl })
  }
}
