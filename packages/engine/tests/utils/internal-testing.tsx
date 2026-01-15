import { act, cleanup, fireEvent, render } from '@testing-library/react'
import nodePath from 'node:path'
import { Engine } from '../../src/engine.js'
import { FakeClient } from '../../src/fake-client.js'
import { QueryClientProvider, type AppComponent, type PointsDefinitionSource } from '@point0/core'
import { Window } from 'happy-dom'
import { Router } from '@point0/wouter'
import { HtmlView } from './html-view.js'
import { ElementViewer } from './element-viewer.js'
import assert from 'node:assert'

// export const getFakeBrowserGlobals = (options: { url?: string } = {}) => {
//   const url = options.url ?? 'http://localhost/'
//   const window = new Window({
//     url,
//   })
//   // Get all enumerable properties from window
//   const globals: Record<string, any> = {}
//   // eslint-disable-next-line guard-for-in
//   for (const key in window) {
//     globals[key] = (window as any)[key]
//   }
//   return globals
// }

export const getFakeBrowserGlobals = (options: { url?: string } = {}) => {
  const url = options.url ?? 'http://localhost/'
  const window = new Window({
    url,
  })
  return {
    window,
    document: window.document,
    navigator: window.navigator,
    location: window.location,
    HTMLElement: window.HTMLElement,
    Node: window.Node,
    DOMParser: window.DOMParser,
    MutationObserver: window.MutationObserver,
    history: window.history,
  }
}

export const getOriginalValuesOfFakeBrowserGlobals = () => {
  const globals = getFakeBrowserGlobals()
  const keys = Object.keys(globals)
  return Object.fromEntries(keys.map((key) => [key, (globalThis as any)[key]]))
}

export const withFakeBrowserGlobals = async <TResult,>(fn: () => Promise<TResult>): Promise<TResult> => {
  const globals = getFakeBrowserGlobals()
  const keys = Object.keys(globals)
  const originals = Object.fromEntries(keys.map((key) => [key, (globalThis as any)[key]]))
  const restore = () => {
    for (const key of keys) {
      ;(globalThis as any)[key] = originals[key]
    }
  }
  try {
    const result = await fn()
    restore()
    return result
  } catch (error) {
    restore()
    throw error
  }
}

const createFilteredConsole = () => {
  const originalConsole = console
  const shouldFilterMessage = (...args: any[]): boolean => {
    const message = args.map((arg) => String(arg)).join(' ')
    return message.includes('When testing, code that causes React state updates should be wrapped into act(...)')
  }

  const createFilteredMethod = (method: (...args: any[]) => void) => {
    return (...args: any[]) => {
      if (!shouldFilterMessage(...args)) {
        method.apply(originalConsole, args)
      }
    }
  }

  return {
    ...originalConsole,
    log: createFilteredMethod(originalConsole.log.bind(originalConsole)),
    warn: createFilteredMethod(originalConsole.warn.bind(originalConsole)),
    error: createFilteredMethod(originalConsole.error.bind(originalConsole)),
    info: createFilteredMethod(originalConsole.info.bind(originalConsole)),
    debug: createFilteredMethod(originalConsole.debug.bind(originalConsole)),
    trace: createFilteredMethod(originalConsole.trace.bind(originalConsole)),
    dir: createFilteredMethod(originalConsole.dir.bind(originalConsole)),
    dirxml: createFilteredMethod(originalConsole.dirxml.bind(originalConsole)),
    group: createFilteredMethod(originalConsole.group.bind(originalConsole)),
    groupEnd: createFilteredMethod(originalConsole.groupEnd.bind(originalConsole)),
    groupCollapsed: createFilteredMethod(originalConsole.groupCollapsed.bind(originalConsole)),
    time: createFilteredMethod(originalConsole.time.bind(originalConsole)),
    timeEnd: createFilteredMethod(originalConsole.timeEnd.bind(originalConsole)),
    timeLog: createFilteredMethod(originalConsole.timeLog.bind(originalConsole)),
    table: createFilteredMethod(originalConsole.table.bind(originalConsole)),
    clear: createFilteredMethod(originalConsole.clear.bind(originalConsole)),
    count: createFilteredMethod(originalConsole.count.bind(originalConsole)),
    countReset: createFilteredMethod(originalConsole.countReset.bind(originalConsole)),
    assert: createFilteredMethod(originalConsole.assert.bind(originalConsole)),
    profile: createFilteredMethod(originalConsole.profile.bind(originalConsole)),
    profileEnd: createFilteredMethod(originalConsole.profileEnd.bind(originalConsole)),
    timeStamp: createFilteredMethod(originalConsole.timeStamp.bind(originalConsole)),
  }
}

