import type { QueryClient } from '@tanstack/react-query'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ClientPoints } from './client-points.js'
import type { Effects } from './effects.js'
import { _point0_env } from './env.js'
import type { ErrorPoint0 } from './error.js'
import { _ss } from './internals.js'
import type { PointsDefinition, PointsManager } from './points-manager.js'
import type { Request0 } from './request0.js'
import { superstore } from './super-store.js'
import type { RichFetchFn } from './types.js'

export const setStatus = (status: number): void => {
  if (!_point0_env.side.is.server) {
    return
  }
  getEffectsWeak()?.set.status(status)
}

const nativeFetch: RichFetchFn = async (...args) => await fetch(...args)

export const getFetch = (): RichFetchFn => {
  if (_point0_env.side.is.server) {
    const __POINT0_FETCH_FN__ = _ss.__POINT0_FETCH_FN__.getWeak()
    if (!__POINT0_FETCH_FN__) {
      throw new Error(
        `Fetch function in server available only inside loaders, components, etc, do not use it in top level. Or use FakeClient`,
      )
    }
    return __POINT0_FETCH_FN__
  }
  return superstore.getFakeClient()?.fetch ?? nativeFetch
}

export const useLayoutEffectSsr: typeof useLayoutEffect = (effect, deps) => {
  if (_point0_env.side.is.server) {
    effect()
  } else {
    useLayoutEffect(effect, deps)
  }
}

export const useEffectSsr: typeof useEffect = (effect, deps) => {
  if (_point0_env.side.is.server) {
    effect()
  } else {
    useEffect(effect, deps)
  }
}

export const useEffectAsap: typeof useEffect = (effect, deps) => {
  const isFirstRender = useRef(true)
  const isFirstMount = useRef(true)
  const firstRenderCleanup = useRef<ReturnType<typeof effect> | undefined>(undefined)
  // Run immediately on first render

  if (isFirstRender.current) {
    isFirstRender.current = false
    firstRenderCleanup.current = effect()
  }

  useEffect(() => {
    // Skip running effect again on mount (already ran sync)
    if (isFirstMount.current) {
      isFirstMount.current = false
      const firstRenderCleanupValue = firstRenderCleanup.current
      firstRenderCleanup.current = undefined
      return firstRenderCleanupValue
    }
    // Normal behavior on updates

    return effect()
  }, deps)
}

export const useIsHydrated = (): boolean => {
  if (!_point0_env.side.is.client) {
    return false
  }
  const [localHydrationFinished, setLocalHydrationFinished] = useState(_ss.__POINT0_HYDRATION_FINISHED__.get())
  useEffect(() => {
    if (!localHydrationFinished) {
      _ss.__POINT0_HYDRATION_FINISHED__.set(true)
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
  return _ss.__POINT0_EFFECTS__.get()
}

export const getEffectsWeak = (): Effects | undefined => {
  return _ss.__POINT0_EFFECTS__.getWeak()
}

export const getRequest = (): Request0 => {
  return _ss.__POINT0_REQUEST0__.get()
}

export const getRequestWeak = (): Request0 | undefined => {
  return _ss.__POINT0_REQUEST0__.getWeak()
}

export const mountClientPoints = <TError extends ErrorPoint0>(
  points: PointsDefinition<any, TError> | PointsManager<any, any, TError>,
): ClientPoints<TError> => {
  return ClientPoints.mount(points)
}

export const getClientPoints = (): ClientPoints => {
  return ClientPoints.getInstance()
}

export const getQueryClient = (): QueryClient => {
  return _ss.__POINT0_QUERY_CLIENT__.get()
}
