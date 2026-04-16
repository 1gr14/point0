import type {
  AnyLocation,
  AnyRouteOrDefinition,
  ExactLocation,
  ExtractRoute,
  ExtractRoutesKeys,
  GetPathInputByRoute,
  IsParamsOptional,
  RoutesPretty,
  UnknownLocation,
} from '@devp0nt/route0'
import * as React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { _point0_env } from './env.js'
import { ErrorPoint0 } from './error.js'
import type { ClassLikeError0 } from './error.js'
import { getClientPoints, useEffectAsap, useEffectSsr } from './helpers.js'
import { _ss } from './internals.js'
import { log } from './logger.js'
import { findRedirectTaskInQueryClientCache, removeRedirectsFromQueryClientCache } from './query-client.js'
import type { RedirectTask } from './redirect.js'
import type { IfAnyThenElse, PrefetchPagePolicy } from './types.js'
import { singletonize, generateId } from './utils.js'

export type NavigationCallback<TAdapterNavigateOptions extends AdapterNavigateOptions = AdapterNavigateOptions> = (
  to: string,
  options?: TAdapterNavigateOptions & SpecialNavigateOptions<TAdapterNavigateOptions>,
) => void | Promise<void>
export type SpecialNavigateOptions<TAdapterNavigateOptions extends AdapterNavigateOptions> = {
  prefetch?: PrefetchPagePolicy
  before?: NavigationCallback<TAdapterNavigateOptions>
  after?: NavigationCallback<TAdapterNavigateOptions>
}
export type SpecialLinkOptions<TAdapterNavigateOptions extends AdapterNavigateOptions> = {
  prefetch?: PrefetchPagePolicy
  prefetchOnHover?: PrefetchPagePolicy
  prefetchOnNavigate?: PrefetchPagePolicy
  before?: NavigationCallback<TAdapterNavigateOptions>
  after?: NavigationCallback<TAdapterNavigateOptions>
}
export type SpecialRedirectOptions = {
  status?: number
}
// export type SpecialLinkOptionsInDataAttributes<
//   TAdapterNavigateOptions extends AdapterNavigateOptions = AdapterNavigateOptions,
// > = {
//   ['data-prefetch-on-hover']?: PrefetchPagePolicy
//   ['data-prefetch']?: PrefetchPagePolicy
//   ['data-prefetch-on-navigate']?: PrefetchPagePolicy
//   ['data-before']?: NavigationCallback<TAdapterNavigateOptions>
//   ['data-after']?: NavigationCallback<TAdapterNavigateOptions>
// }
// export type SpecialRedirectOptionsInDataAttributes = {
//   ['data-status']?: number
// }

export type AdapterNavigateOptions = Record<string, unknown>
export type AdapterNavigateFn<TAdapterNavigateOptions extends AdapterNavigateOptions = AdapterNavigateOptions> = (
  to: string,
  options?: TAdapterNavigateOptions,
) => any

export type NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn extends AdapterNavigateFn> = NonNullable<
  Parameters<TAdapterNavigateFn>[1]
>
export type RedirectOptionsByAdapterNavigateFn<TAdapterNavigateFn extends AdapterNavigateFn> =
  NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn> & SpecialRedirectOptions

export type NavigateHelper<
  TRoutes extends RoutesPretty,
  TAdapterNavigateFn extends AdapterNavigateFn,
  TErrorClass extends ClassLikeError0<ErrorPoint0>,
> = {
  <TRouteName extends ExtractRoutesKeys<TRoutes>>(
    ...args: IsParamsOptional<ExtractRoute<TRoutes, TRouteName>> extends true
      ? [
          route: TRouteName,
          input?: GetPathInputByRoute<ExtractRoute<TRoutes, TRouteName>>,
          options?: NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn> &
            SpecialNavigateOptions<NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn>>,
        ]
      : [
          route: TRouteName,
          input: GetPathInputByRoute<ExtractRoute<TRoutes, TRouteName>>,
          options?: NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn> &
            SpecialNavigateOptions<NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn>>,
        ]
  ): Promise<{ location: AnyLocation; error: InstanceType<TErrorClass> | undefined }>
  to: (
    to: string,
    options?: NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn> &
      SpecialNavigateOptions<NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn>>,
  ) => Promise<{ location: AnyLocation; error: InstanceType<TErrorClass> | undefined }>
}

