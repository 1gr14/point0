import {
  Route0,
  type AnyLocation,
  type AnyRoute,
  type ExtractRoute,
  type ExtractRoutesKeys,
  type RoutesPretty,
} from '@devp0nt/route0'
import type { GetPathInputByRoute, IsParamsOptional } from '@devp0nt/route0'
import { _point0_env, _ssItems, ClientPoints, env, ErrorPoint0, log } from '@point0/core'
import type {
  ClassLikeError0,
  NormalizedLazyPointsCollectionRecord,
  PagesTree,
  ReadyPointsCollectionRecord,
} from '@point0/core'
import {
  navigateWithTransitions,
  NavigationContextProvider,
  RedirectTask,
  ssrRedirectTask,
  useLocation,
  useNavigationLocationContext,
  type AdapterNavigateFn,
} from '@point0/core/navigation'
import type { NavigateWithTransitionsReturnType, NavigationStatus, UseAdapterLocationFn } from '@point0/core/navigation'
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
type LinkProps<H extends BaseLocationHook = BrowserLocationHook> = NavigationalProps<H> & LinkAsChildProps
type NavigateFnByHook<TBaseLocationHook extends BaseLocationHook = BrowserLocationHook> =
  ReturnType<TBaseLocationHook>[1]
type NavigateOptionsByNavigate<TNavigate extends AdapterNavigateFn> = NonNullable<Parameters<TNavigate>[1]>
type RedirectOptionsByNavigate<TNavigate extends AdapterNavigateFn> = NavigateOptionsByNavigate<TNavigate> & {
  status?: number
}

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
  TNavigate extends AdapterNavigateFn = typeof browserNavigate,
  TErrorClass extends ClassLikeError0<ErrorPoint0> = ClassLikeError0<ErrorPoint0>,
