import type { AnyNiceRequestableReadyPoint, AppComponent, ReadyPoint, PointsDefinition } from '@point0/core'
import { queryClient as point0QueryClient, QueryClientProvider, UnheadProvider } from '@point0/core'
import { Router, RouterRoutes } from '@point0/wouter'
import { Window } from 'happy-dom'
import assert from 'node:assert'
import nodePath from 'node:path'
import { Engine } from '../../src/engine.js'
import { FakeClient } from '../../src/fake-client.js'
import { ElementViewer } from './element-viewer.js'
import { HtmlView } from './html-view.js'
// import { AsyncLocalStorage } from 'node:async_hooks'
import type { DehydratedState, QueryClient } from '@tanstack/react-query'
import * as rtl from '@testing-library/react'
import { FetchRecorder } from './fetch-recorder.js'
import { YAML } from 'bun'

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

export const waitReturn = async <T = undefined,>(value?: T, timeout = 100): Promise<T> => {
  await new Promise((resolve) => setTimeout(resolve, timeout))
  return value as T
}

export const ymlify = (result: any) => {
  return '\n' + YAML.stringify(result, undefined, 2) + '\n'
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
  document: Document
  getHtmlView: () => Promise<HtmlView>
  viewer: ElementViewer
  preview: ElementViewer['preview']
  tale: ElementViewer['tale']
  queryClient: QueryClient
  titles: string[]
  titlesTale: () => Promise<string>
  pruneTitles: () => void
  titlesInterval: NodeJS.Timeout
  getQueryClientPreview: () => string
  waitContent: ElementViewer['waitContent']
  click: (selector: string) => Promise<void>
  _locationCleanup: () => void
}
type FetchPoint = <T extends AnyNiceRequestableReadyPoint>(
  point: T,
  ...args: T['Infer']['IsInputOptional'] extends true
    ? [input?: T['Infer']['InputRaw']]
    : [input: T['Infer']['InputRaw']]
) => ReturnType<T['fetch']>
type FetchHtmlView = <T extends AnyNiceRequestableReadyPoint>(
  point: T,
  ...args: T['Infer']['IsInputOptional'] extends true
    ? [input?: T['Infer']['InputRaw']]
    : [input: T['Infer']['InputRaw']]
) => Promise<HtmlView>
type FetchHtmlPreview = <T extends AnyNiceRequestableReadyPoint>(
  point: T,
  ...args: T['Infer']['IsInputOptional'] extends true
    ? [input?: T['Infer']['InputRaw']]
    : [input: T['Infer']['InputRaw']]
) => Promise<string>
type FetchSsr = <T extends AnyNiceRequestableReadyPoint>(
  point: T,
  ...args: T['Infer']['IsInputOptional'] extends true
    ? [input?: T['Infer']['InputRaw']]
    : [input: T['Infer']['InputRaw']]
) => Promise<{
  html: string
  preview: string
  dehydratedSuperStore: Record<string, unknown>
  queryClientDehydratedState: DehydratedState
  queryClientQueriesKeys: string[]
  queryClientQueriesState: Record<string, { status: string; data: string | undefined; error: string | undefined }>
  queryClientQueriesPreview: string
}>
type FetchTitle = <T extends AnyNiceRequestableReadyPoint>(
  point: T,
  ...args: T['Infer']['IsInputOptional'] extends true
    ? [input?: T['Infer']['InputRaw']]
    : [input: T['Infer']['InputRaw']]
) => Promise<string>