export type RedirectHelper<TRoutes extends RoutesPretty, TAdapterNavigateFn extends AdapterNavigateFn> = {
  <TRouteName extends ExtractRoutesKeys<TRoutes>>(
    ...args: IsParamsOptional<ExtractRoute<TRoutes, TRouteName>> extends true
      ? [
          route: TRouteName,
          input?: GetPathInputByRoute<ExtractRoute<TRoutes, TRouteName>>,
          options?: RedirectOptionsByAdapterNavigateFn<TAdapterNavigateFn> &
            SpecialNavigateOptions<NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn>>,
        ]
      : [
          route: TRouteName,
          input: GetPathInputByRoute<ExtractRoute<TRoutes, TRouteName>>,
          options?: RedirectOptionsByAdapterNavigateFn<TAdapterNavigateFn> &
            SpecialNavigateOptions<NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn>>,
        ]
  ): RedirectTask<NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn>>
  to: (
    to: string,
    options?: RedirectOptionsByAdapterNavigateFn<TAdapterNavigateFn> &
      SpecialNavigateOptions<NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn>>,
  ) => RedirectTask<NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn>>
}

export type RedirectComponentRouteProps<TRoutes extends RoutesPretty, TAdapterNavigateFn extends AdapterNavigateFn> = {
  [TRouteName in ExtractRoutesKeys<TRoutes>]: {
    route: TRouteName
  } & (IsParamsOptional<ExtractRoute<TRoutes, TRouteName>> extends true
    ? { input?: GetPathInputByRoute<ExtractRoute<TRoutes, TRouteName>> }
    : { input: GetPathInputByRoute<ExtractRoute<TRoutes, TRouteName>> }) &
    RedirectOptionsByAdapterNavigateFn<TAdapterNavigateFn> &
    SpecialNavigateOptions<NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn>>
}[ExtractRoutesKeys<TRoutes>]
export type RedirectComponentProps<TRoutes extends RoutesPretty, TAdapterNavigateFn extends AdapterNavigateFn> =
  | RedirectComponentRouteProps<TRoutes, TAdapterNavigateFn>
  | ({ to: string } & RedirectOptionsByAdapterNavigateFn<TAdapterNavigateFn> &
      SpecialNavigateOptions<NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn>>)
  | ({ href: string } & RedirectOptionsByAdapterNavigateFn<TAdapterNavigateFn> &
      SpecialNavigateOptions<NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn>>)
  | ({
      task: RedirectTask<NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn>>
    } & RedirectOptionsByAdapterNavigateFn<TAdapterNavigateFn> &
      SpecialNavigateOptions<NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn>>)
export type RedirectComponent<TRoutes extends RoutesPretty, TAdapterNavigateFn extends AdapterNavigateFn> = (
  props: RedirectComponentProps<TRoutes, TAdapterNavigateFn>,
) => React.ReactElement | null

export type UseLocationOptions = { addHash?: boolean }
export type UseLocationFn = (options?: UseLocationOptions) => ExactLocation | UnknownLocation

export type NavigationStatus = 'idle' | 'preparing' | 'transitioning'

export type UseOnNavigateFn = (options: {
  prevLocation: AnyLocation
  nextLocation: AnyLocation
}) => undefined | (() => void)
export type UseOnNavigateDetailedFn = (options: {
  prevLocation: AnyLocation
  nextLocation: AnyLocation
  status: NavigationStatus
  error: Error | undefined
}) => void

export type NavigationPageStateSuccess = {
  status: 'success'
  error: undefined
  loading: false
  success: true
  initial: false
}
export type NavigationPageStateLoading = {
  status: 'loading'
  error: undefined
  loading: true
  success: false
  initial: false
}
export type NavigationPageStateError<TError extends ErrorPoint0 = ErrorPoint0> = {
  status: 'error'
  error: TError
  loading: false
  success: false
  initial: false
}
export type NavigationPageStateInitial = {
  status: 'initial'
  error: undefined
  loading: undefined
  success: undefined
  initial: true
}
export type NavigationPageState<TStatus extends 'success' | 'loading' | 'error' | 'initial' = any> = IfAnyThenElse<
  TStatus,
  NavigationPageStateSuccess | NavigationPageStateLoading | NavigationPageStateError | NavigationPageStateInitial,
  TStatus extends 'success'
    ? NavigationPageStateSuccess
    : TStatus extends 'loading'
      ? NavigationPageStateLoading
      : TStatus extends 'error'
        ? NavigationPageStateError
        : TStatus extends 'initial'
          ? NavigationPageStateInitial
          : never
