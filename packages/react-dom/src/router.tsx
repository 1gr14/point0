import { Route0, type AnyLocation, type ExtractRoute, type ExtractRoutesKeys, type RoutesPretty } from '@devp0nt/route0'
import type { ExactLocation, GetPathInputByRoute, IsParamsOptional } from '@devp0nt/route0'
import { _point0_env, _ss, env, ErrorPoint0, getClientPoints, log } from '@point0/core'
import type {
  ClassLikeError0,
  NormalizedLazyPointsCollectionRecord,
  PagesTree,
  PrefetchPagePolicy,
  ReadyPointsCollectionRecord,
} from '@point0/core'
import {
  navigateWithTransitions,
  NavigationContextProvider,
  NavigationPageStateSetter,
  RedirectTask,
  ssrRedirectTask,
  useLocation,
  useNavigationLocationContext,
} from '@point0/core/navigation'
import type {
  AdapterNavigateFn,
  NavigateHelper,
  NavigateOptionsByAdapterNavigateFn,
  NavigateWithTransitionsReturnType,
  NavigationStatus,
  RedirectHelper,
  RedirectOptionsByAdapterNavigateFn,
  SpecialLinkOptions,
  SpecialLinkOptionsInDataAttributes,
  SpecialNavigateOptions,
  UseLocationFn,
} from '@point0/core/navigation'
import React, { Fragment, useCallback, useMemo, useRef } from 'react'
import type { AnchorHTMLAttributes, MouseEventHandler, ReactElement, RefAttributes } from 'react'
import {
  Link as NativeWouterLink,
  Redirect as NativeWouterRedirect,
  Router as NativeWouterRouter,
  Route,
  Switch,
  useLocation as useWouterLocation,
  useSearchParams as useWouterSearchParams,
} from 'wouter'
import type {
  AroundNavHandler,
  BaseLocationHook,
  HookNavigationOptions,
  NavigateOptions,
  NavigationalProps,
  SsrContext,
} from 'wouter'
import { navigate as browserNavigate, useBrowserLocation } from 'wouter/use-browser-location'
import type { BrowserLocationHook } from 'wouter/use-browser-location'

type AsChildProps<ComponentProps, DefaultElementProps> =
  | ({ asChild?: false } & DefaultElementProps)
  | ({ asChild: true } & ComponentProps)

type HTMLLinkAttributes = AnchorHTMLAttributes<HTMLAnchorElement>
type LinkAsChildProps = AsChildProps<
  { children: ReactElement; onClick?: MouseEventHandler },
  HTMLLinkAttributes & RefAttributes<HTMLAnchorElement>
>
type LinkProps<H extends BaseLocationHook = BrowserLocationHook> = NavigationalProps<H> &
  LinkAsChildProps &
  SpecialLinkOptions
type AdapterNavigateFnByHook<TBaseLocationHook extends BaseLocationHook = BrowserLocationHook> =
  ReturnType<TBaseLocationHook>[1]

type StringOrFalsy = string | undefined | null | false
type NavLinkClassNameProps = {
  exactClassName?: StringOrFalsy
  sameClassName?: StringOrFalsy
  ancestorClassName?: StringOrFalsy
  descendantClassName?: StringOrFalsy
  unmatchedClassName?: StringOrFalsy
  className?:
    | StringOrFalsy
    | ((state: NavLinkStateOptions) => StringOrFalsy)
    | Partial<Record<'default' | NavLinkStateType, StringOrFalsy>>
}
type NavLinkAsChildProps = AsChildProps<
  { children: ReactElement; onClick?: MouseEventHandler },
  Omit<HTMLLinkAttributes, 'className'> & RefAttributes<HTMLAnchorElement>
>
type NavLinkProps<H extends BaseLocationHook = BrowserLocationHook> = NavigationalProps<H> &
  NavLinkAsChildProps &
  NavLinkClassNameProps &
  SpecialLinkOptions

