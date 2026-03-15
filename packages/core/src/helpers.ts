import { _point0_env } from './env.js'
import { Effects } from './effects.js'
import type { RichFetchFn } from './types.js'
import { _ssItems } from './internals.js'
import { superstore } from './super-store.js'

export const setStatus = (status: number): void => {
  if (!_point0_env.side.is.server) {
    return
  }
  Effects.getWeak()?.set.status(status)
}

const nativeFetch: RichFetchFn = async (...args) => await fetch(...args)

export const getFetch = (): RichFetchFn => {
  if (_point0_env.side.is.server) {
    const __POINT0_FETCH_FN__ = _ssItems.__POINT0_FETCH_FN__.getWeak()
    if (!__POINT0_FETCH_FN__) {
      throw new Error(
        `Fetch function in server available only inside loaders, components, etc, do not use it in top level. Or use FakeClient`,
      )
    }
    return __POINT0_FETCH_FN__
  }
  return superstore.getFakeClient()?.fetch ?? nativeFetch
}
