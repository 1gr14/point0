import type {
  AnyLocation,
  AnyRoute,
  ExtractRoute,
  ExtractRoutesKeys,
  FlatInputWithHash,
  HasParams,
  RoutesPretty,
} from '@devp0nt/route0'
import type { PagesTree, RouterStatus, UseAdapterLocationFn } from '@point0/core'
import { _wrapUseNavigate, Point0, RouterContextProvider } from '@point0/core'
import type { AnchorHTMLAttributes, MouseEventHandler, ReactElement, RefAttributes } from 'react'
import React, { Fragment, useCallback, useMemo, useRef } from 'react'
import {
  Route,
  Switch,
  useLocation as useWouterLocation,
  useSearchParams as useWouterSearchParams,
  Link as WouterLink,
  Router as WouterRouter,
} from 'wouter'

import type { BaseLocationHook, NavigationalProps } from 'wouter'
import type { BrowserLocationHook } from 'wouter/use-browser-location'

const _useNavigate = () => {
  const [, navigate] = useWouterLocation()
  return navigate
}
export const useNavigate = _wrapUseNavigate(_useNavigate)

export const createUseNavigate0 = <TRoutes extends RoutesPretty<any>>(routes: TRoutes) => {
  return () => {
    const navigate = useNavigate()
    return async <TRouteName extends ExtractRoutesKeys<TRoutes>>(
      ...args: HasParams<ExtractRoute<TRoutes, TRouteName>> extends true
        ? [route: TRouteName, input: FlatInputWithHash<ExtractRoute<TRoutes, TRouteName>>]
        : [route: TRouteName, input?: FlatInputWithHash<ExtractRoute<TRoutes, TRouteName>>]
    ) => {
      const [route, input] = args
      return await navigate(routes[route].flat(input || {}))
    }
  }
}

type AsChildProps<ComponentProps, DefaultElementProps> =
  | ({ asChild?: false } & DefaultElementProps)
  | ({ asChild: true } & ComponentProps)

type HTMLLinkAttributes = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className'> & {
  className?: string | undefined | ((isActive: boolean) => string | undefined)
}

export type LinkProps<H extends BaseLocationHook = BrowserLocationHook> = NavigationalProps<H> &
  AsChildProps<
    { children: ReactElement; onClick?: MouseEventHandler },
    HTMLLinkAttributes & RefAttributes<HTMLAnchorElement>
  >

export const Link = (props: LinkProps) => {
  const { to, href, onClick, onMouseEnter, onMouseLeave, replace, ...rest } = props as LinkProps & {
    onMouseEnter?: (e: React.MouseEvent<HTMLAnchorElement>) => any
    onMouseLeave?: (e: React.MouseEvent<HTMLAnchorElement>) => any
  }
  const navigate = useNavigate()
  const finalHref = to || href
  const prefetchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pointWithLocation = useMemo(() => {
    if (!finalHref) {
      return undefined
    }
    return Point0.getPointsManager()._getPagePointByHref(finalHref)
  }, [finalHref])
  return (
    <WouterLink
      {...rest}
      {...{
        onMouseEnter: (e) => {
          if (pointWithLocation && pointWithLocation.point.shouldBePrefetchedOnLinkHover !== false) {
            // Clear any existing timeout
            if (prefetchTimeoutRef.current) {
              clearTimeout(prefetchTimeoutRef.current)
            }
            // Set a N ms delay before prefetching
            prefetchTimeoutRef.current = setTimeout(
              () => {
                prefetchTimeoutRef.current = null
                Point0.getPointsManager()
                  .prefetchSuitablePagePoint({
                    location: pointWithLocation.location,
                  })
                  .catch((e) => {
                    // TODO: replace with onClientError handler
                    console.error('Failed to prefetch page on hover', e)
                  })
              },
              pointWithLocation.point.shouldBePrefetchedOnLinkHover === true
                ? 30
                : pointWithLocation.point.shouldBePrefetchedOnLinkHover,
            )
          }
          void onMouseEnter?.(e)
        },
        onMouseLeave: (e) => {
          // Cancel prefetch if mouse leaves before the N ms delay completes
          if (prefetchTimeoutRef.current) {
            clearTimeout(prefetchTimeoutRef.current)
            prefetchTimeoutRef.current = null
          }
          void onMouseLeave?.(e)
        },
      }}
      href={href as never}
      to={to}
      replace={replace}
      onClick={(e) => {
        if (finalHref) {
          if (e.metaKey || e.ctrlKey) return
          e.preventDefault()
          void navigate(finalHref, { replace })
          onClick?.(e)
        }
      }}
    />
  )
}

export const createLink0 = <TRoutes extends RoutesPretty<any>>(routes: TRoutes) => {
  return <TRouteName extends ExtractRoutesKeys<TRoutes>>(
    props: {
      route: TRouteName
    } & (HasParams<ExtractRoute<TRoutes, TRouteName>> extends true
      ? { input: FlatInputWithHash<ExtractRoute<TRoutes, TRouteName>> }
      : { input?: FlatInputWithHash<ExtractRoute<TRoutes, TRouteName>> }) &
      AsChildProps<
        { children: ReactElement; onClick?: MouseEventHandler },
        HTMLLinkAttributes & RefAttributes<HTMLAnchorElement>
      >,
  ) => {
    const { route: routeName, input, ...rest } = props
    const to = useMemo(() => {
      const route = routes[routeName]
      if (!route) {
        console.error(`Route ${String(route)} not found`)
        return '#'
      }
      return route.flat(input || {})
    }, [routeName, JSON.stringify(input)])
    return <Link {...(rest as any)} to={to} />
  }
}

export const Router = ({
  ssrLocation = Point0._ssrLocation.get(),
  routes = Point0.getPointsManager().routes,
  status,
  children,
  Page404,
  pagesTree,
}: {
  ssrLocation?: AnyLocation | undefined
  routes?: RoutesPretty
  status?: RouterStatus
  children?: React.ReactNode
  Page404?: React.ComponentType
  pagesTree?: PagesTree
}): React.ReactElement => {
  const wouterRouterProps = useMemo(() => {
    if (Point0.isClient) {
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
    <WouterRouter {...wouterRouterProps}>
      <RouterContextProvider useAdapterLocation={useAdapterLocation} ssrLocation={ssrLocation} status={status}>
        {children ?? <RouterRoutes Page404={Page404} pagesTree={pagesTree} />}
      </RouterContextProvider>
    </WouterRouter>
  )
}

export const RouterRoutes = ({
  Page404 = () => <div>Page Not Found</div>,
  pagesTree = Point0.getPointsManager().pagesTree,
}: {
  Page404?: React.ComponentType
  pagesTree?: PagesTree
}): React.ReactElement => {
  return <RenderPagesTree pagesTree={pagesTree} Page404={Page404} />
}

const combinePagesRoutesToRegexForLayout = (routes: AnyRoute[]) => {
  const compiled = routes.map((r) => r.getRegexBaseString())
  const pattern = `^(${compiled.join('|')})(?:/|$)`
  return new RegExp(pattern)
}

export const RenderPagesTree = ({
  pagesTree = Point0.getPointsManager().pagesTree,
  Page404 = () => <div>Page Not Found</div>,
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