export type NavLinkStateType = 'exact' | 'same' | 'ancestor' | 'descendant' | 'unmatched'
export type NavLinkStateOptions =
  | {
      type: 'exact'
      exact: true
      same: false
      ancestor: false
      descendant: false
      unmatched: false
    }
  | {
      type: 'same'
      exact: false
      same: true
      ancestor: false
      descendant: false
      unmatched: false
    }
  | {
      type: 'ancestor'
      exact: false
      same: false
      ancestor: true
      descendant: false
      unmatched: false
    }
  | {
      type: 'descendant'
      exact: false
      same: false
      ancestor: false
      descendant: true
      unmatched: false
    }
  | {
      type: 'unmatched'
      exact: false
      same: false
      ancestor: false
      descendant: false
      unmatched: true
    }

const _resolveFinalTo = <TRoutes extends RoutesPretty>({
  routes,
  routeName,
  input,
  providedTo,
  providedHref,
  componentName,
}: {
  routes: TRoutes
  routeName?: string
  input: Record<string, unknown>
  providedTo?: string
  providedHref?: string
  componentName: 'Link' | 'NavLink' | 'Redirect'
}): string => {
  if (providedTo !== undefined) {
    return providedTo
  }
  if (providedHref !== undefined) {
    return providedHref
  }
  if (routeName === undefined) {
    log({
      level: 'error',
      category: ['wouter'],
      message: `routeName is required for ${componentName} without to or href`,
    })
    return '#'
  }
  const route = routes[routeName]
  if (!route) {
    // TODO: replace with onClientError handler
    log({ level: 'error', category: ['wouter'], message: `Route "${routeName}" not found` })
    return '#'
  }
  return route.get(input)
}

const _useFinalTo = <TRoutes extends RoutesPretty>({
  routes,
  routeName,
  input,
  providedTo,
  providedHref,
  componentName,
}: {
  routes: TRoutes
  routeName?: string
  input: Record<string, unknown>
  providedTo?: string
  providedHref?: string
  componentName: 'Link' | 'NavLink' | 'Redirect'
}): string => {
  return useMemo(
    () => _resolveFinalTo({ routes, routeName, input, providedTo, providedHref, componentName }),
    [routes, routeName, JSON.stringify(input), providedTo, providedHref, componentName],
  )
}

const _getWouterLinkProps = <TBaseLocationHook extends BaseLocationHook = BrowserLocationHook>(
  props: LinkProps<TBaseLocationHook>,
  // navigate: NavigateFnByHook<TBaseLocationHook>,
): {
  wouterLinkProps: LinkProps & {
    ['data-prefetch-on-hover']?: PrefetchPagePolicy
    ['data-prefetch']?: PrefetchPagePolicy
    ['data-prefetch-on-navigate']?: PrefetchPagePolicy
  }
  to: string
  pointWithLocation:
    | { point: NormalizedLazyPointsCollectionRecord | ReadyPointsCollectionRecord; location: AnyLocation }
    | undefined
} => {
  const {
    to,
    href,
    // onClick: providedOnClick,
    onMouseEnter: providedOnMouseEnter,
    onMouseLeave: providedOnMouseLeave,
    // replace,
    prefetchOnNavigate,
    prefetchOnHover,
    prefetch,
    ...rest
  } = props as LinkProps &
    SpecialLinkOptions & {
      onMouseEnter?: (e: React.MouseEvent<HTMLAnchorElement>) => void
      onMouseLeave?: (e: React.MouseEvent<HTMLAnchorElement>) => void
    }
  const clientPoints = getClientPoints()
  const finalTo = to || href || '#'
  const prefetchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { pointWithLocation, providedPolh, defaultPolh, polhEnabled } = useMemo<
    | {
        pointWithLocation: {
          point: NormalizedLazyPointsCollectionRecord | ReadyPointsCollectionRecord
          location: ExactLocation
        }
        providedPolh: PrefetchPagePolicy | undefined
        defaultPolh: number | boolean
        polhEnabled: true
      }
    | {
        pointWithLocation: {
          point: NormalizedLazyPointsCollectionRecord | ReadyPointsCollectionRecord
          location: ExactLocation
        }
        providedPolh: PrefetchPagePolicy | undefined
        defaultPolh: number | boolean
        polhEnabled: false
      }
    | {
        pointWithLocation: undefined
        providedPolh: undefined
        defaultPolh: undefined
        polhEnabled: false
      }
  >(() => {
    if (!finalTo || finalTo.startsWith('#')) {
      return { pointWithLocation: undefined, providedPolh: undefined, defaultPolh: undefined, polhEnabled: false }
    }
    const pointWithLocation = clientPoints._getPageByHref(finalTo)
    if (!pointWithLocation) {
      return { pointWithLocation: undefined, providedPolh: undefined, defaultPolh: undefined, polhEnabled: false }
    }
    const providedPolh = prefetchOnHover !== undefined ? prefetchOnHover : prefetch
    const defaultPolh = pointWithLocation.point.polh
    const polhProividedDisables = providedPolh === false || providedPolh === 'none'
    const polhEnabled = !polhProividedDisables && defaultPolh !== false
    return {
      pointWithLocation,
      providedPolh,
      defaultPolh,
      polhEnabled: polhEnabled as true,
    }
  }, [finalTo, prefetchOnHover, prefetch])
  const onMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (polhEnabled) {
        // Clear any existing timeout
        if (prefetchTimeoutRef.current) {
          clearTimeout(prefetchTimeoutRef.current)
        }
        // Set a N ms delay before prefetching
        prefetchTimeoutRef.current = setTimeout(
          () => {
            prefetchTimeoutRef.current = null
            void clientPoints.prefetchPage({
              location: pointWithLocation.location,
              policy: providedPolh,
              trigger: 'linkHover',
            })
          },
          typeof defaultPolh === 'number' ? defaultPolh : 30,
        )
      }
      void providedOnMouseEnter?.(e)
    },
    [pointWithLocation, providedPolh, defaultPolh, polhEnabled],
  )
  const onMouseLeave = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current)
        prefetchTimeoutRef.current = null
      }
      void providedOnMouseLeave?.(e)
    },
    [prefetchTimeoutRef],
  )
  return {
    to: finalTo,
    pointWithLocation,
    wouterLinkProps: {
      ...rest,
      onMouseEnter,
      onMouseLeave,
      to: finalTo,
      ['data-prefetch-on-hover']: prefetchOnHover,
      ['data-prefetch']: prefetch,
      ['data-prefetch-on-navigate']: prefetchOnNavigate,
    } as LinkProps & SpecialLinkOptionsInDataAttributes,
  }
}

