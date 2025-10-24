import { Route0 } from '@devp0nt/route0'
import type { Payload } from '../eversion/runtime.js'
import type { AppComponent, MountResult } from './mount.js'
import { mount } from './mount.js'

export type HydrateResult = MountResult & {
  payload: Payload
}

export async function hydrate(App: AppComponent, rootElement?: HTMLElement | null): Promise<HydrateResult> {
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
  const location = Route0.getLocation(window.location.pathname)

  const { rootElement: mountedRootElement, appElement } = await mount(
    App,
    rootElement,
    location,
    payload.dehydratedState,
  )

  return { payload, rootElement: mountedRootElement, appElement }
}