>
export type NavigationPageStateContextValue = NavigationPageState<any>
export const NavigationPageStateContext = singletonize(
  'NavigationPageStateContext',
  React.createContext<NavigationPageStateContextValue | null>(null),
)
export const getNavigationPageState = (): NavigationPageStateContextValue => {
  const navigationPageState = _ss.__POINT0_NAVIGATION_PAGE_STATE__.getWeak()
  if (navigationPageState) {
    return navigationPageState
  }
  throw new Error('NavigationPageStateContextProvider is not yet initialized')
}
export const useNavigationPageState = (): NavigationPageStateContextValue => {
  const ctx = React.useContext(NavigationPageStateContext)
  if (!ctx) throw new Error('useNavigationPageState must be used within NavigationPageStateContextProvider')
  return ctx
}
type SetNavigationPageStateOptions = {
  status: 'loading' | 'success' | 'initial' | 'error'
  error?: unknown
  skip?: boolean
}
export const useSetNavigationPageState = (options: SetNavigationPageStateOptions): void => {
  const helpers = useNavigationHelpers()
  const { status, error, skip } = options
  useEffectSsr(() => {
    if (skip) {
      return
    }
    helpers.setPageState((currentPageState) => {
      if (status === 'error') {
        const error0 = helpers.ErrorClass.from(error)
        if (status === currentPageState.status && error0.message === currentPageState.error.message) {
          return currentPageState
        } else {
          return {
            status: 'error',
            error: error0,
            success: false,
            initial: false,
            loading: false,
          }
        }
      } else {
        if (status === currentPageState.status) {
          return currentPageState
        } else {
          return {
            status: status,
            error: undefined,
            ...(status === 'initial'
              ? { initial: true, success: undefined, loading: undefined }
              : {
                  initial: false,
                  success: status === 'success',
                  loading: status === 'loading',
                }),
          } as NavigationPageState
        }
      }
    })
  }, [status, skip])
}
export const NavigationPageStateSetter = (
  props: { children?: React.ReactNode } & SetNavigationPageStateOptions,
): React.ReactNode => {
  const { children, ...options } = props
  useSetNavigationPageState(options)
  return typeof children === 'undefined' ? null : children
}

export type NavigationHelpersContextValue<
  TRoutes extends RoutesPretty = RoutesPretty,
  TAdapterNavigateFn extends AdapterNavigateFn = AdapterNavigateFn,
  TErrorClass extends ClassLikeError0<ErrorPoint0> = ClassLikeError0<ErrorPoint0>,
> = {
  ssrLocation: AnyLocation | null
  adapterNavigate: TAdapterNavigateFn
  navigate: NavigateHelper<TRoutes, TAdapterNavigateFn, TErrorClass>
  redirect: RedirectHelper<TRoutes, TAdapterNavigateFn>
  Redirect: RedirectComponent<TRoutes, TAdapterNavigateFn>
  useAdapterLocation: UseLocationFn
  addHashToLocation: boolean
  setPrevLocation: React.Dispatch<React.SetStateAction<AnyLocation | null>>
  setNextLocation: React.Dispatch<React.SetStateAction<AnyLocation | null>>
  setTransitionStatus: React.Dispatch<React.SetStateAction<NavigationStatus>>
  setTransitionError: React.Dispatch<React.SetStateAction<Error | undefined>>
  setPageState: React.Dispatch<React.SetStateAction<NavigationPageState>>
  ErrorClass: ClassLikeError0<ErrorPoint0>
}
export const NavigationHelpersContext = singletonize(
  'NavigationHelpersContext',
  React.createContext<NavigationHelpersContextValue | null>(null),
)
export const useNavigationHelpers = (): NavigationHelpersContextValue => {
  const ctx = React.useContext(NavigationHelpersContext)
  if (!ctx) throw new Error('useNavigationHelpers must be used within NavigationHelpersContextProvider')
  return ctx
}
export const getNavigationHelpers = (): NavigationHelpersContextValue => {
  const navigationHelpers = _ss.__POINT0_NAVIGATION_HELPERS__.getWeak()
  if (navigationHelpers) {
    return navigationHelpers
  }
  throw new Error('NavigationHelpersContextProvider is not yet initialized')
}

