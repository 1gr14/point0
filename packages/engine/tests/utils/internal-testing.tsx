import type {
  AnyNiceRequestableEndPoint,
  AppComponent,
  EndPoint,
  PointsDefinition,
  PointsDefinitionSource,
} from '@point0/core'
import { QueryClientProvider } from '@point0/core'
import { Router } from '@point0/wouter'
import { Window } from 'happy-dom'
import assert from 'node:assert'
import nodePath from 'node:path'
import { Engine } from '../../src/engine.js'
import { FakeClient } from '../../src/fake-client.js'
import { ElementViewer } from './element-viewer.js'
import { HtmlView } from './html-view.js'
// import { AsyncLocalStorage } from 'node:async_hooks'
import * as rtl from '@testing-library/react'
import { FetchRecorder } from './fetch-recorder.js'
import type { DehydratedState } from '@tanstack/react-query'

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

// let _rtl: {
//   rtl: typeof import('@testing-library/react')
//   globals: Record<string, any>
// } | undefined
// const importRtl = async () => {
//   // if (_rtl) {
//   //   return _rtl
//   // }
//   const storage = new AsyncLocalStorage()
//   const knownKeys = Object.keys(Window)
//   const rtlGlobals = {}
//   const rtl = await storage.run(rtlGlobals, async () => {
//     for (const key of knownKeys) {
//       try {
//         Object.defineProperty(globalThis, key, {
//           get: () => {
//             return (rtlGlobals as any)[key]
//           },
//           set: (value) => {
//             ;(rtlGlobals as any)[key] = value
//           },
//         })
//       } catch (error) {
//         console.error(`Error setting global ${key}`, error)
//       }
//     }
//     return await import('@testing-library/react')
//   })
//   return {
//     rtl,
//     rtlGlobals,
//   }
//   // _rtl = {
//   //   rtl,
//   //   globals: newGlobals,
//   // }
//   // return _rtl
// }
// export const { rtl, rtlGlobals } = await importRtl()
// console.log(Object.keys(rtlGlobals))
// export const rtl = {
//   ..._rtl.rtl,
//   globals: _rtl.globals,
// }

