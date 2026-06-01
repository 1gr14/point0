import type { AnyLocation } from '@devp0nt/route0'
import type { QueryClient } from '@tanstack/react-query'
import type { SSRHeadPayload, Unhead } from '@unhead/react/server'
import type { ResolvableHead } from 'unhead/types'
import type { ClientPoints } from './client-points.js'
import type { CookieStorePendingMap } from './cookie-store.js'
import type { Effects } from './effects.js'
import { __POINT0_IS_SSR_IN_PROGRESS__ } from './env.js'
import type {
  NavigationHelpersContextValue,
  NavigationPageStateContextValue,
  NavigationTransitionStateContextValue,
} from './navigation.js'
import { __POINT0_QUERY_CLIENT__ } from './query-client.js'
import type { RedirectTask } from './redirect.js'
import type { Request0 } from './request0.js'
import type { SsrStorePendingMap } from './ssr-store.js'
import type { SuperStoreItemsValues, SuperStoreItemsValuesOrErrors } from './super-store.js'
import { superstore } from './super-store.js'
import type { LayoutPoint, PagePoint, PointsScope, RichFetchFn } from './types.js'

const initUndefined = () => undefined as never

type LikeFakeClient = { id: string; scope: PointsScope; fetch: RichFetchFn; points: ClientPoints<any> } | undefined
export const _getFakeClient = (): LikeFakeClient | undefined => {
  return superstore.getFakeClient() as LikeFakeClient | undefined
}

export const _ss = {
  __POINT0_SSR_STORE_PENDING__: superstore.define<SsrStorePendingMap>(
    '__POINT0_SSR_STORE_PENDING__',
    () => new Map(),
    'serverOnlyStorage',
  ),
  __POINT0_COOKIE_STORE_PENDING__: superstore.define<CookieStorePendingMap>(
    '__POINT0_COOKIE_STORE_PENDING__',
    () => new Map(),
    'serverOnlyStorage',
  ),
  __POINT0_HYDRATION_FINISHED__: superstore.define<boolean>('__POINT0_HYDRATION_FINISHED__', () => false, 'clientOnly'),
  __POINT0_SSR_REDIRECT_TASK__: superstore.define<{ task: RedirectTask; handled: boolean } | undefined>(
    '__POINT0_SSR_REDIRECT_TASK__',
    () => undefined,
    'serverOnlyStorage',
  ),
  __POINT0_IS_SSR_IN_PROGRESS__: __POINT0_IS_SSR_IN_PROGRESS__,
  __POINT0_FETCH_FN__: superstore.define<RichFetchFn>('__POINT0_FETCH_FN__', initUndefined, 'serverOnlyStorage'),
  __POINT0_FAKE_CLIENT__: superstore.define<LikeFakeClient>(
    '__POINT0_FAKE_CLIENT__',
    initUndefined,
    'serverOnlyStorage',
  ),
  __POINT0_REQUEST0__: superstore.define<Request0>('__POINT0_REQUEST0__', initUndefined, 'serverOnlyStorage'),
  __POINT0_SERVER_PORT__: superstore.define<number | undefined>(
    '__POINT0_SERVER_PORT__',
    initUndefined,
    'serverOnlyStorage',
  ),
  __POINT0_EFFECTS__: superstore.define<Effects>('__POINT0_EFFECTS__', initUndefined, 'serverOnlyStorage'),
  __POINT0_CLIENT_POINTS__: superstore.define<ClientPoints<any> | undefined>(
    '__POINT0_CLIENT_POINTS__',
    initUndefined,
    'clientServerIsolated',
  ),
  __POINT0_QUERY_CLIENT_FROM_PARENT_RUN__: superstore.define<QueryClient | undefined>(
    '__POINT0_QUERY_CLIENT_FROM_PARENT_RUN__',
    initUndefined,
    'serverOnlyStorage',
  ),
  __POINT0_QUERY_CLIENT__,
  __POINT0_SSR_LOCATION__: superstore.define<AnyLocation | undefined>(
    '__POINT0_SSR_LOCATION__',
    initUndefined,
    'clientServerTransferredSsr',
  ),
  __POINT0_CURRENT_LOCATION__: superstore.define<AnyLocation>(
    '__POINT0_CURRENT_LOCATION__',
    initUndefined,
    'clientServerIsolated',
  ),
  __POINT0_CURRENT_NAVIGATE_ID__: superstore.define<string | undefined>(
    '__POINT0_CURRENT_NAVIGATE_ID__',
    initUndefined,
    'clientServerIsolated',
  ),
  __POINT0_NAVIGATION_HELPERS__: superstore.define<NavigationHelpersContextValue>(
    '__POINT0_NAVIGATION_HELPERS__',
    initUndefined,
    'clientServerIsolated',
  ),
  __POINT0_NAVIGATION_TRANSITION_STATE__: superstore.define<NavigationTransitionStateContextValue>(
    '__POINT0_NAVIGATION_TRANSITION_STATE__',
    initUndefined,
    'clientServerIsolated',
  ),
  __POINT0_NAVIGATION_PAGE_STATE__: superstore.define<NavigationPageStateContextValue>(
    '__POINT0_NAVIGATION_PAGE_STATE__',
    initUndefined,
    'clientServerIsolated',
  ),
  __POINT0_LOAD_PAGE_COMPONENT_PROMISES__: superstore.define<
    Map<
      string,
      Promise<
        | {
            page: PagePoint
            layouts: LayoutPoint[]
          }
        | undefined
      >
    >
  >('__POINT0_LOAD_PAGE_COMPONENT_PROMISES__', () => new Map(), 'clientServerIsolated'),
  __POINT0_PREFETCH_PAGE_PROMISES__: superstore.define<Map<string, Promise<void>>>(
    '__POINT0_PREFETCH_PAGE_PROMISES__',
    () => new Map(),
    'clientServerIsolated',
  ),
  __POINT0_UNHEAD_SERVER_HEAD__: superstore.define<Unhead<ResolvableHead, SSRHeadPayload>>(
    '__POINT0_UNHEAD_SERVER_HEAD__',
    initUndefined,
    'serverOnlyStorage',
  ),
}

const knownKeys = Object.keys(_ss)
export const _ssRunWithServerStorageState = superstore.createTypedRunWithServerStorageState<typeof _ss>()
export type SuperStoreInternalValues = SuperStoreItemsValues<typeof _ss>
export type SuperStoreInternalValuesOrErrors = SuperStoreItemsValuesOrErrors<typeof _ss>
export const _getSsItemsWithRestErrors = (
  ssItems: Partial<SuperStoreInternalValues>,
  errorMessage = 'This "%s" value is not yet accessible, maybe it is bug',
): SuperStoreInternalValuesOrErrors => {
  const notDefinedKeys = knownKeys.filter((key) => !(key in ssItems))
  Object.assign(
    ssItems,
    Object.fromEntries(notDefinedKeys.map((key) => [key, new Error(errorMessage.replace('%s', key)) as never])),
  )
  return ssItems as SuperStoreInternalValuesOrErrors
}
