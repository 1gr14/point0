import { Route0, type AnyLocation, type ExtractRoute, type ExtractRoutesKeys, type RoutesPretty } from '@devp0nt/route0'
import type { ExactLocation, GetPathInputByRoute, IsParamsOptional } from '@devp0nt/route0'
import { _point0_env, _ss, env, ErrorPoint0, getClientPoints, log } from '@point0/core'
import type {
  AnyNiceReadyPoint,
  ClassLikeError0,
  ClientPointsLayouts,
  NormalizedLazyPointsCollectionRecord,
  PagesTree,
  PrefetchPagePolicy,
  ReadyPointsCollectionRecord,
} from '@point0/core'
import {
  navigateWithTransitions,
  NavigationContextProvider,
  RedirectTask,
  specialNavigationOptionsSymbols,
  useLocation,
  useNavigationLocationContext,
} from '@point0/core/navigation'
import type {
  AdapterNavigateFn,
  NavigateHelper,
  NavigateOptionsByAdapterNavigateFn,
  NavigateWithTransitionsReturnType,
  RedirectComponent,
  RedirectHelper,
  RedirectOptionsByAdapterNavigateFn,
  SpecialLinkOptions,
  SpecialNavigateOptions,
  SpecialRedirectOptions,
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
  useRouter as useWouterRouter,
  useSearchParams as useWouterSearchParams,
} from 'wouter'
import type { AroundNavHandler, BaseLocationHook, HookNavigationOptions, NavigationalProps, SsrContext } from 'wouter'
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
export type LinkProps<H extends BaseLocationHook = BrowserLocationHook> = NavigationalProps<H> &
  LinkAsChildProps &
  SpecialLinkOptions<HookNavigationOptions<H>>
export type AdapterNavigateFnByHook<TBaseLocationHook extends BaseLocationHook = BrowserLocationHook> =
  ReturnType<TBaseLocationHook>[1]

type StringOrFalsy = string | undefined | null | false
export type NavLinkClassNameProps = {
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
export type NavLinkAsChildProps = AsChildProps<
  { children: ReactElement; onClick?: MouseEventHandler },
  Omit<HTMLLinkAttributes, 'className'> & RefAttributes<HTMLAnchorElement>
>
export type NavLinkProps<H extends BaseLocationHook = BrowserLocationHook> = NavigationalProps<H> &
  NavLinkAsChildProps &
  NavLinkClassNameProps &
  SpecialLinkOptions<HookNavigationOptions<H>>
export type Layout404TypeOne = string | AnyNiceReadyPoint<'layout'>
export type Layout404Type = Array<Layout404TypeOne> | Layout404TypeOne

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
): {
  wouterLinkProps: LinkProps
  to: string
  pointWithLocation:
    | { point: NormalizedLazyPointsCollectionRecord | ReadyPointsCollectionRecord; location: AnyLocation }
    | undefined
} => {
  const {
    to,
    href,
    onMouseEnter: providedOnMouseEnter,
    onMouseLeave: providedOnMouseLeave,
    prefetchOnNavigate,
    prefetchOnHover,
    prefetch,
    before,
    after,
    ...rest
  } = props as LinkProps<any> &
    SpecialLinkOptions<HookNavigationOptions<TBaseLocationHook>> & {
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
      [specialNavigationOptionsSymbols.prefetchOnHover]: prefetchOnHover,
      [specialNavigationOptionsSymbols.prefetch]: prefetchOnNavigate !== undefined ? prefetchOnNavigate : prefetch,
      [specialNavigationOptionsSymbols.prefetchOnNavigate]: prefetchOnNavigate,
      [specialNavigationOptionsSymbols.before]: before,
      [specialNavigationOptionsSymbols.after]: after,
    } as LinkProps, // & SpecialLinkOptionsInDataAttributes,
  }
}

