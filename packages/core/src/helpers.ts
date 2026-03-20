import { _point0_env } from './env.js'
import type { Effects } from './effects.js'
import type { RichFetchFn } from './types.js'
import { _ssItems } from './internals.js'
import { superstore } from './super-store.js'
import { useEffect, useState } from 'react'
import type { Request0 } from './request0.js'

export const setStatus = (status: number): void => {
  if (!_point0_env.side.is.server) {
    return
  }
  getEffectsWeak()?.set.status(status)
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

export const useIsHydrated = (): boolean => {
  if (!_point0_env.side.is.client) {
    return false
  }
  const [localHydrationFinished, setLocalHydrationFinished] = useState(_ssItems.__POINT0_HYDRATION_FINISHED__.get())
  useEffect(() => {
    if (!localHydrationFinished) {
      _ssItems.__POINT0_HYDRATION_FINISHED__.set(true)
      setLocalHydrationFinished(true)
    }
  }, [])
  if (_point0_env.vars.POINT0_SSR !== 'true') {
    return true
  }
  return localHydrationFinished
}

export const ClientOnly = <TChildren extends React.ReactNode = null, TFallback extends React.ReactNode = null>({
  children = null,
  fallback = null,
}: {
  children?: TChildren
  fallback?: TFallback
}): TChildren | TFallback => {
  const isHydrated = useIsHydrated()
  if (!isHydrated) {
    return fallback as TFallback
  }
  return children as TChildren
}

export const getEffects = (): Effects => {
  return _ssItems.__POINT0_EFFECTS__.get()
}

export const getEffectsWeak = (): Effects | undefined => {
  return _ssItems.__POINT0_EFFECTS__.getWeak()
}

export const getRequest = (): Request0 => {
  return _ssItems.__POINT0_REQUEST0__.get()
}

export const getRequestWeak = (): Request0 | undefined => {
  return _ssItems.__POINT0_REQUEST0__.getWeak()
}
