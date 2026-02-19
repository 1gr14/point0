import { Error0 } from '@devp0nt/error0'
import {
  type AnyLocation,
  type AnyRoute,
  type ExtractRoute,
  type ExtractRoutesKeys,
  type FlatInputWithHash,
  type HasParams,
  Route0,
  type RoutesPretty,
} from '@devp0nt/route0'
import type {
  NormalizedLazyPointsCollectionRecord,
  PagesTree,
  ReadyPointsCollectionRecord,
  RouterStatus,
  UseAdapterLocationFn,
} from '@point0/core'
import {
  _ssItems,
  _wrapNavigate,
  _wrapUseNavigate,
  ClientPoints,
  env,
  RouterContext,
  RouterContextProvider,
  useLocation,
} from '@point0/core'
import type { AnchorHTMLAttributes, MouseEventHandler, ReactElement, RefAttributes } from 'react'
import React, { Fragment, useCallback, useMemo, useRef } from 'react'
import type { BaseLocationHook, HookNavigationOptions, NavigationalProps } from 'wouter'
import {
  Route,
  Switch,
  useLocation as useWouterLocation,
  useSearchParams as useWouterSearchParams,
  Link as WouterLink,
  Router as WouterRouter,
} from 'wouter'
import type { BrowserLocationHook } from 'wouter/use-browser-location'

const _useNativeNavigate = () => {
  const [, navigate] = useWouterLocation()
  return navigate
}
export const useSimpleNavigate = _wrapUseNavigate(_useNativeNavigate)

// export const createNavigate = <
//   TRoutes extends RoutesPretty<any>,
//   TNavigate extends (to: string, ...rest: any[]) => any,
// >(
//   routes: TRoutes,
//   navigate: TNavigate,
// ) => {
//   const wrappedNavigate = _wrapNavigate(navigate)
//   async function navigate0<TRouteName extends ExtractRoutesKeys<TRoutes>>(
//     ...args: HasParams<ExtractRoute<TRoutes, TRouteName>> extends true
//       ? [
//           route: TRouteName,
//           input: FlatInputWithHash<ExtractRoute<TRoutes, TRouteName>>,
//           ...rest: Tail<Parameters<TNavigate>>,
//         ]
//       : [
//           route: TRouteName,
//           input?: FlatInputWithHash<ExtractRoute<TRoutes, TRouteName>>,
//           ...rest: Tail<Parameters<TNavigate>>,
//         ]
//   ): Promise<{ location: AnyLocation; error: Error0 | undefined }> {
//     const [routeName, input, ...rest] = args
//     const route = routes[routeName]
//     if (!route) {
//       throw new Error0(`Route "${routeName}" not found`)
//     }
//     const to = route.flat(input || {}) as string
//     return await wrappedNavigate(...([to, ...rest] as unknown as Parameters<TNavigate>))
//   }
//   return navigate0
// }

export const createNavigate = <
  TRoutes extends RoutesPretty<any>,
  TNavigate extends (to: string, ...rest: any[]) => any,
>(
  routes: TRoutes,
  navigate: TNavigate,
) => {
  const wrappedNavigate = _wrapNavigate(navigate)
  async function navigate0<TRouteName extends ExtractRoutesKeys<TRoutes>>(
    ...args: HasParams<ExtractRoute<TRoutes, TRouteName>> extends true
      ? [
          route: TRouteName,
          input: FlatInputWithHash<ExtractRoute<TRoutes, TRouteName>>,
          ...rest: Tail<Parameters<TNavigate>>,
        ]
      : [
          route: TRouteName,
          input?: FlatInputWithHash<ExtractRoute<TRoutes, TRouteName>>,
          ...rest: Tail<Parameters<TNavigate>>,
        ]
  ): Promise<{ location: AnyLocation; error: Error0 | undefined }> {
    const [routeName, input, ...rest] = args as [ExtractRoutesKeys<TRoutes>, unknown, ...Tail<Parameters<TNavigate>>]
    const route = routes[routeName]
    if (!route) {
      throw new Error0(`Route "${routeName}" not found`)
    }

    const to = route.flat(input || {}) as string
    return await wrappedNavigate(...([to, ...rest] as unknown as Parameters<TNavigate>))
  }
  return Object.assign(navigate0, { to: wrappedNavigate }) as never as {
    <TRouteName extends ExtractRoutesKeys<TRoutes>>(
      ...args: HasParams<ExtractRoute<TRoutes, TRouteName>> extends true
        ? [
            route: TRouteName,
            input: FlatInputWithHash<ExtractRoute<TRoutes, TRouteName>>,
            ...rest: Tail<Parameters<TNavigate>>,
          ]
        : [
            route: TRouteName,
            input?: FlatInputWithHash<ExtractRoute<TRoutes, TRouteName>>,
            ...rest: Tail<Parameters<TNavigate>>,
          ]
    ): Promise<{ location: AnyLocation; error: Error0 | undefined }>
    to: typeof wrappedNavigate
  }
}

