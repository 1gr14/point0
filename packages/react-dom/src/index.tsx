import { createElement } from 'react'
import type { Root } from 'react-dom/client'
import { createRoot, hydrateRoot } from 'react-dom/client'
import type { LazyPointsModule, ReadyPointsModule } from '@point0/core/points-manager'
import { PointsManager } from '@point0/core/points-manager'
import { ExtractorStore } from '@point0/core/extractor-store'

let reactRoot: Root | null = null

export function mount(
  App: AppComponent,
  points: LazyPointsModule | ReadyPointsModule,
  domRootElement?: HTMLElement | null,
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

  if (typeof window !== 'undefined' && typeof (window as any)?.__POINT0_DEHYDRATED_EXTRACTOR_STORE__ !== 'undefined') {
    ExtractorStore.hydrateFromString((window as any).__POINT0_DEHYDRATED_EXTRACTOR_STORE__)
  }
  const appElement = createElement(App, {
    points: PointsManager.create(points),
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

// we have absolutly same type in @point0/core/types, so if somebody need it, get it from there
type AppProps = { points: PointsManager }
type AppComponent = (props: AppProps) => React.ReactElement

// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (import.meta.hot) {
  import.meta.hot.accept()
}
