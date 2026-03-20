import {
  type AnyLocation,
  type AnyRoute,
  type ExtractRoute,
  type ExtractRoutesKeys,
  Route0,
  type RoutesPretty,
} from '@devp0nt/route0'
import type { GetPathInputByRoute, IsParamsOptional } from '@devp0nt/route0'
import {
  _ssItems,
  // _wrapUseNavigate,
  navigateWithTransitions,
  ClientPoints,
  env,
  ErrorPoint0,
  log,
  RouterContext,
  RouterContextProvider,
  useLocation,
} from '@point0/core'
import type {
  ClassLikeError0,
  NormalizedLazyPointsCollectionRecord,
  PagesTree,
  ReadyPointsCollectionRecord,
  RouterStatus,
  UseAdapterLocationFn,
  NavigateWithTransitionsReturnType,
} from '@point0/core'
import React, { Fragment, useCallback, useMemo, useRef } from 'react'
import type { AnchorHTMLAttributes, MouseEventHandler, ReactElement, RefAttributes } from 'react'
import {
  Route,
  Switch,
  useLocation as useWouterLocation,
  useSearchParams as useWouterSearchParams,
  Link as NativeWouterLink,
  Redirect as NativeWouterRedirect,
  Router as NativeWouterRouter,
} from 'wouter'
import type { BaseLocationHook, HookNavigationOptions, NavigationalProps, AroundNavHandler } from 'wouter'
import type { BrowserLocationHook } from 'wouter/use-browser-location'
import { navigate as browserNavigate, useBrowserLocation } from 'wouter/use-browser-location'

type AsChildProps<ComponentProps, DefaultElementProps> =
  | ({ asChild?: false } & DefaultElementProps)
  | ({ asChild: true } & ComponentProps)

type HTMLLinkAttributes = AnchorHTMLAttributes<HTMLAnchorElement>
type LinkAsChildProps = AsChildProps<
  { children: ReactElement; onClick?: MouseEventHandler },
  HTMLLinkAttributes & RefAttributes<HTMLAnchorElement>
>
type LinkProps<H extends BaseLocationHook = BrowserLocationHook> = NavigationalProps<H> & LinkAsChildProps
type Tail<T extends readonly unknown[]> = T extends readonly [unknown, ...infer R] ? R : never
type NavigateFnByHook<TBaseLocationHook extends BaseLocationHook = BrowserLocationHook> =
  ReturnType<TBaseLocationHook>[1]

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
  NavLinkClassNameProps

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
}) => {
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
}) => {
  return useMemo(
    () => _resolveFinalTo({ routes, routeName, input, providedTo, providedHref, componentName }),
    [routes, routeName, JSON.stringify(input), providedTo, providedHref, componentName],
  )
}

const _getWouterLinkProps = <TBaseLocationHook extends BaseLocationHook = BrowserLocationHook>(
  props: LinkProps<TBaseLocationHook>,
  // navigate: NavigateFnByHook<TBaseLocationHook>,
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
    // onClick: providedOnClick,
    onMouseEnter: providedOnMouseEnter,
    onMouseLeave: providedOnMouseLeave,
    // replace,
    ...rest
  } = props as LinkProps & {
    onMouseEnter?: (e: React.MouseEvent<HTMLAnchorElement>) => void
    onMouseLeave?: (e: React.MouseEvent<HTMLAnchorElement>) => void
  }
  const finalTo = to || href || '#'
  const prefetchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pointWithLocation = useMemo(() => {
    if (!finalTo) {
      return undefined
    }
    if (finalTo.startsWith('#')) {
      return undefined
    }
    return ClientPoints.getInstance()._getPageByHref(finalTo)
  }, [finalTo])
  const onMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (pointWithLocation && pointWithLocation.point.polh !== false) {
        // Clear any existing timeout
        if (prefetchTimeoutRef.current) {
          clearTimeout(prefetchTimeoutRef.current)
        }
        // Set a N ms delay before prefetching
        prefetchTimeoutRef.current = setTimeout(
          () => {
            prefetchTimeoutRef.current = null
            void ClientPoints.getInstance().prefetchPage({
              location: pointWithLocation.location,
              trigger: 'linkHover',
            })
          },
          pointWithLocation.point.polh === true ? 30 : pointWithLocation.point.polh,
        )
      }
      void providedOnMouseEnter?.(e)
    },
    [pointWithLocation],
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
  // const onClick = useCallback(
  //   (e: React.MouseEvent<HTMLAnchorElement>) => {
  //     if (e.metaKey || e.ctrlKey) return
  //     e.preventDefault()
  //     void navigate(finalTo, { replace })
  //     providedOnClick?.(e)
  //   },
  //   [finalTo, replace, navigate, providedOnClick],
  // )
  return {
    to: finalTo,
    pointWithLocation,
    wouterLinkProps: {
      ...rest,
      onMouseEnter,
      onMouseLeave,
      to: finalTo,
      // replace,
      // onClick,
    } as LinkProps,
  }
}

