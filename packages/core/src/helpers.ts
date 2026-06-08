import type { QueryClient } from '@tanstack/react-query'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ClientPoints } from './client-points.js'
import type { Effects } from './effects.js'
import { _point0_env } from './env.js'
import type { ErrorPoint0 } from './error.js'
import type { _ss } from './internals.js'
import type { Request0 } from './request0.js'
import { superstore } from './super-store.js'
import type { RichFetchFn } from './types.js'

export const setStatus = (status: number): void => {
  if (!_point0_env.side.is.server) {
    return
  }
  getEffectsOrUndefined()?.set.status(status)
}

export const useSetStatus = setStatus

export const nativeFetch: RichFetchFn = async (...args) => await fetch(...args)

export const getFetch = ({ scope }: { scope?: string | string[] } = {}): RichFetchFn => {
  if (_point0_env.side.is.server) {
    if (
      scope &&
      (typeof scope === 'string' ? scope !== _point0_env.scope.name : !scope.includes(_point0_env.scope.name))
    ) {
      return nativeFetch
    }
    const __POINT0_FETCH_FN__ = superstore.getItem('__POINT0_FETCH_FN__')?.getOrUndefined() as RichFetchFn | undefined
    if (!__POINT0_FETCH_FN__) {
      throw new Error(
        `Fetch function in server available only inside loaders, components, etc, do not use it in top level. Or use FakeClient. Or Use engine.withFetch(() => your fetch fn)`,
      )
    }
    return __POINT0_FETCH_FN__
  }
  return superstore.getFakeClient()?.fetch ?? nativeFetch
}

export const getFetchOrUndefined = ({ scope }: { scope?: string | string[] } = {}): RichFetchFn | undefined => {
  try {
    return getFetch({ scope })
  } catch {
    return undefined
  }
}

/**
 * `useLayoutEffect` on the client; on the server runs `effect()` synchronously during render (layout effects never fire
 * during SSR). Deps are ignored on the server. Use it when a layout side effect must also apply while server
 * rendering.
 */
export const useLayoutEffectSsr: typeof useLayoutEffect = (effect, deps) => {
  if (_point0_env.side.is.server) {
    effect()
  } else {
    useLayoutEffect(effect, deps)
  }
}

/**
 * `useEffect` on the client; on the server runs `effect()` synchronously during render (normal effects never fire
 * during SSR). Deps are ignored on the server.
 *
 * This is the hook to use when a side effect must also happen during SSR — e.g. writing to an `SsrStore` or cookie item
 * from a page so the value lands in the SSR output. The SSR prefetch loop re-renders until those stores stop changing.
 *
 * If you instead want the effect to have already run before the first paint on the client (no flash), use
 * {@link useEffectAsap}.
 */
export const useEffectSsr: typeof useEffect = (effect, deps) => {
  if (_point0_env.side.is.server) {
    effect()
  } else {
    useEffect(effect, deps)
  }
}

/**
 * Runs `effect()` synchronously on the very first render (before commit/paint) and then behaves like a normal
 * `useEffect` for subsequent updates. Works the same on server and client.
 *
 * Use it when the effect must have run by the time the JSX is committed (to avoid a flash of pre-effect state), while
 * still getting normal effect + deps behavior on updates. For an effect that only needs to run during SSR, prefer
 * {@link useEffectSsr}.
 */
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

export const getEffectsOrUndefined = (): Effects | undefined => {
  const __POINT0_EFFECTS__ = superstore.getItem('__POINT0_EFFECTS__') as (typeof _ss)['__POINT0_EFFECTS__']
  return __POINT0_EFFECTS__.getOrUndefined()
}

export const getRequest = (): Request0 => {
  const __POINT0_REQUEST0__ = superstore.getItem('__POINT0_REQUEST0__') as (typeof _ss)['__POINT0_REQUEST0__']
  return __POINT0_REQUEST0__.get()
}

export const getRequestOrUndefined = (): Request0 | undefined => {
  const __POINT0_REQUEST0__ = superstore.getItem('__POINT0_REQUEST0__') as (typeof _ss)['__POINT0_REQUEST0__']
  return __POINT0_REQUEST0__.getOrUndefined()
}

export const getClientPoints = <TError extends ErrorPoint0>(): ClientPoints<TError> => {
  const fakeClient = superstore.getFakeClient()
  const __POINT0_CLIENT_POINTS__ = superstore.getItem(
    '__POINT0_CLIENT_POINTS__',
  ) as (typeof _ss)['__POINT0_CLIENT_POINTS__']
  const clientPoints = fakeClient ? fakeClient.points : __POINT0_CLIENT_POINTS__.getOrUndefined()
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
