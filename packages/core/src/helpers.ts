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

export const useEffectHydrated = <TFn extends () => void>(fn: TFn, deps: React.DependencyList): void => {
  if (!_point0_env.side.is.client) {
    return
  }
  if (_point0_env.vars.POINT0_SSR !== 'true') {
    useEffect(() => {
      fn()
    }, [fn, ...deps])
    return
  }
  const [localHydrationFinished, setLocalHydrationFinished] = useState(_ssItems.__POINT0_HYDRATION_FINISHED__.get())
  useEffect(() => {
    if (!localHydrationFinished) {
      _ssItems.__POINT0_HYDRATION_FINISHED__.set(true)
      setLocalHydrationFinished(true)
    }
  }, [])
  useEffect(() => {
    if (!localHydrationFinished) {
      return
    }
    return fn()
  }, [fn, localHydrationFinished, ...deps])
}

export const ClientOnly = <TChildren extends React.ReactNode>({
  children,
}: {
  children: TChildren
}): TChildren | null => {
  if (!_point0_env.side.is.client) {
    return null
  }
  if (_point0_env.vars.POINT0_SSR !== 'true') {
    return children
  }
  const [localHydrationFinished, setLocalHydrationFinished] = useState(_ssItems.__POINT0_HYDRATION_FINISHED__.get())
  useEffect(() => {
    if (!localHydrationFinished) {
      _ssItems.__POINT0_HYDRATION_FINISHED__.set(true)
      setLocalHydrationFinished(true)
    }
  }, [])
  if (!localHydrationFinished) {
    return null
  }
  return children
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