export const getFakeBrowserGlobals = (options: { url?: string } = {}) => {
  const url = options.url ?? 'http://localhost/'
  const window = new Window({
    url,
  })
  // const result = {
  //   window,
  //   ...Object.fromEntries(
  //     Object.entries(window)
  //       .map(([key, value]) => {
  //         if (['timeStamp'].includes(key)) {
  //           return null as never
  //         }
  //         if (typeof value === 'undefined' || value === null) {
  //           return null as never
  //         }
  //         if (typeof value === 'function') {
  //           return [key, value.bind(window)]
  //         }
  //         return [key, value]
  //       })
  //       .filter((x: any) => x !== null),
  //   ),
  // }
  // console.log(555, Object.keys(result))
  // return result
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
    requestAnimationFrame: window.requestAnimationFrame.bind(window),
    cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
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

export const waitReturn = async <T,>(value: T, timeout = 100): Promise<T> => {
  await new Promise((resolve) => setTimeout(resolve, timeout))
  return value
}

const createFilteredConsole = () => {
  const originalConsole = console
  const shouldFilterMessage = (...args: any[]): boolean => {
    const message = args.map((arg) => String(arg)).join(' ')
    return (
      message.includes('When testing, code that causes React state updates should be wrapped into act(...)') ||
      message.includes('ected multiple renderers concurrently rendering the same context')
    )
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
  body: HTMLElement
  getHtmlView: () => Promise<HtmlView>
  viewer: ElementViewer
  preview: ElementViewer['preview']
  tale: ElementViewer['tale']
  waitContent: ElementViewer['waitContent']
  click: (selector: string) => Promise<void>
  _locationCleanup: () => void
}
type FetchPoint = <T extends AnyNiceRequestableEndPoint>(
  point: T,
  ...args: T['Infer']['InputOptional'] extends true ? [input?: T['Infer']['InputRaw']] : [input: T['Infer']['InputRaw']]
) => ReturnType<T['fetch']>
type FetchHtmlView = <T extends AnyNiceRequestableEndPoint>(
  point: T,
  ...args: T['Infer']['InputOptional'] extends true ? [input?: T['Infer']['InputRaw']] : [input: T['Infer']['InputRaw']]
) => Promise<HtmlView>
type FetchHtmlPreview = <T extends AnyNiceRequestableEndPoint>(
  point: T,
  ...args: T['Infer']['InputOptional'] extends true ? [input?: T['Infer']['InputRaw']] : [input: T['Infer']['InputRaw']]
) => Promise<string>
type FetchSsr = <T extends AnyNiceRequestableEndPoint>(
  point: T,
  ...args: T['Infer']['InputOptional'] extends true ? [input?: T['Infer']['InputRaw']] : [input: T['Infer']['InputRaw']]
) => Promise<{
  html: string
  preview: string
  dehydratedSuperStore: Record<string, unknown>
  queryClientDehydratedState: DehydratedState
  queryClientQueriesKeys: string[]
  queryClientQueriesState: Record<string, { status: string; data: string | undefined; error: string | undefined }>
  queryClientQueriesPreview: string
}>

export const createTestThings = async ({
  points,
  app = () => (
    <QueryClientProvider>
      <Router />
    </QueryClientProvider>
  ),
  globals = getFakeBrowserGlobals(),
}: {
  points: PointsDefinition
  app?: AppComponent
  globals?: Record<string, any>
}) => {
  const fetchRecorder = FetchRecorder.create({
    limit: 100,
    enabled: true,
  })
  points[0].point._middlewares.push(fetchRecorder.middlleware)
  const engine = await Engine.create({
    compiler: false,
    file: nodePath.resolve(__dirname, '../temp/never'),
    server: { scope: 'root', points },
    clients: [{ scope: 'root', points, indexHtml: '__POINT0_TEST_INDEX_HTML__', app }],
  }).init({ preventClientDevServers: true })
  const client = FakeClient.create<TestThingsState>({
    engine,
    scope: 'root',
    globals: {
      // ...rtlGlobals,
      ...globals,
      console: createFilteredConsole(),
    },
    onDestroyInside: async (state) => {
      state.viewer.destroy()
      // Clean up location change listeners
      state._locationCleanup()
      rtl.cleanup()
    },
    onRunEndInside: async (state) => {
      rtl.cleanup()
    },
  })
  const render = async (callback: Parameters<typeof client.run>[0]) => {
    return await client.run(callback, {
      onStartInside: async (state) => {
        const root = document.createElement('div')
        root.id = 'root'
        document.body.appendChild(root)

        rtl.render(app({ points: client.client.pointsManager }), { container: root })
        // state.body = body
        state.getHtmlView = async () => {
          return await HtmlView.parse(root.innerHTML)
        }
        // state.viewer = ElementViewer.create(host)
        state.viewer = ElementViewer.create(root)
        state.preview = async () => await state.viewer.preview()
        state.tale = async () => await state.viewer.tale()
        state.click = async (selector: string) => {
          await rtl.act(async () => {
            await state.viewer.waitContent(selector)
            const element = root.querySelector(selector)
            assert(element)
            rtl.fireEvent.click(element)
          })
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
  }
  const fetch: FakeClient['fetch'] = async (input, init) => {
    return await client.run(async () => {
      return await client.fetch(input, init)
    })
  }
  const loadPoint = (async (point: EndPoint, ...args: [any]) => {
    return await client.run(async () => {
      return await point.execute(...args)
    })
  }) as unknown as FetchPoint
  const fetchView = (async (point: EndPoint, ...args: [any]) => {
    return await client.run(async () => {
      const response = await client.fetch(point.route.flat(args[0] || {}, true), ...args.slice(1))
      return await HtmlView.parse(await response.text())
    })
  }) as unknown as FetchHtmlView
  const fetchPreview = (async (point: EndPoint, ...args: [any]) => {
    return await client.run(async () => {
      const response = await client.fetch(point.route.flat(args[0] || {}, true), ...args.slice(1))
      return (await HtmlView.parse(await response.text())).preview
    })
  }) as unknown as FetchHtmlPreview
  const fetchSsr = (async (point: EndPoint, ...args: [any]) => {
    return await client.run(async () => {
      const response = await client.fetch(point.route.flat(args[0] || {}, true), ...args.slice(1))
      const view = await HtmlView.parse(await response.text())
      const scriptMatch = /<script id="__POINT0_DEHYDRATED_SUPER_STORE_SCRIPT__">([\s\S]+?)<\/script>/.exec(view.html)
      if (!scriptMatch) {
        throw new Error('Dehydrated super store script not found')
      }
      const scriptContent = scriptMatch[1]
      // Extract the JSON string value from: window.__POINT0_DEHYDRATED_SUPER_STORE__ = "...";
      // The value is JSON.stringify'd, so it's a double-quoted string that may contain escaped characters
      // Match from the opening quote to the closing quote (handling escaped quotes)
      const valueMatch = /window\.__POINT0_DEHYDRATED_SUPER_STORE__\s*=\s*("(?:[^"\\]|\\.)*")\s*;/.exec(scriptContent)
      if (!valueMatch) {
        throw new Error('Could not extract dehydrated super store value from script')
      }
      // Parse the JSON string to get the actual string value (first JSON.parse removes the outer quotes)
      const dehydratedSuperStoreString = JSON.parse(valueMatch[1])
      // Parse again to get the actual JSON object
      const dehydratedSuperStore = JSON.parse(dehydratedSuperStoreString)
      const queryClientDehydratedState = dehydratedSuperStore.__POINT0_QUERY_CLIENT__ as DehydratedState
      if (queryClientDehydratedState.queries.length === 0) {
        throw new Error('Query client dehydrated state is empty')
      }
      const queryClientDehydratedStateInDehydratedStateQuery = queryClientDehydratedState.queries.find(
        (query) => query.queryKey.at(-1) === 'queryClientDehydratedState',
      )
      if (!queryClientDehydratedStateInDehydratedStateQuery) {
        throw new Error(
          `Query client dehydrated state query in dehydrated state is not found: ${JSON.stringify(queryClientDehydratedState, null, 2)}`,
        )
      }
      if (queryClientDehydratedState.queries.length > 1) {
        throw new Error(
          `There is not only one query client dehydrated state in dehydrated state: ${JSON.stringify(queryClientDehydratedState, null, 2)}`,
        )
      }
      const queryClientDehydratedStateInDehydratedState = (queryClientDehydratedStateInDehydratedStateQuery as any)
        .state.data?.dehydratedState as DehydratedState | undefined
      if (!queryClientDehydratedStateInDehydratedState) {
        throw new Error(
          `Query client dehydrated state data in dehydrated state query is not found: ${JSON.stringify(queryClientDehydratedStateInDehydratedStateQuery, null, 2)}`,
        )
      }
      const queryClientQueriesKeys = queryClientDehydratedStateInDehydratedState.queries.map((query) =>
        query.queryKey.join('|'),
      )
      const queryClientQueriesState = Object.fromEntries(
        queryClientDehydratedStateInDehydratedState.queries.map((query) => [
          query.queryKey.join('|'),
          {
            status: query.state.status,
            data: query.state.data ? JSON.stringify(query.state.data) : undefined,
            error: query.state.error?.message,
          },
        ]),
      )
      const queryClientQueriesPreview =
        Object.entries(queryClientQueriesState)
          .map(([key, value]) => {
            return `${key}
${value.error ? `Error: ${value.error}` : value.data ? value.data : `Status: ${value.status}`}`
          })
          .join('\n') + '\n'
      return {
        html: view.html,
        preview: view.preview,
        dehydratedSuperStore,
        queryClientQueriesKeys,
        queryClientDehydratedState,
        queryClientQueriesState,
        queryClientQueriesPreview,
      } satisfies Awaited<ReturnType<FetchSsr>>
    })
  }) as unknown as FetchSsr

  // TODO: move to fetch recorder
  const fetchesTale = fetchRecorder.tale.bind(fetchRecorder)
  return {
    engine,
    client,
    render,
    app,
    fetch,
    fetchSsr,
    loadPoint,
    fetchView,
    fetchPreview,
    fetchRecorder,
    fetchesTale,
  }
}
