import { ClientPoints, installPushedQueriesReceiver, log, rscComponentsRegistry, superstore } from '@point0/core'
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
  // Streamed suspense-query pushes: replace the prefix's buffering stub with the real receiver and
  // drain what already arrived — before hydrateRoot, so pushed data is in the cache when React
  // hydrates the streamed boundary content (no refetch, no flicker).
  installPushedQueriesReceiver(clientPoints.transformer)

  const finishMount = (): void => {
    // First invocation: create the root once.
    //    - If SSR markup exists, hydrate.
    //    - If not, do a client-side mount.
    if (!reactRoot) {
      if (domRootElement.hasChildNodes()) {
        reactRoot = hydrateRoot(domRootElement, element, {
          // Every mountable is wrapped in an ErrorBoundary now, so a hydration mismatch can be
          // silently masked by a boundary re-render — keep an explicit client-side trace of it.
          onRecoverableError: (error, errorInfo) => {
            log({
              level: 'error',
              category: ['ssr'],
              message: 'Recoverable hydration/render error',
              error,
              meta: { componentStack: errorInfo.componentStack },
            })
          },
        })
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

  // RSC: decoding the dehydrated store may have started component-point chunk imports — mount only with the chunks
  // warm, so hydration renders exactly the tree the server did (the server HTML stays visible meanwhile). Resolves
  // in a microtask when nothing is pending — the overwhelmingly common case.
  void rscComponentsRegistry.drainPending().then(finishMount)
}
