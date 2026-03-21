import type { AnyLocation } from '@devp0nt/route0'
import type { QueryClient } from '@tanstack/react-query'
import type { SSRHeadPayload, Unhead } from '@unhead/react/server'
import type { ResolvableHead } from 'unhead/types'
import type { ClientPoints } from './client-points.js'
import type { Effects } from './effects.js'
import type { ErrorPoint0 } from './error.js'
import { queryClient } from './query-client.js'
import type { Request0 } from './request0.js'
import { ssrRedirectTask, type RouterContextValue } from './router.js'
import { superstore } from './super-store.js'
import type { SuperStoreItemsValues, SuperStoreItemsValuesOrErrors } from './super-store.js'
import type { PointsScope, RichFetchFn } from './types.js'

const initUndefined = () => undefined as never

type LikeFakeClient =
  | { id: string; scope: PointsScope; fetch: RichFetchFn; points: ClientPoints<ErrorPoint0> }
  | undefined
export const _getFakeClient = (): LikeFakeClient | undefined => {
  return superstore.getFakeClient() as LikeFakeClient | undefined
}

export const _ssItems = {
  __POINT0_HYDRATION_FINISHED__: superstore.define<boolean>('__POINT0_HYDRATION_FINISHED__', () => false, 'clientOnly'),
  __POINT0_SSR_REDIRECT_TASK__: ssrRedirectTask,
  __POINT0_FETCH_FN__: superstore.define<RichFetchFn>('__POINT0_FETCH_FN__', initUndefined, 'serverOnlyStorage'),
  __POINT0_FAKE_CLIENT__: superstore.define<LikeFakeClient>(
    '__POINT0_FAKE_CLIENT__',
    initUndefined,
    'serverOnlyStorage',
  ),
  __POINT0_REQUEST0__: superstore.define<Request0>('__POINT0_REQUEST0__', initUndefined, 'serverOnlyStorage'),
  __POINT0_EFFECTS__: superstore.define<Effects>('__POINT0_EFFECTS__', initUndefined, 'serverOnlyStorage'),
  __POINT0_CLIENT_POINTS__: superstore.define<ClientPoints<ErrorPoint0> | undefined>(
    '__POINT0_CLIENT_POINTS__',
    initUndefined,
    'clientServerIsolated',
  ),
  __POINT0_QUERY_CLIENT_FROM_PARENT_RUN__: superstore.define<QueryClient | undefined>(
    '__POINT0_QUERY_CLIENT_FROM_PARENT_RUN__',
    initUndefined,
    'serverOnlyStorage',
  ),
  __POINT0_QUERY_CLIENT__: queryClient,
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
  __POINT0_ROUTER_CONTEXT__: superstore.define<RouterContextValue>(
    '__POINT0_ROUTER_CONTEXT__',
    initUndefined,
    'clientServerIsolated',
  ),
  __POINT0_UNHEAD_SERVER_HEAD__: superstore.define<Unhead<ResolvableHead, SSRHeadPayload>>(
    '__POINT0_UNHEAD_SERVER_HEAD__',
    initUndefined,
    'serverOnlyStorage',
  ),
}

const knownKeys = Object.keys(_ssItems)
export const _ssRunWithServerStorageState = superstore.createTypedRunWithServerStorageState<typeof _ssItems>()
export type SuperStoreInternalValues = SuperStoreItemsValues<typeof _ssItems>
export type SuperStoreInternalValuesOrErrors = SuperStoreItemsValuesOrErrors<typeof _ssItems>
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