type Tail<T extends readonly unknown[]> = T extends readonly [any, ...infer R] ? R : never

export const createUseNavigate = <
  TRoutes extends RoutesPretty<any>,
  TUseNavigate extends () => (to: string, ...args: any[]) => any = typeof useSimpleNavigate,
>(
  routes: TRoutes,
  useNavigate?: TUseNavigate,
) => {
  return () => {
    const simpleNavigate = useNavigate ? useNavigate() : useSimpleNavigate()
    function useNavigate0<TRouteName extends ExtractRoutesKeys<TRoutes>>(
      ...args: HasParams<ExtractRoute<TRoutes, TRouteName>> extends true
        ? [
            route: TRouteName,
            input: FlatInputWithHash<ExtractRoute<TRoutes, TRouteName>>,
            ...rest: Tail<Parameters<ReturnType<TUseNavigate>>>,
          ]
        : [
            route: TRouteName,
            input?: FlatInputWithHash<ExtractRoute<TRoutes, TRouteName>>,
            ...rest: Tail<Parameters<ReturnType<TUseNavigate>>>,
          ]
    ): Promise<{ location: AnyLocation; error: Error0 | undefined }>
    // function useNavigate0<TRouteName extends ExtractRoutesKeys<TRoutes>>(
    //   ...args: OnlyIfHasParams<
    //     ExtractRoute<TRoutes, TRouteName>,
    //     [
    //       route: TRouteName,
    //       input: FlatInputWithHash<ExtractRoute<TRoutes, TRouteName>>,
    //       ...rest: Tail<Parameters<ReturnType<TUseNavigate>>>,
    //     ]
    //   >
    // ): Promise<{ location: AnyLocation; error: Error0 | undefined }>
    // function useNavigate0<TRouteName extends ExtractRoutesKeys<TRoutes>>(
    //   ...args: OnlyIfNoParams<
    //     ExtractRoute<TRoutes, TRouteName>,
    //     [
    //       route: TRouteName,
    //       input?: FlatInputWithHash<ExtractRoute<TRoutes, TRouteName>>,
    //       ...rest: Tail<Parameters<ReturnType<TUseNavigate>>>,
    //     ]
    //   >
    // ): Promise<{ location: AnyLocation; error: Error0 | undefined }>
    // function useNavigate0(
    //   to: { to: string },
    //   ...rest: Tail<Parameters<ReturnType<TUseNavigate>>>
    // ): Promise<{ location: AnyLocation; error: Error0 | undefined }>
    async function useNavigate0(...args: any[]) {
      const { to, rest } = ((): { to: string; rest: Tail<Parameters<ReturnType<TUseNavigate>>> } => {
        if (typeof args[0] === 'string') {
          // it is route name
          const route = routes[args[0]]
          if (!route) {
            throw new Error(`Route "${args[0]}" not found`)
          }
          return { to: route.flat(args[1] || {}), rest: args.slice(2) as Tail<Parameters<ReturnType<TUseNavigate>>> }
        }
        throw new Error0('Invalid useNavigate arguments', { meta: { args } })
        // return { to: args[0].to, rest: args.slice(1) as Tail<Parameters<ReturnType<TUseNavigate>>> }
      })()
      return await simpleNavigate(to, ...rest)
    }
    return useNavigate0
    // return async <TRouteName extends ExtractRoutesKeys<TRoutes>>(
    //   ...args: HasParams<ExtractRoute<TRoutes, TRouteName>> extends true
    //     ? [route: TRouteName, input: FlatInputWithHash<ExtractRoute<TRoutes, TRouteName>>]
    //     : [route: TRouteName, input?: FlatInputWithHash<ExtractRoute<TRoutes, TRouteName>>]
    // ) => {
    //   const [route, input] = args
    //   return await navigate(routes[route].flat(input || {}))
    // }
  }
}

type AsChildProps<ComponentProps, DefaultElementProps> =
  | ({ asChild?: false } & DefaultElementProps)
  | ({ asChild: true } & ComponentProps)

type HTMLLinkAttributes = AnchorHTMLAttributes<HTMLAnchorElement>
type LinkAsChildProps = AsChildProps<
  { children: ReactElement; onClick?: MouseEventHandler },
  HTMLLinkAttributes & RefAttributes<HTMLAnchorElement>
