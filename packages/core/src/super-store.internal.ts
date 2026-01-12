import type { AnyLocation } from '@devp0nt/route0'
import type { ResolvableHead, Unhead } from 'unhead/types'
import type { Request0, Response0 } from './index.js'
import { queryClient } from './query-client.js'
import { ss } from './super-store.js'
import type { PointsScope } from './types.js'

const initUndefined = () => undefined as never

export const _ssItems = {
  request0: ss.define<Request0>('__POINT0_REQUEST0__', initUndefined),
  response0: ss.define<Response0>('__POINT0_RESPONSE0__', initUndefined),
  scope: ss.define<PointsScope>('__POINT0_SCOPE__', initUndefined),
  queryClient,
  ssrLocation: ss.define<AnyLocation | undefined>('__POINT0_SSR_LOCATION__', initUndefined),
  currentLocation: ss.define<AnyLocation>('__POINT0_CURRENT_LOCATION__', initUndefined),
  unheadHead: ss.define<Unhead<ResolvableHead>>('__POINT0_UNHEAD_HEAD__', initUndefined),
}
export const _ssProxy = ss.proxy(_ssItems)
export const _ssRunWithServerStorageState = ss.createTypedRunWithServerStorageState<typeof _ssItems>()