const splitOptions = <TAdapterNavigateFn extends AdapterNavigateFn = AdapterNavigateFn>(
  options:
    | undefined
    | (NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn> &
        SpecialNavigateOptions<NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn>> &
        SpecialLinkOptions<NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn>> &
        SpecialRedirectOptions),
): {
  normalOptions: SpecialNavigateOptions<NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn>> &
    SpecialLinkOptions<NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn>>
  wouterOptions: NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn>
} => {
  const getOptionValue = (key: keyof typeof specialNavigationOptionsSymbols) => {
    const normalValue = options?.[key]
    if (typeof normalValue !== 'undefined') {
      return normalValue
    }
    const symbolValue = (options as any)?.[specialNavigationOptionsSymbols[key]]
    if (typeof symbolValue !== 'undefined') {
      return symbolValue
    }
    return undefined
  }
  const specialOptionsWithStringKeys = {
    prefetchOnNavigate: getOptionValue('prefetchOnNavigate'),
    prefetchOnHover: getOptionValue('prefetchOnHover'),
    prefetch: getOptionValue('prefetch'),
    before: getOptionValue('before'),
    after: getOptionValue('after'),
    status: getOptionValue('status'),
  }
  const specialOptionsWithSymbolKeys = {
    [specialNavigationOptionsSymbols.prefetchOnNavigate]: specialOptionsWithStringKeys.prefetchOnNavigate,
    [specialNavigationOptionsSymbols.prefetchOnHover]: specialOptionsWithStringKeys.prefetchOnHover,
    [specialNavigationOptionsSymbols.prefetch]: specialOptionsWithStringKeys.prefetch,
    [specialNavigationOptionsSymbols.before]: specialOptionsWithStringKeys.before,
    [specialNavigationOptionsSymbols.after]: specialOptionsWithStringKeys.after,
    [specialNavigationOptionsSymbols.status]: specialOptionsWithStringKeys.status,
  }
  const optionsWithoutSpecialKeys = {
    ...options,
  }
  delete optionsWithoutSpecialKeys.prefetchOnNavigate
  delete optionsWithoutSpecialKeys.prefetchOnHover
  delete optionsWithoutSpecialKeys.prefetch
  delete optionsWithoutSpecialKeys.before
  delete optionsWithoutSpecialKeys.after
  delete optionsWithoutSpecialKeys.status
  delete (optionsWithoutSpecialKeys as any)[specialNavigationOptionsSymbols.prefetchOnNavigate]
  delete (optionsWithoutSpecialKeys as any)[specialNavigationOptionsSymbols.prefetchOnHover]
  delete (optionsWithoutSpecialKeys as any)[specialNavigationOptionsSymbols.prefetch]
  delete (optionsWithoutSpecialKeys as any)[specialNavigationOptionsSymbols.before]
  delete (optionsWithoutSpecialKeys as any)[specialNavigationOptionsSymbols.after]
  delete (optionsWithoutSpecialKeys as any)[specialNavigationOptionsSymbols.status]
  const wouterOptions = {
    ...optionsWithoutSpecialKeys,
    ...specialOptionsWithSymbolKeys,
  }
  const normalOptions = {
    ...optionsWithoutSpecialKeys,
    ...specialOptionsWithStringKeys,
  }
  return {
    wouterOptions,
    normalOptions,
  }
}

