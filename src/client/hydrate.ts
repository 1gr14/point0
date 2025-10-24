import type React from 'react'
import type { Payload } from '../eversion/runtime.js'
import { mount, type MountResult } from './mount.js'

export type HydrateResult = MountResult & {
  payload: Payload
}

export async function hydrate(App: React.ComponentType, rootElement?: HTMLElement | null): Promise<HydrateResult> {
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

  const { rootElement: mountedRootElement, appElement } = await mount(App, rootElement)

  return { payload, rootElement: mountedRootElement, appElement }
}
