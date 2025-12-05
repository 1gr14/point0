import type { AnyLocation, AnyRoute, Routes } from '@devp0nt/route0'
import { Point0 } from '@point0/core'
import { ClientServerHelpers } from '@point0/core/client-server'
import type { PagesTree } from '@point0/core/points-manager'
import type { RouterStatus, UseAdapterLocationFn } from '@point0/core/router'
import { _wrapUseNavigate, RouterContextProvider } from '@point0/core/router'
import React, { Fragment, useCallback, useMemo } from 'react'
import type { LinkProps } from 'wouter'
import { Route, Switch, useLocation as useWouterLocation, Link as WouterLink, Router as WouterRouter } from 'wouter'

// TODO: add to Link match result, so we can use current, active, aprent, exact, etc

const _useNavigate = () => {
  const [, navigate] = useWouterLocation()
  // TODO: allow pass router policy in useNavigate and in Link
  return navigate
}
export const useNavigate = _wrapUseNavigate(_useNavigate)

export const Link = (props: LinkProps) => {
  const { to, href, onClick, replace, ...rest } = props
  const navigate = useNavigate()
  const finalHref = to || href
  return (
    <WouterLink
      {...rest}
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

export const Router = ({
  ssrLocation = Point0._ssrLocation.get(),
  routes = Point0.getPoints().routes,
  status,
  children,
}: {
  ssrLocation?: AnyLocation | undefined
  routes?: Routes
  status?: RouterStatus
  children: React.ReactNode
}): React.ReactElement => {
  const wouterRouterProps = useMemo(() => {
    if (ClientServerHelpers.isClient) {
      return {}
    }
    if (!ssrLocation) {
      throw new Error(`ssrLocation is required on ssr`)
    }
    return { ssrPath: ssrLocation.pathname, ssrSearch: ssrLocation.search }
  }, [ssrLocation])

  const useAdapterLocation: UseAdapterLocationFn = useCallback(() => {
    const [wouterLocation] = useWouterLocation()
    return routes._.getLocation(wouterLocation)
  }, [])

  return (
    <WouterRouter {...wouterRouterProps}>
      <RouterContextProvider useAdapterLocation={useAdapterLocation} ssrLocation={ssrLocation} status={status}>
        {children}
      </RouterContextProvider>
    </WouterRouter>
  )
}

export const RouterRoutes = ({
  Page404 = () => <div>Page Not Found</div>,
  pagesTree = Point0.getPoints().pagesTree,
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
  pagesTree = Point0.getPoints().pagesTree,
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
