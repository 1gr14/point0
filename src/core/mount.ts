import type { AnyLocation } from '@devp0nt/route0'
import type { DehydratedState, QueryClient } from '@tanstack/react-query'
import { hydrate } from '@tanstack/react-query'
import { createElement } from 'react'
import type { Root } from 'react-dom/client'
import { createRoot, hydrateRoot } from 'react-dom/client'
import type { Payload } from './eversion.js'
import type { Points } from './points.js'
import type { RootPoint } from './types.js'
import { GlobalStore } from './global-store.js'

export type HydrateResult = {
  payload: Payload
  domRootElement: HTMLElement
  appElement: React.ReactElement
}
export type HydratedAppProps = {
  ssrLocation: AnyLocation | undefined
  queryClient: QueryClient
  root: RootPoint
  points: Points
}
export type HydratedAppComponent = (props: HydratedAppProps) => React.ReactElement

let reactRoot: Root | null = null
let result: HydrateResult | null = null

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
}): HydrateResult {
  // if (result) {
  //   return result
  // }
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

  const appElement = createElement(App, {
    queryClient: hydrateQueryClient({ dehydratedState: payload.dehydratedState }),
    ssrLocation: payload.location,
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

  result = { payload, domRootElement, appElement }
  return result
}

const hydrateQueryClient = ({ dehydratedState }: { dehydratedState: DehydratedState }) => {
  const queryClient = GlobalStore.get<QueryClient>('queryClient')
  hydrate(queryClient, dehydratedState)

  const prefetchPageQuery = queryClient
    .getQueryCache()
    .getAll()
    .find((q: any) => q.state?.data && typeof q.state.data === 'object' && 'dehydratedState' in q.state.data)

  if (!prefetchPageQuery) {
    return queryClient
  }

  const relatedQueriesDehydratedState = (prefetchPageQuery.state.data as { dehydratedState: DehydratedState })
    .dehydratedState
  hydrate(queryClient, relatedQueriesDehydratedState)

  return queryClient
}
