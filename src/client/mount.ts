import type { Route0 } from '@devp0nt/route0'
import type { DehydratedState } from '@tanstack/react-query'
import type React from 'react'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { Eversion0, type ClientPagesCollection, type PointsCollection } from '../eversion/runtime.js'

export type MountResult = {
  rootElement: HTMLElement
  appElement: React.ReactElement
}

export type AppProps = {
  ssrLocation?: Route0.Location | undefined
  dehydratedState?: DehydratedState | undefined
  pages: ClientPagesCollection
}
export type AppComponent = React.ComponentType<AppProps>

export async function mount({
  App,
  points,
  rootElement,
}: {
  App: AppComponent
  points: PointsCollection
  rootElement?: HTMLElement | null
}): Promise<MountResult> {
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

  const pages = await Eversion0.toPagesCollection({
    points,
  })
  const appElement = createElement(App, { pages })

  createRoot(rootElement).render(appElement)

  return { rootElement, appElement }
}
