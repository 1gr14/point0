import type { AnyLocation } from '@devp0nt/route0'
import type { QueryClient } from '@tanstack/react-query'
import { createElement } from 'react'
import type { Root } from 'react-dom/client'
import { createRoot, hydrateRoot } from 'react-dom/client'
import superjson from 'superjson'
import type { GlobalState } from './global-store.js'
import { GlobalStore } from './global-store.js'
import type { Points } from './points.js'
import type { RootPoint } from './types.js'

export type HydratedAppProps = {
  ssrLocation: AnyLocation | undefined
  queryClient: QueryClient
  root: RootPoint
  points: Points
}
export type HydratedAppComponent = (props: HydratedAppProps) => React.ReactElement

let reactRoot: Root | null = null

export function mount({
  App,
  root,
  points,
  domRootElement,
}: {
  App: HydratedAppComponent
  root: RootPoint
  points: Points
  domRootElement?: HTMLElement | null
}) {
  if (domRootElement !== undefined) {
    if (!domRootElement) {
      throw new Error(`Provided domRootElement is null, please provide correct domRootElement`)
    }
  } else {
    domRootElement = document.getElementById('root')
    if (!domRootElement) {
      throw new Error(
        `Element #root not found, please provide domRootElement in input or add #root element to the index.html`,
      )
    }
  }

  const packedGlobalStoreEl = document.getElementById('__PACKED_GLOBAL_STORE__')
  const packedGlobalStoreStringified = packedGlobalStoreEl?.textContent
  if (!packedGlobalStoreStringified) {
    throw new Error('Missing __PACKED_GLOBAL_STORE__')
  }
  const packedGlobalStore: GlobalState = (() => {
    try {
      return superjson.parse(packedGlobalStoreStringified)
    } catch (error) {
      throw new Error('Invalid __PACKED_GLOBAL_STORE__', { cause: error })
    }
  })()
  GlobalStore.unpack(packedGlobalStore)

  const appElement = createElement(App, {
    ssrLocation: undefined,
    queryClient: GlobalStore.get<QueryClient>('queryClient'),
    points,
    root,
  })

  // First invocation: create the root once.
  //    - If SSR markup exists, hydrate.
  //    - If not, do a client-side mount.
  if (!reactRoot) {
    if (domRootElement.hasChildNodes()) {
      reactRoot = hydrateRoot(domRootElement, appElement)
    } else {
      reactRoot = createRoot(domRootElement)
      reactRoot.render(appElement)
    }
  } else {
    // Subsequent invocations (e.g., HMR updates):
    // Don’t recreate the root; just render the new element tree.
    // With React Fast Refresh, this preserves hook state when component boundaries match.
    reactRoot.render(appElement)
  }
}