export const createNavigate = <
  TRoutes extends RoutesPretty,
  TNavigate extends (to: string, ...rest: any[]) => any = typeof browserNavigate,
  TErrorClass extends ClassLikeError0<ErrorPoint0> = ClassLikeError0<ErrorPoint0>,
>({
  routes,
  navigate = browserNavigate as TNavigate,
  ErrorClass = ErrorPoint0 as unknown as TErrorClass,
}: {
  routes: TRoutes
  navigate?: TNavigate
  ErrorClass?: TErrorClass
}) => {
  const wrappedNavigate = (...args: Parameters<TNavigate>): NavigateWithTransitionsReturnType<TErrorClass> => {
    const to = args[0]
    return navigateWithTransitions({
      to,
      navigate: () => navigate(...(args as unknown as [string, ...Tail<Parameters<TNavigate>>])),
      ErrorClass,
    })
  }
  async function navigate0<TRouteName extends ExtractRoutesKeys<TRoutes>>(
    ...args: IsParamsOptional<ExtractRoute<TRoutes, TRouteName>> extends true
      ? [
          route: TRouteName,
          input?: GetPathInputByRoute<ExtractRoute<TRoutes, TRouteName>>,
          ...rest: Tail<Parameters<TNavigate>>,
        ]
      : [
          route: TRouteName,
          input: GetPathInputByRoute<ExtractRoute<TRoutes, TRouteName>>,
          ...rest: Tail<Parameters<TNavigate>>,
        ]
  ): NavigateWithTransitionsReturnType<TErrorClass> {
    const [routeName, input, ...rest] = args as [ExtractRoutesKeys<TRoutes>, unknown, ...Tail<Parameters<TNavigate>>]
    const route = routes[routeName]
    if (!route) {
      throw new ErrorClass(`Route "${routeName}" not found`)
    }

    const to = route.get(input || {}) as string
    return await navigateWithTransitions({
      to,
      navigate: () => navigate(to, ...(rest as Tail<Parameters<TNavigate>>)),
      ErrorClass,
    })
  }
  return Object.assign(navigate0, { to: wrappedNavigate }) as never as {
    <TRouteName extends ExtractRoutesKeys<TRoutes>>(
      ...args: IsParamsOptional<ExtractRoute<TRoutes, TRouteName>> extends true
        ? [
            route: TRouteName,
            input?: GetPathInputByRoute<ExtractRoute<TRoutes, TRouteName>>,
            ...rest: Tail<Parameters<TNavigate>>,
          ]
        : [
            route: TRouteName,
            input: GetPathInputByRoute<ExtractRoute<TRoutes, TRouteName>>,
            ...rest: Tail<Parameters<TNavigate>>,
          ]
    ): Promise<{ location: AnyLocation; error: InstanceType<TErrorClass> | undefined }>
    to: typeof wrappedNavigate
  }
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
      HookNavigationOptions<TBaseLocationHook>
  }[ExtractRoutesKeys<TRoutes>]
  function Link0(
    props:
      | LinkRouteProps
      | ({ to: string } & LinkAsChildProps & HookNavigationOptions<TBaseLocationHook>)
      | ({ href: string } & LinkAsChildProps & HookNavigationOptions<TBaseLocationHook>),
  ): React.ReactElement
  function Link0(props: {
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
  return Link0
}

export const createNavLink = <
  TRoutes extends RoutesPretty,
  TBaseLocationHook extends BaseLocationHook = BrowserLocationHook,
>({
  routes,
  hook: _hook,
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
      NavLinkClassNameProps
  }[ExtractRoutesKeys<TRoutes>]
  function NavLink0(
    props:
      | NavLinkRouteProps
      | ({ to: string } & NavLinkProps<TBaseLocationHook>)
      | ({ href: string } & NavLinkProps<TBaseLocationHook>),
  ): React.ReactElement
  function NavLink0(props: {
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
    const { pointWithLocation, wouterLinkProps, to } = _getWouterLinkProps<TBaseLocationHook>({
      ...rest,
      to: finalTo,
    })
    const location = useLocation(pointWithLocation?.point.route)
    const statusOptions = useMemo<NavLinkStateOptions>(() => {
      if (location.exact) {
        if (
          location.origin
            ? Route0.toAbsLocation(Route0.getLocation(to), location.origin).href === location.href
            : to === location.hrefRel
        ) {
          return { type: 'exact', exact: true, same: false, ancestor: false, descendant: false, unmatched: false }
        } else {
          return { type: 'same', exact: false, same: true, ancestor: false, descendant: false, unmatched: false }
        }
      }
      if (location.ancestor) {
        return { type: 'ancestor', exact: false, same: false, ancestor: true, descendant: false, unmatched: false }
      }
      if (location.descendant) {
        return { type: 'descendant', exact: false, same: false, ancestor: false, descendant: true, unmatched: false }
      }
      return { type: 'unmatched', exact: false, same: false, ancestor: false, descendant: false, unmatched: true }
    }, [location, to])
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
  return NavLink0
}

export const createRedirectComponent = <
  TRoutes extends RoutesPretty,
  TBaseLocationHook extends BaseLocationHook = BrowserLocationHook,
>({
  routes,
  hook: _hook,
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
      HookNavigationOptions<TBaseLocationHook>
  }[ExtractRoutesKeys<TRoutes>]

  function Redirect0(
    props:
      | RedirectRouteProps
      | ({ to: string } & HookNavigationOptions<TBaseLocationHook>)
      | ({ href: string } & HookNavigationOptions<TBaseLocationHook>),
  ): React.ReactElement
  function Redirect0(props: {
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
      componentName: 'Redirect',
    })

    return <NativeWouterRedirect {...rest} to={finalTo} />
  }

  return Redirect0
}

export const createRouter = ({
  addHashToLocation,
  routes,
  Page404,
  pagesTree,
  hook,
  ErrorClass,
}: {
  addHashToLocation?: boolean
  routes?: RoutesPretty
  Page404?: React.ComponentType
  pagesTree?: PagesTree
  hook?: BaseLocationHook
  ErrorClass?: ClassLikeError0<ErrorPoint0>
}): ((props: {
  children?: React.ReactNode
  status?: RouterStatus
  ssrLocation?: AnyLocation | undefined
}) => React.ReactElement) => {
  function RouterRoutesForRouter(): React.ReactElement {
    React.useContext(RouterContext) // do not remove this line
    return <RenderPagesTree pagesTree={pagesTree} Page404={Page404 ?? DefaultPage404} />
  }

  return function Router({
    children,
    status,
    ssrLocation,
  }: {
    children?: React.ReactNode
    status?: RouterStatus
    ssrLocation?: AnyLocation | undefined
  }) {
    const finalSsrLocation = ssrLocation ?? _ssItems.__POINT0_SSR_LOCATION__.get()
    const finalRoutes = routes ?? ClientPoints.getInstance().routes
    const finalHook = hook ?? useBrowserLocation
    const finalErrorClass = ErrorClass ?? ErrorPoint0

    const wouterRouterProps = useMemo(() => {
      if (env.side.is.client) {
        return {}
      }
      if (!finalSsrLocation) {
        throw new Error(`ssrLocation is required on ssr`)
      }
      return { ssrPath: finalSsrLocation.pathname, ssrSearch: finalSsrLocation.searchString }
    }, [finalSsrLocation])

    const useAdapterLocation: UseAdapterLocationFn = useCallback(() => {
      const [wouterLocation] = useWouterLocation()
      const [wouterSearchParams] = useWouterSearchParams()
      const pathnameWithSearchParams = [wouterLocation, wouterSearchParams.toString()].filter(Boolean).join('?')
      return finalRoutes._.getLocation(pathnameWithSearchParams)
    }, [])

    const aroundNav = useCallback<AroundNavHandler>((navigate, to, options) => {
      return navigateWithTransitions({
        to,
        navigate: () => navigate(to, options),
        ErrorClass: finalErrorClass,
      })
    }, [])

    return (
      <NativeWouterRouter {...wouterRouterProps} hook={finalHook} aroundNav={aroundNav}>
        <RouterContextProvider
          useAdapterLocation={useAdapterLocation}
          ssrLocation={finalSsrLocation}
          status={status}
          addHashToLocation={addHashToLocation}
        >
          {children ?? <RouterRoutesForRouter />}
        </RouterContextProvider>
      </NativeWouterRouter>
    )
  }
}

const DefaultPage404 = () => <>Page Not Found</>

export const createRouterRoutes = ({
  pagesTree,
  Page404,
}: {
  pagesTree?: PagesTree
  Page404?: React.ComponentType
}): (() => React.ReactElement) => {
  return function RouterRoutes() {
    React.useContext(RouterContext) // do not remove this line
    return <RenderPagesTree pagesTree={pagesTree} Page404={Page404} />
  }
}

export const createNavigation = <
  TRoutes extends RoutesPretty,
  TBaseLocationHook extends BaseLocationHook = BrowserLocationHook,
  TNavigate extends NavigateFnByHook<TBaseLocationHook> = NavigateFnByHook<TBaseLocationHook>,
  TErrorClass extends ClassLikeError0<ErrorPoint0> = ClassLikeError0<ErrorPoint0>,
>({
  addHashToLocation,
  routes = (() => {
    try {
      return ClientPoints.getInstance().routes
    } catch {
      throw new Error('You should provide routes, or call ClientPoints.mount(points) before createNavigation')
    }
  })(),
  Page404,
  pagesTree,
  hook = useBrowserLocation as TBaseLocationHook,
  ErrorClass = ErrorPoint0 as unknown as TErrorClass,
  navigate,
}: {
  addHashToLocation?: boolean
  routes?: TRoutes
  Page404?: React.ComponentType
  pagesTree?: PagesTree
  hook?: TBaseLocationHook
  ErrorClass?: TErrorClass
  navigate?: TNavigate
} = {}) => {
  return {
    navigate: createNavigate({ routes, navigate: navigate, ErrorClass }),
    Link: createLink({ routes, hook }),
    NavLink: createNavLink({ routes, hook }),
    Redirect: createRedirectComponent({ routes, hook }),
    Router: createRouter({ addHashToLocation, routes, Page404, pagesTree, hook, ErrorClass }),
    RouterRoutes: createRouterRoutes({ pagesTree, Page404 }),
  }
}

// TODO: move to pages tree
const combinePagesRoutesToRegexForLayout = (routes: AnyRoute[]) => {
  const compiled = routes.map((r) => r.regexBaseString)
  const pattern = `^(${compiled.join('|')})(?:/|$)`
  return new RegExp(pattern)
}

export const RenderPagesTree = ({
  pagesTree = ClientPoints.getInstance().pagesTree,
  Page404 = DefaultPage404,
  level = 0,
}: {
  pagesTree?: PagesTree
  Page404?: React.ComponentType
  level?: number
}) => {
  return (
    <Switch>
      {pagesTree.map((node) => {
        if (node.Layout) {
          const Layout = node.Layout
          const layoutPagesRoutes = node.pages.map((p) => p.pageRoute)
          const layoutPagesRoutesRegex = combinePagesRoutesToRegexForLayout(layoutPagesRoutes)
          return (
            <Route key={`layout-${node.layoutName}`} path={layoutPagesRoutesRegex}>
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
                  <Route path="*">
                    <Page404 />
                  </Route>
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
        <Page404 />
      </Route>
    </Switch>
  )
}
