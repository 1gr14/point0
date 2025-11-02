import type { AnyLocation, AnyRoute } from '@devp0nt/route0'
import { Route0 } from '@devp0nt/route0'
import React, { Fragment, useCallback, useContext, useMemo } from 'react'
import type { LinkProps } from 'wouter'
import { Route, Switch, useLocation as useWouterLocation, Link as WouterLink, Router as WouterRouter } from 'wouter'
import { Points, type PagesTree } from '../../core/points.js'
import type { RouterPolicy, RouterStatus, UseAdapterLocationFn } from '../../core/router.js'
import { _wrapUseNavigate, RouterContextProvider } from '../../core/router.js'

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
  ssrLocation,
  Page404 = DefaultPage404,
  policy,
  status,
  children,
}: {
  ssrLocation?: AnyLocation | undefined
  Page404?: React.ComponentType
  policy?: RouterPolicy
  status?: RouterStatus
  children?: React.ReactNode
}): React.ReactElement => {
  const pointsCtx = useContext(Points.Context)
  if (!pointsCtx) {
    throw new Error('Points context not found')
  }
  const wouterRouterProps = useMemo(() => {
    if (typeof window !== 'undefined') {
      return {}
    }
    if (!ssrLocation) {
      throw new Error('ssrLocation is required on ssr')
    }
    return { ssrPath: ssrLocation.pathname, ssrSearch: ssrLocation.search }
  }, [ssrLocation])

  const useAdapterLocation: UseAdapterLocationFn = useCallback(() => {
    const [wouterLocation] = useWouterLocation()
    return Route0.getLocation(wouterLocation)
  }, [])

  return (
    <WouterRouter {...wouterRouterProps}>
      <RouterContextProvider
        useAdapterLocation={useAdapterLocation}
        ssrLocation={ssrLocation}
        policy={policy}
        status={status}
      >
        {children ?? <RenderPagesTree pagesTree={pointsCtx.pagesTree} Page404={Page404} />}
      </RouterContextProvider>
    </WouterRouter>
  )
}

export const RouterRoutes = ({ Page404 = DefaultPage404 }: { Page404?: React.ComponentType }): React.ReactElement => {
  const pointsCtx = useContext(Points.Context)
  if (!pointsCtx) {
    throw new Error('Points context not found')
  }
  return <RenderPagesTree pagesTree={pointsCtx.pagesTree} Page404={Page404} />
}

const DefaultPage404 = () => {
  return <div>Page Not Found</div>
}

const combinePagesRoutesToRegexForLayout = (routes: AnyRoute[]) => {
  const compiled = routes.map((r) => r.getRegexBaseString())
  const pattern = `^(${compiled.join('|')})(?:/|$)`
  return new RegExp(pattern)
}

export const RenderPagesTree = ({
  pagesTree,
  Page404,
  level = 0,
}: {
  pagesTree: PagesTree
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

        // Layout-less pages
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