>({
  routes,
  navigate: providedNavigate = browserNavigate as TNavigate,
  ErrorClass = ErrorPoint0 as unknown as TErrorClass,
}: {
  routes: TRoutes
  navigate?: TNavigate
  ErrorClass?: TErrorClass
}) => {
  const wrappedNavigate = (...args: Parameters<TNavigate>): NavigateWithTransitionsReturnType<TErrorClass> => {
    const [to, options] = args
    return navigateWithTransitions({
      to,
      navigate: () => providedNavigate(to, options),
      ErrorClass,
    })
  }
  async function navigate<TRouteName extends ExtractRoutesKeys<TRoutes>>(
    ...args: IsParamsOptional<ExtractRoute<TRoutes, TRouteName>> extends true
      ? [
          route: TRouteName,
          input?: GetPathInputByRoute<ExtractRoute<TRoutes, TRouteName>>,
          options?: NavigateOptionsByNavigate<TNavigate>,
        ]
      : [
          route: TRouteName,
          input: GetPathInputByRoute<ExtractRoute<TRoutes, TRouteName>>,
          options?: NavigateOptionsByNavigate<TNavigate>,
        ]
  ): NavigateWithTransitionsReturnType<TErrorClass> {
    const routeName = args[0] as ExtractRoutesKeys<TRoutes>
    const input = args[1] as unknown
    const options = args[2] as NavigateOptionsByNavigate<TNavigate> | undefined
    const route = routes[routeName]
    if (!route) {
      throw new ErrorClass(`Route "${routeName}" not found`)
    }

    const to = route.get(input || {}) as string
    return await navigateWithTransitions({
      to,
      navigate: () => providedNavigate(to, options),
      ErrorClass,
    })
  }
  return Object.assign(navigate, { to: wrappedNavigate }) as never as {
    <TRouteName extends ExtractRoutesKeys<TRoutes>>(
      ...args: IsParamsOptional<ExtractRoute<TRoutes, TRouteName>> extends true
        ? [
            route: TRouteName,
            input?: GetPathInputByRoute<ExtractRoute<TRoutes, TRouteName>>,
            options?: NavigateOptionsByNavigate<TNavigate>,
          ]
        : [
            route: TRouteName,
            input: GetPathInputByRoute<ExtractRoute<TRoutes, TRouteName>>,
            options?: NavigateOptionsByNavigate<TNavigate>,
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
  function Link(
    props:
      | LinkRouteProps
      | ({ to: string } & LinkAsChildProps & HookNavigationOptions<TBaseLocationHook>)
      | ({ href: string } & LinkAsChildProps & HookNavigationOptions<TBaseLocationHook>),
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
      NavLinkClassNameProps
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
      HookNavigationOptions<TBaseLocationHook>
  }[ExtractRoutesKeys<TRoutes>]

  function Redirect(
    props:
      | RedirectRouteProps
      | ({ to: string } & HookNavigationOptions<TBaseLocationHook>)
      | ({ href: string } & HookNavigationOptions<TBaseLocationHook>),
  ): React.ReactElement
  function Redirect(props: {
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

  return Redirect
}

export const createRedirectHelper = <
  TRoutes extends RoutesPretty,
  TNavigate extends AdapterNavigateFn = typeof browserNavigate,
>({
  routes,
  navigate = browserNavigate as TNavigate,
}: {
  routes: TRoutes
  navigate?: TNavigate
}) => {
  const redirectTo = (to: string, options?: RedirectOptionsByNavigate<TNavigate>) => {
    const { status, ...navigateOptions } = options ?? {}
    const task = new RedirectTask<NavigateOptionsByNavigate<TNavigate>>({
      to,
      status,
      options: navigateOptions as NavigateOptionsByNavigate<TNavigate>,
    })
    if (_point0_env.side.is.client) {
      navigate(task.to, task.options)
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
          options?: RedirectOptionsByNavigate<TNavigate>,
        ]
      : [
          route: TRouteName,
          input: GetPathInputByRoute<ExtractRoute<TRoutes, TRouteName>>,
          options?: RedirectOptionsByNavigate<TNavigate>,
        ]
  ): RedirectTask<NavigateOptionsByNavigate<TNavigate>> {
    const routeName = args[0] as ExtractRoutesKeys<TRoutes>
    const input = (args[1] ?? {}) as unknown
    const options = args[2] as RedirectOptionsByNavigate<TNavigate> | undefined
    const route = routes[routeName]
    if (!route) {
      throw new Error(`Route "${routeName}" not found`)
    }
    const to = route.get(input) as string
    return redirectTo(to, options)
  }
  return Object.assign(redirect, { to: redirectTo }) as never as {
    <TRouteName extends ExtractRoutesKeys<TRoutes>>(
      ...args: IsParamsOptional<ExtractRoute<TRoutes, TRouteName>> extends true
        ? [
            route: TRouteName,
            input?: GetPathInputByRoute<ExtractRoute<TRoutes, TRouteName>>,
            options?: RedirectOptionsByNavigate<TNavigate>,
          ]
        : [
            route: TRouteName,
            input: GetPathInputByRoute<ExtractRoute<TRoutes, TRouteName>>,
            options?: RedirectOptionsByNavigate<TNavigate>,
          ]
    ): RedirectTask<NavigateOptionsByNavigate<TNavigate>>
    to: typeof redirectTo
  }
}

export const createRouter = ({
  addHashToLocation,
  routes = ClientPoints.getInstance().routes,
  Page404,
  pagesTree,
  hook = useBrowserLocation,
  navigate = browserNavigate,
  ErrorClass,
}: {
  addHashToLocation?: boolean
  routes?: RoutesPretty
  Page404?: React.ComponentType
  pagesTree?: PagesTree
  hook?: BaseLocationHook
  navigate?: AdapterNavigateFn
  ErrorClass?: ClassLikeError0<ErrorPoint0>
}): ((props: {
  children?: React.ReactNode
  status?: NavigationStatus
  ssrLocation?: AnyLocation | undefined
}) => React.ReactElement) => {
  function RouterRoutes(): React.ReactElement {
    useNavigationLocationContext() // do not remove, it triggers rerender
    return <RenderPagesTree pagesTree={pagesTree ?? ClientPoints.getInstance().pagesTree} Page404={Page404} />
  }

  return function Router({
    children,
    status,
    ssrLocation = _ssItems.__POINT0_SSR_LOCATION__.get(),
  }: {
    children?: React.ReactNode
    status?: NavigationStatus
    ssrLocation?: AnyLocation | undefined
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

    const useAdapterLocation: UseAdapterLocationFn = useCallback(() => {
      const [wouterLocation] = useWouterLocation()
      const [wouterSearchParams] = useWouterSearchParams()
      const pathnameWithSearchParams = [wouterLocation, wouterSearchParams.toString()].filter(Boolean).join('?')
      return routes._.getLocation(pathnameWithSearchParams)
    }, [])

    const aroundNav = useCallback<AroundNavHandler>((navigate, to, options) => {
      return navigateWithTransitions({
        to,
        navigate: () => navigate(to, options),
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
          status={status}
          addHashToLocation={addHashToLocation}
          adapterNavigate={navigate}
        >
          {children ?? <RouterRoutes />}
        </NavigationContextProvider>
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
    useNavigationLocationContext() // do not remove, it triggers rerender
    return <RenderPagesTree pagesTree={pagesTree ?? ClientPoints.getInstance().pagesTree} Page404={Page404} />
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
  navigate = browserNavigate as TNavigate,
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
    navigate: createNavigate({ routes, navigate, ErrorClass }),
    Link: createLink({ routes, hook }),
    NavLink: createNavLink({ routes, hook }),
    Redirect: createRedirectComponent({ routes, hook }),
    Router: createRouter({ addHashToLocation, routes, Page404, pagesTree, hook, ErrorClass }),
    RouterRoutes: createRouterRoutes({ pagesTree, Page404 }),
    redirect: createRedirectHelper({ routes, navigate }),
  }
}

// TODO: move to pages tree
const combinePagesRoutesToRegexForLayout = (routes: AnyRoute[]) => {
  const compiled = routes.map((r) => r.regexBaseString)
  const pattern = `^(${compiled.join('|')})(?:/|$)`
  return new RegExp(pattern)
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