export type NavigationTransitionStateContextValue = {
  prevLocation: AnyLocation | null
  currentLocation: AnyLocation
  nextLocation: AnyLocation | null
  status: NavigationStatus
  error: Error | undefined
}
export const NavigationTransitionStateContext = singletonize(
  'NavigationTransitionStateContext',
  React.createContext<NavigationTransitionStateContextValue | null>(null),
)
export const useNavigationTransitionState = (): NavigationTransitionStateContextValue => {
  const ctx = React.useContext(NavigationTransitionStateContext)
  if (!ctx) throw new Error('useNavigationTransitionState must be used within NavigationTransitionStateContextProvider')
  return ctx
}
export const getNavigationTransitionState = (): NavigationTransitionStateContextValue => {
  const navigationTransitionState = _ss.__POINT0_NAVIGATION_TRANSITION_STATE__.getWeak()
  if (navigationTransitionState) {
    return navigationTransitionState
  }
  throw new Error('NavigationTransitionStateContextProvider is not yet initialized')
}

export type NavigationLocationContextValue = {
  useAdapterLocation: UseLocationFn
  currentLocation: AnyLocation
  addHashToLocation: boolean
}
export const NavigationLocationContext = singletonize(
  'NavigationLocationContext',
  React.createContext<NavigationLocationContextValue | null>(null),
)

export type NavigationContextProviderProps<
  TRoutes extends RoutesPretty = RoutesPretty,
  TAdapterNavigateFn extends AdapterNavigateFn = AdapterNavigateFn,
  TErrorClass extends ClassLikeError0<ErrorPoint0> = ClassLikeError0<ErrorPoint0>,
> = {
  children: React.ReactNode
  useAdapterLocation: UseLocationFn
  ssrLocation?: AnyLocation | null
  addHashToLocation?: boolean
  adapterNavigate: TAdapterNavigateFn
  navigate: NavigateHelper<TRoutes, TAdapterNavigateFn, TErrorClass>
  redirect: RedirectHelper<TRoutes, TAdapterNavigateFn>
  Redirect: RedirectComponent<TRoutes, TAdapterNavigateFn>
  ErrorClass?: TErrorClass
}

export function NavigationContextProvider<
  TRoutes extends RoutesPretty,
  TAdapterNavigateFn extends AdapterNavigateFn,
  TErrorClass extends ClassLikeError0<ErrorPoint0>,
>({
  children,
  useAdapterLocation,
  ssrLocation,
  adapterNavigate,
  navigate,
  redirect,
  Redirect,
  addHashToLocation = false,
  ErrorClass = ErrorPoint0 as unknown as TErrorClass,
}: NavigationContextProviderProps<TRoutes, TAdapterNavigateFn, TErrorClass>) {
  const [nextLocation, setNextLocation] = useState<AnyLocation | null>(null)
  const [prevLocation, setPrevLocation] = useState<AnyLocation | null>(null)
  const [transitionStatus, setTransitionStatus] = useState<NavigationStatus>('idle')
  const [transitionError, setTransitionError] = useState<Error | undefined>(undefined)
  const [pageState, _setPageState] = useState<NavigationPageState>(
    _ss.__POINT0_NAVIGATION_PAGE_STATE__.getWeak() ?? {
      status: 'initial',
      error: undefined,
      loading: undefined,
      success: undefined,
      initial: true,
    },
  )
  const setPageState = useCallback<React.Dispatch<React.SetStateAction<NavigationPageState>>>((pageState) => {
    if (_point0_env.side.is.server) {
      const previousPageState = _ss.__POINT0_NAVIGATION_PAGE_STATE__.getWeak() ?? {
        status: 'initial',
        error: undefined,
        loading: undefined,
        success: undefined,
        initial: true,
      }
      const nextPageState = typeof pageState === 'function' ? pageState(previousPageState) : pageState
      _ss.__POINT0_NAVIGATION_PAGE_STATE__.set(nextPageState)
    } else {
      _setPageState(pageState)
    }
  }, [])

  const currentLocation = useAdapterLocation()
  useEffectAsap(() => {
    _ss.__POINT0_CURRENT_LOCATION__.set(currentLocation)
  }, [currentLocation])

  const locationValue = useMemo<NavigationLocationContextValue>(
    () => ({
      useAdapterLocation,
      currentLocation,
      addHashToLocation,
    }),
    [currentLocation, addHashToLocation, useAdapterLocation],
  )

  const helpersValue = useMemo<NavigationHelpersContextValue>(
    () => ({
      ssrLocation: ssrLocation ?? null,
      adapterNavigate,
      setNextLocation,
      setPrevLocation,
      setTransitionStatus,
      setTransitionError,
      useAdapterLocation,
      addHashToLocation,
      setPageState,
      ErrorClass,
      navigate,
      redirect,
      Redirect,
    }),
    [ssrLocation, useAdapterLocation, adapterNavigate, addHashToLocation, ErrorClass],
  )
  useEffectAsap(() => {
    _ss.__POINT0_NAVIGATION_HELPERS__.set(helpersValue)
  }, [helpersValue])

  const transitionStateValue = useMemo<NavigationTransitionStateContextValue>(
    () => ({
      prevLocation,
      currentLocation,
      nextLocation,
      status: transitionStatus,
      error: transitionError,
    }),
    [prevLocation, currentLocation, nextLocation, transitionStatus, transitionError],
  )
  useEffectAsap(() => {
    _ss.__POINT0_NAVIGATION_TRANSITION_STATE__.set(transitionStateValue)
  }, [transitionStateValue])

  useEffectAsap(() => {
    _ss.__POINT0_NAVIGATION_PAGE_STATE__.set(pageState)
  }, [pageState])

  return (
    <NavigationHelpersContext.Provider value={helpersValue}>
      <NavigationLocationContext.Provider value={locationValue}>
        <NavigationTransitionStateContext.Provider value={transitionStateValue}>
          <NavigationPageStateContext.Provider value={pageState}>{children}</NavigationPageStateContext.Provider>
        </NavigationTransitionStateContext.Provider>
      </NavigationLocationContext.Provider>
    </NavigationHelpersContext.Provider>
  )
}