const toSpecialNavigateOptions = (
  options:
    | undefined
    | (NavigateOptions<any> & SpecialNavigateOptions & SpecialLinkOptions & SpecialLinkOptionsInDataAttributes),
): SpecialNavigateOptions => {
  return {
    prefetch:
      typeof options?.prefetchOnNavigate !== 'undefined'
        ? (options.prefetchOnNavigate as PrefetchPagePolicy)
        : typeof options?.['data-prefetch-on-navigate'] !== 'undefined'
          ? (options['data-prefetch-on-navigate'] as PrefetchPagePolicy)
          : typeof options?.prefetch !== 'undefined'
            ? (options.prefetch as PrefetchPagePolicy)
            : typeof options?.['data-prefetch'] !== 'undefined'
              ? (options['data-prefetch'] as PrefetchPagePolicy)
              : undefined,
  }
}

const splitWouterAndSpecialOptions = (
  options:
    | undefined
    | (NavigateOptions<any> & SpecialNavigateOptions & SpecialLinkOptions & SpecialLinkOptionsInDataAttributes),
): { specialOptions: SpecialNavigateOptions & SpecialLinkOptions; wouterOptions: NavigateOptions<any> } => {
  const {
    prefetch,
    prefetchOnHover,
    prefetchOnNavigate,
    ['data-prefetch-on-hover']: prefetchOnHoverByDataAttribute,
    ['data-prefetch']: prefetchByDataAttribute,
    ['data-prefetch-on-navigate']: prefetchOnNavigateByDataAttribute,
    ...wouterOptions
  } = options ?? {}
  return {
    specialOptions: {
      prefetchOnNavigate: prefetchOnNavigate !== undefined ? prefetchOnNavigate : prefetchOnNavigateByDataAttribute,
      prefetchOnHover: prefetchOnHover !== undefined ? prefetchOnHover : prefetchOnHoverByDataAttribute,
      prefetch: prefetch !== undefined ? prefetch : prefetchByDataAttribute,
    },
    wouterOptions,
  }
}

export const createNavigate = <
  TRoutes extends RoutesPretty,
  TAdapterNavigateFn extends AdapterNavigateFn = typeof browserNavigate,
  TErrorClass extends ClassLikeError0<ErrorPoint0> = ClassLikeError0<ErrorPoint0>,
