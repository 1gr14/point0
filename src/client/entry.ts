import React from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import type { ClientPages0 } from '../client/page.js'
import { ClientPage0 } from '../client/page.js'

declare global {
  const window: Window & typeof globalThis
  interface Window {
    __PAGE0_PAYLOAD__?: { url: string; data: any; ctx: any }
  }
}

export async function hydrate({ pages }: { pages: ClientPages0 }) {
  const payload = window.__PAGE0_PAYLOAD__
  if (!payload) {
    console.error('Missing __PAGE0_PAYLOAD__')
    return
  }

  const url = payload.url
  let matchedPage: ClientPage0<any> | undefined
  let location: any

  for (const [route, getPage] of pages) {
    const match = route.match(url)
    if (match.exact) {
      matchedPage = getPage instanceof ClientPage0 ? getPage : await getPage()
      location = match.location
      break
    }
  }

  if (!matchedPage) {
    console.error('No matching page for', url)
    return
  }

  const Component = matchedPage.getComponent()
  const rootElem = document.getElementById('root')!
  const el = React.createElement(Component as any, { data: boot.data, location })

  if (rootElem.hasChildNodes()) {
    hydrateRoot(rootElem, el)
  } else {
    createRoot(rootElem).render(el)
  }

  // 🔥 HMR hook (Bun 1.3)
  if (import.meta.hot) {
    import.meta.hot.accept(() => {
      console.log('[HMR] React page reloaded')
      createRoot(rootElem).render(el)
    })
  }
}