export const useNavigationLocationContext = (): NavigationLocationContextValue => {
  const ctx = React.useContext(NavigationLocationContext)
  if (!ctx) throw new Error('useNavigationLocationContext must be used within NavigationContextProvider')
  return ctx
}
export function useLocation<TRouteDefinition extends AnyRouteOrDefinition = AnyRouteOrDefinition>(
  options?: UseLocationOptions,
): UnknownLocation | ExactLocation<TRouteDefinition> {
  const locationCtx = useNavigationLocationContext()
  const addHash =
    options && 'addHash' in options && typeof options.addHash === 'boolean'
      ? options.addHash
      : locationCtx.addHashToLocation
  return locationCtx.useAdapterLocation({ ...options, addHash }) as UnknownLocation | ExactLocation<TRouteDefinition>
}
export const getLocation = <TRouteDefinition extends AnyRouteOrDefinition = AnyRouteOrDefinition>():
  | ExactLocation<TRouteDefinition>
  | UnknownLocation => {
  const location = _ss.__POINT0_CURRENT_LOCATION__.getWeak()
  if (!location) {
    throw new Error('Current location is not yet initialized')
  }
  return location as ExactLocation<TRouteDefinition> | UnknownLocation
}

export const useOnNavigate = (fn: UseOnNavigateFn) => {
  const ctx = useNavigationTransitionState()

  const prevLocationRef = useRef(ctx.currentLocation)
  const nextLocationRef = useRef(ctx.nextLocation)
  const cleanupFnRef = useRef<(() => void) | null>(null)
  const [isNavigating, setIsNavigating] = useState(false)

  useEffect(() => {
    if (!ctx.nextLocation) {
      return
    }

    const prevLocation = prevLocationRef.current
    const nextLocation = ctx.nextLocation
    if (
      prevLocation.href && nextLocation.href
        ? prevLocation.href === nextLocation.href
        : prevLocation.hrefRel === nextLocation.hrefRel
    ) {
      return
    }

    const cleanup = fn({ prevLocation, nextLocation })
    cleanupFnRef.current = typeof cleanup === 'function' ? cleanup : null
    nextLocationRef.current = nextLocation
    setIsNavigating(true)
  }, [ctx.nextLocation])

  useEffect(() => {
    if (!isNavigating || !nextLocationRef.current) {
      return
    }
    if (ctx.status === 'idle') {
      cleanupFnRef.current?.()
      setIsNavigating(false)
      cleanupFnRef.current = null
      prevLocationRef.current = nextLocationRef.current
    }
  }, [ctx.status, isNavigating])
}