>({
  routes,
  navigate: adapterNavigate = browserNavigate as TAdapterNavigateFn,
  ErrorClass = ErrorPoint0 as unknown as TErrorClass,
}: {
  routes: TRoutes
  navigate?: TAdapterNavigateFn
  ErrorClass?: TErrorClass
}): NavigateHelper<TRoutes, TAdapterNavigateFn, TErrorClass> => {
  const wrappedNavigate = (
    to: string,
    options?: NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn> & SpecialNavigateOptions,
  ): NavigateWithTransitionsReturnType<TErrorClass> => {
    const { specialOptions, wouterOptions } = splitWouterAndSpecialOptions(options)
    return navigateWithTransitions({
      to,
      options: toSpecialNavigateOptions(specialOptions),
      navigate: () => adapterNavigate(to, wouterOptions),
      ErrorClass,
    })
  }
  async function navigate<TRouteName extends ExtractRoutesKeys<TRoutes>>(
    ...args: IsParamsOptional<ExtractRoute<TRoutes, TRouteName>> extends true
      ? [
          route: TRouteName,
          input?: GetPathInputByRoute<ExtractRoute<TRoutes, TRouteName>>,
          options?: NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn> & SpecialNavigateOptions,
        ]
      : [
          route: TRouteName,
          input: GetPathInputByRoute<ExtractRoute<TRoutes, TRouteName>>,
          options?: NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn> & SpecialNavigateOptions,
        ]
  ): NavigateWithTransitionsReturnType<TErrorClass> {
    const routeName = args[0] as ExtractRoutesKeys<TRoutes>
    const input = args[1] as unknown
    const options = args[2] as
      | (NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn> & SpecialNavigateOptions)
      | undefined
    const route = routes[routeName]
    if (!route) {
      throw new ErrorClass(`Route "${routeName}" not found`)
    }

    const to = route.get(input || {}) as string
    const { specialOptions, wouterOptions } = splitWouterAndSpecialOptions(options)
    return await navigateWithTransitions({
      to,
      options: toSpecialNavigateOptions(specialOptions),
      navigate: () => adapterNavigate(to, wouterOptions),
      ErrorClass,
    })
  }
  return Object.assign(navigate, { to: wrappedNavigate })
}

export const createLink = <
  TRoutes extends RoutesPretty,
  TBaseLocationHook extends BaseLocationHook = BrowserLocationHook,
>({
  routes,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  hook,
}: {
  routes: TRoutes
  hook?: TBaseLocationHook
}) => {
  type LinkRouteProps = {
    [TRouteName in ExtractRoutesKeys<TRoutes>]: {
      route: TRouteName
    } & (IsParamsOptional<ExtractRoute<TRoutes, TRouteName>> extends true
      ? { input?: GetPathInputByRoute<ExtractRoute<TRoutes, TRouteName>> }
      : { input: GetPathInputByRoute<ExtractRoute<TRoutes, TRouteName>> }) &
      LinkAsChildProps &
      HookNavigationOptions<TBaseLocationHook> &
      SpecialLinkOptions
  }[ExtractRoutesKeys<TRoutes>]
  function Link(
    props:
      | LinkRouteProps
      | ({ to: string } & LinkAsChildProps & HookNavigationOptions<TBaseLocationHook> & SpecialLinkOptions)
      | ({ href: string } & LinkAsChildProps & HookNavigationOptions<TBaseLocationHook> & SpecialLinkOptions),
  ): React.ReactElement
  function Link(props: {
    to?: string
    href?: string
    route?: string
    input?: Record<string, unknown>
  }): React.ReactElement {
    const {
      route: routeName,
      input = {},
      to: providedTo,
      href: providedHref,
      ...rest
    } = props as typeof props & { input?: Record<string, unknown>; to?: string; href?: string }
    const finalTo = _useFinalTo({
      routes,
      routeName,
      input,
      providedTo,
      providedHref,
      componentName: 'Link',
    })

    const { wouterLinkProps } = _getWouterLinkProps({ ...rest, to: finalTo })
    return <NativeWouterLink {...wouterLinkProps} />
  }
  return Link
}

