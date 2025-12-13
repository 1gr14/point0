import type { AnyLocation, AnyRoute, RoutesPretty } from '@devp0nt/route0'
import type { PagesTree, RouterStatus, UseAdapterLocationFn } from '@point0/core'
import { _wrapUseNavigate, Point0, RouterContextProvider } from '@point0/core'
import React, { Fragment, useCallback, useMemo } from 'react'
import type { LinkProps } from 'wouter'
import {
  Route,
  Switch,
  useLocation as useWouterLocation,
  useSearchParams as useWouterSearchParams,
  Link as WouterLink,
  Router as WouterRouter,
} from 'wouter'

const _useNavigate = () => {
  const [, navigate] = useWouterLocation()
  return navigate
}
export const useNavigate = _wrapUseNavigate(_useNavigate)

export const Link = ((props: LinkProps & { onMouseEnter?: (e: React.MouseEvent<HTMLAnchorElement>) => any }) => {
  const { to, href, onClick, onMouseEnter, replace, ...rest } = props
  const navigate = useNavigate()
  const finalHref = to || href
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
          console.info(
            'onMouseEnter',
            pointWithLocation?.point.shouldBePrefetchedOnLinkHover,
            pointWithLocation?.location,
            pointWithLocation?.point,
          )
          if (pointWithLocation?.point.shouldBePrefetchedOnLinkHover) {
            Point0.getPointsManager()
              .prefetchSuitablePagePoint({
                location: pointWithLocation.location,
              })
              .catch((e) => {
                // TODO: replace with onClientError handler
                console.error('Failed to prefetch page on hover', e)
              })
          }
          void onMouseEnter?.(e)
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
}) as typeof WouterLink

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