>
type LinkProps<H extends BaseLocationHook = BrowserLocationHook> = NavigationalProps<H> & LinkAsChildProps

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
type NavLinkClassNameProps = {
  exactClassName?: string
  sameClassName?: string
  ancestorClassName?: string
  descendantClassName?: string
  unmatchedClassName?: string
  className?:
    | string
    | ((state: NavLinkStateOptions) => string | undefined)
    | Partial<Record<'default' | NavLinkStateType, string | undefined>>
}

type NavLinkAsChildProps = AsChildProps<
  { children: ReactElement; onClick?: MouseEventHandler },
  Omit<HTMLLinkAttributes, 'className'> & RefAttributes<HTMLAnchorElement>
>

type NavLinkProps<H extends BaseLocationHook = BrowserLocationHook> = NavigationalProps<H> &
  NavLinkAsChildProps &
  NavLinkClassNameProps

const _getWouterLinkProps = (
  props: LinkProps,
): {
  wouterLinkProps: LinkProps
  navigate: ReturnType<typeof useSimpleNavigate>
  to: string
  pointWithLocation:
    | { point: NormalizedLazyPointsCollectionRecord | ReadyPointsCollectionRecord; location: AnyLocation }
    | undefined
} => {
  const {
    to,
    href,
    onClick: providedOnClick,
    onMouseEnter: providedOnMouseEnter,
    onMouseLeave: providedOnMouseLeave,
    replace,
    ...rest
  } = props as LinkProps & {
    onMouseEnter?: (e: React.MouseEvent<HTMLAnchorElement>) => any
    onMouseLeave?: (e: React.MouseEvent<HTMLAnchorElement>) => any
  }
  const navigate = useSimpleNavigate()
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
            ClientPoints.getInstance()
              .prefetchPage({
                location: pointWithLocation.location,
                trigger: 'linkHover',
              })
              .catch((e: unknown) => {
                // TODO: replace with onClientError handler
                console.error('Failed to prefetch page on hover', e)
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
  const onClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (e.metaKey || e.ctrlKey) return
      e.preventDefault()
      void navigate(finalTo, { replace })
      providedOnClick?.(e)
    },
    [finalTo, replace, navigate, providedOnClick],
  )
  return {
    navigate,
    to: finalTo,
    pointWithLocation,
    wouterLinkProps: {
      ...rest,
      onMouseEnter,
      onMouseLeave,
      to: finalTo,
      replace,
      onClick,
    } as LinkProps,
  }
}

export const SimpleNavLink = (props: NavLinkProps) => {
  const {
    exactClassName,
    sameClassName,
    ancestorClassName,
    descendantClassName,
    unmatchedClassName,
    className,
    ...rest
  } = props
  const { pointWithLocation, wouterLinkProps, to } = _getWouterLinkProps(rest)
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
      typeof className === 'function' ? className(statusOptions) : typeof className === 'string' ? className : undefined
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
  return <WouterLink {...finalWouterLinkProps} />
}

export const SimpleLink = (props: LinkProps) => {
  const { wouterLinkProps } = _getWouterLinkProps(props)
  return <WouterLink {...wouterLinkProps} />
}

export const createLink = <
  TRoutes extends RoutesPretty<any>,
  TBaseLocationHook extends BaseLocationHook = BrowserLocationHook,
>(
  routes: TRoutes,
) => {
  type LinkRouteProps = {
    [TRouteName in ExtractRoutesKeys<TRoutes>]: {
      route: TRouteName
    } & (HasParams<ExtractRoute<TRoutes, TRouteName>> extends true
      ? { input: FlatInputWithHash<ExtractRoute<TRoutes, TRouteName>> }
      : { input?: FlatInputWithHash<ExtractRoute<TRoutes, TRouteName>> }) &
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
    input?: Record<string, any>
  }): React.ReactElement {
    const {
      route: routeName,
      input = {},
      to: providedTo,
      href: providedHref,
      ...rest
    } = props as typeof props & { input?: Record<string, any>; to?: string; href?: string }
    const finalTo = useMemo(() => {
      if (providedTo !== undefined) {
        return providedTo
      }
      if (providedHref !== undefined) {
        return providedHref
      }
      if (routeName === undefined) {
        console.error('routeName is required for Link without to or href')
        return '#'
      }
      const route = routes[routeName]
      if (!route) {
        // TODO: replace with onClientError handler
        console.error(`Route "${routeName}" not found`)
        return '#'
      }
      return route.flat(input)
    }, [routeName, JSON.stringify(input), providedTo, providedHref])
    return <SimpleLink {...(rest as any)} to={finalTo} />
  }
  return Link0
}

