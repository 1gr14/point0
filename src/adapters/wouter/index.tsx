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
        {children ?? <RenderPagesTree nodes={pointsCtx.pagesTree} Page404={Page404} />}
      </RouterContextProvider>
    </WouterRouter>
  )
}

export const RouterRoutes = ({ Page404 = DefaultPage404 }: { Page404?: React.ComponentType }): React.ReactElement => {
  const pointsCtx = useContext(Points.Context)
  if (!pointsCtx) {
    throw new Error('Points context not found')
  }
  return <RenderPagesTree nodes={pointsCtx.pagesTree} Page404={Page404} />
}

const DefaultPage404 = () => {
  return <div>Page Not Found</div>
}

// const compileRouteToRegex = (route: AnyRoute) => {
//   const result = route
//     .getDefinition()
//     .replace(/\/+$/, '') // remove trailing slash
//     .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // escape regex special chars
//     .replace(/:(\w+)/g, '([^/]+)') // replace :param with capture group
//   return result ? `^${result}/?$` : `^/?$`
// }
// Combine multiple route definitions into a single regex
const combineRoutesToRegex = (routes: AnyRoute[]) => {
  const compiled = routes.map((r) => r.getRegexString())
  const pattern = `^(${compiled.join('|')})(?:/|$)`
  return new RegExp(pattern)
}

export const RenderPagesTree = ({
  nodes,
  Page404,
  level = 0,
}: {
  nodes: PagesTree
  Page404: React.ComponentType
  level?: number
}) => {
  return (
    <Switch>
      {nodes.map((node) => {
        if (node.layoutComponent) {
          // Layout with pages — combine all its page routes into a single regex
          const Layout = node.layoutComponent
          const layoutPagesRoutes = node.pages.map((p) => p.route)
          const layoutPagesRoutesRegex = combineRoutesToRegex(layoutPagesRoutes)
          return (
            <Route key={`layout-${node.route.getDefinition()}`} path={layoutPagesRoutesRegex}>
              <Layout>
                <Switch>
                  {node.pages.map(({ route, pageComponent: Page }) => {
                    return (
                      <Route key={route.getDefinition()} path={route.getDefinition()}>
                        <Page />
                      </Route>
                    )
                  })}
                  <RenderPagesTree nodes={node.nestedPagesTree} Page404={Page404} level={level + 1} />
                </Switch>
              </Layout>
            </Route>
          )
        }

        // Layout-less pages
        return (
          <Fragment key={`nolayout-${node.route.getDefinition()}`}>
            {node.pages.map(({ route, pageComponent: Page }) => {
              return (
                <Route key={route.getDefinition()} path={route.getDefinition()}>
                  <Page />
                </Route>
              )
            })}

            <RenderPagesTree nodes={node.nestedPagesTree} Page404={Page404} level={level + 1} />
          </Fragment>
        )
      })}

      <Route path="*">
        <Page404 />
      </Route>
    </Switch>
  )
}