export const createNavLink = <
  TRoutes extends RoutesPretty,
  TBaseLocationHook extends BaseLocationHook = BrowserLocationHook,
>({
  routes,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  hook,
}: {
  routes: TRoutes
  hook?: TBaseLocationHook
}) => {
  type NavLinkRouteProps = {
    [TRouteName in ExtractRoutesKeys<TRoutes>]: {
      route: TRouteName
    } & (IsParamsOptional<ExtractRoute<TRoutes, TRouteName>> extends true
      ? { input?: GetPathInputByRoute<ExtractRoute<TRoutes, TRouteName>> }
      : { input: GetPathInputByRoute<ExtractRoute<TRoutes, TRouteName>> }) &
      NavLinkAsChildProps &
      HookNavigationOptions<TBaseLocationHook> &
      NavLinkClassNameProps &
      SpecialLinkOptions
  }[ExtractRoutesKeys<TRoutes>]
  function NavLink(
    props:
      | NavLinkRouteProps
      | ({ to: string } & NavLinkProps<TBaseLocationHook>)
      | ({ href: string } & NavLinkProps<TBaseLocationHook>),
  ): React.ReactElement
  function NavLink(props: {
    to?: string
    href?: string
    route?: string
    input?: Record<string, unknown>
  }): React.ReactElement {
    const {
      route: routeName,
      input = {},
      to: providedTo,
      href: providedHref,
      exactClassName,
      sameClassName,
      ancestorClassName,
      descendantClassName,
      unmatchedClassName,
      className,
      ...rest
    } = props as typeof props &
      NavLinkClassNameProps & {
        input?: Record<string, unknown>
        to?: string
        href?: string
      }
    const finalTo = _useFinalTo({
      routes,
      routeName,
      input,
      providedTo,
      providedHref,
      componentName: 'NavLink',
    })
    const { pointWithLocation, wouterLinkProps } = _getWouterLinkProps<TBaseLocationHook>({
      ...rest,
      to: finalTo,
    })
    const currentLocation = useLocation()
    const route = pointWithLocation?.point.route
    const relation = useMemo(() => {
      if (!route) {
        return undefined
      }
      return route.getRelation(currentLocation.pathname)
    }, [pointWithLocation?.point.route?.definition, currentLocation.pathname])
    const statusOptions = useMemo<NavLinkStateOptions>(() => {
      const unmatched = {
        type: 'unmatched',
        exact: false,
        same: false,
        ancestor: false,
        descendant: false,
        unmatched: true,
      } as const
      if (!relation || relation.unmatched) {
        return unmatched
      }
      if (relation.exact) {
        if (
          currentLocation.origin
            ? Route0.toAbsLocation(Route0.getLocation(finalTo), currentLocation.origin).href === currentLocation.href
            : finalTo === currentLocation.hrefRel
        ) {
          return { type: 'exact', exact: true, same: false, ancestor: false, descendant: false, unmatched: false }
        } else {
          return { type: 'same', exact: false, same: true, ancestor: false, descendant: false, unmatched: false }
        }
      }
      if (relation.ancestor) {
        return { type: 'ancestor', exact: false, same: false, ancestor: true, descendant: false, unmatched: false }
      }
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (relation.descendant) {
        return { type: 'descendant', exact: false, same: false, ancestor: false, descendant: true, unmatched: false }
      }
      return unmatched
    }, [currentLocation.pathname, finalTo])
    const resolvedClassName = useMemo(() => {
      const classNameFromFnOrString =
        typeof className === 'function'
          ? className(statusOptions)
          : typeof className === 'string'
            ? className
            : undefined
      const classNamesFromMap =
        typeof className === 'object' && className !== null ? [className.default, className[statusOptions.type]] : []
      const allClassNames = [
        classNameFromFnOrString,
        ...classNamesFromMap,
        statusOptions.exact ? exactClassName : undefined,
        statusOptions.same ? sameClassName : undefined,
        statusOptions.ancestor ? ancestorClassName : undefined,
        statusOptions.descendant ? descendantClassName : undefined,
        statusOptions.unmatched ? unmatchedClassName : undefined,
      ]
      const mergedClassNames = allClassNames.filter((value): value is string => Boolean(value)).join(' ')
      return mergedClassNames || undefined
    }, [
      className,
      statusOptions,
      exactClassName,
      sameClassName,
      ancestorClassName,
      descendantClassName,
      unmatchedClassName,
    ])
    const finalWouterLinkProps = useMemo<LinkProps>(() => {
      if ('asChild' in wouterLinkProps && wouterLinkProps.asChild) {
        return wouterLinkProps
      }
      return { ...wouterLinkProps, className: resolvedClassName }
    }, [wouterLinkProps, resolvedClassName])
    return <NativeWouterLink {...finalWouterLinkProps} />
  }
  return NavLink
}