export const createNavLink = <
  TRoutes extends RoutesPretty<any>,
  TBaseLocationHook extends BaseLocationHook = BrowserLocationHook,
>(
  routes: TRoutes,
) => {
  type NavLinkRouteProps = {
    [TRouteName in ExtractRoutesKeys<TRoutes>]: {
      route: TRouteName
    } & (HasParams<ExtractRoute<TRoutes, TRouteName>> extends true
      ? { input: FlatInputWithHash<ExtractRoute<TRoutes, TRouteName>> }
      : { input?: FlatInputWithHash<ExtractRoute<TRoutes, TRouteName>> }) &
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
    input?: Record<string, any>
  }): React.ReactElement {
    const {
      route: routeName,
      input = {},
      to: providedTo,
      href: providedHref,
      ...rest
    } = props as typeof props & { input?: Record<string, any>; to?: string; href?: string }
    const finalTo = useMemo(() => {
      if (providedTo !== undefined) {
        return providedTo
      }
      if (providedHref !== undefined) {
        return providedHref
      }
      if (routeName === undefined) {
        console.error('routeName is required for NavLink without to or href')
        return '#'
      }
      const route = routes[routeName]
      if (!route) {
        // TODO: replace with onClientError handler
        console.error(`Route "${routeName}" not found`)
        return '#'
      }
      return route.flat(input)
    }, [routeName, JSON.stringify(input), providedTo, providedHref])
    return <SimpleNavLink {...(rest as any)} to={finalTo} />
  }
  return NavLink0
}

export const Router = ({
  ssrLocation = _ssItems.__POINT0_SSR_LOCATION__.get(),
  addHashToLocation,
  routes = ClientPoints.getInstance().routes,
  status,
  children,
  Page404,
  pagesTree,
  hook,
}: {
  ssrLocation?: AnyLocation | undefined
  addHashToLocation?: boolean
  routes?: RoutesPretty
  status?: RouterStatus
  children?: React.ReactNode
  Page404?: React.ComponentType
  pagesTree?: PagesTree
  hook?: BaseLocationHook
}): React.ReactElement => {
  const wouterRouterProps = useMemo(() => {
    if (env.side.is.client) {
      return {}
    }
    if (!ssrLocation) {
      throw new Error(`ssrLocation is required on ssr`)
    }
    return { ssrPath: ssrLocation.pathname, ssrSearch: ssrLocation.search }
  }, [ssrLocation])

  const useAdapterLocation: UseAdapterLocationFn = useCallback(() => {
    const [wouterLocation] = useWouterLocation()
    const [wouterSearchParams] = useWouterSearchParams()
    const pathnameWithSearchParams = [wouterLocation, wouterSearchParams.toString()].filter(Boolean).join('?')
    return routes._.getLocation(pathnameWithSearchParams)
  }, [])

  return (
    <WouterRouter {...wouterRouterProps} hook={hook}>
      <RouterContextProvider
        useAdapterLocation={useAdapterLocation}
        ssrLocation={ssrLocation}
        status={status}
        addHashToLocation={addHashToLocation}
      >
        {children ?? <RouterRoutes Page404={Page404} pagesTree={pagesTree} />}
      </RouterContextProvider>
    </WouterRouter>
  )
}

const DefaultPage404 = () => <>Page Not Found</>

export const RouterRoutes = ({
  Page404 = DefaultPage404,
  pagesTree = ClientPoints.getInstance().pagesTree,
}: {
  Page404?: React.ComponentType
  pagesTree?: PagesTree
}): React.ReactElement => {
  React.useContext(RouterContext) // do not remove this line
  return <RenderPagesTree pagesTree={pagesTree} Page404={Page404} />
}

const combinePagesRoutesToRegexForLayout = (routes: AnyRoute[]) => {
  const compiled = routes.map((r) => r.getRegexBaseString())
  const pattern = `^(${compiled.join('|')})(?:/|$)`
  return new RegExp(pattern)
}

export const RenderPagesTree = ({
  pagesTree = ClientPoints.getInstance().pagesTree,
  Page404 = DefaultPage404,
  level = 0,
}: {
  pagesTree?: PagesTree
  Page404: React.ComponentType
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
                      <Route key={pageRoute.getDefinition()} path={pageRoute.getDefinition()}>
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
                <Route key={pageRoute.getDefinition()} path={pageRoute.getDefinition()}>
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
