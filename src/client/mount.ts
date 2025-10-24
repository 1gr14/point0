import type { Route0 } from '@devp0nt/route0'
import type { DehydratedState } from '@tanstack/react-query'
import type React from 'react'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { Eversion0, type PagesCollection, type PointsCollection } from '../eversion/runtime.js'

export type MountResult = {
  rootElement: HTMLElement
  appElement: React.ReactElement
}

export type AppProps = {
  ssrLocation?: Route0.Location | undefined
  dehydratedState?: DehydratedState | undefined
  pages: PagesCollection
}
export type AppComponent = React.ComponentType<AppProps>

export function mount({
  App,
  points,
  rootElement,
}: {
  App: AppComponent
  points: PointsCollection
  rootElement?: HTMLElement | null
}): MountResult {
  if (rootElement !== undefined) {
    if (!rootElement) {
      throw new Error(`Provided rootElement is null, please provide correct rootElement`)
    }
  } else {
    rootElement = document.getElementById('root')
    if (!rootElement) {
      throw new Error(
        `Element #root not found, please provide rootElement in input or add #root element to the index.html`,
      )
    }
  }

  const pages = Eversion0.toClientPagesCollection({
    points,
  })
  const appElement = createElement(App, { pages })

  createRoot(rootElement).render(appElement)

  return { rootElement, appElement }
}
