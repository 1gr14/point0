// hydrate.tsx
//
// What this does
// 1) Reads the SSR payload from the DOM.
// 2) Asks Point0 to build the correct page element for the current route.
// 3) On the very first run: hydrates if SSR markup exists, otherwise mounts.
// 4) On subsequent runs (e.g., HMR): re-renders into the existing root so React
//    can preserve component state (via React Refresh / Fast Refresh).
//
// Notes
// - State loss during HMR typically happens if you recreate the *root* or swap
//   component types / keys. This file keeps the same root and just calls render().
// - The HMR “bridge” at the bottom is OPTIONAL (see the comment there).
//   You can keep it or remove it depending on your bundler setup.

import type { Route0 } from '@devp0nt/route0'
import type React from 'react'
import type { Root } from 'react-dom/client'
import { createRoot, hydrateRoot } from 'react-dom/client'
import type { AnyPoint, Payload, PointsCollection } from './index.js'
import { Point0 } from './index.js'

declare global {
  interface Window {
    __POINT0_PAYLOAD__?: Payload
    // If you want to re-use the same routes on HMR (see optional block below):
    __POINT0_POINTS__?: PointsCollection
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

// Keep the React root across calls so state can be preserved.
let root: Root | null = null

// Keep the last args so the OPTIONAL HMR bridge can re-run hydrate with the same inputs.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- used by commented out HMR "bridge" in end of this file
let lastArgs: { points: PointsCollection; after?: AfterHydrateFn } | null = null

export async function hydrate({ points, after }: { points: PointsCollection; after?: AfterHydrateFn }) {
  lastArgs = { points, after }

  // 1) Read payload from the DOM (SSR embeds this as a script tag with this id).
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

  // 2) Find the SSR container.
  const rootElement = document.getElementById('root')
  if (!rootElement) throw new Error('Element #root not found')

  // 3) Ask point0 to build the correct page element for the current route.
  const { element, error, point, location } = await Point0.fillSuitablePageElement({
    routePath: payload.location.href,
    points,
    payload,
  })
  if (error) {
    // Log but don’t crash the app on route resolution issues.
    console.error(error)
  }

  // 4) First invocation: create the root once.
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

  // 5) Post-hook (optional per-call logic your app wants to run).
  if (after) {
    await after({ payload, point, location, rootElement, element })
  }
}

/* -----------------------------------------------------------------------------
   OPTIONAL: HMR "bridge"
   - Use this if your bundler doesn’t automatically re-run your entry on module updates
     and you want to re-invoke `hydrate()` with the same arguments upon HMR.
   - If you’re on Vite with @vitejs/plugin-react (Fast Refresh), you can KEEP this or REMOVE it.
     Fast Refresh already patches components in place; this bridge just ensures `hydrate`
     is called again when this module is hot-updated so your route tree is rebuilt.
   - If you remove it and everything still hot-updates fine with state preserved, great —
     you don’t need it in your setup.
----------------------------------------------------------------------------- */
// if (typeof import.meta !== 'undefined' && (import.meta as any).hot) {
//   ;(import.meta as any).hot.accept((newModule: any) => {
//     const args = lastArgs ?? ((window as any).__POINT0_POINTS__ && { points: (window as any).__POINT0_POINTS__ })
//     if (args && typeof newModule?.hydrate === 'function') {
//       // Re-run hydrate using the latest module code but SAME root, preserving state.
//       newModule.hydrate(args)
//     } else if (args) {
//       // Fallback: re-run our own hydrate if the binding wasn’t replaced.
//       void hydrate(args as { points: PointsCollection; after?: AfterHydrateFn })
//     }
//   })
// }
