import type { QueryClient } from '@tanstack/react-query'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ClientPoints } from './client-points.js'
import type { Effects } from './effects.js'
import { _point0_env } from './env.js'
import type { ErrorPoint0 } from './error.js'
// import { _getFakeClient, _ss } from './internals.js'
import type { _ss } from './internals.js'
import type { Request0 } from './request0.js'
import { superstore } from './super-store.js'
import type { RichFetchFn } from './types.js'

export const setStatus = (status: number): void => {
  if (!_point0_env.side.is.server) {
    return
  }
  getEffectsWeak()?.set.status(status)
}

export const useSetStatus = setStatus

const nativeFetch: RichFetchFn = async (...args) => await fetch(...args)

export const getFetch = (): RichFetchFn => {
  if (_point0_env.side.is.server) {
    const __POINT0_FETCH_FN__ = superstore.getItem('__POINT0_FETCH_FN__')?.getWeak() as RichFetchFn | undefined
    if (!__POINT0_FETCH_FN__) {
      throw new Error(
        `Fetch function in server available only inside loaders, components, etc, do not use it in top level. Or use FakeClient`,
      )
    }
    return __POINT0_FETCH_FN__
  }
  return superstore.getFakeClient()?.fetch ?? nativeFetch
}

export const getFetchWeak = (): RichFetchFn | undefined => {
  try {
    return getFetch()
  } catch {
    return undefined
  }
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
  const __POINT0_HYDRATION_FINISHED__ = superstore.getItem(
    '__POINT0_HYDRATION_FINISHED__',
  ) as (typeof _ss)['__POINT0_HYDRATION_FINISHED__']
  const [localHydrationFinished, setLocalHydrationFinished] = useState(__POINT0_HYDRATION_FINISHED__.get())
  useEffect(() => {
    if (!localHydrationFinished) {
      __POINT0_HYDRATION_FINISHED__.set(true)
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
  const __POINT0_EFFECTS__ = superstore.getItem('__POINT0_EFFECTS__') as (typeof _ss)['__POINT0_EFFECTS__']
  return __POINT0_EFFECTS__.get()
}

export const getEffectsWeak = (): Effects | undefined => {
  const __POINT0_EFFECTS__ = superstore.getItem('__POINT0_EFFECTS__') as (typeof _ss)['__POINT0_EFFECTS__']
  return __POINT0_EFFECTS__.getWeak()
}

export const getRequest = (): Request0 => {
  const __POINT0_REQUEST0__ = superstore.getItem('__POINT0_REQUEST0__') as (typeof _ss)['__POINT0_REQUEST0__']
  return __POINT0_REQUEST0__.get()
}

export const getRequestWeak = (): Request0 | undefined => {
  const __POINT0_REQUEST0__ = superstore.getItem('__POINT0_REQUEST0__') as (typeof _ss)['__POINT0_REQUEST0__']
  return __POINT0_REQUEST0__.getWeak()
}

// export const mountClientPoints = <TError extends ErrorPoint0>(
//   points: PointsDefinition<any, TError> | PointsManager<any, any, TError>,
// ): ClientPoints<TError> => {
//   return ClientPoints.mount(points)
// }

export const getClientPoints = <TError extends ErrorPoint0>(): ClientPoints<TError> => {
  const fakeClient = superstore.getFakeClient()
  const __POINT0_CLIENT_POINTS__ = superstore.getItem(
    '__POINT0_CLIENT_POINTS__',
  ) as (typeof _ss)['__POINT0_CLIENT_POINTS__']
  const clientPoints = fakeClient ? fakeClient.points : __POINT0_CLIENT_POINTS__.getWeak()
  if (!clientPoints) {
    if (_point0_env.side.is.server) {
      throw new Error(
        'Client points not found if SuperStore. Looks like you call this fn outside of client context. You should call it only in components, hooks, functions, not in top of files without wrappers',
      )
    } else {
      throw new Error(
        'Client points instance not found. You should call clientPoints.mount() first to mount it on client',
      )
    }
  }
  return clientPoints as unknown as ClientPoints<TError>
}

export const getQueryClient = (): QueryClient => {
  const __POINT0_QUERY_CLIENT__ = superstore.getItem(
    '__POINT0_QUERY_CLIENT__',
  ) as (typeof _ss)['__POINT0_QUERY_CLIENT__']
  return __POINT0_QUERY_CLIENT__.get()
}
