import type { AnyLocation } from '@devp0nt/route0'
import type { ResolvableHead, Unhead } from 'unhead/types'
import type { Request0, Response0, SuperStoreItemsValues, SuperStoreItemsValuesOrErrors } from './index.js'
import { queryClient } from './query-client.js'
import { ss } from './super-store.js'
import type { PointsScope } from './types.js'

const initUndefined = () => undefined as never

export const _ssItems = {
  __POINT0_REQUEST0__: ss.define<Request0>('__POINT0_REQUEST0__', initUndefined),
  __POINT0_RESPONSE0__: ss.define<Response0>('__POINT0_RESPONSE0__', initUndefined),
  __POINT0_SCOPE__: ss.define<PointsScope>('__POINT0_SCOPE__', initUndefined),
  __POINT0_QUERY_CLIENT__: queryClient,
  __POINT0_SSR_LOCATION__: ss.define<AnyLocation | undefined>('__POINT0_SSR_LOCATION__', initUndefined),
  __POINT0_CURRENT_LOCATION__: ss.define<AnyLocation>('__POINT0_CURRENT_LOCATION__', initUndefined),
  __POINT0_UNHEAD_HEAD__: ss.define<Unhead<ResolvableHead>>('__POINT0_UNHEAD_HEAD__', initUndefined),
}
export const _ssProxy = ss.proxy(_ssItems)
export const _ssRunWithServerStorageState = ss.createTypedRunWithServerStorageState<typeof _ssItems>()
export type SuperStoreInternalValues = SuperStoreItemsValues<typeof _ssItems>
export type SuperStoreInternalValuesOrErrors = SuperStoreItemsValuesOrErrors<typeof _ssItems>
