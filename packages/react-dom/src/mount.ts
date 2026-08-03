import {
  ClientPoints,
  installPushedQueriesReceiver,
  installPushedRscReceiver,
  log,
  markClientHydrationFinished,
  POINT0_DEHYDRATED_SUPER_STORE_GLOBAL,
  rscComponentsRegistry,
  superstore,
} from '@point0/core'
import type { PointsDefinition, PointsManager } from '@point0/core'
import type * as React from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'

let reactRoot: Root | null = null

export function mount(
  element: React.ReactElement,
  points: PointsDefinition<any, any> | PointsManager<any, any, any>,
  {
    domRootElement,
    pageChunkHydrationTimeoutMs = 10_000,
  }: {
    domRootElement?: HTMLElement | null
    /** How long hydration waits for the current page's chunks before proceeding with the shell alone. */
    pageChunkHydrationTimeoutMs?: number
  } = {},
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
  const dehydratedSuperStore =
    typeof window !== 'undefined' &&
    (
      window as unknown as {
        [POINT0_DEHYDRATED_SUPER_STORE_GLOBAL]: string | undefined
      }
    )[POINT0_DEHYDRATED_SUPER_STORE_GLOBAL]
  if (dehydratedSuperStore) {
    superstore.prepare(dehydratedSuperStore, clientPoints.transformer)
  }
  // Streamed suspense-query pushes: replace the prefix's buffering stub with the real receiver and
  // drain what already arrived — before hydrateRoot, so pushed data is in the cache when React
  // hydrates the streamed boundary content (no refetch, no flicker).
  installPushedQueriesReceiver(clientPoints.transformer)
  // Streamed RSC-hole fills (see `defer`): its own channel. The buffered fills (holes whose content
  // arrived before hydration) MUST land before hydrateRoot — a hole still suspended at hydration would
  // leave its server-revealed content INERT (React abandons a revealed boundary whose client child
  // suspends). `finishMount` awaits them alongside the chunk drain below.
  const rscBufferedFillsReady = installPushedRscReceiver(clientPoints.transformer)

  const willHydrate = domRootElement.hasChildNodes()
  // The page/layouts are React.lazy chunks; one still in flight at hydration leaves a dehydrated boundary that the
  // first update client-renders into its FALLBACK — the loading flash on refreshing an SSR'd page. So the current
  // page's chunks join the barrier. Failures fall through (the navigation layer owns chunk recovery), the timeout
  // bounds a hung fetch. A client-only mount skips the wait: with no server HTML the fallback IS the first paint.
  const currentPageReady = willHydrate
    ? Promise.race([
        clientPoints.loadPageByHref(window.location.pathname + window.location.search).catch((error: unknown) => {
          // Falling through must not mean falling silent. This is the FIRST import of that chunk, and on Bun's dev
          // runtime it is the only one that carries a reason: a module that throws while evaluating is cached, so
          // React's own import of it resolves to `null` and dies as a shapeless "reading 'page' of null". Swallow
          // this error and a denied server-only import — or a chunk gone missing after a redeploy — becomes
          // undiagnosable. The reason rides in the message because a console line is what gets copied out.
          const reason = error instanceof Error && error.cause instanceof Error ? error.cause.message : undefined
          log({
            level: 'error',
            category: ['ssr'],
            message: `The current page's chunk failed to load before hydration${reason ? `: ${reason}` : ''}`,
            error,
          })
        }),
        new Promise((resolve) => setTimeout(resolve, pageChunkHydrationTimeoutMs)),
      ])
    : undefined

  const finishMount = (): void => {
    // First invocation: create the root once.
    //    - If SSR markup exists, hydrate.
    //    - If not, do a client-side mount.
    if (!reactRoot) {
      if (willHydrate) {
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
        // No SSR markup to hydrate — seed the hydration-finished flag so `<ClientOnly>` renders its real content at
        // once instead of flashing its fallback for a hydration that never happens.
        markClientHydrationFinished()
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
  // in a microtask when nothing is pending — the overwhelmingly common case. The RSC buffered fills join the barrier
  // so a deferred hole delivered before hydration is filled (its subtree, islands and all) when React hydrates.
  // The current page's own chunks join for the same reason — see `currentPageReady` above.
  void Promise.all([rscComponentsRegistry.drainPending(), rscBufferedFillsReady, currentPageReady]).then(finishMount)
}