export const createRedirectComponent = <
  TRoutes extends RoutesPretty,
  TBaseLocationHook extends BaseLocationHook = BrowserLocationHook,
>({
  routes,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  hook,
}: {
  routes: TRoutes
  hook?: TBaseLocationHook
}) => {
  type RedirectRouteProps = {
    [TRouteName in ExtractRoutesKeys<TRoutes>]: {
      route: TRouteName
    } & (IsParamsOptional<ExtractRoute<TRoutes, TRouteName>> extends true
      ? { input?: GetPathInputByRoute<ExtractRoute<TRoutes, TRouteName>> }
      : { input: GetPathInputByRoute<ExtractRoute<TRoutes, TRouteName>> }) &
      HookNavigationOptions<TBaseLocationHook> &
      SpecialNavigateOptions
  }[ExtractRoutesKeys<TRoutes>]

  function Redirect(
    props:
      | RedirectRouteProps
      | ({ to: string } & HookNavigationOptions<TBaseLocationHook> & SpecialNavigateOptions)
      | ({ href: string } & HookNavigationOptions<TBaseLocationHook> & SpecialNavigateOptions),
  ): React.ReactElement
  function Redirect(
    props: {
      to?: string
      href?: string
      route?: string
      input?: Record<string, unknown>
    } & SpecialNavigateOptions,
  ): React.ReactElement {
    const {
      route: routeName,
      input = {},
      to: providedTo,
      href: providedHref,
      prefetch,
      ...rest
    } = props as typeof props & { input?: Record<string, unknown>; to?: string; href?: string }

    const finalTo = _useFinalTo({
      routes,
      routeName,
      input,
      providedTo,
      providedHref,
      componentName: 'Redirect',
    })

    return <NativeWouterRedirect {...rest} to={finalTo} data-prefetch={prefetch} />
  }

  return Redirect
}

export const createRedirectHelper = <
  TRoutes extends RoutesPretty,
  TAdapterNavigateFn extends AdapterNavigateFn = typeof browserNavigate,
>({
  routes,
  navigate = browserNavigate as TAdapterNavigateFn,
  ErrorClass = ErrorPoint0 as unknown as ClassLikeError0<ErrorPoint0>,
}: {
  routes: TRoutes
  navigate?: TAdapterNavigateFn
  ErrorClass?: ClassLikeError0<ErrorPoint0>
}): RedirectHelper<TRoutes, TAdapterNavigateFn> => {
  const redirectTo = (
    to: string,
    options?: RedirectOptionsByAdapterNavigateFn<TAdapterNavigateFn> & SpecialNavigateOptions,
  ) => {
    const { status, ...rest } = options ?? {}
    const task = new RedirectTask<NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn>>({
      to,
      status,
      options: rest as NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn> & SpecialNavigateOptions,
    })
    if (_point0_env.side.is.client) {
      const { specialOptions, wouterOptions } = splitWouterAndSpecialOptions(rest)
      void navigateWithTransitions({
        to,
        options: toSpecialNavigateOptions(specialOptions),
        navigate: () => navigate(to, wouterOptions),
        ErrorClass,
      })
    } else if (_point0_env.side.is.ssr) {
      ssrRedirectTask.set(task)
    }
    return task
  }
  function redirect<TRouteName extends ExtractRoutesKeys<TRoutes>>(
    ...args: IsParamsOptional<ExtractRoute<TRoutes, TRouteName>> extends true
      ? [
          route: TRouteName,
          input?: GetPathInputByRoute<ExtractRoute<TRoutes, TRouteName>>,
          options?: RedirectOptionsByAdapterNavigateFn<TAdapterNavigateFn> & SpecialNavigateOptions,
        ]
      : [
          route: TRouteName,
          input: GetPathInputByRoute<ExtractRoute<TRoutes, TRouteName>>,
          options?: RedirectOptionsByAdapterNavigateFn<TAdapterNavigateFn> & SpecialNavigateOptions,
        ]
  ): RedirectTask<NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn>> {
    const routeName = args[0] as ExtractRoutesKeys<TRoutes>
    const input = (args[1] ?? {}) as unknown
    const options = args[2] as RedirectOptionsByAdapterNavigateFn<TAdapterNavigateFn> | undefined
    const route = routes[routeName]
    if (!route) {
      throw new Error(`Route "${routeName}" not found`)
    }
    const to = route.get(input) as string
    return redirectTo(to, options)
  }
  return Object.assign(redirect, { to: redirectTo })
}

