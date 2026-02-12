import type { AnyLocation } from '@devp0nt/route0'
import type { ResolvableHead, Unhead } from 'unhead/types'
import type { Request0, Effects, SuperStoreItemsValues, SuperStoreItemsValuesOrErrors } from './index.js'
import { queryClient } from './query-client.js'
import { ss } from './super-store.js'
import type { FetchFn, PointsScope } from './types.js'
import type { QueryClient } from '@tanstack/react-query'
import type { ClientPoints } from './client-points.js'

const initUndefined = () => undefined as never

type LikeFakeClient = { id: string; scope: PointsScope; fetch: FetchFn; points: ClientPoints } | undefined
export const _getFakeClient = (): LikeFakeClient | undefined => {
  return ss.serverStorage?.getStore()?.__POINT0_FAKE_CLIENT__ as LikeFakeClient | undefined
}

export const _ssItems = {
  __POINT0_FETCH_FN__: ss.define<FetchFn>('__POINT0_FETCH_FN__', initUndefined, 'serverOnlyStorage'),
  __POINT0_FAKE_CLIENT__: ss.define<LikeFakeClient>('__POINT0_FAKE_CLIENT__', initUndefined, 'serverOnlyStorage'),
  __POINT0_REQUEST0__: ss.define<Request0>('__POINT0_REQUEST0__', initUndefined, 'serverOnlyStorage'),
  __POINT0_EFFECTS__: ss.define<Effects>('__POINT0_EFFECTS__', initUndefined, 'serverOnlyStorage'),
  __POINT0_CLIENT_POINTS__: ss.define<ClientPoints | undefined>(
    '__POINT0_CLIENT_POINTS__',
    initUndefined,
    'clientServerIsolated',
  ),
  __POINT0_QUERY_CLIENT_FROM_PARENT_RUN__: ss.define<QueryClient | undefined>(
    '__POINT0_QUERY_CLIENT_FROM_PARENT_RUN__',
    initUndefined,
    'serverOnlyStorage',
  ),
  __POINT0_QUERY_CLIENT__: queryClient,
  __POINT0_SSR_LOCATION__: ss.define<AnyLocation | undefined>(
    '__POINT0_SSR_LOCATION__',
    initUndefined,
    'clientServerTransferredSsr',
  ),
  __POINT0_CURRENT_LOCATION__: ss.define<AnyLocation>(
    '__POINT0_CURRENT_LOCATION__',
    initUndefined,
    'clientServerIsolated',
  ),
  __POINT0_UNHEAD_HEAD__: ss.define<Unhead<ResolvableHead>>(
    '__POINT0_UNHEAD_HEAD__',
    initUndefined,
    'serverOnlyStorage',
  ),
}

const knownKeys = Object.keys(_ssItems)
export const _ssRunWithServerStorageState = ss.createTypedRunWithServerStorageState<typeof _ssItems>()
export type SuperStoreInternalValues = SuperStoreItemsValues<typeof _ssItems>
export type SuperStoreInternalValuesOrErrors = SuperStoreItemsValuesOrErrors<typeof _ssItems>
export const _getSsItemsWithRestErrors = (
  ssItems: Partial<SuperStoreInternalValues>,
  errorMessage = 'This value is not yet accessible, maybe it is bug',
): SuperStoreInternalValuesOrErrors => {
  const notDefinedKeys = knownKeys.filter((key) => !(key in ssItems))
  const error = new Error(errorMessage)
  Object.assign(ssItems, Object.fromEntries(notDefinedKeys.map((key) => [key, error])))
  return ssItems as SuperStoreInternalValuesOrErrors
}