export const createTestThings = async ({
  points,
  wrapper,
  app: appProvided,
  globals = getFakeBrowserGlobals(),
}: {
  wrapper?: React.ComponentType<{ children: React.ReactNode }>
  points: PointsDefinition
  app?: AppComponent
  globals?: Record<string, any>
}) => {
  const Wrapper = wrapper ?? undefined
  const app =
    appProvided ??
    (() => (
      <QueryClientProvider>
        <UnheadProvider>
          {Wrapper ? (
            <Router>
              <Wrapper>
                <RouterRoutes />
              </Wrapper>
            </Router>
          ) : (
            <Router />
          )}
        </UnheadProvider>
      </QueryClientProvider>
    ))
  const fetchRecorder = FetchRecorder.create({
    limit: 100,
    enabled: true,
  })
  points[0].point._middlewares.push(fetchRecorder.middleware)
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
  async function render<TResult = undefined>(callback?: (state: TestThingsState) => TResult): Promise<TResult>
  async function render<TResult = undefined>(
    path: string,
    callback?: (state: TestThingsState) => TResult,
  ): Promise<TResult>
  async function render(
    ...args: [callback?: (state: TestThingsState) => any] | [path: string, callback?: (state: TestThingsState) => any]
  ): Promise<any> {
    const [path = '/', callback = () => undefined] =
      typeof args[0] === 'string' ? [args[0], args[1]] : [undefined, args[0]]
    const location = new URL(path, 'http://localhost/')
    return await client.run(callback, {
      onEndInside: async (state) => {
        clearInterval(state.titlesInterval)
      },
      onStartInside: async (state) => {
        const window = globals.window as Window
        window.location.href = location.href

        const root = document.createElement('div')
        root.id = 'root'
        document.body.appendChild(root)

        const head = document.createElement('head')
        document.body.appendChild(head)
        const title = document.createElement('title')
        head.appendChild(title)

        state.titles = []
        // const titleObserver = new MutationObserver(() => {
        //   state.titles.push(document.title)
        // })
        // titleObserver.observe(title, {
        //   childList: true,
        // })
        state.titlesInterval = setInterval(() => {
          const lastTitle = state.titles[state.titles.length - 1]
          const currentTitle = document.title
          if (lastTitle !== currentTitle && currentTitle) {
            state.titles.push(currentTitle)
          }
        }, 5)
        state.pruneTitles = () => {
          state.titles.splice(0, state.titles.length)
        }
        state.titlesTale = async () => {
          return '\n' + state.titles.join('\n') + '\n'
        }

        rtl.render(app({ points: client.client.pointsManager }), { container: root })
        state.body = document.body
        state.document = document
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

        state.queryClient = point0QueryClient.get()
        state.getQueryClientPreview = () => {
          const queryClientState = state.queryClient.getQueryCache().findAll()
          // const queryClientQueriesKeys = queryClientState.map((query) =>
          //   query.queryKey.join('|'),
          // )
          const queryClientQueriesState = Object.fromEntries(
            queryClientState.map((query) => [
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
          return queryClientQueriesPreview
        }
      },
    })
  }
  const fetch: FakeClient['fetch'] = async (input, init) => {
    return await client.run(async () => {
      return await client.fetch(input, init)
    })
  }
  const loadPoint = (async (point: ReadyPoint, ...args: [any]) => {
    return await client.run(async () => {
      if (point.type === 'infiniteQuery') {
        return await point.fetchInfiniteQuery(...args)
      }
      if (point.type === 'mutation') {
        return await point.fetchMutation(...args)
      }
      return await point.fetchQuery(...args)
    })
  }) as unknown as FetchPoint
  const loadPointYml = (async (point: ReadyPoint, ...args: [any]) => {
    const result = await loadPoint(point as any, ...args)
    return ymlify(result)
  }) as unknown as FetchPoint
  const fetchView = (async (point: ReadyPoint, ...args: [any]) => {
    return await client.run(async () => {
      const response = await client.fetch(point.route.flat(args[0] || {}, true), ...args.slice(1))
      return await HtmlView.parse(await response.text())
    })
  }) as unknown as FetchHtmlView
  const fetchPreview = (async (point: ReadyPoint, ...args: [any]) => {
    return await client.run(async () => {
      const response = await client.fetch(point.route.flat(args[0] || {}, true), ...args.slice(1))
      return (await HtmlView.parse(await response.text())).preview
    })
  }) as unknown as FetchHtmlPreview
  const fetchSsr = (async (point: ReadyPoint, ...args: [any]) => {
    return await client.run(async () => {
      const response = await client.fetch(point.route.flat(args[0] || {}, true), ...args.slice(1))
      const view = await HtmlView.parse(await response.text())
      const scriptMatch = /<script id="__POINT0_DEHYDRATED_SUPER_STORE_SCRIPT__">([\s\S]+?)<\/script>/.exec(view.html)
      if (!scriptMatch) {
        console.error(view.html)
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

  const fetchTitle = (async (point: ReadyPoint, ...args: [any]) => {
    const view = await fetchView(point as never, ...args)
    const title = /<title>(.*?)<\/title>/.exec(view.html)?.[1]
    return title
  }) as unknown as FetchTitle
  return {
    engine,
    client,
    render,
    app,
    fetch,
    fetchSsr,
    loadPoint,
    loadPointYml,
    fetchView,
    fetchPreview,
    fetchRecorder,
    fetchesTale,
    fetchTitle,
  }
}