export const createRouter = ({
  addHashToLocation,
  routes = getClientPoints().routes,
  Page404: ProvidedPage404,
  pagesTree,
  hook = useBrowserLocation,
  navigate: adapterNavigate = browserNavigate,
  ErrorClass,
  forceRerender,
}: {
  addHashToLocation?: boolean
  routes?: RoutesPretty
  Page404?: React.ComponentType
  pagesTree?: PagesTree
  hook?: BaseLocationHook
  navigate?: AdapterNavigateFn
  ErrorClass?: ClassLikeError0<ErrorPoint0>
  forceRerender?: boolean
  _navigate?: never
  _Redirect?: never
  _redirect?: never
}): ((props: {
  children?: React.ReactNode
  status?: NavigationStatus
  ssrLocation?: AnyLocation | undefined
}) => React.ReactElement) => {
  function RouterRoutes({ Page404 }: { Page404?: React.ComponentType }): React.ReactElement {
    if (forceRerender) {
      useNavigationLocationContext()
    }
    return <RenderPagesTree pagesTree={pagesTree ?? getClientPoints().pagesTree} Page404={Page404} />
  }

  return function Router({
    children,
    ssrLocation = _ss.__POINT0_SSR_LOCATION__.get(),
    Page404 = ProvidedPage404,
  }: {
    children?: React.ReactNode
    ssrLocation?: AnyLocation | undefined
    Page404?: React.ComponentType
  }) {
    const wouterSsrProps = useMemo(() => {
      if (env.side.is.client) {
        return {}
      }
      if (!ssrLocation) {
        throw new Error(`ssrLocation is required on ssr`)
      }
      return { ssrPath: ssrLocation.pathname, ssrSearch: ssrLocation.searchString }
    }, [ssrLocation])

    const useAdapterLocation = useCallback<UseLocationFn>((options) => {
      const [wouterLocation] = useWouterLocation()
      const [wouterSearchParams] = useWouterSearchParams()
      const pathnameWithSearchParams = [wouterLocation, wouterSearchParams.toString()].filter(Boolean).join('?')
      const hash = options?.addHash ? (typeof window !== 'undefined' ? window.location.hash : '') : ''
      return routes._.getLocation(pathnameWithSearchParams + hash)
    }, [])

    const aroundNav = useCallback<AroundNavHandler>((navigate, to, options) => {
      const { specialOptions, wouterOptions } = splitWouterAndSpecialOptions(options)
      return navigateWithTransitions({
        to,
        options: toSpecialNavigateOptions(specialOptions),
        navigate: () => navigate(to, wouterOptions),
        ErrorClass,
      })
    }, [])

    const ssrContext = _point0_env.side.is.client
      ? {}
      : useMemo(() => {
          const value = {} as SsrContext
          const syncRedirectTask = (): void => {
            const to = value.redirectTo
            const status = value.statusCode
            if (!to) {
              return
            }
            ssrRedirectTask.set(new RedirectTask({ to, status }))
          }
          return new Proxy(value, {
            set(target, property, nextValue, receiver) {
              const result = Reflect.set(target, property, nextValue, receiver)
              if (property === 'redirectTo' || property === 'statusCode') {
                syncRedirectTask()
              }
              return result
            },
          }) as SsrContext
        }, [])

    return (
      <NativeWouterRouter {...wouterSsrProps} hook={hook} aroundNav={aroundNav} ssrContext={ssrContext}>
        <NavigationContextProvider
          useAdapterLocation={useAdapterLocation}
          ssrLocation={ssrLocation}
          addHashToLocation={addHashToLocation}
          adapterNavigate={adapterNavigate}
          ErrorClass={ErrorClass}
        >
          {children ?? <RouterRoutes Page404={Page404} />}
        </NavigationContextProvider>
      </NativeWouterRouter>
    )
  }
}