type TestThingsState = {
  container: HTMLElement
  getHtmlView: () => Promise<HtmlView>
  viewer: ElementViewer
  preview: ElementViewer['preview']
  tale: ElementViewer['tale']
  waitContent: ElementViewer['waitContent']
  click: (selector: string) => Promise<void>
  _locationCleanup: () => void
}

export const createTestThings = async ({
  points,
  app = () => (
    <QueryClientProvider>
      <Router />
    </QueryClientProvider>
  ),
  globals = getFakeBrowserGlobals(),
}: {
  points: PointsDefinitionSource
  app?: AppComponent
  globals?: Record<string, any>
}) => {
  const engine = await Engine.init({
    compiler: false,
    file: nodePath.resolve(__dirname, '../temp/never'),
    server: { scope: 'root', points },
    clients: [{ scope: 'root', points }],
  })
  const client = FakeClient.create<TestThingsState>({
    engine,
    scope: 'root',
    globals: {
      ...globals,
      console: createFilteredConsole(),
    },
    onDestroyInside: (state) => {
      state.viewer.destroy()
      // Clean up location change listeners
      state._locationCleanup()
      cleanup()
    },
    onRunStartInside: (state) => {
      const { container } = render(app({ points: client.client.pointsManager }))
      state.container = container
      state.getHtmlView = async () => {
        return await HtmlView.parse(container.innerHTML)
      }
      state.viewer = ElementViewer.create(container)
      state.preview = async () => await state.viewer.preview()
      state.tale = async () => await state.viewer.tale()
      state.click = async (selector: string) => {
        // await act(async () => {
        await state.viewer.waitContent(selector)
        const element = container.querySelector(selector)
        assert(element)
        fireEvent.click(element)
        // })
      }
      state.waitContent = async (search: string) => {
        await state.viewer.waitContent(search)
      }

      // Listen for window URL changes and update viewer
      const window = globals.window as Window
      const updateViewerUrl = () => {
        state.viewer.setUrl(window.location.href)
      }

      // Listen to popstate events (browser back/forward)
      window.addEventListener('popstate', updateViewerUrl)

      // Override history.pushState to catch programmatic navigation
      const originalPushState = window.history.pushState.bind(window.history)
      window.history.pushState = function (...args: Parameters<typeof originalPushState>) {
        originalPushState(...args)
        updateViewerUrl()
      }

      // Override history.replaceState to catch programmatic navigation
      const originalReplaceState = window.history.replaceState.bind(window.history)
      window.history.replaceState = function (...args: Parameters<typeof originalReplaceState>) {
        originalReplaceState(...args)
        updateViewerUrl()
      }

      // Watch for direct location changes using a MutationObserver on location
      // Note: happy-dom's location might not be observable, so we also use a polling approach
      let lastUrl = window.location.href
      const checkLocationChange = () => {
        const currentUrl = window.location.href
        if (currentUrl !== lastUrl) {
          lastUrl = currentUrl
          updateViewerUrl()
        }
      }

      // Poll for location changes (fallback for direct location.href assignments)
      const locationCheckInterval = setInterval(checkLocationChange, 10)

      // Store cleanup function in state
      state._locationCleanup = () => {
        window.removeEventListener('popstate', updateViewerUrl)
        window.history.pushState = originalPushState
        window.history.replaceState = originalReplaceState
        clearInterval(locationCheckInterval)
      }
    },
  })
  return {
    engine,
    client,
    app,
  }
}