export const useIsNavigating = (): boolean => {
  const [isNavigating, setIsNavigating] = useState(false)
  useOnNavigate(() => {
    setIsNavigating(true)
    return () => {
      setIsNavigating(false)
    }
  })
  return isNavigating
}

export const specialNavigationOptionsSymbols = {
  prefetchOnHover: Symbol('prefetchOnHover'),
  prefetch: Symbol('prefetch'),
  prefetchOnNavigate: Symbol('prefetchOnNavigate'),
  before: Symbol('before'),
  after: Symbol('after'),
  status: Symbol('status'),
}

export type NavigateWithTransitionsReturnType<
  TErrorClass extends ClassLikeError0<ErrorPoint0> = ClassLikeError0<ErrorPoint0>,
> = Promise<{ location: AnyLocation; error: InstanceType<TErrorClass> | undefined }>
export async function navigateWithTransitions<
  TAdapterNavigateFn extends AdapterNavigateFn = AdapterNavigateFn,
  TErrorClass extends ClassLikeError0<ErrorPoint0> = ClassLikeError0<ErrorPoint0>,
>({
  to: providedTo,
  navigate,
  options,
  ErrorClass = ErrorPoint0 as unknown as TErrorClass,
}: {
  to: string
  navigate: () => any
  options?: NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn> &
    SpecialNavigateOptions<NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn>>
  ErrorClass?: TErrorClass
}): NavigateWithTransitionsReturnType<TErrorClass> {
  const navigateId = generateId()
  _ss.__POINT0_CURRENT_NAVIGATE_ID__.set(navigateId)
  const helpers = getNavigationHelpers()
  const prevLocation = getLocation()
  const to = (() => {
    if (providedTo.startsWith('#')) {
      return prevLocation.pathname + providedTo
    }
    return providedTo
  })()
  const clientPoints = getClientPoints()
  const location = clientPoints.routes._.getLocation(to)
  helpers.setPrevLocation(prevLocation)
  helpers.setTransitionError(undefined)
  helpers.setNextLocation(location)
  helpers.setTransitionStatus('preparing')
  try {
    const queryClient = _ss.__POINT0_QUERY_CLIENT__.getWeak()
    const tryTriggerRedirect = () => {
      const redirectTask = queryClient ? findRedirectTaskInQueryClientCache(queryClient, to) : undefined
      if (redirectTask && queryClient) {
        if (redirectTask.to === to) {
          removeRedirectsFromQueryClientCache(queryClient, redirectTask.to)
          return undefined
        }
        void helpers.navigate.to(redirectTask.to, {
          ...redirectTask.options,
          after: (...args) => {
            void options?.after?.(...args)
            removeRedirectsFromQueryClientCache(queryClient, redirectTask.to)
          },
        })
        return {
          location,
          error: new ErrorClass(
            'Redirect task found in query client cache, will be triggered now',
          ) as InstanceType<TErrorClass>,
        }
      }
      return undefined
    }
    void options?.before?.(to, options)
    const redirectResult1 = tryTriggerRedirect()
    if (redirectResult1) {
      return redirectResult1
    }
    await clientPoints.prefetchPage({
      location,
      policy: options?.prefetch,
      trigger: 'navigate',
    })
    const redirectResult2 = tryTriggerRedirect()
    if (redirectResult2) {
      return redirectResult2
    }
    if (navigateId !== _ss.__POINT0_CURRENT_NAVIGATE_ID__.get()) {
      return { location, error: new ErrorClass('Another navigate has been started') as InstanceType<TErrorClass> }
    }
    helpers.setTransitionStatus('transitioning')
    await navigate()
    void options?.after?.(to, options)
    helpers.setTransitionStatus('idle')
    helpers.setNextLocation(null)
    return { location, error: undefined }
  } catch (error) {
    log({
      level: 'error',
      category: ['navigation'],
      message: 'Error during navigation',
      error,
    })
    if (navigateId !== _ss.__POINT0_CURRENT_NAVIGATE_ID__.get()) {
      return { location, error: new ErrorClass('Another navigate has been started') as InstanceType<TErrorClass> }
    }
    const error0 = ErrorClass.from(error) as InstanceType<TErrorClass>
    helpers.setTransitionError(error0)
    helpers.setTransitionStatus('transitioning')
    await navigate()
    void options?.after?.(to, options)
    helpers.setTransitionStatus('idle')
    helpers.setNextLocation(null)
    return { location, error: error0 }
  }
}

export * from './redirect.js'