const DefaultPage404 = () => <>Page Not Found</>

export const createRouterRoutes = ({
  pagesTree,
  Page404: ProvidedPage404,
  forceRerender,
}: {
  pagesTree?: PagesTree
  Page404?: React.ComponentType
  forceRerender?: boolean
}) => {
  return function RouterRoutes({ Page404 = ProvidedPage404 }: { Page404?: React.ComponentType }) {
    if (forceRerender) {
      useNavigationLocationContext()
    }
    return <RenderPagesTree pagesTree={pagesTree ?? getClientPoints().pagesTree} Page404={Page404} />
  }
}

export const createNavigation = <
  TRoutes extends RoutesPretty,
  TBaseLocationHook extends BaseLocationHook = BrowserLocationHook,
  TAdapterNavigateFn extends AdapterNavigateFnByHook<TBaseLocationHook> = AdapterNavigateFnByHook<TBaseLocationHook>,
  TErrorClass extends ClassLikeError0<ErrorPoint0> = ClassLikeError0<ErrorPoint0>,
>({
  addHashToLocation,
  routes = (() => {
    try {
      return getClientPoints().routes
    } catch {
      throw new Error('You should provide routes, or call ClientPoints.mount(points) before createNavigation')
    }
  })(),
  Page404,
  pagesTree,
  hook = useBrowserLocation as TBaseLocationHook,
  ErrorClass = ErrorPoint0 as unknown as TErrorClass,
  navigate = browserNavigate as TAdapterNavigateFn,
  forceRerender = false,
}: {
  addHashToLocation?: boolean
  routes?: TRoutes
  Page404?: React.ComponentType
  pagesTree?: PagesTree
  hook?: TBaseLocationHook
  ErrorClass?: TErrorClass
  navigate?: TAdapterNavigateFn
  forceRerender?: boolean
} = {}) => {
  return {
    navigate: createNavigate({ routes, navigate, ErrorClass }),
    Link: createLink({ routes, hook }),
    NavLink: createNavLink({ routes, hook }),
    Redirect: createRedirectComponent({ routes, hook }),
    Router: createRouter({ addHashToLocation, routes, Page404, pagesTree, hook, ErrorClass, forceRerender }),
    RouterRoutes: createRouterRoutes({ pagesTree, Page404, forceRerender }),
    redirect: createRedirectHelper({ routes, navigate, ErrorClass }),
  }
}

export const RenderPagesTree = ({
  pagesTree,
  Page404 = DefaultPage404,
  level = 0,
}: {
  pagesTree: PagesTree
  Page404?: React.ComponentType
  level?: number
}) => {
  return (
    <Switch>
      {pagesTree.map((node) => {
        if (node.Layout) {
          const Layout = node.Layout
          return (
            <Route key={`layout-${node.layoutName}`} path={node.pagesRoutesRegex}>
              <Layout>
                <Switch>
                  {node.pages.map(({ pageRoute, Page }) => {
                    return (
                      <Route key={pageRoute.definition} path={pageRoute.definition}>
                        <Page />
                      </Route>
                    )
                  })}
                  {node.nested && <RenderPagesTree pagesTree={node.nested} Page404={Page404} level={level + 1} />}
                  <NavigationPageStateSetter status="error" error="Page Not Found">
                    <Page404 />
                  </NavigationPageStateSetter>
                </Switch>
              </Layout>
            </Route>
          )
        }
        return (
          <Fragment key={`nolayout-${node.layoutName}`}>
            {node.pages.map(({ pageRoute, Page }) => {
              return (
                <Route key={pageRoute.definition} path={pageRoute.definition}>
                  <Page />
                </Route>
              )
            })}

            {node.nested && <RenderPagesTree pagesTree={node.nested} Page404={Page404} level={level + 1} />}
          </Fragment>
        )
      })}

      <Route path="*">
        <NavigationPageStateSetter status="error" error="Page Not Found">
          <Page404 />
        </NavigationPageStateSetter>
      </Route>
    </Switch>
  )
}