const getRoutes = () => {
  try {
    return getClientPoints().routes
  } catch {
    throw new Error('You should provide routes, or call ClientPoints.mount(points) before createNavigation')
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
    options?: NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn> &
      SpecialNavigateOptions<NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn>>,
  ): NavigateWithTransitionsReturnType<TErrorClass> => {
    const { normalOptions, wouterOptions } = splitOptions(options)
    return navigateWithTransitions({
      to,
      options: normalOptions,
      navigate: () => adapterNavigate(to, wouterOptions),
      ErrorClass,
    })
  }
  async function navigate<TRouteName extends ExtractRoutesKeys<TRoutes>>(
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
  ): NavigateWithTransitionsReturnType<TErrorClass> {
    const routeName = args[0] as ExtractRoutesKeys<TRoutes>
    const input = args[1] as unknown
    const options = args[2] as
      | (NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn> &
          SpecialNavigateOptions<NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn>>)
      | undefined
    const route = routes[routeName]
    if (!route) {
      throw new ErrorClass(`Route "${routeName}" not found`)
    }

    const to = route.get(input || {}) as string
    const { normalOptions, wouterOptions } = splitOptions(options)
    return await navigateWithTransitions({
      to,
      options: normalOptions,
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
      SpecialLinkOptions<HookNavigationOptions<TBaseLocationHook>>
  }[ExtractRoutesKeys<TRoutes>]
  function Link(
    props:
      | LinkRouteProps
      | ({ to: string } & LinkAsChildProps &
          HookNavigationOptions<TBaseLocationHook> &
          SpecialLinkOptions<HookNavigationOptions<TBaseLocationHook>>)
      | ({ href: string } & LinkAsChildProps &
          HookNavigationOptions<TBaseLocationHook> &
          SpecialLinkOptions<HookNavigationOptions<TBaseLocationHook>>),
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
      SpecialLinkOptions<HookNavigationOptions<TBaseLocationHook>>
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
        }
        return { type: 'same', exact: false, same: true, ancestor: false, descendant: false, unmatched: false }
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
}): RedirectComponent<TRoutes, AdapterNavigateFnByHook<TBaseLocationHook>> => {
  const Redirect: RedirectComponent<TRoutes, AdapterNavigateFnByHook<TBaseLocationHook>> = (
    props: {
      to?: string
      href?: string
      route?: string
      input?: Record<string, unknown>
      task?: RedirectTask<HookNavigationOptions<TBaseLocationHook>>
      status?: number
    } & SpecialNavigateOptions<HookNavigationOptions<TBaseLocationHook>>,
  ): React.ReactElement | null => {
    const {
      route: routeName,
      input = {},
      to: providedTo,
      href: providedHref,
      task: providedTask,
      before: providedBefore,
      after: providedAfter,
      prefetch: providedPrefetch,
      status: providedStatus,
      ...rest
    } = props
    const toByTaskOrProvided = providedTask?.to !== undefined ? providedTask.to : providedTo
    const prefetchByTaskOrProvided =
      providedTask?.options?.prefetch !== undefined ? providedTask.options.prefetch : providedPrefetch
    const beforeByTaskOrProvided =
      providedTask?.options?.before !== undefined
        ? providedBefore !== undefined
          ? (...args: [any]) => {
              void providedBefore(...args)
              void providedTask.options?.before(...args)
            }
          : providedTask.options?.before
        : providedBefore
    const afterByTaskOrProvided =
      providedTask?.options?.after !== undefined
        ? providedAfter !== undefined
          ? (...args: [any]) => {
              void providedAfter(...args)
              void providedTask.options?.after(...args)
            }
          : providedTask.options?.after
        : providedAfter
    const statusByTaskOrProvided = providedStatus !== undefined ? providedStatus : providedTask?.status
    const validStatus =
      statusByTaskOrProvided !== undefined && [301, 302, 303, 307, 308].includes(statusByTaskOrProvided)
        ? statusByTaskOrProvided
        : undefined

    const finalTo = _useFinalTo({
      routes,
      routeName,
      input,
      providedTo: toByTaskOrProvided,
      providedHref,
      componentName: 'Redirect',
    })

    const router = useWouterRouter()
    const { ssrContext } = router
    if (ssrContext && validStatus !== undefined) {
      ssrContext.statusCode = validStatus
    }

    return (
      <NativeWouterRedirect
        {...rest}
        {...{
          prefetch: prefetchByTaskOrProvided,
          before: beforeByTaskOrProvided,
          after: afterByTaskOrProvided,
        }}
        to={finalTo}
      />
    )
  }

  return Redirect
}

export const createRedirectHelper = <
  TRoutes extends RoutesPretty,
  TAdapterNavigateFn extends AdapterNavigateFn = typeof browserNavigate,
  TErrorClass extends ClassLikeError0<ErrorPoint0> = ClassLikeError0<ErrorPoint0>,
>({
  routes,
}: {
  routes: TRoutes
  navigate?: TAdapterNavigateFn
  ErrorClass?: TErrorClass
}): RedirectHelper<TRoutes, TAdapterNavigateFn> => {
  const redirectTo = (
    to: string,
    options?: RedirectOptionsByAdapterNavigateFn<TAdapterNavigateFn> &
      SpecialNavigateOptions<NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn>>,
  ) => {
    const { status, ...rest } = options ?? {}
    const task = new RedirectTask<NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn>>({
      to,
      status,
      options: rest as NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn> &
        SpecialNavigateOptions<NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn>>,
    })
    return task
  }
  function redirect<TRouteName extends ExtractRoutesKeys<TRoutes>>(
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

export const createRouter = <
  TRoutes extends RoutesPretty,
  TBaseLocationHook extends BaseLocationHook = BrowserLocationHook,
  TErrorClass extends ClassLikeError0<ErrorPoint0> = ClassLikeError0<ErrorPoint0>,
>({
  addHashToLocation,
  routes = getRoutes(),
  Page404: ProvidedPage404,
  layout404: providedLayout404,
  pagesTree,
  layouts,
  hook = useBrowserLocation,
  navigate: adapterNavigate = browserNavigate,
  ErrorClass,
  forceRerender,
  prependRoutes,
  appendRoutes,
  _navigate = createNavigate({ routes, navigate: adapterNavigate, ErrorClass }),
  _redirect = createRedirectHelper({ routes, navigate: adapterNavigate, ErrorClass }),
  _Redirect = createRedirectComponent({ routes, hook }),
}: {
  addHashToLocation?: boolean
  routes?: RoutesPretty
  Page404?: React.ComponentType
  layout404?: Layout404Type
  pagesTree?: PagesTree
  layouts?: ClientPointsLayouts
  hook?: BaseLocationHook
  navigate?: AdapterNavigateFn
  ErrorClass?: ClassLikeError0<ErrorPoint0>
  forceRerender?: boolean
  prependRoutes?: React.ReactNode
  appendRoutes?: React.ReactNode
  _navigate?: NavigateHelper<TRoutes, AdapterNavigateFnByHook<TBaseLocationHook>, TErrorClass>
  _Redirect?: RedirectComponent<TRoutes, AdapterNavigateFnByHook<TBaseLocationHook>>
  _redirect?: RedirectHelper<TRoutes, AdapterNavigateFnByHook<TBaseLocationHook>>
}): ((props: {
  children?: React.ReactNode
  ssrLocation?: AnyLocation | undefined
  Page404?: React.ComponentType
  layout404?: Layout404Type
}) => React.ReactElement) => {
  function RouterRoutes({
    Page404,
    layout404,
  }: {
    Page404?: React.ComponentType
    layout404?: Layout404Type
  }): React.ReactElement {
    if (forceRerender) {
      useNavigationLocationContext()
    }
    return (
      <RenderPagesTree
        pagesTree={pagesTree ?? getClientPoints().pagesTree}
        layouts={layouts ?? getClientPoints().layouts}
        Page404={Page404}
        layout404={layout404}
        prepend={prependRoutes}
        append={appendRoutes}
      />
    )
  }

  return function Router({
    children,
    ssrLocation = _ss.__POINT0_SSR_LOCATION__.get(),
    Page404 = ProvidedPage404,
    layout404 = providedLayout404,
  }: {
    children?: React.ReactNode
    ssrLocation?: AnyLocation | undefined
    Page404?: React.ComponentType
    layout404?: Layout404Type
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
      const origin = env.side.is.server
        ? ssrLocation?.origin
        : typeof window !== 'undefined'
          ? window.location.origin
          : undefined
      return routes._.getLocation(origin + pathnameWithSearchParams + hash)
    }, [])

    const aroundNav = useCallback<AroundNavHandler>((navigate, to, options) => {
      const { normalOptions, wouterOptions } = splitOptions(options)
      return navigateWithTransitions({
        to,
        options: normalOptions,
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
            _ss.__POINT0_SSR_REDIRECT_TASK__.set({ task: new RedirectTask({ to, status }), handled: false })
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
          navigate={_navigate}
          redirect={_redirect}
          Redirect={_Redirect}
          ErrorClass={ErrorClass}
        >
          {children ?? <RouterRoutes Page404={Page404} layout404={layout404} />}
        </NavigationContextProvider>
      </NativeWouterRouter>
    )
  }
}

const DefaultPage404 = () => <>Page Not Found</>

export const createRouterRoutes = ({
  pagesTree,
  layouts,
  Page404: ProvidedPage404,
  layout404: providedLayout404,
  forceRerender,
  prepend: providedPrepend,
  append: providedAppend,
}: {
  pagesTree?: PagesTree
  layouts?: ClientPointsLayouts
  Page404?: React.ComponentType
  layout404?: Layout404Type
  forceRerender?: boolean
  prepend?: React.ReactNode
  append?: React.ReactNode
}) => {
  return function RouterRoutes({
    Page404 = ProvidedPage404,
    layout404 = providedLayout404,
    prepend = providedPrepend,
    append = providedAppend,
  }: {
    Page404?: React.ComponentType
    layout404?: Layout404Type
    prepend?: React.ReactNode
    append?: React.ReactNode
  }) {
    if (forceRerender) {
      useNavigationLocationContext()
    }
    return (
      <RenderPagesTree
        pagesTree={pagesTree ?? getClientPoints().pagesTree}
        layouts={layouts ?? getClientPoints().layouts}
        Page404={Page404}
        layout404={layout404}
        prepend={prepend}
        append={append}
      />
    )
  }
}

export const createNavigation = <
  TRoutes extends RoutesPretty,
  TBaseLocationHook extends BaseLocationHook = BrowserLocationHook,
  TAdapterNavigateFn extends AdapterNavigateFnByHook<TBaseLocationHook> = AdapterNavigateFnByHook<TBaseLocationHook>,
  TErrorClass extends ClassLikeError0<ErrorPoint0> = ClassLikeError0<ErrorPoint0>,
>({
  addHashToLocation,
  routes = getRoutes(),
  Page404,
  layout404,
  pagesTree,
  layouts,
  hook = useBrowserLocation as TBaseLocationHook,
  ErrorClass = ErrorPoint0 as unknown as TErrorClass,
  navigate: adapterNavigate = browserNavigate as TAdapterNavigateFn,
  forceRerender = false,
  prependRoutes,
  appendRoutes,
}: {
  addHashToLocation?: boolean
  routes?: TRoutes
  Page404?: React.ComponentType
  layout404?: Layout404Type
  pagesTree?: PagesTree
  layouts?: ClientPointsLayouts
  hook?: TBaseLocationHook
  ErrorClass?: TErrorClass
  navigate?: TAdapterNavigateFn
  forceRerender?: boolean
  prependRoutes?: React.ReactNode
  appendRoutes?: React.ReactNode
} = {}) => {
  const navigate = createNavigate({ routes, navigate: adapterNavigate, ErrorClass })
  const redirect = createRedirectHelper({ routes, navigate: adapterNavigate, ErrorClass })
  const Redirect = createRedirectComponent({ routes, hook })
  return {
    navigate,
    Link: createLink({ routes, hook }),
    NavLink: createNavLink({ routes, hook }),
    Redirect,
    Router: createRouter({
      addHashToLocation,
      routes,
      Page404,
      layout404,
      pagesTree,
      layouts,
      hook,
      navigate: adapterNavigate,
      ErrorClass,
      forceRerender,
      prependRoutes,
      appendRoutes,
      _navigate: navigate,
      _redirect: redirect,
      _Redirect: Redirect,
    }),
    RouterRoutes: createRouterRoutes({
      pagesTree,
      layouts,
      Page404,
      layout404,
      forceRerender,
      prepend: prependRoutes,
      append: appendRoutes,
    }),
    redirect,
  }
}

const WrappedPage404 = ({
  Page404,
  layout404,
  layouts,
}: {
  layouts: ClientPointsLayouts
  Page404: React.ComponentType
  layout404?: Layout404Type
}) => {
  const items: Layout404TypeOne[] = (Array.isArray(layout404) ? layout404 : [layout404]).filter(
    (item): item is Layout404TypeOne => Boolean(item),
  )

  if (items.length === 0) {
    return <Page404 />
  }

  return items.reduceRight<React.ReactNode>(
    (children, layoutItem) => {
      if (typeof layoutItem === 'string') {
        if (!(layoutItem in layouts)) {
          return children
        }
        const LayoutByName = layouts[layoutItem as keyof ClientPointsLayouts]
        return <LayoutByName>{children}</LayoutByName>
      }

      const LayoutByPoint = layoutItem.X
      return <LayoutByPoint>{children}</LayoutByPoint>
    },
    <Page404 />,
  )
}

export const RenderPagesTree = ({
  pagesTree,
  layouts,
  Page404 = DefaultPage404,
  layout404,
  level = 0,
  prepend,
  append,
}: {
  pagesTree: PagesTree
  layouts: ClientPointsLayouts
  Page404?: React.ComponentType
  layout404?: Layout404Type
  level?: number
  append?: React.ReactNode
  prepend?: React.ReactNode
}) => {
  return (
    <Switch>
      {level === 0 && prepend}
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
                  {node.nested && (
                    <RenderPagesTree
                      pagesTree={node.nested}
                      layouts={layouts}
                      Page404={Page404}
                      layout404={layout404}
                      level={level + 1}
                    />
                  )}
                  <WrappedPage404 layouts={layouts} Page404={Page404} layout404={layout404} />
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

            {node.nested && (
              <RenderPagesTree
                pagesTree={node.nested}
                layouts={layouts}
                Page404={Page404}
                layout404={layout404}
                level={level + 1}
              />
            )}
          </Fragment>
        )
      })}

      <Route path="*">
        <WrappedPage404 layouts={layouts} Page404={Page404} layout404={layout404} />
      </Route>
      {level === 0 && append}
    </Switch>
  )
}
